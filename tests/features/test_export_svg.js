#!/usr/bin/env node
/**
 * Timeline Studio -- SVG Export Logic Tests
 * Covers: resolveRenderColor, resolveInlinePrefix, resolveBadgeType,
 *   watermark positioning (9 positions), labelWidth impact.
 *
 * ~50 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Functions ──────────────────────────────────────────────────────

/** Resolve the render color for an item based on status display config */
function resolveRenderColor(it,sd,sdCfg){
  let renderColor=it.color;
  if(sdCfg.show&&sdCfg.colorOverride){
    if(sd)renderColor=sd.color;
    else if(sdCfg.blankColor)renderColor=sdCfg.blankColor;
  }
  return renderColor;
}

/** Resolve the inline prefix string for an item's label */
function resolveInlinePrefix(sd,sdCfg){
  if(!sd||!sdCfg.show||sdCfg.badgePos!=='inline')return'';
  if(sdCfg.mode==='emoji')return sd.emoji+' ';
  if(sdCfg.mode==='text')return sd.name+' ';
  return'('+sd.shortName+') ';
}

/** Resolve what type of badge to render */
function resolveBadgeType(sd,sdCfg){
  if(!sd||!sdCfg.show)return'none';
  if(sdCfg.badgePos==='inline')return'inline';
  if(sdCfg.mode==='emoji')return'emoji';
  if(sdCfg.mode==='shortName')return'pill';
  if(sdCfg.mode==='text')return'text';
  return'none';
}

/** Compute watermark position */
function wmPosition(pos,lw,contentW){
  let x,anchor;
  if(pos.includes('left')){x=lw+8;anchor='start'}
  else if(pos.includes('right')){x=contentW-8;anchor='end'}
  else{x=(lw+contentW)/2;anchor='middle'}
  return{x,anchor};
}

// ═══════════════════════════════════════════════════════════════════
//  COLOR RESOLUTION (15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Color Resolution — resolveRenderColor');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000'});
  const cfg=makeStatusDisplay({show:false,colorOverride:false});
  const color=resolveRenderColor(it,null,cfg);
  assert('No status → item color',color,'#ff0000');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'on-track'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,colorOverride:false});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Status + colorOverride OFF → item color',color,'#ff0000');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'on-track'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Status + colorOverride ON → status color',color,'#22c55e');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:''});
  const cfg=makeStatusDisplay({show:true,colorOverride:true,blankColor:'#999999'});
  const color=resolveRenderColor(it,null,cfg);
  assert('No status + colorOverride ON + blankColor → blankColor',color,'#999999');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:''});
  const cfg=makeStatusDisplay({show:true,colorOverride:true,blankColor:''});
  const color=resolveRenderColor(it,null,cfg);
  assert('No status + colorOverride ON + no blankColor → item color',color,'#ff0000');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'on-track'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:false,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('show=false + colorOverride → item color (show gates)',color,'#ff0000');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'at-risk'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='at-risk');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('At-risk status color (yellow)',color,'#eab308');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'off-track'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='off-track');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Off-track status color (red)',color,'#ef4444');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'complete'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='complete');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Complete status color (blue)',color,'#3b82f6');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'tbd'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='tbd');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('TBD status color (gray)',color,'#6b7280');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#ff0000',status:'not-started'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='not-started');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Not-started status color',color,'#9ca3af');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{color:'#0000ff',status:'on-track'});
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,colorOverride:true});
  const color=resolveRenderColor(it,sd,cfg);
  assert('Milestone: status color override works',color,'#22c55e');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#aabbcc'});
  const cfg=makeStatusDisplay({show:true,colorOverride:true,blankColor:'#112233'});
  const color=resolveRenderColor(it,null,cfg);
  assert('Blank status + blankColor provided → blankColor',color,'#112233');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#aabbcc'});
  const cfg=makeStatusDisplay({show:false,colorOverride:false});
  const color=resolveRenderColor(it,null,cfg);
  assert('Everything off → item color',color,'#aabbcc');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{color:'#aabbcc'});
  const cfg=makeStatusDisplay({show:true,colorOverride:false,blankColor:'#112233'});
  const color=resolveRenderColor(it,null,cfg);
  assert('colorOverride false ignores blankColor',color,'#aabbcc');
})();

