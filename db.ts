import Dexie, { Table } from 'dexie';
import { Drug, Supplier, PurchaseInvoice, SaleInvoice, Payment, DrugType, DrugBatch, ClinicService, ServiceProvider, ClinicTransaction } from './types';

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
};

// Version 1 (Original Schema)
db.version(1).stores({
  drugs: '++id, name, company, expiryDate, stock, internalBarcode',
  suppliers: '++id, name',
  purchaseInvoices: '++id, invoiceNumber, supplierId, date',
  saleInvoices: '++id, date',
  payments: '++id, supplierId, date',
});

// Version 2 (FEFO Batch Tracking)
db.version(2).stores({
  drugs: '++id, name, company, totalStock, internalBarcode, barcode', // Added totalStock to index for querying
  drugBatches: '++id, drugId, expiryDate, lotNumber', // New table for batch tracking
  suppliers: '++id, name',
  purchaseInvoices: '++id, invoiceNumber, supplierId, date',
  saleInvoices: '++id, date',
  payments: '++id, supplierId, date',
});

// Version 3 (Enhanced Payments)
// The schema definition for payments does not need to change as the new fields are optional and not indexed.
// Bumping the version number tracks the evolution of the data model.
db.version(3).stores({
  drugs: '++id, name, company, totalStock, internalBarcode, barcode',
  drugBatches: '++id, drugId, expiryDate, lotNumber',
  suppliers: '++id, name',
  purchaseInvoices: '++id, invoiceNumber, supplierId, date',
  saleInvoices: '++id, date',
  payments: '++id, supplierId, date',
});

// Version 4 (Clinic Services Module)
db.version(4).stores({
  drugs: '++id, name, company, totalStock, internalBarcode, barcode',
  drugBatches: '++id, drugId, expiryDate, lotNumber',
  suppliers: '++id, name',
  purchaseInvoices: '++id, invoiceNumber, supplierId, date',
  saleInvoices: '++id, date',
  payments: '++id, supplierId, date',
  clinicServices: '++id, name',
  serviceProviders: '++id, name',
  clinicTransactions: '++id, date',
});


// Function to populate initial data if the database is empty
export async function populateInitialData() {
    await db.transaction('rw', db.suppliers, db.drugs, db.drugBatches, db.clinicServices, db.serviceProviders, async () => {
        const supplierCount = await db.suppliers.count();
        if (supplierCount === 0) {
            console.log("Populating initial supplier data...");
            await db.suppliers.bulkAdd([
                { name: 'افغان فارما', totalDebt: 750.00 },
                { name: 'کابل فارما', totalDebt: 0.00 },
                { name: 'هرات مدیکا', totalDebt: 1100.00 },
                { name: 'بلخ مدیکال', totalDebt: 320.50 },
            ]);
        }

        const drugCount = await db.drugs.count();
        if (drugCount === 0) {
            console.log("Populating initial drug and batch data...");
            
            const drugIds = await db.drugs.bulkAdd([
                { name: 'آموکسی سیلین 500mg', company: 'افغان فارما', purchasePrice: 0.5, salePrice: 1.0, totalStock: 150, type: DrugType.TABLET, barcode: '123456789' },
                { name: 'شربت پاراستامول', company: 'کابل فارما', purchasePrice: 2.0, salePrice: 3.5, totalStock: 80, type: DrugType.SYRUP, barcode: '987654321' },
                { name: 'سرم سالین', company: 'هرات مدیکا', purchasePrice: 1.5, salePrice: 2.5, totalStock: 200, type: DrugType.INJECTION, internalBarcode: 'INT-001' },
                { name: 'ویتامین C', company: 'افغان فارما', purchasePrice: 0.8, salePrice: 1.5, totalStock: 50, type: DrugType.TABLET, barcode: '555444333' },
            ], { allKeys: true });

            await db.drugBatches.bulkAdd([
                { drugId: drugIds[0], lotNumber: 'AP123', expiryDate: '2025-12-31', quantityInStock: 150, purchasePrice: 0.5 },
                { drugId: drugIds[1], lotNumber: 'KP456', expiryDate: '2026-06-30', quantityInStock: 80, purchasePrice: 2.0 },
                { drugId: drugIds[2], lotNumber: 'HM789', expiryDate: '2027-01-15', quantityInStock: 200, purchasePrice: 1.5 },
                { drugId: drugIds[3], lotNumber: 'AP-VITC-01', expiryDate: '2025-10-20', quantityInStock: 50, purchasePrice: 0.8 },
            ]);
        }
        
        const serviceCount = await db.clinicServices.count();
        if (serviceCount === 0) {
            console.log("Populating initial clinic services and providers data...");
            await db.serviceProviders.bulkAdd([
                { name: 'دکتر احمد محمودی', specialty: 'عمومی' },
                { name: 'دکتر سارا کریمی', specialty: 'متخصص اطفال' },
            ]);
            await db.clinicServices.bulkAdd([
                { name: 'ویزیت عمومی', price: 10, requiresProvider: true },
                { name: 'ویزیت متخصص', price: 25, requiresProvider: true },
                { name: 'سونوگرافی', price: 50, requiresProvider: false },
                { name: 'لابراتوار - آزمایش خون', price: 15, requiresProvider: false },
                { name: 'بخش عاجل', price: 5, requiresProvider: false },
            ]);
        }
    });
}
