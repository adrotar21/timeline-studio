#!/usr/bin/env node
/**
 * Timeline Studio — Comprehensive Dependency Feature Test Suite
 * Covers: scheduling engine, dep types (FS/SS/FF), lag, working days,
 *   holidays, inclusive end dates, violation detection, float, propagation,
 *   durMode (cal/work), transition preview, mode switching, duration labels,
 *   holiday recalc, topo sort, edge cases.
 */

// ─── Utilities ────────────────────────────────────────────────────────────
const U = {
  id(){return 'id_'+Math.random().toString(36).slice(2,8)},
  iso(d){return d.toISOString().slice(0,10)},
  addDays(d,n){const dt=new Date(d+'T12:00:00');dt.setDate(dt.getDate()+n);return dt.toISOString().slice(0,10)},
  days(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000)},
  dow(d){return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00').getDay()]},
  deep(o){return JSON.parse(JSON.stringify(o))},
  esc(s){return s},
  fmt(d){return d}
};

// ─── App Mock (extracted from app.js) ─────────────────────────────────────
const App = {
  proj: null,
  gi(id){return this.proj.items.find(i=>i.id===id)},
  gs(id){return this.proj.swimlanes.find(s=>s.id===id)},
  depId(d){return typeof d==='string'?d:d.id},
  depLag(d){return typeof d==='object'?d.lag||0:0},
  depType(d){return typeof d==='object'?d.type||'FS':'FS'},
  snap(){}, sched(){}, autoSave(){}, toast(){}, closePanel(){},

  topoSort(itemIds){
    const ids=itemIds||this.proj.items.map(i=>i.id);
    const idSet=new Set(ids),adj=new Map(),inDeg=new Map();
    ids.forEach(id=>{adj.set(id,[]);inDeg.set(id,0)});
    this.proj.items.forEach(i=>{
      for(const d of i.deps||[]){
        const pid=this.depId(d);
        if(idSet.has(pid)&&idSet.has(i.id)){
          adj.get(pid).push(i.id);
          inDeg.set(i.id,(inDeg.get(i.id)||0)+1);
        }
      }
    });
    const queue=[];for(const[id,deg]of inDeg)if(deg===0)queue.push(id);
    const order=[];
    while(queue.length){const id=queue.shift();order.push(id);
      for(const n of adj.get(id)||[]){inDeg.set(n,inDeg.get(n)-1);if(inDeg.get(n)===0)queue.push(n)}}
    return order
  },

  _getNonWorkingHolidaySet(){
    if(!this.proj.scheduleAroundNonWorking)return new Set();
    const s=new Set();
    for(const h of this.proj.holidays||[]){if(!h.schedAround)continue;
      let c=new Date(h.start+'T12:00:00');const e=new Date((h.end||h.start)+'T12:00:00');
      while(c<=e){s.add(U.iso(c));c.setDate(c.getDate()+1)}}
    return s
  },

  _skipNonWorking(ds){
    if(!this.proj.scheduleAroundNonWorking||!ds)return ds;
    const h=this._getNonWorkingHolidaySet();let d=new Date(ds+'T12:00:00');
    for(let i=0;i<365;i++){const dow=d.getDay();if(dow!==0&&dow!==6&&!h.has(U.iso(d)))return U.iso(d);d.setDate(d.getDate()+1)}
    return ds
  },

  _addWorkingDays(s,n){
    if(!this.proj.scheduleAroundNonWorking||n<=0)return U.addDays(s,n);
    const h=this._getNonWorkingHolidaySet();let d=new Date(s+'T12:00:00'),c=0;
    while(c<n){const dow=d.getDay();if(dow!==0&&dow!==6&&!h.has(U.iso(d)))c++;if(c<n)d.setDate(d.getDate()+1)}
    return U.iso(d)
  },

  _subtractWorkingDays(fromDate,dur){
    if(!this.proj.scheduleAroundNonWorking||dur<=0)return U.addDays(fromDate,-dur);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(fromDate+'T12:00:00'),count=0;
    while(count<dur){d.setDate(d.getDate()-1);
      const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++}
    return U.iso(d)
  },

  _countWorkingDays(startDate,endDate){
    if(!this.proj.scheduleAroundNonWorking)return U.days(startDate,endDate);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(startDate+'T12:00:00');const end=new Date(endDate+'T12:00:00');
    let count=0;
    while(d<end){const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++;d.setDate(d.getDate()+1)}
    return count
  },

  _depEnd(item){
    if(item.type!=='task')return U.addDays(item.date,1);
    return U.addDays(item.endDate,1)
  },

  _calcEndDate(item){
    const start=item.startDate;const dur=item.duration||0;
    if(this.proj.scheduleAroundNonWorking&&(item.durMode||'cal')!=='cal')return this._addWorkingDays(start,dur);
    return U.addDays(start,Math.max(0,dur-1))
  },

  _addLagWorkingDays(dateStr,lag,durMode){
    if(!this.proj.scheduleAroundNonWorking||lag===0)return U.addDays(dateStr,lag);
    if((durMode||'cal')==='cal')return U.addDays(dateStr,lag);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(dateStr+'T12:00:00');
    if(lag>0){
      for(let i=0;i<365;i++){const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))break;d.setDate(d.getDate()+1)}
      let c=0;while(c<lag){d.setDate(d.getDate()+1);const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))c++}
    }else{
      let c=0;const abs=Math.abs(lag);while(c<abs){d.setDate(d.getDate()-1);const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))c++}
    }
    return U.iso(d)
  },

  _fmtDurLabel(it){
    if(!it.startDate||!it.endDate)return'';
    const isWork=this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    const calDays=U.days(it.startDate,it.endDate)+1;
    const workDays=it.duration||calDays;
    const fmt=it.durationFmt||'days';
    const fv=(d,f)=>{if(f==='weeks')return(d/5).toFixed(1)+'w';if(f==='months')return(d/21.74).toFixed(1)+'mo';return d+'d'};
    if(isWork&&calDays!==workDays){return 'W:'+fv(workDays,fmt)+' C:'+fv(calDays,fmt)}
    return fv(calDays,fmt)
  },

  _recalcNonWorkingDays(){
    for(const it of this.proj.items){
      if(it.type==='task'&&(it.durMode||'cal')!=='cal'&&it.startDate&&it.duration){
        it.endDate=this._calcEndDate(it);
      }
    }
    if(this.proj.schedulingMode==='scheduled')this.runSchedule();
  },

  calcEarlyStart(item){
    let earliest=null;
    const dm=item.type==='task'?(item.durMode||'cal'):'work';
    for(const d of item.deps||[]){
      const pred=this.gi(this.depId(d));if(!pred)continue;
      const type=this.depType(d),lag=this.depLag(d);
      let cand=null;
      if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)cand=this._addLagWorkingDays(pEnd,lag,dm)}
      else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)cand=this._addLagWorkingDays(pStart,lag,dm)}
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd)cand=this._subtractWorkingDays(this._addLagWorkingDays(pEnd,lag,dm),item.duration||0)}
      if(cand&&(!earliest||cand>earliest))earliest=cand}
    return earliest?(dm==='work'?this._skipNonWorking(earliest):earliest):null
  },

  propagateFrom(sourceIds){
    this.snap();
    const visited=new Set(sourceIds),queue=[...sourceIds],downstream=[];
    while(queue.length){const id=queue.shift();
      for(const it of this.proj.items){if(visited.has(it.id))continue;
        for(const d of it.deps||[]){if(this.depId(d)===id){visited.add(it.id);queue.push(it.id);downstream.push(it.id);break}}}}
    if(!downstream.length)return 0;
    const order=this.topoSort([...this.proj.items.map(i=>i.id)]);
    let updated=0;
    for(const id of order){if(!downstream.includes(id))continue;
      const item=this.gi(id);if(!item)continue;
      if(item.pinned)continue;
      const es=this.calcEarlyStart(item);if(!es)continue;
      const curStart=item.type==='task'?item.startDate:item.date;
      if(es===curStart)continue;
      if(item.type==='task'){item.startDate=es;item.endDate=this._calcEndDate(item)}
      else item.date=es;
      updated++}
    return updated
  },

  getViolatedDepIds(){
    const violated=new Set();
    for(const item of this.proj.items){
      if(!item.deps?.length)continue;
      const dm=item.type==='task'?(item.durMode||'cal'):'work';
      for(const d of item.deps){
        const pred=this.gi(this.depId(d));if(!pred)continue;
        const type=this.depType(d),lag=this.depLag(d);
        let required=null;
        if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)required=this._addLagWorkingDays(pEnd,lag,dm)}
        else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)required=this._addLagWorkingDays(pStart,lag,dm)}
        else if(type==='FF'){const pEnd=this._depEnd(pred);const iEnd=this._depEnd(item);if(pEnd&&iEnd&&iEnd<this._addLagWorkingDays(pEnd,lag,dm))violated.add(item.id);continue}
        if(required){const curStart=item.type==='task'?item.startDate:item.date;
          if(curStart&&curStart<required)violated.add(item.id)}
      }
    }
    return violated
  },

  _computeEarliestStart(item){
    let earliest=null;
    const dm=item.type==='task'?(item.durMode||'cal'):'work';
    for(const d of item.deps||[]){
      const pred=this.gi(this.depId(d));if(!pred)continue;
      const type=this.depType(d),lag=this.depLag(d);
      let candidate=null;
      if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)candidate=this._addLagWorkingDays(pEnd,lag,dm)}
      else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)candidate=this._addLagWorkingDays(pStart,lag,dm)}
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd)candidate=this._subtractWorkingDays(this._addLagWorkingDays(pEnd,lag,dm),item.duration||0)}
      if(candidate&&(!earliest||candidate>earliest))earliest=candidate;
    }
    return earliest?(dm==='work'?this._skipNonWorking(earliest):earliest):null
  },

  _runSchedulePass(dryRun){
    const order=this.topoSort(),changes=[];let applied=0;
    for(const id of order){
      const it=this.gi(id);if(!it)continue;
      if(!it.deps?.length)continue;
      if(it.pinned)continue;
      const earliest=this._computeEarliestStart(it);
      if(!earliest)continue;
      const curStart=it.type==='task'?it.startDate:it.date;
      if(curStart===earliest)continue;
      if(dryRun){
        const newEnd=it.type==='task'?this._calcEndDate({startDate:earliest,duration:it.duration||0,durMode:it.durMode}):earliest;
        changes.push({id,name:it.name,type:it.type,oldStart:curStart,newStart:earliest,oldEnd:it.type==='task'?it.endDate:curStart,newEnd,shift:earliest>curStart?U.days(curStart,earliest):-U.days(earliest,curStart),duration:it.duration||0,durMode:it.durMode||'cal'})
      }else{
        if(it.type==='task'){it.startDate=earliest;it.endDate=this._calcEndDate(it)}
        else it.date=earliest;
        applied++;
      }
    }
    return dryRun?changes:applied
  },

  runSchedule(){
    if(this.proj.schedulingMode!=='scheduled')return;
    for(let pass=0;pass<5;pass++){
      const n=this._runSchedulePass(false);
      if(n===0)break;
    }
  },

  calculateFloat(){
    const items=this.proj.items;
    const es=new Map(),ef=new Map(),ls=new Map(),lf=new Map();
    const order=this.topoSort();
    for(const id of order){const it=this.gi(id);if(!it)continue;
      const early=this.calcEarlyStart(it);
      const start=early||(it.type==='task'?it.startDate:it.date);
      if(!start){es.set(id,null);ef.set(id,null);continue}
      es.set(id,start);
      const dur=it.type==='task'?Math.max(0,it.duration||U.days(it.startDate,it.endDate)||0):0;
      if(it.type==='task'&&dur>0){
        const endIncl=this._calcEndDate({startDate:start,duration:dur,durMode:it.durMode});
        ef.set(id,this._depEnd({type:'task',endDate:endIncl,durMode:it.durMode}));
      }else{ef.set(id,it.type==='milestone'?U.addDays(start,1):U.addDays(start,dur))}}
    let projEnd=null;
    for(const[,v]of ef)if(v&&(!projEnd||v>projEnd))projEnd=v;
    if(!projEnd)return;
    const rev=[...order].reverse();
    for(const id of rev){const it=this.gi(id);if(!it||!ef.get(id))continue;
      const succs=items.filter(s=>s.deps?.some(d=>this.depId(d)===id));
      if(!succs.length){lf.set(id,projEnd)}
      else{let minLS=null;
        for(const s of succs){const sls=ls.get(s.id);if(!sls)continue;
          const link=s.deps.find(d=>this.depId(d)===id);if(!link)continue;
          const type=this.depType(link),lag=this.depLag(link);
          let cand=null;
          const sdm=s.type==='task'?(s.durMode||'cal'):'work';
          if(type==='FS')cand=this._addLagWorkingDays(sls,-lag,sdm);
          else if(type==='SS')cand=this._addLagWorkingDays(sls,-lag,sdm);
          else if(type==='FF'){
            const sDur=s.type==='task'?Math.max(0,s.duration||0):0;
            let sLF;
            if(s.type==='task'&&this.proj.scheduleAroundNonWorking&&(s.durMode||'cal')!=='cal'){
              const sEndIncl=this._addWorkingDays(sls,sDur);
              sLF=U.addDays(sEndIncl,1);
            }else{sLF=U.addDays(sls,sDur)}
            cand=this._addLagWorkingDays(sLF,-lag,sdm)}
          if(cand&&(!minLS||cand<minLS))minLS=cand}
        lf.set(id,minLS||projEnd)}
      const dur=it.type==='task'?Math.max(0,it.duration||0):0;
      const lfVal=lf.get(id);
      if(it.type==='task'&&this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')!=='cal'){
        ls.set(id,this._subtractWorkingDays(lfVal,dur));
      }else{ls.set(id,U.addDays(lfVal,-dur))}}
    for(const it of items){
      const e=es.get(it.id),l=ls.get(it.id);
      if(e&&l)it._float=U.days(e,l);
      else it._float=null}
  }
};

