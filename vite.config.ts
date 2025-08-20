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
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          
          // Scanner module (heavy with @zxing/library)
          'scanner': [
            './src/components/scanner/ScannerView.tsx',
            './src/components/scanner/ScanResultDisplay.tsx',
            './src/services/scannerService.ts',
            './src/services/scanLookupService.ts'
          ],
          
          // BOM features (our new autocomplete system)
          'bom': [
            './src/components/common/SearchAutocomplete.tsx',
            './src/services/combinedSearch.ts',
            './src/services/bom.ts'
          ],
          
          // Heavy management components
          'management': [
            './src/components/UserManagementTab.tsx',
            './src/components/OperationsTab.tsx',
            './src/components/CSVImportDialog.tsx'
          ],
          
          // Transaction system
          'transactions': [
            './src/components/TransactionForm.tsx',
            './src/components/TransactionList.tsx',
            './src/components/TransactionTable.tsx',
            './src/services/transactions.ts'
          ]
        }
      }
    }
  }
})