#!/usr/bin/env node
/**
 * Timeline Studio -- Migration Test Suite
 * ~45 tests covering backward-compatible project migration.
 * Ensures old project formats are normalized correctly.
 */

const{assert,assertT,assertF,assertNeq,assertIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ===================================================================
//  MOCK MIGRATE FUNCTION (mirrors app.js migration logic)
// ===================================================================

function migrate(p){
  // Version 1 -> 2: end dates changed from exclusive to inclusive
  if(!p.version||p.version<2){
    p.version=2;
    // In real app, this recalculates end dates
  }

  // Swimlane collapse: boolean -> string
  for(const sl of p.swimlanes||[]){
    if(typeof sl.collapsed==='boolean')sl.collapsed=sl.collapsed?'collapsed':'expanded';
    if(!sl.collapsed)sl.collapsed='expanded';
    for(const ss of sl.subSwims||[]){
      if(!ss.collapsed)ss.collapsed='expanded';
    }
  }

  // Status fields
  if(!Array.isArray(p.statusDefs)){
    p.statusDefs=[
      {id:'blank',name:'',desc:'',color:'',shortName:'',emoji:''},
      {id:'tbd',name:'TBD',desc:'Not yet determined',color:'#6b7280',shortName:'?',emoji:'\u2753'},
      {id:'on-track',name:'On Track',desc:'Progressing as planned',color:'#22c55e',shortName:'G',emoji:'\ud83d\udfe2'},
      {id:'at-risk',name:'At Risk',desc:'May miss target',color:'#eab308',shortName:'Y',emoji:'\ud83d\udfe1'},
      {id:'off-track',name:'Off Track',desc:'Behind schedule',color:'#ef4444',shortName:'R',emoji:'\ud83d\udd34'},
      {id:'complete',name:'Complete',desc:'Finished',color:'#3b82f6',shortName:'B',emoji:'\ud83d\udd35'},
      {id:'not-started',name:'Not Started',desc:'Has not begun',color:'#9ca3af',shortName:'N',emoji:'\u26aa'},
    ];
  }
  if(!p.statusDisplay)p.statusDisplay={show:true,mode:'emoji',badgePos:'inline'};
  if(p.statusDisplay.mode==='colorOverride'){p.statusDisplay.mode='emoji';p.statusDisplay.colorOverride=true}
  if(p.statusDisplay.colorOverride==null)p.statusDisplay.colorOverride=false;
  if(p.statusDisplay.blankColor==null)p.statusDisplay.blankColor='';

  // Label width
  if(!p.labelWidth)p.labelWidth=160;

  // Per-item migrations
  for(const it of p.items||[]){
    // Status fields
    if(it.status==null)it.status='';
    if(it.statusDate==null)it.statusDate='';
    // Dependencies: string -> object
    if(it.deps){
      it.deps=it.deps.map(d=>typeof d==='string'?{id:d,type:'FS',lag:0}:d);
    }else{it.deps=[]}
    // durMode default
    if(it.type==='task'&&!it.durMode)it.durMode='cal';
    // pinned from locked
    if(it.pinned==null){it.pinned=it.locked||false;delete it.locked}
    // Progress default
    if(it.progress==null)it.progress=0;
    // Hidden default
    if(it.hidden==null)it.hidden=false;
    // showDuration default
    if(it.showDuration==null)it.showDuration=false;
    // vLine default
    if(!it.vLine)it.vLine={enabled:false,style:'solid',color:'#888888',direction:'down',extent:'full'};
  }
  return p;
}

// ===================================================================
//  TESTS
// ===================================================================

section('Version Migrations');
{
  // v1 project -> version set to 2
  const p1=migrate({version:1,swimlanes:[],items:[]});
  assert('v1 project migrated to v2',p1.version,2);

  // Missing version -> defaults to 2
  const p2=migrate({swimlanes:[],items:[]});
  assert('Missing version defaults to 2',p2.version,2);

  // v2 project -> stays v2
  const p3=migrate({version:2,swimlanes:[],items:[]});
  assert('v2 project stays v2',p3.version,2);

  // Version 0 -> version 2
  const p4=migrate({version:0,swimlanes:[],items:[]});
  assert('v0 migrated to v2',p4.version,2);

  // Missing statusDefs -> 7 defaults added
  const p5=migrate({version:2,swimlanes:[],items:[]});
  assert('Missing statusDefs gets 7 defaults',p5.statusDefs.length,7);

  // Verify default statusDefs IDs
  const defIds=p5.statusDefs.map(sd=>sd.id);
  assertIncludes('Default statusDefs includes blank',defIds.join(','),'blank');
  assertIncludes('Default statusDefs includes tbd',defIds.join(','),'tbd');
  assertIncludes('Default statusDefs includes on-track',defIds.join(','),'on-track');
  assertIncludes('Default statusDefs includes at-risk',defIds.join(','),'at-risk');
  assertIncludes('Default statusDefs includes off-track',defIds.join(','),'off-track');
  assertIncludes('Default statusDefs includes complete',defIds.join(','),'complete');
  assertIncludes('Default statusDefs includes not-started',defIds.join(','),'not-started');

  // statusDefs already present -> not overwritten
  const customDefs=[{id:'custom',name:'Custom',desc:'Custom status',color:'#000',shortName:'C',emoji:'X'}];
  const p6=migrate({version:2,swimlanes:[],items:[],statusDefs:customDefs});
  assert('Existing statusDefs not overwritten',p6.statusDefs.length,1);
  assert('Custom statusDef preserved',p6.statusDefs[0].id,'custom');

  // Missing statusDisplay -> defaults added
  const p7=migrate({version:2,swimlanes:[],items:[]});
  assertT('Missing statusDisplay gets defaults',p7.statusDisplay!=null);
  assert('statusDisplay.show default',p7.statusDisplay.show,true);
  assert('statusDisplay.mode default',p7.statusDisplay.mode,'emoji');
  assert('statusDisplay.badgePos default',p7.statusDisplay.badgePos,'inline');

  // statusDisplay.mode='colorOverride' -> migrated
  const p8=migrate({version:2,swimlanes:[],items:[],statusDisplay:{show:true,mode:'colorOverride',badgePos:'inline'}});
  assert('colorOverride mode migrated to emoji',p8.statusDisplay.mode,'emoji');
  assert('colorOverride flag set to true',p8.statusDisplay.colorOverride,true);

  // Missing colorOverride -> defaults to false
  const p9=migrate({version:2,swimlanes:[],items:[],statusDisplay:{show:true,mode:'emoji',badgePos:'inline'}});
  assert('Missing colorOverride defaults to false',p9.statusDisplay.colorOverride,false);

  // Missing blankColor -> defaults to ''
  assert('Missing blankColor defaults to empty string',p9.statusDisplay.blankColor,'');

  // statusDisplay already has colorOverride:true -> preserved
  const p10=migrate({version:2,swimlanes:[],items:[],statusDisplay:{show:true,mode:'emoji',badgePos:'inline',colorOverride:true,blankColor:'#ff0000'}});
  assert('Existing colorOverride preserved',p10.statusDisplay.colorOverride,true);
  assert('Existing blankColor preserved',p10.statusDisplay.blankColor,'#ff0000');
}

section('Swimlane Migrations');
{
  // sl.collapsed: true -> 'collapsed'
  const p1=migrate({version:2,swimlanes:[{id:'s1',name:'S1',collapsed:true,subSwims:[]}],items:[]});
  assert('Boolean true -> collapsed string',p1.swimlanes[0].collapsed,'collapsed');

  // sl.collapsed: false -> 'expanded'
  const p2=migrate({version:2,swimlanes:[{id:'s2',name:'S2',collapsed:false,subSwims:[]}],items:[]});
  assert('Boolean false -> expanded string',p2.swimlanes[0].collapsed,'expanded');

  // sl.collapsed: undefined -> 'expanded'
  const p3=migrate({version:2,swimlanes:[{id:'s3',name:'S3',subSwims:[]}],items:[]});
  assert('Undefined collapsed -> expanded',p3.swimlanes[0].collapsed,'expanded');

  // sl.collapsed: 'expanded' -> stays 'expanded'
  const p4=migrate({version:2,swimlanes:[{id:'s4',name:'S4',collapsed:'expanded',subSwims:[]}],items:[]});
  assert('String expanded stays expanded',p4.swimlanes[0].collapsed,'expanded');

  // sl.collapsed: 'minimized' -> stays 'minimized'
  const p5=migrate({version:2,swimlanes:[{id:'s5',name:'S5',collapsed:'minimized',subSwims:[]}],items:[]});
  assert('String minimized stays minimized',p5.swimlanes[0].collapsed,'minimized');

  // sl.collapsed: 'collapsed' -> stays 'collapsed'
  const p6=migrate({version:2,swimlanes:[{id:'s6',name:'S6',collapsed:'collapsed',subSwims:[]}],items:[]});
  assert('String collapsed stays collapsed',p6.swimlanes[0].collapsed,'collapsed');

  // Missing ss.collapsed -> 'expanded'
  const p7=migrate({version:2,swimlanes:[{id:'s7',name:'S7',collapsed:'expanded',subSwims:[{id:'ss1',name:'Sub1'}]}],items:[]});
  assert('Missing sub-swim collapsed -> expanded',p7.swimlanes[0].subSwims[0].collapsed,'expanded');

  // Sub-swim already has collapsed -> preserved
  const p8=migrate({version:2,swimlanes:[{id:'s8',name:'S8',collapsed:'expanded',subSwims:[{id:'ss2',name:'Sub2',collapsed:'minimized'}]}],items:[]});
  assert('Sub-swim collapsed preserved',p8.swimlanes[0].subSwims[0].collapsed,'minimized');

  // labelWidth missing -> 160
  const p9=migrate({version:2,swimlanes:[],items:[]});
  assert('Missing labelWidth defaults to 160',p9.labelWidth,160);

  // labelWidth present -> preserved
  const p10=migrate({version:2,swimlanes:[],items:[],labelWidth:250});
  assert('Existing labelWidth preserved',p10.labelWidth,250);
}

section('Dependency Migrations');
{
  resetItemCounter();

  // String deps -> object deps
  const p1=migrate({version:2,swimlanes:[],items:[
    {id:'a',type:'task',name:'A',startDate:'2026-01-05',endDate:'2026-01-09',duration:5,deps:[]},
    {id:'b',type:'task',name:'B',startDate:'2026-01-12',endDate:'2026-01-16',duration:5,deps:['a']},
  ]});
  assert('String dep converted to object type',p1.items[1].deps[0].type,'FS');
  assert('String dep converted to object lag',p1.items[1].deps[0].lag,0);
  assert('String dep converted to object id',p1.items[1].deps[0].id,'a');

  // Multiple string deps
  const p2=migrate({version:2,swimlanes:[],items:[
    {id:'x',type:'task',name:'X',startDate:'2026-01-05',deps:['id1','id2']},
  ]});
  assert('Multiple string deps converted count',p2.items[0].deps.length,2);
  assert('First string dep id',p2.items[0].deps[0].id,'id1');
  assert('Second string dep id',p2.items[0].deps[1].id,'id2');

  // Object deps already -> unchanged
  const origDep={id:'pred1',type:'SS',lag:3};
  const p3=migrate({version:2,swimlanes:[],items:[
    {id:'c',type:'task',name:'C',startDate:'2026-01-05',deps:[origDep]},
  ]});
  assert('Object dep type preserved',p3.items[0].deps[0].type,'SS');
  assert('Object dep lag preserved',p3.items[0].deps[0].lag,3);

  // Mixed deps
  const p4=migrate({version:2,swimlanes:[],items:[
    {id:'d',type:'task',name:'D',startDate:'2026-01-05',deps:['strDep',{id:'objDep',type:'FF',lag:2}]},
  ]});
  assert('Mixed deps: string converted',p4.items[0].deps[0].type,'FS');
  assert('Mixed deps: object preserved',p4.items[0].deps[1].type,'FF');

  // Missing deps -> []
  const p5=migrate({version:2,swimlanes:[],items:[
    {id:'e',type:'task',name:'E',startDate:'2026-01-05'},
  ]});
  assert('Missing deps defaults to empty array',JSON.stringify(p5.items[0].deps),'[]');

  // durMode missing on task -> 'cal'
  const p6=migrate({version:2,swimlanes:[],items:[
    {id:'f',type:'task',name:'F',startDate:'2026-01-05'},
  ]});
  assert('Missing durMode defaults to cal',p6.items[0].durMode,'cal');

  // durMode 'work' present -> preserved
  const p7=migrate({version:2,swimlanes:[],items:[
    {id:'g',type:'task',name:'G',startDate:'2026-01-05',durMode:'work'},
  ]});
  assert('durMode work preserved',p7.items[0].durMode,'work');

  // pinned missing + locked:true -> pinned:true, locked deleted
  const p8=migrate({version:2,swimlanes:[],items:[
    {id:'h',type:'task',name:'H',startDate:'2026-01-05',locked:true},
  ]});
  assert('locked:true -> pinned:true',p8.items[0].pinned,true);
  assertT('locked key deleted',p8.items[0].locked===undefined);

  // pinned missing + no locked -> pinned:false
  const p9=migrate({version:2,swimlanes:[],items:[
    {id:'i',type:'task',name:'I',startDate:'2026-01-05'},
  ]});
  assert('No locked -> pinned:false',p9.items[0].pinned,false);

  // pinned already present -> not overwritten
  const p10=migrate({version:2,swimlanes:[],items:[
    {id:'j',type:'task',name:'J',startDate:'2026-01-05',pinned:true},
  ]});
  assert('Existing pinned:true preserved',p10.items[0].pinned,true);
}

section('Item Field Migrations');
{
  // Missing progress -> 0
  const p1=migrate({version:2,swimlanes:[],items:[
    {id:'a1',type:'task',name:'A1',startDate:'2026-01-05'},
  ]});
  assert('Missing progress defaults to 0',p1.items[0].progress,0);

  // Existing progress preserved
  const p1b=migrate({version:2,swimlanes:[],items:[
    {id:'a1b',type:'task',name:'A1b',startDate:'2026-01-05',progress:50},
  ]});
  assert('Existing progress preserved',p1b.items[0].progress,50);

  // Missing hidden -> false
  const p2=migrate({version:2,swimlanes:[],items:[
    {id:'a2',type:'task',name:'A2',startDate:'2026-01-05'},
  ]});
  assert('Missing hidden defaults to false',p2.items[0].hidden,false);

  // Missing showDuration -> false
  const p3=migrate({version:2,swimlanes:[],items:[
    {id:'a3',type:'task',name:'A3',startDate:'2026-01-05'},
  ]});
  assert('Missing showDuration defaults to false',p3.items[0].showDuration,false);

  // Missing vLine -> defaults added
  const p4=migrate({version:2,swimlanes:[],items:[
    {id:'a4',type:'task',name:'A4',startDate:'2026-01-05'},
  ]});
  assertT('Missing vLine gets default object',p4.items[0].vLine!=null);
  assert('vLine.enabled default',p4.items[0].vLine.enabled,false);
  assert('vLine.style default',p4.items[0].vLine.style,'solid');
  assert('vLine.color default',p4.items[0].vLine.color,'#888888');
  assert('vLine.direction default',p4.items[0].vLine.direction,'down');
  assert('vLine.extent default',p4.items[0].vLine.extent,'full');

  // Missing status -> ''
  const p5=migrate({version:2,swimlanes:[],items:[
    {id:'a5',type:'task',name:'A5',startDate:'2026-01-05'},
  ]});
  assert('Missing status defaults to empty string',p5.items[0].status,'');

  // Missing statusDate -> ''
  assert('Missing statusDate defaults to empty string',p5.items[0].statusDate,'');

  // All fields present after migration (no undefined)
  const p6=migrate({version:2,swimlanes:[],items:[
    {id:'a6',type:'task',name:'A6',startDate:'2026-01-05'},
  ]});
  const it=p6.items[0];
  assertT('status is defined',it.status!==undefined);
  assertT('statusDate is defined',it.statusDate!==undefined);
  assertT('deps is defined',it.deps!==undefined);
  assertT('durMode is defined',it.durMode!==undefined);
  assertT('pinned is defined',it.pinned!==undefined);
  assertT('progress is defined',it.progress!==undefined);
  assertT('hidden is defined',it.hidden!==undefined);
  assertT('showDuration is defined',it.showDuration!==undefined);
  assertT('vLine is defined',it.vLine!==undefined);

  // Large project with many items -> all items migrated
  const manyItems=[];
  for(let i=0;i<50;i++){
    manyItems.push({id:'bulk_'+i,type:i%3===0?'milestone':'task',name:'Bulk '+i,startDate:'2026-01-05',date:'2026-01-15'});
  }
  const p7=migrate({version:1,swimlanes:[{id:'s1',name:'S1',collapsed:true,subSwims:[]}],items:manyItems});
  let allMigrated=true;
  for(const it of p7.items){
    if(it.status===undefined||it.deps===undefined||it.pinned===undefined||it.hidden===undefined){
      allMigrated=false;break;
    }
  }
  assertT('All 50 items migrated correctly',allMigrated);
  assert('Large project version migrated',p7.version,2);
  assert('Large project swimlane migrated',p7.swimlanes[0].collapsed,'collapsed');
}

const{failed}=summary();process.exit(failed?1:0);
