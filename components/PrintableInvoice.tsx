import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SaleInvoice } from '../types';

interface PrintableInvoiceProps {
  invoice: SaleInvoice;
}

const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(({ invoice }, ref) => {
  const settings = useLiveQuery(() => db.settings.toArray());

  const pharmacyInfo = useMemo(() => {
    if (!settings) return { name: 'شفا-یار', logo: null };
    const name = settings.find(s => s.key === 'pharmacyName')?.value as string || 'شفا-یار';
    const logo = settings.find(s => s.key === 'pharmacyLogo')?.value as string || null;
    return { name, logo };
  }, [settings]);

  return (
    <div ref={ref} className="bg-gray-900 text-white p-6 printable-area">
      <div className="text-center mb-6 flex flex-col items-center">
        {pharmacyInfo.logo && <img src={pharmacyInfo.logo} alt="Pharmacy Logo" className="h-20 w-auto mb-2 object-contain" />}
        <h1 className="text-2xl font-bold">{pharmacyInfo.name}</h1>
        <p className="text-gray-400">فاکتور فروش</p>
      </div>
      <div className="flex justify-between mb-4 text-sm">
        <div>
          <p><span className="font-semibold">شماره فاکتور:</span> {invoice.remoteId || invoice.id}</p>
        </div>
        <div>
          <p><span className="font-semibold">تاریخ:</span> {new Date(invoice.date).toLocaleString('fa-IR')}</p>
        </div>
      </div>
      <table className="w-full text-sm text-right">
        <thead className="border-b-2 border-gray-500">
          <tr>
            <th className="py-2 pr-2">#</th>
            <th className="py-2">نام دارو</th>
            <th className="py-2">تعداد</th>
            <th className="py-2">قیمت واحد</th>
            <th className="py-2 pl-2">قیمت کل</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.drugId} className="border-b border-gray-700">
              <td className="py-2 pr-2">{index + 1}</td>
              <td className="py-2">{item.name}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">${item.unitPrice.toFixed(2)}</td>
              <td className="py-2 pl-2">${item.totalPrice.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-xs text-right">
          <div className="flex justify-between py-2 border-t-2 border-gray-500">
            <span className="font-bold text-lg">مبلغ کل:</span>
            <span className="font-bold text-lg">${invoice.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 mt-8">
        <p>از خرید شما سپاسگزاریم!</p>
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
        }
      `}</style>
    </div>
  );
});

export default PrintableInvoice;