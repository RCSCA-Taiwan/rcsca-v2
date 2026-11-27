import test from 'node:test';
import assert from 'node:assert/strict';
import {projectStock} from './group-buy-stock.mjs';
const o=(id,quantity,status='reserved')=>({id,quantity,status});
test('capacity',()=>{assert.throws(()=>projectStock(51,[]));assert.equal(projectStock(100,[]).available,100)});
test('units not orders',()=>assert.equal(projectStock(50,[o('a',3),o('b',7,'paid')]).available,40));
test('released stock',()=>assert.equal(projectStock(50,[o('a',30,'expired'),o('b',20,'cancelled')]).available,50));
test('oversold and duplicate',()=>{assert.throws(()=>projectStock(50,[o('a',30),o('b',21)]),/Oversold/);assert.throws(()=>projectStock(50,[o('a',1),o('a',1)]),/duplicate/)});
test('invalid quantity and status',()=>{assert.throws(()=>projectStock(50,[o('a',0)]));assert.throws(()=>projectStock(50,[o('a',1,'unknown')]))});
