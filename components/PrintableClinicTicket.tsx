import React from 'react';
import { ClinicTransaction } from '../types';

interface PrintableClinicTicketProps {
  transaction: ClinicTransaction;
  serviceName: string;
  providerName?: string;
}

const PrintableClinicTicket = React.forwardRef<HTMLDivElement, PrintableClinicTicketProps>(({ transaction, serviceName, providerName }, ref) => {
  return (
    <div ref={ref} className="bg-gray-900 text-white p-6 printable-area">
      <div className="text-center mb-6 border-b border-gray-600 pb-4">
        <h1 className="text-2xl font-bold">کلینیک شفا-یار</h1>
        <p className="text-gray-400 mt-1">برگه نوبت</p>
      </div>
      
      <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-400">تاریخ و ساعت:</p>
            <p className="font-semibold">{new Date(transaction.date).toLocaleString('fa-IR')}</p>
          </div>
          <div className="text-left">
            <p className="text-sm text-gray-400">شماره نوبت</p>
            <p className="text-4xl font-bold text-blue-400">{transaction.ticketNumber}</p>
          </div>
      </div>
      
      <div className="space-y-3 text-sm mb-6 border-t border-gray-700 pt-4">
        <div className="flex justify-between">
            <span className="font-semibold text-gray-400">نام بیمار:</span>
            <span className="font-bold">{transaction.patientName || 'عمومی'}</span>
        </div>
         <div className="flex justify-between">
            <span className="font-semibold text-gray-400">خدمت:</span>
            <span className="font-bold">{serviceName}</span>
        </div>
        {providerName && (
          <div className="flex justify-between">
              <span className="font-semibold text-gray-400">متخصص:</span>
              <span className="font-bold">{providerName}</span>
          </div>
        )}
      </div>

      <div className="my-6 p-4 bg-gray-700/50 border border-gray-600 rounded-lg text-center">
        <p className="text-gray-300 text-sm">مبلغ پرداخت شده</p>
        <p className="text-2xl font-bold text-green-400">${transaction.amount.toFixed(2)}</p>
      </div>
      
      <div className="text-center text-xs text-gray-500 mt-6">
        <p>لطفاً این برگه را تا زمان مراجعه به بخش مربوطه نزد خود نگهدارید.</p>
        <p>با آرزوی سلامتی</p>
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
            font-size: 12pt;
          }
           .printable-area h1, .printable-area p, .printable-area span {
                color: black !important;
           }
           .printable-area .text-gray-400 { color: #555 !important; }
           .printable-area .border-gray-600, .printable-area .border-gray-700 {
               border-color: #ccc !important;
           }
           .printable-area .bg-gray-700\\/50 {
               background-color: #f0f0f0 !important;
               border: 1px solid #ddd !important;
           }
            .printable-area .text-green-400 {
                color: #059669 !important;
            }
             .printable-area .text-blue-400 {
                color: #2563eb !important;
            }
        }
      `}</style>
    </div>
  );
});

export default PrintableClinicTicket;
