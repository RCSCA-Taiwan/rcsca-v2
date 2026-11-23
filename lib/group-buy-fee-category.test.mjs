import test from 'node:test';import assert from 'node:assert/strict';import {groupBuyFeeForCategory as fee} from './group-buy-settlement.mjs';
test('personal member pays fixed 1000 and owes 2 items',()=>assert.deepEqual(fee({proposerCategory:'individual_member',eligibleOrderCount:100}),{baseFee:1000,perOrderFee:0,requiredRewardItems:2,serviceFee:1000}));
test('enterprise unchanged',()=>assert.equal(fee({proposerCategory:'enterprise_shop',eligibleOrderCount:100}).serviceFee,4000));
test('invalid category cannot select fee',()=>assert.throws(()=>fee({proposerCategory:'other',eligibleOrderCount:1}),RangeError));
