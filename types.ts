export type Page = 'Dashboard' | 'Inventory' | 'Sales' | 'Purchases' | 'Accounting' | 'Settings';

export enum DrugType {
  TABLET = 'قرص',
  SYRUP = 'شربت',
  INJECTION = 'آمپول',
  OINTMENT = 'پماد',
  DROPS = 'قطره',
  OTHER = 'غیره',
}

export interface DrugBatch {
  id?: number;
  drugId: number;
  lotNumber: string;
  expiryDate: string; // YYYY-MM-DD
  quantityInStock: number;
  purchasePrice: number; // Price for this specific batch
}

export interface Drug {
  id?: number;
  name: string;
  company: string;
  // lotNumber, expiryDate, and individual stock are now in DrugBatch
  purchasePrice: number; // Default/latest purchase price
  salePrice: number;
  totalStock: number; // Aggregated stock from all batches
  type: DrugType;
  internalBarcode?: string;
  barcode?: string; // This will store both barcode and QR code values
}

export interface Supplier {
  id?: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  totalDebt: number;
}

export interface PurchaseInvoiceItem {
  drugId: number;
  name: string; // Denormalized for easier display in invoices
  quantity: number;
  purchasePrice: number;
  lotNumber: string;
  expiryDate: string;
}

export interface PurchaseInvoice {
  id?: number;
  invoiceNumber: string;
  supplierId: number;
  date: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  amountPaid: number; // Initially 0 when creating
}

export interface SaleItem {
  drugId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deductions: { batchId: number; quantity: number }[]; // CRITICAL for editing/reversals
}

export interface SaleInvoice {
  id?: number;
  date: string;
  items: SaleItem[];
  totalAmount: number;
}

export interface Payment {
  id?: number;
  supplierId: number;
  amount: number;
  date: string;
  recipientName?: string;
  description?: string;
}

export interface ClinicService {
  id?: number;
  name: string;
  price: number;
  requiresProvider: boolean;
}

export interface ServiceProvider {
  id?: number;
  name: string;
  specialty?: string;
}

export interface ClinicTransaction {
  id?: number;
  serviceId: number;
  providerId?: number; // Optional, depends on the service
  patientName?: string;
  amount: number;
  date: string; // ISO string
  ticketNumber: number;
}
