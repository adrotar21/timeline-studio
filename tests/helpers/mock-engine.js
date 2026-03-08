/**
 * Timeline Studio — Consolidated App + U Mock Engine
 * Extracted from test_comprehensive.js and test_expanded.js
 * Single source of truth for all test mocks.
 */

// ─── Utilities ────────────────────────────────────────────────────────────
const U={
  id(){return 'id_'+Math.random().toString(36).slice(2,9)},
  iso(d){return d instanceof Date?d.toISOString().slice(0,10):d},
  addDays(s,n){const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return U.iso(d)},
  days(a,b){return Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5)},
  dow(s){return new Date(s+'T12:00:00').getDay()},
  dayName(s){return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][U.dow(s)]},
  isWeekend(s){const d=U.dow(s);return d===0||d===6},
  clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))},
  deep(o){return JSON.parse(JSON.stringify(o))},
  esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')},
  fmt(d){return d},
  fmtDur(s,e,f){return''},
  parseDate(s){return null},
};

// ─── Holiday Sets ─────────────────────────────────────────────────────────
const HOLIDAYS_MLK=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
const HOLIDAYS_MLK_GOODFRI=[
  {name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true},
  {name:'Good Friday',start:'2026-04-03',end:'2026-04-03',schedAround:true},
];
const HOLIDAYS_XMAS=[
  {name:'Christmas',start:'2025-12-25',end:'2025-12-26',schedAround:true},
];

