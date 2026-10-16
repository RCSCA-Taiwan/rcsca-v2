export function membershipTenure(since,today){
 const parse=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;const p=m.slice(1).map(Number),d=new Date(Date.UTC(p[0],p[1]-1,p[2]));return d.toISOString().slice(0,10)===s?d:null;};
 const now=parse(today||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())),start=parse(since);if(!now||!start||start>now)return null;
 const anniversary=(years,months=0)=>{const total=start.getUTCMonth()+months,y=start.getUTCFullYear()+years+Math.floor(total/12),m=total%12,day=Math.min(start.getUTCDate(),new Date(Date.UTC(y,m+1,0)).getUTCDate());return new Date(Date.UTC(y,m,day));};
 let years=now.getUTCFullYear()-start.getUTCFullYear();if(anniversary(years)>now)years--;let months=0;while(months<11&&anniversary(years,months+1)<=now)months++;const days=Math.round((now-anniversary(years,months))/86400000);return {years,months,days,label:years?`${years} 年 ${months} 個月`:months?`${months} 個月 ${days} 天`:`${days} 天`};
}
