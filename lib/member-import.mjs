export const IMPORT_HEADERS=['登入信箱','會員姓名','會籍類型','原入會日期','介紹人登入信箱'];
export function parseMemberCSV(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>131072)throw Error('檔案上限為 128 KB。');
 const text=input.replace(/^\uFEFF/,''),matrix=[];let row=[],field='',quoted=false,closed=false;
 function addField(){row.push(field);field='';closed=false;}
 function addRow(){addField();if(row.some(cell=>cell.trim()))matrix.push(row);row=[];}
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c===','){addField();continue;}
  if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;addRow();continue;}
  if(closed)throw Error('引號結束後只能接逗號或換行，請重新另存為 CSV UTF-8。');
  if(c==='"'){if(field)throw Error('欄位引號位置不正確。');quoted=true;continue;}
  field+=c;
 }
 if(quoted)throw Error('檔案有未關閉的引號。');
 if(field||row.length||closed)addRow();
 if(!matrix.length)throw Error('檔案沒有標題列。');
 const header=matrix.shift().map(x=>x.trim());
 if(header.length!==IMPORT_HEADERS.length||IMPORT_HEADERS.some((x,i)=>header[i]!==x))throw Error('欄位名稱或順序不符，請使用本頁下載的範本。');
 if(!matrix.length||matrix.length>100)throw Error('每次需匯入 1～100 筆會員資料。');
 return matrix.map((cells,i)=>{
  if(cells.length!==IMPORT_HEADERS.length)throw Error(`第 ${i+1} 筆欄位數量不符。`);
  const [email,name,type,member_since,referrer_email]=cells.map(x=>x.trim());
  const membership_type=new Map([['一般會員','annual'],['永久會員','lifetime'],['annual','annual'],['lifetime','lifetime']]).get(type)||type;
  return {email:email.toLowerCase(),name,membership_type,member_since,referrer_email:referrer_email.toLowerCase()};
 });
}
export function memberCSVTemplate(){return '\uFEFF'+IMPORT_HEADERS.join(',')+'\r\n';}
export const IMPORT_ERRORS={invalid_email:'登入信箱格式不正確',invalid_name:'會員姓名須為 1～100 字',invalid_type:'會籍類型須為一般會員或永久會員',invalid_date:'日期須為有效的 YYYY-MM-DD，且不可晚於今天',duplicate_email:'檔案內登入信箱重複',account_not_unique_or_verified:'找不到唯一且已驗證信箱的啟用帳號',active_membership_required:'需先完成正式會籍審核並啟用',membership_type_mismatch:'與已核准會籍不同，請先另行核對會籍',original_date_mismatch:'與已確認的原入會日期不同',existing_date_conflict:'既有會籍與歷史入會日期衝突，請先人工核對',year_already_confirmed:'本年度名冊已登錄',application_pending:'尚有會員申請待審核',invalid_referrer_email:'介紹人登入信箱格式不正確',invalid_referrer:'介紹人須為另一位已驗證信箱的有效會員'};
export function importError(error){const m=error?.message||'';return new Map(Object.entries({admin_required:'目前帳號沒有會員管理權限。',invalid_membership_period:'只可確認台灣當年度名冊，請重新載入。',import_rows_need_correction:'名單仍有待修正資料，未寫入任何一筆。',import_preview_changed:'名單狀態已變更，請重新預覽核對；未寫入任何一筆。',import_batch_conflict:'這次送出的內容與先前送出紀錄不同，請重新確認已登錄名冊。',import_confirmation_required:'請填寫核對依據並勾選確認。',import_size_limit:'每批限 1～100 筆，檔案上限 128 KB。',invalid_import_payload:'檔案欄位不符合範本，請重新檢查。'})).get(m)||'操作未完成，請保留目前資料並重試；若先前已完成，系統會回傳同一批結果。';}
