import React from 'react';
import { UserCog, Building, Shield } from 'lucide-react';

const Settings: React.FC = () => {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">تنظیمات سیستم</h2>
                <p className="text-gray-400 mt-2">مدیریت کاربران، سطوح دسترسی و پیکربندی سیستم.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
                    <div className="flex items-center gap-4 mb-3">
                        <UserCog className="text-blue-400" size={28} />
                        <h3 className="text-xl font-semibold">مدیریت کاربران</h3>
                    </div>
                    <p className="text-gray-400">افزودن، حذف یا ویرایش حساب‌های کارمندان و تنظیم رمز عبور آن‌ها.</p>
                </div>
                
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors">
                    <div className="flex items-center gap-4 mb-3">
                        <Shield className="text-blue-400" size={28} />
                        <h3 className="text-xl font-semibold">کنترل دسترسی</h3>
                    </div>
                    <p className="text-gray-400">تعریف نقش‌ها و مجوزها برای هر کاربر جهت کنترل دسترسی به بخش‌های مختلف.</p>
                </div>

                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors md:col-span-2">
                    <div className="flex items-center gap-4 mb-3">
                        <Building className="text-blue-400" size={28} />
                        <h3 className="text-xl font-semibold">مدیریت پورتال تامین‌کنندگان</h3>
                    </div>
                    <p className="text-gray-400">ایجاد و مدیریت حساب کاربری برای تامین‌کنندگان جهت مشاهده صورتحساب خود.</p>
                </div>
            </div>
            
            <div className="text-center text-gray-500 pt-8">
                <p>تنظیمات بیشتر در به‌روزرسانی‌های آینده اضافه خواهد شد.</p>
            </div>
        </div>
    );
};

export default Settings;
