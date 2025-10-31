import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Accounting from './pages/Accounting';
import Settings from './pages/Settings';
import Login from './pages/Login';
import SupplierPortal from './pages/SupplierPortal';
import { Page } from './types';
import Header from './components/Header';
import AIAssistant from './components/AIAssistant';
import { useAuth } from './contexts/AuthContext';
import { Dna } from 'lucide-react';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { processSyncQueue } from './lib/syncService';


const pageTitles: Record<Page, string> = {
  Dashboard: 'داشبورد',
  Inventory: 'مدیریت انبار',
  Sales: 'فروش (POS)',
  Purchases: 'خریدها',
  Accounting: 'حسابداری',
  Settings: 'تنظیمات',
};

const MainApp: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');

  const renderPage = useCallback(() => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Inventory':
        return <Inventory />;
      case 'Sales':
        return <Sales />;
      case 'Purchases':
        return <Purchases />;
      case 'Accounting':
        return <Accounting />;
      case 'Settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  }, [activePage]);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentPageTitle={pageTitles[activePage]} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
      <AIAssistant />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const isOnline = useOnlineStatus();

  // Effect to trigger sync queue processing
  useEffect(() => {
    if (isOnline && currentUser) {
        // Trigger sync when online status changes to true or when user logs in
        console.log("App is online and user is logged in. Processing sync queue...");
        processSyncQueue();
    }
  }, [isOnline, currentUser]);

  // Periodic sync check
  useEffect(() => {
    const interval = setInterval(() => {
        if (navigator.onLine && currentUser) {
            processSyncQueue();
        }
    }, 60000); // Sync every 60 seconds
    return () => clearInterval(interval);
  }, [currentUser]);


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Dna size={48} className="text-blue-400 animate-spin" />
          <p className="text-lg text-gray-300">بارگذاری...</p>
        </div>
      </div>
    );
  }
  if (!currentUser) {
    return <Login />;
  }
  if (currentUser.type === 'supplier') {
      return <SupplierPortal />;
  }
  return <MainApp />;
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;