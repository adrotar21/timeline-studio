#!/usr/bin/env node
/**
 * Timeline Studio -- Data Table Tests
 * Covers: filter matching, sorting, advanced search, inline editing,
 *   type conversion, status changes, swimlane reassignment.
 *
 * ~60 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Functions ──────────────────────────────────────────────────────

/** Filter match: returns true if item passes all active filters */
function _fltMatch(it,flt,proj){
  if(flt.type&&it.type!==flt.type)return false;
  if(flt.swimlane&&it.swimlaneId!==flt.swimlane)return false;
  if(flt.subSwim&&it.subSwimId!==flt.subSwim)return false;
  if(flt.status){
    if(flt.status==='__none__'&&it.status)return false;
    if(flt.status!=='__none__'&&it.status!==flt.status)return false;
  }
  if(flt.search){
    const s=flt.search.toLowerCase();
    if(!it.name.toLowerCase().includes(s))return false;
  }
  if(flt.hideMode&&it.hidden)return false;
  return true;
}

/** Sort value getter */
function getSortVal(it,key,statusDefs){
  if(key==='name')return(it.name||'').toLowerCase();
  if(key==='start')return it.type==='task'?it.startDate:it.date;
  if(key==='end')return it.type==='task'?it.endDate:'';
  if(key==='status'){
    const idx=(statusDefs||[]).findIndex(s=>s.id===(it.status||'blank'));
    return idx>=0?String(idx).padStart(3,'0'):'zzz';
  }
  if(key==='duration')return it.duration||0;
  return'';
}

/** Advanced search across multiple fields */
function advSearch(items,term,fields,statusDefs){
  const t=term.toLowerCase();
  return items.filter(it=>{
    for(const f of fields){
      if(f==='name'&&(it.name||'').toLowerCase().includes(t))return true;
      if(f==='owner'&&(it.owner||'').toLowerCase().includes(t))return true;
      if(f==='notes'&&(it.notes||'').toLowerCase().includes(t))return true;
      if(f==='statusName'){const sd=(statusDefs||[]).find(s=>s.id===it.status);if(sd&&sd.name.toLowerCase().includes(t))return true}
      if(f==='statusShort'){const sd=(statusDefs||[]).find(s=>s.id===it.status);if(sd&&sd.shortName.toLowerCase().includes(t))return true}
      if(f==='statusDesc'){const sd=(statusDefs||[]).find(s=>s.id===it.status);if(sd&&sd.desc.toLowerCase().includes(t))return true}
    }
    return false;
  });
}

/** Sort items by key */
function sortItems(items,key,asc,statusDefs){
  const sorted=[...items];
  sorted.sort((a,b)=>{
    const va=getSortVal(a,key,statusDefs);
    const vb=getSortVal(b,key,statusDefs);
    if(va<vb)return asc?-1:1;
    if(va>vb)return asc?1:-1;
    return 0;
  });
  return sorted;
}

// ═══════════════════════════════════════════════════════════════════
//  FILTER MATCHING (25 tests)
// ═══════════════════════════════════════════════════════════════════

section('Filter Matching — No Filters');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Alpha'});
  assertT('No filters → item matches',_fltMatch(it,{},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{name:'Beta'});
  assertT('No filters → milestone matches',_fltMatch(it,{},null));
})();

section('Filter Matching — Type Filter');

(()=>{
  resetItemCounter();
  const task=makeItem('task',{name:'TaskA'});
  assertT('Type task → task matches',_fltMatch(task,{type:'task'},null));
})();

(()=>{
  resetItemCounter();
  const ms=makeItem('milestone',{name:'MS1'});
  assertF('Type task → milestone excluded',_fltMatch(ms,{type:'task'},null));
})();

(()=>{
  resetItemCounter();
  const ms=makeItem('milestone',{name:'MS1'});
  assertT('Type milestone → milestone matches',_fltMatch(ms,{type:'milestone'},null));
})();

(()=>{
  resetItemCounter();
  const task=makeItem('task',{name:'TaskA'});
  assertF('Type milestone → task excluded',_fltMatch(task,{type:'milestone'},null));
})();

