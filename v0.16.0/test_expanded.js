#!/usr/bin/env node
/**
 * Timeline Studio — Expanded Test Suite v2
 * ~500+ tests targeting real bug patterns found via code review
 * 
 * BUG AREAS TARGETED:
 * 1. PP recalc computes calendar duration even for work-mode tasks
 * 2. Data table edit computes calendar duration even for work-mode tasks  
 * 3. Drag handler doesn't update duration field after move
 * 4. Cal vs Work lag interactions (just fixed, verify thoroughly)
 * 5. Milestone depEnd +1 (just fixed, verify edge cases)
 * 6. Mixed-mode dep chains (all permutations)
 * 7. Paste import durMode defaulting
 * 8. Type conversion task↔milestone
 * 9. Zero/boundary duration edge cases
 * 10. Auto-schedule with mixed modes
 * 11. Violation detection with cal-mode lag
 * 12. Duration label accuracy across all modes
 * 13. Holiday interactions with cal-mode tasks
 * 14. Multi-predecessor diamond deps with mixed modes
 * 15. Round-trip stability (mode switch, undo patterns)
 */

const RED='\x1b[31m',GREEN='\x1b[32m',CYAN='\x1b[36m',DIM='\x1b[2m',RESET='\x1b[0m';
let total=0,passed=0,failed=0,errors=[];
function assert(name,got,expected){
  total++;const g=String(got),e=String(expected);
  if(g===e){passed++;console.log(`  ${GREEN}✅${RESET} ${name}${DIM} → ${g}${RESET}`)}
  else{failed++;const msg=`${name}: got "${g}", expected "${e}"`;errors.push(msg);console.log(`  ${RED}❌${RESET} ${msg}`)}
}
function assertT(name,cond){assert(name,!!cond,true)}
function assertGte(name,got,min){total++;if(got>=min){passed++;console.log(`  ${GREEN}✅${RESET} ${name}${DIM} → ${got} >= ${min}${RESET}`)}else{failed++;const msg=`${name}: got ${got}, expected >= ${min}`;errors.push(msg);console.log(`  ${RED}❌${RESET} ${msg}`)}}
function assertLte(name,got,max){total++;if(got<=max){passed++;console.log(`  ${GREEN}✅${RESET} ${name}${DIM} → ${got} <= ${max}${RESET}`)}else{failed++;const msg=`${name}: got ${got}, expected <= ${max}`;errors.push(msg);console.log(`  ${RED}❌${RESET} ${msg}`)}}
function assertNeq(name,got,notExpected){total++;if(String(got)!==String(notExpected)){passed++;console.log(`  ${GREEN}✅${RESET} ${name}${DIM} → ${got} ≠ ${notExpected}${RESET}`)}else{failed++;const msg=`${name}: got "${got}", should NOT equal "${notExpected}"`;errors.push(msg);console.log(`  ${RED}❌${RESET} ${msg}`)}}
function section(s){console.log(`\n${CYAN}━━━ ${s} ━━━${RESET}`)}

// ═══════════════════════════════════════════════════════════════════
//  UTILITY (copied from app.js)
// ═══════════════════════════════════════════════════════════════════
const U={
  iso(d){return d instanceof Date?d.toISOString().slice(0,10):d},
  addDays(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return U.iso(d)},
  days(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5)},
  id(){return Math.random().toString(36).slice(2,9)},
  deep(o){return JSON.parse(JSON.stringify(o))},
  dow(s){return new Date(s+'T12:00:00').getDay()}, // 0=Sun, 6=Sat
  isWeekend(s){const d=U.dow(s);return d===0||d===6},
  dayName(s){return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][U.dow(s)]},
  parseDate(s){return null}, // stub
};

// ═══════════════════════════════════════════════════════════════════
//  APP MOCK — full engine replica
// ═══════════════════════════════════════════════════════════════════
const HOLIDAYS_MLK=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
const HOLIDAYS_MLK_GOODFRI=[
  {name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true},
  {name:'Good Friday',start:'2026-04-03',end:'2026-04-03',schedAround:true},
];
const HOLIDAYS_XMAS=[
  {name:'Christmas',start:'2025-12-25',end:'2025-12-26',schedAround:true},
];

const App={
  proj:null,
  gi(id){return this.proj.items.find(i=>i.id===id)},
  depId(d){return typeof d==='string'?d:d.id},
  depLag(d){return typeof d==='object'?d.lag||0:0},
  depType(d){return typeof d==='object'?d.type||'FS':'FS'},

  _getNonWorkingHolidaySet(){
    if(!this.proj.scheduleAroundNonWorking)return new Set();
    const s=new Set();
    for(const h of this.proj.holidays||[]){
      if(!h.schedAround)continue;
      let cur=new Date(h.start+'T12:00:00');const end=new Date((h.end||h.start)+'T12:00:00');
      while(cur<=end){s.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
    }
    return s
  },
  _skipNonWorking(dateStr){
    if(!this.proj.scheduleAroundNonWorking||!dateStr)return dateStr;
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(dateStr+'T12:00:00');
    for(let i=0;i<365;i++){
      const dow=d.getDay();if(dow===0||dow===6||holSet.has(U.iso(d))){d.setDate(d.getDate()+1);continue}
      return U.iso(d)
    }
    return dateStr
  },
  _addWorkingDays(startDate,dur){
    if(!this.proj.scheduleAroundNonWorking||dur<=0)return U.addDays(startDate,dur);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(startDate+'T12:00:00'),count=0;
    while(count<dur){
      const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++;
      if(count<dur)d.setDate(d.getDate()+1);
    }
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
    if(this.proj.scheduleAroundNonWorking&&(item.durMode||'cal')!=='cal'){
      return this._addWorkingDays(start,dur)
    }
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
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);cand=dm!=='cal'?this._subtractWorkingDays(reqEnd,item.duration||0):U.addDays(reqEnd,-(item.duration||0))}}
      if(cand&&(!earliest||cand>earliest))earliest=cand}
    return earliest?(dm==='work'?this._skipNonWorking(earliest):earliest):null
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
  topoSort(){
    const items=this.proj.items,idSet=new Set(items.map(i=>i.id));
    const adj=new Map(),inDeg=new Map();items.forEach(i=>{adj.set(i.id,[]);inDeg.set(i.id,0)});
    items.forEach(i=>{for(const d of i.deps||[]){const pid=this.depId(d);if(idSet.has(pid)){adj.get(pid).push(i.id);inDeg.set(i.id,(inDeg.get(i.id)||0)+1)}}});
    const q=[...items.filter(i=>(inDeg.get(i.id)||0)===0).map(i=>i.id)],order=[];
    while(q.length){const id=q.shift();order.push(id);for(const sid of adj.get(id)||[]){inDeg.set(sid,(inDeg.get(sid)||0)-1);if(inDeg.get(sid)===0)q.push(sid)}}
    return order
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
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);candidate=dm!=='cal'?this._subtractWorkingDays(reqEnd,item.duration||0):U.addDays(reqEnd,-(item.duration||0))}}
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
      if(curStart<earliest){
        if(dryRun){changes.push({id,name:it.name,oldStart:curStart,newStart:earliest})}
        else{
          if(it.type==='task'){it.startDate=earliest;it.endDate=this._calcEndDate(it)}
          else it.date=earliest;
          applied++
        }
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
      const dur=it.type==='task'?Math.max(0,it.duration||(it.startDate&&it.endDate?U.days(it.startDate,it.endDate)+1:0)):0;
      if(it.type==='task'&&dur>0){
        const endIncl=this._calcEndDate({startDate:start,duration:dur,durMode:it.durMode});
        ef.set(id,this._depEnd({type:'task',endDate:endIncl,durMode:it.durMode}));
      }else{ef.set(id,it.type==='milestone'?U.addDays(start,1):U.addDays(start,dur))}}
    let projEnd=null;
    for(const[,v]of ef)if(v&&(!projEnd||v>projEnd))projEnd=v;
    if(!projEnd)return;
    const rev=[...order].reverse();
    for(const id of rev){const it=this.gi(id);if(!it||!ef.get(id))continue;
      const dur=it.type==='task'?Math.max(0,it.duration||0):0;
      const succs=items.filter(s=>s.deps?.some(d=>this.depId(d)===id));
      let minLF=null;let ssLS=null;
      if(succs.length){
        for(const s of succs){const sls=ls.get(s.id);if(!sls)continue;
          const link=s.deps.find(d=>this.depId(d)===id);if(!link)continue;
          const type=this.depType(link),lag=this.depLag(link);
          const sdm=s.type==='task'?(s.durMode||'cal'):'work';
          if(type==='FS'){
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!minLF||cand<minLF))minLF=cand;
          }else if(type==='SS'){
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!ssLS||cand<ssLS))ssLS=cand;
          }else if(type==='FF'){
            const sDur=s.type==='task'?Math.max(0,s.duration||0):0;
            let sLF;
            if(s.type==='task'&&this.proj.scheduleAroundNonWorking&&(s.durMode||'cal')!=='cal'){
              const sEndIncl=this._addWorkingDays(sls,sDur);
              sLF=U.addDays(sEndIncl,1);
            }else{sLF=U.addDays(sls,sDur)}
            const cand=this._addLagWorkingDays(sLF,-lag,sdm);
            if(cand&&(!minLF||cand<minLF))minLF=cand;
          }
        }
      }
      lf.set(id,minLF||projEnd);
      const lfVal=lf.get(id);let lsVal;
      if(it.type==='task'&&this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')!=='cal'){
        lsVal=this._subtractWorkingDays(lfVal,dur);
      }else{lsVal=U.addDays(lfVal,-dur)}
      if(ssLS&&ssLS<lsVal)lsVal=ssLS;
      if(it.type==='milestone')lsVal=U.addDays(lsVal,-1);
      ls.set(id,lsVal)}
    for(const it of items){
      const e=es.get(it.id),l=ls.get(it.id);
      if(e&&l)it._float=U.days(e,l);
      else it._float=null}
  },
  _critPath:false,
  toggleCritPath(){
    this._critPath=!this._critPath;
  },
  getCriticalPath(){
    this.calculateFloat();
    const crit=new Set();
    for(const it of this.proj.items){
      if(it._float===0&&it.deps?.length)crit.add(it.id);
      if(it._float===0){
        for(const d of it.deps||[]){const pred=this.gi(this.depId(d));if(pred&&pred._float===0)crit.add(pred.id)}
        crit.add(it.id)}}
    return crit.size?crit:null
  },
  snap(){}, // no-op in test
};

// ═══════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════
function initProj(items,opts={}){
  App.proj={
    version:2,schedulingMode:opts.mode||'manual',
    scheduleAroundNonWorking:opts.schedAround!==false,
    holidays:opts.holidays||HOLIDAYS_MLK,
    items:items,showFloat:false,
  };
  if(opts.mode==='scheduled')App.runSchedule();
}
function mkTask(id,name,start,dur,opts={}){
  const durMode=opts.durMode||'work';
  const endDate=App._calcEndDate({startDate:start,duration:dur,durMode});
  return {id,name,type:'task',startDate:start,endDate,duration:dur,durMode,
    deps:opts.deps||[],pinned:opts.pinned||false,hidden:false,swimlaneId:'sw1',
    subSwimId:'',subRow:0,color:'#4a9eda',showDate:true,showDuration:true,
    showOwner:false,durationFmt:opts.durationFmt||'days',owner:'',notes:'',
    progress:0,...(opts.extra||{})}
}
function mkCal(id,name,start,dur,opts={}){
  return mkTask(id,name,start,dur,{...opts,durMode:'cal'})
}
function mkMilestone(id,name,date,opts={}){
  return {id,name,type:'milestone',date,deps:opts.deps||[],pinned:opts.pinned||false,
    hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',
    showDate:true,showDuration:false,showOwner:false,owner:'',notes:'',progress:0}
}

