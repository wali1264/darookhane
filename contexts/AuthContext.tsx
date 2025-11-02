import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Permission } from '../types';
import { useNotification } from './NotificationContext';
import { logActivity } from '../lib/activityLogger';

// FIX: Changed AuthenticatedUser to a discriminated union to correctly type employee vs supplier users.
// This resolves the issue where `supplierId` was missing for supplier users.
interface BaseUser {
  id: number;
  username: string;
}
interface EmployeeUser extends BaseUser {
  type: 'employee';
  roleId: number;
}
interface SupplierUser extends BaseUser {
  type: 'supplier';
  supplierId: number;
}
export type AuthenticatedUser = EmployeeUser | SupplierUser;


interface AuthContextType {
  currentUser: AuthenticatedUser | null;
  permissions: Permission[];
  isLoading: boolean;
  login: (username: string, password_plaintext: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  updateCurrentUsername: (newUsername: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showNotification } = useNotification();

  // On initial load, check session storage for a logged-in user
  useEffect(() => {
    try {
      const storedUserJson = sessionStorage.getItem('shafayar_user');
      const storedPermissionsJson = sessionStorage.getItem('shafayar_permissions');
      if (storedUserJson && storedPermissionsJson) {
        setCurrentUser(JSON.parse(storedUserJson));
        setPermissions(JSON.parse(storedPermissionsJson));
      }
    } catch (error) {
      console.error("Failed to parse user from session storage:", error);
      sessionStorage.clear(); // Clear corrupted storage
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username_param: string, password_plaintext: string) => {
    setIsLoading(true);
    try {
        const { data, error } = await supabase.rpc('verify_user_credentials', {
            p_username: username_param,
            p_password: password_plaintext
        });

        if (error) {
            console.error('RPC Error:', error);
            showNotification('خطای داخلی در هنگام ورود.', 'error');
            return { success: false, message: error.message };
        }
        
        // RPC returns an array, we expect one or zero results
        if (data && data.length > 0) {
             const userData = data[0];
             const userToStore: AuthenticatedUser = {
                 id: userData.id,
                 username: userData.username,
                 type: 'employee', // Hardcoded for now
                 roleId: userData.role_id,
             };
             const userPermissions: Permission[] = userData.permissions;

             setCurrentUser(userToStore);
             setPermissions(userPermissions);
             sessionStorage.setItem('shafayar_user', JSON.stringify(userToStore));
             sessionStorage.setItem('shafayar_permissions', JSON.stringify(userPermissions));
             
             await logActivity('LOGIN', 'Authentication', userToStore.id, { message: 'User logged in successfully.' });
             showNotification('ورود موفقیت‌آمیز بود.', 'success');
             return { success: true, message: 'ورود موفقیت‌آمیز بود.' };
        } else {
            showNotification('نام کاربری یا رمز عبور اشتباه است.', 'error');
            return { success: false, message: 'Invalid credentials' };
        }
    } catch (error: any) {
      console.error("Login error:", error);
      showNotification('خطای داخلی رخ داد.', 'error');
      return { success: false, message: error.message || 'خطای داخلی رخ داد.' };
    } finally {
        setIsLoading(false);
    }
  };

  const logout = async () => {
    if(currentUser) {
        await logActivity('LOGOUT', 'Authentication', currentUser.id, { message: 'User logged out.'});
    }
    setCurrentUser(null);
    setPermissions([]);
    sessionStorage.removeItem('shafayar_user');
    sessionStorage.removeItem('shafayar_permissions');
    showNotification('شما با موفقیت از سیستم خارج شدید.', 'info');
  };

  const hasPermission = (permission: Permission) => {
    return permissions.includes(permission);
  };
  
  const updateCurrentUsername = (newUsername: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, username: newUsername };
      setCurrentUser(updatedUser);
      sessionStorage.setItem('shafayar_user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    currentUser,
    permissions,
    isLoading,
    login,
    logout,
    hasPermission,
    updateCurrentUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};