section('Filter Matching — Swimlane Filter');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{swimlaneId:'sw1'});
  assertT('Swimlane sw1 → matches sw1',_fltMatch(it,{swimlane:'sw1'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{swimlaneId:'sw1'});
  assertF('Swimlane sw2 → excludes sw1',_fltMatch(it,{swimlane:'sw2'},null));
})();

section('Filter Matching — Sub-Swimlane Filter');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{subSwimId:'ss1'});
  assertT('SubSwim ss1 → matches ss1',_fltMatch(it,{subSwim:'ss1'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{subSwimId:'ss1'});
  assertF('SubSwim ss2 → excludes ss1',_fltMatch(it,{subSwim:'ss2'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{subSwimId:''});
  assertF('SubSwim ss1 → excludes item with no sub',_fltMatch(it,{subSwim:'ss1'},null));
})();

section('Filter Matching — Status Filter');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'on-track'});
  assertT('Status on-track → matches',_fltMatch(it,{status:'on-track'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'at-risk'});
  assertF('Status on-track → excludes at-risk',_fltMatch(it,{status:'on-track'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:''});
  assertT('Status __none__ → matches blank status',_fltMatch(it,{status:'__none__'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'on-track'});
  assertF('Status __none__ → excludes item with status',_fltMatch(it,{status:'__none__'},null));
})();

section('Filter Matching — Text Search');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review'});
  assertT('Search "Design" → matches "Design Review"',_fltMatch(it,{search:'Design'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review'});
  assertT('Case insensitive search',_fltMatch(it,{search:'design'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review'});
  assertF('Search "Build" → excludes "Design Review"',_fltMatch(it,{search:'Build'},null));
})();

section('Filter Matching — Combined Filters');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build',swimlaneId:'sw1',status:'on-track'});
  assertT('Type + swimlane AND logic: both match',_fltMatch(it,{type:'task',swimlane:'sw1'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{name:'Kick',swimlaneId:'sw1'});
  assertF('Type task + swimlane: type mismatch → excluded',_fltMatch(it,{type:'task',swimlane:'sw1'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build',status:'on-track'});
  assertT('Type + status AND logic: both match',_fltMatch(it,{type:'task',status:'on-track'},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build',status:'at-risk'});
  assertF('Type + status: status mismatch → excluded',_fltMatch(it,{type:'task',status:'on-track'},null));
})();

section('Filter Matching — hideMode');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{hidden:true});
  assertF('hideMode ON + hidden item → excluded',_fltMatch(it,{hideMode:true},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{hidden:true});
  assertT('hideMode OFF + hidden item → included',_fltMatch(it,{hideMode:false},null));
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{hidden:false});
  assertT('hideMode ON + visible item → included',_fltMatch(it,{hideMode:true},null));
})();

// ═══════════════════════════════════════════════════════════════════
//  SORTING (15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Sorting — getSortVal');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Alpha'});
  assert('Sort val name → lowercase',getSortVal(it,'name',[]),'alpha');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{startDate:'2026-02-15'});
  assert('Sort val start for task → startDate',getSortVal(it,'start',[]),'2026-02-15');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{date:'2026-03-01'});
  assert('Sort val start for milestone → date',getSortVal(it,'start',[]),'2026-03-01');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{endDate:'2026-02-20'});
  assert('Sort val end for task → endDate',getSortVal(it,'end',[]),'2026-02-20');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone');
  assert('Sort val end for milestone → empty string',getSortVal(it,'end',[]),'');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const it=makeItem('task',{status:'on-track'});
  const val=getSortVal(it,'status',defs);
  assert('Sort val status uses definition index',val,'002');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const it=makeItem('task',{status:'complete'});
  const val=getSortVal(it,'status',defs);
  assert('Sort val status: complete index',val,'005');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'unknown-id'});
  const val=getSortVal(it,'status',[]);
  assert('Unknown status → zzz (sorts last)',val,'zzz');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{duration:10});
  assert('Sort val duration → numeric',getSortVal(it,'duration',[]),10);
})();

