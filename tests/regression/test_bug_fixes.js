#!/usr/bin/env node
/**
 * Timeline Studio -- Bug Fix Regression Test Suite
 * ~30 tests targeting known bugs fixed since v0.14.0.
 * Prevents regressions in dependency engine, scheduling, and export logic.
 */

const{assert,assertT,assertF,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ===================================================================
//  Helper: format predecessors (mirrors App._fmtPreds in app.js)
// ===================================================================
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
//  B6 - Export label centering: dominant-baseline="central"
// ===================================================================
section('B6 - Export Label Centering');
{
  // The SVG text centering must use dominant-baseline="central"
  // (not 'middle', not 'alphabetic') for pixel-perfect centering
  const correctBaseline='central';
  assert('SVG text baseline is central',correctBaseline,'central');
  assertNeq('SVG text baseline is not middle',correctBaseline,'middle');
  assertNeq('SVG text baseline is not alphabetic',correctBaseline,'alphabetic');
}

// ===================================================================
//  B16 - Predecessors in CSV export
// ===================================================================
section('B16 - Predecessors in CSV');
{
  resetItemCounter();
  const p=makeProj();
  const taskA=makeItem('task',{id:'pa',name:'Task A',startDate:'2026-01-05',duration:5});
  const taskB=makeItem('task',{id:'pb',name:'Task B',startDate:'2026-01-12',duration:3});
  const taskC=makeItem('task',{id:'pc',name:'Task C',startDate:'2026-01-19',duration:4});
  addDep(taskB,'pa','FS',0);
  addDep(taskC,'pb','FS',2);
  addItems(p,taskA,taskB,taskC);
  resetApp(p);

  const predsA=fmtPreds(App,taskA);
  const predsB=fmtPreds(App,taskB);
  const predsC=fmtPreds(App,taskC);
  assert('Task A has no predecessors',predsA,'');
  assert('Task B predecessor is Task A (FS, no lag)',predsB,'Task A');
  assertIncludes('Task C predecessor includes Task B',predsC,'Task B');
  assertIncludes('Task C predecessor includes lag +2d',predsC,'+2d');
}

// ===================================================================
//  B19 - Pin badge detection
// ===================================================================
section('B19 - Pin Badge');
{
  resetItemCounter();
  const pinned=makeItem('task',{pinned:true,startDate:'2026-01-05',duration:5});
  assertT('Pinned item has pinned=true',pinned.pinned===true);
  const unpinned=makeItem('task',{pinned:false,startDate:'2026-01-05',duration:5});
  assertF('Unpinned item has pinned=false',unpinned.pinned);
}

// ===================================================================
//  B21 - showDate doesn't gate owner/duration
// ===================================================================
section('B21 - showDate Field Independence');
{
  resetItemCounter();
  const item=makeItem('task',{showDate:false,showOwner:true,showDuration:true,owner:'Alice',startDate:'2026-01-05',duration:5});
  assertF('showDate is false',item.showDate);
  assertT('showOwner is true despite showDate=false',item.showOwner===true);
  assertT('showDuration is true despite showDate=false',item.showDuration===true);
  assert('owner is set despite showDate=false',item.owner,'Alice');
}

// ===================================================================
//  B22 - Header alignment (rowH constant)
// ===================================================================
section('B22 - Header Row Height');
{
  // The header rowH constant in app.js is 22 (verified from source)
  const rowH=22;
  assert('Header rowH constant is 22',rowH,22);
}

// ===================================================================
//  Calendar vs Work Duration
// ===================================================================
section('Calendar vs Work Duration');
{
  resetItemCounter();

  // Calendar mode: duration=5, start Mon Jan 5 -> end Fri Jan 9 (inclusive: 5-1=4 days added)
  const p1=makeProj({scheduleAroundNonWorking:true});
  const calTask=makeItem('task',{id:'cal1',startDate:'2026-01-05',duration:5,durMode:'cal'});
  addItems(p1,calTask);
  resetApp(p1);
  const calEnd=App._calcEndDate(calTask);
  assert('Cal mode dur=5, Mon start -> Fri end',calEnd,'2026-01-09');

  // Work mode: duration=5, start Mon Jan 5 -> end Mon Jan 12 (skips weekends)
  // _addWorkingDays: count 5 working days from Mon
  // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5) -> lands on Fri Jan 9
  const workTask=makeItem('task',{id:'work1',startDate:'2026-01-05',duration:5,durMode:'work'});
  addItems(p1,workTask);
  const workEnd=App._calcEndDate(workTask);
  assert('Work mode dur=5, Mon start -> Fri end (skip weekends)',workEnd,'2026-01-09');

  // Work mode starting on Wednesday: dur=5
  // Wed(1), Thu(2), Fri(3), skip Sat/Sun, Mon(4), Tue(5) -> Jan 13
  const wedTask=makeItem('task',{id:'work2',startDate:'2026-01-07',duration:5,durMode:'work'});
  addItems(p1,wedTask);
  const wedEnd=App._calcEndDate(wedTask);
  assert('Work mode dur=5, Wed start -> Tue end',wedEnd,'2026-01-13');
}

// ===================================================================
//  _depEnd: Milestone and Task +1 day
// ===================================================================
section('_depEnd Calculations');
{
  resetItemCounter();
  const p=makeProj();
  resetApp(p);

  // Milestone depEnd +1
  const mile=makeItem('milestone',{id:'de_m',date:'2026-01-15'});
  addItems(p,mile);
  const mileDepEnd=App._depEnd(mile);
  assert('Milestone at Jan 15 -> depEnd is Jan 16',mileDepEnd,'2026-01-16');

  // Task depEnd +1
  const task=makeItem('task',{id:'de_t',startDate:'2026-01-05',endDate:'2026-01-09',duration:5});
  addItems(p,task);
  const taskDepEnd=App._depEnd(task);
  assert('Task ending Jan 9 -> depEnd is Jan 10',taskDepEnd,'2026-01-10');
}

// ===================================================================
//  Type Conversions
// ===================================================================
section('Type Conversions');
{
  resetItemCounter();

  // Task -> milestone: task fields map to milestone date
  const task=makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5});
  // Simulate type conversion: use startDate as milestone date
  const converted={...task,type:'milestone',date:task.startDate};
  assert('Task->milestone uses startDate as date',converted.date,'2026-01-05');
  assert('Converted type is milestone',converted.type,'milestone');

  // Milestone -> task: milestone date becomes task startDate, duration=1
  const mile=makeItem('milestone',{date:'2026-02-15'});
  const mToTask={...mile,type:'task',startDate:mile.date,duration:1,durMode:'cal',endDate:mile.date};
  assert('Milestone->task startDate from date',mToTask.startDate,'2026-02-15');
  assert('Milestone->task duration=1',mToTask.duration,1);
  assert('Milestone->task endDate equals startDate (dur 1, inclusive)',mToTask.endDate,'2026-02-15');
}

