import { db } from '../db';
import { FunctionDeclaration, Type } from '@google/genai';
import { PurchaseInvoice, PurchaseInvoiceItem, Supplier } from '../types';

// This is an in-memory state for the AI's current task.
// In a more complex app, this could be moved to a global state manager or IndexedDB.
let draftInvoice: Omit<PurchaseInvoice, 'id'> | null = null;

// ===================================================================================
// ╔╦╗╔═╗╔═╗╦  ╔═╗╔═╗╔═╗╔═╗╔╦╗╔═╗╔╗╔  Tool Declarations for Gemini
// ║║║╠═╣║ ║║  ║  ║ ║╠═╣╠═╝ ║ ╠═╣║║║
// ╩ ╩╩ ╩╚═╝╩═╝╚═╝╚═╝╩ ╩╩   ╩ ╩ ╩╝╚╝
// ===================================================================================

// --- Reporting Tools ---

const getDrugStockByNameDeclaration: FunctionDeclaration = {
    name: 'getDrugStockByName',
    description: 'موجودی کل یک دارو را با جستجوی بخشی از نام آن برمی‌گرداند. این تابع می‌تواند یک نتیجه، چندین نتیجه (اگر نام مبهم باشد) یا هیچ نتیجه‌ای برنگرداند.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            drugName: { type: Type.STRING, description: 'بخشی از نام دارویی که باید جستجو شود. مثال: "آموکسی"' },
        },
        required: ['drugName'],
    },
};

const getDrugsNearingExpiryDeclaration: FunctionDeclaration = {
    name: 'getDrugsNearingExpiry',
    description: 'لیستی از داروها که تاریخ انقضای آنها در تعداد مشخصی از ماه‌های آینده است را برمی‌گرداند. اگر تعداد ماه‌ها مشخص نشود، به طور پیش‌فرض ۳ ماه آینده در نظر گرفته می‌شود.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            months: { type: Type.NUMBER, description: 'تعداد ماه‌های آینده برای بررسی تاریخ انقضا. پیش‌فرض: 3' },
        },
    },
};

const getSupplierDebtDeclaration: FunctionDeclaration = {
    name: 'getSupplierDebt',
    description: 'بدهی کل یک تامین‌کننده را با جستجوی بخشی از نام آن برمی‌گرداند. این تابع می‌تواند یک نتیجه، چندین نتیجه (اگر نام مبهم باشد) یا هیچ نتیجه‌ای برنگرداند.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            supplierName: { type: Type.STRING, description: 'بخشی از نام تامین‌کننده‌ای که باید جستجو شود. مثال: "کابل"' },
        },
        required: ['supplierName'],
    },
};

const getTodaysSalesTotalDeclaration: FunctionDeclaration = {
    name: 'getTodaysSalesTotal',
    description: 'مجموع کل فروش ثبت شده برای امروز را محاسبه و برمی‌گرداند.',
    parameters: { type: Type.OBJECT, properties: {} },
};

const getTodaysClinicRevenueDeclaration: FunctionDeclaration = {
    name: 'getTodaysClinicRevenue',
    description: 'مجموع درآمد کلینیک ثبت شده برای امروز را محاسبه و برمی‌گرداند.',
    parameters: { type: Type.OBJECT, properties: {} },
};

const listLowStockDrugsDeclaration: FunctionDeclaration = {
    name: 'listLowStockDrugs',
    description: 'لیستی از تمام داروهایی که موجودی آنها کمتر از یک آستانه مشخص است را برمی‌گرداند. اگر آستانه مشخص نشود، به طور پیش‌فرض ۱۰ عدد در نظر گرفته می‌شود.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            threshold: { type: Type.NUMBER, description: 'آستانه موجودی. پیش‌فرض: 10' },
        },
    },
};

// --- Task-Oriented Tools (Existing) ---

const findSupplierByNameDeclaration: FunctionDeclaration = {
    name: 'findSupplierByName',
    description: 'یک نام تامین‌کننده را جستجو می‌کند تا ببیند آیا در پایگاه داده وجود دارد یا خیر. قبل از شروع یک فاکتور جدید از این ابزار استفاده کنید.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'نام تامین‌کننده‌ای که باید جستجو شود.' },
        },
        required: ['name'],
    },
};

const findDrugByNameDeclaration: FunctionDeclaration = {
    name: 'findDrugByName',
    description: 'یک نام دارو را جستجو می‌کند تا ببیند آیا در انبار موجود است یا خیر. قبل از افزودن یک دارو به فاکتور از این ابزار استفاده کنید.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: 'نام دارویی که باید جستجو شود.' },
        },
        required: ['name'],
    },
};

