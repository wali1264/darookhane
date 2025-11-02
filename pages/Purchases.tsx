import React, { useState, useMemo, FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Search, Trash2, X, Edit, Printer } from 'lucide-react';
import Modal from '../components/Modal';
import { PurchaseInvoice, PurchaseInvoiceItem, Supplier, Drug } from '../types';
import PrintablePurchaseInvoice from '../components/PrintablePurchaseInvoice';
import { useVoiceInput } from '../hooks/useVoiceInput';
import VoiceControlHeader from '../components/VoiceControlHeader';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { logActivity } from '../lib/activityLogger';

const Purchases: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
    const [invoiceToPrint, setInvoiceToPrint] = useState<PurchaseInvoice | null>(null);
    const { hasPermission } = useAuth();
    
    const purchaseInvoices = useLiveQuery(() => db.purchaseInvoices.orderBy('date').reverse().toArray(), []);
    const suppliers = useLiveQuery(() => db.suppliers.toArray(), []);

    const getSupplierName = (id: number) => {
        return suppliers?.find(s => s.id === id)?.name || 'ناشناخته';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">مدیریت خریدها</h2>
                {hasPermission('purchases:create') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        <span>ثبت فاکتور جدید</span>
                    </button>
                )}
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-right text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">شماره فاکتور</th>
                            <th scope="col" className="px-6 py-3">تامین‌کننده</th>
                            <th scope="col" className="px-6 py-3">تاریخ</th>
                            <th scope="col" className="px-6 py-3">مبلغ کل</th>
                            <th scope="col" className="px-6 py-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchaseInvoices?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                    هنوز فاکتور خریدی ثبت نشده است.
                                </td>
                            </tr>
                        )}
                        {purchaseInvoices?.map(invoice => (
                            <tr key={invoice.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">{invoice.invoiceNumber}</td>
                                <td className="px-6 py-4">{getSupplierName(invoice.supplierId)}</td>
                                <td className="px-6 py-4">{new Date(invoice.date).toLocaleDateString('fa-IR')}</td>
                                <td className="px-6 py-4">${invoice.totalAmount.toFixed(2)}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    <button onClick={() => setInvoiceToPrint(invoice)} className="text-gray-400 hover:text-white" title="چاپ فاکتور"><Printer size={18} /></button>
                                    {hasPermission('purchases:edit') && (
                                        <button onClick={() => setEditingInvoice(invoice)} className="text-blue-400 hover:text-blue-300" title="ویرایش فاکتور"><Edit size={18} /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <PurchaseFormModal onClose={() => setIsModalOpen(false)} />}
            {invoiceToPrint && (
                <PrintModal
                    invoice={invoiceToPrint}
                    supplierName={getSupplierName(invoiceToPrint.supplierId)}
                    onClose={() => setInvoiceToPrint(null)}
                />
            )}
            {editingInvoice && (
                <EditPurchaseInvoiceModal 
                    invoice={editingInvoice} 
                    onClose={() => setEditingInvoice(null)} 
                    onSave={() => setEditingInvoice(null)}
                />
            )}
        </div>
    );
};

const PrintModal: React.FC<{ invoice: PurchaseInvoice, supplierName: string, onClose: () => void }> = ({ invoice, supplierName, onClose }) => {
    const handlePrint = () => window.print();
    return (
        <Modal title={`فاکتور خرید #${invoice.invoiceNumber}`} onClose={onClose}>
            <div className="space-y-4">
                <PrintablePurchaseInvoice invoice={invoice} supplierName={supplierName} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
                        <Printer size={18} />
                        <span>چاپ</span>
                    </button>
                </div>
                 <style>{`
                    @media print { .print-hidden { display: none; } }
                 `}</style>
            </div>
        </Modal>
    );
}

type PurchaseItemData = Omit<PurchaseInvoiceItem, 'quantity' | 'purchasePrice'> & {
    quantity: number | '';
    purchasePrice: number | '';
    isExpiryDateValid: boolean;
};

const validateExpiry = (value: string): boolean => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return true; // Empty is valid from a format perspective

    // Check for YYYY-MM-DD format, which might be set by the onBlur handler
    const yyyy_mm_dd_regex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
    const yyyy_mm_dd_match = trimmedValue.match(yyyy_mm_dd_regex);
    if (yyyy_mm_dd_match) {
        const year = parseInt(yyyy_mm_dd_match[1]);
        const month = parseInt(yyyy_mm_dd_match[2]);
        const day = parseInt(yyyy_mm_dd_match[3]);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && year > 2000 && year < 2100;
    }

    // Original regex for user input formats (M/YYYY, YYYY/M, MMYYYY)
    const regex = /^(?:(\d{1,2})[\s\/-]?)(\d{4})$|^(\d{4})[\s\/-]?(\d{1,2})$/;
    const match = trimmedValue.match(regex);
    let monthStr, yearStr;

    if (match) {
        monthStr = match[1] || match[4];
        yearStr = match[2] || match[3];
    } else if (/^\d{5,6}$/.test(trimmedValue)) {
        monthStr = trimmedValue.slice(0, -4);
        yearStr = trimmedValue.slice(-4);
    }

    if (monthStr && yearStr) {
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        return (month >= 1 && month <= 12 && year > 2000 && year < 2100);
    }
    return false;
};

const PurchaseFormModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [supplierId, setSupplierId] = useState<number | undefined>(undefined);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<PurchaseItemData[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { showNotification } = useNotification();

    const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []);
    const drugs = useLiveQuery(() => db.drugs.toArray(), []);

    const searchResults = useMemo(() => {
        if (!searchTerm || !drugs) return [];
        return drugs.filter(drug => drug.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
    }, [searchTerm, drugs]);

    const addItem = (drug: Drug) => {
        if (items.some(item => item.drugId === drug.id)) return; // Avoid duplicates
        const newItem: PurchaseItemData = {
            drugId: drug.id!,
            name: drug.name,
            quantity: '',
            purchasePrice: '',
            lotNumber: '',
            expiryDate: '',
            isExpiryDateValid: true,
        };
        setItems([...items, newItem]);
        setSearchTerm('');
    };
    
    const updateItem = (index: number, field: keyof Omit<PurchaseItemData, 'isExpiryDateValid' | 'drugId' | 'name'>, value: string) => {
        const newItems = [...items];
        const currentItem = newItems[index];
    
        if (field === 'quantity' || field === 'purchasePrice') {
            (currentItem as any)[field] = value === '' ? '' : Number(value);
        } else {
            (currentItem as any)[field] = value;
        }

        if (field === 'expiryDate') {
            currentItem.isExpiryDateValid = validateExpiry(value);
        }

        setItems(newItems);
    };

    const handleExpiryDateBlur = (index: number, value: string) => {
        const item = items[index];
        if (!value || !item.isExpiryDateValid) return;

        const regex = /^(?:(\d{1,2})[\s\/-]?)(\d{4})$|^(\d{4})[\s\/-]?(\d{1,2})$/;
        const match = value.match(regex);
        let monthStr: string | undefined, yearStr: string | undefined;

        if (match) {
            monthStr = match[1] || match[4];
            yearStr = match[2] || match[3];
        } else if (/^\d{5,6}$/.test(value)) {
            monthStr = value.slice(0, -4);
            yearStr = value.slice(-4);
        }

        if (monthStr && yearStr) {
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            if (month >= 1 && month <= 12 && year > 2000 && year < 2100) {
                const lastDay = new Date(year, month, 0).getDate();
                const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                updateItem(index, 'expiryDate', formattedDate);
            }
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 0), 0);
    }, [items]);
    
    const normalizeNumeric = (text: string) => {
        const persianDigitsMap: { [key: string]: string } = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
        let normalized = text.replace(/ /g, '');
        for (const key in persianDigitsMap) {
            normalized = normalized.replace(new RegExp(key, 'g'), persianDigitsMap[key]);
        }
        return normalized;
    };

    const handleVoiceTranscript = (transcript: string) => {
        const activeElement = document.activeElement as HTMLInputElement;
        if (!activeElement) return;

        const { index, field } = activeElement.dataset;
        if (index && field) {
            const value = (field === 'quantity' || field === 'purchasePrice' || field === 'lotNumber' || field === 'expiryDate')
                ? normalizeNumeric(transcript)
                : transcript;
            updateItem(parseInt(index, 10), field as any, value);
            return;
        }

        const { name } = activeElement;
        if (name === 'invoiceNumber') {
            setInvoiceNumber(normalizeNumeric(transcript));
        } else if (name === 'searchTerm') {
            setSearchTerm(transcript);
        }
    };

    const voiceControls = useVoiceInput({ onTranscript: handleVoiceTranscript });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!supplierId || items.length === 0 || !invoiceNumber) {
            showNotification('لطفاً تمام اطلاعات فاکتور را تکمیل کنید.', 'error');
            return;
        }
        
        if (items.some(item => !item.isExpiryDateValid)) {
            showNotification('فرمت تاریخ انقضا در یک یا چند قلم نامعتبر است.', 'error');
            return;
        }

        const finalItems: PurchaseInvoiceItem[] = items.map(item => ({
             drugId: item.drugId,
             name: item.name,
             lotNumber: item.lotNumber,
             expiryDate: item.expiryDate,
             quantity: Number(item.quantity) || 0,
             purchasePrice: Number(item.purchasePrice) || 0,
        }));

        if (finalItems.some(item => item.quantity <= 0 || item.purchasePrice <= 0 || !item.lotNumber || !item.expiryDate)) {
            showNotification('لطفاً تمام فیلدهای اقلام فاکتور را به درستی وارد کنید.', 'error');
            return;
        }

        const invoice = {
            invoiceNumber,
            supplierId,
            date,
            items: finalItems,
            totalAmount,
            amountPaid: 0,
        };

        try {
            let newInvoiceIdForLog: number | undefined;
            await db.transaction('rw', db.purchaseInvoices, db.drugs, db.drugBatches, db.suppliers, async () => {
                const newInvoiceId = await db.purchaseInvoices.add(invoice);
                newInvoiceIdForLog = newInvoiceId;

                for (const item of finalItems) {
                    const existingBatch = await db.drugBatches
                        .where({ drugId: item.drugId, lotNumber: item.lotNumber }).first();

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
                        drug.purchasePrice = item.purchasePrice;
                    });
                }

                await db.suppliers.where('id').equals(supplierId).modify(supplier => {
                    supplier.totalDebt += totalAmount;
                });
            });

            if (newInvoiceIdForLog) {
                await logActivity('CREATE', 'PurchaseInvoice', newInvoiceIdForLog, { invoice: { id: newInvoiceIdForLog, ...invoice } });
            }

            showNotification('فاکتور خرید با موفقیت ثبت شد.', 'success');
            onClose();
        } catch (error) {
            console.error("Failed to save purchase invoice:", error);
            showNotification('خطا در ثبت فاکتور. لطفاً دوباره تلاش کنید.', 'error');
        }
    };

    return (
        <Modal title="ثبت فاکتور خرید جدید" onClose={onClose} headerContent={<VoiceControlHeader {...voiceControls} />}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-lg">
                    <select value={supplierId ?? ''} onChange={e => setSupplierId(Number(e.target.value))} required className="input-style">
                        <option value="" disabled>-- انتخاب تامین‌کننده --</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input name="invoiceNumber" type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="شماره فاکتور" required className="input-style" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                </div>
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        name="searchTerm"
                        type="text"
                        placeholder="جستجوی دارو برای افزودن به فاکتور..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pr-10 pl-4 text-white focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-lg">
                            {searchResults.map(drug => (
                                <div key={drug.id} onClick={() => addItem(drug)} className="p-3 cursor-pointer hover:bg-blue-500">
                                    {drug.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 -mr-2">
                    {items.map((item, index) => (
                        <div key={item.drugId} className="grid grid-cols-12 gap-2 items-center bg-gray-700/50 p-2 rounded-md">
                            <span className="col-span-3 text-sm truncate">{item.name}</span>
                            <input data-index={index} data-field="quantity" type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} placeholder="تعداد" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="purchasePrice" type="number" step="0.01" value={item.purchasePrice} onChange={e => updateItem(index, 'purchasePrice', e.target.value)} placeholder="قیمت خرید" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="lotNumber" type="text" value={item.lotNumber} onChange={e => updateItem(index, 'lotNumber', e.target.value)} placeholder="شماره لات" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="expiryDate" type="text" value={item.expiryDate} onChange={e => updateItem(index, 'expiryDate', e.target.value)} onBlur={e => handleExpiryDateBlur(index, e.target.value)} placeholder="انقضا (مثال: ۱۲-۲۰۲۷)" className={`input-style-small col-span-2 ${!item.isExpiryDateValid ? '!border-red-500' : ''}`} />
                            <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-300 col-span-1 flex justify-center"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                     <p className="text-lg font-bold">مجموع کل: <span className="text-green-400">${totalAmount.toFixed(2)}</span></p>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">ذخیره فاکتور</button>
                    </div>
                </div>
            </form>
            <style>{`
                .input-style { background-color: #374151; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .input-style::placeholder { color: #9ca3af; }
                .input-style-small { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.375rem; padding: 0.5rem; width: 100%; font-size: 0.875rem; }
                .input-style-small::placeholder { color: #6b7280; }
                .input-style-small:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
            `}</style>
        </Modal>
    );
};


const EditPurchaseInvoiceModal: React.FC<{ invoice: PurchaseInvoice; onClose: () => void; onSave: () => void; }> = ({ invoice, onClose, onSave }) => {
    const [supplierId, setSupplierId] = useState(invoice.supplierId);
    const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoiceNumber);
    const [date, setDate] = useState(invoice.date.split('T')[0]);
    const [items, setItems] = useState<PurchaseItemData[]>(invoice.items.map(i => ({...i, quantity: i.quantity, purchasePrice: i.purchasePrice, isExpiryDateValid: true})));
    const { showNotification } = useNotification();
    
    // The rest of the state and logic for add/remove/update items
    const [searchTerm, setSearchTerm] = useState('');
    const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []);
    const drugs = useLiveQuery(() => db.drugs.toArray(), []);
    const searchResults = useMemo(() => {
        if (!searchTerm || !drugs) return [];
        return drugs.filter(drug => drug.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
    }, [searchTerm, drugs]);

    const addItem = (drug: Drug) => {
        if (items.some(item => item.drugId === drug.id)) return;
        setItems([...items, { drugId: drug.id!, name: drug.name, quantity: '', purchasePrice: '', lotNumber: '', expiryDate: '', isExpiryDateValid: true }]);
        setSearchTerm('');
    };
    const updateItem = (index: number, field: keyof Omit<PurchaseItemData, 'isExpiryDateValid' | 'drugId' | 'name'>, value: string) => {
        const newItems = [...items];
        const currentItem = newItems[index];
    
        if (field === 'quantity' || field === 'purchasePrice') {
            (currentItem as any)[field] = value === '' ? '' : Number(value);
        } else {
            (currentItem as any)[field] = value;
        }
        if (field === 'expiryDate') {
            currentItem.isExpiryDateValid = validateExpiry(value);
        }
        setItems(newItems);
    };

    const handleExpiryDateBlur = (index: number, value: string) => {
        const item = items[index];
        if (!value || !item.isExpiryDateValid) return;

        const regex = /^(?:(\d{1,2})[\s\/-]?)(\d{4})$|^(\d{4})[\s\/-]?(\d{1,2})$/;
        const match = value.match(regex);
        let monthStr: string | undefined, yearStr: string | undefined;

        if (match) {
            monthStr = match[1] || match[4];
            yearStr = match[2] || match[3];
        } else if (/^\d{5,6}$/.test(value)) {
            monthStr = value.slice(0, -4);
            yearStr = value.slice(-4);
        }

        if (monthStr && yearStr) {
            const year = parseInt(yearStr);
            const month = parseInt(monthStr);
            if (month >= 1 && month <= 12 && year > 2000 && year < 2100) {
                const lastDay = new Date(year, month, 0).getDate();
                const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                updateItem(index, 'expiryDate', formattedDate);
            }
        }
    };

    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const totalAmount = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0) * (Number(item.quantity) || 0), 0);
    }, [items]);
    
    const normalizeNumeric = (text: string) => {
        const persianDigitsMap: { [key: string]: string } = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
        let normalized = text.replace(/ /g, '');
        for (const key in persianDigitsMap) {
            normalized = normalized.replace(new RegExp(key, 'g'), persianDigitsMap[key]);
        }
        return normalized;
    };

    const handleVoiceTranscript = (transcript: string) => {
        const activeElement = document.activeElement as HTMLInputElement;
        if (!activeElement) return;

        const { index, field } = activeElement.dataset;
        if (index && field) {
            const value = (field === 'quantity' || field === 'purchasePrice' || field === 'lotNumber' || field === 'expiryDate')
                ? normalizeNumeric(transcript)
                : transcript;
            updateItem(parseInt(index, 10), field as any, value);
            return;
        }

        const { name } = activeElement;
        if (name === 'invoiceNumber') {
            setInvoiceNumber(normalizeNumeric(transcript));
        } else if (name === 'searchTerm') {
            setSearchTerm(transcript);
        }
    };

    const voiceControls = useVoiceInput({ onTranscript: handleVoiceTranscript });

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        
        if (items.some(item => !item.isExpiryDateValid)) {
            showNotification('فرمت تاریخ انقضا در یک یا چند قلم نامعتبر است.', 'error');
            return;
        }

        const finalItems: PurchaseInvoiceItem[] = items.map(item => ({
            drugId: item.drugId,
            name: item.name,
            lotNumber: item.lotNumber,
            expiryDate: item.expiryDate,
            quantity: Number(item.quantity) || 0,
            purchasePrice: Number(item.purchasePrice) || 0,
        }));

        if (finalItems.some(item => item.quantity <= 0 || item.purchasePrice < 0 || !item.lotNumber || !item.expiryDate)) {
             showNotification('لطفاً تمام فیلدهای اقلام فاکتور را به درستی وارد کنید.', 'error');
            return;
        }

        try {
            const updatedInvoiceData = {
                invoiceNumber,
                supplierId,
                date,
                items: finalItems,
                totalAmount,
            };
            
            const originalInvoice = await db.purchaseInvoices.get(invoice.id!);
            if (!originalInvoice) throw new Error("Invoice not found");

            await db.transaction('rw', db.purchaseInvoices, db.drugs, db.drugBatches, db.suppliers, async () => {
                // --- 1. Revert original impact ---
                for (const item of originalInvoice.items) {
                    const batch = await db.drugBatches.where({ drugId: item.drugId, lotNumber: item.lotNumber }).first();
                    if (!batch) throw new Error(`Batch for ${item.name} with lot ${item.lotNumber} not found.`);
                    await db.drugBatches.update(batch.id!, { quantityInStock: batch.quantityInStock - item.quantity });
                    await db.drugs.where('id').equals(item.drugId).modify(drug => { drug.totalStock -= item.quantity; });
                }
                await db.suppliers.where('id').equals(originalInvoice.supplierId).modify(supplier => { supplier.totalDebt -= originalInvoice.totalAmount; });

                // --- 2. Apply new impact ---
                for (const item of finalItems) {
                    const batch = await db.drugBatches.where({ drugId: item.drugId, lotNumber: item.lotNumber }).first();
                    if (batch) {
                        await db.drugBatches.update(batch.id!, { quantityInStock: batch.quantityInStock + item.quantity });
                    } else {
                        await db.drugBatches.add({ drugId: item.drugId, lotNumber: item.lotNumber, expiryDate: item.expiryDate, quantityInStock: item.quantity, purchasePrice: item.purchasePrice });
                    }
                    await db.drugs.where('id').equals(item.drugId).modify(drug => { drug.totalStock += item.quantity; });
                }
                await db.suppliers.where('id').equals(supplierId).modify(supplier => { supplier.totalDebt += totalAmount; });

                // --- 3. Update the invoice record ---
                await db.purchaseInvoices.update(invoice.id!, updatedInvoiceData);
            });

            await logActivity('UPDATE', 'PurchaseInvoice', invoice.id!, { old: originalInvoice, new: { ...invoice, ...updatedInvoiceData } });
            
            showNotification('فاکتور با موفقیت ویرایش شد.', 'success');
            onSave();
        } catch (error) {
            console.error("Failed to update invoice:", error);
            showNotification(`خطا در ویرایش فاکتور: ${error}`, 'error');
        }
    };

    return (
        <Modal title={`ویرایش فاکتور خرید #${invoice.invoiceNumber}`} onClose={onClose} headerContent={<VoiceControlHeader {...voiceControls} />}>
            <form onSubmit={handleUpdate} className="space-y-4">
                 {/* Reusing the same form structure as PurchaseFormModal */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-lg">
                    <select value={supplierId ?? ''} onChange={e => setSupplierId(Number(e.target.value))} required className="input-style">
                        <option value="" disabled>-- انتخاب تامین‌کننده --</option>
                        {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input name="invoiceNumber" type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="شماره فاکتور" required className="input-style" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="input-style" />
                </div>
                {/* Search and item list sections are identical to PurchaseFormModal */}
                 <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input name="searchTerm" type="text" placeholder="جستجوی دارو برای افزودن..." className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 pr-10 pl-4" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-lg">
                            {searchResults.map(drug => <div key={drug.id} onClick={() => addItem(drug)} className="p-3 cursor-pointer hover:bg-blue-500">{drug.name}</div>)}
                        </div>
                    )}
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 -mr-2">
                    {items.map((item, index) => (
                         <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-700/50 p-2 rounded-md">
                            <span className="col-span-3 text-sm truncate">{item.name}</span>
                            <input data-index={index} data-field="quantity" type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} placeholder="تعداد" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="purchasePrice" type="number" step="0.01" value={item.purchasePrice} onChange={e => updateItem(index, 'purchasePrice', e.target.value)} placeholder="قیمت خرید" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="lotNumber" type="text" value={item.lotNumber} onChange={e => updateItem(index, 'lotNumber', e.target.value)} placeholder="شماره لات" className="input-style-small col-span-2" />
                            <input data-index={index} data-field="expiryDate" type="text" value={item.expiryDate} onChange={e => updateItem(index, 'expiryDate', e.target.value)} onBlur={e => handleExpiryDateBlur(index, e.target.value)} placeholder="انقضا" className={`input-style-small col-span-2 ${!item.isExpiryDateValid ? '!border-red-500' : ''}`} />
                            <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-300 col-span-1 flex justify-center"><Trash2 size={16} /></button>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-600">
                     <p className="text-lg font-bold">مجموع کل: <span className="text-green-400">${totalAmount.toFixed(2)}</span></p>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">ذخیره تغییرات</button>
                    </div>
                </div>
            </form>
             <style>{`
                .input-style { background-color: #374151; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .input-style::placeholder { color: #9ca3af; }
                .input-style-small { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.375rem; padding: 0.5rem; width: 100%; font-size: 0.875rem; }
                .input-style-small::placeholder { color: #6b7280; }
                .input-style-small:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
            `}</style>
        </Modal>
    );
};

export default Purchases;