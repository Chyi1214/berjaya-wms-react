// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import type { User, FirebaseError } from '../types';

// Firebase configuration object
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN', 
    'VITE_FIREBASE_PROJECT_ID'
  ];
  
  const missing = requiredKeys.filter(key => !import.meta.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing Firebase configuration:', missing);
    throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`);
  }
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  validateFirebaseConfig();
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  throw error;
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Helper function to convert Firebase User to our User type
const mapFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email || '',
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL
});

// Authentication Functions
export const authService = {
  // Sign in with Google using popup (preferred for desktop)
  signInWithGoogle: async (): Promise<User> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = mapFirebaseUser(result.user);
      console.log('✅ Google login successful:', user.email);
      return user;
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error('❌ Google login failed:', firebaseError.message);
      
      // Handle specific error cases
      if (firebaseError.code === 'auth/popup-blocked') {
        // Fallback to redirect for popup blockers
        console.log('Popup blocked, falling back to redirect...');
        return authService.signInWithGoogleRedirect();
      }
      
      throw new Error(firebaseError.message);
    }
  },

  // Sign in with Google using redirect (fallback for mobile/popup issues)
  signInWithGoogleRedirect: async (): Promise<User> => {
    try {
      await signInWithRedirect(auth, googleProvider);
      // The actual result will be handled by getRedirectResult
      throw new Error('REDIRECT_IN_PROGRESS');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error('❌ Google redirect login failed:', firebaseError.message);
      throw new Error(firebaseError.message);
    }
  },

  // Handle redirect result (call this on app startup)
  handleRedirectResult: async (): Promise<User | null> => {
    try {
      const result = await getRedirectResult(auth);
      if (result) {
        const user = mapFirebaseUser(result.user);
        console.log('✅ Google redirect login successful:', user.email);
        return user;
      }
      return null;
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error('❌ Redirect result failed:', firebaseError.message);
      throw new Error(firebaseError.message);
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
      console.log('✅ User signed out successfully');
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error('❌ Sign out failed:', firebaseError.message);
      throw new Error(firebaseError.message);
    }
  },

  // Get current user
  getCurrentUser: (): User | null => {
    const firebaseUser = auth.currentUser;
    return firebaseUser ? mapFirebaseUser(firebaseUser) : null;
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? mapFirebaseUser(firebaseUser) : null;
      callback(user);
    });
  }
};

// Export Firebase instances for other services
export { auth, db };
export default app;