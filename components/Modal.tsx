import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  headerContent?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, headerContent }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-600 animate-fade-in-up modal-content-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 print-hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {headerContent}
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto modal-content">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }

        @media print {
          /* 1. Hide everything on the page except for the modal's content */
          body > * {
            visibility: hidden !important;
          }
          .modal-backdrop, .modal-backdrop * {
            visibility: visible !important;
          }

          /* 2. THE FIX: Instead of 'display: contents', neutralize all modal container styles.
             This preserves the DOM structure which is more stable for print layout engines,
             while still allowing the content to take over the page. */
          .modal-backdrop {
            position: static !important;
            overflow: visible !important;
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }
          .modal-content-wrapper {
            width: auto !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            animation: none !important;
          }
          .modal-content {
            overflow: visible !important;
            padding: 0 !important;
          }

          /* 3. Hide any elements inside the modal marked as non-printable */
          .print-hidden {
            display: none !important;
          }

          /* 4. Basic body resets for a clean print output */
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
