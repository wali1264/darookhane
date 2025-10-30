import React from 'react';
import { Supplier } from '../types';

interface Transaction {
  date: string;
  description: string;
  detail?: string;
  debit: number;
  credit: number;
  balance: number;
}

interface PrintableSupplierLedgerProps {
  supplier: Supplier;
  transactions: Transaction[];
}

const PrintableSupplierLedger = React.forwardRef<HTMLDivElement, PrintableSupplierLedgerProps>(({ supplier, transactions }, ref) => {
    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
    
    return (
        <div ref={ref} className="bg-gray-900 text-white p-6 printable-area">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">داروخانه شفا-یار</h1>
                <p className="text-gray-400">صورت حساب تامین‌کننده</p>
            </div>

            <div className="flex justify-between mb-4 text-sm border-b border-gray-600 pb-4">
                <div>
                    <p><span className="font-semibold">تامین‌کننده:</span> {supplier.name}</p>
                    {supplier.contactPerson && <p><span className="font-semibold">شخص مسئول:</span> {supplier.contactPerson}</p>}
                    {supplier.phone && <p><span className="font-semibold">تلفن:</span> {supplier.phone}</p>}
                </div>
                <div>
                    <p><span className="font-semibold">تاریخ گزارش:</span> {new Date().toLocaleDateString('fa-IR')}</p>
                </div>
            </div>

            <table className="w-full text-sm text-right">
                <thead className="border-b-2 border-gray-500">
                    <tr>
                        <th className="py-2 pr-2">تاریخ</th>
                        <th className="py-2 text-right">شرح</th>
                        <th className="py-2 text-center">بدهکار (خرید)</th>
                        <th className="py-2 text-center">بستانکار (پرداخت)</th>
                        <th className="py-2 pl-2 text-left">مانده</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, index) => (
                        <tr key={index} className="border-b border-gray-700">
                            <td className="py-2 pr-2 whitespace-nowrap">{new Date(t.date).toLocaleDateString('fa-IR')}</td>
                            <td className="py-2 text-right">{t.description}</td>
                            <td className="py-2 text-center text-red-400">{t.debit > 0 ? `$${t.debit.toFixed(2)}` : '-'}</td>
                            <td className="py-2 text-center text-green-400">{t.credit > 0 ? `$${t.credit.toFixed(2)}` : '-'}</td>
                            <td className="py-2 pl-2 text-left font-semibold">${t.balance.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs text-right">
                    <div className="flex justify-between py-2 border-t-2 border-gray-500">
                        <span className="font-bold text-lg">مانده نهایی:</span>
                        <span className={`font-bold text-lg ${finalBalance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>${finalBalance.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        color: black !important;
                        background: white !important;
                    }
                    .printable-area .text-red-400 { color: #dc2626 !important; }
                    .printable-area .text-green-400 { color: #16a34a !important; }
                    .printable-area .text-yellow-400 { color: #ca8a04 !important; }
                    .printable-area .text-gray-400 { color: #555 !important; }
                    .printable-area .border-gray-500, .printable-area .border-gray-600, .printable-area .border-gray-700 {
                        border-color: #ccc !important;
                    }
                }
            `}</style>
        </div>
    );
});

export default PrintableSupplierLedger;
