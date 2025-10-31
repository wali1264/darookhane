import React, { useState, useMemo, FormEvent, useCallback, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { User, Role, Permission, PERMISSIONS, Supplier, SupplierAccount, ExpiryThreshold, AppSetting } from '../types';
import Modal from '../components/Modal';
import { Plus, Edit, Trash2, Users, Shield, BookHeart, DatabaseBackup, UploadCloud, AlertTriangle, Bell, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { logActivity } from '../lib/activityLogger';

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; text: string }> = ({ active, onClick, icon, text }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
    >
        {icon}
        {text}
    </button>
);

const Settings: React.FC = () => {
    const { hasPermission } = useAuth();
    const availableTabs = useMemo(() => {
        const tabs: ('users' | 'roles' | 'portal' | 'backup' | 'alerts')[] = [];
        if (hasPermission('settings:users:view')) tabs.push('users');
        if (hasPermission('settings:roles:view')) tabs.push('roles');
        if (hasPermission('settings:portal:manage')) tabs.push('portal');
        if (hasPermission('settings:backup:manage')) tabs.push('backup');
        if (hasPermission('settings:alerts:manage')) tabs.push('alerts');
        return tabs;
    }, [hasPermission]);

    const [activeTab, setActiveTab] = useState<('users' | 'roles' | 'portal' | 'backup' | 'alerts') | null>(availableTabs[0] || null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">تنظیمات</h2>
                <div className="flex items-center gap-3 p-1 bg-gray-800 rounded-lg">
                    {availableTabs.includes('users') && <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} text="مدیریت کاربران" />}
                    {availableTabs.includes('roles') && <TabButton active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} icon={<Shield size={18} />} text="مدیریت نقش‌ها" />}
                    {availableTabs.includes('portal') && <TabButton active={activeTab === 'portal'} onClick={() => setActiveTab('portal')} icon={<BookHeart size={18} />} text="پورتال تامین‌کنندگان" />}
                    {availableTabs.includes('backup') && <TabButton active={activeTab === 'backup'} onClick={() => setActiveTab('backup')} icon={<DatabaseBackup size={18} />} text="پشتیبان‌گیری و بازیابی" />}
                    {availableTabs.includes('alerts') && <TabButton active={activeTab === 'alerts'} onClick={() => setActiveTab('alerts')} icon={<Bell size={18} />} text="مدیریت هشدارها" />}
                </div>
            </div>
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'roles' && <RoleManagement />}
            {activeTab === 'portal' && <SupplierPortalManagement />}
            {activeTab === 'backup' && <BackupRestoreSection />}
            {activeTab === 'alerts' && <AlertManagement />}
            {activeTab === null && <div className="text-center text-gray-500 py-10">شما به هیچ بخشی از تنظیمات دسترسی ندارید.</div>}
        </div>
    );
};

