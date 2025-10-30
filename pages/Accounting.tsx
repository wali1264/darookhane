import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Supplier, Payment, ClinicService, ServiceProvider, ClinicTransaction } from '../types';
import { Plus, Edit, Trash2, BookOpen, Printer, Landmark, Stethoscope, HeartPulse, UserSquare, Ticket } from 'lucide-react';
import Modal from '../components/Modal';
import PrintablePaymentReceipt from '../components/PrintablePaymentReceipt';
import PrintableClinicTicket from '../components/PrintableClinicTicket';
import EditClinicTransactionModal from '../components/EditClinicTransactionModal';
import PrintableSupplierLedger from '../components/PrintableSupplierLedger';

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; text: string }> = ({ active, onClick, icon, text }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {icon}
        {text}
    </button>
);

const Accounting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'suppliers' | 'clinic'>('suppliers');
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">حسابداری</h2>
                <div className="flex items-center gap-3 p-1 bg-gray-800 rounded-lg">
                    <TabButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Landmark size={18} />} text="مدیریت تامین‌کنندگان" />
                    <TabButton active={activeTab === 'clinic'} onClick={() => setActiveTab('clinic')} icon={<Stethoscope size={18} />} text="خدمات کلینیک" />
                </div>
            </div>
            {activeTab === 'suppliers' ? <SupplierSection /> : <ClinicSection />}
        </div>
    );
};

// =================================================================================================
// ╔╦╗╦ ╦╔═╗╔═╗╦╔═╔═╗╦ ╦╦  ╔═╗  ╔═╗╔═╗╔═╗╔╦╗╔═╗╔╦╗╦╔═╗╔╗╔
// ║║║╚╦╝╠═╝║ ║╠╩╗╠═╣║ ║║  ║╣───╠═╣║   ║ ║ ║║╠═╣ ║ ║╠═╣║║║
// ╩ ╩ ╩ ╩  ╚═╝╩ ╩╩ ╩╚═╝╩═╝╚═╝  ╩ ╩╚═╝╚═╝═╩╝╩ ╩ ╩ ╩╩ ╩╝╚╝
// =================================================================================================