const startNewPurchaseInvoiceDeclaration: FunctionDeclaration = {
    name: 'startNewPurchaseInvoice',
    description: 'یک جلسه فاکتور خرید جدید را آغاز می‌کند. فقط پس از تأیید وجود تامین‌کننده با استفاده از `findSupplierByName` از این ابزار استفاده کنید. این تابع تامین‌کننده را بر اساس نام پیدا می‌کند (یا در صورت عدم وجود، یکی جدید می‌سازد) و فاکتور را برای افزودن اقلام آماده می‌کند.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            supplierName: { type: Type.STRING, description: 'نام کامل تامین‌کننده. مثال: "افغان فارما"' },
            invoiceNumber: { type: Type.STRING, description: 'شماره منحصر به فرد فاکتور خرید.' },
        },
        required: ['supplierName', 'invoiceNumber'],
    },
};

const addDrugToPurchaseInvoiceDeclaration: FunctionDeclaration = {
    name: 'addDrugToPurchaseInvoice',
    description: 'یک قلم دارو را به فاکتور خرید فعلی اضافه می‌کند. فقط پس از تأیید وجود دارو با استفاده از `findDrugByName` از این ابزار استفاده کنید. قبل از استفاده از این تابع، باید `startNewPurchaseInvoice` فراخوانی شده باشد.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            drugName: { type: Type.STRING, description: 'نام کامل دارو همانطور که در سیستم انبار ثبت شده است. مثال: "آموکسی سیلین 500mg"' },
            quantity: { type: Type.NUMBER, description: 'تعداد داروی خریداری شده.' },
            purchasePrice: { type: Type.NUMBER, description: 'قیمت خرید هر واحد از دارو.' },
            lotNumber: { type: Type.STRING, description: 'شماره لات دارو که روی بسته بندی درج شده است.' },
            expiryDate: { type: Type.STRING, description: 'تاریخ انقضای دارو در فرمت YYYY-MM-DD.' },
        },
        required: ['drugName', 'quantity', 'purchasePrice', 'lotNumber', 'expiryDate'],
    },
};

const saveCurrentPurchaseInvoiceDeclaration: FunctionDeclaration = {
    name: 'saveCurrentPurchaseInvoice',
    description: 'مهم: این ابزار را فقط پس از کسب اجازه صریح از کاربر فراخوانی کنید. این تابع فاکتور خرید فعلی را با تمام اقلام اضافه شده در پایگاه داده ذخیره می‌کند، موجودی انبار را به‌روزرسانی کرده و بدهی تامین‌کننده را افزایش می‌دهد. پس از اجرا، جلسه فاکتور فعلی پاک می‌شود.',
    parameters: { type: Type.OBJECT, properties: {} },
};

export const toolDeclarations = [
    // Reporting Tools
    getDrugStockByNameDeclaration,
    getDrugsNearingExpiryDeclaration,
    getSupplierDebtDeclaration,
    getTodaysSalesTotalDeclaration,
    getTodaysClinicRevenueDeclaration,
    listLowStockDrugsDeclaration,
    // Task-Oriented Tools
    findSupplierByNameDeclaration,
    findDrugByNameDeclaration,
    startNewPurchaseInvoiceDeclaration,
    addDrugToPurchaseInvoiceDeclaration,
    saveCurrentPurchaseInvoiceDeclaration,
];


// ===================================================================================
// ╔═╗╔Cross_Mark╗╔═╗╦ ╦╔╦╗╔═╗  Tool Execution Logic
// ║╣ ║ ║╠═╣║ ║ ║ ║ ║ ║  
// ╚═╝╚═╝╩ ╩╚═╝ ╩ ╚═╝  
// ===================================================================================

// --- Reporting Tool Implementations ---

async function _getDrugStockByName(args: { drugName: string }) {
    const searchTerms = args.drugName.toLowerCase().split(' ').filter(Boolean);
    if (searchTerms.length === 0) {
        return { success: false, message: "لطفاً نام دارو را مشخص کنید." };
    }
    
    // Dexie's filter is case-sensitive by default, so we use toLowerCase.
    const matchingDrugs = await db.drugs.filter(drug => {
        const drugNameLower = drug.name.toLowerCase();
        return searchTerms.every(term => drugNameLower.includes(term));
    }).toArray();

    if (matchingDrugs.length === 1) {
        const drug = matchingDrugs[0];
        return { success: true, name: drug.name, stock: drug.totalStock };
    }
    if (matchingDrugs.length > 1) {
        const suggestions = matchingDrugs.map(d => d.name).slice(0, 5); // Limit suggestions
        return { success: true, multipleFound: true, suggestions };
    }
    return { success: false, message: `دارویی حاوی "${args.drugName}" یافت نشد.` };
}

