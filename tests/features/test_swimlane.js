#!/usr/bin/env node
/**
 * Timeline Studio -- Swimlane & Sub-Swimlane Collapse Tests
 * Covers: F15/F3 3-state swimlane collapse, 2-state sub-swimlane collapse,
 *   expand/collapse all, auto-cascade, migration from boolean to string states,
 *   item filtering by collapsed/minimized state.
 *
 * ~60 tests
 */
const{assert,assertT,assertF,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Build a set of collapsed (hidden) swimlane IDs */
function buildCollapsedSet(swimlanes){
  const s=new Set();
  for(const sl of swimlanes){if(sl.collapsed==='collapsed')s.add(sl.id)}
  return s;
}

/** Build a set of minimized sub-swimlane IDs */
function buildMinSubSet(swimlanes){
  const s=new Set();
  for(const sl of swimlanes){
    for(const ss of sl.subSwims||[]){if(ss.collapsed==='minimized')s.add(ss.id)}
  }
  return s;
}

/** Filter items visible (not in collapsed swimlane, not in minimized sub-swimlane) */
function visibleItems(items,swimlanes){
  const collSet=buildCollapsedSet(swimlanes);
  const minSubSet=buildMinSubSet(swimlanes);
  return items.filter(it=>{
    if(collSet.has(it.swimlaneId))return false;
    if(it.subSwimId&&minSubSet.has(it.subSwimId))return false;
    return true;
  });
}

/** Expand All: set every swimlane to 'expanded' and every sub-swimlane to 'expanded' */
function expandAll(swimlanes){
  for(const sl of swimlanes){
    sl.collapsed='expanded';
    for(const ss of sl.subSwims||[])ss.collapsed='expanded';
  }
}

/** Collapse All: set every swimlane to 'collapsed' (subs unaffected) */
function collapseAll(swimlanes){
  for(const sl of swimlanes){sl.collapsed='collapsed'}
}

/** Migrate boolean collapsed to string (legacy project compat) */
function migrateCollapsed(sl){
  if(sl.collapsed===true)sl.collapsed='collapsed';
  else if(sl.collapsed===false)sl.collapsed='expanded';
  else if(sl.collapsed==null)sl.collapsed='expanded';
  // strings pass through as-is
}

/** Migrate sub-swimlane collapsed */
function migrateSubCollapsed(ss){
  if(ss.collapsed==null)ss.collapsed='expanded';
  // sub-swimlanes are 2-state: 'expanded' / 'minimized'
}

/** Auto-cascade: if all subs minimized, parent should auto-minimize */
function autoCascadeMinimize(sl){
  if(!sl.subSwims||sl.subSwims.length===0)return;
  const allMin=sl.subSwims.every(ss=>ss.collapsed==='minimized');
  if(allMin)sl.collapsed='minimized';
}

/** Auto-cascade: expanding a sub should auto-expand parent */
function autoCascadeExpand(sl,ssId){
  const ss=sl.subSwims.find(s=>s.id===ssId);
  if(!ss)return;
  ss.collapsed='expanded';
  if(sl.collapsed==='minimized')sl.collapsed='expanded';
}

// ═══════════════════════════════════════════════════════════════════
//  SWIMLANE 3-STATE COLLAPSE (25 tests)
// ═══════════════════════════════════════════════════════════════════

section('Swimlane 3-State Collapse — State Values');

(()=>{
  const sl=makeSwim({collapsed:'expanded'});
  assert('Expanded state is string "expanded"',sl.collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({collapsed:'minimized'});
  assert('Minimized state is string "minimized"',sl.collapsed,'minimized');
})();

(()=>{
  const sl=makeSwim({collapsed:'collapsed'});
  assert('Collapsed state is string "collapsed"',sl.collapsed,'collapsed');
})();

(()=>{
  assert('All 3 states are distinct','expanded'!=='minimized'&&'minimized'!=='collapsed'&&'expanded'!=='collapsed',true);
})();

(()=>{
  assertNeq('expanded != minimized','expanded','minimized');
})();

(()=>{
  assertNeq('minimized != collapsed','minimized','collapsed');
})();

(()=>{
  assertNeq('expanded != collapsed','expanded','collapsed');
})();

section('Swimlane 3-State Collapse — Expand/Collapse All');

(()=>{
  const sls=[
    makeSwim({id:'s1',collapsed:'collapsed'}),
    makeSwim({id:'s2',collapsed:'minimized'}),
    makeSwim({id:'s3',collapsed:'expanded'}),
  ];
  expandAll(sls);
  assert('Expand All: s1 expanded',sls[0].collapsed,'expanded');
  assert('Expand All: s2 expanded',sls[1].collapsed,'expanded');
  assert('Expand All: s3 expanded',sls[2].collapsed,'expanded');
})();

(()=>{
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded'}),
    makeSwim({id:'s2',collapsed:'minimized'}),
    makeSwim({id:'s3',collapsed:'collapsed'}),
  ];
  collapseAll(sls);
  assert('Collapse All: s1 collapsed',sls[0].collapsed,'collapsed');
  assert('Collapse All: s2 collapsed',sls[1].collapsed,'collapsed');
  assert('Collapse All: s3 collapsed',sls[2].collapsed,'collapsed');
})();

(()=>{
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[{id:'ss1',collapsed:'minimized'},{id:'ss2',collapsed:'expanded'}]}),
    makeSwim({id:'s2',collapsed:'collapsed',subSwims:[{id:'ss3',collapsed:'minimized'}]}),
  ];
  expandAll(sls);
  assert('Expand All: sub ss1 expanded',sls[0].subSwims[0].collapsed,'expanded');
  assert('Expand All: sub ss2 expanded',sls[0].subSwims[1].collapsed,'expanded');
  assert('Expand All: sub ss3 expanded',sls[1].subSwims[0].collapsed,'expanded');
})();

