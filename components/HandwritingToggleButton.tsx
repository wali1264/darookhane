import React from 'react';
import { PenLine } from 'lucide-react';
import { useHandwriting } from './HandwritingProvider';

const HandwritingToggleButton: React.FC = () => {
  const { isEnabled, isSupported, toggleHandwriting } = useHandwriting();

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="حالت نوشتاری در مرورگر شما پشتیبانی نمی‌شود"
        className="p-2 rounded-full bg-gray-700 text-gray-500 cursor-not-allowed"
      >
        <PenLine size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleHandwriting}
      title={isEnabled ? 'غیرفعال کردن حالت نوشتاری' : 'فعال کردن حالت نوشتاری'}
      className={`p-2 rounded-full transition-colors duration-200 ${
        isEnabled 
        ? 'bg-blue-600 text-white' 
        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
      }`}
    >
      <PenLine size={18} />
    </button>
  );
};

export default HandwritingToggleButton;