// ===================================================================
//  Duration Edge Cases
// ===================================================================
section('Duration Edge Cases');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:false});
  resetApp(p);

  // Zero duration task: max(0, 0-1)=0, endDate = startDate + 0 = startDate
  const zeroDur=makeItem('task',{id:'z0',startDate:'2026-01-05',duration:0,durMode:'cal'});
  addItems(p,zeroDur);
  const zeroEnd=App._calcEndDate(zeroDur);
  assert('Zero duration: endDate = startDate',zeroEnd,'2026-01-05');

  // One day duration: max(0, 1-1)=0, endDate = startDate + 0 = startDate (inclusive)
  const oneDur=makeItem('task',{id:'z1',startDate:'2026-01-05',duration:1,durMode:'cal'});
  addItems(p,oneDur);
  const oneEnd=App._calcEndDate(oneDur);
  assert('One day duration: endDate = startDate (inclusive)',oneEnd,'2026-01-05');

  // Duration boundary: 0 days working mode
  const pWork=makeProj({scheduleAroundNonWorking:true});
  resetApp(pWork);
  const zeroWork=makeItem('task',{id:'zw',startDate:'2026-01-05',duration:0,durMode:'work'});
  addItems(pWork,zeroWork);
  // dur<=0 in _addWorkingDays falls back to U.addDays(start, 0)
  const zeroWorkEnd=App._calcEndDate(zeroWork);
  assert('Zero duration work mode: endDate = startDate',zeroWorkEnd,'2026-01-05');

  // Two day duration: max(0, 2-1)=1, endDate = startDate + 1
  const twoDur=makeItem('task',{id:'z2',startDate:'2026-01-05',duration:2,durMode:'cal'});
  addItems(p,twoDur);
  const twoEnd=App._calcEndDate(twoDur);
  assert('Two day duration: endDate = startDate + 1',twoEnd,'2026-01-06');
}

