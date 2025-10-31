// Quick script to delete all inspection records from Firestore
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDON7K48OawrKk8gs9pInosilci6VDLbgJh8",
  authDomain: "berjaya-autotech.firebaseapp.com",
  projectId: "berjaya-autotech",
  storageBucket: "berjaya-autotech.firebasestorage.app",
  messagingSenderId: "135068212334",
  appId: "1:135068212334:web:d1e50fb7d6e7d1c0b80f3c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllInspections() {
  try {
    console.log('Fetching all inspection records...');
    const snapshot = await getDocs(collection(db, 'carInspections'));

    if (snapshot.empty) {
      console.log('✅ No inspections found. Nothing to delete.');
      process.exit(0);
      return;
    }

    console.log(`Found ${snapshot.size} inspection records. Deleting...`);

    let deleted = 0;
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(docSnapshot.ref);
      deleted++;
      console.log(`Deleted ${deleted}/${snapshot.size}: ${docSnapshot.id}`);
    }

    console.log('✅ All inspections deleted successfully!');
    console.log('Now refresh the app and scan a NEW car with a different VIN.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllInspections();
