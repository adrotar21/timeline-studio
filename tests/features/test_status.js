#!/usr/bin/env node
/**
 * Timeline Studio -- F22 Status System Test Suite
 * ~200 tests covering the full status feature:
 *   1. Data Model
 *   2. Status Definitions Management
 *   3. Impact Modal Logic
 *   4. Status Display Config
 *   5. Filter & Sort
 *   6. Inline Display Text Resolution
 */

const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,assertThrows,assertApprox,section,summary,getStats,resetStats}=require('../helpers/assert');
const{U,App,resetApp,HOLIDAYS_MLK,HOLIDAYS_MLK_GOODFRI,HOLIDAYS_XMAS}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

console.log('\n\x1b[36m========================================\x1b[0m');
console.log('\x1b[36m  F22 STATUS SYSTEM TEST SUITE\x1b[0m');
console.log('\x1b[36m========================================\x1b[0m');

// =====================================================================
//  SECTION 1: DATA MODEL (~40 tests)
// =====================================================================
section('1. Data Model');
resetItemCounter();

(()=>{
  const p=makeProj();
  resetApp(p);

  // _getStatusDef returns correct def for each default status ID
  const expectedIds=['tbd','on-track','at-risk','off-track','complete','not-started'];
  for(const id of expectedIds){
    const sd=App._getStatusDef(id);
    assertT(`_getStatusDef('${id}') returns a def`,sd!==null);
    assert(`_getStatusDef('${id}').id matches`,sd.id,id);
  }

  // Returns null for 'blank'
  const blankDef=App._getStatusDef('blank');
  assert('_getStatusDef(blank) returns null',blankDef,null);

  // Returns null for empty string
  assert('_getStatusDef("") returns null',App._getStatusDef(''),null);

  // Returns null for undefined
  assert('_getStatusDef(undefined) returns null',App._getStatusDef(undefined),null);

  // Returns null for null
  assert('_getStatusDef(null) returns null',App._getStatusDef(null),null);

  // Returns null for unknown ID
  assert('_getStatusDef(nonexistent) returns null',App._getStatusDef('nonexistent'),null);

  // Returns null for random garbage
  assert('_getStatusDef(xyz-123) returns null',App._getStatusDef('xyz-123'),null);
})();

(()=>{
  // Handles missing statusDefs array gracefully
  const p=makeProj();
  delete p.statusDefs;
  resetApp(p);
  assert('missing statusDefs: _getStatusDef returns null',App._getStatusDef('on-track'),null);
})();

(()=>{
  // Handles empty statusDefs array
  const p=makeProj({statusDefs:[]});
  resetApp(p);
  assert('empty statusDefs: _getStatusDef returns null',App._getStatusDef('on-track'),null);
})();

(()=>{
  // Default statusDefs has 7 entries
  const defs=makeStatusDefs();
  assert('default statusDefs has 7 entries',defs.length,7);

  // Blank entry is always index 0
  assert('blank entry is index 0',defs[0].id,'blank');
  assert('blank entry name is empty',defs[0].name,'');

  // Each default has required fields
  const requiredFields=['id','name','desc','color','shortName','emoji'];
  for(const sd of defs){
    for(const f of requiredFields){
      assertT(`statusDef '${sd.id}' has field '${f}'`,f in sd);
    }
  }
})();

(()=>{
  resetItemCounter();
  // Per-item defaults: status='', statusDate=''
  const task=makeItem('task');
  assert('makeItem task default status is empty',task.status,'');
  assert('makeItem task default statusDate is empty',task.statusDate,'');

  const ms=makeItem('milestone');
  assert('makeItem milestone default status is empty',ms.status,'');
  assert('makeItem milestone default statusDate is empty',ms.statusDate,'');
})();

(()=>{
  resetItemCounter();
  // Setting status to a valid ID preserves the ID
  const task=makeItem('task',{status:'on-track'});
  assert('item with status on-track preserves ID',task.status,'on-track');

  const p=makeProj();
  p.items=[task];
  resetApp(p);
  const sd=App._getStatusDef(task.status);
  assertT('_getStatusDef resolves on-track for item',sd!==null);
  assert('resolved def name is On Track',sd.name,'On Track');
})();

(()=>{
  resetItemCounter();
  // Clearing status (set to '') means _getStatusDef returns null
  const task=makeItem('task',{status:'on-track'});
  const p=makeProj();
  p.items=[task];
  resetApp(p);
  task.status='';
  assert('cleared status resolves to null',App._getStatusDef(task.status),null);
})();

(()=>{
  resetItemCounter();
  // Status references by ID survive statusDef name changes
  const p=makeProj();
  const task=makeItem('task',{status:'on-track'});
  p.items=[task];
  resetApp(p);

  // Rename the on-track def
  const def=p.statusDefs.find(sd=>sd.id==='on-track');
  def.name='Progressing Well';
  const resolved=App._getStatusDef(task.status);
  assertT('status still resolves after name change',resolved!==null);
  assert('resolved def has new name',resolved.name,'Progressing Well');
  assert('item status ID unchanged',task.status,'on-track');
})();

(()=>{
  resetItemCounter();
  // Dangling status ID (item references deleted def) returns null
  const p=makeProj();
  const task=makeItem('task',{status:'on-track'});
  p.items=[task];
  // Remove on-track from defs
  p.statusDefs=p.statusDefs.filter(sd=>sd.id!=='on-track');
  resetApp(p);
  assert('dangling status ID returns null',App._getStatusDef(task.status),null);
})();