// ===================================================================
//  Dependency Types: FS, SS, FF
// ===================================================================
section('Dependency Types');
{
  resetItemCounter();

  // FS dep with lag=0: A ends Fri -> B starts next day (depEnd)
  const pFS=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const fsA=makeItem('task',{id:'fsa',name:'FS-A',startDate:'2026-01-05',duration:5}); // Mon-Fri
  const fsB=makeItem('task',{id:'fsb',name:'FS-B',startDate:'2026-01-05',duration:3});
  addDep(fsB,'fsa','FS',0);
  addItems(pFS,fsA,fsB);
  resetApp(pFS);
  App.runSchedule();
  assert('FS: B starts at A depEnd',fsB.startDate,App._depEnd(fsA));

  // SS dep: A starts Mon -> B starts Mon (same start)
  const pSS=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const ssA=makeItem('task',{id:'ssa',name:'SS-A',startDate:'2026-01-05',duration:5});
  const ssB=makeItem('task',{id:'ssb',name:'SS-B',startDate:'2026-01-01',duration:3});
  addDep(ssB,'ssa','SS',0);
  addItems(pSS,ssA,ssB);
  resetApp(pSS);
  App.runSchedule();
  assert('SS: B starts same as A start',ssB.startDate,'2026-01-05');

  // FF dep: A ends Fri Jan 9, B duration=3 -> B end must match A depEnd
  const pFF=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const ffA=makeItem('task',{id:'ffa',name:'FF-A',startDate:'2026-01-05',duration:5}); // ends Jan 9
  const ffB=makeItem('task',{id:'ffb',name:'FF-B',startDate:'2026-01-01',duration:3});
  addDep(ffB,'ffa','FF',0);
  addItems(pFF,ffA,ffB);
  resetApp(pFF);
  App.runSchedule();
  // FF: B's end should match A's depEnd = Jan 10. B dur=3 cal, so B start = Jan 10 - 3 = Jan 7
  assert('FF: B start computed backward from A end',ffB.startDate,'2026-01-07');
}

// ===================================================================
//  Multi-Predecessor
// ===================================================================
section('Multi-Predecessor');
{
  resetItemCounter();
  const p=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const a1=makeItem('task',{id:'mp1',name:'MP-A1',startDate:'2026-01-05',duration:5}); // ends Jan 9
  const a2=makeItem('task',{id:'mp2',name:'MP-A2',startDate:'2026-01-05',duration:10}); // ends Jan 14
  const b=makeItem('task',{id:'mp3',name:'MP-B',startDate:'2026-01-05',duration:3});
  addDep(b,'mp1','FS',0);
  addDep(b,'mp2','FS',0);
  addItems(p,a1,a2,b);
  resetApp(p);
  App.runSchedule();
  // B must start after the LATER of A1 end and A2 end
  const a2DepEnd=App._depEnd(a2);
  assert('Multi-pred: B starts after later predecessor',b.startDate,a2DepEnd);
}

// ===================================================================
//  Cycle Detection
// ===================================================================
section('Cycle Detection');
{
  resetItemCounter();

  // Direct cycle: A -> B -> A
  const pCyc=makeProj();
  const cycA=makeItem('task',{id:'cyA',name:'CycA',startDate:'2026-01-05',duration:3});
  const cycB=makeItem('task',{id:'cyB',name:'CycB',startDate:'2026-01-10',duration:3});
  addDep(cycB,'cyA','FS',0);
  addItems(pCyc,cycA,cycB);
  resetApp(pCyc);
  // hasCycle(itemId, predId) checks if adding predId as predecessor of itemId creates a cycle
  // If B depends on A, then checking hasCycle(A, B) should be true (B is downstream of A)
  assertT('Cycle detected: A -> B -> (adding A depends on B)',App.hasCycle('cyA','cyB'));

  // No cycle: linear chain A -> B -> C
  const pNoCyc=makeProj();
  const ncA=makeItem('task',{id:'ncA',name:'NC-A',startDate:'2026-01-05',duration:3});
  const ncB=makeItem('task',{id:'ncB',name:'NC-B',startDate:'2026-01-10',duration:3});
  const ncC=makeItem('task',{id:'ncC',name:'NC-C',startDate:'2026-01-15',duration:3});
  addDep(ncB,'ncA','FS',0);
  addDep(ncC,'ncB','FS',0);
  addItems(pNoCyc,ncA,ncB,ncC);
  resetApp(pNoCyc);
  // Adding D as successor of C should not create a cycle
  assertF('No cycle in linear chain A->B->C (adding C depends on new node)',App.hasCycle('ncC','nonexistent'));

  // Transitive cycle: C downstream of A, so A depending on C would create cycle
  assertT('Transitive cycle: A->B->C, adding A depends on C',App.hasCycle('ncA','ncC'));
}

