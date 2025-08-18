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
  deleteDoc
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
      
      // For now, we'll use a simple approach and update based on the transaction ID field
      const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        snapshot.docs.forEach(async (docSnapshot) => {
          const data = docSnapshot.data() as StoredTransaction;
          if (data.id === transactionId) {
            const docRef = doc(db, TRANSACTIONS_COLLECTION, docSnapshot.id);
            await updateDoc(docRef, {
              ...updates,
              timestamp: updates.timestamp ? Timestamp.fromDate(updates.timestamp) : data.timestamp
            });
            console.log('✅ Transaction updated in Firebase:', transactionId);
          }
        });
        unsubscribe(); // Clean up the listener
      });
      
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
      const unsubscribe = onSnapshot(otpsQuery, (snapshot) => {
        snapshot.docs.forEach(async (docSnapshot) => {
          const data = docSnapshot.data() as StoredOTP;
          if (data.transactionId === transactionId) {
            await deleteDoc(doc(db, OTPS_COLLECTION, docSnapshot.id));
            console.log('✅ OTP deleted from Firebase for transaction:', transactionId);
          }
        });
        unsubscribe();
      });
    } catch (error) {
      console.error('❌ Error deleting OTP:', error);
      throw error;
    }
  }

  // Get OTP for a transaction
  async getOTP(transactionId: string): Promise<string | null> {
    return new Promise((resolve) => {
      const otpsQuery = query(collection(db, OTPS_COLLECTION));
      const unsubscribe = onSnapshot(otpsQuery, (snapshot) => {
        let foundOTP: string | null = null;
        snapshot.docs.forEach((docSnapshot) => {
          const data = docSnapshot.data() as StoredOTP;
          if (data.transactionId === transactionId) {
            foundOTP = data.otp;
          }
        });
        unsubscribe();
        resolve(foundOTP);
      });
    });
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

  // Clear all transactions (for development/testing)
  async clearAllTransactions(): Promise<void> {
    try {
      const transactionsQuery = query(collection(db, TRANSACTIONS_COLLECTION));
      const otpsQuery = query(collection(db, OTPS_COLLECTION));
      
      // Clear transactions
      const transactionUnsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
        snapshot.docs.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, docSnapshot.id));
        });
        transactionUnsubscribe();
      });

      // Clear OTPs
      const otpUnsubscribe = onSnapshot(otpsQuery, (snapshot) => {
        snapshot.docs.forEach(async (docSnapshot) => {
          await deleteDoc(doc(db, OTPS_COLLECTION, docSnapshot.id));
        });
        otpUnsubscribe();
      });

      console.log('✅ All transactions and OTPs cleared from Firebase');
    } catch (error) {
      console.error('❌ Error clearing transactions:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();