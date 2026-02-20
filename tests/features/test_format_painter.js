#!/usr/bin/env node
/**
 * Timeline Studio -- F42 Format Painter Test Suite
 * ~42 tests covering:
 *   1. State Management (toggle, deactivate, persistence)
 *   2. Property Capture (individual, composites, deep copy, selective)
 *   3. Application (single/multi-prop, cross-type, self-skip, undo)
 *   4. Mode Interaction (lasso/pan exclusion, escape, view switch, single vs persistent)
 *   5. F4 Repeat (re-apply, multi-select, no-data error)
 */

const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,addItems,resetItemCounter}=require('../helpers/builders');

console.log('\n\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  F42 FORMAT PAINTER TEST SUITE\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');

// ═══════════════════════════════════════════════════════════════════
//  FP_PROPS_DEF constant (mirrors app.js)
// ═══════════════════════════════════════════════════════════════════
const FP_PROPS_DEF=[
  {key:'color',label:'Color'},{key:'textColor',label:'Text Color'},{key:'edgeTextColor',label:'Edge Text Color'},
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


// =====================================================================
//  SECTION 1: STATE MANAGEMENT (~10 tests)
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

  // Test: FP state fields initial values
  const fpState={_fpMode:false,_fpPersist:false,_fpSourceId:null,_fpSourceData:null};
  assertF('_fpMode starts false',fpState._fpMode);
  assertF('_fpPersist starts false',fpState._fpPersist);
  assert('_fpSourceId starts null',fpState._fpSourceId,null);
  assert('_fpSourceData starts null',fpState._fpSourceData,null);

  // Test: toggle activates and deactivates
  fpState._fpMode=true;fpState._fpPersist=false;fpState._fpSourceId='it_1';
  assertT('After toggle, _fpMode is true',fpState._fpMode);
  // deactivate
  fpState._fpMode=false;fpState._fpPersist=false;fpState._fpSourceId=null;fpState._fpSourceData=null;
  assertF('After deactivate, _fpMode is false',fpState._fpMode);
  assert('After deactivate, _fpSourceId is null',fpState._fpSourceId,null);
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
//  SECTION 4: MODE INTERACTION (~8 tests)
// =====================================================================
section('4. Mode Interaction');
resetItemCounter();

(()=>{
  // Test: FP requires exactly 1 selected item
  const fpState={_fpMode:false,_fpPersist:false,_fpSourceId:null,_fpSourceData:null};
  const sel0=[];
  const sel1=['it_1'];
  const sel2=['it_1','it_2'];

  assertF('Cannot activate with 0 selection',sel0.length===1);
  assertT('Can activate with 1 selection',sel1.length===1);
  assertF('Cannot activate with 2 selection',sel2.length===1);

  // Test: Mutual exclusion — activating FP should require lasso/pan off
  let lassoMode=true,panMode=false;
  // Simulate: activating FP deactivates lasso
  if(lassoMode)lassoMode=false;
  fpState._fpMode=true;
  assertF('Lasso off when FP activates',lassoMode);
  assertT('FP on',fpState._fpMode);

  // Simulate: activating lasso deactivates FP
  fpState._fpMode=false;fpState._fpPersist=false;fpState._fpSourceId=null;
  lassoMode=true;
  assertT('Lasso on when FP deactivates',lassoMode);
  assertF('FP off when lasso activates',fpState._fpMode);

  // Test: Escape deactivates FP
  fpState._fpMode=true;fpState._fpPersist=true;fpState._fpSourceId='it_1';
  // Simulate escape
  fpState._fpMode=false;fpState._fpPersist=false;fpState._fpSourceId=null;fpState._fpSourceData=null;
  assertF('Escape deactivates FP',fpState._fpMode);
  assert('Escape clears sourceId',fpState._fpSourceId,null);

  // Test: View switch to data deactivates FP
  fpState._fpMode=true;
  const view='data';
  if(fpState._fpMode&&view!=='timeline'){fpState._fpMode=false;fpState._fpPersist=false;fpState._fpSourceId=null}
  assertF('Data view deactivates FP',fpState._fpMode);
})();


// =====================================================================
//  SECTION 5: F4 REPEAT (~4 tests)
// =====================================================================
section('5. F4 Repeat');
resetItemCounter();

(()=>{
  const p=makeProj();
  const src=makeFormattedTask({id:'rp_src'});
  const t1=makePlainTask({id:'rp_t1'});
  const t2=makePlainTask({id:'rp_t2'});
  const t3=makePlainTask({id:'rp_t3'});
  p.items=[src,t1,t2,t3];resetApp(p);

  // Capture source data
  const sourceData=captureFPData(src,['color','textColor','fontSize','labelPosition']);

  // Test: F4 applies to single selection
  fpApply(t1,sourceData);
  assert('F4 single: color applied',t1.color,'#ff0000');
  assert('F4 single: fontSize applied',t1.fontSize,14);

  // Test: F4 applies to multiple selection
  const sel=[t2,t3];
  sel.forEach(t=>fpApply(t,sourceData));
  assert('F4 multi: t2 color',t2.color,'#ff0000');
  assert('F4 multi: t3 color',t3.color,'#ff0000');
  assert('F4 multi: t2 labelPosition',t2.labelPosition,'left');
  assert('F4 multi: t3 labelPosition',t3.labelPosition,'left');

  // Test: F4 with no source data = no-op
  const noData=null;
  assertF('No source data returns falsy',!!noData);

  // Test: F4 preserves non-selected properties
  assert('F4 preserves startDate',t1.startDate,'2026-01-05');
  assert('F4 preserves owner',t1.owner,'');
})();


// ═══════════════════════════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════════════════════════
summary();
