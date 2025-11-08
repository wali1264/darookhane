import React, { useState } from 'react';
import { Drug } from '../types';
import Modal from './Modal';
import PrintPreviewModal from './PrintPreviewModal';
import PrintableSingleLabelSheet from './PrintableSingleLabelSheet';
import { Printer } from 'lucide-react';

interface PrintLabelsModalProps {
    drug: Drug;
    onClose: () => void;
}

const PrintLabelsModal: React.FC<PrintLabelsModalProps> = ({ drug, onClose }) => {
    const [count, setCount] = useState<number | ''>(100);
    const [widthCm, setWidthCm] = useState<number | ''>(5);
    const [heightCm, setHeightCm] = useState<number | ''>(2.5);
    const [showPreview, setShowPreview] = useState(false);

    const handlePrint = () => {
        if (!count || !widthCm || !heightCm) {
            alert("لطفاً تمام مقادیر را وارد کنید.");
            return;
        }
        setShowPreview(true);
    };

    if (showPreview) {
        return (
            <PrintPreviewModal 
                title={`پیش‌نمایش چاپ برچسب برای: ${drug.name}`} 
                onClose={() => setShowPreview(false)}
            >
                <PrintableSingleLabelSheet 
                    drug={drug} 
                    count={Number(count)}
                    widthCm={Number(widthCm)}
                    heightCm={Number(heightCm)}
                />
            </PrintPreviewModal>
        );
    }
    
    return (
        <Modal title={`تنظیمات چاپ برچسب برای: ${drug.name}`} onClose={onClose}>
            <div className="space-y-6">
                <p className="text-sm text-gray-400">
                    تعداد و اندازه برچسب‌ها را مطابق با کاغذ لیبل خود تنظیم کنید. اندازه‌ها به سانتی‌متر (cm) می‌باشند.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">تعداد برچسب</label>
                        <input type="number" value={count} onChange={e => setCount(e.target.value === '' ? '' : parseInt(e.target.value))} className="input-style w-full" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">عرض برچسب (cm)</label>
                        <input type="number" value={widthCm} onChange={e => setWidthCm(e.target.value === '' ? '' : parseFloat(e.target.value))} className="input-style w-full" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">ارتفاع برچسب (cm)</label>
                        <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value === '' ? '' : parseFloat(e.target.value))} className="input-style w-full" />
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
                    <button type="button" onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
                        <Printer size={18} />
                        پیش‌نمایش و چاپ
                    </button>
                </div>
                 <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; }`}</style>
            </div>
        </Modal>
    );
};

export default PrintLabelsModal;