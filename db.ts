// FIX: Changed to a default import for Dexie, which is the correct way to import the class and fixes critical type inheritance issues.
import Dexie, { type Table } from 'dexie';
import { 
    Role,
    User,
    SupplierAccount,
    DrugBatch,
    Drug,
    Supplier,
    PurchaseInvoice,
    SaleInvoice,
    Payment,
    ClinicService,
    ServiceProvider,
    ClinicTransaction,
    SimpleAccountingColumn,
    SimpleAccountingEntry,
    SyncQueueItem,
    AppSetting,
    Permission,
    PERMISSIONS
} from './types';

// Logic from the old db-hooks.ts is now here to break circular dependency
const SYNC_TABLES = [
    'drugs', 'drugBatches', 'suppliers', 'purchaseInvoices', 'saleInvoices',
    'payments', 'clinicServices', 'serviceProviders', 'clinicTransactions',
    'simpleAccountingColumns', 'simpleAccountingEntries', 'users', 'roles', 'supplierAccounts', 'settings'
];

function registerSyncHooks(db: ShafayarDB) {
    SYNC_TABLES.forEach(tableName => {
        // Dexie's dynamic nature means we assert the type here.
        const table = db.table(tableName as keyof ShafayarDB) as Table;

        if (!table) {
            console.error(`Dexie table "${tableName}" not found during hook registration. Check schema definition.`);
            return;
        }

        // Hook for CREATE operations
        table.hook('creating', function(primKey, obj, trans) {
            // 'this' is the hook context. Using 'creating' hook to capture data before it's written.
            // With the correct Dexie import, the 'trans' object is now correctly typed.
            trans.table('syncQueue').add({
                table: tableName,
                action: 'create',
                recordId: primKey, // This might be undefined for auto-incremented keys, will be resolved post-creation
                payload: obj,
                timestamp: Date.now()
            });
        });

        // Hook for UPDATE operations
        table.hook('updating', function(mods, primKey, obj, trans) {
            // 'this' is the hook context
            if (Object.keys(mods).length > 0) {
                 // The 'trans' object is now correctly typed.
                 trans.table('syncQueue').add({
                    table: tableName,
                    action: 'update',
                    recordId: primKey,
                    payload: mods, // Only send the changes
                    timestamp: Date.now()
                });
            }
        });

        // Hook for DELETE operations
        table.hook('deleting', function(primKey, obj, trans) {
            // 'this' is the hook context
             // The 'trans' object is now correctly typed.
             trans.table('syncQueue').add({
                table: tableName,
                action: 'delete',
                recordId: primKey,
                // FIX: Cast object to `any` as not all tables have a `remoteId` property (e.g., AppSetting).
                payload: { remoteId: (obj as any).remoteId }, // Pass remoteId for server-side deletion
                timestamp: Date.now()
            });
        });
    });
}


export class ShafayarDB extends Dexie {
    roles!: Table<Role>;
    users!: Table<User>;
    supplierAccounts!: Table<SupplierAccount>;
    drugBatches!: Table<DrugBatch>;
    drugs!: Table<Drug>;
    suppliers!: Table<Supplier>;
    purchaseInvoices!: Table<PurchaseInvoice>;
    saleInvoices!: Table<SaleInvoice>;
    payments!: Table<Payment>;
    clinicServices!: Table<ClinicService>;
    serviceProviders!: Table<ServiceProvider>;
    clinicTransactions!: Table<ClinicTransaction>;
    simpleAccountingColumns!: Table<SimpleAccountingColumn>;
    simpleAccountingEntries!: Table<SimpleAccountingEntry>;
    syncQueue!: Table<SyncQueueItem>;
    settings!: Table<AppSetting>;

    constructor() {
        super('shafayarDB');
        this.version(2).stores({
            roles: '++id, &name, remoteId',
            users: '++id, &username, roleId, remoteId',
            supplierAccounts: '++id, supplierId, &username, remoteId',
            drugBatches: '++id, drugId, expiryDate, &[drugId+lotNumber], remoteId',
            drugs: '++id, &name, &internalBarcode, &barcode, totalStock, remoteId',
            suppliers: '++id, &name, remoteId',
            purchaseInvoices: '++id, &invoiceNumber, supplierId, date, remoteId',
            saleInvoices: '++id, date, remoteId',
            payments: '++id, supplierId, date, remoteId',
            clinicServices: '++id, &name, remoteId',
            serviceProviders: '++id, &name, remoteId',
            clinicTransactions: '++id, date, serviceId, providerId, remoteId',
            simpleAccountingColumns: '++id, order, remoteId',
            simpleAccountingEntries: '++id, date, remoteId',
            syncQueue: '++id',
            settings: 'key',
        });
        
        // Register hooks immediately after defining the schema and before any operations can occur.
        registerSyncHooks(this);
    
        this.on('populate', async () => {
            // This function runs only once when the database is first created.
            // It's a good place to add default data.

            // Default Admin Role with all permissions
            const allPermissions = Object.keys(PERMISSIONS) as Permission[];
            const adminRoleId = await this.roles.add({
                name: 'Admin',
                permissions: allPermissions,
                isEditable: false,
            });

            // Default Admin User
            // The login logic uses Supabase, but the local user management UI needs this user to exist
            // in Dexie. The password is now handled exclusively by Supabase.
            await this.users.add({
                username: 'admin',
                roleId: adminRoleId,
            });
            
            // Default settings
            await this.settings.bulkPut([
                { key: 'lowStockThreshold', value: 10 },
                { key: 'expiryAlertThreshold', value: { value: 3, unit: 'months' } }
            ]);
        });
    }
}

const db = new ShafayarDB();

export { db };