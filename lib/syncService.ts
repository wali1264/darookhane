import { db } from '../db';
import { supabase } from './supabaseClient';
import { SyncQueueItem } from '../types';

// A flag to prevent multiple sync processes from running simultaneously
let isSyncing = false;

// Utility to convert camelCase keys to snake_case for Supabase
const camelToSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const toSnakeCase = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => toSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object' && !obj.constructor.name.includes('Date')) {
        return Object.keys(obj).reduce((acc, key) => {
            acc[camelToSnakeCase(key)] = toSnakeCase(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

// Map local Dexie table names to remote Supabase table names
const TABLE_MAP: { [key: string]: string } = {
    drugs: 'drugs',
    drugBatches: 'drug_batches',
    suppliers: 'suppliers',
    purchaseInvoices: 'purchase_invoices',
    saleInvoices: 'sale_invoices',
    payments: 'payments',
    clinicServices: 'clinic_services',
    serviceProviders: 'service_providers',
    clinicTransactions: 'clinic_transactions',
    simpleAccountingColumns: 'simple_accounting_columns',
    simpleAccountingEntries: 'simple_accounting_entries',
};

async function syncItem(item: SyncQueueItem) {
    const remoteTable = TABLE_MAP[item.table];
    if (!remoteTable) {
        console.warn(`No remote table mapping for local table: ${item.table}. Skipping sync.`);
        return;
    }

    const localRecord = await db.table(item.table).get(item.recordId);
    
    switch (item.action) {
        case 'create': {
            const { id, ...payload } = item.payload; // Exclude local ID
            
            // Special handling for complex objects like invoices
            if (item.table === 'purchaseInvoices') {
                const { items, ...invoiceData } = payload;
                const snakeInvoice = toSnakeCase(invoiceData);
                const { data, error } = await supabase.from(remoteTable).insert(snakeInvoice).select('id').single();
                if (error) throw error;
                const remoteId = data.id;
                
                if (items && items.length > 0) {
                    const snakeItems = items.map((i: any) => toSnakeCase({ ...i, purchaseInvoiceId: remoteId }));
                    const { error: itemError } = await supabase.from('purchase_invoice_items').insert(snakeItems);
                    if (itemError) throw itemError;
                }
                await db.table(item.table).update(item.recordId, { remoteId });
            } else if (item.table === 'saleInvoices') {
                const { items, ...invoiceData } = payload;
                const snakeInvoice = toSnakeCase(invoiceData);
                const { data, error } = await supabase.from(remoteTable).insert(snakeInvoice).select('id').single();
                if (error) throw error;
                const remoteId = data.id;

                if (items && items.length > 0) {
                    const snakeItems = items.map((i: any) => {
                        const { deductions, ...itemData } = i; // Exclude local-only deductions field
                        return toSnakeCase({ ...itemData, saleInvoiceId: remoteId });
                    });
                    const { error: itemError } = await supabase.from('sale_invoice_items').insert(snakeItems);
                    if (itemError) throw itemError;
                }
                await db.table(item.table).update(item.recordId, { remoteId });
            } else {
                 // Standard create operation for simple objects
                const snakePayload = toSnakeCase(payload);
                const { data, error } = await supabase.from(remoteTable).insert(snakePayload).select('id').single();
                if (error) throw error;
                await db.table(item.table).update(item.recordId, { remoteId: data.id });
            }
            break;
        }

        case 'update': {
            if (!localRecord?.remoteId) {
                console.warn(`Skipping update for ${item.table} #${item.recordId}: remoteId not found. It might be pending creation.`);
                return; // Let it wait for the 'create' sync to complete
            }
            const snakePayload = toSnakeCase(item.payload);
            const { error } = await supabase.from(remoteTable).update(snakePayload).eq('id', localRecord.remoteId);
            if (error) throw error;
            break;
        }

        case 'delete': {
            if (!item.payload.remoteId) {
                 console.warn(`Skipping delete for ${item.table} #${item.recordId}: remoteId not found.`);
                 return;
            }
            const { error } = await supabase.from(remoteTable).delete().eq('id', item.payload.remoteId);
            // Handle foreign key constraints or 'not found' errors gracefully
            if (error && error.code !== '23503' && error.code !== 'PGRST204') {
                throw error;
            }
            break;
        }
    }
}

export async function processSyncQueue() {
    if (isSyncing) {
        return;
    }
    isSyncing = true;
    try {
        const itemsToSync = await db.syncQueue.orderBy('id').limit(50).toArray();
        if (itemsToSync.length === 0) {
            return;
        }
        
        console.log(`Syncing ${itemsToSync.length} items...`);

        for (const item of itemsToSync) {
            try {
                await syncItem(item);
                // If successful, delete from queue
                await db.syncQueue.delete(item.id!);
            } catch (error) {
                console.error(`Failed to sync item #${item.id} (${item.table} - ${item.action}). Halting queue to preserve order.`, error);
                // Stop processing on the first error to maintain data integrity and order
                return; 
            }
        }
    } catch (error) {
        console.error("An error occurred during sync queue processing:", error);
    } finally {
        isSyncing = false;
        // If there are more items, try to process them immediately
        if (await db.syncQueue.count() > 0) {
            setTimeout(processSyncQueue, 1000);
        }
    }
}