const SupplierSection = () => {
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [supplierToPrintLedger, setSupplierToPrintLedger] = useState<Supplier | null>(null);

    const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray(), []);
    const getSupplierName = (id: number) => suppliers?.find(s => s.id === id)?.name || 'ناشناخته';

    const handleOpenModal = (modal: 'payment' | 'supplier' | 'ledger', supplier: Supplier | null = null) => {
        if (modal === 'payment') { setSelectedSupplier(supplier); setIsPaymentModalOpen(true); } 
        else if (modal === 'supplier') { setEditingSupplier(supplier); setIsSupplierModalOpen(true); } 
        else if (modal === 'ledger') { setSelectedSupplier(supplier); setIsLedgerModalOpen(true); }
    };

    const handleCloseModals = () => {
        setIsPaymentModalOpen(false);
        setIsSupplierModalOpen(false);
        setIsLedgerModalOpen(false);
        setPaymentToPrint(null);
        setSelectedSupplier(null);
        setEditingSupplier(null);
        setSupplierToPrintLedger(null);
    };

     const handleDeleteSupplier = async (supplierId?: number) => {
        if (!supplierId || !window.confirm('آیا از حذف این تامین‌کننده مطمئن هستید؟ این عمل غیرقابل بازگشت است.')) return;
        
        const hasTransactions = await db.purchaseInvoices.where({ supplierId }).count() > 0 || await db.payments.where({ supplierId }).count() > 0;
        if (hasTransactions) {
            alert("امکان حذف تامین‌کننده دارای تراکنش وجود ندارد.");
            return;
        }
        await db.suppliers.delete(supplierId);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">لیست تامین‌کنندگان</h3>
                <button
                    onClick={() => handleOpenModal('supplier', null)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    <span>افزودن تامین‌کننده</span>
                </button>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-right text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">نام تامین‌کننده</th>
                            <th scope="col" className="px-6 py-3">شخص مسئول</th>
                            <th scope="col" className="px-6 py-3">تلفن</th>
                            <th scope="col" className="px-6 py-3">مجموع بدهی</th>
                            <th scope="col" className="px-6 py-3 text-center">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suppliers?.map(supplier => (
                            <tr key={supplier.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">
                                    <button onClick={() => handleOpenModal('ledger', supplier)} className="hover:text-blue-400 transition-colors flex items-center gap-2">
                                        <BookOpen size={16} />
                                        <span>{supplier.name}</span>
                                    </button>
                                </td>
                                <td className="px-6 py-4">{supplier.contactPerson || '-'}</td>
                                <td className="px-6 py-4">{supplier.phone || '-'}</td>
                                <td className={`px-6 py-4 font-bold ${supplier.totalDebt > 0 ? 'text-yellow-400' : 'text-green-400'}`}>${supplier.totalDebt.toFixed(2)}</td>
                                <td className="px-6 py-4 flex items-center justify-center gap-2">
                                    <button onClick={() => handleOpenModal('payment', supplier)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700">
                                        <Plus size={14} /><span>پرداخت</span>
                                    </button>
                                    <button onClick={() => setSupplierToPrintLedger(supplier)} className="p-2 text-gray-400 hover:text-white" title="چاپ صورت حساب">
                                        <Printer size={18} />
                                    </button>
                                    <button onClick={() => handleOpenModal('supplier', supplier)} className="p-2 text-blue-400 hover:text-blue-300" title="ویرایش"><Edit size={18} /></button>
                                    <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-2 text-red-400 hover:text-red-300" title="حذف"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isPaymentModalOpen && selectedSupplier && (
                <PaymentModal 
                    supplier={selectedSupplier} 
                    onClose={handleCloseModals} 
                    onPaymentSuccess={(newPayment) => {
                        handleCloseModals();
                        setPaymentToPrint(newPayment);
                    }}
                />
            )}
            {isSupplierModalOpen && <SupplierFormModal supplier={editingSupplier} onClose={handleCloseModals} />}
            {isLedgerModalOpen && selectedSupplier && <SupplierLedgerModal supplier={selectedSupplier} onClose={handleCloseModals} />}
            {paymentToPrint && <PaymentReceiptModal payment={paymentToPrint} supplierName={getSupplierName(paymentToPrint.supplierId)} onClose={() => setPaymentToPrint(null)} />}
            {supplierToPrintLedger && <PrintLedgerModal supplier={supplierToPrintLedger} onClose={handleCloseModals} />}
        </div>
    );
};

const SupplierFormModal: React.FC<{ supplier: Supplier | null; onClose: () => void }> = ({ supplier, onClose }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        phone: supplier?.phone || ''
    });
    const isEditing = !!supplier;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) { return; }
        if (isEditing && supplier?.id) {
            await db.suppliers.update(supplier.id, formData);
        } else {
            await db.suppliers.add({ ...formData, totalDebt: 0 });
        }
        onClose();
    };
    return (
        <Modal title={isEditing ? 'ویرایش تامین‌کننده' : 'افزودن تامین‌کننده جدید'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input name="name" value={formData.name} onChange={e => setFormData(p=>({...p, name: e.target.value}))} placeholder="نام تامین‌کننده" required className="input-style" />
                <input name="contactPerson" value={formData.contactPerson} onChange={e => setFormData(p=>({...p, contactPerson: e.target.value}))} placeholder="شخص مسئول" className="input-style" />
                <input name="phone" value={formData.phone} onChange={e => setFormData(p=>({...p, phone: e.target.value}))} placeholder="شماره تلفن" className="input-style" />
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">{isEditing ? 'ذخیره تغییرات' : 'افزودن'}</button>
                </div>
            </form>
            <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }`}</style>
        </Modal>
    );
};
const PaymentModal: React.FC<{ supplier: Supplier; onClose: () => void; onPaymentSuccess: (payment: Payment) => void; }> = ({ supplier, onClose, onPaymentSuccess }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [recipientName, setRecipientName] = useState('');
    const [description, setDescription] = useState('');
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = Number(amount);
        if (paymentAmount <= 0) return alert("مبلغ باید بیشتر از صفر باشد.");
        if (!recipientName.trim()) return alert("نام تحویل گیرنده اجباری است.");
        try {
            let newPaymentId: number;
            await db.transaction('rw', db.payments, db.suppliers, async () => {
                newPaymentId = await db.payments.add({ supplierId: supplier.id!, amount: paymentAmount, date: new Date().toISOString(), recipientName: recipientName.trim(), description: description.trim() });
                await db.suppliers.update(supplier.id!, { totalDebt: supplier.totalDebt - paymentAmount });
            });
            const newPayment = await db.payments.get(newPaymentId!);
            if (newPayment) onPaymentSuccess(newPayment); else onClose();
        } catch (error) { console.error("Failed to record payment:", error); alert("خطا در ثبت پرداخت."); }
    };
    return (
        <Modal title={`ثبت پرداخت برای ${supplier.name}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="block mb-1 text-sm font-medium text-gray-400">مبلغ بدهی فعلی</label><p className="text-lg font-bold text-yellow-400">${supplier.totalDebt.toFixed(2)}</p></div>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="مبلغ پرداختی" className="input-style" required min="0.01" step="0.01" />
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="نام تحویل گیرنده" className="input-style" required />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="شرح (اختیاری)" className="input-style" rows={2}></textarea>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-600 mt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">ثبت و چاپ رسید</button>
                </div>
            </form>
            <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }`}</style>
        </Modal>
    );
};
interface Transaction { date: string; description: string; detail?: string; debit: number; credit: number; balance: number; payment?: Payment; }
const SupplierLedgerModal: React.FC<{ supplier: Supplier, onClose: () => void }> = ({ supplier, onClose }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);
    useEffect(() => {
        const fetchTransactions = async () => {
            const purchases = await db.purchaseInvoices.where({ supplierId: supplier.id! }).toArray();
            const paymentsMade = await db.payments.where({ supplierId: supplier.id! }).toArray();
            const combined = [...purchases.map(p => ({ date: p.date, description: `فاکتور خرید #${p.invoiceNumber}`, debit: p.totalAmount, credit: 0 })), ...paymentsMade.map(p => ({ date: p.date, description: `پرداخت به ${p.recipientName}`, detail: p.description, debit: 0, credit: p.amount, payment: p }))];
            combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let runningBalance = 0;
            const transactionsWithBalance = combined.map(t => { runningBalance = runningBalance + t.debit - t.credit; return { ...t, balance: runningBalance }; });
            setTransactions(transactionsWithBalance.reverse());
        };
        fetchTransactions();
    }, [supplier.id]);
    return (
        <Modal title={`دفتر کل حساب: ${supplier.name}`} onClose={onClose}>
            <div className="space-y-4">
                <div className="p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
                    <span className="font-semibold text-gray-300">بدهی فعلی:</span><span className="text-xl font-bold text-yellow-400">${supplier.totalDebt.toFixed(2)}</span>
                </div>
                <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
                    <table className="w-full text-sm text-right text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0"><tr><th className="px-4 py-2">تاریخ</th><th className="px-4 py-2">شرح</th><th className="px-4 py-2">بدهکار</th><th className="px-4 py-2">بستانکار</th><th className="px-4 py-2">مانده</th><th className="px-4 py-2"></th></tr></thead>
                        <tbody className="divide-y divide-gray-700">
                            {transactions.map((t, index) => (
                                <tr key={index} className="hover:bg-gray-700/40">
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                                    <td className="px-4 py-2">{t.description}{t.detail && <span className="block text-xs text-gray-400">{t.detail}</span>}</td>
                                    <td className="px-4 py-2 text-red-400">{t.debit > 0 ? `$${t.debit.toFixed(2)}` : '-'}</td>
                                    <td className="px-4 py-2 text-green-400">{t.credit > 0 ? `$${t.credit.toFixed(2)}` : '-'}</td>
                                    <td className="px-4 py-2 font-semibold">${t.balance.toFixed(2)}</td>
                                    <td className="px-4 py-2">{t.payment && (<button onClick={() => setPaymentToPrint(t.payment!)} className="text-gray-400 hover:text-white" title="چاپ مجدد رسید"><Printer size={16} /></button>)}</td>
                                </tr>))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end pt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button></div>
            </div>
            {paymentToPrint && <PaymentReceiptModal payment={paymentToPrint} supplierName={supplier.name} onClose={() => setPaymentToPrint(null)} />}
        </Modal>
    );
}

