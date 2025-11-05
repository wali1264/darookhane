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
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 modal-backdrop print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-600 animate-fade-in-up modal-content-wrapper print:shadow-none print:border-none print:bg-transparent print:w-full print:h-full print:max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-700 print:hidden">
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
        <div className="p-6 overflow-y-auto modal-content print:p-0 print:overflow-visible">
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
          /* Hide all direct children of body except our modal backdrop */
          body > *:not(.modal-backdrop) {
            display: none !important;
          }
          
          /* Reset the entire modal structure to be simple block elements for printing */
          .modal-backdrop,
          .modal-content-wrapper,
          .modal-content {
            position: static !important;
            display: block !important;
            width: auto !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;
