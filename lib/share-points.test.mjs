import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestSharePoints as calc} from './share-points.mjs';
test('illustrative 10 points per TWD, NOT an approved policy',()=>assert.equal(calc({referenceValueTwd:500,pointsPerTwd:10}),5000));
test('configurable rate and rounding',()=>assert.equal(calc({referenceValueTwd:101,pointsPerTwd:3,roundTo:50}),350));
test('no implicit rate and no zero-value listing',()=>{
 assert.throws(()=>calc({referenceValueTwd:500}),RangeError);
 assert.throws(()=>calc({referenceValueTwd:0,pointsPerTwd:10}),RangeError);
});
test('rejects unsafe arithmetic',()=>assert.throws(()=>calc({referenceValueTwd:Number.MAX_SAFE_INTEGER,pointsPerTwd:10}),RangeError));