(()=>{
  resetItemCounter();
  // Status survives color change on def
  const p=makeProj();
  const task=makeItem('task',{status:'at-risk'});
  p.items=[task];
  resetApp(p);
  const def=p.statusDefs.find(sd=>sd.id==='at-risk');
  def.color='#ff0000';
  const resolved=App._getStatusDef(task.status);
  assert('color change: def resolves correctly',resolved.color,'#ff0000');
  assert('color change: ID still at-risk',resolved.id,'at-risk');
})();

(()=>{
  resetItemCounter();
  // Multiple items referencing same status
  const p=makeProj();
  const t1=makeItem('task',{status:'complete'});
  const t2=makeItem('task',{status:'complete'});
  const t3=makeItem('milestone',{status:'complete'});
  p.items=[t1,t2,t3];
  resetApp(p);
  const sd1=App._getStatusDef(t1.status);
  const sd2=App._getStatusDef(t2.status);
  const sd3=App._getStatusDef(t3.status);
  assert('all three resolve same def ID',sd1.id,sd2.id);
  assert('milestone also resolves same def ID',sd2.id,sd3.id);
})();


// =====================================================================
//  SECTION 2: STATUS DEFINITIONS MANAGEMENT (~50 tests)
// =====================================================================
section('2. Status Definitions Management');
resetItemCounter();

(()=>{
  // Adding new status def to array: id via U.id(), appended to end
  const defs=makeStatusDefs();
  const newId=U.id();
  defs.push({id:newId,name:'Custom Status',desc:'A custom one',color:'#abcdef',shortName:'C',emoji:'\u2b50'});
  assert('new def appended, array length 8',defs.length,8);
  assert('new def is last',defs[defs.length-1].id,newId);
  assert('new def name correct',defs[defs.length-1].name,'Custom Status');
})();

(()=>{
  // Deleting a status def: removes from array, remaining defs intact
  const defs=makeStatusDefs();
  const origLen=defs.length;
  const removed=defs.splice(defs.findIndex(sd=>sd.id==='at-risk'),1);
  assert('removed exactly 1 def',removed.length,1);
  assert('remaining defs count',defs.length,origLen-1);
  assertF('at-risk no longer in array',defs.some(sd=>sd.id==='at-risk'));
  assertT('on-track still in array',defs.some(sd=>sd.id==='on-track'));
  assertT('tbd still in array',defs.some(sd=>sd.id==='tbd'));
})();

(()=>{
  // Reorder status defs: swap two defs, verify indices changed
  const defs=makeStatusDefs();
  const idx1=defs.findIndex(sd=>sd.id==='tbd');    // index 1
  const idx2=defs.findIndex(sd=>sd.id==='complete'); // index 5
  const tmp=defs[idx1];defs[idx1]=defs[idx2];defs[idx2]=tmp;
  assert('after swap: index 1 is complete',defs[idx1].id,'complete');
  assert('after swap: index 5 is tbd',defs[idx2].id,'tbd');
  // Blank still at 0
  assert('blank still at index 0 after swap',defs[0].id,'blank');
})();

(()=>{
  // Blank row (index 0) properties
  const defs=makeStatusDefs();
  const blank=defs[0];
  assert('blank id is "blank"',blank.id,'blank');
  assert('blank name is empty string',blank.name,'');
  assert('blank desc is empty string',blank.desc,'');
  assert('blank color is empty string',blank.color,'');
  assert('blank shortName is empty string',blank.shortName,'');
  assert('blank emoji is empty string',blank.emoji,'');
})();

(()=>{
  // Short name validation logic: filter non-blank defs with empty shortName
  const defs=makeStatusDefs();
  // Intentionally clear one shortName to test validation
  defs[2].shortName=''; // on-track
  const invalid=defs.filter(sd=>sd.id!=='blank'&&!sd.shortName);
  assert('one invalid def found',invalid.length,1);
  assert('invalid def is on-track',invalid[0].id,'on-track');
})();

(()=>{
  // Reset defaults: makeStatusDefs() returns exactly 7 entries with expected IDs
  const defs=makeStatusDefs();
  const expectedIds=['blank','tbd','on-track','at-risk','off-track','complete','not-started'];
  assert('reset defaults has 7 entries',defs.length,7);
  for(let i=0;i<expectedIds.length;i++){
    assert(`reset defaults: index ${i} is ${expectedIds[i]}`,defs[i].id,expectedIds[i]);
  }
})();

(()=>{
  // Duplicate short names: two defs with same shortName 'X' are both valid (no uniqueness constraint)
  const defs=makeStatusDefs();
  defs[1].shortName='X'; // tbd
  defs[2].shortName='X'; // on-track
  const xDefs=defs.filter(sd=>sd.shortName==='X');
  assert('two defs with shortName X',xDefs.length,2);
  // No uniqueness constraint means both are valid
  const invalid=defs.filter(sd=>sd.id!=='blank'&&!sd.shortName);
  assert('no invalid defs (both have shortName)',invalid.length,0);
})();

(()=>{
  // Empty name with valid short name: valid
  const defs=makeStatusDefs();
  defs[1].name='';
  defs[1].shortName='T';
  const invalid=defs.filter(sd=>sd.id!=='blank'&&!sd.shortName);
  assert('empty name + valid shortName: no validation error',invalid.length,0);
})();

(()=>{
  // Short name 1, 2, 3 chars: all valid
  const defs=makeStatusDefs();
  defs[1].shortName='X';
  assertT('1-char shortName valid',!!defs[1].shortName);
  defs[2].shortName='AB';
  assertT('2-char shortName valid',!!defs[2].shortName);
  defs[3].shortName='XYZ';
  assertT('3-char shortName valid',!!defs[3].shortName);
})();