// ─── Test Harness ─────────────────────────────────────────────────────────
let total=0,passed=0,failed=0,errors=[];
const RESET='\x1b[0m',GREEN='\x1b[32m',RED='\x1b[31m',CYAN='\x1b[36m',DIM='\x1b[2m';

function section(name){console.log(`\n${CYAN}━━━ ${name} ━━━${RESET}`)}

function assert(label,actual,expected){
  total++;
  if(actual===expected){passed++;console.log(`  ${GREEN}✅${RESET} ${label}${DIM} → ${actual}${RESET}`)}
  else{failed++;const msg=`${label}: got "${actual}", expected "${expected}"`;errors.push(msg);console.log(`  ${RED}❌${RESET} ${msg}`)}
}
function assertT(label,cond){assert(label,!!cond,true)}

// ─── Helper to build test projects ───────────────────────────────────────
function mkTask(id,name,start,dur,opts={}){
  const durMode=opts.durMode||'work';
  const endDate=App._calcEndDate({startDate:start,duration:dur,durMode});
  return {id,name,type:'task',startDate:start,endDate,duration:dur,durMode,
    deps:opts.deps||[],pinned:opts.pinned||false,hidden:false,swimlaneId:'sw1',
    subSwimId:'',subRow:0,color:'#4a9eda',showDate:true,showDuration:true,
    showOwner:false,durationFmt:opts.durationFmt||'days',owner:'',notes:'',
    progress:0,...(opts.extra||{})}
}
function mkMilestone(id,name,date,opts={}){
  return {id,name,type:'milestone',date,deps:opts.deps||[],pinned:opts.pinned||false,
    hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',
    showDate:true,showDuration:false,showOwner:false,owner:'',notes:'',progress:0}
}
function initProj(items,opts={}){
  App.proj={
    name:'Test',schedulingMode:opts.mode||'manual',
    scheduleAroundNonWorking:opts.schedAround!==false,
    holidays:opts.holidays||[
      {name:'MLK',start:'2026-01-19',end:'2026-01-19',schedAround:true},
      {name:'Good Friday',start:'2026-04-03',end:'2026-04-03',schedAround:true}
    ],
    swimlanes:[{id:'sw1',name:'Test Lane',color:'#4a9eda'}],
    items
  };
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 1: Core Working Day Primitives
// ══════════════════════════════════════════════════════════════════════════
section('1. Working Day Primitives');

initProj([]);

// _skipNonWorking
assert('skipNW: Mon→Mon', App._skipNonWorking('2026-01-12'), '2026-01-12');
assert('skipNW: Sat(MLK wknd)→Tue', App._skipNonWorking('2026-01-17'), '2026-01-20');
assert('skipNW: Sun(MLK wknd)→Tue', App._skipNonWorking('2026-01-18'), '2026-01-20');
assert('skipNW: MLK Mon→Tue', App._skipNonWorking('2026-01-19'), '2026-01-20');
assert('skipNW: clean Sat→Mon', App._skipNonWorking('2026-01-24'), '2026-01-26');
// Wait — Sat before MLK should skip Sat,Sun → Mon, Mon is MLK → Tue
// Actually _skipNonWorking('2026-01-17') → Sat→Sun→Mon(MLK)→Tue


// _addWorkingDays
assert('addWD: Mon+1→Mon', App._addWorkingDays('2026-01-12',1), '2026-01-12');
assert('addWD: Mon+5→Fri', App._addWorkingDays('2026-01-12',5), '2026-01-16');
assert('addWD: Mon+6→Tue(MLK skip)', App._addWorkingDays('2026-01-12',6), '2026-01-20');
assert('addWD: Mon+10→Mon26', App._addWorkingDays('2026-01-12',10), '2026-01-26');
assert('addWD: Fri+1→Fri', App._addWorkingDays('2026-01-16',1), '2026-01-16');
assert('addWD: Fri+2→Tue(MLK skip)', App._addWorkingDays('2026-01-16',2), '2026-01-20');

// _subtractWorkingDays
assert('subWD: Tue-1→Fri(skip MLK,wknd)', App._subtractWorkingDays('2026-01-20',1), '2026-01-16');
assert('subWD: Mon26-5→Fri16(skip MLK)', App._subtractWorkingDays('2026-01-26',5), '2026-01-16');

// _countWorkingDays
assert('countWD: Mon→Sat(exclusive)=5', App._countWorkingDays('2026-01-12','2026-01-17'), 5);
assert('countWD: Mon→Mon(MLK week)=4', App._countWorkingDays('2026-01-19','2026-01-24'), 4);

// _addLagWorkingDays (work mode — skips weekends/holidays)
assert('lag+0 from Sat=Sat(unchanged)', App._addLagWorkingDays('2026-01-17',0,'work'), '2026-01-17');
assert('lag+1 from Sat=Tue(norm→Mon MLK→Tue)', App._addLagWorkingDays('2026-01-17',1,'work'), '2026-01-21');
assert('lag+2 from Sat=Wed', App._addLagWorkingDays('2026-01-17',2,'work'), '2026-01-22');
assert('lag-1 from Sat=Fri', App._addLagWorkingDays('2026-01-17',-1,'work'), '2026-01-16');
assert('lag-2 from Sat=Thu', App._addLagWorkingDays('2026-01-17',-2,'work'), '2026-01-15');
// From working day
assert('lag+1 from Mon=Tue', App._addLagWorkingDays('2026-01-12',1,'work'), '2026-01-13');
assert('lag+1 from Fri=Tue(MLK skip)', App._addLagWorkingDays('2026-01-16',1,'work'), '2026-01-20');

// End dates never on weekends
let wkndFail=false;
for(let d=1;d<=60;d++){
  const e=App._addWorkingDays('2026-01-05',d);
  const dow=new Date(e+'T12:00:00').getDay();
  if(dow===0||dow===6){wkndFail=true;console.log(`  ❌ dur=${d}: ${e} is ${U.dow(e)}`)}
}
assertT('addWD: 60 durations never produce weekend end dates',!wkndFail);

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 2: _calcEndDate and _depEnd
// ══════════════════════════════════════════════════════════════════════════
section('2. _calcEndDate + _depEnd');

initProj([]);

// Work mode
const wEnd=App._calcEndDate({startDate:'2026-01-12',duration:5,durMode:'work'});
assert('calcEnd work 5d=Fri', wEnd, '2026-01-16');
assert('depEnd work Fri→Sat', App._depEnd({type:'task',endDate:'2026-01-16',durMode:'work'}), '2026-01-17');

// Cal mode — endDate is now inclusive (last day of task)
const cEnd=App._calcEndDate({startDate:'2026-01-12',duration:5,durMode:'cal'});
assert('calcEnd cal 5d=Fri(inclusive)', cEnd, '2026-01-16');
assert('depEnd cal Fri→Sat', App._depEnd({type:'task',endDate:cEnd,durMode:'cal'}), '2026-01-17');

// Both depEnds produce same value for same logical 5-day task → FS consistency
assert('depEnd work==depEnd cal for same task', 
  App._depEnd({type:'task',endDate:'2026-01-16',durMode:'work'}),
  App._depEnd({type:'task',endDate:cEnd,durMode:'cal'}));

// Milestone
assert('depEnd milestone', App._depEnd({type:'milestone',date:'2026-01-15'}), '2026-01-16');

// Feature disabled → cal mode fallback (inclusive end)
App.proj.scheduleAroundNonWorking=false;
const dEnd=App._calcEndDate({startDate:'2026-01-12',duration:5,durMode:'work'});
assert('calcEnd work(disabled)=cal', dEnd, '2026-01-16');
assert('depEnd work(disabled)=+1', App._depEnd({type:'task',endDate:dEnd,durMode:'work'}), '2026-01-17');
App.proj.scheduleAroundNonWorking=true;

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 3: FS Dependencies (the most common type)
// ══════════════════════════════════════════════════════════════════════════
section('3. FS Dependencies');

// A(5wd) → B(3wd), both work mode
// A: Mon Jan 12 → Fri Jan 16. depEnd=Sat. B start = skipNW(Sat)=Tue(MLK) 
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const es=App.calcEarlyStart(B);
  assert('FS+0: B early start=Tue(skip MLK)', es, '2026-01-20');
}

