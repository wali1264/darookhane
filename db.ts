import Dexie, { type Table } from 'dexie';
import {
    Role,
    User,
    SupplierAccount,
    Drug,
    DrugBatch,
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
} from './types';

// By defining an interface that extends Dexie, we get type safety for our tables
// and full access to all of Dexie's API, resolving the type errors.
export interface ShafayarDB extends Dexie {
    roles: Table<Role, number>;
    users: Table<User, number>;
    supplierAccounts: Table<SupplierAccount, number>;
    drugs: Table<Drug, number>;
    drugBatches: Table<DrugBatch, number>;
    suppliers: Table<Supplier, number>;
    purchaseInvoices: Table<PurchaseInvoice, number>;
    saleInvoices: Table<SaleInvoice, number>;
    payments: Table<Payment, number>;
    clinicServices: Table<ClinicService, number>;
    serviceProviders: Table<ServiceProvider, number>;
    clinicTransactions: Table<ClinicTransaction, number>;
    simpleAccountingColumns: Table<SimpleAccountingColumn, number>;
    simpleAccountingEntries: Table<SimpleAccountingEntry, number>;
    syncQueue: Table<SyncQueueItem, number>;
    settings: Table<AppSetting, string>;
}

// Instantiate Dexie and cast it to our custom interface.
// This is an alternative to subclassing that is often more straightforward with TypeScript.
const db = new Dexie('ShafaYarDB') as ShafayarDB;

// Define the database schema.
// FIX: All Dexie methods like .version(), .table(), .transaction() are now correctly recognized on the typed 'db' instance.
db.version(3).stores({
    roles: '++id, &name, remoteId',
    users: '++id, &username, roleId, remoteId',
    supplierAccounts: '++id, &username, supplierId, remoteId',
    drugs: '++id, &name, &internalBarcode, &barcode, totalStock, remoteId',
    drugBatches: '++id, drugId, expiryDate, &[drugId+lotNumber], remoteId',
    suppliers: '++id, &name, remoteId',
    purchaseInvoices: '++id, &invoiceNumber, supplierId, date, remoteId',
    saleInvoices: '++id, date, remoteId',
    payments: '++id, supplierId, date, remoteId',
    clinicServices: '++id, &name, remoteId',
    serviceProviders: '++id, &name, remoteId',
    clinicTransactions: '++id, date, serviceId, providerId, remoteId',
    simpleAccountingColumns: '++id, &name, remoteId',
    simpleAccountingEntries: '++id, date, remoteId',
    settings: 'key', // Primary key is 'key', which is a string
    syncQueue: '++id, timestamp',
});

// Use the 'populate' event to add default data to the database on creation.
db.on('populate', (tx) => {
    tx.table('settings').bulkAdd([
        { key: 'lowStockThreshold', value: 10 },
        { key: 'expiryAlertThreshold', value: { value: 3, unit: 'months' } }
    ]);
});


// Export the single instance for use throughout the application.
export { db };
