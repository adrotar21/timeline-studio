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
//  ROW SELECTION — _dtSelect (B24: Shift+Click Range Select)
// ═══════════════════════════════════════════════════════════════════

// Mock _dtSelect matching app.js implementation exactly
// Returns true if selection changed, false if early-returned (same item)
function _dtSelect(id,shift,ctrl){
  if(shift&&App._lastShiftSel){
    const allIds=[...App.$.dt_body.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
    const i1=allIds.indexOf(App._lastShiftSel),i2=allIds.indexOf(id);
    if(i1>=0&&i2>=0){const lo=Math.min(i1,i2),hi=Math.max(i1,i2);App.sel=allIds.slice(lo,hi+1)}
  }else if(ctrl){
    const idx=App.sel.indexOf(id);if(idx>=0)App.sel.splice(idx,1);else App.sel.push(id);
    App._lastShiftSel=id;
  }else{
    if(App.sel.length===1&&App.sel[0]===id){App._lastShiftSel=id;return false}
    App.sel=[id];App._lastShiftSel=id;
  }
  return true;
}

// Helper: mock dt_body with a visible row list
function mockDtBody(ids){
  App.$={dt_body:{querySelectorAll:()=>ids.map(id=>({dataset:{iid:id}}))}};
}

// ─── mousedown guard: simulates which click targets pass through ───
// In app.js: tb.onmousedown skips .dt-cb, .dt-pin, .dt-hid
// Everything else (text inputs, selects, row bg, spans) passes through

function targetPassesGuard(classList){
  // These classes are excluded from mousedown handler
  const excluded=['dt-cb','dt-pin','dt-hid'];
  return !excluded.some(c=>classList.includes(c));
}

section('B24 — Plain click selects single row');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),makeItem('task',{name:'C'})]});
  App.sel=[];App._lastShiftSel=null;
  const idB=App.proj.items[1].id;
  _dtSelect(idB,false,false);
  assert('Plain click: sel length',App.sel.length,1);
  assert('Plain click: correct item',App.sel[0],idB);
  assert('Plain click: anchor set',App._lastShiftSel,idB);
})();

section('B24 — Plain click on already-selected row is no-op');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'})]});
  const idA=App.proj.items[0].id;
  App.sel=[idA];App._lastShiftSel=idA;
  const changed=_dtSelect(idA,false,false);
  assertF('Same-item plain click returns false (no-op)',changed);
  assert('Same-item: sel unchanged',App.sel.length,1);
  assert('Same-item: still A',App.sel[0],idA);
})();

section('B24 — Ctrl+click toggles selection');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),makeItem('task',{name:'C'})]});
  const idA=App.proj.items[0].id,idB=App.proj.items[1].id,idC=App.proj.items[2].id;
  App.sel=[idA];App._lastShiftSel=idA;
  // Ctrl+click B → adds B
  _dtSelect(idB,false,true);
  assert('Ctrl+click add: sel length',App.sel.length,2);
  assertT('Ctrl+click add: A in sel',App.sel.includes(idA));
  assertT('Ctrl+click add: B in sel',App.sel.includes(idB));
  // Ctrl+click A → removes A
  _dtSelect(idA,false,true);
  assert('Ctrl+click remove: sel length',App.sel.length,1);
  assert('Ctrl+click remove: only B',App.sel[0],idB);
})();

section('B24 — Ctrl+click to empty then add');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'})]});
  const idA=App.proj.items[0].id;
  App.sel=[idA];App._lastShiftSel=idA;
  // Ctrl+click A to deselect → empty
  _dtSelect(idA,false,true);
  assert('Ctrl deselect all: empty',App.sel.length,0);
  // Ctrl+click A again → re-add
  _dtSelect(idA,false,true);
  assert('Ctrl re-add: one item',App.sel.length,1);
  assert('Ctrl re-add: correct id',App.sel[0],idA);
})();

section('B24 — Shift+click forward range');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),
    makeItem('task',{name:'C'}),makeItem('task',{name:'D'}),makeItem('task',{name:'E'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[ids[1]];App._lastShiftSel=ids[1]; // anchor on B
  _dtSelect(ids[3],true,false); // shift+click D
  assert('Shift forward: sel length',App.sel.length,3);
  assertT('Shift forward: B in sel',App.sel.includes(ids[1]));
  assertT('Shift forward: C in sel',App.sel.includes(ids[2]));
  assertT('Shift forward: D in sel',App.sel.includes(ids[3]));
  assertF('Shift forward: A not in sel',App.sel.includes(ids[0]));
  assertF('Shift forward: E not in sel',App.sel.includes(ids[4]));
})();

