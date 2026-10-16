'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {getMembershipClient} from '../../../../lib/membership-api';
import {taiwanYear} from '../../../../lib/membership';
import {parseMemberCSV,memberCSVTemplate,IMPORT_ERRORS,importError,type MemberImportRow} from '../../../../lib/member-import.mjs';
import './import.css';
type PreviewRow=MemberImportRow&{row:number;user_id:string|null;referrer_id:string|null;inherited_source:boolean;errors:string[]};
type Preview={year:number;total:number;ready:number;fingerprint:string;rows:PreviewRow[]};
export default function MemberImport(){
 const[year]=useState(taiwanYear),[access,setAccess]=useState<'loading'|'allowed'|'denied'>('loading'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const[rows,setRows]=useState<MemberImportRow[]>([]),[preview,setPreview]=useState<Preview|null>(null),[note,setNote]=useState(''),[confirmed,setConfirmed]=useState(false),[done,setDone]=useState(false);
 const batch=useRef(''),lock=useRef(false),selection=useRef(0),fileInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{let active=true;(async()=>{try{const r=await getMembershipClient().rpc('admin_membership_import_preview',{p_rows:[],p_year:year});if(r.error)throw r.error;if(active)setAccess('allowed');}catch{if(active)setAccess('denied');}})();return()=>{active=false;};},[year]);
 function clear(){selection.current++;setRows([]);setPreview(null);setConfirmed(false);setNote('');setNotice('');setDone(false);batch.current='';if(fileInput.current)fileInput.current.value='';}
 async function readFile(file:File|undefined){const current=++selection.current;setRows([]);setPreview(null);setConfirmed(false);setDone(false);setNote('');setNotice('');batch.current='';if(!file)return;
  try{if(file.size>131072)throw Error('檔案上限為 128 KB。');const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());const parsed=parseMemberCSV(text);if(current===selection.current){setRows(parsed);setNotice(`已讀取 ${parsed.length} 筆，請執行預覽檢查。`);}}catch(error){if(current===selection.current)setNotice(error instanceof TypeError?'請將檔案另存為 CSV UTF-8。':(error as Error).message);}
 }
 function template(){const url=URL.createObjectURL(new Blob([memberCSVTemplate()],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='member-roster-template.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function check(){if(lock.current||!rows.length)return;lock.current=true;setBusy(true);setNotice('');setPreview(null);setConfirmed(false);setDone(false);
  try{const r=await getMembershipClient().rpc('admin_membership_import_preview',{p_rows:rows,p_year:year});if(r.error)throw r.error;const p=r.data as unknown as Preview;setPreview(p);batch.current=crypto.randomUUID();setNotice(p.ready===p.total?'預覽檢查完成，請逐筆核對後確認登錄。':'部分資料需修正，本批尚未登錄。');}catch(error){setNotice(importError(error));}finally{lock.current=false;setBusy(false);}
 }
 async function commit(){if(lock.current||!preview||done||preview.ready!==preview.total||!confirmed||!note.trim())return;
  if(!window.confirm(`確認將 ${preview.total} 筆已核對資料列入 ${year} 年度名冊？原入會日期會作為積分效期依據。`))return;
  lock.current=true;setBusy(true);setNotice('正在登錄，請勿關閉頁面。');
  try{const r=await getMembershipClient().rpc('admin_membership_import_commit',{p_rows:rows,p_year:year,p_fingerprint:preview.fingerprint,p_batch:batch.current,p_note:note.trim(),p_confirmed:confirmed});if(r.error)throw r.error;const result=r.data as {count:number};setDone(true);setConfirmed(false);setNotice(`已完成 ${result.count} 筆年度名冊登錄。重試同一批不會重複新增。`);}catch(error){setNotice(importError(error));}finally{lock.current=false;setBusy(false);}
 }
 if(access==='loading')return <p role="status">正在確認會員管理權限…</p>;
 if(access==='denied')return <div className="privacyCallout" role="alert">目前無法使用名冊匯入，請確認已登入會員管理帳號。<p><Link href="/admin/members">返回會員管理 →</Link></p></div>;
 return <section className="memberImport"><div className="eyebrow">會員管理 · 年度名冊</div><h1>{year} 年度名冊匯入</h1>
 <p>適用已完成會籍審核、帳號信箱已驗證的有效會員。每批 1～100 筆，先預覽核對，再登錄名冊。</p>
 <p>名冊姓名、會籍、入會日期與介紹來源會依原設定顯示給有效會員；原入會日期也會用於積分效期計算，首次登錄時請核對正式紀錄。</p>
 <div className="membershipForm"><button type="button" disabled={busy} onClick={template}>下載空白 CSV 範本</button><p>依序填入：登入信箱、會員姓名、會籍類型、原入會日期、介紹人登入信箱。會籍填「一般會員」或「永久會員」，日期填 YYYY-MM-DD。介紹人留空會沿用既有介紹來源；本功能只登錄名冊。</p>
 <label className="importFile">選擇 CSV UTF-8 檔案（上限 128 KB）<input ref={fileInput} type="file" accept=".csv,text/csv" disabled={busy} onChange={event=>void readFile(event.target.files?.[0])}/></label>
 <div className="importActions"><button disabled={busy||!rows.length||done} onClick={()=>void check()}>預覽檢查</button><button disabled={busy} onClick={clear}>清除本批資料</button></div></div>
 {notice&&<p className="workflowNotice" role="status" aria-live="polite">{notice}</p>}
 {preview&&<><h2>預覽結果：{preview.ready}／{preview.total} 筆可登錄</h2><div className="importRows">{preview.rows.map(row=><article className="membershipCard" key={row.row}><h3>第 {row.row} 筆 · {row.name||'未填姓名'}</h3><dl><div><dt>登入信箱</dt><dd>{row.email}</dd></div><div><dt>會籍</dt><dd>{row.membership_type==='annual'?'一般會員':row.membership_type==='lifetime'?'永久會員':row.membership_type}</dd></div><div><dt>原入會日期</dt><dd>{row.member_since}</dd></div><div><dt>介紹來源</dt><dd>{row.referrer_email||(row.inherited_source?'沿用既有介紹來源':'未登錄')}</dd></div></dl>{row.errors.length?<ul>{row.errors.map(code=><li key={code}>{IMPORT_ERRORS[code]||'資料需人工核對'}</li>)}</ul>:<p>檢查通過，等待管理員核對確認。</p>}</article>)}</div>
 {!done&&<div className="membershipForm"><label className="importEvidence">核對依據＊<textarea disabled={busy} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)}/></label><label className="membershipCheck"><input type="checkbox" disabled={busy||preview.ready!==preview.total} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已逐筆核對會員授權、有效會籍、原始入會日期及介紹來源，確認列入當年度名冊。</label><button disabled={busy||!confirmed||!note.trim()||preview.ready!==preview.total} onClick={()=>void commit()}>確認登錄年度名冊</button></div>}</>}
 <p><Link href="/membership/directory">查看年度會員名冊 →</Link>　<Link href="/admin/members">返回會員管理 →</Link></p></section>;
}