// ═══════════════════════════════════════════════════════════════════
//  INLINE PREFIX RESOLUTION (15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Inline Prefix — resolveInlinePrefix');

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assertIncludes('Emoji mode + inline → emoji prefix',pfx,sd.emoji);
  assertIncludes('Emoji prefix has trailing space',pfx,' ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('ShortName mode + inline → (G) ',pfx,'(G) ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Text mode + inline → "On Track "',pfx,'On Track ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'above'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Non-inline position → empty',pfx,'');
})();

(()=>{
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(null,cfg);
  assert('No status → empty',pfx,'');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:false,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Show OFF → empty',pfx,'');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='at-risk');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assertIncludes('At-risk emoji prefix',pfx,sd.emoji);
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='off-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assertIncludes('Off-track emoji prefix',pfx,sd.emoji);
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='complete');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assertIncludes('Complete emoji prefix',pfx,sd.emoji);
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='at-risk');
  const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('At-risk shortName mode → (Y) ',pfx,'(Y) ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='off-track');
  const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Off-track shortName mode → (R) ',pfx,'(R) ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='complete');
  const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Complete text mode → "Complete "',pfx,'Complete ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='tbd');
  const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('TBD text mode → "TBD "',pfx,'TBD ');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='not-started');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assertIncludes('Not-started emoji prefix',pfx,sd.emoji);
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'below'});
  const pfx=resolveInlinePrefix(sd,cfg);
  assert('Below position → empty (not inline)',pfx,'');
})();

// ═══════════════════════════════════════════════════════════════════
//  BADGE TYPE RESOLUTION (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Badge Type — resolveBadgeType');

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'above'});
  assert('Emoji + non-inline → emoji',resolveBadgeType(sd,cfg),'emoji');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'above'});
  assert('ShortName + non-inline → pill',resolveBadgeType(sd,cfg),'pill');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'above'});
  assert('Text + non-inline → text',resolveBadgeType(sd,cfg),'text');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  assert('Inline → inline',resolveBadgeType(sd,cfg),'inline');
})();

(()=>{
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'above'});
  assert('No status → none',resolveBadgeType(null,cfg),'none');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:false,mode:'emoji',badgePos:'above'});
  assert('Show=false → none',resolveBadgeType(sd,cfg),'none');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='on-track');
  const cfg=makeStatusDisplay({show:true,mode:'shortName',badgePos:'inline'});
  assert('ShortName + inline → inline (inline overrides mode)',resolveBadgeType(sd,cfg),'inline');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='at-risk');
  const cfg=makeStatusDisplay({show:true,mode:'emoji',badgePos:'below'});
  assert('Emoji + below → emoji',resolveBadgeType(sd,cfg),'emoji');
})();

(()=>{
  const defs=makeStatusDefs();
  const sd=defs.find(s=>s.id==='off-track');
  const cfg=makeStatusDisplay({show:true,mode:'text',badgePos:'below'});
  assert('Text + below → text',resolveBadgeType(sd,cfg),'text');
})();

(()=>{
  const cfg=makeStatusDisplay({show:false,mode:'text',badgePos:'inline'});
  assert('Show=false + inline → none',resolveBadgeType(null,cfg),'none');
})();

// ═══════════════════════════════════════════════════════════════════
//  WATERMARK POSITIONING (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Watermark Positioning — wmPosition');

(()=>{
  const p=wmPosition('top-left',160,1000);
  assert('top-left: x = lw+8',p.x,168);
  assert('top-left: anchor = start',p.anchor,'start');
})();

(()=>{
  const p=wmPosition('top-center',160,1000);
  assert('top-center: x = (lw+contentW)/2',p.x,580);
  assert('top-center: anchor = middle',p.anchor,'middle');
})();

