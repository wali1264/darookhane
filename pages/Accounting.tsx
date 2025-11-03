import React, { useState, useMemo, FormEvent, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Supplier, Payment, PurchaseInvoice, ClinicService, ServiceProvider, ClinicTransaction } from '../types';
import Modal from '../components/Modal';
// FIX: Added missing 'Edit' icon import.
import { Plus, Printer, Eye, Truck, Stethoscope, BookOpen, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { logActivity } from '../lib/activityLogger';
import { supabase } from '../lib/supabaseClient';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import PrintablePaymentReceipt from '../components/PrintablePaymentReceipt';
import PrintableSupplierLedger, { Transaction } from '../components/PrintableSupplierLedger';
import PrintableClinicTicket from '../components/PrintableClinicTicket';
import EditClinicTransactionModal from '../components/EditClinicTransactionModal';


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
    const { hasPermission } = useAuth();
    const availableTabs = useMemo(() => {
        const tabs: ('suppliers' | 'clinic' | 'simple')[] = [];
        if (hasPermission('accounting:suppliers:manage')) tabs.push('suppliers');
        if (hasPermission('accounting:clinic:manage')) tabs.push('clinic');
        // if (hasPermission('accounting:simple:manage')) tabs.push('simple'); // Add when ready
        return tabs;
    }, [hasPermission]);

    const [activeTab, setActiveTab] = useState<('suppliers' | 'clinic' | 'simple') | null>(availableTabs[0] || null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">حسابداری</h2>
                <div className="flex items-center gap-3 p-1 bg-gray-800 rounded-lg">
                    {availableTabs.includes('suppliers') && <TabButton active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} icon={<Truck size={18} />} text="حسابات تامین‌کنندگان" />}
                    {availableTabs.includes('clinic') && <TabButton active={activeTab === 'clinic'} onClick={() => setActiveTab('clinic')} icon={<Stethoscope size={18} />} text="صندوق کلینیک" />}
                    {/* {availableTabs.includes('simple') && <TabButton active={activeTab === 'simple'} onClick={() => setActiveTab('simple')} icon={<BookOpen size={18} />} text="حسابداری ساده" />} */}
                </div>
            </div>
            {activeTab === 'suppliers' && <SupplierAccounts />}
            {activeTab === 'clinic' && <ClinicFund />}
            {/* {activeTab === 'simple' && <div>Simple Accounting Coming Soon</div>} */}
            {activeTab === null && <div className="text-center text-gray-500 py-10">شما به هیچ بخشی از حسابداری دسترسی ندارید.</div>}
        </div>
    );
};