// ─── App Mock ─────────────────────────────────────────────────────────────
const App={
  proj:null,
  gi(id){return this.proj.items.find(i=>i.id===id)},
  gs(id){return this.proj.swimlanes.find(s=>s.id===id)},
  depId(d){return typeof d==='string'?d:d.id},
  depLag(d){return typeof d==='object'?d.lag||0:0},
  depType(d){return typeof d==='object'?d.type||'FS':'FS'},
  snap(){}, sched(){}, autoSave(){}, toast(){}, closePanel(){},

  _getStatusDef(statusId){
    if(!statusId||statusId==='blank')return null;
    return(this.proj.statusDefs||[]).find(sd=>sd.id===statusId)||null;
  },

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
  _startFromRequiredEnd(item,reqEnd,dm){
    if(!reqEnd)return null;
    if(item.type==='milestone'){
      return dm!=='cal'?this._addLagWorkingDays(reqEnd,-1,dm):U.addDays(reqEnd,-1);
    }
    return dm!=='cal'?this._subtractWorkingDays(reqEnd,item.duration||0):U.addDays(reqEnd,-(item.duration||0));
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
      if(it.type==='task'&&it.startDate&&it.duration){
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
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);cand=this._startFromRequiredEnd(item,reqEnd,dm)}}
      else if(type==='SF'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart){const reqEnd=this._addLagWorkingDays(pStart,lag,dm);cand=this._startFromRequiredEnd(item,reqEnd,dm)}}
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
        else if(type==='SF'){const pStart=pred.type==='task'?pred.startDate:pred.date;const iEnd=this._depEnd(item);if(pStart&&iEnd&&iEnd<this._addLagWorkingDays(pStart,lag,dm))violated.add(item.id);continue}
        if(required){const curStart=item.type==='task'?item.startDate:item.date;
          if(curStart&&curStart<required)violated.add(item.id)}
      }
    }
    return violated
  },
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
    const queue=[...ids.filter(id=>(inDeg.get(id)||0)===0)];
    const order=[];
    while(queue.length){const id=queue.shift();order.push(id);
      for(const n of adj.get(id)||[]){inDeg.set(n,(inDeg.get(n)||0)-1);if(inDeg.get(n)===0)queue.push(n)}}
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
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);candidate=this._startFromRequiredEnd(item,reqEnd,dm)}}
      else if(type==='SF'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart){const reqEnd=this._addLagWorkingDays(pStart,lag,dm);candidate=this._startFromRequiredEnd(item,reqEnd,dm)}}
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
      if(dryRun){changes.push({id,name:it.name,oldStart:curStart,newStart:earliest})}
      else{
        if(it.type==='task'){it.startDate=earliest;it.endDate=this._calcEndDate(it)}
        else it.date=earliest;
        applied++
      }
    }
    return dryRun?changes:applied
  },
  runSchedule(){
    if(this.proj.schedulingMode!=='scheduled')return;
    for(const it of this.proj.items){if(it.type==='task'&&it.startDate&&it.duration)it.endDate=this._calcEndDate(it)}
    for(let pass=0;pass<5;pass++){
      const n=this._runSchedulePass(false);
      if(n===0)break;
    }
  },
  calculateFloat(){
    const items=this.proj.items;
    for(const it of items){if(it.type==='task'&&it.startDate&&it.duration)it.endDate=this._calcEndDate(it)}
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
      let minLF=null;let minLS=null;
      if(succs.length){
        for(const s of succs){const sls=ls.get(s.id);if(!sls)continue;
          const link=s.deps.find(d=>this.depId(d)===id);if(!link)continue;
          const type=this.depType(link),lag=this.depLag(link);
          const sdm=s.type==='task'?(s.durMode||'cal'):'work';
          if(type==='FS'){
            const pEF=ef.get(id);
            if(pEF){let fwdContrib=this._addLagWorkingDays(pEF,lag,sdm);
              if(fwdContrib&&this.proj.scheduleAroundNonWorking&&sdm==='work')fwdContrib=this._skipNonWorking(fwdContrib);
              const cand=fwdContrib?U.addDays(pEF,U.days(fwdContrib,sls)):null;
              if(cand&&(!minLF||cand<minLF))minLF=cand}
          }else if(type==='SS'){
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!minLS||cand<minLS))minLS=cand;
          }else if(type==='FF'){
            const pEF=ef.get(id);
            if(pEF){let fwdContrib=this._addLagWorkingDays(pEF,lag,sdm);
              if(fwdContrib&&this.proj.scheduleAroundNonWorking&&sdm==='work')fwdContrib=this._skipNonWorking(fwdContrib);
              const sDur=s.type==='task'?Math.max(0,s.duration||0):0;
              let sLF;
              if(s.type==='task'&&this.proj.scheduleAroundNonWorking&&(s.durMode||'cal')!=='cal'){
                const sEndIncl=this._addWorkingDays(sls,sDur);
                sLF=U.addDays(sEndIncl,1);
              }else{sLF=U.addDays(sls,sDur)}
              const cand=fwdContrib?U.addDays(pEF,U.days(fwdContrib,sLF)):null;
              if(cand&&(!minLF||cand<minLF))minLF=cand}
          }else if(type==='SF'){
            const sLF=lf.get(s.id);
            if(sLF){const cand=this._addLagWorkingDays(sLF,-lag,sdm);
              if(cand&&(!minLS||cand<minLS))minLS=cand}
          }
        }
      }
      lf.set(id,minLF||projEnd);
      const lfVal=lf.get(id);let lsVal;
      if(it.type==='task'&&this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')!=='cal'){
        lsVal=this._subtractWorkingDays(lfVal,dur);
      }else{lsVal=U.addDays(lfVal,-dur)}
      if(minLS&&minLS<lsVal)lsVal=minLS;
      if(it.type==='milestone')lsVal=U.addDays(lsVal,-1);
      ls.set(id,lsVal)}
    for(const it of items){
      const e=es.get(it.id),l=ls.get(it.id);
      if(e&&l)it._float=U.days(e,l);
      else it._float=null}
  },
  _critPath:false,
  toggleCritPath(){this._critPath=!this._critPath},
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
  hasCycle(itemId,predId){
    const visited=new Set();
    const queue=[itemId];
    while(queue.length){
      const id=queue.shift();
      if(id===predId)return true;
      if(visited.has(id))continue;
      visited.add(id);
      for(const it of this.proj.items){
        for(const d of it.deps||[]){
          if(this.depId(d)===id)queue.push(it.id);
        }
      }
    }
    return false;
  },
};

// ─── Reset helper ─────────────────────────────────────────────────────────
function resetApp(proj){App.proj=proj;return App}

module.exports={U,App,resetApp,HOLIDAYS_MLK,HOLIDAYS_MLK_GOODFRI,HOLIDAYS_XMAS};
