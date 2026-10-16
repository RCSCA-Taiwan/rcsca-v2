import {test} from 'node:test';import assert from 'node:assert/strict';import {membershipTenure} from './membership-tenure.mjs';
test('association tenure starts at original admission, never platform signup',()=>{assert.deepEqual(membershipTenure('2018-10-18','2026-10-17'),{years:7,months:11,days:29,label:'7 年 11 個月'});assert.equal(membershipTenure('2018-10-17','2026-10-17').years,8);});
test('month ends and leap-day anniversaries clamp correctly',()=>{assert.equal(membershipTenure('2020-02-29','2021-02-28').years,1);assert.equal(membershipTenure('2018-08-31','2026-09-30').months,1);});
test('unknown, impossible and future admission dates are not invented',()=>{for(const v of [null,'2018','2020-02-30','2099-01-01'])assert.equal(membershipTenure(v,'2026-10-17'),null);});
