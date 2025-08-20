// Transaction Service - Firebase operations for transactions
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getFirestore,
  Timestamp,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { Transaction } from '../types';

const db = getFirestore();
const TRANSACTIONS_COLLECTION = 'transactions';
const OTPS_COLLECTION = 'transaction_otps';

export interface StoredTransaction extends Omit<Transaction, 'timestamp'> {
  timestamp: Timestamp;
}

export interface StoredOTP {
  transactionId: string;
  otp: string;
  createdAt: Timestamp;
}

class TransactionService {
  
  // Save a new transaction to Firebase
  async saveTransaction(transaction: Transaction): Promise<void> {
    try {
      const transactionData: Omit<StoredTransaction, 'id'> = {
        ...transaction,
        timestamp: Timestamp.fromDate(transaction.timestamp)
      };
      
      // Use the transaction ID as the document ID
      await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
        ...transactionData,
        id: transaction.id
      });
      
      console.log('✅ Transaction saved to Firebase:', transaction.id);
    } catch (error) {
      console.error('❌ Error saving transaction:', error);
      throw error;
    }
  }

  // Save OTP to Firebase
  async saveOTP(transactionId: string, otp: string): Promise<void> {
    try {
      const otpData: StoredOTP = {
        transactionId,
        otp,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, OTPS_COLLECTION), otpData);
      
      console.log('✅ OTP saved to Firebase for transaction:', transactionId);
    } catch (error) {
      console.error('❌ Error saving OTP:', error);
      throw error;
    }
  }

  // Update transaction status
  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
      // Find the document with this transaction ID
      const transactionsQuery = query(
        collection(db, TRANSACTIONS_COLLECTION),
        orderBy('timestamp', 'desc')
      );
      
      // Get all documents and find the matching one
      const snapshot = await getDocs(transactionsQuery);
      const updatePromises: Promise<void>[] = [];
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data() as StoredTransaction;
        if (data.id === transactionId) {
          const docRef = doc(db, TRANSACTIONS_COLLECTION, docSnapshot.id);
          const updatePromise = updateDoc(docRef, {
            ...updates,
            timestamp: updates.timestamp ? Timestamp.fromDate(updates.timestamp) : data.timestamp
          });
          updatePromises.push(updatePromise);
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      if (updatePromises.length > 0) {
        console.log('✅ Transaction updated in Firebase:', transactionId);
      } else {
        console.warn('⚠️ No transaction found with ID:', transactionId);
      }
      
    } catch (error) {
      console.error('❌ Error updating transaction:', error);
      throw error;
    }
  }

  // Delete OTP after confirmation/rejection
  async deleteOTP(transactionId: string): Promise<void> {
    try {
      // Find and delete the OTP document
      const otpsQuery = query(collection(db, OTPS_COLLECTION));
      const snapshot = await getDocs(otpsQuery);
      const deletePromises: Promise<void>[] = [];
      
      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data() as StoredOTP;
        if (data.transactionId === transactionId) {
          const deletePromise = deleteDoc(doc(db, OTPS_COLLECTION, docSnapshot.id));
          deletePromises.push(deletePromise);
        }
      });
      
      // Wait for all deletions to complete
      await Promise.all(deletePromises);
      
      if (deletePromises.length > 0) {
        console.log('✅ OTP deleted from Firebase for transaction:', transactionId);
      } else {
        console.warn('⚠️ No OTP found for transaction:', transactionId);
      }
    } catch (error) {
      console.error('❌ Error deleting OTP:', error);
      throw error;
    }
  }

  // Get OTP for a transaction
  async getOTP(transactionId: string): Promise<string | null> {
    try {
      const otpsQuery = query(collection(db, OTPS_COLLECTION));
      const snapshot = await getDocs(otpsQuery);
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as StoredOTP;
        if (data.transactionId === transactionId) {
          return data.otp;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting OTP:', error);
      return null;
    }
  }

  // Real-time listener for transactions
  onTransactionsChange(callback: (transactions: Transaction[]) => void): () => void {
    const transactionsQuery = query(
      collection(db, TRANSACTIONS_COLLECTION),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(transactionsQuery, (snapshot) => {
      const transactions: Transaction[] = [];
      
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as StoredTransaction;
        transactions.push({
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });

      console.log(`📊 Loaded ${transactions.length} transactions from Firebase`);
      callback(transactions);
    }, (error) => {
      console.error('❌ Error listening to transactions:', error);
      // Fallback to empty array on error
      callback([]);
    });
  }

  // Get all transactions (one-time fetch)
  async getAllTransactions(): Promise<Transaction[]> {
    return new Promise((resolve) => {
      const transactionsQuery = query(
        collection(db, TRANSACTIONS_COLLECTION),
        orderBy('timestamp', 'desc')
      );

      const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        const transactions: Transaction[] = [];
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as StoredTransaction;
          transactions.push({
            ...data,
            timestamp: data.timestamp.toDate()
          });
        });

        unsubscribe(); // Clean up listener after first fetch
        resolve(transactions);
      }, (error) => {
        console.error('❌ Error fetching transactions:', error);
        resolve([]);
      });
    });
  }

  // Get specific transaction by ID (for incremental updates)
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      const transactionsQuery = query(collection(db, TRANSACTIONS_COLLECTION));
      const snapshot = await getDocs(transactionsQuery);
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data() as StoredTransaction;
        if (data.id === transactionId) {
          return {
            ...data,
            timestamp: data.timestamp.toDate()
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting transaction by ID:', error);
      return null;
    }
  }

  // Clear all transactions (for development/testing)
  async clearAllTransactions(): Promise<void> {
    try {
      const transactionsQuery = query(collection(db, TRANSACTIONS_COLLECTION));
      const otpsQuery = query(collection(db, OTPS_COLLECTION));
      
      // Get all documents
      const [transactionSnapshot, otpSnapshot] = await Promise.all([
        getDocs(transactionsQuery),
        getDocs(otpsQuery)
      ]);
      
      // Create delete promises for all documents
      const deletePromises: Promise<void>[] = [];
      
      // Add transaction deletions
      transactionSnapshot.docs.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, TRANSACTIONS_COLLECTION, docSnapshot.id)));
      });
      
      // Add OTP deletions
      otpSnapshot.docs.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(doc(db, OTPS_COLLECTION, docSnapshot.id)));
      });
      
      // Wait for all deletions to complete
      await Promise.all(deletePromises);
      
      console.log(`✅ Cleared ${transactionSnapshot.size} transactions and ${otpSnapshot.size} OTPs from Firebase`);
    } catch (error) {
      console.error('❌ Error clearing transactions:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();