(()=>{
  // Short name empty string: invalid for non-blank
  const defs=makeStatusDefs();
  defs[1].shortName='';
  const invalid=defs.filter(sd=>sd.id!=='blank'&&!sd.shortName);
  assertGte('empty shortName on non-blank is invalid',invalid.length,1);
})();

(()=>{
  // Test all 7 default status definitions have correct fields
  const defs=makeStatusDefs();
  const expected=[
    {id:'blank',name:'',shortName:'',emoji:''},
    {id:'tbd',name:'TBD',shortName:'?',emoji:'\u2753'},
    {id:'on-track',name:'On Track',shortName:'G',emoji:'\ud83d\udfe2'},
    {id:'at-risk',name:'At Risk',shortName:'Y',emoji:'\ud83d\udfe1'},
    {id:'off-track',name:'Off Track',shortName:'R',emoji:'\ud83d\udd34'},
    {id:'complete',name:'Complete',shortName:'B',emoji:'\ud83d\udd35'},
    {id:'not-started',name:'Not Started',shortName:'N',emoji:'\u26aa'},
  ];
  for(let i=0;i<expected.length;i++){
    assert(`def[${i}] id`,defs[i].id,expected[i].id);
    assert(`def[${i}] name`,defs[i].name,expected[i].name);
    assert(`def[${i}] shortName`,defs[i].shortName,expected[i].shortName);
    assert(`def[${i}] emoji`,defs[i].emoji,expected[i].emoji);
  }
})();

(()=>{
  // Verify IDs match expected set
  const defs=makeStatusDefs();
  const ids=defs.map(sd=>sd.id);
  const expectedIds=['blank','tbd','on-track','at-risk','off-track','complete','not-started'];
  for(const eid of expectedIds){
    assertT(`ID '${eid}' present in defaults`,ids.includes(eid));
  }
})();

(()=>{
  // All non-blank defs have non-empty color
  const defs=makeStatusDefs();
  for(const sd of defs){
    if(sd.id==='blank')continue;
    assertT(`def '${sd.id}' has non-empty color`,sd.color.length>0);
  }
})();

(()=>{
  // All non-blank defs have non-empty desc
  const defs=makeStatusDefs();
  for(const sd of defs){
    if(sd.id==='blank')continue;
    assertT(`def '${sd.id}' has non-empty desc`,sd.desc.length>0);
  }
})();

(()=>{
  // Adding multiple custom defs preserves order
  const defs=makeStatusDefs();
  const c1={id:'custom1',name:'Alpha',desc:'',color:'#111',shortName:'A',emoji:''};
  const c2={id:'custom2',name:'Beta',desc:'',color:'#222',shortName:'B2',emoji:''};
  defs.push(c1,c2);
  assert('9 total defs',defs.length,9);
  assert('custom1 at index 7',defs[7].id,'custom1');
  assert('custom2 at index 8',defs[8].id,'custom2');
})();

(()=>{
  // Deleting blank from array (edge case -- should not normally happen)
  const defs=makeStatusDefs();
  const filtered=defs.filter(sd=>sd.id!=='blank');
  assert('after removing blank, 6 defs remain',filtered.length,6);
  assertF('blank not in filtered',filtered.some(sd=>sd.id==='blank'));
})();

(()=>{
  // Editing a def color does not affect other defs
  const defs=makeStatusDefs();
  const origColors=defs.map(sd=>sd.color);
  defs[2].color='#000000'; // on-track
  assert('on-track color changed',defs[2].color,'#000000');
  assert('at-risk color unchanged',defs[3].color,origColors[3]);
  assert('tbd color unchanged',defs[1].color,origColors[1]);
})();


// =====================================================================
//  SECTION 3: IMPACT MODAL LOGIC (~40 tests)
// =====================================================================
section('3. Impact Modal Logic');
resetItemCounter();

(()=>{
  // Simulate deleting a status: remove def from array, count items with that status
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'on-track'});
  const t3=makeItem('task',{status:'at-risk'});
  const t4=makeItem('milestone',{status:'on-track'});
  p.items=[t1,t2,t3,t4];
  resetApp(p);

  // Remove on-track from defs
  const deletedId='on-track';
  const affectedItems=p.items.filter(it=>it.status===deletedId);
  assert('3 items affected by deleting on-track',affectedItems.length,3);

  p.statusDefs=p.statusDefs.filter(sd=>sd.id!==deletedId);
  // Items with deleted status -> _getStatusDef returns null
  for(const it of affectedItems){
    assert(`item ${it.id} getStatusDef returns null after deletion`,App._getStatusDef(it.status),null);
  }
  // Unaffected item still resolves
  const sd3=App._getStatusDef(t3.status);
  assertT('at-risk item still resolves',sd3!==null);
  assert('at-risk resolves to correct ID',sd3.id,'at-risk');
})();

(()=>{
  resetItemCounter();
  // Reassigning items from deleted status to another
  const p=makeProj();
  const t1=makeItem('task',{status:'off-track'});
  const t2=makeItem('task',{status:'off-track'});
  const t3=makeItem('task',{status:'complete'});
  p.items=[t1,t2,t3];
  resetApp(p);

  // Delete off-track, reassign to 'tbd'
  const deletedId='off-track';
  const newId='tbd';
  p.items.forEach(it=>{if(it.status===deletedId)it.status=newId});
  p.statusDefs=p.statusDefs.filter(sd=>sd.id!==deletedId);

  assert('t1 reassigned to tbd',t1.status,'tbd');
  assert('t2 reassigned to tbd',t2.status,'tbd');
  assert('t3 unchanged',t3.status,'complete');
  assertT('reassigned items resolve',App._getStatusDef(t1.status)!==null);
  assert('resolved def is TBD',App._getStatusDef(t1.status).name,'TBD');
})();