async function _getDrugsNearingExpiry(args: { months?: number }) {
    const months = args.months ?? 3; // Default to 3 months if not provided
    const today = new Date();
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + months);

    const expiringBatches = await db.drugBatches
        .where('expiryDate').between(today.toISOString(), targetDate.toISOString(), true, true)
        .toArray();

    if (expiringBatches.length === 0) {
        return { success: true, drugs: [] };
    }

    const drugIds = [...new Set(expiringBatches.map(b => b.drugId))];
    const drugs = await db.drugs.where('id').anyOf(drugIds).toArray();
    const drugsMap = new Map(drugs.map(d => [d.id, d.name]));

    const result = expiringBatches.map(batch => ({
        drugName: drugsMap.get(batch.drugId) || 'Unknown Drug',
        lotNumber: batch.lotNumber,
        expiryDate: batch.expiryDate,
        quantity: batch.quantityInStock,
    }));

    return { success: true, drugs: result };
}

async function _getSupplierDebt(args: { supplierName: string }) {
    const searchTerms = args.supplierName.toLowerCase().split(' ').filter(Boolean);
     if (searchTerms.length === 0) {
        return { success: false, message: "لطفاً نام تامین‌کننده را مشخص کنید." };
    }

    const matchingSuppliers = await db.suppliers.filter(supplier => {
        const supplierNameLower = supplier.name.toLowerCase();
        return searchTerms.every(term => supplierNameLower.includes(term));
    }).toArray();
    
    if (matchingSuppliers.length === 1) {
        const supplier = matchingSuppliers[0];
        return { success: true, name: supplier.name, debt: supplier.totalDebt };
    }
    if (matchingSuppliers.length > 1) {
        const suggestions = matchingSuppliers.map(s => s.name).slice(0, 5);
        return { success: true, multipleFound: true, suggestions };
    }
    return { success: false, message: `تامین‌کننده‌ای حاوی "${args.supplierName}" یافت نشد.` };
}

async function _getTodaysSalesTotal() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invoices = await db.saleInvoices.where('date').between(today.toISOString(), tomorrow.toISOString(), true, false).toArray();
    const total = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    return { success: true, totalSales: total, count: invoices.length };
}

async function _getTodaysClinicRevenue() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transactions = await db.clinicTransactions.where('date').between(today.toISOString(), tomorrow.toISOString(), true, false).toArray();
    const total = transactions.reduce((sum, trans) => sum + trans.amount, 0);

    return { success: true, totalRevenue: total, count: transactions.length };
}

async function _listLowStockDrugs(args: { threshold?: number }) {
    const threshold = args.threshold ?? 10; // Default to 10 if not provided
    const drugs = await db.drugs.where('totalStock').below(threshold).toArray();
    if (drugs.length > 0) {
        const result = drugs.map(d => ({ name: d.name, stock: d.totalStock }));
        return { success: true, drugs: result };
    }
    return { success: true, drugs: [] };
}


// --- Task-Oriented Tool Implementations (Existing) ---

async function _findSupplierByName(args: { name: string }) {
    const searchTerms = args.name.toLowerCase().split(' ').filter(Boolean);
    if (searchTerms.length === 0) {
        return { exists: false, matches: [] };
    }
    const matchingSuppliers = await db.suppliers.filter(supplier => {
        const supplierNameLower = supplier.name.toLowerCase();
        return searchTerms.every(term => supplierNameLower.includes(term));
    }).limit(10).toArray();

    const matches = matchingSuppliers.map(s => s.name);
    return { exists: matches.length > 0, matches };
}

async function _findDrugByName(args: { name: string }) {
    const searchTerms = args.name.toLowerCase().split(' ').filter(Boolean);
    if (searchTerms.length === 0) {
        return { exists: false, matches: [] };
    }
    const matchingDrugs = await db.drugs.filter(drug => {
        const drugNameLower = drug.name.toLowerCase();
        return searchTerms.every(term => drugNameLower.includes(term));
    }).limit(10).toArray();
    
    const matches = matchingDrugs.map(d => d.name);
    return { exists: matches.length > 0, matches };
}

async function _startNewPurchaseInvoice(args: { supplierName: string, invoiceNumber: string }) {
    if (draftInvoice) {
        return { success: false, message: 'یک فاکتور دیگر در حال ویرایش است. لطفاً ابتدا آن را ذخیره یا لغو کنید.' };
    }

    let supplier = await db.suppliers.where('name').equalsIgnoreCase(args.supplierName).first();
    if (!supplier) {
        const newSupplierId = await db.suppliers.add({ name: args.supplierName, totalDebt: 0 });
        supplier = await db.suppliers.get(newSupplierId);
        if (!supplier) return { success: false, message: 'خطا در ایجاد تامین‌کننده جدید.' };
    }

    draftInvoice = {
        invoiceNumber: args.invoiceNumber,
        supplierId: supplier.id!,
        date: new Date().toISOString(),
        items: [],
        totalAmount: 0,
        amountPaid: 0,
    };

    return { success: true, message: `فاکتور خرید برای "${supplier.name}" با شماره "${args.invoiceNumber}" با موفقیت آغاز شد. اکنون می‌توانید اقلام را اضافه کنید.` };
}