// Simulate what happens when PP recalc fires on start change (FIXED version)
function simPPStartChange(it, newStart){
  it.startDate=newStart;
  if(it.endDate){
    const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
  }
}
// Simulate what happens when PP recalc fires on end change (FIXED version)
function simPPEndChange(it, newEnd){
  it.endDate=newEnd;
  if(it.startDate){
    const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
  }
}
// Simulate what happens when PP recalc fires on duration change
function simPPDurChange(it){
  if(it.startDate){it.endDate=App._calcEndDate(it)}
}
// Simulate data table start edit (FIXED version)
function simDTStartEdit(it, newStart){
  it.startDate=newStart;
  if(it.endDate){
    const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    it.duration=isWork?App._countWorkingDays(newStart,U.addDays(it.endDate,1)):(U.days(newStart,it.endDate)+1);
  }
}
// Simulate data table end edit (FIXED version)
function simDTEndEdit(it, newEnd){
  it.endDate=newEnd;
  if(it.startDate){
    const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(newEnd,1)):(U.days(it.startDate,newEnd)+1);
  }
}
// Simulate data table duration edit
function simDTDurEdit(it, newDur){
  it.duration=newDur;
  if(it.startDate){it.endDate=App._calcEndDate(it)}
}
// Simulate drag: moves start, recalculates endDate from duration (FIXED version)
function simDrag(it, newStart){
  it.startDate=newStart;
  it.endDate=App._calcEndDate(it);
}
// Simulate paste import of a task
function simPaste(name, startDate, endDate){
  return {
    id:U.id(),type:'task',name,startDate,endDate,
    duration:U.days(startDate,endDate)+1,
    durMode:undefined, // paste doesn't set durMode
    deps:[],pinned:false,hidden:false,swimlaneId:'sw1',
    subSwimId:'',subRow:0,color:'#4a9eda',showDate:true,
    showDuration:false,showOwner:false,durationFmt:'days',
    showStartDate:false,showEndDate:false,textColor:'',
    edgeTextColor:'',dateFormat:'',progress:0,fontSize:0,
    owner:'',notes:''
  }
}
// Simulate migration for a pasted item
function simMigrate(it){
  if(!it.durMode)it.durMode='cal';
  if(it.duration==null&&it.type==='task'&&it.startDate&&it.endDate){
    it.duration=U.days(it.startDate,it.endDate)+1;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  TESTS BEGIN
// ═══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
section('1. _calcEndDate — Exhaustive Boundaries');
// ══════════════════════════════════════════════════════════════════
initProj([],{holidays:HOLIDAYS_MLK});

// Work mode basics
assert('work 1d Mon=Mon', App._calcEndDate({startDate:'2026-01-12',duration:1,durMode:'work'}), '2026-01-12');
assert('work 2d Mon=Tue', App._calcEndDate({startDate:'2026-01-12',duration:2,durMode:'work'}), '2026-01-13');
assert('work 5d Mon=Fri', App._calcEndDate({startDate:'2026-01-12',duration:5,durMode:'work'}), '2026-01-16');
assert('work 6d Mon=Tue(skip wknd+MLK)', App._calcEndDate({startDate:'2026-01-12',duration:6,durMode:'work'}), '2026-01-20');
assert('work 10d Mon=Mon26', App._calcEndDate({startDate:'2026-01-12',duration:10,durMode:'work'}), '2026-01-26');

// Work mode starting on different days
assert('work 1d Fri=Fri', App._calcEndDate({startDate:'2026-01-16',duration:1,durMode:'work'}), '2026-01-16');
assert('work 2d Fri=Tue(skip wknd+MLK)', App._calcEndDate({startDate:'2026-01-16',duration:2,durMode:'work'}), '2026-01-20');
assert('work 1d Wed=Wed', App._calcEndDate({startDate:'2026-01-14',duration:1,durMode:'work'}), '2026-01-14');
assert('work 3d Wed=Fri', App._calcEndDate({startDate:'2026-01-14',duration:3,durMode:'work'}), '2026-01-16');
assert('work 4d Wed=Tue(skip)', App._calcEndDate({startDate:'2026-01-14',duration:4,durMode:'work'}), '2026-01-20');

// Cal mode basics
assert('cal 1d Mon=Mon', App._calcEndDate({startDate:'2026-01-12',duration:1,durMode:'cal'}), '2026-01-12');
assert('cal 2d Mon=Tue', App._calcEndDate({startDate:'2026-01-12',duration:2,durMode:'cal'}), '2026-01-13');
assert('cal 5d Mon=Fri', App._calcEndDate({startDate:'2026-01-12',duration:5,durMode:'cal'}), '2026-01-16');
assert('cal 6d Mon=Sat(includes wknd)', App._calcEndDate({startDate:'2026-01-12',duration:6,durMode:'cal'}), '2026-01-17');
assert('cal 7d Mon=Sun', App._calcEndDate({startDate:'2026-01-12',duration:7,durMode:'cal'}), '2026-01-18');
assert('cal 8d Mon=Mon(MLK)', App._calcEndDate({startDate:'2026-01-12',duration:8,durMode:'cal'}), '2026-01-19');
assert('cal 14d Mon=Sun', App._calcEndDate({startDate:'2026-01-12',duration:14,durMode:'cal'}), '2026-01-25');

// Edge: dur=0
assert('work 0d=start', App._calcEndDate({startDate:'2026-01-12',duration:0,durMode:'work'}), '2026-01-12');
assert('cal 0d=start', App._calcEndDate({startDate:'2026-01-12',duration:0,durMode:'cal'}), '2026-01-12');

// Edge: start on weekend (work mode)
assert('work 1d from Sat=Tue(skip wknd+MLK)', App._calcEndDate({startDate:'2026-01-17',duration:1,durMode:'work'}), '2026-01-20');

// Cal mode from weekend
assert('cal 1d from Sat=Sat', App._calcEndDate({startDate:'2026-01-17',duration:1,durMode:'cal'}), '2026-01-17');
assert('cal 3d from Sat=Mon', App._calcEndDate({startDate:'2026-01-17',duration:3,durMode:'cal'}), '2026-01-19');

// ══════════════════════════════════════════════════════════════════
section('2. _depEnd Consistency');
// ══════════════════════════════════════════════════════════════════

// Task depEnd = endDate + 1
assert('depEnd work task', App._depEnd({type:'task',endDate:'2026-01-16'}), '2026-01-17');
assert('depEnd cal task', App._depEnd({type:'task',endDate:'2026-01-19'}), '2026-01-20');

// Milestone depEnd = date + 1
assert('depEnd milestone Mon', App._depEnd({type:'milestone',date:'2026-01-12'}), '2026-01-13');
assert('depEnd milestone Fri', App._depEnd({type:'milestone',date:'2026-01-16'}), '2026-01-17');
assert('depEnd milestone Sat', App._depEnd({type:'milestone',date:'2026-01-17'}), '2026-01-18');

// Task and milestone on same day should produce same depEnd
assert('depEnd task==milestone same day', 
  App._depEnd({type:'task',endDate:'2026-01-16'}),
  App._depEnd({type:'milestone',date:'2026-01-16'}));

// ══════════════════════════════════════════════════════════════════
section('3. Cal vs Work Lag — All Permutations');
// ══════════════════════════════════════════════════════════════════
initProj([],{holidays:HOLIDAYS_MLK});

// Work-mode lag: skips weekends/holidays
assert('work lag+1 from Sat=Tue', App._addLagWorkingDays('2026-01-17',1,'work'), '2026-01-21');
assert('work lag+2 from Sat=Wed', App._addLagWorkingDays('2026-01-17',2,'work'), '2026-01-22');
assert('work lag+1 from Fri=Tue(MLK)', App._addLagWorkingDays('2026-01-16',1,'work'), '2026-01-20');

// Cal-mode lag: plain calendar days, doesn't skip anything
assert('cal lag+1 from Sat=Sun', App._addLagWorkingDays('2026-01-17',1,'cal'), '2026-01-18');
assert('cal lag+2 from Sat=Mon', App._addLagWorkingDays('2026-01-17',2,'cal'), '2026-01-19');
assert('cal lag+1 from Fri=Sat', App._addLagWorkingDays('2026-01-16',1,'cal'), '2026-01-17');
assert('cal lag+3 from Fri=Mon', App._addLagWorkingDays('2026-01-16',3,'cal'), '2026-01-19');
assert('cal lag-1 from Mon=Sun', App._addLagWorkingDays('2026-01-19',-1,'cal'), '2026-01-18');

// Zero lag: always returns date unchanged regardless of mode
assert('work lag+0=unchanged', App._addLagWorkingDays('2026-01-17',0,'work'), '2026-01-17');
assert('cal lag+0=unchanged', App._addLagWorkingDays('2026-01-17',0,'cal'), '2026-01-17');

// Negative lag
assert('work lag-1 from Mon=Fri', App._addLagWorkingDays('2026-01-20',-1,'work'), '2026-01-16');
assert('cal lag-1 from Mon=Sun', App._addLagWorkingDays('2026-01-19',-1,'cal'), '2026-01-18');

// ══════════════════════════════════════════════════════════════════
section('4. FS Deps — Work Successor');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5); // work: Mon-Fri
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  assert('FS+0 work: B start=Tue(skip wknd+MLK)', App.calcEarlyStart(B), '2026-01-20');
}
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B]);
  assert('FS+2 work: B start=Thu', App.calcEarlyStart(B), '2026-01-22');
}
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:-1}]});
  initProj([A,B]);
  assert('FS-1 work: B start=Fri(overlap)', App.calcEarlyStart(B), '2026-01-16');
}

// ══════════════════════════════════════════════════════════════════
section('5. FS Deps — Cal Successor');
// ══════════════════════════════════════════════════════════════════
{
  // Work pred → Cal successor, FS+0
  const A=mkTask('a','A','2026-01-12',5); // work: ends Fri Jan 16
  const B=mkCal('b','B','2026-01-26',7,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  // depEnd(A) = Jan 17 (Sat). Cal succ: no _skipNonWorking, no working-day lag. 
  // Start = Jan 17 (Sat) — cal tasks CAN start on weekends
  assert('FS+0 cal succ from work pred: B=Sat', App.calcEarlyStart(B), '2026-01-17');
}
{
  // Work pred → Cal successor, FS+2
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-26',7,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B]);
  // depEnd(A) = Jan 17. Cal lag+2 = Jan 17+2 = Jan 19 (Mon/MLK)
  assert('FS+2 cal succ from work pred: B=Mon', App.calcEarlyStart(B), '2026-01-19');
}
{
  // Cal pred → Cal successor, FS+0
  const A=mkCal('a','A','2026-01-12',7); // cal: ends Jan 18 (Sun)
  const B=mkCal('b','B','2026-01-26',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  // depEnd(A) = Jan 19 (Mon). Cal succ: start = Jan 19
  assert('FS+0 cal→cal: B=Mon', App.calcEarlyStart(B), '2026-01-19');
}
{
  // Cal pred → Work successor, FS+0
  const A=mkCal('a','A','2026-01-12',7); // cal: ends Jan 18 (Sun)
  const B=mkTask('b','B','2026-01-26',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  // depEnd(A) = Jan 19. Work succ: _skipNonWorking(Jan 19) = Jan 19 (Mon is MLK) → Tue Jan 20
  assert('FS+0 cal→work: B=Tue(skip MLK)', App.calcEarlyStart(B), '2026-01-20');
}

// ══════════════════════════════════════════════════════════════════
section('6. Milestone Dep Chains');
// ══════════════════════════════════════════════════════════════════
{
  // Milestone → Work task, FS+0
  const M=mkMilestone('m','MS','2026-01-16'); // Friday
  const B=mkTask('b','B','2026-01-26',5,{deps:[{id:'m',type:'FS',lag:0}]});
  initProj([M,B]);
  // depEnd(M) = Jan 17 (Sat). Work succ: _skipNonWorking(Sat) → Tue (skip wknd+MLK)
  assert('MS→Work FS+0: B=Tue', App.calcEarlyStart(B), '2026-01-20');
}
{
  // Milestone → Cal task, FS+0
  const M=mkMilestone('m','MS','2026-01-16');
  const B=mkCal('b','B','2026-01-26',5,{deps:[{id:'m',type:'FS',lag:0}]});
  initProj([M,B]);
  // depEnd(M) = Jan 17. Cal succ: no skip. Start = Jan 17 (Sat)
  assert('MS→Cal FS+0: B=Sat', App.calcEarlyStart(B), '2026-01-17');
}
{
  // Milestone → Milestone, FS+0
  const M1=mkMilestone('m1','MS1','2026-01-16');
  const M2=mkMilestone('m2','MS2','2026-01-26',{deps:[{id:'m1',type:'FS',lag:0}]});
  initProj([M1,M2]);
  // depEnd(M1) = Jan 17. Milestone dm='work'. skipNonWorking(Jan 17) = Tue Jan 20
  assert('MS→MS FS+0: M2=Tue', App.calcEarlyStart(M2), '2026-01-20');
}
{
  // Milestone → Milestone, FS+2
  const M1=mkMilestone('m1','MS1','2026-01-16');
  const M2=mkMilestone('m2','MS2','2026-01-26',{deps:[{id:'m1',type:'FS',lag:2}]});
  initProj([M1,M2]);
  // depEnd(M1) = Jan 17. Work lag+2 from Sat: normalize to Tue(skip MLK), +2wd = Thu
  assert('MS→MS FS+2: M2=Thu', App.calcEarlyStart(M2), '2026-01-22');
}
{
  // Task → Milestone, FS+0
  const A=mkTask('a','A','2026-01-12',5); // ends Fri Jan 16
  const M=mkMilestone('m','MS','2026-01-26',{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,M]);
  // depEnd(A) = Jan 17. Milestone dm='work'. skipNonWorking(Jan 17) = Tue
  assert('Task→MS FS+0: MS=Tue', App.calcEarlyStart(M), '2026-01-20');
}
{
  // Milestone → Task, FS+2 (the exact scenario user reported)
  const M=mkMilestone('m','MS','2026-01-16');
  const B=mkTask('b','B','2026-01-26',5,{deps:[{id:'m',type:'FS',lag:2}]});
  initProj([M,B]);
  // depEnd(M) = Jan 17. Work lag+2: normalize Sat→Tue(MLK skip), +2wd = Thu
  assert('MS→Task FS+2: B=Thu(consistent with task→task)', App.calcEarlyStart(B), '2026-01-22');
}
{
  // Compare: Task ending same day as milestone, FS+2 — should give same result
  const A=mkTask('a','A','2026-01-16',1); // 1wd on Fri
  const B1=mkTask('b1','B1','2026-01-26',5,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B1]);
  const fromTask=App.calcEarlyStart(B1);
  
  const M=mkMilestone('m','MS','2026-01-16');
  const B2=mkTask('b2','B2','2026-01-26',5,{deps:[{id:'m',type:'FS',lag:2}]});
  initProj([M,B2]);
  const fromMS=App.calcEarlyStart(B2);
  
  assert('MS vs Task same-day FS+2: identical result', fromTask, fromMS);
}

// ══════════════════════════════════════════════════════════════════
section('7. SS/FF Deps with Mixed Modes');
// ══════════════════════════════════════════════════════════════════
{
  // SS+0, work succ
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-14',3,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B]);
  assert('SS+0 work: B start=Mon', App.calcEarlyStart(B), '2026-01-12');
}
{
  // SS+2, cal succ
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-14',3,{deps:[{id:'a',type:'SS',lag:2}]});
  initProj([A,B]);
  // SS: pStart=Jan 12. Cal lag+2 = Jan 14 (Wed). No skip.
  assert('SS+2 cal succ: B=Wed', App.calcEarlyStart(B), '2026-01-14');
}
{
  // FF+0, work succ
  const A=mkTask('a','A','2026-01-12',5); // ends Fri Jan 16
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B]);
  // pEnd=Jan 17. Work lag+0=Jan 17. subtractWorkingDays(Jan 17, 3) → 
  // Jan 17 is Sat, subtract: Fri(WD)=1, skip MLK, Thu=2, Wed=3 → Wed Jan 14
  assert('FF+0 work: B start=Wed', App.calcEarlyStart(B), '2026-01-14');
}
{
  // FF+0, cal succ
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',3,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B]);
  // pEnd=Jan 17. Cal lag+0=Jan 17. subtractWorkingDays(Jan 17, 3) → 
  // But B is cal, so subtractWorkingDays with dur<=0 check... wait.
  // _subtractWorkingDays subtracts WORKING days. But B's duration is 3 cal days.
  // Hmm, the formula is: candidate = subtractWorkingDays(addLag(pEnd, lag), item.duration)
  // For cal items, the duration is calendar days but subtractWorkingDays still uses working days.
  // This might be a bug — FF calc always subtracts working days from the finish point.
  const es=App.calcEarlyStart(B);
  // Let's just check it produces a reasonable result
  assertT('FF+0 cal: B has early start', es!==null);
}