(()=>{
  resetItemCounter();
  // Bulk reassignment: set multiple items to a new status
  const p=makeProj();
  const items=[];
  for(let i=0;i<10;i++){
    items.push(makeItem('task',{status:'at-risk'}));
  }
  p.items=items;
  resetApp(p);

  // Bulk reassign to complete
  p.items.forEach(it=>{it.status='complete'});
  const allComplete=p.items.every(it=>it.status==='complete');
  assertT('all 10 items reassigned to complete',allComplete);
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    assert('each item resolves to Complete',sd.name,'Complete');
  }
})();

(()=>{
  resetItemCounter();
  // Modified status (name change): items still reference by ID
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  p.items=[t1];
  resetApp(p);

  const def=p.statusDefs.find(sd=>sd.id==='on-track');
  def.name='Going Great';
  const resolved=App._getStatusDef(t1.status);
  assert('after name change, item still resolves by ID',resolved.id,'on-track');
  assert('resolved name is updated',resolved.name,'Going Great');
})();

(()=>{
  resetItemCounter();
  // Modified status (color change): items still reference by ID
  const p=makeProj();
  const t1=makeItem('task',{status:'at-risk'});
  p.items=[t1];
  resetApp(p);

  const def=p.statusDefs.find(sd=>sd.id==='at-risk');
  def.color='#ff8800';
  const resolved=App._getStatusDef(t1.status);
  assert('after color change, resolved color updated',resolved.color,'#ff8800');
  assert('item status ID unchanged',t1.status,'at-risk');
})();

(()=>{
  resetItemCounter();
  // Modified status (shortName change): items resolve with new shortName
  const p=makeProj();
  const t1=makeItem('task',{status:'off-track'});
  p.items=[t1];
  resetApp(p);

  const def=p.statusDefs.find(sd=>sd.id==='off-track');
  def.shortName='X';
  const resolved=App._getStatusDef(t1.status);
  assert('after shortName change, resolved shortName is X',resolved.shortName,'X');
})();

(()=>{
  resetItemCounter();
  // Cancel scenario: if defs are not committed, items unchanged
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  p.items=[t1];
  resetApp(p);

  // Simulate pending defs (deep copy, modify, but do NOT commit)
  const pendingDefs=U.deep(p.statusDefs);
  pendingDefs.splice(pendingDefs.findIndex(sd=>sd.id==='on-track'),1);
  // Original defs still intact on App.proj
  assertT('original on-track def still in proj.statusDefs',p.statusDefs.some(sd=>sd.id==='on-track'));
  assertT('item still resolves from original defs',App._getStatusDef(t1.status)!==null);
})();

(()=>{
  resetItemCounter();
  // Apply scenario: items reassigned AND defs committed
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'on-track'});
  const t3=makeItem('task',{status:'tbd'});
  p.items=[t1,t2,t3];
  resetApp(p);

  // Simulate apply: delete on-track, reassign to 'complete'
  const deletedId='on-track';
  const reassignTo='complete';
  p.items.forEach(it=>{if(it.status===deletedId)it.status=reassignTo});
  p.statusDefs=p.statusDefs.filter(sd=>sd.id!==deletedId);

  assert('t1 now complete',t1.status,'complete');
  assert('t2 now complete',t2.status,'complete');
  assert('t3 still tbd',t3.status,'tbd');
  assertT('complete resolves',App._getStatusDef('complete')!==null);
  assert('on-track no longer resolves',App._getStatusDef('on-track'),null);
})();

(()=>{
  resetItemCounter();
  // Reassigning to blank (clearing status)
  const p=makeProj();
  const t1=makeItem('task',{status:'at-risk'});
  p.items=[t1];
  resetApp(p);

  // Reassign to blank = set status to ''
  t1.status='';
  assert('item status is now empty',t1.status,'');
  assert('_getStatusDef returns null for cleared status',App._getStatusDef(t1.status),null);
})();

(()=>{
  resetItemCounter();
  // Deleting multiple statuses at once
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'at-risk'});
  const t3=makeItem('task',{status:'off-track'});
  p.items=[t1,t2,t3];
  resetApp(p);

  const toDelete=new Set(['on-track','at-risk','off-track']);
  // Count affected items
  const affected=p.items.filter(it=>toDelete.has(it.status));
  assert('all 3 items affected',affected.length,3);

  // Reassign all to not-started
  affected.forEach(it=>{it.status='not-started'});
  p.statusDefs=p.statusDefs.filter(sd=>!toDelete.has(sd.id));

  assertT('all items resolve to not-started',p.items.every(it=>App._getStatusDef(it.status)?.id==='not-started'));
})();

(()=>{
  resetItemCounter();
  // Deleting a status that no items reference: no impact
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  p.items=[t1];
  resetApp(p);

  const itemsBefore=p.items.map(it=>it.status);
  p.statusDefs=p.statusDefs.filter(sd=>sd.id!=='off-track');
  // Item status unchanged, still resolves
  assert('item status unchanged',t1.status,itemsBefore[0]);
  assertT('on-track still resolves',App._getStatusDef(t1.status)!==null);
})();

(()=>{
  resetItemCounter();
  // Modified def with emoji change: item resolves with new emoji
  const p=makeProj();
  const t1=makeItem('task',{status:'tbd'});
  p.items=[t1];
  resetApp(p);

  const def=p.statusDefs.find(sd=>sd.id==='tbd');
  def.emoji='\u2757'; // red exclamation
  const resolved=App._getStatusDef(t1.status);
  assert('emoji updated on resolved def',resolved.emoji,'\u2757');
})();