// FS +1
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:1}]});
  initProj([A,B]);
  assert('FS+1: B start=Wed', App.calcEarlyStart(B), '2026-01-21');
}

// FS +2
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B]);
  assert('FS+2: B start=Thu', App.calcEarlyStart(B), '2026-01-22');
}

// FS -1 (overlap)
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-15',3,{deps:[{id:'a',type:'FS',lag:-1}]});
  initProj([A,B]);
  assert('FS-1: B start=Fri(overlap)', App.calcEarlyStart(B), '2026-01-16');
}

// FS no holidays (clean week): A ends Fri Jan 23
{
  const A=mkTask('a','A','2026-01-20',4); // Tue-Fri (skip MLK start)
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  assert('FS+0 clean: B start=Mon', App.calcEarlyStart(B), '2026-01-26');
}

// FS +1 clean
{
  const A=mkTask('a','A','2026-01-26',5); // Mon-Fri
  const B=mkTask('b','B','2026-02-03',3,{deps:[{id:'a',type:'FS',lag:1}]});
  initProj([A,B]);
  assert('FS+1 clean: Mon+1=Tue', App.calcEarlyStart(B), '2026-02-03');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 4: SS and FF Dependencies
// ══════════════════════════════════════════════════════════════════════════
section('4. SS + FF Dependencies');

// SS +0: B starts same as A
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B]);
  assert('SS+0: B start=Mon', App.calcEarlyStart(B), '2026-01-12');
}