const PrintLedgerModal: React.FC<{ supplier: Supplier, onClose: () => void }> = ({ supplier, onClose }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        const fetchTransactions = async () => {
            const purchases = await db.purchaseInvoices.where({ supplierId: supplier.id! }).toArray();
            const paymentsMade = await db.payments.where({ supplierId: supplier.id! }).toArray();
            const combined = [
                ...purchases.map(p => ({ date: p.date, description: `فاکتور خرید #${p.invoiceNumber}`, debit: p.totalAmount, credit: 0, payment: undefined })),
                ...paymentsMade.map(p => ({ date: p.date, description: `پرداخت به ${p.recipientName}`, detail: p.description, debit: 0, credit: p.amount, payment: p }))
            ];
            combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            let runningBalance = 0;
            const transactionsWithBalance = combined.map(t => {
                runningBalance = runningBalance + t.debit - t.credit;
                return { ...t, balance: runningBalance };
            });
            setTransactions(transactionsWithBalance);
        };
        fetchTransactions();
    }, [supplier.id]);

    const handlePrint = () => window.print();

    return (
        <Modal title={`چاپ دفتر کل: ${supplier.name}`} onClose={onClose}>
            <div className="space-y-4">
                <PrintableSupplierLedger supplier={supplier} transactions={transactions} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
                        <Printer size={18} />
                        <span>چاپ</span>
                    </button>
                </div>
                <style>{`@media print { .print-hidden { display: none; } }`}</style>
            </div>
        </Modal>
    );
};

