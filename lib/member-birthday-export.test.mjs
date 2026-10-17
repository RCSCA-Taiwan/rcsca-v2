import {test} from 'node:test';
import assert from 'node:assert/strict';
import {memberBirthdayCSV} from './member-birthday-export.mjs';
import {parseCSVMatrix} from './member-import.mjs';

const person = {name: '王小明', month: 2, day: 29, membership_type: 'lifetime'};
const matrix = csv => parseCSVMatrix(csv.slice(1));

test('birthday CSV is Excel-ready and exports only the four allowed fields', () => {
  const csv = memberBirthdayCSV([{...person, birth_date: '1992-02-29', email: 'private@example.test', phone: '0900000000', user_id: 'private-id'}], 2);
  assert.equal(csv[0], '\uFEFF');
  assert.deepEqual(matrix(csv), [['會員姓名', '生日月份', '生日日期', '會籍類型'], ['王小明', '2', '29', '永久會員']]);
  for (const hidden of ['1992', 'private@example.test', '0900000000', 'private-id']) assert.ok(!csv.includes(hidden));
});

test('names containing commas, quotes and newlines remain one exact CSV field', () => {
  const name = '王,"小明"\n測試';
  assert.equal(matrix(memberBirthdayCSV([{...person, name, membership_type: 'annual'}], 2))[1][0], name);
});

test('spreadsheet formula prefixes and leading controls are neutralized', () => {
  for (const name of ['=HYPERLINK("https://example.test")', '+1', '-1', '@SUM(1)', '  =1', '\tplain', '\rplain', '\nplain']) {
    assert.equal(matrix(memberBirthdayCSV([{...person, name}], 2))[1][0], "'" + name);
  }
});

test('mixed months, invalid days, missing names and unknown membership types fail closed', () => {
  for (const row of [{...person, month: 3}, {...person, day: 30}, {...person, day: 0}, {...person, day: 2.5}, {...person, name: ''}, {...person, membership_type: '__proto__'}, null]) {
    assert.throws(() => memberBirthdayCSV([row], 2));
  }
  for (const month of [0, 13, 2.5, '2']) assert.throws(() => memberBirthdayCSV([person], month));
  assert.throws(() => memberBirthdayCSV([], 2));
  assert.throws(() => memberBirthdayCSV(null, 2));
});
