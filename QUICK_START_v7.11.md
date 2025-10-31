# Quick Start Guide - v7.11.0 Continuation

## Current Status (v7.11.0-alpha)
✅ **Phase 5 Complete** - Reconciliation tool built and ready to test
❌ **Phases 1-4 & 6 Pending** - See full plan in `IMPLEMENTATION_PLAN_v7.11.md`

---

## For User: Test Reconciliation First

1. Deploy v7.11.0-alpha (Firebase auth renewed)
2. Go to **Manager → Inventory → Expected (5)** tab
3. Click **"🔍 Reconcile Data"** button (blue, next to Refresh)
4. Review report → Confirm auto-fix if needed
5. Refresh page
6. **Report back:** Are numbers correct now?

---

## For Next Claude: Where to Start

### Step 1: Check User Feedback
Ask user:
- Did reconciliation work?
- Are numbers aligned now?
- Any errors?

### Step 2: Read Full Plan
Open `IMPLEMENTATION_PLAN_v7.11.md` - contains everything you need:
- Problem explanation
- Architecture details
- What's done (Phase 5)
- What's pending (Phases 1-4, 6)
- Code examples for each change
- Testing checklist

### Step 3: Proceed with Phases 1-4

**Quick Phase Summary:**
- **Phase 1** - Remove `inventory_counts` (legacy collection)
- **Phase 2** - Add two-layer sync to all operations
- **Phase 3** - Make dialogs batch-specific (require batch selection)
- **Phase 4** - Custom dropdown component (better UX)
- **Phase 6** - Test, version bump, deploy

---

## Key Concepts for Next Claude

### The Two-Layer System
```
Layer 2 (Source): batch_allocations → detailed
Layer 1 (Calculated): expected_inventory → totals

Rule: Layer 1 MUST equal SUM of Layer 2
```

### Helper Function (Already Built)
```typescript
// After ANY batch operation, call this:
await tableStateService.syncExpectedFromBatchAllocations(sku, location);
```

### UNASSIGNED Batch
- Already exists in system
- Use for items without batch assignment
- Include in all batch dropdowns

---

## File Locations

### Modified in v7.11.0-alpha
- `src/services/tableState.ts` (+183 lines, reconciliation methods)
- `src/components/manager/inventory/ExpectedItemTab.tsx` (reconcile button)
- `package.json` (version 7.11.0-alpha)

### To Modify Next (Phase 1)
1. `src/components/manager/inventory/StockAdjustmentDialog.tsx`
2. `src/components/manager/inventory/MakeTransactionDialog.tsx`
3. `src/components/common/WasteLostDefectView.tsx`
4. `src/App.tsx`
5. `src/components/scanner/UnifiedScannerView.tsx`
6. `src/components/scanner/ScanInView.tsx`

---

## Quick Commands

```bash
# Build
npm run build

# Deploy
firebase deploy --only hosting

# Check build size
ls -lh dist/assets/ManagerView-*.js
```

---

## Success Metrics

When done correctly:
- ✅ Reconciliation shows 0 mismatches
- ✅ "All Batches" = sum of all batch filters
- ✅ User says numbers are correct
- ✅ All operations specify batch
- ✅ Transaction log shows batch info

---

## If Something Breaks

1. Check console for errors
2. Run reconciliation tool
3. Check if both layers updated:
   ```typescript
   // Layer 2
   const alloc = await batchAllocationService.getBatchAllocation(sku, location);
   console.log('Batch allocations:', alloc.allocations);
   console.log('Total:', alloc.totalAllocated);

   // Layer 1
   const expected = await tableStateService.getExpectedInventory();
   const match = expected.find(e => e.sku === sku && e.location === location);
   console.log('Expected amount:', match?.amount);
   ```

---

**Read full plan:** `IMPLEMENTATION_PLAN_v7.11.md`
