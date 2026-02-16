#!/usr/bin/env node
/**
 * Timeline Studio — Multi-Drag (F28) Tests
 * Covers: row compaction algorithm, drop positioning with compacted rows,
 *   cross-swimlane bundling, cross-sub-swimlane bundling, single-item
 *   regression, performance guard, date strip suffix, _findSubSwim helper.
 */
const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Read app.js source to verify structural changes ────────────────────
const fs=require('fs');
const path=require('path');
const appSrc=fs.readFileSync(path.resolve(__dirname,'../../app.js'),'utf8');
const cssSrc=fs.readFileSync(path.resolve(__dirname,'../../styles.css'),'utf8');

// ─── Row Compaction Algorithm (mirrors app.js startDrag logic) ──────────
function computeCompaction(dragItems,primaryId){
  const rows=[...new Set(dragItems.map(d=>d.subRow||0))].sort((a,b)=>a-b);
  const cMap=new Map();rows.forEach((r,i)=>cMap.set(r,i));
  const primaryItem=dragItems.find(d=>d.id===primaryId);
  const pRow=cMap.get(primaryItem.subRow||0)||0;
  return dragItems.map(d=>({
    id:d.id,
    compactedRow:cMap.get(d.subRow||0)||0,
    rowOffset:(cMap.get(d.subRow||0)||0)-pRow
  }));
}

// ─── Drop positioning (mirrors fixed drop handler logic) ────────────────
function applyDrop(items,primaryId,dropRow,targetSubSwimId){
  const compacted=computeCompaction(items,primaryId);
  return items.map(it=>{
    const c=compacted.find(cc=>cc.id===it.id);
    return{
      id:it.id,
      subSwimId:targetSubSwimId,
      subRow:Math.max(0,dropRow+c.rowOffset)
    };
  });
}

// ─── _findSubSwim helper (mirrors app.js) ───────────────────────────────
// Note: app.js uses sl.subSwimlanes, but makeSwim builder outputs sl.subSwims
function findSubSwim(proj,ssId){
  for(const sl of proj.swimlanes){
    const subs=sl.subSwimlanes||sl.subSwims||[];
    for(const ss of subs)if(ss.id===ssId)return ss;
  }
  return null;
}

resetItemCounter();

// ═══════════════════════════════════════════════════════════════════
section('Row Compaction — Basic');
// ═══════════════════════════════════════════════════════════════════

{
  // UC2: Sparse rows 0,2,4 → compacted to 0,1,2
  const items=[{id:'a',subRow:0},{id:'b',subRow:2},{id:'c',subRow:4}];
  const result=computeCompaction(items,'a');
  assert('sparse rows: a → row 0',result.find(r=>r.id==='a').compactedRow,0);
  assert('sparse rows: b → row 1',result.find(r=>r.id==='b').compactedRow,1);
  assert('sparse rows: c → row 2',result.find(r=>r.id==='c').compactedRow,2);
}

{
  const items=[{id:'a',subRow:0},{id:'b',subRow:2},{id:'c',subRow:4}];
  const result=computeCompaction(items,'a');
  assert('primary always offset 0',result.find(r=>r.id==='a').rowOffset,0);
  assert('b offset = 1',result.find(r=>r.id==='b').rowOffset,1);
  assert('c offset = 2',result.find(r=>r.id==='c').rowOffset,2);
}

{
  // Primary in middle: offsets can be negative
  const items=[{id:'a',subRow:0},{id:'b',subRow:2},{id:'c',subRow:4}];
  const result=computeCompaction(items,'b');
  assert('a offset = -1 when primary is b',result.find(r=>r.id==='a').rowOffset,-1);
  assert('primary b offset = 0',result.find(r=>r.id==='b').rowOffset,0);
  assert('c offset = 1 when primary is b',result.find(r=>r.id==='c').rowOffset,1);
}

