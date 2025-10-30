import React from 'react';
import { DollarSign, AlertTriangle, Package, Users, LineChart } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-gray-800 rounded-xl shadow-lg p-6 flex items-center space-x-6 hover:bg-gray-700/50 transition-all duration-300 border border-gray-700">
    <div className={`p-4 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const totalProducts = useLiveQuery(() => db.drugs.count(), []);
  const lowStockCount = useLiveQuery(() => db.drugs.where('totalStock').below(10).count(), []);
  const totalSuppliers = useLiveQuery(() => db.suppliers.count(), []);
  // Sales data would be calculated from saleInvoices table in a real scenario
  const todaySales = '۰'; 

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">خوش آمدید!</h2>
        <p className="text-gray-400">گزارش لحظه‌ای از وضعیت داروخانه شما.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="فروش امروز" value={`$${todaySales}`} icon={<DollarSign size={28} className="text-white"/>} color="bg-green-500" />
        <StatCard title="هشدارهای کمبود موجودی" value={String(lowStockCount ?? 0)} icon={<AlertTriangle size={28} className="text-white"/>} color="bg-yellow-500" />
        <StatCard title="تعداد کل محصولات" value={String(totalProducts ?? 0)} icon={<Package size={28} className="text-white"/>} color="bg-blue-500" />
        <StatCard title="تعداد کل تامین‌کنندگان" value={String(totalSuppliers ?? 0)} icon={<Users size={28} className="text-white"/>} color="bg-purple-500" />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <LineChart className="ml-3 text-blue-400" />
          نمودار فروش (۷ روز گذشته)
        </h3>
        <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">داده‌های نمودار در فازهای آینده پیاده‌سازی خواهد شد.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;