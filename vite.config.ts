import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true // Allow access from network (useful for mobile testing)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split @zxing into its own chunk (huge library)
          if (id.includes('@zxing')) {
            return 'zxing-scanner';
          }
          
          // Keep all Firebase together (auth + firestore + app) to avoid config issues
          if (id.includes('firebase/')) {
            return 'vendor-firebase';
          }
          
          // React vendor chunk
          if (id.includes('node_modules/react')) {
            return 'vendor-react';
          }
          
          // Scanner components (without @zxing)
          if (id.includes('scanner/ScannerView') || 
              id.includes('scanner/ScanResultDisplay') ||
              id.includes('scannerService') ||
              id.includes('scanLookupService')) {
            return 'scanner-components';
          }
          
          // BOM features
          if (id.includes('SearchAutocomplete') || 
              id.includes('combinedSearch') ||
              id.includes('/bom.ts')) {
            return 'bom';
          }
          
          // Management components
          if (id.includes('UserManagementTab') || 
              id.includes('OperationsTab') ||
              id.includes('CSVImportDialog')) {
            return 'management';
          }
          
          // Transaction system
          if (id.includes('TransactionForm') || 
              id.includes('TransactionList') ||
              id.includes('TransactionTable') ||
              id.includes('/transactions.ts')) {
            return 'transactions';
          }
        }
      }
    }
  }
})