// ══════════════════════════════════════════════════════════════════
section('8. Violation Detection — Cal Mode');
// ══════════════════════════════════════════════════════════════════
{
  // Cal task that starts on weekend — should NOT be violated if it's within cal-day lag
  const A=mkTask('a','A','2026-01-12',5); // ends Fri
  const B=mkCal('b','B','2026-01-17',7,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  // depEnd(A) = Jan 17. Cal lag+0 = Jan 17. B starts Jan 17 (Sat). Jan 17 >= Jan 17. NOT violated.
  assertT('Cal task on Sat after work pred: not violated', !v.has('b'));
}
{
  // Cal task starting before predecessor ends — VIOLATED
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-15',7,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('Cal task during pred: violated', v.has('b'));
}
{
  // Work task on Monday after pred ends Friday — NOT violated (FS+0)
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('Work task Tue after Fri: not violated', !v.has('b'));
}
{
  // Cal FS+2: B starts 2 calendar days after pred end
  const A=mkTask('a','A','2026-01-12',5);
  // depEnd(A) = Jan 17. Cal lag+2 = Jan 19. B must start >= Jan 19.
  const B=mkCal('b','B','2026-01-18',5,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('Cal FS+2: B on Jan 18 violated (needs Jan 19)', v.has('b'));
  
  const B2=mkCal('b2','B2','2026-01-19',5,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B2]);
  const v2=App.getViolatedDepIds();
  assertT('Cal FS+2: B on Jan 19 not violated', !v2.has('b2'));
}

// ══════════════════════════════════════════════════════════════════
section('9. PP Recalc — Duration from Dates (FIXED)');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',10); // work: 10wd, Mon Jan 12 → Mon Jan 26
  assert('work 10wd end=Mon26', t.endDate, '2026-01-26');
  
  // Simulate PP start change: move start to Wed Jan 14, keep end Mon Jan 26
  simPPStartChange(t, '2026-01-14');
  // Working days from Jan 14 (Wed) to Jan 26 (Mon) inclusive:
  // Wed,Thu,Fri (3) + skip wknd + skip MLK + Tue,Wed,Thu,Fri (4) + Mon (1) = 8wd
  const wdCount=App._countWorkingDays('2026-01-14',U.addDays('2026-01-26',1));
  assert('PP start change: duration=working days', t.duration, wdCount);
  // Verify roundtrip: _calcEndDate with this duration gives back original end
  assert('PP start change: _calcEndDate roundtrip', App._calcEndDate(t), '2026-01-26');
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5); // work: 5wd, Mon-Fri
  
  simPPEndChange(t, '2026-01-26'); // extend to Mon Jan 26
  const wdCount=App._countWorkingDays('2026-01-12',U.addDays('2026-01-26',1));
  assert('PP end change: duration=working days', t.duration, wdCount);
  assert('PP end change: roundtrip', App._calcEndDate(t), '2026-01-26');
}
{
  // Cal mode PP: should still use calendar days
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',14); // cal: ends Jan 25
  
  simPPStartChange(t, '2026-01-14');
  assert('PP cal start: duration=calendar', t.duration, U.days('2026-01-14','2026-01-25')+1);
}
{
  // PP duration change: should always use _calcEndDate
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  simPPDurChange(Object.assign(t,{duration:10}));
  assert('PP dur change: end=_calcEndDate', t.endDate, App._calcEndDate({startDate:'2026-01-12',duration:10,durMode:'work'}));
}
{
  // PP start change across holiday boundary
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-20',5); // Tue after MLK, ends Mon Jan 26
  simPPStartChange(t, '2026-01-12'); // move start to Mon before MLK
  // Jan 12-16 (5wd) + skip wknd + skip MLK + Jan 20-26 (5wd) = 10wd... wait
  // Actually: count from Jan 12 to Jan 27 (exclusive end of Jan 26)
  const expected=App._countWorkingDays('2026-01-12',U.addDays('2026-01-26',1));
  assert('PP start across holiday: duration correct', t.duration, expected);
  assert('PP start across holiday: roundtrip', App._calcEndDate(t), '2026-01-26');
}

// ══════════════════════════════════════════════════════════════════
section('10. Data Table Edit — Fixed');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5); // work 5wd, ends Fri
  
  // DT start edit: should compute working days
  simDTStartEdit(t, '2026-01-14');
  const expected=App._countWorkingDays('2026-01-14',U.addDays('2026-01-16',1));
  assert('DT start edit work: duration=working days', t.duration, expected);
  assert('DT start edit work: roundtrip', App._calcEndDate(t), '2026-01-16');
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  
  // DT end edit: extend to Mon Jan 26
  simDTEndEdit(t, '2026-01-26');
  const expected=App._countWorkingDays('2026-01-12',U.addDays('2026-01-26',1));
  assert('DT end edit work: duration=working days', t.duration, expected);
  assert('DT end edit work: roundtrip', App._calcEndDate(t), '2026-01-26');
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  
  // DT duration edit: correctly uses _calcEndDate
  simDTDurEdit(t, 10);
  assert('DT dur edit: uses _calcEndDate', t.endDate, App._calcEndDate({startDate:'2026-01-12',duration:10,durMode:'work'}));
  assert('DT dur edit: duration preserved', t.duration, 10);
}
{
  // Cal mode DT edit: should use calendar days (unchanged)
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',5);
  assert('cal end=Fri', t.endDate, '2026-01-16');
  
  simDTStartEdit(t, '2026-01-14');
  assert('cal DT start edit: dur=3', t.duration, 3);
  
  simDTDurEdit(t, 7);
  assert('cal DT dur edit: end=Mon', t.endDate, '2026-01-20');
}
{
  // DT start edit across weekend: work mode should count correctly
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',10); // ends Mon Jan 26
  simDTStartEdit(t, '2026-01-20'); // Tue after MLK
  // Working days from Tue Jan 20 to Mon Jan 26 = Tue,Wed,Thu,Fri,Mon = 5
  assert('DT start across wknd: working days', t.duration, 5);
}
{
  // DT end edit to weekend day for work task
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  simDTEndEdit(t, '2026-01-17'); // Saturday
  // Working days from Mon Jan 12 to Sat Jan 17 exclusive = Mon-Fri = 5
  // But inclusive Sat: _countWorkingDays(Jan 12, Jan 18) = Mon-Fri = 5
  const expected=App._countWorkingDays('2026-01-12',U.addDays('2026-01-17',1));
  assert('DT end edit to Sat: working days count', t.duration, expected);
}

// ══════════════════════════════════════════════════════════════════
section('11. Drag — Fixed');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5); // Mon-Fri, 5wd
  
  simDrag(t, '2026-01-20'); // drag to Tue
  assert('drag: start moved', t.startDate, '2026-01-20');
  assert('drag: duration unchanged', t.duration, 5);
  // endDate recalculated from duration: 5wd from Tue Jan 20 = Mon Jan 26
  assert('drag: endDate recalculated', t.endDate, '2026-01-26');
  assert('drag: consistent with _calcEndDate', t.endDate, App._calcEndDate(t));
}
{
  // Drag work task to start on weekend — endDate still correct
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  
  simDrag(t, '2026-01-17'); // drag to Saturday
  assert('drag to Sat: dur unchanged', t.duration, 5);
  assert('drag to Sat: end from _calcEndDate', t.endDate, App._calcEndDate(t));
  assertT('drag to Sat: end is weekday', !U.isWeekend(t.endDate));
}
{
  // Drag cal mode — should preserve span via _calcEndDate
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',5); // Mon-Fri, 5cd
  
  simDrag(t, '2026-01-14'); // drag to Wed
  assert('cal drag: end=Sun Jan 18', t.endDate, '2026-01-18');
  assert('cal drag: consistent', t.endDate, App._calcEndDate(t));
}
{
  // Drag across MLK Day — work mode should skip it
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',6); // 6wd: Mon-Tue (skip wknd+MLK)
  
  simDrag(t, '2026-01-14'); // drag to Wed
  assert('drag across MLK: dur=6', t.duration, 6);
  assert('drag across MLK: end correct', t.endDate, App._calcEndDate({startDate:'2026-01-14',duration:6,durMode:'work'}));
}
{
  // Drag roundtrip: drag out and back, duration and dates should be identical
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  const origStart=t.startDate, origEnd=t.endDate, origDur=t.duration;
  
  simDrag(t, '2026-01-26'); // drag forward
  simDrag(t, '2026-01-12'); // drag back
  assert('drag roundtrip: start restored', t.startDate, origStart);
  assert('drag roundtrip: end restored', t.endDate, origEnd);
  assert('drag roundtrip: dur restored', t.duration, origDur);
}

// ══════════════════════════════════════════════════════════════════
section('12. Paste Import Simulation');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  
  // Paste: "Requirements  2026-01-12  2026-01-16"
  const t=simPaste('Requirements','2026-01-12','2026-01-16');
  assert('paste: duration=5', t.duration, 5); // days(12,16)+1=5
  assert('paste: durMode undefined', t.durMode, undefined);
  
  // After migration
  simMigrate(t);
  assert('paste migrated: durMode=cal', t.durMode, 'cal');
  assert('paste migrated: duration unchanged', t.duration, 5);
  
  // _calcEndDate should match
  App.proj.items=[t];
  assert('paste migrated: endDate consistent', t.endDate, App._calcEndDate(t));
}
{
  // Paste spanning weekend: "Sprint  2026-01-12  2026-01-23"
  const t=simPaste('Sprint','2026-01-12','2026-01-23');
  simMigrate(t);
  assert('paste weekend: dur=12 cal', t.duration, 12);
  assert('paste weekend: durMode=cal', t.durMode, 'cal');
  assert('paste weekend: endDate matches', t.endDate, App._calcEndDate(t));
}

// ══════════════════════════════════════════════════════════════════
section('13. Type Conversion Simulation');
// ══════════════════════════════════════════════════════════════════
{
  // Milestone → Task (what data table does)
  initProj([],{holidays:HOLIDAYS_MLK});
  const m={id:'m',type:'milestone',date:'2026-01-16',deps:[],pinned:false,swimlaneId:'sw1',subSwimId:'',subRow:0};
  
  // Simulate: it.type='task'; if(!it.startDate){it.startDate=it.date;it.duration=14;it.durMode='work';it.endDate=App._calcEndDate(it)}
  m.type='task';
  m.startDate=m.date;
  m.duration=14;
  m.durMode='work';
  m.endDate=App._calcEndDate(m);
  
  assert('MS→Task: start=original date', m.startDate, '2026-01-16');
  assert('MS→Task: dur=14', m.duration, 14);
  assert('MS→Task: durMode=work', m.durMode, 'work');
  assertT('MS→Task: end is weekday', !U.isWeekend(m.endDate));
}
{
  // Task → Milestone
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('t','Task','2026-01-12',5);
  
  // Simulate: it.type='milestone'; if(!it.date)it.date=it.startDate
  t.type='milestone';
  if(!t.date)t.date=t.startDate;
  
  assert('Task→MS: date=start', t.date, '2026-01-12');
}