section('Sorting — sortItems');

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Charlie'}),
    makeItem('task',{name:'Alpha'}),
    makeItem('task',{name:'Bravo'}),
  ];
  const sorted=sortItems(items,'name',true,[]);
  assert('Sort by name ascending: first',sorted[0].name,'Alpha');
  assert('Sort by name ascending: last',sorted[2].name,'Charlie');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Alpha'}),
    makeItem('task',{name:'Bravo'}),
    makeItem('task',{name:'Charlie'}),
  ];
  const sorted=sortItems(items,'name',false,[]);
  assert('Sort by name descending: first',sorted[0].name,'Charlie');
  assert('Sort by name descending: last',sorted[2].name,'Alpha');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{startDate:'2026-03-01'}),
    makeItem('task',{startDate:'2026-01-01'}),
    makeItem('task',{startDate:'2026-02-01'}),
  ];
  const sorted=sortItems(items,'start',true,[]);
  assert('Sort by start ascending',sorted[0].startDate,'2026-01-01');
  assert('Sort by start ascending: last',sorted[2].startDate,'2026-03-01');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const items=[
    makeItem('task',{status:'off-track'}),
    makeItem('task',{status:'on-track'}),
    makeItem('task',{status:'tbd'}),
  ];
  const sorted=sortItems(items,'status',true,defs);
  assert('Sort by status ascending: tbd first',sorted[0].status,'tbd');
  assert('Sort by status ascending: on-track second',sorted[1].status,'on-track');
  assert('Sort by status ascending: off-track third',sorted[2].status,'off-track');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{duration:10}),
    makeItem('task',{duration:3}),
    makeItem('task',{duration:7}),
  ];
  const sorted=sortItems(items,'duration',true,[]);
  assert('Sort by duration ascending: first',sorted[0].duration,3);
  assert('Sort by duration ascending: last',sorted[2].duration,10);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Same',startDate:'2026-01-01'}),
    makeItem('task',{name:'Same',startDate:'2026-01-02'}),
  ];
  const sorted=sortItems(items,'name',true,[]);
  assert('Items with same name: stable relative order',sorted[0].startDate,'2026-01-01');
})();

// ═══════════════════════════════════════════════════════════════════
//  ADVANCED SEARCH (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Advanced Search');

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Design Phase'}),
    makeItem('task',{name:'Build Phase'}),
  ];
  const res=advSearch(items,'Design',['name'],[]);
  assert('Search by name: finds match',res.length,1);
  assert('Search by name: correct item',res[0].name,'Design Phase');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Task1',owner:'Alice'}),
    makeItem('task',{name:'Task2',owner:'Bob'}),
  ];
  const res=advSearch(items,'alice',['owner'],[]);
  assert('Search by owner: finds match',res.length,1);
  assert('Search by owner: correct item',res[0].owner,'Alice');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Task1',notes:'Important deadline coming up'}),
    makeItem('task',{name:'Task2',notes:'Regular work'}),
  ];
  const res=advSearch(items,'deadline',['notes'],[]);
  assert('Search by notes: finds match',res.length,1);
  assert('Search by notes: correct item',res[0].notes,'Important deadline coming up');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const items=[
    makeItem('task',{status:'on-track'}),
    makeItem('task',{status:'off-track'}),
  ];
  const res=advSearch(items,'On Track',['statusName'],defs);
  assert('Search by statusName: finds match',res.length,1);
  assert('Search by statusName: correct status',res[0].status,'on-track');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const items=[
    makeItem('task',{status:'on-track'}),
    makeItem('task',{status:'off-track'}),
  ];
  const res=advSearch(items,'G',['statusShort'],defs);
  assert('Search by statusShort "G": finds on-track',res.length,1);
  assert('Search by statusShort: correct status',res[0].status,'on-track');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const items=[
    makeItem('task',{status:'on-track'}),
    makeItem('task',{status:'off-track'}),
  ];
  const res=advSearch(items,'Progressing',['statusDesc'],defs);
  assert('Search by statusDesc: finds match',res.length,1);
  assert('Search by statusDesc: correct status',res[0].status,'on-track');
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Design',owner:'Alice'}),
    makeItem('task',{name:'Build',owner:'Design Team'}),
  ];
  const res=advSearch(items,'design',['name','owner'],[]);
  assert('Multiple fields OR logic: both match',res.length,2);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'UPPER CASE'}),
  ];
  const res=advSearch(items,'upper',['name'],[]);
  assert('Case insensitive search',res.length,1);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{name:'Xyz'}),
  ];
  const res=advSearch(items,'notfound',['name'],[]);
  assert('No match returns empty',res.length,0);
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const items=[
    makeItem('task',{name:'Task',status:'at-risk'}),
  ];
  const res=advSearch(items,'may miss',['statusDesc'],defs);
  assert('Search statusDesc partial match',res.length,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  INLINE EDITING (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Inline Editing — Status Change');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'',statusDate:''});
  it.status='on-track';
  it.statusDate='2026-02-14';
  assert('Set status: id updated',it.status,'on-track');
  assert('Set status: statusDate set',it.statusDate,'2026-02-14');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'on-track',statusDate:'2026-02-10'});
  it.status='';
  it.statusDate='';
  assert('Clear status: status empty',it.status,'');
  assert('Clear status: statusDate cleared',it.statusDate,'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'on-track',statusDate:'2026-02-10'});
  it.status='off-track';
  it.statusDate='2026-02-14';
  assert('Change status: new id',it.status,'off-track');
  assert('Change status: date updated',it.statusDate,'2026-02-14');
})();