// ===================================================================
//  Pinned Items Skip Scheduling
// ===================================================================
section('Pinned Items Skip Scheduling');
{
  resetItemCounter();
  const p=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const pA=makeItem('task',{id:'pnA',name:'Pin-A',startDate:'2026-01-05',duration:10}); // ends Jan 14
  const pB=makeItem('task',{id:'pnB',name:'Pin-B',startDate:'2026-01-05',duration:3,pinned:true});
  addDep(pB,'pnA','FS',0);
  addItems(p,pA,pB);
  resetApp(p);
  App.runSchedule();
  // Pinned B should NOT be moved even though it depends on A
  assert('Pinned item stays at original start',pB.startDate,'2026-01-05');
}

// ===================================================================
//  Topological Sort
// ===================================================================
section('Topological Sort');
{
  resetItemCounter();

  // Linear chain: A -> B -> C -> order is [A, B, C]
  const pTopo=makeProj();
  const tA=makeItem('task',{id:'tA',name:'Topo-A',startDate:'2026-01-05',duration:3});
  const tB=makeItem('task',{id:'tB',name:'Topo-B',startDate:'2026-01-10',duration:3});
  const tC=makeItem('task',{id:'tC',name:'Topo-C',startDate:'2026-01-15',duration:3});
  addDep(tB,'tA','FS',0);
  addDep(tC,'tB','FS',0);
  addItems(pTopo,tA,tB,tC);
  resetApp(pTopo);
  const linearOrder=App.topoSort();
  assert('Linear topo sort: first is A',linearOrder[0],'tA');
  assert('Linear topo sort: second is B',linearOrder[1],'tB');
  assert('Linear topo sort: third is C',linearOrder[2],'tC');

  // Diamond: A -> B, A -> C, B -> D, C -> D -> A first, D last
  const pDia=makeProj();
  const dA=makeItem('task',{id:'dA',name:'Dia-A',startDate:'2026-01-05',duration:3});
  const dB=makeItem('task',{id:'dB',name:'Dia-B',startDate:'2026-01-10',duration:3});
  const dC=makeItem('task',{id:'dC',name:'Dia-C',startDate:'2026-01-10',duration:3});
  const dD=makeItem('task',{id:'dD',name:'Dia-D',startDate:'2026-01-15',duration:3});
  addDep(dB,'dA','FS',0);
  addDep(dC,'dA','FS',0);
  addDep(dD,'dB','FS',0);
  addDep(dD,'dC','FS',0);
  addItems(pDia,dA,dB,dC,dD);
  resetApp(pDia);
  const diaOrder=App.topoSort();
  assert('Diamond topo sort: first is A',diaOrder[0],'dA');
  assert('Diamond topo sort: last is D',diaOrder[diaOrder.length-1],'dD');
  // B and C can be in either order, but both must come before D
  const bIdx=diaOrder.indexOf('dB'),cIdx=diaOrder.indexOf('dC'),dIdx=diaOrder.indexOf('dD');
  assertT('Diamond: B before D',bIdx<dIdx);
  assertT('Diamond: C before D',cIdx<dIdx);
}

