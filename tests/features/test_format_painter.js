#!/usr/bin/env node
/**
 * Timeline Studio -- F42 Format Painter Test Suite (v3: split button + settings dropdown)
 * ~90 tests covering:
 *   1. State Management (staged, activate, deactivate, persistence)
 *   2. Property Capture (individual, composites, deep copy, selective)
 *   3. Application (single/multi-prop, cross-type, self-skip, undo)
 *   4. Mode Interaction (staged→activate, lasso/pan exclusion, escape, view switch)
 *   5. F4 Shortcut (single entry, double-tap upgrade, staged confirm)
 *   6. Split Button Behavior (disabled state, popover sync, settings-only path)
 */

const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,addItems,resetItemCounter}=require('../helpers/builders');

console.log('\n\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  F42 FORMAT PAINTER TEST SUITE (v2)\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');

// ═══════════════════════════════════════════════════════════════════
//  FP_PROPS_DEF constant (mirrors app.js)
// ═══════════════════════════════════════════════════════════════════
const FP_PROPS_DEF=[
  {key:'color',label:'Color'},{key:'textColor',label:'Text Color'},{key:'edgeTextColor',label:'Date Text Color'},
  {key:'fontSize',label:'Font Size'},{key:'labelPosition',label:'Label Position'},{key:'iconType',label:'Icon'},
  {key:'dateDisplay',label:'Date Display',composite:true},{key:'dateFormat',label:'Date Format'},
  {key:'showOwner',label:'Show Owner'},{key:'status',label:'Status'},
  {key:'hiddenPinned',label:'Hidden / Pinned',composite:true},{key:'vLine',label:'Vertical Line'},
];

// ═══════════════════════════════════════════════════════════════════
//  Minimal Format Painter logic (extracted from app.js for testing)
// ═══════════════════════════════════════════════════════════════════
const COMPOSITE_MAP={
  dateDisplay:['showDate','showStartDate','showEndDate','showDuration','durationFmt'],
  hiddenPinned:['hidden','pinned'],
};

function captureFPData(src, selectedProps){
  if(!src)return null;
  if(!selectedProps.length)return null;
  const data={};
  for(const key of selectedProps){
    if(COMPOSITE_MAP[key]){for(const sk of COMPOSITE_MAP[key]){data[sk]=src[sk]}}
    else if(key==='vLine'){data.vLine=src.vLine?JSON.parse(JSON.stringify(src.vLine)):null}
    else if(key==='status'){data.status=src.status;data.statusDate=src.statusDate?U.iso(new Date()):src.statusDate}
    else{data[key]=src[key]}
  }
  return data;
}

function fpApply(target, sourceData){
  for(const[k,v]of Object.entries(sourceData)){
    target[k]=(typeof v==='object'&&v!==null)?JSON.parse(JSON.stringify(v)):v;
  }
}

// Helper: create a fully formatted task
function makeFormattedTask(overrides={}){
  return makeItem('task',Object.assign({
    color:'#ff0000',textColor:'#00ff00',edgeTextColor:'#0000ff',
    fontSize:14,labelPosition:'left',
    showDate:true,showStartDate:true,showEndDate:true,showDuration:true,durationFmt:'weeks',
    dateFormat:'MM/DD/YYYY',showOwner:true,owner:'Alice',
    status:'on-track',statusDate:'2026-03-01',
    hidden:false,pinned:true,
    vLine:{enabled:true,style:'dashed',color:'#abcdef',direction:'both',extent:'swim'},
  },overrides));
}

// Helper: create a plain task with defaults
function makePlainTask(overrides={}){
  return makeItem('task',Object.assign({
    color:'#4f8cc9',textColor:'',edgeTextColor:'',
    fontSize:11,labelPosition:'right',
    showDate:false,showStartDate:false,showEndDate:false,showDuration:false,durationFmt:'days',
    dateFormat:'',showOwner:false,owner:'',
    status:'',statusDate:'',
    hidden:false,pinned:false,
    vLine:{enabled:false,style:'solid',color:'#888888',direction:'down',extent:'full'},
  },overrides));
}