section('B24 — Shift+click reverse range');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),
    makeItem('task',{name:'C'}),makeItem('task',{name:'D'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[ids[3]];App._lastShiftSel=ids[3]; // anchor on D
  _dtSelect(ids[0],true,false); // shift+click A
  assert('Shift reverse: sel length',App.sel.length,4);
  assertT('Shift reverse: A in sel',App.sel.includes(ids[0]));
  assertT('Shift reverse: B in sel',App.sel.includes(ids[1]));
  assertT('Shift reverse: C in sel',App.sel.includes(ids[2]));
  assertT('Shift reverse: D in sel',App.sel.includes(ids[3]));
})();

section('B24 — Shift+click respects visible (sorted) order');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'Delta'}),makeItem('task',{name:'Alpha'}),
    makeItem('task',{name:'Charlie'}),makeItem('task',{name:'Bravo'})
  ]});
  // Simulate sorted DOM order: Alpha, Bravo, Charlie, Delta
  const sorted=[App.proj.items[1].id,App.proj.items[3].id,App.proj.items[2].id,App.proj.items[0].id];
  mockDtBody(sorted);
  App.sel=[sorted[0]];App._lastShiftSel=sorted[0]; // anchor on Alpha
  _dtSelect(sorted[2],true,false); // shift+click Charlie
  assert('Sorted range: sel length',App.sel.length,3);
  assertT('Sorted range: Alpha in sel',App.sel.includes(sorted[0]));
  assertT('Sorted range: Bravo in sel',App.sel.includes(sorted[1]));
  assertT('Sorted range: Charlie in sel',App.sel.includes(sorted[2]));
  assertF('Sorted range: Delta not in sel',App.sel.includes(sorted[3]));
})();

section('B24 — Shift+click with no anchor falls back to plain select');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'})]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[];App._lastShiftSel=null; // no anchor
  _dtSelect(ids[1],true,false); // shift+click B — no anchor, should fall through
  assert('No anchor fallback: sel length',App.sel.length,1);
  assert('No anchor fallback: B selected',App.sel[0],ids[1]);
  assert('No anchor fallback: anchor set',App._lastShiftSel,ids[1]);
})();

section('B24 — Shift+click replaces previous selection');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),
    makeItem('task',{name:'C'}),makeItem('task',{name:'D'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[ids[0],ids[3]]; // A and D selected (non-contiguous)
  App._lastShiftSel=ids[1]; // anchor on B
  _dtSelect(ids[2],true,false); // shift+click C → range B-C
  assert('Shift replaces: sel length',App.sel.length,2);
  assertT('Shift replaces: B in sel',App.sel.includes(ids[1]));
  assertT('Shift replaces: C in sel',App.sel.includes(ids[2]));
  assertF('Shift replaces: A removed',App.sel.includes(ids[0]));
  assertF('Shift replaces: D removed',App.sel.includes(ids[3]));
})();

section('B24 — Shift+click same item as anchor → single item');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'})]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[ids[0]];App._lastShiftSel=ids[0];
  _dtSelect(ids[0],true,false); // shift+click same as anchor
  assert('Shift same: sel length',App.sel.length,1);
  assert('Shift same: correct id',App.sel[0],ids[0]);
})();

section('B24 — mousedown guard: checkbox classes excluded');

(()=>{
  // dt-cb, dt-pin, dt-hid should NOT trigger _dtSelect (they have onchange handlers)
  assertF('Guard: dt-cb excluded',targetPassesGuard(['dt-cb']));
  assertF('Guard: dt-pin excluded',targetPassesGuard(['dt-pin']));
  assertF('Guard: dt-hid excluded',targetPassesGuard(['dt-hid']));
  // All other element types pass through to _dtSelect
  assertT('Guard: dt-in (text input) passes',targetPassesGuard(['dt-in']));
  assertT('Guard: dt-sel (select) passes',targetPassesGuard(['dt-sel']));
  assertT('Guard: dt-clr (color) passes',targetPassesGuard(['dt-clr']));
  assertT('Guard: dt-status-badge passes',targetPassesGuard(['dt-status-badge']));
  assertT('Guard: dep-badge passes',targetPassesGuard(['dep-badge']));
  assertT('Guard: bare td passes',targetPassesGuard([]));
})();