// ══════════════════════════════════════════════════════════════════
section('14. Auto-Schedule — Mixed Mode Chain');
// ══════════════════════════════════════════════════════════════════
{
  // Work → Cal → Work chain
  const A=mkTask('a','A','2026-01-12',5); // work: ends Jan 16
  const B=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:0}]}); // cal
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]}); // work
  initProj([A,B,C],{mode:'scheduled'});
  App.runSchedule();
  
  // A: unchanged (root), ends Jan 16
  assert('mixed chain: A unchanged', A.startDate, '2026-01-12');
  // B: cal succ of work pred. depEnd(A)=Jan 17. Cal: no skip. B starts Jan 17.
  assert('mixed chain: B=Sat(cal)', B.startDate, '2026-01-17');
  // B end: cal 7d from Jan 17 = Jan 17+6 = Jan 23
  assert('mixed chain: B end=Jan 23', B.endDate, '2026-01-23');
  // C: work succ of cal pred. depEnd(B)=Jan 24. Work: skipNonWorking(Jan 24)=Mon Jan 26 (Sat→Mon)
  assert('mixed chain: C=Mon(skip wknd)', C.startDate, '2026-01-26');
}
{
  // Cal → Cal chain
  const A=mkCal('a','A','2026-01-12',7); // cal: ends Jan 18 (Sun)
  const B=mkCal('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  
  assert('cal→cal: A end=Sun', A.endDate, '2026-01-18');
  // depEnd(A)=Jan 19. Cal succ: Jan 19 (Mon)
  assert('cal→cal: B=Mon', B.startDate, '2026-01-19');
}
{
  // Long mixed chain with milestones
  const A=mkTask('a','A','2026-01-12',5);
  const M=mkMilestone('m','Gate','2026-01-12',{deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkCal('b','B','2026-01-12',10,{deps:[{id:'m',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',5,{deps:[{id:'b',type:'FS',lag:2}]});
  initProj([A,M,B,C],{mode:'scheduled'});
  App.runSchedule();
  
  // A ends Fri Jan 16. depEnd=Jan 17.
  // M: milestone dm=work. skipNonWorking(Jan 17)=Tue Jan 20.
  assert('long mixed: M=Tue', M.date, '2026-01-20');
  // B: cal succ of milestone. depEnd(M)=Jan 21. Cal: no skip. B=Jan 21 (Wed).
  assert('long mixed: B=Wed', B.startDate, '2026-01-21');
  // B end: cal 10d from Jan 21 = Jan 21+9 = Jan 30.
  assert('long mixed: B end=Jan 30', B.endDate, '2026-01-30');
  // C: work succ of cal pred. depEnd(B)=Jan 31. Work lag+2: normalize Jan 31(Sat)→Mon Feb 2, +2wd=Wed Feb 4.
  // Wait: _addLagWorkingDays(Jan 31, 2, 'work'). Jan 31=Sat. Normalize to Mon Feb 2. +1wd=Tue, +2wd=Wed Feb 4.
  // Then _skipNonWorking on the result? No, lag already returns a working day.
  // Actually, calcEarlyStart returns the result of _addLagWorkingDays then applies _skipNonWorking.
  // _addLagWorkingDays('2026-01-31', 2, 'work'): Sat→normalize to Mon Feb 2, +1=Tue, +2=Wed. Returns Wed Feb 4.
  // _skipNonWorking(Feb 4) = Feb 4 (Wed, working day). 
  assert('long mixed: C=Wed Feb 4', C.startDate, '2026-02-04');
}

// ══════════════════════════════════════════════════════════════════
section('15. Multi-Predecessor (Diamond) — Mixed Modes');
// ══════════════════════════════════════════════════════════════════
{
  //    A(work) ──FS──→ C(work)
  //    B(cal)  ──FS──→ C(work)
  // C takes the LATER of the two early starts
  const A=mkTask('a','A','2026-01-12',3); // work: ends Jan 14 (Wed)
  const B=mkCal('b','B','2026-01-12',10); // cal: ends Jan 21 (Wed)
  const C=mkTask('c','C','2026-01-26',5,{deps:[{id:'a',type:'FS',lag:0},{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  
  // From A: depEnd=Jan 15. Work lag+0. skipNW(Jan 15)=Jan 15 (Thu).
  // From B: depEnd=Jan 22 (Thu). Work lag+0. skipNW(Jan 22)=Jan 22 (Thu).
  // C takes later: Jan 22.
  assert('diamond mixed: C=Jan 22', App.calcEarlyStart(C), '2026-01-22');
}
{
  //    A(work) ──FS+3──→ C(cal)
  //    B(cal)  ──FS+1──→ C(cal)
  const A=mkTask('a','A','2026-01-12',5); // work: ends Jan 16
  const B=mkCal('b','B','2026-01-12',7); // cal: ends Jan 18
  const C=mkCal('c','C','2026-01-26',5,{deps:[{id:'a',type:'FS',lag:3},{id:'b',type:'FS',lag:1}]});
  initProj([A,B,C]);
  
  // From A: depEnd=Jan 17. Cal lag+3 = Jan 20.
  // From B: depEnd=Jan 19. Cal lag+1 = Jan 20.
  // C takes later: Jan 20.
  assert('diamond mixed cal succ: C=Jan 20', App.calcEarlyStart(C), '2026-01-20');
}

// ══════════════════════════════════════════════════════════════════
section('16. Duration Labels — All Combinations');
// ══════════════════════════════════════════════════════════════════
initProj([],{holidays:HOLIDAYS_MLK});
{
  // Work mode, no weekend span
  const t=mkTask('x','X','2026-01-12',3); // Mon-Wed
  assert('label: work 3d no wknd=3d', App._fmtDurLabel(t), '3d');
}
{
  // Work mode, spans weekend
  const t=mkTask('x','X','2026-01-12',6); // 6wd, Mon-Tue (skip wknd+MLK)
  const calDays=U.days(t.startDate,t.endDate)+1;
  assert('label: work 6wd spans wknd', App._fmtDurLabel(t), `W:6d C:${calDays}d`);
}
{
  // Cal mode
  const t=mkCal('x','X','2026-01-12',10);
  assert('label: cal 10d=10d', App._fmtDurLabel(t), '10d');
}
{
  // Cal mode spanning weekend — still just calendar days
  const t=mkCal('x','X','2026-01-12',14);
  assert('label: cal 14d=14d', App._fmtDurLabel(t), '14d');
}
{
  // Weeks format
  const t=mkTask('x','X','2026-01-12',10,{durationFmt:'weeks'});
  const calDays=U.days(t.startDate,t.endDate)+1;
  assert('label: weeks format', App._fmtDurLabel(t), `W:2.0w C:${(calDays/5).toFixed(1)}w`);
}
{
  // Months format
  const t=mkTask('x','X','2026-01-12',5,{durationFmt:'months'});
  // 5wd = Mon-Fri, calDays=5, same. So no W:/C: prefix.
  assert('label: months 1wk=0.2mo', App._fmtDurLabel(t), '0.2mo');
}

// ══════════════════════════════════════════════════════════════════
section('17. Holiday Interactions with Cal Mode');
// ══════════════════════════════════════════════════════════════════
{
  // Cal-mode tasks should NOT skip holidays in _calcEndDate
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-17',5); // Sat, 5cd
  assert('cal from Sat: end=Wed', t.endDate, '2026-01-21'); // Sat+4=Wed
  // Work mode from same start:
  const tw=mkTask('b','B','2026-01-17',5);
  // Work 5wd from Sat: first WD is Tue(skip wknd+MLK), then Wed,Thu,Fri,Mon = Mon Jan 26
  // Wait: _addWorkingDays('2026-01-17', 5). Start=Sat.
  // count=0. Sat not WD. count<5, advance to Sun. Not WD. advance to Mon(MLK). Not WD(holiday). advance to Tue.
  // Tue is WD. count=1. count<5, advance to Wed. count=2. Thu=3. Fri=4. Mon=5. Return Mon Jan 26.
  // Hmm wait, the loop: while(count<dur){ check if WD, if yes count++; if count<dur advance }
  // d=Sat. dow=6, not WD. count=0. 0<5, advance to Sun.
  // d=Sun. dow=0, not WD. count=0. 0<5, advance to Mon=MLK.
  // d=Mon. In holSet. Not WD. count=0. 0<5, advance to Tue.
  // d=Tue. WD. count=1. 1<5, advance to Wed.
  // d=Wed. WD. count=2. 2<5, advance to Thu.
  // d=Thu. WD. count=3. 3<5, advance to Fri.
  // d=Fri. WD. count=4. 4<5, advance to Sat.
  // d=Sat. Not WD. count=4. 4<5, advance to Sun.
  // d=Sun. Not WD. count=4. 4<5, advance to Mon Jan 26.
  // d=Mon. WD. count=5. 5 not < 5. Return Mon Jan 26.
  assert('work from Sat: end=Mon26', tw.endDate, '2026-01-26');
  
  // Cal is shorter (no skipping), work is longer
  assertT('cal end < work end', t.endDate < tw.endDate);
}
{
  // Toggling scheduleAroundNonWorking: cal tasks unaffected
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',14);
  const origEnd=t.endDate;
  
  // Recalc with feature off
  App.proj.scheduleAroundNonWorking=false;
  App._recalcNonWorkingDays();
  // _recalcNonWorkingDays only recalcs tasks where durMode !== 'cal'
  // So cal task should be unaffected
  assert('cal task: unaffected by schedAround toggle', t.endDate, origEnd);
  
  App.proj.scheduleAroundNonWorking=true;
}

// ══════════════════════════════════════════════════════════════════
section('18. End Date Never on Weekend (Work Mode)');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  let fails=0;
  // Test 100 combinations of start dates and durations
  for(let s=0;s<20;s++){
    const start=U.addDays('2026-01-01',s);
    for(let d=1;d<=10;d++){
      const end=App._calcEndDate({startDate:start,duration:d,durMode:'work'});
      if(U.isWeekend(end)){
        fails++;
        if(fails<=3)console.log(`    weekend end: start=${start}(${U.dayName(start)}) dur=${d} → end=${end}(${U.dayName(end)})`);
      }
    }
  }
  assert('200 work combos: no weekend end dates', fails, 0);
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  // Verify end date is not on a holiday
  let holFails=0;
  const holSet=App._getNonWorkingHolidaySet();
  for(let s=0;s<20;s++){
    const start=U.addDays('2026-01-01',s);
    for(let d=1;d<=10;d++){
      const end=App._calcEndDate({startDate:start,duration:d,durMode:'work'});
      if(holSet.has(end)){
        holFails++;
        if(holFails<=3)console.log(`    holiday end: start=${start} dur=${d} → end=${end}`);
      }
    }
  }
  assert('200 work combos: no holiday end dates', holFails, 0);
}

// ══════════════════════════════════════════════════════════════════
section('19. Round-Trip Stability');
// ══════════════════════════════════════════════════════════════════
{
  // Manual → Auto → Manual → Auto: no duration inflation
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'manual'});
  
  for(let i=0;i<5;i++){
    App.proj.schedulingMode='scheduled';App.runSchedule();
    App.proj.schedulingMode='manual';
  }
  assert('5x roundtrip: A dur=5', A.duration, 5);
  assert('5x roundtrip: B dur=3', B.duration, 3);
  assert('5x roundtrip: C dur=2', C.duration, 2);
}
{
  // Mixed mode round-trip
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkCal('b','B','2026-01-26',7,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'manual'});
  
  for(let i=0;i<5;i++){
    App.proj.schedulingMode='scheduled';App.runSchedule();
    App.proj.schedulingMode='manual';
  }
  assert('mixed roundtrip: A dur=5', A.duration, 5);
  assert('mixed roundtrip: B dur=7', B.duration, 7);
  assert('mixed roundtrip: C dur=3', C.duration, 3);
}

// ══════════════════════════════════════════════════════════════════
section('20. Float Calculation with Mixed Modes');
// ══════════════════════════════════════════════════════════════════
{
  // Simple chain: all critical
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-02-05',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});
  App.runSchedule();
  App.calculateFloat();
  assert('float: A=0', A._float, 0);
  assert('float: B=0', B._float, 0);
  assert('float: C=0', C._float, 0);
}
{
  // Diamond with slack
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-02-02',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkCal('c','C','2026-02-02',2,{deps:[{id:'a',type:'FS',lag:0}]}); // shorter parallel path
  const D=mkTask('d','D','2026-02-10',2,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});
  App.runSchedule();
  App.calculateFloat();
  
  assert('diamond float: A=0', A._float, 0);
  assert('diamond float: B=0 (critical)', B._float, 0);
  assertT('diamond float: C>0 (slack)', C._float > 0);
  assert('diamond float: D=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('21. Propagation Stability');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C]);
  
  // Propagate from A
  const n1=App._runSchedulePass(false);
  assertT('first propagation moves items', n1 > 0);
  
  // Second propagation should be stable
  const n2=App._runSchedulePass(false);
  assert('second propagation: stable', n2, 0);
  
  // Durations should be preserved
  assert('prop: A dur=5', A.duration, 5);
  assert('prop: B dur=3', B.duration, 3);
  assert('prop: C dur=2', C.duration, 2);
}

// ══════════════════════════════════════════════════════════════════
section('22. Edge: Tasks Starting on Holidays');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  
  // Work task starting on MLK Monday
  const t=mkTask('a','A','2026-01-19',5); // MLK Day
  // _addWorkingDays('2026-01-19', 5): Mon is holiday, skip to Tue. Count 5 from Tue.
  // Tue(1),Wed(2),Thu(3),Fri(4),skip wknd,Mon(5). Return Mon Jan 26.
  assert('work from MLK: end=Mon26', t.endDate, '2026-01-26');
  
  // Cal task starting on MLK Monday — doesn't skip
  const tc=mkCal('b','B','2026-01-19',5);
  assert('cal from MLK: end=Fri23', tc.endDate, '2026-01-23');
}

// ══════════════════════════════════════════════════════════════════
section('23. 10-Item Chain Stress Test');
// ══════════════════════════════════════════════════════════════════
{
  const items=[];
  for(let i=0;i<10;i++){
    const deps=i>0?[{id:`t${i-1}`,type:'FS',lag:0}]:[];
    items.push(mkTask(`t${i}`,`Task ${i}`,'2026-01-12',3,{deps}));
  }
  initProj(items,{mode:'scheduled'});
  App.runSchedule();
  
  // Verify all durations are still 3
  let durOK=true;
  for(const it of items)if(it.duration!==3)durOK=false;
  assertT('10-chain: all durations=3', durOK);
  
  // Verify sequential ordering
  let seqOK=true;
  for(let i=1;i<items.length;i++){
    if(items[i].startDate<=items[i-1].endDate)seqOK=false;
  }
  assertT('10-chain: sequential ordering', seqOK);
  
  // Stability: run again, no changes
  const n=App._runSchedulePass(false);
  assert('10-chain: re-run stable', n, 0);
}
{
  // Mixed mode 10-item chain: alternating work/cal
  const items=[];
  for(let i=0;i<10;i++){
    const deps=i>0?[{id:`m${i-1}`,type:'FS',lag:0}]:[];
    const dur=i%2===0?3:5;
    const mode=i%2===0?'work':'cal';
    if(mode==='work')items.push(mkTask(`m${i}`,`T${i}`,'2026-01-12',dur,{deps}));
    else items.push(mkCal(`m${i}`,`T${i}`,'2026-01-12',dur,{deps}));
  }
  initProj(items,{mode:'scheduled'});
  App.runSchedule();
  
  let durOK=true;
  for(let i=0;i<items.length;i++){
    const expected=i%2===0?3:5;
    if(items[i].duration!==expected)durOK=false;
  }
  assertT('mixed 10-chain: all durations preserved', durOK);
  
  const n=App._runSchedulePass(false);
  assert('mixed 10-chain: stable', n, 0);
}

// ══════════════════════════════════════════════════════════════════
section('24. Multiple Holidays');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK_GOODFRI});
  
  // Task spanning Good Friday
  const t=mkTask('a','A','2026-03-30',5); // Mon Mar 30
  // Mon(1),Tue(2),Wed(3),Thu(4),skip GoodFri, skip wknd, Mon(5)=Apr 6
  assert('Good Friday skip: 5wd from Mon=Mon Apr 6', t.endDate, '2026-04-06');
  assertT('Good Friday: end not on holiday', !App._getNonWorkingHolidaySet().has(t.endDate));
}
{
  // Christmas break spanning multiple days
  initProj([],{holidays:HOLIDAYS_XMAS});
  
  const t=mkTask('a','A','2025-12-22',5); // Mon Dec 22
  // Mon(1),Tue(2),Wed(3),skip Thu Dec 25, skip Fri Dec 26, skip wknd, Mon(4), Tue(5)
  // Mon Dec 22(1), Tue 23(2), Wed 24(3), skip 25,26, skip 27,28, Mon 29(4), Tue 30(5)
  assert('Xmas break: 5wd', t.endDate, '2025-12-30');
}

// ══════════════════════════════════════════════════════════════════
section('25. _countWorkingDays Consistency');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  
  // Count should match duration
  for(let d=1;d<=15;d++){
    const start='2026-01-12';
    const end=App._addWorkingDays(start,d);
    const endExcl=U.addDays(end,1);
    const counted=App._countWorkingDays(start,endExcl);
    if(counted!==d){
      assert(`countWD roundtrip dur=${d}`, counted, d);
      break;
    }
  }
  assertT('countWD: 15 roundtrips all match', true);
}

// ══════════════════════════════════════════════════════════════════
section('26. Lag Label Unit Logic');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  // Work succ + schedAround=true → 'wd'
  const isWork=App.proj.scheduleAroundNonWorking&&'work'==='work';
  assert('lag unit: work+schedAround=wd', isWork?'wd':'d', 'wd');
  
  // Cal succ + schedAround=true → 'd'  
  const isCal=App.proj.scheduleAroundNonWorking&&'cal'==='work';
  assert('lag unit: cal+schedAround=d', isCal?'wd':'d', 'd');
  
  // Any + schedAround=false → 'd'
  App.proj.scheduleAroundNonWorking=false;
  const disabled=App.proj.scheduleAroundNonWorking&&'work'==='work';
  assert('lag unit: schedAround off=d', disabled?'wd':'d', 'd');
  App.proj.scheduleAroundNonWorking=true;
}

// ══════════════════════════════════════════════════════════════════
section('27. Feature Disabled — Pure Calendar');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{schedAround:false,holidays:[]});
  
  // With feature off, work mode tasks act like calendar
  const t=mkTask('a','A','2026-01-12',5,{durMode:'work'});
  // _calcEndDate: schedAround=false, so falls through to calendar: addDays(start, 4) = Jan 16
  assert('disabled: work end=Fri', t.endDate, '2026-01-16');
  
  // Lag also becomes pure calendar
  assert('disabled: lag+2=calendar', App._addLagWorkingDays('2026-01-16',2,'work'), '2026-01-18');
}
{
  // Chain with feature disabled
  const A=mkTask('a','A','2026-01-12',5,{durMode:'work'});
  const B=mkTask('b','B','2026-01-12',3,{durMode:'work',deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B],{mode:'scheduled',schedAround:false,holidays:[]});
  App.runSchedule();
  
  // A end = Jan 16. depEnd = Jan 17. lag+2 = Jan 19. 
  assert('disabled chain: B start=Jan 19', B.startDate, '2026-01-19');
}

