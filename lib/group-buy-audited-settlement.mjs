import { calculateGroupBuySettlement } from './group-buy-settlement.mjs';

/** Server-side preview only: caller must supply audited records and locked fees.
 * Never use this result as authorization to release funds.
 */
export function previewAuditedSettlement({orders, baseFee, perOrderFee, otherAgreedDeductions=0}) {
 if (!Array.isArray(orders)) throw new TypeError('Orders required');
 const seen=new Set();
 let grossProductReceipts=0, refundedProductAmount=0, eligibleOrderCount=0;
 for (const order of orders) {
  const {id, verifiedProductReceipts, refundedProductAmount: refund, status}=order;
  if(typeof id!=='string'||!id.trim()||seen.has(id)) throw new Error('Invalid or duplicate order');
  seen.add(id);
  if(!['unpaid','cancelled','delivered','fully_refunded','pending_delivery','disputed'].includes(status)) throw new Error('Unknown order status');
  if([verifiedProductReceipts,refund].some(n=>!Number.isSafeInteger(n)||n<0)||refund>verifiedProductReceipts) throw new RangeError('Invalid audited amounts');
  if(status==='pending_delivery'||status==='disputed') return Object.freeze({status:'hold_unresolved_orders'});
  if(status==='unpaid'&&verifiedProductReceipts!==0) throw new Error('Unpaid order has receipts');
  if(['cancelled','fully_refunded'].includes(status)&&verifiedProductReceipts!==refund) return Object.freeze({status:'hold_unresolved_orders'});
  grossProductReceipts+=verifiedProductReceipts;
  refundedProductAmount+=refund;
  if(status==='delivered'&&verifiedProductReceipts>refund) eligibleOrderCount++;
 }
 return calculateGroupBuySettlement({grossProductReceipts,refundedProductAmount,eligibleOrderCount,baseFee,perOrderFee,otherAgreedDeductions});
}