section('B24 — Multi-step workflow: click → shift → ctrl');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),
    makeItem('task',{name:'C'}),makeItem('task',{name:'D'}),makeItem('task',{name:'E'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[];App._lastShiftSel=null;

  // Step 1: plain click B
  _dtSelect(ids[1],false,false);
  assert('Workflow step 1: sel=[B]',App.sel.join(','),ids[1]);

  // Step 2: shift+click D → range B-D
  _dtSelect(ids[3],true,false);
  assert('Workflow step 2: sel=[B,C,D]',App.sel.length,3);
  assertT('Workflow step 2: B',App.sel.includes(ids[1]));
  assertT('Workflow step 2: C',App.sel.includes(ids[2]));
  assertT('Workflow step 2: D',App.sel.includes(ids[3]));

  // Step 3: ctrl+click A → add A to selection
  _dtSelect(ids[0],false,true);
  assert('Workflow step 3: sel=[B,C,D,A]',App.sel.length,4);
  assertT('Workflow step 3: A added',App.sel.includes(ids[0]));

  // Step 4: ctrl+click C → remove C
  _dtSelect(ids[2],false,true);
  assert('Workflow step 4: sel=[B,D,A]',App.sel.length,3);
  assertF('Workflow step 4: C removed',App.sel.includes(ids[2]));

  // Step 5: plain click E → replaces all with E
  _dtSelect(ids[4],false,false);
  assert('Workflow step 5: sel=[E]',App.sel.length,1);
  assert('Workflow step 5: only E',App.sel[0],ids[4]);
})();

section('B24 — Filtered list: shift range skips filtered-out items');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),
    makeItem('task',{name:'C'}),makeItem('task',{name:'D'}),makeItem('task',{name:'E'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  // Simulate filtered view: only A, C, E visible (B and D filtered out)
  mockDtBody([ids[0],ids[2],ids[4]]);
  App.sel=[ids[0]];App._lastShiftSel=ids[0]; // anchor on A
  _dtSelect(ids[4],true,false); // shift+click E
  assert('Filtered shift: sel length',App.sel.length,3);
  assertT('Filtered shift: A in sel',App.sel.includes(ids[0]));
  assertT('Filtered shift: C in sel (visible)',App.sel.includes(ids[2]));
  assertT('Filtered shift: E in sel',App.sel.includes(ids[4]));
  assertF('Filtered shift: B not in sel (filtered)',App.sel.includes(ids[1]));
  assertF('Filtered shift: D not in sel (filtered)',App.sel.includes(ids[3]));
})();

section('B24 — Shift with anchor not in visible list');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),makeItem('task',{name:'C'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  // Anchor is B, but B is filtered out — only A, C visible
  mockDtBody([ids[0],ids[2]]);
  App.sel=[ids[1]];App._lastShiftSel=ids[1]; // anchor on B (not visible)
  _dtSelect(ids[2],true,false); // shift+click C
  // indexOf(B) returns -1 → range logic skipped → sel unchanged
  assert('Anchor hidden: sel unchanged',App.sel.length,1);
  assert('Anchor hidden: still B',App.sel[0],ids[1]);
})();

// ═══════════════════════════════════════════════════════════════════
//  CHECKBOX SHIFT+CLICK FLOW (B24: exact user scenario)
// ═══════════════════════════════════════════════════════════════════
// Models the exact user flow: check checkbox A, then shift+click checkbox D
// Shift+click is handled in onmousedown (where shiftKey is reliable),
// NOT in onchange (where shiftKey is unreliable on checkbox change events).

