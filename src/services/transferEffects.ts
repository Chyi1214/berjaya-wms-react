// Transfer Effects - shared logic to keep inventory and batch allocations in sync
import { createModuleLogger } from './logger';
import { tableStateService } from './tableState';
import { itemMasterService } from './itemMaster';
import { batchAllocationService } from './batchAllocationService';
import type { Transaction } from '../types';

const log = createModuleLogger('TransferEffects');

// Apply a forward transfer: move inventory and batch allocation from source to destination
export async function applyTransferEffects(transaction: Transaction) {
  // Guard: destination required
  const destination = transaction.toLocation;
  if (!destination) {
    throw new Error('Destination location is required for transfer');
  }

  // Guard: ignore BOM (expansion not implemented here)
  if (transaction.sku.startsWith('BOM')) {
    log.warn('BOM transfer ignored in applyTransferEffects', { sku: transaction.sku, id: transaction.id });
    return;
  }

  const amount = Math.abs(transaction.amount);
  const actor = (transaction.approvedBy || transaction.performedBy || 'system') as string;
  const source = transaction.fromLocation || transaction.location || 'logistics';

  // Resolve correct item name via Item Master (fallback to SKU)
  let itemName = transaction.sku;
  try {
    const item = await itemMasterService.getItemBySKU(transaction.sku);
    if (item) itemName = item.name;
  } catch (e) {
    log.warn('Item Master lookup failed; using SKU as name', { sku: transaction.sku, error: e });
  }

  // Inventory: +dest, -source
  await tableStateService.addToInventoryCountOptimized(transaction.sku, itemName, amount, destination, actor);
  await tableStateService.addToInventoryCountOptimized(transaction.sku, itemName, -amount, source, actor);

  log.info('Inventory transfer applied', { sku: transaction.sku, amount, from: source, to: destination });

  // Batch allocation move (if batchId present)
  if (transaction.batchId) {
    try {
      const existing = await batchAllocationService.getBatchAllocation(transaction.sku, source);
      const available = existing?.allocations?.[transaction.batchId] || 0;
      const moveQty = Math.min(amount, available);

      if (moveQty > 0) {
        await batchAllocationService.removeToBatchAllocation(transaction.sku, source, transaction.batchId, moveQty);
        await batchAllocationService.addToBatchAllocation(transaction.sku, destination, transaction.batchId, moveQty);
        log.info('Batch allocation moved', { sku: transaction.sku, batchId: transaction.batchId, qty: moveQty, from: source, to: destination });
      } else {
        log.warn('No batch allocation available to move', { sku: transaction.sku, batchId: transaction.batchId, requested: amount, available });
      }
    } catch (e) {
      log.warn('Batch allocation move failed', e);
    }
  }
}

// Apply a rectification (reverse transfer): move inventory and allocation back to original source
export async function applyRectificationEffects(original: Transaction, performedBy?: string) {
  // Guard: destination (original toLocation) required
  const src = original.toLocation;
  const dst = original.fromLocation || original.location || 'logistics';
  if (!src) {
    throw new Error('Original transaction missing toLocation; cannot rectify');
  }

  if (original.sku.startsWith('BOM')) {
    log.warn('BOM rectification ignored in applyRectificationEffects', { sku: original.sku, id: original.id });
    return;
  }

  const amount = Math.abs(original.amount);
  const actor = (performedBy || original.approvedBy || original.performedBy || 'system') as string;

  // Resolve correct item name via Item Master (fallback to SKU)
  let itemName = original.sku;
  try {
    const item = await itemMasterService.getItemBySKU(original.sku);
    if (item) itemName = item.name;
  } catch (e) {
    log.warn('Item Master lookup failed; using SKU as name (rectify)', { sku: original.sku, error: e });
  }

  // Inventory: -src, +dst
  await tableStateService.addToInventoryCountOptimized(original.sku, itemName, -amount, src, actor);
  await tableStateService.addToInventoryCountOptimized(original.sku, itemName, amount, dst, actor);

  log.info('Inventory rectification applied', { sku: original.sku, amount, from: src, to: dst });

  // Batch allocation move back (if batchId present)
  if (original.batchId) {
    try {
      const existing = await batchAllocationService.getBatchAllocation(original.sku, src);
      const available = existing?.allocations?.[original.batchId] || 0;
      const moveQty = Math.min(amount, available);

      if (moveQty > 0) {
        await batchAllocationService.removeToBatchAllocation(original.sku, src, original.batchId, moveQty);
        await batchAllocationService.addToBatchAllocation(original.sku, dst, original.batchId, moveQty);
        log.info('Batch allocation rectified', { sku: original.sku, batchId: original.batchId, qty: moveQty, from: src, to: dst });
      } else {
        log.warn('No batch allocation available to rectify', { sku: original.sku, batchId: original.batchId, requested: amount, available });
      }
    } catch (e) {
      log.warn('Batch allocation rectification failed', e);
    }
  }
}