(()=>{
  resetItemCounter();
  // Mixed scenario: some defs modified, some deleted, some unchanged
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'at-risk'});
  const t3=makeItem('task',{status:'complete'});
  const t4=makeItem('task',{status:'tbd'});
  p.items=[t1,t2,t3,t4];
  resetApp(p);

  // Delete at-risk, modify on-track name, leave complete and tbd alone
  const onTrackDef=p.statusDefs.find(sd=>sd.id==='on-track');
  onTrackDef.name='All Good';
  p.items.forEach(it=>{if(it.status==='at-risk')it.status='tbd'});
  p.statusDefs=p.statusDefs.filter(sd=>sd.id!=='at-risk');

  assert('on-track resolves with new name',App._getStatusDef(t1.status).name,'All Good');
  assert('t2 reassigned to tbd',t2.status,'tbd');
  assertT('tbd resolves',App._getStatusDef(t2.status)!==null);
  assertT('complete unchanged',App._getStatusDef(t3.status)!==null);
  assert('at-risk no longer resolves',App._getStatusDef('at-risk'),null);
})();


// =====================================================================
//  SECTION 4: STATUS DISPLAY CONFIG (~30 tests)
// =====================================================================
section('4. Status Display Config');
resetItemCounter();

(()=>{
  // statusDisplay.show=true
  const sd=makeStatusDisplay({show:true});
  assertT('show=true: sdShow is true',sd.show);

  // statusDisplay.show=false
  const sd2=makeStatusDisplay({show:false});
  assertF('show=false: sdShow is false',sd2.show);
})();

(()=>{
  // Mode values
  const sdEmoji=makeStatusDisplay({mode:'emoji'});
  assert('mode emoji',sdEmoji.mode,'emoji');

  const sdShort=makeStatusDisplay({mode:'shortName'});
  assert('mode shortName',sdShort.mode,'shortName');

  const sdText=makeStatusDisplay({mode:'text'});
  assert('mode text',sdText.mode,'text');
})();

(()=>{
  // badgePos values
  const positions=['inline','bottom-right','top-left'];
  for(const pos of positions){
    const sd=makeStatusDisplay({badgePos:pos});
    assert(`badgePos '${pos}' resolves correctly`,sd.badgePos,pos);
  }
})();

(()=>{
  resetItemCounter();
  // colorOverride=true with status -> render color = status color
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:true})});
  const task=makeItem('task',{status:'on-track',color:'#4f8cc9'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status);
  const sdCfg=p.statusDisplay;
  const sdShow=sdCfg.show;
  const sdColorOvr=sdCfg.colorOverride;

  let renderColor=task.color;
  if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
  assert('colorOverride + status: render color = status color',renderColor,sd.color);
  assertNeq('render color differs from item color',renderColor,task.color);
})();

(()=>{
  resetItemCounter();
  // colorOverride=false with status -> render color = item color
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:false})});
  const task=makeItem('task',{status:'on-track',color:'#4f8cc9'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status);
  const sdCfg=p.statusDisplay;
  const sdShow=sdCfg.show;
  const sdColorOvr=sdCfg.colorOverride;

  let renderColor=task.color;
  if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
  assert('colorOverride=false: render color = item color',renderColor,task.color);
})();

(()=>{
  resetItemCounter();
  // colorOverride + blankColor with no status -> render color = blankColor
  const blankColor='#888888';
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:true,blankColor})});
  const task=makeItem('task',{status:'',color:'#4f8cc9'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status); // null
  const sdCfg=p.statusDisplay;
  const sdShow=sdCfg.show;
  const sdColorOvr=sdCfg.colorOverride;

  let renderColor=task.color;
  if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
  assert('colorOverride + no status + blankColor: render color = blankColor',renderColor,blankColor);
})();

(()=>{
  resetItemCounter();
  // colorOverride + no blankColor + no status -> render color = item color
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:true,blankColor:''})});
  const task=makeItem('task',{status:'',color:'#4f8cc9'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status);
  const sdCfg=p.statusDisplay;
  const sdShow=sdCfg.show;
  const sdColorOvr=sdCfg.colorOverride;

  let renderColor=task.color;
  if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
  assert('colorOverride + no status + no blankColor: render color = item color',renderColor,task.color);
})();

(()=>{
  resetItemCounter();
  // mode + colorOverride combo: both apply simultaneously
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,mode:'shortName',colorOverride:true})});
  const task=makeItem('task',{status:'at-risk',color:'#111111'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status);
  const sdCfg=p.statusDisplay;

  // Mode is shortName
  assert('mode is shortName',sdCfg.mode,'shortName');
  // Color override active
  let renderColor=task.color;
  if(sdCfg.show&&sdCfg.colorOverride){if(sd)renderColor=sd.color}
  assert('render color is status color (at-risk)',renderColor,sd.color);
  assertNeq('render color not item color',renderColor,'#111111');
})();

(()=>{
  resetItemCounter();
  // show=false + colorOverride=true: colorOverride has no effect because show is false
  const p=makeProj({statusDisplay:makeStatusDisplay({show:false,colorOverride:true})});
  const task=makeItem('task',{status:'on-track',color:'#4f8cc9'});
  p.items=[task];
  resetApp(p);

  const sd=App._getStatusDef(task.status);
  const sdCfg=p.statusDisplay;
  const sdShow=sdCfg.show;
  const sdColorOvr=sdCfg.colorOverride;

  let renderColor=task.color;
  if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
  assert('show=false + colorOverride: render color stays item color',renderColor,task.color);
})();