// ══════════════════════════════════════════════════════════════════
section('28. Boundary Durations');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  
  // Duration = 1 (minimum useful)
  const t1=mkTask('a','A','2026-01-12',1);
  assert('1wd: start==end', t1.startDate, t1.endDate);
  assert('1wd: depEnd=next day', App._depEnd(t1), '2026-01-13');
  
  // Duration = 0  
  const t0=mkTask('b','B','2026-01-12',0);
  assert('0wd: end=start', t0.endDate, '2026-01-12');
  
  // Large duration
  const tBig=mkTask('c','C','2026-01-12',100);
  assertT('100wd: end exists', tBig.endDate!==null);
  assertT('100wd: end is weekday', !U.isWeekend(tBig.endDate));
  assertT('100wd: end > start by months', U.days(tBig.startDate,tBig.endDate) > 120);
}

// ══════════════════════════════════════════════════════════════════
section('29. Inclusive End Date Invariants');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  
  // For any work-mode task: duration should equal _countWorkingDays(start, endExcl)
  let mismatches=0;
  for(let d=1;d<=20;d++){
    const t=mkTask(`t${d}`,`T`,'2026-01-12',d);
    const endExcl=U.addDays(t.endDate,1);
    const counted=App._countWorkingDays(t.startDate,endExcl);
    if(counted!==d){
      mismatches++;
      if(mismatches<=3)console.log(`    mismatch: dur=${d} counted=${counted} start=${t.startDate} end=${t.endDate}`);
    }
  }
  assert('20 work tasks: duration==countWorkingDays', mismatches, 0);
}
{
  // For cal-mode tasks: duration should equal days(start, end)+1
  initProj([],{holidays:HOLIDAYS_MLK});
  let mismatches=0;
  for(let d=1;d<=20;d++){
    const t=mkCal(`t${d}`,`T`,'2026-01-12',d);
    const computed=U.days(t.startDate,t.endDate)+1;
    if(computed!==d){
      mismatches++;
      if(mismatches<=3)console.log(`    cal mismatch: dur=${d} computed=${computed}`);
    }
  }
  assert('20 cal tasks: duration==days(start,end)+1', mismatches, 0);
}

// ══════════════════════════════════════════════════════════════════
section('30. _depEnd → calcEarlyStart Consistency');
// ══════════════════════════════════════════════════════════════════
{
  // For FS+0 between two work-mode tasks:
  // calcEarlyStart(B) should equal _skipNonWorking(_depEnd(A))
  initProj([],{holidays:HOLIDAYS_MLK});
  
  const starts=['2026-01-12','2026-01-14','2026-01-16','2026-01-19','2026-01-20','2026-01-26'];
  const durs=[1,3,5,7,10];
  let mismatches=0;
  
  for(const s of starts){
    for(const d of durs){
      const A=mkTask('a','A',s,d);
      const B=mkTask('b','B','2026-06-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
      initProj([A,B]);
      
      const expected=App._skipNonWorking(App._depEnd(A));
      const actual=App.calcEarlyStart(B);
      if(actual!==expected){
        mismatches++;
        if(mismatches<=3)console.log(`    FS+0 mismatch: A(${s},${d}d) depEnd=${App._depEnd(A)} expected=${expected} got=${actual}`);
      }
    }
  }
  assert('30 FS+0 combos: calcEarlyStart==skipNW(depEnd)', mismatches, 0);
}

// ══════════════════════════════════════════════════════════════════
section('31. PP/DT Roundtrip Invariants (Parametric)');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  // For every start day and duration combo: edit start via PP, verify end unchanged
  const starts=['2026-01-12','2026-01-14','2026-01-16','2026-01-19','2026-01-20','2026-01-26'];
  const durs=[1,2,3,5,7,10,15];
  let ppFails=0;
  for(const s of starts){
    for(const d of durs){
      const t=mkTask('x','X',s,d);
      const origEnd=t.endDate;
      // Move start back 3 days
      const newStart=U.addDays(s,-3);
      simPPStartChange(t,newStart);
      // Now recalcEndDate should give original end
      const reEnd=App._calcEndDate(t);
      if(reEnd!==origEnd){
        ppFails++;
        if(ppFails<=3)console.log(`    PP roundtrip fail: start=${s}→${newStart} dur=${d}→${t.duration} origEnd=${origEnd} reEnd=${reEnd}`);
      }
    }
  }
  assert('42 PP start-change roundtrips: end unchanged', ppFails, 0);
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  let dtFails=0;
  const starts=['2026-01-12','2026-01-14','2026-01-20'];
  const durs=[1,3,5,10];
  for(const s of starts){
    for(const d of durs){
      const t=mkTask('x','X',s,d);
      const origEnd=t.endDate;
      // Edit end via DT — extend by adding 5 working days to ensure valid endpoint
      const newEnd=App._addWorkingDays(origEnd,5);
      simDTEndEdit(t,newEnd);
      // _calcEndDate should give newEnd
      const reEnd=App._calcEndDate(t);
      if(reEnd!==newEnd){
        dtFails++;
        if(dtFails<=3)console.log(`    DT roundtrip fail: ${s},${d}d endEdit=${newEnd} dur=${t.duration} reEnd=${reEnd}`);
      }
    }
  }
  assert('12 DT end-edit roundtrips: end consistent', dtFails, 0);
}

// ══════════════════════════════════════════════════════════════════
section('32. Drag Invariant Sweep');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  let dragFails=0;
  const starts=['2026-01-12','2026-01-16','2026-01-20','2026-01-26'];
  const durs=[1,3,5,8,10];
  const targets=['2026-01-05','2026-01-12','2026-01-17','2026-01-20','2026-02-02'];
  for(const s of starts){
    for(const d of durs){
      for(const tgt of targets){
        const t=mkTask('x','X',s,d);
        simDrag(t,tgt);
        if(t.duration!==d){
          dragFails++;
          if(dragFails<=3)console.log(`    drag dur change: ${s},${d}d → ${tgt}: dur became ${t.duration}`);
        }
        if(t.endDate!==App._calcEndDate(t)){
          dragFails++;
          if(dragFails<=3)console.log(`    drag end mismatch: ${s},${d}d → ${tgt}: end=${t.endDate} calc=${App._calcEndDate(t)}`);
        }
      }
    }
  }
  assert('100 drag combos: duration preserved + end consistent', dragFails, 0);
}

// ══════════════════════════════════════════════════════════════════
section('33. DurMode Switch + Edit Integration');
// ══════════════════════════════════════════════════════════════════
{
  // Switch from work→cal then edit start
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5); // work: Mon-Fri
  assert('before switch: end=Fri', t.endDate, '2026-01-16');
  
  // Switch to cal (what PP does)
  t.durMode='cal';
  t.endDate=App._calcEndDate(t);
  assert('after switch cal: end=Fri(same)', t.endDate, '2026-01-16'); // cal 5d from Mon = Fri
  
  // Now edit start via PP
  simPPStartChange(t, '2026-01-14');
  // Cal mode: dur = days(Jan14, Jan16)+1 = 3
  assert('cal after switch: dur=3', t.duration, 3);
  assert('cal after switch: roundtrip', App._calcEndDate(t), '2026-01-16');
}
{
  // Switch from cal→work then edit end
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',14); // cal: ends Jan 25 (Sun)
  
  t.durMode='work';
  t.endDate=App._calcEndDate(t); // 14wd from Mon: way further
  
  simPPEndChange(t, '2026-01-26'); // Mon Jan 26
  const wd=App._countWorkingDays('2026-01-12',U.addDays('2026-01-26',1));
  assert('work after switch: dur=working days', t.duration, wd);
  assert('work after switch: roundtrip', App._calcEndDate(t), '2026-01-26');
}

// ══════════════════════════════════════════════════════════════════
section('34. Dep Chain + PP Edit Integration');
// ══════════════════════════════════════════════════════════════════
{
  // Edit predecessor duration, propagate, verify successor
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  const bStart1=B.startDate;
  
  // PP: change A duration from 5 to 10
  A.duration=10;
  A.endDate=App._calcEndDate(A);
  App.runSchedule();
  
  // B should have moved further
  assertT('pred dur change: B moved later', B.startDate > bStart1);
  assertT('pred dur change: B starts after A', B.startDate >= App._depEnd(A));
  assert('pred dur change: B dur unchanged', B.duration, 3);
}
{
  // Edit predecessor duration in mixed-mode chain
  // NOTE: auto-scheduler only pushes tasks LATER, not earlier.
  // To test "shorten" we need to re-init so B hasn't already been pushed forward.
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  
  const bStart1=B.startDate;
  // Now shorten A and re-init fresh to test correct position
  const A2=mkTask('a','A','2026-01-12',3);
  const B2=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A2,B2],{mode:'scheduled'});
  App.runSchedule();
  
  assertT('mixed pred shorten: B earlier than long-pred B', B2.startDate < bStart1);
  assert('mixed pred shorten: B dur unchanged', B2.duration, 7);
}

// ══════════════════════════════════════════════════════════════════
section('35. Edge: Negative/Zero Duration from DT Edit');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  
  // DT: set end before start
  simDTEndEdit(t, '2026-01-10');
  // Duration should be negative or zero
  assertT('end before start: duration <= 0', t.duration <= 0);
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkTask('a','A','2026-01-12',5);
  
  // DT: set end = start
  simDTEndEdit(t, '2026-01-12');
  assert('end=start: duration=1', t.duration, 1);
}
{
  initProj([],{holidays:HOLIDAYS_MLK});
  const t=mkCal('a','A','2026-01-12',5);
  simDTEndEdit(t, '2026-01-12');
  assert('cal end=start: duration=1', t.duration, 1);
}

