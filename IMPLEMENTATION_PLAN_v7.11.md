# Implementation Plan: v7.11.0 - Inventory System Refactor

**Date:** 2025-10-29
**Status:** Phase 5 Complete, Phases 1-4 & 6 Pending
**Current Version:** 7.11.0-alpha (deployed for testing)

---

## Problem Summary

### The Issue
User reported: "The numbers are all a mess now" in the Expected Inventory table.

**Root Causes:**
1. **Three collections exist** but only two are needed
2. **v7.10.0 dialogs used wrong database** (`inventory_counts` instead of `expected_inventory`)
3. **Two-layer system out of sync** (totals don't match batch details)
4. **Operations not batch-specific** (unclear which batch is affected)
5. **Native dropdowns** (poor UX, wrong sorting)

---

## Architecture: The Two-Layer System

### How It SHOULD Work

```
LAYER 2 (Source of Truth): batch_allocations
  ├── A001 + logistics + Batch807: 50 units
  ├── A001 + logistics + Batch808: 30 units
  └── A001 + logistics + UNASSIGNED: 20 units

LAYER 1 (Auto-Calculated): expected_inventory
  └── A001 + logistics: 100 units (SUM of Layer 2)
```

**Golden Rule:** `expected_inventory[SKU][location] = SUM(batch_allocations[SKU][location][all_batches])`

### The Three Collections

| Collection | Service | Purpose | Status |
|-----------|---------|---------|--------|
| `expected_inventory` | `tableStateService` | **Layer 1:** Totals per SKU+location | ✅ Keep |
| `batch_allocations` | `batchAllocationService` | **Layer 2:** Batch details per SKU+location | ✅ Keep |
| `inventory_counts` | `inventoryService` | Legacy duplicate of Layer 1 | ❌ DELETE |

### Evidence inventory_counts is Legacy

**From code comments:**
- `UnifiedScannerView.tsx:428` - "Keep legacy inventory_counts in sync"
- `ScanInView.tsx:205` - "Keep legacy inventory_counts in sync so Send form sees availability"

Both explicitly call it "legacy" and only write to it for backward compatibility.

---

## Phase 5: ✅ COMPLETED - Data Reconciliation

### What Was Built

**File:** `src/services/tableState.ts`

#### 1. `reconcileInventoryData(autoFix: boolean)`
- Reads all `batch_allocations` (Layer 2 - source of truth)
- Calculates what `expected_inventory` SHOULD be (sum all batches per SKU+location)
- Compares with current `expected_inventory`
- Reports matches and mismatches
- If `autoFix=true`, rebuilds `expected_inventory` from `batch_allocations`

**Returns:**
```typescript
{
  totalSKUs: number;
  matches: number;
  mismatches: Array<{
    sku: string;
    location: string;
    expectedAmount: number;    // Current value in Layer 1
    calculatedAmount: number;  // Correct value from Layer 2
    diff: number;             // Difference
  }>;
  fixed: boolean;
}
```

#### 2. `syncExpectedFromBatchAllocations(sku: string, location: string)`
- Helper function for single SKU+location sync
- Gets batch allocation total from Layer 2
- Updates Layer 1 to match
- Use this after ANY batch operation

**File:** `src/components/manager/inventory/ExpectedItemTab.tsx`

#### 3. UI Button: "🔍 Reconcile Data"
- Located in Expected Inventory tab filter bar
- Click → Shows reconciliation report
- If mismatches found → Ask to auto-fix
- Rebuilds `expected_inventory` from `batch_allocations`

### How to Test (For User)

1. Go to **Manager → Inventory → Expected (5)** tab
2. Click **"🔍 Reconcile Data"** button (blue, next to Refresh)
3. Review report:
   - Total SKUs
   - ✅ Matches (correct)
   - ⚠️ Mismatches (wrong)
4. If mismatches → Confirm auto-fix
5. Refresh page to see corrected data

**Expected Result:** All numbers should align after reconciliation.

---

## Phase 1: ❌ PENDING - Remove inventory_counts Collection

### Why Delete?

1. **100% Redundant** - Same data as `expected_inventory`
2. **Double Write Overhead** - Every operation updates BOTH
3. **Sync Risk** - Can get out of sync (proven by current bug)
4. **Code Says It's Legacy** - Explicit comments in 2 files
5. **No Data Loss** - All data exists in `expected_inventory`

### Files to Refactor

#### Critical (Must Fix)

**1. StockAdjustmentDialog.tsx** (Lines 83-84, 171-178)
```typescript
// BEFORE (WRONG - uses inventoryService)
const stock = await inventoryService.getInventoryCount(sku, selectedLocation);
await inventoryService.saveInventoryCount({...});

// AFTER (CORRECT - uses tableStateService)
const expected = await tableStateService.getExpectedInventory();
const stock = expected.find(e => e.sku === sku && e.location === selectedLocation);
// For updates, use syncExpectedFromBatchAllocations() after batch changes
```

**2. MakeTransactionDialog.tsx** (Lines 87-88, 108-109, 179-196)
```typescript
// BEFORE (WRONG)
const stock = await inventoryService.getInventoryCount(sku, fromLocation);
await inventoryService.saveInventoryCount({...});

// AFTER (CORRECT)
const expected = await tableStateService.getExpectedInventory();
const stock = expected.find(e => e.sku === sku && e.location === fromLocation);
// For updates, use syncExpectedFromBatchAllocations() after batch changes
```

**3. App.tsx** (Lines 21, 72-88 - Manager role)
```typescript
// BEFORE (WRONG)
const inventoryService = await getInventoryService();
const counts = await inventoryService.getAllInventoryCounts();
const unsubInventory = inventoryService.onInventoryCountsChange(...);

// AFTER (CORRECT)
const tableStateService = await getTableStateService();
const counts = await tableStateService.getExpectedInventory();
const unsubInventory = tableStateService.onExpectedInventoryChange(...);
```

**4. WasteLostDefectView.tsx** (Line 8, 101, 234)
```typescript
// BEFORE (WRONG)
const stock = await inventoryService.getInventoryCount(item.code, location);

// AFTER (CORRECT)
const expected = await tableStateService.getExpectedInventory();
const stock = expected.find(e => e.sku === item.code && e.location === location);
```

#### Easy (Remove Legacy Sync)

**5. UnifiedScannerView.tsx** (Lines 428-434)
```typescript
// DELETE THESE LINES (legacy sync block)
await inventoryService.addToInventoryCount(
  scanResult.sku,
  scanResult.item.name,
  qty,
  'logistics',
  user.email
);
```

**6. ScanInView.tsx** (Lines 205-211)
```typescript
// DELETE THESE LINES (legacy sync block)
await inventoryService.addToInventoryCount(...);
```

#### Non-Critical (Test/Utility Code)

7. **DataContext.tsx** - Switch from `inventoryService` to `tableStateService`
8. **mockData.ts** - Update test data generation
9. **dataCleanup.ts** - Update cleanup utilities
10. **batchManagement.ts** - Update mock generation

### After Refactoring

1. Test all operations work correctly
2. Run reconciliation tool to verify
3. Drop `inventory_counts` collection in Firebase Console

---

## Phase 2: ❌ PENDING - Two-Layer Sync System

### Goal
Ensure EVERY operation maintains sync between Layer 1 and Layer 2.

### Pattern to Follow

```typescript
// EVERY batch operation must do this:

// 1. Update Layer 2 (batch_allocations)
await batchAllocationService.addToBatchAllocation(sku, location, batchId, qty);

// 2. Sync Layer 1 (expected_inventory) from Layer 2
await tableStateService.syncExpectedFromBatchAllocations(sku, location);
```

### Operations to Update

#### 1. Stock Adjustment (After Phase 3)
```typescript
// In StockAdjustmentDialog.tsx submit handler:

// Update batch allocation
await batchAllocationService.addToBatchAllocation(
  sku,
  selectedLocation,
  selectedBatch,  // NEW: batch-specific
  delta           // Can be positive or negative
);

// Sync Layer 1 from Layer 2
await tableStateService.syncExpectedFromBatchAllocations(sku, selectedLocation);

// Create transaction record
await transactionService.saveTransaction(transaction);
```

#### 2. Make Transaction (After Phase 3)
```typescript
// In MakeTransactionDialog.tsx submit handler:

// Update source batch allocation
await batchAllocationService.removeToBatchAllocation(
  sku,
  fromLocation,
  fromBatch,  // NEW: batch-specific
  amount
);
await tableStateService.syncExpectedFromBatchAllocations(sku, fromLocation);

// Update destination batch allocation
await batchAllocationService.addToBatchAllocation(
  sku,
  toLocation,
  toBatch,  // NEW: batch-specific
  amount
);
await tableStateService.syncExpectedFromBatchAllocations(sku, toLocation);

// Create transaction record
await transactionService.saveTransaction(transaction);
```

#### 3. Waste/Lost/Defect (Already correct, but verify)
**File:** `WasteLostDefectView.tsx:265-303`

Currently removes from batch allocations correctly, but check if it syncs Layer 1:
```typescript
// After batch allocation removal loop, add:
await tableStateService.syncExpectedFromBatchAllocations(entry.sku, location);
```

---

## Phase 3: ❌ PENDING - Make Dialogs Batch-Specific

### Current Problem
- Stock adjustment doesn't specify which batch
- Transfer doesn't specify from/to batch
- Unclear where changes apply

### Solution: Require Batch Selection

#### 3A. Stock Adjustment Dialog

**File:** `src/components/manager/inventory/StockAdjustmentDialog.tsx`

**Changes Needed:**

1. **Add Batch Dropdown** (after Location, before Adjustment Mode)
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Batch *
  </label>
  <select
    value={selectedBatch}
    onChange={(e) => setSelectedBatch(e.target.value)}
    className="w-full border border-gray-300 rounded-lg px-4 py-2"
    disabled={isLoading || !selectedLocation}
  >
    <option value="">Select batch...</option>
    <option value="UNASSIGNED">UNASSIGNED (No Batch)</option>
    {availableBatches.map(batch => (
      <option key={batch} value={batch}>Batch {batch}</option>
    ))}
  </select>
</div>
```

2. **Load Batch-Specific Stock**
```typescript
const loadCurrentStock = async () => {
  if (!selectedLocation || !selectedBatch) return;

  // Get batch allocation
  const allocation = await batchAllocationService.getBatchAllocation(sku, selectedLocation);

  if (allocation) {
    const batchAmount = allocation.allocations[selectedBatch] || 0;
    setCurrentStock(batchAmount);
  } else {
    setCurrentStock(0);
  }
};
```

3. **Update Submit Handler**
```typescript
// Add to batch allocation
await batchAllocationService.addToBatchAllocation(
  sku,
  selectedLocation,
  selectedBatch,  // Now required!
  delta
);

// Sync Layer 1 from Layer 2
await tableStateService.syncExpectedFromBatchAllocations(sku, selectedLocation);
```

4. **Update Transaction Record**
```typescript
const transaction: Transaction = {
  // ... existing fields ...
  batchId: selectedBatch,  // Now populated!
  notes: `${reason}${notes ? ` | ${notes}` : ''} | Batch: ${selectedBatch} | Mode: ${mode} | Adjusted by: ${userRecord.email}`
};
```

#### 3B. Make Transaction Dialog

**File:** `src/components/manager/inventory/MakeTransactionDialog.tsx`

**Already has batch dropdowns**, but needs fixes:

1. **Make From Batch REQUIRED** (currently optional)
```tsx
<select
  value={fromBatch}
  onChange={(e) => setFromBatch(e.target.value)}
  className="..."
  disabled={isLoading || !fromLocation}
  required  // ADD THIS
>
  <option value="">Select source batch...</option>  {/* Remove this default */}
  <option value="UNASSIGNED">UNASSIGNED</option>
  {availableBatches.map(batch => (
    <option key={batch} value={batch}>Batch {batch}</option>
  ))}
</select>
```

2. **Make To Batch REQUIRED** (currently optional)
```tsx
<select
  value={toBatch}
  onChange={(e) => setToBatch(e.target.value)}
  className="..."
  disabled={isLoading || !toLocation}
  required  // ADD THIS
>
  <option value="">Select destination batch...</option>  {/* Remove this default */}
  <option value="UNASSIGNED">UNASSIGNED</option>
  {availableBatches.map(batch => (
    <option key={batch} value={batch}>Batch {batch}</option>
  ))}
</select>
```

3. **Load Batch-Specific Stock** (already close, verify)
```typescript
// fromStockInfo should show batch-specific amount
const batchAmount = allocation?.allocations[fromBatch] || 0;
setFromStockInfo({ total: totalStock, batchAmount });
```

4. **Validation** - Check sufficient stock in SOURCE BATCH
```typescript
if (fromBatch && amount > fromStockInfo.batchAmount) {
  setError(`Insufficient stock in Batch ${fromBatch}. Available: ${fromStockInfo.batchAmount} units`);
  return;
}
```

5. **Update Submit Handler** (verify it updates both batches + syncs Layer 1)
```typescript
// Source batch
await batchAllocationService.removeToBatchAllocation(sku, fromLocation, fromBatch, amount);
await tableStateService.syncExpectedFromBatchAllocations(sku, fromLocation);

// Destination batch
await batchAllocationService.addToBatchAllocation(sku, toLocation, toBatch, amount);
await tableStateService.syncExpectedFromBatchAllocations(sku, toLocation);
```

---

## Phase 4: ❌ PENDING - Custom Dropdown Component

### Problem with Native Dropdowns
- No search/autocomplete
- Wrong sorting (Batch 1, 10, 2 instead of 1, 2, 3, ...)
- Can't show additional info (stock per batch)
- Poor mobile UX

### Solution: Custom Dropdown Component

**File:** `src/components/common/CustomDropdown.tsx` (CREATE NEW)

**Features:**
- Search/filter functionality
- Proper numeric sorting for batches
- Show additional info (e.g., "Batch 807 (50 units)")
- Keyboard navigation (arrow keys, enter, escape)
- Mobile-friendly
- Consistent styling with app

**Props:**
```typescript
interface CustomDropdownProps {
  options: Array<{
    value: string;
    label: string;
    badge?: string;      // e.g., "50 units"
    disabled?: boolean;
  }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  required?: boolean;
}
```

**Usage Example:**
```tsx
<CustomDropdown
  options={[
    { value: 'UNASSIGNED', label: 'UNASSIGNED', badge: '20 units' },
    { value: '807', label: 'Batch 807', badge: '50 units' },
    { value: '808', label: 'Batch 808', badge: '30 units' },
  ]}
  value={selectedBatch}
  onChange={setSelectedBatch}
  placeholder="Select batch..."
  searchable
  required
/>
```

### Apply To:
1. Both batch dropdowns in StockAdjustmentDialog
2. Both batch dropdowns in MakeTransactionDialog
3. Both location dropdowns in both dialogs
4. Batch/location filters in ExpectedItemTab

---

## Phase 6: ❌ PENDING - Final Deployment

### Checklist Before v7.11.0 Final

- [ ] Phase 1 complete (inventory_counts removed)
- [ ] Phase 2 complete (two-layer sync working)
- [ ] Phase 3 complete (dialogs batch-specific)
- [ ] Phase 4 complete (custom dropdowns)
- [ ] All tests pass
- [ ] Reconciliation tool shows 0 mismatches
- [ ] User tested all operations:
  - [ ] Stock adjustment
  - [ ] Make transaction
  - [ ] Waste/lost reporting
  - [ ] Scanner operations
- [ ] Numbers align correctly in Expected table
- [ ] Update version to `7.11.0` (remove `-alpha`)
- [ ] Deploy to production

---

## Testing Checklist

### After Each Phase

1. **Run Reconciliation Tool**
   - Should show 0 mismatches
   - If mismatches → operation not syncing correctly

2. **Manual Test Scenarios**

   **Scenario A: Stock Adjustment**
   - Adjust stock for a SKU at a location
   - Check batch allocation updated
   - Check expected inventory updated
   - Check transaction recorded
   - Run reconciliation → 0 mismatches

   **Scenario B: Transfer**
   - Transfer between locations
   - Transfer between batches
   - Check source decremented
   - Check destination incremented
   - Check both layers synced
   - Run reconciliation → 0 mismatches

   **Scenario C: Waste/Lost**
   - Report waste for an item
   - Check batch allocation reduced
   - Check expected inventory reduced
   - Check waste record created
   - Run reconciliation → 0 mismatches

3. **Filter Test**
   - Expected table → "All Batches" → Should show totals from Layer 1
   - Expected table → "Batch 807" → Should show batch-specific amounts from Layer 2
   - Numbers should make sense (batch amounts should sum to totals)

---

## Technical Notes

### UNASSIGNED Batch

- Already exists in the system (see `batchAllocationService.ts:333`)
- Use for items not assigned to a specific batch
- Should appear first in dropdowns
- Should be labeled clearly: "UNASSIGNED (No Batch)"

### Batch Sorting

Native sort gives: `["1", "10", "2", "807", "808"]` ❌

Correct numeric sort:
```typescript
batches.sort((a, b) => {
  if (a === 'UNASSIGNED') return -1;
  if (b === 'UNASSIGNED') return 1;
  return parseInt(a) - parseInt(b);
});
// Result: ["UNASSIGNED", "1", "2", "10", "807", "808"] ✅
```

### Transaction Types

- Stock adjustment: `TransactionType.ADJUSTMENT`
- Transfer: `TransactionType.TRANSFER_IN` (at destination)
- Waste/lost: Uses `addToInventoryCountOptimized` with negative quantity

### Firestore Document IDs

- `expected_inventory`: `{sku}_{location}` (e.g., "A001_logistics")
- `batch_allocations`: `{sku}_{location}` (e.g., "A001_logistics")
  - Contains field: `allocations: { "807": 50, "808": 30, "UNASSIGNED": 20 }`

### Error Messages

Be specific when operations fail:
- "Insufficient stock in Batch 807 at logistics. Available: 30 units, trying to transfer: 50 units"
- Not: "Insufficient stock"

---

## Contact Points for Next Claude

### Key Files Modified in v7.11.0-alpha
- `src/services/tableState.ts` - Added reconciliation methods (lines 377-560)
- `src/components/manager/inventory/ExpectedItemTab.tsx` - Added reconcile button
- `package.json` - Version 7.11.0-alpha

### Key Files to Modify Next
1. `src/components/manager/inventory/StockAdjustmentDialog.tsx`
2. `src/components/manager/inventory/MakeTransactionDialog.tsx`
3. `src/components/common/WasteLostDefectView.tsx`
4. `src/App.tsx` (Manager role section)
5. `src/components/scanner/UnifiedScannerView.tsx`
6. `src/components/scanner/ScanInView.tsx`

### Key Services
- `tableStateService` - Layer 1 (expected_inventory)
- `batchAllocationService` - Layer 2 (batch_allocations)
- `inventoryService` - Legacy (DELETE)
- `transactionService` - Transaction records

### User Feedback Required
After deploying v7.11.0-alpha, ask user:
1. Did reconciliation find mismatches?
2. Did auto-fix work?
3. Are numbers aligned now?
4. Test a stock adjustment → does it work?
5. Test a transfer → does it work?

---

## Questions for User (Before Proceeding)

1. **Phase 5 Testing**: Did the reconciliation tool work? Are numbers correct now?
2. **Phase Order**: Should we do all phases at once, or deploy after each phase?
3. **Backup**: Do you want a data backup before we delete `inventory_counts`?
4. **Custom Dropdown**: Should we use an existing component library, or build from scratch?

---

## Version History

- **v7.9.0** - Fixed waste/lost bugs (negative inventory, batch allocation sync)
- **v7.10.0** - Added stock adjustment + transaction dialogs (BROKEN - wrong database)
- **v7.11.0-alpha** - Added reconciliation tool (CURRENT - ready for testing)
- **v7.11.0** - Full refactor complete (TARGET)

---

## Success Criteria

✅ **v7.11.0 is successful when:**
1. Reconciliation tool shows 0 mismatches
2. "All Batches" view shows correct totals
3. Specific batch view shows correct batch amounts
4. Stock adjustments are batch-specific
5. Transfers are batch-specific
6. All operations maintain two-layer sync
7. User says: "The numbers look right now"
8. No more `inventory_counts` collection
9. Custom dropdowns with search/sort working
10. Full audit trail with batch information

---

**END OF IMPLEMENTATION PLAN**
