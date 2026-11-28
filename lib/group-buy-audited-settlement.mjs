import { calculateGroupBuySettlement } from './group-buy-settlement.mjs';

/** Server-side preview only: caller must supply audited records and locked fees.
 * Never use this result as authorization to release funds.
 */
export function previewAuditedSettlement({orders, baseFee, perOrderFee, otherAgreedDeductions=0}) {
 if (!Array.isArray(orders)) throw new TypeError('Orders required');
 const seen=new Set();
 let unresolved=false;
 if([baseFee,perOrderFee,otherAgreedDeductions].some(n=>!Number.isSafeInteger(n)||n<0)) throw new RangeError('Invalid locked fees or deductions');
 let grossProductReceipts=0, refundedProductAmount=0, eligibleOrderCount=0;
 for (const order of orders) {
  const {id, verifiedProductReceipts, refundedProductAmount: refund, status}=order;
  if(typeof id!=='string'||!id.trim()||seen.has(id)) throw new Error('Invalid or duplicate order');
  seen.add(id);
  if(!['unpaid','cancelled','delivered','fully_refunded','pending_delivery','disputed'].includes(status)) throw new Error('Unknown order status');
  if([verifiedProductReceipts,refund].some(n=>!Number.isSafeInteger(n)||n<0)||refund>verifiedProductReceipts) throw new RangeError('Invalid audited amounts');
  if(status==='pending_delivery'||status==='disputed') unresolved=true;
  // Delivery alone does not establish that the dispute window has closed.
  if(status==='delivered' && order.disputeWindowClosed!==true) unresolved=true;
  if(status==='unpaid'&&verifiedProductReceipts!==0) throw new Error('Unpaid order has receipts');
  if(['cancelled','fully_refunded'].includes(status)&&verifiedProductReceipts!==refund) unresolved=true;
  grossProductReceipts+=verifiedProductReceipts;
  refundedProductAmount+=refund;
  if(!Number.isSafeInteger(grossProductReceipts)||!Number.isSafeInteger(refundedProductAmount)) throw new RangeError('Audited amount overflow');
  if(status==='delivered'&&verifiedProductReceipts>refund) eligibleOrderCount++;
 }
 if(unresolved) return Object.freeze({status:'hold_unresolved_orders'});
 return calculateGroupBuySettlement({grossProductReceipts,refundedProductAmount,eligibleOrderCount,baseFee,perOrderFee,otherAgreedDeductions});
}
