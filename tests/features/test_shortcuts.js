#!/usr/bin/env node
/**
 * Timeline Studio -- F18 Keyboard Shortcut Engine Test Suite
 * ~80 tests covering key normalization, binding management,
 * map building, reserved/browser combo sets, context guards,
 * dispatch metadata, and escape handling.
 */

const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U,App}=require('../helpers/mock-engine');

// ═══════════════════════════════════════════════════════════════════
//  MOCK DATA STRUCTURES (from app.js lines 35-86)
// ═══════════════════════════════════════════════════════════════════

const SHORTCUT_ACTIONS=[
  // Tier 1 -- Reserved (non-editable)
  {id:'undo',cat:'Reserved',label:'Undo',defaults:['Ctrl+z'],global:true,reserved:true},
  {id:'redo',cat:'Reserved',label:'Redo',defaults:['Ctrl+y'],global:true,reserved:true},
  {id:'save',cat:'Reserved',label:'Save',defaults:['Ctrl+s'],global:true,reserved:true},
  {id:'saveAs',cat:'Reserved',label:'Save As',defaults:['Ctrl+Shift+s'],global:true,reserved:true},
  {id:'newProject',cat:'Reserved',label:'New Project',defaults:['Ctrl+n'],global:true,reserved:true},
  {id:'openFile',cat:'Reserved',label:'Open File',defaults:['Ctrl+o'],global:true,reserved:true},
  {id:'escape',cat:'Reserved',label:'Deselect / Close',defaults:['Escape'],global:true,reserved:true,special:true},
  {id:'shortcutMgr',cat:'Reserved',label:'Open Shortcut Manager',defaults:['Ctrl+Shift+k'],global:true,reserved:true},
  {id:'delete',cat:'Reserved',label:'Delete Selected',defaults:['Delete'],ctx:'sel',reserved:true},
  {id:'selectAll',cat:'Reserved',label:'Select All',defaults:['Ctrl+a'],ctx:'tl',reserved:true},
  // Hidden nudge keys
  {id:'nudgeLeft',cat:'Edit',label:'Nudge Left',defaults:['ArrowLeft'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeRight',cat:'Edit',label:'Nudge Right',defaults:['ArrowRight'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeUp',cat:'Edit',label:'Nudge Up',defaults:['ArrowUp'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeDown',cat:'Edit',label:'Nudge Down',defaults:['ArrowDown'],ctx:'sel',special:'nudge',hidden:true},
  // Tier 2 -- Customizable: View
  {id:'fitToContent',cat:'View',label:'Fit to Content',defaults:['Ctrl+Shift+f','Alt+1'],ctx:'tl'},
  {id:'goToday',cat:'View',label:'Scroll to Today',defaults:[],ctx:'tl'},
  {id:'zoomIn',cat:'View',label:'Zoom In (5%)',defaults:['=','Shift+='],ctx:'tl'},
  {id:'zoomOut',cat:'View',label:'Zoom Out (5%)',defaults:['-'],ctx:'tl'},
  {id:'zoom100',cat:'View',label:'Zoom 100%',defaults:[],ctx:'tl'},
  {id:'fullscreen',cat:'View',label:'Toggle Fullscreen',defaults:[],global:true},
  {id:'expandAll',cat:'View',label:'Expand All Swimlanes',defaults:[],ctx:'tl'},
  {id:'collapseAll',cat:'View',label:'Collapse All Swimlanes',defaults:[],ctx:'tl'},
  {id:'showFloat',cat:'View',label:'Toggle Float Labels',defaults:[],ctx:'tl'},
  // Tier 2 -- Customizable: Tools
  {id:'propagate',cat:'Tools',label:'Propagate to Successors',defaults:['Ctrl+Shift+p'],ctx:'sel-manual'},
  {id:'toggleLock',cat:'Tools',label:'Toggle Lock',defaults:[],global:true},
  {id:'toggleHide',cat:'Tools',label:'Toggle Hide Mode',defaults:[],global:true},
  {id:'toggleCritPath',cat:'Tools',label:'Toggle Critical Path',defaults:[],ctx:'tl'},
  {id:'toggleLasso',cat:'Tools',label:'Toggle Lasso Mode',defaults:[],ctx:'tl'},
  // Tier 2 -- Customizable: Items
  {id:'addMilestone',cat:'Items',label:'Add Milestone',defaults:[],ctx:'tl'},
  {id:'addTask',cat:'Items',label:'Add Task',defaults:[],ctx:'tl'},
  {id:'addSwimlane',cat:'Items',label:'Add Swimlane',defaults:[],global:true},
  // Tier 2 -- Customizable: Export
  {id:'snapViewport',cat:'Export',label:'Screenshot (Viewport)',defaults:[],ctx:'tl'},
  {id:'snapFull',cat:'Export',label:'Screenshot (Full)',defaults:[],ctx:'tl'},
];

const MOUSE_REFS=[
  {combo:'Ctrl+Click',desc:'Multi-select items'},
  {combo:'Shift+Click',desc:'Range-select (Data Table)'},
  {combo:'Alt+Drag',desc:'Lasso select area'},
  {combo:'Ctrl+Scroll',desc:'Zoom ±5%'},
  {combo:'Ctrl+Shift+Scroll',desc:'Fine zoom ±1%'},
  {combo:'Double-click',desc:'Edit item / swimlane'},
  {combo:'Right-click',desc:'Context menu'},
];

const RESERVED_COMBOS=new Set(['Ctrl+v','Ctrl+c','Ctrl+x']);
const BROWSER_RESERVED=new Set(['Ctrl+t','Ctrl+w','Ctrl+Tab','Ctrl+Shift+Tab','Ctrl+l','Ctrl+Shift+t','Ctrl+Shift+n','F5','Ctrl+F5','F12']);

// ═══════════════════════════════════════════════════════════════════
//  MOCK FUNCTIONS (from app.js shortcut engine)
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalizes a keyboard event into a combo string.
 * Matches app.js _normalizeKey exactly: Ctrl before Shift before Alt,
 * bare modifier keys return null, single-char keys lowercased.
 */
function _normalizeKey(e){
  const parts=[];
  if(e.ctrlKey||e.metaKey)parts.push('Ctrl');
  if(e.shiftKey)parts.push('Shift');
  if(e.altKey)parts.push('Alt');
  let key=e.key;
  if(['Control','Shift','Alt','Meta'].includes(key))return null;
  if(key.length===1)key=key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

/**
 * Returns the active bindings for an action, respecting overrides.
 * Reserved actions always use defaults (overrides ignored).
 */
function _getBindings(actionId,overrides,actions){
  const action=actions.find(a=>a.id===actionId);
  if(!action)return[];
  if(action.reserved)return[...action.defaults];
  if(overrides&&actionId in overrides)return overrides[actionId];
  return[...action.defaults];
}

/**
 * Builds the combo->actionId dispatch map.
 * Reserved actions always use defaults. Customizable actions respect overrides.
 * Lowercases all combos for case-insensitive lookup.
 */
function _buildShortcutMap(actions,overrides){
  const map={};
  for(const a of actions){
    const bindings=a.reserved?[...a.defaults]:_getBindings(a.id,overrides,actions);
    for(const combo of bindings)map[combo.toLowerCase()]=a.id;
  }
  return map;
}

/** Fake keyboard event for testing _normalizeKey. */
function fakeEvent(key,mods={}){
  return{
    key,
    ctrlKey:!!mods.ctrl,
    metaKey:!!mods.meta,
    shiftKey:!!mods.shift,
    altKey:!!mods.alt,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 1: Key Normalization (~20 tests)
// ═══════════════════════════════════════════════════════════════════
section('Key Normalization');

assert('Ctrl+S event',
  _normalizeKey(fakeEvent('s',{ctrl:true})),'Ctrl+s');

assert('Shift+A',
  _normalizeKey(fakeEvent('A',{shift:true})),'Shift+a');

assert('Ctrl+Shift+F',
  _normalizeKey(fakeEvent('F',{ctrl:true,shift:true})),'Ctrl+Shift+f');

assert('Alt+1',
  _normalizeKey(fakeEvent('1',{alt:true})),'Alt+1');

assert('Space key normalizes to space',
  _normalizeKey(fakeEvent(' ')),' ');

assert('Escape key',
  _normalizeKey(fakeEvent('Escape')),'Escape');

assert('Delete key',
  _normalizeKey(fakeEvent('Delete')),'Delete');

assert('ArrowUp key',
  _normalizeKey(fakeEvent('ArrowUp')),'ArrowUp');

assert('ArrowDown key',
  _normalizeKey(fakeEvent('ArrowDown')),'ArrowDown');

assert('ArrowLeft key',
  _normalizeKey(fakeEvent('ArrowLeft')),'ArrowLeft');

assert('ArrowRight key',
  _normalizeKey(fakeEvent('ArrowRight')),'ArrowRight');

assert('F1 key',
  _normalizeKey(fakeEvent('F1')),'F1');

assert('F5 key',
  _normalizeKey(fakeEvent('F5')),'F5');

assert('F12 key',
  _normalizeKey(fakeEvent('F12')),'F12');

assert('Plain letter a (no modifiers)',
  _normalizeKey(fakeEvent('a')),'a');

assert('Plain letter z (no modifiers)',
  _normalizeKey(fakeEvent('z')),'z');

assert('Ctrl+Alt+Shift modifier order is Ctrl+Shift+Alt',
  _normalizeKey(fakeEvent('x',{ctrl:true,alt:true,shift:true})),'Ctrl+Shift+Alt+x');

assert('Meta key (Mac) maps to Ctrl prefix',
  _normalizeKey(fakeEvent('s',{meta:true})),'Ctrl+s');

assert('Bare Control key returns null',
  _normalizeKey(fakeEvent('Control',{ctrl:true})),null);

assert('Bare Shift key returns null',
  _normalizeKey(fakeEvent('Shift',{shift:true})),null);

assert('Bare Alt key returns null',
  _normalizeKey(fakeEvent('Alt',{alt:true})),null);

assert('Bare Meta key returns null',
  _normalizeKey(fakeEvent('Meta',{meta:true})),null);

assert('Tab key',
  _normalizeKey(fakeEvent('Tab')),'Tab');

assert('Ctrl+Tab',
  _normalizeKey(fakeEvent('Tab',{ctrl:true})),'Ctrl+Tab');

// ═══════════════════════════════════════════════════════════════════
//  SECTION 2: Binding Management (~20 tests)
// ═══════════════════════════════════════════════════════════════════
section('Binding Management');

// No overrides -> returns defaults
assert('No overrides: undo returns default Ctrl+z',
  JSON.stringify(_getBindings('undo',null,SHORTCUT_ACTIONS)),
  JSON.stringify(['Ctrl+z']));

assert('No overrides: delete returns default Delete',
  JSON.stringify(_getBindings('delete',null,SHORTCUT_ACTIONS)),
  JSON.stringify(['Delete']));

assert('No overrides: zoomIn returns defaults = and Shift+=',
  JSON.stringify(_getBindings('zoomIn',null,SHORTCUT_ACTIONS)),
  JSON.stringify(['=','Shift+=']));

assert('No overrides: zoomOut returns default -',
  JSON.stringify(_getBindings('zoomOut',null,SHORTCUT_ACTIONS)),
  JSON.stringify(['-']));

assert('No overrides: fitToContent returns 2 defaults',
  _getBindings('fitToContent',null,SHORTCUT_ACTIONS).length,2);

// With overrides -> returns override bindings
assert('Override replaces default for zoomIn',
  JSON.stringify(_getBindings('zoomIn',{zoomIn:['ctrl+shift+plus']},SHORTCUT_ACTIONS)),
  JSON.stringify(['ctrl+shift+plus']));

assert('Override with 2 bindings returns both',
  _getBindings('zoomOut',{zoomOut:['shift+-','ctrl+minus']},SHORTCUT_ACTIONS).length,2);

assert('Override with empty array removes all bindings',
  JSON.stringify(_getBindings('zoomIn',{zoomIn:[]},SHORTCUT_ACTIONS)),
  JSON.stringify([]));

// Missing action -> returns []
assert('Missing/unknown action returns empty',
  JSON.stringify(_getBindings('nonexistent',null,SHORTCUT_ACTIONS)),
  JSON.stringify([]));

assert('Missing action with overrides still returns empty',
  JSON.stringify(_getBindings('nonexistent',{nonexistent:['x']},SHORTCUT_ACTIONS)),
  JSON.stringify([]));

// Different actions have different defaults
assertNeq('undo and redo have different defaults',
  JSON.stringify(_getBindings('undo',null,SHORTCUT_ACTIONS)),
  JSON.stringify(_getBindings('redo',null,SHORTCUT_ACTIONS)));

assertNeq('save and saveAs have different defaults',
  JSON.stringify(_getBindings('save',null,SHORTCUT_ACTIONS)),
  JSON.stringify(_getBindings('saveAs',null,SHORTCUT_ACTIONS)));

// Reserved actions ignore overrides
assert('Reserved action (undo) ignores override',
  JSON.stringify(_getBindings('undo',{undo:['ctrl+shift+z']},SHORTCUT_ACTIONS)),
  JSON.stringify(['Ctrl+z']));

assert('Reserved action (delete) ignores override',
  JSON.stringify(_getBindings('delete',{delete:['backspace']},SHORTCUT_ACTIONS)),
  JSON.stringify(['Delete']));

assert('Reserved action (selectAll) ignores override',
  JSON.stringify(_getBindings('selectAll',{selectAll:['ctrl+shift+a']},SHORTCUT_ACTIONS)),
  JSON.stringify(['Ctrl+a']));

// Actions with no default bindings
assert('goToday has empty defaults',
  _getBindings('goToday',null,SHORTCUT_ACTIONS).length,0);

assert('addMilestone has empty defaults',
  _getBindings('addMilestone',null,SHORTCUT_ACTIONS).length,0);

assert('Override adds binding to action with empty defaults',
  JSON.stringify(_getBindings('goToday',{goToday:['t']},SHORTCUT_ACTIONS)),
  JSON.stringify(['t']));

// Defaults are returned as copies (not references)
{
  const b1=_getBindings('zoomIn',null,SHORTCUT_ACTIONS);
  const b2=_getBindings('zoomIn',null,SHORTCUT_ACTIONS);
  b1.push('extra');
  assertNeq('Returned defaults are independent copies',
    JSON.stringify(b1),JSON.stringify(b2));
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 3: Map Building & Reserved Sets (~20 tests)
// ═══════════════════════════════════════════════════════════════════
section('Map Building & Reserved Sets');

{
  const map=_buildShortcutMap(SHORTCUT_ACTIONS,null);

  assert('Default map: delete -> delete',
    map['delete'],'delete');

  assert('Default map: = -> zoomIn',
    map['='],'zoomIn');

  assert('Default map: - -> zoomOut',
    map['-'],'zoomOut');

  assert('Default map: ctrl+z -> undo',
    map['ctrl+z'],'undo');

  assert('Default map: ctrl+y -> redo',
    map['ctrl+y'],'redo');

  assert('Default map: ctrl+s -> save',
    map['ctrl+s'],'save');

  assert('Default map: ctrl+a -> selectAll',
    map['ctrl+a'],'selectAll');

  assert('Default map: escape -> escape',
    map['escape'],'escape');

  assert('Default map: ctrl+shift+f -> fitToContent',
    map['ctrl+shift+f'],'fitToContent');

  assert('Default map: ctrl+shift+p -> propagate',
    map['ctrl+shift+p'],'propagate');

  assert('Default map: arrowleft -> nudgeLeft',
    map['arrowleft'],'nudgeLeft');

  assert('Default map: arrowup -> nudgeUp',
    map['arrowup'],'nudgeUp');

  // Actions with empty defaults have no map entries
  assertT('goToday (no defaults) has no map entry',
    map['t']===undefined);

  assertT('addMilestone (no defaults) has no map entry',
    map['addmilestone']===undefined);
}

// Override replaces default combo in map
{
  const map=_buildShortcutMap(SHORTCUT_ACTIONS,{zoomIn:['shift+plus']});
  assert('Override: shift+plus -> zoomIn',
    map['shift+plus'],'zoomIn');
  // Old default = removed from map (since override replaces)
  assertT('Override: old default = no longer maps to zoomIn',
    map['=']!=='zoomIn');
}

// Reserved combos set
assertT('RESERVED_COMBOS has Ctrl+v',RESERVED_COMBOS.has('Ctrl+v'));
assertT('RESERVED_COMBOS has Ctrl+c',RESERVED_COMBOS.has('Ctrl+c'));
assertT('RESERVED_COMBOS has Ctrl+x',RESERVED_COMBOS.has('Ctrl+x'));
assertF('RESERVED_COMBOS does not have Ctrl+s',RESERVED_COMBOS.has('Ctrl+s'));
assertF('RESERVED_COMBOS does not have Ctrl+z',RESERVED_COMBOS.has('Ctrl+z'));
assert('RESERVED_COMBOS size is 3',RESERVED_COMBOS.size,3);

// Browser reserved set
assertT('BROWSER_RESERVED has Ctrl+t',BROWSER_RESERVED.has('Ctrl+t'));
assertT('BROWSER_RESERVED has Ctrl+w',BROWSER_RESERVED.has('Ctrl+w'));
assertT('BROWSER_RESERVED has F5',BROWSER_RESERVED.has('F5'));
assertT('BROWSER_RESERVED has F12',BROWSER_RESERVED.has('F12'));
assertT('BROWSER_RESERVED has Ctrl+Tab',BROWSER_RESERVED.has('Ctrl+Tab'));
assertF('BROWSER_RESERVED does not have Ctrl+s',BROWSER_RESERVED.has('Ctrl+s'));
assertF('BROWSER_RESERVED does not have Ctrl+z',BROWSER_RESERVED.has('Ctrl+z'));

// ═══════════════════════════════════════════════════════════════════
//  SECTION 4: Context Guards, Dispatch Metadata & Escape (~20 tests)
// ═══════════════════════════════════════════════════════════════════
section('Context Guards & Dispatch Metadata');

// All action IDs are unique
{
  const ids=SHORTCUT_ACTIONS.map(a=>a.id);
  const unique=new Set(ids);
  assert('All action IDs are unique',ids.length,unique.size);
}

// Category distribution
{
  const cats=new Set(SHORTCUT_ACTIONS.map(a=>a.cat));
  assertT('Category Reserved exists',cats.has('Reserved'));
  assertT('Category View exists',cats.has('View'));
  assertT('Category Tools exists',cats.has('Tools'));
  assertT('Category Items exists',cats.has('Items'));
  assertT('Category Export exists',cats.has('Export'));
  assertT('Category Edit exists',cats.has('Edit'));
}

// Context guard: ctx='tl' actions
{
  const tlActions=SHORTCUT_ACTIONS.filter(a=>a.ctx==='tl');
  assertT('At least 5 actions have ctx=tl',tlActions.length>=5);
  assertT('selectAll has ctx=tl',
    SHORTCUT_ACTIONS.find(a=>a.id==='selectAll').ctx==='tl');
  assertT('fitToContent has ctx=tl',
    SHORTCUT_ACTIONS.find(a=>a.id==='fitToContent').ctx==='tl');
  assertT('zoomIn has ctx=tl',
    SHORTCUT_ACTIONS.find(a=>a.id==='zoomIn').ctx==='tl');
}

// Context guard: ctx='sel' actions need items selected
{
  const selActions=SHORTCUT_ACTIONS.filter(a=>a.ctx==='sel');
  assertT('At least 2 actions have ctx=sel',selActions.length>=2);
  assertT('delete has ctx=sel',
    SHORTCUT_ACTIONS.find(a=>a.id==='delete').ctx==='sel');
}

// Context guard: ctx='sel-manual' needs selection in manual mode
{
  const selManualActions=SHORTCUT_ACTIONS.filter(a=>a.ctx==='sel-manual');
  assertT('propagate has ctx=sel-manual',
    SHORTCUT_ACTIONS.find(a=>a.id==='propagate').ctx==='sel-manual');
  assert('sel-manual actions count',selManualActions.length,1);
}

// Global actions (no view restriction)
{
  const globalActions=SHORTCUT_ACTIONS.filter(a=>a.global);
  assertT('At least 5 global actions',globalActions.length>=5);
  assertT('undo is global',
    SHORTCUT_ACTIONS.find(a=>a.id==='undo').global===true);
  assertT('save is global',
    SHORTCUT_ACTIONS.find(a=>a.id==='save').global===true);
  assertT('fullscreen is global',
    SHORTCUT_ACTIONS.find(a=>a.id==='fullscreen').global===true);
}

// Reserved flag
{
  const reserved=SHORTCUT_ACTIONS.filter(a=>a.reserved);
  assertT('At least 8 reserved actions',reserved.length>=8);
  assertT('undo is reserved',
    SHORTCUT_ACTIONS.find(a=>a.id==='undo').reserved===true);
  assertF('zoomIn is NOT reserved',
    !!SHORTCUT_ACTIONS.find(a=>a.id==='zoomIn').reserved);
  assertF('toggleLasso is NOT reserved',
    !!SHORTCUT_ACTIONS.find(a=>a.id==='toggleLasso').reserved);
}

// Escape action has special:true flag (excluded from normal map building in some paths)
{
  const esc=SHORTCUT_ACTIONS.find(a=>a.id==='escape');
  assertT('Escape action exists',!!esc);
  assertT('Escape is reserved',esc.reserved===true);
  assertT('Escape is global',esc.global===true);
  assertT('Escape has special:true',esc.special===true);
  assert('Escape default binding is Escape key',
    JSON.stringify(esc.defaults),JSON.stringify(['Escape']));
}

// Nudge actions have special:'nudge' flag
{
  const nudges=SHORTCUT_ACTIONS.filter(a=>a.special==='nudge');
  assert('4 nudge actions exist',nudges.length,4);
  assertT('nudgeLeft has hidden:true',
    SHORTCUT_ACTIONS.find(a=>a.id==='nudgeLeft').hidden===true);
  assertT('All nudge actions have ctx=sel',
    nudges.every(a=>a.ctx==='sel'));
}

// MOUSE_REFS structure
{
  assertT('MOUSE_REFS is an array',Array.isArray(MOUSE_REFS));
  assert('MOUSE_REFS has 7 entries',MOUSE_REFS.length,7);
  assertT('Each ref has combo and desc',
    MOUSE_REFS.every(r=>typeof r.combo==='string'&&typeof r.desc==='string'));
  assertT('Ctrl+Click ref exists',
    MOUSE_REFS.some(r=>r.combo==='Ctrl+Click'));
  assertT('Alt+Drag ref exists',
    MOUSE_REFS.some(r=>r.combo==='Alt+Drag'));
}

// Map with all overrides cleared still works for reserved actions
{
  const allCleared={};
  SHORTCUT_ACTIONS.filter(a=>!a.reserved).forEach(a=>{allCleared[a.id]=[]});
  const map=_buildShortcutMap(SHORTCUT_ACTIONS,allCleared);
  assert('Cleared overrides: ctrl+z still maps to undo',map['ctrl+z'],'undo');
  assert('Cleared overrides: delete still maps to delete',map['delete'],'delete');
  assertT('Cleared overrides: = no longer maps to anything',
    map['=']===undefined);
}

// ═══════════════════════════════════════════════════════════════════
//  DONE
// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
