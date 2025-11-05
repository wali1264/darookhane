import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Supplier } from '../types';

export interface Transaction {
  date: string;
  description: string;
  detail?: string; // For recipient name
  debit: number; // Purchase
  credit: number; // Payment
  balance: number;
  isOpeningBalance?: boolean;
}

interface PrintableSupplierLedgerProps {
  supplier: Supplier;
  transactions: Transaction[];
}

const PrintableSupplierLedger = React.forwardRef<HTMLDivElement, PrintableSupplierLedgerProps>(({ supplier, transactions }, ref) => {
    const finalBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;
    const settings = useLiveQuery(() => db.settings.toArray());

    const pharmacyInfo = useMemo(() => {
        if (!settings) return { name: 'شفا-یار', logo: null };
        const name = settings.find(s => s.key === 'pharmacyName')?.value as string || 'شفا-یار';
        const logo = settings.find(s => s.key === 'pharmacyLogo')?.value as string || null;
        return { name, logo };
    }, [settings]);
    
    return (
        <div ref={ref} className="bg-gray-900 text-white p-6 printable-area ledger-print-content">
            <div className="header-placeholder">
                 <div className="text-center mb-6 flex flex-col items-center">
                    {pharmacyInfo.logo && <img src={pharmacyInfo.logo} alt="Pharmacy Logo" className="h-20 w-auto mb-2 object-contain" />}
                    <h1 className="text-2xl font-bold">{pharmacyInfo.name}</h1>
                    <p className="text-gray-400">صورت حساب تامین‌کننده</p>
                </div>

                <div className="flex justify-between mb-4 text-sm border-b border-gray-600 pb-4">
                    <div>
                        <p><span className="font-semibold">تامین‌کننده:</span> {supplier.name}</p>
                        {supplier.contactPerson && <p><span className="font-semibold">شخص مسئول:</span> {supplier.contactPerson}</p>}
                    </div>
                    <div>
                        <p><span className="font-semibold">تاریخ گزارش:</span> {new Date().toLocaleDateString('fa-IR')}</p>
                    </div>
                </div>
            </div>

            <table className="w-full text-sm text-right main-table">
                <thead>
                    <tr>
                        <th className="py-2 pr-2">تاریخ</th>
                        <th className="py-2 text-right">شرح</th>
                        <th className="py-2 text-right">تحویل گیرنده</th>
                        <th className="py-2 text-center">بدهکار (افزایش بدهی)</th>
                        <th className="py-2 text-center">بستانکار (کاهش بدهی)</th>
                        <th className="py-2 pl-2 text-left">مانده حساب</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((t, index) => (
                        <tr key={index} className={`row-item ${t.isOpeningBalance ? 'font-bold bg-gray-700/50' : ''}`}>
                            <td className="py-2.5 pr-2 whitespace-nowrap">
                                {!t.isOpeningBalance ? new Date(t.date).toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
                            </td>
                            <td className="py-2.5 text-right">{t.description}</td>
                             <td className="py-2.5 text-right text-gray-400">{t.detail || '-'}</td>
                            <td className="py-2.5 text-center text-red-400">{t.debit > 0 ? `$${t.debit.toFixed(2)}` : '-'}</td>
                            <td className="py-2.5 text-center text-green-400">{t.credit > 0 ? `$${t.credit.toFixed(2)}` : '-'}</td>
                            <td className={`py-2.5 pl-2 text-left font-semibold ${t.balance < 0 ? 'text-green-400' : ''}`}>
                                ${Math.abs(t.balance).toFixed(2)}
                                {t.balance < 0 && <span className="text-xs"> (بستانکار)</span>}
                            </td>
                        </tr>
                    ))}
                    {transactions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-10 text-gray-500">هیچ تراکنشی برای نمایش وجود ندارد.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="footer-placeholder">
                <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-xs text-right">
                        <div className="flex justify-between py-2 border-t-2 border-gray-500">
                            <span className="font-bold text-lg">مانده نهایی:</span>
                            <span className={`font-bold text-lg ${finalBalance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                            ${Math.abs(finalBalance).toFixed(2)}
                            {finalBalance < 0 ? ' (بستانکار)' : ' (بدهکار)'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .main-table thead tr th {
                    border-bottom: 2px solid #4b5563;
                }
                .row-item {
                    border-bottom: 1px solid #374151;
                    page-break-inside: avoid;
                }
                @media print {
                    @page {
                        size: A4;
                        margin: 1.5cm;
                    }
                    html, body {
                        background: white !important;
                    }
                    .printable-area {
                        display: block;
                        width: 100%;
                        position: static;
                        color: black !important;
                        background: white !important;
                        box-shadow: none;
                        border: none;
                        padding: 0;
                        font-size: 9pt;
                    }
                    .main-table {
                        width: 100%;
                    }
                    .main-table thead {
                        display: table-header-group; /* This is key for repeating headers */
                    }
                     .main-table tbody tr {
                        page-break-inside: avoid;
                    }
                    .main-table tfoot {
                        display: table-footer-group;
                    }
                    .header-placeholder, .footer-placeholder {
                        color: black !important;
                    }
                    .printable-area * {
                        color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    .printable-area .text-red-400 { color: #dc2626 !important; }
                    .printable-area .text-green-400 { color: #16a34a !important; }
                    .printable-area .text-yellow-400 { color: #ca8a04 !important; }
                    .printable-area .text-gray-400, .printable-area .text-gray-300 { color: #555 !important; }
                    .printable-area .font-bold { font-weight: 700 !important; }
                    .printable-area .border-gray-500, .printable-area .border-gray-600, .printable-area .border-gray-700, .main-table thead tr th, .row-item {
                        border-color: #ccc !important;
                    }
                    .printable-area .bg-gray-700\\/50 {
                         background-color: #f3f4f6 !important;
                    }
                }
            `}</style>
        </div>
    );
});

export default PrintableSupplierLedger;