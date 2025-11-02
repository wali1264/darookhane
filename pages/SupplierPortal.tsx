import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import Header from '../components/Header';
import { Supplier, Payment, PurchaseInvoice } from '../types';
import { Printer } from 'lucide-react';
import PrintableSupplierLedger from '../components/PrintableSupplierLedger';
import Modal from '../components/Modal';

interface Transaction {
    date: string;
    description: string;
    detail?: string;
    debit: number;
    credit: number;
    balance: number;
}

const SupplierLedgerView: React.FC<{ supplier: Supplier }> = ({ supplier }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    useEffect(() => {
        const fetchTransactions = async () => {
            const purchases = await db.purchaseInvoices.where({ supplierId: supplier.id! }).toArray();
            const paymentsMade = await db.payments.where({ supplierId: supplier.id! }).toArray();
            
            const combined = [
                ...purchases.map(p => ({ type: 'purchase', data: p })),
                ...paymentsMade.map(p => ({ type: 'payment', data: p })),
            ];

            combined.sort((a, b) => new Date(a.data.date).getTime() - new Date(b.data.date).getTime());

            let runningBalance = 0;
            const transactionsWithBalance: Transaction[] = combined.map(item => {
                if (item.type === 'purchase') {
                    const p = item.data as PurchaseInvoice;
                    runningBalance += p.totalAmount;
                    return { date: p.date, description: `فاکتور خرید #${p.invoiceNumber}`, debit: p.totalAmount, credit: 0, balance: runningBalance };
                } else {
                    const p = item.data as Payment;
                    runningBalance -= p.amount;
                    return { date: p.date, description: `پرداخت به ${p.recipientName}`, detail: p.description, debit: 0, credit: p.amount, balance: runningBalance };
                }
            });
            setTransactions(transactionsWithBalance.reverse()); // Show most recent first
        };

        if (supplier.id) {
            fetchTransactions();
        }
    }, [supplier.id]);

    const finalBalance = transactions.length > 0 ? transactions[0].balance : 0;

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700 p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <div>
                    <h3 className="text-2xl font-bold text-white">دفتر کل حساب</h3>
                    <p className="text-gray-400">نمایش تمام تراکنش‌های مالی شما</p>
                </div>
                <button 
                    onClick={() => setIsPrintModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Printer size={18} />
                    <span>چاپ صورت حساب</span>
                </button>
            </div>
            <div className="p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-gray-300">بدهی فعلی:</span>
                <span className={`text-xl font-bold ${finalBalance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                    ${finalBalance.toFixed(2)}
                </span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm text-right text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-800 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">تاریخ</th>
                            <th className="px-4 py-2">شرح</th>
                            <th className="px-4 py-2">بدهکار (خرید)</th>
                            <th className="px-4 py-2">بستانکار (پرداخت)</th>
                            <th className="px-4 py-2">مانده</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {transactions.map((t, index) => (
                            <tr key={index} className="hover:bg-gray-700/40">
                                <td className="px-4 py-2 whitespace-nowrap">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                                <td className="px-4 py-2">
                                    {t.description}
                                    {t.detail && <span className="block text-xs text-gray-400">{t.detail}</span>}
                                </td>
                                <td className="px-4 py-2 text-red-400">{t.debit > 0 ? `$${t.debit.toFixed(2)}` : '-'}</td>
                                <td className="px-4 py-2 text-green-400">{t.credit > 0 ? `$${t.credit.toFixed(2)}` : '-'}</td>
                                <td className="px-4 py-2 font-semibold">${t.balance.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isPrintModalOpen && (
                <PrintLedgerModal 
                    supplier={supplier}
                    transactions={[...transactions].reverse()} // Reverse back for printing
                    onClose={() => setIsPrintModalOpen(false)} 
                />
            )}
        </div>
    );
}

const PrintLedgerModal: React.FC<{ supplier: Supplier, transactions: Transaction[], onClose: () => void }> = ({ supplier, transactions, onClose }) => {
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


const SupplierPortal: React.FC = () => {
  const { currentUser } = useAuth();
  
  const supplier = useLiveQuery(
    // FIX: Correctly access supplierId after type change in AuthContext.
    () => currentUser?.type === 'supplier' ? db.suppliers.get(currentUser.supplierId) : Promise.resolve(undefined),
    [currentUser?.type === 'supplier' ? currentUser.supplierId : undefined]
  );
  
  const renderContent = () => {
    if (!currentUser || currentUser.type !== 'supplier') {
        return <div className="text-center p-10">دسترسی نامعتبر</div>
    }
    if (!supplier) {
        return (
             <div className="flex h-screen w-full items-center justify-center bg-gray-900">
                <p className="text-lg text-gray-300">در حال بارگذاری اطلاعات...</p>
             </div>
        );
    }
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-100">
          <Header currentPageTitle={`پورتال تامین‌کننده: ${supplier.name}`} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <SupplierLedgerView supplier={supplier} />
          </main>
        </div>
    );
  }

  return renderContent();
};

export default SupplierPortal;