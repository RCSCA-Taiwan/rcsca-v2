'use client';

import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import SiteHeader from '../../../SiteHeader';
import {getHistoryClient, historyError} from '../../../../lib/member-history';
import {memberBirthdayCSV, type MemberBirthday} from '../../../../lib/member-birthday-export.mjs';

async function readBirthdays(month: number): Promise<MemberBirthday[]> {
  const {data, error} = await getHistoryClient().rpc('admin_member_birthdays', {p_month: month});
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('invalid_birthday_list');
  return data as unknown as MemberBirthday[];
}

export default function Page() {
  const [month, setMonth] = useState(Number(new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Taipei', month: 'numeric'}).format(new Date())));
  const [rows, setRows] = useState<MemberBirthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const version = useRef(0);
  const exportingNow = useRef(false);

  useEffect(() => {
    const current = ++version.current;
    setRows([]); setLoading(true); setError(''); setNotice('');
    void readBirthdays(month).then(data => {
      if (version.current === current) setRows(data);
    }).catch(e => {
      if (version.current === current) setError(historyError(e));
    }).finally(() => {
      if (version.current === current) setLoading(false);
    });
    return () => { version.current++; };
  }, [month, refresh]);

  async function exportCSV() {
    if (loading || error || !rows.length || exportingNow.current) return;
    const current = version.current;
    exportingNow.current = true; setExporting(true); setNotice('');
    try {
      // Recheck the administrator and current greeting consent before every download.
      const fresh = await readBirthdays(month);
      if (version.current !== current) return;
      setRows(fresh);
      if (!fresh.length) { setNotice('本月已沒有符合條件的會員，未產生匯出檔案。'); return; }
      const url = URL.createObjectURL(new Blob([memberBirthdayCSV(fresh, month)], {type: 'text/csv;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = `member-birthdays-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`已匯出 ${month} 月生日名單，共 ${fresh.length} 筆。`);
    } catch (e) {
      if (version.current === current) { setRows([]); setError(historyError(e)); }
    } finally {
      exportingNow.current = false;
      if (version.current === current) setExporting(false);
    }
  }

  return <main className="adminPage">
    <SiteHeader/>
    <section className="flowHero"><div className="portalWrap">
      <h1>會員生日祝賀名單</h1>
      <p>僅列目前有效、本人已同意生日祝賀的會員。只顯示月日，不顯示出生年份；此頁不會自動寄信。</p>
    </div></section>
    <section className="portalSection"><div className="portalWrap">
      <div className="membershipCardHead">
        <label>月份<select aria-label="月份" disabled={exporting} value={month} onChange={e => {
          version.current++;
          setRows([]); setLoading(true); setError(''); setNotice(''); setMonth(Number(e.target.value));
        }}>{Array.from({length: 12}, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}月</option>)}</select></label>
        <button type="button" disabled={loading || exporting || !!error || !rows.length} onClick={() => void exportCSV()}>
          {exporting ? '正在準備匯出…' : '匯出本月生日名單 CSV'}
        </button>
      </div>
      <p>匯出僅包含姓名、生日月份、生日日期及會籍類型，供協會生日祝賀作業使用，請妥善保存。</p>
      {notice && <p role="status">{notice}</p>}
      {loading ? <p role="status">正在讀取…</p> : error ? <p role="alert">{error}<button onClick={() => setRefresh(x => x + 1)}>重新讀取</button></p> :
        <div className="membershipRoster">{rows.length ? rows.map((b, i) => <article className="membershipCard" key={i}>
          <h2>{b.name}</h2><p>{b.month}月{b.day}日 · {b.membership_type === 'lifetime' ? '永久會員' : '一般會員'}</p>
        </article>) : <p>本月沒有符合條件的會員。</p>}</div>}
      <p><Link href="/admin/members">回會員管理 →</Link></p>
    </div></section>
  </main>;
}