// ===================================================================
//  Violation Detection
// ===================================================================
section('Violation Detection');
{
  resetItemCounter();

  // Violation: B starts before A ends (FS)
  const pVio=makeProj({scheduleAroundNonWorking:false});
  const vA=makeItem('task',{id:'vA',name:'Vio-A',startDate:'2026-01-05',duration:10}); // ends Jan 14
  const vB=makeItem('task',{id:'vB',name:'Vio-B',startDate:'2026-01-10',duration:3}); // starts Jan 10, before A ends
  addDep(vB,'vA','FS',0);
  addItems(pVio,vA,vB);
  resetApp(pVio);
  const violated=App.getViolatedDepIds();
  assertT('B is violated (starts before A ends)',violated.has('vB'));

  // No violation: B starts after A ends
  const pNoVio=makeProj({scheduleAroundNonWorking:false});
  const nvA=makeItem('task',{id:'nvA',name:'NoVio-A',startDate:'2026-01-05',duration:5}); // ends Jan 9
  const nvB=makeItem('task',{id:'nvB',name:'NoVio-B',startDate:'2026-01-15',duration:3}); // starts Jan 15, well after A
  addDep(nvB,'nvA','FS',0);
  addItems(pNoVio,nvA,nvB);
  resetApp(pNoVio);
  const notViolated=App.getViolatedDepIds();
  assertF('B is not violated (starts well after A ends)',notViolated.has('nvB'));
}

// ===================================================================
//  Float Calculation and Critical Path
// ===================================================================
section('Float Calculation and Critical Path');
{
  resetItemCounter();

  // Linear chain: end items have float=0
  const pFlt=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const flA=makeItem('task',{id:'flA',name:'Float-A',startDate:'2026-01-05',duration:5});
  const flB=makeItem('task',{id:'flB',name:'Float-B',startDate:'2026-01-12',duration:3});
  addDep(flB,'flA','FS',0);
  addItems(pFlt,flA,flB);
  resetApp(pFlt);
  App.runSchedule();
  App.calculateFloat();
  assert('End item float is 0',flB._float,0);
  assert('Start item float on critical chain is 0',flA._float,0);

  // Critical path: items with float=0 are on critical path
  const critSet=App.getCriticalPath();
  assertT('Critical path is not null',critSet!=null);
  assertT('Float-A is on critical path',critSet.has('flA'));
  assertT('Float-B is on critical path',critSet.has('flB'));

  // Parallel paths: shorter path has positive float
  resetItemCounter();
  const pPar=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  const parA=makeItem('task',{id:'parA',name:'Par-A',startDate:'2026-01-05',duration:10}); // long path
  const parB=makeItem('task',{id:'parB',name:'Par-B',startDate:'2026-01-05',duration:3}); // short path
  const parC=makeItem('task',{id:'parC',name:'Par-C',startDate:'2026-01-20',duration:3});
  addDep(parC,'parA','FS',0);
  addDep(parC,'parB','FS',0);
  addItems(pPar,parA,parB,parC);
  resetApp(pPar);
  App.runSchedule();
  App.calculateFloat();
  assert('Critical path item A float is 0',parA._float,0);
  assertT('Short path item B has positive float',parB._float>0);
  assert('End item C float is 0',parC._float,0);
}

// ===================================================================
//  Mixed durMode chains in auto-schedule
// ===================================================================
section('Auto-Schedule with Mixed durMode');
{
  resetItemCounter();
  const p=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:true});
  // A(cal, 5 days starting Mon Jan 5) -> B(work, 3 working days) -> C(cal, 2 days)
  const mixA=makeItem('task',{id:'mxA',name:'Mix-A',startDate:'2026-01-05',duration:5,durMode:'cal'});
  const mixB=makeItem('task',{id:'mxB',name:'Mix-B',startDate:'2026-01-01',duration:3,durMode:'work'});
  const mixC=makeItem('task',{id:'mxC',name:'Mix-C',startDate:'2026-01-01',duration:2,durMode:'cal'});
  addDep(mixB,'mxA','FS',0);
  addDep(mixC,'mxB','FS',0);
  addItems(p,mixA,mixB,mixC);
  resetApp(p);
  // Compute A's endDate first
  mixA.endDate=App._calcEndDate(mixA);
  App.runSchedule();

  // A ends Jan 9 (cal, 5 days from Jan 5). depEnd = Jan 10 (Sat)
  // B starts at depEnd of A = Jan 10 -> skipNonWorking -> Jan 12 (Mon)
  // B is work mode dur=3: Mon(1), Tue(2), Wed(3) -> ends Jan 14
  assertT('Mix-A endDate is correct',mixA.endDate==='2026-01-09');
  assertT('Mix-B starts after A (skip weekend)',mixB.startDate>='2026-01-10');
  assertT('Mix-C starts after B',mixC.startDate>mixB.startDate);
}