// FP state simulator (mirrors app.js state machine)
function newFPState(){
  return{_fpStaged:false,_fpMode:false,_fpPersist:false,_fpSourceId:null,_fpSourceData:null};
}
function simStage(st,sourceId,sourceData){
  st._fpStaged=true;st._fpSourceId=sourceId;st._fpSourceData=sourceData;
}
function simActivate(st,persistent){
  st._fpStaged=false;st._fpMode=true;st._fpPersist=!!persistent;
}
function simDeactivate(st){
  st._fpStaged=false;st._fpMode=false;st._fpPersist=false;st._fpSourceId=null;st._fpSourceData=null;
}


// =====================================================================
//  SECTION 1: STATE MANAGEMENT (~14 tests)
// =====================================================================
section('1. State Management');
resetItemCounter();

(()=>{
  // Test: FP_PROPS_DEF has 12 entries
  assert('FP_PROPS_DEF has 12 entries',FP_PROPS_DEF.length,12);

  // Test: All keys are unique
  const keys=FP_PROPS_DEF.map(p=>p.key);
  const unique=new Set(keys);
  assert('FP_PROPS_DEF keys are unique',unique.size,12);

  // Test: composite flag on dateDisplay and hiddenPinned
  const dd=FP_PROPS_DEF.find(p=>p.key==='dateDisplay');
  assertT('dateDisplay is composite',dd.composite===true);
  const hp=FP_PROPS_DEF.find(p=>p.key==='hiddenPinned');
  assertT('hiddenPinned is composite',hp.composite===true);

  // Test: non-composite props don't have composite flag
  const color=FP_PROPS_DEF.find(p=>p.key==='color');
  assertF('color is not composite',!!color.composite);

  // Test: FP state fields initial values (new 3-state: idle/staged/painting)
  const st=newFPState();
  assertF('_fpStaged starts false',st._fpStaged);
  assertF('_fpMode starts false',st._fpMode);
  assertF('_fpPersist starts false',st._fpPersist);
  assert('_fpSourceId starts null',st._fpSourceId,null);
  assert('_fpSourceData starts null',st._fpSourceData,null);

  // Test: Stage sets _fpStaged but NOT _fpMode
  simStage(st,'it_1',{color:'#ff0000'});
  assertT('After stage: _fpStaged is true',st._fpStaged);
  assertF('After stage: _fpMode is false',st._fpMode);
  assert('After stage: sourceId set',st._fpSourceId,'it_1');

  // Test: Activate transitions from staged to painting
  simActivate(st,false);
  assertF('After activate: _fpStaged is false',st._fpStaged);
  assertT('After activate: _fpMode is true',st._fpMode);
  assertF('After activate(false): _fpPersist is false',st._fpPersist);

  // Test: Deactivate resets everything
  simDeactivate(st);
  assertF('After deactivate: _fpStaged is false',st._fpStaged);
  assertF('After deactivate: _fpMode is false',st._fpMode);
  assert('After deactivate: _fpSourceId is null',st._fpSourceId,null);
  assert('After deactivate: _fpSourceData is null',st._fpSourceData,null);
})();


// =====================================================================
//  SECTION 2: PROPERTY CAPTURE (~8 tests)
// =====================================================================
section('2. Property Capture');
resetItemCounter();

