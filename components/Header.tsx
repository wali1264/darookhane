import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
    currentPageTitle: string;
}

const Header: React.FC<HeaderProps> = ({ currentPageTitle }) => {
    const isOnline = useOnlineStatus();

    return (
        <header className="bg-gray-800 shadow-md p-4 flex justify-between items-center border-b border-gray-700">
            <h1 className="text-2xl font-bold text-white">{currentPageTitle}</h1>
            <div className="flex items-center space-x-4">
                <div 
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        isOnline ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                    }`}
                >
                    {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                    <span>{isOnline ? 'آنلاین' : 'آفلاین'}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
