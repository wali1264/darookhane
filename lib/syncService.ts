// This import is necessary for module augmentation to work correctly.
import 'dexie';
import Dexie from 'dexie';
import { db } from '../db';
import { supabase } from './supabaseClient';

// Add all tables that need to be synced with the backend.
const tablesToSync: (keyof typeof db)[] = [ 
    'drugs', 'drugBatches', 'suppliers', 'purchaseInvoices', 'saleInvoices', 
    'payments', 'clinicServices', 'serviceProviders', 'clinicTransactions', 
    'simpleAccountingColumns', 'simpleAccountingEntries', 'users', 'roles', 
    'supplierAccounts', 'settings', 'activityLog' 
];

// FIX: Module augmentation is placed here, where `trans.custom` is used.
// This centrally augments the Transaction interface for use across the app.
declare module 'dexie' {
  interface Transaction {
    custom: {
      isSyncing?: boolean;
    };
  }
}


export function initializeSyncHooks() {
    console.log("Initializing database sync hooks...");
    tablesToSync.forEach(tableName => {
        const table = db.table(tableName);

        table.hook('creating', async (primKey, obj, trans) => {
            if (trans.custom?.isSyncing) return; // Prevent sync-loops
            await db.sync_queue.add({
                entity: tableName,
                action: 'create',
                payload: obj,
                timestamp: Date.now()
            });
        });

        table.hook('updating', async (modifications, primKey, obj, trans) => {
            if (trans.custom?.isSyncing) return;
            // Dexie's hook sends modifications. We need the primary key for Supabase.
            await db.sync_queue.add({
                entity: tableName,
                action: 'update',
                payload: { primKey, modifications },
                timestamp: Date.now()
            });
        });

        table.hook('deleting', async (primKey, obj, trans) => {
             if (trans.custom?.isSyncing) return;
             // We only need the primary key to delete on the server.
             await db.sync_queue.add({
                entity: tableName,
                action: 'delete',
                payload: { primKey },
                timestamp: Date.now()
            });
        });
    });
}

let isProcessing = false;
export async function processSyncQueue() {
    if (isProcessing || !navigator.onLine) return;

    isProcessing = true;
    console.log("Starting to process sync queue...");
    try {
        const queueItems = await db.sync_queue.orderBy('timestamp').limit(50).toArray();
        if (queueItems.length === 0) {
            console.log("Sync queue is empty.");
            isProcessing = false;
            return;
        }
        
        console.log(`Found ${queueItems.length} items to sync.`);

        for (const item of queueItems) {
            let error = null;
            // NOTE: This logic assumes that the local primary key (`id` or `key`)
            // is the same as the primary key in the Supabase table.
            
            if (item.action === 'create') {
                const { error: insertError } = await supabase.from(item.entity).insert(item.payload);
                error = insertError;
            } else if (item.action === 'update') {
                 const { error: updateError } = await supabase.from(item.entity).update(item.payload.modifications).eq('id', item.payload.primKey);
                 error = updateError;
            } else if (item.action === 'delete') {
                 const { error: deleteError } = await supabase.from(item.entity).delete().eq('id', item.payload.primKey);
                 error = deleteError;
            }

            if (!error) {
                await db.sync_queue.delete(item.id!);
                console.log(`Successfully synced and removed item #${item.id} (${item.entity}/${item.action}) from queue.`);
            } else {
                 console.error(`Sync error for item #${item.id} (${item.entity}/${item.action}):`, error);
                 // Stop on first error to prevent data consistency issues.
                 // A more robust system would have retries or mark items as failed.
                 break; 
            }
        }
    } catch (err) {
        console.error("A critical error occurred while processing the sync queue:", err);
    } finally {
        isProcessing = false;
    }
}