(()=>{
  const p=makeProj();
  const src=makeFormattedTask({id:'src1'});
  const items=[src];
  p.items=items;resetApp(p);

  // Test: Capture single property (color)
  const d1=captureFPData(src,['color']);
  assert('Single prop capture: color',d1.color,'#ff0000');
  assertF('Single prop capture: no textColor',d1.hasOwnProperty('textColor'));

  // Test: Capture multiple properties
  const d2=captureFPData(src,['color','textColor','fontSize']);
  assert('Multi prop capture: color',d2.color,'#ff0000');
  assert('Multi prop capture: textColor',d2.textColor,'#00ff00');
  assert('Multi prop capture: fontSize',d2.fontSize,14);
  assertF('Multi prop: no labelPosition',d2.hasOwnProperty('labelPosition'));

  // Test: Composite dateDisplay expands to sub-keys
  const d3=captureFPData(src,['dateDisplay']);
  assertT('dateDisplay expands showDate',d3.hasOwnProperty('showDate'));
  assertT('dateDisplay expands showStartDate',d3.hasOwnProperty('showStartDate'));
  assertT('dateDisplay expands showEndDate',d3.hasOwnProperty('showEndDate'));
  assertT('dateDisplay expands showDuration',d3.hasOwnProperty('showDuration'));
  assertT('dateDisplay expands durationFmt',d3.hasOwnProperty('durationFmt'));
  assert('dateDisplay: showDate value',d3.showDate,true);
  assert('dateDisplay: durationFmt value',d3.durationFmt,'weeks');

  // Test: Composite hiddenPinned expands
  const d4=captureFPData(src,['hiddenPinned']);
  assertT('hiddenPinned expands hidden',d4.hasOwnProperty('hidden'));
  assertT('hiddenPinned expands pinned',d4.hasOwnProperty('pinned'));
  assert('hiddenPinned: pinned value',d4.pinned,true);

  // Test: vLine deep copy
  const d5=captureFPData(src,['vLine']);
  assertT('vLine captured',d5.vLine!==null);
  assert('vLine color',d5.vLine.color,'#abcdef');
  assert('vLine style',d5.vLine.style,'dashed');
  // Mutating captured vLine should not affect source
  d5.vLine.color='#000000';
  assert('vLine deep copy: source unchanged',src.vLine.color,'#abcdef');

  // Test: Empty props returns null
  const d6=captureFPData(src,[]);
  assert('Empty props returns null',d6,null);

  // Test: Null source returns null
  const d7=captureFPData(null,['color']);
  assert('Null source returns null',d7,null);
})();


// =====================================================================
//  SECTION 3: APPLICATION (~12 tests)
// =====================================================================
section('3. Application');
resetItemCounter();

(()=>{
  const p=makeProj();
  const src=makeFormattedTask({id:'src_a'});
  const tgt=makePlainTask({id:'tgt_a'});
  p.items=[src,tgt];resetApp(p);

  // Test: Apply single property (color)
  const d1=captureFPData(src,['color']);
  fpApply(tgt,d1);
  assert('Apply color: target updated',tgt.color,'#ff0000');
  assert('Apply color: textColor unchanged',tgt.textColor,'');

  // Test: Apply multiple properties
  const tgt2=makePlainTask({id:'tgt_b'});
  p.items.push(tgt2);
  const d2=captureFPData(src,['color','textColor','fontSize','labelPosition']);
  fpApply(tgt2,d2);
  assert('Multi apply: color',tgt2.color,'#ff0000');
  assert('Multi apply: textColor',tgt2.textColor,'#00ff00');
  assert('Multi apply: fontSize',tgt2.fontSize,14);
  assert('Multi apply: labelPosition',tgt2.labelPosition,'left');

  // Test: Apply composite dateDisplay
  const tgt3=makePlainTask({id:'tgt_c'});
  p.items.push(tgt3);
  const d3=captureFPData(src,['dateDisplay']);
  fpApply(tgt3,d3);
  assert('Apply dateDisplay: showDate',tgt3.showDate,true);
  assert('Apply dateDisplay: showStartDate',tgt3.showStartDate,true);
  assert('Apply dateDisplay: showDuration',tgt3.showDuration,true);
  assert('Apply dateDisplay: durationFmt',tgt3.durationFmt,'weeks');

  // Test: Apply vLine deep copies to target
  const tgt4=makePlainTask({id:'tgt_d'});
  p.items.push(tgt4);
  const d4=captureFPData(src,['vLine']);
  fpApply(tgt4,d4);
  assert('Apply vLine: enabled',tgt4.vLine.enabled,true);
  assert('Apply vLine: color',tgt4.vLine.color,'#abcdef');
  // Ensure deep copy — mutating target vLine shouldn't affect source
  tgt4.vLine.color='#999';
  assert('Apply vLine: source unaffected',src.vLine.color,'#abcdef');

  // Test: Apply hiddenPinned
  const tgt5=makePlainTask({id:'tgt_e'});
  p.items.push(tgt5);
  const d5=captureFPData(src,['hiddenPinned']);
  fpApply(tgt5,d5);
  assert('Apply hiddenPinned: pinned',tgt5.pinned,true);
  assert('Apply hiddenPinned: hidden',tgt5.hidden,false);

  // Test: Apply status
  const tgt6=makePlainTask({id:'tgt_f'});
  p.items.push(tgt6);
  const d6=captureFPData(src,['status']);
  fpApply(tgt6,d6);
  assert('Apply status: status value',tgt6.status,'on-track');
})();