// SS +2: B starts 2 working days after A starts
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-14',3,{deps:[{id:'a',type:'SS',lag:2}]});
  initProj([A,B]);
  assert('SS+2: B start=Wed', App.calcEarlyStart(B), '2026-01-14');
}

// SS from Fri + 1 (spans weekend + MLK)
{
  const A=mkTask('a','A','2026-01-16',5); // starts Fri
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'SS',lag:1}]});
  initProj([A,B]);
  assert('SS+1 from Fri: skip wknd+MLK=Tue', App.calcEarlyStart(B), '2026-01-20');
}

// FF +0: B ends same as A → B start = A.depEnd - B.dur working days back
{
  const A=mkTask('a','A','2026-01-12',5); // ends Fri. depEnd=Sat
  const B=mkTask('b','B','2026-01-14',3,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B]);
  const es=App.calcEarlyStart(B);
  // B needs to end at depEnd(A)=Sat → subtract 3 working days from Sat → Wed Jan 14
  assert('FF+0: B start=Wed', es, '2026-01-14');
}

// FF +1: B ends 1 working day after A ends
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-15',3,{deps:[{id:'a',type:'FF',lag:1}]});
  initProj([A,B]);
  assert('FF+1: B start', App.calcEarlyStart(B), '2026-01-15');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 5: Violation Detection
