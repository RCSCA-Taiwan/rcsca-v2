import {test} from 'node:test';
import assert from 'node:assert/strict';
import {IMPORT_HEADERS,parseMemberCSV,memberCSVTemplate,importError,decodeCSVBytes} from './member-import.mjs';
const header=IMPORT_HEADERS.join(',');
test('byte decoding preserves UTF-8 Chinese names and rejects damaged or UTF-16 input',()=>{
 const text=memberCSVTemplate()+'test@example.invalid,測試會員,永久會員,2018-01-01,\r\n';
 assert.equal(parseMemberCSV(decodeCSVBytes(new TextEncoder().encode(text)))[0].name,'測試會員');
 const damaged=Buffer.concat([Buffer.from(header+'\ntest@example.invalid,'),Buffer.from([0xff]),Buffer.from(',永久會員,2018-01-01,')]);
 for(const bytes of [damaged,Buffer.from([0xe7,0x8e]),Buffer.from([0xff,0xfe,0x41,0])])assert.throws(()=>decodeCSVBytes(bytes),/CSV UTF-8/);
});
test('UTF-8 BOM, CRLF, case normalization and Chinese membership names',()=>{assert.deepEqual(parseMemberCSV(memberCSVTemplate()+' PERSON@EXAMPLE.TEST ,王小明,永久會員,2018-01-01,\r\n'),[{email:'person@example.test',name:'王小明',membership_type:'lifetime',member_since:'2018-01-01',referrer_email:''}]);});
test('quoted commas, escaped quotes and line breaks remain literal values',()=>{const [r]=parseMemberCSV(header+'\nuser@example.test,"王,小""明\n測試",一般會員,2018-01-01,ref@example.test\n');assert.equal(r.name,'王,小"明\n測試');assert.equal(r.referrer_email,'ref@example.test');});
test('malformed quotes, extra fields and unsupported headers are rejected',()=>{for(const csv of [header+'\nx,"not closed',header+'\nx,"closed"after,annual,2018-01-01,',header+'\nx,name,annual,2018-01-01,,',header.replace('會員姓名','身分證')+'\nx,name,annual,2018-01-01,'])assert.throws(()=>parseMemberCSV(csv));});
test('empty lists, row limits and byte limits are enforced',()=>{assert.throws(()=>parseMemberCSV(memberCSVTemplate()));assert.throws(()=>parseMemberCSV(header+'\n'+Array(101).fill('x@example.test,name,annual,2018-01-01,').join('\n')));assert.throws(()=>parseMemberCSV('字'.repeat(50000)));assert.equal(parseMemberCSV(header+'\n'+Array(100).fill('x@example.test,name,annual,2018-01-01,').join('\n')).length,100);});
test('formula-looking and prototype-looking values are plain data',()=>{const [r]=parseMemberCSV(header+'\nx@example.test,=1+1,__proto__,2018-01-01,');assert.equal(r.name,'=1+1');assert.equal(r.membership_type,'__proto__');assert.equal(typeof importError({message:'toString'}),'string');});
test('template contains only the required headers and no personal records',()=>{assert.equal(memberCSVTemplate(),'\uFEFF'+header+'\r\n');});