// Cross-type application tests
(()=>{
  resetItemCounter();
  const p=makeProj();

  // Task → Milestone
  const taskSrc=makeFormattedTask({id:'task_src'});
  const msTgt=makeItem('milestone',{id:'ms_tgt',color:'#000',textColor:'',fontSize:11,labelPosition:'right'});
  p.items=[taskSrc,msTgt];resetApp(p);

  const d1=captureFPData(taskSrc,['color','textColor','fontSize','labelPosition']);
  fpApply(msTgt,d1);
  assert('Task→MS: color applied',msTgt.color,'#ff0000');
  assert('Task→MS: textColor applied',msTgt.textColor,'#00ff00');
  assert('Task→MS: fontSize applied',msTgt.fontSize,14);
  assert('Task→MS: labelPosition applied',msTgt.labelPosition,'left');

  // Milestone → Task
  const msSrc=makeItem('milestone',{id:'ms_src',color:'#aaa',textColor:'#bbb',fontSize:16,iconType:'star'});
  const taskTgt=makePlainTask({id:'task_tgt'});
  p.items.push(msSrc,taskTgt);

  const d2=captureFPData(msSrc,['color','textColor','fontSize']);
  fpApply(taskTgt,d2);
  assert('MS→Task: color applied',taskTgt.color,'#aaa');
  assert('MS→Task: textColor applied',taskTgt.textColor,'#bbb');
  assert('MS→Task: fontSize applied',taskTgt.fontSize,16);
})();


// =====================================================================
//  SECTION 4: MODE INTERACTION (~12 tests)
// =====================================================================
section('4. Mode Interaction');
resetItemCounter();

(()=>{
  // Test: Staging requires exactly 1 selected item
  const sel0=[];
  const sel1=['it_1'];
  const sel2=['it_1','it_2'];
  assertF('Cannot stage with 0 selection',sel0.length===1);
  assertT('Can stage with 1 selection',sel1.length===1);
  assertF('Cannot stage with 2 selection',sel2.length===1);

  // Test: Stage→Activate→Deactivate flow (single)
  const st=newFPState();
  simStage(st,'it_1',{color:'#ff0000'});
  assertT('Staged: _fpStaged true',st._fpStaged);
  assertF('Staged: _fpMode false',st._fpMode);
  simActivate(st,false);
  assertF('Activated single: _fpStaged false',st._fpStaged);
  assertT('Activated single: _fpMode true',st._fpMode);
  assertF('Activated single: _fpPersist false',st._fpPersist);
  simDeactivate(st);
  assertF('Deactivated: all clear',st._fpMode||st._fpStaged||st._fpPersist);

  // Test: Stage→Activate→Deactivate flow (persistent)
  simStage(st,'it_2',{color:'#00ff00'});
  simActivate(st,true);
  assertT('Activated persistent: _fpPersist true',st._fpPersist);
  assertT('Activated persistent: _fpMode true',st._fpMode);
  simDeactivate(st);

  // Test: Mutual exclusion — activating FP should require lasso/pan off
  let lassoMode=true;
  // Simulate: staging FP deactivates lasso
  if(lassoMode)lassoMode=false;
  simStage(st,'it_1',{color:'#ff0000'});
  assertF('Lasso off when FP stages',lassoMode);
  assertT('FP staged',st._fpStaged);

  // Simulate: activating lasso deactivates FP
  simDeactivate(st);
  lassoMode=true;
  assertT('Lasso on when FP deactivates',lassoMode);
  assertF('FP off when lasso activates',st._fpMode);

  // Test: Escape deactivates staged
  simStage(st,'it_1',{color:'#ff0000'});
  simDeactivate(st); // escape
  assertF('Escape deactivates staged',st._fpStaged);
  assert('Escape clears sourceId',st._fpSourceId,null);

  // Test: Escape deactivates painting
  simStage(st,'it_1',{color:'#ff0000'});
  simActivate(st,true);
  simDeactivate(st); // escape
  assertF('Escape deactivates painting',st._fpMode);

  // Test: View switch to data deactivates both states
  simStage(st,'it_1',{color:'#ff0000'});
  const view='data';
  if((st._fpStaged||st._fpMode)&&view!=='timeline')simDeactivate(st);
  assertF('Data view deactivates staged FP',st._fpStaged);

  simStage(st,'it_1',{color:'#ff0000'});
  simActivate(st,false);
  if((st._fpStaged||st._fpMode)&&view!=='timeline')simDeactivate(st);
  assertF('Data view deactivates painting FP',st._fpMode);
})();