const PaymentReceiptModal: React.FC<{ payment: Payment; supplierName: string; onClose: () => void; }> = ({ payment, supplierName, onClose }) => {
    const handlePrint = () => window.print();
    return (
        <Modal title="چاپ رسید پرداخت" onClose={onClose}>
            <div className="space-y-4">
                <PrintablePaymentReceipt payment={payment} supplierName={supplierName} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"><Printer size={18} /><span>چاپ</span></button>
                </div>
                <style>{`@media print { .print-hidden { display: none; } }`}</style>
            </div>
        </Modal>
    );
};

// =================================================================================================
//  ╔═╗╦  ╦╔╗╔╔╗╔╔═╗  ╔═╗╔═╗╦-╗╔═╗╦╔═╗╦  ╔═╗
//  ║  ║  ║║║║║║║║ ╦  ╠═╣║ │╠╦╝║ ╦║║  ║  ║╣ 
//  ╚═╝╚═╝╩╝╚╩╝╚╩╚═╝  ╩ ╩╚═╝╩╚═╚═╝╩╚═╝╩═╝╚═╝
// =================================================================================================

const ClinicSection = () => {
    const [ticketToPrint, setTicketToPrint] = useState<{ transaction: ClinicTransaction, serviceName: string, providerName?: string } | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<ClinicTransaction | null>(null);
    
    // Management states
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ClinicService | null>(null);
    const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null);

    const services = useLiveQuery(() => db.clinicServices.toArray(), []);
    const providers = useLiveQuery(() => db.serviceProviders.toArray(), []);
    const today = new Date().toISOString().split('T')[0];
    const dailyTransactions = useLiveQuery(() => db.clinicTransactions.where('date').startsWith(today).reverse().toArray(), [today]);

    // POS Form State
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [patientName, setPatientName] = useState('');

    const selectedService = useMemo(() => services?.find(s => s.id === Number(selectedServiceId)), [services, selectedServiceId]);
    
    const resetForm = () => {
        setSelectedServiceId('');
        setSelectedProviderId('');
        setPatientName('');
    }

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedService) {
            alert("لطفاً یک خدمت را انتخاب کنید.");
            return;
        }
        if (selectedService.requiresProvider && !selectedProviderId) {
            alert("لطفاً متخصص را انتخاب کنید.");
            return;
        }
        
        try {
            const todayStr = new Date().toISOString().split('T')[0];
            const lastTransaction = await db.clinicTransactions.where('date').startsWith(todayStr).last();
            const newTicketNumber = (lastTransaction?.ticketNumber || 0) + 1;

            const transaction: Omit<ClinicTransaction, 'id'> = {
                serviceId: selectedService.id!,
                providerId: selectedService.requiresProvider ? Number(selectedProviderId) : undefined,
                patientName: patientName,
                amount: selectedService.price,
                date: new Date().toISOString(),
                ticketNumber: newTicketNumber
            };

            const newId = await db.clinicTransactions.add(transaction as ClinicTransaction);
            const finalTransaction = await db.clinicTransactions.get(newId);
            const providerName = providers?.find(p => p.id === finalTransaction?.providerId)?.name;

            setTicketToPrint({ transaction: finalTransaction!, serviceName: selectedService.name, providerName });
            resetForm();

        } catch (error) {
            console.error("Failed to register clinic transaction", error);
            alert("خطا در ثبت تراکنش.");
        }
    }

    const handleReprint = (transaction: ClinicTransaction) => {
        const service = services?.find(s => s.id === transaction.serviceId);
        const provider = providers?.find(p => p.id === transaction.providerId);
        if (service) {
            setTicketToPrint({
                transaction,
                serviceName: service.name,
                providerName: provider?.name,
            });
        } else {
            alert('اطلاعات سرویس مربوط به این تراکنش یافت نشد.');
        }
    };

    const handleDeleteService = async (id?: number) => {
        if (!id || !window.confirm("آیا از حذف این خدمت مطمئن هستید؟")) return;
        if (await db.clinicTransactions.where({ serviceId: id }).count() > 0) {
            alert("امکان حذف خدمت دارای تراکنش وجود ندارد."); return;
        }
        await db.clinicServices.delete(id);
    }

    const handleDeleteProvider = async (id?: number) => {
        if (!id || !window.confirm("آیا از حذف این متخصص مطمئن هستید؟")) return;
        if (await db.clinicTransactions.where({ providerId: id }).count() > 0) {
             alert("امکان حذف متخصص دارای تراکنش وجود ندارد."); return;
        }
        await db.serviceProviders.delete(id);
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 {/* Clinic POS */}
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-3 flex items-center gap-2">
                        <Ticket size={20} />
                        صندوق کلینیک
                    </h3>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} className="input-style" required>
                            <option value="" disabled>-- انتخاب خدمت --</option>
                            {services?.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                        </select>
                        {selectedService?.requiresProvider && (
                            <select value={selectedProviderId} onChange={e => setSelectedProviderId(e.target.value)} className="input-style" required>
                                <option value="" disabled>-- انتخاب متخصص --</option>
                                {providers?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>)}
                            </select>
                        )}
                        <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="نام بیمار (اختیاری)" className="input-style" />
                        <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-500">
                            ثبت و چاپ نوبت
                        </button>
                    </form>
                </div>
                {/* Management section */}
                 <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-3">پیکربندی</h3>
                    <div className="space-y-4">
                        <ManagementList 
                            title="خدمات" 
                            icon={<HeartPulse size={18} />} 
                            items={services} 
                            onAdd={() => {setEditingService(null); setIsServiceModalOpen(true);}}
                            onEdit={(item) => {setEditingService(item as ClinicService); setIsServiceModalOpen(true);}}
                            onDelete={handleDeleteService}
                        />
                         <ManagementList 
                            title="متخصصین" 
                            icon={<UserSquare size={18} />} 
                            items={providers} 
                            onAdd={() => {setEditingProvider(null); setIsProviderModalOpen(true);}}
                            onEdit={(item) => {setEditingProvider(item as ServiceProvider); setIsProviderModalOpen(true);}}
                            onDelete={handleDeleteProvider}
                        />
                    </div>
                </div>
            </div>
            <div className="lg:col-span-3 bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-white border-b border-gray-600 pb-3">تراکنش‌های امروز</h3>
                <div className="max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-right text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">نوبت</th>
                                <th className="px-4 py-2">خدمت</th>
                                <th className="px-4 py-2">بیمار</th>
                                <th className="px-4 py-2">مبلغ</th>
                                <th className="px-4 py-2">عملیات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {dailyTransactions?.map(t => {
                                const service = services?.find(s => s.id === t.serviceId);
                                const provider = providers?.find(p => p.id === t.providerId);
                                return (
                                    <tr key={t.id} className="hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-bold text-blue-400 text-base">{t.ticketNumber}</td>
                                        <td className="px-4 py-3">
                                            {service?.name || 'حذف شده'}
                                            {provider && <span className="block text-xs text-gray-400">{provider.name}</span>}
                                        </td>
                                        <td className="px-4 py-3">{t.patientName || '-'}</td>
                                        <td className="px-4 py-3 font-semibold">${t.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => handleReprint(t)} className="text-gray-400 hover:text-white" title="چاپ مجدد"><Printer size={16} /></button>
                                                <button onClick={() => setEditingTransaction(t)} className="text-gray-400 hover:text-blue-400" title="ویرایش"><Edit size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {ticketToPrint && <PrintTicketModal {...ticketToPrint} onClose={() => setTicketToPrint(null)} />}
            {editingTransaction && <EditClinicTransactionModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} onSave={() => setEditingTransaction(null)} />}
            {isServiceModalOpen && <ServiceModal service={editingService} onClose={() => setIsServiceModalOpen(false)} />}
            {isProviderModalOpen && <ProviderModal provider={editingProvider} onClose={() => setIsProviderModalOpen(false)} />}
            <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }`}</style>
        </div>
    );
};

// --- Clinic Management Modals & Components ---
const ManagementList: React.FC<{title: string, icon: React.ReactNode, items: any[] | undefined, onAdd: () => void, onEdit: (item: any) => void, onDelete: (id?: number) => void}> = ({ title, icon, items, onAdd, onEdit, onDelete }) => (
    <div>
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold flex items-center gap-2">{icon}{title}</h4>
            <button onClick={onAdd} className="p-1.5 rounded-md hover:bg-gray-700"><Plus size={16} /></button>
        </div>
        <ul className="space-y-1 text-sm max-h-32 overflow-y-auto pr-2">
            {items?.map(item => (
                <li key={item.id} className="flex justify-between items-center p-1.5 rounded hover:bg-gray-700/50">
                    <span>{item.name} {item.price ? `($${item.price})` : ''}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-blue-400"><Edit size={14} /></button>
                        <button onClick={() => onDelete(item.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const ServiceModal: React.FC<{ service: ClinicService | null, onClose: () => void }> = ({ service, onClose }) => {
    const [name, setName] = useState(service?.name || '');
    const [price, setPrice] = useState<number | ''>(service?.price ?? '');
    const [requiresProvider, setRequiresProvider] = useState(service?.requiresProvider ?? false);
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name || Number(price) <= 0) return;
        const data = { name, price: Number(price), requiresProvider };
        if (service?.id) await db.clinicServices.update(service.id, data);
        else await db.clinicServices.add(data);
        onClose();
    };
    return (
        <Modal title={service ? "ویرایش خدمت" : "افزودن خدمت جدید"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="نام خدمت" className="input-style" required />
                <input type="number" value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="قیمت" className="input-style" required />
                <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={requiresProvider} onChange={e => setRequiresProvider(e.target.checked)} className="w-5 h-5 bg-gray-600 border-gray-500 rounded" /><span>نیاز به انتخاب متخصص دارد</span></label>
                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="btn-secondary">لغو</button><button type="submit" className="btn-primary">{service ? "ذخیره" : "افزودن"}</button></div>
            </form>
            <style>{`
                .input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; border-radius: 0.5rem; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4b5563; border-radius: 0.5rem; }
            `}</style>
        </Modal>
    );
};
const ProviderModal: React.FC<{ provider: ServiceProvider | null, onClose: () => void }> = ({ provider, onClose }) => {
    const [name, setName] = useState(provider?.name || '');
    const [specialty, setSpecialty] = useState(provider?.specialty || '');
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name) return;
        const data = { name, specialty };
        if (provider?.id) await db.serviceProviders.update(provider.id, data);
        else await db.serviceProviders.add(data);
        onClose();
    };
    return (
        <Modal title={provider ? "ویرایش متخصص" : "افزودن متخصص جدید"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="نام کامل متخصص" className="input-style" required />
                <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="تخصص (مثال: عمومی)" className="input-style" />
                <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onClose} className="btn-secondary">لغو</button><button type="submit" className="btn-primary">{provider ? "ذخیره" : "افزودن"}</button></div>
            </form>
            <style>{`
                .input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; border-radius: 0.5rem; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4b5563; border-radius: 0.5rem; }
            `}</style>
        </Modal>
    );
};
const PrintTicketModal: React.FC<{ transaction: ClinicTransaction; serviceName: string; providerName?: string; onClose: () => void; }> = ({ transaction, serviceName, providerName, onClose }) => {
    const handlePrint = () => window.print();
    return (
        <Modal title={`چاپ نوبت #${transaction.ticketNumber}`} onClose={onClose}>
            <PrintableClinicTicket transaction={transaction} serviceName={serviceName} providerName={providerName} />
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-700 print-hidden">
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"><Printer size={18} /><span>چاپ</span></button>
            </div>
            <style>{`@media print { .print-hidden { display: none; } }`}</style>
        </Modal>
    );
};


export default Accounting;