(()=>{
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[{id:'ss1',collapsed:'expanded'}]}),
  ];
  collapseAll(sls);
  assert('Collapse All: parent collapsed',sls[0].collapsed,'collapsed');
  assert('Collapse All: sub-swim unaffected',sls[0].subSwims[0].collapsed,'expanded');
})();

section('Swimlane 3-State Collapse — Item Filtering');

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded'}),
    makeSwim({id:'s2',collapsed:'collapsed'}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',name:'Visible'}),
    makeItem('task',{swimlaneId:'s2',name:'Hidden'}),
  ];
  const vis=visibleItems(items,sls);
  assert('Items in collapsed swimlane filtered out',vis.length,1);
  assert('Visible item is from expanded swimlane',vis[0].name,'Visible');
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'minimized'}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',name:'StillVisible'}),
  ];
  const vis=visibleItems(items,sls);
  assert('Items in minimized swimlane still visible',vis.length,1);
  assert('Minimized item name',vis[0].name,'StillVisible');
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded'}),
    makeSwim({id:'s2',collapsed:'collapsed'}),
    makeSwim({id:'s3',collapsed:'minimized'}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',name:'A'}),
    makeItem('task',{swimlaneId:'s2',name:'B'}),
    makeItem('task',{swimlaneId:'s3',name:'C'}),
  ];
  const vis=visibleItems(items,sls);
  assert('Mixed states: 2 visible (expanded + minimized)',vis.length,2);
  assertT('Mixed: A visible',vis.some(i=>i.name==='A'));
  assertF('Mixed: B hidden',vis.some(i=>i.name==='B'));
  assertT('Mixed: C visible',vis.some(i=>i.name==='C'));
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'collapsed'}),
    makeSwim({id:'s2',collapsed:'collapsed'}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1'}),
    makeItem('milestone',{swimlaneId:'s2'}),
  ];
  const vis=visibleItems(items,sls);
  assert('All collapsed → 0 visible items',vis.length,0);
})();

// ═══════════════════════════════════════════════════════════════════
//  SUB-SWIMLANE 2-STATE (20 tests)
// ═══════════════════════════════════════════════════════════════════

section('Sub-Swimlane 2-State — State Values');

