import test from 'node:test';import assert from 'node:assert/strict';import {groupBuyFeeForCategory as fee,calculateCategorySettlement as settle} from './group-buy-settlement.mjs';
test('personal member pays fixed 1000 and owes 2 items',()=>assert.deepEqual(fee({proposerCategory:'individual_member',eligibleOrderCount:100}),{baseFee:1000,perOrderFee:0,requiredRewardItems:2,serviceFee:1000}));
test('enterprise unchanged',()=>assert.equal(fee({proposerCategory:'enterprise_shop',eligibleOrderCount:100}).serviceFee,4000));
test('invalid category cannot select fee',()=>assert.throws(()=>fee({proposerCategory:'other',eligibleOrderCount:1}),RangeError));

test('individual settlement never charges enterprise order fee',()=>{const x=settle({proposerCategory:'individual_member',grossProductReceipts:30000,eligibleOrderCount:50});assert.equal(x.serviceFee,1000);assert.equal(x.netPayout,29000);assert.equal(x.requiredRewardItems,2);});
test('enterprise settlement applies current fee',()=>{const x=settle({proposerCategory:'enterprise_shop',grossProductReceipts:30000,eligibleOrderCount:50});assert.equal(x.serviceFee,3000);assert.equal(x.netPayout,27000);});
test('personal insufficient proceeds held',()=>{const x=settle({proposerCategory:'individual_member',grossProductReceipts:500,eligibleOrderCount:1});assert.equal(x.shortfall,500);assert.equal(x.status,'hold_insufficient_funds');});
