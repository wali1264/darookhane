import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Drug, DrugType } from '../types';
import Modal from '../components/Modal';
import { Plus, Edit, Trash2, Sparkles } from 'lucide-react';
import HandwritingToggleButton from '../components/HandwritingToggleButton';

const Inventory: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);

  const drugs = useLiveQuery(() => db.drugs.toArray(), []);

  const openModalForNew = () => {
    setEditingDrug(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (drug: Drug) => {
    setEditingDrug(drug);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDrug(null);
  };

  const handleDelete = async (id?: number) => {
    if (id && window.confirm('آیا از حذف این دارو و تمام بچ‌های موجودی آن مطمئن هستید؟')) {
      await db.transaction('rw', db.drugs, db.drugBatches, async () => {
        await db.drugBatches.where({ drugId: id }).delete();
        await db.drugs.delete(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">مدیریت انبار</h2>
        <button
          onClick={openModalForNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          <span>افزودن داروی جدید</span>
        </button>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3">نام دارو</th>
                <th scope="col" className="px-6 py-3">شرکت</th>
                <th scope="col" className="px-6 py-3">موجودی کل</th>
                <th scope="col" className="px-6 py-3">قیمت فروش</th>
                <th scope="col" className="px-6 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {drugs?.map(drug => (
                <tr key={drug.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{drug.name}</td>
                  <td className="px-6 py-4">{drug.company}</td>
                  <td className="px-6 py-4">{drug.totalStock}</td>
                  <td className="px-6 py-4">${drug.salePrice.toFixed(2)}</td>
                  <td className="px-6 py-4 flex items-center gap-4">
                    <button onClick={() => openModalForEdit(drug)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(drug.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <DrugFormModal drug={editingDrug} onClose={closeModal} />
      )}
    </div>
  );
};

// This form now handles the definition of a drug AND its initial batch.
type DrugFormData = Omit<Drug, 'id' | 'purchasePrice' | 'salePrice' | 'totalStock'> & {
  purchasePrice: number | '';
  salePrice: number | '';
  totalStock: number | ''; // Represents the stock of the initial batch
  lotNumber: string;
  expiryDate: string;
};


const DrugFormModal: React.FC<{ drug: Drug | null; onClose: () => void; }> = ({ drug, onClose }) => {
  const [formData, setFormData] = useState<DrugFormData>({
    name: drug?.name || '',
    company: drug?.company || '',
    purchasePrice: drug?.purchasePrice ?? '',
    salePrice: drug?.salePrice ?? '',
    totalStock: drug?.totalStock ?? '', // Represents initial stock for a new drug
    type: drug?.type || DrugType.TABLET,
    barcode: drug?.barcode || '',
    internalBarcode: drug?.internalBarcode || '',
    // Batch-specific info for the *first* batch
    lotNumber: '',
    expiryDate: '',
  });

  const [isExpiryDateValid, setIsExpiryDateValid] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Note: For editing, we currently don't load batch info to keep the form simple.
  // The primary use case is adding a new drug with its first batch.

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const focusable = Array.from(
          form.querySelectorAll('input, select, button')
        ) as HTMLElement[];
        const index = focusable.indexOf(target);
        if (index > -1 && index < focusable.length - 1) {
          focusable[index + 1].focus();
        }
      }
    };
    
    form.addEventListener('keydown', handleKeyDown);
    return () => {
      form.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const validateExpiry = (value: string): boolean => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return true; // Empty is valid from a format perspective

      // Check for YYYY-MM-DD format, which might be set by the onBlur handler
      const yyyy_mm_dd_regex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
      const yyyy_mm_dd_match = trimmedValue.match(yyyy_mm_dd_regex);
      if (yyyy_mm_dd_match) {
          const year = parseInt(yyyy_mm_dd_match[1]);
          const month = parseInt(yyyy_mm_dd_match[2]);
          const day = parseInt(yyyy_mm_dd_match[3]);
          const date = new Date(year, month - 1, day);
          return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && year > 2000 && year < 2100;
      }

      // Original regex for user input formats (M/YYYY, YYYY/M, MMYYYY)
      const regex = /^(?:(\d{1,2})[\s\/-]?)(\d{4})$|^(\d{4})[\s\/-]?(\d{1,2})$/;
      const match = trimmedValue.match(regex);
      let monthStr, yearStr;

      if (match) {
        monthStr = match[1] || match[4];
        yearStr = match[2] || match[3];
      } else if (/^\d{5,6}$/.test(trimmedValue)) {
        monthStr = trimmedValue.slice(0, -4);
        yearStr = trimmedValue.slice(-4);
      }

      if (monthStr && yearStr) {
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        return (month >= 1 && month <= 12 && year > 2000 && year < 2100);
      }
      return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'expiryDate') {
      setIsExpiryDateValid(validateExpiry(value));
    }

    if (name === 'purchasePrice' || name === 'salePrice' || name === 'totalStock') {
       // Allow empty string or valid number input
      setFormData(prev => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleExpiryDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value || !isExpiryDateValid) return; // Don't format if invalid

    const regex = /^(?:(\d{1,2})[\s\/-]?)(\d{4})$|^(\d{4})[\s\/-]?(\d{1,2})$/;
    const match = value.match(regex);

    let monthStr: string | undefined, yearStr: string | undefined;

    if (match) {
      monthStr = match[1] || match[4];
      yearStr = match[2] || match[3];
    } else if (/^\d{5,6}$/.test(value)) {
      monthStr = value.slice(0, -4);
      yearStr = value.slice(-4);
    }

    if (monthStr && yearStr) {
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      if (month >= 1 && month <= 12 && year > 2000 && year < 2100) {
        const lastDay = new Date(year, month, 0).getDate();
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, expiryDate: formattedDate }));
        setIsExpiryDateValid(true);
        return;
      }
    }
  };

  const generateInternalBarcode = () => {
    const newBarcode = `INT-${Date.now()}`;
    setFormData(prev => ({...prev, internalBarcode: newBarcode}));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isExpiryDateValid) {
        alert('فرمت تاریخ انقضا نامعتبر است. لطفاً آن را اصلاح کنید.');
        return;
    }
    
    // Validate expiry date for new drugs
    if (!drug && formData.expiryDate) {
        const expiry = new Date(formData.expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        if (expiry < today) {
            alert('تاریخ انقضا نمی‌تواند در گذشته باشد.');
            return;
        }
    } else if (!drug && (!formData.lotNumber || !formData.expiryDate || formData.totalStock === '')) {
        alert('لطفاً اطلاعات بچ اولیه (شماره لات، تاریخ انقضا، موجودی) را وارد کنید.');
        return;
    }
    
    if (drug && drug.id) { // --- EDITING LOGIC ---
      const dataToUpdate: Partial<Drug> = {
        name: formData.name,
        company: formData.company,
        salePrice: Number(formData.salePrice) || 0,
        purchasePrice: Number(formData.purchasePrice) || 0,
        type: formData.type,
        barcode: formData.barcode,
        internalBarcode: formData.internalBarcode,
      };
      await db.drugs.update(drug.id, dataToUpdate);
    } else { // --- ADDING NEW DRUG LOGIC ---
      await db.transaction('rw', db.drugs, db.drugBatches, async () => {
        const drugToSave: Omit<Drug, 'id'> = {
          name: formData.name,
          company: formData.company,
          purchasePrice: Number(formData.purchasePrice) || 0,
          salePrice: Number(formData.salePrice) || 0,
          totalStock: Number(formData.totalStock) || 0,
          type: formData.type,
          barcode: formData.barcode,
          internalBarcode: formData.internalBarcode,
        };
        const newDrugId = await db.drugs.add(drugToSave as Drug);
        await db.drugBatches.add({
          drugId: newDrugId,
          lotNumber: formData.lotNumber,
          expiryDate: formData.expiryDate,
          quantityInStock: Number(formData.totalStock) || 0,
          purchasePrice: Number(formData.purchasePrice) || 0,
        });
      });
    }
    onClose();
  };
  
  const isEditing = !!drug;

  return (
    <Modal 
      title={isEditing ? 'ویرایش دارو' : 'افزودن داروی جدید'} 
      onClose={onClose}
      headerContent={<HandwritingToggleButton />}
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="نام دارو (مثال: آموکسی سیلین 500mg)" required className="input-style" />
          </div>
          <input name="company" value={formData.company} onChange={handleChange} placeholder="شرکت سازنده" required className="input-style" />
          <select name="type" value={formData.type} onChange={handleChange} className="input-style">
            {Object.values(DrugType).map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <input name="purchasePrice" value={formData.purchasePrice} onChange={handleChange} type="number" step="0.01" placeholder="قیمت خرید پیش‌فرض" required className="input-style" />
          <input name="salePrice" value={formData.salePrice} onChange={handleChange} type="number" step="0.01" placeholder="قیمت فروش" required className="input-style" />
          
           <div className="lg:col-span-3 border-t border-gray-600 pt-4 mt-2">
             <h3 className="text-sm font-semibold text-gray-400 mb-2">{isEditing ? 'کدهای شناسایی' : 'اطلاعات اولین بچ و موجودی اولیه'}</h3>
           </div>
          
          <input name="lotNumber" value={formData.lotNumber} onChange={handleChange} placeholder="شماره لات" required={!isEditing} disabled={isEditing} className={`input-style ${isEditing ? 'bg-gray-700' : ''}`} />
          <input name="expiryDate" value={formData.expiryDate} onChange={handleChange} onBlur={handleExpiryDateBlur} type="text" placeholder="تاریخ انقضا (مثال: ۲۰۲۷-۱۲)" required={!isEditing} disabled={isEditing} className={`input-style ${isEditing ? 'bg-gray-700' : ''} ${!isExpiryDateValid ? '!border-red-500' : ''}`} />
          <input name="totalStock" value={formData.totalStock} onChange={handleChange} type="number" placeholder="موجودی اولیه" required={!isEditing} disabled={isEditing} className={`input-style ${isEditing ? 'bg-gray-700' : ''}`} />
          
          <div className="lg:col-span-3">
             <input name="barcode" value={formData.barcode} onChange={handleChange} placeholder="کد محصول (بارکد یا QR با اسکنر وارد شود)" className="input-style" />
          </div>
           <div className="lg:col-span-3">
             <div className="relative">
              <input name="internalBarcode" value={formData.internalBarcode} onChange={handleChange} placeholder="بارکد داخلی (در صورت نبود کد خارجی)" className="input-style pr-32" />
              <button type="button" onClick={generateInternalBarcode} className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs bg-blue-600 text-white rounded-md px-2 py-1.5 hover:bg-blue-700">
                <Sparkles size={14} />
                ایجاد بارکد
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500">لغو</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">{isEditing ? 'ذخیره تغییرات' : 'افزودن'}</button>
        </div>
      </form>
      <style>{`
        .input-style {
          background-color: #1f2937;
          border: 1px solid #4b5563;
          color: #d1d5db;
          border-radius: 0.5rem;
          padding: 0.75rem;
          width: 100%;
          font-size: 0.875rem;
        }
        .input-style::placeholder {
            color: #6b7280;
        }
        .input-style:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }
        .input-style:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
      `}</style>
    </Modal>
  );
};

export default Inventory;