(()=>{
  resetItemCounter();
  // colorOverride with multiple items, some with status, some without
  const blankColor='#999999';
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:true,blankColor})});
  const t1=makeItem('task',{status:'on-track',color:'#111'});
  const t2=makeItem('task',{status:'',color:'#222'});
  const t3=makeItem('task',{status:'complete',color:'#333'});
  p.items=[t1,t2,t3];
  resetApp(p);

  const sdCfg=p.statusDisplay;
  const colors=p.items.map(it=>{
    const sd=App._getStatusDef(it.status);
    let rc=it.color;
    if(sdCfg.show&&sdCfg.colorOverride){if(sd)rc=sd.color;else if(sdCfg.blankColor)rc=sdCfg.blankColor}
    return rc;
  });
  const onTrackDef=p.statusDefs.find(sd=>sd.id==='on-track');
  const completeDef=p.statusDefs.find(sd=>sd.id==='complete');
  assert('t1 render color = on-track color',colors[0],onTrackDef.color);
  assert('t2 render color = blankColor',colors[1],blankColor);
  assert('t3 render color = complete color',colors[2],completeDef.color);
})();

(()=>{
  // Default makeStatusDisplay values
  const sd=makeStatusDisplay();
  assertT('default show is true',sd.show);
  assert('default mode is emoji',sd.mode,'emoji');
  assert('default badgePos is inline',sd.badgePos,'inline');
  assertF('default colorOverride is false',sd.colorOverride);
  assert('default blankColor is empty string',sd.blankColor,'');
})();

(()=>{
  // makeProj includes statusDisplay with defaults
  const p=makeProj();
  assertT('proj has statusDisplay',!!p.statusDisplay);
  assertT('proj statusDisplay.show is true',p.statusDisplay.show);
  assert('proj statusDisplay.mode is emoji',p.statusDisplay.mode,'emoji');
})();

(()=>{
  resetItemCounter();
  // Milestone with colorOverride
  const p=makeProj({statusDisplay:makeStatusDisplay({show:true,colorOverride:true})});
  const ms=makeItem('milestone',{status:'complete',color:'#abc'});
  p.items=[ms];
  resetApp(p);

  const sd=App._getStatusDef(ms.status);
  const sdCfg=p.statusDisplay;
  let renderColor=ms.color;
  if(sdCfg.show&&sdCfg.colorOverride){if(sd)renderColor=sd.color}
  assert('milestone colorOverride: render = status color',renderColor,sd.color);
})();

(()=>{
  resetItemCounter();
  // badgePos values other than inline do not change useInline
  const positions=['bottom-right','top-left','top-right','bottom-left'];
  for(const pos of positions){
    const p=makeProj({statusDisplay:makeStatusDisplay({show:true,badgePos:pos})});
    const task=makeItem('task',{status:'on-track'});
    p.items=[task];
    resetApp(p);

    const sd=App._getStatusDef(task.status);
    const sdCfg=p.statusDisplay;
    const useInline=sd&&sdCfg.show&&(sdCfg.badgePos||'inline')==='inline';
    assertF(`badgePos='${pos}': useInline is false`,useInline);
  }
  resetItemCounter();
})();


// =====================================================================
//  SECTION 5: FILTER & SORT (~20 tests)
// =====================================================================
section('5. Filter & Sort');
resetItemCounter();

(()=>{
  // Items filtered by status ID: exact match
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'at-risk'});
  const t3=makeItem('task',{status:'on-track'});
  const t4=makeItem('task',{status:''});
  p.items=[t1,t2,t3,t4];
  resetApp(p);

  const fltStatus='on-track';
  const matched=p.items.filter(it=>{
    if(fltStatus==='_none'){return!it.status}
    return it.status===fltStatus;
  });
  assert('filter on-track: 2 items match',matched.length,2);
  assertT('matched items are t1 and t3',matched[0].id===t1.id&&matched[1].id===t3.id);
})();

(()=>{
  resetItemCounter();
  // Items filtered by '' (no status): use _none filter value
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:''});
  const t3=makeItem('task',{status:''});
  const t4=makeItem('task',{status:'tbd'});
  p.items=[t1,t2,t3,t4];
  resetApp(p);

  const fltStatus='_none';
  const matched=p.items.filter(it=>{
    if(fltStatus==='_none'){return!it.status}
    return it.status===fltStatus;
  });
  assert('filter _none: 2 items match',matched.length,2);
  assert('matched are items without status',matched[0].id,t2.id);
})();

(()=>{
  resetItemCounter();
  // Sort by status: compute index in statusDefs array
  const p=makeProj();
  // Create items with different statuses in scrambled order
  const t1=makeItem('task',{status:'complete'});     // def index 5
  const t2=makeItem('task',{status:'tbd'});           // def index 1
  const t3=makeItem('task',{status:'on-track'});      // def index 2
  const t4=makeItem('task',{status:'not-started'});   // def index 6
  p.items=[t1,t2,t3,t4];
  resetApp(p);

  const statusOrder=new Map((p.statusDefs||[]).map((sd,i)=>[sd.id,i]));
  const gv=(it)=>statusOrder.get(it.status||'blank')??999;

  const sorted=[...p.items].sort((a,b)=>gv(a)-gv(b));
  assert('sorted[0] is tbd (index 1)',sorted[0].status,'tbd');
  assert('sorted[1] is on-track (index 2)',sorted[1].status,'on-track');
  assert('sorted[2] is complete (index 5)',sorted[2].status,'complete');
  assert('sorted[3] is not-started (index 6)',sorted[3].status,'not-started');
})();

(()=>{
  resetItemCounter();
  // Unknown status ID sorts last (999 fallback)
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'unknown-xyz'});
  p.items=[t1,t2];
  resetApp(p);

  const statusOrder=new Map((p.statusDefs||[]).map((sd,i)=>[sd.id,i]));
  const gv=(it)=>statusOrder.get(it.status||'blank')??999;
  const v1=gv(t1);
  const v2=gv(t2);
  assertT('unknown status sorts after known status',v2>v1);
  assert('unknown status gets fallback 999',v2,999);
})();

