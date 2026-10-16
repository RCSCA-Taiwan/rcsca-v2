import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const catalog=JSON.parse(readFileSync(new URL('./network-taxonomy.json',import.meta.url),'utf8'));
const migration=readFileSync(new URL('../supabase/migrations/20261016162337_partner_network_taxonomy.sql',import.meta.url),'utf8');
test('shared catalog has stable unique leaf codes and detailed groups',()=>{
 const leaves=catalog.flatMap(group=>group.children);assert.equal(catalog.length,22);assert.equal(leaves.length,176);assert.equal(new Set(leaves.map(row=>row.code)).size,leaves.length);
 for(const group of catalog){assert.ok(group.children.length>=6);for(const leaf of group.children){assert.ok(leaf.code.startsWith(group.code+'.'));assert.match(leaf.code,/^[a-z]+\.[a-z]+$/);assert.ok(leaf.label.length>0);}}
});
test('database seed and registration/network catalog stay synchronized',()=>{
 const seed=JSON.parse(migration.split('$taxonomy$')[1]);const expected=catalog.flatMap((group,gi)=>group.children.map((row,ci)=>({...row,group_code:group.code,group_label:group.label,sort_order:gi*100+ci})));
 assert.deepEqual(seed,expected);
});