{
  // All on same row → all offset 0
  const items=[{id:'a',subRow:0},{id:'b',subRow:0},{id:'c',subRow:0}];
  const result=computeCompaction(items,'a');
  assert('same row: a offset 0',result.find(r=>r.id==='a').rowOffset,0);
  assert('same row: b offset 0',result.find(r=>r.id==='b').rowOffset,0);
  assert('same row: c offset 0',result.find(r=>r.id==='c').rowOffset,0);
}

{
  // Already compact (rows 0,1) → no change
  const items=[{id:'a',subRow:0},{id:'b',subRow:1}];
  const result=computeCompaction(items,'a');
  assert('compact: a offset 0',result.find(r=>r.id==='a').rowOffset,0);
  assert('compact: b offset 1',result.find(r=>r.id==='b').rowOffset,1);
}

{
  // Single item → offset 0
  const items=[{id:'a',subRow:3}];
  const result=computeCompaction(items,'a');
  assert('single item: offset 0',result.find(r=>r.id==='a').rowOffset,0);
}

{
  // undefined subRow treated as 0
  const items=[{id:'a'},{id:'b',subRow:2}];
  const result=computeCompaction(items,'a');
  assert('undefined subRow treated as 0',result.find(r=>r.id==='a').compactedRow,0);
  assert('subRow 2 compacts to 1',result.find(r=>r.id==='b').compactedRow,1);
}

// ═══════════════════════════════════════════════════════════════════
section('Row Compaction — Multi-source Bundling');
// ═══════════════════════════════════════════════════════════════════

{
  // UC3: Items from different sub-swimlanes with overlapping rows
  const items=[{id:'x',subRow:0},{id:'y',subRow:0},{id:'z',subRow:1}];
  const result=computeCompaction(items,'x');
  assert('bundled: x offset 0',result.find(r=>r.id==='x').rowOffset,0);
  assert('bundled: y offset 0 (same row as x)',result.find(r=>r.id==='y').rowOffset,0);
  assert('bundled: z offset 1',result.find(r=>r.id==='z').rowOffset,1);
}

{
  // UC4: Items from different swimlanes, rows {2, 0} → compact
  const items=[{id:'a',subRow:2},{id:'b',subRow:0}];
  const result=computeCompaction(items,'b');
  assert('cross-swim: b (primary) offset 0',result.find(r=>r.id==='b').rowOffset,0);
  assert('cross-swim: a offset 1',result.find(r=>r.id==='a').rowOffset,1);
}

// ═══════════════════════════════════════════════════════════════════
section('Drop Positioning — Compacted Rows');
// ═══════════════════════════════════════════════════════════════════

{
  // UC1: 5 items across rows 0,1,2 → drop at row 0 in target
  const items=[
    {id:'a',subRow:0},{id:'b',subRow:0},{id:'c',subRow:1},
    {id:'d',subRow:2},{id:'e',subRow:2}
  ];
  const result=applyDrop(items,'a',0,'ss_target');
  assert('UC1: a lands on row 0',result.find(r=>r.id==='a').subRow,0);
  assert('UC1: b lands on row 0',result.find(r=>r.id==='b').subRow,0);
  assert('UC1: c lands on row 1',result.find(r=>r.id==='c').subRow,1);
  assert('UC1: d lands on row 2',result.find(r=>r.id==='d').subRow,2);
  assert('UC1: e lands on row 2',result.find(r=>r.id==='e').subRow,2);
  assertT('UC1: all bundled into target sub-swim',result.every(r=>r.subSwimId==='ss_target'));
}

{
  // UC2: Sparse rows 0,2,4 → drop at row 1 → items land on 1,2,3
  const items=[{id:'a',subRow:0},{id:'b',subRow:2},{id:'c',subRow:4}];
  const result=applyDrop(items,'a',1,'ss_target');
  assert('UC2: a on row 1 (drop row)',result.find(r=>r.id==='a').subRow,1);
  assert('UC2: b on row 2 (compacted +1)',result.find(r=>r.id==='b').subRow,2);
  assert('UC2: c on row 3 (compacted +2)',result.find(r=>r.id==='c').subRow,3);
}

