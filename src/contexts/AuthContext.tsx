// Authentication Context for managing user state across the app
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/firebase';
import type { User, AuthState } from '../types';

// Create the Auth Context
const AuthContext = createContext<AuthState & {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
} | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Computed property for easier checking
  const isAuthenticated = user !== null;

  // Login function
  const login = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Try popup first, fallback to redirect on error
      const loggedInUser = await authService.signInWithGoogle();
      setUser(loggedInUser);
      
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
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (mounted) {
        console.log('Auth state changed:', user ? user.email : 'No user');
        setUser(user);
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

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated
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