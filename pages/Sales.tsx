import React, { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Drug, SaleItem, SaleInvoice } from '../types';
import { Search, X, Plus, Minus, Printer, Edit, History } from 'lucide-react';
import Modal from '../components/Modal';
import PrintableInvoice from '../components/PrintableInvoice';
import Dexie from 'dexie';
import HandwritingToggleButton from '../components/HandwritingToggleButton';

const Sales: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<Omit<SaleItem, 'deductions'>[]>([]);
    const [invoiceToPrint, setInvoiceToPrint] = useState<SaleInvoice | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<SaleInvoice | null>(null);

    const drugs = useLiveQuery(() => db.drugs.toArray(), []);
    const recentInvoices = useLiveQuery(() => db.saleInvoices.orderBy('id').reverse().limit(5).toArray(), []);

    const filteredDrugs = useMemo(() => {
        if (!searchTerm) return [];
        if (!drugs) return [];
        const lowerCaseSearchTerm = searchTerm.toLowerCase().split(' ').filter(Boolean);
        if (lowerCaseSearchTerm.length === 0) return [];
        
        return drugs.filter(drug => {
            const drugNameLower = drug.name.toLowerCase();
            const barcodeMatch = drug.barcode === searchTerm || drug.internalBarcode === searchTerm;
            const nameMatch = lowerCaseSearchTerm.every(term => drugNameLower.includes(term));
            
            return (nameMatch || barcodeMatch) && drug.totalStock > 0;
        }).slice(0, 5);
    }, [searchTerm, drugs]);


    const addToCart = (drug: Drug) => {
        const existingItem = cart.find(item => item.drugId === drug.id);
        if (existingItem) {
            updateQuantity(drug.id!, Math.min(drug.totalStock, existingItem.quantity + 1));
        } else {
            if (drug.totalStock > 0) {
                setCart([...cart, {
                    drugId: drug.id!,
                    name: drug.name,
                    quantity: 1,
                    unitPrice: drug.salePrice,
                    totalPrice: drug.salePrice,
                }]);
            }
        }
        setSearchTerm('');
    };

    const updateQuantity = (drugId: number, quantity: number) => {
        const drugInStock = drugs?.find(d => d.id === drugId);
        if (!drugInStock) return;

        const newQuantity = Math.max(0, Math.min(quantity, drugInStock.totalStock));
        if (newQuantity === 0) {
            removeFromCart(drugId);
            return;
        }

        setCart(cart.map(item =>
            item.drugId === drugId
                ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
                : item
        ));
    };

    const removeFromCart = (drugId: number) => {
        setCart(cart.filter(item => item.drugId !== drugId));
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [cart]);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        try {
            const invoiceId = await db.transaction('rw', db.saleInvoices, db.drugs, db.drugBatches, async () => {
                const itemsWithDeductions: SaleItem[] = [];

                for (const item of cart) {
                    let quantityToDeduct = item.quantity;
                    const itemDeductions: { batchId: number; quantity: number }[] = [];

                    const batches = await db.drugBatches
                        .where('drugId').equals(item.drugId)
                        .and(batch => batch.quantityInStock > 0)
                        .sortBy('expiryDate');

                    for (const batch of batches) {
                        if (quantityToDeduct === 0) break;
                        const deduction = Math.min(quantityToDeduct, batch.quantityInStock);
                        await db.drugBatches.update(batch.id!, {
                            quantityInStock: batch.quantityInStock - deduction
                        });
                        itemDeductions.push({ batchId: batch.id!, quantity: deduction });
                        quantityToDeduct -= deduction;
                    }

                    if (quantityToDeduct > 0) {
                        throw new Error(`Insufficient stock for ${item.name}.`);
                    }

                    await db.drugs.where('id').equals(item.drugId).modify(drug => {
                        drug.totalStock -= item.quantity;
                    });

                    itemsWithDeductions.push({ ...item, deductions: itemDeductions });
                }

                const invoice: Omit<SaleInvoice, 'id'> = {
                    date: new Date().toISOString(),
                    items: itemsWithDeductions,
                    totalAmount: totalAmount,
                };
                
                return await db.saleInvoices.add(invoice as SaleInvoice);
            });

            const finalInvoice = await db.saleInvoices.get(invoiceId);
            setInvoiceToPrint(finalInvoice!);
            setCart([]);

        } catch (error) {
            console.error("Failed to process sale:", error);
            alert("خطا در پردازش فروش. موجودی انبار ممکن است کافی نباشد.");
        }
    };
    
    const handleOpenEditModal = (invoice: SaleInvoice) => {
        setEditingInvoice(invoice);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Search and Results */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
                    <div className="relative mb-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="جستجوی دارو بر اساس نام یا بارکد..."
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 pr-10 pl-12 text-white focus:outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                         <div className="absolute left-2 top-1/2 -translate-y-1/2">
                            <HandwritingToggleButton />
                        </div>
                    </div>
                    <div className="flex-grow space-y-2 overflow-y-auto">
                        {filteredDrugs.map(drug => (
                            <div key={drug.id} onClick={() => addToCart(drug)} className="p-3 bg-gray-700 rounded-lg flex justify-between items-center cursor-pointer hover:bg-blue-600 transition-colors">
                                <div>
                                    <p className="font-semibold text-white">{drug.name}</p>
                                    <p className="text-sm text-gray-400">موجودی: {drug.totalStock} | قیمت: ${drug.salePrice.toFixed(2)}</p>
                                </div>
                                <Plus className="text-green-400" />
                            </div>
                        ))}
                    </div>
                </div>
                 {/* Recent Invoices */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
                    <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-3 flex items-center gap-2">
                        <History size={20} />
                        فاکتورهای اخیر
                    </h3>
                    <div className="flex-grow space-y-2 overflow-y-auto">
                        {recentInvoices?.map(inv => (
                            <div key={inv.id} className="p-3 bg-gray-700/60 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-white">فاکتور #{inv.id}</p>
                                    <p className="text-sm text-gray-400">{new Date(inv.date).toLocaleString('fa-IR')} - ${inv.totalAmount.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button onClick={() => setInvoiceToPrint(inv)} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-500">
                                        <Printer size={14} />
                                        <span>چاپ</span>
                                    </button>
                                    <button onClick={() => handleOpenEditModal(inv)} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                        <Edit size={14} />
                                        <span>ویرایش</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 flex flex-col">
                <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-3">سبد خرید</h3>
                <div className="flex-grow space-y-3 overflow-y-auto pr-2 -mr-2">
                    {cart.length === 0 && <p className="text-gray-500 text-center mt-8">سبد خرید خالی است.</p>}
                    {cart.map(item => (
                        <div key={item.drugId} className="p-3 bg-gray-700/60 rounded-lg flex items-center justify-between">
                             <div>
                                <p className="font-semibold text-white text-sm">{item.name}</p>
                                <p className="text-xs text-gray-400">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-gray-800 rounded-full p-1">
                                    <button onClick={() => updateQuantity(item.drugId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600"><Plus size={14} /></button>
                                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.drugId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600"><Minus size={14} /></button>
                                </div>
                                <button onClick={() => removeFromCart(item.drugId)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-gray-600 pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold text-white mb-4">
                        <span>مجموع:</span>
                        <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                        ثبت فاکتور
                    </button>
                </div>
            </div>
            {invoiceToPrint && (
                <InvoiceModal invoice={invoiceToPrint} onClose={() => setInvoiceToPrint(null)} />
            )}
            {editingInvoice && (
                <EditInvoiceModal 
                    invoice={editingInvoice} 
                    onClose={() => setEditingInvoice(null)} 
                    onSave={() => {
                        setEditingInvoice(null);
                        // Potentially show a success message
                    }}
                />
            )}
        </div>
    );
};

const InvoiceModal: React.FC<{invoice: SaleInvoice, onClose: () => void}> = ({invoice, onClose}) => {
    const handlePrint = () => {
        // This is a browser-native function to open the print dialog
        window.print();
    };
    return (
        <Modal title={`فاکتور شماره #${invoice.id}`} onClose={onClose}>
            <div className="space-y-4">
                <PrintableInvoice invoice={invoice} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
                        <Printer size={18} />
                        <span>چاپ</span>
                    </button>
                </div>
                 <style>{`
                    @media print {
                        .print-hidden {
                            display: none;
                        }
                    }
                 `}</style>
            </div>
        </Modal>
    );
}


const EditInvoiceModal: React.FC<{ invoice: SaleInvoice; onClose: () => void; onSave: () => void; }> = ({ invoice, onClose, onSave }) => {
    const [items, setItems] = useState(invoice.items);
    const drugs = useLiveQuery(() => db.drugs.toArray(), []);

    const updateQuantity = (drugId: number, quantity: number) => {
        const drugInStock = drugs?.find(d => d.id === drugId);
        // For editing, available stock is current stock + what was in the original invoice
        const originalItem = invoice.items.find(i => i.drugId === drugId);
        if (!drugInStock || !originalItem) return;

        const maxQuantity = drugInStock.totalStock + originalItem.quantity;
        const newQuantity = Math.max(0, Math.min(quantity, maxQuantity));

        if (newQuantity === 0) {
            setItems(items.filter(item => item.drugId !== drugId));
            return;
        }

        setItems(items.map(item =>
            item.drugId === drugId
                ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
                : item
        ));
    };
    
    const removeItem = (drugId: number) => setItems(items.filter(item => item.drugId !== drugId));

    const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice, 0), [items]);

    const handleUpdate = async () => {
         try {
            await db.transaction('rw', db.saleInvoices, db.drugs, db.drugBatches, async () => {
                // Step 1: Revert the original sale (return all stock)
                for (const originalItem of invoice.items) {
                    for (const deduction of originalItem.deductions) {
                        // FIX: Property 'fn' does not exist on type 'DexieConstructor'. Use `modify` for atomic updates.
                        await db.drugBatches.where('id').equals(deduction.batchId).modify(batch => { batch.quantityInStock += deduction.quantity });
                    }
                    await db.drugs.where('id').equals(originalItem.drugId).modify(drug => {
                        drug.totalStock += originalItem.quantity;
                    });
                }

                // Step 2: Process the updated sale as a new one
                const newItemsWithDeductions: SaleItem[] = [];
                for (const updatedItem of items) {
                    let quantityToDeduct = updatedItem.quantity;
                    const itemDeductions: { batchId: number; quantity: number }[] = [];

                    const batches = await db.drugBatches.where('drugId').equals(updatedItem.drugId).and(b => b.quantityInStock > 0).sortBy('expiryDate');

                    for (const batch of batches) {
                        if (quantityToDeduct === 0) break;
                        const deduction = Math.min(quantityToDeduct, batch.quantityInStock);
                        await db.drugBatches.update(batch.id!, { quantityInStock: batch.quantityInStock - deduction });
                        itemDeductions.push({ batchId: batch.id!, quantity: deduction });
                        quantityToDeduct -= deduction;
                    }

                    if (quantityToDeduct > 0) throw new Error(`Insufficient stock for ${updatedItem.name} during edit.`);

                    await db.drugs.where('id').equals(updatedItem.drugId).modify(drug => {
                        drug.totalStock -= updatedItem.quantity;
                    });

                    newItemsWithDeductions.push({ ...updatedItem, deductions: itemDeductions });
                }

                // Step 3: Update the invoice record
                await db.saleInvoices.update(invoice.id!, {
                    items: newItemsWithDeductions,
                    totalAmount: totalAmount,
                });
            });
            onSave();
        } catch (error) {
            console.error("Failed to update invoice:", error);
            alert("خطا در ویرایش فاکتور. موجودی انبار ممکن است کافی نباشد.");
        }
    };

    return (
        <Modal title={`ویرایش فاکتور #${invoice.id}`} onClose={onClose}>
            <div className="flex flex-col" style={{minHeight: '400px'}}>
                <div className="flex-grow space-y-3 overflow-y-auto pr-2 -mr-2">
                    {items.map(item => (
                        <div key={item.drugId} className="p-3 bg-gray-700/60 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-white text-sm">{item.name}</p>
                                <p className="text-xs text-gray-400">${item.unitPrice.toFixed(2)} x {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-gray-800 rounded-full p-1">
                                    <button onClick={() => updateQuantity(item.drugId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600"><Plus size={14} /></button>
                                    <span className="w-5 text-center text-sm">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.drugId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-600"><Minus size={14} /></button>
                                </div>
                                <button onClick={() => removeItem(item.drugId)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="border-t border-gray-600 pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold text-white mb-4">
                        <span>مجموع جدید:</span>
                        <span>${totalAmount.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                        <button type="button" onClick={handleUpdate} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">ذخیره تغییرات</button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default Sales;