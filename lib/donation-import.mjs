export const donationHeaders=['會員編號','信箱','姓名','認購金額','實收金額','入帳日期','收據編號','核實依據'];
export const donationTemplate=donationHeaders.join('\t')+'\n';
export function parseDonationPaste(input){
 const source=input.replace(/^\uFEFF/,'').trim();if(!source)throw Error('請先貼上含欄名的資料。');
 const sep=source.includes('\t')?'\t':',';const lines=[];let row=[],cell='',quoted=false;
 for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===sep&&!quoted){row.push(cell);cell='';}else if(ch==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));lines.push(row);row=[];cell='';}else cell+=ch;}
 if(quoted)throw Error('引號未成對，請檢查貼上的 CSV。');row.push(cell.replace(/\r$/,''));lines.push(row);
 const head=lines.shift().map(x=>x.trim());if(head.join('|')!==donationHeaders.join('|'))throw Error('欄位不符，請使用畫面提供的欄名與順序。');
 const data=lines.filter(r=>r.some(x=>x.trim()));if(!data.length||data.length>500)throw Error('每批需有 1–500 筆資料。');
 return data.map((r,i)=>{if(r.length!==8)throw Error(`第 ${i+2} 列欄位數量不符。`);const amount=v=>/^\d+$/.test(v.trim())?Number(v.trim()):null;return {member_number:r[0].trim(),email:r[1].trim(),name:r[2].trim(),pledged:amount(r[3]),amount:amount(r[4]),received_on:r[5].trim(),reference:r[6].trim(),note:r[7].trim()};});
}
export function parseDonationNames(input,unitPrice){
 if(!Number.isSafeInteger(unitPrice)||unitPrice<=0||unitPrice>1000000)throw Error('每單位金額請填 1–1,000,000 的整數。');
 const lines=input.trim().split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(!lines.length||lines.length>500)throw Error('每批需有 1–500 筆認購。');
 const chinese={'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
 return lines.map((line,i)=>{const normalized=line.replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296));const m=normalized.match(/^(.+?)\s*(?:認購|认购)\s*([0-9]+|[一二三四五六七八九十兩])\s*(?:單位|单位)\s*[。.]?$/);if(!m)throw Error(`第 ${i+1} 列無法辨識，請用「姓名認購1單位」。`);const name=m[1].trim().replace(/^[•·\-\d]+[、.．]\s*/,''),units=chinese[m[2]]??Number(m[2]);const pledged=units*unitPrice;if(!name||name.length>100||!Number.isSafeInteger(units)||units<1||!Number.isSafeInteger(pledged)||pledged>2147483647)throw Error(`第 ${i+1} 列姓名、單位數或金額不符。`);return {name,units,pledged};});
}
