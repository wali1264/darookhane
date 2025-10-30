import React from 'react';
import { Payment } from '../types';

interface PrintablePaymentReceiptProps {
  payment: Payment;
  supplierName: string;
}

const PrintablePaymentReceipt = React.forwardRef<HTMLDivElement, PrintablePaymentReceiptProps>(({ payment, supplierName }, ref) => {
  return (
    <div ref={ref} className="bg-gray-900 text-white p-6 printable-area">
      <div className="text-center mb-8 border-b border-gray-600 pb-4">
        <h1 className="text-2xl font-bold">داروخانه شفا-یار</h1>
        <p className="text-gray-400 mt-1">رسید پرداخت وجه</p>
      </div>
      
      <div className="space-y-3 text-sm mb-6">
        <div className="flex justify-between">
            <span className="font-semibold text-gray-400">تاریخ و ساعت:</span>
            <span>{new Date(payment.date).toLocaleString('fa-IR')}</span>
        </div>
         <div className="flex justify-between">
            <span className="font-semibold text-gray-400">پرداخت به تامین‌کننده:</span>
            <span className="font-bold">{supplierName}</span>
        </div>
        <div className="flex justify-between">
            <span className="font-semibold text-gray-400">تحویل گیرنده:</span>
            <span className="font-bold">{payment.recipientName}</span>
        </div>
        {payment.description && (
          <div className="flex justify-between">
              <span className="font-semibold text-gray-400">شرح:</span>
              <span>{payment.description}</span>
          </div>
        )}
      </div>

      <div className="my-8 p-4 bg-blue-900/50 border border-blue-700 rounded-lg text-center">
        <p className="text-gray-300 text-sm">مبلغ پرداخت شده</p>
        <p className="text-2xl font-bold text-green-400 tracking-wider">${payment.amount.toFixed(2)}</p>
      </div>
      
      <div className="mt-16 grid grid-cols-3 gap-8 text-center text-xs">
         <div className="flex flex-col items-center justify-between">
            <p className="mb-12 font-semibold">امضای پرداخت کننده</p>
            <div className="w-full border-t border-gray-500 border-dashed"></div>
        </div>
         <div className="flex flex-col items-center justify-between">
            <p className="mb-12 font-semibold">امضای تحویل گیرنده</p>
             <div className="w-full border-t border-gray-500 border-dashed"></div>
        </div>
        <div className="flex flex-col items-center">
            <p className="font-semibold">محل اثر انگشت</p>
            <div className="w-20 h-24 mt-2 border-2 border-dashed border-gray-500 rounded-md flex items-center justify-center">
                <span className="text-gray-600"></span>
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
            border: none;
          }
           .printable-area h1, .printable-area p, .printable-area span {
                color: black !important;
           }
           .printable-area .text-gray-400 { color: #555 !important; }
           .printable-area .border-gray-600, .printable-area .border-gray-500, .printable-area .border-blue-700 {
               border-color: #ccc !important;
           }
           .printable-area .bg-blue-900\\/50 {
               background-color: #f0f0f0 !important;
           }
            .printable-area .text-green-400 {
                color: #059669 !important; /* A dark green */
            }
        }
      `}</style>
    </div>
  );
});

export default PrintablePaymentReceipt;