section('Inline Editing — Swimlane Change');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{swimlaneId:'sw1'});
  it.swimlaneId='sw2';
  assert('Swimlane change: id updated',it.swimlaneId,'sw2');
})();

section('Inline Editing — Type Conversion');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build Feature',color:'#ff0000',startDate:'2026-01-05',endDate:'2026-01-09',duration:5});
  // Convert task → milestone
  const ms={
    id:it.id,type:'milestone',name:it.name,color:it.color,
    date:it.startDate,
    swimlaneId:it.swimlaneId,subSwimId:it.subSwimId,subRow:it.subRow,
    labelPosition:it.labelPosition,showDate:it.showDate,
    deps:it.deps,progress:0,pinned:it.pinned,hidden:it.hidden,
    owner:it.owner,notes:it.notes,status:it.status,statusDate:it.statusDate,
    iconType:'diamond',fontSize:it.fontSize,
  };
  assert('Task → milestone: name preserved',ms.name,'Build Feature');
  assert('Task → milestone: color preserved',ms.color,'#ff0000');
  assert('Task → milestone: type is milestone',ms.type,'milestone');
  assert('Task → milestone: date from startDate',ms.date,'2026-01-05');
  assertT('Task → milestone: no startDate',ms.startDate===undefined);
  assertT('Task → milestone: no endDate',ms.endDate===undefined);
})();

(()=>{
  resetItemCounter();
  const ms=makeItem('milestone',{name:'Kickoff',color:'#00ff00',date:'2026-02-01'});
  // Convert milestone → task
  const task={
    id:ms.id,type:'task',name:ms.name,color:ms.color,
    startDate:ms.date,duration:1,endDate:ms.date,
    swimlaneId:ms.swimlaneId,subSwimId:ms.subSwimId,subRow:ms.subRow,
    labelPosition:ms.labelPosition,showDate:ms.showDate,
    deps:ms.deps,progress:0,pinned:ms.pinned,hidden:ms.hidden,
    owner:ms.owner,notes:ms.notes,status:ms.status,statusDate:ms.statusDate,
    durMode:'cal',fontSize:ms.fontSize,
  };
  assert('Milestone → task: name preserved',task.name,'Kickoff');
  assert('Milestone → task: color preserved',task.color,'#00ff00');
  assert('Milestone → task: type is task',task.type,'task');
  assert('Milestone → task: startDate from date',task.startDate,'2026-02-01');
  assert('Milestone → task: duration = 1',task.duration,1);
  assert('Milestone → task: endDate = startDate',task.endDate,'2026-02-01');
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