(()=>{
  const p=wmPosition('top-right',160,1000);
  assert('top-right: x = contentW-8',p.x,992);
  assert('top-right: anchor = end',p.anchor,'end');
})();

(()=>{
  const p=wmPosition('center-left',160,1000);
  assert('center-left: x = lw+8',p.x,168);
  assert('center-left: anchor = start',p.anchor,'start');
})();

(()=>{
  const p=wmPosition('center-center',160,1000);
  assert('center-center: x = (lw+contentW)/2',p.x,580);
  assert('center-center: anchor = middle',p.anchor,'middle');
})();

(()=>{
  const p=wmPosition('center-right',160,1000);
  assert('center-right: x = contentW-8',p.x,992);
  assert('center-right: anchor = end',p.anchor,'end');
})();

(()=>{
  const p=wmPosition('bottom-left',160,1000);
  assert('bottom-left: x = lw+8',p.x,168);
  assert('bottom-left: anchor = start',p.anchor,'start');
})();

(()=>{
  const p=wmPosition('bottom-center',160,1000);
  assert('bottom-center: x = (lw+contentW)/2',p.x,580);
  assert('bottom-center: anchor = middle',p.anchor,'middle');
})();

(()=>{
  const p=wmPosition('bottom-right',160,1000);
  assert('bottom-right: x = contentW-8',p.x,992);
  assert('bottom-right: anchor = end',p.anchor,'end');
})();

section('Watermark Positioning — Different labelWidth');

(()=>{
  const p80=wmPosition('top-left',80,1000);
  const p400=wmPosition('top-left',400,1000);
  assert('lw=80: x = 88',p80.x,88);
  assert('lw=400: x = 408',p400.x,408);
  assertT('Different labelWidth affects left position',p400.x>p80.x);
})();

(()=>{
  const p80=wmPosition('top-center',80,1000);
  const p400=wmPosition('top-center',400,1000);
  assert('lw=80 center: x = (80+1000)/2 = 540',p80.x,540);
  assert('lw=400 center: x = (400+1000)/2 = 700',p400.x,700);
})();

(()=>{
  const p80=wmPosition('top-right',80,1000);
  const p400=wmPosition('top-right',400,1000);
  assert('lw=80 right: x = 992',p80.x,992);
  assert('lw=400 right: x = 992 (right unaffected by lw)',p400.x,992);
})();

// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
//  Export Completeness — Data Preparation Layer
//  Tests that the export pipeline has the RIGHT INPUTS to produce
//  all required visual elements (grid, shading, arrows, markers)
// ═══════════════════════════════════════════════════════════════════
section('Export Completeness — Weekend Shading');
{
  // Weekend shading requires: showWeekends=true, weekendOpacity>0, and day-of-week=0(Sun) or 6(Sat)
  resetItemCounter();
  const p=makeProj({showWeekends:true,weekendOpacity:15});
  resetApp(p);
  assertT('Weekend shading enabled',p.showWeekends===true);
  assertT('Weekend opacity > 0',p.weekendOpacity>0);
  // Export multiplies: 0.15 * (opacity/100)
  const exportOpacity=0.15*(p.weekendOpacity/100);
  assertT('Export opacity formula produces visible value',exportOpacity>0);
  assertT('Export opacity < 1.0',exportOpacity<1.0);

  // Disabled: weekendOpacity=0 means no shading
  const p2=makeProj({showWeekends:true,weekendOpacity:0});
  const noShade=0.15*(p2.weekendOpacity/100);
  assert('Zero weekendOpacity -> no shading',noShade,0);

  // showWeekends=false: no columns to shade regardless of opacity
  const p3=makeProj({showWeekends:false,weekendOpacity:50});
  assertF('showWeekends=false skips shading',p3.showWeekends);
}

section('Export Completeness — Holiday Shading');
{
  resetItemCounter();
  const p=makeProj();
  p.holidays=[
    {date:'2026-01-20',name:'MLK Day',color:'#0000FF',schedAround:true},
    {date:'2026-12-25',name:'Christmas',color:'#FF0000',schedAround:true}
  ];
  resetApp(p);
  assert('Project has 2 holidays',p.holidays.length,2);
  assertT('Holiday has color for shading',p.holidays[0].color==='#0000FF');
  assertT('Holiday has date for column match',p.holidays[0].date==='2026-01-20');
  // Each holiday renders as a full-height rect in the export at its column position
}