// Alert Management Section
const AlertManagement: React.FC = () => {
    const { showNotification } = useNotification();
    const dbSettings = useLiveQuery(() => db.settings.toArray());
    
    const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(10);
    const [expiryValue, setExpiryValue] = useState<number | ''>(3);
    const [expiryUnit, setExpiryUnit] = useState<'days' | 'weeks' | 'months'>('months');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (dbSettings) {
            const lowStockSetting = dbSettings.find(s => s.key === 'lowStockThreshold');
            if (lowStockSetting) setLowStockThreshold(lowStockSetting.value as number);
            
            const expirySetting = dbSettings.find(s => s.key === 'expiryAlertThreshold');
            if (expirySetting) {
                const { value, unit } = expirySetting.value as ExpiryThreshold;
                setExpiryValue(value);
                setExpiryUnit(unit);
            }
        }
    }, [dbSettings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const oldSettings = {
                lowStock: dbSettings?.find(s => s.key === 'lowStockThreshold')?.value,
                expiry: dbSettings?.find(s => s.key === 'expiryAlertThreshold')?.value,
            };

            const settingsToSave: AppSetting[] = [
                { key: 'lowStockThreshold', value: Number(lowStockThreshold) || 10 },
                { key: 'expiryAlertThreshold', value: { value: Number(expiryValue) || 3, unit: expiryUnit } }
            ];
            await db.settings.bulkPut(settingsToSave);

            const newSettings = {
                lowStock: settingsToSave[0].value,
                expiry: settingsToSave[1].value,
            };

            await logActivity('UPDATE', 'Settings', 'alerts', { old: oldSettings, new: newSettings });

            showNotification('تنظیمات با موفقیت ذخیره شد.', 'success');
        } catch (error) {
            console.error("Failed to save settings:", error);
            showNotification('خطا در ذخیره تنظیمات.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSave();
    };

    return (
        <form onSubmit={handleFormSubmit} className="bg-gray-800 rounded-lg p-6 border border-gray-700 max-w-2xl mx-auto space-y-8">
            <div>
                <h3 className="text-xl font-bold text-white mb-2">هشدار کمبود موجودی</h3>
                <p className="text-gray-400 text-sm mb-4">
                    زمانی که موجودی کل یک دارو از عدد مشخص شده کمتر شود، در داشبورد به شما هشدار داده خواهد شد.
                </p>
                <div className="flex items-center gap-4">
                    <label htmlFor="lowStock" className="text-gray-300">آستانه هشدار:</label>
                    <input
                        id="lowStock"
                        type="number"
                        value={lowStockThreshold}
                        onChange={(e) => setLowStockThreshold(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className="input-style w-32"
                    />
                    <span className="text-gray-400">عدد</span>
                </div>
            </div>

             <div className="border-t border-gray-700 pt-8">
                <h3 className="text-xl font-bold text-white mb-2">هشدار انقضای دارو</h3>
                <p className="text-gray-400 text-sm mb-4">
                    داروهایی که تاریخ انقضای آنها در محدوده زمانی مشخص شده قرار دارد، در داشبورد نمایش داده خواهند شد.
                </p>
                <div className="flex items-center gap-4">
                     <label className="text-gray-300">هشدار بده اگر کمتر از</label>
                     <input
                        type="number"
                        value={expiryValue}
                        onChange={(e) => setExpiryValue(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        className="input-style w-24"
                    />
                    <select
                        value={expiryUnit}
                        onChange={(e) => setExpiryUnit(e.target.value as any)}
                        className="input-style"
                    >
                        <option value="days">روز</option>
                        <option value="weeks">هفته</option>
                        <option value="months">ماه</option>
                    </select>
                    <span className="text-gray-400">به تاریخ انقضا باقی مانده بود.</span>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-700">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500"
                >
                    <Save size={18} />
                    {isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                </button>
            </div>
             <style>{`.input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.5rem 0.75rem; }`}</style>
        </form>
    );
};


// Backup and Restore Section
const BackupRestoreSection: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showNotification } = useNotification();

    const handleBackup = async () => {
        setIsLoading(true);
        try {
            const backupData: { [key: string]: any[] } = {};
            const tableNames = db.tables.map(table => table.name);

            await Promise.all(tableNames.map(async (name) => {
                if (name !== 'sync_queue') { // Don't back up the sync queue
                    const tableData = await db.table(name).toArray();
                    backupData[name] = tableData;
                }
            }));
            
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `shafayar-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await logActivity('BACKUP', 'Settings', 'database', { filename: a.download });
            showNotification('فایل پشتیبان با موفقیت ایجاد شد.', 'success');
        } catch (error) {
            console.error("Backup failed:", error);
            showNotification('خطا در ایجاد نسخه پشتیبان.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const processRestoreFile = (file: File) => {
        if (!file || !file.type.includes('json')) {
            showNotification('لطفاً یک فایل پشتیبان با فرمت JSON انتخاب کنید.', 'error');
            return;
        }

        const confirmation = window.confirm(
            "*** هشدار بسیار مهم! ***\n\n" +
            "آیا مطمئن هستید که می‌خواهید اطلاعات را بازیابی کنید؟\n\n" +
            "این عمل تمام داده‌های فعلی برنامه را به طور کامل پاک کرده و با اطلاعات موجود در فایل پشتیبان جایگزین می‌کند. این عملیات غیرقابل بازگشت است!"
        );

        if (!confirmation) return;
        
        setIsRestoring(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target?.result as string);
                
                const requiredTables = ['drugs', 'suppliers', 'users', 'roles'];
                if (!requiredTables.every(table => backupData.hasOwnProperty(table))) {
                    throw new Error("فایل پشتیبان نامعتبر است یا ساختار صحیحی ندارد.");
                }

                await db.transaction('rw', db.tables, async () => {
                    for (const tableName of Object.keys(backupData)) {
                        const table = db.table(tableName);
                        await table.clear();
                        await table.bulkAdd(backupData[tableName]);
                    }
                });
                
                await logActivity('RESTORE', 'Settings', 'database', { filename: file.name });
                showNotification("بازیابی موفق بود. برنامه مجدداً بارگذاری می‌شود.", 'success');
                setTimeout(() => window.location.reload(), 2000);

            } catch (error) {
                console.error("Restore failed:", error);
                showNotification(`خطا در بازیابی اطلاعات: ${error}`, 'error');
                setIsRestoring(false);
            }
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processRestoreFile(e.target.files[0]);
        }
    };
    
     const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processRestoreFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
            {/* Backup Card */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col items-center text-center">
                <DatabaseBackup size={48} className="text-blue-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">ایجاد نسخه پشتیبان</h3>
                <p className="text-gray-400 text-sm mb-6">
                    از تمام اطلاعات برنامه (داروها، فاکتورها، کاربران و...) یک فایل پشتیبان با فرمت JSON در کامپیوتر خود ذخیره کنید.
                </p>
                <button
                    onClick={handleBackup}
                    disabled={isLoading}
                    className="w-full max-w-xs flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-500 disabled:cursor-wait"
                >
                    {isLoading ? "در حال ایجاد..." : "شروع پشتیبان‌گیری"}
                </button>
            </div>

            {/* Restore Card */}
             <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col items-center text-center">
                <UploadCloud size={48} className="text-green-400 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">بازیابی اطلاعات</h3>
                <p className="text-gray-400 text-sm mb-6">
                    اطلاعات را از یک فایل پشتیبان JSON که قبلاً ذخیره کرده‌اید، بازیابی کنید.
                </p>
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-500'}`}
                >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    {isRestoring ? (
                        <p>در حال بازیابی...</p>
                    ) : (
                        <p>فایل پشتیبان را اینجا بکشید یا برای انتخاب کلیک کنید</p>
                    )}
                </div>
                 <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg flex items-start gap-3 text-right">
                    <AlertTriangle size={32} className="text-yellow-400 flex-shrink-0 mt-1" />
                    <p className="text-xs text-yellow-300">
                        <span className="font-bold">هشدار:</span> عمل بازیابی تمام داده‌های فعلی شما را حذف خواهد کرد. این کار غیرقابل بازگشت است.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Supplier Portal Management
const SupplierPortalManagement: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const { showNotification } = useNotification();

    const suppliers = useLiveQuery(() => db.suppliers.orderBy('name').toArray());
    const supplierAccounts = useLiveQuery(() => db.supplierAccounts.toArray());
    
    const accountsMap = useMemo(() => {
        return new Map(supplierAccounts?.map(acc => [acc.supplierId, acc]));
    }, [supplierAccounts]);

    const openModal = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedSupplier(null);
        setIsModalOpen(false);
    };

    const handleDeleteAccount = async (supplierId?: number) => {
        if (!supplierId || !window.confirm('آیا از حذف حساب پورتال این تامین‌کننده مطمئن هستید؟')) return;
        const account = await db.supplierAccounts.where({ supplierId }).first();
        if (account?.id) {
            await db.supplierAccounts.delete(account.id);
            await logActivity('DELETE', 'SupplierAccount', account.id, { deletedAccount: account });
            showNotification('حساب پورتال با موفقیت حذف شد.', 'success');
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <table className="w-full text-sm text-right text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-6 py-3">نام تامین‌کننده</th>
                        <th scope="col" className="px-6 py-3">نام کاربری پورتال</th>
                        <th scope="col" className="px-6 py-3 text-center">عملیات</th>
                    </tr>
                </thead>
                <tbody>
                    {suppliers?.map(supplier => {
                        const account = accountsMap.get(supplier.id!);
                        return (
                             <tr key={supplier.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">{supplier.name}</td>
                                <td className="px-6 py-4">{account ? account.username : <span className="text-gray-500">ایجاد نشده</span>}</td>
                                <td className="px-6 py-4 flex items-center justify-center gap-4">
                                    {account ? (
                                        <>
                                            <button onClick={() => openModal(supplier)} className="text-blue-400 hover:text-blue-300" title="بازنشانی رمز عبور"><Edit size={18} /></button>
                                            <button onClick={() => handleDeleteAccount(supplier.id)} className="text-red-400 hover:text-red-300" title="حذف حساب"><Trash2 size={18} /></button>
                                        </>
                                    ) : (
                                        <button onClick={() => openModal(supplier)} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                            <Plus size={14} />
                                            <span>ایجاد حساب</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {isModalOpen && selectedSupplier && (
                <SupplierAccountFormModal 
                    supplier={selectedSupplier}
                    account={accountsMap.get(selectedSupplier.id!)}
                    onClose={closeModal}
                />
            )}
        </div>
    );
};

// User Management Component
const UserManagement: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { hasPermission } = useAuth();
    const { showNotification } = useNotification();

    const users = useLiveQuery(() => db.users.toArray(), []);
    const roles = useLiveQuery(() => db.roles.toArray(), []);
    const rolesMap = useMemo(() => new Map(roles?.map(role => [role.id, role.name])), [roles]);

    const openModalForNew = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (userId?: number) => {
        if (!userId || !window.confirm('آیا از حذف این کاربر مطمئن هستید؟')) return;
        
        const user = await db.users.get(userId);
        if (user?.username.toLowerCase() === 'admin') {
            showNotification('کاربر ادمین قابل حذف نیست.', 'error');
            return;
        }

        await db.users.delete(userId);
        await logActivity('DELETE', 'User', String(userId), { deletedUser: user });
        showNotification('کاربر با موفقیت حذف شد.', 'success');
    };
    
    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                {hasPermission('settings:users:manage') && (
                    <button onClick={openModalForNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus size={20} /> افزودن کاربر جدید
                    </button>
                )}
            </div>
             <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-right text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">نام کاربری</th>
                            <th scope="col" className="px-6 py-3">نقش</th>
                            <th scope="col" className="px-6 py-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map(user => (
                            <tr key={user.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                <td className="px-6 py-4">{rolesMap.get(user.roleId) || 'ناشناخته'}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                    {hasPermission('settings:users:manage') && (
                                        <>
                                            <button onClick={() => openModalForEdit(user)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && <UserFormModal user={editingUser} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// Role Management Component
const RoleManagement: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const { hasPermission } = useAuth();
    const { showNotification } = useNotification();
    
    const roles = useLiveQuery(() => db.roles.toArray(), []);

    const openModalForNew = () => {
        setEditingRole(null);
        setIsModalOpen(true);
    };
    
    const openModalForEdit = (role: Role) => {
        if (!role.isEditable) {
            showNotification('نقش ادمین قابل ویرایش نیست.', 'info');
            return;
        }
        setEditingRole(role);
        setIsModalOpen(true);
    };

    const handleDelete = async (roleId?: number) => {
        if (!roleId || !window.confirm('آیا از حذف این نقش مطمئن هستید؟')) return;
        
        const role = await db.roles.get(roleId);
        if (!role?.isEditable) {
            showNotification('نقش ادمین قابل حذف نیست.', 'error');
            return;
        }

        const usersWithRole = await db.users.where({ roleId }).count();
        if (usersWithRole > 0) {
            showNotification('این نقش به یک یا چند کاربر اختصاص داده شده و قابل حذف نیست.', 'error');
            return;
        }
        
        await db.roles.delete(roleId);
        await logActivity('DELETE', 'Role', String(roleId), { deletedRole: role });
        showNotification('نقش با موفقیت حذف شد.', 'success');
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                {hasPermission('settings:roles:manage') && (
                    <button onClick={openModalForNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus size={20} /> افزودن نقش جدید
                    </button>
                )}
            </div>
             <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm text-right text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">نام نقش</th>
                            <th scope="col" className="px-6 py-3">تعداد دسترسی‌ها</th>
                            <th scope="col" className="px-6 py-3">عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles?.map(role => (
                            <tr key={role.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-medium text-white">{role.name}</td>
                                <td className="px-6 py-4">{role.permissions.length}</td>
                                <td className="px-6 py-4 flex items-center gap-4">
                                     {hasPermission('settings:roles:manage') && role.isEditable && (
                                        <>
                                            <button onClick={() => openModalForEdit(role)} className="text-blue-400 hover:text-blue-300"><Edit size={18} /></button>
                                            <button onClick={() => handleDelete(role.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18} /></button>
                                        </>
                                     )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isModalOpen && <RoleFormModal role={editingRole} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

// Supplier Account Form Modal
const SupplierAccountFormModal: React.FC<{ supplier: Supplier; account: SupplierAccount | undefined; onClose: () => void; }> = ({ supplier, account, onClose }) => {
    const [username, setUsername] = useState(account?.username || '');
    const [password, setPassword] = useState('');
    const { showNotification } = useNotification();
    const isEditing = !!account;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username.trim() || (!isEditing && !password.trim())) {
            showNotification('لطفا نام کاربری و رمز عبور را وارد کنید.', 'error');
            return;
        }

        try {
            const existingAccount = await db.supplierAccounts.where('username').equalsIgnoreCase(username.trim()).first();
            if (existingAccount && existingAccount.id !== account?.id) {
                showNotification('این نام کاربری قبلاً استفاده شده است.', 'error');
                return;
            }

            if (isEditing && account?.id) {
                const oldAccount = await db.supplierAccounts.get(account.id);
                const dataToUpdate: Partial<SupplierAccount> = { username: username.trim() };
                if(password.trim()) dataToUpdate.passwordHash = password.trim();

                await db.supplierAccounts.update(account.id, dataToUpdate);
                await logActivity('UPDATE', 'SupplierAccount', account.id, { old: oldAccount, new: dataToUpdate });
                showNotification('حساب تامین‌کننده ویرایش شد.', 'success');
            } else {
                const data: Omit<SupplierAccount, 'id'> = {
                    supplierId: supplier.id!,
                    username: username.trim(),
                    passwordHash: password.trim()
                };
                const newId = await db.supplierAccounts.add(data);
                await logActivity('CREATE', 'SupplierAccount', newId, { newAccount: { id: newId, ...data } });
                showNotification('حساب تامین‌کننده ایجاد شد.', 'success');
            }
            onClose();
        } catch (error) {
            console.error("Error saving supplier account:", error);
            showNotification("خطا در ذخیره حساب تامین‌کننده.", 'error');
        }
    };

    return (
        <Modal title={isEditing ? `ویرایش حساب برای ${supplier.name}` : `ایجاد حساب برای ${supplier.name}`} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری" required className="input-style" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEditing ? 'رمز عبور جدید (برای تغییر وارد کنید)' : 'رمز عبور'} required={!isEditing} className="input-style" />
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">لغو</button>
                    <button type="submit" className="btn-primary">{isEditing ? 'ذخیره تغییرات' : 'ایجاد حساب'}</button>
                </div>
            </form>
            <style>{`
                .input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; border-radius: 0.5rem; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4b5563; border-radius: 0.5rem; }
            `}</style>
        </Modal>
    );
};


// User Form Modal
const UserFormModal: React.FC<{ user: User | null; onClose: () => void; }> = ({ user, onClose }) => {
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState<number | ''>(user?.roleId || '');
    const { showNotification } = useNotification();
    const isEditing = !!user;

    const roles = useLiveQuery(() => db.roles.toArray(), []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username.trim() || (!isEditing && !password.trim()) || !roleId) {
            showNotification('لطفا تمام فیلدها را پر کنید.', 'error');
            return;
        }
        
        try {
            if (isEditing && user?.id) {
                const oldUser = await db.users.get(user.id);
                const updateData: Partial<User> = { username, roleId: Number(roleId) };
                if (password.trim()) {
                    updateData.passwordHash = password.trim();
                }
                await db.users.update(user.id, updateData);
                await logActivity('UPDATE', 'User', user.id, { old: oldUser, new: updateData });
                showNotification('کاربر با موفقیت ویرایش شد.', 'success');
            } else {
                const existingUser = await db.users.where('username').equalsIgnoreCase(username.trim()).first();
                if (existingUser) {
                    showNotification('کاربری با این نام کاربری وجود دارد.', 'error');
                    return;
                }
                const newUser = {
                    username: username.trim(),
                    passwordHash: password.trim(),
                    roleId: Number(roleId),
                };
                const newId = await db.users.add(newUser);
                await logActivity('CREATE', 'User', newId, { newUser: {id: newId, ...newUser} });
                showNotification('کاربر با موفقیت افزوده شد.', 'success');
            }
            onClose();
        } catch (error) {
            console.error("Error saving user:", error);
            showNotification("خطا در ذخیره کاربر.", 'error');
        }
    };
    
    return (
        <Modal title={isEditing ? 'ویرایش کاربر' : 'افزودن کاربر جدید'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری" required className="input-style" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEditing ? 'رمز عبور جدید (اختیاری)' : 'رمز عبور'} required={!isEditing} className="input-style" />
                <select value={roleId} onChange={e => setRoleId(Number(e.target.value))} required className="input-style">
                    <option value="" disabled>-- انتخاب نقش --</option>
                    {roles?.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary">لغو</button>
                    <button type="submit" className="btn-primary">{isEditing ? 'ذخیره تغییرات' : 'افزودن'}</button>
                </div>
            </form>
            <style>{`
                .input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; border-radius: 0.5rem; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4b5563; border-radius: 0.5rem; }
            `}</style>
        </Modal>
    );
};

// Role Form Modal
const RoleFormModal: React.FC<{ role: Role | null; onClose: () => void; }> = ({ role, onClose }) => {
    const [name, setName] = useState(role?.name || '');
    const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(new Set(role?.permissions || []));
    const { showNotification } = useNotification();
    const isEditing = !!role;

    const handlePermissionToggle = (permission: Permission) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(permission)) {
            newSet.delete(permission);
        } else {
            newSet.add(permission);
        }
        setSelectedPermissions(newSet);
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showNotification('نام نقش نمی‌تواند خالی باشد.', 'error');
            return;
        }

        const permissionsArray = Array.from(selectedPermissions);
        try {
            if (isEditing && role?.id) {
                const oldRole = await db.roles.get(role.id);
                const newRoleData = { name, permissions: permissionsArray };
                await db.roles.update(role.id, newRoleData);
                await logActivity('UPDATE', 'Role', role.id, { old: oldRole, new: newRoleData });
                showNotification('نقش با موفقیت ویرایش شد.', 'success');
            } else {
                const existingRole = await db.roles.where('name').equalsIgnoreCase(name.trim()).first();
                if (existingRole) {
                    showNotification('نقشی با این نام وجود دارد.', 'error');
                    return;
                }
                const newRole = { name: name.trim(), permissions: permissionsArray, isEditable: true };
                const newId = await db.roles.add(newRole);
                await logActivity('CREATE', 'Role', newId, { newRole: {id: newId, ...newRole} });
                showNotification('نقش با موفقیت ایجاد شد.', 'success');
            }
            onClose();
        } catch (error) {
            console.error("Error saving role:", error);
            showNotification("خطا در ذخیره نقش.", 'error');
        }
    };
    
    const permissionGroups = Object.keys(PERMISSIONS).reduce((acc, key) => {
        const groupKey = key.split(':')[0];
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(key as Permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <Modal title={isEditing ? 'ویرایش نقش' : 'افزودن نقش جدید'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="نام نقش" required className="input-style" />
                
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">دسترسی‌ها</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-64 overflow-y-auto p-2">
                        {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                            <div key={groupName}>
                                <h4 className="font-bold text-gray-300 capitalize border-b border-gray-600 pb-1 mb-2">{groupName}</h4>
                                <div className="space-y-2">
                                    {permissions.map(permission => (
                                        <label key={permission} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.has(permission)}
                                                onChange={() => handlePermissionToggle(permission)}
                                                className="w-4 h-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600"
                                            />
                                            <span className="text-sm text-gray-300">{PERMISSIONS[permission]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <button type="button" onClick={onClose} className="btn-secondary">لغو</button>
                    <button type="submit" className="btn-primary">{isEditing ? 'ذخیره تغییرات' : 'افزودن'}</button>
                </div>
            </form>
             <style>{`
                .input-style { background-color: #1f2937; border: 1px solid #4b5563; color: #d1d5db; border-radius: 0.5rem; padding: 0.75rem; width: 100%; }
                .btn-primary { padding: 0.5rem 1rem; background-color: #2563eb; border-radius: 0.5rem; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #4b5563; border-radius: 0.5rem; }
            `}</style>
        </Modal>
    );
};

export default Settings;