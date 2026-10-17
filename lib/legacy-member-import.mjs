import {parseCSVMatrix} from './member-import.mjs';
export const LEGACY_HEADERS=['會員姓名','會籍類型','原入會日期','最後有效年度','信箱','電話','身分證字號','生日','介紹人'];
export function legacyCSVTemplate(){return '\uFEFF'+LEGACY_HEADERS.join(',')+'\r\n';}
export function parseLegacyCSV(input){const matrix=parseCSVMatrix(input);const header=matrix.shift().map(x=>x.trim());
 if(header.length!==LEGACY_HEADERS.length||LEGACY_HEADERS.some((x,i)=>header[i]!==x))throw Error('欄位名稱或順序不符，請使用未註冊名冊專用範本。');
 if(!matrix.length||matrix.length>100)throw Error('每批需為 1～100 筆。');
 return matrix.map((cells,i)=>{if(cells.length!==LEGACY_HEADERS.length)throw Error(`第 ${i+1} 筆欄位數量不符。`);const [name,type,member_since,membership_year,email,phone,identity,birth_date,referrer_text]=cells.map(x=>x.trim());return {name,membership_type:({'一般會員':'annual','永久會員':'lifetime'})[type]||type,member_since,membership_year,email:email.toLowerCase(),phone,identity:identity.toUpperCase(),birth_date,referrer_text};});}
export const LEGACY_ERRORS={invalid_name:'姓名須為1～100字',invalid_type:'會籍須為一般會員或永久會員',invalid_date:'原入會日期不正確',invalid_year:'最後有效年度不正確或早於入會年度',invalid_email:'信箱格式不正確',invalid_phone:'電話格式不正確',invalid_identity:'身分證格式或檢查碼錯誤',contact_required:'至少填寫信箱、電話或身分證其中一項',invalid_birthday:'生日不正確或晚於入會日期',invalid_source_text:'介紹人不得超過200字',duplicate_record:'同批或既有名冊有重複資料，請人工核對'};