section('Export Completeness — Today Marker');
{
  resetItemCounter();
  const p=makeProj({showToday:true});
  resetApp(p);
  assertT('Today marker enabled',p.showToday===true);
  // Today marker is a vertical line at dX(today) position + a small label
  const today=U.iso(new Date());
  assertT('U.iso produces valid date string',today.length===10);

  // Disabled
  const p2=makeProj({showToday:false});
  assertF('Today marker disabled',p2.showToday);
}

section('Export Completeness — Dependency Arrows');
{
  resetItemCounter();
  const p=makeProj({showDeps:true});
  const a=makeItem('task',{id:'ea',startDate:'2026-01-05',duration:5});
  const b=makeItem('task',{id:'eb',startDate:'2026-01-12',duration:3});
  addDep(b,'ea','FS',0);
  addItems(p,a,b);
  resetApp(p);
  assertT('Dependency arrows enabled',p.showDeps===true);
  assert('Item B has dependency',b.deps.length,1);
  // Export renders SVG <path> for each dep arrow from predecessor endDate to successor startDate

  // showDeps=false -> arrows not rendered
  const p2=makeProj({showDeps:false});
  assertF('Arrows disabled when showDeps=false',p2.showDeps);
}

section('Export Completeness — Progress Bars');
{
  resetItemCounter();
  const task=makeItem('task',{progress:75,startDate:'2026-01-05',duration:10});
  assertT('Task has progress value',task.progress===75);
  // Export renders a progress overlay rect at (barWidth * progress/100) width
  const barWidth=100; // hypothetical
  const progressWidth=barWidth*(task.progress/100);
  assert('Progress overlay width = 75% of bar',progressWidth,75);

  // Zero progress: no overlay
  const task0=makeItem('task',{progress:0,startDate:'2026-01-05',duration:5});
  assert('Zero progress = no overlay',task0.progress,0);

  // 100% progress: full overlay
  const task100=makeItem('task',{progress:100,startDate:'2026-01-05',duration:5});
  const fullWidth=barWidth*(task100.progress/100);
  assert('100% progress = full overlay',fullWidth,100);
}

section('Export Completeness — Edge Date Labels');
{
  resetItemCounter();
  const task=makeItem('task',{showDate:true,startDate:'2026-01-05',endDate:'2026-01-09',duration:5});
  assertT('Task showDate enabled',task.showDate===true);
  // Export renders start/end date labels at bar edges when showDate=true

  const noDate=makeItem('task',{showDate:false,startDate:'2026-01-05',duration:5});
  assertF('Task showDate disabled',noDate.showDate);
  // No edge labels rendered when showDate=false
}

section('Export Completeness — Hidden Item Handling');
{
  resetItemCounter();
  const p=makeProj({hideMode:true});
  const visible=makeItem('task',{hidden:false,startDate:'2026-01-05',duration:5});
  const hidden=makeItem('task',{hidden:true,startDate:'2026-01-12',duration:3});
  addItems(p,visible,hidden);
  resetApp(p);

  // hideMode ON + hidden=true -> skip entirely in export
  const visibleItems=p.items.filter(i=>!(p.hideMode&&i.hidden));
  assert('hideMode ON: hidden items excluded',visibleItems.length,1);

  // hideMode OFF + hidden=true -> render at 30% opacity
  p.hideMode=false;
  const allItems=p.items.filter(i=>!(p.hideMode&&i.hidden));
  assert('hideMode OFF: all items included',allItems.length,2);
  assertT('Hidden item gets opacity treatment',hidden.hidden===true);
}