// ══════════════════════════════════════════════════════════════════════════
section('5. Violation Detection');

// FS violated: B starts before required
{
  const A=mkTask('a','A','2026-01-26',5); // ends Fri Jan 30
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('FS violated: B starts during A', v.has('b'));
}

// FS satisfied: B starts after A ends
{
  const A=mkTask('a','A','2026-01-26',5); // ends Fri Jan 30. depEnd=Sat
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('FS satisfied: B starts Mon after A ends Fri', !v.has('b'));
}

// FS +1: B on Mon → required Tue → VIOLATED
{
  const A=mkTask('a','A','2026-01-26',5); // ends Fri Jan 30
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:1}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('FS+1: Mon start violated (needs Tue)', v.has('b'));
}

// FS +1: B on Tue → satisfied
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-02-03',3,{deps:[{id:'a',type:'FS',lag:1}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('FS+1: Tue start satisfied', !v.has('b'));
}

// SS violated
{
  const A=mkTask('a','A','2026-01-14',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B]);
  assertT('SS violated: B before A', App.getViolatedDepIds().has('b'));
}

// FF violated
{
  const A=mkTask('a','A','2026-01-26',5); // ends Fri 30. depEnd=Sat31
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FF',lag:0}]});
  // B ends Wed 28. depEnd(B)=Thu29. Required: depEnd >= addLag(depEnd(A),0) = Sat31. Thu < Sat → violated
  initProj([A,B]);
  assertT('FF violated: B ends before A', App.getViolatedDepIds().has('b'));
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 6: Propagation
// ══════════════════════════════════════════════════════════════════════════
section('6. Propagation');

// Simple chain: A→B→C
{
  const A=mkTask('a','A','2026-01-26',5); // Mon→Fri Jan 30
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  App.propagateFrom(['a']);
  assert('Prop: B start=Mon Feb 2', B.startDate, '2026-02-02');
  assert('Prop: B dur stays 3', B.duration, 3);
  assert('Prop: C start after B', C.startDate > B.endDate || C.startDate === U.addDays(B.endDate,1) ? 'ok' : 'bad', 'ok');
}

// Propagate with pinned item
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}],pinned:true});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  App.propagateFrom(['a']);
  assert('Prop pinned: B unmoved', B.startDate, '2026-01-26');
  // C should propagate from B's current position (not moved)
}

