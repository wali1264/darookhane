import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Accounting from './pages/Accounting';
import Settings from './pages/Settings';
import { Page } from './types';
import Header from './components/Header';
import AIAssistant from './components/AIAssistant';
import Notification from './components/Notification';
import { HandwritingProvider } from './components/HandwritingProvider';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
  message: string;
  type: NotificationType;
  id: number;
}

const pageTitles: Record<Page, string> = {
  Dashboard: 'داشبورد',
  Inventory: 'مدیریت انبار',
  Sales: 'فروش (POS)',
  Purchases: 'خریدها',
  Accounting: 'حسابداری',
  Settings: 'تنظیمات',
};

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('Dashboard');
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const newNotification = { message, type, id: Date.now() };
    setNotification(newNotification);
    setTimeout(() => {
        setNotification((current) => (current?.id === newNotification.id ? null : current));
    }, 4000);
  }, []);


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
    <HandwritingProvider>
      <div className="flex h-screen bg-gray-900 text-gray-100">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentPageTitle={pageTitles[activePage]} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </main>
        </div>
         {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        <AIAssistant showNotification={showNotification} />
      </div>
    </HandwritingProvider>
  );
};

export default App;