async function _addDrugToPurchaseInvoice(args: { drugName: string, quantity: number, purchasePrice: number, lotNumber: string, expiryDate: string }) {
    if (!draftInvoice) {
        return { success: false, message: 'هیچ فاکتور خریدی فعال نیست. لطفاً ابتدا با دستور `startNewPurchaseInvoice` یک فاکتور جدید را شروع کنید.' };
    }

    const drug = await db.drugs.where('name').equalsIgnoreCase(args.drugName).first();
    if (!drug) {
        return { success: false, message: `دارویی با نام "${args.drugName}" یافت نشد. لطفاً ابتدا آن را در سیستم انبارداری ثبت کنید.` };
    }
    
    const expiryRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!expiryRegex.test(args.expiryDate)) {
        return { success: false, message: `فرمت تاریخ انقضا نامعتبر است. لطفاً از فرمت YYYY-MM-DD استفاده کنید.` };
    }

    const newItem: PurchaseInvoiceItem = {
        drugId: drug.id!,
        name: drug.name,
        quantity: args.quantity,
        purchasePrice: args.purchasePrice,
        lotNumber: args.lotNumber,
        expiryDate: args.expiryDate,
    };
    
    draftInvoice.items.push(newItem);
    
    return { success: true, message: `"${args.quantity}" عدد "${args.drugName}" با موفقیت به فاکتور اضافه شد.` };
}


async function _saveCurrentPurchaseInvoice() {
    if (!draftInvoice) {
        return { success: false, message: 'هیچ فاکتوری برای ذخیره وجود ندارد.' };
    }
    if (draftInvoice.items.length === 0) {
        return { success: false, message: 'فاکتور هیچ آیتمی ندارد. لطفاً ابتدا اقلام را اضافه کنید.' };
    }

    const totalAmount = draftInvoice.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
    const invoiceToSave = { ...draftInvoice, totalAmount };
    const supplierId = draftInvoice.supplierId;

    try {
        await db.transaction('rw', db.purchaseInvoices, db.drugs, db.drugBatches, db.suppliers, async () => {
            await db.purchaseInvoices.add(invoiceToSave as PurchaseInvoice);

            for (const item of invoiceToSave.items) {
                const existingBatch = await db.drugBatches.where({ drugId: item.drugId, lotNumber: item.lotNumber }).first();

                if (existingBatch) {
                    await db.drugBatches.update(existingBatch.id!, {
                        quantityInStock: existingBatch.quantityInStock + item.quantity
                    });
                } else {
                    await db.drugBatches.add({
                        drugId: item.drugId,
                        lotNumber: item.lotNumber,
                        expiryDate: item.expiryDate,
                        quantityInStock: item.quantity,
                        purchasePrice: item.purchasePrice,
                    });
                }
                
                await db.drugs.where('id').equals(item.drugId).modify(drug => {
                    drug.totalStock += item.quantity;
                    drug.purchasePrice = item.purchasePrice; // Update default purchase price
                });
            }

            await db.suppliers.where('id').equals(supplierId).modify(supplier => {
                supplier.totalDebt += totalAmount;
            });
        });
        
        draftInvoice = null; // Clear the draft invoice after successful save
        
        return { success: true, message: `فاکتور با موفقیت ذخیره شد. مبلغ کل ${totalAmount.toFixed(2)} دلار به بدهی تامین‌کننده اضافه گردید.` };

    } catch (error) {
        console.error("Failed to save purchase invoice via AI tool:", error);
        return { success: false, message: `خطا در ذخیره سازی فاکتور: ${error}` };
    }
}


export async function executeTool(name: string, args: any) {
    switch (name) {
        // Reporting
        case 'getDrugStockByName':
            return await _getDrugStockByName(args);
        case 'getDrugsNearingExpiry':
            return await _getDrugsNearingExpiry(args);
        case 'getSupplierDebt':
            return await _getSupplierDebt(args);
        case 'getTodaysSalesTotal':
            return await _getTodaysSalesTotal();
        case 'getTodaysClinicRevenue':
            return await _getTodaysClinicRevenue();
        case 'listLowStockDrugs':
            return await _listLowStockDrugs(args);
        // Task-oriented
        case 'findSupplierByName':
            return await _findSupplierByName(args);
        case 'findDrugByName':
            return await _findDrugByName(args);
        case 'startNewPurchaseInvoice':
            return await _startNewPurchaseInvoice(args);
        case 'addDrugToPurchaseInvoice':
            return await _addDrugToPurchaseInvoice(args);
        case 'saveCurrentPurchaseInvoice':
            return await _saveCurrentPurchaseInvoice();
        default:
            throw new Error(`ابزار ناشناخته: ${name}`);
    }
}