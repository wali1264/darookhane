import React from 'react';
import { PurchaseInvoice } from '../types';

interface PrintablePurchaseInvoiceProps {
  invoice: PurchaseInvoice;
  supplierName: string;
}

const PrintablePurchaseInvoice = React.forwardRef<HTMLDivElement, PrintablePurchaseInvoiceProps>(({ invoice, supplierName }, ref) => {
  return (
    <div ref={ref} className="bg-gray-900 text-white p-6 printable-area">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">داروخانه شفا-یار</h1>
        <p className="text-gray-400">فاکتور خرید</p>
      </div>
      <div className="flex justify-between mb-4 text-sm">
        <div>
          <p><span className="font-semibold">شماره فاکتور:</span> {invoice.invoiceNumber}</p>
          <p><span className="font-semibold">تامین‌کننده:</span> {supplierName}</p>
        </div>
        <div>
          <p><span className="font-semibold">تاریخ:</span> {new Date(invoice.date).toLocaleDateString('fa-IR')}</p>
        </div>
      </div>
      <table className="w-full text-sm text-right">
        <thead className="border-b-2 border-gray-500">
          <tr>
            <th className="py-2 pr-2">#</th>
            <th className="py-2 text-right">نام دارو</th>
            <th className="py-2">تعداد</th>
            <th className="py-2">قیمت واحد</th>
            <th className="py-2">شماره لات</th>
            <th className="py-2">تاریخ انقضا</th>
            <th className="py-2 pl-2 text-left">قیمت کل</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={index} className="border-b border-gray-700">
              <td className="py-2 pr-2">{index + 1}</td>
              <td className="py-2 text-right">{item.name}</td>
              <td className="py-2">{item.quantity}</td>
              <td className="py-2">${item.purchasePrice.toFixed(2)}</td>
              <td className="py-2">{item.lotNumber}</td>
              <td className="py-2">{new Date(item.expiryDate).toLocaleDateString('fa-IR')}</td>
              <td className="py-2 pl-2 text-left">${(item.quantity * item.purchasePrice).toFixed(2)}</td>
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

export default PrintablePurchaseInvoice;