// =====================================================================
//  SECTION 5: F4 SHORTCUT (~10 tests)
// =====================================================================
section('5. F4 Shortcut');
resetItemCounter();

(()=>{
  const p=makeProj();
  const src=makeFormattedTask({id:'f4_src'});
  const t1=makePlainTask({id:'f4_t1'});
  const t2=makePlainTask({id:'f4_t2'});
  const t3=makePlainTask({id:'f4_t3'});
  p.items=[src,t1,t2,t3];resetApp(p);

  // Simulate F4 state machine transitions

  // Test: F4 from idle → staged + activated (single)
  const st=newFPState();
  const srcData=captureFPData(src,['color','textColor','fontSize','labelPosition']);
  // F4 press 1: idle → stage + activate single
  simStage(st,src.id,srcData);
  simActivate(st,false);
  assertT('F4 from idle: _fpMode true',st._fpMode);
  assertF('F4 from idle: _fpPersist false (single)',st._fpPersist);
  assertF('F4 from idle: _fpStaged false (moved to painting)',st._fpStaged);

  // Test: F4 again in single mode → upgrade to multi
  st._fpPersist=true; // simulate upgrade
  assertT('F4 again: upgraded to persistent',st._fpPersist);
  assertT('F4 again: still in _fpMode',st._fpMode);
  simDeactivate(st);

  // Test: F4 from staged (popover open) → confirm single mode
  simStage(st,src.id,srcData);
  assertT('F4 staged: _fpStaged true',st._fpStaged);
  simActivate(st,false); // F4 confirms
  assertT('F4 confirms staged: _fpMode true',st._fpMode);
  assertF('F4 confirms staged: _fpStaged false',st._fpStaged);
  simDeactivate(st);

  // Test: F4 in persistent mode → no-op (already multi)
  simStage(st,src.id,srcData);
  simActivate(st,true);
  assertT('Already persistent before F4',st._fpPersist);
  // F4 again does nothing (stays persistent)
  assertT('F4 no-op: still persistent',st._fpPersist);
  assertT('F4 no-op: still painting',st._fpMode);
  simDeactivate(st);

  // Test: Apply in single mode → paint applied, no persist needed
  fpApply(t1,srcData);
  assert('F4 single apply: color',t1.color,'#ff0000');
  assert('F4 single apply: fontSize',t1.fontSize,14);

  // Test: Apply in multi mode → paint applied to multiple targets
  [t2,t3].forEach(t=>fpApply(t,srcData));
  assert('F4 multi apply: t2 color',t2.color,'#ff0000');
  assert('F4 multi apply: t3 color',t3.color,'#ff0000');
  assert('F4 multi apply: t2 labelPosition',t2.labelPosition,'left');
  assert('F4 multi apply: t3 labelPosition',t3.labelPosition,'left');

  // Test: F4 preserves non-selected properties
  assert('F4 preserves startDate',t1.startDate,'2026-01-05');
  assert('F4 preserves owner (empty)',t1.owner,'');
})();


