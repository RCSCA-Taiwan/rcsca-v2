import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateGroupBuySettlement as calc} from './group-buy-settlement.mjs';

test('50 eligible orders: 30,000 gross less 2,000 fee = 28,000 payout',()=>{
 const x=calc({grossProductReceipts:30000,eligibleOrderCount:50});
 assert.equal(x.serviceFee,2000);assert.equal(x.netPayout,28000);assert.equal(x.status,'ready_for_review');
});
test('fees are per order, uncapped even after 100 orders',()=>{
 const x=calc({grossProductReceipts:20000,eligibleOrderCount:120});
 assert.equal(x.serviceFee,4100);assert.equal(x.netPayout,15900);
});
test('refunds and preagreed deductions reduce payout, not eligible order count',()=>{
 const x=calc({grossProductReceipts:30000,refundedProductAmount:1000,otherAgreedDeductions:500,eligibleOrderCount:50});
 assert.equal(x.netPayout,26500);
});
test('insufficient proceeds are held, never negative payout',()=>{
 const x=calc({grossProductReceipts:300,eligibleOrderCount:1});
 assert.equal(x.netPayout,0);assert.equal(x.shortfall,230);assert.equal(x.status,'hold_insufficient_funds');
});
test('reject invalid and unsafe inputs',()=>{
 for(const input of [{grossProductReceipts:-1,eligibleOrderCount:1},{grossProductReceipts:100,refundedProductAmount:101,eligibleOrderCount:1},{grossProductReceipts:100,eligibleOrderCount:1.5},{grossProductReceipts:Number.MAX_SAFE_INTEGER,eligibleOrderCount:Number.MAX_SAFE_INTEGER}])assert.throws(()=>calc(input),RangeError);
});