{
  // UC6: Drop at row 2 in target with existing content
  const items=[{id:'a',subRow:0},{id:'b',subRow:1}];
  const result=applyDrop(items,'a',2,'ss_target');
  assert('UC6: a on row 2',result.find(r=>r.id==='a').subRow,2);
  assert('UC6: b on row 3',result.find(r=>r.id==='b').subRow,3);
}

{
  // Drop with primary in middle of group
  const items=[{id:'a',subRow:0},{id:'b',subRow:1},{id:'c',subRow:2}];
  const result=applyDrop(items,'b',3,'ss_target');
  assert('primary-in-middle: a on row 2',result.find(r=>r.id==='a').subRow,2);
  assert('primary-in-middle: b on row 3',result.find(r=>r.id==='b').subRow,3);
  assert('primary-in-middle: c on row 4',result.find(r=>r.id==='c').subRow,4);
}

{
  // Negative offset clamped to 0
  const items=[{id:'a',subRow:0},{id:'b',subRow:2},{id:'c',subRow:4}];
  const result=applyDrop(items,'c',0,'ss_target');
  assert('clamp: a clamped to row 0',result.find(r=>r.id==='a').subRow,0);
  assert('clamp: b clamped to row 0',result.find(r=>r.id==='b').subRow,0);
  assert('clamp: c on drop row 0',result.find(r=>r.id==='c').subRow,0);
}

{
  // No sub-swimlanes: items get empty subSwimId
  const items=[{id:'a',subRow:0},{id:'b',subRow:1}];
  const result=applyDrop(items,'a',0,'');
  assertT('no subs: subSwimId cleared',result.every(r=>r.subSwimId===''));
}

// ═══════════════════════════════════════════════════════════════════
section('Drop Positioning — Single Item (Regression)');
// ═══════════════════════════════════════════════════════════════════

{
  const items=[{id:'a',subRow:3}];
  const result=applyDrop(items,'a',2,'ss_target');
  assert('single item: lands on drop row',result[0].subRow,2);
  assert('single item: assigned to target',result[0].subSwimId,'ss_target');
}

{
  const items=[{id:'a'}];
  const result=applyDrop(items,'a',0,'ss_target');
  assert('single item no subRow: row 0',result[0].subRow,0);
}

// ═══════════════════════════════════════════════════════════════════
section('Group-Aware Row Compaction — Cross Sub-Swimlane');
// ═══════════════════════════════════════════════════════════════════

// Mirrors the new group-aware compaction algorithm in app.js startDrag
function computeGroupedCompaction(dragItems,primaryId,swimlanes){
  // Build ordering map: swimlaneId:subSwimId → numeric key
  const _slOrder=new Map();
  swimlanes.forEach((sl,si)=>{
    _slOrder.set(sl.id+':',si*1000);
    const subs=sl.subSwimlanes||sl.subSwims||[];
    subs.forEach((ss,ssi)=>_slOrder.set(sl.id+':'+ss.id,si*1000+ssi));
  });
  // Assign group keys
  dragItems.forEach(d=>{
    const key=(d.swimlaneId||'')+':'+(d.subSwimId||'');
    d._groupKey=_slOrder.get(key)??0;
  });
  if(dragItems.length<=1){return dragItems.map(d=>({id:d.id,rowOffset:0,compactedRow:0}))}
  const sorted=[...dragItems].sort((a,b)=>a._groupKey-b._groupKey||(a.subRow||0)-(b.subRow||0));
  let globalRow=0,prevKey=-1;const rowMap=new Map();let groupRows=[];
  for(const d of sorted){
    if(d._groupKey!==prevKey){
      if(groupRows.length){const uniq=[...new Set(groupRows.map(g=>g.subRow))].sort((a,b)=>a-b);const cMap=new Map();uniq.forEach((r,i)=>cMap.set(r,i));groupRows.forEach(g=>rowMap.set(g.id,globalRow+cMap.get(g.subRow)));globalRow+=uniq.length}
      groupRows=[];prevKey=d._groupKey}
    groupRows.push({id:d.id,subRow:d.subRow||0})}
  if(groupRows.length){const uniq=[...new Set(groupRows.map(g=>g.subRow))].sort((a,b)=>a-b);const cMap=new Map();uniq.forEach((r,i)=>cMap.set(r,i));groupRows.forEach(g=>rowMap.set(g.id,globalRow+cMap.get(g.subRow)))}
  const pRow=rowMap.get(primaryId)||0;
  return dragItems.map(d=>({id:d.id,compactedRow:rowMap.get(d.id)||0,rowOffset:(rowMap.get(d.id)||0)-pRow}));
}