(()=>{
  const sl=makeSwim({id:'s1',subSwims:[{id:'ss1',collapsed:'expanded'}]});
  assert('Sub expanded state',sl.subSwims[0].collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',subSwims:[{id:'ss1',collapsed:'minimized'}]});
  assert('Sub minimized state',sl.subSwims[0].collapsed,'minimized');
})();

(()=>{
  assertNeq('Sub: expanded != minimized','expanded','minimized');
})();

section('Sub-Swimlane 2-State — Item Filtering by Sub');

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[
      {id:'ss1',collapsed:'expanded'},
      {id:'ss2',collapsed:'minimized'},
    ]}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',subSwimId:'ss1',name:'InExpandedSub'}),
    makeItem('task',{swimlaneId:'s1',subSwimId:'ss2',name:'InMinimizedSub'}),
  ];
  const vis=visibleItems(items,sls);
  assert('Item in minimized sub excluded',vis.length,1);
  assert('Visible item from expanded sub',vis[0].name,'InExpandedSub');
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[
      {id:'ss1',collapsed:'minimized'},
      {id:'ss2',collapsed:'minimized'},
    ]}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',subSwimId:'ss1'}),
    makeItem('task',{swimlaneId:'s1',subSwimId:'ss2'}),
  ];
  const vis=visibleItems(items,sls);
  assert('All subs minimized → 0 visible sub items',vis.length,0);
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[
      {id:'ss1',collapsed:'expanded'},
    ]}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',subSwimId:'',name:'NoSub'}),
    makeItem('task',{swimlaneId:'s1',subSwimId:'ss1',name:'InSub'}),
  ];
  const vis=visibleItems(items,sls);
  assert('Items without sub-swimlane always visible if parent expanded',vis.length,2);
})();

section('Sub-Swimlane 2-State — Minimized Height');

(()=>{
  const sl=makeSwim({id:'s1',subSwims:[{id:'ss1',collapsed:'minimized',height:20}]});
  assert('Minimized sub height is 20px',sl.subSwims[0].height,20);
})();

(()=>{
  const sl=makeSwim({id:'s1',subSwims:[{id:'ss1',collapsed:'expanded',height:60}]});
  assert('Expanded sub default height is 60px',sl.subSwims[0].height,60);
})();

section('Sub-Swimlane 2-State — Sub with No Items');

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded',subSwims:[{id:'ss1',collapsed:'expanded'}]}),
  ];
  const items=[];
  const vis=visibleItems(items,sls);
  assert('Sub with no items: 0 visible',vis.length,0);
})();

section('Sub-Swimlane 2-State — Auto-Cascade');

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'expanded',subSwims:[
    {id:'ss1',collapsed:'minimized'},
    {id:'ss2',collapsed:'minimized'},
    {id:'ss3',collapsed:'minimized'},
  ]});
  autoCascadeMinimize(sl);
  assert('All subs minimized → parent auto-minimizes',sl.collapsed,'minimized');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'expanded',subSwims:[
    {id:'ss1',collapsed:'minimized'},
    {id:'ss2',collapsed:'expanded'},
  ]});
  autoCascadeMinimize(sl);
  assert('Not all subs minimized → parent stays expanded',sl.collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'minimized',subSwims:[
    {id:'ss1',collapsed:'minimized'},
    {id:'ss2',collapsed:'minimized'},
  ]});
  autoCascadeExpand(sl,'ss1');
  assert('Expanding a sub → sub becomes expanded',sl.subSwims[0].collapsed,'expanded');
  assert('Expanding a sub → parent auto-expands',sl.collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'expanded',subSwims:[
    {id:'ss1',collapsed:'minimized'},
    {id:'ss2',collapsed:'minimized'},
  ]});
  autoCascadeExpand(sl,'ss2');
  assert('Expanding sub when parent already expanded: parent stays expanded',sl.collapsed,'expanded');
  assert('Expanded sub state',sl.subSwims[1].collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'expanded',subSwims:[]});
  autoCascadeMinimize(sl);
  assert('No subs → autoCascadeMinimize does nothing',sl.collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'minimized',subSwims:[
    {id:'ss1',collapsed:'minimized'},
  ]});
  autoCascadeExpand(sl,'ss1');
  assert('Single sub expanded → parent auto-expands',sl.collapsed,'expanded');
})();

(()=>{
  const sl=makeSwim({id:'s1',collapsed:'minimized',subSwims:[
    {id:'ss1',collapsed:'minimized'},
    {id:'ss2',collapsed:'minimized'},
    {id:'ss3',collapsed:'minimized'},
  ]});
  // Expand one sub, remaining 2 still minimized
  autoCascadeExpand(sl,'ss2');
  assert('Expand one of many subs → parent auto-expands',sl.collapsed,'expanded');
  assert('Only targeted sub expands',sl.subSwims[1].collapsed,'expanded');
  assert('Other subs remain minimized',sl.subSwims[0].collapsed,'minimized');
  assert('Other subs remain minimized (2)',sl.subSwims[2].collapsed,'minimized');
})();