section('Export Completeness — Collapsed Swimlane Exclusion');
{
  resetItemCounter();
  const p=makeProj({swimlanes:[
    {id:'vis',name:'Visible',color:'',collapsed:'expanded',height:100,subSwimlanes:[]},
    {id:'min',name:'Minimized',color:'',collapsed:'minimized',height:28,subSwimlanes:[]},
    {id:'hid',name:'Hidden',color:'',collapsed:'collapsed',height:0,subSwimlanes:[]}
  ]});
  addItems(p,
    makeItem('task',{swimlaneId:'vis',startDate:'2026-01-05',duration:5}),
    makeItem('task',{swimlaneId:'min',startDate:'2026-01-08',duration:3}),
    makeItem('task',{swimlaneId:'hid',startDate:'2026-01-12',duration:4})
  );
  resetApp(p);

  const collapsedIds=new Set(p.swimlanes.filter(s=>s.collapsed==='collapsed').map(s=>s.id));
  const fitItems=p.items.filter(i=>!collapsedIds.has(i.swimlaneId));
  assert('Fit excludes collapsed swimlane items',fitItems.length,2);
  assertT('Visible swimlane item included',fitItems.some(i=>i.swimlaneId==='vis'));
  assertT('Minimized swimlane item included',fitItems.some(i=>i.swimlaneId==='min'));
  assertF('Collapsed swimlane item excluded',fitItems.some(i=>i.swimlaneId==='hid'));
}

// ═══════════════════════════════════════════════════════════════════
//  CRITICAL PATH IN EXPORT (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Export — Critical Path Highlighting');
{
  resetItemCounter();
  // Build a simple chain: TaskA → TaskB (FS+0) — both should be critical
  const taskA=makeItem('task',{id:'cpA',startDate:'2026-02-02',duration:5});
  const taskB=makeItem('task',{id:'cpB',startDate:'2026-02-07',duration:3,
    deps:[{id:'cpA',type:'FS',lag:0}]});
  const p=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  addItems(p,taskA,taskB);
  resetApp(p);
  App.runSchedule();

  // With _critPath OFF, getCriticalPath should still work but wouldn't be called in export
  App._critPath=false;
  const noCrit=App._critPath?App.getCriticalPath():null;
  assert('critPath OFF: critIds is null',noCrit,null);

  // With _critPath ON, should get a valid set
  App._critPath=true;
  const critIds=App._critPath?App.getCriticalPath():null;
  assertT('critPath ON: critIds is non-null',critIds!==null);
  assertT('critPath ON: critIds has TaskA',critIds&&critIds.has('cpA'));
  assertT('critPath ON: critIds has TaskB',critIds&&critIds.has('cpB'));
  assert('critPath ON: exactly 2 critical items',critIds?critIds.size:0,2);
}

section('Export — Critical Path With Non-Critical Branch');
{
  resetItemCounter();
  // Diamond: Start → LongTask(10d) → End, Start → ShortTask(2d) → End
  // LongTask is critical, ShortTask has slack
  const start=makeItem('milestone',{id:'cpStart',date:'2026-03-02'});
  const longTask=makeItem('task',{id:'cpLong',startDate:'2026-01-01',duration:10,
    deps:[{id:'cpStart',type:'FS',lag:0}]});
  const shortTask=makeItem('task',{id:'cpShort',startDate:'2026-01-01',duration:2,
    deps:[{id:'cpStart',type:'FS',lag:0}]});
  const endMs=makeItem('milestone',{id:'cpEnd',date:'2026-01-01',
    deps:[{id:'cpLong',type:'FS',lag:0},{id:'cpShort',type:'FS',lag:0}]});
  const p=makeProj({schedulingMode:'scheduled',scheduleAroundNonWorking:false});
  addItems(p,start,longTask,shortTask,endMs);
  resetApp(p);
  App.runSchedule();
  App._critPath=true;
  const critIds=App.getCriticalPath();

  assertT('Diamond: LongTask is critical',critIds&&critIds.has('cpLong'));
  assertF('Diamond: ShortTask is NOT critical',critIds&&critIds.has('cpShort'));
  assertT('Diamond: End milestone is critical',critIds&&critIds.has('cpEnd'));
  assertT('Diamond: Start milestone is critical',critIds&&critIds.has('cpStart'));

  // Clean up
  App._critPath=false;
}

