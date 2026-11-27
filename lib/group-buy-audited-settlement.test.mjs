import test from 'node:test';
import assert from 'node:assert/strict';
import { previewAuditedSettlement as preview } from './group-buy-audited-settlement.mjs';
const order=(id,status='delivered',verifiedProductReceipts=3000,refundedProductAmount=0)=>({id,status,verifiedProductReceipts,refundedProductAmount});
const run=(orders,fees={baseFee:2000,perOrderFee:20})=>preview({orders,...fees});
test('enterprise fees count completed orders, excluding fully refunded and unpaid',()=>{
 const result=run([order('a'),order('b','fully_refunded',3000,3000),order('c','unpaid',0)]);
 assert.equal(result.eligibleOrderCount,1);
 assert.equal(result.netPayout,980);
});
test('individual fee and partial refund',()=>{
 const result=run([order('a','delivered',3000,500)],{baseFee:1000,perOrderFee:0});
 assert.equal(result.netPayout,1500);
});
test('unresolved orders hold settlement',()=>assert.equal(run([order('a','disputed')]).status,'hold_unresolved_orders'));
test('hold does not hide duplicate or invalid subsequent records',()=>{
 assert.throws(()=>run([order('a','disputed'),order('a')]),/duplicate/);
 assert.throws(()=>run([order('a','pending_delivery'),order('b','unpaid')]),/Unpaid/);
});
test('aggregate overflow is rejected',()=>assert.throws(()=>run([order('a','delivered',Number.MAX_SAFE_INTEGER),order('b','delivered',1)]),/overflow/));
test('missing locked fees are rejected even on hold',()=>assert.throws(()=>run([order('a','disputed')],{}),/locked fees/));
test('insufficient funds never yield negative payout',()=>{
 const result=run([order('a','delivered',100)]);
 assert.equal(result.status,'hold_insufficient_funds');
 assert.equal(result.netPayout,0);
});
