// FIX: Add side-effect import for 'dexie' to allow module augmentation.
import 'dexie';
import Dexie, { Table } from 'dexie';
import { 
  Drug, Supplier, PurchaseInvoice, SaleInvoice, Payment, DrugType, DrugBatch, 
  ClinicService, ServiceProvider, ClinicTransaction, SimpleAccountingEntry, SimpleAccountingColumn,
  User, Role, Permission, PERMISSIONS, SyncQueueItem, SupplierAccount, AppSetting, ActivityLog
} from './types';

// FIX: Moved module augmentation here from syncService.ts to resolve module resolution issues.
// This centrally augments the Transaction interface for use across the app.
declare module 'dexie' {
  interface Transaction {
    custom: {
      isSyncing?: boolean;
    };
  }
}

export const db = new Dexie('shafayarDB') as Dexie & {
  drugs: Table<Drug>;
  drugBatches: Table<DrugBatch>;
  suppliers: Table<Supplier>;
  purchaseInvoices: Table<PurchaseInvoice>;
  saleInvoices: Table<SaleInvoice>;
  payments: Table<Payment>;
  clinicServices: Table<ClinicService>;
  serviceProviders: Table<ServiceProvider>;
  clinicTransactions: Table<ClinicTransaction>;
  simpleAccountingColumns: Table<SimpleAccountingColumn>;
  simpleAccountingEntries: Table<SimpleAccountingEntry>;
  users: Table<User>;
  roles: Table<Role>;
  supplierAccounts: Table<SupplierAccount>;
  sync_queue: Table<SyncQueueItem>;
  settings: Table<AppSetting>;
  activityLog: Table<ActivityLog>;
};

// Define the schema for all versions. Dexie requires this.
// Each version declaration must include all tables, not just new ones.
db.version(1).stores({
  drugs: '++id, name, company, totalStock, type, barcode, internalBarcode',
  suppliers: '++id, name, totalDebt',
  purchaseInvoices: '++id, invoiceNumber, supplierId, date',
  saleInvoices: '++id, date',
  payments: '++id, supplierId, date',
});
db.version(2).stores({
  drugBatches: '++id, drugId, lotNumber, expiryDate, quantityInStock',
});
db.version(3).stores({
  clinicServices: '++id, name',
  serviceProviders: '++id, name',
  clinicTransactions: '++id, serviceId, providerId, date, ticketNumber',
});
db.version(4).stores({
  simpleAccountingColumns: '++id, name, type, order',
  simpleAccountingEntries: '++id, date',
});
db.version(5).stores({
  users: '++id, &username, roleId',
  roles: '++id, &name',
});
db.version(6).stores({
   users: '++id, &username, roleId',
   roles: '++id, &name, isEditable',
}).upgrade(async tx => {
    // Add isEditable property to existing roles
    await tx.table('roles').toCollection().modify({ isEditable: true });
    // Protect the default Admin role
    const adminRole = await tx.table('roles').where('name').equalsIgnoreCase('Admin').first();
    if (adminRole) {
        await tx.table('roles').update(adminRole.id, { isEditable: false });
    }
});
db.version(7).stores({
    sync_queue: '++id, timestamp',
});
db.version(8).stores({
    supplierAccounts: '++id, supplierId, &username',
});
db.version(9).stores({
    drugBatches: '++id, drugId, lotNumber, &[drugId+lotNumber], expiryDate, quantityInStock',
}).upgrade(tx => {
    // This upgrade ensures the new compound index is created.
    // No data migration needed, just schema update for performance.
});
db.version(10).stores({
    settings: '&key'
});

// Version 11: Add Activity Log. 
// CRITICAL: Re-declare ALL previous tables to prevent them from being dropped.
db.version(11).stores({
    drugs: '++id, name, company, totalStock, type, barcode, internalBarcode',
    drugBatches: '++id, drugId, lotNumber, &[drugId+lotNumber], expiryDate, quantityInStock',
    suppliers: '++id, &name, totalDebt',
    purchaseInvoices: '++id, invoiceNumber, supplierId, date',
    saleInvoices: '++id, date',
    payments: '++id, supplierId, date',
    clinicServices: '++id, &name',
    serviceProviders: '++id, &name',
    clinicTransactions: '++id, date, ticketNumber, serviceId',
    simpleAccountingColumns: '++id, order, &name',
    simpleAccountingEntries: '++id, date',
    users: '++id, &username, roleId',
    roles: '++id, &name, isEditable',
    supplierAccounts: '++id, supplierId, &username',
    sync_queue: '++id, timestamp',
    settings: '&key',
    // New table for this version
    activityLog: '++id, timestamp, userId, actionType, entity, entityId'
});