// Duration stability across propagation
{
  const A=mkTask('a','A','2026-01-12',5); // Mon→Fri
  const B=mkTask('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  App.propagateFrom(['a']);
  assert('Duration stable A', A.duration, 5);
  assert('Duration stable B', B.duration, 7);
  assert('Duration stable C', C.duration, 3);
  // Run again — should be no-op
  const n=App.propagateFrom(['a']);
  assert('Re-propagate is stable (0 updated)', n, 0);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 7: Auto-Scheduled Mode
// ══════════════════════════════════════════════════════════════════════════
section('7. Auto-Scheduled Mode (runSchedule)');

// Basic auto-schedule
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});
  App.runSchedule();
  assert('Auto: A unmoved (root)', A.startDate, '2026-01-26');
  assert('Auto: B start=Mon Feb 2', B.startDate, '2026-02-02');
  const cExpect=App._skipNonWorking(U.addDays(App._depEnd(B),0));
  assert('Auto: C after B', C.startDate, cExpect);
  assert('Auto: durations stable', `${A.duration},${B.duration},${C.duration}`, '5,3,2');
}

// Auto-schedule respects pins
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}],pinned:true});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  assert('Auto pinned: B unmoved', B.startDate, '2026-01-12');
}

// Auto-schedule with FS +2 lag
{
  const A=mkTask('a','A','2026-01-26',5); // ends Fri Jan 30
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  // depEnd=Sat → norm=Mon → +2wd = Wed Feb 4
  assert('Auto FS+2: B start=Wed', B.startDate, '2026-02-04');
}