(()=>{
  resetItemCounter();
  // Empty status sorts as 'blank' (index 0)
  const p=makeProj();
  const t1=makeItem('task',{status:'tbd'});
  const t2=makeItem('task',{status:''});
  p.items=[t1,t2];
  resetApp(p);

  const statusOrder=new Map((p.statusDefs||[]).map((sd,i)=>[sd.id,i]));
  const gv=(it)=>statusOrder.get(it.status||'blank')??999;
  const vBlank=gv(t2);
  const vTbd=gv(t1);
  assert('empty status maps to blank index 0',vBlank,0);
  assert('tbd maps to index 1',vTbd,1);
  assertT('blank sorts before tbd',vBlank<vTbd);
})();

(()=>{
  resetItemCounter();
  // Multiple items sorted by status: full ordering
  const p=makeProj();
  const statuses=['not-started','at-risk','tbd','on-track','off-track','complete',''];
  const items=statuses.map(s=>makeItem('task',{status:s}));
  p.items=items;
  resetApp(p);

  const statusOrder=new Map((p.statusDefs||[]).map((sd,i)=>[sd.id,i]));
  const gv=(it)=>statusOrder.get(it.status||'blank')??999;
  const sorted=[...p.items].sort((a,b)=>gv(a)-gv(b));

  assert('sorted order [0] blank (empty)',sorted[0].status,'');
  assert('sorted order [1] tbd',sorted[1].status,'tbd');
  assert('sorted order [2] on-track',sorted[2].status,'on-track');
  assert('sorted order [3] at-risk',sorted[3].status,'at-risk');
  assert('sorted order [4] off-track',sorted[4].status,'off-track');
  assert('sorted order [5] complete',sorted[5].status,'complete');
  assert('sorted order [6] not-started',sorted[6].status,'not-started');
})();

(()=>{
  resetItemCounter();
  // Advanced search: status name 'On Track' matches item with status='on-track'
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'at-risk'});
  p.items=[t1,t2];
  resetApp(p);

  const term='On Track';
  const matcher={test:s=>s.toLowerCase().includes(term.toLowerCase())};
  const matches=[];
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    if(sd&&matcher.test(sd.name))matches.push(it.id);
  }
  assert('search "On Track" finds 1 item',matches.length,1);
  assert('matched item is t1',matches[0],t1.id);
})();

(()=>{
  resetItemCounter();
  // Advanced search: short name 'G' matches 'on-track'
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'at-risk'});
  p.items=[t1,t2];
  resetApp(p);

  const term='G';
  const matcher={test:s=>s.toLowerCase().includes(term.toLowerCase())};
  const matches=[];
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    if(sd&&matcher.test(sd.shortName))matches.push(it.id);
  }
  // 'G' matches on-track shortName 'G'
  assert('search shortName "G" finds 1 item',matches.length,1);
  assert('matched item is t1 (on-track)',matches[0],t1.id);
})();

(()=>{
  resetItemCounter();
  // Advanced search: description 'Progressing as planned' matches on-track
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('task',{status:'complete'});
  p.items=[t1,t2];
  resetApp(p);

  const term='Progressing as planned';
  const matcher={test:s=>s.toLowerCase().includes(term.toLowerCase())};
  const matches=[];
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    if(sd&&matcher.test(sd.desc))matches.push(it.id);
  }
  assert('search desc "Progressing as planned" finds 1 item',matches.length,1);
  assert('matched item is on-track',matches[0],t1.id);
})();

(()=>{
  resetItemCounter();
  // Filter with combined status + type
  const p=makeProj();
  const t1=makeItem('task',{status:'on-track'});
  const t2=makeItem('milestone',{status:'on-track'});
  const t3=makeItem('task',{status:'at-risk'});
  p.items=[t1,t2,t3];
  resetApp(p);

  const fltStatus='on-track';
  const fltType='task';
  const matched=p.items.filter(it=>{
    if(fltType&&it.type!==fltType)return false;
    if(fltStatus&&it.status!==fltStatus)return false;
    return true;
  });
  assert('filter task+on-track: 1 match',matched.length,1);
  assert('matched item is task t1',matched[0].id,t1.id);
})();

(()=>{
  resetItemCounter();
  // Search partial name match in status name
  const p=makeProj();
  const t1=makeItem('task',{status:'not-started'});
  const t2=makeItem('task',{status:'on-track'});
  p.items=[t1,t2];
  resetApp(p);

  const term='Start';
  const matcher={test:s=>s.toLowerCase().includes(term.toLowerCase())};
  const matches=[];
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    if(sd&&matcher.test(sd.name))matches.push(it.id);
  }
  assert('partial search "Start" matches Not Started',matches.length,1);
  assert('matched item is t1',matches[0],t1.id);
})();

(()=>{
  resetItemCounter();
  // Search with no status set on any item
  const p=makeProj();
  const t1=makeItem('task',{status:''});
  const t2=makeItem('task',{status:''});
  p.items=[t1,t2];
  resetApp(p);

  const term='On Track';
  const matcher={test:s=>s.toLowerCase().includes(term.toLowerCase())};
  const matches=[];
  for(const it of p.items){
    const sd=App._getStatusDef(it.status);
    if(sd&&matcher.test(sd.name))matches.push(it.id);
  }
  assert('search with no statuses set: 0 matches',matches.length,0);
})();


// =====================================================================
//  SECTION 6: INLINE DISPLAY TEXT RESOLUTION (~20 tests)
// =====================================================================
section('6. Inline Display Text Resolution');
resetItemCounter();

