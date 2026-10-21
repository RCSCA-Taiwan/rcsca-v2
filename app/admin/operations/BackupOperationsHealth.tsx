type WorkflowRun={
  id:number;
  status:'queued'|'in_progress'|'completed'|string;
  conclusion:'success'|'failure'|'cancelled'|'timed_out'|'action_required'|'neutral'|'skipped'|null|string;
  event:string;
  created_at:string;
  updated_at:string;
  run_started_at?:string|null;
  html_url:string;
  head_sha?:string;
};

type RunsResponse={workflow_runs?:WorkflowRun[]};
type JobStep={name:string;status:string;conclusion:string|null};
type Job={name:string;status:string;conclusion:string|null;steps?:JobStep[]};
type JobsResponse={jobs?:Job[]};

const RUNS_URL='https://api.github.com/repos/RCSCA-Taiwan/rcsca-v2/actions/workflows/backup-operations.yml/runs?per_page=5';
const GITHUB_HEADERS={Accept:'application/vnd.github+json','User-Agent':'RCSCA-admin-operations'};

function formatTaipei(value?:string|null){
  if(!value)return '—';
  return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
}

function productionJob(jobs:Job[]){
  return jobs.find(job=>job.name==='production-backup-offsite'&&job.conclusion!=='skipped')??null;
}

function statusCopy(run:WorkflowRun|null,job:Job|null){
  if(!run||!job)return {tone:'notReady',label:'尚未驗證',detail:'尚無可驗證的 Production 備份執行紀錄；synthetic restore drill 不會被當成正式備份成功。'};
  if(job.status!=='completed')return {tone:'running',label:'執行中',detail:'Production 備份工作正在執行，完成前不視為成功。'};
  if(job.conclusion==='success')return {tone:'healthy',label:'成功',detail:'最近一次 Production 備份、異地驗證與隔離還原流程已完整成功。'};
  return {tone:'attention',label:'需要處理',detail:`最近一次 Production 備份結果：${job.conclusion??'unknown'}。請先處理失敗原因，不應視為已備份。`};
}

async function getJobs(runId:number){
  const response=await fetch(`https://api.github.com/repos/RCSCA-Taiwan/rcsca-v2/actions/runs/${runId}/jobs?per_page=100`,{headers:GITHUB_HEADERS,next:{revalidate:300}});
  if(!response.ok)throw new Error(`jobs:${response.status}`);
  const payload=(await response.json()) as JobsResponse;
  return payload.jobs??[];
}

async function getBackupHealth(){
  try{
    const response=await fetch(RUNS_URL,{headers:GITHUB_HEADERS,next:{revalidate:300}});
    if(!response.ok)throw new Error(`runs:${response.status}`);
    const payload=(await response.json()) as RunsResponse;
    const runs=payload.workflow_runs??[];
    for(const run of runs){
      const jobs=await getJobs(run.id);
      const job=productionJob(jobs);
      if(job)return {run,jobs,job,error:null as string|null};
    }
    return {run:null,jobs:[] as Job[],job:null,error:null as string|null};
  }catch(error){
    return {run:null,jobs:[] as Job[],job:null,error:error instanceof Error?error.message:'unknown'};
  }
}

function findStep(jobs:Job[],needle:string){
  const production=jobs.filter(job=>job.name==='production-backup-offsite');
  for(const job of production){
    const step=job.steps?.find(item=>item.name.toLowerCase().includes(needle.toLowerCase()));
    if(step)return step;
  }
  return null;
}

export default async function BackupOperationsHealth(){
  const {run,jobs,job,error}=await getBackupHealth();
  if(error)return <div className="backupHealth backupHealth--attention"><div><span className="backupHealthStatus">無法讀取</span><h3>備份健康狀態暫時無法取得</h3><p>GitHub Actions 狀態讀取失敗（{error}）。這不是備份成功證明；請稍後重新整理。</p></div></div>;
  const copy=statusCopy(run,job);
  const offsite=findStep(jobs,'Re-download offsite')??findStep(jobs,'Upload encrypted bundle');
  const rehearse=findStep(jobs,'Restore Production-origin');
  return <div className={`backupHealth backupHealth--${copy.tone}`}>
    <div className="backupHealthLead"><span className="backupHealthStatus">{copy.label}</span><h3>Production 備份／異地還原健康狀態</h3><p>{copy.detail}</p></div>
    <dl className="backupHealthFacts">
      <div><dt>最後 Production 執行</dt><dd>{formatTaipei(run?.run_started_at??run?.created_at)}</dd></div>
      <div><dt>觸發方式</dt><dd>{run?.event??'—'}</dd></div>
      <div><dt>異地備份</dt><dd>{offsite?.conclusion??offsite?.status??(run?'未取得步驟結果':'尚未執行')}</dd></div>
      <div><dt>真實備份還原演練</dt><dd>{rehearse?.conclusion??rehearse?.status??(run?'未取得步驟結果':'尚未執行')}</dd></div>
    </dl>
    {run?<a className="backupHealthLink" href={run.html_url} target="_blank" rel="noreferrer">查看 GitHub Actions 執行紀錄 →</a>:null}
    <p className="backupHealthNote">判定原則：只追蹤 `production-backup-offsite`；只有正式 Production-origin 備份完成、異地重新下載驗證與隔離還原演練皆成功，才視為 DR 驗證成功。每週 synthetic drill 即使成功，也不會把這裡變成健康。</p>
  </div>;
}