// ============================================================================
// Supplier Accounts Section
// ============================================================================
const SupplierAccounts: React.FC = () => {
    const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray());
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const isOnline = useOnlineStatus();

    const openPaymentModal = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsPaymentModalOpen(true);
    };

    const openLedgerModal = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsLedgerModalOpen(true);
    };

    const closeModal = () => {
        setSelectedSupplier(null);
        setIsPaymentModalOpen(false);
        setIsLedgerModalOpen(false);
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <table className="w-full text-sm text-right text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th className="px-6 py-3">نام تامین‌کننده</th>
                        <th className="px-6 py-3">بدهی کل</th>
                        <th className="px-6 py-3 text-center">عملیات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {suppliers?.map(supplier => (
                        <tr key={supplier.id}>
                            <td className="px-6 py-4 font-medium text-white">{supplier.name}</td>
                            <td className={`px-6 py-4 font-bold ${supplier.totalDebt > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                ${supplier.totalDebt.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 flex items-center justify-center gap-4">
                                <button onClick={() => openLedgerModal(supplier)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white" title="مشاهده دفتر کل"><Eye size={16} /> مشاهده دفتر کل</button>
                                <button onClick={() => openPaymentModal(supplier)} disabled={!isOnline} className="flex items-center gap-2 text-sm px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed" title={!isOnline ? "این عملیات در حالت آفلاین در دسترس نیست" : "ثبت پرداخت"}><Plus size={14} /> ثبت پرداخت</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {isPaymentModalOpen && selectedSupplier && <PaymentModal supplier={selectedSupplier} onClose={closeModal} />}
            {isLedgerModalOpen && selectedSupplier && <LedgerModal supplier={selectedSupplier} onClose={closeModal} />}
        </div>
    );
};

const PaymentModal: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => {
    const [amount, setAmount] = useState<number | ''>('');
    const [recipientName, setRecipientName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { showNotification } = useNotification();
    const [paymentToPrint, setPaymentToPrint] = useState<Payment | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!amount || amount <= 0 || !recipientName) {
            showNotification('لطفاً مبلغ و نام گیرنده را وارد کنید.', 'error');
            return;
        }

        if (Number(amount) > supplier.totalDebt && supplier.totalDebt > 0) {
            const confirmed = window.confirm(
                `مبلغ وارد شده (${Number(amount).toFixed(2)}$) از بدهی فعلی شما (${supplier.totalDebt.toFixed(2)}$) بیشتر است. آیا از ثبت این پرداخت و بستانکار شدن تامین‌کننده اطمینان دارید؟`
            );
            if (!confirmed) {
                return;
            }
        }

        setIsSaving(true);
        try {
            const paymentData = {
                p_supplier_id: supplier.remoteId!,
                p_amount: Number(amount),
                p_recipient_name: recipientName,
                p_description: description,
                p_date: new Date().toISOString(),
            };

            const { data, error } = await supabase.rpc('create_payment_transaction', paymentData);

            if (error || !data.success) {
                throw new Error(data?.message || error?.message);
            }
            
            // On success, update local supplier debt and add payment record for UI
            await db.suppliers.update(supplier.id!, { totalDebt: supplier.totalDebt - Number(amount) });
            const newPayment: Payment = {
                remoteId: data.new_payment_id,
                supplierId: supplier.id!,
                amount: Number(amount),
                date: paymentData.p_date,
                recipientName,
                description,
            };
            await db.payments.add(newPayment);

            await logActivity('CREATE', 'Payment', data.new_payment_id, { payment: newPayment });
            showNotification('پرداخت با موفقیت ثبت شد.', 'success');
            setPaymentToPrint(newPayment); // Trigger print view
        } catch (error: any) {
            console.error("Failed to save payment:", error);
            showNotification(`خطا در ثبت پرداخت: ${error.message}`, 'error');
            setIsSaving(false);
        }
    };

    if (paymentToPrint) {
        return (
             <Modal title="چاپ رسید پرداخت" onClose={onClose}>
                <PrintablePaymentReceipt payment={paymentToPrint} supplierName={supplier.name} />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"><Printer size={18}/>چاپ</button>
                </div>
                <style>{`@media print { .print-hidden { display: none; } }`}</style>
            </Modal>
        )
    }

    return (
        <Modal title={`ثبت پرداخت برای: ${supplier.name}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} placeholder="مبلغ پرداخت" required className="input-style" autoFocus />
                <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="نام تحویل گیرنده" required className="input-style" />
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="شرح (اختیاری)" className="input-style" />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500">{isSaving ? 'در حال ذخیره...' : 'ثبت پرداخت'}</button>
                </div>
                <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }`}</style>
            </form>
        </Modal>
    );
};

const LedgerModal: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    useEffect(() => {
        const fetchAndProcessTransactions = async () => {
            // JIT Sync: Fetch latest data from Supabase and cache it in Dexie before displaying.
            if (navigator.onLine && supplier.remoteId) {
                try {
                    // Fetch and cache purchase invoices
                    const { data: purchasesData } = await supabase.from('purchase_invoices').select('*').eq('supplier_id', supplier.remoteId);
                    if (purchasesData) {
                        const localPurchases = [];
                        for (const p of purchasesData) {
                            const existing = await db.purchaseInvoices.where('remoteId').equals(p.id).first();
                            localPurchases.push({
                                id: existing?.id,
                                remoteId: p.id,
                                invoiceNumber: p.invoice_number,
                                supplierId: supplier.id!,
                                date: p.date,
                                items: [], // Ledger doesn't need items, so an empty array is fine.
                                totalAmount: p.total_amount,
                                amountPaid: p.amount_paid
                            });
                        }
                        await db.purchaseInvoices.bulkPut(localPurchases);
                    }

                    // Fetch and cache payments
                    const { data: paymentsData } = await supabase.from('payments').select('*').eq('supplier_id', supplier.remoteId);
                    if (paymentsData) {
                        const localPayments = [];
                        for (const p of paymentsData) {
                            const existing = await db.payments.where('remoteId').equals(p.id).first();
                            localPayments.push({
                                id: existing?.id,
                                remoteId: p.id,
                                supplierId: supplier.id!,
                                amount: p.amount,
                                date: p.date,
                                recipientName: p.recipient_name,
                                description: p.description
                            });
                        }
                        await db.payments.bulkPut(localPayments);
                    }
                } catch (err) {
                    console.error("Failed to sync ledger data from Supabase:", err);
                    // Proceed with local data even if sync fails
                }
            }

            const purchases = await db.purchaseInvoices.where({ supplierId: supplier.id! }).toArray();
            const paymentsMade = await db.payments.where({ supplierId: supplier.id! }).toArray();
            
            const combined = [
                ...purchases.map(p => ({ type: 'purchase', data: p })),
                ...paymentsMade.map(p => ({ type: 'payment', data: p })),
            ];

            combined.sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

            const periodDebits = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const periodCredits = paymentsMade.reduce((sum, p) => sum + p.amount, 0);
            const openingBalance = supplier.totalDebt - (periodDebits - periodCredits);

            let runningBalance = openingBalance;
            const transactionsWithBalance: Transaction[] = [];

            if (combined.length > 0 || openingBalance !== 0) {
                transactionsWithBalance.push({
                    date: combined.length > 0 ? new Date(new Date(combined[0].data.date).getTime() - 1).toISOString() : new Date().toISOString(),
                    description: 'مانده اولیه',
                    debit: 0,
                    credit: 0,
                    balance: openingBalance,
                    isOpeningBalance: true,
                });
            }
            
            combined.forEach(item => {
                if (item.type === 'purchase') {
                    const p = item.data as PurchaseInvoice;
                    runningBalance += p.totalAmount;
                    transactionsWithBalance.push({ date: p.date, description: `فاکتور خرید #${p.invoiceNumber || ''}`, debit: p.totalAmount, credit: 0, balance: runningBalance });
                } else {
                    const p = item.data as Payment;
                    runningBalance -= p.amount;
                    transactionsWithBalance.push({ date: p.date, description: `پرداخت به ${p.recipientName || ''}`, detail: p.description, debit: 0, credit: p.amount, balance: runningBalance });
                }
            });

            if (transactionsWithBalance.length > 1) {
                const finalCalculatedBalance = transactionsWithBalance[transactionsWithBalance.length - 1].balance;
                if (Math.abs(finalCalculatedBalance - supplier.totalDebt) > 0.01) {
                    console.warn(`Ledger final balance (${finalCalculatedBalance}) does not match supplier total debt (${supplier.totalDebt}). Forcing correct balance.`);
                    transactionsWithBalance[transactionsWithBalance.length - 1].balance = supplier.totalDebt;
                }
            }
            
            setTransactions(transactionsWithBalance);
        };

        fetchAndProcessTransactions();
    }, [supplier.id, supplier.remoteId, supplier.totalDebt]);

    return (
        <Modal title={`دفتر کل: ${supplier.name}`} onClose={onClose}>
            <PrintableSupplierLedger supplier={supplier} transactions={transactions} />
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"><Printer size={18}/>چاپ</button>
            </div>
            <style>{`@media print { .print-hidden { display: none; } }`}</style>
        </Modal>
    )
};