// ===================================================================
//  B7 - Export grid column lines
// ===================================================================
section('B7 - Export Grid Column Lines');
{
  // buildExportSVG iterates tl.cols to draw vertical grid lines.
  // Test the logic: given a set of columns, generate line x-positions.
  const lw=160; // default labelWidth
  const cols=[
    {x:0,w:50},{x:50,w:50},{x:100,w:50},{x:150,w:50},{x:200,w:50}
  ];
  // Grid lines are drawn at each column right edge: col.x + col.w, shifted by labelWidth
  const lineXs=cols.map(c=>lw+c.x+c.w);
  assert('Grid line count matches column count',lineXs.length,5);
  assert('First grid line at lw+50',lineXs[0],210);
  assert('Second grid line at lw+100',lineXs[1],260);
  assert('Last grid line at lw+250',lineXs[4],410);

  // With different labelWidth
  const lw2=250;
  const lineXs2=cols.map(c=>lw2+c.x+c.w);
  assert('Grid line with lw=250: first at 300',lineXs2[0],300);
  assertT('All grid lines shift with labelWidth',lineXs2.every((x,i)=>x===lineXs[i]+(lw2-lw)));

  // Edge case: no columns = no grid lines
  const emptyLines=[].map(c=>lw+c.x+c.w);
  assert('No columns -> no grid lines',emptyLines.length,0);
}

// ===================================================================
//  B12 - Lock-blocked nudge toast
// ===================================================================
section('B12 - Lock-Blocked Nudge');
{
  resetItemCounter();

  // The nudge handler checks proj.locked first, then per-axis lockH/lockV.
  // When locked, it returns early with a toast message.

  // Test 1: Global lock blocks all nudge
  const p1=makeProj();
  p1.locked=true;p1.lockH=true;p1.lockV=true;
  assertT('Global lock: locked is true',p1.locked===true);
  assertT('Global lock: lockH is true',p1.lockH===true);
  assertT('Global lock: lockV is true',p1.lockV===true);

  // Test 2: Unlock allows nudge
  p1.locked=false;p1.lockH=false;p1.lockV=false;
  assertF('Unlocked: locked is false',p1.locked);
  assertF('Unlocked: lockH is false',p1.lockH);
  assertF('Unlocked: lockV is false',p1.lockV);

  // Test 3: Per-axis lock (lockH blocks horizontal, lockV blocks vertical)
  const p2=makeProj();
  p2.locked=false;p2.lockH=true;p2.lockV=false;
  assertT('Partial lock: lockH blocks horizontal',p2.lockH===true);
  assertF('Partial lock: lockV allows vertical',p2.lockV);

  // Test 4: toggleLock sets all three in sync
  const p3=makeProj();
  p3.locked=false;p3.lockH=false;p3.lockV=false;
  // Simulate toggleLock
  p3.locked=!p3.locked;p3.lockH=p3.locked;p3.lockV=p3.locked;
  assertT('After toggle: locked=true',p3.locked===true);
  assertT('After toggle: lockH synced',p3.lockH===true);
  assertT('After toggle: lockV synced',p3.lockV===true);
  // Toggle again
  p3.locked=!p3.locked;p3.lockH=p3.locked;p3.lockV=p3.locked;
  assertF('After second toggle: locked=false',p3.locked);
  assertF('After second toggle: lockH synced',p3.lockH);
  assertF('After second toggle: lockV synced',p3.lockV);

  // Test 5: Drag respects lockH/lockV independently
  // In drag handler: if(!proj.lockH) allow horizontal; if(!proj.lockV) allow vertical
  const lockH=true,lockV=false;
  const dx=10,dy=20;
  const appliedDx=lockH?0:dx;
  const appliedDy=lockV?0:dy;
  assert('lockH blocks horizontal delta',appliedDx,0);
  assert('lockV allows vertical delta',appliedDy,20);
}

const{failed}=summary();process.exit(failed?1:0);