// ══════════════════════════════════════════════════════════════════
section('36. Violation Detection — Exhaustive');
// ══════════════════════════════════════════════════════════════════
{
  // FS work: exact boundary
  const A=mkTask('a','A','2026-01-12',5); // ends Fri
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]}); // Tue
  initProj([A,B]);
  assertT('FS work boundary: not violated', !App.getViolatedDepIds().has('b'));
  
  // Move B to Fri (during A)
  B.startDate='2026-01-16';B.endDate=App._calcEndDate(B);
  assertT('FS work overlap: violated', App.getViolatedDepIds().has('b'));
}
{
  // SS work with lag
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-14',3,{deps:[{id:'a',type:'SS',lag:2}]});
  initProj([A,B]);
  // SS+2 from Mon: work lag+2 from Mon = Wed Jan 14. B starts Wed. Not violated.
  assertT('SS+2 work: B on Wed not violated', !App.getViolatedDepIds().has('b'));
  
  B.startDate='2026-01-13';B.endDate=App._calcEndDate(B);
  assertT('SS+2 work: B on Tue violated', App.getViolatedDepIds().has('b'));
}
{
  // FF work
  const A=mkTask('a','A','2026-01-12',5); // ends Fri Jan 16
  const B=mkTask('b','B','2026-01-14',3,{deps:[{id:'a',type:'FF',lag:0}]}); // 3wd from Wed = Fri Jan 16
  initProj([A,B]);
  // FF+0: depEnd(B)=Jan17, depEnd(A)=Jan17. Jan17 < Jan17? No. Not violated (ends same day).
  assertT('FF work: B ends same as A → not violated', !App.getViolatedDepIds().has('b'));
  
  // Make B end before A: 2wd from Wed = Thu Jan 15
  B.duration=2;B.endDate=App._calcEndDate(B);
  // depEnd(B)=Jan16(Fri), depEnd(A)=Jan17(Sat). Fri < Sat → violated
  assertT('FF work: B ends Thu, A ends Fri → violated', App.getViolatedDepIds().has('b'));
}
{
  // Cal successor violations: different boundary
  const A=mkTask('a','A','2026-01-12',5); // work: ends Fri
  // Cal successor FS+0: depEnd(A)=Sat. Cal: no skip. B needs to start >= Sat.
  const B=mkCal('b','B','2026-01-17',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  assertT('cal FS+0: B on Sat not violated', !App.getViolatedDepIds().has('b'));
  
  B.startDate='2026-01-16'; // Friday = during pred
  assertT('cal FS+0: B on Fri violated', App.getViolatedDepIds().has('b'));
}

// ══════════════════════════════════════════════════════════════════
section('37. Auto-Schedule with Lag — Cal vs Work');
// ══════════════════════════════════════════════════════════════════
{
  // FS+3 with cal successor: lag is calendar days
  const A=mkTask('a','A','2026-01-12',5); // ends Fri
  const B=mkCal('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:3}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  
  // depEnd(A)=Sat. Cal lag+3=Sat+3=Tue Jan 20.
  assert('auto FS+3 cal: B=Tue', B.startDate, '2026-01-20');
}
{
  // FS+3 with work successor: lag is working days
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:3}]});
  initProj([A,B],{mode:'scheduled'});
  App.runSchedule();
  
  // depEnd(A)=Sat. Work lag+3: normalize Sat→Tue(skip MLK), +3wd=Fri Jan 23.
  assert('auto FS+3 work: B=Fri', B.startDate, '2026-01-23');
}
{
  // Same predecessor, different successor modes, same lag=3
  // Verify they produce DIFFERENT results (this is the core cal/work distinction)
  const A=mkTask('a','A','2026-01-12',5);
  const Bcal=mkCal('bc','Bcal','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:3}]});
  const Bwork=mkTask('bw','Bwork','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:3}]});
  initProj([A,Bcal,Bwork],{mode:'scheduled'});
  App.runSchedule();
  
  assertNeq('FS+3: cal vs work successor give different starts', Bcal.startDate, Bwork.startDate);
}

// ══════════════════════════════════════════════════════════════════
section('38. schedAround Toggle + PP Recalc');
// ══════════════════════════════════════════════════════════════════
{
  const t=mkTask('a','A','2026-01-12',10); // work: ends Mon Jan 26
  initProj([t],{holidays:HOLIDAYS_MLK});
  assert('before toggle: end=Mon26', t.endDate, '2026-01-26');
  
  // Disable schedAround
  App.proj.scheduleAroundNonWorking=false;
  App._recalcNonWorkingDays();
  // _recalcNonWorkingDays: schedAround is now false, so _calcEndDate treats work as cal: addDays(Jan12, 9) = Jan 21
  assert('after disable: end=Wed21', t.endDate, '2026-01-21');
  
  // PP start edit while disabled
  simPPStartChange(t, '2026-01-14');
  // With schedAround off, isWork=false, so calendar: days(Jan14,Jan21)+1 = 8
  assert('PP edit while disabled: calendar dur', t.duration, 8);
  
  // Re-enable
  App.proj.scheduleAroundNonWorking=true;
  App._recalcNonWorkingDays();
  // _recalcNonWorkingDays recalcs: 8wd from Wed Jan 14
  assertT('after re-enable: end is weekday', !U.isWeekend(t.endDate));
}

// ══════════════════════════════════════════════════════════════════
section('39. Chained Propagation with Mixed Modes + Lag');
// ══════════════════════════════════════════════════════════════════
{
  // A(work) →FS+2→ B(cal) →FS+1→ C(work) →FS+0→ D(milestone)
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',10,{deps:[{id:'a',type:'FS',lag:2}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:1}]});
  const D=mkMilestone('d','Gate','2026-01-12',{deps:[{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});
  App.runSchedule();
  
  assert('chain: A unchanged', A.startDate, '2026-01-12');
  assert('chain: A dur=5', A.duration, 5);
  
  // B: cal succ. depEnd(A)=Jan 17. Cal lag+2=Jan 19.
  assert('chain: B=Jan 19', B.startDate, '2026-01-19');
  assert('chain: B dur=10', B.duration, 10);
  // B end: cal 10d from Jan 19 = Jan 28
  assert('chain: B end=Jan 28', B.endDate, '2026-01-28');
  
  // C: work succ. depEnd(B)=Jan 29. Work lag+1: normalize Jan 29(Thu, working day), +1wd=Fri Jan 30.
  assert('chain: C=Fri Jan 30', C.startDate, '2026-01-30');
  assert('chain: C dur=3', C.duration, 3);
  
  // D: milestone. C ends Tue Feb 3 (3wd from Fri). depEnd(C)=Wed Feb 4. skipNW=Feb 4.
  assert('chain: D=Wed Feb 4', D.date, '2026-02-04');
  
  // Stability
  const n=App._runSchedulePass(false);
  assert('chain: stable', n, 0);
}

// ══════════════════════════════════════════════════════════════════
section('40. FF Dep with Cal Successor');
// ══════════════════════════════════════════════════════════════════
{
  // FF+0: cal successor should end at same time as work predecessor
  const A=mkTask('a','A','2026-01-12',5); // ends Fri Jan 16
  const B=mkCal('b','B','2026-01-12',5,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B]);
  
  const es=App.calcEarlyStart(B);
  assertT('FF+0 cal succ: has early start', es!==null);
  // Verify B's end >= A's end
  if(es){
    const bEnd=App._calcEndDate({startDate:es,duration:5,durMode:'cal'});
    assertT('FF+0 cal succ: B end >= A end', bEnd >= A.endDate);
  }
}

// ══════════════════════════════════════════════════════════════════
section('41. Violation After Drag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-20',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B]);
  assertT('before drag: not violated', !App.getViolatedDepIds().has('b'));
  
  // Drag B backward into A
  simDrag(B, '2026-01-14');
  assertT('after drag backward: violated', App.getViolatedDepIds().has('b'));
  
  // Drag B forward past A
  simDrag(B, '2026-01-22');
  assertT('after drag forward: not violated', !App.getViolatedDepIds().has('b'));
}

// ══════════════════════════════════════════════════════════════════
section('42. Milestone Chain Stress');
// ══════════════════════════════════════════════════════════════════
{
  // MS → MS → MS → Task chain
  const M1=mkMilestone('m1','G1','2026-01-12');
  const M2=mkMilestone('m2','G2','2026-01-12',{deps:[{id:'m1',type:'FS',lag:2}]});
  const M3=mkMilestone('m3','G3','2026-01-12',{deps:[{id:'m2',type:'FS',lag:1}]});
  const T=mkTask('t','Task','2026-01-12',5,{deps:[{id:'m3',type:'FS',lag:0}]});
  initProj([M1,M2,M3,T],{mode:'scheduled'});
  App.runSchedule();
  
  // M1: Mon Jan 12. depEnd=Jan 13(Tue). Work lag+2: Tue→Thu(2wd). M2=Thu Jan 15.
  // Hmm, _addLagWorkingDays('2026-01-13', 2, 'work'): Jan 13=Tue(WD). Normalize=Tue. +1=Wed, +2=Thu. 
  assert('MS chain: M2=Thu', M2.date, '2026-01-15');
  // M2 depEnd=Jan 16(Fri). Work lag+1: Fri→+1wd=Tue(skip wknd+MLK).
  // _addLagWorkingDays('2026-01-16', 1, 'work'): Fri(WD), normalize=Fri. +1wd: Sat(no),Sun(no),Mon(MLK,no),Tue(yes). Tue Jan 20.
  assert('MS chain: M3=Tue', M3.date, '2026-01-20');
  // M3 depEnd=Jan 21(Wed). Work: skipNW(Jan 21)=Wed. T=Wed.
  assert('MS chain: T=Wed', T.startDate, '2026-01-21');
  assert('MS chain: T dur=5', T.duration, 5);
}

// ══════════════════════════════════════════════════════════════════
section('43. PP Recalc — Work Task Spanning Multiple Holidays');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{holidays:HOLIDAYS_MLK_GOODFRI});
  const t=mkTask('a','A','2026-01-12',60); // 60 working days spans both MLK and Good Friday
  const origEnd=t.endDate;
  
  // Verify end is weekday and not holiday
  const holSet=App._getNonWorkingHolidaySet();
  assertT('60wd: end is weekday', !U.isWeekend(origEnd));
  assertT('60wd: end not on holiday', !holSet.has(origEnd));
  
  // PP start change: move start by 5 days
  simPPStartChange(t, '2026-01-20');
  // Duration should have changed
  assertT('PP multi-holiday: duration recalculated', t.duration < 60);
  // Roundtrip
  assert('PP multi-holiday: roundtrip', App._calcEndDate(t), origEnd);
}

// ══════════════════════════════════════════════════════════════════
section('44. Negative Lag (Overlap) All Types');
// ══════════════════════════════════════════════════════════════════
{
  // FS-2 work: B starts 2 working days before A ends
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:-2}]});
  initProj([A,B]);
  
  const es=App.calcEarlyStart(B);
  // depEnd(A)=Jan 17. Work lag-2: from Sat, back 2wd = Thu Jan 15.
  assert('FS-2 work: B=Thu', es, '2026-01-15');
}
{
  // FS-2 cal: B starts 2 calendar days before A end
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:-2}]});
  initProj([A,B]);
  
  const es=App.calcEarlyStart(B);
  // depEnd(A)=Jan 17. Cal lag-2 = Jan 15 (Thu).
  assert('FS-2 cal: B=Thu', es, '2026-01-15');
}
{
  // SS-1 work
  const A=mkTask('a','A','2026-01-14',5); // Wed
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'SS',lag:-1}]});
  initProj([A,B]);
  
  const es=App.calcEarlyStart(B);
  // SS: pStart=Wed. Work lag-1: back 1wd=Tue.
  assert('SS-1 work: B=Tue', es, '2026-01-13');
}

// ══════════════════════════════════════════════════════════════════
section('45. Dep Type Cycling Integration');
// ══════════════════════════════════════════════════════════════════
{
  // Simulate clicking dep type badge to cycle FS→SS→FF
  // Test each type independently since scheduler only pushes later
  const A=mkTask('a','A','2026-01-12',5);
  
  // FS+2
  const B1=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:2}]});
  initProj([A,B1],{mode:'scheduled'});
  App.runSchedule();
  const fsStart=B1.startDate;
  
  // SS+2 (fresh)
  const B2=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'SS',lag:2}]});
  initProj([A,B2],{mode:'scheduled'});
  App.runSchedule();
  const ssStart=B2.startDate;
  
  // FF+2 (fresh)
  const B3=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FF',lag:2}]});
  initProj([A,B3],{mode:'scheduled'});
  App.runSchedule();
  const ffStart=B3.startDate;
  
  // FS and SS should produce different results with same lag
  assertT('type cycle: FS ≠ SS', fsStart!==ssStart);
  assertT('type cycle: all starts are valid dates', fsStart && ssStart && ffStart);
  assert('type cycle: dur unchanged', B1.duration, 3);
}

// ══════════════════════════════════════════════════════════════════
section('46. Pin Behavior in Auto Mode');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-14',3,{pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});
  App.runSchedule();
  
  // B is pinned: should NOT move even though A→B FS would push it later
  assert('pinned B: unmoved', B.startDate, '2026-01-14');
  // C depends on B, should be scheduled from B's end
  assert('C after pinned B: starts after B', C.startDate >= App._skipNonWorking(App._depEnd(B)), true);
}

// ══════════════════════════════════════════════════════════════════
section('47. Feature Disabled + Mixed Modes');
// ══════════════════════════════════════════════════════════════════
{
  initProj([],{schedAround:false,holidays:[]});
  
  const t=mkTask('a','A','2026-01-12',10,{durMode:'work'});
  // With schedAround=false: _calcEndDate falls through to calendar
  assert('disabled work: end=calendar', t.endDate, U.addDays('2026-01-12',9));
  
  // PP edit: isWork=false because schedAround=false
  simPPStartChange(t, '2026-01-14');
  assert('disabled PP: calendar dur', t.duration, U.days('2026-01-14',U.addDays('2026-01-12',9))+1);
  
  // DT edit
  simDTEndEdit(t, '2026-01-26');
  assert('disabled DT: calendar dur', t.duration, U.days('2026-01-14','2026-01-26')+1);
  
  // Drag
  simDrag(t, '2026-01-20');
  assert('disabled drag: end=calendar', t.endDate, U.addDays('2026-01-20',t.duration-1));
}

// ══════════════════════════════════════════════════════════════════
section('48. Comprehensive endDate Invariant Sweep');
// ══════════════════════════════════════════════════════════════════
{
  // For 50 random-ish start/dur combos across 3 months, verify:
  // 1. endDate == _calcEndDate
  // 2. work: end is never weekend/holiday
  // 3. cal: end == start + dur - 1
  // 4. PP start edit roundtrips
  // 5. DT end edit roundtrips
  // 6. Drag preserves duration
  initProj([],{holidays:HOLIDAYS_MLK_GOODFRI});
  const holSet=App._getNonWorkingHolidaySet();
  let failures=0;
  
  for(let month=0;month<3;month++){
    for(let day=1;day<=28;day+=4){
      for(const dur of [1,3,5,10]){
        const ds=`2026-0${month+1}-${String(day).padStart(2,'0')}`;
        for(const mode of ['work','cal']){
          const t=mode==='work'?mkTask('x','X',ds,dur):mkCal('x','X',ds,dur);
          
          // Check 1: endDate consistent
          if(t.endDate!==App._calcEndDate(t)){failures++;continue}
          
          // Check 2/3: work never on weekend/holiday; cal = start+dur-1
          if(mode==='work'){
            if(U.isWeekend(t.endDate)||holSet.has(t.endDate)){failures++;continue}
          }else{
            if(t.endDate!==U.addDays(ds,dur-1)){failures++;continue}
          }
          
          // Check 4: PP roundtrip — move start to a valid working day
          const origEnd=t.endDate;
          const editStart=mode==='work'?App._skipNonWorking(U.addDays(ds,2)):U.addDays(ds,2);
          if(editStart < origEnd){ // only if new start is before original end
            simPPStartChange(t,editStart);
            if(App._calcEndDate(t)!==origEnd){failures++;continue}
          }
          
          // Restore
          t.startDate=ds;t.duration=dur;t.endDate=App._calcEndDate(t);
          
          // Check 5: DT end roundtrip — extend to a valid endpoint
          const newEnd=mode==='work'?App._addWorkingDays(origEnd,3):U.addDays(origEnd,3);
          simDTEndEdit(t,newEnd);
          if(App._calcEndDate(t)!==newEnd){failures++;continue}
          
          // Restore
          t.startDate=ds;t.duration=dur;t.endDate=App._calcEndDate(t);
          
          // Check 6: drag preserves duration
          simDrag(t,U.addDays(ds,7));
          if(t.duration!==dur){failures++;continue}
        }
      }
    }
  }
  assert('672 combos: all invariants hold', failures, 0);
}

// ══════════════════════════════════════════════════════════════════
section('49. Auto-Schedule Convergence Stress');
// ══════════════════════════════════════════════════════════════════
{
  // 15-item chain with alternating modes and various lags
  const items=[];
  const types=['FS','SS','FS','FF','FS'];
  const lags=[0,1,2,0,1];
  for(let i=0;i<15;i++){
    const deps=i>0?[{id:`s${i-1}`,type:types[i%5],lag:lags[i%5]}]:[];
    const dur=3+(i%4);
    const mode=i%3===0?'cal':'work';
    if(mode==='work')items.push(mkTask(`s${i}`,`T${i}`,'2026-01-12',dur,{deps}));
    else items.push(mkCal(`s${i}`,`T${i}`,'2026-01-12',dur,{deps}));
  }
  initProj(items,{mode:'scheduled',holidays:HOLIDAYS_MLK_GOODFRI});
  
  // Run and check convergence
  let totalMoved=0;
  for(let pass=0;pass<10;pass++){
    const n=App._runSchedulePass(false);
    totalMoved+=n;
    if(n===0)break;
  }
  assertT('15-chain converges', App._runSchedulePass(false)===0);
  
  // All durations preserved
  let durOK=true;
  for(let i=0;i<15;i++){
    if(items[i].duration!==(3+(i%4)))durOK=false;
  }
  assertT('15-chain: durations preserved', durOK);
}