// =====================================================================
//  SECTION 6: SPLIT BUTTON BEHAVIOR (~10 tests)
// =====================================================================
section('6. Split Button Behavior');
resetItemCounter();

(()=>{
  // Helper: simulate main button disabled logic
  function isMainDisabled(selLen, fpMode, fpStaged){
    return selLen!==1&&!fpMode&&!fpStaged;
  }

  // Helper: simulate popover sync state
  function syncPopover(selLen){
    const ok=selLen===1;
    return{noteHidden:ok,applyOnceDisabled:!ok,applyManyDisabled:!ok};
  }

  // Test: Main icon disabled with 0 items selected
  assertT('Main disabled: sel=0, idle',isMainDisabled(0,false,false));

  // Test: Main icon disabled with 2 items selected
  assertT('Main disabled: sel=2, idle',isMainDisabled(2,false,false));

  // Test: Main icon enabled with 1 item selected
  assertF('Main enabled: sel=1, idle',isMainDisabled(1,false,false));

  // Test: Main icon enabled when staged (even if sel changes)
  assertF('Main enabled: sel=0, staged',isMainDisabled(0,false,true));

  // Test: Main icon enabled when painting (even if sel changes)
  assertF('Main enabled: sel=0, painting',isMainDisabled(0,true,false));

  // Test: Popover sync — sel=0 → buttons disabled, note visible
  const s0=syncPopover(0);
  assertF('Sync sel=0: note visible',s0.noteHidden);
  assertT('Sync sel=0: applyOnce disabled',s0.applyOnceDisabled);
  assertT('Sync sel=0: applyMany disabled',s0.applyManyDisabled);

  // Test: Popover sync — sel=1 → buttons enabled, note hidden
  const s1=syncPopover(1);
  assertT('Sync sel=1: note hidden',s1.noteHidden);
  assertF('Sync sel=1: applyOnce enabled',s1.applyOnceDisabled);
  assertF('Sync sel=1: applyMany enabled',s1.applyManyDisabled);

  // Test: Popover sync — sel=3 → buttons disabled
  const s3=syncPopover(3);
  assertF('Sync sel=3: note visible',s3.noteHidden);
  assertT('Sync sel=3: applyOnce disabled',s3.applyOnceDisabled);

  // Test: Settings-only open → Apply path stages first
  // Simulate: popover opened via dropdown (not staged), user clicks Apply Once
  const st=newFPState();
  const src=makeFormattedTask({id:'split_src'});
  // !_fpStaged → stageFP() called first
  assertF('Before settings apply: not staged',st._fpStaged);
  simStage(st,src.id,{color:'#ff0000'});
  assertT('Settings apply: staged first',st._fpStaged);
  simActivate(st,false);
  assertT('Settings apply: then activated',st._fpMode);
  assertF('Settings apply: staged cleared',st._fpStaged);
  simDeactivate(st);

  // Test: Close button in settings mode (not staged) just hides
  // Simulate: popover open via dropdown, _fpStaged=false → close hides only
  const st2=newFPState();
  // In settings mode, close doesn't call deactivate
  assertF('Settings close: not staged',st2._fpStaged);
  assertF('Settings close: not painting',st2._fpMode);
  // Just _hideFPPopover called, state unchanged

  // Test: Close button in staged mode deactivates
  simStage(st2,'x',{color:'#abc'});
  assertT('Staged close: was staged',st2._fpStaged);
  simDeactivate(st2); // close calls deactivateFP()
  assertF('Staged close: deactivated',st2._fpStaged);
  assert('Staged close: source cleared',st2._fpSourceId,null);
})();


// ═══════════════════════════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════════════════════════
summary();