{
  // Backward compat: same sub-swimlane → identical to old compaction
  const swimlanes=[{id:'sw1',subSwimlanes:[{id:'ss1'}]}];
  const items=[
    {id:'a',swimlaneId:'sw1',subSwimId:'ss1',subRow:0},
    {id:'b',swimlaneId:'sw1',subSwimId:'ss1',subRow:2},
    {id:'c',swimlaneId:'sw1',subSwimId:'ss1',subRow:4}
  ];
  const r=computeGroupedCompaction(items,'a',swimlanes);
  assert('compat: a row 0',r.find(x=>x.id==='a').compactedRow,0);
  assert('compat: b row 1',r.find(x=>x.id==='b').compactedRow,1);
  assert('compat: c row 2',r.find(x=>x.id==='c').compactedRow,2);
}

{
  // Two subs same swimlane: items on same subRow get separate rows
  const swimlanes=[{id:'sw1',subSwimlanes:[{id:'ssA'},{id:'ssB'}]}];
  const items=[
    {id:'a',swimlaneId:'sw1',subSwimId:'ssA',subRow:0},
    {id:'b',swimlaneId:'sw1',subSwimId:'ssB',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'a',swimlanes);
  assert('two subs: a row 0',r.find(x=>x.id==='a').compactedRow,0);
  assert('two subs: b row 1 (separate group)',r.find(x=>x.id==='b').compactedRow,1);
}

{
  // Three subs with mixed rows → compacted within each group, groups stacked
  const swimlanes=[{id:'sw1',subSwimlanes:[{id:'ssA'},{id:'ssB'},{id:'ssC'}]}];
  const items=[
    {id:'x',swimlaneId:'sw1',subSwimId:'ssA',subRow:0},
    {id:'y',swimlaneId:'sw1',subSwimId:'ssA',subRow:2},
    {id:'z',swimlaneId:'sw1',subSwimId:'ssC',subRow:1},
    {id:'w',swimlaneId:'sw1',subSwimId:'ssB',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'x',swimlanes);
  assert('3sub: x(A@0) row 0',r.find(x=>x.id==='x').compactedRow,0);
  assert('3sub: y(A@2) row 1',r.find(x=>x.id==='y').compactedRow,1);
  assert('3sub: w(B@0) row 2',r.find(x=>x.id==='w').compactedRow,2);
  assert('3sub: z(C@1) row 3',r.find(x=>x.id==='z').compactedRow,3);
}

{
  // Cross-swimlane: A.2 + B.1 → ordered by swimlane position
  const swimlanes=[
    {id:'swA',subSwimlanes:[{id:'ssA1'},{id:'ssA2'}]},
    {id:'swB',subSwimlanes:[{id:'ssB1'}]}
  ];
  const items=[
    {id:'a',swimlaneId:'swA',subSwimId:'ssA2',subRow:0},
    {id:'b',swimlaneId:'swB',subSwimId:'ssB1',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'a',swimlanes);
  assert('cross-sw: a(A.2) row 0',r.find(x=>x.id==='a').compactedRow,0);
  assert('cross-sw: b(B.1) row 1',r.find(x=>x.id==='b').compactedRow,1);
}

{
  // Primary in non-first group → negative offsets
  const swimlanes=[{id:'sw1',subSwimlanes:[{id:'ssA'},{id:'ssB'}]}];
  const items=[
    {id:'a',swimlaneId:'sw1',subSwimId:'ssA',subRow:0},
    {id:'b',swimlaneId:'sw1',subSwimId:'ssB',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'b',swimlanes);
  assert('neg offset: a offset -1',r.find(x=>x.id==='a').rowOffset,-1);
  assert('neg offset: b offset 0 (primary)',r.find(x=>x.id==='b').rowOffset,0);
}

{
  // No sub-swimlanes: items grouped by swimlane order
  const swimlanes=[{id:'swA',subSwimlanes:[]},{id:'swB',subSwimlanes:[]}];
  const items=[
    {id:'a',swimlaneId:'swA',subRow:0},
    {id:'b',swimlaneId:'swB',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'a',swimlanes);
  assert('no-subs: a row 0',r.find(x=>x.id==='a').compactedRow,0);
  assert('no-subs: b row 1',r.find(x=>x.id==='b').compactedRow,1);
}

{
  // Single item → rowOffset 0
  const swimlanes=[{id:'sw1',subSwimlanes:[{id:'ss1'}]}];
  const items=[{id:'a',swimlaneId:'sw1',subSwimId:'ss1',subRow:3}];
  const r=computeGroupedCompaction(items,'a',swimlanes);
  assert('single grouped: offset 0',r[0].rowOffset,0);
}

{
  // Full example from requirements: A.1, A.1, A.3, B.1
  const swimlanes=[
    {id:'swA',subSwimlanes:[{id:'ssA1'},{id:'ssA2'},{id:'ssA3'}]},
    {id:'swB',subSwimlanes:[{id:'ssB1'}]}
  ];
  const items=[
    {id:'X',swimlaneId:'swA',subSwimId:'ssA1',subRow:0},
    {id:'Y',swimlaneId:'swA',subSwimId:'ssA1',subRow:2},
    {id:'Z',swimlaneId:'swA',subSwimId:'ssA3',subRow:1},
    {id:'W',swimlaneId:'swB',subSwimId:'ssB1',subRow:0}
  ];
  const r=computeGroupedCompaction(items,'X',swimlanes);
  assert('full ex: X(A.1@0) row 0',r.find(x=>x.id==='X').compactedRow,0);
  assert('full ex: Y(A.1@2) row 1',r.find(x=>x.id==='Y').compactedRow,1);
  assert('full ex: Z(A.3@1) row 2',r.find(x=>x.id==='Z').compactedRow,2);
  assert('full ex: W(B.1@0) row 3',r.find(x=>x.id==='W').compactedRow,3);
  assert('full ex: X offset 0',r.find(x=>x.id==='X').rowOffset,0);
  assert('full ex: Y offset 1',r.find(x=>x.id==='Y').rowOffset,1);
  assert('full ex: Z offset 2',r.find(x=>x.id==='Z').rowOffset,2);
  assert('full ex: W offset 3',r.find(x=>x.id==='W').rowOffset,3);
}

// ═══════════════════════════════════════════════════════════════════
section('Code Structure Verification');
// ═══════════════════════════════════════════════════════════════════

assertT('ghostEls array declared',appSrc.includes('ghostEls=[]'));
assertT('primary ghost class in app.js',appSrc.includes('drag-ghost-primary'));
assertT('secondary ghost class in app.js',appSrc.includes('drag-ghost-secondary'));
assertT('primary ghost CSS rule',cssSrc.includes('.drag-ghost.drag-ghost-primary'));
assertT('secondary ghost CSS rule',cssSrc.includes('.drag-ghost.drag-ghost-secondary'));
assertT('MAX_GHOSTS=15 defined',appSrc.includes('MAX_GHOSTS=15'));
assertT('rowOffset stored on dragItems',appSrc.includes('d.rowOffset'));
assertT('compaction map computed',appSrc.includes('cMap'));
assertT('drop handler uses rowOffset',appSrc.includes('dd.rowOffset'));
{
  const upSection=appSrc.substring(appSrc.indexOf('const up=ev=>{'));
  assertT('drop handler excludes sl-hidden-indicator',upSection.includes('sl-hidden-indicator'));
}
assertT('date strip includes item count',appSrc.includes("items)'"));
{
  const cleanupCount=(appSrc.match(/ghostEls\.forEach\(g=>g\.el\.remove\(\)\)/g)||[]).length;
  assertT('ghost cleanup in >= 3 locations ('+cleanupCount+')',cleanupCount>=3);
}
assertT('_findSubSwim helper defined',appSrc.includes('_findSubSwim'));
assertT('expansion tracking via Map',appSrc.includes('_expandedMap')&&appSrc.includes('_snapshots'));
assertT('drop toast message',appSrc.includes('Moved ')&&appSrc.includes(' items to '));
assertT('escape toast message',appSrc.includes('Drag cancelled')&&appSrc.includes('items restored'));

// ═══════════════════════════════════════════════════════════════════
section('_findSubSwim Helper');
// ═══════════════════════════════════════════════════════════════════

{
  const proj=makeProj({swimlanes:[
    makeSwim({id:'sw1',subSwims:[{id:'ss1',name:'Sub 1'},{id:'ss2',name:'Sub 2'}]}),
    makeSwim({id:'sw2',subSwims:[{id:'ss3',name:'Sub 3'}]})
  ]});
  const ss1=findSubSwim(proj,'ss1');
  assertT('findSubSwim: finds ss1 in sw1',ss1!==null&&ss1.name==='Sub 1');
  const ss3=findSubSwim(proj,'ss3');
  assertT('findSubSwim: finds ss3 in sw2',ss3!==null&&ss3.name==='Sub 3');
  assert('findSubSwim: returns null for missing',findSubSwim(proj,'nonexistent'),null);
}

// ═══════════════════════════════════════════════════════════════════
section('Dynamic Row Expansion Logic');
// ═══════════════════════════════════════════════════════════════════

{
  const rH=38;
  const neededH=(maxRow)=>Math.max(50,(maxRow+1)*rH+10);
  assert('1 row: height = 50 (min)',neededH(0),50);
  assert('2 rows: height = 86',neededH(1),86);
  assert('3 rows: height = 124',neededH(2),124);
  assert('5 rows: height = 200',neededH(4),200);
}

{
  const bandH=86;
  const neededFor3Rows=(2+1)*38+10;
  assertT('3 ghost rows needs expansion beyond 2-row band',neededFor3Rows>bandH);
}

{
  const bandH=200;
  const neededFor3Rows=(2+1)*38+10;
  assertF('3 ghost rows fits in 5-row band',neededFor3Rows>bandH);
}

// ═══════════════════════════════════════════════════════════════════
section('Integration Scenarios');
// ═══════════════════════════════════════════════════════════════════

{
  // Full UC1: 5 items across 3 rows, drop into target
  resetItemCounter();
  const proj=makeProj({swimlanes:[
    makeSwim({id:'sw1',subSwims:[{id:'ssA',name:'Source',height:124}]}),
    makeSwim({id:'sw2',subSwims:[{id:'ssB',name:'Target',height:50}]})
  ]});
  const items=[
    makeItem('task',{id:'t1',swimlaneId:'sw1',subSwimId:'ssA',subRow:0,startDate:'2026-01-05',duration:5}),
    makeItem('task',{id:'t2',swimlaneId:'sw1',subSwimId:'ssA',subRow:0,startDate:'2026-01-12',duration:3}),
    makeItem('task',{id:'t3',swimlaneId:'sw1',subSwimId:'ssA',subRow:1,startDate:'2026-01-05',duration:10}),
    makeItem('task',{id:'t4',swimlaneId:'sw1',subSwimId:'ssA',subRow:2,startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'t5',swimlaneId:'sw1',subSwimId:'ssA',subRow:2,startDate:'2026-01-10',duration:5}),
  ];
  addItems(proj,...items);

  const dropResult=applyDrop(items,'t1',0,'ssB');
  assertT('UC1 full: all in ssB',dropResult.every(r=>r.subSwimId==='ssB'));
  assert('UC1 full: t1 row 0',dropResult.find(r=>r.id==='t1').subRow,0);
  assert('UC1 full: t2 row 0',dropResult.find(r=>r.id==='t2').subRow,0);
  assert('UC1 full: t3 row 1',dropResult.find(r=>r.id==='t3').subRow,1);
  assert('UC1 full: t4 row 2',dropResult.find(r=>r.id==='t4').subRow,2);
  assert('UC1 full: t5 row 2',dropResult.find(r=>r.id==='t5').subRow,2);
}

{
  // Full UC3: Items from 3 different sub-swimlanes bundled
  resetItemCounter();
  const proj=makeProj({swimlanes:[
    makeSwim({id:'sw1',subSwims:[
      {id:'ssA',name:'A'},{id:'ssB',name:'B'},{id:'ssC',name:'C'},{id:'ssD',name:'D'}
    ]})
  ]});
  const itemX=makeItem('task',{id:'x',swimlaneId:'sw1',subSwimId:'ssA',subRow:0});
  const itemY=makeItem('task',{id:'y',swimlaneId:'sw1',subSwimId:'ssB',subRow:0});
  const itemZ=makeItem('task',{id:'z',swimlaneId:'sw1',subSwimId:'ssC',subRow:1});
  addItems(proj,itemX,itemY,itemZ);

  const dropResult=applyDrop([itemX,itemY,itemZ],'x',0,'ssD');
  assertT('UC3: all bundled into ssD',dropResult.every(r=>r.subSwimId==='ssD'));
  assert('UC3: x on row 0',dropResult.find(r=>r.id==='x').subRow,0);
  assert('UC3: y on row 0',dropResult.find(r=>r.id==='y').subRow,0);
  assert('UC3: z on row 1',dropResult.find(r=>r.id==='z').subRow,1);
}

{
  // Milestone + task mixed selection
  resetItemCounter();
  const t1=makeItem('task',{id:'t1',subRow:0,startDate:'2026-01-05',duration:5});
  const m1=makeItem('milestone',{id:'m1',subRow:1,date:'2026-01-15'});
  const t2=makeItem('task',{id:'t2',subRow:2,startDate:'2026-01-10',duration:3});
  const dropResult=applyDrop([t1,m1,t2],'t1',0,'ss_target');
  assert('mixed: task t1 row 0',dropResult.find(r=>r.id==='t1').subRow,0);
  assert('mixed: milestone m1 row 1',dropResult.find(r=>r.id==='m1').subRow,1);
  assert('mixed: task t2 row 2',dropResult.find(r=>r.id==='t2').subRow,2);
}

{
  // Large sparse: rows 0,5,10 → compact to 0,1,2
  const items=[{id:'i0',subRow:0},{id:'i1',subRow:5},{id:'i2',subRow:10}];
  const result=computeCompaction(items,'i0');
  assert('large sparse: row 0 → offset 0',result.find(r=>r.id==='i0').rowOffset,0);
  assert('large sparse: row 5 → offset 1',result.find(r=>r.id==='i1').rowOffset,1);
  assert('large sparse: row 10 → offset 2',result.find(r=>r.id==='i2').rowOffset,2);
}

{
  // Duplicate rows with gaps: 0,0,3,3,6 → compact to 0,0,1,1,2
  const items=[
    {id:'a',subRow:0},{id:'b',subRow:0},
    {id:'c',subRow:3},{id:'d',subRow:3},
    {id:'e',subRow:6}
  ];
  const result=computeCompaction(items,'a');
  assert('dup gaps: a offset 0',result.find(r=>r.id==='a').rowOffset,0);
  assert('dup gaps: b offset 0',result.find(r=>r.id==='b').rowOffset,0);
  assert('dup gaps: c offset 1',result.find(r=>r.id==='c').rowOffset,1);
  assert('dup gaps: d offset 1',result.find(r=>r.id==='d').rowOffset,1);
  assert('dup gaps: e offset 2',result.find(r=>r.id==='e').rowOffset,2);
}

summary();
