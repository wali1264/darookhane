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

const pageTitles: Record<Page, string> = {
  Dashboard: 'داشبورد',
  Inventory: 'مدیریت انبار',
  Sales: 'فروش (POS)',
  Purchases: 'خریدها',
  Accounting: 'حسابداری',
  Settings: 'تنظیمات',
};

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  
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
  const isOnline = useOnlineStatus();
  const { currentUser } = useAuth();

  useEffect(() => {
    // FIX: Replaced NodeJS.Timeout with 'number' for browser compatibility.
    let syncInterval: number | undefined;

    const startSyncProcess = () => {
      // Immediately attempt to sync when going online or on login
      processSyncQueue();
      
      // Then set up a regular interval to check for pending items
      syncInterval = setInterval(processSyncQueue, 15000) as unknown as number; // every 15 seconds
    };

    if (isOnline && currentUser) {
      startSyncProcess();
    }

    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [isOnline, currentUser]);

  return (
    <>
      <AppContent />
    </>
  );
};

export default App;