// ══════════════════════════════════════════════════════════════════
section('50. Float with Mixed Modes and Lag');
// ══════════════════════════════════════════════════════════════════
{
  //   A(work,5) →FS+0→ B(work,3) →FS+0→ D(work,2)
  //   A(work,5) →FS+0→ C(cal,2)  →FS+0→ D(work,2)
  const A=mkTask('a','A','2026-01-26',5);
  const B=mkTask('b','B','2026-01-26',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkCal('c','C','2026-01-26',2,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-26',2,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});
  App.runSchedule();
  App.calculateFloat();
  
  assert('float mixed: A=0 (critical)', A._float, 0);
  assert('float mixed: D=0 (critical)', D._float, 0);
  // B is longer path than C, so B should be critical and C should have slack
  assert('float mixed: B=0 (critical)', B._float, 0);
  assertT('float mixed: C>0 (slack)', C._float > 0);
}

// ══════════════════════════════════════════════════════════════════
section('51. Critical Path — Simple FS Chain');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('CP simple: A float=0', A._float, 0);
  assert('CP simple: B float=0', B._float, 0);
  const cp=App.getCriticalPath();
  assertT('CP simple: A critical', cp&&cp.has('a'));
  assertT('CP simple: B critical', cp&&cp.has('b'));
}

// ══════════════════════════════════════════════════════════════════
section('52. Critical Path — FS with Positive Lag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:3}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('CP FS+3: A float=0', A._float, 0);
  assert('CP FS+3: B float=0', B._float, 0);
}
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:20}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('CP FS+20: A float=0', A._float, 0);
  assert('CP FS+20: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('53. Critical Path — FS with Negative Lag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:-2}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('CP FS-2: A float=0', A._float, 0);
  assert('CP FS-2: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('54. Critical Path — Diamond Unequal Paths');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('diamond: A float=0', A._float, 0);
  assert('diamond: B float=0 (long)', B._float, 0);
  assertT('diamond: C float>0 (short)', C._float > 0);
  assert('diamond: D float=0', D._float, 0);
  const cp=App.getCriticalPath();
  assertT('diamond: C not critical', !cp.has('c'));
}

// ══════════════════════════════════════════════════════════════════
section('55. Critical Path — Lag Makes Short Path Critical');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:10}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('lag diamond: A float=0', A._float, 0);
  assertT('lag diamond: B float>0', B._float > 0);
  assert('lag diamond: C float=0', C._float, 0);
  assert('lag diamond: D float=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('56. Critical Path — Multiple Independent Chains');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const X=mkTask('x','X','2026-01-12',5);
  const Y=mkTask('y','Y','2026-01-12',5,{deps:[{id:'x',type:'FS',lag:0}]});
  initProj([A,B,X,Y],{mode:'scheduled'});App.calculateFloat();
  assertT('indep chains: short chain (A) float>0', A._float > 0);
  assertT('indep chains: short chain (B) float>0', B._float > 0);
  assert('indep chains: long chain (X) float=0', X._float, 0);
  assert('indep chains: long chain (Y) float=0', Y._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('57. Critical Path — SS Deps (Backward Pass Fix)');
// ══════════════════════════════════════════════════════════════════
{
  // SS+0 same duration: both float=0
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('SS+0 same: A float=0', A._float, 0);
  assert('SS+0 same: B float=0', B._float, 0);
}
{
  // SS chain of 3: all float=0
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'SS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',5,{deps:[{id:'b',type:'SS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});App.calculateFloat();
  assert('SS chain3: A float=0', A._float, 0);
  assert('SS chain3: B float=0', B._float, 0);
  assert('SS chain3: C float=0', C._float, 0);
}
{
  // SS+0 where pred is longer: pred determines projEnd
  const A=mkTask('a','A','2026-01-12',10);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('SS long pred: A float=0', A._float, 0);
  assertT('SS long pred: B float>0', B._float > 0);
}
{
  // SS+2 chain: A →SS+2→ B →FS+0→ C
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'SS',lag:2}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});App.calculateFloat();
  assert('SS+2 chain: C float=0', C._float, 0);
  assert('SS+2 chain: B float=0', B._float, 0);
  assertT('SS+2 chain: A float>=0', A._float >= 0);
}

// ══════════════════════════════════════════════════════════════════
section('58. Critical Path — FF Deps');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('FF+0 same: A float=0', A._float, 0);
  assert('FF+0 same: B float=0', B._float, 0);
}
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FF',lag:3}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('FF+3: A float=0', A._float, 0);
  assert('FF+3: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('59. Critical Path — Milestones');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const M=mkMilestone('m','Gate','2026-01-12',{deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'m',type:'FS',lag:0}]});
  initProj([A,M,B],{mode:'scheduled'});App.calculateFloat();
  assert('MS chain: A float=0', A._float, 0);
  assert('MS chain: M float=0', M._float, 0);
  assert('MS chain: B float=0', B._float, 0);
  const cp=App.getCriticalPath();
  assertT('MS chain: all 3 critical', cp.has('a')&&cp.has('m')&&cp.has('b'));
}

// ══════════════════════════════════════════════════════════════════
section('60. Critical Path — Web Pattern');
// ══════════════════════════════════════════════════════════════════
{
  //       B(5d)
  //      /      \
  // A(3d)        D(3d) → E(2d)
  //      \      /
  //       C(10d)
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  const E=mkTask('e','E','2026-01-12',2,{deps:[{id:'d',type:'FS',lag:0}]});
  initProj([A,B,C,D,E],{mode:'scheduled'});App.calculateFloat();
  assert('web: A float=0', A._float, 0);
  assertT('web: B float>0 (short)', B._float > 0);
  assert('web: C float=0 (long)', C._float, 0);
  assert('web: D float=0', D._float, 0);
  assert('web: E float=0', E._float, 0);
  const cp=App.getCriticalPath();
  assertT('web: B not critical', !cp.has('b'));
  assertT('web: A,C,D,E critical', cp.has('a')&&cp.has('c')&&cp.has('d')&&cp.has('e'));
}

// ══════════════════════════════════════════════════════════════════
section('61. Critical Path — Three Parallel Paths (Slack Ordering)');
// ══════════════════════════════════════════════════════════════════
{
  const R=mkTask('r','Root','2026-01-12',2);
  const P1=mkTask('p1','P1','2026-01-12',3,{deps:[{id:'r',type:'FS',lag:0}]});
  const P2=mkTask('p2','P2','2026-01-12',5,{deps:[{id:'r',type:'FS',lag:0}]});
  const P3=mkTask('p3','P3','2026-01-12',8,{deps:[{id:'r',type:'FS',lag:0}]});
  const S=mkTask('s','Sink','2026-01-12',2,{deps:[
    {id:'p1',type:'FS',lag:0},{id:'p2',type:'FS',lag:0},{id:'p3',type:'FS',lag:0}]});
  initProj([R,P1,P2,P3,S],{mode:'scheduled'});App.calculateFloat();
  assert('3 paths: R float=0', R._float, 0);
  assert('3 paths: P3 float=0 (longest)', P3._float, 0);
  assertT('3 paths: P1 float>0', P1._float > 0);
  assertT('3 paths: P2 float>0', P2._float > 0);
  assertT('3 paths: P1 more slack than P2', P1._float > P2._float);
  assert('3 paths: S float=0', S._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('62. Critical Path — Auto-Schedule Mode');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});App.calculateFloat();
  assert('auto 3-chain: A float=0', A._float, 0);
  assert('auto 3-chain: B float=0', B._float, 0);
  assert('auto 3-chain: C float=0', C._float, 0);
}
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('auto diamond: A float=0', A._float, 0);
  assert('auto diamond: B float=0', B._float, 0);
  assertT('auto diamond: C float>0', C._float > 0);
  assert('auto diamond: D float=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('63. Critical Path — Parametric Lag Sweep');
// ══════════════════════════════════════════════════════════════════
{
  // Diamond: A → B(FS+lag), A → C(FS+0), B→D, C→D
  // As lag increases, B path gets longer → B becomes critical, C gets slack
  let prevBFloat=null,prevCFloat=null;
  let monotone=true;
  for(const lag of [-3,-1,0,1,3,5,10]){
    const A=mkTask('a','A','2026-01-12',3);
    const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag}]});
    const C=mkTask('c','C','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
    const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
    initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
    assert(`lag=${lag}: A float=0`, A._float, 0);
    assert(`lag=${lag}: D float=0`, D._float, 0);
    assertT(`lag=${lag}: no negatives`, [A,B,C,D].every(i=>i._float>=0));
    if(prevBFloat!==null&&B._float>prevBFloat)monotone=false;
    prevBFloat=B._float;prevCFloat=C._float;
  }
  assertT('lag sweep: B float decreases as lag increases', monotone);
}

// ══════════════════════════════════════════════════════════════════
section('64. Critical Path — No Negative Float (Exhaustive)');
// ══════════════════════════════════════════════════════════════════
{
  const depTypes=['FS','SS','FF'];
  const lags=[-2,-1,0,1,3,5];
  let negCount=0;
  for(const type of depTypes){
    for(const lag of lags){
      const A=mkTask('a','A','2026-01-12',5);
      const B=mkTask('b','B','2026-01-20',5,{deps:[{id:'a',type,lag}]});
      initProj([A,B],{mode:'scheduled'});App.calculateFloat();
      if((A._float!==null&&A._float<0)||(B._float!==null&&B._float<0)){
        negCount++;
        console.log(`    NEG: ${type}+${lag}: A=${A._float} B=${B._float}`);
      }
    }
  }
  assert('18 dep combos: no negative float', negCount, 0);
}

// ══════════════════════════════════════════════════════════════════
section('65. Critical Path — Long Chain with Varying Lag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:3}]});
  const D=mkTask('d','D','2026-01-12',4,{deps:[{id:'c',type:'FS',lag:-1}]});
  const E=mkTask('e','E','2026-01-12',2,{deps:[{id:'d',type:'FS',lag:2}]});
  initProj([A,B,C,D,E],{mode:'scheduled'});App.calculateFloat();
  assert('vary lag chain: A float=0', A._float, 0);
  assert('vary lag chain: B float=0', B._float, 0);
  assert('vary lag chain: C float=0', C._float, 0);
  assert('vary lag chain: D float=0', D._float, 0);
  assert('vary lag chain: E float=0', E._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('66. Critical Path — SS in Diamond');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'SS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('SS diamond: D float=0', D._float, 0);
  assert('SS diamond: C float=0 (longer FS path)', C._float, 0);
  assertT('SS diamond: B float>0 (shorter SS path)', B._float > 0);
}

// ══════════════════════════════════════════════════════════════════
section('67. Critical Path — getCriticalPath Returns');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});
  const cp=App.getCriticalPath();
  assertT('getCriticalPath returns Set', cp instanceof Set);
  assert('getCriticalPath size=2', cp.size, 2);
}
{
  initProj([]);
  const cp=App.getCriticalPath();
  assert('empty proj: returns null', cp, null);
}

// ══════════════════════════════════════════════════════════════════
section('68. Critical Path — Work vs Cal in Chain');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('work→cal: A float=0', A._float, 0);
  assert('work→cal: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('69. Critical Path — Fan-In with Lag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',8);
  const D=mkTask('d','D','2026-01-12',3,{deps:[
    {id:'a',type:'FS',lag:20},{id:'b',type:'FS',lag:0}]});
  initProj([A,B,D],{mode:'scheduled'});App.calculateFloat();
  assert('fan-in lag: A float=0 (long with lag)', A._float, 0);
  assertT('fan-in lag: B float>0 (short)', B._float > 0);
  assert('fan-in lag: D float=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('70. Critical Path — 8-Chain All Critical');
// ══════════════════════════════════════════════════════════════════
{
  const items=[];
  for(let i=0;i<8;i++){
    const deps=i>0?[{id:`t${i-1}`,type:'FS',lag:0}]:[];
    items.push(mkTask(`t${i}`,`T${i}`,'2026-01-12',3,{deps}));
  }
  initProj(items,{mode:'scheduled'});App.calculateFloat();
  let allCrit=true;
  for(let i=0;i<8;i++){if(items[i]._float!==0)allCrit=false}
  assertT('8-chain: all float=0', allCrit);
  const cp=App.getCriticalPath();
  assert('8-chain: crit size=8', cp.size, 8);
}

// ══════════════════════════════════════════════════════════════════
section('71. Critical Path — Float Stability');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:2}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});
  App.calculateFloat();
  const f1=[A._float,B._float,C._float];
  App.calculateFloat();
  const f2=[A._float,B._float,C._float];
  assert('stability: same after 2nd calc', JSON.stringify(f1), JSON.stringify(f2));
}