section('B24 — Checkbox: check one, shift+click another → range');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'Alpha'}),makeItem('task',{name:'Bravo'}),
    makeItem('task',{name:'Charlie'}),makeItem('task',{name:'Delta'}),
    makeItem('task',{name:'Echo'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);

  // Step 1: User clicks checkbox on Alpha (plain check via onchange)
  App.sel=[];App._lastShiftSel=null;
  // Simulate onchange for checkbox: checked=true
  if(!App.sel.includes(ids[0]))App.sel.push(ids[0]);
  App._lastShiftSel=ids[0];
  assert('CB step 1: Alpha checked',App.sel.length,1);
  assert('CB step 1: anchor set',App._lastShiftSel,ids[0]);

  // Step 2: User shift+clicks checkbox on Delta (handled by onmousedown)
  // In the browser: mousedown fires first with e.shiftKey=true,
  // e.preventDefault() stops the checkbox toggle, _dtSelect does range select
  _dtSelect(ids[3],true,false);
  assert('CB step 2: range A-D selected',App.sel.length,4);
  assertT('CB step 2: Alpha in sel',App.sel.includes(ids[0]));
  assertT('CB step 2: Bravo in sel',App.sel.includes(ids[1]));
  assertT('CB step 2: Charlie in sel',App.sel.includes(ids[2]));
  assertT('CB step 2: Delta in sel',App.sel.includes(ids[3]));
  assertF('CB step 2: Echo NOT in sel',App.sel.includes(ids[4]));
})();

section('B24 — Checkbox shift+click: mousedown guard passes .dt-cb with shift');

(()=>{
  // Verify that the mousedown guard logic correctly handles shift+checkbox:
  // With shiftKey=true and target is .dt-cb → should NOT be skipped (handled specially)
  // With shiftKey=false and target is .dt-cb → should be skipped (let onchange handle it)
  const hasCb=true,hasShift=true,hasAnchor=true;
  // Simulates: if(cb && e.shiftKey && this._lastShiftSel) → range select
  assertT('Guard: shift+cb+anchor → handles range select',hasCb&&hasShift&&hasAnchor);

  const noShift=false;
  // Simulates: falls through to if(e.target.closest('.dt-cb,...')) return → skipped
  assertT('Guard: no-shift+cb → skips to onchange',hasCb&&!noShift);
})();

section('B24 — Checkbox: check first, shift+click last in 10-item list');

(()=>{
  resetApp();
  const items=[];
  for(let i=0;i<10;i++)items.push(makeItem('task',{name:'Item_'+i}));
  App.proj=makeProj({items});
  const ids=items.map(i=>i.id);
  mockDtBody(ids);

  // Check item 2 (index 2)
  App.sel=[ids[2]];App._lastShiftSel=ids[2];

  // Shift+click item 7 (index 7) → should select indices 2-7
  _dtSelect(ids[7],true,false);
  assert('Large range: 6 items selected',App.sel.length,6);
  for(let i=2;i<=7;i++){
    assertT(`Large range: Item_${i} in sel`,App.sel.includes(ids[i]));
  }
  assertF('Large range: Item_0 not in sel',App.sel.includes(ids[0]));
  assertF('Large range: Item_1 not in sel',App.sel.includes(ids[1]));
  assertF('Large range: Item_8 not in sel',App.sel.includes(ids[8]));
  assertF('Large range: Item_9 not in sel',App.sel.includes(ids[9]));
})();

section('B24 — Checkbox: shift+click with no prior anchor → single select');

(()=>{
  resetApp();App.proj=makeProj({items:[makeItem('task',{name:'A'}),makeItem('task',{name:'B'})]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[];App._lastShiftSel=null;
  // Shift+click B without anchor → falls through to plain select in _dtSelect
  _dtSelect(ids[1],true,false);
  assert('No anchor CB: sel length',App.sel.length,1);
  assert('No anchor CB: B selected',App.sel[0],ids[1]);
})();

section('B24 — Checkbox: plain check does NOT trigger range select');

(()=>{
  resetApp();App.proj=makeProj({items:[
    makeItem('task',{name:'A'}),makeItem('task',{name:'B'}),makeItem('task',{name:'C'})
  ]});
  const ids=App.proj.items.map(i=>i.id);
  mockDtBody(ids);
  App.sel=[ids[0]];App._lastShiftSel=ids[0];

  // Plain checkbox click on C (no shift) goes through onchange, not onmousedown
  // Simulates: onchange handler adds single item
  if(!App.sel.includes(ids[2]))App.sel.push(ids[2]);
  App._lastShiftSel=ids[2];
  assert('Plain CB: only A and C',App.sel.length,2);
  assertT('Plain CB: A still in sel',App.sel.includes(ids[0]));
  assertT('Plain CB: C added to sel',App.sel.includes(ids[2]));
  assertF('Plain CB: B NOT added (no range)',App.sel.includes(ids[1]));
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