// ============================================================================
// Clinic Fund Section
// ============================================================================
const ClinicFund: React.FC = () => {
    const services = useLiveQuery(() => db.clinicServices.toArray());
    const providers = useLiveQuery(() => db.serviceProviders.toArray());
    const recentTransactions = useLiveQuery(() => db.clinicTransactions.orderBy('id').reverse().limit(10).toArray(), []);
    
    const [isSaving, setIsSaving] = useState(false);
    const [serviceId, setServiceId] = useState<number | ''>('');
    const [providerId, setProviderId] = useState<number | ''>('');
    const [patientName, setPatientName] = useState('');
    const [ticketToPrint, setTicketToPrint] = useState<ClinicTransaction | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<ClinicTransaction | null>(null);
    const { showNotification } = useNotification();
    const isOnline = useOnlineStatus();

    const selectedService = useMemo(() => services?.find(s => s.id === serviceId), [services, serviceId]);
    // FIX: Explicitly typed useMemo to prevent TypeScript from inferring map values as 'unknown'.
    const serviceMap = useMemo<Map<number, string>>(() => {
        if (!services) return new Map();
        return new Map(services.map(s => [s.id!, s.name]));
    }, [services]);
    // FIX: Explicitly typed useMemo to prevent TypeScript from inferring map values as 'unknown'.
    const providerMap = useMemo<Map<number, string>>(() => {
        if (!providers) return new Map();
        return new Map(providers.map(p => [p.id!, p.name]));
    }, [providers]);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!serviceId) {
            showNotification('لطفا یک خدمت را انتخاب کنید.', 'error');
            return;
        }
        if (selectedService?.requiresProvider && !providerId) {
            showNotification('این خدمت نیاز به انتخاب متخصص دارد.', 'error');
            return;
        }

        setIsSaving(true);
        try {
            const { data, error } = await supabase.rpc('create_clinic_transaction');
            if (error) throw error;
            const ticketNumber = data;

            const transaction: Omit<ClinicTransaction, 'id'> = {
                serviceId: Number(serviceId),
                providerId: providerId ? Number(providerId) : undefined,
                patientName: patientName.trim(),
                amount: selectedService!.price,
                date: new Date().toISOString(),
                ticketNumber: ticketNumber
            };
            
            const newId = await db.clinicTransactions.add(transaction as ClinicTransaction);
            const newTransaction = await db.clinicTransactions.get(newId);

            setTicketToPrint(newTransaction!);
            setServiceId('');
            setProviderId('');
            setPatientName('');
            showNotification(`نوبت شماره ${ticketNumber} با موفقیت ثبت شد.`, 'success');
        } catch(err) {
            console.error("Error creating clinic transaction:", err);
            showNotification('خطا در ثبت تراکنش.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (ticketToPrint) {
        return (
            <Modal title="چاپ برگه نوبت" onClose={() => setTicketToPrint(null)}>
                <PrintableClinicTicket 
                    transaction={ticketToPrint} 
                    // FIX: Added a fallback to prevent runtime errors if a service is deleted but a transaction for it still exists.
                    serviceName={serviceMap.get(ticketToPrint.serviceId) || 'سرویس نامشخص'}
                    providerName={ticketToPrint.providerId ? providerMap.get(ticketToPrint.providerId) : undefined}
                />
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700 print-hidden">
                    <button onClick={() => setTicketToPrint(null)} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">بستن</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"><Printer size={18}/>چاپ</button>
                </div>
                <style>{`@media print { .print-hidden { display: none; } }`}</style>
            </Modal>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={handleSubmit} className="lg:col-span-1 bg-gray-800 rounded-lg p-6 border border-gray-700 space-y-4 h-min">
                <h3 className="text-xl font-bold text-white mb-2">ثبت تراکنش جدید</h3>
                <select value={serviceId} onChange={e => setServiceId(Number(e.target.value))} required className="input-style">
                    <option value="" disabled>-- انتخاب خدمت --</option>
                    {services?.map(s => <option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}
                </select>
                {selectedService?.requiresProvider && (
                    <select value={providerId} onChange={e => setProviderId(Number(e.target.value))} required className="input-style">
                         <option value="" disabled>-- انتخاب متخصص --</option>
                         {providers?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                )}
                <input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="نام بیمار (اختیاری)" className="input-style" />
                <button type="submit" disabled={isSaving || !isOnline} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isSaving ? 'در حال ثبت...' : 'ثبت و دریافت نوبت'}
                </button>
                 {!isOnline && <p className="text-xs text-center text-yellow-400">ثبت تراکنش فقط در حالت آنلاین امکان‌پذیر است.</p>}
            </form>
            <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">تراکنش‌های اخیر</h3>
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
                            {recentTransactions?.map(t => (
                                <tr key={t.id}>
                                    <td className="px-4 py-2 font-bold text-blue-300">{t.ticketNumber}</td>
                                    {/* FIX: Add fallback text for service/provider name in case they are deleted. */}
                                    <td className="px-4 py-2">{serviceMap.get(t.serviceId) || 'سرویس نامشخص'} {t.providerId ? `- ${providerMap.get(t.providerId) || 'متخصص نامشخص'}` : ''}</td>
                                    <td className="px-4 py-2">{t.patientName || 'عمومی'}</td>
                                    <td className="px-4 py-2">${t.amount.toFixed(2)}</td>
                                    <td className="px-4 py-2 flex gap-2">
                                        <button onClick={() => setTicketToPrint(t)} title="چاپ مجدد"><Printer size={16}/></button>
                                        <button onClick={() => setTransactionToEdit(t)} title="ویرایش"><Edit size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {transactionToEdit && <EditClinicTransactionModal transaction={transactionToEdit} onClose={() => setTransactionToEdit(null)} onSave={() => { setTransactionToEdit(null); showNotification('تغییرات با موفقیت ذخیره شد.', 'success'); }} />}
            <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }`}</style>
        </div>
    );
}

export default Accounting;