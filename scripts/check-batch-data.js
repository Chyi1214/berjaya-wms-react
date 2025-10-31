// Quick script to check batch allocation data
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHGAU7Ymv3F4d8KbG5tVaLjzXGXJQH9nM",
  authDomain: "berjaya-autotech.firebaseapp.com",
  projectId: "berjaya-autotech",
  storageBucket: "berjaya-autotech.firebasestorage.app",
  messagingSenderId: "524472712342",
  appId: "1:524472712342:web:5db70b9f8aa5f0aebdf09a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
  console.log('\n=== Checking batchAllocations ===');
  const batchQuery = query(collection(db, 'batchAllocations'), limit(5));
  const batchSnap = await getDocs(batchQuery);
  
  console.log(`Total batch allocation docs: ${batchSnap.size}`);
  batchSnap.forEach(doc => {
    const data = doc.data();
    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`SKU: ${data.sku}, Location: ${data.location}`);
    console.log(`Allocations:`, data.allocations);
    console.log(`Total: ${data.totalAllocated}`);
  });

  console.log('\n=== Checking expected_inventory ===');
  const expQuery = query(collection(db, 'expected_inventory'), limit(5));
  const expSnap = await getDocs(expQuery);
  
  console.log(`Total expected inventory docs: ${expSnap.size}`);
  expSnap.forEach(doc => {
    const data = doc.data();
    console.log(`\nDoc ID: ${doc.id}`);
    console.log(`SKU: ${data.sku}, Location: ${data.location}, Amount: ${data.amount}`);
  });
}

checkData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
