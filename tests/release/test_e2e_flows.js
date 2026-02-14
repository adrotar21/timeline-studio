#!/usr/bin/env node
/**
 * Timeline Studio -- End-to-End Flow Test Suite
 * ~30 tests covering integration scenarios combining multiple features.
 */

const{assert,assertT,assertF,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ===================================================================
//  Helper: build a CSV row array from project (mirrors exportDataCSV)
// ===================================================================
function buildCSVRows(app){
  const p=app.proj;
  const rows=[['Name','Owner','Type','Start','End','Duration','Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate']];
  for(const sl of p.swimlanes){
    for(const it of p.items.filter(i=>i.swimlaneId===sl.id)){
      const sd=app._getStatusDef(it.status);
      const preds=fmtPreds(app,it);
      rows.push([it.name,it.owner||'',it.type,
        it.type==='milestone'?it.date:it.startDate,
        it.endDate||'',it.duration||'',sl.name,
        it.subRow||0,it.color,it.progress||0,
        it.pinned?'Y':'N',it.hidden?'Y':'N',
        it.notes||'',preds,sd?sd.name:'',it.statusDate||'']);
    }
  }
  return rows;
}

function fmtPreds(app,it){
  if(!it.deps?.length)return'';
  return it.deps.map(d=>{
    const pred=app.gi(app.depId(d));const name=pred?pred.name:'?';
    const type=app.depType(d);const lag=app.depLag(d);
    let s=name;if(type!=='FS'||lag!==0){s+=' ('+type;if(lag!==0)s+=(lag>0?'+':'')+lag+'d';s+=')'}
    return s;
  }).join(', ');
}

// ===================================================================
//  TESTS: Status + Scheduling
// ===================================================================

section('Status + Scheduling');
{
  resetItemCounter();

  // Set status on item -> dates unchanged
  const p1=makeProj({schedulingMode:'manual'});
  const t1=makeItem('task',{id:'t1',startDate:'2026-02-02',duration:5});
  addItems(p1,t1);
  resetApp(p1);
  const origStart=t1.startDate, origEnd=t1.endDate;
  t1.status='on-track';
  t1.statusDate='2026-02-10';
  assert('Status change does not affect startDate',t1.startDate,origStart);
  assert('Status change does not affect endDate',t1.endDate,origEnd);

  // Propagate dependencies -> status/statusDate unchanged on propagated items
  resetItemCounter();
  const p2=makeProj({schedulingMode:'manual',scheduleAroundNonWorking:false});
  const a=makeItem('task',{id:'a',name:'Alpha',startDate:'2026-01-05',duration:5});
  const b=makeItem('task',{id:'b',name:'Beta',startDate:'2026-01-05',duration:3,status:'at-risk',statusDate:'2026-01-04'});
  addDep(b,'a','FS',0);
  addItems(p2,a,b);
  resetApp(p2);
  App.propagateFrom(['a']);
  assert('Propagated item status preserved',b.status,'at-risk');
  assert('Propagated item statusDate preserved',b.statusDate,'2026-01-04');

  // Duplicate item: copy status
  resetItemCounter();
  const p3=makeProj();
  const orig=makeItem('task',{id:'orig',status:'complete',statusDate:'2026-01-20',startDate:'2026-01-05',duration:5});
  addItems(p3,orig);
  resetApp(p3);
  const dup={...U.deep(orig),id:'dup',name:'Dup of orig',statusDate:'2026-02-14'};
  p3.items.push(dup);
  assert('Duplicated item has copied status',dup.status,'complete');
  assert('Duplicated item has new statusDate',dup.statusDate,'2026-02-14');

  // Pin item -> status persists, scheduling skips pinned item
  resetItemCounter();
  const p4=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const predTask=makeItem('task',{id:'pred',name:'Pred',startDate:'2026-01-05',duration:10});
  const pinnedTask=makeItem('task',{id:'pin',name:'Pinned',startDate:'2026-01-05',duration:3,pinned:true,status:'off-track',statusDate:'2026-01-10'});
  addDep(pinnedTask,'pred','FS',0);
  addItems(p4,predTask,pinnedTask);
  resetApp(p4);
  App.runSchedule();
  assert('Pinned item not moved by scheduler',pinnedTask.startDate,'2026-01-05');
  assert('Pinned item status preserved after scheduling',pinnedTask.status,'off-track');

  // Auto-schedule with status items -> dates change but status preserved
  resetItemCounter();
  const p5=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const sA=makeItem('task',{id:'sa',name:'SA',startDate:'2026-01-05',duration:5,status:'on-track'});
  const sB=makeItem('task',{id:'sb',name:'SB',startDate:'2026-01-05',duration:3,status:'at-risk'});
  addDep(sB,'sa','FS',0);
  addItems(p5,sA,sB);
  resetApp(p5);
  App.runSchedule();
  assert('Scheduled item B moved after A',sB.startDate,App._depEnd(sA));
  assert('Scheduled item B status preserved',sB.status,'at-risk');
  assert('Scheduled item A status preserved',sA.status,'on-track');

  // Change status then undo (snapshot restore) -> status reverted
  resetItemCounter();
  const p6=makeProj();
  const undoItem=makeItem('task',{id:'und',status:'tbd',startDate:'2026-01-05',duration:5});
  addItems(p6,undoItem);
  resetApp(p6);
  const snapshot=U.deep(p6);
  undoItem.status='complete';
  undoItem.statusDate='2026-02-14';
  assert('Status changed before undo',undoItem.status,'complete');
  // Restore snapshot (simulating undo)
  App.proj=snapshot;
  const restored=App.gi('und');
  assert('Status reverted after undo',restored.status,'tbd');
  assert('statusDate reverted after undo',restored.statusDate,'');

  // RunSchedule with mixed statuses -> all items scheduled correctly
  resetItemCounter();
  const p7=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const m1=makeItem('task',{id:'m1',name:'M1',startDate:'2026-01-05',duration:5,status:'on-track'});
  const m2=makeItem('task',{id:'m2',name:'M2',startDate:'2026-01-05',duration:3,status:'off-track'});
  const m3=makeItem('task',{id:'m3',name:'M3',startDate:'2026-01-05',duration:4,status:''});
  addDep(m2,'m1','FS',0);
  addDep(m3,'m2','FS',0);
  addItems(p7,m1,m2,m3);
  resetApp(p7);
  App.runSchedule();
  assert('Chain item M2 starts after M1',m2.startDate,App._depEnd(m1));
  assert('Chain item M3 starts after M2',m3.startDate,App._depEnd(m2));
  assertT('All chain items have valid dates',m1.startDate<m2.startDate&&m2.startDate<m3.startDate);
}

// ===================================================================
//  TESTS: Status + Data Operations
// ===================================================================

section('Status + Data Operations');
{
  resetItemCounter();

  // New item via makeItem -> has default empty status
  const item1=makeItem('task',{startDate:'2026-01-05',duration:5});
  assert('New item has empty status',item1.status,'');
  assert('New item has empty statusDate',item1.statusDate,'');

  // New milestone via makeItem -> has default empty status
  const mile1=makeItem('milestone',{date:'2026-02-01'});
  assert('New milestone has empty status',mile1.status,'');

  // Delete item with status -> item removed from array
  resetItemCounter();
  const pDel=makeProj();
  const delItem=makeItem('task',{id:'del1',status:'on-track',statusDate:'2026-01-15',startDate:'2026-01-05',duration:5});
  addItems(pDel,delItem);
  resetApp(pDel);
  assert('Item exists before delete',pDel.items.length,1);
  pDel.items=pDel.items.filter(i=>i.id!=='del1');
  assert('Item removed after delete',pDel.items.length,0);

  // Bulk status update: set 5 items to 'at-risk'
  resetItemCounter();
  const pBulk=makeProj();
  for(let i=0;i<5;i++){
    addItems(pBulk,makeItem('task',{id:'bulk_'+i,startDate:'2026-01-05',duration:3}));
  }
  resetApp(pBulk);
  for(const it of pBulk.items){it.status='at-risk';it.statusDate='2026-02-14'}
  const allAtRisk=pBulk.items.every(it=>it.status==='at-risk');
  assertT('All 5 items set to at-risk',allAtRisk);
  const allDated=pBulk.items.every(it=>it.statusDate==='2026-02-14');
  assertT('All 5 items have statusDate set',allDated);

  // Status filter + items: filter items array, count matches
  resetItemCounter();
  const pFilt=makeProj();
  addItems(pFilt,
    makeItem('task',{id:'f1',status:'on-track',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'f2',status:'at-risk',startDate:'2026-01-08',duration:3}),
    makeItem('task',{id:'f3',status:'on-track',startDate:'2026-01-12',duration:3}),
    makeItem('milestone',{id:'f4',status:'complete',date:'2026-01-20'}),
    makeItem('task',{id:'f5',status:'',startDate:'2026-01-22',duration:3}),
  );
  resetApp(pFilt);
  const onTrack=pFilt.items.filter(i=>i.status==='on-track');
  assert('Filter on-track returns 2 items',onTrack.length,2);
  const noStatus=pFilt.items.filter(i=>i.status==='');
  assert('Filter blank status returns 1 item',noStatus.length,1);

  // Combined swimlane + status filter
  resetItemCounter();
  const sw2=makeSwim({id:'sw2',name:'Design'});
  const pCombined=makeProj({swimlanes:[{id:'sw1',name:'Dev',color:'',collapsed:'expanded',height:100,subSwims:[]},sw2]});
  addItems(pCombined,
    makeItem('task',{id:'c1',swimlaneId:'sw1',status:'on-track',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'c2',swimlaneId:'sw2',status:'on-track',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'c3',swimlaneId:'sw1',status:'at-risk',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'c4',swimlaneId:'sw2',status:'at-risk',startDate:'2026-01-05',duration:3}),
  );
  resetApp(pCombined);
  const sw1OnTrack=pCombined.items.filter(i=>i.swimlaneId==='sw1'&&i.status==='on-track');
  assert('Swimlane sw1 + on-track = 1',sw1OnTrack.length,1);
  const sw2AtRisk=pCombined.items.filter(i=>i.swimlaneId==='sw2'&&i.status==='at-risk');
  assert('Swimlane sw2 + at-risk = 1',sw2AtRisk.length,1);
}

// ===================================================================
//  TESTS: Multi-Feature Integration
// ===================================================================

section('Multi-Feature Integration');
{
  resetItemCounter();

  // Swimlane collapse + item filtering: collapsed swimlane items not in visible set
  const pCollapse=makeProj({swimlanes:[
    {id:'vis',name:'Visible',color:'',collapsed:'expanded',height:100,subSwims:[]},
    {id:'hid',name:'Hidden',color:'',collapsed:'collapsed',height:100,subSwims:[]},
  ]});
  addItems(pCollapse,
    makeItem('task',{id:'v1',swimlaneId:'vis',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'h1',swimlaneId:'hid',startDate:'2026-01-05',duration:3}),
  );
  resetApp(pCollapse);
  const collapsedIds=new Set(pCollapse.swimlanes.filter(s=>s.collapsed!=='expanded').map(s=>s.id));
  const visibleItems=pCollapse.items.filter(i=>!collapsedIds.has(i.swimlaneId));
  assert('Collapsed swimlane items excluded from visible set',visibleItems.length,1);
  assert('Visible item is from expanded swimlane',visibleItems[0].swimlaneId,'vis');

  // Status sort -> items ordered by statusDefs index
  resetItemCounter();
  const pSort=makeProj();
  addItems(pSort,
    makeItem('task',{id:'s1',status:'off-track',startDate:'2026-01-05',duration:3}),
    makeItem('task',{id:'s2',status:'on-track',startDate:'2026-01-08',duration:3}),
    makeItem('task',{id:'s3',status:'at-risk',startDate:'2026-01-12',duration:3}),
    makeItem('task',{id:'s4',status:'complete',startDate:'2026-01-15',duration:3}),
  );
  resetApp(pSort);
  const defIdx=new Map(pSort.statusDefs.map((sd,i)=>[sd.id,i]));
  const sorted=[...pSort.items].sort((a,b)=>(defIdx.get(a.status)||0)-(defIdx.get(b.status)||0));
  assert('Status sort: on-track (idx 2) before at-risk (idx 3)',sorted[0].status,'on-track');
  assert('Status sort: at-risk before off-track',sorted[1].status,'at-risk');
  assert('Status sort: off-track before complete',sorted[2].status,'off-track');

  // CSV export includes status columns for items with status
  resetItemCounter();
  const pCSV=makeProj();
  const csvTask=makeItem('task',{id:'csv1',name:'CSV Task',status:'on-track',statusDate:'2026-02-01',startDate:'2026-01-05',duration:5});
  addItems(pCSV,csvTask);
  resetApp(pCSV);
  const csvRows=buildCSVRows(App);
  assertIncludes('CSV header includes Status',csvRows[0].join(','),'Status');
  assertIncludes('CSV header includes StatusDate',csvRows[0].join(','),'StatusDate');
  // Data row: status name from statusDefs
  const statusColIdx=csvRows[0].indexOf('Status');
  const statusDateIdx=csvRows[0].indexOf('StatusDate');
  assert('CSV data row has status name',csvRows[1][statusColIdx],'On Track');
  assert('CSV data row has statusDate',csvRows[1][statusDateIdx],'2026-02-01');

  // Template project (makeProj defaults) has 7 statusDefs
  resetItemCounter();
  const pTemplate=makeProj();
  assert('Template project has 7 statusDefs',pTemplate.statusDefs.length,7);
  assert('Template first statusDef is blank',pTemplate.statusDefs[0].id,'blank');
  assert('Template last statusDef is not-started',pTemplate.statusDefs[6].id,'not-started');

  // statusDisplay changes don't affect item data
  resetItemCounter();
  const pDisplay=makeProj();
  const dispItem=makeItem('task',{id:'disp1',status:'tbd',statusDate:'2026-01-10',startDate:'2026-01-05',duration:5});
  addItems(pDisplay,dispItem);
  resetApp(pDisplay);
  pDisplay.statusDisplay.mode='shortName';
  pDisplay.statusDisplay.badgePos='left';
  pDisplay.statusDisplay.show=false;
  assert('Item status unchanged after display mode change',dispItem.status,'tbd');
  assert('Item statusDate unchanged after display change',dispItem.statusDate,'2026-01-10');
  assert('Item startDate unchanged after display change',dispItem.startDate,'2026-01-05');

  // Working day scheduling + status: status doesn't interfere
  resetItemCounter();
  const pWork=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:true});
  const wA=makeItem('task',{id:'wa',name:'WA',startDate:'2026-01-05',duration:5,durMode:'work',status:'on-track'});
  const wB=makeItem('task',{id:'wb',name:'WB',startDate:'2026-01-05',duration:3,durMode:'work',status:'at-risk'});
  addDep(wB,'wa','FS',0);
  addItems(pWork,wA,wB);
  resetApp(pWork);
  wA.endDate=App._calcEndDate(wA);
  App.runSchedule();
  assert('Working day task A status preserved',wA.status,'on-track');
  assert('Working day task B status preserved',wB.status,'at-risk');
  assertT('Task B starts after task A ends',wB.startDate>=App._depEnd(wA));

  // Float calculation with status items -> float computed correctly
  resetItemCounter();
  const pFloat=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const fA=makeItem('task',{id:'fa',name:'FA',startDate:'2026-01-05',duration:5,status:'on-track'});
  const fB=makeItem('task',{id:'fb',name:'FB',startDate:'2026-01-12',duration:3,status:'at-risk'});
  addDep(fB,'fa','FS',0);
  addItems(pFloat,fA,fB);
  resetApp(pFloat);
  App.runSchedule();
  App.calculateFloat();
  assertT('Float A is defined',fA._float!=null);
  assertT('Float B is defined',fB._float!=null);
  assert('End item B float is 0',fB._float,0);

  // CSV export with dependency chain shows predecessors
  resetItemCounter();
  const pChain=makeProj();
  const cA=makeItem('task',{id:'ca',name:'Task Alpha',startDate:'2026-01-05',duration:5});
  const cB=makeItem('task',{id:'cb',name:'Task Beta',startDate:'2026-01-12',duration:3});
  const cC=makeItem('task',{id:'cc',name:'Task Gamma',startDate:'2026-01-19',duration:4});
  addDep(cB,'ca','FS',0);
  addDep(cC,'cb','FS',0);
  addItems(pChain,cA,cB,cC);
  resetApp(pChain);
  const chainRows=buildCSVRows(App);
  const predColIdx=chainRows[0].indexOf('Predecessors');
  assert('Task A has no predecessors',chainRows[1][predColIdx],'');
  assert('Task B predecessor is Task Alpha',chainRows[2][predColIdx],'Task Alpha');
  assert('Task C predecessor is Task Beta',chainRows[3][predColIdx],'Task Beta');
}

const{failed}=summary();process.exit(failed?1:0);