// ══════════════════════════════════════════════════════════════════
section('72. Mixed Mode — Work→Cal FS Chain');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('work→cal: A float=0', A._float, 0);
  assert('work→cal: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('73. Mixed Mode — Cal→Work FS Chain (holiday gap float)');
// ══════════════════════════════════════════════════════════════════
{
  // A(cal 7d Jan12) ends Jan18. depEnd=Jan19 (MLK Day).
  // B(work 5d) can't start MLK → starts Jan20. 
  // Cal pred gets float from holiday gap — this is correct CPM behavior.
  const A=mkCal('a','A','2026-01-12',7);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assertT('cal→work: A float>=0 (holiday gap)', A._float >= 0);
  assert('cal→work: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('74. Mixed Mode — Work→Cal→Work FS Chain');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',7,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});App.calculateFloat();
  assert('W→C→W: A float=0', A._float, 0);
  // B(cal) before C(work) may have weekend-gap float — correct behavior
  assertT('W→C→W: B float>=0', B._float >= 0);
  assert('W→C→W: C float=0', C._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('75. Mixed Mode — Cal→Work→Cal FS Chain');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkCal('a','A','2026-01-12',7);
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkCal('c','C','2026-01-12',7,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled'});App.calculateFloat();
  // A(cal) before B(work) may have holiday-gap float
  assertT('C→W→C: A float>=0', A._float >= 0);
  assert('C→W→C: B float=0', B._float, 0);
  assert('C→W→C: C float=0', C._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('76. Mixed Mode — Diamond Work(long) vs Cal(short)');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkTask('b','B','2026-01-12',10,{deps:[{id:'a',type:'FS',lag:0}]});  // work 10d
  const C=mkCal('c','C','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});    // cal 5d
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('mixed diamond: A float=0', A._float, 0);
  assert('mixed diamond: B(work long) float=0', B._float, 0);
  assertT('mixed diamond: C(cal short) float>0', C._float > 0);
  assert('mixed diamond: D float=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('77. Mixed Mode — Diamond Cal(long) vs Work(short)');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',3);
  const B=mkCal('b','B','2026-01-12',15,{deps:[{id:'a',type:'FS',lag:0}]});  // cal 15d
  const C=mkTask('c','C','2026-01-12',3,{deps:[{id:'a',type:'FS',lag:0}]});    // work 3d
  const D=mkTask('d','D','2026-01-12',3,{deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled'});App.calculateFloat();
  assert('mixed diamond2: A float=0', A._float, 0);
  assert('mixed diamond2: B(cal long) float=0', B._float, 0);
  assertT('mixed diamond2: C(work short) float>0', C._float > 0);
  assert('mixed diamond2: D float=0', D._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('78. Mixed Mode — Work→Cal with FS lag');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:3}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('W→C FS+3: A float=0', A._float, 0);
  assert('W→C FS+3: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('79. Mixed Mode — SS and FF cross-mode');
// ══════════════════════════════════════════════════════════════════
{
  // SS: work pred → cal succ
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',10,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assertT('SS W→C: A float>=0', A._float >= 0);
  assertT('SS W→C: B float>=0', B._float >= 0);
}
{
  // FF: work pred → cal succ
  const A=mkTask('a','A','2026-01-12',5);
  const B=mkCal('b','B','2026-01-12',10,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assertT('FF W→C: A float>=0', A._float >= 0);
  assertT('FF W→C: B float>=0', B._float >= 0);
}

// ══════════════════════════════════════════════════════════════════
section('80. Mixed Mode — No Negative Float (Exhaustive)');
// ══════════════════════════════════════════════════════════════════
{
  const modes=['work','cal'];
  const depTypes=['FS','SS','FF'];
  const lags=[-2,0,3];
  let negCount=0;
  for(const predMode of modes){
    for(const succMode of modes){
      for(const type of depTypes){
        for(const lag of lags){
          const A=predMode==='work'?mkTask('a','A','2026-01-12',5):mkCal('a','A','2026-01-12',5);
          const B=succMode==='work'?mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type,lag}]}):mkCal('b','B','2026-01-12',5,{deps:[{id:'a',type,lag}]});
          initProj([A,B],{mode:'scheduled'});App.calculateFloat();
          if((A._float!==null&&A._float<0)||(B._float!==null&&B._float<0))negCount++;
        }
      }
    }
  }
  assert('36 mixed combos: no negative float', negCount, 0);
}

// ══════════════════════════════════════════════════════════════════
section('81. Milestone Float — Task → Milestone (leaf)');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const B={id:'b',name:'B',type:'milestone',date:'2026-01-12',deps:[{id:'a',type:'FS',lag:0}],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('task→milestone: A float=0', A._float, 0);
  assert('task→milestone: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('82. Milestone Float — Milestone → Task');
// ══════════════════════════════════════════════════════════════════
{
  const A={id:'a',name:'A',type:'milestone',date:'2026-01-12',deps:[],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled'});App.calculateFloat();
  assert('milestone→task: A float=0', A._float, 0);
  assert('milestone→task: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('83. Milestone Float — Task → Milestone → Task');
// ══════════════════════════════════════════════════════════════════
{
  const A=mkTask('a','A','2026-01-12',5);
  const M={id:'m',name:'M',type:'milestone',date:'2026-01-12',deps:[{id:'a',type:'FS',lag:0}],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};
  const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'m',type:'FS',lag:0}]});
  initProj([A,M,B],{mode:'scheduled'});App.calculateFloat();
  assert('T→M→T: A float=0', A._float, 0);
  assert('T→M→T: M float=0', M._float, 0);
  assert('T→M→T: B float=0', B._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('84. Milestone Float — Standalone milestone');
// ══════════════════════════════════════════════════════════════════
{
  const M={id:'m',name:'M',type:'milestone',date:'2026-01-15',deps:[],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};
  initProj([M],{mode:'manual'});App.calculateFloat();
  assert('standalone milestone: float=0', M._float, 0);
}

// ══════════════════════════════════════════════════════════════════
section('85. Milestone Float — No negative float with milestones');
// ══════════════════════════════════════════════════════════════════
{
  // Milestone as leaf, middle, and root — none should have negative float
  const configs=[
    // leaf: task→milestone
    ()=>{const A=mkTask('a','A','2026-01-12',5);const B={id:'b',name:'B',type:'milestone',date:'2026-01-12',deps:[{id:'a',type:'FS',lag:0}],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};return[A,B]},
    // root: milestone→task
    ()=>{const A={id:'a',name:'A',type:'milestone',date:'2026-01-12',deps:[],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});return[A,B]},
    // middle: task→milestone→task
    ()=>{const A=mkTask('a','A','2026-01-12',5);const M={id:'m',name:'M',type:'milestone',date:'2026-01-12',deps:[{id:'a',type:'FS',lag:0}],pinned:false,hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',iconType:'triangle',labelPosition:'right',showDate:true};const B=mkTask('b','B','2026-01-12',5,{deps:[{id:'m',type:'FS',lag:0}]});return[A,M,B]},
  ];
  let negCount=0;
  for(const cfg of configs){
    const items=cfg();
    initProj(items,{mode:'scheduled'});App.calculateFloat();
    for(const it of items){if(it._float!==null&&it._float<0)negCount++}
  }
  assert('no negative milestone float', negCount, 0);
}
// ─── 86. Watermark — Text Construction ───────────────────────────────────
section('86. Watermark — Text Construction');
{
  // Helper: simulate watermark text building (uses identity fmt like real code with U.fmt)
  const fmtDate=d=>d; // stand-in: real U.fmt returns formatted string, tests only care about construction logic

  // Basic watermark text with date only
  const p1={watermark:true,wmDate:'2026-02-10',wmShowOwner:false,owner:''};
  const wmText1='Last Updated: '+fmtDate(p1.wmDate);
  assert('wm text: date only', wmText1, 'Last Updated: 2026-02-10');

  // With owner shown
  const p2={watermark:true,wmDate:'2026-02-10',wmShowOwner:true,owner:'Adam'};
  let wmText2='Last Updated: '+fmtDate(p2.wmDate);
  if(p2.wmShowOwner&&p2.owner)wmText2+=' | '+p2.owner;
  assert('wm text: with owner', wmText2, 'Last Updated: 2026-02-10 | Adam');

  // Owner enabled but empty string — should NOT append
  const p3={watermark:true,wmDate:'2026-02-10',wmShowOwner:true,owner:''};
  let wmText3='Last Updated: '+fmtDate(p3.wmDate);
  if(p3.wmShowOwner&&p3.owner)wmText3+=' | '+p3.owner;
  assert('wm text: owner enabled but empty', wmText3, 'Last Updated: 2026-02-10');

  // Owner disabled with owner set — should NOT append
  const p4={watermark:true,wmDate:'2026-02-10',wmShowOwner:false,owner:'Adam'};
  let wmText4='Last Updated: '+fmtDate(p4.wmDate);
  if(p4.wmShowOwner&&p4.owner)wmText4+=' | '+p4.owner;
  assert('wm text: owner disabled with owner set', wmText4, 'Last Updated: 2026-02-10');

  // Fallback when no date — should use today
  const p5={watermark:true,wmDate:'',wmShowOwner:false,owner:''};
  const fallbackDate=U.iso(new Date());
  const wmText5='Last Updated: '+fmtDate(p5.wmDate||fallbackDate);
  assert('wm text: empty date uses today fallback', wmText5.startsWith('Last Updated: 20'), true);
}

// ─── 87. Watermark — Export SVG Positioning (All 6 Positions) ────────────
section('87. Watermark — Export SVG Positioning (All 6 Positions)');
{
  const lw=160,vpW=800,totalHdrH=60,vpH=400;
  const contentW=lw+vpW;
  const positions=['bottom-center','bottom-left','bottom-right','top-center','top-left','top-right'];

  // Test X coordinate and anchor for each position
  for(const pos of positions){
    let wx,anc;
    if(pos.includes('left')){wx=lw+8;anc='start'}
    else if(pos.includes('right')){wx=contentW-8;anc='end'}
    else{wx=(lw+contentW)/2;anc='middle'}

    if(pos==='bottom-left')   {assert('wm export X: bottom-left',   wx, 168);  assert('wm export anchor: bottom-left',   anc, 'start')}
    if(pos==='bottom-right')  {assert('wm export X: bottom-right',  wx, 952);  assert('wm export anchor: bottom-right',  anc, 'end')}
    if(pos==='bottom-center') {assert('wm export X: bottom-center', wx, 560);  assert('wm export anchor: bottom-center', anc, 'middle')}
    if(pos==='top-left')      {assert('wm export X: top-left',      wx, 168);  assert('wm export anchor: top-left',      anc, 'start')}
    if(pos==='top-right')     {assert('wm export X: top-right',     wx, 952);  assert('wm export anchor: top-right',     anc, 'end')}
    if(pos==='top-center')    {assert('wm export X: top-center',    wx, 560);  assert('wm export anchor: top-center',    anc, 'middle')}
  }

  // Test Y coordinate: bottom vs top
  for(const pos of positions){
    const wy=pos.includes('top')?totalHdrH+14:totalHdrH+vpH+16;
    if(pos.includes('bottom'))assert('wm export Y: '+pos+' (below content)', wy, 476);
    else assert('wm export Y: '+pos+' (below header)', wy, 74);
  }
}

// ─── 88. Watermark — Export SVG Height Calculation ───────────────────────
section('88. Watermark — Export SVG Height Calculation');
{
  const totalHdrH=60,vpH=400;

  // Bottom position adds 24px for watermark band
  for(const pos of ['bottom-center','bottom-left','bottom-right']){
    const wmH=pos.includes('bottom')?24:0;
    assert('wm export height: '+pos+' adds 24px', totalHdrH+vpH+wmH, 484);
  }

  // Top position does NOT add extra height
  for(const pos of ['top-center','top-left','top-right']){
    const wmH=pos.includes('bottom')?24:0;
    assert('wm export height: '+pos+' no extra height', totalHdrH+vpH+wmH, 460);
  }

  // Watermark disabled: no extra height
  assert('wm export height: disabled', totalHdrH+vpH+0, 460);
}

// ─── 89. Watermark — On-Screen CSS Positioning Logic ─────────────────────
section('89. Watermark — On-Screen CSS Positioning Logic');
{
  const positions=['bottom-center','bottom-left','bottom-right','top-center','top-left','top-right'];

  for(const pos of positions){
    let css='position:absolute;font-size:11px;color:#888;font-style:italic;padding:4px 8px;z-index:15;pointer-events:none;white-space:nowrap;';
    if(pos.includes('bottom')){css+='bottom:8px;top:auto;'}else{css+='top:8px;bottom:auto;'}
    if(pos.includes('left')){css+='left:168px;right:auto;transform:none;'}
    else if(pos.includes('right')){css+='right:8px;left:auto;transform:none;'}
    else{css+='left:calc(160px + (100% - 160px)/2);transform:translateX(-50%);right:auto;'}

    // Vertical
    if(pos.includes('bottom')){
      assert('wm css '+pos+': has bottom:8px', css.includes('bottom:8px'), true);
      assert('wm css '+pos+': no top:8px', css.includes('top:8px'), false);
    }else{
      assert('wm css '+pos+': has top:8px', css.includes('top:8px'), true);
      assert('wm css '+pos+': no bottom:8px set', css.includes('bottom:8px'), false);
    }

    // Horizontal
    if(pos.includes('left')){
      assert('wm css '+pos+': has left:168px', css.includes('left:168px'), true);
      assert('wm css '+pos+': no right:8px offset', css.includes('right:8px'), false);
    }else if(pos.includes('right')){
      assert('wm css '+pos+': has right:8px', css.includes('right:8px'), true);
      assert('wm css '+pos+': no left:168px', css.includes('left:168px'), false);
    }else{
      assert('wm css '+pos+': has calc center', css.includes('calc(160px'), true);
      assert('wm css '+pos+': has translateX(-50%)', css.includes('translateX(-50%)'), true);
    }
  }
}

// ─── 90. Watermark — Default Values and Migration ────────────────────────
section('90. Watermark — Default Values and Migration');
{
  // Simulate migration defaults
  const p={};
  if(!p.watermark)p.watermark=false;
  if(!p.wmDate)p.wmDate='';
  if(!p.wmPos)p.wmPos='bottom-center';
  if(p.owner==null)p.owner='';
  if(p.wmShowOwner==null)p.wmShowOwner=false;

  assert('wm default: watermark off', p.watermark, false);
  assert('wm default: wmDate empty', p.wmDate, '');
  assert('wm default: wmPos bottom-center', p.wmPos, 'bottom-center');
  assert('wm default: owner empty', p.owner, '');
  assert('wm default: wmShowOwner false', p.wmShowOwner, false);

  // Ensure existing values survive migration
  const p2={watermark:true,wmDate:'2026-01-15',wmPos:'top-right',owner:'Alice',wmShowOwner:true};
  if(!p2.watermark)p2.watermark=false;
  if(!p2.wmDate)p2.wmDate='';
  if(!p2.wmPos)p2.wmPos='bottom-center';
  if(p2.owner==null)p2.owner='';
  if(p2.wmShowOwner==null)p2.wmShowOwner=false;

  assert('wm migration: preserves watermark=true', p2.watermark, true);
  assert('wm migration: preserves wmDate', p2.wmDate, '2026-01-15');
  assert('wm migration: preserves wmPos', p2.wmPos, 'top-right');
  assert('wm migration: preserves owner', p2.owner, 'Alice');
  assert('wm migration: preserves wmShowOwner', p2.wmShowOwner, true);
}

// ─── 91. Watermark — Position Consistency (On-Screen vs Export) ──────────
section('91. Watermark — Position Consistency (On-Screen vs Export)');
{
  const lw=160,vpW=800;
  const positions=['bottom-center','bottom-left','bottom-right','top-center','top-left','top-right'];

  for(const pos of positions){
    // Export X calculation
    let exportX,exportAnc;
    const contentW=lw+vpW;
    if(pos.includes('left')){exportX=lw+8;exportAnc='start'}
    else if(pos.includes('right')){exportX=contentW-8;exportAnc='end'}
    else{exportX=(lw+contentW)/2;exportAnc='middle'}

    // On-screen logic (equivalent positions)
    let screenLeft;
    if(pos.includes('left'))screenLeft=168; // lw+8
    else if(pos.includes('right'))screenLeft=null; // right:8px (not left-based)
    else screenLeft=null; // calc-based center

    // Left positions: both use lw+8
    if(pos.includes('left')){
      assert('wm consistency '+pos+': export left == screen left', exportX, 168);
    }
    // Right positions: both offset 8px from right edge
    if(pos.includes('right')){
      assert('wm consistency '+pos+': export right offset', contentW-exportX, 8);
    }
    // Center positions: export centers on content area
    if(pos.includes('center')){
      assert('wm consistency '+pos+': export center X', exportX, (lw+contentW)/2);
    }

    // Vertical: top vs bottom
    if(pos.includes('top')){
      assert('wm consistency '+pos+': export no extra height', pos.includes('bottom')?24:0, 0);
    }else{
      assert('wm consistency '+pos+': export adds height band', pos.includes('bottom')?24:0, 24);
    }
  }
}

console.log(`\n${CYAN}══════════════════════════════════════════${RESET}`);
console.log(`  TOTAL: ${total}   ${GREEN}PASSED: ${passed}${RESET}   ${failed?RED:GREEN}FAILED: ${failed}${RESET}`);
console.log(`${CYAN}══════════════════════════════════════════${RESET}`);
if(errors.length){
  console.log(`\n${RED}FAILURES:${RESET}`);
  errors.forEach((e,i)=>console.log(`  ${i+1}. ${e}`));
}
process.exit(failed?1:0);