(()=>{
  // Helper: compute inline text and useInline flag
  function computeInline(statusId,sdCfg,statusDefs){
    const sd=(statusId&&statusId!=='blank')?(statusDefs||[]).find(d=>d.id===statusId)||null:null;
    const sdMode=sdCfg.mode||'emoji';
    const useInline=sd&&sdCfg.show&&(sdCfg.badgePos||'inline')==='inline';
    const inlineTxt=useInline?(sdMode==='emoji'?sd.emoji+' ':sdMode==='text'?sd.name+' ':'('+sd.shortName+') '):'';
    return{sd,useInline,inlineTxt,sdMode};
  }

  const defs=makeStatusDefs();

  // Emoji mode + inline -> text is emoji character
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('on-track',cfg,defs);
    assertT('emoji+inline: useInline is true',useInline);
    assertIncludes('emoji+inline: text contains green circle',inlineTxt,'\ud83d\udfe2');
  }

  // ShortName mode + inline -> text is '(G) '
  {
    const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('on-track',cfg,defs);
    assertT('shortName+inline: useInline is true',useInline);
    assert('shortName+inline: text is "(G) "',inlineTxt,'(G) ');
  }

  // Text mode + inline -> text is full name
  {
    const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('on-track',cfg,defs);
    assertT('text+inline: useInline is true',useInline);
    assert('text+inline: text is "On Track "',inlineTxt,'On Track ');
  }

  // Non-inline positions -> useInline is false
  {
    const nonInlinePositions=['bottom-right','top-left','top-right','bottom-left'];
    for(const pos of nonInlinePositions){
      const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:pos});
      const{useInline}=computeInline('on-track',cfg,defs);
      assertF(`${pos}: useInline is false`,useInline);
    }
  }

  // Blank status -> no inline prefix
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('',cfg,defs);
    assertF('blank status: useInline is false',useInline);
    assert('blank status: inlineTxt is empty',inlineTxt,'');
  }

  // Show=false -> no inline prefix
  {
    const cfg=makeStatusDisplay({show:false,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('on-track',cfg,defs);
    assertF('show=false: useInline is false',useInline);
    assert('show=false: inlineTxt is empty',inlineTxt,'');
  }

  // Inline width adds to label width (non-zero when useInline is true)
  {
    const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
    const{inlineTxt}=computeInline('at-risk',cfg,defs);
    assertT('inline text for at-risk is non-empty',inlineTxt.length>0);
    assert('inline text for at-risk is "(Y) "',inlineTxt,'(Y) ');
  }

  // All 3 modes x 3 positions matrix (9 combos) -> verify useInline flag
  const modes=['emoji','shortName','text'];
  const positions=['inline','bottom-right','top-left'];
  for(const mode of modes){
    for(const pos of positions){
      const cfg=makeStatusDisplay({show:true,mode,badgePos:pos});
      const{useInline}=computeInline('on-track',cfg,defs);
      const expectedInline=pos==='inline';
      assert(`mode=${mode},pos=${pos}: useInline=${expectedInline}`,useInline,expectedInline);
    }
  }

  // Emoji mode: verify different statuses produce different emoji text
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const r1=computeInline('on-track',cfg,defs);
    const r2=computeInline('at-risk',cfg,defs);
    const r3=computeInline('off-track',cfg,defs);
    assertNeq('on-track vs at-risk emoji differ',r1.inlineTxt,r2.inlineTxt);
    assertNeq('at-risk vs off-track emoji differ',r2.inlineTxt,r3.inlineTxt);
  }

  // ShortName mode: verify different statuses produce different short names
  {
    const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
    const r1=computeInline('on-track',cfg,defs);
    const r2=computeInline('at-risk',cfg,defs);
    assertNeq('shortName: on-track vs at-risk differ',r1.inlineTxt,r2.inlineTxt);
    assert('shortName on-track is "(G) "',r1.inlineTxt,'(G) ');
    assert('shortName at-risk is "(Y) "',r2.inlineTxt,'(Y) ');
  }

  // Text mode: verify full name text
  {
    const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
    const r1=computeInline('complete',cfg,defs);
    assert('text mode complete: "Complete "',r1.inlineTxt,'Complete ');
    const r2=computeInline('not-started',cfg,defs);
    assert('text mode not-started: "Not Started "',r2.inlineTxt,'Not Started ');
  }

  // Status='blank' explicit ID -> no inline
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('blank',cfg,defs);
    assertF('explicit blank ID: useInline is false',useInline);
    assert('explicit blank ID: inlineTxt is empty',inlineTxt,'');
  }

  // Inline text for TBD status
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('tbd',cfg,defs);
    assertT('tbd: useInline is true',useInline);
    assertIncludes('tbd emoji: contains question mark emoji',inlineTxt,'\u2753');
  }

  // ShortName mode for TBD: "(?) "
  {
    const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
    const{inlineTxt}=computeInline('tbd',cfg,defs);
    assert('shortName tbd: "(?) "',inlineTxt,'(?) ');
  }

  // Text mode for TBD: "TBD "
  {
    const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
    const{inlineTxt}=computeInline('tbd',cfg,defs);
    assert('text tbd: "TBD "',inlineTxt,'TBD ');
  }

  // Non-existent status ID: no inline
  {
    const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
    const{useInline,inlineTxt}=computeInline('does-not-exist',cfg,defs);
    assertF('nonexistent status: useInline is false',useInline);
    assert('nonexistent status: inlineTxt is empty',inlineTxt,'');
  }
})();


// =====================================================================
//  SUMMARY
// =====================================================================
const{failed}=summary();process.exit(failed?1:0);
