// Authentication Context for managing user state across the app - v3.2.0 Scanner Integration
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/firebase';
import { userManagementService } from '../services/userManagement';
import { getDisplayName } from '../utils/displayName';
import type { User, AuthState, UserRecord, AuthenticatedUser } from '../types';

// Enhanced Auth Context with User Management
const AuthContext = createContext<AuthState & {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authenticatedUser: AuthenticatedUser | null;
  userRecord: UserRecord | null;
  isDevAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  refreshUserRecord: () => Promise<void>;
  getUserDisplayName: () => string; // Get display name for transactions
} | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auto-create DEFAULT batch if it doesn't exist
const ensureDefaultBatchExists = async () => {
  try {
    const { batchCoreService } = await import('../services/batch/batchCore');

    // Check if DEFAULT batch already exists
    const existingBatch = await batchCoreService.getBatchById('DEFAULT');

    if (!existingBatch) {
      console.log('🔧 Creating DEFAULT batch for unassigned inventory...');

      // Create the DEFAULT batch
      await batchCoreService.createBatch({
        batchId: 'DEFAULT',
        name: 'Default Unassigned Batch',
        items: [],
        carVins: [],
        carType: '',
        totalCars: 0,
        status: 'in_progress'  // Important: Must be 'in_progress' to be active
      });

      console.log('✅ DEFAULT batch created successfully');
    } else {
      console.log('✅ DEFAULT batch already exists');
    }
  } catch (error) {
    console.error('❌ Failed to ensure DEFAULT batch exists:', error);
  }
};

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Computed properties
  const isAuthenticated = user !== null;
  const isDevAdmin = user ? userManagementService.isDevAdmin(user.email) : false;
  
  // Create authenticated user object
  const authenticatedUser: AuthenticatedUser | null = user ? {
    ...user,
    userRecord,
    isDevAdmin,
    hasPermission: (permission: string) => hasPermission(permission)
  } : null;

  // Load user record from database
  const loadUserRecord = async (user: User): Promise<UserRecord | null> => {
    try {
      const record = await userManagementService.getUserRecord(user.email);
      
      if (record) {
        // Update last login time
        await userManagementService.updateLastLogin(user.email);
        console.log('✅ User authorized:', user.email, 'Role:', record.role);
        return record;
      } else {
        console.log('❌ User not authorized:', user.email);
        return null;
      }
    } catch (error) {
      console.error('Failed to load user record:', error);
      return null;
    }
  };

  // Permission checking function
  const hasPermission = (permission: string): boolean => {
    if (!user || !userRecord) return false;
    return userManagementService.hasPermission(userRecord, permission);
  };

  // Refresh user record from database
  const refreshUserRecord = async (): Promise<void> => {
    if (user) {
      console.log('🔄 Refreshing user record for:', user.email);
      const record = await loadUserRecord(user);
      console.log('📥 Loaded user record:', {
        displayName: record?.displayName,
        useDisplayName: record?.useDisplayName
      });
      setUserRecord(record);
      console.log('✅ User record state updated');
    }
  };

  // Login function
  const login = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Try popup first, fallback to redirect on error
      const loggedInUser = await authService.signInWithGoogle();
      
      // Load user record to check authorization
      const record = await loadUserRecord(loggedInUser);
      
      if (!record && !userManagementService.isDevAdmin(loggedInUser.email)) {
        // User not authorized
        await authService.signOut();
        setError('Access denied. Please contact your administrator for access.');
        return;
      }
      
      setUser(loggedInUser);
      setUserRecord(record);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Don't set error for redirect in progress
      if (errorMessage === 'REDIRECT_IN_PROGRESS') {
        console.log('Redirecting to Google login...');
        return;
      }
      
      console.error('Login error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await authService.signOut();
      setUser(null);
      setUserRecord(null);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      console.error('Logout error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    // Ensure DEFAULT batch exists on app startup
    ensureDefaultBatchExists();

    // Check for redirect result on app startup
    const checkRedirectResult = async () => {
      try {
        const redirectUser = await authService.handleRedirectResult();
        if (mounted && redirectUser) {
          setUser(redirectUser);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Redirect login failed';
        console.error('Redirect error:', errorMessage);
        if (mounted) {
          setError(errorMessage);
        }
      }
    };

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      if (mounted) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        
        if (user) {
          // Load user record for authenticated users
          const record = await loadUserRecord(user);
          
          if (!record && !userManagementService.isDevAdmin(user.email)) {
            // User not authorized, sign them out
            console.log('❌ Unauthorized user detected, signing out');
            await authService.signOut();
            setError('Access denied. Please contact your administrator for access.');
            setUser(null);
            setUserRecord(null);
          } else {
            setUser(user);
            setUserRecord(record);
          }
        } else {
          setUser(null);
          setUserRecord(null);
        }
        
        setLoading(false);
        setError(null);
      }
    });

    // Check redirect result
    checkRedirectResult();

    // Cleanup function
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Clear error when user changes
  useEffect(() => {
    if (user) {
      setError(null);
    }
  }, [user]);

  // Get user's display name for transactions
  const getUserDisplayName = (): string => {
    if (!user) return 'Unknown User';
    return getDisplayName(user, userRecord);
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    authenticatedUser,
    userRecord,
    isDevAdmin,
    hasPermission,
    refreshUserRecord,
    getUserDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the Auth Context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Export the context for advanced usage if needed
export { AuthContext };