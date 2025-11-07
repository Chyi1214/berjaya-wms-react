// Transfer Effects - shared logic to keep inventory and batch allocations in sync
import { createModuleLogger } from './logger';
import { tableStateService } from './tableState';
import { itemMasterService } from './itemMaster';
import { batchAllocationService } from './batchAllocationService';
import type { Transaction } from '../types';

const log = createModuleLogger('TransferEffects');

// Apply a forward transfer: move inventory and batch allocation from source to destination
// v7.6.0: Added support for multi-item transactions
export async function applyTransferEffects(transaction: Transaction) {
  // Guard: destination required
  const destination = transaction.toLocation;
  if (!destination) {
    throw new Error('Destination location is required for transfer');
  }

  const actor = (transaction.approvedBy || transaction.performedBy || 'system') as string;
  const source = transaction.fromLocation || transaction.location || 'logistics';

  // Multi-item transaction support (v7.6.0+)
  if (transaction.items && transaction.items.length > 0) {
    log.info('Processing multi-item transaction', { transactionId: transaction.id, itemCount: transaction.items.length });

    for (const item of transaction.items) {
      // Skip BOMs
      if (item.sku.startsWith('BOM')) {
        log.warn('BOM transfer ignored in multi-item transaction', { sku: item.sku, id: transaction.id });
        continue;
      }

      const amount = Math.abs(item.amount);

      // Resolve correct item name via Item Master (fallback to SKU)
      let itemName = item.itemName || item.sku;
      try {
        const itemMaster = await itemMasterService.getItemBySKU(item.sku);
        if (itemMaster) itemName = itemMaster.name;
      } catch (e) {
        log.warn('Item Master lookup failed; using provided name', { sku: item.sku, error: e });
      }

      // Inventory: +dest, -source
      await tableStateService.addToInventoryCountOptimized(item.sku, itemName, amount, destination, actor);
      await tableStateService.addToInventoryCountOptimized(item.sku, itemName, -amount, source, actor);

      log.info('Inventory transfer applied (multi-item)', { sku: item.sku, amount, from: source, to: destination });

      // Batch allocation move (v7.20.0: Cross-batch transfer support)
      const fromBatch = transaction.fromBatch || transaction.batchId;
      const toBatch = transaction.toBatch || transaction.batchId;

      if (fromBatch) {
        try {
          const existing = await batchAllocationService.getBatchAllocation(item.sku, source);
          const available = existing?.allocations?.[fromBatch] || 0;
          const moveQty = Math.min(amount, available);

          if (moveQty > 0) {
            // Remove from source location + source batch
            await batchAllocationService.removeToBatchAllocation(item.sku, source, fromBatch, moveQty);

            // Add to destination location + destination batch (may be different batch!)
            await batchAllocationService.addToBatchAllocation(item.sku, destination, toBatch || fromBatch, moveQty);

            if (fromBatch !== toBatch) {
              log.info('Cross-batch allocation moved (multi-item)', {
                sku: item.sku,
                fromBatch,
                toBatch,
                qty: moveQty,
                fromLocation: source,
                toLocation: destination
              });
            } else {
              log.info('Batch allocation moved (multi-item)', {
                sku: item.sku,
                batchId: fromBatch,
                qty: moveQty,
                from: source,
                to: destination
              });
            }
          } else {
            log.warn('No batch allocation available to move (multi-item)', {
              sku: item.sku,
              fromBatch,
              requested: amount,
              available
            });
          }
        } catch (e) {
          log.warn('Batch allocation move failed (multi-item)', e);
        }
      }
    }

    log.info('Multi-item transaction processing complete', { transactionId: transaction.id, itemCount: transaction.items.length });
    return;
  }

  // Single-item transaction (legacy support)
  // Guard: ignore BOM (expansion not implemented here)
  if (transaction.sku.startsWith('BOM')) {
    log.warn('BOM transfer ignored in applyTransferEffects', { sku: transaction.sku, id: transaction.id });
    return;
  }

  const amount = Math.abs(transaction.amount);

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

  // Batch allocation move (v7.20.0: Cross-batch transfer support)
  const fromBatch = transaction.fromBatch || transaction.batchId;
  const toBatch = transaction.toBatch || transaction.batchId;

  if (fromBatch) {
    try {
      const existing = await batchAllocationService.getBatchAllocation(transaction.sku, source);
      const available = existing?.allocations?.[fromBatch] || 0;
      const moveQty = Math.min(amount, available);

      if (moveQty > 0) {
        // Remove from source location + source batch
        await batchAllocationService.removeToBatchAllocation(transaction.sku, source, fromBatch, moveQty);

        // Add to destination location + destination batch (may be different batch!)
        await batchAllocationService.addToBatchAllocation(transaction.sku, destination, toBatch || fromBatch, moveQty);

        if (fromBatch !== toBatch) {
          log.info('Cross-batch allocation moved (single-item)', {
            sku: transaction.sku,
            fromBatch,
            toBatch,
            qty: moveQty,
            fromLocation: source,
            toLocation: destination
          });
        } else {
          log.info('Batch allocation moved', {
            sku: transaction.sku,
            batchId: fromBatch,
            qty: moveQty,
            from: source,
            to: destination
          });
        }
      } else {
        log.warn('No batch allocation available to move', {
          sku: transaction.sku,
          fromBatch,
          requested: amount,
          available
        });
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

  // Batch allocation move back (v7.20.0: Reverse cross-batch transfer if needed)
  const fromBatch = original.fromBatch || original.batchId;
  const toBatch = original.toBatch || original.batchId;

  if (toBatch) {
    try {
      // For rectification, we reverse the direction: take from toBatch at destination, return to fromBatch at source
      const existing = await batchAllocationService.getBatchAllocation(original.sku, src);
      const available = existing?.allocations?.[toBatch] || 0;
      const moveQty = Math.min(amount, available);

      if (moveQty > 0) {
        // Remove from destination location + destination batch
        await batchAllocationService.removeToBatchAllocation(original.sku, src, toBatch, moveQty);

        // Add back to source location + source batch
        await batchAllocationService.addToBatchAllocation(original.sku, dst, fromBatch || toBatch, moveQty);

        if (fromBatch !== toBatch) {
          log.info('Cross-batch allocation rectified', {
            sku: original.sku,
            fromBatch: toBatch,
            toBatch: fromBatch,
            qty: moveQty,
            fromLocation: src,
            toLocation: dst
          });
        } else {
          log.info('Batch allocation rectified', {
            sku: original.sku,
            batchId: toBatch,
            qty: moveQty,
            from: src,
            to: dst
          });
        }
      } else {
        log.warn('No batch allocation available to rectify', {
          sku: original.sku,
          toBatch,
          requested: amount,
          available
        });
      }
    } catch (e) {
      log.warn('Batch allocation rectification failed', e);
    }
  }
}