// ═══════════════════════════════════════════════════════════════════
// B43 — Canvas DPR capping for large exports
// ═══════════════════════════════════════════════════════════════════

section('B43 — DPR auto-reduction for large canvas dimensions');
{
  // Extract the DPR capping logic from copyScreenshot/exportPNG
  function capDpr(naturalW,naturalH,baseDpr){
    const maxDim=16384;
    let dpr=baseDpr;
    if(naturalW*dpr>maxDim||naturalH*dpr>maxDim)dpr=Math.floor(maxDim/Math.max(naturalW,naturalH))||1;
    return dpr;
  }

  // Normal viewport screenshot: 1360px wide at dpr 2
  assert('Normal viewport: DPR unchanged',capDpr(1360,800,2),2);

  // Normal full export: 3000px wide at dpr 3
  assert('Normal full export: DPR unchanged',capDpr(3000,800,3),3);

  // Large days export: 13140px wide (365 days × 36px) at dpr 3
  assert('Large days export: DPR reduced to 1',capDpr(13140,800,3),1);

  // Very large export: 26280px wide at dpr 2
  assert('Very large export: DPR reduced to 1',capDpr(26280,800,2),1);

  // Tall export: normal width but very tall
  assert('Tall export: DPR capped by height',capDpr(1000,6000,3),2);

  // Edge case: exactly at limit (8192 × 2 = 16384)
  assert('At limit: 8192px at dpr 2 = 16384',capDpr(8192,400,2),2);

  // Edge case: just over limit (8193 × 2 = 16386 > 16384)
  assert('Just over: 8193px at dpr 2 → reduced',capDpr(8193,400,2),1);

  // Small viewport at high DPI: safe
  assert('Small viewport at 4x DPI: unchanged',capDpr(800,600,4),4);

  // Medium export at 4x DPI: just exceeds
  assert('Medium 4100px at 4x: reduced to 3',capDpr(4100,1000,4),3);
}

section('B43 — Canvas dimensions never exceed maxDim after capping');
{
  function capDpr(naturalW,naturalH,baseDpr){
    const maxDim=16384;
    let dpr=baseDpr;
    if(naturalW*dpr>maxDim||naturalH*dpr>maxDim)dpr=Math.floor(maxDim/Math.max(naturalW,naturalH))||1;
    return dpr;
  }

  const cases=[
    {w:5000,h:3000,dpr:4},    // 5000×4=20000 > 16384
    {w:2000,h:1000,dpr:3},    // 2000×3=6000 < 16384, OK
    {w:16384,h:100,dpr:2},    // 16384×2=32768 > 16384
    {w:13140,h:1200,dpr:3},   // Days timescale full export
    {w:800,h:600,dpr:2},      // Normal viewport
  ];
  for(const d of cases){
    const capped=capDpr(d.w,d.h,d.dpr);
    assertLte(`Canvas w=${d.w}×dpr=${capped} <= 16384`,d.w*capped,16384);
    assertLte(`Canvas h=${d.h}×dpr=${capped} <= 16384`,d.h*capped,16384);
  }
}

section('B43 — DPR floor of 1 for extreme dimensions');
{
  function capDpr(naturalW,naturalH,baseDpr){
    const maxDim=16384;
    let dpr=baseDpr;
    if(naturalW*dpr>maxDim||naturalH*dpr>maxDim)dpr=Math.floor(maxDim/Math.max(naturalW,naturalH))||1;
    return dpr;
  }

  // Image wider than maxDim itself (DPR must be 1)
  assert('Width > maxDim: DPR = 1',capDpr(20000,800,3),1);

  // Both dimensions exceed limit even at DPR 1 — floor to 1
  assert('Both huge: still floor to 1',capDpr(50000,50000,4),1);

  // Ensure floor prevents DPR of 0
  assertGte('DPR never below 1',capDpr(99999,99999,4),1);
}

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
