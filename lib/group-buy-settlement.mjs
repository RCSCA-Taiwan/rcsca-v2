/**
 * Pure preview calculator for group-buy V2 settlement.
 * Authoritative settlement must recompute eligible orders from verified DB records.
 * All amounts are integer TWD; no frontend input may authorize a payout.
 */
export function calculateGroupBuySettlement({grossProductReceipts, refundedProductAmount=0, otherAgreedDeductions=0, eligibleOrderCount, baseFee=500, perOrderFee=30}) {
 const amounts=[grossProductReceipts,refundedProductAmount,otherAgreedDeductions,eligibleOrderCount,baseFee,perOrderFee];
 if(amounts.some(n=>!Number.isSafeInteger(n)||n<0)) throw new RangeError('All amounts and order counts must be nonnegative safe integers');
 if(refundedProductAmount>grossProductReceipts) throw new RangeError('Refunds exceed verified gross receipts');
 const serviceFee=baseFee+eligibleOrderCount*perOrderFee;
 const netPayout=grossProductReceipts-refundedProductAmount-otherAgreedDeductions-serviceFee;
 if(!Number.isSafeInteger(serviceFee)||!Number.isSafeInteger(netPayout)) throw new RangeError('Settlement overflow');
 return Object.freeze({
  grossProductReceipts,refundedProductAmount,otherAgreedDeductions,
  eligibleOrderCount,baseFee,perOrderFee,serviceFee,
  netPayout:Math.max(0,netPayout),
  status:netPayout<0?'hold_insufficient_funds':'ready_for_review',
  shortfall:Math.max(0,-netPayout)
 });
}