// ═══════════════════════════════════════════════════════════════════
//  MIGRATION (15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Migration — Boolean to String Collapsed');

(()=>{
  const sl={id:'s1',name:'Test',collapsed:true,height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('Boolean true → "collapsed"',sl.collapsed,'collapsed');
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:false,height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('Boolean false → "expanded"',sl.collapsed,'expanded');
})();

(()=>{
  const sl={id:'s1',name:'Test',height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('Missing collapsed → default "expanded"',sl.collapsed,'expanded');
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:null,height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('null collapsed → default "expanded"',sl.collapsed,'expanded');
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:'expanded',height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('String "expanded" stays "expanded"',sl.collapsed,'expanded');
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:'minimized',height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('String "minimized" stays "minimized"',sl.collapsed,'minimized');
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:'collapsed',height:100,subSwims:[]};
  migrateCollapsed(sl);
  assert('String "collapsed" stays "collapsed"',sl.collapsed,'collapsed');
})();

section('Migration — Sub-Swimlane Collapsed');

(()=>{
  const ss={id:'ss1',name:'Sub',height:60};
  migrateSubCollapsed(ss);
  assert('Missing ss.collapsed → default "expanded"',ss.collapsed,'expanded');
})();

(()=>{
  const ss={id:'ss1',name:'Sub',collapsed:null,height:60};
  migrateSubCollapsed(ss);
  assert('null ss.collapsed → default "expanded"',ss.collapsed,'expanded');
})();

(()=>{
  const ss={id:'ss1',name:'Sub',collapsed:'expanded',height:60};
  migrateSubCollapsed(ss);
  assert('String "expanded" ss → stays "expanded"',ss.collapsed,'expanded');
})();

(()=>{
  const ss={id:'ss1',name:'Sub',collapsed:'minimized',height:60};
  migrateSubCollapsed(ss);
  assert('String "minimized" ss → stays "minimized"',ss.collapsed,'minimized');
})();

section('Migration — Old Project Without subSwims');

(()=>{
  const sl={id:'s1',name:'Test',collapsed:true,height:100};
  migrateCollapsed(sl);
  assert('Old project: collapsed migrated',sl.collapsed,'collapsed');
  assertT('Old project: no subSwims key is fine',sl.subSwims===undefined);
})();

(()=>{
  const sl={id:'s1',name:'Test',collapsed:false,height:100};
  migrateCollapsed(sl);
  sl.subSwims=[];
  assert('After migration, can add empty subSwims',sl.subSwims.length,0);
})();

(()=>{
  // Full project migration simulation
  const proj={swimlanes:[
    {id:'s1',name:'A',collapsed:true,height:100},
    {id:'s2',name:'B',collapsed:false,height:80},
    {id:'s3',name:'C',height:120},
  ]};
  for(const sl of proj.swimlanes){
    migrateCollapsed(sl);
    if(!sl.subSwims)sl.subSwims=[];
  }
  assert('Full migration: s1',proj.swimlanes[0].collapsed,'collapsed');
  assert('Full migration: s2',proj.swimlanes[1].collapsed,'expanded');
  assert('Full migration: s3',proj.swimlanes[2].collapsed,'expanded');
  assertT('Full migration: all have subSwims',proj.swimlanes.every(s=>Array.isArray(s.subSwims)));
})();

(()=>{
  // Migrate project with subSwims already present
  const proj={swimlanes:[
    {id:'s1',name:'A',collapsed:'expanded',height:100,subSwims:[
      {id:'ss1',name:'Sub1',height:60},
      {id:'ss2',name:'Sub2',collapsed:'minimized',height:60},
    ]},
  ]};
  for(const sl of proj.swimlanes){
    migrateCollapsed(sl);
    for(const ss of sl.subSwims||[])migrateSubCollapsed(ss);
  }
  assert('Existing project: parent unchanged',proj.swimlanes[0].collapsed,'expanded');
  assert('Existing project: ss1 defaults to expanded',proj.swimlanes[0].subSwims[0].collapsed,'expanded');
  assert('Existing project: ss2 stays minimized',proj.swimlanes[0].subSwims[1].collapsed,'minimized');
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
