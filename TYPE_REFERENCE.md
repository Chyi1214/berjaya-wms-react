# 🔍 TYPE REFERENCE - CRITICAL FOR FUTURE AI

**⚠️ READ THIS BEFORE MAKING ANY CODE CHANGES ⚠️**

This file prevents the "code compilation explosion" that killed the previous vanilla JS project.

## 📋 Core Data Types

### InventoryCountEntry
```typescript
interface InventoryCountEntry {
  sku: string;           // ✅ USE THIS
  itemName: string;      // ✅ USE THIS  
  amount: number;        // ✅ USE THIS (NOT "quantity"!)
  location: string;
  countedBy: string;
  timestamp: Date;
  notes?: string;
  bomOrigin?: {
    bomCode: string;
    bomName: string;
    bomQuantity: number;
    componentOriginalQty: number;
  };
}
```

### TransactionFormData
```typescript
interface TransactionFormData {
  sku: string;
  amount: number;        // ✅ USE THIS (NOT "quantity"!)
  transactionType: TransactionType;
  location: string;
  toLocation: string;
  notes: string;
  reference: string;
}
```

### SearchResult (from SearchAutocomplete)
```typescript
interface SearchResult {
  code: string;          // ✅ SKU/BOM code - USE result.code
  name: string;
  type: 'item' | 'bom';
  description?: string;
  componentCount?: number;
}
```

## 🚨 COMMON MISTAKES TO AVOID (Updated v3.2.2)

### ❌ Wrong Property Names - THESE CAUSED v3.2.2 COMPILATION ERRORS
```typescript
// WRONG - Will cause compilation errors:
count.quantity        // ❌ Property doesn't exist! (I used this by mistake)
result.sku           // ❌ Property doesn't exist! (I used this by mistake)  
item.id              // ❌ Property doesn't exist!
formData.qty         // ❌ Property doesn't exist!

// ✅ CORRECT - VERIFIED WORKING IN v3.2.2:
count.amount         // ✅ This exists in InventoryCountEntry
result.code          // ✅ This exists in SearchResult
item.sku             // ✅ This exists in ItemMaster
formData.amount      // ✅ This exists in TransactionFormData
```

### ❌ Recent Compilation Error Examples (v3.2.2)
```typescript
// ❌ THESE BROKE THE BUILD:
inventoryCounts.forEach(count => {
  if (count.sku && count.quantity > 0) {  // ❌ .quantity doesn't exist!
})

const handleItemSelect = (selectedCode: string) => {  // ❌ Wrong parameter type!
  setFormData(prev => ({ ...prev, sku: selectedCode }));
}

// ✅ FIXED VERSION:
inventoryCounts.forEach(count => {
  if (count.sku && count.amount > 0) {  // ✅ .amount exists!
})

const handleItemSelect = (result: SearchResult) => {  // ✅ Correct type!
  setFormData(prev => ({ ...prev, sku: result.code }));  // ✅ Use .code
}
```

### ❌ Wrong Import Syntax - CAUSED v3.2.2 COMPILATION ERROR
```typescript
// ❌ THIS BROKE THE BUILD IN v3.2.2:
import SearchAutocomplete from './common/SearchAutocomplete';
// Error: Module has no default export. Did you mean to use 'import { SearchAutocomplete }'?

// ✅ FIXED VERSION:
import { SearchAutocomplete } from './common/SearchAutocomplete';

// 🔍 HOW TO CHECK: Look at the component export:
// If file exports: export function ComponentName() { ... }
// Use: import { ComponentName } from './file';
// If file exports: export default ComponentName
// Use: import ComponentName from './file';
```

### ❌ Wrong Function Signatures
```typescript
// WRONG - SearchAutocomplete passes objects:
const handleSelect = (code: string) => { ... }

// ✅ CORRECT - Expects SearchResult object:
const handleSelect = (result: SearchResult) => {
  const sku = result.code;  // Use .code property
}
```

## 📊 Component Prop Requirements

### TransactionSendForm REQUIRES:
```typescript
interface TransactionSendFormProps {
  onSubmit: (transaction: TransactionFormData & { otp: string }) => void;
  onCancel: () => void;
  senderEmail: string;
  inventoryCounts: InventoryCountEntry[];  // ✅ MUST PASS THIS
}
```

### SearchAutocomplete REQUIRES:
```typescript
interface SearchAutocompleteProps {
  onSelect: (result: SearchResult) => void;  // ✅ NOT string!
  placeholder?: string;
  searchOptions?: SearchOptions;
  className?: string;
  disabled?: boolean;
  value?: SearchResult | null;
  onClear?: () => void;
}
```

## 🔧 Quick Debug Checklist

**Before making ANY changes:**

1. **Check property names** - Use this reference, don't guess
2. **Check import syntax** - Look at existing working imports  
3. **Check function signatures** - Match the interface exactly
4. **Run build early** - `npm run build` after small changes
5. **One change at a time** - Don't change multiple things together

## 📝 Update This File

**Future AI: When you add new types or find errors, UPDATE THIS FILE!**

**Example Update:**
```markdown
### NewComponentType (Added v3.2.3)
```typescript
interface NewType {
  // Document the exact properties here
}
```
**Common Mistakes:**
- Don't use `.wrongProperty`
- Use `.correctProperty` instead
```

## 🎯 Why This Matters

The previous vanilla JS project died because:
- ❌ No type checking
- ❌ No central reference
- ❌ Properties changed without documentation
- ❌ 145+ event listeners became unmaintainable

This React project survives because:
- ✅ TypeScript catches errors at compile time
- ✅ This reference prevents property name mistakes  
- ✅ Clear component interfaces
- ✅ Systematic approach to changes

**Keep this file updated and always check it before making changes!**

## 🔄 **MANDATORY MAINTENANCE PROTOCOL**

### **For EVERY Future AI Session:**

#### **Session Start Checklist:**
1. ✅ **Read this entire file** before touching any code
2. ✅ **Run `grep -n "interface" src/types/index.ts`** to see current types
3. ✅ **Check latest commits** for any type changes since last session

#### **When Adding New Features:**
1. ✅ **Document new types here immediately** after creating them
2. ✅ **Add examples** of correct property usage
3. ✅ **Test with `npm run build`** before moving on
4. ✅ **Commit this file** along with the code changes

#### **When Encountering Compilation Errors:**
1. ✅ **Add the exact error** to this file under "Common Mistakes"
2. ✅ **Add the working solution** with explanation
3. ✅ **Commit the updated reference** immediately
4. ✅ **Don't just fix and forget** - document for next AI

#### **Before Session End:**
1. ✅ **Update this file** with any new findings
2. ✅ **Verify all examples still work** with current codebase
3. ✅ **Commit updates** to this reference file

### **⚠️ WARNING SIGNS TO WATCH FOR:**
- Multiple compilation errors in one session
- Guessing property names instead of checking
- Skipping `npm run build` after changes
- Not updating this file after finding errors

**If you see these signs: STOP and fix the reference immediately!**

### **💡 SUCCESS METRICS:**
- ✅ Zero compilation errors due to wrong property names
- ✅ This file stays current with actual codebase
- ✅ Future AI sessions start faster (no type hunting)
- ✅ No "explosion" like the previous vanilla JS project

---

**📝 Last Updated: v3.2.2 (August 20, 2025)**  
**📝 Next Update: When types change or errors found**