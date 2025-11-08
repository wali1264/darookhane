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
          /* 1. Hide everything on the page by default */
          body > * {
            visibility: hidden !important;
          }

          /* 2. Make the modal's content visible. */
          .modal-backdrop, .modal-backdrop * {
            visibility: visible !important;
          }
          
          /* 3. Collapse the modal wrappers so their content is promoted to the body for printing.
             This is the key to removing the blank first page. */
          .modal-backdrop, .modal-content-wrapper {
            display: contents;
          }

          /* 4. The modal content is now effectively a direct child of the body. */
          .modal-content {
             padding: 0 !important;
             overflow: visible !important;
             height: auto !important;
          }

          /* 5. Hide elements specifically marked not to be printed. */
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Modal;