// Convergence: multiple passes stabilize
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',4,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',2,{deps:[{id:'b',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});
  App.runSchedule();
  const snap1=U.deep(App.proj.items);
  App.runSchedule(); // run again
  const snap2=U.deep(App.proj.items);
  let stable=true;
  for(let i=0;i<snap1.length;i++){
    if(snap1[i].startDate!==snap2[i].startDate||snap1[i].endDate!==snap2[i].endDate){stable=false;break}
  }
  assertT('Auto converges: 2nd run stable', stable);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 8: Mixed Cal/Work Mode
// ══════════════════════════════════════════════════════════════════════════
section('8. Mixed Cal/Work durMode');

// Cal-mode task in FS chain
{
  const A=mkTask('a','A','2026-01-12',7,{durMode:'cal'}); // cal: Mon+7=Mon Jan 19
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  // depEnd(A cal)=Jan 19 (exclusive already). skipNW(Jan19 MLK)=Jan 20
  assert('Mixed: cal A depEnd', App._depEnd(A), '2026-01-19');
  assert('Mixed: B early start=Tue', App.calcEarlyStart(B), '2026-01-20');
}

// Work→Cal chain
{
  const A=mkTask('a','A','2026-01-12',5); // work: Mon→Fri Jan 16
  const B=mkTask('b','B','2026-01-20',7,{durMode:'cal',deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  assert('Work→Cal: A end=Fri', A.endDate, '2026-01-16');
  assert('Work→Cal: B early=Sat(cal allows wknd)', App.calcEarlyStart(B), '2026-01-17');
}

// Cal→Work chain  
{
  const A=mkTask('a','A','2026-01-12',7,{durMode:'cal'}); // ends Mon Jan 19 (exclusive)
  const B=mkTask('b','B','2026-01-20',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  assert('Cal→Work auto: B start=Tue(MLK skip)', B.startDate, '2026-01-20');
  assert('Cal→Work auto: B end=Mon26(5wd from Tue)', B.endDate, '2026-01-26');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 9: Holiday Toggle Recalculation
// ══════════════════════════════════════════════════════════════════════════
section('9. Holiday Toggle Recalculation');

{
  const A=mkTask('a','A','2026-01-12',10);
  initProj([A]);
  const origEnd=A.endDate;

  // Remove MLK
  App.proj.holidays[0].schedAround=false;
  App._recalcNonWorkingDays();
  assertT('Holiday off: end moved earlier', A.endDate < origEnd);
  const noMLK=A.endDate;

  // Add MLK back
  App.proj.holidays[0].schedAround=true;
  App._recalcNonWorkingDays();
  assert('Holiday on: end restored', A.endDate, origEnd);

  // Master toggle off
  App.proj.scheduleAroundNonWorking=false;
  App._recalcNonWorkingDays();
  assert('Master off: pure calendar', A.endDate, U.addDays('2026-01-12',9));

  // Master on
  App.proj.scheduleAroundNonWorking=true;
  App._recalcNonWorkingDays();
  assert('Master on: restored', A.endDate, origEnd);
}

// Holiday toggle in auto mode triggers runSchedule
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  const bStart1=B.startDate;

  App.proj.holidays[0].schedAround=false;
  App._recalcNonWorkingDays();
  // A's end should shift → B should also shift
  assertT('Holiday toggle in auto: B moved', B.startDate !== bStart1 || A.endDate !== '2026-01-16');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 10: Duration Labels
// ══════════════════════════════════════════════════════════════════════════
section('10. Duration Labels');

initProj([]);
App.proj.scheduleAroundNonWorking=true;

// W≠C → show both
{
  const t=mkTask('x','X','2026-01-12',10);
  assert('10wd label', App._fmtDurLabel(t), 'W:10d C:15d');
}

// W=C → show single
{
  const t=mkTask('x','X','2026-01-12',5);
  assert('5wd(1wk) label=5d', App._fmtDurLabel(t), '5d');
}

{
  const t=mkTask('x','X','2026-01-12',3);
  assert('3wd(mid-week) label=3d', App._fmtDurLabel(t), '3d');
}

// Cal mode → just calendar
{
  const t=mkTask('x','X','2026-01-12',14,{durMode:'cal'});
  assert('cal mode label=14d', App._fmtDurLabel(t), '14d');
}

// Weeks format
{
  const t=mkTask('x','X','2026-01-12',10,{durationFmt:'weeks'});
  assert('weeks format', App._fmtDurLabel(t), 'W:2.0w C:3.0w');
}

// Feature disabled → plain calendar
{
  App.proj.scheduleAroundNonWorking=false;
  const t=mkTask('x','X','2026-01-12',10,{durMode:'work'});
  // When disabled, _calcEndDate returns calendar → but _fmtDurLabel checks isWork which is false
  assert('disabled: plain label', App._fmtDurLabel(t), `${U.days(t.startDate,t.endDate)+1}d`);
  App.proj.scheduleAroundNonWorking=true;
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 11: Topo Sort
// ══════════════════════════════════════════════════════════════════════════
section('11. Topo Sort');

{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  const order=App.topoSort();
  assert('Topo: A before B', order.indexOf('a') < order.indexOf('b'), true);
  assert('Topo: B before C', order.indexOf('b') < order.indexOf('c'), true);
}

// Diamond: A→B, A→C, B→D, C→D
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-20',4,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-02-02',2,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D]);
  const order=App.topoSort();
  assertT('Diamond: A first', order.indexOf('a') < order.indexOf('b') && order.indexOf('a') < order.indexOf('c'));
  assertT('Diamond: D last', order.indexOf('d') > order.indexOf('b') && order.indexOf('d') > order.indexOf('c'));
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 12: Float Calculation
// ══════════════════════════════════════════════════════════════════════════
section('12. Float Calculation');

// Critical path: A→B→C, no slack
{
  const A=mkTask('a','A','2026-02-02',5);
  const B=mkTask('b','B','2026-02-09',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-02-12',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{holidays:[]});
  App.calculateFloat();
  assert('Float A (critical)=0', A._float, 0);
  assert('Float B (critical)=0', B._float, 0);
  assert('Float C (critical)=0', C._float, 0);
}

// Parallel path with slack: A→B→D, A→C→D where C is shorter
// Use schedAround:false so weekend skipping doesn't interfere with pure float math
{
  const A=mkTask('a','A','2026-02-02',5,{durMode:'cal'});
  const B=mkTask('b','B','2026-02-07',5,{durMode:'cal',deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-02-07',2,{durMode:'cal',deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-02-12',3,{durMode:'cal',deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{holidays:[],schedAround:false});
  App.calculateFloat();
  assert('Float A=0', A._float, 0);
  assert('Float B=0 (critical)', B._float, 0);
  assertT('Float C>0 (has slack)', C._float > 0);
  assert('Float D=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 13: Edge Cases
// ══════════════════════════════════════════════════════════════════════════
section('13. Edge Cases');

// Milestone as predecessor
{
  const M=mkMilestone('m','Milestone','2026-01-16');
  const B=mkTask('b','B','2026-01-20',5,{deps:[{id:'m',type:'FS',lag:0}]});
  initProj([M,B]);
  assert('Milestone→Task FS: start=Tue(skip wknd+MLK)', App.calcEarlyStart(B), '2026-01-20');
}

// Milestone as successor
{
  const A=mkTask('a','A','2026-01-12',5); // ends Fri
  const M=mkMilestone('m','MS','2026-01-20',{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,M]);
  assert('Task→Milestone FS', App.calcEarlyStart(M), '2026-01-20');
}

// 1-day task
{
  const A=mkTask('a','A','2026-01-12',1);
  assert('1wd task end=Mon', A.endDate, '2026-01-12');
  assert('1wd depEnd=Tue', App._depEnd(A), '2026-01-13');
}

// 0-day task (edge)
{
  const A=mkTask('a','A','2026-01-12',0);
  // _addWorkingDays(start, 0) → addDays(start,0) → same day
  assert('0wd task end=start', A.endDate, '2026-01-12');
}

// Multi-day holiday
{
  initProj([],{holidays:[{name:'Xmas',start:'2025-12-25',end:'2025-12-26',schedAround:true}]});
  const e=App._addWorkingDays('2025-12-22',5); // Mon Dec 22: Mon,Tue,Wed(skip25,26),Fri(skip27?no 27 is Sat→skip)
  // Dec 22(Mon),23(Tue),24(Wed),25(Thu-hol),26(Fri-hol),27(Sat),28(Sun),29(Mon)
  // Working: 22,23,24,29,30 = 5 → end Dec 30
  assert('Multi-day holiday: 5wd', e, '2025-12-30');
}

// Long chain stability (10 items)
{
  const items=[];
  for(let i=0;i<10;i++){
    const deps=i>0?[{id:'t'+(i-1),type:'FS',lag:0}]:[];
    items.push(mkTask('t'+i,'Task'+i,'2026-01-12',3,{deps}));
  }
  initProj(items,{mode:'scheduled',holidays:[]});
  App.runSchedule();
  // Check durations didn't inflate
  let durOk=true;
  for(const it of items){if(it.duration!==3){durOk=false;break}}
  assertT('10-item chain: all durations=3', durOk);
  // Check each starts after prev ends
  let seqOk=true;
  for(let i=1;i<10;i++){
    if(items[i].startDate <= items[i-1].endDate){seqOk=false;break}
  }
  assertT('10-item chain: sequential ordering', seqOk);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 14: Mode Switching (Manual ↔ Auto)
// ══════════════════════════════════════════════════════════════════════════
section('14. Mode Switching');

// Manual → Scheduled: items with deps should move
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual'});
  // Simulate switching
  App.proj.schedulingMode='scheduled';
  App.runSchedule();
  assertT('Manual→Auto: B moved forward', B.startDate > '2026-01-26');
  assert('Manual→Auto: A unchanged', A.startDate, '2026-01-26');

  // Scheduled → Manual: dates preserved
  const bStart=B.startDate;
  App.proj.schedulingMode='manual';
  assert('Auto→Manual: B preserved', B.startDate, bStart);
}

// Multiple switches don't corrupt
{
  const A=mkTask('a','A','2026-02-02',5);
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',holidays:[]});
  for(let i=0;i<5;i++){
    App.proj.schedulingMode='scheduled';
    App.runSchedule();
    App.proj.schedulingMode='manual';
  }
  assert('5x switch: A dur stable', A.duration, 5);
  assert('5x switch: B dur stable', B.duration, 3);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 15: Transition Preview (dry-run)
// ══════════════════════════════════════════════════════════════════════════
section('15. Transition Preview (dry-run)');

{
  const A=mkTask('a','A','2026-02-02',5);
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',holidays:[]});
  
  // Dry run should not modify items
  const origBStart=B.startDate;
  const changes=App._runSchedulePass(true);
  assert('Dry run: B unmoved', B.startDate, origBStart);
  assertT('Dry run: found changes', changes.length > 0);
  assert('Dry run: change has correct new start', changes[0].newStart, '2026-02-09');
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 16: Good Friday Holiday (from user's project)
// ══════════════════════════════════════════════════════════════════════════
section('16. Good Friday (Apr 3) Scenarios');

{
  // Init project with Good Friday holiday FIRST, then create task
  initProj([]);
  const A=mkTask('a','A','2026-03-30',5); // Mon Mar 30: Mon,Tue,Wed,Thu,GF skip,Mon Apr 6
  App.proj.items=[A];
  const endDow=U.dow(A.endDate);
  assertT('Good Friday skip: end not on Fri Apr 3', A.endDate !== '2026-04-03');
  assert('Good Friday skip: end on Mon', endDow, 'Mon');
  
  // Chain across Good Friday
  const B=mkTask('b','B','2026-04-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  App.proj.items=[A,B];
  App.proj.schedulingMode='scheduled';
  App.runSchedule();
  assertT('GF chain: B starts after A', B.startDate > A.endDate);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 17: Stress — Large Lag Values
// ══════════════════════════════════════════════════════════════════════════
section('17. Large Lag Values');

{
  initProj([]);
  // +20 working days from Saturday
  const r20=App._addLagWorkingDays('2026-01-17',20,'work');
  assertT('+20wd from Sat is weekday', [1,2,3,4,5].includes(new Date(r20+'T12:00:00').getDay()));
  
  // -10 working days from Monday
  const rn10=App._addLagWorkingDays('2026-01-26',-10,'work');
  assertT('-10wd from Mon is weekday', [1,2,3,4,5].includes(new Date(rn10+'T12:00:00').getDay()));
  
  // Each +N produces unique result (no collisions for 0-20)
  const results=new Set();
  let unique=true;
  for(let i=0;i<=20;i++){
    const r=App._skipNonWorking(App._addLagWorkingDays('2026-01-24',i,'work'));
    if(results.has(r)){unique=false;console.log(`  ❌ Collision at +${i}: ${r}`)}
    results.add(r);
  }
  assertT('0-20 lag all produce unique dates', unique);
}

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 18: Feature Disabled — All Calendar Days
// ══════════════════════════════════════════════════════════════════════════
section('18. Feature Disabled Fallback');

{
  // Init project with feature DISABLED first, then create tasks
  initProj([],{mode:'scheduled',schedAround:false,holidays:[]});
  const A=mkTask('a','A','2026-01-12',5,{durMode:'work'});
  const B=mkTask('b','B','2026-01-12',3,{durMode:'work',deps:[{id:'a',type:'FS',lag:2}]});
  App.proj.items=[A,B];
  App.runSchedule();
  // With feature off, everything is calendar days
  assert('Disabled: A end=Fri', A.endDate, '2026-01-16');
  assert('Disabled: B start=Jan 17+2cal=Jan 19', B.startDate, '2026-01-19');
}

// ══════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${CYAN}══════════════════════════════════════════${RESET}`);
console.log(`  TOTAL: ${total}   ${GREEN}PASSED: ${passed}${RESET}   ${failed?RED:GREEN}FAILED: ${failed}${RESET}`);
console.log(`${CYAN}══════════════════════════════════════════${RESET}`);
if(errors.length){
  console.log(`\n${RED}FAILURES:${RESET}`);
  errors.forEach((e,i)=>console.log(`  ${i+1}. ${e}`));
}
process.exit(failed?1:0);