import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, CheckCircle, AlertTriangle, UploadCloud, WifiOff } from 'lucide-react';
import { syncStatusChannel } from '../lib/syncService';
import { db } from '../db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

type SyncState = 'syncing' | 'pending' | 'synced' | 'error' | 'offline';

interface SyncStatusMessage {
    status: SyncState;
    processed?: number;
    total?: number;
    count?: number;
    remaining?: number;
}

const SyncStatus: React.FC = () => {
    const [status, setStatus] = useState<SyncState>('synced');
    const [message, setMessage] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const isOnline = useOnlineStatus();
    const successTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // This effect runs on mount and whenever online status changes.
        if (!isOnline) {
            setStatus('offline');
            setMessage('شما آفلاین هستید');
            setIsVisible(true);
        } else {
            // When coming back online, check if there's anything to sync.
            db.syncQueue.count().then(count => {
                if (count > 0) {
                    setStatus('pending');
                    setMessage(`${count} تغییر در صف ارسال`);
                    setIsVisible(true);
                } else {
                    // If we were showing the "offline" badge, but now we're online
                    // and there's nothing to sync, we can hide the badge.
                    if (status === 'offline') {
                        setIsVisible(false);
                    }
                }
            });
        }
    // 'status' is intentionally omitted to avoid re-checking count on every status change.
    // We only care about checking when online status flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);


    useEffect(() => {
        const handleMessage = (event: MessageEvent<SyncStatusMessage>) => {
            const data = event.data;
            
            // Clear any pending timer to hide the success message
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
                successTimerRef.current = null;
            }

            setStatus(data.status);
            
            if (data.status === 'syncing' && data.total !== undefined && data.processed !== undefined) {
                setMessage(`در حال ارسال (${data.processed} از ${data.total})...`);
                setIsVisible(true);
            } else if (data.status === 'pending' && data.count !== undefined) {
                setMessage(`${data.count} تغییر در صف ارسال`);
                setIsVisible(true);
            } else if (data.status === 'synced') {
                setMessage('همگام‌سازی کامل شد');
                setIsVisible(true);
                // Set a timer to hide the component after a short delay
                successTimerRef.current = window.setTimeout(() => {
                    setIsVisible(false);
                }, 2500);
            } else if (data.status === 'error') {
                 setMessage(data.remaining ? `خطا! ${data.remaining} آیتم باقی مانده.` : 'خطا در همگام‌سازی');
                 setIsVisible(true);
            } else if (data.status === 'offline') {
                setMessage('شما آفلاین هستید');
                setIsVisible(true);
            }
        };

        syncStatusChannel.addEventListener('message', handleMessage);

        // Initial check on mount
        db.syncQueue.count().then(count => {
            if (count > 0 && navigator.onLine) {
                 handleMessage({ data: { status: 'pending', count } } as MessageEvent<SyncStatusMessage>);
            }
        });

        return () => {
            syncStatusChannel.removeEventListener('message', handleMessage);
            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }
        };
    }, []);

    const statusConfig: Record<SyncState, { icon: React.ReactNode, color: string, title: string }> = {
        syncing: {
            icon: <RotateCw size={16} className="animate-spin" />,
            color: 'text-blue-300',
            title: 'داده‌ها در حال ارسال به سرور هستند.'
        },
        pending: {
            icon: <UploadCloud size={16} />,
            color: 'text-gray-300',
            title: 'تغییرات به صورت محلی ذخیره شده و منتظر ارسال هستند.'
        },
        synced: {
            icon: <CheckCircle size={16} />,
            color: 'text-green-300',
            title: 'تمام داده‌ها با موفقیت همگام‌سازی شدند.'
        },
        error: {
            icon: <AlertTriangle size={16} />,
            color: 'text-red-400',
            title: 'در حین همگام‌سازی خطا رخ داد. برخی تغییرات ممکن است ارسال نشده باشند.'
        },
        offline: {
            icon: <WifiOff size={16} />,
            color: 'text-yellow-400',
            title: 'شما آفلاین هستید. تغییرات به صورت محلی ذخیره خواهند شد.'
        }
    };

    if (!isVisible) {
        return null;
    }

    const config = statusConfig[status];

    return (
        <div 
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-700/50 transition-all duration-300 ${config.color}`}
            title={config.title}
        >
            {config.icon}
            <span className="hidden sm:inline">{message || config.title}</span>
        </div>
    );
};

export default SyncStatus;
