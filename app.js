/* Timeline Studio v0.44.7 — F60: Dependency display filtering. New depFilter project property ('all'|'swimlane') with sub-options under Show Dependencies in Settings. "Within swimlane only" hides cross-swimlane dependency arrows while preserving scheduling engine behavior. View dropdown Dependencies section with Off/All/Within Swimlane selector. cycleDeps keyboard shortcut action (no default binding). Filter applied in both on-screen rDeps() and export SVG rendering. */
const U={
  id:()=>'id_'+Math.random().toString(36).substr(2,9),
  clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
  days(a,b){return Math.round((new Date(b)-new Date(a))/864e5)},
  addDays(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return U.iso(x)},
  iso(d){if(!d)return'';const x=d instanceof Date?d:new Date(d);return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`},
  parseDate(s){if(!s)return null;s=s.trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s+'T12:00:00');if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const[m,d,y]=s.split('/').map(Number);return new Date(y,m-1,d)}const d=new Date(s);return isNaN(d)?null:d},
  fmt(date,f){if(!date)return'';const d=date instanceof Date?date:new Date(date+'T12:00:00');if(isNaN(d))return'';const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const mf=['January','February','March','April','May','June','July','August','September','October','November','December'];const dd=d.getDate(),mm=d.getMonth(),yy=d.getFullYear();if(f&&f.startsWith('custom:')){let t=f.slice(7);t=t.replace(/YYYY/g,String(yy));t=t.replace(/YY/g,String(yy).slice(-2));t=t.replace(/MMMM/g,'\x01');t=t.replace(/MMM/g,'\x02');t=t.replace(/MM/g,String(mm+1).padStart(2,'0'));t=t.replace(/(?<![DM])M(?![MYa-z])/g,String(mm+1));t=t.replace(/DD/g,String(dd).padStart(2,'0'));t=t.replace(/(?<![DMY])D(?![DMY])/g,String(dd));t=t.replace(/\x01/g,mf[mm]);t=t.replace(/\x02/g,ms[mm]);return t}switch(f){case'MM/DD/YYYY':return`${String(mm+1).padStart(2,'0')}/${String(dd).padStart(2,'0')}/${yy}`;case'DD/MM/YYYY':return`${String(dd).padStart(2,'0')}/${String(mm+1).padStart(2,'0')}/${yy}`;case'YYYY-MM-DD':return U.iso(d);case'M/D':return`${mm+1}/${dd}`;case'MMM D':return`${ms[mm]} ${dd}`;case'MMM YYYY':return`${ms[mm]} ${yy}`;default:return`${ms[mm]} ${dd}, ${yy}`}},
  fmtDur(s,e,f){if(!s||!e)return'';const d=U.days(s,e);if(f==='weeks')return(d/7).toFixed(1)+'w';if(f==='months')return(d/30.44).toFixed(1)+'mo';return d+'d'},
  esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')},
  deb(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}},
  deep:o=>JSON.parse(JSON.stringify(o)),
  workDays(start,days){let d=new Date(start+'T12:00:00'),c=0;while(c<Math.abs(days)){d.setDate(d.getDate()+(days>0?1:-1));if(d.getDay()!==0&&d.getDay()!==6)c++}return U.iso(d)},
};
const COLORS=['#2C5F7C','#1B7F6A','#6B4C9A','#C0392B','#E87D2F','#2E86AB','#A23B72','#F18F01','#3D5A80','#E07A5F','#81B29A','#264653','#E76F51','#606C38','#BC6C25','#023047','#219EBC','#8ECAE6','#FFB703','#FB8500'];
const TEXT_COLORS=['#1a1a1a','#ffffff','#333333','#666666','#999999','#C0392B','#2C5F7C','#1B7F6A','#E87D2F','#6B4C9A'];
const ICONS=[
  {id:'triangle',l:'▲',p:'M12 2L22 20H2L12 2Z'},
  {id:'diamond',l:'◆',p:'M12 2L22 12L12 22L2 12L12 2Z'},
  {id:'circle',l:'●',p:'M12 2a10 10 0 110 20 10 10 0 010-20z'},
  {id:'flag',l:'⚑',p:'M5 2v20M5 2h12l-3 5 3 5H5'},
  {id:'star',l:'★',p:'M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7l3-7z'},
  {id:'arrow',l:'→',p:'M2 12h18M13 5l7 7-7 7'},
  {id:'square',l:'■',p:'M4 4h16v16H4V4z'},
  {id:'pin',l:'📍',p:'M12 2C8 2 5 5 5 8.5c0 5 7 13.5 7 13.5s7-8.5 7-13.5C19 5 16 2 12 2zm0 9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z'},
];
const THEMES={
  default:{bg:'#ffffff',hdr:'#1a2332',cls:'',tlTx:'#1a1a1a',tlTx2:'#5a6577'},
  claude:{bg:'#FAF7F2',hdr:'#292524',cls:'theme-claude',tlTx:'#3B2F2B',tlTx2:'#7A6E66'},
  light:{bg:'#ffffff',hdr:'#4a5568',cls:'theme-light',tlTx:'#1a1a1a',tlTx2:'#5a6577'},
  midnight:{bg:'#111827',hdr:'#0a0e17',cls:'theme-midnight',tlTx:'#e5e7eb',tlTx2:'#9ca3af'},
};

const SHORTCUT_ACTIONS=[
  // Tier 1 — Reserved (non-editable)
  {id:'undo',cat:'Reserved',label:'Undo',defaults:['Ctrl+z'],global:true,reserved:true},
  {id:'redo',cat:'Reserved',label:'Redo',defaults:['Ctrl+y'],global:true,reserved:true},
  {id:'save',cat:'Reserved',label:'Save',defaults:['Ctrl+s'],global:true,reserved:true},
  {id:'saveAs',cat:'Reserved',label:'Save As',defaults:['Ctrl+Shift+s'],global:true,reserved:true},
  {id:'newProject',cat:'Reserved',label:'New Project',defaults:['Ctrl+Alt+n'],global:true,reserved:true},
  {id:'openFile',cat:'Reserved',label:'Open File',defaults:['Ctrl+o'],global:true,reserved:true},
  {id:'escape',cat:'Reserved',label:'Deselect / Close',defaults:['Escape'],global:true,reserved:true,special:true},
  {id:'shortcutMgr',cat:'Reserved',label:'Open Shortcut Manager',defaults:['Ctrl+Shift+k'],global:true,reserved:true},
  {id:'delete',cat:'Reserved',label:'Delete Selected',defaults:['Delete'],ctx:'sel',reserved:true},
  {id:'selectAll',cat:'Reserved',label:'Select All',defaults:['Ctrl+a'],ctx:'tl',reserved:true},
  // Hidden — still dispatched via _scMap but not shown in Settings UI
  {id:'nudgeLeft',cat:'Edit',label:'Nudge Left',defaults:['ArrowLeft'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeRight',cat:'Edit',label:'Nudge Right',defaults:['ArrowRight'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeUp',cat:'Edit',label:'Nudge Up',defaults:['ArrowUp'],ctx:'sel',special:'nudge',hidden:true},
  {id:'nudgeDown',cat:'Edit',label:'Nudge Down',defaults:['ArrowDown'],ctx:'sel',special:'nudge',hidden:true},
  // Tier 2 — Customizable: View
  {id:'fitToContent',cat:'View',label:'Fit to Content',defaults:['Ctrl+Shift+f','Alt+1'],ctx:'tl'},
  {id:'fitToSelection',cat:'View',label:'Fit to Selection',defaults:['Ctrl+Shift+g'],ctx:'sel'},
  {id:'goToday',cat:'View',label:'Scroll to Today',defaults:[],ctx:'tl'},
  {id:'zoomIn',cat:'View',label:'Zoom In (5%)',defaults:['=','Shift+='],ctx:'tl'},
  {id:'zoomOut',cat:'View',label:'Zoom Out (5%)',defaults:['-'],ctx:'tl'},
  {id:'zoom100',cat:'View',label:'Zoom 100%',defaults:[],ctx:'tl'},
  {id:'fullscreen',cat:'View',label:'Toggle Fullscreen',defaults:[],global:true},
  {id:'expandAll',cat:'View',label:'Expand All Swimlanes',defaults:[],ctx:'tl'},
  {id:'collapseAll',cat:'View',label:'Collapse All Swimlanes',defaults:[],ctx:'tl'},
  {id:'showFloat',cat:'View',label:'Toggle Float Labels',defaults:[],ctx:'tl'},
  {id:'cycleDeps',cat:'View',label:'Cycle Dependency Filter',defaults:[],ctx:'tl'},
  {id:'autoFitHeights',cat:'View',label:'Auto Fit Heights',defaults:[],ctx:'tl'},
  {id:'cycleDayFmt',cat:'View',label:'Cycle Day Label Format',defaults:[],ctx:'tl'},
  {id:'cycleScale',cat:'View',label:'Cycle Timescale',defaults:[],ctx:'tl'},
  {id:'cycleHdrRows',cat:'View',label:'Cycle Header Rows',defaults:[],ctx:'tl'},
  // Tier 2 — Customizable: Tools
  {id:'propagate',cat:'Tools',label:'Propagate to Successors',defaults:['Ctrl+Shift+p'],ctx:'sel-manual'},
  {id:'toggleLock',cat:'Tools',label:'Toggle Lock',defaults:[],global:true},
  {id:'toggleHide',cat:'Tools',label:'Toggle Hide Mode',defaults:[],global:true},
  {id:'toggleCritPath',cat:'Tools',label:'Toggle Critical Path',defaults:[],ctx:'tl'},
  {id:'toggleSched',cat:'Tools',label:'Toggle Scheduling Mode',defaults:[],global:true},
  {id:'toggleLasso',cat:'Tools',label:'Toggle Lasso Mode',defaults:[],ctx:'tl'},
  {id:'togglePan',cat:'Tools',label:'Toggle Pan Mode',defaults:[],ctx:'tl'},
  {id:'formatPainter',cat:'Tools',label:'Format Painter',defaults:[],ctx:'sel'},
  {id:'repeatFP',cat:'Tools',label:'Format Painter (\u00d72 for multi)',defaults:['F4'],ctx:'sel'},
  // Tier 2 — Customizable: Items
  {id:'addMilestone',cat:'Items',label:'Add Milestone',defaults:[],ctx:'tl'},
  {id:'addTask',cat:'Items',label:'Add Task',defaults:[],ctx:'tl'},
  {id:'addSwimlane',cat:'Items',label:'Add Swimlane',defaults:[],global:true},
  // Tier 2 — Customizable: Export
  {id:'snapViewport',cat:'Export',label:'Screenshot (Viewport)',defaults:[],ctx:'tl'},
  {id:'snapFull',cat:'Export',label:'Screenshot (Full)',defaults:[],ctx:'tl'},
  // Tier 2 — Customizable: URL Links
  {id:'openPrimaryLink',cat:'Items',label:'Open Primary URL Link',defaults:[],ctx:'sel'},
  {id:'openAllLinks',cat:'Items',label:'Open All URL Links',defaults:[],ctx:'sel'},
];
const FP_PROPS_DEF=[
  {key:'color',label:'Color'},{key:'textColor',label:'Text Color'},{key:'edgeTextColor',label:'Date Text Color'},
  {key:'fontSize',label:'Font Size'},{key:'labelPosition',label:'Label Position'},{key:'iconType',label:'Icon'},
  {key:'dateDisplay',label:'Date Display',composite:true},{key:'dateFormat',label:'Date Format'},
  {key:'showOwner',label:'Show Owner'},{key:'status',label:'Status'},
  {key:'hiddenPinned',label:'Hidden / Pinned',composite:true},{key:'vLine',label:'Vertical Line'},
];
const MOUSE_REFS=[
  {combo:'Ctrl+Click',desc:'Multi-select items'},
  {combo:'Shift+Click',desc:'Range-select (Data Table)'},
  {combo:'Alt+Drag',desc:'Lasso select area'},
  {combo:'Ctrl+Scroll',desc:'Zoom ±5%'},
  {combo:'Ctrl+Shift+Scroll',desc:'Fine zoom ±1%'},
  {combo:'Click label',desc:'Select swimlane / sub-swimlane'},
  {combo:'Ctrl+Click label',desc:'Multi-select swimlane labels'},
  {combo:'Right-click label',desc:'Format swimlane label'},
  {combo:'Right-click header',desc:'Format header text size'},
  {combo:'Click in paint mode',desc:'Apply format to item'},
  {combo:'Double-click',desc:'Edit item / swimlane'},
  {combo:'Right-click',desc:'Context menu'},
  {combo:'Middle-drag',desc:'Pan / scroll timeline'},
];
const RESERVED_COMBOS=new Set(['Ctrl+v','Ctrl+c','Ctrl+x']);
const BROWSER_RESERVED=new Set(['Ctrl+t','Ctrl+w','Ctrl+Tab','Ctrl+Shift+Tab','Ctrl+l','Ctrl+Shift+t','Ctrl+Shift+n','Ctrl+n','F5','Ctrl+F5','F12']);

/* ── Short-key map for share-link compression ── */
const SK={
  /* project-level */
  version:'V',name:'n',owner:'o',dateFormat:'df',timescale:'ts',headerLayers:'hl',
  timelineStart:'a',timelineEnd:'b',autoRange:'ar',showToday:'st',showDeps:'sd',depFilter:'dP',
  locked:'lk',lockH:'lh',lockV:'lv',hideMode:'hm',theme:'th',bgColor:'bc',
  headerColor:'hc',zoom:'z',fontSize:'fs',monthFormat:'mF',quarterFormat:'qF',headerFontSize:'hF',dayLabelFormat:'dL',dayColumnWidth:'dW',
  watermark:'wm',wmDate:'wd',wmPos:'wp',
  wmShowOwner:'wo',showWeekends:'sw',weekendOpacity:'wO',weekendAutoHide:'wA',
  holidays:'H',showHolidays:'sH',holidayOpacity:'hO',holidayColor:'hC',
  holidayLabels:'hL',scheduleAroundNonWorking:'sN',defaultFolder:'dF',
  tttEnabled:'tE',tttMilestoneId:'tM',showFloat:'sF',schedulingMode:'sM',
  labelWidth:'lw',autoSortSwimlanes:'aS',arrangeSimple:'rS',arrangeSpread:'rP',
  arrangePadding:'rD',arrangeDateWeight:'rW',arrangeLabels:'rL',
  statusDefs:'sD',statusDisplay:'sY',swimlanes:'S',items:'I',
  /* item-level */
  id:'i',type:'t',color:'c',textColor:'tc',edgeTextColor:'ec',iconType:'ic',
  startDate:'sa',endDate:'eb',date:'d',duration:'du',durMode:'dm',durationFmt:'dU',
  showDate:'xd',showStartDate:'xs',showEndDate:'xe',showDuration:'xD',showOwner:'xo',
  labelPosition:'lp',progress:'p',status:'su',statusDate:'sU',notes:'nt',
  pinned:'pk',hidden:'hi',deps:'D',vLine:'vL',subRow:'sr',
  swimlaneId:'si',subSwimId:'ui',
  /* swimlane / sub-swimlane */
  height:'h',subSwimlanes:'sS',collapsed:'co',
  /* dependency */
  lag:'lg',
  /* holiday */
  start:'A',end:'B',schedAround:'sA',
  /* statusDefs fields */
  desc:'de',shortName:'sn',emoji:'em',
  /* statusDisplay fields */
  show:'sh',mode:'m',badgePos:'bp',colorOverride:'cO',blankColor:'bC',
  /* vLine fields */
  enabled:'en',style:'sy',direction:'di',extent:'ex',
  /* URL link fields */
  links:'li',url:'ur',
};
const SK_R=Object.fromEntries(Object.entries(SK).map(([k,v])=>[v,k]));
console.assert(new Set(Object.values(SK)).size===Object.keys(SK).length,
  'SK short-key collision detected!');

function _skEnc(o){
  if(Array.isArray(o))return o.map(_skEnc);
  if(o&&typeof o==='object'){
    const r={};for(const k in o)r[SK[k]||k]=_skEnc(o[k]);return r;
  }
  return o;
}
function _skDec(o){
  if(Array.isArray(o))return o.map(_skDec);
  if(o&&typeof o==='object'){
    const r={};for(const k in o)r[SK_R[k]||k]=_skDec(o[k]);return r;
  }
  return o;
}

function newProj(){const n=new Date();return{version:2,name:'New Timeline',owner:'',dateFormat:'MMM D, YYYY',timescale:'months',headerLayers:2,timelineStart:U.iso(new Date(n.getFullYear(),0,1)),timelineEnd:U.iso(new Date(n.getFullYear(),11,31)),autoRange:true,showToday:true,showDeps:true,depFilter:'all',locked:false,lockH:false,lockV:false,hideMode:false,theme:'default',bgColor:'#ffffff',headerColor:'#1a2332',zoom:100,fontSize:11,monthFormat:'short',quarterFormat:'withYear',headerFontSize:10.5,dayLabelFormat:'letter',dayColumnWidth:'normal',watermark:false,wmDate:'',wmPos:'bottom-center',wmShowOwner:false,showWeekends:false,weekendOpacity:8,weekendAutoHide:true,holidays:[],showHolidays:false,holidayOpacity:12,holidayColor:'#e5534b',holidayLabels:true,scheduleAroundNonWorking:true,defaultFolder:'',tttEnabled:false,tttMilestoneId:'',showFloat:false,schedulingMode:'manual',labelWidth:160,autoSortSwimlanes:false,arrangeSimple:50,arrangeSpread:50,arrangePadding:50,arrangeDateWeight:20,arrangeLabels:false,statusDefs:[{id:'blank',name:'',desc:'',color:'',shortName:'',emoji:''},{id:'tbd',name:'TBD',desc:'Not yet determined',color:'#6b7280',shortName:'?',emoji:'❓'},{id:'on-track',name:'On Track',desc:'Progressing as planned',color:'#22c55e',shortName:'G',emoji:'🟢'},{id:'at-risk',name:'At Risk',desc:'May miss target',color:'#eab308',shortName:'Y',emoji:'🟡'},{id:'off-track',name:'Off Track',desc:'Behind schedule',color:'#ef4444',shortName:'R',emoji:'🔴'},{id:'complete',name:'Complete',desc:'Finished',color:'#3b82f6',shortName:'B',emoji:'🔵'},{id:'not-started',name:'Not Started',desc:'Has not begun',color:'#9ca3af',shortName:'N',emoji:'⚪'}],statusDisplay:{show:true,mode:'emoji',badgePos:'inline',colorOverride:false,blankColor:''},swimlanes:[{id:U.id(),name:'Swimlane 1',color:'#2C5F7C',height:120,subSwimlanes:[],collapsed:'expanded'}],items:[]}}

const App={
  proj:newProj(),sel:[],slSel:[],_slSelManual:[],undoStack:[],redoStack:[],
  view:'timeline',panelCollapsed:false,panelLocked:false,editItem:null,
  _panelHintCooldown:0,_wasExpandedBeforeDataView:false,_lockPillHintCD:0,_hidePillHintCD:0,_pillHoverTimer:null,
  _dirty:false,_dataDirty:false,_raf:null,_unsaved:false,_shareMode:false,_fileHintShown:false,_storedHandle:null,
  _sortCol:null,_sortDir:'asc',
  _searchTerm:'',_searchMatches:[],_searchIdx:-1,_lastShiftSel:null,
  _fileHandle:null,_fileLastModified:0,_mruCache:[],_mruValidated:false,_mruExpanded:false,_mruLinkFile:null,_ctxDate:null,_ctxSubSwId:'',_ctxSubRow:0,_nudgeTimer:null,_nudgeSpeed:1,
  _tabSessionId:(typeof sessionStorage!=='undefined'&&sessionStorage.getItem('tls3_tabId'))||(()=>{const id='tab_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);try{sessionStorage.setItem('tls3_tabId',id)}catch(e){}return id})(),
  _lassoMode:false,_panMode:false,_panning:false,_fpMode:false,_fpPersist:false,_fpStaged:false,_fpSourceId:null,_fpSourceData:null,_collapsedSl:new Set(),_pendingFit:false,
  _impData:null,_impMappings:[],_impOverloads:[],_impSelSrc:null,_impStatusMap:{},_impLinkColors:['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'],
  _scMap:{},_scOverrides:null,_scRecording:null,_nudgeSnapped:false,_nudgeSnapTimer:null,_scMsgTimer:null,

  /* Keyboard Shortcut Engine */
  _normalizeKey(e){
    const parts=[];
    if(e.ctrlKey||e.metaKey)parts.push('Ctrl');
    if(e.shiftKey)parts.push('Shift');
    if(e.altKey)parts.push('Alt');
    let key=e.key;
    if(['Control','Shift','Alt','Meta'].includes(key))return null;
    if(key.length===1)key=key.toLowerCase();
    parts.push(key);
    return parts.join('+');
  },
  _loadShortcuts(){
    try{const raw=localStorage.getItem('tls3_shortcuts');this._scOverrides=raw?JSON.parse(raw):null}catch(e){this._scOverrides=null}
  },
  _saveShortcuts(){
    if(!this._scOverrides){localStorage.removeItem('tls3_shortcuts');return}
    localStorage.setItem('tls3_shortcuts',JSON.stringify(this._scOverrides));
  },
  _getBindings(actionId){
    if(this._scOverrides&&actionId in this._scOverrides)return this._scOverrides[actionId];
    const a=SHORTCUT_ACTIONS.find(x=>x.id===actionId);
    return a?[...a.defaults]:[];
  },
  _buildShortcutMap(){
    this._scMap={};
    for(const a of SHORTCUT_ACTIONS){
      const bindings=a.reserved?[...a.defaults]:this._getBindings(a.id);
      for(const combo of bindings)this._scMap[combo.toLowerCase()]=a.id;
    }
  },
  _displayCombo(combo){
    const m=navigator.platform&&navigator.platform.includes('Mac');
    let s=combo;
    if(m){s=s.replace(/Ctrl\+/g,'⌘').replace(/Shift\+/g,'⇧').replace(/Alt\+/g,'⌥')}
    else{s=s.replace(/Ctrl/g,'Ctrl').replace(/Shift/g,'Shift').replace(/Alt/g,'Alt')}
    s=s.replace(/ArrowLeft/g,'←').replace(/ArrowRight/g,'→').replace(/ArrowUp/g,'↑').replace(/ArrowDown/g,'↓');
    // Capitalize single-letter keys for display
    if(!m)s=s.replace(/\+([a-z])$/,(_, c)=>'+'+c.toUpperCase());
    else s=s.replace(/([⌘⇧⌥])([a-z])$/,(_, mod, c)=>mod+c.toUpperCase());
    return s;
  },
  /* ── IndexedDB File Handle Store (F53) + MRU (F55) ── */
  _MRU_MAX:8,
  _openHandleDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('tls3_handles',2);req.onupgradeneeded=e=>{const db=req.result;if(!db.objectStoreNames.contains('handles'))db.createObjectStore('handles');if(!db.objectStoreNames.contains('recentFiles'))db.createObjectStore('recentFiles',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})},
  async _storeHandle(handle){try{const db=await this._openHandleDB();const tx=db.transaction('handles','readwrite');tx.objectStore('handles').put(handle,this._tabSessionId);await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=j});db.close()}catch(e){}},
  async _loadHandle(){try{const db=await this._openHandleDB();const tx=db.transaction('handles','readonly');const req=tx.objectStore('handles').get(this._tabSessionId);const handle=await new Promise((r,j)=>{req.onsuccess=()=>r(req.result);req.onerror=j});db.close();return handle||null}catch(e){return null}},
  async _clearHandle(){try{const db=await this._openHandleDB();const tx=db.transaction('handles','readwrite');tx.objectStore('handles').delete(this._tabSessionId);db.close()}catch(e){}},
  async _tryReconnect(){const handle=await this._loadHandle();if(!handle)return false;try{const perm=await handle.requestPermission({mode:'readwrite'});if(perm==='granted'){this._fileHandle=handle;try{const rf=await handle.getFile();this._fileLastModified=rf.lastModified}catch(e){}this._updateFileIndicator();this.toast('Reconnected to '+handle.name);return true}}catch(e){}return false},
  /* ── MRU Storage (F55) ── */
  async _loadMRU(){
    try{const db=await this._openHandleDB();const tx=db.transaction('recentFiles','readonly');const store=tx.objectStore('recentFiles');
      const all=await new Promise((r,j)=>{const req=store.getAll();req.onsuccess=()=>r(req.result);req.onerror=j});
      db.close();all.sort((a,b)=>b.lastOpened-a.lastOpened);this._mruCache=all;return all}catch(e){return this._readMRUCache()}
  },
  async _storeMRUEntry(entry){
    try{
      /* Phase 1: Read existing entries (read-only tx, closes before async work) */
      const db=await this._openHandleDB();
      const readTx=db.transaction('recentFiles','readonly');
      const all=await new Promise((r,j)=>{const req=readTx.objectStore('recentFiles').getAll();req.onsuccess=()=>r(req.result);req.onerror=j});
      /* Phase 2: Find duplicates via async isSameEntry (NO active IDB tx) */
      const deleteIds=[];
      for(const ex of all){
        let same=false;
        if(entry.handle&&ex.handle){try{same=await entry.handle.isSameEntry(ex.handle)}catch(e){}}
        else if(!entry.handle&&!ex.handle&&entry.name===ex.name)same=true;
        if(same&&ex.id!==entry.id)deleteIds.push(ex.id)
      }
      /* Phase 3: Write in a single synchronous tx (no async gaps) */
      const writeTx=db.transaction('recentFiles','readwrite');const store=writeTx.objectStore('recentFiles');
      for(const id of deleteIds)store.delete(id);
      store.put(entry);
      const afterReq=store.getAll();
      afterReq.onsuccess=()=>{const after=afterReq.result;if(after.length>this._MRU_MAX){after.sort((a,b)=>b.lastOpened-a.lastOpened);for(let i=this._MRU_MAX;i<after.length;i++)store.delete(after[i].id)}};
      await new Promise((r,j)=>{writeTx.oncomplete=r;writeTx.onerror=j});db.close();
      await this._loadMRU();this._syncMRUCache()
    }catch(e){}
  },
  async _removeMRUEntry(id){
    try{const db=await this._openHandleDB();const tx=db.transaction('recentFiles','readwrite');tx.objectStore('recentFiles').delete(id);
      await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=j});db.close();
      await this._loadMRU();this._syncMRUCache()}catch(e){}
  },
  async _clearMRUList(){
    try{const db=await this._openHandleDB();const tx=db.transaction('recentFiles','readwrite');tx.objectStore('recentFiles').clear();
      await new Promise((r,j)=>{tx.oncomplete=r;tx.onerror=j});db.close();
      this._mruCache=[];this._syncMRUCache()}catch(e){}
  },
  _syncMRUCache(){try{const data=this._mruCache.map(e=>({id:e.id,name:e.name,projectName:e.projectName,lastOpened:e.lastOpened,lastState:e._state||'nameonly'}));localStorage.setItem('tls3_recentNames',JSON.stringify(data))}catch(e){}},
  _readMRUCache(){try{const s=localStorage.getItem('tls3_recentNames');if(s){const arr=JSON.parse(s);return arr.map(e=>({id:e.id,name:e.name,projectName:e.projectName,lastOpened:e.lastOpened,handle:null,_state:e.lastState||'nameonly'}))}return[]}catch(e){return[]}},
  async _updateMRU(handle,fileName,projectName){
    const entry={id:'mru_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),name:fileName,projectName:projectName||'',handle:handle||null,lastOpened:Date.now()};
    await this._storeMRUEntry(entry)
  },
  /* ── MRU Validation & UI (F55) ── */
  async _validateMRUEntry(entry){
    if(!entry.handle)return 'nameonly';
    try{const perm=await entry.handle.queryPermission({mode:'readwrite'});
      if(perm==='granted'){try{await entry.handle.getFile();return 'ready'}catch(e){return 'orphaned'}}
      if(perm==='denied')return 'denied';
      return 'stale'}catch(e){return 'stale'}
  },
  async _validateMRU(){
    if(!this._mruCache.length)return;
    const results=await Promise.allSettled(this._mruCache.map(e=>this._validateMRUEntry(e)));
    results.forEach((r,i)=>{if(r.status==='fulfilled')this._mruCache[i]._state=r.value;else this._mruCache[i]._state='nameonly'});
    /* Fix B: Mark current file by handle identity, not filename */
    if(this._fileHandle){
      const curChecks=await Promise.allSettled(this._mruCache.map(e=>e.handle?this._fileHandle.isSameEntry(e.handle):Promise.resolve(false)));
      this._mruCache.forEach((e,i)=>{e._isCurrent=curChecks[i].status==='fulfilled'&&curChecks[i].value===true})}
    else{this._mruCache.forEach(e=>{e._isCurrent=false})}
    this._mruValidated=true;this._syncMRUCache();this._renderMRUBadges()
  },
  _renderMRUDropdown(){
    const sec=document.getElementById('mru-section');if(!sec)return;
    const list=this._mruCache.length?this._mruCache:this._readMRUCache();
    let html='';
    /* Browse always first */
    html+='<div class="mru-browse" id="btn-browse">Browse\u2026</div>';
    if(!list.length){html+='<div class="mru-hint">No recent files</div>'}
    else{html+='<div class="mru-sep"></div><div class="mru-list">';
      list.forEach(e=>{
        const st=e._state||'nameonly';const isCur=!!e._isCurrent;
        const tip=e.projectName?U.esc(e.projectName):'';
        html+='<div class="mru-entry'+(isCur?' mru-current':'')+'" data-mru-id="'+U.esc(e.id)+'"'+(tip?' data-tooltip="'+tip+'"':'')+'>';
        if(e.handle)html+='<span class="mru-ext" data-mru-ext="'+U.esc(e.id)+'" data-tooltip="Open in new tab (right-click for options)">\u29C9</span>';
        html+='<span class="mru-name">'+U.esc(e.name)+'</span>';
        if(isCur)html+='<span class="mru-badge mru-badge-cur" data-mru-badge="'+U.esc(e.id)+'" data-tooltip="Currently open">&#10003;</span>';
        else if(st==='orphaned')html+='<span class="mru-badge mru-badge-warn" data-mru-badge="'+U.esc(e.id)+'" data-tooltip="File not found \u2014 may have been moved or deleted">\u26A0</span>';
        else if(st==='stale'||st==='denied')html+='<span class="mru-badge mru-badge-stale" data-mru-badge="'+U.esc(e.id)+'" data-tooltip="Permission needed \u2014 click to reconnect">\u26BF</span>';
        else html+='<span class="mru-badge" data-mru-badge="'+U.esc(e.id)+'"></span>';
        html+='<span class="mru-remove" data-mru-rm="'+U.esc(e.id)+'" data-tooltip="Remove from recent files">\u00d7</span>';
        html+='</div>'});
      html+='</div>'}
    sec.innerHTML=html;
    /* Bind MRU entry clicks and right-click popover */
    sec.querySelectorAll('.mru-entry').forEach(el=>{
      el.addEventListener('click',ev=>{
        if(ev.target.closest('.mru-remove')||ev.target.closest('.mru-ext'))return;
        this.$.file_dropdown.classList.add('hidden');this._mruExpanded=false;this._openFromMRU(el.dataset.mruId)});
      /* Right-click anywhere on the entry → popover (if entry has a handle) */
      const extBtn=el.querySelector('.mru-ext');
      if(extBtn)el.addEventListener('contextmenu',ev=>{ev.preventDefault();ev.stopPropagation();this._showExtPopover(extBtn,el.dataset.mruId)})});
    /* Bind individual remove buttons */
    sec.querySelectorAll('.mru-remove').forEach(el=>{el.addEventListener('click',async ev=>{
      ev.stopPropagation();await this._removeMRUEntry(el.dataset.mruRm);this._renderMRUDropdown()})});
    /* Bind ⧉ left-click: open in new tab */
    sec.querySelectorAll('.mru-ext').forEach(el=>{
      el.addEventListener('click',ev=>{ev.stopPropagation();this._openInNewTab(el.dataset.mruExt,false)})});
    const browseBtn=document.getElementById('btn-browse');
    if(browseBtn)browseBtn.addEventListener('click',()=>{this.$.file_dropdown.classList.add('hidden');this._mruExpanded=false;this.openFile()});
    /* Kick off async validation */
    if(window.showOpenFilePicker&&this._mruCache.some(e=>e.handle))this._validateMRU()
  },
  _renderMRUBadges(){
    const sec=document.getElementById('mru-section');if(!sec)return;
    this._mruCache.forEach(e=>{
      const badge=sec.querySelector('[data-mru-badge="'+e.id+'"]');if(!badge)return;
      const st=e._state||'nameonly';const isCur=!!e._isCurrent;
      if(isCur){badge.className='mru-badge mru-badge-cur';badge.innerHTML='&#10003;';badge.dataset.tooltip='Currently open'}
      else if(st==='orphaned'){badge.className='mru-badge mru-badge-warn';badge.textContent='\u26A0';badge.dataset.tooltip='File not found \u2014 may have been moved or deleted'}
      else if(st==='stale'||st==='denied'){badge.className='mru-badge mru-badge-stale';badge.textContent='\u26BF';badge.dataset.tooltip='Permission needed \u2014 click to reconnect'}
      else{badge.className='mru-badge';badge.textContent='';delete badge.dataset.tooltip}
    })
  },
  _toggleMRU(){
    const sec=document.getElementById('mru-section');const arrow=document.getElementById('mru-arrow');
    if(!sec)return;
    this._mruExpanded=!this._mruExpanded;
    if(this._mruExpanded){sec.classList.remove('hidden');if(arrow)arrow.classList.add('open');this._renderMRUDropdown()}
    else{sec.classList.add('hidden');if(arrow)arrow.classList.remove('open')}
  },
  async _openFromMRU(id){
    const entry=this._mruCache.find(e=>e.id===id);if(!entry)return;
    /* If this is already the current file, no-op */
    if(this._fileHandle&&entry.handle){try{if(await this._fileHandle.isSameEntry(entry.handle)){this.toast('Already open','info');return}}catch(e){}}
    if(this._unsaved&&!confirm('Unsaved changes will be lost. Continue?'))return;
    const st=entry._state||'nameonly';
    if(st==='orphaned'){this.toast('File not found \u2014 may have been moved or deleted','error');return}
    if(st==='nameonly'){/* No handle: open standard file picker */this.openFile();return}
    /* STALE or DENIED: request permission first */
    if(st==='stale'||st==='denied'){
      try{const perm=await entry.handle.requestPermission({mode:'readwrite'});
        if(perm!=='granted'){this.toast('Permission denied','error');entry._state='denied';this._syncMRUCache();this._renderMRUBadges();return}
      }catch(e){this.toast('Permission denied','error');return}
    }
    /* READY (or just became ready): load the file */
    try{const file=await entry.handle.getFile();const text=await file.text();
      this.snap();this.proj=JSON.parse(text);this.migrate();this.applyTheme();this.sel=[];
      this._fileHandle=entry.handle;this._fileLastModified=file.lastModified;this._storeHandle(entry.handle);
      try{localStorage.setItem('tls3_fileName',entry.handle.name)}catch(e){}
      this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();
      /* Update MRU entry: bump to top, refresh name in case file was renamed */
      const freshName=entry.handle.name||entry.name;
      this._updateMRU(entry.handle,freshName,this.proj.name);
      this.toast('Loaded!')
    }catch(e){
      if(e instanceof SyntaxError)this.toast('Invalid file','error');
      else{entry._state='orphaned';this._syncMRUCache();this._renderMRUBadges();this.toast('File not found \u2014 may have been moved or deleted','error')}
    }
  },
  async _openInNewTab(id,asWindow){
    const entry=this._mruCache.find(e=>e.id===id);if(!entry||!entry.handle)return;
    const st=entry._state||'nameonly';
    if(st==='orphaned'){this.toast('File not found \u2014 may have been moved or deleted','error');return}
    /* Block unsaved current file */
    let isCur=!!(this._fileHandle&&entry.handle);
    if(isCur){try{isCur=await this._fileHandle.isSameEntry(entry.handle)}catch(e){isCur=false}}
    if(isCur&&this._unsaved){this.toast('Save your changes first \u2014 the new tab loads from disk','error',4000);return}
    /* Request permission if stale/denied */
    if(st==='stale'||st==='denied'){
      try{const perm=await entry.handle.requestPermission({mode:'read'});
        if(perm!=='granted'){this.toast('Permission denied','error');return}
      }catch(e){this.toast('Permission denied','error');return}
    }
    /* Read file from disk, compress, open */
    try{
      const file=await entry.handle.getFile();const text=await file.text();const proj=JSON.parse(text);
      const packed=this._packProj(proj);const encoded=_skEnc(packed);
      const json=JSON.stringify(encoded);const compressed=await this._compress(json);
      const url=location.origin+location.pathname+'?mruFile='+encodeURIComponent(entry.handle.name)+'#p='+compressed;
      if(url.length>11500){this.toast('Project too large to open in a new tab','error',4000);return}
      if(asWindow){window.open(url,'_blank','width=1200,height=800,menubar=no,toolbar=no')}
      else{window.open(url,'_blank')}
      this.toast('Opened in new '+(asWindow?'window':'tab'),'info')
    }catch(e){
      if(e instanceof SyntaxError)this.toast('Invalid file','error');
      else this.toast('Could not open file','error')
    }
  },
  _showExtPopover(anchor,id){
    this._hideExtPopover();
    const pop=document.createElement('div');pop.className='mru-ext-pop';
    pop.innerHTML='<div class="mru-ext-opt" data-act="tab">\u2197 Open in new tab</div><div class="mru-ext-opt" data-act="win">\u29C9 Open in new window</div>';
    const rect=anchor.getBoundingClientRect();pop.style.top=(rect.bottom+2)+'px';pop.style.left=rect.left+'px';
    document.body.appendChild(pop);
    pop.querySelectorAll('.mru-ext-opt').forEach(opt=>{opt.addEventListener('click',ev=>{
      ev.stopPropagation();this._hideExtPopover();this._openInNewTab(id,opt.dataset.act==='win')})});
    this._extPop=pop
  },
  _hideExtPopover(){
    if(this._extPop){this._extPop.remove();this._extPop=null}
  },
  _scDispatch:{
    undo(){this.undo()},
    redo(){this.redo()},
    save(){this.saveFile()},
    saveAs(){this.saveFile(true)},
    newProject(){this.newProjAct()},
    openFile(){this.openFile()},
    shortcutMgr(){this.showSettingsShortcuts()},
    delete(){if(this.sel.length)this.deleteSel()},
    selectAll(){const items=this.proj.hideMode?this.proj.items.filter(i=>!i.hidden):this.proj.items;this.sel=items.map(i=>i.id);if(this.sel.length>1)this.openBulkPanel();this.sched();this.toast(`Selected ${this.sel.length} item${this.sel.length===1?'':'s'}`)},
    fitToContent(){this.fitToContent()},
    fitToSelection(){this.fitToSelection()},
    goToday(){this.goToday()},
    zoomIn(){this.doZoom(5)},
    zoomOut(){this.doZoom(-5)},
    zoom100(){this.doZoomTo(100)},
    fullscreen(){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>this.toast('Fullscreen not supported','error'))},
    expandAll(){this.snap();this.proj.swimlanes.forEach(sl=>{sl.collapsed='expanded';if(sl.subSwimlanes)sl.subSwimlanes.forEach(ss=>ss.collapsed='expanded')});this.sched();this.autoSave();this.toast('All swimlanes expanded')},
    collapseAll(){this.snap();this.proj.swimlanes.forEach(sl=>sl.collapsed='collapsed');this.sched();this.autoSave();this.toast('All swimlanes collapsed')},
    showFloat(){this.proj.showFloat=!this.proj.showFloat;document.getElementById('btn-show-float')?.classList.toggle('active',this.proj.showFloat);this.sched();this.autoSave();this.toast(this.proj.showFloat?'Float labels ON':'Float labels OFF')},
    cycleDeps(){const p=this.proj;if(!p.showDeps){p.showDeps=true;p.depFilter='all';this.toast('Dependencies: All')}else if((p.depFilter||'all')==='all'){p.depFilter='swimlane';this.toast('Dependencies: Within swimlane')}else{p.showDeps=false;this.toast('Dependencies: Off')}this.sched();this.autoSave();const vdf=document.getElementById('view-dep-filter');if(vdf)vdf.value=p.showDeps?(p.depFilter||'all'):'off'},
    autoFitHeights(){this.autoFitHeights()},
    propagate(){if(this.sel.length&&this.proj.schedulingMode!=='scheduled')this.propagateFrom(this.sel)},
    toggleLock(){this.proj.locked=!this.proj.locked;this.proj.lockH=this.proj.locked;this.proj.lockV=this.proj.locked;this.sched();this.autoSave();this.toast(this.proj.locked?'Locked':'Unlocked')},
    toggleHide(){this.proj.hideMode=!this.proj.hideMode;this.sched();this.toast(this.proj.hideMode?'Hiding hidden':'Showing all')},
    toggleCritPath(){this.toggleCritPath()},
    toggleSched(){this.toggleSchedulingMode()},
    toggleLasso(){if(this._fpMode||this._fpStaged)this.deactivateFP();this._lassoMode=!this._lassoMode;if(this._lassoMode&&this._panMode){this._panMode=false;document.getElementById('btn-pan')?.classList.remove('active')}document.getElementById('btn-lasso')?.classList.toggle('active',this._lassoMode);this.$.tl_body.classList.toggle('lasso-mode',this._lassoMode);this.toast(this._lassoMode?'Lasso mode ON — click and drag':'Lasso mode OFF')},
    togglePan(){if(this._fpMode||this._fpStaged)this.deactivateFP();this._panMode=!this._panMode;if(this._panMode&&this._lassoMode){this._lassoMode=false;document.getElementById('btn-lasso')?.classList.remove('active');this.$.tl_body.classList.remove('lasso-mode')}document.getElementById('btn-pan')?.classList.toggle('active',this._panMode);this.sched();this.toast(this._panMode?'Pan mode ON — click and drag to scroll':'Pan mode OFF')},
    formatPainter(){if(this._fpMode||this._fpStaged)this.deactivateFP();else this.stageFP()},
    repeatFP(){if(!this._fpMode&&!this._fpStaged){this.stageFP();this.activateFP(false)}else if(this._fpStaged&&!this._fpMode){this.activateFP(false)}else if(this._fpMode&&!this._fpPersist){this._fpPersist=true;const b=document.getElementById('btn-fp');if(b)b.classList.add('fp-locked');this.sched();this.toast('Upgraded to multi-apply')}},
    addMilestone(){this.addItem('milestone')},
    addTask(){this.addItem('task')},
    addSwimlane(){this.showSwM()},
    snapViewport(){this.copyScreenshot(true)},
    snapFull(){this.copyScreenshot(false)},
    openPrimaryLink(){this.openPrimaryLinks()},
    openAllLinks(){this.openAllLinks()},
    cycleDayFmt(){if(this.proj.timescale!=='days'){this.toast('Switch to Days scale first','info');return}this.snap();const order=['letter','number','hybrid'];const cur=this.proj.dayLabelFormat||'letter';const ni=(order.indexOf(cur)+1)%order.length;this.proj.dayLabelFormat=order[ni];this._syncHdrFmtUI();this.sched();this.autoSave();const labels={letter:'Letter (M T W)',number:'Number (1 2 3)',hybrid:'Hybrid (3 W)'};this.toast('Day format: '+labels[order[ni]])},
    cycleScale(){this.snap();const order=['days','weeks','months','quarters','years'];const cur=this.proj.timescale||'months';const ni=(order.indexOf(cur)+1)%order.length;const prev=this.proj.timescale;this.proj.timescale=order[ni];this.$.ts_sel.value=order[ni];if(order[ni]==='days'){const days=U.days(this.proj.timelineStart,this.proj.timelineEnd);if(days>365)this.toast('Days scale works best for timelines under 6 months','info');if(prev!=='days')this._pendingFit=true}this._syncHdrFmtUI();this.sched();this.autoSave();this.toast('Scale: '+order[ni].charAt(0).toUpperCase()+order[ni].slice(1))},
    cycleHdrRows(){this.snap();const ts=this.proj.timescale||'months';const max=ts==='years'?1:ts==='quarters'?2:3;const cur=this.proj.headerLayers||2;let next=cur+1;if(next>max)next=1;this.proj.headerLayers=next;this.$.hl_sel.value=String(next);this.sched();this.autoSave();this.toast('Header rows: '+next)},
  },
  _handleEscape(){
    /* Lasso mode: first Escape exits lasso only (preserves selection), second clears selection */
    if(this._lassoMode){this._lassoMode=false;document.getElementById('btn-lasso')?.classList.remove('active');this.$.tl_body.classList.remove('lasso-mode');this.sched();return}
    this.sel=[];this.slSel=[];this._hideSlFmtPopover();this._hideHdrFmtPopover();this.editItem=null;this.closePanel();
    this.$.ctx_menu.classList.add('hidden');this.$.dt_ctx_menu.classList.add('hidden');
    document.querySelectorAll('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));
    if(this._panMode){this._panMode=false;document.getElementById('btn-pan')?.classList.remove('active')}
    if(this._fpStaged||this._fpMode){this.deactivateFP()}
    else{this._hideFPPopover()}
    this.sched();
  },
  _handleNudgeKey(actionId,ctrl){
    if(!this.sel.length)return;
    if(this.proj.locked){if(!this._lockToastT||Date.now()-this._lockToastT>2000){this.toast('🔒 Locked — unlock to move items','info',1500);this._lockToastT=Date.now()}this._hintLockPill();return}
    const keyMap={nudgeLeft:'ArrowLeft',nudgeRight:'ArrowRight',nudgeUp:'ArrowUp',nudgeDown:'ArrowDown'};
    this.nudge(keyMap[actionId],ctrl);
  },
  showSettingsShortcuts(){
    const sm=document.getElementById('settings-modal');
    if(sm.classList.contains('hidden'))this.showSettings();
    setTimeout(()=>{const sc=document.getElementById('sect-shortcuts');if(sc)sc.scrollIntoView({behavior:'smooth',block:'start'})},100);
  },

  async init(){
    this.$={};
    ['toolbar','main-content','props-panel','panel-body','panel-title',
     'tl-container','tl-scroll','tl-hdr-wrap','tl-hdr-corner','tl-hdr-scroll','tl-hdr',
     'tl-body-wrap','tl-sl-labels','sl-col-rh','tl-body-scroll','tl-body','tl-watermark',
     'data-container','dt-head','dt-body','data-table-wrap',
     'ctx-menu','dt-ctx-menu','settings-modal','sw-modal','paste-modal','apply-modal','pname-modal',
     'date-fmt-sel','ts-sel','hl-sel','zoom-lbl','file-input',
     'paste-ta','paste-prev','paste-sw',
     's-name','s-owner','s-start','s-end','s-auto-range','s-today','s-deps','s-fontsize',
     's-watermark','s-wm-date','s-wm-pos','s-wm-owner',
     's-show-weekends','s-wknd-opacity','s-wknd-opval','s-wknd-auto',
     's-show-holidays','s-hol-color','s-hol-opacity','s-hol-opval','s-hol-labels',
     'sched-tr-summary','sched-tr-list',
     'hol-count','hol-list','hol-import-box','hol-paste-ta','hol-paste-prev',
     'sw-name','sw-color','sw-modal-title',
     'data-search','data-search-ct','ds-clear',
     'file-dropdown','add-dropdown','view-dropdown','tools-dropdown','apply-title','tooltip',
     'project-name-text','unsaved-dot','file-subtitle','project-name-display',
     'hide-label','ctx-link-dep',
     'help-body','np-template','np-name',
     'data-filter-bar','flt-type','flt-name','flt-owner','flt-swim','flt-sub','flt-notes','flt-start','flt-end','flt-status',
     'as-term','as-results',
     'imp-adv-toggle','imp-adv-arrow','imp-adv-body','imp-file-input','imp-file-name',
     'imp-map-area','imp-status-area','imp-perfect-match','imp-preview-wrap','imp-status',
     'imp-overload-area','btn-imp-do',
     'pill-group','pill-lock','pill-hide','pill-auto','pill-fp','pill-sel',
     'panel-tab','panel-tab-icon','btn-collapse','btn-lock-collapse',
    ].forEach(id=>{const el=document.getElementById(id);if(el)this.$[id.replace(/-/g,'_')]=el});
    if(!await this._loadFromHash()){if(this._shareLoadFailed)this.proj=newProj();else this.loadAuto()}this.migrate();this._loadShortcuts();this._buildShortcutMap();
    try{this.panelCollapsed=localStorage.getItem('tls3_panelCollapsed')==='1';this.panelLocked=localStorage.getItem('tls3_panelLocked')==='1'}catch(e){}
    if(this.panelCollapsed){this.$.panel_tab.classList.remove('hidden');this.$.props_panel.classList.add('panel-hidden');this._syncLockTab()}else{this._renderEmptyPanel()}
    this._syncPanelPad();this.applyTheme();this.bind();this.sched();if(this.proj.items.length)this._pendingFit=true;
    if(this._shareMode){this._showShareBanner();this.markClean();this.toast('Shared timeline loaded','info',3000)}
    /* F56: Reconnect file handle when opened from MRU in new tab */
    if(this._mruLinkFile){(async()=>{
      try{
        await this._loadMRU();
        const entry=this._mruCache.find(e=>e.name===this._mruLinkFile);
        if(entry&&entry.handle){
          const perm=await entry.handle.queryPermission({mode:'readwrite'});
          if(perm==='granted'){this._fileHandle=entry.handle;this._storeHandle(entry.handle);
            try{const rf=await entry.handle.getFile();this._fileLastModified=rf.lastModified}catch(e){}
            try{localStorage.setItem('tls3_fileName',entry.handle.name)}catch(e){}
            this.markClean();this._updateFileIndicator()
          }else{this._storedHandle=entry.handle;this._updateFileIndicator();
            setTimeout(()=>this.toast(entry.name+' \u2014 click filename to reconnect','info',4000),600)}
        }
        this._mruLinkFile=null
      }catch(e){this._mruLinkFile=null}
    })()}
    /* F53: File handle reconnect on startup */
    if(!this._shareMode&&this.proj.items.length){(async()=>{
      const stored=await this._loadHandle();
      if(stored){
        this._storedHandle=stored;
        try{const perm=await stored.queryPermission({mode:'readwrite'});if(perm==='granted'){this._fileHandle=stored;try{const rf=await stored.getFile();this._fileLastModified=rf.lastModified}catch(e){}this._updateFileIndicator();return}}catch(e){}
        this._updateFileIndicator();
        if(!this._fileHintShown){this._fileHintShown=true;const fn=stored.name||localStorage.getItem('tls3_fileName')||'';if(fn)setTimeout(()=>this.toast(fn+' \u2014 click filename to reconnect','info',4000),600)}
      }else if(!this._fileHandle){this._updateFileIndicator()}
    })()}
    /* F55: Warm MRU cache on startup (non-blocking) */
    this._loadMRU().catch(()=>{});
    this.$.tl_body_scroll.addEventListener('scroll',()=>{
      this.$.tl_sl_labels.scrollTop=this.$.tl_body_scroll.scrollTop;
      this.$.tl_hdr_scroll.scrollLeft=this.$.tl_body_scroll.scrollLeft;
    });
  },

  migrate(){
    const p=this.proj;
    if(!p.timescale||!['days','weeks','months','quarters','years'].includes(p.timescale))p.timescale='months';
    if(!p.dateFormat)p.dateFormat='MMM D, YYYY';
    if(!p.theme)p.theme='default';if(p.autoRange==null)p.autoRange=true;
    if(p.locked==null)p.locked=false;if(p.hideMode==null)p.hideMode=false;
    if(p.headerLayers==null)p.headerLayers=2;if(p.fontSize==null)p.fontSize=11;
    if(!p.monthFormat||!['short','letter'].includes(p.monthFormat))p.monthFormat='short';
    if(!p.quarterFormat||!['withYear','plain'].includes(p.quarterFormat))p.quarterFormat='withYear';
    if(p.headerFontSize==null)p.headerFontSize=10.5;p.headerFontSize=Math.max(7,Math.min(16,p.headerFontSize));
    if(!p.dayLabelFormat||!['letter','number','hybrid'].includes(p.dayLabelFormat))p.dayLabelFormat='letter';
    if(!p.dayColumnWidth||!['compact','normal','wide'].includes(p.dayColumnWidth))p.dayColumnWidth='normal';
    if(!p.watermark)p.watermark=false;if(!p.wmDate)p.wmDate='';if(!p.wmPos)p.wmPos='bottom-center';
    if(p.showDeps==null)p.showDeps=true;if(p.depFilter==null)p.depFilter='all';if(p.showToday==null)p.showToday=true;
    if(p.owner==null)p.owner='';if(p.wmShowOwner==null)p.wmShowOwner=false;
    if(p.lockH==null)p.lockH=false;if(p.lockV==null)p.lockV=false;
    if(p.showWeekends==null)p.showWeekends=false;if(p.weekendOpacity==null)p.weekendOpacity=8;
    if(p.weekendAutoHide==null)p.weekendAutoHide=true;
    if(p.defaultFolder==null)p.defaultFolder='';
    if(!Array.isArray(p.holidays))p.holidays=[];
    if(p.showHolidays==null)p.showHolidays=false;
    if(p.holidayOpacity==null)p.holidayOpacity=12;
    if(p.holidayColor==null)p.holidayColor='#e5534b';
    if(p.holidayLabels==null)p.holidayLabels=true;
    if(p.scheduleAroundNonWorking==null)p.scheduleAroundNonWorking=true;
    p.holidays.forEach(h=>{if(h.schedAround==null)h.schedAround=true});
    if(p.tttEnabled==null)p.tttEnabled=false;if(p.tttMilestoneId==null)p.tttMilestoneId='';
    if(p.showFloat==null)p.showFloat=false;if(p.schedulingMode==null)p.schedulingMode='manual';
    if(p.labelWidth==null)p.labelWidth=160;if(p.autoSortSwimlanes==null)p.autoSortSwimlanes=false;if(p.arrangeSpread==null)p.arrangeSpread=50;if(p.arrangePadding==null)p.arrangePadding=50;if(p.arrangeDateWeight==null)p.arrangeDateWeight=20;if(p.arrangeLabels==null)p.arrangeLabels=false;if(p.arrangeSimple==null)p.arrangeSimple=50;
    if(!Array.isArray(p.statusDefs))p.statusDefs=[{id:'blank',name:'',desc:'',color:'',shortName:'',emoji:''},{id:'tbd',name:'TBD',desc:'Not yet determined',color:'#6b7280',shortName:'?',emoji:'❓'},{id:'on-track',name:'On Track',desc:'Progressing as planned',color:'#22c55e',shortName:'G',emoji:'🟢'},{id:'at-risk',name:'At Risk',desc:'May miss target',color:'#eab308',shortName:'Y',emoji:'🟡'},{id:'off-track',name:'Off Track',desc:'Behind schedule',color:'#ef4444',shortName:'R',emoji:'🔴'},{id:'complete',name:'Complete',desc:'Finished',color:'#3b82f6',shortName:'B',emoji:'🔵'},{id:'not-started',name:'Not Started',desc:'Has not begun',color:'#9ca3af',shortName:'N',emoji:'⚪'}];
    if(!p.statusDisplay)p.statusDisplay={show:true,mode:'emoji',badgePos:'inline',colorOverride:false,blankColor:''};
    /* Migrate colorOverride from mode dropdown to separate toggle */
    if(p.statusDisplay.mode==='colorOverride'){p.statusDisplay.mode='emoji';p.statusDisplay.colorOverride=true}
    if(p.statusDisplay.colorOverride==null)p.statusDisplay.colorOverride=false;
    if(p.statusDisplay.blankColor==null)p.statusDisplay.blankColor='';
    p.swimlanes.forEach(sl=>{if(!sl.subSwimlanes)sl.subSwimlanes=[];if(!sl.height)sl.height=120;if(sl.collapsed===true)sl.collapsed='minimized';else if(!sl.collapsed||sl.collapsed===false)sl.collapsed='expanded';if(sl.fontSize==null)sl.fontSize=0;if(!Array.isArray(sl.links))sl.links=[];sl.subSwimlanes.forEach(ss=>{if(ss.height==null)ss.height=0;if(!ss.collapsed)ss.collapsed='expanded';if(ss.fontSize==null)ss.fontSize=0;if(!Array.isArray(ss.links))ss.links=[]})});
    p.items.forEach(it=>{
      if(!it.deps&&it.dependencies){it.deps=it.dependencies;delete it.dependencies}
      if(!it.deps)it.deps=[];
      // Migrate deps from string array to object array
      if(it.deps.length&&typeof it.deps[0]==='string'){it.deps=it.deps.map(d=>({id:d,type:it.depType||'FS',lag:0}))}
      delete it.depType;
      // Migrate lock flags to pinned
      if(it.pinned==null)it.pinned=!!(it.depLocked||it.startLocked);
      delete it.depLocked;delete it.startLocked;delete it.endLocked;delete it.durationLocked;
      if(it.subSwimId==null)it.subSwimId='';
      if(!it.textColor)it.textColor='';if(!it.edgeTextColor)it.edgeTextColor='';
      if(!it.dateFormat)it.dateFormat='';if(!it.durationFmt)it.durationFmt='days';
      if(it.showStartDate==null)it.showStartDate=false;
      if(it.showEndDate==null)it.showEndDate=false;
      if(it.hidden==null)it.hidden=false;
      if(it.progress==null)it.progress=0;
      if(!it.durMode)it.durMode='cal'; // existing items use calendar days
      // Compute duration if missing — use appropriate formula based on project version
      if(it.duration==null&&it.type==='task'&&it.startDate&&it.endDate){
        it.duration=U.days(it.startDate,it.endDate)+(p.version>=2?1:0);
      }
      if(it.fontSize==null)it.fontSize=0;
      if(it.showDate==null)it.showDate=true;
      if(!it.vLine)it.vLine={enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'};
      if(it.owner==null)it.owner='';
      if(it.showOwner==null)it.showOwner=false;
      if(it.notes==null)it.notes='';
      if(it.status==null)it.status='';
      if(it.statusDate==null)it.statusDate='';
      if(!Array.isArray(it.links))it.links=[];
    })
    // v1→v2 migration: endDates changed from exclusive (cal) to always-inclusive
    if(!p.version||p.version<2){
      p.items.forEach(it=>{
        if(it.type==='task'&&it.startDate&&it.duration){
          it.endDate=this._calcEndDate(it)
        }
      });
      p.version=2
    }
  },

  _getStatusDef(statusId){
    if(!statusId||statusId==='blank')return null;
    return(this.proj.statusDefs||[]).find(sd=>sd.id===statusId)||null;
  },

  applyTheme(){const t=THEMES[this.proj.theme]||THEMES.default;document.body.className=t.cls},
  getTheme(){return THEMES[this.proj.theme]||THEMES.default},

  sched(tl=true,dt=true){
    if(tl)this._dirty=true;if(dt)this._dataDirty=true;
    if(!this._raf){this._raf=requestAnimationFrame(()=>{
      this._raf=null;
      this.runSchedule();
      if(this._dirty&&(this.view==='timeline'||this.view==='split')){this.renderTL();this._dirty=false}
      if(this._dataDirty&&(this.view==='data'||this.view==='split')){this.renderDT();this._dataDirty=false}
      this.$.zoom_lbl.textContent=(this.proj.zoom||100)+'%';
      this.$.ts_sel.value=this.proj.timescale;
      this.$.hl_sel.value=String(this.proj.headerLayers);
      this._syncHdrFmtUI();
      this.$.project_name_text.textContent=this.proj.name||'Untitled';
      this._docTitle(this._unsaved);
      this.updateStatus();
      if(this._pendingFit){this._pendingFit=false;if(this.view==='timeline'||this.view==='split')requestAnimationFrame(()=>this.fitToContent())}
    })}
  },

  _syncHdrFmtUI(){
    const ts=this.proj.timescale,layers=this.proj.headerLayers||2;
    const mfSel=document.getElementById('month-fmt-sel');
    const qfSel=document.getElementById('quarter-fmt-sel');
    const dfSel=document.getElementById('day-fmt-sel');
    const dwSel=document.getElementById('day-width-sel');
    const mfRow=document.getElementById('hdr-fmt-month-row');
    const qfRow=document.getElementById('hdr-fmt-quarter-row');
    const dfRow=document.getElementById('hdr-fmt-day-row');
    const dwRow=document.getElementById('hdr-fmt-dayw-row');
    const section=document.getElementById('hdr-fmt-section');
    // Days format visible only when timescale is days
    const showDay=(ts==='days');
    // Month format visible when months appear in any layer (months L1, weeks L2, days L2)
    const showMonth=(ts==='months')||(ts==='weeks'&&layers>=2)||(ts==='days'&&layers>=2);
    // Quarter format visible when quarters appear (months L2)
    const showQuarter=(ts==='months'&&layers>=2);
    if(dfRow)dfRow.style.display=showDay?'':'none';
    if(dwRow)dwRow.style.display=showDay?'':'none';
    if(mfRow)mfRow.style.display=showMonth?'':'none';
    if(qfRow)qfRow.style.display=showQuarter?'':'none';
    if(section)section.style.display=(showDay||showMonth||showQuarter)?'':'none';
    if(mfSel)mfSel.value=this.proj.monthFormat||'short';
    if(qfSel)qfSel.value=this.proj.quarterFormat||'withYear';
    if(dfSel)dfSel.value=this.proj.dayLabelFormat||'letter';
    if(dwSel)dwSel.value=this.proj.dayColumnWidth||'normal';
    /* Sync header popover if visible */
    const hdrPop=document.getElementById('hdr-fmt-popover');
    if(hdrPop&&!hdrPop.classList.contains('hidden')){
      const hpMf=document.getElementById('hdr-pop-month-fmt');
      const hpQf=document.getElementById('hdr-pop-quarter-fmt');
      const hpDf=document.getElementById('hdr-pop-day-fmt');
      const hpDw=document.getElementById('hdr-pop-dayw-fmt');
      const hpMr=document.getElementById('hdr-pop-month-row');
      const hpQr=document.getElementById('hdr-pop-quarter-row');
      const hpDr=document.getElementById('hdr-pop-day-row');
      const hpDwR=document.getElementById('hdr-pop-dayw-row');
      if(hpDr)hpDr.style.display=showDay?'':'none';
      if(hpDwR)hpDwR.style.display=showDay?'':'none';
      if(hpMr)hpMr.style.display=showMonth?'':'none';
      if(hpQr)hpQr.style.display=showQuarter?'':'none';
      if(hpMf)hpMf.value=this.proj.monthFormat||'short';
      if(hpQf)hpQf.value=this.proj.quarterFormat||'withYear';
      if(hpDf)hpDf.value=this.proj.dayLabelFormat||'letter';
      if(hpDw)hpDw.value=this.proj.dayColumnWidth||'normal';
      const hpFs=document.getElementById('hdr-fmt-fs');
      if(hpFs)hpFs.value=this.proj.headerFontSize||10.5;
    }
    this._syncShadingUI();
  },
  _syncShadingUI(){
    const p=this.proj,wk=p.showWeekends,wo=p.weekendOpacity||8,hol=p.showHolidays,ho=p.holidayOpacity||12;
    const noHols=!p.holidays||p.holidays.length===0;
    /* Popover elements */
    const hpWC=document.getElementById('hdr-pop-wknd-chk'),hpWO=document.getElementById('hdr-pop-wknd-op'),hpWV=document.getElementById('hdr-pop-wknd-opval');
    const hpHC=document.getElementById('hdr-pop-hol-chk'),hpHO=document.getElementById('hdr-pop-hol-op'),hpHV=document.getElementById('hdr-pop-hol-opval'),hpHL=document.getElementById('hdr-pop-hol-settings');
    /* View dropdown elements */
    const vWC=document.getElementById('view-wknd-chk'),vWO=document.getElementById('view-wknd-op'),vWV=document.getElementById('view-wknd-opval');
    const vHC=document.getElementById('view-hol-chk'),vHO=document.getElementById('view-hol-op'),vHV=document.getElementById('view-hol-opval'),vHL=document.getElementById('view-hol-settings');
    /* Weekend sync */
    if(hpWC)hpWC.checked=wk;if(hpWO){hpWO.value=wo;hpWO.disabled=!wk}if(hpWV)hpWV.textContent=wo+'%';
    if(vWC)vWC.checked=wk;if(vWO){vWO.value=wo;vWO.disabled=!wk}if(vWV)vWV.textContent=wo+'%';
    /* Holiday sync */
    if(hpHC){hpHC.checked=hol;hpHC.disabled=noHols}if(hpHO){hpHO.value=ho;hpHO.disabled=!hol||noHols}if(hpHV)hpHV.textContent=ho+'%';
    if(hpHL)hpHL.style.display=noHols?'':'none';
    if(vHC){vHC.checked=hol;vHC.disabled=noHols}if(vHO){vHO.value=ho;vHO.disabled=!hol||noHols}if(vHV)vHV.textContent=ho+'%';
    if(vHL)vHL.style.display=noHols?'':'none';
  },
  _docTitle(dirty){const n=this.proj?.name||'Timeline Studio';document.title=(dirty?'● ':'')+n+' — Timeline Studio'},
  markDirty(){this._unsaved=true;this.$.unsaved_dot.classList.remove('hidden');this._docTitle(true);this._updateFileIndicator()},
  markClean(){this._unsaved=false;this.$.unsaved_dot.classList.add('hidden');this._docTitle(false);this._updateFileIndicator()},
  snap(){this.undoStack.push(U.deep(this.proj));if(this.undoStack.length>40)this.undoStack.shift();this.redoStack=[];this.markDirty()},
  undo(){if(!this.undoStack.length)return;this.redoStack.push(U.deep(this.proj));this.proj=this.undoStack.pop();this.migrate();this.sched();this.refreshPanel();this.toast('Undone')},
  redo(){if(!this.redoStack.length)return;this.undoStack.push(U.deep(this.proj));this.proj=this.redoStack.pop();this.migrate();this.sched();this.refreshPanel();this.toast('Redone')},
  refreshPanel(){if(this.editItem&&this.sel.length===1){const it=this.gi(this.sel[0]);if(it){this.editItem=it;this.renderPanel(it)}}else if(this.sel.length>1)this.renderBulkPanel()},
  autoSave:U.deb(function(){if(App._shareMode)return;try{localStorage.setItem('tls3',JSON.stringify(App.proj))}catch(e){}},400),
  loadAuto(){try{const s=localStorage.getItem('tls3');if(s)this.proj=JSON.parse(s)}catch(e){}},
  async _loadFromHash(){
    try{
      const h=location.hash;
      if(!h.startsWith('#p='))return false;
      const raw=h.slice(3);
      const json=await this._decompress(raw);
      if(!json)throw new Error('decompress failed');
      const parsed=JSON.parse(json);
      this.proj=_skDec(parsed);
      /* F56: Check if this is a local MRU open (not a remote share link) */
      const params=new URLSearchParams(location.search);
      const mruFile=params.get('mruFile');
      if(mruFile){this._shareMode=false;this._mruLinkFile=mruFile}
      else{this._shareMode=true}
      this._fileHandle=null;
      history.replaceState(null,'',location.pathname);
      return true;
    }catch(e){console.warn('Share link load failed:',e);if(location.hash.startsWith('#p=')){this._shareLoadFailed=true;history.replaceState(null,'',location.pathname);setTimeout(()=>App.toast('Share link may be truncated \u2014 copy-paste the full URL directly','error',6000),500)}return false}
  },
  toast(m,t='success',dur=2200,actionLabel=null,actionFn=null){const el=document.createElement('div');el.className=`toast toast-${t}`;if(actionLabel&&actionFn){el.innerHTML=U.esc(m)+` <span class="toast-action">${U.esc(actionLabel)}</span>`;el.querySelector('.toast-action').onclick=()=>{el.remove();actionFn()}}else{el.textContent=m}const active=document.querySelectorAll('.toast');const offset=active.length*40;el.style.bottom=(18+offset)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),dur)},

  async saveFile(saveAs=false){
    const data=JSON.stringify(this.proj,null,2);
    /* F53: Try stored handle if no active handle (auto-reconnect on Ctrl+S) */
    if(!saveAs&&!this._fileHandle){const stored=await this._loadHandle();if(stored){try{const perm=await stored.requestPermission({mode:'readwrite'});if(perm==='granted')this._fileHandle=stored}catch(e){}}}
    if(!saveAs&&this._fileHandle){try{/* Fix D: stale file check before overwrite */if(this._fileLastModified){try{const chk=await this._fileHandle.getFile();if(chk.lastModified!==this._fileLastModified){if(!confirm('This file was modified outside this tab (possibly by another tab or program). Overwrite with your version?'))return}}catch(e){}}const w=await this._fileHandle.createWritable();await w.write(data);await w.close();try{const saved=await this._fileHandle.getFile();this._fileLastModified=saved.lastModified}catch(e){}this.markClean();this.toast('Saved!');this.autoSave();try{localStorage.setItem('tls3_fileName',this._fileHandle.name)}catch(e){}this._updateFileIndicator();this._updateMRU(this._fileHandle,this._fileHandle.name,this.proj.name);return}catch(e){}}
    if(window.showSaveFilePicker){try{const prevHandle=saveAs?this._fileHandle:null;const h=await window.showSaveFilePicker({suggestedName:(this.proj.name||'timeline')+'.tlproj',types:[{description:'Timeline Project',accept:{'application/json':['.tlproj','.json']}}]});const w=await h.createWritable();await w.write(data);await w.close();this._fileHandle=saveAs&&prevHandle?prevHandle:h;this.markClean();this.toast(saveAs?'Saved copy!':'Saved!');this.autoSave();this._storeHandle(this._fileHandle);try{localStorage.setItem('tls3_fileName',this._fileHandle.name)}catch(e){}this._updateFileIndicator();this._updateMRU(this._fileHandle,this._fileHandle.name,this.proj.name);return}catch(e){if(e.name==='AbortError')return}}
    const fn=(this.proj.name||'timeline')+'.tlproj';const b=new Blob([data],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fn;a.click();URL.revokeObjectURL(a.href);this.markClean();this.toast('Downloaded!');this.autoSave();try{localStorage.setItem('tls3_fileName',fn)}catch(e){}this._updateFileIndicator();this._updateMRU(null,fn,this.proj.name)
  },
  /* ── Share-link compression pipeline ── */
  _packProj(src){
    const p=U.deep(src||this.proj);
    const def=newProj();
    /* project-level: strip fields matching defaults */
    const projStrip=['owner','dateFormat','timescale','headerLayers','autoRange','showToday','showDeps','depFilter',
      'locked','lockH','lockV','hideMode','theme','bgColor','headerColor','zoom','fontSize','monthFormat','quarterFormat','headerFontSize','dayLabelFormat','dayColumnWidth',
      'watermark','wmDate','wmPos','wmShowOwner','showWeekends','weekendOpacity','weekendAutoHide',
      'showHolidays','holidayOpacity','holidayColor','holidayLabels','scheduleAroundNonWorking',
      'defaultFolder','tttEnabled','tttMilestoneId','showFloat','schedulingMode','labelWidth',
      'autoSortSwimlanes','arrangeSimple','arrangeSpread','arrangePadding','arrangeDateWeight','arrangeLabels'];
    for(const k of projStrip)if(JSON.stringify(p[k])===JSON.stringify(def[k]))delete p[k];
    /* holidays — strip if empty */
    if(Array.isArray(p.holidays)&&!p.holidays.length)delete p.holidays;
    /* statusDefs — strip if all 7 match canonical defaults */
    if(Array.isArray(p.statusDefs)&&p.statusDefs.length===7){
      const canon=def.statusDefs;
      const match=p.statusDefs.every((s,i)=>s.id===canon[i].id&&s.name===canon[i].name&&s.color===canon[i].color&&s.shortName===canon[i].shortName&&s.emoji===canon[i].emoji);
      if(match)delete p.statusDefs;
    }
    /* statusDisplay — strip if matches default */
    if(p.statusDisplay&&JSON.stringify(p.statusDisplay)===JSON.stringify(def.statusDisplay))delete p.statusDisplay;
    /* items */
    if(p.items)for(const it of p.items){
      if(it.showDate===true)delete it.showDate;
      if(it.hidden===false)delete it.hidden;
      if(it.progress===0)delete it.progress;
      if(it.durMode==='cal')delete it.durMode;
      if(!it.textColor)delete it.textColor;
      if(!it.edgeTextColor)delete it.edgeTextColor;
      if(!it.dateFormat)delete it.dateFormat;
      if(it.fontSize===0||it.fontSize==null)delete it.fontSize;
      if(it.pinned===false)delete it.pinned;
      if(Array.isArray(it.deps)&&!it.deps.length)delete it.deps;
      if(!it.notes)delete it.notes;
      if(!it.owner)delete it.owner;
      if(!it.status)delete it.status;
      if(!it.statusDate)delete it.statusDate;
      if(!it.subSwimId)delete it.subSwimId;
      if(it.showStartDate===false)delete it.showStartDate;
      if(it.showEndDate===false)delete it.showEndDate;
      if(it.showDuration===false)delete it.showDuration;
      if(it.showOwner===false)delete it.showOwner;
      if(!it.iconType||it.iconType==='diamond')delete it.iconType;
      if(!it.durationFmt||it.durationFmt==='days')delete it.durationFmt;
      if(!it.labelPosition||it.labelPosition==='right')delete it.labelPosition;
      if(it.vLine){
        const v=it.vLine;
        if(!v.enabled&&v.style==='dashed'&&v.color==='#999999'&&v.direction==='both'&&v.extent==='swim')delete it.vLine;
      }
      if(!it.links||!it.links.length)delete it.links;
      delete it._float;
    }
    /* swimlanes */
    if(p.swimlanes)for(const sl of p.swimlanes){
      if(sl.collapsed==='expanded')delete sl.collapsed;
      if(sl.height===120)delete sl.height;
      if(!sl.fontSize)delete sl.fontSize;
      if(!sl.links||!sl.links.length)delete sl.links;
      if(Array.isArray(sl.subSwimlanes)){
        if(!sl.subSwimlanes.length){delete sl.subSwimlanes}
        else for(const ss of sl.subSwimlanes){
          if(ss.collapsed==='expanded')delete ss.collapsed;
          if(ss.height===0||ss.height==null)delete ss.height;
          if(!ss.fontSize)delete ss.fontSize;
          if(!ss.links||!ss.links.length)delete ss.links;
        }
      }
    }
    return p;
  },
  async _compress(str){
    const blob=new Blob([str]);
    const cs=new CompressionStream('deflate-raw');
    const out=blob.stream().pipeThrough(cs);
    const buf=await new Response(out).arrayBuffer();
    const bytes=new Uint8Array(buf);
    /* base64url encode — chunked to avoid stack overflow */
    let b64='';const chunk=8192;
    for(let i=0;i<bytes.length;i+=chunk)b64+=String.fromCharCode(...bytes.subarray(i,i+chunk));
    return btoa(b64).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  },
  async _decompress(b64url){
    const b64=b64url.replace(/-/g,'+').replace(/_/g,'/');
    const bin=atob(b64);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const blob=new Blob([bytes]);
    const ds=new DecompressionStream('deflate-raw');
    const out=blob.stream().pipeThrough(ds);
    return await new Response(out).text();
  },
  async shareProject(){
    const projName=this.proj.name||'Untitled';
    /* show modal immediately with placeholder */
    const urlEl=document.getElementById('share-url-out');
    const sizeEl=document.getElementById('share-size-note');
    const nameEl=document.getElementById('share-proj-name');
    const previewEl=document.getElementById('share-paste-preview');
    const copyBtn=document.getElementById('btn-share-copy');
    if(nameEl)nameEl.textContent=projName;
    if(previewEl)previewEl.textContent='Timeline Studio: '+projName;
    if(urlEl)urlEl.value='Generating link…';
    if(copyBtn)copyBtn.disabled=true;
    if(sizeEl){sizeEl.textContent='Compressing…';sizeEl.className='share-size-note'}
    this.showModal('share-modal');
    /* compress pipeline: pack → short-key → JSON → deflate → base64url */
    try{
      const packed=this._packProj();
      const encoded=_skEnc(packed);
      const json=JSON.stringify(encoded);
      const compressed=await this._compress(json);
      const url=location.origin+location.pathname+'#p='+compressed;
      const chars=url.length;
      if(urlEl)urlEl.value=url;
      if(copyBtn)copyBtn.disabled=false;
      if(sizeEl){
        const kb=Math.round(chars/1024*10)/10;
        if(chars<=10000){
          sizeEl.innerHTML='<span class="share-size-ok">✓</span> Link: '+kb+' KB — fits within Slack and Teams limits';
          sizeEl.className='share-size-note share-size-ok';
        }else if(chars<=11500){
          sizeEl.innerHTML='<span class="share-size-near">⚠</span> Link: '+kb+' KB — approaching Slack\'s message limit';
          sizeEl.className='share-size-note share-size-near';
        }else{
          sizeEl.innerHTML='<span class="share-size-warn">⚠</span> Link: '+kb+' KB — may exceed Slack\'s message limit. Consider sharing a .tlproj file instead.';
          sizeEl.className='share-size-note share-size-warn';
        }
      }
    }catch(e){
      if(urlEl)urlEl.value='Error generating link';
      if(sizeEl){sizeEl.textContent='Compression failed: '+e.message;sizeEl.className='share-size-note share-size-warn'}
      if(copyBtn)copyBtn.disabled=false;
    }
  },
  _shareBannerTimer:null,
  _showShareBanner(){
    const b=document.getElementById('share-banner');if(!b)return;
    b.classList.remove('hidden');b.classList.remove('dismissing');
    const ring=document.getElementById('share-timer-ring');
    const dur=30000,circ=47.12;
    const start=performance.now();
    const tick=()=>{
      const pct=Math.min((performance.now()-start)/dur,1);
      if(ring)ring.setAttribute('stroke-dashoffset',String(circ*pct));
      if(pct>=1){this._dismissShareBanner();return}
      this._shareBannerTimer=requestAnimationFrame(tick);
    };
    this._shareBannerTimer=requestAnimationFrame(tick);
  },
  _dismissShareBanner(){
    if(this._shareBannerTimer){cancelAnimationFrame(this._shareBannerTimer);this._shareBannerTimer=null}
    const b=document.getElementById('share-banner');
    if(b&&!b.classList.contains('hidden')){b.classList.add('dismissing');setTimeout(()=>{b.classList.add('hidden');b.classList.remove('dismissing')},400)}
  },
  async openFile(){
    if(this._unsaved&&!confirm('Unsaved changes will be lost. Continue?'))return;
    if(window.showOpenFilePicker){
      try{const[handle]=await window.showOpenFilePicker({types:[{description:'Timeline Project',accept:{'application/json':['.tlproj','.json']}}],multiple:false});
        const file=await handle.getFile();const text=await file.text();
        try{this.snap();this.proj=JSON.parse(text);this.migrate();this.applyTheme();this.sel=[];this._fileHandle=handle;this._fileLastModified=file.lastModified;this._storeHandle(handle);try{localStorage.setItem('tls3_fileName',handle.name)}catch(e){}this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();this._updateMRU(handle,handle.name,this.proj.name);this.toast('Loaded!')}catch(err){this.toast('Invalid file','error')}
        return}catch(e){if(e.name==='AbortError')return}
    }
    this.$.file_input.click()
  },
  handleOpen(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{this.snap();this.proj=JSON.parse(ev.target.result);this.migrate();this.applyTheme();this.sel=[];this._fileHandle=null;this._fileLastModified=f.lastModified;try{localStorage.setItem('tls3_fileName',f.name)}catch(e2){}this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();this._updateMRU(null,f.name,this.proj.name);this.toast('Loaded!')}catch(err){this.toast('Invalid file','error')}};r.readAsText(f);e.target.value=''},
  newProjAct(){this.showModal('new-proj-modal');this.$.np_name.value='New Timeline';document.getElementById('np-template').value='blank'},
  createFromTemplate(){
    const tpl=document.getElementById('np-template').value,name=this.$.np_name.value.trim()||'New Timeline';
    if(tpl==='duplicate'){this.snap();const dup=U.deep(this.proj);dup.name=name+' (Copy)';this.proj=dup;this._fileHandle=null;this._fileLastModified=0;this._clearHandle();try{localStorage.removeItem('tls3_fileName')}catch(e){}this.sel=[];this.applyTheme();this.sched();if(this.proj.items.length)this._pendingFit=true;this.markDirty();document.getElementById('new-proj-modal').classList.add('hidden');this.toast('Duplicated!');return}
    if(this._unsaved&&!confirm('Unsaved changes will be lost.'))return;
    this.snap();
    if(tpl==='blank')this.proj=newProj();
    else if(tpl==='product-launch')this.proj=this.tplProductLaunch();
    else if(tpl==='software-dev')this.proj=this.tplSoftwareDev();
    else this.proj=newProj();
    this.proj.name=name;this._fileHandle=null;this._fileLastModified=0;this._clearHandle();try{localStorage.removeItem('tls3_fileName')}catch(e){}this.sel=[];this.applyTheme();this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();
    document.getElementById('new-proj-modal').classList.add('hidden');this.toast('Created!')
  },
  tplProductLaunch(){const p=newProj();p.name='Product Launch';const y=new Date().getFullYear();
    const sl1={id:U.id(),name:'Planning',color:'#2C5F7C',height:120,subSwimlanes:[],collapsed:'expanded'},sl2={id:U.id(),name:'Development',color:'#1B7F6A',height:120,subSwimlanes:[],collapsed:'expanded'},sl3={id:U.id(),name:'Launch',color:'#C0392B',height:120,subSwimlanes:[],collapsed:'expanded'};
    p.swimlanes=[sl1,sl2,sl3];
    const items=[
      {name:'Kickoff',type:'milestone',swimlaneId:sl1.id,date:`${y}-01-15`,iconType:'flag',color:'#2C5F7C',subRow:0},
      {name:'Requirements Complete',type:'milestone',swimlaneId:sl1.id,date:`${y}-03-01`,iconType:'diamond',color:'#6B4C9A',subRow:0},
      {name:'Design Phase',type:'task',swimlaneId:sl1.id,startDate:`${y}-01-20`,endDate:`${y}-02-28`,color:'#2E86AB',subRow:1},
      {name:'Development Sprint 1',type:'task',swimlaneId:sl2.id,startDate:`${y}-03-01`,endDate:`${y}-04-15`,color:'#1B7F6A',subRow:0},
      {name:'Development Sprint 2',type:'task',swimlaneId:sl2.id,startDate:`${y}-04-16`,endDate:`${y}-06-01`,color:'#81B29A',subRow:0},
      {name:'Alpha Release',type:'milestone',swimlaneId:sl2.id,date:`${y}-06-01`,iconType:'star',color:'#E87D2F',subRow:1},
      {name:'Beta Testing',type:'task',swimlaneId:sl2.id,startDate:`${y}-06-02`,endDate:`${y}-07-15`,color:'#E07A5F',subRow:0},
      {name:'Marketing Prep',type:'task',swimlaneId:sl3.id,startDate:`${y}-06-15`,endDate:`${y}-08-01`,color:'#A23B72',subRow:0},
      {name:'Launch Day',type:'milestone',swimlaneId:sl3.id,date:`${y}-08-15`,iconType:'star',color:'#C0392B',subRow:0}
    ];items.forEach(i=>{const it={...{id:U.id(),subSwimId:'',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:''},...i};if(it.type==='task')it.duration=U.days(it.startDate,it.endDate)+1;p.items.push(it)});
    p.autoRange=true;return p},
  tplSoftwareDev(){const p=newProj();p.name='Software Development';const y=new Date().getFullYear();
    const sl1={id:U.id(),name:'Requirements',color:'#264653',height:100,subSwimlanes:[],collapsed:'expanded'},sl2={id:U.id(),name:'Engineering',color:'#2E86AB',height:140,subSwimlanes:[],collapsed:'expanded'},sl3={id:U.id(),name:'QA & Release',color:'#E76F51',height:120,subSwimlanes:[],collapsed:'expanded'};
    p.swimlanes=[sl1,sl2,sl3];
    const items=[
      {name:'PRD Approved',type:'milestone',swimlaneId:sl1.id,date:`${y}-01-10`,iconType:'diamond',color:'#264653',subRow:0},
      {name:'Tech Design',type:'task',swimlaneId:sl1.id,startDate:`${y}-01-11`,endDate:`${y}-02-01`,color:'#219EBC',subRow:1},
      {name:'Sprint 1',type:'task',swimlaneId:sl2.id,startDate:`${y}-02-03`,endDate:`${y}-02-28`,color:'#2E86AB',subRow:0},
      {name:'Sprint 2',type:'task',swimlaneId:sl2.id,startDate:`${y}-03-03`,endDate:`${y}-03-28`,color:'#8ECAE6',subRow:0},
      {name:'Sprint 3',type:'task',swimlaneId:sl2.id,startDate:`${y}-03-31`,endDate:`${y}-04-25`,color:'#FFB703',subRow:0},
      {name:'Code Freeze',type:'milestone',swimlaneId:sl2.id,date:`${y}-04-25`,iconType:'flag',color:'#FB8500',subRow:1},
      {name:'QA Testing',type:'task',swimlaneId:sl3.id,startDate:`${y}-04-28`,endDate:`${y}-05-23`,color:'#E76F51',subRow:0},
      {name:'UAT',type:'task',swimlaneId:sl3.id,startDate:`${y}-05-26`,endDate:`${y}-06-06`,color:'#E07A5F',subRow:0},
      {name:'Release v1.0',type:'milestone',swimlaneId:sl3.id,date:`${y}-06-10`,iconType:'star',color:'#C0392B',subRow:1}
    ];items.forEach(i=>{const it={...{id:U.id(),subSwimId:'',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:''},...i};if(it.type==='task')it.duration=U.days(it.startDate,it.endDate)+1;p.items.push(it)});
    p.autoRange=true;return p},

  _ttT:null,
  showTT(el,text){clearTimeout(this._ttT);this._ttT=setTimeout(()=>{const tt=this.$.tooltip;if(text.includes('<'))tt.innerHTML=text;else tt.textContent=text;tt.classList.remove('hidden');const r=el.getBoundingClientRect();tt.style.left=Math.min(r.left,window.innerWidth-270)+'px';tt.style.top=(r.bottom+5)+'px';requestAnimationFrame(()=>tt.classList.add('visible'))},500)},
  hideTT(){clearTimeout(this._ttT);const tt=this.$.tooltip;tt.classList.remove('visible');setTimeout(()=>tt.classList.add('hidden'),150)},

  updateStatus(){
    /* Tools dropdown labels */
    const lb=document.getElementById('btn-lock');
    if(lb)lb.innerHTML=this.proj.locked?'<span>🔒</span> <span id="lock-label">Locked</span>':'<span>🔓</span> <span id="lock-label">Unlocked</span>';
    const hl=document.getElementById('hide-label');if(hl)hl.textContent=this.proj.hideMode?'Hidden':'Visible';
    const tsl=document.getElementById('toggle-sched-label');
    if(tsl)tsl.textContent=this.proj.schedulingMode==='scheduled'?'Switch to Manual':'Switch to Auto-Scheduled';
    /* Mode indicator pills */
    const pg=this.$.pill_group,pl=this.$.pill_lock,ph=this.$.pill_hide,pa=this.$.pill_auto,pf=this.$.pill_fp,ps=this.$.pill_sel;
    if(pg){
      const locked=!!this.proj.locked,hiding=!!this.proj.hideMode,auto=this.proj.schedulingMode==='scheduled',fp=!!this._fpMode,selCt=this.sel.length;
      if(pl)pl.classList.toggle('hidden',!locked);
      if(ph)ph.classList.toggle('hidden',!hiding);
      if(pa)pa.classList.toggle('hidden',!auto);
      if(pf)pf.classList.toggle('hidden',!fp);
      if(ps){ps.classList.toggle('hidden',selCt<2);
        if(selCt>=2){const countEl=ps.querySelector('.pill-count');const ctEl=ps.querySelector('.pill-sel-ct');if(countEl)countEl.textContent=selCt;if(ctEl)ctEl.textContent=selCt;ps.classList.add('has-count')}
      }
      pg.classList.toggle('hidden',!locked&&!hiding&&!auto&&!fp&&selCt<2);
      if(hiding&&ph){
        const ct=this.proj.items.filter(i=>i.hidden).length;
        const countEl=ph.querySelector('.pill-count');
        const ctEl=ph.querySelector('.pill-hide-ct');
        if(countEl)countEl.textContent=ct||'';
        if(ctEl)ctEl.textContent=ct;
        ph.classList.toggle('has-count',ct>0);
      }
    }
    /* Undo/Redo disabled state */
    const bu=document.getElementById('btn-undo'),br=document.getElementById('btn-redo');
    if(bu)bu.classList.toggle('disabled',!this.undoStack.length);
    if(br)br.classList.toggle('disabled',!this.redoStack.length);
    /* Propagate Selection disabled state */
    const bp=document.getElementById('btn-propagate-sel'),bph=document.getElementById('propagate-hint');
    if(bp){const noSel=!this.sel.length,isAuto=this.proj.schedulingMode==='scheduled',dis=noSel||isAuto;bp.classList.toggle('dd-disabled',dis);if(bph){bph.classList.toggle('hidden',!dis);bph.textContent=isAuto?'Auto-handled in scheduled mode':noSel?'Select an item to propagate':''}}
    /* FP split button: grey out main icon when sel!==1 (unless staged/painting) */
    const fpBtn=document.getElementById('btn-fp');
    if(fpBtn)fpBtn.classList.toggle('fp-disabled',this.sel.length!==1&&!this._fpMode&&!this._fpStaged);
    this._syncFPPopoverState();
    this._updateFileIndicator();
  },
  _updateFileIndicator(){
    const el=this.$.file_subtitle;if(!el)return;
    const linked=!!this._fileHandle;
    const dirty=this._unsaved;
    const storedName=this._shareLoadFailed?'':localStorage.getItem('tls3_fileName')||'';
    const dot=this.$.unsaved_dot;
    /* Determine filename text */
    let fname='';
    if(linked)fname=this._fileHandle.name;
    else if(storedName)fname=storedName;
    /* Clear existing text nodes but keep the dot span child */
    [...el.childNodes].forEach(n=>{if(n.nodeType===3)n.remove()});
    if(linked){
      el.appendChild(document.createTextNode(fname));
      el.className='file-subtitle'+(dirty?' fi-dirty':' fi-linked');
    }else if(storedName){
      el.appendChild(document.createTextNode(fname+' \u00b7 click to reconnect'));
      el.className='file-subtitle';
    }else{
      el.appendChild(document.createTextNode(dirty?'Not saved \u2014 Ctrl+S':'No file linked \u2014 Ctrl+S to save'));
      el.className='file-subtitle';
    }
    /* Update container tooltip: full project name + file info when truncated */
    const pnd=this.$.project_name_display;
    if(pnd){
      const projName=this.proj?.name||'Untitled';
      let tip='Double-click to edit project name';
      if(fname)tip=U.esc(projName)+'<br>'+U.esc(fname)+(dirty?' (unsaved changes)':'')+'<br><br>Double-click to edit name';
      else tip=U.esc(projName)+'<br><br>Double-click to edit name';
      pnd.dataset.tooltip=tip;
    }
  },

  /* ===== DEPENDENCY ENGINE (Phase 1: Smart Defaults) ===== */

  /* Get predecessor ID from a dep link (handles both old string and new object format) */
  depId(d){return typeof d==='string'?d:d.id},
  depLag(d){return typeof d==='object'?d.lag||0:0},
  depType(d){return typeof d==='object'?d.type||'FS':'FS'},

  /* Check if adding predId as predecessor of itemId would create a cycle */
  hasCycle(itemId,predId){
    const visited=new Set();const queue=[predId];
    while(queue.length){const id=queue.shift();if(id===itemId)return true;if(visited.has(id))continue;visited.add(id);
      const it=this.gi(id);if(!it||!it.deps)continue;
      for(const d of it.deps)queue.push(this.depId(d))}
    return false
  },

  /* Calculate the earliest valid start for an item based on ALL its predecessors */
  /* Skip non-working days (weekends + holidays with schedAround=true) */
  _getNonWorkingHolidaySet(){
    if(!this.proj.scheduleAroundNonWorking)return new Set();
    const s=new Set();
    for(const h of this.proj.holidays||[]){
      if(!h.schedAround)continue;
      let cur=new Date(h.start+'T12:00:00');const end=new Date((h.end||h.start)+'T12:00:00');
      while(cur<=end){s.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
    }
    return s
  },
  _skipNonWorking(dateStr){
    if(!this.proj.scheduleAroundNonWorking||!dateStr)return dateStr;
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(dateStr+'T12:00:00');
    for(let i=0;i<365;i++){// safety limit
      const dow=d.getDay();
      const iso=U.iso(d);
      if(dow===0||dow===6||holSet.has(iso)){d.setDate(d.getDate()+1);continue}
      return iso
    }
    return dateStr // fallback
  },
  /* Add N working days from start → returns INCLUSIVE last working day */
  _addWorkingDays(startDate,dur){
    if(!this.proj.scheduleAroundNonWorking||dur<=0)return U.addDays(startDate,dur);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(startDate+'T12:00:00'),count=0;
    while(count<dur){
      const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++;
      if(count<dur)d.setDate(d.getDate()+1);
    }
    return U.iso(d) // inclusive: the last working day itself
  },
  /* Subtract N working days from a date → returns the start date */
  _subtractWorkingDays(fromDate,dur){
    if(!this.proj.scheduleAroundNonWorking||dur<=0)return U.addDays(fromDate,-dur);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(fromDate+'T12:00:00'),count=0;
    while(count<dur){d.setDate(d.getDate()-1);
      const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++;
    }
    return U.iso(d)
  },
  /* Count working days in a date range [start, end) exclusive end */
  _countWorkingDays(startDate,endDate){
    if(!this.proj.scheduleAroundNonWorking)return U.days(startDate,endDate);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(startDate+'T12:00:00');const end=new Date(endDate+'T12:00:00');
    let count=0;
    while(d<end){const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))count++;d.setDate(d.getDate()+1)}
    return count
  },
  /* Returns the effective end for dep calculations.
     All endDates are inclusive (last day of task/milestone) → +1 to become exclusive. */
  _depEnd(item){
    if(item.type!=='task')return U.addDays(item.date,1);
    return U.addDays(item.endDate,1)
  },
  /* Compute endDate for a task based on its durMode. Always returns inclusive last day. */
  _calcEndDate(item){
    const start=item.startDate;const dur=item.duration||0;
    if(this.proj.scheduleAroundNonWorking&&(item.durMode||'cal')!=='cal'){
      return this._addWorkingDays(start,dur) // inclusive last working day
    }
    return U.addDays(start,Math.max(0,dur-1)) // calendar days, inclusive last day
  },
  /* Apply lag in working days (positive=gap, negative=overlap). Lag 0 returns date unchanged. */
  _addLagWorkingDays(dateStr,lag,durMode){
    // Cal-mode tasks use calendar-day lag; work-mode uses working-day lag
    if(!this.proj.scheduleAroundNonWorking||lag===0)return U.addDays(dateStr,lag);
    if((durMode||'cal')==='cal')return U.addDays(dateStr,lag);
    const holSet=this._getNonWorkingHolidaySet();
    let d=new Date(dateStr+'T12:00:00');
    if(lag>0){
      // First normalize to the base working day (the +0 position)
      for(let i=0;i<365;i++){const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))break;d.setDate(d.getDate()+1)}
      // Then count lag additional working days forward
      let c=0;while(c<lag){d.setDate(d.getDate()+1);const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))c++}
    }else{
      let c=0;const abs=Math.abs(lag);while(c<abs){d.setDate(d.getDate()-1);const dow=d.getDay();if(dow!==0&&dow!==6&&!holSet.has(U.iso(d)))c++}
    }
    return U.iso(d)
  },
  /* Format duration label for timeline — shows W: #d, C: #d when applicable */
  _fmtDurLabel(it){
    if(!it.startDate||!it.endDate)return'';
    const isWork=this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
    // All endDates are inclusive, so calendar span = days + 1
    const calDays=U.days(it.startDate,it.endDate)+1;
    const workDays=it.duration||calDays;
    const fmt=it.durationFmt||'days';
    const fv=(d,f)=>{if(f==='weeks')return(d/5).toFixed(1)+'w';if(f==='months')return(d/21.74).toFixed(1)+'mo';return d+'d'};
    if(isWork&&calDays!==workDays){
      return 'W:'+fv(workDays,fmt)+' C:'+fv(calDays,fmt)
    }
    return fv(calDays,fmt)
  },
  /* Format drag delta with tiered units: +3d, +14d · 2w 0d, +65d · ~2.1mo, +195d · ~2.1q */
  _fmtDragDelta(n){
    const sign=n>=0?'+':'-',a=Math.abs(n),primary=sign+a+'d';
    if(a<14)return primary;
    if(a<60){const w=Math.floor(a/7),r=a%7;return primary+' · '+sign+w+'w'+(r?' '+r+'d':'')}
    if(a<180){const mo=(a/30.44).toFixed(1);return primary+' · '+sign+'~'+mo+'mo'}
    const q=(a/91.3).toFixed(1);return primary+' · '+sign+'~'+q+'q'
  },
  /* Format predecessors for CSV export — e.g. "Task A (FS+2d), Task B (SS)" */
  _fmtPreds(it){
    if(!it.deps?.length)return'';
    return it.deps.map(d=>{const pred=this.gi(this.depId(d));const name=pred?pred.name:'?';const type=this.depType(d);const lag=this.depLag(d);let s=name;if(type!=='FS'||lag!==0){s+=' ('+type;if(lag!==0)s+=(lag>0?'+':'')+lag+'d';s+=')'}return s}).join(', ')
  },
  /* Recalculate all work-mode task endDates after non-working day config changes.
     In auto-scheduled mode also re-runs the scheduling engine. */
  _recalcNonWorkingDays(){
    for(const it of this.proj.items){
      if(it.type==='task'&&(it.durMode||'cal')!=='cal'&&it.startDate&&it.duration){
        it.endDate=this._calcEndDate(it);
      }
    }
    if(this.proj.schedulingMode==='scheduled')this.runSchedule();
  },

  calcEarlyStart(item){
    let earliest=null;
    const dm=item.type==='task'?(item.durMode||'cal'):'work';
    for(const d of item.deps||[]){
      const pred=this.gi(this.depId(d));if(!pred)continue;
      const type=this.depType(d),lag=this.depLag(d);
      let cand=null;
      if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)cand=this._addLagWorkingDays(pEnd,lag,dm)}
      else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)cand=this._addLagWorkingDays(pStart,lag,dm)}
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);cand=dm!=='cal'?this._subtractWorkingDays(reqEnd,item.duration||0):U.addDays(reqEnd,-(item.duration||0))}}
      if(cand&&(!earliest||cand>earliest))earliest=cand}
    return earliest?(dm==='work'?this._skipNonWorking(earliest):earliest):null
  },

  /* Propagate changes downstream from selected items */
  propagateFrom(sourceIds){
    this.snap();
    // Collect all downstream reachable items
    const visited=new Set(sourceIds),queue=[...sourceIds],downstream=[];
    while(queue.length){const id=queue.shift();
      for(const it of this.proj.items){if(visited.has(it.id))continue;
        for(const d of it.deps||[]){if(this.depId(d)===id){visited.add(it.id);queue.push(it.id);downstream.push(it.id);break}}}}
    if(!downstream.length){this.toast('No downstream items to propagate');return}
    // Process in topological order
    const order=this.topoSort();
    let updated=0,skipped=0;
    for(const id of order){if(!downstream.includes(id))continue;
      const item=this.gi(id);if(!item)continue;
      if(item.pinned){skipped++;continue}
      const es=this.calcEarlyStart(item);if(!es)continue;
      const curStart=item.type==='task'?item.startDate:item.date;
      if(es===curStart)continue;
      if(item.type==='task'){item.startDate=es;item.endDate=this._calcEndDate(item)}
      else item.date=es;
      updated++}
    this.sched();this.autoSave();
    this.toast(`Propagated: ${updated} updated${skipped?', '+skipped+' pinned (skipped)':''}`)
  },

  /* Calculate float for all items (forward + backward pass) */
  calculateFloat(){
    const items=this.proj.items;
    const es=new Map(),ef=new Map(),ls=new Map(),lf=new Map();
    // Forward pass
    const order=this.topoSort();
    for(const id of order){const it=this.gi(id);if(!it)continue;
      const early=this.calcEarlyStart(it);
      const start=early||(it.type==='task'?it.startDate:it.date);
      if(!start){es.set(id,null);ef.set(id,null);continue}
      es.set(id,start);
      const dur=it.type==='task'?Math.max(0,it.duration||(it.startDate&&it.endDate?U.days(it.startDate,it.endDate)+1:0)):0;
      // Use _depEnd semantics: for work-mode tasks, compute inclusive end then +1 for exclusive
      if(it.type==='task'&&dur>0){
        const endIncl=this._calcEndDate({startDate:start,duration:dur,durMode:it.durMode});
        ef.set(id,this._depEnd({type:'task',endDate:endIncl,durMode:it.durMode}));
      }else{ef.set(id,it.type==='milestone'?U.addDays(start,1):U.addDays(start,dur))}}
    // Find project end
    let projEnd=null;
    for(const[,v]of ef)if(v&&(!projEnd||v>projEnd))projEnd=v;
    if(!projEnd)return;
    // Backward pass
    const rev=[...order].reverse();
    for(const id of rev){const it=this.gi(id);if(!it||!ef.get(id))continue;
      const dur=it.type==='task'?Math.max(0,it.duration||0):0;
      // Find successors
      const succs=items.filter(s=>s.deps?.some(d=>this.depId(d)===id));
      // Separate FS/FF constraints (constrain LF) from SS constraints (constrain LS directly)
      let minLF=null;let ssLS=null;
      if(succs.length){
        for(const s of succs){const sls=ls.get(s.id);if(!sls)continue;
          const link=s.deps.find(d=>this.depId(d)===id);if(!link)continue;
          const type=this.depType(link),lag=this.depLag(link);
          const sdm=s.type==='task'?(s.durMode||'cal'):'work';
          if(type==='FS'){
            const pEF=ef.get(id);
            if(pEF){let fwdContrib=this._addLagWorkingDays(pEF,lag,sdm);
              if(fwdContrib&&this.proj.scheduleAroundNonWorking&&sdm==='work')fwdContrib=this._skipNonWorking(fwdContrib);
              const cand=fwdContrib?U.addDays(pEF,U.days(fwdContrib,sls)):null;
              if(cand&&(!minLF||cand<minLF))minLF=cand}
          }else if(type==='SS'){
            // SS constrains pred START: LS(pred) = LS(succ) - lag
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!ssLS||cand<ssLS))ssLS=cand;
          }else if(type==='FF'){
            const pEF=ef.get(id);
            if(pEF){let fwdContrib=this._addLagWorkingDays(pEF,lag,sdm);
              if(fwdContrib&&this.proj.scheduleAroundNonWorking&&sdm==='work')fwdContrib=this._skipNonWorking(fwdContrib);
              const sDur=s.type==='task'?Math.max(0,s.duration||0):0;
              let sLF;
              if(s.type==='task'&&this.proj.scheduleAroundNonWorking&&(s.durMode||'cal')!=='cal'){
                const sEndIncl=this._addWorkingDays(sls,sDur);
                sLF=U.addDays(sEndIncl,1);
              }else{sLF=U.addDays(sls,sDur)}
              const cand=fwdContrib?U.addDays(pEF,U.days(fwdContrib,sLF)):null;
              if(cand&&(!minLF||cand<minLF))minLF=cand}
          }
        }
      }
      // LF from FS/FF constraints, or projEnd if none
      lf.set(id,minLF||projEnd);
      // Compute LS from LF - dur
      const lfVal=lf.get(id);let lsVal;
      if(it.type==='task'&&this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')!=='cal'){
        lsVal=this._subtractWorkingDays(lfVal,dur);
      }else{lsVal=U.addDays(lfVal,-dur)}
      // Tighten LS from SS constraints
      if(ssLS&&ssLS<lsVal)lsVal=ssLS;
      // Milestones: _depEnd adds +1, so backward pass LS needs -1 to compensate
      if(it.type==='milestone')lsVal=U.addDays(lsVal,-1);
      ls.set(id,lsVal)}
    // Calculate float
    for(const it of items){
      const e=es.get(it.id),l=ls.get(it.id);
      if(e&&l)it._float=U.days(e,l);
      else it._float=null}
  },

  /* Get set of items with violated dep links (successor starts too early) */
  getViolatedDepIds(){
    const violated=new Set();
    for(const item of this.proj.items){
      const dm=item.type==='task'?(item.durMode||'cal'):'work';
      for(const d of item.deps||[]){
        const pred=this.gi(this.depId(d));if(!pred)continue;
        const type=this.depType(d),lag=this.depLag(d);
        const iStart=item.type==='task'?item.startDate:item.date;
        let required=null;
        if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)required=this._addLagWorkingDays(pEnd,lag,dm)}
        else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)required=this._addLagWorkingDays(pStart,lag,dm)}
        else if(type==='FF'){const pEnd=this._depEnd(pred);const iEnd=this._depEnd(item);if(pEnd&&iEnd&&iEnd<this._addLagWorkingDays(pEnd,lag,dm))violated.add(item.id);continue}
        if(required&&iStart&&iStart<required)violated.add(item.id)}}
    return violated
  },

  /* ===== SCHEDULING ENGINE (Phase 2) ===== */
  topoSort(){
    const items=this.proj.items,idSet=new Set(items.map(i=>i.id));
    const adj=new Map(),inDeg=new Map();
    items.forEach(i=>{adj.set(i.id,[]);inDeg.set(i.id,0)});
    items.forEach(i=>{for(const d of i.deps||[]){const pid=this.depId(d);if(idSet.has(pid)){adj.get(pid).push(i.id);inDeg.set(i.id,(inDeg.get(i.id)||0)+1)}}});
    const q=[...items.filter(i=>(inDeg.get(i.id)||0)===0).map(i=>i.id)],order=[];
    while(q.length){const id=q.shift();order.push(id);for(const sid of adj.get(id)||[]){inDeg.set(sid,(inDeg.get(sid)||0)-1);if(inDeg.get(sid)===0)q.push(sid)}}
    return order
  },
  _computeEarliestStart(item){
    let earliest=null;
    const dm=item.type==='task'?(item.durMode||'cal'):'work';
    for(const d of item.deps||[]){
      const pred=this.gi(this.depId(d));if(!pred)continue;
      const type=this.depType(d),lag=this.depLag(d);
      let candidate=null;
      if(type==='FS'){const pEnd=this._depEnd(pred);if(pEnd)candidate=this._addLagWorkingDays(pEnd,lag,dm)}
      else if(type==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)candidate=this._addLagWorkingDays(pStart,lag,dm)}
      else if(type==='FF'){const pEnd=this._depEnd(pred);if(pEnd){const reqEnd=this._addLagWorkingDays(pEnd,lag,dm);candidate=dm!=='cal'?this._subtractWorkingDays(reqEnd,item.duration||0):U.addDays(reqEnd,-(item.duration||0))}}
      if(candidate&&(!earliest||candidate>earliest))earliest=candidate;
    }
    return earliest?(dm==='work'?this._skipNonWorking(earliest):earliest):null
  },
  /* Run scheduling engine — returns array of changes (dry run) or count of applied changes */
  _runSchedulePass(dryRun){
    const order=this.topoSort(),changes=[];let applied=0;
    for(const id of order){
      const it=this.gi(id);if(!it)continue;
      if(!it.deps?.length)continue; // root items keep their date
      if(it.pinned)continue;
      const earliest=this._computeEarliestStart(it);
      if(!earliest)continue;
      const curStart=it.type==='task'?it.startDate:it.date;
      if(curStart===earliest)continue; // no change needed
      if(dryRun){
        const newEnd=it.type==='task'?this._calcEndDate({startDate:earliest,duration:it.duration||0,durMode:it.durMode}):earliest;
        changes.push({id,name:it.name,type:it.type,oldStart:curStart,newStart:earliest,oldEnd:it.type==='task'?it.endDate:curStart,newEnd,shift:earliest>curStart?U.days(curStart,earliest):-U.days(earliest,curStart),duration:it.duration||0,durMode:it.durMode||'cal'})
      }else{
        if(it.type==='task'){it.startDate=earliest;it.endDate=this._calcEndDate(it)}
        else it.date=earliest;
        applied++;
      }
    }
    return dryRun?changes:applied
  },
  runSchedule(){
    if(this.proj.schedulingMode!=='scheduled')return;
    for(let pass=0;pass<5;pass++){
      const n=this._runSchedulePass(false);
      if(n===0)break; // stable
    }
  },
  /* Preview what would change switching to scheduled mode */
  previewScheduleTransition(convertToWork){
    const backup=U.deep(this.proj.items);
    // Optionally convert all tasks to work-day mode first
    if(convertToWork){
      this.proj.items.forEach(it=>{
        if(it.type==='task'&&(it.durMode||'cal')==='cal'){
          it.durMode='work';
          it.endDate=this._calcEndDate(it);
        }
      })
    }
    // Run engine passes
    for(let pass=0;pass<5;pass++){
      const n=this._runSchedulePass(false);
      if(n===0)break;
    }
    // Compute diff between backup and current
    const changes=[];
    for(let i=0;i<this.proj.items.length;i++){
      const cur=this.proj.items[i],old=backup[i];
      const curS=cur.type==='task'?cur.startDate:cur.date;
      const oldS=old.type==='task'?old.startDate:old.date;
      const curE=cur.type==='task'?cur.endDate:cur.date;
      const oldE=old.type==='task'?old.endDate:old.date;
      const moved=curS!==oldS;
      const endChanged=curE!==oldE;
      if(moved||endChanged){
        const shift=moved?U.days(oldS,curS):0;
        const isWorkMode=cur.type==='task'&&this.proj.scheduleAroundNonWorking&&(cur.durMode||'cal')==='work';
        const calDays=cur.type==='task'?U.days(cur.startDate,cur.endDate)+1:0;
        changes.push({id:cur.id,name:cur.name,type:cur.type,
          oldStart:oldS,newStart:curS,oldEnd:oldE,newEnd:curE,
          shift,pinned:cur.pinned,
          duration:cur.duration||0,durMode:cur.durMode||'cal',calDays,
          modeChanged:convertToWork&&old.durMode==='cal'&&cur.durMode==='work'})
      }
    }
    // Restore original
    this.proj.items=backup;
    return changes
  },
  showScheduleTransition(){
    try{
    const convertCb=document.getElementById('sched-tr-convert');
    if(convertCb)convertCb.checked=true;
    const self=this;
    const buildPreview=()=>{
      const convert=convertCb?convertCb.checked:true;
      const changes=self.previewScheduleTransition(convert);
      // Build summary
      const pinned=changes.filter(c=>c.pinned).length;
      let summary=`<div style="display:flex;gap:16px;flex-wrap:wrap">`;
      summary+=`<div><strong>${self.proj.items.length}</strong> total items</div>`;
      summary+=`<div><strong style="color:var(--danger)">${changes.length}</strong> will change</div>`;
      summary+=`<div><strong>${self.proj.items.length-changes.length}</strong> staying</div>`;
      if(pinned)summary+=`<div><strong>${pinned}</strong> pinned</div>`;
      summary+=`</div>`;
      if(changes.length){
        const maxShift=changes.reduce((m,c)=>Math.abs(c.shift)>Math.abs(m.shift)?c:m,changes[0]);
        if(maxShift.shift)summary+=`<div style="margin-top:6px;color:var(--tx3)">⚠ Largest shift: <strong>${U.esc(maxShift.name)}</strong> moves ${maxShift.shift>0?'+':''}${maxShift.shift}d</div>`;
      }
      const sumEl=document.getElementById('sched-tr-summary');if(sumEl)sumEl.innerHTML=summary;
      const f=self.proj.dateFormat;
      let list=`<table style="width:100%;border-collapse:collapse"><tr style="background:var(--bg2);font-weight:600;font-size:10px"><td style="padding:4px 6px">Item</td><td style="padding:4px 6px">Duration</td><td style="padding:4px 6px">Start</td><td style="padding:4px 6px">End</td><td style="padding:4px 6px;text-align:right">Shift</td></tr>`;
      changes.forEach(c=>{
        const durLabel=c.type==='task'?`${c.duration}d <span style="color:var(--tx3)">${c.durMode==='work'?'work':'cal'}${c.durMode==='work'&&c.calDays?` <span style="opacity:.6">(${c.calDays}d cal)</span>`:''}</span>`:'—';
        const endOld=c.type==='task'?U.fmt(c.oldEnd,f):'';
        const endNew=c.type==='task'?U.fmt(c.newEnd,f):'';
        const endChanged=c.oldEnd!==c.newEnd;
        const startChanged=c.oldStart!==c.newStart;
        list+=`<tr style="border-top:1px solid var(--brd)">
          <td style="padding:4px 6px">${U.esc(c.name)}${c.modeChanged?' <span style="font-size:9px;background:rgba(46,134,171,.15);color:var(--acc);padding:1px 4px;border-radius:3px">→ work</span>':''}</td>
          <td style="padding:4px 6px;font-size:10px">${durLabel}</td>
          <td style="padding:4px 6px;font-size:10px">${startChanged?`<span style="color:var(--tx3);text-decoration:line-through">${U.fmt(c.oldStart,f)}</span> → ${U.fmt(c.newStart,f)}`:U.fmt(c.newStart,f)}</td>
          <td style="padding:4px 6px;font-size:10px">${endChanged?`<span style="color:var(--tx3);text-decoration:line-through">${endOld}</span> → ${endNew}`:endNew||'—'}</td>
          <td style="padding:4px 6px;text-align:right;color:${c.shift>0?'var(--danger)':c.shift<0?'var(--acc)':'var(--tx3)'}">${c.shift?((c.shift>0?'+':'')+c.shift+'d'):'—'}</td></tr>`
      });
      list+=`</table>`;
      const listEl=document.getElementById('sched-tr-list');if(listEl)listEl.innerHTML=list;
      self._schedTransitionChanges=changes;
      self._schedConvertToWork=convert;
      // If no changes at all, auto-apply
      if(!changes.length){
        self.snap();self.proj.schedulingMode='scheduled';
        if(convert)self.proj.items.forEach(it=>{if(it.type==='task'&&(it.durMode||'cal')==='cal'){it.durMode='work';it.endDate=self._calcEndDate(it)}});
        self.runSchedule();self.sched();self.autoSave();
        self.toast('✅ Auto-Scheduled mode active');
        return false // signal: don't show modal
      }
      return true // signal: show modal
    };
    const shouldShow=buildPreview();
    if(!shouldShow)return;
    // Wire checkbox to rebuild preview
    if(convertCb){convertCb.onchange=()=>buildPreview()}
    const trModal=document.getElementById('sched-transition-modal');
    if(trModal){const mc=trModal.querySelector('.modal-content');if(mc){mc.style.position='';mc.style.margin='';mc.style.left='';mc.style.top='';mc.style.transform=''}trModal.classList.remove('hidden')}
    }catch(err){
      console.error('[Timeline Studio] showScheduleTransition error:',err);
      this.snap();this.proj.schedulingMode='scheduled';this.runSchedule();this.sched();this.autoSave();
      this.toast('Switched to Auto-Scheduled (preview unavailable)');
    }
  },
  toggleSchedulingMode(){
    if(this.proj.schedulingMode==='scheduled'){
      this.snap();this.proj.schedulingMode='manual';
      this.sched();this.autoSave();
      this.toast('Switched to Manual mode — all dates preserved');
    }else{
      // Switch to scheduled via transition preview
      this.showScheduleTransition();
    }
  },
  applyScheduleTransition(){
    this.snap();
    // Convert to working days if checkbox was checked
    if(this._schedConvertToWork){
      this.proj.items.forEach(it=>{
        if(it.type==='task'&&(it.durMode||'cal')==='cal'){
          it.durMode='work';
          it.endDate=this._calcEndDate(it);
        }
      })
    }
    this.proj.schedulingMode='scheduled';
    this.runSchedule();
    document.getElementById('sched-transition-modal').classList.add('hidden');
    this.sched();this.autoSave();
    const n=this._schedTransitionChanges?.length||0;
    const converted=this._schedConvertToWork?' (durations → working days)':'';
    this.toast(`Switched to Auto-Scheduled mode (${n} items changed${converted})`)
  },
  pinAllAndStayManual(){
    if(!this._schedTransitionChanges?.length)return;
    this.snap();
    const ids=new Set(this._schedTransitionChanges.map(c=>c.id));
    this.proj.items.forEach(it=>{if(ids.has(it.id))it.pinned=true});
    document.getElementById('sched-transition-modal').classList.add('hidden');
    this.sched();this.autoSave();
    this.toast(`Pinned ${ids.size} items — unpin selectively, then switch modes`)
  },


  makeDraggable(el,handle){
    let ox,oy;
    handle.addEventListener('mousedown',e=>{if(e.target.closest('.modal-close'))return;e.preventDefault();const r=el.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;
      const mv=ev=>{el.style.left=(ev.clientX-ox)+'px';el.style.top=(ev.clientY-oy)+'px';el.style.right='auto'};
      const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
      document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)})
  },


  /* ===== BINDINGS ===== */
  bind(){
    const on=(id,fn)=>{const e=document.getElementById(id);if(e)e.addEventListener('click',fn)};
    // File dropdown
    on('btn-file-menu',()=>{
      this.closeAllDD();
      this.$.file_dropdown.classList.toggle('hidden');this.posDD(this.$.file_dropdown)
    });
    on('btn-open-recent',e=>{e.stopPropagation();this._toggleMRU()});
    on('btn-new',()=>{this.$.file_dropdown.classList.add('hidden');this.newProjAct()});
    on('btn-save',()=>{this.$.file_dropdown.classList.add('hidden');this._shareMode=false;this.saveFile()});
    on('btn-save-as',()=>{this.$.file_dropdown.classList.add('hidden');this._shareMode=false;this.saveFile(true)});
    on('btn-share',()=>{this.$.file_dropdown.classList.add('hidden');this.shareProject()});
    on('btn-share-copy',async()=>{
      const url=document.getElementById('share-url-out')?.value;
      if(!url)return;
      const name=this.proj.name||'Untitled';
      try{
        const html='<a href="'+url.replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'">Timeline Studio: '+U.esc(name)+'</a>';
        await navigator.clipboard.write([new ClipboardItem({
          'text/html':new Blob([html],{type:'text/html'}),
          'text/plain':new Blob([url],{type:'text/plain'})
        })]);
        this.toast('Link copied!');
      }catch(e){
        try{await navigator.clipboard.writeText(url);this.toast('Link copied!')}
        catch(e2){this.toast('Copy failed — select and copy manually','error')}
      }
    });
    on('btn-share-banner-save',()=>{this._shareMode=false;this._dismissShareBanner();this.saveFile(true)});
    on('btn-share-banner-dismiss',()=>this._dismissShareBanner());
    // Add dropdown
    on('btn-add-menu',()=>{this.closeAllDD();this.$.add_dropdown.classList.toggle('hidden');this.posDD(this.$.add_dropdown)});
    on('btn-add-ms',()=>{this.$.add_dropdown.classList.add('hidden');this.addItem('milestone')});
    on('btn-add-task',()=>{this.$.add_dropdown.classList.add('hidden');this.addItem('task')});
    on('btn-add-sw',()=>{this.$.add_dropdown.classList.add('hidden');this.showSwM()});
    on('btn-add-import',()=>{this.$.add_dropdown.classList.add('hidden');this.showPaste()});
    on('btn-undo',()=>this.undo());on('btn-redo',()=>this.redo());
    // View dropdown
    on('btn-view-menu',()=>{this.closeAllDD();this.$.view_dropdown.classList.toggle('hidden');this.posDD(this.$.view_dropdown);const vdf0=document.getElementById('view-dep-filter');if(vdf0)vdf0.value=this.proj.showDeps?(this.proj.depFilter||'all'):'off'});
    on('btn-today',()=>{this.$.view_dropdown.classList.add('hidden');this.goToday()});
    on('btn-fullscreen',()=>{this.$.view_dropdown.classList.add('hidden');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>this.toast('Fullscreen not supported','error'))});
    on('btn-show-float',()=>{this.$.view_dropdown.classList.add('hidden');this.proj.showFloat=!this.proj.showFloat;document.getElementById('btn-show-float')?.classList.toggle('active',this.proj.showFloat);this.sched();this.autoSave();this.toast(this.proj.showFloat?'Float labels ON':'Float labels OFF')});
    const vdf=document.getElementById('view-dep-filter');if(vdf)vdf.onchange=()=>{this.$.view_dropdown.classList.add('hidden');const val=vdf.value;if(val==='off'){this.proj.showDeps=false}else{this.proj.showDeps=true;this.proj.depFilter=val}this.sched();this.autoSave();this.toast('Dependencies: '+(val==='off'?'Off':val==='all'?'All':'Within swimlane'))};
    on('btn-zoom100',()=>this.doZoomTo(100));
    on('btn-fit',()=>this.sel.length?this.fitToSelection():this.fitToContent());
    on('btn-expand-all',()=>{this.snap();this.proj.swimlanes.forEach(sl=>{sl.collapsed='expanded';if(sl.subSwimlanes)sl.subSwimlanes.forEach(ss=>ss.collapsed='expanded')});this.sched();this.autoSave();this.toast('All swimlanes expanded')});
    on('btn-collapse-all',()=>{this.snap();this.proj.swimlanes.forEach(sl=>sl.collapsed='collapsed');this.sched();this.autoSave();this.toast('All swimlanes collapsed')});
    on('btn-autofit-heights',()=>{this.$.view_dropdown.classList.add('hidden');this.autoFitHeights()});
    on('btn-zi',()=>this.doZoom(5));on('btn-zo',()=>this.doZoom(-5));
    this.$.zoom_lbl.addEventListener('wheel',e=>{e.preventDefault();this.doZoom(e.deltaY<0?5:-5)},{passive:false});
    /* Ctrl+Scroll zoom on timeline body: Ctrl=±5%, Ctrl+Shift=±1% */
    this.$.tl_body_scroll.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();const d=e.shiftKey?1:5;this.doZoom(e.deltaY<0?d:-d)},{passive:false});
    // Tools dropdown
    on('btn-tools-menu',()=>{this.closeAllDD();this.$.tools_dropdown.classList.toggle('hidden');this.posDD(this.$.tools_dropdown)});
    on('btn-settings',()=>this.showSettings());
    on('btn-help',()=>this.showHelp());
    on('btn-collapse',()=>this.collapsePanel(false));
    on('btn-lock-collapse',()=>this.collapsePanel(true));
    this.$.panel_tab.addEventListener('click',()=>this.expandPanel());
    on('btn-lock',()=>{this.$.tools_dropdown.classList.add('hidden');this.proj.locked=!this.proj.locked;this.proj.lockH=this.proj.locked;this.proj.lockV=this.proj.locked;this.sched();this.autoSave();this.toast(this.proj.locked?'Locked':'Unlocked')});
    on('btn-hide',()=>{this.$.tools_dropdown.classList.add('hidden');this.proj.hideMode=!this.proj.hideMode;this.sched();this.toast(this.proj.hideMode?'Hiding hidden':'Showing all')});
    on('btn-crit-path',()=>{this.$.tools_dropdown.classList.add('hidden');this.toggleCritPath()});
    on('btn-propagate-sel',()=>{this.$.tools_dropdown.classList.add('hidden');if(document.getElementById('btn-propagate-sel')?.classList.contains('dd-disabled'))return;if(!this.sel.length){this.toast('Select items first','error');return}if(this.proj.schedulingMode==='scheduled'){this.toast('In Auto-Scheduled mode, dates update automatically','info');return}this.propagateFrom(this.sel)});
    on('btn-toggle-sched',()=>{this.$.tools_dropdown.classList.add('hidden');this.toggleSchedulingMode()});
    on('btn-lasso',()=>{this.$.tools_dropdown.classList.add('hidden');this._scDispatch.toggleLasso.call(this)});
    on('btn-pan',()=>{this.$.tools_dropdown.classList.add('hidden');this._scDispatch.togglePan.call(this)});
    // Screenshot items
    on('btn-snap-vp',()=>{this.$.tools_dropdown.classList.add('hidden');this.copyScreenshot(true)});
    on('btn-snap-full',()=>{this.$.tools_dropdown.classList.add('hidden');this.copyScreenshot(false)});
    document.getElementById('tools-sc-link')?.addEventListener('click',e=>{e.preventDefault();this.$.tools_dropdown.classList.add('hidden');this.showSettingsShortcuts()});
    /* Format Painter split button */
    {const fpMain=document.getElementById('btn-fp');
    const fpDD=document.getElementById('btn-fp-dd');
    if(fpMain){fpMain.addEventListener('click',()=>{
      if(fpMain.classList.contains('fp-disabled'))return;
      if(this._fpMode||this._fpStaged)this.deactivateFP();else this.stageFP();
    })}
    if(fpDD){fpDD.addEventListener('click',e=>{
      e.stopPropagation();
      const pop=document.getElementById('fp-popover');
      if(pop&&!pop.classList.contains('hidden')){this._hideFPPopover()}
      else{this._showFPPopover()}
    })}}
    /* Format Painter popover events */
    {const fpPop=document.getElementById('fp-popover');
    if(fpPop){
      fpPop.addEventListener('change',e=>{const cb=e.target.closest('[data-fp]');if(!cb)return;
        const all=[...fpPop.querySelectorAll('[data-fp]')];const sel=all.filter(c=>c.checked).map(c=>c.dataset.fp);
        this._saveFPProps(sel);
      });
      fpPop.querySelector('.fp-pop-close')?.addEventListener('click',()=>{if(this._fpStaged)this.deactivateFP();else this._hideFPPopover()});
      fpPop.querySelectorAll('.fp-pop-link').forEach(b=>{b.addEventListener('click',()=>{
        const mode=b.dataset.mode;fpPop.querySelectorAll('[data-fp]').forEach(cb=>{cb.checked=mode==='all'});
        this._saveFPProps(mode==='all'?FP_PROPS_DEF.map(p=>p.key):[]);
      })});
      const applyOnce=document.getElementById('fp-apply-once');
      const applyMany=document.getElementById('fp-apply-many');
      if(applyOnce)applyOnce.addEventListener('click',()=>{
        if(applyOnce.classList.contains('fp-act-disabled'))return;
        if(!this._fpStaged)this.stageFP();
        if(this._fpStaged)this.activateFP(false);
      });
      if(applyMany)applyMany.addEventListener('click',()=>{
        if(applyMany.classList.contains('fp-act-disabled'))return;
        if(!this._fpStaged)this.stageFP();
        if(this._fpStaged)this.activateFP(true);
      });
    }}
    document.querySelectorAll('.view-btn').forEach(b=>{b.onclick=()=>this.setView(b.dataset.view)});
    /* Mode indicator pill events */
    if(this.$.pill_group){
      const pg=this.$.pill_group;
      pg.addEventListener('click',e=>{const btn=e.target.closest('.pill-x');if(!btn)return;const p=btn.dataset.pill;if(p==='lock'){this.proj.locked=false;this.proj.lockH=false;this.proj.lockV=false;this.sched();this.autoSave();this.toast('Unlocked')}else if(p==='hide'){this.proj.hideMode=false;this.sched();this.toast('Showing all')}else if(p==='auto'){this.toggleSchedulingMode()}else if(p==='fp'){this.deactivateFP()}else if(p==='sel'){this.sel=[];this.closePanel();this.sched()}});
      pg.addEventListener('mouseenter',()=>{clearTimeout(this._pillHoverTimer);pg.classList.add('pill-hover')});
      pg.addEventListener('mouseleave',()=>{this._pillHoverTimer=setTimeout(()=>pg.classList.remove('pill-hover'),200)});
    }
    this.$.ts_sel.onchange=e=>{this.snap();const prev=this.proj.timescale;this.proj.timescale=e.target.value;if(e.target.value==='days'){const days=U.days(this.proj.timelineStart,this.proj.timelineEnd);if(days>365)this.toast('Days scale works best for timelines under 6 months','info')}if(prev!==e.target.value)this.smartZoomForScale(e.target.value);else this.sched()};
    this.$.hl_sel.onchange=e=>{this.snap();this.proj.headerLayers=+e.target.value;this.sched()};
    const mfSel=document.getElementById('month-fmt-sel');
    const qfSel=document.getElementById('quarter-fmt-sel');
    if(mfSel)mfSel.onchange=e=>{this.snap();this.proj.monthFormat=e.target.value;const hp=document.getElementById('hdr-pop-month-fmt');if(hp)hp.value=e.target.value;this.sched();this.autoSave()};
    if(qfSel)qfSel.onchange=e=>{this.snap();this.proj.quarterFormat=e.target.value;const hp=document.getElementById('hdr-pop-quarter-fmt');if(hp)hp.value=e.target.value;this.sched();this.autoSave()};
    const dfSel=document.getElementById('day-fmt-sel');
    const dwSel=document.getElementById('day-width-sel');
    if(dfSel)dfSel.onchange=e=>{this.snap();this.proj.dayLabelFormat=e.target.value;const hp=document.getElementById('hdr-pop-day-fmt');if(hp)hp.value=e.target.value;this.sched();this.autoSave()};
    if(dwSel)dwSel.onchange=e=>{this.snap();this.proj.dayColumnWidth=e.target.value;const hp=document.getElementById('hdr-pop-dayw-fmt');if(hp)hp.value=e.target.value;this.sched();this.autoSave()};
    this.$.file_input.onchange=e=>this.handleOpen(e);
    on('btn-s-apply',()=>this.applySettings());on('btn-save-sw',()=>this.saveSwM());on('btn-del-sw',()=>this.delSwM());
    on('btn-sched-apply',()=>this.applyScheduleTransition());
    on('btn-sched-pin-all',()=>this.pinAllAndStayManual());
    // Draggable transition modal
    {const hdr=document.getElementById('sched-tr-header');
    if(hdr){const mc=hdr.closest('.modal-content');
      hdr.addEventListener('mousedown',e=>{
        if(e.target.closest('button'))return;
        const r=mc.getBoundingClientRect();
        const ox=e.clientX-r.left,oy=e.clientY-r.top;
        mc.style.position='fixed';mc.style.margin='0';mc.style.left=r.left+'px';mc.style.top=r.top+'px';mc.style.transform='none';
        const mv=ev=>{mc.style.left=Math.max(0,Math.min(window.innerWidth-100,ev.clientX-ox))+'px';mc.style.top=Math.max(0,Math.min(window.innerHeight-40,ev.clientY-oy))+'px'};
        const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
        document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
      })}}
    // Status impact modal — draggable + buttons
    {const siHdr=document.getElementById('status-impact-header');
    if(siHdr){const mc=siHdr.closest('.modal-content');
      siHdr.addEventListener('mousedown',e=>{
        if(e.target.closest('button'))return;
        const r=mc.getBoundingClientRect();
        const ox=e.clientX-r.left,oy=e.clientY-r.top;
        mc.style.position='fixed';mc.style.margin='0';mc.style.left=r.left+'px';mc.style.top=r.top+'px';mc.style.transform='none';
        const mv=ev=>{mc.style.left=Math.max(0,Math.min(window.innerWidth-100,ev.clientX-ox))+'px';mc.style.top=Math.max(0,Math.min(window.innerHeight-40,ev.clientY-oy))+'px'};
        const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
        document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
      })}}
    on('btn-status-impact-apply',()=>this.applyStatusChanges());
    on('btn-status-impact-cancel',()=>{document.getElementById('status-impact-modal').classList.add('hidden')});
    on('btn-status-impact-close',()=>{document.getElementById('status-impact-modal').classList.add('hidden')});
    on('btn-add-ssw',()=>this.addSubSw());on('btn-dt-paste',()=>this.showPaste());on('btn-do-paste',()=>this.doPaste());
    this.$.paste_ta.oninput=()=>this.previewPaste();
    on('imp-adv-toggle',()=>this.toggleAdvImport());
    on('btn-imp-file',()=>this.$.imp_file_input.click());
    if(this.$.imp_file_input)this.$.imp_file_input.onchange=e=>this.handleImportFile(e);
    on('btn-imp-do',()=>this.doAdvancedImport());
    on('btn-dt-add',()=>this.addItem('milestone'));on('btn-dt-del',()=>this.deleteSel());on('btn-dt-dup',()=>this.dupSel());
    on('btn-clr-sel-deps',()=>this.clearSelDeps());
    on('btn-clr-all-deps',()=>{if(confirm('Remove ALL deps?')){this.snap();this.proj.items.forEach(i=>i.deps=[]);this.sched();this.autoSave()}});
    on('btn-exp-svg',()=>{document.getElementById('settings-modal').classList.add('hidden');this.exportSVG()});
    on('btn-exp-png',()=>{document.getElementById('settings-modal').classList.add('hidden');this.exportPNG()});
    on('btn-exp-csv',()=>{document.getElementById('settings-modal').classList.add('hidden');this.exportDataCSV()});
    on('btn-exp-json',()=>{document.getElementById('settings-modal').classList.add('hidden');this.saveFile()});
    on('btn-do-apply',()=>this.doApply());
    on('btn-np-create',()=>this.createFromTemplate());
    on('btn-dt-export',()=>this.showDataExport());
    on('btn-de-csv',()=>this.doDataExport('file'));on('btn-de-clip',()=>this.doDataExport('clipboard'));
    on('btn-sw-up',()=>this.reorderSw(-1));on('btn-sw-dn',()=>this.reorderSw(1));
    // Search
    const searchDeb=U.deb(()=>this.doSearch(),200);
    this.$.data_search.oninput=()=>{searchDeb();this.$.ds_clear.classList.toggle('hidden',!this.$.data_search.value)};
    on('ds-prev',()=>this.searchNav(-1));on('ds-next',()=>this.searchNav(1));
    on('ds-clear',()=>{this.$.data_search.value='';this.$.ds_clear.classList.add('hidden');this.doSearch()});
    on('btn-adv-search',()=>{document.getElementById('as-term').value='';document.getElementById('as-results').textContent='';this.showModal('adv-search-modal')});
    on('btn-as-select',()=>this.doAdvSearch(false));on('btn-as-add',()=>this.doAdvSearch(true));
    // Filter bar
    on('btn-dt-filter',()=>{const bar=this.$.data_filter_bar,fb=document.getElementById('btn-dt-filter');bar.classList.toggle('hidden');if(fb)fb.classList.toggle('filter-active',!bar.classList.contains('hidden'));if(!bar.classList.contains('hidden'))this._populateFilterDropdowns()});
    const fltKeys=['flt_type','flt_name','flt_owner','flt_swim','flt_sub','flt_notes','flt_start','flt_end','flt_status'];
    const updateFltInd=()=>{let count=0;fltKeys.forEach(k=>{if(this.$[k]){const has=!!this.$[k].value;this.$[k].classList.toggle('has-value',has);if(has)count++}});const fb=document.getElementById('btn-dt-filter');if(fb){let badge=fb.querySelector('.filter-count');if(count>0){if(!badge){badge=document.createElement('span');badge.className='filter-count';fb.appendChild(badge)}badge.textContent=count}else if(badge)badge.remove()}};
    const fltDeb=U.deb(()=>{this.sched(false,true);updateFltInd()},200);
    const fltImm=()=>{this.sched(false,true);updateFltInd()};
    fltKeys.forEach(k=>{if(this.$[k]){if(this.$[k].tagName==='SELECT')this.$[k].onchange=fltImm;else this.$[k].oninput=fltDeb}});
    on('btn-flt-clear',()=>{fltKeys.forEach(k=>{if(this.$[k])this.$[k].value=''});updateFltInd();this.sched(false,true)});
    // Settings toggles
    document.getElementById('project-name-display').addEventListener('dblclick',()=>{document.getElementById('pn-name').value=this.proj.name;this.showModal('pname-modal');document.getElementById('pn-name').focus()});
    /* F53: Click file subtitle to reconnect to stored handle */
    if(this.$.file_subtitle){this.$.file_subtitle.onclick=async(e)=>{e.stopPropagation();if(this._fileHandle)return;const ok=await this._tryReconnect();if(!ok)this.openFile()}}
    on('btn-pn-save',()=>{this.snap();this.proj.name=document.getElementById('pn-name').value.trim()||'Untitled';document.getElementById('pname-modal').classList.add('hidden');this.sched();this.autoSave()});
    document.getElementById('s-watermark').onchange=function(){document.getElementById('watermark-opts').classList.toggle('hidden',!this.checked)};
    document.getElementById('s-deps').onchange=function(){document.getElementById('deps-opts').classList.toggle('hidden',!this.checked)};
    document.getElementById('s-show-weekends').onchange=function(){document.getElementById('weekend-inline').classList.toggle('hidden',!this.checked);document.getElementById('weekend-opts').classList.toggle('hidden',!this.checked)};
    document.getElementById('s-show-holidays').onchange=function(){document.getElementById('holiday-inline').classList.toggle('hidden',!this.checked);document.getElementById('holiday-opts').classList.toggle('hidden',!this.checked)};
    const holOpSlider=document.getElementById('s-hol-opacity');if(holOpSlider)holOpSlider.oninput=function(){document.getElementById('s-hol-opval').textContent=this.value+'%';const b=document.getElementById('s-hol-color');if(b)b.style.opacity=(0.3+(this.value/40)*0.7).toFixed(2)};
    document.getElementById('btn-hol-add').onclick=()=>{const box=document.getElementById('hol-add-box');box.classList.toggle('hidden');if(!box.classList.contains('hidden')){document.getElementById('hol-import-box').classList.add('hidden');document.getElementById('hol-add-name').value='';document.getElementById('hol-add-start').value='';document.getElementById('hol-add-end').value='';document.getElementById('hol-add-name').focus()}};
    document.getElementById('btn-hol-do-add').onclick=()=>this.addSingleHoliday();
    document.getElementById('hol-add-name').addEventListener('keydown',e=>{if(e.key==='Enter')this.addSingleHoliday()});
    document.getElementById('hol-add-end').addEventListener('keydown',e=>{if(e.key==='Enter')this.addSingleHoliday()});
    document.getElementById('btn-hol-import').onclick=()=>{const box=document.getElementById('hol-import-box');box.classList.toggle('hidden');if(!box.classList.contains('hidden')){document.getElementById('hol-add-box').classList.add('hidden');document.getElementById('hol-paste-ta').focus()}};
    document.getElementById('btn-hol-clear').onclick=()=>{if(confirm('Remove all holidays?')){this.snap();this.proj.holidays=[];this.renderHolList();this._recalcNonWorkingDays();this.sched();this.autoSave()}};
    document.getElementById('btn-hol-do-import').onclick=()=>this.importHolidays();
    document.getElementById('btn-sc-reset').onclick=()=>{this._pendingShortcuts={};this._hideScMsg();this.renderScList();this.toast('Shortcuts reset to defaults')};
    document.getElementById('hol-paste-ta').oninput=()=>{const r=this.parseHolidays(document.getElementById('hol-paste-ta').value);document.getElementById('hol-paste-prev').textContent=r.length?`Found ${r.length} holiday${r.length>1?'s':''}`:''};
    const opSlider=document.getElementById('s-wknd-opacity');if(opSlider)opSlider.oninput=function(){document.getElementById('s-wknd-opval').textContent=this.value+'%';const b=document.getElementById('s-wknd-color-box');if(b)b.style.opacity=(0.3+(this.value/30)*0.7).toFixed(2)};
    document.querySelectorAll('.theme-card').forEach(c=>{c.onclick=()=>{document.querySelectorAll('.theme-card').forEach(x=>x.classList.remove('active'));c.classList.add('active');this.proj.theme=c.dataset.theme;this.applyTheme()}});
    document.querySelectorAll('[data-close-modal]').forEach(b=>{b.onclick=e=>{const m=e.target.closest('.modal');if(m){m.classList.add('hidden');if(m.id==='settings-modal')this._resetSettingsLive()}}});
    document.querySelectorAll('.modal-overlay').forEach(el=>{el.onclick=()=>{const m=el.closest('.modal');if(m){m.classList.add('hidden');if(m.id==='settings-modal')this._resetSettingsLive()}}});
    /* Bulk URL Links modal wiring */
    const blkTa=document.getElementById('bulk-links-text');
    if(blkTa)blkTa.addEventListener('input',()=>{const parsed=this.parseBulkLinks(blkTa.value);const t=this._bulkLinkTarget;const max=t&&t.swimlaneId!==undefined?5:3;const remain=max-((t&&t.links||[]).length);document.getElementById('bulk-links-preview').textContent=`Found ${parsed.length} URL${parsed.length===1?'':'s'} (${remain} slot${remain===1?'':'s'} remaining)`});
    document.getElementById('bulk-links-cancel')?.addEventListener('click',()=>document.getElementById('bulk-links-modal').classList.add('hidden'));
    document.getElementById('bulk-links-add')?.addEventListener('click',()=>this.doBulkLinks());
    document.addEventListener('click',e=>{
      if(!e.target.closest('#ctx-menu'))this.$.ctx_menu.classList.add('hidden');
      if(!e.target.closest('#dt-ctx-menu'))this.$.dt_ctx_menu.classList.add('hidden');
      if(!e.target.closest('#dt-ctx-input')&&!e.target.closest('#dt-ctx-menu')){const dci=document.getElementById('dt-ctx-input');if(dci)dci.classList.add('hidden')}
      if(!e.target.closest('.save-btn-group')){this.closeAllDD()}
      if(!e.target.closest('#sl-fmt-popover')&&!(e.target.closest('.sl-lbl')&&(e.ctrlKey||e.metaKey)))this._hideSlFmtPopover();
      if(!e.target.closest('#hdr-fmt-popover'))this._hideHdrFmtPopover();
      if(!e.target.closest('#fp-popover')&&!e.target.closest('#fp-split')){if(this._fpStaged)this.deactivateFP();else this._hideFPPopover()}
      if(!e.target.closest('.mru-ext-pop'))this._hideExtPopover();
    });
    this.$.ctx_menu.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a&&!e.target.closest('.ctx-disabled'))this.ctxAct(a);this.$.ctx_menu.classList.add('hidden')});
    // DT context menu
    this.$.dt_ctx_menu.addEventListener('click',e=>{const a=e.target.closest('[data-dtact]')?.dataset.dtact;if(a)this.dtCtxAct(a);this.$.dt_ctx_menu.classList.add('hidden')});
    // Keyboard — dispatch via shortcut map
    document.addEventListener('keydown',e=>{
      const combo=this._normalizeKey(e);if(!combo)return;
      // B36: Prevent Tab from focusing offscreen panel elements
      if(e.key==='Tab'){const inp=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if(!inp){e.preventDefault();return}}
      const actionId=this._scMap[combo.toLowerCase()];if(!actionId)return;
      const action=SHORTCUT_ACTIONS.find(a=>a.id===actionId);if(!action)return;
      const inp=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      if(inp&&!action.global)return;
      const tl=this.view==='timeline'||this.view==='split';
      if(action.ctx==='tl'&&!tl)return;
      if(action.ctx==='sel'&&!this.sel.length)return;
      if(action.ctx==='sel-manual'&&(!this.sel.length||this.proj.schedulingMode==='scheduled'))return;
      if(action.special===true){e.preventDefault();this._handleEscape();return}
      if(action.special==='nudge'){e.preventDefault();this._handleNudgeKey(actionId,e.ctrlKey||e.metaKey);return}
      e.preventDefault();
      const fn=this._scDispatch[actionId];if(fn)fn.call(this);
    });
    document.addEventListener('keyup',e=>{if(this._nudgeSnapped)this._nudgeSpeed=1});
    document.addEventListener('paste',e=>{if(this.view==='data'||this.view==='split'){const t=document.activeElement;if(t&&['INPUT','TEXTAREA','SELECT'].includes(t.tagName))return;const txt=e.clipboardData.getData('text/plain');if(txt.includes('\t')||txt.includes('\n')){e.preventDefault();this.showPaste();setTimeout(()=>{this.$.paste_ta.value=txt;this.previewPaste()},80)}}});
    window.addEventListener('beforeunload',e=>{if(this._unsaved){e.preventDefault();e.returnValue=''}});
    this.$.tl_body.addEventListener('mousedown',e=>this.onTlMD(e));
    this.$.tl_body_scroll.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault()},true);
    this.$.tl_body.addEventListener('contextmenu',e=>this.onTlCtx(e));
    this.$.tl_body.addEventListener('dblclick',e=>{const iEl=e.target.closest('.tl-item');if(iEl){const it=this.gi(iEl.dataset.iid);if(it)this.openPanel(it)}});
    this.$.tl_sl_labels.addEventListener('dblclick',e=>{const lbl=e.target.closest('.sl-lbl');if(lbl){const sl=this.gs(lbl.dataset.slId);if(sl)this.showSwM(sl)}});
    // Hidden indicator click — expand collapsed swimlane
    this.$.tl_sl_labels.addEventListener('click',e=>{this._hideHdrFmtPopover();const ind=e.target.closest('.sl-hidden-indicator');if(ind){e.stopPropagation();const sl=this.gs(ind.dataset.slId);if(sl){this.snap();sl.collapsed='expanded';this.sched();this.autoSave()}return}const ssBtn=e.target.closest('.ss-collapse-btn');if(ssBtn){e.stopPropagation();const sl=this.gs(ssBtn.dataset.slId);if(!sl)return;const ss=sl.subSwimlanes.find(s=>s.id===ssBtn.dataset.ssId);if(!ss)return;this.snap();ss.collapsed=ss.collapsed==='minimized'?'expanded':'minimized';if(ss.collapsed==='expanded'&&sl.collapsed!=='expanded')sl.collapsed='expanded';if(sl.subSwimlanes.every(s=>s.collapsed==='minimized'))sl.collapsed='minimized';this.sched();this.autoSave();return}const btn=e.target.closest('.sl-collapse-btn');if(btn){e.stopPropagation();const sl=this.gs(btn.dataset.slId);if(sl){this.snap();const action=btn.dataset.action;if(action==='expand')sl.collapsed='expanded';else if(action==='hide')sl.collapsed='collapsed';else sl.collapsed='minimized';this.sched();this.autoSave()}return}/* Swimlane label selection (F19) */const subLbl=e.target.closest('.sl-sub-lbl');const mainLbl=e.target.closest('.sl-lbl');if(!mainLbl)return;const slId=mainLbl.dataset.slId;if(subLbl){const ssId=subLbl.dataset.ssId||'';if(ssId){const entry={slId,ssId};if(e.ctrlKey||e.metaKey){const idx=this.slSel.findIndex(s=>s.slId===slId&&s.ssId===ssId);if(idx>=0)this.slSel.splice(idx,1);else this.slSel.push(entry)}else this.slSel=[entry];this.sched()}}else{const entry={slId,ssId:''};if(e.ctrlKey||e.metaKey){const idx=this.slSel.findIndex(s=>s.slId===slId&&!s.ssId);if(idx>=0)this.slSel.splice(idx,1);else this.slSel.push(entry)}else this.slSel=[entry];this.sched()}});
    // Swimlane label right-click — format popover (F19)
    this.$.tl_sl_labels.addEventListener('contextmenu',e=>{if(e.target.closest('.sl-collapse-btn')||e.target.closest('.ss-collapse-btn'))return;e.preventDefault();const subLbl=e.target.closest('.sl-sub-lbl');const mainLbl=e.target.closest('.sl-lbl');if(!mainLbl)return;const slId=mainLbl.dataset.slId;let ssId='';if(subLbl)ssId=subLbl.dataset.ssId||'';if(!this._isSlSel(slId,ssId)){this.slSel=[{slId,ssId}];this.sched()}this._showSlFmtPopover(e.clientX,e.clientY)});
    // Swimlane format popover stepper (F19)
    document.getElementById('sl-fmt-close')?.addEventListener('click',()=>this._hideSlFmtPopover());
    document.getElementById('sl-fmt-dec')?.addEventListener('click',()=>this._adjustSlFs(-0.5));
    document.getElementById('sl-fmt-inc')?.addEventListener('click',()=>this._adjustSlFs(0.5));
    const slFmtFs=document.getElementById('sl-fmt-fs');if(slFmtFs){slFmtFs.addEventListener('change',()=>{const v=parseFloat(slFmtFs.value);if(!isNaN(v))this._applySlFs(v)});slFmtFs.addEventListener('input',()=>{const v=parseFloat(slFmtFs.value);if(!isNaN(v)&&v>=7&&v<=24)this._applySlFs(v)})}
    document.getElementById('sl-fmt-scope')?.addEventListener('change',()=>this._onSlScopeChange());
    // Header format popover (F4-P2)
    this.$.tl_hdr.addEventListener('contextmenu',e=>{e.preventDefault();this._showHdrFmtPopover(e.clientX,e.clientY)});
    this.$.tl_hdr_corner.addEventListener('contextmenu',e=>{e.preventDefault();this._showHdrFmtPopover(e.clientX,e.clientY)});
    document.getElementById('hdr-fmt-close')?.addEventListener('click',()=>this._hideHdrFmtPopover());
    document.getElementById('hdr-fmt-dec')?.addEventListener('click',()=>this._adjustHdrFs(-0.5));
    document.getElementById('hdr-fmt-inc')?.addEventListener('click',()=>this._adjustHdrFs(0.5));
    const hdrFmtFs=document.getElementById('hdr-fmt-fs');if(hdrFmtFs){hdrFmtFs.addEventListener('change',()=>{const v=parseFloat(hdrFmtFs.value);if(!isNaN(v))this._applyHdrFs(v)});hdrFmtFs.addEventListener('input',()=>{const v=parseFloat(hdrFmtFs.value);if(!isNaN(v)&&v>=7&&v<=16)this._applyHdrFs(v)})}
    const hdrPopMf=document.getElementById('hdr-pop-month-fmt');if(hdrPopMf)hdrPopMf.onchange=e=>{this.snap();this.proj.monthFormat=e.target.value;const vd=document.getElementById('month-fmt-sel');if(vd)vd.value=e.target.value;this.sched();this.autoSave()};
    const hdrPopQf=document.getElementById('hdr-pop-quarter-fmt');if(hdrPopQf)hdrPopQf.onchange=e=>{this.snap();this.proj.quarterFormat=e.target.value;const vd=document.getElementById('quarter-fmt-sel');if(vd)vd.value=e.target.value;this.sched();this.autoSave()};
    const hdrPopDf=document.getElementById('hdr-pop-day-fmt');if(hdrPopDf)hdrPopDf.onchange=e=>{this.snap();this.proj.dayLabelFormat=e.target.value;const vd=document.getElementById('day-fmt-sel');if(vd)vd.value=e.target.value;this.sched();this.autoSave()};
    const hdrPopDw=document.getElementById('hdr-pop-dayw-fmt');if(hdrPopDw)hdrPopDw.onchange=e=>{this.snap();this.proj.dayColumnWidth=e.target.value;const vd=document.getElementById('day-width-sel');if(vd)vd.value=e.target.value;this.sched();this.autoSave()};
    /* Shading quick-controls — popover */
    const hpWC=document.getElementById('hdr-pop-wknd-chk');if(hpWC)hpWC.onchange=()=>{this.snap();this.proj.showWeekends=hpWC.checked;this._syncShadingUI();this.sched();this.autoSave()};
    const hpWO=document.getElementById('hdr-pop-wknd-op');if(hpWO){hpWO.oninput=()=>{this.proj.weekendOpacity=+hpWO.value;this._syncShadingUI();this.sched()};hpWO.onchange=()=>this.autoSave()}
    const hpHC=document.getElementById('hdr-pop-hol-chk');if(hpHC)hpHC.onchange=()=>{this.snap();this.proj.showHolidays=hpHC.checked;this._syncShadingUI();this.sched();this.autoSave()};
    const hpHO=document.getElementById('hdr-pop-hol-op');if(hpHO){hpHO.oninput=()=>{this.proj.holidayOpacity=+hpHO.value;this._syncShadingUI();this.sched()};hpHO.onchange=()=>this.autoSave()}
    const hpHLnk=document.getElementById('hdr-pop-hol-settings');if(hpHLnk)hpHLnk.onclick=e=>{e.preventDefault();this._hideHdrFmtPopover();this.showSettings();setTimeout(()=>{const s=document.getElementById('sect-holidays');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})},100)};
    /* Shading quick-controls — View dropdown */
    const vWC=document.getElementById('view-wknd-chk');if(vWC)vWC.onchange=()=>{this.snap();this.proj.showWeekends=vWC.checked;this._syncShadingUI();this.sched();this.autoSave()};
    const vWO=document.getElementById('view-wknd-op');if(vWO){vWO.oninput=()=>{this.proj.weekendOpacity=+vWO.value;this._syncShadingUI();this.sched()};vWO.onchange=()=>this.autoSave()}
    const vHC=document.getElementById('view-hol-chk');if(vHC)vHC.onchange=()=>{this.snap();this.proj.showHolidays=vHC.checked;this._syncShadingUI();this.sched();this.autoSave()};
    const vHO=document.getElementById('view-hol-op');if(vHO){vHO.oninput=()=>{this.proj.holidayOpacity=+vHO.value;this._syncShadingUI();this.sched()};vHO.onchange=()=>this.autoSave()}
    const vHLnk=document.getElementById('view-hol-settings');if(vHLnk)vHLnk.onclick=e=>{e.preventDefault();this.closeAllDD();this.showSettings();setTimeout(()=>{const s=document.getElementById('sect-holidays');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})},100)};
    // Column resize handle
    const colRH=this.$.sl_col_rh;
    if(colRH){colRH.addEventListener('mousedown',e=>{
      e.preventDefault();e.stopPropagation();
      const startX=e.clientX,startW=this.proj.labelWidth||160;
      colRH.classList.add('active');
      const mv=ev=>{const nw=U.clamp(startW+ev.clientX-startX,80,400);this.proj.labelWidth=nw;document.documentElement.style.setProperty('--sl-w',nw+'px')};
      const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);colRH.classList.remove('active');this.sched();this.autoSave()};
      document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
    })}
    document.addEventListener('mouseover',e=>{const el=e.target.closest('[data-tooltip]');if(el)this.showTT(el,el.dataset.tooltip);else this.hideTT()});
    document.addEventListener('mouseout',e=>{if(e.target.closest('[data-tooltip]'))this.hideTT()});
  },

  /* Arrow key nudging */
  _lockToastT:0,
  nudge(key,ctrl){
    if(!this.sel.length)return;
    const isH=key==='ArrowLeft'||key==='ArrowRight';
    if(this.proj.locked){if(!this._lockToastT||Date.now()-this._lockToastT>2000){this.toast('🔒 Locked — unlock to move items','info',1500);this._lockToastT=Date.now()}this._hintLockPill();return}
    const step=ctrl?Math.min(7,this._nudgeSpeed):1;
    this._nudgeSpeed=Math.min(14,this._nudgeSpeed+0.5);
    if(!this._nudgeSnapped){this.snap();this._nudgeSnapped=true;clearTimeout(this._nudgeSnapTimer)}
    this._nudgeSnapTimer=setTimeout(()=>{this._nudgeSnapped=false;this._nudgeSpeed=1},600);
    this.sel.forEach(id=>{
      const it=this.gi(id);if(!it)return;
      if(key==='ArrowLeft'||key==='ArrowRight'){
        const d=key==='ArrowRight'?step:-step;
        if(it.type==='milestone')it.date=U.addDays(it.date,d);
        else{it.startDate=U.addDays(it.startDate,d);it.endDate=U.addDays(it.endDate,d)}
      }else{
        const d=key==='ArrowDown'?1:-1;it.subRow=Math.max(0,(it.subRow||0)+d);
      }
    });
    if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave();this.refreshPanel()
  },

  setView(v){
    if((this._fpStaged||this._fpMode)&&v!=='timeline')this.deactivateFP();
    this.view=v;document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    const tc=this.$.tl_container,dc=this.$.data_container,mc=this.$.main_content;
    mc.classList.remove('split-view');tc.classList.remove('view-active','view-hidden');dc.classList.remove('view-active','view-hidden');
    if(v==='timeline'||v==='split'){
      tc.classList.add('view-active');
      if(v==='split'){mc.classList.add('split-view');dc.classList.add('view-active')}else{dc.classList.add('view-hidden')}
      if(this._wasExpandedBeforeDataView){this._wasExpandedBeforeDataView=false;this.expandPanel()}
      if(this.panelCollapsed)this.$.panel_tab.classList.remove('hidden')
    }else if(v==='data'){
      tc.classList.add('view-hidden');dc.classList.add('view-active');
      this._wasExpandedBeforeDataView=!this.panelCollapsed;
      if(!this.panelCollapsed)this.collapsePanel(true);
      else if(!this.panelLocked){this.panelLocked=true;this._syncLockTab();this._savePanelState()}
    }
    this._syncPanelPad();this.sched()
  },
  _selCentroidDate(){
    if(!this.sel.length)return null;
    const items=this.sel.map(id=>this.gi(id)).filter(Boolean);
    if(!items.length)return null;
    let earliest=null,latest=null;
    for(const it of items){
      const s=it.type==='task'?it.startDate:it.date;
      const e=it.type==='task'?it.endDate:it.date;
      if(s&&(!earliest||s<earliest))earliest=s;
      if(e&&(!latest||e>latest))latest=e;
    }
    if(!earliest||!latest)return null;
    return U.addDays(earliest,Math.round(U.days(earliest,latest)/2));
  },
  doZoom(d){
    const bs=this.$.tl_body_scroll;
    const oldZ=this.proj.zoom||100;
    const newZ=U.clamp(oldZ+d,30,300);
    if(newZ===oldZ)return;
    const panelW=this.panelCollapsed?28:290;
    const vpW=bs.clientWidth-panelW;
    const tl=this.met();
    const cDate=this._selCentroidDate();
    let anchorPx,anchorScreenX;
    if(cDate){anchorPx=this.dX(cDate,tl);if(anchorPx!=null)anchorScreenX=U.clamp(anchorPx-bs.scrollLeft,0,vpW)}
    if(anchorPx==null){anchorScreenX=vpW/2;anchorPx=bs.scrollLeft+anchorScreenX}
    const anchorDate=this.xD(anchorPx,tl);
    this.proj.zoom=newZ;
    this.sched();
    requestAnimationFrame(()=>{const newTl=this.met();const newPx=this.dX(anchorDate,newTl);if(newPx!=null)bs.scrollLeft=Math.max(0,newPx-anchorScreenX)});
  },
  doZoomTo(t){this.doZoom(t-(this.proj.zoom||100))},
  closeAllDD(){['file_dropdown','add_dropdown','view_dropdown','tools_dropdown'].forEach(k=>{if(this.$[k])this.$[k].classList.add('hidden')});
    this._mruExpanded=false;const sec=document.getElementById('mru-section');const arrow=document.getElementById('mru-arrow');
    if(sec)sec.classList.add('hidden');if(arrow)arrow.classList.remove('open')},
  posDD(dd){
    if(!dd)return;
    dd.style.left='';dd.style.right='';
    requestAnimationFrame(()=>{
      const r=dd.getBoundingClientRect();
      if(r.right>window.innerWidth-4){dd.style.left='auto';dd.style.right='0'}
    });
  },
  /* Canvas-based text measurement — shared context, accurate widths */
  _mCtx:null,
  _mt(text,fontSize,fontWeight){
    if(!this._mCtx){const c=document.createElement('canvas');this._mCtx=c.getContext('2d')}
    this._mCtx.font=(fontWeight||'600')+' '+fontSize+'px "DM Sans",sans-serif';
    return this._mCtx.measureText(text||'').width;
  },
  /* Word-wrap text into lines that fit maxW pixels. Returns array of strings. */
  _wrapText(text,maxW,fontSize,fontWeight){
    if(!text)return[];const words=text.split(/\s+/);if(!words.length)return[];
    const lines=[];let cur=words[0];
    for(let i=1;i<words.length;i++){const test=cur+' '+words[i];
      if(this._mt(test,fontSize,fontWeight)<=maxW){cur=test}else{lines.push(cur);cur=words[i]}}
    lines.push(cur);return lines;
  },
  /* Render wrapped SVG text as <text> with <tspan> elements, vertically centered in a box. */
  _svgText(text,x,y,maxW,boxH,fontSize,fontWeight,attrs){
    const lines=this._wrapText(text,maxW-8,fontSize,fontWeight);if(!lines.length)return'';
    const lh=fontSize*1.2;const totalH=lines.length*lh;
    let s=`<text x="${x}" fill="#fff" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="middle"${attrs?' '+attrs:''}>`;
    for(let i=0;i<lines.length;i++){const ly=y+boxH/2-totalH/2+lh/2+i*lh;s+=`<tspan x="${x}" y="${ly}" dominant-baseline="central">${U.esc(lines[i])}</tspan>`}
    return s+'</text>';
  },
  /* Measure label text widths for an item. Returns {labelW, edgeLW, edgeRW} in fixed pixels. */
  _itemLabelWidths(it){
    const p=this.proj,gfs=p.fontSize||11,fs=it.fontSize||gfs;
    /* Inline status prefix: emoji shows emoji char, others show "(shortName) " */
    const sd=this._getStatusDef(it.status);
    const sdCfg=p.statusDisplay||{};
    const sdMode=sdCfg.mode||'emoji';
    const useInline=sd&&sdCfg.show&&(sdCfg.badgePos||'inline')==='inline';
    const inlineTxt=useInline?(sdMode==='emoji'?sd.emoji+' ':sdMode==='text'?sd.name+' ':'('+sd.shortName+') '):'';
    const inlineExtra=inlineTxt?this._mt(inlineTxt,fs,'700'):0;
    const nameW=this._mt(it.name||'',fs,'600')+inlineExtra;
    let secW=0;
    if(it.type==='task'){
      const parts=[];if(it.showOwner&&it.owner)parts.push(it.owner);
      if(it.showDuration)parts.push(this._fmtDurLabel?this._fmtDurLabel(it):'00d');
      if(parts.length>1)secW=this._mt(parts[0]+' ('+parts[1]+')',Math.max(8,fs-1.5),'400');
      else if(parts.length===1)secW=this._mt(parts[0],Math.max(8,fs-1.5),'400');
    }else if(it.type!=='task'&&it.showDate!==false){
      let dtStr='';const hasOwner=it.showOwner&&it.owner;
      if(hasOwner){dtStr=it.owner;if(it.date)dtStr+=' · '+U.fmt(it.date,it.dateFormat||p.dateFormat)}
      else{dtStr=U.fmt(it.date,it.dateFormat||p.dateFormat)}
      if(dtStr)secW=this._mt(dtStr,fs-1,'400');
    }
    const labelW=Math.max(nameW,secW)+8;
    let edgeLW=0,edgeRW=0;
    if(it.type==='task'){
      if(it.showStartDate){edgeLW=this._mt(U.fmt(it.startDate,it.dateFormat||p.dateFormat),Math.max(8,fs-1),'400')+4}
      if(it.showEndDate){edgeRW=this._mt(U.fmt(it.endDate,it.dateFormat||p.dateFormat),Math.max(8,fs-1),'400')+4}
    }
    return{labelW,edgeLW,edgeRW};
  },
  /* Compute pixel extents for items. tl = metrics from met().
     Returns {minPx, maxPx} (combined bar+text) or null if no items. */
  _itemExtents(items,tl){
    let minPx=Infinity,maxPx=-Infinity;
    for(const it of items){
      const lp=it.labelPosition||'right';
      const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(it);
      if(it.type==='task'){
        const x1=this.dX(it.startDate,tl),x2=this.dXEnd(it.endDate,tl);
        if(x1!==null&&x2!==null){
          let itemL=x1,itemR=x2;
          if(lp==='right'){itemR=Math.max(x2,x2+6+labelW)}
          else if(lp==='left'){itemL=Math.min(x1,x1-6-labelW)}
          else if(lp==='top'||lp==='bottom'){
            const halfLabel=labelW/2;itemL=Math.min(itemL,x1+(x2-x1)/2-halfLabel);itemR=Math.max(itemR,x1+(x2-x1)/2+halfLabel);
          }
          if(edgeLW)itemL=Math.min(itemL,x1-edgeLW);
          if(edgeRW)itemR=Math.max(itemR,x2+edgeRW);
          minPx=Math.min(minPx,itemL);maxPx=Math.max(maxPx,itemR);
        }
      }else{
        const x=this.dXMid(it.date,tl);
        if(x!==null){
          let itemL=x-8,itemR=x+8;
          if(lp==='right'){itemR=Math.max(itemR,x+12+labelW)}
          else if(lp==='left'){itemL=Math.min(itemL,x-12-labelW)}
          else if(lp==='top'||lp==='bottom'||lp==='center'){
            const halfLabel=labelW/2;itemL=Math.min(itemL,x-halfLabel);itemR=Math.max(itemR,x+halfLabel);
          }
          minPx=Math.min(minPx,itemL);maxPx=Math.max(maxPx,itemR);
        }
      }
    }
    if(minPx===Infinity||maxPx===-Infinity)return null;
    return{minPx,maxPx};
  },
  fitToContent(){
    const bs=this.$.tl_body_scroll;if(!bs)return;
    const panelW=this.panelCollapsed?28:290;
    const vpW=bs.clientWidth-panelW;
    const p=this.proj;
    const collapsedSlIds=new Set(p.swimlanes.filter(sl=>sl.collapsed!=='expanded').map(sl=>sl.id));
    const collapsedSubIds=new Set();
    p.swimlanes.forEach(sl=>{if(sl.subSwimlanes)sl.subSwimlanes.forEach(ss=>{if(ss.collapsed==='minimized')collapsedSubIds.add(ss.id)})});
    const items=p.items.filter(i=>!(p.hideMode&&i.hidden)&&!collapsedSlIds.has(i.swimlaneId)&&(!i.subSwimId||!collapsedSubIds.has(i.subSwimId)));
    if(!items.length){p.zoom=100;this.sched();return}
    /* Pre-compute per-item: barLeft/barRight at z=1 (scales with zoom) and fixed-px text offsets.
       At any zoom z, item's absolute left = z * barL_z1 - textLeft, right = z * barR_z1 + textRight.
       We need: max(all rights) - min(all lefts) + pad <= vpW. Solve for z iteratively. */
    const savedZoom=p.zoom||100;
    p.zoom=100;
    const tl1=this.met();
    const itemGeom=[];/* {bL, bR, tL, tR} per item — bar at z=1, text offsets fixed px */
    for(const it of items){
      const lp=it.labelPosition||'right';
      const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(it);
      let bL,bR,tL=0,tR=0;
      if(it.type==='task'){
        const x1=this.dX(it.startDate,tl1),x2=this.dXEnd(it.endDate,tl1);
        if(x1===null||x2===null)continue;
        bL=x1;bR=x2;
        if(lp==='right'){tR=6+labelW}
        else if(lp==='left'){tL=6+labelW}
        else if(lp==='top'||lp==='bottom'){const half=labelW/2,barHalf=(x2-x1)/2;if(half>barHalf){tL=half-barHalf;tR=half-barHalf}}
        if(edgeLW)tL=Math.max(tL,edgeLW);
        if(edgeRW)tR=Math.max(tR,edgeRW);
      }else{
        const x=this.dXMid(it.date,tl1);
        if(x===null)continue;
        bL=x-8;bR=x+8;
        if(lp==='right'){tR=12+labelW}
        else if(lp==='left'){tL=12+labelW}
        else if(lp==='top'||lp==='bottom'||lp==='center'){const half=labelW/2;if(half>8){tL=half-8;tR=half-8}}
      }
      itemGeom.push({bL,bR,tL,tR});
    }
    if(!itemGeom.length){p.zoom=savedZoom;this.sched();return}
    /* Iterative solve: start with z from bar-only span, refine 3x for text overlap convergence */
    const pad=40;
    let z=1;
    for(let iter=0;iter<4;iter++){
      let minAbs=Infinity,maxAbs=-Infinity;
      for(const g of itemGeom){
        minAbs=Math.min(minAbs,z*g.bL-g.tL);
        maxAbs=Math.max(maxAbs,z*g.bR+g.tR);
      }
      const needed=maxAbs-minAbs+pad;
      z=z*(vpW/needed);/* scale z to fit */
    }
    const newZoom=U.clamp(Math.round(z*100),10,300);
    p.zoom=newZoom;
    this.sched();
    /* Compute scroll position at final zoom */
    requestAnimationFrame(()=>{
      const zFinal=newZoom/100;
      let minAbs=Infinity;
      for(const g of itemGeom)minAbs=Math.min(minAbs,zFinal*g.bL-g.tL);
      bs.scrollLeft=Math.max(0,minAbs-20);/* 20px left padding */
    });
    this.toast('Fit to content');
  },
  fitToSelection(){
    if(!this.sel.length){this.fitToContent();return}
    const selItems=this.sel.map(id=>this.gi(id)).filter(Boolean);
    if(!selItems.length){this.fitToContent();return}
    const bs=this.$.tl_body_scroll;if(!bs)return;
    const panelW=this.panelCollapsed?28:290;
    const vpW=bs.clientWidth-panelW;
    const p=this.proj;
    const fitItems=p.hideMode?selItems.filter(i=>!i.hidden):selItems;
    if(!fitItems.length){this.fitToContent();return}
    const savedZoom=p.zoom||100;
    p.zoom=100;
    const tl1=this.met();
    const itemGeom=[];
    for(const it of fitItems){
      const lp=it.labelPosition||'right';
      const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(it);
      let bL,bR,tL=0,tR=0;
      if(it.type==='task'){
        const x1=this.dX(it.startDate,tl1),x2=this.dXEnd(it.endDate,tl1);
        if(x1===null||x2===null)continue;
        bL=x1;bR=x2;
        if(lp==='right'){tR=6+labelW}
        else if(lp==='left'){tL=6+labelW}
        else if(lp==='top'||lp==='bottom'){const half=labelW/2,barHalf=(x2-x1)/2;if(half>barHalf){tL=half-barHalf;tR=half-barHalf}}
        if(edgeLW)tL=Math.max(tL,edgeLW);
        if(edgeRW)tR=Math.max(tR,edgeRW);
      }else{
        const x=this.dXMid(it.date,tl1);
        if(x===null)continue;
        bL=x-8;bR=x+8;
        if(lp==='right'){tR=12+labelW}
        else if(lp==='left'){tL=12+labelW}
        else if(lp==='top'||lp==='bottom'||lp==='center'){const half=labelW/2;if(half>8){tL=half-8;tR=half-8}}
      }
      itemGeom.push({bL,bR,tL,tR});
    }
    if(!itemGeom.length){p.zoom=savedZoom;this.sched();return}
    const pad=40;let z=1;
    for(let iter=0;iter<4;iter++){
      let minAbs=Infinity,maxAbs=-Infinity;
      for(const g of itemGeom){minAbs=Math.min(minAbs,z*g.bL-g.tL);maxAbs=Math.max(maxAbs,z*g.bR+g.tR)}
      z=z*(vpW/(maxAbs-minAbs+pad));
    }
    const newZoom=U.clamp(Math.round(z*100),10,300);
    p.zoom=newZoom;
    this.sched();
    requestAnimationFrame(()=>{
      const zF=newZoom/100;
      let minAbs=Infinity;
      for(const g of itemGeom)minAbs=Math.min(minAbs,zF*g.bL-g.tL);
      bs.scrollLeft=Math.max(0,minAbs-20);
    });
    this.toast(`Fit to selection (${fitItems.length} item${fitItems.length===1?'':'s'})`);
  },
  /* F45: Smart zoom — set a comfortable reading level when switching timescales */
  smartZoomForScale(newScale){
    const bs=this.$.tl_body_scroll;if(!bs)return;
    const panelW=this.panelCollapsed?28:290;
    const vpW=bs.clientWidth-panelW;
    if(vpW<=0){this._pendingFit=true;this.sched();return}
    /* Base column widths — must match met() */
    const dayCw={compact:20,normal:28,wide:36}[this.proj.dayColumnWidth||'normal']||28;
    const baseCw={days:dayCw,weeks:60,months:100,quarters:200,years:400}[newScale]||100;
    /* Target visible columns per scale */
    const targetCols={days:30,weeks:20,months:20,quarters:12,years:7}[newScale]||20;
    /* Count total columns at new scale from timeline date range */
    const p=this.proj;
    const start=new Date(p.timelineStart+'T12:00:00'),end=new Date(p.timelineEnd+'T12:00:00');
    let totalCols=0;
    if(newScale==='days'){totalCols=Math.max(1,U.days(p.timelineStart,p.timelineEnd)+1)}
    else if(newScale==='weeks'){totalCols=Math.max(1,Math.ceil((U.days(p.timelineStart,p.timelineEnd)+1)/7))}
    else if(newScale==='months'){totalCols=Math.max(1,(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth())+1)}
    else if(newScale==='quarters'){totalCols=Math.max(1,(end.getFullYear()-start.getFullYear())*4+(Math.floor(end.getMonth()/3)-Math.floor(start.getMonth()/3))+1)}
    else{totalCols=Math.max(1,end.getFullYear()-start.getFullYear()+1)}
    /* Small timeline → just fit everything */
    if(totalCols<=targetCols*1.3){this._pendingFit=true;this.sched();return}
    /* Compute target zoom */
    const targetZoom=U.clamp(Math.round((vpW/(targetCols*baseCw))*100),30,300);
    p.zoom=targetZoom;
    /* Determine scroll anchor: today > selection centroid > viewport center */
    const todayIso=U.iso(new Date());
    const inRange=todayIso>=p.timelineStart&&todayIso<=p.timelineEnd;
    const centroid=this._selCentroidDate();
    const anchorDate=inRange?todayIso:(centroid||null);
    this.sched();
    requestAnimationFrame(()=>{
      if(anchorDate){const tl=this.met();const px=this.dX(anchorDate,tl);if(px!=null)bs.scrollLeft=Math.max(0,px-vpW/2)}
    });
  },
  goToday(){const tl=this.met();const x=this.dX(U.iso(new Date()),tl);if(x!==null){const panelW=this.panelCollapsed?28:290;this.$.tl_body_scroll.scrollLeft=x-(this.$.tl_body_scroll.clientWidth-panelW)/2}},
  showModal(id){document.getElementById(id).classList.remove('hidden')},
  gi(id){return this.proj.items.find(i=>i.id===id)},
  gs(id){return this.proj.swimlanes.find(s=>s.id===id)},
  _findSubSwim(ssId){for(const sl of this.proj.swimlanes)for(const ss of sl.subSwimlanes||[])if(ss.id===ssId)return ss;return null},
  _isSlSel(slId,ssId){ssId=ssId||'';return this.slSel.some(s=>s.slId===slId&&s.ssId===ssId)},
  _clearSlSel(){if(this.slSel.length){this.slSel=[];this._hideSlFmtPopover();this.sched()}},
  _hideSlFmtPopover(){const p=document.getElementById('sl-fmt-popover');if(!p)return;const wasVisible=!p.classList.contains('hidden');p.classList.add('hidden');if(wasVisible&&this._slSelManual.length){this.slSel=this._slSelManual.map(s=>({...s}));this._slSelManual=[];this.sched()}},
  _showSlFmtPopover(x,y){
    const pop=document.getElementById('sl-fmt-popover');if(!pop||!this.slSel.length)return;
    this._slSelManual=this.slSel.map(s=>({...s}));
    const first=this.slSel[0];let curFs;
    if(first.ssId){const ss=this._findSubSwim(first.ssId);curFs=(ss&&ss.fontSize)||9.5}else{const sl=this.gs(first.slId);curFs=(sl&&sl.fontSize)||12}
    document.getElementById('sl-fmt-fs').value=curFs;
    /* Dynamic title */
    const titleEl=document.getElementById('sl-fmt-title');
    const hasSubs=this.slSel.some(s=>s.ssId);const hasMain=this.slSel.some(s=>!s.ssId);
    if(titleEl){if(hasSubs&&!hasMain)titleEl.textContent='Format Sub-Swimlane Header';else titleEl.textContent='Format Swimlane Header'}
    /* Build scope options */
    const scope=document.getElementById('sl-fmt-scope');
    let opts='<option value="selected">Selected Only</option>';
    if(hasMain&&!hasSubs)opts+='<option value="all-swim">All Swimlanes</option>';
    if(hasSubs&&!hasMain){
      const lanes=new Set(this.slSel.filter(s=>s.ssId).map(s=>s.slId));
      if(lanes.size===1)opts+='<option value="subs-in-lane">Subs in This Lane</option>';
      opts+='<option value="all-sub">All Sub-Swimlanes</option>';
    }
    if(hasMain&&hasSubs){opts+='<option value="all-swim">All Swimlanes</option><option value="all-sub">All Sub-Swimlanes</option>'}
    scope.innerHTML=opts;
    /* URL Links info row */
    const lkRow=document.getElementById('sl-fmt-links-row'),lkInfo=document.getElementById('sl-fmt-links-info');
    if(lkRow&&lkInfo){
      let entity=null;
      if(first.ssId){entity=this._findSubSwim(first.ssId)}else{entity=this.gs(first.slId)}
      const lks=(entity&&entity.links)||[];
      if(lks.length){
        lkRow.style.display='';
        lkInfo.innerHTML=`<span>${lks.length} link${lks.length===1?'':'s'}</span><button class="pab" id="sl-fmt-lk-open" style="font-size:9px;padding:1px 6px" title="Open primary URL link">🌐 Open</button><button class="pab" id="sl-fmt-lk-edit" style="font-size:9px;padding:1px 6px">Edit…</button>`;
        document.getElementById('sl-fmt-lk-open')?.addEventListener('click',()=>{if(lks[0]?.url)window.open(lks[0].url,'_blank')});
        document.getElementById('sl-fmt-lk-edit')?.addEventListener('click',()=>{this._hideSlFmtPopover();const sl=this.gs(first.slId);if(sl)this.showSwM(sl)});
      }else{lkRow.style.display='none';lkInfo.innerHTML=''}
    }
    pop.classList.remove('hidden');
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    pop.style.left=Math.min(x,window.innerWidth-pw-8)+'px';
    pop.style.top=Math.min(y,window.innerHeight-ph-8)+'px';
  },
  _onSlScopeChange(){
    const scope=document.getElementById('sl-fmt-scope')?.value||'selected';
    if(scope==='selected'){this.slSel=this._slSelManual.map(s=>({...s}))}
    else if(scope==='all-swim'){this.slSel=this.proj.swimlanes.map(sl=>({slId:sl.id,ssId:''}))}
    else if(scope==='all-sub'){const a=[];this.proj.swimlanes.forEach(sl=>{(sl.subSwimlanes||[]).forEach(ss=>{a.push({slId:sl.id,ssId:ss.id})})});this.slSel=a}
    else if(scope==='subs-in-lane'){const lanes=new Set(this._slSelManual.filter(s=>s.ssId).map(s=>s.slId));const a=[];lanes.forEach(slId=>{const sl=this.gs(slId);if(sl)(sl.subSwimlanes||[]).forEach(ss=>{a.push({slId,ssId:ss.id})})});this.slSel=a}
    /* Update font size input to reflect new selection's first item */
    if(this.slSel.length){const f=this.slSel[0];let fs;if(f.ssId){const ss=this._findSubSwim(f.ssId);fs=(ss&&ss.fontSize)||9.5}else{const sl=this.gs(f.slId);fs=(sl&&sl.fontSize)||12}document.getElementById('sl-fmt-fs').value=fs}
    this.sched();
  },
  _adjustSlFs(delta){
    const inp=document.getElementById('sl-fmt-fs');const cur=parseFloat(inp.value)||12;
    const next=Math.max(7,Math.min(24,cur+delta));inp.value=next;this._applySlFs(next);
  },
  _applySlFs(size){
    this.snap();size=Math.max(7,Math.min(24,size));
    const scope=document.getElementById('sl-fmt-scope')?.value||'selected';
    if(scope==='selected'){for(const s of this.slSel){if(s.ssId){const ss=this._findSubSwim(s.ssId);if(ss)ss.fontSize=size}else{const sl=this.gs(s.slId);if(sl)sl.fontSize=size}}}
    else if(scope==='all-swim'){this.proj.swimlanes.forEach(sl=>{sl.fontSize=size})}
    else if(scope==='all-sub'){this.proj.swimlanes.forEach(sl=>{(sl.subSwimlanes||[]).forEach(ss=>{ss.fontSize=size})})}
    else if(scope==='subs-in-lane'){const lanes=new Set(this.slSel.filter(s=>s.ssId).map(s=>s.slId));lanes.forEach(slId=>{const sl=this.gs(slId);if(sl)(sl.subSwimlanes||[]).forEach(ss=>{ss.fontSize=size})})}
    this.sched();this.autoSave();
  },

  /* ===== HEADER FORMAT POPOVER (F4-P2) ===== */
  _hideHdrFmtPopover(){const p=document.getElementById('hdr-fmt-popover');if(p)p.classList.add('hidden')},
  _showHdrFmtPopover(x,y){
    const pop=document.getElementById('hdr-fmt-popover');if(!pop)return;
    const fs=this.proj.headerFontSize||10.5;
    document.getElementById('hdr-fmt-fs').value=fs;
    /* Sync format dropdowns */
    const ts=this.proj.timescale,layers=this.proj.headerLayers||2;
    const showDay=(ts==='days');
    const showMonth=(ts==='months')||(ts==='weeks'&&layers>=2)||(ts==='days'&&layers>=2);
    const showQuarter=(ts==='months'&&layers>=2);
    const dRow=document.getElementById('hdr-pop-day-row');
    const dwRow=document.getElementById('hdr-pop-dayw-row');
    const mRow=document.getElementById('hdr-pop-month-row');
    const qRow=document.getElementById('hdr-pop-quarter-row');
    if(dRow)dRow.style.display=showDay?'':'none';
    if(dwRow)dwRow.style.display=showDay?'':'none';
    if(mRow)mRow.style.display=showMonth?'':'none';
    if(qRow)qRow.style.display=showQuarter?'':'none';
    const dSel=document.getElementById('hdr-pop-day-fmt');
    const dwSel=document.getElementById('hdr-pop-dayw-fmt');
    const mSel=document.getElementById('hdr-pop-month-fmt');
    const qSel=document.getElementById('hdr-pop-quarter-fmt');
    if(dSel)dSel.value=this.proj.dayLabelFormat||'letter';
    if(dwSel)dwSel.value=this.proj.dayColumnWidth||'normal';
    if(mSel)mSel.value=this.proj.monthFormat||'short';
    if(qSel)qSel.value=this.proj.quarterFormat||'withYear';
    this._syncShadingUI();
    pop.classList.remove('hidden');
    const pw=pop.offsetWidth,ph=pop.offsetHeight;
    pop.style.left=Math.min(x,window.innerWidth-pw-8)+'px';
    pop.style.top=Math.min(y,window.innerHeight-ph-8)+'px';
  },
  _adjustHdrFs(delta){
    const inp=document.getElementById('hdr-fmt-fs');const cur=parseFloat(inp.value)||10.5;
    const next=Math.max(7,Math.min(16,cur+delta));inp.value=next;this._applyHdrFs(next);
  },
  _applyHdrFs(size){
    this.snap();this.proj.headerFontSize=Math.max(7,Math.min(16,size));this.sched();this.autoSave();
  },

  /* ===== FORMAT PAINTER ===== */
  stageFP(){
    if(this.sel.length!==1){this.toast('Select one item to copy format from','error');return}
    if(this._lassoMode)this._scDispatch.toggleLasso.call(this);
    if(this._panMode)this._scDispatch.togglePan.call(this);
    this._fpSourceId=this.sel[0];
    this._fpSourceData=this._captureFPData(this.gi(this._fpSourceId));
    if(!this._fpSourceData){this.toast('Could not read source item','error');return}
    this._fpStaged=true;
    const btn=document.getElementById('btn-fp');if(btn)btn.classList.add('active');
    this._showFPPopover();this.sched();
  },
  activateFP(persistent){
    if(!this._fpSourceId)return;
    /* Re-capture in case checkboxes changed while staged */
    this._fpSourceData=this._captureFPData(this.gi(this._fpSourceId));
    if(!this._fpSourceData){this.toast('Could not read source item','error');this.deactivateFP();return}
    this._fpStaged=false;this._fpMode=true;this._fpPersist=!!persistent;
    this.$.tl_body.classList.add('fp-mode');
    const btn=document.getElementById('btn-fp');if(btn&&persistent)btn.classList.add('fp-locked');
    this._hideFPPopover();this.sched();
    this.toast(persistent?'Format Painter — click items to apply':'Format Painter — click an item to apply');
  },
  deactivateFP(){
    this._fpMode=false;this._fpPersist=false;this._fpStaged=false;this._fpSourceId=null;this._fpSourceData=null;
    this.$.tl_body.classList.remove('fp-mode');
    const btn=document.getElementById('btn-fp');if(btn){btn.classList.remove('active','fp-locked')}
    this._hideFPPopover();this.sched();
  },
  _captureFPData(src){
    if(!src)return null;
    const props=this._getFPSelectedProps();if(!props.length)return null;
    const data={};
    const COMPOSITE_MAP={
      dateDisplay:['showDate','showStartDate','showEndDate','showDuration','durationFmt'],
      hiddenPinned:['hidden','pinned'],
    };
    for(const key of props){
      if(COMPOSITE_MAP[key]){for(const sk of COMPOSITE_MAP[key]){data[sk]=src[sk]}}
      else if(key==='vLine'){data.vLine=src.vLine?JSON.parse(JSON.stringify(src.vLine)):null}
      else if(key==='status'){data.status=src.status;data.statusDate=src.statusDate?U.iso(new Date()):src.statusDate}
      else{data[key]=src[key]}
    }
    return data;
  },
  fpApply(targetId){
    if(!this._fpSourceData||targetId===this._fpSourceId)return;
    const t=this.gi(targetId);if(!t)return;
    this.snap();
    for(const[k,v]of Object.entries(this._fpSourceData)){
      t[k]=(typeof v==='object'&&v!==null)?JSON.parse(JSON.stringify(v)):v;
    }
    this.sched();this.autoSave();
    this.toast('Format applied!');
    if(!this._fpPersist)this.deactivateFP();
  },
  _getFPSelectedProps(){
    try{const s=localStorage.getItem('tls3_fpProps');if(s){const p=JSON.parse(s);if(p.length)return p}}catch(e){}
    return['color','textColor','fontSize','labelPosition'];
  },
  _saveFPProps(props){
    try{localStorage.setItem('tls3_fpProps',JSON.stringify(props))}catch(e){}
  },
  _showFPPopover(){
    const pop=document.getElementById('fp-popover');if(!pop)return;
    const sel=this._getFPSelectedProps();
    pop.querySelectorAll('[data-fp]').forEach(cb=>{cb.checked=sel.includes(cb.dataset.fp)});
    pop.classList.remove('hidden');
    const anchor=document.getElementById('fp-split');
    if(anchor){const r=anchor.getBoundingClientRect();pop.style.left=Math.min(r.left,window.innerWidth-pop.offsetWidth-8)+'px';pop.style.top=(r.bottom+4)+'px'}
    const ddBtn=document.getElementById('btn-fp-dd');if(ddBtn)ddBtn.classList.add('fp-dd-open');
    this._syncFPPopoverState();
  },
  _hideFPPopover(){
    const pop=document.getElementById('fp-popover');if(pop)pop.classList.add('hidden');
    const ddBtn=document.getElementById('btn-fp-dd');if(ddBtn)ddBtn.classList.remove('fp-dd-open');
  },
  _syncFPPopoverState(){
    const pop=document.getElementById('fp-popover');if(!pop||pop.classList.contains('hidden'))return;
    const ok=this.sel.length===1;
    const note=document.getElementById('fp-sel-note');if(note)note.classList.toggle('hidden',ok);
    document.getElementById('fp-apply-once')?.classList.toggle('fp-act-disabled',!ok);
    document.getElementById('fp-apply-many')?.classList.toggle('fp-act-disabled',!ok);
  },

  getTargetSl(){
    if(this.sel.length){const it=this.gi(this.sel[0]);if(it)return this.gs(it.swimlaneId)}
    return this.proj.swimlanes[0]
  },

  addItem(type,atDate,atSlId,atSubSwId,atSubRow){
    this.snap();
    let sl=atSlId?this.gs(atSlId):this.getTargetSl();
    // If swimlane is collapsed/hidden, find next available expanded swimlane
    if(sl&&sl.collapsed!=='expanded'){
      const idx=this.proj.swimlanes.indexOf(sl);
      let found=null;
      // Search down first, then up
      for(let i=idx+1;i<this.proj.swimlanes.length;i++){if(this.proj.swimlanes[i].collapsed==='expanded'){found=this.proj.swimlanes[i];break}}
      if(!found){for(let i=idx-1;i>=0;i--){if(this.proj.swimlanes[i].collapsed==='expanded'){found=this.proj.swimlanes[i];break}}}
      if(found){sl=found;atSubSwId='';atSubRow=0}else{this.toast('All swimlanes are collapsed','error');return}
    }
    if(!sl){this.toast('Add swimlane first','error');return}
    // Auto-expand minimized sub-swimlane when adding item to it
    if(atSubSwId&&sl.subSwimlanes?.length){const targetSs=sl.subSwimlanes.find(s=>s.id===atSubSwId);if(targetSs&&targetSs.collapsed==='minimized')targetSs.collapsed='expanded'}
    const d=atDate||U.iso(new Date());
    const subSwId=atSubSwId||'';
    const subRow=typeof atSubRow==='number'?atSubRow:0;
    const it={id:U.id(),type,name:type==='milestone'?'New Milestone':'New Task',swimlaneId:sl.id,subSwimId:subSwId,subRow,color:COLORS[this.proj.items.length%COLORS.length],iconType:'triangle',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:'',status:'',statusDate:'',vLine:{enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'},links:[]};
    if(type==='milestone')it.date=d;else{it.startDate=d;it.duration=14;it.durMode='cal';it.endDate=this._calcEndDate(it)}
    this.proj.items.push(it);this.sel=[it.id];this.openPanel(it);
    if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave()
  },
  deleteSel(){if(!this.sel.length)return;this.snap();const s=new Set(this.sel);this.proj.items.forEach(i=>i.deps=(i.deps||[]).filter(d=>!s.has(this.depId(d))));this.proj.items=this.proj.items.filter(i=>!s.has(i.id));this.sel=[];this.closePanel();this.sched();this.autoSave()},
  dupSel(){if(!this.sel.length)return;this.snap();const ns=[];this.sel.forEach(id=>{const o=this.gi(id);if(!o)return;const c=U.deep(o);c.id=U.id();c.name+=' (copy)';c.subRow=(o.subRow||0)+1;c.deps=[];if(c.status)c.statusDate=U.iso(new Date());ns.push(c)});this.proj.items.push(...ns);this.sel=ns.map(i=>i.id);this.sched();this.autoSave()},
  clearSelDeps(){if(!this.sel.length)return;this.snap();this.sel.forEach(id=>{const it=this.gi(id);if(it)it.deps=[]});this.sched();this.autoSave();this.toast('Selected deps cleared')},

  showCtx(e,iid){
    e.preventDefault();if(iid&&!this.sel.includes(iid)){if(!e.ctrlKey&&!e.metaKey)this.sel=[iid];else this.sel.push(iid)}
    const tl=this.met(),bR=this.$.tl_body.getBoundingClientRect();
    // bR.left already reflects scroll position of tl_body_scroll, so no need to add scrollLeft
    const xRel=e.clientX-bR.left;
    this._ctxDate=this.xD(xRel,tl);
    let clickSl=null,clickSubSw='',clickSubRow=0;
    document.querySelectorAll('.sw-row').forEach(r=>{
      const rect=r.getBoundingClientRect();
      if(e.clientY>=rect.top&&e.clientY<=rect.bottom){
        clickSl=r.dataset.slId;
        const sl=this.gs(clickSl);
        if(sl&&sl.collapsed==='expanded'){
          const yInSw=e.clientY-rect.top;
          const rH=38;
          const subs=sl.subSwimlanes||[];
          if(subs.length>0){
            // Collect sub-swimlane divider positions from DOM
            const dividers=[];
            r.querySelectorAll('.sub-sw-div').forEach(d=>{
              const t=parseFloat(d.style.top)||0;dividers.push(d.classList.contains('sub-rh')?t+3:t)
            });
            // Build sub-swimlane bands: [{ssId, yStart, yEnd}]
            const bands=[];let prevY=0;
            for(let si=0;si<subs.length;si++){
              const yEnd=si<dividers.length?dividers[si]:rect.height;
              bands.push({ssId:subs[si].id,yStart:prevY,yEnd});
              prevY=yEnd
            }
            if(bands.length&&prevY<rect.height)bands[bands.length-1].yEnd=rect.height;
            // Find which band the click is in
            for(const band of bands){
              if(yInSw>=band.yStart&&yInSw<band.yEnd){
                clickSubSw=band.ssId;
                clickSubRow=Math.max(0,Math.floor((yInSw-band.yStart-6)/rH));
                break
              }
            }
            if(!clickSubSw&&bands.length){clickSubSw=bands[0].ssId;clickSubRow=0}
          }else{
            clickSubRow=Math.max(0,Math.floor((yInSw-6)/rH))
          }
        }
      }
    });
    this._ctxSlId=clickSl;this._ctxSubSwId=clickSubSw;this._ctxSubRow=clickSubRow;
    this.$.ctx_link_dep.classList.toggle('ctx-disabled',this.sel.length<2);
    /* URL Links sub-menu: disable open items if no links on selection */
    const selHasLinks=this.sel.some(id=>{const i=this.gi(id);return i&&i.links&&i.links.length>0});
    document.getElementById('ctx-open-primary')?.classList.toggle('ctx-disabled',!selHasLinks);
    document.getElementById('ctx-open-all')?.classList.toggle('ctx-disabled',!selHasLinks);
    // Toggle propagate vs auto-schedule label
    const isScheduled=this.proj.schedulingMode==='scheduled';
    const cp=document.getElementById('ctx-propagate'),ca=document.getElementById('ctx-sched-auto');
    if(cp)cp.classList.toggle('hidden',isScheduled);if(ca)ca.classList.toggle('hidden',!isScheduled);
    /* Populate status submenu */
    const ctxSub=document.getElementById('ctx-status-sub');
    if(ctxSub){
      const defs=this.proj.statusDefs||[];
      ctxSub.innerHTML=defs.map(sd=>{
        const label=sd.id==='blank'?'(None)':`${sd.emoji} ${sd.name}`;
        return`<div class="ctx-item ctx-status-opt" data-status-id="${sd.id}">${label}</div>`
      }).join('');
      ctxSub.querySelectorAll('.ctx-status-opt').forEach(el=>{
        el.addEventListener('click',ev=>{
          ev.stopPropagation();
          const sid=el.dataset.statusId;
          this.snap();
          this.sel.forEach(id=>{const i=this.gi(id);if(i){i.status=(sid==='blank'?'':sid);i.statusDate=i.status?U.iso(new Date()):''}});
          this.$.ctx_menu.classList.add('hidden');
          this.sched();this.autoSave();
        })
      })
    }
    const m=this.$.ctx_menu;m.classList.remove('hidden');m.style.left=Math.min(e.clientX,window.innerWidth-210)+'px';m.style.top=Math.min(e.clientY,window.innerHeight-400)+'px';requestAnimationFrame(()=>{const r=m.getBoundingClientRect();if(r.bottom>window.innerHeight-8)m.style.top=Math.max(4,window.innerHeight-r.height-8)+'px'})
  },

  ctxAct(a){
    const it=this.sel.length===1?this.gi(this.sel[0]):null;
    switch(a){
      case'edit':if(this.panelCollapsed)this.expandPanel();if(it)this.openPanel(it);else if(this.sel.length>1)this.openBulkPanel();break;
      case'duplicate':this.dupSel();break;case'delete':this.deleteSel();break;
      case'add-ms-here':this.addItem('milestone',this._ctxDate,this._ctxSlId,this._ctxSubSwId,this._ctxSubRow);break;
      case'add-task-here':this.addItem('task',this._ctxDate,this._ctxSlId,this._ctxSubSwId,this._ctxSubRow);break;
      case'link-dep':this.linkDepFromSel();break;
      case'manage-links':if(this.panelCollapsed)this.expandPanel();if(it){this.openPanel(it);setTimeout(()=>{const s=document.getElementById('pp-links-section');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})},100)}break;
      case'open-primary-link':this.openPrimaryLinks();break;
      case'open-all-links':this.openAllLinks();break;
      case'toggle-hidden':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.hidden=!i.hidden});this.sched();this.autoSave();if(this.proj.hideMode)this._hintHidePill();break;
      case'toggle-pin':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.pinned=!i.pinned});this.sched();this.autoSave();break;
      case'propagate':this.propagateFrom(this.sel);break;
      case'clear-deps':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.deps=[]});this.sched();this.autoSave();break;
      case'auto-arrange':this.autoArrange(this.sel.length?'selection':'all');break;
      case'lp-left':case'lp-right':case'lp-top':case'lp-bottom':case'lp-center':
        this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.labelPosition=a.slice(3)});this.sched();this.autoSave();break;
    }
  },

  openPrimaryLinks(){
    const items=this.sel.map(id=>this.gi(id)).filter(i=>i&&i.links&&i.links.length);
    if(!items.length){this.toast('No URL links on selected items','error');return}
    const urls=items.map(i=>i.links[0].url).filter(Boolean);
    if(urls.length>5&&!confirm(`Open ${urls.length} URL links in new tabs?`))return;
    urls.forEach(u=>window.open(u,'_blank'));
  },
  openAllLinks(){
    const items=this.sel.map(id=>this.gi(id)).filter(i=>i&&i.links&&i.links.length);
    if(!items.length){this.toast('No URL links on selected items','error');return}
    const urls=items.flatMap(i=>i.links.map(lk=>lk.url)).filter(Boolean);
    if(urls.length>5&&!confirm(`This will open ${urls.length} URL links in new tabs. Continue?`))return;
    urls.forEach(u=>window.open(u,'_blank'));
  },

  /* Bulk URL Links modal */
  _bulkLinkTarget:null,
  showBulkLinks(target){
    this._bulkLinkTarget=target;
    const m=document.getElementById('bulk-links-modal');
    const ta=document.getElementById('bulk-links-text');
    const pv=document.getElementById('bulk-links-preview');
    ta.value='';pv.textContent='';m.classList.remove('hidden');ta.focus();
    const lks=Array.isArray(target.links)?target.links:[];
    const max=target.swimlaneId!==undefined?5:3;/* items=5, swimlanes=3 */
    const remain=max-lks.length;
    pv.textContent=`${remain} slot${remain===1?'':'s'} remaining`;
  },
  parseBulkLinks(text){
    return text.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{
      let name='',url='';
      const tabI=line.indexOf('\t');const commaI=line.indexOf(',');
      if(tabI>0&&(commaI<0||tabI<commaI)){name=line.slice(0,tabI).trim();url=line.slice(tabI+1).trim()}
      else if(commaI>0){const before=line.slice(0,commaI).trim();const after=line.slice(commaI+1).trim();if(/^https?:\/\//.test(after)||after.includes('.')){name=before;url=after}else url=line}
      else url=line;
      if(url&&!/^[a-z]+:\/\//i.test(url))url='https://'+url;
      if(!name&&url){try{name=new URL(url).hostname.replace(/^www\./,'')}catch(e){}}
      return{name,url};
    }).filter(lk=>lk.url);
  },
  doBulkLinks(){
    const t=this._bulkLinkTarget;if(!t)return;
    const ta=document.getElementById('bulk-links-text');
    const parsed=this.parseBulkLinks(ta.value);
    if(!parsed.length){this.toast('No valid URLs found','error');return}
    const max=t.swimlaneId!==undefined?5:3;
    const remain=max-(t.links||[]).length;
    if(remain<=0){this.toast(`Maximum URL links reached (${max})`,'error');return}
    const toAdd=parsed.slice(0,remain);
    this.snap();if(!t.links)t.links=[];t.links.push(...toAdd);
    document.getElementById('bulk-links-modal').classList.add('hidden');
    this.sched();this.autoSave();
    if(this.editItem&&this.editItem.id===t.id)this.renderPanel(t);
    const skipped=parsed.length-toAdd.length;
    this.toast(`Added ${toAdd.length} URL link${toAdd.length===1?'':'s'}${skipped?' ('+skipped+' skipped — max reached)':''}`);
  },

  linkDepFromSel(){
    if(this.sel.length<2)return;this.snap();
    const items=this.sel.map(id=>this.gi(id)).filter(Boolean);
    items.sort((a,b)=>{const da=a.date||a.startDate||'',db=b.date||b.startDate||'';return da<db?-1:da>db?1:0});
    let linked=0;
    for(let i=1;i<items.length;i++){
      const hasLink=items[i].deps.some(d=>this.depId(d)===items[i-1].id);
      if(!hasLink){
        if(this.hasCycle(items[i].id,items[i-1].id)){this.toast('Skipped circular dep','error');continue}
        items[i].deps.push({id:items[i-1].id,type:'FS',lag:0});linked++}}
    this.sched();this.autoSave();this.toast(`Linked ${linked} items`)
  },

  /* DT context menu actions */
  _dtCtxItemId:null,
  dtCtxAct(a){
    const id=this._dtCtxItemId;if(!id)return;
    const it=this.gi(id);if(!it)return;
    this.snap();
    if(a==='toggle-pin')it.pinned=!it.pinned;
    else if(a==='toggle-hidden'){it.hidden=!it.hidden;if(this.proj.hideMode)this._hintHidePill()}
    this.sched();this.autoSave();if(this.editItem&&this.editItem.id===id)this.renderPanel(it);
  },


  /* ===== SWIMLANE MODAL ===== */
  _esl:null,_tmpSubs:[],
  showSwM(sl=null){
    this._esl=sl;this.$.sw_modal_title.textContent=sl?'Edit Swimlane':'Add Swimlane';
    this.$.sw_name.value=sl?sl.name:'';this.$.sw_color.value=sl?sl.color:COLORS[this.proj.swimlanes.length%COLORS.length];
    document.getElementById('btn-del-sw').classList.toggle('hidden',!sl);
    this._tmpSubs=sl?sl.subSwimlanes.map(s=>({...s})):[];this.renderSSW();
    this._tmpSlLinks=sl&&sl.links?sl.links.map(lk=>({...lk})):[];this.renderSlLinks();
    const pe=document.getElementById('sw-color-pre');
    if(pe){pe.innerHTML=COLORS.slice(0,10).map(c=>`<div class="cs" style="background:${c}" data-c="${c}"></div>`).join('');pe.querySelectorAll('.cs').forEach(s=>{s.onclick=()=>this.$.sw_color.value=s.dataset.c})}
    const fsEl=document.getElementById('sw-fontsize');if(fsEl)fsEl.value=sl&&sl.fontSize?sl.fontSize:'';
    this.showModal('sw-modal');this.$.sw_name.focus()
  },
  renderSSW(){
    const el=document.getElementById('ssw-list');if(!el)return;
    el.innerHTML=this._tmpSubs.map((ss,i)=>`<div class="ssw-row"><input class="form-input ssw-nm" value="${U.esc(ss.name)}" placeholder="Sub-lane name" data-i="${i}"><button class="btn btn-secondary" style="padding:2px 6px;font-size:10px" data-act="ssw-up" data-i="${i}">↑</button><button class="btn btn-secondary" style="padding:2px 6px;font-size:10px" data-act="ssw-dn" data-i="${i}">↓</button><button class="btn btn-danger" style="padding:2px 7px;font-size:11px" data-act="ssw-del" data-i="${i}">&times;</button></div>`).join('')||'<div style="color:var(--tx3);font-size:11px;padding:3px 0">None — click + Add</div>';
    el.querySelectorAll('[data-act="ssw-del"]').forEach(b=>{b.onclick=()=>{this._tmpSubs.splice(+b.dataset.i,1);this.renderSSW()}});
    el.querySelectorAll('[data-act="ssw-up"]').forEach(b=>{b.onclick=()=>{const i=+b.dataset.i;if(i>0){[this._tmpSubs[i-1],this._tmpSubs[i]]=[this._tmpSubs[i],this._tmpSubs[i-1]];this.renderSSW()}}});
    el.querySelectorAll('[data-act="ssw-dn"]').forEach(b=>{b.onclick=()=>{const i=+b.dataset.i;if(i<this._tmpSubs.length-1){[this._tmpSubs[i],this._tmpSubs[i+1]]=[this._tmpSubs[i+1],this._tmpSubs[i]];this.renderSSW()}}});
    el.querySelectorAll('.ssw-nm').forEach(inp=>{inp.oninput=()=>this._tmpSubs[+inp.dataset.i].name=inp.value});
  },
  renderSlLinks(){
    const el=document.getElementById('sw-link-list');if(!el)return;
    const lks=this._tmpSlLinks||[];
    el.innerHTML=lks.map((lk,i)=>`<div style="display:flex;gap:4px;align-items:center"><input class="form-input sw-lk-nm" data-i="${i}" value="${U.esc(lk.name)}" placeholder="Name" style="flex:1;font-size:10px;padding:3px 4px"><input class="form-input sw-lk-url" data-i="${i}" value="${U.esc(lk.url)}" placeholder="https://…" style="flex:2;font-size:10px;padding:3px 4px;font-family:monospace"><button class="pab sw-lk-open" data-i="${i}" title="Open" style="font-size:9px;padding:1px 4px">🌐</button><button class="pab sw-lk-copy" data-i="${i}" title="Copy URL" style="font-size:9px;padding:1px 4px">📋</button><button class="btn btn-danger sw-lk-del" data-i="${i}" style="padding:2px 7px;font-size:11px">&times;</button></div>`).join('')||'<div style="color:var(--tx3);font-size:11px;padding:3px 0">None</div>';
    el.querySelectorAll('.sw-lk-nm').forEach(inp=>{inp.oninput=()=>{if(this._tmpSlLinks[+inp.dataset.i])this._tmpSlLinks[+inp.dataset.i].name=inp.value}});
    el.querySelectorAll('.sw-lk-url').forEach(inp=>{
      inp.oninput=()=>{if(this._tmpSlLinks[+inp.dataset.i])this._tmpSlLinks[+inp.dataset.i].url=inp.value};
      inp.onblur=()=>{const li=+inp.dataset.i;if(!this._tmpSlLinks[li])return;let u=inp.value.trim();if(u&&!/^[a-z]+:\/\//i.test(u)){u='https://'+u;inp.value=u;this._tmpSlLinks[li].url=u}if(u&&!this._tmpSlLinks[li].name){try{this._tmpSlLinks[li].name=new URL(u).hostname.replace(/^www\./,'')}catch(e){}this.renderSlLinks()}}
    });
    el.querySelectorAll('.sw-lk-open').forEach(b=>{b.onclick=()=>{const lk=this._tmpSlLinks[+b.dataset.i];if(lk?.url)window.open(lk.url,'_blank')}});
    el.querySelectorAll('.sw-lk-copy').forEach(b=>{b.onclick=()=>{const lk=this._tmpSlLinks[+b.dataset.i];if(lk?.url){navigator.clipboard.writeText(lk.url);this.toast('URL copied')}}});
    el.querySelectorAll('.sw-lk-del').forEach(b=>{b.onclick=()=>{this._tmpSlLinks.splice(+b.dataset.i,1);this.renderSlLinks()}});
    const addBtn=document.getElementById('btn-sw-link-add');
    if(addBtn){addBtn.style.display=lks.length>=3?'none':'';addBtn.onclick=()=>{if(this._tmpSlLinks.length>=3){this.toast('Maximum 3 URL links per swimlane','error');return}this._tmpSlLinks.push({name:'',url:''});this.renderSlLinks()}}
  },
  addSubSw(){
    if(this._tmpSubs.length===0&&this._esl){
      const defId=U.id();this._tmpSubs.push({id:defId,name:this._esl.name+' (Default)',height:0,collapsed:'expanded'});
      this._tmpDefSubId=defId;
    }
    this._tmpSubs.push({id:U.id(),name:'Sub-lane '+(this._tmpSubs.length+1),height:0,collapsed:'expanded'});this.renderSSW()
  },
  saveSwM(){
    this.snap();const name=this.$.sw_name.value.trim()||'Untitled';const color=this.$.sw_color.value;
    if(this._tmpDefSubId&&this._esl){this.proj.items.filter(i=>i.swimlaneId===this._esl.id&&!i.subSwimId).forEach(i=>i.subSwimId=this._tmpDefSubId);this._tmpDefSubId=null}
    const fs=parseFloat(document.getElementById('sw-fontsize')?.value)||0;
    const subs=this._tmpSubs.filter(s=>s.name.trim()).map(s=>({id:s.id,name:s.name.trim(),height:s.height||0,collapsed:s.collapsed||'expanded',fontSize:s.fontSize||0,links:s.links||[]}));
    const slLinks=(this._tmpSlLinks||[]).filter(lk=>lk.url&&lk.url.trim());
    if(this._esl){this._esl.name=name;this._esl.color=color;this._esl.fontSize=fs;this._esl.subSwimlanes=subs;this._esl.links=slLinks}
    else this.proj.swimlanes.push({id:U.id(),name,color,height:120,subSwimlanes:subs,collapsed:'expanded',fontSize:fs,links:slLinks});
    document.getElementById('sw-modal').classList.add('hidden');this.sched();this.autoSave()
  },
  delSwM(){if(!this._esl||!confirm(`Delete "${this._esl.name}"?`))return;this.snap();const sid=this._esl.id;this.proj.items=this.proj.items.filter(i=>i.swimlaneId!==sid);this.proj.swimlanes=this.proj.swimlanes.filter(s=>s.id!==sid);document.getElementById('sw-modal').classList.add('hidden');this.sched();this.autoSave()},
  reorderSw(dir){
    if(!this._esl)return;const idx=this.proj.swimlanes.indexOf(this._esl);
    const ni=idx+dir;if(ni<0||ni>=this.proj.swimlanes.length)return;
    this.snap();[this.proj.swimlanes[idx],this.proj.swimlanes[ni]]=[this.proj.swimlanes[ni],this.proj.swimlanes[idx]];
    this.sched();this.autoSave();this.toast('Reordered')
  },

  renderScList(){
    const el=document.getElementById('sc-list');if(!el)return;
    const ov=this._pendingShortcuts||{};
    let h='';
    // Tier 1 — Reserved (2-column compact grid)
    h+='<div class="sc-cat">Reserved</div>';
    h+='<div class="sc-reserved-grid">';
    SHORTCUT_ACTIONS.filter(a=>a.reserved).forEach(a=>{
      const bindings=a.defaults;
      h+=`<div class="sc-reserved-cell"><span class="sc-reserved-label">${U.esc(a.label)}</span>`;
      bindings.forEach(c=>{h+=`<kbd class="sc-reserved-kbd">${U.esc(this._displayCombo(c))}</kbd>`});
      h+='</div>';
    });
    h+='</div>';
    // Tier 2 — Customizable, grouped by cat
    const cats=['Edit','View','Tools','Items','Export'];
    cats.forEach(cat=>{
      const actions=SHORTCUT_ACTIONS.filter(a=>a.cat===cat&&!a.hidden);
      if(!actions.length)return;
      h+=`<div class="sc-cat">${U.esc(cat)}</div>`;
      actions.forEach(a=>{
        const bindings=ov[a.id]!==undefined?ov[a.id]:[...a.defaults];
        h+=`<div class="sc-row" data-sc-id="${a.id}"><span class="sc-label">${U.esc(a.label)}</span><div class="sc-bindings">`;
        if(!bindings.length)h+='<span class="sc-none">none</span>';
        bindings.forEach((c,i)=>{
          h+=`<span class="sc-key" data-sc-id="${a.id}" data-idx="${i}"><kbd>${U.esc(this._displayCombo(c))}</kbd><span class="sc-rm" data-sc-id="${a.id}" data-idx="${i}" title="Remove">&times;</span></span>`;
        });
        if(bindings.length<2)h+=`<button class="sc-add" data-sc-id="${a.id}" title="Add shortcut">+</button>`;
        h+='</div></div>';
      });
    });
    // Tier 3 — Mouse & Modifier Reference
    h+='<div class="sc-cat">Mouse & Modifiers (Reference)</div>';
    MOUSE_REFS.forEach(r=>{
      h+=`<div class="sc-ref-row"><span class="sc-ref-combo">${U.esc(r.combo)}</span><span class="sc-ref-desc">${U.esc(r.desc)}</span></div>`;
    });
    el.innerHTML=h;
    // Wire click handlers for Tier 2
    el.querySelectorAll('.sc-rm').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();const aid=btn.dataset.scId,idx=+btn.dataset.idx;
        if(!this._pendingShortcuts)this._pendingShortcuts={};
        const cur=this._pendingShortcuts[aid]!==undefined?[...this._pendingShortcuts[aid]]:[...(SHORTCUT_ACTIONS.find(a=>a.id===aid)?.defaults||[])];
        cur.splice(idx,1);this._pendingShortcuts[aid]=cur;
        this._hideScMsg();
        this.renderScList();
      };
    });
    el.querySelectorAll('.sc-add').forEach(btn=>{
      btn.onclick=e=>{e.stopPropagation();this._startScRecord(btn.dataset.scId,-1,btn)};
    });
    el.querySelectorAll('.sc-key[data-idx]').forEach(k=>{
      if(k.closest('.sc-reserved'))return;
      k.onclick=e=>{if(e.target.closest('.sc-rm'))return;this._startScRecord(k.dataset.scId,+k.dataset.idx,k)};
    });
  },
  _startScRecord(actionId,idx,el){
    if(this._scRecording)this._stopScRecord();
    this._scRecording={actionId,idx,el};
    el.classList.add('recording');
    const kbd=el.querySelector('kbd');
    if(idx===-1)el.textContent='…';else if(kbd)kbd.textContent='…';
    this._scRecordHandler=e=>{
      e.preventDefault();e.stopPropagation();
      if(e.key==='Escape'){this._hideScMsg();this._stopScRecord();return}
      const combo=this._normalizeKey(e);if(!combo)return;
      this._applyScRecord(combo);
    };
    document.addEventListener('keydown',this._scRecordHandler,true);
  },
  _stopScRecord(){
    if(!this._scRecording)return;
    this._scRecording.el.classList.remove('recording');
    document.removeEventListener('keydown',this._scRecordHandler,true);
    this._scRecording=null;this._scRecordHandler=null;
    this.renderScList();
  },
  _showScMsg(text,duration=5000){
    const msg=document.getElementById('sc-conflict-msg');if(!msg)return;
    if(this._scMsgTimer){clearTimeout(this._scMsgTimer);this._scMsgTimer=null}
    msg.textContent=text;msg.classList.remove('hidden','sc-msg-fade');
    this._scMsgTimer=setTimeout(()=>{
      msg.classList.add('sc-msg-fade');
      const onEnd=()=>{msg.classList.add('hidden');msg.classList.remove('sc-msg-fade');msg.removeEventListener('transitionend',onEnd)};
      msg.addEventListener('transitionend',onEnd);
    },duration);
  },
  _hideScMsg(){
    const msg=document.getElementById('sc-conflict-msg');if(!msg)return;
    if(this._scMsgTimer){clearTimeout(this._scMsgTimer);this._scMsgTimer=null}
    msg.classList.add('hidden');msg.classList.remove('sc-msg-fade');
  },
  _applyScRecord(combo){
    const{actionId,idx}=this._scRecording;
    const norm=combo.toLowerCase();
    // Block clipboard combos
    if(RESERVED_COMBOS.has(norm)){
      this._showScMsg(`"${this._displayCombo(combo)}" is reserved by the browser for clipboard operations and cannot be bound.`);
      this._stopScRecord();return;
    }
    // Warn about browser-reserved
    if(BROWSER_RESERVED.has(norm)){
      this._showScMsg(`⚠ "${this._displayCombo(combo)}" is used by your browser and may not work reliably.`);
    }
    // Check conflicts
    const conflict=this._findScConflict(combo,actionId);
    if(conflict){
      const cLabel=SHORTCUT_ACTIONS.find(a=>a.id===conflict)?.label||conflict;
      this._showScMsg(`"${this._displayCombo(combo)}" is already bound to "${cLabel}". Remove it from that action first.`);
      this._stopScRecord();return;
    }
    if(!this._pendingShortcuts)this._pendingShortcuts={};
    const cur=this._pendingShortcuts[actionId]!==undefined?[...this._pendingShortcuts[actionId]]:[...(SHORTCUT_ACTIONS.find(a=>a.id===actionId)?.defaults||[])];
    if(idx===-1)cur.push(combo);else cur[idx]=combo;
    this._pendingShortcuts[actionId]=cur;
    if(!BROWSER_RESERVED.has(norm))this._hideScMsg();
    this._stopScRecord();
  },
  _findScConflict(combo,excludeId){
    const norm=combo.toLowerCase();
    const ov=this._pendingShortcuts||{};
    for(const a of SHORTCUT_ACTIONS){
      if(a.id===excludeId)continue;
      const bindings=a.reserved?a.defaults:(ov[a.id]!==undefined?ov[a.id]:[...a.defaults]);
      if(bindings.some(b=>b.toLowerCase()===norm))return a.id;
    }
    return null;
  },
  /* ===== STATUS DEFINITION SETTINGS ===== */
  renderStatusDefList(){
    const list=document.getElementById('status-def-list');if(!list)return;
    const defs=this._pendingStatusDefs||[];
    let h='';
    defs.forEach((sd,i)=>{
      const isBlank=sd.id==='blank';
      h+=`<div class="status-def-row${isBlank?' status-def-blank':''}" data-idx="${i}">`;
      if(isBlank){
        h+=`<div style="flex:1;padding:6px 10px;font-size:10px;color:var(--tx3);font-style:italic">(None / Blank) — default when no status is set</div>`;
      }else{
        h+=`<input type="color" class="sd-color" data-idx="${i}" value="${sd.color||'#6b7280'}" title="Status color" style="width:28px;height:24px;padding:0;border:1px solid var(--brd);border-radius:3px;cursor:pointer">`;
        h+=`<input type="text" class="sd-emoji" data-idx="${i}" value="${U.esc(sd.emoji||'')}" title="Emoji (1-2 chars)" maxlength="2" style="width:32px;text-align:center;font-size:13px;padding:2px;border:1px solid var(--brd);border-radius:3px;background:var(--bg2);color:var(--tx1)">`;
        h+=`<input type="text" class="sd-name" data-idx="${i}" value="${U.esc(sd.name||'')}" placeholder="Name" title="Status name" style="flex:1;min-width:80px;font-size:11px;padding:3px 6px;border:1px solid var(--brd);border-radius:3px;background:var(--bg2);color:var(--tx1)">`;
        h+=`<input type="text" class="sd-short" data-idx="${i}" value="${U.esc(sd.shortName||'')}" placeholder="Srt" title="Short name (1-3 chars, required)" maxlength="3" style="width:36px;text-align:center;font-size:11px;font-weight:700;padding:3px;border:1px solid var(--brd);border-radius:3px;background:var(--bg2);color:var(--tx1)">`;
        h+=`<input type="text" class="sd-desc" data-idx="${i}" value="${U.esc(sd.desc||'')}" placeholder="Description…" title="Status description" style="flex:1.5;min-width:100px;font-size:10px;padding:3px 6px;border:1px solid var(--brd);border-radius:3px;background:var(--bg2);color:var(--tx3)">`;
        h+=`<div class="sd-actions">`;
        if(i>1)h+=`<button class="sd-btn sd-up" data-idx="${i}" title="Move up">▲</button>`;else h+=`<span style="width:20px"></span>`;
        if(i<defs.length-1)h+=`<button class="sd-btn sd-down" data-idx="${i}" title="Move down">▼</button>`;else h+=`<span style="width:20px"></span>`;
        h+=`<button class="sd-btn sd-del" data-idx="${i}" title="Delete status">✕</button>`;
        h+=`</div>`;
      }
      h+=`</div>`;
    });
    list.innerHTML=h;
    this.bindStatusDefList();
  },
  bindStatusDefList(){
    const list=document.getElementById('status-def-list');if(!list)return;
    const defs=this._pendingStatusDefs;
    list.querySelectorAll('.sd-color').forEach(el=>{el.oninput=()=>{defs[+el.dataset.idx].color=el.value}});
    list.querySelectorAll('.sd-emoji').forEach(el=>{el.oninput=()=>{defs[+el.dataset.idx].emoji=el.value}});
    list.querySelectorAll('.sd-name').forEach(el=>{el.oninput=()=>{defs[+el.dataset.idx].name=el.value}});
    list.querySelectorAll('.sd-short').forEach(el=>{el.oninput=()=>{defs[+el.dataset.idx].shortName=el.value}});
    list.querySelectorAll('.sd-desc').forEach(el=>{el.oninput=()=>{defs[+el.dataset.idx].desc=el.value}});
    list.querySelectorAll('.sd-up').forEach(el=>{el.onclick=()=>{const i=+el.dataset.idx;if(i<2)return;[defs[i-1],defs[i]]=[defs[i],defs[i-1]];this.renderStatusDefList()}});
    list.querySelectorAll('.sd-down').forEach(el=>{el.onclick=()=>{const i=+el.dataset.idx;if(i>=defs.length-1)return;[defs[i],defs[i+1]]=[defs[i+1],defs[i]];this.renderStatusDefList()}});
    list.querySelectorAll('.sd-del').forEach(el=>{el.onclick=()=>{const i=+el.dataset.idx;if(i<1)return;defs.splice(i,1);this.renderStatusDefList()}});
  },
  showStatusImpact(deletedMap,modifiedList){
    const modal=document.getElementById('status-impact-modal');if(!modal)return;
    // Build summary
    const totalDefs=this._pendingStatusDefs.length;
    const delCount=deletedMap.size;
    const modCount=modifiedList.length;
    let sumH=`<div style="font-size:11px;color:var(--tx2)">${totalDefs} statuses defined`;
    if(delCount)sumH+=` · <strong style="color:var(--danger)">${delCount} deleted</strong>`;
    if(modCount)sumH+=` · ${modCount} modified`;
    sumH+=`</div>`;
    document.getElementById('status-impact-summary').innerHTML=sumH;
    // Deleted section
    const delEl=document.getElementById('status-impact-deleted');
    if(delCount){
      const remaining=this._pendingStatusDefs.filter(sd=>sd.id!=='blank');
      let dH=`<div style="font-size:11px;font-weight:600;margin-bottom:6px;color:var(--tx2)">Deleted Statuses (items will lose their status)</div>`;
      dH+=`<div style="border:1px solid var(--brd);border-radius:4px;overflow:hidden">`;
      deletedMap.forEach((items,sd)=>{
        dH+=`<div class="status-impact-row" data-del-id="${sd.id}" style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--brd);font-size:11px">`;
        dH+=`<span>${sd.emoji||''}</span>`;
        dH+=`<span style="font-weight:600">"${U.esc(sd.name)}"</span>`;
        dH+=`<span style="color:var(--tx3)">— ${items.length} item${items.length===1?'':'s'}</span>`;
        dH+=`<span style="margin-left:auto;font-size:10px;color:var(--tx3)">Move to:</span>`;
        dH+=`<select class="si-move-sel form-input" data-del-id="${sd.id}" style="width:auto;font-size:10px;padding:2px 4px">`;
        dH+=`<option value="">(None)</option>`;
        remaining.forEach(rs=>{dH+=`<option value="${rs.id}">${rs.emoji} ${U.esc(rs.name)}</option>`});
        dH+=`</select>`;
        dH+=`</div>`;
      });
      dH+=`</div>`;
      // Bulk move
      if(delCount>1){
        dH+=`<div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:10px;color:var(--tx3)">`;
        dH+=`<span>Bulk: Move all deleted items to:</span>`;
        dH+=`<select id="si-bulk-move" class="form-input" style="width:auto;font-size:10px;padding:2px 4px">`;
        dH+=`<option value="">(None)</option>`;
        remaining.forEach(rs=>{dH+=`<option value="${rs.id}">${rs.emoji} ${U.esc(rs.name)}</option>`});
        dH+=`</select>`;
        dH+=`</div>`;
      }
      delEl.innerHTML=dH;
      // Bulk move wiring
      const bulkSel=document.getElementById('si-bulk-move');
      if(bulkSel){bulkSel.onchange=()=>{delEl.querySelectorAll('.si-move-sel').forEach(s=>{s.value=bulkSel.value})}}
    }else{delEl.innerHTML=''}
    // Modified section
    const modEl=document.getElementById('status-impact-modified');
    if(modCount){
      let mH=`<div style="font-size:11px;font-weight:600;margin:12px 0 6px;color:var(--tx2)">Modified Statuses (auto-updated)</div>`;
      mH+=`<div style="border:1px solid var(--brd);border-radius:4px;overflow:hidden;opacity:.6">`;
      modifiedList.forEach(({sd,changes,count})=>{
        mH+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid var(--brd);font-size:11px;color:var(--tx3)">`;
        mH+=`<span>${sd.emoji||''}</span>`;
        mH+=`<span style="font-weight:600">"${U.esc(sd.name)}"</span>`;
        mH+=`<span>— ${changes.join(', ')}</span>`;
        mH+=`<span style="margin-left:auto">${count} item${count===1?'':'s'}</span>`;
        mH+=`</div>`;
      });
      mH+=`</div>`;
      modEl.innerHTML=mH;
    }else{modEl.innerHTML=''}
    // Store for apply
    this._statusImpactDeleted=deletedMap;
    // Show modal
    modal.classList.remove('hidden');
    const mc=modal.querySelector('.modal-content');if(mc){mc.style.position='';mc.style.margin='';mc.style.left='';mc.style.top='';mc.style.transform=''}
  },
  applyStatusChanges(){
    // Reassign items per dropdown selections
    const delEl=document.getElementById('status-impact-deleted');
    if(this._statusImpactDeleted&&delEl){
      this._statusImpactDeleted.forEach((items,sd)=>{
        const sel=delEl.querySelector(`.si-move-sel[data-del-id="${sd.id}"]`);
        const newId=sel?sel.value:'';
        items.forEach(it=>{
          it.status=newId;
          it.statusDate=newId?U.iso(new Date()):'';
        });
      });
    }
    // Commit pending defs
    this.proj.statusDefs=U.deep(this._pendingStatusDefs);
    this.proj.statusDisplay={
      show:document.getElementById('s-status-show')?.checked!==false,
      mode:document.getElementById('s-status-mode')?.value||'emoji',
      badgePos:document.getElementById('s-status-pos')?.value||'inline',
      colorOverride:document.getElementById('s-status-color-override')?.checked||false,
      blankColor:document.getElementById('s-status-blank-on')?.checked?document.getElementById('s-status-blank-color')?.value||'#6b7280':''
    };
    // Close impact modal, close settings
    document.getElementById('status-impact-modal').classList.add('hidden');
    document.getElementById('settings-modal').classList.add('hidden');
    this.sched();this.autoSave();this.toast('Status settings applied');
  },

  _resetSettingsLive(){
    const sm=document.getElementById('settings-modal');if(!sm)return;
    sm.classList.remove('modal-live');
    const mc=sm.querySelector('.modal-content');if(mc){mc.style.left='';mc.style.top=''}
    /* Restore original theme if settings were cancelled */
    if(this._settingsOrigTheme!=null){this.proj.theme=this._settingsOrigTheme;this.applyTheme();this._settingsOrigTheme=null}
  },
  showSettings(){
    const p=this.proj;this._settingsOrigTheme=p.theme;
    this.$.s_name.value=p.name;this.$.s_owner.value=p.owner||'';
    this.$.s_start.value=p.timelineStart;this.$.s_end.value=p.timelineEnd;
    this.$.s_auto_range.checked=p.autoRange;this.$.s_today.checked=p.showToday;this.$.s_deps.checked=p.showDeps;
    document.getElementById('deps-opts').classList.toggle('hidden',!p.showDeps);
    const dfVal=p.depFilter||'all';document.querySelectorAll('input[name="s-dep-filter"]').forEach(r=>r.checked=(r.value===dfVal));
    this.$.s_fontsize.value=p.fontSize||11;
    // Date format
    const dfSel=document.getElementById('s-date-fmt');
    const cfGrp=document.getElementById('custom-fmt-group');
    const cfInp=document.getElementById('s-custom-fmt');
    if(dfSel){
      if(p.dateFormat&&p.dateFormat.startsWith('custom:')){dfSel.value='custom';if(cfInp)cfInp.value=p.dateFormat.slice(7);if(cfGrp)cfGrp.style.display=''}
      else{dfSel.value=p.dateFormat||'MMM D, YYYY';if(cfGrp)cfGrp.style.display='none'}
      dfSel.onchange=function(){if(cfGrp)cfGrp.style.display=this.value==='custom'?'':'none'}
    }
    document.querySelectorAll('.theme-card').forEach(c=>c.classList.toggle('active',c.dataset.theme===p.theme));
    document.getElementById('s-show-weekends').checked=p.showWeekends;
    document.getElementById('weekend-inline').classList.toggle('hidden',!p.showWeekends);
    document.getElementById('weekend-opts').classList.toggle('hidden',!p.showWeekends);
    document.getElementById('s-wknd-opacity').value=p.weekendOpacity||8;
    document.getElementById('s-wknd-opval').textContent=(p.weekendOpacity||8)+'%';
    document.getElementById('s-wknd-auto').checked=p.weekendAutoHide!==false;
    document.getElementById('s-show-holidays').checked=p.showHolidays;
    document.getElementById('holiday-inline').classList.toggle('hidden',!p.showHolidays);
    document.getElementById('holiday-opts').classList.toggle('hidden',!p.showHolidays);
    document.getElementById('s-hol-color').value=p.holidayColor||'#e5534b';
    document.getElementById('s-hol-opacity').value=p.holidayOpacity||12;
    document.getElementById('s-hol-opval').textContent=(p.holidayOpacity||12)+'%';
    document.getElementById('s-hol-labels').checked=p.holidayLabels!==false;
    /* Initialize color box opacity previews */
    const wkndBox=document.getElementById('s-wknd-color-box');if(wkndBox){const v=p.weekendOpacity||8;wkndBox.style.opacity=(0.3+(v/30)*0.7).toFixed(2);}
    const holColorEl=document.getElementById('s-hol-color');if(holColorEl){const v=p.holidayOpacity||12;holColorEl.style.opacity=(0.3+(v/40)*0.7).toFixed(2);}
    /* Holiday empty-hint: show link to Holidays section when no holidays exist */
    const holHint=document.getElementById('hol-shading-empty-hint');
    if(holHint){holHint.classList.toggle('hidden',p.holidays.length>0);const goLink=document.getElementById('hol-shading-go-add');if(goLink)goLink.onclick=e=>{e.preventDefault();const s=document.getElementById('sect-holidays');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})}}
    const holBackLink=document.getElementById('hol-back-to-shading');if(holBackLink)holBackLink.onclick=e=>{e.preventDefault();const s=document.getElementById('sect-appearance');if(s)s.scrollIntoView({behavior:'smooth',block:'start'})};
    document.getElementById('s-sched-around').checked=p.scheduleAroundNonWorking!==false;
    document.getElementById('s-auto-sort-swim').checked=!!p.autoSortSwimlanes;
    /* --- Auto Arrange: simple slider + advanced panel binding --- */
    const arrSimEl=document.getElementById('s-arrange-simple'),arrSimVal=document.getElementById('s-arrange-simple-val');
    const arrSpEl=document.getElementById('s-arrange-spread'),arrSpVal=document.getElementById('s-arrange-spread-val');
    const arrPdEl=document.getElementById('s-arrange-padding'),arrPdVal=document.getElementById('s-arrange-padding-val');
    const arrDwEl=document.getElementById('s-arrange-dateweight'),arrDwVal=document.getElementById('s-arrange-dateweight-val');
    const arrLiveChk=document.getElementById('s-arrange-live');
    const settingsModal=document.getElementById('settings-modal');
    const settingsContent=settingsModal?.querySelector('.modal-content');
    const settingsHeader=settingsModal?.querySelector('.modal-header');
    const arrLabChk=document.getElementById('s-arrange-labels');
    const arrAdvToggle=document.getElementById('arr-adv-toggle');
    const arrAdvPanel=document.getElementById('arr-adv-panel');
    const arrAdvArrow=document.getElementById('arr-adv-arrow');
    /* Sync helpers: push values into advanced slider UI */
    let _arrSyncing=false;/* prevent infinite loops during bidirectional sync */
    const syncAdvFromSimple=(v)=>{
      const m=this._arrangeSimpleToAdvanced(v);
      if(arrSpEl){arrSpEl.value=m.spread;if(arrSpVal)arrSpVal.textContent=m.spread}
      if(arrPdEl){arrPdEl.value=m.padding;if(arrPdVal)arrPdVal.textContent=m.padding}
      if(arrDwEl){arrDwEl.value=m.dateWeight;if(arrDwVal)arrDwVal.textContent=m.dateWeight}
      if(arrLabChk)arrLabChk.checked=m.labels;
    };
    const syncSimpleFromAdv=()=>{
      const v=this._arrangeAdvancedToSimple(+arrSpEl.value,+arrPdEl.value,+arrDwEl.value);
      if(arrSimEl){arrSimEl.value=v;if(arrSimVal)arrSimVal.textContent=v}
    };
    /* Live preview state */
    let liveSnapped=false;
    const liveUpdate=()=>{
      if(!arrLiveChk||!arrLiveChk.checked)return;
      if(!liveSnapped){this.snap();liveSnapped=true}
      p.arrangeSpread=+arrSpEl.value;p.arrangePadding=+arrPdEl.value;
      if(arrDwEl)p.arrangeDateWeight=+arrDwEl.value;
      if(arrLabChk)p.arrangeLabels=arrLabChk.checked;
      if(arrSimEl)p.arrangeSimple=+arrSimEl.value;
      this._autoLayoutItems([...p.items]);this.sched()
    };
    /* Toggle live preview mode: make modal movable, overlay transparent */
    const toggleLive=(on)=>{
      if(!settingsModal)return;
      settingsModal.classList.toggle('modal-live',on);
      if(on&&settingsContent){
        const vw=window.innerWidth,vh=window.innerHeight;
        const rect=settingsContent.getBoundingClientRect();
        settingsContent.style.left=Math.max(8,vw-rect.width-24)+'px';
        settingsContent.style.top=Math.max(8,Math.min(60,(vh-rect.height)/2))+'px';
        liveUpdate();
      }else if(settingsContent){
        settingsContent.style.left='';settingsContent.style.top='';
      }
    };
    if(arrLiveChk){arrLiveChk.checked=false;arrLiveChk.onchange=function(){toggleLive(this.checked)}}
    /* Draggable header (only active in modal-live mode) */
    if(settingsHeader&&settingsContent){
      let dragX=0,dragY=0,startL=0,startT=0,dragging=false;
      const onMove=e=>{if(!dragging)return;settingsContent.style.left=(startL+e.clientX-dragX)+'px';settingsContent.style.top=(startT+e.clientY-dragY)+'px'};
      const onUp=()=>{dragging=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp)};
      settingsHeader.addEventListener('mousedown',e=>{
        if(!settingsModal.classList.contains('modal-live'))return;
        if(e.target.closest('button'))return;
        dragging=true;dragX=e.clientX;dragY=e.clientY;
        const r=settingsContent.getBoundingClientRect();startL=r.left;startT=r.top;
        document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
        e.preventDefault()
      })
    }
    /* Simple slider: initialize from saved value, sync to advanced on drag */
    if(arrSimEl){arrSimEl.value=p.arrangeSimple!=null?p.arrangeSimple:50;if(arrSimVal)arrSimVal.textContent=arrSimEl.value;arrSimEl.oninput=function(){if(arrSimVal)arrSimVal.textContent=this.value;if(!_arrSyncing){_arrSyncing=true;syncAdvFromSimple(+this.value);_arrSyncing=false}liveUpdate()}}
    /* Advanced sliders: initialize from saved values, sync back to simple on drag */
    if(arrSpEl){arrSpEl.value=p.arrangeSpread!=null?p.arrangeSpread:50;if(arrSpVal)arrSpVal.textContent=arrSpEl.value;arrSpEl.oninput=function(){if(arrSpVal)arrSpVal.textContent=this.value;if(!_arrSyncing){_arrSyncing=true;syncSimpleFromAdv();_arrSyncing=false}liveUpdate()}}
    if(arrPdEl){arrPdEl.value=p.arrangePadding!=null?p.arrangePadding:50;if(arrPdVal)arrPdVal.textContent=arrPdEl.value;arrPdEl.oninput=function(){if(arrPdVal)arrPdVal.textContent=this.value;if(!_arrSyncing){_arrSyncing=true;syncSimpleFromAdv();_arrSyncing=false}liveUpdate()}}
    if(arrDwEl){arrDwEl.value=p.arrangeDateWeight!=null?p.arrangeDateWeight:20;if(arrDwVal)arrDwVal.textContent=arrDwEl.value;arrDwEl.oninput=function(){if(arrDwVal)arrDwVal.textContent=this.value;if(!_arrSyncing){_arrSyncing=true;syncSimpleFromAdv();_arrSyncing=false}liveUpdate()}}
    if(arrLabChk){arrLabChk.checked=!!p.arrangeLabels;arrLabChk.onchange=function(){if(!_arrSyncing){_arrSyncing=true;syncSimpleFromAdv();_arrSyncing=false}liveUpdate()}}
    /* Advanced panel toggle */
    if(arrAdvToggle&&arrAdvPanel){arrAdvToggle.onclick=()=>{const open=arrAdvPanel.classList.toggle('hidden');arrAdvArrow.classList.toggle('open',!open)}}
    /* Reset: restores defaults for both simple + advanced */
    const btnArrReset=document.getElementById('btn-arrange-reset');
    if(btnArrReset)btnArrReset.onclick=()=>{const d=newProj();if(arrSimEl){arrSimEl.value=d.arrangeSimple!=null?d.arrangeSimple:50;if(arrSimVal)arrSimVal.textContent=arrSimEl.value}syncAdvFromSimple(+arrSimEl.value);liveUpdate()};
    document.getElementById('hol-import-box').classList.add('hidden');
    document.getElementById('hol-add-box')?.classList.add('hidden');
    document.getElementById('hol-paste-ta').value='';
    document.getElementById('hol-paste-prev').textContent='';
    this.renderHolList();
    this.$.s_watermark.checked=p.watermark;document.getElementById('watermark-opts').classList.toggle('hidden',!p.watermark);
    this.$.s_wm_date.value=p.wmDate||U.iso(new Date());this.$.s_wm_pos.value=p.wmPos||'bottom-center';
    document.getElementById('s-wm-owner').checked=p.wmShowOwner;
    const dfEl=document.getElementById('s-default-folder');if(dfEl)dfEl.value=p.defaultFolder||'';
    const tttChk=document.getElementById('s-ttt-enabled');const tttOpts=document.getElementById('ttt-opts');const tttSel=document.getElementById('s-ttt-milestone');
    if(tttChk){tttChk.checked=p.tttEnabled;tttOpts.style.display=p.tttEnabled?'':'none'}
    if(tttSel){tttSel.innerHTML='<option value="">— Select —</option>'+p.items.filter(i=>i.type==='milestone').map(i=>`<option value="${i.id}" ${i.id===p.tttMilestoneId?'selected':''}>${U.esc(i.name)}</option>`).join('')}
    /* Collapsible panels: Watermark & TTT — toggle body + arrow, reactive summary */
    const _collToggle=(id,summaryFn)=>{const el=document.getElementById(id);if(!el)return;const hdr=el.querySelector('.settings-collapsible-header');const body=el.querySelector('.settings-collapsible-body');const arrow=el.querySelector('.settings-collapsible-arrow');if(!hdr||!body)return;hdr.onclick=()=>{const open=body.classList.toggle('hidden');if(arrow)arrow.classList.toggle('open',!open)};if(summaryFn)summaryFn()};
    /* Summaries read FORM state so they update reactively when user toggles checkboxes */
    const wmChk=this.$.s_watermark,wmPos=this.$.s_wm_pos;
    const _wmSummary=()=>{const s=document.getElementById('sett-wm-summary');if(s)s.textContent=wmChk.checked?('— '+(wmPos.value||'bottom-center').split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')):'— Off'};
    const _tttSummary=()=>{const s=document.getElementById('sett-ttt-summary');if(!s)return;if(!tttChk||!tttChk.checked){s.textContent='— Off';return}const selOpt=tttSel?.selectedOptions?.[0];s.textContent=(selOpt&&selOpt.value)?('— '+selOpt.textContent):'— No milestone'};
    _collToggle('sett-coll-watermark',_wmSummary);_collToggle('sett-coll-ttt',_tttSummary);
    /* Hook onchange to update summaries + toggle sub-opts */
    wmChk.onchange=function(){document.getElementById('watermark-opts').classList.toggle('hidden',!this.checked);_wmSummary()};
    wmPos.onchange=_wmSummary;
    if(tttChk){tttChk.onchange=function(){tttOpts.style.display=this.checked?'':'none';_tttSummary()}}
    if(tttSel)tttSel.onchange=_tttSummary;
    // Scheduling mode cards
    try{
    const smCards=document.getElementById('sched-mode-cards');
    if(smCards){
      this._pendingSchedMode=p.schedulingMode||'manual';
      smCards.querySelectorAll('.sched-card').forEach(c=>{
        const isActive=c.dataset.mode===this._pendingSchedMode;
        c.classList.toggle('active',isActive);
        c.style.borderColor=isActive?'var(--acc)':'var(--brd)';
        const titleDiv=c.querySelector('div');
        if(titleDiv)titleDiv.textContent=isActive?(c.dataset.mode==='manual'?'✅ Manual':'✅ Auto-Scheduled'):(c.dataset.mode==='manual'?'◻ Manual':'◻ Auto-Scheduled');
        c.onclick=()=>{this._pendingSchedMode=c.dataset.mode;smCards.querySelectorAll('.sched-card').forEach(cc=>{
          const a=cc.dataset.mode===c.dataset.mode;
          cc.classList.toggle('active',a);
          cc.style.borderColor=a?'var(--acc)':'var(--brd)';
          const td=cc.querySelector('div');
          if(td)td.textContent=a?(cc.dataset.mode==='manual'?'✅ Manual':'✅ Auto-Scheduled'):(cc.dataset.mode==='manual'?'◻ Manual':'◻ Auto-Scheduled')})}
      })
    }
    }catch(err){console.error('[Timeline Studio] Card setup error:',err)}
    // Status section
    const sStatusShow=document.getElementById('s-status-show');
    const statusOpts=document.getElementById('status-display-opts');
    const sStatusMode=document.getElementById('s-status-mode');
    const sStatusPos=document.getElementById('s-status-pos');
    const sd=p.statusDisplay||{show:true,mode:'emoji',badgePos:'inline',colorOverride:false,blankColor:''};
    if(sStatusShow){sStatusShow.checked=sd.show;if(statusOpts)statusOpts.style.display=sd.show?'':'none';sStatusShow.onchange=function(){if(statusOpts)statusOpts.style.display=this.checked?'':'none'}}
    if(sStatusMode)sStatusMode.value=sd.mode||'emoji';
    if(sStatusPos)sStatusPos.value=sd.badgePos||'inline';
    const sColorOverride=document.getElementById('s-status-color-override');
    const sBlankGroup=document.getElementById('s-blank-color-group');
    const sBlankOn=document.getElementById('s-status-blank-on');
    const sBlankPicker=document.getElementById('s-blank-color-picker');
    const sBlankColor=document.getElementById('s-status-blank-color');
    if(sColorOverride){sColorOverride.checked=!!sd.colorOverride;if(sBlankGroup)sBlankGroup.style.display=sd.colorOverride?'':'none';sColorOverride.onchange=function(){if(sBlankGroup)sBlankGroup.style.display=this.checked?'':'none';if(!this.checked&&sBlankOn){sBlankOn.checked=false;if(sBlankPicker)sBlankPicker.style.display='none'}}}
    if(sBlankOn){sBlankOn.checked=!!sd.blankColor;if(sBlankPicker)sBlankPicker.style.display=sd.blankColor?'flex':'none';sBlankOn.onchange=function(){if(sBlankPicker)sBlankPicker.style.display=this.checked?'flex':'none'}}
    if(sBlankColor)sBlankColor.value=sd.blankColor||'#6b7280';
    this._pendingStatusDefs=U.deep(p.statusDefs||[]);
    this.renderStatusDefList();
    document.getElementById('btn-status-add').onclick=()=>{this._pendingStatusDefs.push({id:U.id(),name:'New Status',desc:'',color:'#6b7280',shortName:'?',emoji:'❓'});this.renderStatusDefList()};
    document.getElementById('btn-status-reset').onclick=()=>{if(!confirm('Reset all status definitions to defaults? This does not affect items until you Apply.'))return;this._pendingStatusDefs=U.deep(newProj().statusDefs);this.renderStatusDefList();this.toast('Status definitions reset to defaults')};
    // Shortcuts section
    this._pendingShortcuts=this._scOverrides?U.deep(this._scOverrides):{};
    this.renderScList();
    this.renderSettingsLinks();
    this.showModal('settings-modal');
    /* Settings nav: scroll-to-top, click-to-jump, scroll-spy */
    const sContent=document.getElementById('settings-content');
    const sNav=document.getElementById('settings-nav');
    if(sContent)sContent.scrollTop=0;
    if(sNav){
      const links=sNav.querySelectorAll('a');
      /* Reset active to first link */
      links.forEach((a,i)=>a.classList.toggle('active',i===0));
      /* Scroll-spy: highlight nav link whose section is nearest the top of the scroll container */
      const spy=()=>{const cTop=sContent.getBoundingClientRect().top;let best=null,bestD=Infinity;links.forEach(a=>{const s=document.getElementById(a.getAttribute('href').slice(1));if(!s)return;const d=Math.abs(s.getBoundingClientRect().top-cTop);if(d<bestD){bestD=d;best=a}});if(best)links.forEach(a=>a.classList.toggle('active',a===best))};
      sContent.onscroll=spy;
      /* Click-to-jump */
      links.forEach(a=>{a.onclick=e=>{e.preventDefault();const tgt=document.getElementById(a.getAttribute('href').slice(1));if(tgt)tgt.scrollIntoView({behavior:'smooth',block:'start'})}});
    }
  },
  applySettings(){
    this._settingsOrigTheme=null;/* clear before reset so theme isn't reverted */
    this._resetSettingsLive();
    this.snap();const p=this.proj;p.name=this.$.s_name.value;p.owner=this.$.s_owner.value;
    p.timelineStart=this.$.s_start.value;p.timelineEnd=this.$.s_end.value;
    p.autoRange=this.$.s_auto_range.checked;p.showToday=this.$.s_today.checked;p.showDeps=this.$.s_deps.checked;
    const depFR=document.querySelector('input[name="s-dep-filter"]:checked');p.depFilter=depFR?depFR.value:'all';
    p.fontSize=+this.$.s_fontsize.value||11;
    // Date format
    const dfSel=document.getElementById('s-date-fmt');
    if(dfSel){if(dfSel.value==='custom'){const cf=document.getElementById('s-custom-fmt')?.value||'DDMMMYY';p.dateFormat='custom:'+cf}else{p.dateFormat=dfSel.value}}
    p.theme=document.querySelector('.theme-card.active')?.dataset.theme||'default';
    p.showWeekends=document.getElementById('s-show-weekends').checked;
    p.weekendOpacity=+document.getElementById('s-wknd-opacity').value||8;
    p.weekendAutoHide=document.getElementById('s-wknd-auto').checked;
    p.showHolidays=document.getElementById('s-show-holidays').checked;
    p.holidayColor=document.getElementById('s-hol-color').value||'#e5534b';
    p.holidayOpacity=+document.getElementById('s-hol-opacity').value||12;
    p.holidayLabels=document.getElementById('s-hol-labels').checked;
    const oldSchedAround=p.scheduleAroundNonWorking;
    p.scheduleAroundNonWorking=document.getElementById('s-sched-around').checked;
    if(p.scheduleAroundNonWorking!==oldSchedAround)this._recalcNonWorkingDays();
    p.autoSortSwimlanes=document.getElementById('s-auto-sort-swim').checked;
    const arrSimEl2=document.getElementById('s-arrange-simple');if(arrSimEl2)p.arrangeSimple=+arrSimEl2.value;
    const arrSpEl2=document.getElementById('s-arrange-spread');if(arrSpEl2)p.arrangeSpread=+arrSpEl2.value;
    const arrPdEl2=document.getElementById('s-arrange-padding');if(arrPdEl2)p.arrangePadding=+arrPdEl2.value;
    const arrDwEl2=document.getElementById('s-arrange-dateweight');if(arrDwEl2)p.arrangeDateWeight=+arrDwEl2.value;
    const arrLabChk2=document.getElementById('s-arrange-labels');if(arrLabChk2)p.arrangeLabels=arrLabChk2.checked;
    p.watermark=this.$.s_watermark.checked;p.wmDate=this.$.s_wm_date.value;p.wmPos=this.$.s_wm_pos.value;
    p.wmShowOwner=document.getElementById('s-wm-owner').checked;
    const dfEl=document.getElementById('s-default-folder');if(dfEl)p.defaultFolder=dfEl.value.trim();
    const tttChk=document.getElementById('s-ttt-enabled');if(tttChk)p.tttEnabled=tttChk.checked;
    const tttSel=document.getElementById('s-ttt-milestone');if(tttSel)p.tttMilestoneId=tttSel.value;
    // Status definitions — validate short names
    if(this._pendingStatusDefs){
      const invalid=this._pendingStatusDefs.filter(sd=>sd.id!=='blank'&&!sd.shortName?.trim());
      if(invalid.length){this.toast(`Short name required for: ${invalid.map(sd=>sd.name||'(unnamed)').join(', ')}`,'error');return}
      // Check for deleted/modified statuses that affect items
      const oldDefs=p.statusDefs||[];
      const newDefs=this._pendingStatusDefs;
      const newIds=new Set(newDefs.map(sd=>sd.id));
      const deletedMap=new Map();const modifiedList=[];
      oldDefs.forEach(od=>{
        if(od.id==='blank')return;
        if(!newIds.has(od.id)){
          const affected=p.items.filter(it=>it.status===od.id);
          if(affected.length)deletedMap.set(od,affected);
        }else{
          const nd=newDefs.find(sd=>sd.id===od.id);
          if(nd){
            const changes=[];
            if(nd.name!==od.name)changes.push('name changed');
            if(nd.color!==od.color)changes.push('color changed');
            if(nd.shortName!==od.shortName)changes.push('short name changed');
            if(nd.emoji!==od.emoji)changes.push('emoji changed');
            if(nd.desc!==od.desc)changes.push('description changed');
            if(changes.length){const count=p.items.filter(it=>it.status===od.id).length;if(count)modifiedList.push({sd:nd,changes,count})}
          }
        }
      });
      if(deletedMap.size){this.showStatusImpact(deletedMap,modifiedList);return}
      // No deletions affecting items — commit silently
      p.statusDefs=U.deep(newDefs);
      p.statusDisplay={show:document.getElementById('s-status-show')?.checked!==false,mode:document.getElementById('s-status-mode')?.value||'emoji',badgePos:document.getElementById('s-status-pos')?.value||'inline',colorOverride:document.getElementById('s-status-color-override')?.checked||false,blankColor:document.getElementById('s-status-blank-on')?.checked?document.getElementById('s-status-blank-color')?.value||'#6b7280':''};
    }
    // Save shortcut overrides
    if(this._pendingShortcuts&&Object.keys(this._pendingShortcuts).length){this._scOverrides=U.deep(this._pendingShortcuts);this._saveShortcuts();this._buildShortcutMap()}
    else{this._scOverrides=null;this._saveShortcuts();this._buildShortcutMap()}
    // Scheduling mode transition — read from active card class + fallback to property
    try{
    const activeCard=document.querySelector('#sched-mode-cards .sched-card.active');
    const newMode=activeCard?.dataset?.mode||this._pendingSchedMode||p.schedulingMode||'manual';
    const oldMode=p.schedulingMode||'manual';
    if(newMode==='scheduled'&&oldMode==='manual'){
      if(p.autoRange)this.autoRange();this.applyTheme();
      document.getElementById('settings-modal').classList.add('hidden');
      this.showScheduleTransition();
      return
    }
    if(newMode==='manual'&&oldMode==='scheduled'){
      p.schedulingMode='manual';
      this.toast('Switched to Manual mode — all dates preserved');
    }
    }catch(err){console.error('[Timeline Studio] Scheduling transition error:',err);this.toast('Scheduling error: '+err.message,'error')}
    if(p.autoRange)this.autoRange();this.applyTheme();
    document.getElementById('settings-modal').classList.add('hidden');this.sched();this.autoSave();this.toast('Settings applied')
  },

  autoRange(){
    const dates=[];this.proj.items.forEach(i=>{if(i.date)dates.push(new Date(i.date+'T12:00:00'));if(i.startDate)dates.push(new Date(i.startDate+'T12:00:00'));if(i.endDate)dates.push(new Date(i.endDate+'T12:00:00'))});
    if(!dates.length)return;const mn=new Date(Math.min(...dates)),mx=new Date(Math.max(...dates));
    mn.setMonth(mn.getMonth()-1);mn.setDate(1);mx.setMonth(mx.getMonth()+2);mx.setDate(1);
    const newS=U.iso(mn),newE=U.iso(mx);
    const changed=newS!==this.proj.timelineStart||newE!==this.proj.timelineEnd;
    this.proj.timelineStart=newS;this.proj.timelineEnd=newE;
    if(changed)this.sched();
  },

  showPaste(){this.$.paste_sw.innerHTML=this.proj.swimlanes.map(s=>`<option value="${s.id}">${U.esc(s.name)}</option>`).join('');this.$.paste_ta.value='';this.$.paste_prev.textContent='';this._impData=null;this._impMappings=[];this._impOverloads=[];this._impSelSrc=null;this._impStatusMap={};if(this.$.imp_file_name)this.$.imp_file_name.textContent='No file selected';if(this.$.imp_file_input)this.$.imp_file_input.value='';if(this.$.imp_map_area)this.$.imp_map_area.classList.add('hidden');if(this.$.imp_status_area)this.$.imp_status_area.classList.add('hidden');if(this.$.imp_perfect_match)this.$.imp_perfect_match.classList.add('hidden');if(this.$.imp_preview_wrap){this.$.imp_preview_wrap.classList.add('hidden');this.$.imp_preview_wrap.innerHTML=''}if(this.$.imp_overload_area){this.$.imp_overload_area.classList.add('hidden');this.$.imp_overload_area.innerHTML=''}if(this.$.imp_status)this.$.imp_status.textContent='';if(this.$.btn_imp_do)this.$.btn_imp_do.classList.add('hidden');if(this.$.imp_adv_toggle)this.$.imp_adv_toggle.classList.remove('open');if(this.$.imp_adv_body)this.$.imp_adv_body.classList.add('hidden');this.showModal('paste-modal');this.$.paste_ta.focus()},
  previewPaste(){const r=this.parsePaste(this.$.paste_ta.value);this.$.paste_prev.textContent=r.length?`Found ${r.length} items`:''},
  parsePaste(text){return text.trim().split('\n').filter(l=>l.trim()).map(line=>{const c=line.split('\t').map(s=>s.trim());if(c.length<2||!c[0])return null;if(c.length>=3){const d1=U.parseDate(c[1]),d2=U.parseDate(c[2]);if(d1&&d2)return{name:c[0],type:'task',startDate:U.iso(d1),endDate:U.iso(d2)};if(d1)return{name:c[0],type:'milestone',date:U.iso(d1)}}if(c.length>=2){const d=U.parseDate(c[1]);if(d)return{name:c[0],type:'milestone',date:U.iso(d)}}return null}).filter(Boolean)},
  doPaste(){const rows=this.parsePaste(this.$.paste_ta.value);if(!rows.length){this.toast('No valid data','error');return}this.snap();const tgt=this.$.paste_sw.value;rows.forEach((r,i)=>{const it={id:U.id(),type:r.type,name:r.name,swimlaneId:tgt,subSwimId:'',subRow:i%3,color:COLORS[i%COLORS.length],iconType:'triangle',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:'',status:'',statusDate:'',vLine:{enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'},links:[]};if(r.type==='milestone')it.date=r.date;else{it.startDate=r.startDate;it.endDate=r.endDate;it.durMode='cal';it.duration=U.days(r.startDate,r.endDate)+1}this.proj.items.push(it)});if(this.proj.autoRange)this.autoRange();document.getElementById('paste-modal').classList.add('hidden');this.sched();this.autoSave();this.toast(`Imported ${rows.length} items`)},

  /* ===== ADVANCED IMPORT (F35) ===== */
  _IMP_TGT_FIELDS:['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Predecessors','Status','StatusDate','Progress','Notes','Color','Pinned','Hidden','LabelPos','FontSize','TextColor','DateFormat','ShowDate'],
  _IMP_ALIASES:{
    Name:['name','task name','title','item','activity','description','task'],
    Owner:['owner','assigned to','assignee','resource','responsible'],
    Type:['type','item type'],
    Start:['start','start date','begin','from','start_date'],
    End:['end','end date','finish','due','to','due date','finish date','end_date'],
    Duration:['duration','dur','days','length'],
    Swimlane:['swimlane','lane','swim lane','category','group','phase','stream'],
    SubSwim:['sub-swimlane','sub swimlane','sub','sub lane','subswimlane','subswim'],
    Row:['row','sub row','subrow'],
    Predecessors:['predecessors','predecessor','deps','dependencies','pred','depends on'],
    Status:['status','state','health'],
    StatusDate:['statusdate','status date','status_date'],
    Progress:['progress','pct','percent','%','% complete'],
    Notes:['notes','note','comments','comment','details'],
    Color:['color','colour'],
    Pinned:['pinned','pin','locked'],
    Hidden:['hidden','hide'],
    LabelPos:['labelpos','label position','labelposition','label pos'],
    FontSize:['fontsize','font size','font_size'],
    TextColor:['textcolor','text color','text_color'],
    DateFormat:['dateformat','date format','date_format'],
    ShowDate:['showdate','show date','show_date']
  },
  /* CSV/TSV Parsing */
  parseCSV(text){
    const rows=[],n=text.length;let row=[],field='',inQ=false,i=0;
    while(i<n){const c=text[i];
      if(inQ){if(c==='"'){if(i+1<n&&text[i+1]==='"'){field+='"';i+=2}else{inQ=false;i++}}else{field+=c;i++}}
      else{if(c==='"'){inQ=true;i++}else if(c===','){row.push(field.trim());field='';i++}
      else if(c==='\r'){row.push(field.trim());field='';rows.push(row);row=[];i++;if(i<n&&text[i]==='\n')i++}
      else if(c==='\n'){row.push(field.trim());field='';rows.push(row);row=[];i++}
      else{field+=c;i++}}
    }
    if(field||row.length)row.push(field.trim());
    if(row.length>0&&!(row.length===1&&row[0]===''))rows.push(row);
    return rows;
  },
  parseTSV(text){
    return text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim()).map(l=>l.split('\t').map(c=>c.trim()));
  },
  /* Toggle / File Handling */
  toggleAdvImport(){
    const tg=this.$.imp_adv_toggle,bd=this.$.imp_adv_body;if(!tg||!bd)return;
    tg.classList.toggle('open');bd.classList.toggle('hidden');
  },
  handleImportFile(e){
    const file=e.target.files&&e.target.files[0];if(!file)return;
    this.$.imp_file_name.textContent=file.name;
    file.text().then(text=>{
      const ext=file.name.split('.').pop().toLowerCase();
      let rows;
      if(ext==='tsv')rows=this.parseTSV(text);
      else if(ext==='csv')rows=this.parseCSV(text);
      else{const l1=text.split('\n')[0]||'';rows=(l1.split('\t').length>l1.split(',').length)?this.parseTSV(text):this.parseCSV(text)}
      if(!rows.length||rows.length<2){this.toast('File has no data rows','error');return}
      const headers=rows[0],data=rows.slice(1).filter(r=>r.some(c=>c));
      this._impData={headers,rows:data};
      this._impMappings=this.autoDetectMappings(headers);
      this._impOverloads=[];this._impSelSrc=null;this._impStatusMap={};
      const isTLS=this._checkTLSReimport(this._impMappings,headers);
      if(isTLS)this.$.imp_perfect_match.classList.remove('hidden');
      else this.$.imp_perfect_match.classList.add('hidden');
      this.$.imp_status.textContent=`${data.length} data row${data.length!==1?'s':''}, ${headers.length} column${headers.length!==1?'s':''}`;
      this.$.btn_imp_do.classList.remove('hidden');
      this.renderMappingGUI();
      this._checkStatusMapping();
      this.renderImportPreview();
    }).catch(err=>{this.toast('Failed to read file: '+err.message,'error')});
  },
  /* Auto-Detection */
  autoDetectMappings(headers){
    const mappings=[],used=new Set();
    headers.forEach((h,i)=>{
      const hl=h.toLowerCase().trim();
      for(const[field,aliases] of Object.entries(this._IMP_ALIASES)){
        if(used.has(field))continue;
        if(aliases.includes(hl)){mappings.push({srcIdx:i,tgtField:field,color:this._impLinkColors[mappings.length%this._impLinkColors.length]});used.add(field);return}
      }
    });
    return mappings;
  },
  _checkTLSReimport(mappings,headers){
    return headers.length>0&&mappings.length===headers.length;
  },
  /* Click-to-Link Mapping GUI */
  renderMappingGUI(){
    const area=this.$.imp_map_area;if(!area||!this._impData)return;
    area.classList.remove('hidden');area.innerHTML='';
    const tgtFields=this._IMP_TGT_FIELDS;
    const srcLinked=new Map();const tgtLinked=new Map();
    this._impMappings.forEach(m=>{srcLinked.set(m.srcIdx,m);tgtLinked.set(m.tgtField,m)});
    this._impOverloads.forEach(ov=>{ov.srcIdxs.forEach(si=>srcLinked.set(si,{tgtField:ov.tgtField,color:'#6b7280'}));tgtLinked.set(ov.tgtField,{color:'#6b7280'})});
    const title=document.createElement('div');title.className='imp-section-title';title.textContent='Column Mapping';title.style.marginTop='0';area.appendChild(title);
    const hint=document.createElement('div');hint.style.cssText='font-size:10px;color:var(--tx3);margin-bottom:8px';hint.textContent='Click a source column, then click a target field to link. Ctrl+Click to select multiple sources and combine into one target. Click a linked chip to unlink.';area.appendChild(hint);
    const cols=document.createElement('div');cols.className='imp-map-cols';cols.style.position='relative';area.appendChild(cols);
    /* Left: source columns */
    const srcCol=document.createElement('div');srcCol.className='imp-map-col';
    const srcTitle=document.createElement('div');srcTitle.className='imp-map-col-title';srcTitle.textContent='Imported Columns';srcCol.appendChild(srcTitle);
    this._impData.headers.forEach((h,i)=>{
      const chip=document.createElement('div');chip.className='imp-chip';chip.dataset.side='src';chip.dataset.idx=i;
      const dot=document.createElement('span');dot.className='imp-chip-dot';dot.dataset.dotSrc=i;
      const m=srcLinked.get(i);
      if(m){chip.classList.add('linked');dot.style.background=m.color;chip.style.borderColor=m.color+'66'}
      if(this._impSelSrc instanceof Set?this._impSelSrc.has(i):this._impSelSrc===i)chip.classList.add('selected');
      const lbl=document.createElement('span');lbl.textContent=h;lbl.style.cssText='overflow:hidden;text-overflow:ellipsis;flex:1';lbl.title=h;
      chip.appendChild(dot);chip.appendChild(lbl);
      if(m&&this._impMappings.some(mm=>mm.srcIdx===i)){const badge=document.createElement('span');badge.className='imp-chip-badge';badge.textContent='auto';chip.appendChild(badge)}
      chip.onclick=(e)=>this._onChipClick('src',i,e);
      srcCol.appendChild(chip);
    });
    cols.appendChild(srcCol);
    /* SVG overlay */
    const svgNS='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(svgNS,'svg');svg.classList.add('imp-link-svg');svg.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none';
    cols.appendChild(svg);
    /* Right: target fields */
    const tgtCol=document.createElement('div');tgtCol.className='imp-map-col';
    const tgtTitle=document.createElement('div');tgtTitle.className='imp-map-col-title';tgtTitle.textContent='Timeline Studio Fields';tgtCol.appendChild(tgtTitle);
    tgtFields.forEach(f=>{
      const chip=document.createElement('div');chip.className='imp-chip';chip.dataset.side='tgt';chip.dataset.field=f;
      const dot=document.createElement('span');dot.className='imp-chip-dot';dot.dataset.dotTgt=f;
      const m=tgtLinked.get(f);
      if(m){chip.classList.add('linked');dot.style.background=m.color;chip.style.borderColor=(m.color||'#6b7280')+'66'}
      const lbl=document.createElement('span');lbl.textContent=f;lbl.style.cssText='overflow:hidden;text-overflow:ellipsis;flex:1';
      chip.appendChild(dot);chip.appendChild(lbl);
      chip.onclick=()=>this._onChipClick('tgt',f);
      tgtCol.appendChild(chip);
    });
    cols.appendChild(tgtCol);
    /* Combine Columns button */
    const ovBtn=document.createElement('button');ovBtn.className='btn btn-secondary';ovBtn.style.cssText='font-size:10px;padding:4px 10px;margin-top:8px';ovBtn.textContent='+ Combine Columns';
    ovBtn.onclick=()=>this.addOverloadRow();area.appendChild(ovBtn);
    /* Draw lines after layout settles */
    requestAnimationFrame(()=>this._drawMappingLines(svg,cols));
  },
  _onChipClick(side,val,evt){
    const ctrlKey=evt&&(evt.ctrlKey||evt.metaKey);
    if(side==='src'){
      const idx=+val;
      /* If this source is already linked in 1:1, unlink it */
      const li=this._impMappings.findIndex(m=>m.srcIdx===idx);
      if(li>=0){
        const wasStatus=this._impMappings[li].tgtField==='Status';
        this._impMappings.splice(li,1);this._impSelSrc=null;
        this.renderMappingGUI();if(wasStatus)this._checkStatusMapping();this.renderImportPreview();return;
      }
      /* If this source is part of an overload, unlink the whole overload row */
      const ovIdx=this._impOverloads.findIndex(ov=>ov.srcIdxs.includes(idx));
      if(ovIdx>=0){
        const wasStatus=this._impOverloads[ovIdx].tgtField==='Status';
        this._impOverloads.splice(ovIdx,1);this._impSelSrc=null;
        this.renderOverloads();this.renderMappingGUI();if(wasStatus)this._checkStatusMapping();this.renderImportPreview();return;
      }
      /* Ctrl+Click: toggle source in multi-selection */
      if(ctrlKey){
        if(!(this._impSelSrc instanceof Set))this._impSelSrc=this._impSelSrc!=null?new Set([this._impSelSrc]):new Set();
        if(this._impSelSrc.has(idx))this._impSelSrc.delete(idx);else this._impSelSrc.add(idx);
        if(!this._impSelSrc.size)this._impSelSrc=null;
        this.renderMappingGUI();return;
      }
      /* Regular click: single select/deselect */
      const curSingle=this._impSelSrc instanceof Set?null:this._impSelSrc;
      this._impSelSrc=(curSingle===idx)?null:idx;
      this.renderMappingGUI();
    }else{
      /* Target clicked */
      const field=val;
      const selSet=this._impSelSrc instanceof Set?this._impSelSrc:null;
      const selSingle=this._impSelSrc instanceof Set?null:this._impSelSrc;
      if(selSet===null&&selSingle===null){
        /* Nothing selected: if target is linked, unlink from target side */
        const li=this._impMappings.findIndex(m=>m.tgtField===field);
        if(li>=0){const wasStatus=field==='Status';this._impMappings.splice(li,1);this.renderMappingGUI();if(wasStatus)this._checkStatusMapping();this.renderImportPreview()}
        const oi=this._impOverloads.findIndex(ov=>ov.tgtField===field);
        if(oi>=0){const wasStatus=field==='Status';this._impOverloads.splice(oi,1);this.renderOverloads();this.renderMappingGUI();if(wasStatus)this._checkStatusMapping();this.renderImportPreview()}
        return;
      }
      if(selSet&&selSet.size>1){
        /* Multi-select → auto-create overload */
        const srcIdxs=[...selSet].sort((a,b)=>a-b);
        /* Remove any existing 1:1 mappings for these sources or this target */
        this._impMappings=this._impMappings.filter(m=>m.tgtField!==field&&!srcIdxs.includes(m.srcIdx));
        /* Remove any existing overload for this target */
        this._impOverloads=this._impOverloads.filter(ov=>ov.tgtField!==field);
        const delims=[];const prefixes=[];
        for(let i=0;i<srcIdxs.length;i++){delims.push(' ');prefixes.push('')}
        this._impOverloads.push({srcIdxs,tgtField:field,delimiters:delims.slice(0,-1),prefixes});
        this._impSelSrc=null;
        this.renderOverloads();this.renderMappingGUI();
        if(field==='Status')this._checkStatusMapping();
        this.renderImportPreview();
        this.$.imp_overload_area.classList.remove('hidden');
        return;
      }
      /* Single source selected → 1:1 mapping */
      const srcIdx=selSet?[...selSet][0]:selSingle;
      this._impMappings=this._impMappings.filter(m=>m.tgtField!==field&&m.srcIdx!==srcIdx);
      this._impMappings.push({srcIdx,tgtField:field,color:this._impLinkColors[this._impMappings.length%this._impLinkColors.length]});
      this._impSelSrc=null;
      this.renderMappingGUI();
      if(field==='Status')this._checkStatusMapping();
      this.renderImportPreview();
    }
  },
  _drawMappingLines(svg,container){
    if(!svg||!container)return;
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    const cRect=container.getBoundingClientRect();
    const svgNS='http://www.w3.org/2000/svg';
    this._impMappings.forEach(m=>{
      const srcDot=container.querySelector(`[data-dot-src="${m.srcIdx}"]`);
      const tgtDot=container.querySelector(`[data-dot-tgt="${m.tgtField}"]`);
      if(!srcDot||!tgtDot)return;
      const sr=srcDot.getBoundingClientRect(),tr=tgtDot.getBoundingClientRect();
      const line=document.createElementNS(svgNS,'line');
      line.setAttribute('x1',sr.right-cRect.left);line.setAttribute('y1',sr.top+sr.height/2-cRect.top);
      line.setAttribute('x2',tr.left-cRect.left);line.setAttribute('y2',tr.top+tr.height/2-cRect.top);
      line.setAttribute('stroke',m.color||'#3b82f6');line.setAttribute('stroke-width','2');line.setAttribute('stroke-linecap','round');
      line.setAttribute('opacity','0.6');
      svg.appendChild(line);
    });
    /* Also draw overload lines */
    this._impOverloads.forEach(ov=>{
      const tgtDot=container.querySelector(`[data-dot-tgt="${ov.tgtField}"]`);if(!tgtDot)return;
      const tr=tgtDot.getBoundingClientRect();
      ov.srcIdxs.forEach(si=>{
        const srcDot=container.querySelector(`[data-dot-src="${si}"]`);if(!srcDot)return;
        const sr=srcDot.getBoundingClientRect();
        const line=document.createElementNS(svgNS,'line');
        line.setAttribute('x1',sr.right-cRect.left);line.setAttribute('y1',sr.top+sr.height/2-cRect.top);
        line.setAttribute('x2',tr.left-cRect.left);line.setAttribute('y2',tr.top+tr.height/2-cRect.top);
        line.setAttribute('stroke','#6b7280');line.setAttribute('stroke-width','1.5');
        line.setAttribute('stroke-dasharray','4 2');line.setAttribute('opacity','0.5');
        svg.appendChild(line);
      });
    });
  },
  /* Overload (Combine Columns) */
  addOverloadRow(){
    this._impOverloads.push({srcIdxs:[],tgtField:'',delimiters:[' '],prefixes:['']});
    this.renderOverloads();this.$.imp_overload_area.classList.remove('hidden');
  },
  removeOverloadRow(idx){
    this._impOverloads.splice(idx,1);this.renderOverloads();this.renderMappingGUI();this.renderImportPreview();
  },
  renderOverloads(){
    const area=this.$.imp_overload_area;if(!area)return;
    if(!this._impOverloads.length){area.classList.add('hidden');area.innerHTML='';return}
    area.classList.remove('hidden');area.innerHTML='';
    const title=document.createElement('div');title.className='imp-section-title';title.textContent='Combined Columns';area.appendChild(title);
    const usedInMap=new Set(this._impMappings.map(m=>m.srcIdx));
    const usedInOv=new Set();this._impOverloads.forEach(ov=>ov.srcIdxs.forEach(s=>usedInOv.add(s)));
    const hdrs=this._impData?this._impData.headers:[];
    this._impOverloads.forEach((ov,oi)=>{
      const row=document.createElement('div');row.className='imp-overload-row';
      if(!ov.prefixes)ov.prefixes=[];
      /* Source dropdowns with prefix inputs + delimiters between */
      const maxSrc=4;
      for(let si=0;si<ov.srcIdxs.length||si===0;si++){
        if(si>0){
          const delInput=document.createElement('input');delInput.className='imp-overload-delim';
          delInput.value=ov.delimiters[si-1]||' ';delInput.title='Delimiter between columns';delInput.placeholder=' ';
          delInput.oninput=()=>{ov.delimiters[si-1]=delInput.value;this.renderImportPreview()};
          row.appendChild(delInput);
        }
        /* Prefix input before each source */
        const pfx=document.createElement('input');pfx.className='imp-overload-delim';pfx.style.width='40px';
        pfx.value=ov.prefixes[si]||'';pfx.title='Prefix text (prepended before this column value)';pfx.placeholder='pfx';
        const _psi=si;pfx.oninput=()=>{while(ov.prefixes.length<=_psi)ov.prefixes.push('');ov.prefixes[_psi]=pfx.value;this.renderImportPreview()};
        row.appendChild(pfx);
        const sel=document.createElement('select');
        sel.innerHTML='<option value="">(column)</option>'+hdrs.map((h,hi)=>`<option value="${hi}"${ov.srcIdxs[si]===hi?' selected':''}>${U.esc(h)}</option>`).join('');
        sel.value=ov.srcIdxs[si]!=null?ov.srcIdxs[si]:'';
        const _si=si;sel.onchange=()=>{
          const v=sel.value===''?null:+sel.value;
          if(v!==null){ov.srcIdxs[_si]=v;while(ov.delimiters.length<ov.srcIdxs.length-1)ov.delimiters.push(' ');while(ov.prefixes.length<ov.srcIdxs.length)ov.prefixes.push('')}
          else{ov.srcIdxs.splice(_si,1);ov.delimiters.splice(Math.max(0,_si-1),1);ov.prefixes.splice(_si,1)}
          this.renderOverloads();this.renderMappingGUI();this.renderImportPreview();
        };
        row.appendChild(sel);
      }
      if(ov.srcIdxs.length<maxSrc){
        const addBtn=document.createElement('button');addBtn.className='imp-overload-add';addBtn.textContent='+';addBtn.title='Add another source column';
        addBtn.onclick=()=>{ov.srcIdxs.push(null);ov.delimiters.push(' ');ov.prefixes.push('');this.renderOverloads()};
        row.appendChild(addBtn);
      }
      const arrow=document.createElement('span');arrow.className='imp-overload-arrow';arrow.textContent='\u2192';row.appendChild(arrow);
      /* Target dropdown */
      const tsel=document.createElement('select');
      tsel.innerHTML='<option value="">(target)</option>'+this._IMP_TGT_FIELDS.map(f=>`<option value="${f}"${ov.tgtField===f?' selected':''}>${f}</option>`).join('');
      tsel.onchange=()=>{ov.tgtField=tsel.value;this.renderMappingGUI();this.renderImportPreview()};
      row.appendChild(tsel);
      const rm=document.createElement('button');rm.className='imp-overload-rm';rm.textContent='\u2715';rm.title='Remove';rm.onclick=()=>this.removeOverloadRow(oi);
      row.appendChild(rm);
      area.appendChild(row);
    });
  },
  /* Inline Status Matching */
  _checkStatusMapping(){
    const area=this.$.imp_status_area;if(!area)return;
    const statusMapping=this._impMappings.find(m=>m.tgtField==='Status');
    if(!statusMapping||!this._impData){area.classList.add('hidden');area.innerHTML='';this._impStatusMap={};return}
    const colIdx=statusMapping.srcIdx;
    const uniqueVals=[...new Set(this._impData.rows.map(r=>(r[colIdx]||'').trim()).filter(v=>v))];
    if(!uniqueVals.length){area.classList.add('hidden');this._impStatusMap={};return}
    const defs=this.proj.statusDefs||[];
    let allMatch=true;const autoMap={};
    uniqueVals.forEach(v=>{
      const vl=v.toLowerCase();
      const match=defs.find(sd=>sd.name&&sd.name.toLowerCase()===vl);
      if(match){autoMap[v]=match.id}else{allMatch=false;autoMap[v]=''}
    });
    this._impStatusMap=autoMap;
    if(allMatch){area.classList.add('hidden');area.innerHTML='';return}
    this.renderStatusMatching(uniqueVals,defs);
  },
  renderStatusMatching(uniqueVals,defs){
    const area=this.$.imp_status_area;if(!area)return;
    area.classList.remove('hidden');area.innerHTML='';
    const title=document.createElement('div');title.className='imp-section-title';title.textContent='Status Matching';area.appendChild(title);
    const desc=document.createElement('div');desc.style.cssText='font-size:10px;color:var(--tx3);margin-bottom:6px';
    desc.textContent='Some imported status values don\'t match your current definitions. Map them below.';area.appendChild(desc);
    uniqueVals.forEach(v=>{
      const row=document.createElement('div');row.className='imp-status-row';
      const valSpan=document.createElement('span');valSpan.className='imp-status-val';valSpan.textContent='"'+v+'"';valSpan.title=v;row.appendChild(valSpan);
      const arrow=document.createElement('span');arrow.className='imp-status-arrow';arrow.textContent='\u2192';row.appendChild(arrow);
      const sel=document.createElement('select');
      let opts='<option value="">(skip)</option><option value="__create__">(create new)</option>';
      defs.filter(sd=>sd.id!=='blank').forEach(sd=>{opts+=`<option value="${sd.id}">${U.esc(sd.name)}</option>`});
      sel.innerHTML=opts;
      if(this._impStatusMap[v])sel.value=this._impStatusMap[v];
      sel.onchange=()=>{this._impStatusMap[v]=sel.value};
      row.appendChild(sel);area.appendChild(row);
    });
    const notice=document.createElement('div');notice.className='imp-status-notice';
    notice.textContent='To edit your status definitions before importing, go to Settings > Status.';
    area.appendChild(notice);
  },
  /* Preview Table */
  renderImportPreview(){
    const wrap=this.$.imp_preview_wrap;if(!wrap||!this._impData)return;
    const mapped=this._buildMappedRows();if(!mapped.length){wrap.classList.add('hidden');wrap.innerHTML='';return}
    wrap.classList.remove('hidden');
    const preview=mapped.slice(0,5);
    const allFields=new Set();this._impMappings.forEach(m=>allFields.add(m.tgtField));
    this._impOverloads.forEach(ov=>{if(ov.tgtField)allFields.add(ov.tgtField)});
    const fields=[...allFields];if(!fields.length){wrap.innerHTML='';return}
    let h='<div class="imp-section-title" style="margin-top:0">Preview (first '+preview.length+' rows)</div><table class="imp-prev-table"><thead><tr>';
    fields.forEach(f=>{h+=`<th>${U.esc(f)}</th>`});
    h+='</tr></thead><tbody>';
    preview.forEach(row=>{h+='<tr>';fields.forEach(f=>{const v=row[f]||'';h+=`<td title="${U.esc(v)}">${U.esc(v)}</td>`});h+='</tr>'});
    h+='</tbody></table>';wrap.innerHTML=h;
  },
  _buildMappedRows(){
    if(!this._impData)return[];
    return this._impData.rows.map(r=>{
      const out={};
      this._impMappings.forEach(m=>{if(m.srcIdx<r.length)out[m.tgtField]=r[m.srcIdx]||''});
      this._impOverloads.forEach(ov=>{
        if(!ov.tgtField||!ov.srcIdxs.length)return;
        const delims=ov.delimiters||[];const pfxs=ov.prefixes||[];
        let combined='',count=0;
        ov.srcIdxs.forEach((si,i)=>{
          if(si==null||si>=r.length)return;
          if(count>0)combined+=(delims[i-1]!=null?delims[i-1]:' ');
          combined+=(pfxs[i]||'')+(r[si]||'');count++;
        });
        out[ov.tgtField]=combined;
      });
      return out;
    });
  },
  /* Resolution Helpers */
  _resolveSwimlaneName(name){
    if(!name)return this.proj.swimlanes[0]?this.proj.swimlanes[0].id:'';
    const nl=name.toLowerCase().trim();
    const match=this.proj.swimlanes.find(s=>s.name.toLowerCase().trim()===nl);
    if(match)return match.id;
    const newSl={id:U.id(),name:name.trim(),color:COLORS[this.proj.swimlanes.length%COLORS.length],height:120,subSwimlanes:[],collapsed:'expanded'};
    this.proj.swimlanes.push(newSl);return newSl.id;
  },
  _resolveSubSwimName(slId,name){
    if(!name||!slId)return'';
    const sl=this.proj.swimlanes.find(s=>s.id===slId);if(!sl)return'';
    const nl=name.toLowerCase().trim();
    const match=(sl.subSwimlanes||[]).find(ss=>ss.name.toLowerCase().trim()===nl);
    if(match)return match.id;
    if(!sl.subSwimlanes)sl.subSwimlanes=[];
    const newSs={id:U.id(),name:name.trim(),collapsed:'expanded'};
    sl.subSwimlanes.push(newSs);return newSs.id;
  },
  _resolveStatusForImport(val){
    if(!val)return'';
    const mapped=this._impStatusMap[val];
    if(!mapped||mapped==='')return'';
    if(mapped==='__create__'){
      const newDef={id:U.id(),name:val.trim(),desc:'Imported status',color:'#6b7280',shortName:val.trim().charAt(0).toUpperCase(),emoji:'\u26AA'};
      this.proj.statusDefs.push(newDef);this._impStatusMap[val]=newDef.id;return newDef.id;
    }
    return mapped;
  },
  /* Predecessor Parsing */
  parsePredString(predStr){
    if(!predStr)return[];
    return predStr.split(/[,;]/).map(s=>s.trim()).filter(Boolean).map(part=>{
      const m=part.match(/^(\d+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*d?\s*$/i);
      if(!m)return null;
      return{rowNum:+m[1],type:m[2]?m[2].toUpperCase():'FS',lag:m[3]?parseInt(m[3].replace(/\s/g,''),10):0};
    }).filter(Boolean);
  },
  /* Main Import Execution */
  doAdvancedImport(){
    if(!this._impData||!this._impMappings.length&&!this._impOverloads.length){this.toast('No column mappings configured','error');return}
    const mapped=this._buildMappedRows();if(!mapped.length){this.toast('No data rows to import','error');return}
    this.snap();
    const tgtSl=this.$.paste_sw.value;let createdSl=0,createdStatus=0;
    const newItems=mapped.map((row,i)=>{
      const it={id:U.id(),type:'milestone',name:row.Name||'Item '+(i+1),swimlaneId:tgtSl,subSwimId:'',subRow:i%3,
        color:COLORS[i%COLORS.length],iconType:'triangle',labelPosition:'right',showDate:true,showDuration:false,
        showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',
        dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:'',durMode:'cal'};
      if(row.Owner)it.owner=row.Owner;
      if(row.Notes)it.notes=row.Notes;
      if(row.Color&&/^#[0-9a-f]{3,8}$/i.test(row.Color))it.color=row.Color;
      if(row.Progress)it.progress=Math.max(0,Math.min(100,parseInt(row.Progress,10)||0));
      if(row.Pinned)it.pinned=/^(y|yes|true|1)$/i.test(row.Pinned);
      if(row.Hidden)it.hidden=/^(y|yes|true|1)$/i.test(row.Hidden);
      if(row.LabelPos)it.labelPosition=row.LabelPos;
      if(row.FontSize)it.fontSize=parseInt(row.FontSize,10)||0;
      if(row.TextColor)it.textColor=row.TextColor;
      if(row.DateFormat)it.dateFormat=row.DateFormat;
      if(row.ShowDate)it.showDate=/^(y|yes|true|1)$/i.test(row.ShowDate);
      /* Swimlane resolution */
      if(row.Swimlane){
        const slBefore=this.proj.swimlanes.length;
        it.swimlaneId=this._resolveSwimlaneName(row.Swimlane);
        if(this.proj.swimlanes.length>slBefore)createdSl++;
      }
      if(row.SubSwim)it.subSwimId=this._resolveSubSwimName(it.swimlaneId,row.SubSwim);
      if(row.Row!=null&&row.Row!=='')it.subRow=parseInt(row.Row,10)||0;
      /* Status resolution */
      if(row.Status){
        const stBefore=this.proj.statusDefs.length;
        it.status=this._resolveStatusForImport(row.Status);
        if(this.proj.statusDefs.length>stBefore)createdStatus++;
      }
      if(row.StatusDate){const sd=U.parseDate(row.StatusDate);if(sd)it.statusDate=U.iso(sd)}
      /* Dates & type inference */
      const startD=row.Start?U.parseDate(row.Start):null;
      const endD=row.End?U.parseDate(row.End):null;
      let explicitType=row.Type?row.Type.toLowerCase().trim():'';
      if(explicitType==='task'||explicitType==='milestone')it.type=explicitType;
      else if(startD&&endD){
        /* Same start/end → milestone. Duration=1 with same dates → milestone. */
        const sameDate=U.iso(startD)===U.iso(endD);
        const dur1=row.Duration&&parseInt(row.Duration,10)===1;
        it.type=(sameDate||(dur1&&sameDate))?'milestone':'task';
      }else if(startD)it.type='milestone';
      if(it.type==='task'){
        it.startDate=startD?U.iso(startD):U.iso(new Date());
        it.endDate=endD?U.iso(endD):null;
        if(row.Duration&&!it.endDate){
          it.duration=parseInt(row.Duration,10)||14;
          it.endDate=U.iso(U.addDays(it.startDate,it.duration-1));
        }else if(it.endDate){
          it.duration=U.days(it.startDate,it.endDate)+1;
        }else{
          it.duration=14;it.endDate=U.iso(U.addDays(it.startDate,13));
        }
      }else{
        it.date=startD?U.iso(startD):U.iso(new Date());
      }
      /* Default label positions for import (unless CSV explicitly mapped LabelPos) */
      if(!row.LabelPos)it.labelPosition=it.type==='task'?'center':'bottom';
      return it;
    });
    /* Pass 2: Resolve predecessors */
    const predField=this._impMappings.find(m=>m.tgtField==='Predecessors');
    if(predField){
      mapped.forEach((row,i)=>{
        if(!row.Predecessors)return;
        const preds=this.parsePredString(row.Predecessors);
        preds.forEach(p=>{
          if(p.rowNum<1||p.rowNum>newItems.length)return;
          if(p.rowNum-1===i)return;
          newItems[i].deps.push({id:newItems[p.rowNum-1].id,type:p.type,lag:p.lag});
        });
      });
    }
    /* Pass 2.5: Auto-layout rows (skip if Row column explicitly mapped) */
    const hasRowMapping=this._impMappings.some(m=>m.tgtField==='Row')||this._impOverloads.some(ov=>ov.tgtField==='Row');
    if(!hasRowMapping)this._autoLayoutItems(newItems);
    /* Pass 3: Finalize */
    newItems.forEach(it=>this.proj.items.push(it));
    if(this.proj.autoSortSwimlanes)this._sortSwimlanesGravity();
    if(this.proj.autoRange)this.autoRange();
    document.getElementById('paste-modal').classList.add('hidden');
    this.sched();this.autoSave();
    let msg=`Imported ${newItems.length} item${newItems.length!==1?'s':''}`;
    if(createdSl)msg+=`, created ${createdSl} swimlane${createdSl!==1?'s':''}`;
    if(createdStatus)msg+=`, created ${createdStatus} status${createdStatus!==1?'es':''}`;
    this.toast(msg);
  },

  /* Density-Based Auto-Layout — tunable via proj.arrangeSpread and proj.arrangePadding.
     Computes a row budget from item density, distributes items using date-elapsed
     percentage for natural top-left → bottom-right waterfall, then compacts empties.
     Used by both import (newItems only) and autoArrange (any scope). */
  /* Simple slider (0–100) → advanced parameter mapping.
     Maps one slider to the three tunable parameters (spread, padding, dateWeight)
     plus the labels toggle. Uses piecewise linear interpolation with control points
     tuned for natural visual progression from compact packing to full waterfall. */
  _arrangeSimpleToAdvanced(v){
    /* Control points: [simpleVal, spread, padding, dateWeight, labels] */
    const pts=[[0,10,0,0,false],[25,25,25,5,false],[50,50,50,20,false],[75,70,70,50,true],[100,100,85,100,true]];
    let lo=pts[0],hi=pts[pts.length-1];
    for(let i=0;i<pts.length-1;i++){if(v>=pts[i][0]&&v<=pts[i+1][0]){lo=pts[i];hi=pts[i+1];break}}
    const t=lo[0]===hi[0]?0:(v-lo[0])/(hi[0]-lo[0]);
    const lerp=(a,b)=>Math.round(a+(b-a)*t);
    return{spread:lerp(lo[1],hi[1]),padding:lerp(lo[2],hi[2]),dateWeight:lerp(lo[3],hi[3]),labels:v>=63};
  },
  /* Reverse: given current advanced values, find the closest simple slider position */
  _arrangeAdvancedToSimple(spread,padding,dateWeight){
    /* Score each candidate from 0–100 against the mapping, return best match */
    let best=50,bestDist=Infinity;
    for(let v=0;v<=100;v++){
      const m=this._arrangeSimpleToAdvanced(v);
      const d=Math.abs(m.spread-spread)+Math.abs(m.padding-padding)+Math.abs(m.dateWeight-dateWeight);
      if(d<bestDist){bestDist=d;best=v}
    }
    return best;
  },
  _autoLayoutItems(items){
    if(!items||!items.length)return;
    const p=this.proj;
    /* Use zoom=100% as reference so layout is deterministic regardless of current view zoom */
    const dayCwMap={compact:20,normal:28,wide:36};
    const baseCw=p.timescale==='days'?(dayCwMap[p.dayColumnWidth||'normal']||28):{weeks:60,months:100,quarters:200,years:400}[p.timescale]||100;
    const daysPerCol={days:1,weeks:7,months:30,quarters:91,years:365}[p.timescale]||30;
    const pxPerDay=Math.max(0.5,baseCw/daysPerCol);
    const fs=p.fontSize||11;
    /* Tunable parameters from project settings */
    const padPx=10+((p.arrangePadding!=null?p.arrangePadding:50)/100)*110;/* 10–120px */
    const spread=(p.arrangeSpread!=null?p.arrangeSpread:50)/100;/* 0.1–1.0 */
    const dateWt=(100-(p.arrangeDateWeight!=null?p.arrangeDateWeight:20))/100;/* slider 0→waterfall, 100→pack */
    const useLabels=!!p.arrangeLabels;/* consider label width in collision detection */
    /* Group by swimlane+sub-swimlane */
    const grps=new Map();
    items.forEach(it=>{const k=it.swimlaneId+'|'+(it.subSwimId||'');if(!grps.has(k))grps.set(k,[]);grps.get(k).push(it)});
    for(const[,grp]of grps){
      /* Step 1: Sort chronologically */
      grp.sort((a,b)=>{const da=new Date((a.date||a.startDate||'')+'T12:00:00'),db=new Date((b.date||b.startDate||'')+'T12:00:00');return da-db});
      /* Step 2: Compute visual ends and density stats */
      let earliestStart=null,latestVE=null,totalVisDays=0;
      const meta=[];
      for(const it of grp){
        const s=it.date||it.startDate||'',e=it.endDate||it.date||s;
        const lp=it.labelPosition||'right';
        const nameW=useLabels?this._mt(it.name||'',fs,'600'):0;
        const barDur=Math.max(1,U.days(s,e)+1);
        const barPx=barDur*pxPerDay;
        let totalPx=barPx+padPx;/* padPx always adds inter-item breathing room */
        if(useLabels&&nameW){
          if(lp==='right')totalPx=barPx+nameW+padPx;
          else if(lp==='top'||lp==='bottom'){const half=nameW/2,barHalf=barPx/2;if(half>barHalf)totalPx=Math.max(totalPx,barPx+(half-barHalf)*2+padPx)}
          /* left, center: label doesn't extend rightward past bar → totalPx stays barPx+padPx */
        }
        const totalDays=Math.max(barDur,Math.ceil(totalPx/pxPerDay));
        const ve=U.addDays(s,totalDays);
        meta.push({s,ve,totalDays});
        totalVisDays+=totalDays;
        if(!earliestStart||s<earliestStart)earliestStart=s;
        if(!latestVE||ve>latestVE)latestVE=ve;
      }
      /* Step 3: Density → row budget (tuned by spread slider) */
      const N=grp.length;
      const dateSpan=Math.max(1,U.days(earliestStart,latestVE));
      const avgVisDays=totalVisDays/N;
      const coverage=(N*avgVisDays)/dateSpan;
      const minRows=Math.max(1,Math.ceil(coverage));
      const rawTarget=minRows+spread*(N-minRows);/* lerp: minRows → N */
      const targetRows=U.clamp(Math.round(rawTarget),1,N);
      /* Step 4: Date-based proportional placement with spiral search */
      const rowEnds=[];/* rowEnds[r] = visual end ISO string */
      for(let i=0;i<N;i++){
        const it=grp[i],{s,ve}=meta[i];
        /* Preferred row: blend index-based (pack) and date-based (waterfall) via dateWt */
        const idxPct=N>1?i/(N-1):0;/* 0→first item, 1→last item (pack top-down) */
        const daysPct=Math.max(0,U.days(earliestStart,s))/dateSpan;/* date-elapsed % */
        const blended=idxPct*(1-dateWt)+daysPct*dateWt;/* lerp between pack and waterfall */
        const preferred=Math.min(targetRows-1,Math.floor(blended*targetRows));
        let placed=-1;
        const maxSearch=Math.max(rowEnds.length+1,targetRows+1);
        for(let off=0;off<=maxSearch&&placed<0;off++){
          const candidates=off===0?[preferred]:[preferred-off,preferred+off];
          for(const r of candidates){
            if(r<0)continue;
            if(r<rowEnds.length){
              if(U.days(rowEnds[r],s)>=1){placed=r;break}
            }else if(r===rowEnds.length){placed=r;break}
          }
        }
        if(placed>=0){
          while(rowEnds.length<=placed)rowEnds.push(null);
          rowEnds[placed]=ve;it.subRow=placed;
        }else{
          rowEnds.push(ve);it.subRow=rowEnds.length-1;
        }
      }
      /* Step 5: Compact empty rows */
      const used=new Set(grp.map(it=>it.subRow));
      const sorted=[...used].sort((a,b)=>a-b);
      const rMap=new Map();sorted.forEach((old,idx)=>rMap.set(old,idx));
      grp.forEach(it=>{it.subRow=rMap.get(it.subRow)});
    }
  },
  /* Swimlane Gravity Sort — reorders swimlanes and sub-swimlanes by
     weighted average date (tasks weighted by duration, milestones by 1). */
  _sortSwimlanesGravity(){
    const p=this.proj,EPOCH='2000-01-01';
    function gravity(its){
      if(!its.length)return Infinity;
      let wSum=0,wTot=0;
      for(const it of its){
        let mid,w;
        if(it.type==='task'&&it.startDate&&it.endDate){
          mid=(U.days(EPOCH,it.startDate)+U.days(EPOCH,it.endDate))/2;
          w=Math.max(1,it.duration||U.days(it.startDate,it.endDate)+1);
        }else{
          mid=U.days(EPOCH,it.date||it.startDate||EPOCH);w=1;
        }
        wSum+=w*mid;wTot+=w;
      }
      return wTot>0?wSum/wTot:Infinity;
    }
    /* Build item index by swimlane */
    const bySl=new Map();
    for(const it of p.items){if(!bySl.has(it.swimlaneId))bySl.set(it.swimlaneId,[]);bySl.get(it.swimlaneId).push(it)}
    /* Sort swimlanes */
    p.swimlanes.sort((a,b)=>gravity(bySl.get(a.id)||[])-gravity(bySl.get(b.id)||[]));
    /* Sort sub-swimlanes within each swimlane */
    for(const sl of p.swimlanes){
      if(!sl.subSwimlanes||sl.subSwimlanes.length<2)continue;
      const slItems=bySl.get(sl.id)||[];
      sl.subSwimlanes.sort((a,b)=>{
        const aI=slItems.filter(it=>it.subSwimId===a.id);
        const bI=slItems.filter(it=>it.subSwimId===b.id);
        return gravity(aI)-gravity(bI);
      });
    }
  },

  /* ===== HOLIDAYS ===== */
  parseHolidays(text){return text.trim().split('\n').filter(l=>l.trim()).map(line=>{const c=line.split('\t').map(s=>s.trim());if(c.length<2||!c[0])return null;if(c.length>=3){const d1=U.parseDate(c[1]),d2=U.parseDate(c[2]);if(d1&&d2)return{name:c[0],start:U.iso(d1),end:U.iso(d2)};if(d1)return{name:c[0],start:U.iso(d1),end:U.iso(d1)}}if(c.length>=2){const d=U.parseDate(c[1]);if(d)return{name:c[0],start:U.iso(d),end:U.iso(d)}}return null}).filter(Boolean)},
  importHolidays(){
    const rows=this.parseHolidays(document.getElementById('hol-paste-ta').value);
    if(!rows.length){this.toast('No valid holidays found','error');return}
    this.snap();
    rows.forEach(h=>{if(!this.proj.holidays.some(x=>x.name===h.name&&x.start===h.start)){h.schedAround=true;this.proj.holidays.push(h)}});
    this.proj.holidays.sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0);
    document.getElementById('hol-paste-ta').value='';document.getElementById('hol-paste-prev').textContent='';
    document.getElementById('hol-import-box').classList.add('hidden');
    this.renderHolList();this._recalcNonWorkingDays();this.sched();this.autoSave();
    this.toast(`Imported ${rows.length} holiday${rows.length>1?'s':''}`)
  },
  addSingleHoliday(){
    const nameEl=document.getElementById('hol-add-name'),startEl=document.getElementById('hol-add-start'),endEl=document.getElementById('hol-add-end');
    const name=nameEl.value.trim();const startVal=startEl.value;const endVal=endEl.value;
    if(!name){this.toast('Please enter a holiday name','error');nameEl.focus();return}
    if(!startVal){this.toast('Please select a start date','error');startEl.focus();return}
    const startDate=U.parseDate(startVal);if(!startDate){this.toast('Invalid start date','error');return}
    let endDate=startDate;
    if(endVal){endDate=U.parseDate(endVal);if(!endDate){this.toast('Invalid end date','error');return}
      if(endDate<startDate){this.toast('End date must be on or after start date','error');return}}
    const h={name,start:U.iso(startDate),end:U.iso(endDate),schedAround:true};
    if(this.proj.holidays.some(x=>x.name===h.name&&x.start===h.start)){this.toast('Holiday already exists','error');return}
    this.snap();this.proj.holidays.push(h);
    this.proj.holidays.sort((a,b)=>a.start<b.start?-1:a.start>b.start?1:0);
    this.renderHolList();this._recalcNonWorkingDays();this.sched();this.autoSave();
    nameEl.value='';startEl.value='';endEl.value='';nameEl.focus();
    this.toast(`Added holiday: ${name}`)
  },
  renderHolList(){
    const p=this.proj,list=document.getElementById('hol-list'),ct=document.getElementById('hol-count');
    if(!list||!ct)return;ct.textContent=p.holidays.length;
    const holHint=document.getElementById('hol-shading-empty-hint');if(holHint)holHint.classList.toggle('hidden',p.holidays.length>0);
    if(!p.holidays.length){list.innerHTML='<div style="padding:8px;color:var(--tx3);text-align:center">No holidays — use + Add or Import to add</div>';return}
    list.innerHTML=p.holidays.map((h,i)=>{
      const rangeStr=h.start===h.end?U.fmt(h.start,p.dateFormat):`${U.fmt(h.start,p.dateFormat)} – ${U.fmt(h.end,p.dateFormat)}`;
      const saChecked=h.schedAround!==false?'checked':'';
      return`<div class="hol-row" style="display:flex;align-items:center;justify-content:space-between;padding:3px 6px;border-bottom:1px solid var(--bd)"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${U.esc(h.name)}">${U.esc(h.name)}</span><span style="color:var(--tx3);margin:0 8px;white-space:nowrap">${rangeStr}</span><label style="display:flex;align-items:center;gap:3px;font-size:9px;color:var(--tx3);white-space:nowrap;cursor:pointer" title="When enabled, Propagate and Auto-Schedule will skip this holiday"><input type="checkbox" class="hol-sched" data-hi="${i}" ${saChecked} style="margin:0">Sched</label><button class="hol-del" data-hi="${i}" style="background:none;border:none;cursor:pointer;color:#e55;font-size:12px;padding:0 2px;margin-left:4px" title="Remove" type="button">✕</button></div>`
    }).join('');
    list.querySelectorAll('.hol-del').forEach(b=>{b.onclick=()=>{
      App.snap();p.holidays.splice(+b.dataset.hi,1);this.renderHolList();
      App._recalcNonWorkingDays();App.sched();App.autoSave();
    }});
    list.querySelectorAll('.hol-sched').forEach(cb=>{cb.onchange=function(){
      App.snap();p.holidays[+this.dataset.hi].schedAround=this.checked;
      App._recalcNonWorkingDays();App.sched();App.autoSave();
    }});
  },

  renderSettingsLinks(){
    const el=document.getElementById('settings-links-list');if(!el)return;
    const p=this.proj;let h='';let total=0;
    const itemOpts=p.items.map(i=>{const ic=i.type==='milestone'?'◆':'▬';return`<option value="${i.id}">${ic} ${U.esc(i.name)}</option>`}).join('');
    /* Item links — editable with tagged-to dropdown */
    p.items.forEach(it=>{
      (it.links||[]).forEach((lk,li)=>{
        total++;
        h+=`<div class="link-chip" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px"><input class="stg-lk-input stg-lk-nm" data-iid="${it.id}" data-li="${li}" type="text" value="${U.esc(lk.name)}" placeholder="Name" style="flex:1;min-width:80px;font-size:10px;padding:2px 4px"><input class="stg-lk-input stg-lk-url" data-iid="${it.id}" data-li="${li}" type="url" value="${U.esc(lk.url)}" placeholder="https://…" style="flex:2;min-width:120px;font-size:10px;padding:2px 4px;font-family:monospace"><select class="stg-lk-input stg-lk-tag" data-iid="${it.id}" data-li="${li}" title="Tagged to item" style="flex:1;min-width:90px;font-size:9px;padding:2px 3px">${itemOpts.replace(`value="${it.id}"`,`value="${it.id}" selected`)}</select><button class="pab stg-lk-open" data-url="${U.esc(lk.url)}" style="font-size:8px;padding:0 4px" title="Open">🌐</button><button class="pab stg-lk-del" data-iid="${it.id}" data-li="${li}" style="font-size:8px;padding:0 4px;color:var(--danger)" title="Remove">✕</button></div>`;
      });
    });
    /* Swimlane links — editable name/url, entity label (no reassign) */
    p.swimlanes.forEach(sl=>{
      (sl.links||[]).forEach((lk,li)=>{
        total++;
        h+=`<div class="link-chip" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px"><input class="stg-lk-input stg-sl-nm" data-slid="${sl.id}" data-li="${li}" type="text" value="${U.esc(lk.name)}" placeholder="Name" style="flex:1;min-width:80px;font-size:10px;padding:2px 4px"><input class="stg-lk-input stg-sl-url" data-slid="${sl.id}" data-li="${li}" type="url" value="${U.esc(lk.url)}" placeholder="https://…" style="flex:2;min-width:120px;font-size:10px;padding:2px 4px;font-family:monospace"><span style="font-size:9px;color:var(--tx3);flex:1;min-width:90px">🏊 ${U.esc(sl.name)}</span><button class="pab stg-lk-open" data-url="${U.esc(lk.url)}" style="font-size:8px;padding:0 4px" title="Open">🌐</button><button class="pab stg-sl-lk-del" data-slid="${sl.id}" data-li="${li}" style="font-size:8px;padding:0 4px;color:var(--danger)" title="Remove">✕</button></div>`;
      });
      /* Sub-swimlane links */
      (sl.subSwimlanes||[]).forEach(ss=>{
        (ss.links||[]).forEach((lk,li)=>{
          total++;
          h+=`<div class="link-chip" style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:4px"><input class="stg-lk-input stg-ss-nm" data-ssid="${ss.id}" data-li="${li}" type="text" value="${U.esc(lk.name)}" placeholder="Name" style="flex:1;min-width:80px;font-size:10px;padding:2px 4px"><input class="stg-lk-input stg-ss-url" data-ssid="${ss.id}" data-li="${li}" type="url" value="${U.esc(lk.url)}" placeholder="https://…" style="flex:2;min-width:120px;font-size:10px;padding:2px 4px;font-family:monospace"><span style="font-size:9px;color:var(--tx3);flex:1;min-width:90px">└ ${U.esc(ss.name)}</span><button class="pab stg-lk-open" data-url="${U.esc(lk.url)}" style="font-size:8px;padding:0 4px" title="Open">🌐</button><button class="pab stg-ss-lk-del" data-ssid="${ss.id}" data-li="${li}" style="font-size:8px;padding:0 4px;color:var(--danger)" title="Remove">✕</button></div>`;
        });
      });
    });
    if(!total)h=`<div style="font-size:10px;color:var(--tx3);font-style:italic">No URL links in this project.</div>`;
    else{
      h+=`<div style="margin-top:10px;font-size:10px;color:var(--tx3)">Total: ${total} URL link${total===1?'':'s'}</div>`;
      h+=`<div style="display:flex;gap:6px;margin-top:6px"><button class="pab" id="stg-lk-open-all" style="font-size:10px;padding:2px 8px">🌐 Open All</button><button class="pab" id="stg-lk-copy-all" style="font-size:10px;padding:2px 8px">📋 Copy All as List</button></div>`;
    }
    el.innerHTML=h;
    /* Wire — item link name/url editing */
    el.querySelectorAll('.stg-lk-nm').forEach(inp=>{inp.oninput=function(){const it=App.gi(this.dataset.iid);if(it&&it.links[+this.dataset.li])it.links[+this.dataset.li].name=this.value;App.autoSave()}});
    el.querySelectorAll('.stg-lk-url').forEach(inp=>{
      inp.oninput=function(){const it=App.gi(this.dataset.iid);if(it&&it.links[+this.dataset.li])it.links[+this.dataset.li].url=this.value;App.autoSave()};
      inp.onblur=function(){const it=App.gi(this.dataset.iid);const li=+this.dataset.li;if(!it||!it.links[li])return;let u=this.value.trim();if(u&&!/^[a-z]+:\/\//i.test(u)){u='https://'+u;this.value=u;it.links[li].url=u}if(u&&!it.links[li].name){try{it.links[li].name=new URL(u).hostname.replace(/^www\./,'')}catch(e){}}if(u){this.style.borderColor='#2ea043';setTimeout(()=>{this.style.borderColor=''},800)}App.autoSave();App.sched()}
    });
    /* Wire — tagged-to dropdown (reassign link to different item) */
    el.querySelectorAll('.stg-lk-tag').forEach(sel=>{sel.onchange=function(){
      const oldIt=App.gi(this.dataset.iid),newIt=App.gi(this.value),li=+this.dataset.li;
      if(!oldIt||!newIt||oldIt.id===newIt.id)return;
      if((newIt.links||[]).length>=5){App.toast('Target item already has 5 URL links','error');this.value=oldIt.id;return}
      App.snap();const lk=oldIt.links.splice(li,1)[0];if(!newIt.links)newIt.links=[];newIt.links.push(lk);
      App.sched();App.autoSave();App.renderSettingsLinks();
    }});
    /* Wire — swimlane link name/url editing */
    el.querySelectorAll('.stg-sl-nm').forEach(inp=>{inp.oninput=function(){const sl=App.gs(this.dataset.slid);if(sl&&sl.links[+this.dataset.li])sl.links[+this.dataset.li].name=this.value;App.autoSave()}});
    el.querySelectorAll('.stg-sl-url').forEach(inp=>{
      inp.oninput=function(){const sl=App.gs(this.dataset.slid);if(sl&&sl.links[+this.dataset.li])sl.links[+this.dataset.li].url=this.value;App.autoSave()};
      inp.onblur=function(){const sl=App.gs(this.dataset.slid);const li=+this.dataset.li;if(!sl||!sl.links[li])return;let u=this.value.trim();if(u&&!/^[a-z]+:\/\//i.test(u)){u='https://'+u;this.value=u;sl.links[li].url=u}if(u&&!sl.links[li].name){try{sl.links[li].name=new URL(u).hostname.replace(/^www\./,'')}catch(e){}}if(u){this.style.borderColor='#2ea043';setTimeout(()=>{this.style.borderColor=''},800)}App.autoSave()}
    });
    /* Wire — sub-swimlane link name/url editing */
    el.querySelectorAll('.stg-ss-nm').forEach(inp=>{inp.oninput=function(){const ss=App._findSubSwim(this.dataset.ssid);if(ss&&ss.links[+this.dataset.li])ss.links[+this.dataset.li].name=this.value;App.autoSave()}});
    el.querySelectorAll('.stg-ss-url').forEach(inp=>{
      inp.oninput=function(){const ss=App._findSubSwim(this.dataset.ssid);const li=+this.dataset.li;if(!ss||!ss.links[li])return;ss.links[li].url=this.value;App.autoSave()};
      inp.onblur=function(){const ss=App._findSubSwim(this.dataset.ssid);const li=+this.dataset.li;if(!ss||!ss.links[li])return;let u=this.value.trim();if(u&&!/^[a-z]+:\/\//i.test(u)){u='https://'+u;this.value=u;ss.links[li].url=u}if(u&&!ss.links[li].name){try{ss.links[li].name=new URL(u).hostname.replace(/^www\./,'')}catch(e){}}if(u){this.style.borderColor='#2ea043';setTimeout(()=>{this.style.borderColor=''},800)}App.autoSave()}
    });
    /* Wire — open/delete buttons */
    el.querySelectorAll('.stg-lk-open').forEach(b=>{b.onclick=()=>{if(b.dataset.url)window.open(b.dataset.url,'_blank')}});
    el.querySelectorAll('.stg-lk-del').forEach(b=>{b.onclick=()=>{const it=this.gi(b.dataset.iid);if(it){this.snap();it.links.splice(+b.dataset.li,1);this.sched();this.autoSave();this.renderSettingsLinks()}}});
    el.querySelectorAll('.stg-sl-lk-del').forEach(b=>{b.onclick=()=>{const sl=this.gs(b.dataset.slid);if(sl){this.snap();sl.links.splice(+b.dataset.li,1);this.sched();this.autoSave();this.renderSettingsLinks()}}});
    el.querySelectorAll('.stg-ss-lk-del').forEach(b=>{b.onclick=()=>{const ss=this._findSubSwim(b.dataset.ssid);if(ss){this.snap();ss.links.splice(+b.dataset.li,1);this.sched();this.autoSave();this.renderSettingsLinks()}}});
    document.getElementById('stg-lk-open-all')?.addEventListener('click',()=>{
      const allUrls=[];p.items.forEach(i=>(i.links||[]).forEach(lk=>{if(lk.url)allUrls.push(lk.url)}));p.swimlanes.forEach(sl=>{(sl.links||[]).forEach(lk=>{if(lk.url)allUrls.push(lk.url)});(sl.subSwimlanes||[]).forEach(ss=>{(ss.links||[]).forEach(lk=>{if(lk.url)allUrls.push(lk.url)})})});
      if(!allUrls.length){this.toast('No URL links','error');return}
      if(allUrls.length>5&&!confirm(`Open ${allUrls.length} URL links in new tabs?`))return;
      allUrls.forEach(u=>window.open(u,'_blank'));
    });
    document.getElementById('stg-lk-copy-all')?.addEventListener('click',()=>{
      const lines=[];p.items.forEach(i=>(i.links||[]).forEach(lk=>{lines.push(`${lk.name||'Untitled'}: ${lk.url}`)}));p.swimlanes.forEach(sl=>{(sl.links||[]).forEach(lk=>{lines.push(`${lk.name||'Untitled'}: ${lk.url}`)});(sl.subSwimlanes||[]).forEach(ss=>{(ss.links||[]).forEach(lk=>{lines.push(`${lk.name||'Untitled'}: ${lk.url}`)})})});
      navigator.clipboard.writeText(lines.join('\n'));this.toast(`Copied ${lines.length} URL link${lines.length===1?'':'s'}`);
    });
  },

  /* ===== PANEL ===== */
  /* Smooth-scroll so selected item(s) are fully visible in the clear zone (left of panel).
     Matches Google Maps' auto-pan: gentle animated scroll, not an instant snap.
     Accepts a single item or uses this.sel for bulk selections. */
  _scrollItemClear(it){
    requestAnimationFrame(()=>{
      const bs=this.$.tl_body_scroll;if(!bs)return;
      const tl=this.met();
      const items=it?[it]:this.sel.map(id=>this.gi(id)).filter(Boolean);
      if(!items.length)return;
      let minL=Infinity,maxR=-Infinity;
      for(const item of items){
        const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(item);
        const lp=item.labelPosition||'right';
        let iL,iR;
        if(item.type==='task'){
          const x1=this.dX(item.startDate,tl),x2=this.dXEnd(item.endDate,tl);
          if(x1===null||x2===null)continue;
          iL=x1;iR=x2;
          if(lp==='right')iR+=6+labelW;
          else if(lp==='left')iL-=6+labelW;
          if(edgeLW)iL-=edgeLW;
          if(edgeRW)iR+=edgeRW;
        }else{
          const x=this.dXMid(item.date,tl);if(x===null)continue;
          iL=x-8;iR=x+8;
          if(lp==='right')iR+=12+labelW;
          else if(lp==='left')iL-=12+labelW;
        }
        minL=Math.min(minL,iL);maxR=Math.max(maxR,iR);
      }
      if(minL===Infinity)return;
      const clearRight=bs.scrollLeft+bs.clientWidth-(this.panelCollapsed?28:290)-20;/* 20px margin */
      const clearLeft=bs.scrollLeft+20;
      if(maxR>clearRight){
        bs.scrollTo({left:bs.scrollLeft+(maxR-clearRight),behavior:'smooth'});
      }else if(minL<clearLeft){
        bs.scrollTo({left:Math.max(0,bs.scrollLeft-(clearLeft-minL)),behavior:'smooth'});
      }
    });
  },
  openPanel(it){
    this.editItem=it;this.$.panel_title.textContent=it.type==='milestone'?'Milestone':'Task';this.renderPanel(it);
    if(this.panelCollapsed){if(this.panelLocked){this._hintCollapsedTab();return}this.expandPanel();return}
    this.$.props_panel.classList.remove('panel-hidden');this._syncPanelPad();this._scrollItemClear(it)
  },
  openBulkPanel(){
    this.$.panel_title.textContent=`Bulk Edit (${this.sel.length})`;this.renderBulkPanel();
    if(this.panelCollapsed){if(this.panelLocked){this._hintCollapsedTab();return}this.expandPanel();return}
    this.$.props_panel.classList.remove('panel-hidden');this._syncPanelPad();this._scrollItemClear()
  },
  closePanel(){
    if(this.panelCollapsed){this.editItem=null;return}
    this._renderEmptyPanel()
  },
  collapsePanel(locked){
    this.panelCollapsed=true;this.panelLocked=!!locked;
    this.$.props_panel.classList.add('panel-hidden');this.$.panel_tab.classList.remove('hidden');
    this._syncLockTab();this._syncPanelPad();this._savePanelState()
  },
  expandPanel(){
    this.panelCollapsed=false;this.panelLocked=false;
    this.$.props_panel.classList.remove('panel-hidden');this.$.panel_tab.classList.add('hidden');
    this._syncPanelPad();this._savePanelState();
    if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it){this.editItem=it;this.$.panel_title.textContent=it.type==='milestone'?'Milestone':'Task';this.renderPanel(it);this._scrollItemClear(it)}}
    else if(this.sel.length>1){this.$.panel_title.textContent=`Bulk Edit (${this.sel.length})`;this.renderBulkPanel();this._scrollItemClear()}
    else{this._renderEmptyPanel()}
  },
  _renderEmptyPanel(){
    this.$.panel_title.textContent='Properties';this.editItem=null;
    const hasHint=this.proj.items.length<3;
    this.$.panel_body.innerHTML=`<div style="text-align:center;padding:40px 16px;color:var(--tx3)"><div style="font-size:24px;margin-bottom:10px">📋</div><div style="font-size:12px;font-weight:600;color:var(--tx2)">Select an item to edit its properties</div>${hasHint?`<div style="margin-top:8px;font-size:11px;line-height:1.6">Click <strong>+ Task</strong> or <strong>+ Milestone</strong> to add items.<br>Right-click the timeline to add at a specific date.</div>`:''}</div>`
  },
  _hintCollapsedTab(){
    if(!this.panelCollapsed)return;const now=Date.now();if(now-this._panelHintCooldown<4000)return;
    this._panelHintCooldown=now;const tab=this.$.panel_tab;if(!tab)return;
    tab.classList.remove('hint');void tab.offsetWidth;tab.classList.add('hint');
    tab.addEventListener('animationend',()=>tab.classList.remove('hint'),{once:true})
  },
  _hintLockPill(){
    const pill=this.$.pill_lock;if(!pill||pill.classList.contains('hidden'))return;
    const now=Date.now();if(now-this._lockPillHintCD<2000)return;this._lockPillHintCD=now;
    pill.classList.remove('pill-hint');void pill.offsetWidth;pill.classList.add('pill-hint');
    pill.addEventListener('animationend',()=>pill.classList.remove('pill-hint'),{once:true})
  },
  _hintHidePill(){
    const pill=this.$.pill_hide;if(!pill||pill.classList.contains('hidden'))return;
    const now=Date.now();if(now-this._hidePillHintCD<2000)return;this._hidePillHintCD=now;
    pill.classList.remove('pill-hint');void pill.offsetWidth;pill.classList.add('pill-hint');
    pill.addEventListener('animationend',()=>pill.classList.remove('pill-hint'),{once:true})
  },
  _syncPanelPad(){
    const w=this.panelCollapsed?28:290;
    const sbW=this.$.tl_body_scroll.offsetWidth-this.$.tl_body_scroll.clientWidth;
    this.$.tl_body.style.width=(this._tlTW||0)+w+'px';
    this.$.tl_hdr.style.width=(this._tlTW||0)+w+sbW+'px';
    if(this.$.data_table_wrap)this.$.data_table_wrap.style.paddingRight=w+'px';
    const dtb=document.getElementById('data-toolbar');if(dtb)dtb.style.paddingRight=w+'px';
    const dfb=this.$.data_filter_bar;if(dfb)dfb.style.paddingRight=w+'px'
  },
  _syncLockTab(){
    const tab=this.$.panel_tab;if(!tab)return;
    const icon=this.$.panel_tab_icon;
    if(this.panelLocked){tab.classList.add('locked');if(icon)icon.textContent='🔒'}
    else{tab.classList.remove('locked');if(icon)icon.textContent='‹'}
  },
  _savePanelState(){try{localStorage.setItem('tls3_panelCollapsed',this.panelCollapsed?'1':'0');localStorage.setItem('tls3_panelLocked',this.panelLocked?'1':'0')}catch(e){}},

  renderBulkPanel(){
    const items=this.sel.map(id=>this.gi(id)).filter(Boolean);if(!items.length)return;
    const first=items[0];
    const hasTasks=items.some(i=>i.type==='task');
    const hasMilestones=items.some(i=>i.type==='milestone');
    let h=`<div class="ps"><div class="ps-t">Bulk Edit — ${items.length} items</div>
      <div class="pr"><label>Color</label><div class="pcr"><input type="color" id="bp-clr" class="pci" value="${first.color}"><div class="color-presets-h">${COLORS.slice(0,10).map(c=>`<div class="cs" style="background:${c}" data-c="${c}"></div>`).join('')}</div></div></div>
      <div class="pr"><label>Text Color</label><div class="pcr"><input type="color" id="bp-tc" class="pci" value="${first.textColor||'#1a1a1a'}"><div class="color-presets-h">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="tc"></div>`).join('')}</div></div></div>`;
    if(hasTasks)h+=`<div class="pr"><label>Date Text Color</label><div class="pcr"><input type="color" id="bp-etc" class="pci" value="${(items.find(i=>i.type==='task')||first).edgeTextColor||'#5a6577'}"><div class="color-presets-h">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="etc"></div>`).join('')}</div></div></div>`;
    h+=`<div class="pr"><label>Font Size (0 = global)</label><input type="number" id="bp-fs" value="${first.fontSize||0}" min="0" max="20"></div>
      <div class="pr"><label>Label Pos</label><div class="lp-grid"><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="top">T</div><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="left">L</div><div class="lp-btn" data-v="center">M</div><div class="lp-btn" data-v="right">R</div><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="bottom">B</div><div class="lp-btn" data-v=""></div></div></div>`;
    if(hasMilestones)h+=`<div class="pr"><label>Icon</label><div class="icon-grid">${ICONS.map(ic=>`<button class="ic-btn" data-ic="${ic.id}" title="${ic.l}"><svg width="14" height="14" viewBox="0 0 24 24" fill="${first.color}"><path d="${ic.p}"/></svg></button>`).join('')}</div></div>`;
    h+=`<div class="pr"><label><input type="checkbox" id="bp-hidden" ${items.every(i=>i.hidden)?'checked':''}> Hidden</label></div>
      <div class="pr"><label><input type="checkbox" id="bp-pin" ${items.every(i=>i.pinned)?'checked':''}> 📌 Pin Date</label>
        <div style="font-size:9.5px;color:var(--tx3);margin-top:2px;line-height:1.4">Pinned items are protected from Propagate and auto-scheduling.</div></div>
      <div class="pr"><label>Status</label><select id="bp-status"><option value="_keep">(Keep current)</option>${(this.proj.statusDefs||[]).map(sd=>`<option value="${sd.id}">${sd.id==='blank'?'(None)':(sd.emoji?sd.emoji+' ':'')+U.esc(sd.name)}</option>`).join('')}</select></div></div>`;

    h+=`<div class="ps"><div class="ps-t">Date Display</div>
      <div class="pr"><label>Format</label><select id="bp-df"><option value="">Global</option>${['MMM D, YYYY','MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','M/D','MMM D','MMM YYYY'].map(f=>`<option value="${f}">${f}</option>`).join('')}</select></div>
      <div class="pr"><label>Owner</label><input type="text" id="bp-owner" value="" placeholder="Set owner for all selected"></div>
      <div class="pr"><label><input type="checkbox" id="bp-sown" ${items.every(i=>i.showOwner)?'checked':''}> Show Owner</label></div>`;
    if(hasTasks)h+=`<div class="pr"><label><input type="checkbox" id="bp-ssd" ${items.filter(i=>i.type==='task').every(i=>i.showStartDate)?'checked':''}> Show Start Date</label></div>
      <div class="pr"><label><input type="checkbox" id="bp-sed" ${items.filter(i=>i.type==='task').every(i=>i.showEndDate)?'checked':''}> Show End Date</label></div>
      <div class="pr"><label><input type="checkbox" id="bp-sdur" ${items.filter(i=>i.type==='task').every(i=>i.showDuration)?'checked':''}> Show Duration</label></div>
      <div class="pr"><label>Dur Fmt</label><select id="bp-durfmt"><option value="days" ${(items.find(i=>i.type==='task')||{}).durationFmt==='days'?'selected':''}>Days</option><option value="weeks" ${(items.find(i=>i.type==='task')||{}).durationFmt==='weeks'?'selected':''}>Weeks</option><option value="months" ${(items.find(i=>i.type==='task')||{}).durationFmt==='months'?'selected':''}>Months</option></select></div>`;
    if(hasMilestones)h+=`<div class="pr"><label><input type="checkbox" id="bp-sd" ${items.filter(i=>i.type==='milestone').every(i=>i.showDate!==false)?'checked':''}> Show Date Label</label></div>`;
    h+=`</div>`;

    this.$.panel_body.innerHTML=h;
    const up=fn=>{this.snap();items.forEach(fn);this.sched();this.autoSave()};
    const q=id=>document.getElementById(id);
    q('bp-clr').oninput=function(){up(i=>i.color=this.value)};
    q('bp-tc').oninput=function(){up(i=>i.textColor=this.value)};
    if(q('bp-etc')){q('bp-etc').oninput=function(){up(i=>{if(i.type==='task')i.edgeTextColor=this.value})};this.$.panel_body.querySelectorAll('[data-f="etc"]').forEach(s=>{s.onclick=()=>{const c=s.dataset.c;q('bp-etc').value=c;up(i=>{if(i.type==='task')i.edgeTextColor=c})}})}
    q('bp-fs').onchange=function(){up(i=>i.fontSize=+this.value)};
    q('bp-hidden').onchange=function(){up(i=>i.hidden=this.checked)};
    q('bp-pin').onchange=function(){up(i=>i.pinned=this.checked)};
    if(q('bp-status'))q('bp-status').onchange=function(){if(this.value==='_keep')return;const v=this.value;up(i=>{i.status=(v==='blank'?'':v);i.statusDate=i.status?U.iso(new Date()):''})};
    q('bp-df').onchange=function(){up(i=>i.dateFormat=this.value)};
    q('bp-owner').onchange=function(){if(this.value)up(i=>i.owner=this.value)};
    q('bp-sown').onchange=function(){up(i=>i.showOwner=this.checked)};
    if(q('bp-ssd'))q('bp-ssd').onchange=function(){up(i=>{if(i.type==='task')i.showStartDate=this.checked})};
    if(q('bp-sed'))q('bp-sed').onchange=function(){up(i=>{if(i.type==='task')i.showEndDate=this.checked})};
    if(q('bp-sdur'))q('bp-sdur').onchange=function(){up(i=>{if(i.type==='task')i.showDuration=this.checked})};
    if(q('bp-durfmt'))q('bp-durfmt').onchange=function(){up(i=>{if(i.type==='task')i.durationFmt=this.value})};
    if(q('bp-sd'))q('bp-sd').onchange=function(){up(i=>{if(i.type==='milestone')i.showDate=this.checked})};
    this.$.panel_body.querySelectorAll('.color-presets-h .cs:not([data-f])').forEach(s=>{s.onclick=()=>{const c=s.dataset.c;q('bp-clr').value=c;up(i=>i.color=c)}});
    this.$.panel_body.querySelectorAll('[data-f="tc"]').forEach(s=>{s.onclick=()=>{const c=s.dataset.c;q('bp-tc').value=c;up(i=>i.textColor=c)}});
    this.$.panel_body.querySelectorAll('.lp-btn').forEach(b=>{if(!b.dataset.v||!['top','bottom','left','right','center'].includes(b.dataset.v))return;b.onclick=()=>up(i=>i.labelPosition=b.dataset.v)});
    this.$.panel_body.querySelectorAll('.ic-btn').forEach(b=>{b.onclick=()=>up(i=>{if(i.type==='milestone')i.iconType=b.dataset.ic})});
  },

  _applyScope:null,_applyItem:null,
  showApplyModal(scope,it){this._applyScope=scope;this._applyItem=it;this.$.apply_title.textContent={swimlane:'Apply to Swimlane',sub:'Apply to Sub-Lane',all:'Apply to All'}[scope]||'Apply';this.showModal('apply-modal')},
  doApply(){if(!this._applyItem)return;this.snap();const it=this._applyItem,sc=this._applyScope;
    const ck=id=>document.getElementById(id)?.checked;
    let tg;if(sc==='swimlane')tg=this.proj.items.filter(i=>i.swimlaneId===it.swimlaneId&&i.id!==it.id);else if(sc==='sub')tg=this.proj.items.filter(i=>i.swimlaneId===it.swimlaneId&&i.subSwimId===it.subSwimId&&i.id!==it.id);else tg=this.proj.items.filter(i=>i.id!==it.id);
    tg.forEach(t=>{if(ck('ap-color'))t.color=it.color;if(ck('ap-icon'))t.iconType=it.iconType;if(ck('ap-lp'))t.labelPosition=it.labelPosition;if(ck('ap-sd')){t.showDate=it.showDate;t.showDuration=it.showDuration;t.showOwner=it.showOwner}if(ck('ap-tc'))t.textColor=it.textColor;if(ck('ap-df'))t.dateFormat=it.dateFormat;if(ck('ap-fs'))t.fontSize=it.fontSize;if(ck('ap-hid'))t.hidden=it.hidden;if(ck('ap-dl'))t.pinned=it.pinned;if(ck('ap-status')){t.status=it.status;t.statusDate=t.status?U.iso(new Date()):''}});
    document.getElementById('apply-modal').classList.add('hidden');this.sched();this.autoSave();this.toast('Applied!')},

  renderPanel(it){
    const p=this.proj,sl=this.gs(it.swimlaneId),subSws=sl?.subSwimlanes||[];
    const gfs=it.fontSize||p.fontSize||11;
    const sDef=this._getStatusDef(it.status);
    const sDefs=p.statusDefs||[];
    let h=`<div class="ps"><div class="ps-t">General</div>
      <div class="pr"><label>Name</label><input type="text" id="pp-nm" value="${U.esc(it.name)}"></div>
      <div class="pr"><label>Status</label><div style="display:flex;gap:4px;align-items:center"><select id="pp-status" style="flex:1">${sDefs.map(sd=>`<option value="${sd.id}" ${sd.id===(it.status||'blank')?'selected':''}>${sd.id==='blank'?'(None)':(sd.emoji?sd.emoji+' ':'')+U.esc(sd.name)}</option>`).join('')}</select><button id="pp-status-gear" class="pab" style="padding:2px 6px;font-size:12px" title="Configure statuses in Settings">⚙</button></div></div>`;
    if(sDef){
      h+=`<div class="pr pp-status-detail" style="margin-top:-4px;padding:2px 0 2px 4px"><span style="font-size:10px;color:var(--tx3);font-style:italic">${U.esc(sDef.desc||'')}</span>`;
      if(it.statusDate)h+=`<span style="font-size:9px;color:var(--tx3);display:block;margin-top:1px">Updated: ${U.fmt(it.statusDate,p.dateFormat)}</span>`;
      h+=`</div>`;
    }
    h+=`<div class="pr"><label>Owner</label><input type="text" id="pp-owner" value="${U.esc(it.owner||'')}" placeholder="Responsible person"></div>
      <div class="pr"><label>Notes</label><textarea id="pp-notes" rows="2" placeholder="Notes…">${U.esc(it.notes||'')}</textarea></div>
      <div class="pr"><label>Swimlane</label><select id="pp-sl">${p.swimlanes.map(s=>`<option value="${s.id}" ${s.id===it.swimlaneId?'selected':''}>${s.name}</option>`).join('')}</select></div>`;
    if(subSws.length)h+=`<div class="pr"><label>Sub-Swimlane</label><select id="pp-ssw"><option value="">(none)</option>${subSws.map(ss=>`<option value="${ss.id}" ${ss.id===it.subSwimId?'selected':''}>${ss.name}</option>`).join('')}</select></div>`;
    if(it.type==='milestone'){
      const isCalc=p.schedulingMode==='scheduled'&&it.deps?.length&&!it.pinned;
      h+=`<div class="pr"><label>Date${isCalc?' <span style="font-size:9px;color:var(--tx3)">(auto)</span>':''}</label><input type="date" id="pp-date" value="${it.date||''}" ${isCalc?'readonly style="opacity:.6;background:var(--bg2)"':''}></div>`;
    }else{
      const isCalc=p.schedulingMode==='scheduled'&&it.deps?.length&&!it.pinned;
      h+=`<div class="ps-t" style="margin-top:8px">Timing${isCalc?' — <span style="font-size:9px;color:var(--tx3);font-weight:400">📐 auto-scheduled</span>':''}</div>
        <div class="pr"><label>Start${isCalc?' <span style="font-size:9px;color:var(--tx3)">(auto)</span>':''}</label><input type="date" id="pp-start" value="${it.startDate||''}" ${isCalc?'readonly style="opacity:.6;background:var(--bg2)"':''}></div>
        <div class="pr"><label>End${isCalc?' <span style="font-size:9px;color:var(--tx3)">(auto)</span>':''}</label><input type="date" id="pp-end" value="${it.endDate||''}" ${isCalc?'readonly style="opacity:.6;background:var(--bg2)"':''}></div>
        <div class="dur-row"><div class="pr"><label>Duration</label><input type="number" id="pp-dur" value="${it.duration||''}" min="1"></div>
        <div class="pr" style="max-width:80px"><label>Mode</label><select id="pp-durmode"><option value="cal" ${(it.durMode||'cal')==='cal'?'selected':''}>Cal</option><option value="work" ${(it.durMode||'cal')==='work'?'selected':''}>Work</option></select></div>
        <div class="pr" id="pp-caldays-wrap" style="max-width:70px;${(it.durMode||'cal')==='work'&&it.startDate&&it.endDate?'':'display:none'}"><label style="color:var(--tx3)">Cal</label><input type="text" id="pp-caldays" value="${it.startDate&&it.endDate?(U.days(it.startDate,it.endDate)+1)+'d':''}" readonly style="opacity:.6;background:var(--bg2);font-size:10px;text-align:center;border:1px solid var(--brd);border-radius:3px;padding:3px;width:40px"></div></div>
        <div class="pr"><label>Progress %</label><div style="display:flex;align-items:center;gap:6px"><input type="range" id="pp-prog" value="${it.progress||0}" min="0" max="100" style="flex:1"><span id="pp-pv" style="font-size:10px;color:var(--tx3);min-width:28px">${it.progress||0}%</span></div></div>`;
    }
    h+=`<div class="pr"><label>Row</label><input type="number" id="pp-row" value="${it.subRow||0}" min="0" max="10"></div>
      <div class="pr"><label><input type="checkbox" id="pp-pin" ${it.pinned?'checked':''}> 📌 Pin Date</label>
        <div style="font-size:9.5px;color:var(--tx3);margin-top:2px;line-height:1.4">${p.schedulingMode==='scheduled'?'Pinned items keep their manual date and are not moved by the scheduling engine. Unpin to let dependencies control this date.':'Pinned items are skipped when using <em>Propagate to Successors</em>. Pin important milestones or approved dates to protect them from being moved.'}</div></div>
      <div class="pr"><label><input type="checkbox" id="pp-hidden" ${it.hidden?'checked':''}> Hidden</label></div></div>`;

    h+=`<div class="ps"><div class="ps-t">Appearance</div>
      <div class="pr"><label>Color</label><div class="pcr"><input type="color" id="pp-clr" class="pci" value="${it.color}">${COLORS.slice(0,10).map(c=>`<div class="cs ${c===it.color?'active':''}" style="background:${c}" data-c="${c}"></div>`).join('')}</div></div>
      <div class="pr"><label>Text Color</label><div class="pcr"><input type="color" id="pp-tc" class="pci" value="${it.textColor||'#1a1a1a'}">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="tc"></div>`).join('')}</div></div>`;
    if(it.type==='task')h+=`<div class="pr"><label>Date Text Color</label><div class="pcr"><input type="color" id="pp-etc" class="pci" value="${it.edgeTextColor||'#5a6577'}">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="etc"></div>`).join('')}</div><div style="font-size:9.5px;color:var(--tx3);margin-top:2px;line-height:1.4">${it.showStartDate||it.showEndDate?'Color of start/end date labels on the task bar':'Enable Start/End Date below to see date labels'}</div></div>`;
    h+=`<div class="pr"><label>Font Size (0 = global: ${p.fontSize}px)</label><input type="number" id="pp-fs" value="${gfs}" min="0" max="20"></div>`;
    if(it.type==='milestone')h+=`<div class="pr"><label>Icon</label><div class="icon-grid">${ICONS.map(ic=>`<button class="ic-btn ${ic.id===it.iconType?'active':''}" data-ic="${ic.id}" title="${ic.l}"><svg width="14" height="14" viewBox="0 0 24 24" fill="${it.color}"><path d="${ic.p}"/></svg></button>`).join('')}</div></div>`;
    h+=`<div class="pr"><label>Label Pos</label><div class="lp-grid"><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='top'?'active':''}" data-v="top">T</div><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='left'?'active':''}" data-v="left">L</div><div class="lp-btn ${it.labelPosition==='center'?'active':''}" data-v="center">M</div><div class="lp-btn ${it.labelPosition==='right'?'active':''}" data-v="right">R</div><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='bottom'?'active':''}" data-v="bottom">B</div><div class="lp-btn" data-v=""></div></div></div></div>`;

    h+=`<div class="ps"><div class="ps-t">Date Display</div>
      <div class="pr"><label>Format</label><select id="pp-df"><option value="">Global (${p.dateFormat.startsWith('custom:')?p.dateFormat.slice(7):p.dateFormat})</option>${['MMM D, YYYY','MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','M/D','MMM D','MMM YYYY'].map(f=>`<option value="${f}" ${f===it.dateFormat?'selected':''}>${f}</option>`).join('')}</select></div>`;
    if(it.type==='milestone')h+=`<div class="pr"><label><input type="checkbox" id="pp-sd" ${it.showDate!==false?'checked':''}> Show Date Label</label></div>`;
    if(it.type==='task')h+=`<div class="pr"><label><input type="checkbox" id="pp-ssd" ${it.showStartDate?'checked':''}> Start Date (left edge)</label></div><div class="pr"><label><input type="checkbox" id="pp-sed" ${it.showEndDate?'checked':''}> End Date (right edge)</label></div><div class="pr"><label><input type="checkbox" id="pp-sdur" ${it.showDuration?'checked':''}> Duration</label></div><div class="pr"><label><input type="checkbox" id="pp-sown" ${it.showOwner?'checked':''}> Owner</label></div><div class="pr"><label>Dur Fmt</label><select id="pp-durfmt"><option value="days" ${it.durationFmt==='days'?'selected':''}>Days</option><option value="weeks" ${it.durationFmt==='weeks'?'selected':''}>Weeks</option><option value="months" ${it.durationFmt==='months'?'selected':''}>Months</option></select></div>`;
    else h+=`<div class="pr"><label><input type="checkbox" id="pp-sown" ${it.showOwner?'checked':''}> Owner</label></div>`;
    h+=`</div>`;

    const cd=it.deps||[];
    const cdIds=cd.map(d=>this.depId(d));
    const hasSuccs=p.items.some(s=>(s.deps||[]).some(d=>this.depId(d)===it.id));
    h+=`<div class="ps"><div class="ps-t">Dependencies</div>`;
    if(!cd.length&&!hasSuccs)h+=`<div style="font-size:9.5px;color:var(--tx3);margin-bottom:6px;line-height:1.4">No dependencies yet. Add a predecessor below, or multi-select items on the timeline (Ctrl+click) and right-click → <em>Link Dependency</em>.</div>`;
    if(cd.length){
      h+=`<div class="pr"><label>Predecessors</label><div class="dep-list">${cd.map((d,di)=>{const dep=this.gi(this.depId(d));if(!dep)return'';const type=this.depType(d),lag=this.depLag(d);return`<div class="dep-chip"><span class="dep-chip-name">${U.esc(dep.name)}</span><select class="dep-chip-type" data-di="${di}" title="Dependency type: FS (Finish→Start), SS (Start→Start), FF (Finish→Finish)"><option value="FS" ${type==='FS'?'selected':''}>FS</option><option value="SS" ${type==='SS'?'selected':''}>SS</option><option value="FF" ${type==='FF'?'selected':''}>FF</option></select><input type="number" class="dep-chip-lag" data-di="${di}" value="${lag}" title="Lag in days: positive = gap, negative = overlap" style="width:54px"><button class="dep-chip-x" data-di="${di}" title="Remove">&times;</button></div>`}).join('')}</div></div>`;
      h+=`<div style="font-size:9.5px;color:var(--tx3);margin:-4px 0 6px 0;line-height:1.4">Use the <strong>dropdown</strong> to set link type (FS/SS/FF). Edit the number for lag (+days gap, −days overlap). ${p.schedulingMode==='scheduled'?'Dates update automatically from these links.':'Right-click → <em>Propagate</em> to push date changes through the chain.'}</div>`;
    }
    if(hasSuccs&&!cd.length)h+=`<div style="font-size:9.5px;color:var(--tx3);margin-bottom:6px;line-height:1.4">This item is a predecessor to other items. ${p.schedulingMode==='scheduled'?'Moving it will automatically shift its successors.':'Use <em>Propagate to Successors</em> (right-click) to push date changes downstream.'}</div>`;
    h+=`<div class="pr"><label>Add Predecessor</label><select id="pp-add-d" title="Select an item that must finish (or start) before this one"><option value="">— Select —</option>${p.items.filter(i=>i.id!==it.id&&!cdIds.includes(i.id)).map(i=>`<option value="${i.id}">${U.esc(i.name)}</option>`).join('')}</select></div>`;
    if(hasSuccs&&p.schedulingMode!=='scheduled')h+=`<div class="pr"><button id="pp-propagate" class="pab" style="width:100%;margin-top:4px;background:var(--acc);color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-weight:600;font-size:11px">🔀 Propagate to Successors</button></div>`;
    h+=`</div>`;

    const vl=it.vLine||{enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'};
    h+=`<div class="ps"><div class="ps-t">Vertical Line</div>
      <div class="pr"><label><input type="checkbox" id="pp-vl-on" ${vl.enabled?'checked':''}> Show Vertical Line</label></div>
      <div id="pp-vl-opts" ${vl.enabled?'':'style="display:none"'}>
      <div class="pri"><div class="pr"><label>Style</label><select id="pp-vl-style"><option value="solid" ${vl.style==='solid'?'selected':''}>Solid</option><option value="dashed" ${vl.style==='dashed'?'selected':''}>Dashed</option></select></div>
      <div class="pr"><label>Color</label><div class="pcr"><input type="color" id="pp-vl-clr" class="pci" value="${vl.color}">${['#999999','#e5534b','#2563eb','#1B7F6A','#333333','#ffffff'].map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="vl"></div>`).join('')}</div></div></div>
      <div class="pri"><div class="pr"><label>Direction</label><select id="pp-vl-dir"><option value="up" ${vl.direction==='up'?'selected':''}>Up</option><option value="down" ${vl.direction==='down'?'selected':''}>Down</option><option value="both" ${vl.direction==='both'?'selected':''}>Both</option></select></div>
      <div class="pr"><label>Extent</label><select id="pp-vl-ext"><option value="sub" ${vl.extent==='sub'?'selected':''}>Sub-Lane</option><option value="swim" ${vl.extent==='swim'?'selected':''}>Swimlane</option><option value="full" ${vl.extent==='full'?'selected':''}>Full Timeline</option></select></div></div>
      </div></div>`;

    /* URL Links section */
    const lks=it.links||[];
    const maxLk=5;
    h+=`<div class="ps" id="pp-links-section"><div class="ps-t">🌐 URL Links</div>`;
    if(!lks.length)h+=`<div style="font-size:9.5px;color:var(--tx3);font-style:italic;margin-bottom:6px">No URL links yet.</div>`;
    lks.forEach((lk,li)=>{
      h+=`<div class="link-chip" data-li="${li}"><div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><span style="font-size:9px;color:var(--tx3);min-width:14px">${li===0?'<span style="font-weight:700;color:var(--acc)">①</span>':(li+1)+'.'}</span><input class="link-nm" data-li="${li}" type="text" value="${U.esc(lk.name)}" placeholder="Name" maxlength="100" style="flex:1;font-size:10px;padding:2px 4px"></div>`;
      h+=`<div style="display:flex;align-items:center;gap:4px"><input class="link-url" data-li="${li}" type="url" value="${U.esc(lk.url)}" placeholder="https://…" style="flex:1;font-size:10px;padding:2px 4px;font-family:monospace"></div>`;
      h+=`<div style="display:flex;gap:2px;margin-top:2px">`;
      if(li>0)h+=`<button class="pab link-mv" data-li="${li}" data-dir="-1" title="Move up" style="font-size:9px;padding:1px 4px">↑</button>`;
      if(li<lks.length-1)h+=`<button class="pab link-mv" data-li="${li}" data-dir="1" title="Move down" style="font-size:9px;padding:1px 4px">↓</button>`;
      h+=`<button class="pab link-open" data-li="${li}" title="Open URL" style="font-size:9px;padding:1px 4px">🌐</button>`;
      h+=`<button class="pab link-copy" data-li="${li}" title="Copy URL" style="font-size:9px;padding:1px 4px">📋</button>`;
      h+=`<button class="pab link-embed" data-li="${li}" title="Copy embedded link" style="font-size:9px;padding:1px 4px">📎</button>`;
      h+=`<button class="pab link-del" data-li="${li}" title="Remove" style="font-size:9px;padding:1px 4px;color:var(--danger)">✕</button>`;
      h+=`</div></div>`;
    });
    if(lks.length>=maxLk)h+=`<div style="font-size:9px;color:var(--warn);margin:4px 0">Maximum ${maxLk} URL links. Consider linking to a dashboard or index page.</div>`;
    h+=`<div style="display:flex;gap:6px;margin-top:6px">`;
    if(lks.length<maxLk)h+=`<button class="pab" id="pp-link-add" style="font-size:10px;padding:2px 8px">+ Add URL Link</button>`;
    if(lks.length<maxLk)h+=`<button class="pab" id="pp-link-bulk" style="font-size:10px;padding:2px 8px">Bulk Paste…</button>`;
    h+=`</div>`;
    if(lks.length)h+=`<div style="font-size:9px;color:var(--tx3);margin-top:4px">${lks.length}/${maxLk} URL links · first = primary</div>`;
    h+=`</div>`;

    h+=`<div class="prop-btn-row">`;
    if(it.subSwimId)h+=`<button class="pab" id="pp-asub">→ Sub-Lane</button>`;
    h+=`<button class="pab" id="pp-asl">→ Swimlane</button><button class="pab" id="pp-aall">→ All</button></div>`;

    this.$.panel_body.innerHTML=h;this.bindPanel(it)
  },

  bindPanel(it){
    const up=fn=>{this.snap();fn();this.sched();this.autoSave()};const q=id=>document.getElementById(id);
    q('pp-nm').oninput=function(){it.name=this.value;App.sched();App.autoSave()};
    q('pp-status')?.addEventListener('change',function(){up(()=>{const v=this.value;it.status=(v==='blank'?'':v);it.statusDate=it.status?U.iso(new Date()):''});App.renderPanel(it)});
    q('pp-status-gear')?.addEventListener('click',()=>{const sm=document.getElementById('settings-modal');if(sm.classList.contains('hidden'))this.showSettings();setTimeout(()=>{const sc=document.getElementById('sect-status');if(sc)sc.scrollIntoView({behavior:'smooth',block:'start'})},100)});
    q('pp-owner').oninput=function(){it.owner=this.value;App.autoSave()};
    q('pp-notes').oninput=function(){it.notes=this.value;App.autoSave()};
    q('pp-sl').onchange=function(){up(()=>{it.swimlaneId=this.value;it.subSwimId=''});App.renderPanel(it)};
    q('pp-ssw')?.addEventListener('change',function(){up(()=>it.subSwimId=this.value)});
    q('pp-date')?.addEventListener('change',function(){if(App.proj.autoRange){App.snap();it.date=this.value;App.autoRange();App.sched();App.autoSave();if(!App.panelCollapsed)App._scrollItemClear(it)}else{up(()=>it.date=this.value)}});
    if(it.type==='task'){
      const recalc=(changed)=>{
        const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
        if(changed==='start'){
          if(it.endDate){
            if(U.days(it.startDate,it.endDate)<0){
              /* Start moved past end — keep duration, compute new end */
              it.endDate=App._calcEndDate(it);q('pp-end').value=it.endDate;
            }else{
              it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
            }
            q('pp-dur').value=it.duration}
        }else if(changed==='end'){
          if(it.startDate){
            if(U.days(it.startDate,it.endDate)<0){
              /* End moved before start — keep duration, compute new start */
              it.startDate=U.addDays(it.endDate,-(it.duration||1)+1);q('pp-start').value=it.startDate;
            }else{
              it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
            }
            q('pp-dur').value=it.duration}
        }else if(changed==='duration'){
          if(it.startDate){it.endDate=App._calcEndDate(it);q('pp-end').value=it.endDate}
        }
        const cdw=q('pp-caldays-wrap'),cdf=q('pp-caldays');
        if(cdw&&cdf&&it.startDate&&it.endDate){
          const isWork=(it.durMode||'cal')==='work'&&App.proj.scheduleAroundNonWorking;
          cdw.style.display=isWork?'':'none';
          if(isWork)cdf.value=(U.days(it.startDate,it.endDate)+1)+'d';
        }
        if(App.proj.autoRange)App.autoRange();App.sched();App.autoSave();
        if(!App.panelCollapsed)App._scrollItemClear(it)
      };
      q('pp-start').onchange=function(){up(()=>{it.startDate=this.value;recalc('start')})};
      q('pp-end').onchange=function(){up(()=>{it.endDate=this.value;recalc('end')})};
      q('pp-dur').onchange=function(){up(()=>{it.duration=+this.value;recalc('duration')})};
      q('pp-durmode')?.addEventListener('change',function(){up(()=>{
        it.durMode=this.value;it.endDate=App._calcEndDate(it);
        q('pp-end').value=it.endDate;
        const cdw=q('pp-caldays-wrap'),cdf=q('pp-caldays');
        if(cdw)cdw.style.display=(this.value==='work'&&it.startDate&&it.endDate)?'':'none';
        if(cdf)cdf.value=(U.days(it.startDate,it.endDate)+1)+'d';
      });App.renderPanel(it)});
      q('pp-prog')?.addEventListener('input',function(){it.progress=+this.value;q('pp-pv').textContent=this.value+'%';App.sched();App.autoSave()});
    }
    q('pp-row').onchange=function(){up(()=>it.subRow=+this.value)};
    q('pp-pin').onchange=function(){up(()=>it.pinned=this.checked)};
    q('pp-hidden').onchange=function(){up(()=>{it.hidden=this.checked;if(App.proj.hideMode)App._hintHidePill()})};
    q('pp-clr').oninput=function(){it.color=this.value;App.sched();App.autoSave()};
    q('pp-tc').oninput=function(){it.textColor=this.value;App.sched();App.autoSave()};
    q('pp-etc')?.addEventListener('input',function(){it.edgeTextColor=this.value;App.sched();App.autoSave()});
    q('pp-fs').onchange=function(){up(()=>it.fontSize=+this.value)};
    q('pp-df').onchange=function(){up(()=>it.dateFormat=this.value)};
    if(q('pp-sd'))q('pp-sd').onchange=function(){up(()=>it.showDate=this.checked)};
    q('pp-ssd')?.addEventListener('change',function(){up(()=>it.showStartDate=this.checked)});
    q('pp-sed')?.addEventListener('change',function(){up(()=>it.showEndDate=this.checked)});
    q('pp-sdur')?.addEventListener('change',function(){up(()=>it.showDuration=this.checked)});
    q('pp-sown')?.addEventListener('change',function(){up(()=>it.showOwner=this.checked)});
    q('pp-durfmt')?.addEventListener('change',function(){up(()=>it.durationFmt=this.value)});
    q('pp-add-d').onchange=function(){if(!this.value)return;
      if(App.hasCycle(it.id,this.value)){App.toast('Cannot link — circular dependency','error');this.value='';return}
      up(()=>{if(!it.deps)it.deps=[];it.deps.push({id:this.value,type:'FS',lag:0})});App.renderPanel(it)};
    const propBtn=q('pp-propagate');if(propBtn)propBtn.onclick=()=>{App.propagateFrom([it.id])};
    this.$.panel_body.querySelectorAll('.dep-chip-x').forEach(b=>{b.onclick=()=>{const di=+b.dataset.di;up(()=>it.deps.splice(di,1));App.renderPanel(it)}});
    this.$.panel_body.querySelectorAll('.dep-chip-type').forEach(s=>{s.onchange=function(){const di=+this.dataset.di;if(!it.deps[di])return;up(()=>it.deps[di].type=this.value);App.renderPanel(it)}});
    this.$.panel_body.querySelectorAll('.dep-chip-lag').forEach(inp=>{inp.onchange=function(){const di=+this.dataset.di;if(it.deps[di])up(()=>it.deps[di].lag=+this.value||0)}});
    this.$.panel_body.querySelectorAll('.pcr .cs:not([data-f])').forEach(s=>{s.onclick=()=>{up(()=>{it.color=s.dataset.c;q('pp-clr').value=s.dataset.c})}});
    this.$.panel_body.querySelectorAll('[data-f="tc"]').forEach(s=>{s.onclick=()=>{it.textColor=s.dataset.c;q('pp-tc').value=s.dataset.c;App.sched();App.autoSave()}});
    this.$.panel_body.querySelectorAll('[data-f="etc"]').forEach(s=>{s.onclick=()=>{it.edgeTextColor=s.dataset.c;q('pp-etc').value=s.dataset.c;App.sched();App.autoSave()}});
    this.$.panel_body.querySelectorAll('.ic-btn').forEach(b=>{b.onclick=()=>up(()=>it.iconType=b.dataset.ic)});
    this.$.panel_body.querySelectorAll('.lp-btn').forEach(b=>{if(!['top','bottom','left','right','center'].includes(b.dataset.v))return;b.onclick=()=>up(()=>it.labelPosition=b.dataset.v)});
    q('pp-asub')?.addEventListener('click',()=>this.showApplyModal('sub',it));
    q('pp-asl')?.addEventListener('click',()=>this.showApplyModal('swimlane',it));
    q('pp-aall')?.addEventListener('click',()=>this.showApplyModal('all',it));
    q('pp-vl-on')?.addEventListener('change',function(){if(!it.vLine)it.vLine={enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'};up(()=>it.vLine.enabled=this.checked);const o=document.getElementById('pp-vl-opts');if(o)o.style.display=this.checked?'':'none'});
    q('pp-vl-style')?.addEventListener('change',function(){up(()=>it.vLine.style=this.value)});
    q('pp-vl-clr')?.addEventListener('input',function(){it.vLine.color=this.value;App.sched();App.autoSave()});
    q('pp-vl-dir')?.addEventListener('change',function(){up(()=>it.vLine.direction=this.value)});
    q('pp-vl-ext')?.addEventListener('change',function(){up(()=>it.vLine.extent=this.value)});
    this.$.panel_body.querySelectorAll('[data-f="vl"]').forEach(s=>{s.onclick=()=>{it.vLine.color=s.dataset.c;const ci=document.getElementById('pp-vl-clr');if(ci)ci.value=s.dataset.c;App.sched();App.autoSave()}});
    /* URL Links bindings */
    this.$.panel_body.querySelectorAll('.link-nm').forEach(inp=>{inp.oninput=function(){const li=+this.dataset.li;if(it.links[li])it.links[li].name=this.value;App.autoSave()}});
    this.$.panel_body.querySelectorAll('.link-url').forEach(inp=>{
      inp.oninput=function(){const li=+this.dataset.li;if(it.links[li])it.links[li].url=this.value;App.autoSave()};
      inp.onblur=function(){const li=+this.dataset.li;if(!it.links[li])return;let u=this.value.trim();if(u&&!/^[a-z]+:\/\//i.test(u)){u='https://'+u;this.value=u;it.links[li].url=u}if(u&&!it.links[li].name){try{it.links[li].name=new URL(u).hostname.replace(/^www\./,'')}catch(e){}}const doFlash=!!u;App.autoSave();App.renderPanel(it);if(doFlash){setTimeout(()=>{const el=App.$.panel_body.querySelector(`.link-url[data-li="${li}"]`);if(el){el.style.borderColor='#2ea043';setTimeout(()=>{el.style.borderColor=''},800)}},30)}}
    });
    this.$.panel_body.querySelectorAll('.link-open').forEach(b=>{b.onclick=()=>{const lk=it.links[+b.dataset.li];if(lk?.url)window.open(lk.url,'_blank');else App.toast('No URL','error')}});
    this.$.panel_body.querySelectorAll('.link-copy').forEach(b=>{b.onclick=()=>{const lk=it.links[+b.dataset.li];if(lk?.url){navigator.clipboard.writeText(lk.url);App.toast('URL copied')}else App.toast('No URL','error')}});
    this.$.panel_body.querySelectorAll('.link-embed').forEach(b=>{b.onclick=()=>{const lk=it.links[+b.dataset.li];if(!lk?.url){App.toast('No URL','error');return}const name=lk.name||lk.url;const html=`<a href="${lk.url}">${U.esc(name)}</a>`;const text=`${name} (${lk.url})`;try{navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);App.toast('Embedded link copied')}catch(e){navigator.clipboard.writeText(text);App.toast('Link copied as text')}}});
    this.$.panel_body.querySelectorAll('.link-del').forEach(b=>{b.onclick=()=>{up(()=>it.links.splice(+b.dataset.li,1));App.renderPanel(it)}});
    this.$.panel_body.querySelectorAll('.link-mv').forEach(b=>{b.onclick=()=>{const li=+b.dataset.li,dir=+b.dataset.dir,ni=li+dir;if(ni<0||ni>=it.links.length)return;up(()=>{[it.links[li],it.links[ni]]=[it.links[ni],it.links[li]]});App.renderPanel(it)}});
    q('pp-link-add')?.addEventListener('click',()=>{up(()=>it.links.push({name:'',url:''}));App.renderPanel(it);setTimeout(()=>{const urls=App.$.panel_body.querySelectorAll('.link-url');if(urls.length)urls[urls.length-1].focus()},50)});
    q('pp-link-bulk')?.addEventListener('click',()=>App.showBulkLinks(it));
  },

  /* ===== TIMELINE METRICS =====
   * Returns {start, end, cols[], cw, tw, z}.
   * cw (column width) is always an integer to prevent subpixel rounding
   * drift between the header and body scroll containers. All downstream
   * consumers (dX, grid-cols, header cells, shading) inherit this. */
  met(){
    const p=this.proj,start=new Date(p.timelineStart+'T12:00:00'),end=new Date(p.timelineEnd+'T12:00:00'),z=(p.zoom||100)/100;
    const cols=[],cur=new Date(start);
    const _DL=['S','M','T','W','T','F','S'];
    if(p.timescale==='days'){while(cur<=end){const dow=cur.getDay(),iso=U.iso(cur),dn=cur.getDate(),mi=cur.getMonth(),df=p.dayLabelFormat||'letter';const lbl=df==='number'?String(dn):df==='hybrid'?String(dn):_DL[dow];cols.push({label:lbl,dayLetter:_DL[dow],dayNum:dn,start:iso,end:iso,year:cur.getFullYear(),month:mi,quarter:Math.floor(mi/3)+1,dow,isWeekend:dow===0||dow===6});cur.setDate(cur.getDate()+1)}}
    else if(p.timescale==='weeks'){cur.setDate(cur.getDate()-cur.getDay());while(cur<=end){const sat=new Date(+cur+6*864e5);cols.push({label:'W'+Math.ceil(((cur-new Date(cur.getFullYear(),0,1))/864e5+1)/7),start:U.iso(cur),end:U.iso(sat),year:sat.getFullYear(),month:sat.getMonth(),quarter:Math.floor(sat.getMonth()/3)+1});cur.setDate(cur.getDate()+7)}}
    else if(p.timescale==='months'){const _MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],_ML=['J','F','M','A','M','J','J','A','S','O','N','D'];cur.setDate(1);while(cur<=end){const mi=cur.getMonth();cols.push({label:(p.monthFormat==='letter'?_ML:_MN)[mi],start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),mi+1,0)),year:cur.getFullYear(),month:mi,quarter:Math.floor(mi/3)+1});cur.setMonth(cur.getMonth()+1)}}
    else if(p.timescale==='quarters'){cur.setMonth(Math.floor(cur.getMonth()/3)*3);cur.setDate(1);while(cur<=end){const q=Math.floor(cur.getMonth()/3)+1;cols.push({label:`Q${q}`,start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),cur.getMonth()+3,0)),year:cur.getFullYear(),quarter:q});cur.setMonth(cur.getMonth()+3)}}
    else{cur.setMonth(0);cur.setDate(1);while(cur<=end){cols.push({label:String(cur.getFullYear()),start:U.iso(cur),end:`${cur.getFullYear()}-12-31`,year:cur.getFullYear()});cur.setFullYear(cur.getFullYear()+1)}}
    const dayCw={compact:20,normal:28,wide:36}[p.dayColumnWidth||'normal']||28;
    const cwR=Math.round((p.timescale==='days'?dayCw:{weeks:60,months:100,quarters:200,years:400}[p.timescale]||100)*z);
    return{start,end,cols,cw:cwR,tw:cols.length*cwR,z}
  },
  /* dX: date → integer pixel position. Always returns a rounded integer
   * to match the integer cw from met() and prevent subpixel drift. */
  dX(ds,tl){if(!ds||!tl.cols.length)return null;const d=new Date(ds+'T12:00:00');
    for(let i=0;i<tl.cols.length;i++){const c=tl.cols[i],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
      if(d>=cs&&d<=ce){const cd=Math.max(1,U.days(c.start,c.end)+1);return Math.round(i*tl.cw+(U.days(c.start,ds)/cd)*tl.cw)}}
    const f=tl.cols[0],l=tl.cols[tl.cols.length-1];
    if(d<new Date(f.start+'T12:00:00')){const cd=Math.max(1,U.days(f.start,f.end)+1);return Math.round(-(U.days(ds,f.start)/cd)*tl.cw)}
    const cd=Math.max(1,U.days(l.start,l.end)+1);return Math.round((tl.cols.length-1)*tl.cw+(U.days(l.start,ds)/cd)*tl.cw)},
  /* dXEnd: pixel position at the END of a day (for task bar right edges) */
  dXEnd(ds,tl){return this.dX(U.addDays(ds,1),tl)},
  /* dXMid: integer pixel position at the CENTER of a day (for milestone icons) */
  dXMid(ds,tl){const a=this.dX(ds,tl),b=this.dX(U.addDays(ds,1),tl);return(a!=null&&b!=null)?Math.round((a+b)/2):a},
  xD(x,tl){if(!tl.cols.length)return U.iso(tl.start);const ci=Math.floor(x/tl.cw),frac=(x-ci*tl.cw)/tl.cw;
    const col=tl.cols[U.clamp(ci,0,tl.cols.length-1)];if(!col)return U.iso(tl.start);
    const cd=Math.max(1,U.days(col.start,col.end)+1);return U.addDays(col.start,Math.round(frac*cd))},

  buildHdrRows(tl){
    const layers=this.proj.headerLayers||2,ts=this.proj.timescale,rows=[];
    const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const ML=['J','F','M','A','M','J','J','A','S','O','N','D'];
    const mFmt=this.proj.monthFormat||'short',qFmt=this.proj.quarterFormat||'withYear';
    const monthLabel=m=>mFmt==='letter'?ML[m]:MN[m];
    /* Helper: build header cells by date boundaries (for weeks where columns straddle months/years) */
    const buildBoundaryRow=(getNext,getLabel)=>{
      const g=[];if(!tl.cols.length)return g;
      const tlS=new Date(tl.cols[0].start+'T12:00:00');const tlE=new Date(tl.cols[tl.cols.length-1].end+'T12:00:00');
      let cur=getNext(tlS,true),prevX=0;
      // label for the first segment
      let prevLabel=getLabel(tlS);
      while(cur<=tlE){
        const x=this.dX(U.iso(cur),tl);
        if(x!==null&&x>prevX&&x<tl.tw){
          g.push({label:prevLabel,width:x-prevX});
          prevLabel=getLabel(cur);prevX=x;
        }
        cur=getNext(cur,false);
      }
      if(prevX<tl.tw)g.push({label:prevLabel,width:tl.tw-prevX});
      return g;
    };
    if(layers>=3&&(ts==='days'||ts==='weeks'||ts==='months')){
      if(ts==='days'||ts==='weeks'){
        rows.push(buildBoundaryRow(
          (d)=>new Date(d.getFullYear()+1,0,1),
          d=>String(d.getFullYear())
        ));
      }else{const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
    }
    if(layers>=2){
      if(ts==='days'||ts==='weeks'){
        rows.push(buildBoundaryRow(
          (d)=>new Date(d.getFullYear(),d.getMonth()+1,1),
          d=>monthLabel(d.getMonth())
        ));
      }
      else if(ts==='months'){const g=[];let cq=null,cn=0;tl.cols.forEach(c=>{const k=c.year+'-Q'+c.quarter;if(k!==cq){if(cq!==null){const parts=cq.split('-');g.push({label:qFmt==='plain'?parts[1]:parts[1]+' '+parts[0],span:cn})}cq=k;cn=1}else cn++});if(cq!==null){const parts=cq.split('-');g.push({label:qFmt==='plain'?parts[1]:parts[1]+' '+parts[0],span:cn})}rows.push(g)}
      else if(ts==='quarters'){const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
    }
    rows.push(tl.cols.map((c,i)=>{const cell={label:c.label,span:1};if(c.dayLetter)cell.dayLetter=c.dayLetter;if(i>0){const prev=tl.cols[i-1];if((ts==='days'||ts==='weeks')&&c.month!==prev.month)cell.boundary=true;else if(ts==='months'&&c.quarter!==prev.quarter)cell.boundary=true;else if(ts==='quarters'&&c.year!==prev.year)cell.boundary=true}return cell}));return rows
  },

  renderTL(){
    const tl=this.met(),p=this.proj,th=this.getTheme(),rH=38;
    document.documentElement.style.setProperty('--sl-w',(p.labelWidth||160)+'px');
    this.$.tl_container.style.background=th.bg;
    if(this._panMode)this.$.tl_body.style.cursor='grab';else if(this._lassoMode)this.$.tl_body.style.cursor='crosshair';else if(this._fpMode)this.$.tl_body.style.cursor='copy';else this.$.tl_body.style.cursor='';
    const hc=th.hdr,hR=this.buildHdrRows(tl),rowH=22,totalHdrH=hR.length*rowH;
    this.$.tl_hdr_corner.style.height=totalHdrH+'px';this.$.tl_hdr_corner.style.background=hc;
    const hFs=p.headerFontSize||10.5;
    const isDaysHybrid=p.timescale==='days'&&(p.dayLabelFormat||'letter')==='hybrid';
    const _holDateSet=new Set();if(p.timescale==='days'&&p.holidays&&p.holidays.length){for(const hol of p.holidays){const hs=new Date(hol.start+'T12:00:00'),he=new Date(hol.end+'T12:00:00');const cur=new Date(hs);while(cur<=he){_holDateSet.add(U.iso(cur));cur.setDate(cur.getDate()+1)}}}
    let hh='';hR.forEach((row,ri)=>{hh+=`<div class="th-row" style="background:${hc};height:${rowH}px;width:${tl.tw}px">`;let cellLeft=0;row.forEach((cell,ci)=>{const w=cell.width!=null?cell.width:cell.span*tl.cw;const x=cell.width!=null?cellLeft:cellLeft;let xCls=cell.boundary?' th-cell-boundary':'';if(p.timescale==='days'&&ri===hR.length-1){const col=tl.cols[ci];if(col){if(_holDateSet.has(col.start))xCls+=' th-day-holiday';else if(col.isWeekend)xCls+=' th-day-weekend'}}if(isDaysHybrid&&ri===hR.length-1&&cell.dayLetter){hh+=`<div class="th-cell th-cell-hybrid${xCls}" style="left:${x}px;width:${w}px;font-size:${hFs}px">${cell.label}<span class="th-day-letter">${cell.dayLetter}</span></div>`}else{hh+=`<div class="th-cell${xCls}" style="left:${x}px;width:${w}px;font-size:${hFs}px">${cell.label}</div>`}cellLeft+=w});hh+=`</div>`});
    const _panPad=this.panelCollapsed?28:290;
    /* Add scrollbar width to header so max scrollLeft matches body.
     * Body has overflow:auto (vertical scrollbar), header has overflow:hidden (no scrollbar).
     * Without this, the header's max scrollLeft is ~15px less than the body's,
     * causing the body to keep scrolling while the header is clamped at the far right. */
    const _sbW=this.$.tl_body_scroll.offsetWidth-this.$.tl_body_scroll.clientWidth;
    this.$.tl_hdr.style.width=(tl.tw+_panPad+_sbW)+'px';this.$.tl_hdr.innerHTML=hh;
    this.$.tl_hdr_scroll.scrollLeft=this.$.tl_body_scroll.scrollLeft;
    let labelsH='',bodyH='';const violatedIds=this.getViolatedDepIds();
    const critIds=this._critPath?this.getCriticalPath():null;
    const vLines=[];
    const slYMap=new Map();const itemYMap=new Map();let slYAccum=0;
    for(const sl of p.swimlanes){
      const slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      const hasSubs=sl.subSwimlanes?.length>0;const subMeta=[];
      const isMinimized=sl.collapsed==='minimized';
      const isHidden=sl.collapsed==='collapsed';
      const isCollapsed=isMinimized||isHidden;
      if(hasSubs&&!isCollapsed){
        const groups=new Map();for(const ss of sl.subSwimlanes)groups.set(ss.id,[]);
        const unassigned=slItems.filter(i=>!i.subSwimId||!groups.has(i.subSwimId));
        if(sl.subSwimlanes.length>0&&unassigned.length){const fid=sl.subSwimlanes[0].id;unassigned.forEach(i=>i.subSwimId=fid);(groups.get(fid)||[]).push(...unassigned)}
        for(const it of slItems)if(it.subSwimId&&groups.has(it.subSwimId)&&!unassigned.includes(it))groups.get(it.subSwimId).push(it);
        for(const[ssId,items]of groups){const ss=sl.subSwimlanes.find(s=>s.id===ssId);const isSubMin=ss&&ss.collapsed==='minimized';if(isSubMin){subMeta.push({ssId,h:20,items:[],minimized:true})}else{const vis=items.filter(i=>!(p.hideMode&&i.hidden));const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);const contentH=Math.max(50,(mr+1)*rH+10);const ssH=ss&&ss.height>0?Math.max(ss.height,contentH):contentH;subMeta.push({ssId,h:ssH,items,minimized:false})}}
      }else if(!isCollapsed){const vis=slItems.filter(i=>!(p.hideMode&&i.hidden));const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);subMeta.push({ssId:'',h:Math.max(sl.height||120,(mr+1)*rH+10),items:slItems})}
      const totalH=isHidden?8:isMinimized?28:(subMeta.reduce((s,m)=>s+m.h,0)||80);
      slYMap.set(sl.id,{y:slYAccum,h:totalH});

      if(isHidden){
      labelsH+=`<div class="sl-lbl sl-hidden-indicator" data-sl-id="${sl.id}" style="background:${sl.color};height:8px" title="${U.esc(sl.name)} (click to expand)"></div>`;
      bodyH+=`<div class="sw-row sl-hidden-indicator" data-sl-id="${sl.id}" style="height:8px"></div>`;
      }else{
      const slMainSel=this._isSlSel(sl.id,'');
      const slSelCls=slMainSel&&!hasSubs?'sl-selected':'';
      labelsH+=`<div class="sl-lbl${isMinimized?' collapsed':''}${slSelCls?' '+slSelCls:''}" data-sl-id="${sl.id}" style="background:${sl.color};height:${totalH}px" data-tooltip="Double-click to edit names &amp; ordering<br>Right-click to bulk edit text size">`;
      if(isMinimized){labelsH+=`<button class="sl-collapse-btn sl-btn-expand" data-sl-id="${sl.id}" data-action="expand" data-tooltip="Expand">▶</button>`;labelsH+=`<button class="sl-collapse-btn sl-btn-hide" data-sl-id="${sl.id}" data-action="hide" data-tooltip="Hide — excluded from screenshots &amp; exports (click colored bar to restore)">👁</button>`}else{labelsH+=`<button class="sl-collapse-btn" data-sl-id="${sl.id}" data-tooltip="Minimize">▼</button>`}
      if(!isCollapsed&&hasSubs){const mainW=Math.min(60,(p.labelWidth||160)/2);const availH=totalH-12;const baseMfs=sl.fontSize||12;let mfs=baseMfs;const tw=this._mt(sl.name,baseMfs,'700');if(tw>availH&&availH>0){mfs=Math.max(8,Math.floor(baseMfs*availH/tw))}const mainSelCls=slMainSel?' sl-selected':'';labelsH+=`<div class="sl-lbl-main${mainSelCls}" style="width:${mainW}px;min-width:${mainW}px;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:${mfs}px">${U.esc(sl.name)}</div><div class="sl-lbl-subs">`;for(let smi=0;smi<subMeta.length;smi++){const{ssId,h,minimized}=subMeta[smi];const ss=sl.subSwimlanes.find(s=>s.id===ssId);const nm=ss?U.esc(ss.name):'';const icon=minimized?'&#9654;':'&#9660;';const ssSelCls=this._isSlSel(sl.id,ssId)?' sl-selected':'';const ssFs=ss&&ss.fontSize?ss.fontSize:9.5;labelsH+=`<div class="sl-sub-lbl${minimized?' ss-minimized':''}${ssSelCls}" data-ss-id="${ssId}" style="height:${h}px;font-size:${ssFs}px" data-tooltip="Double-click to edit names &amp; ordering<br>Right-click to bulk edit text size"><span class="ss-name">${nm}</span><button class="ss-collapse-btn" data-sl-id="${sl.id}" data-ss-id="${ssId}" data-tooltip="${minimized?'Expand':'Minimize'}">${icon}</button></div>`}labelsH+=`</div>`}
      else{const mainFs=sl.fontSize||12;labelsH+=`<div class="sl-lbl-main" style="flex:1;padding-left:20px;font-size:${mainFs}px">${U.esc(sl.name)}</div>`}
      labelsH+=`</div>`;

      bodyH+=`<div class="sw-row${isMinimized?' collapsed':''}" data-sl-id="${sl.id}" style="height:${totalH}px">`;
      for(let ci=0;ci<tl.cols.length;ci++)bodyH+=`<div class="grid-col" style="left:${ci*tl.cw}px;width:${tl.cw}px"></div>`;
      if(!isCollapsed){
        let yOff=0;
        for(let smi=0;smi<subMeta.length;smi++){
          const{ssId,h,items,minimized}=subMeta[smi];
          if(smi>0){if(!subMeta[smi-1].minimized&&!minimized){bodyH+=`<div class="sub-sw-div sub-rh" data-sl-id="${sl.id}" data-ss-id="${subMeta[smi-1].ssId}" style="top:${yOff-3}px"></div>`}else{bodyH+=`<div class="sub-sw-div" style="top:${yOff}px"></div>`}}
          for(const it of items){
            if(p.hideMode&&it.hidden)continue;
            const itY=slYAccum+yOff+6+(it.subRow||0)*rH;
            itemYMap.set(it.id,itY);
            bodyH+=this.rI(it,tl,rH,yOff,violatedIds,th,critIds);
            if(it.vLine?.enabled){const vx=it.type==='task'?this.dX(it.startDate,tl):this.dXMid(it.date,tl);if(vx!==null)vLines.push({x:vx,sl,it,slY:slYAccum,slH:totalH,subY:yOff,subH:h,iy:yOff+6+(it.subRow||0)*rH})}
          }
          yOff+=h
        }
      }
      bodyH+=`<div class="sl-rh" data-sl-id="${sl.id}"></div></div>`;
      }
      slYAccum+=totalH
    }
    // Time-to-Target labels
    if(p.tttEnabled&&p.tttMilestoneId){
      const refIt=this.gi(p.tttMilestoneId);
      if(refIt){
        const refDate=refIt.date||refIt.startDate;
        if(refDate){
          for(const it of p.items){
            if(p.hideMode&&it.hidden)continue;
            const iy=itemYMap.get(it.id);if(iy==null)continue;/* skip collapsed/not-rendered */
            const targetDate=it.type==='task'?it.endDate:it.date;
            if(!targetDate)continue;
            const ix=it.type==='task'?this.dXEnd(targetDate,tl):this.dXMid(targetDate,tl);if(ix===null)continue;
            const diffDays=U.days(refDate,targetDate);
            const diffWeeks=Math.round(diffDays/7);
            const label=it.id===p.tttMilestoneId?'0':String(diffWeeks);
            const clr=(it.id===p.tttMilestoneId||diffWeeks>=0)?'#2ea043':'#e5534b';
            bodyH+=`<div class="ttt-label" style="left:${ix+(it.type==='task'?0:8)+2}px;top:${iy+23}px;color:${clr}">${label}</div>`;
          }
        }
      }
    }
    // Float labels
    if(p.showFloat){
      this.calculateFloat();
      for(const it of p.items){
        if(p.hideMode&&it.hidden)continue;
        const iy=itemYMap.get(it.id);if(iy==null)continue;
        if(it._float==null)continue;
        // Skip items with no deps AND no successors (not part of dep network)
        const hasDeps=it.deps?.length>0;
        const hasSuccs=p.items.some(s=>s.deps?.some(d=>this.depId(d)===it.id));
        if(!hasDeps&&!hasSuccs)continue;
        const ix=it.type==='task'?this.dXEnd(it.endDate,tl):this.dXMid(it.date,tl);if(ix===null)continue;
        const f=it._float;
        const clr=f===0?'#e5534b':'#888';const fw=f===0?'700':'600';
        bodyH+=`<div style="position:absolute;left:${ix+(it.type==='task'?2:10)}px;top:${iy+23}px;font-size:8px;font-family:monospace;color:${clr};font-weight:${fw};pointer-events:none;z-index:4;white-space:nowrap">${f}d</div>`;
      }
    }
    // Weekend shading
    if(p.showWeekends&&!(p.weekendAutoHide&&p.timescale==='years')){
      const opacity=(p.weekendOpacity||8)/100;
      for(let ci=0;ci<tl.cols.length;ci++){
        const c=tl.cols[ci],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
        const numDays=Math.max(1,U.days(c.start,c.end)+1);
        const cur=new Date(cs);
        while(cur<=ce){
          if(cur.getDay()===0||cur.getDay()===6){
            const dayIdx=U.days(c.start,U.iso(cur));
            const dayX=Math.round(ci*tl.cw+(dayIdx/numDays)*tl.cw);
            const dayW=Math.round(ci*tl.cw+((dayIdx+1)/numDays)*tl.cw)-dayX;
            bodyH+=`<div class="wknd-shade" style="left:${dayX}px;width:${Math.max(1,dayW)}px;height:${slYAccum}px;opacity:${opacity}"></div>`;
          }
          cur.setDate(cur.getDate()+1);
        }
      }
    }
    /* Holiday shading */
    if(p.showHolidays&&p.holidays.length){
      const hClr=p.holidayColor||'#e5534b';
      const hOp=(p.holidayOpacity||12)/100;
      /* Convert hex color to rgb for rgba */
      const hr=parseInt(hClr.slice(1,3),16),hg=parseInt(hClr.slice(3,5),16),hb=parseInt(hClr.slice(5,7),16);
      for(const hol of p.holidays){
        const x1=this.dX(hol.start,tl),x2=this.dXEnd(hol.end,tl);
        if(x1===null||x2===null)continue;
        const hw=Math.max(1,x2-x1);
        if(x1+hw<0||x1>tl.tw)continue;
        bodyH+=`<div class="hol-shade" style="left:${x1}px;width:${hw}px;height:${slYAccum}px;background:rgba(${hr},${hg},${hb},${hOp});pointer-events:none;position:absolute;top:0;z-index:1"></div>`;
        if(p.holidayLabels){
          const DNAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MNAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const _hd=ds=>{const dt=new Date(ds+'T12:00:00');return DNAMES[dt.getDay()]+' '+MNAMES[dt.getMonth()]+' '+dt.getDate()};
          const rangeStr=hol.start===hol.end?_hd(hol.start):_hd(hol.start)+' – '+_hd(hol.end);
          const saFlag=hol.schedAround!==false?' ⏩':' ○';
          const labelText=U.esc(hol.name)+' · '+rangeStr+saFlag;
          bodyH+=`<div class="hol-label" style="left:${x1+1}px;top:2px;position:absolute;z-index:3;pointer-events:none;writing-mode:vertical-rl;text-orientation:mixed;font-size:9px;color:rgba(${hr},${hg},${hb},${Math.min(1,hOp*3+.25)});font-weight:600;letter-spacing:0.3px;max-height:${slYAccum-4}px;overflow:hidden;text-overflow:clip;white-space:nowrap;line-height:1" title="${U.esc(hol.name)} (${rangeStr})${hol.schedAround!==false?' — scheduling skips this day':' — scheduling allowed'}">${labelText}</div>`;
        }
      }
    }
    if(p.showToday){const tx=this.dX(U.iso(new Date()),tl);if(tx!==null&&tx>=0&&tx<=tl.tw)bodyH+=`<div class="today-marker" style="left:${tx}px;height:${slYAccum}px"><div class="today-marker-tri"></div><div class="today-marker-lbl">Today</div></div>`}
    // Vertical Lines
    for(const vl of vLines){const v=vl.it.vLine;if(!v)continue;
      const dash=v.style==='dashed'?'border-left:2px dashed '+v.color:'border-left:2px solid '+v.color;
      let top=0,bot=slYAccum;
      if(v.extent==='sub'){top=vl.slY+vl.subY;bot=vl.slY+vl.subY+vl.subH}
      else if(v.extent==='swim'){top=vl.slY;bot=vl.slY+vl.slH}
      if(v.direction==='down'){top=vl.slY+vl.iy}
      else if(v.direction==='up'){bot=vl.slY+vl.iy+16}
      bodyH+=`<div style="position:absolute;left:${vl.x}px;top:${top}px;height:${bot-top}px;${dash};pointer-events:none;z-index:2;opacity:0.6"></div>`}
    bodyH+=`<svg id="dep-svg" style="width:${tl.tw}px;height:100%"></svg>`;
    this.$.tl_sl_labels.innerHTML=labelsH;this.$.tl_body.innerHTML=bodyH;this._tlTW=tl.tw;this.$.tl_body.style.width=tl.tw+(this.panelCollapsed?28:290)+'px';
    if(this._pinFlashIds&&this._pinFlashIds.size)requestAnimationFrame(()=>{if(this._pinFlashIds)this._pinFlashIds.clear()});
    /* Empty-state hint for new users */
    if(p.items.length===0){const _hc=th.tlTx,_hc2=th.tlTx2;this.$.tl_body.innerHTML+=`<div class="tl-empty-hint" style="color:${_hc}"><div style="font-size:28px;margin-bottom:8px">📋</div><div>Click <strong>+ Task</strong> or <strong>+ Milestone</strong> in the toolbar to add your first item.</div><div style="margin-top:6px;font-size:11px;color:${_hc2}">Or choose a template from <strong style="color:${_hc}">New</strong> (📄).<br>Right-click the timeline to add at a specific date.</div></div>`}

    // Bind hidden indicators — click to expand
    this.$.tl_sl_labels.querySelectorAll('.sl-hidden-indicator').forEach(ind=>{ind.onclick=e=>{e.stopPropagation();const sl=this.gs(ind.dataset.slId);if(sl){this.snap();sl.collapsed='expanded';this.sched();this.autoSave()}}});
    // Bind sub-swimlane collapse buttons
    this.$.tl_sl_labels.querySelectorAll('.ss-collapse-btn').forEach(btn=>{btn.onclick=e=>{e.stopPropagation();const sl=this.gs(btn.dataset.slId);if(!sl)return;const ss=sl.subSwimlanes.find(s=>s.id===btn.dataset.ssId);if(!ss)return;this.snap();ss.collapsed=ss.collapsed==='minimized'?'expanded':'minimized';if(ss.collapsed==='expanded'&&sl.collapsed!=='expanded')sl.collapsed='expanded';if(sl.subSwimlanes.every(s=>s.collapsed==='minimized'))sl.collapsed='minimized';this.sched();this.autoSave()}});
    // Bind collapse buttons
    this.$.tl_sl_labels.querySelectorAll('.sl-collapse-btn').forEach(btn=>{btn.onclick=e=>{e.stopPropagation();const sl=this.gs(btn.dataset.slId);if(sl){this.snap();const action=btn.dataset.action;if(action==='expand')sl.collapsed='expanded';else if(action==='hide')sl.collapsed='collapsed';else sl.collapsed='minimized';this.sched();this.autoSave()}}});

    if(p.watermark){const wm=this.$.tl_watermark;wm.classList.remove('hidden');let wmText='Last Updated: '+U.fmt(p.wmDate||U.iso(new Date()),p.dateFormat);if(p.wmShowOwner&&p.owner)wmText+=' | '+p.owner;wm.textContent=wmText;const pos=p.wmPos||'bottom-center';const lw=p.labelWidth||160;
      /* Absolute positioning within tl-body-wrap — matches export SVG layout */
      let css='position:absolute;font-size:11px;color:#888;font-style:italic;padding:4px 8px;z-index:15;pointer-events:none;white-space:nowrap;';
      if(pos.includes('bottom')){css+='bottom:8px;top:auto;'}else{css+='top:8px;bottom:auto;'}
      if(pos.includes('left')){css+='left:'+(lw+8)+'px;right:auto;transform:none;'}
      else if(pos.includes('right')){css+='right:8px;left:auto;transform:none;'}
      else{css+=`left:calc(${lw}px + (100% - ${lw}px)/2);transform:translateX(-50%);right:auto;`}
      wm.style.cssText=css;
      const wmPad=pos.includes('bottom')?'42px':'';
      this.$.tl_body.style.paddingBottom=wmPad;
      this.$.tl_sl_labels.style.paddingBottom=wmPad;
    }else{this.$.tl_watermark.classList.add('hidden');this.$.tl_body.style.paddingBottom='';this.$.tl_sl_labels.style.paddingBottom=''}
    this.bindRH();if(p.showDeps)requestAnimationFrame(()=>this.rDeps(tl));
    /* Update expand/collapse all button states */
    const allExpanded=p.swimlanes.every(sl=>sl.collapsed==='expanded'&&(!sl.subSwimlanes||sl.subSwimlanes.every(ss=>ss.collapsed==='expanded')));
    const allCollapsed=p.swimlanes.every(sl=>sl.collapsed==='collapsed');
    const btnExp=document.getElementById('btn-expand-all');
    const btnCol=document.getElementById('btn-collapse-all');
    if(btnExp){btnExp.disabled=allExpanded;btnExp.style.opacity=allExpanded?'.4':'1'}
    if(btnCol){btnCol.disabled=allCollapsed;btnCol.style.opacity=allCollapsed?'.4':'1'}
  },

  rI(it,tl,rH,yOff,violatedIds,th,critIds){
    const p=this.proj,isT=it.type==='task',sel=this.sel.includes(it.id),fmt=it.dateFormat||p.dateFormat;
    const fs=it.fontSize||p.fontSize||11;
    const tc=it.textColor||th.tlTx,etc=it.edgeTextColor||th.tlTx2;
    /* Status badge setup */
    const sd=this._getStatusDef(it.status);
    const sdCfg=p.statusDisplay||{};
    const sdShow=sdCfg.show;
    const sdMode=sdCfg.mode||'emoji';
    const sdPos=sdCfg.badgePos||'inline';
    const sdColorOvr=sdCfg.colorOverride;
    const useInline=sd&&sdShow&&sdPos==='inline';
    /* Color override: status color if has status, blankColor if no status, else item color */
    let renderColor=it.color;
    if(sdShow&&sdColorOvr){if(sd)renderColor=sd.color;else if(sdCfg.blankColor)renderColor=sdCfg.blankColor}
    let x,w;if(isT){x=this.dX(it.startDate,tl);const x2=this.dXEnd(it.endDate,tl);w=Math.max(8,(x2||0)-(x||0))}else{x=this.dXMid(it.date,tl);w=16}
    if(x===null)return'';const y=yOff+6+(it.subRow||0)*rH,left=x-(isT?0:8);
    let cls='tl-item';if(sel)cls+=' selected';if(it.pinned)cls+=' item-pinned';if(violatedIds.has(it.id))cls+=' dep-error';if(it.hidden)cls+=' item-hidden';if(critIds&&critIds.has(it.id))cls+=' crit-path';if((this._fpStaged||this._fpMode)&&it.id===this._fpSourceId)cls+=' fp-source';
    let dateStr='';
    if(isT){const parts=[];const hasOwner=it.showOwner&&it.owner;const hasDur=it.showDuration;const durTxt=hasDur?this._fmtDurLabel(it):'';if(hasOwner&&hasDur)parts.push(it.owner+' ('+durTxt+')');else if(hasOwner)parts.push(it.owner);else if(hasDur)parts.push(durTxt);dateStr=parts.join(' ')||''}else if(it.showDate!==false){const hasOwner=it.showOwner&&it.owner;dateStr=U.fmt(it.date,fmt);if(hasOwner)dateStr=it.owner+(dateStr?' · '+dateStr:'')}
    let h=`<div class="${cls}" data-iid="${it.id}" style="left:${left}px;top:${y}px;${isT?'width:'+w+'px':''}">`;
    if(isT){
      h+=`<div class="tl-task-bar" style="background:${renderColor};width:${w}px">`;
      if(it.progress>0){h+=`<div class="tl-task-prog" style="width:${it.progress}%"></div>`;if(w>30)h+=`<div class="tl-task-pct">${it.progress}%</div>`}
      if(!p.locked){h+=`<div class="tl-task-rs tl-task-rs-l" data-iid="${it.id}" data-side="left"></div><div class="tl-task-rs tl-task-rs-r" data-iid="${it.id}" data-side="right"></div>`}
      h+=`</div>`;
      if(it.showStartDate)h+=`<div class="tl-edge-label tl-edge-left" style="color:${etc};font-size:${Math.max(8,fs-1)}px">${U.fmt(it.startDate,fmt)}</div>`;
      if(it.showEndDate)h+=`<div class="tl-edge-label tl-edge-right" style="color:${etc};font-size:${Math.max(8,fs-1)}px">${U.fmt(it.endDate,fmt)}</div>`;
    }else{const ic=ICONS.find(i=>i.id===it.iconType)||ICONS[0];h+=`<div class="tl-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="${renderColor}" stroke="${renderColor}" stroke-width="0.5"><path d="${ic.p}"/></svg></div>`}
    if(it.pinned){const pf=this._pinFlashIds&&this._pinFlashIds.has(it.id)?' pin-flash':'';h+=`<div class="tl-pin-badge${pf}">📌</div>`}
    /* URL link badge (editor only — NOT in export) */
    if(it.links&&it.links.length){const lkLeft=(sd&&sdShow&&sdPos==='bottom-left')?-16:-4;h+=`<div class="tl-link-badge" style="left:${lkLeft}px">🌐</div>`}
    /* Status badge (non-inline positions only) */
    if(sd&&sdShow&&sdPos!=='inline'){
      if(sdMode==='emoji'){h+=`<div class="tl-status-badge tl-status-${sdPos}">${sd.emoji}</div>`}
      else if(sdMode==='shortName'){h+=`<div class="tl-status-badge tl-status-sn tl-status-${sdPos}" style="background:${sd.color}">${U.esc(sd.shortName)}</div>`}
      else if(sdMode==='text'){h+=`<div class="tl-status-badge tl-status-text tl-status-${sdPos}" style="color:${sd.color}">${U.esc(sd.name)}</div>`}
    }
    const lp=it.labelPosition||'right';
    if(useInline){
      const inlineTxt=sdMode==='emoji'?sd.emoji:sdMode==='text'?U.esc(sd.name):`(${U.esc(sd.shortName)})`;
      h+=`<div class="tl-label tl-label-${lp}"><span class="tl-name" style="font-size:${fs}px"><span style="color:${sd.color};font-weight:700">${inlineTxt}</span> <span style="color:${tc}">${U.esc(it.name)}</span></span>`;
    }else{
      h+=`<div class="tl-label tl-label-${lp}"><span class="tl-name" style="color:${tc};font-size:${fs}px">${U.esc(it.name)}</span>`;
    }
    if(dateStr)h+=`<span class="tl-date" style="color:${tc};font-size:${Math.max(8,fs-1.5)}px">${dateStr}</span>`;
    h+=`</div></div>`;return h
  },

  rDeps(tl){const svg=document.getElementById('dep-svg');if(!svg)return;const body=this.$.tl_body,bR=body.getBoundingClientRect();const L=[];
    const filter=this.proj.depFilter||'all';
    for(const it of this.proj.items){if(!it.deps?.length)continue;
      for(const d of it.deps){const did=this.depId(d),lag=this.depLag(d),dtype=this.depType(d);
        const pred=this.gi(did);if(!pred)continue;
        /* F60: swimlane filter */
        if(filter==='swimlane'&&pred.swimlaneId!==it.swimlaneId)continue;
        const sE=body.querySelector(`[data-iid="${did}"]`),tE=body.querySelector(`[data-iid="${it.id}"]`);if(!sE||!tE)continue;
        const sr=sE.getBoundingClientRect(),tr=tE.getBoundingClientRect();
        // Attachment points based on link type
        let sx,sy,tx,ty;
        if(dtype==='SS'){sx=sr.left-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.left-bR.left;ty=tr.top+tr.height/2-bR.top}
        else if(dtype==='FF'){sx=sr.right-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.right-bR.left;ty=tr.top+tr.height/2-bR.top}
        else{sx=sr.right-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.left-bR.left;ty=tr.top+tr.height/2-bR.top}
        // Check if this link is violated
        let violated=false;const iStart=it.type==='task'?it.startDate:it.date;
        const idm=it.type==='task'?(it.durMode||'cal'):'work';
        if(pred){let req=null;
          if(dtype==='FS'){const pEnd=this._depEnd(pred);if(pEnd)req=this._addLagWorkingDays(pEnd,lag,idm)}
          else if(dtype==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)req=this._addLagWorkingDays(pStart,lag,idm)}
          else if(dtype==='FF'){const pEnd=this._depEnd(pred);const iEnd=this._depEnd(it);if(pEnd&&iEnd&&iEnd<this._addLagWorkingDays(pEnd,lag,idm))violated=true}
          if(req&&iStart&&iStart<req)violated=true}
        const clr=violated?'#d4726a':it.color;const dash=violated?' stroke-dasharray="4,3"':'';const opa=violated?'0.7':'0.4';
        const mx=(sx+tx)/2;
        L.push(`<path d="M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}" stroke="${clr}" stroke-opacity="${opa}" stroke-width="1.5" fill="none"${dash}/>`);
        const a=Math.atan2(ty-sy,tx-mx),s=6;
        L.push(`<polygon fill="${clr}" fill-opacity="${opa}" points="${tx},${ty} ${tx-s*Math.cos(a-.4)},${ty-s*Math.sin(a-.4)} ${tx-s*Math.cos(a+.4)},${ty-s*Math.sin(a+.4)}"/>`);
        // Lag label
        if(lag!==0){const lx=(sx+tx)/2,ly=(sy+ty)/2-6;
          const lagUnit=(this.proj.scheduleAroundNonWorking&&idm==='work')?'wd':'d';
          L.push(`<text x="${lx}" y="${ly}" fill="${clr}" font-size="8" font-family="monospace" text-anchor="middle" opacity="0.7">${lag>0?'+':''}${lag}${lagUnit}</text>`)}
    }}svg.innerHTML=L.join('')},

  onTlMD(e){
    if(e.button===1){e.preventDefault();this.startPan(e);return}
    if(e.button===0&&this._panMode){this.startPan(e);return}
    if(e.button!==0)return;
    this.closeAllDD();this.$.ctx_menu.classList.add('hidden');this.$.dt_ctx_menu.classList.add('hidden');this._hideHdrFmtPopover();this._hideExtPopover();
    if(e.altKey||this._lassoMode||(e.ctrlKey&&!e.target.closest('.tl-item'))){e.preventDefault();e.stopPropagation();this.startLasso(e);return}
    if(this._fpMode){const fpEl=e.target.closest('.tl-item');if(fpEl){e.preventDefault();e.stopPropagation();this.fpApply(fpEl.dataset.iid)}return}
    const rh=e.target.closest('.tl-task-rs');if(rh&&!this.proj.locked){this.startTR(e,rh);return}const iEl=e.target.closest('.tl-item');if(iEl){const id=iEl.dataset.iid;if(e.ctrlKey||e.metaKey){const idx=this.sel.indexOf(id);if(idx>=0)this.sel.splice(idx,1);else this.sel.push(id)}else if(!this.sel.includes(id))this.sel=[id];this._clearSlSel();
    if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();
    const it=this.gi(id);if(it&&!this.proj.locked){this.startDrag(e,it,iEl);return}if(it&&this.proj.locked){this._startLockedDragDetect(e)}this.sched();return}
    if(!e.target.closest('.sl-rh')&&!e.ctrlKey&&!e.metaKey){this.sel=[];this._clearSlSel();this.closePanel();this.sched()}},
  onTlCtx(e){const iEl=e.target.closest('.tl-item');if(iEl)this.showCtx(e,iEl.dataset.iid);else{e.preventDefault();this.sel=[];this.showCtx(e,null)}},

  /* Detect drag intent while locked — only show toast when user actually tries to move */
  _startLockedDragDetect(e){
    const sx=e.clientX,sy=e.clientY;
    const mv=ev=>{if(Math.abs(ev.clientX-sx)>3||Math.abs(ev.clientY-sy)>3){cleanup();if(!this._lockToastT||Date.now()-this._lockToastT>2000){this.toast('🔒 Locked — unlock to move items','info',1500);this._lockToastT=Date.now()}this._hintLockPill()}};
    const up=()=>{cleanup()};
    const cleanup=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
  },

  startDrag(e,it,el){const tl=this.met(),sx=e.clientX,sy=e.clientY;
    // Orphan cleanup: remove any leftover feedback from prior aborted drags
    document.querySelectorAll('.drag-delta-tip,.drag-date-strip').forEach(el=>el.remove());
    const dragItems=this.sel.map(id=>{const itemEl=this.$.tl_body.querySelector(`[data-iid="${id}"]`);const item=this.gi(id);if(!itemEl||!item)return null;return{id,el:itemEl,item,oL:parseFloat(itemEl.style.left),oT:parseFloat(itemEl.style.top)}}).filter(Boolean);
    if(!dragItems.length)return;
    const origDate=it.type==='task'?it.startDate:it.date;
    // Group key: order items by source swimlane/sub-swimlane position
    const _slOrder=new Map();
    this.proj.swimlanes.forEach((sl,si)=>{_slOrder.set(sl.id+':',si*1000);(sl.subSwimlanes||[]).forEach((ss,ssi)=>_slOrder.set(sl.id+':'+ss.id,si*1000+ssi))});
    dragItems.forEach(d=>{const key=d.item.swimlaneId+':'+(d.item.subSwimId||'');d._groupKey=_slOrder.get(key)??0});
    // Row compaction: group-aware — items from different sub-swimlanes stack by source order
    if(dragItems.length>1){
      const sorted=[...dragItems].sort((a,b)=>a._groupKey-b._groupKey||(a.item.subRow||0)-(b.item.subRow||0));
      let globalRow=0,prevKey=-1;const rowMap=new Map();let groupRows=[];
      for(const d of sorted){
        if(d._groupKey!==prevKey){
          if(groupRows.length){const uniq=[...new Set(groupRows.map(g=>g.subRow))].sort((a,b)=>a-b);const cMap=new Map();uniq.forEach((r,i)=>cMap.set(r,i));groupRows.forEach(g=>rowMap.set(g.id,globalRow+cMap.get(g.subRow)));globalRow+=uniq.length}
          groupRows=[];prevKey=d._groupKey}
        groupRows.push({id:d.id,subRow:d.item.subRow||0})}
      if(groupRows.length){const uniq=[...new Set(groupRows.map(g=>g.subRow))].sort((a,b)=>a-b);const cMap=new Map();uniq.forEach((r,i)=>cMap.set(r,i));groupRows.forEach(g=>rowMap.set(g.id,globalRow+cMap.get(g.subRow)))}
      const pRow=rowMap.get(it.id)||0;dragItems.forEach(d=>{d.rowOffset=(rowMap.get(d.id)||0)-pRow});
    }else{dragItems.forEach(d=>{d.rowOffset=0})}
    let dr=false,hlEl=null,hlRow=null,ghostEls=[],ghostRow=null,tipEl=null,stripEl=null,prevHdrStart=-1,prevHdrEnd=-1;
    // CSS-only expansion: snapshot-based — saves every affected element's original style,
    // then restores exactly on revert. No model mutation, no renderTL during drag.
    const _expandedMap=new Map(); // targetId → {delta, slId, isSub}
    const _snapshots=new Map();   // slId → {rowH, lblH, divTops:[], itemTops:Map<iid,top>, subLblHs:[]}
    let _activeExpandId='';       // which target is currently expanded (only one at a time)
    // Snapshot a swimlane's DOM state (once per swimlane, before first expansion)
    const _snapshotSl=(slId)=>{
      if(_snapshots.has(slId))return;
      const rowEl=this.$.tl_body.querySelector(`.sw-row[data-sl-id="${slId}"]`);
      const lblEl=this.$.tl_sl_labels.querySelector(`.sl-lbl[data-sl-id="${slId}"]`);
      const snap={rowH:rowEl?rowEl.offsetHeight:0,lblH:lblEl?lblEl.offsetHeight:0,divTops:[],itemTops:new Map(),subLblHs:[]};
      if(rowEl){
        rowEl.querySelectorAll('.sub-sw-div').forEach(d=>snap.divTops.push(parseFloat(d.style.top)||0));
        rowEl.querySelectorAll('.tl-item').forEach(el=>{if(el.dataset.iid)snap.itemTops.set(el.dataset.iid,parseFloat(el.style.top)||0)});
      }
      if(lblEl)lblEl.querySelectorAll('.sl-sub-lbl').forEach(s=>snap.subLblHs.push(s.offsetHeight));
      _snapshots.set(slId,snap);
    };
    // Apply a height delta to a sub-swimlane or swimlane via CSS only (no renderTL)
    const _cssExpand=(targetId,delta,slId,isSub,bandEnd)=>{
      if(delta<=0)return;
      _snapshotSl(slId);
      _expandedMap.set(targetId,{delta,slId,isSub});
      // Grow the .sw-row and matching .sl-lbl
      const rowEl=this.$.tl_body.querySelector(`.sw-row[data-sl-id="${slId}"]`);
      const lblEl=this.$.tl_sl_labels.querySelector(`.sl-lbl[data-sl-id="${slId}"]`);
      if(rowEl)rowEl.style.height=(rowEl.offsetHeight+delta)+'px';
      if(lblEl)lblEl.style.height=(lblEl.offsetHeight+delta)+'px';
      if(isSub&&rowEl){
        const sl=this.gs(slId);const subs=sl?.subSwimlanes||[];
        const targetIdx=subs.findIndex(s=>s.id===targetId);
        // Grow the matching sub-label in the label panel
        if(lblEl){const subLbls=[...lblEl.querySelectorAll('.sl-sub-lbl')];
          if(subLbls[targetIdx])subLbls[targetIdx].style.height=(subLbls[targetIdx].offsetHeight+delta)+'px'}
        // Shift dividers AFTER this sub-swimlane
        const allDivs=[...rowEl.querySelectorAll('.sub-sw-div')];
        for(let i=targetIdx;i<allDivs.length;i++){
          const d=allDivs[i];const ct=parseFloat(d.style.top)||0;d.style.top=(ct+delta)+'px'}
        // Shift items BELOW the expanded band using geometry (not model subSwimId)
        // bandEnd = the y-position where the target band ends (before expansion)
        // Any item whose top >= bandEnd must be a later sub-swimlane's item
        const dragIids=new Set(dragItems.map(d=>d.id));
        rowEl.querySelectorAll('.tl-item').forEach(el=>{
          if(dragIids.has(el.dataset.iid))return; // skip items being dragged
          const ct=parseFloat(el.style.top)||0;
          if(ct>=bandEnd){el.style.top=(ct+delta)+'px'}});
      }
    };
    // Revert ALL CSS expansions by restoring from snapshots — guaranteed exact reversal
    const _dragIids=new Set(dragItems.map(d=>d.id)); // items being dragged — never restore their position
    const _cssRevertAll=()=>{
      if(_snapshots.size===0){_expandedMap.clear();return}
      _snapshots.forEach((snap,slId)=>{
        const rowEl=this.$.tl_body.querySelector(`.sw-row[data-sl-id="${slId}"]`);
        const lblEl=this.$.tl_sl_labels.querySelector(`.sl-lbl[data-sl-id="${slId}"]`);
        if(rowEl)rowEl.style.height=snap.rowH+'px';
        if(lblEl)lblEl.style.height=snap.lblH+'px';
        // Restore divider positions
        if(rowEl){const allDivs=[...rowEl.querySelectorAll('.sub-sw-div')];
          for(let i=0;i<allDivs.length&&i<snap.divTops.length;i++)allDivs[i].style.top=snap.divTops[i]+'px'}
        // Restore item positions (skip dragged items — their position is controlled by mousemove)
        if(rowEl)rowEl.querySelectorAll('.tl-item').forEach(el=>{
          if(_dragIids.has(el.dataset.iid))return;
          if(el.dataset.iid&&snap.itemTops.has(el.dataset.iid))el.style.top=snap.itemTops.get(el.dataset.iid)+'px'});
        // Restore sub-label heights
        if(lblEl){const subLbls=[...lblEl.querySelectorAll('.sl-sub-lbl')];
          for(let i=0;i<subLbls.length&&i<snap.subLblHs.length;i++)subLbls[i].style.height=snap.subLblHs[i]+'px'}
      });
      _snapshots.clear();_expandedMap.clear();
    };
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!dr&&(Math.abs(dx)>3||Math.abs(dy)>3)){dr=true;dragItems.forEach(d=>d.el.classList.add('dragging'));this.snap()}if(dr){const shiftHeld=ev.shiftKey;dragItems.forEach(d=>{if(!this.proj.lockH&&!shiftHeld)d.el.style.left=(d.oL+dx)+'px';if(!this.proj.lockV)d.el.style.top=(d.oT+dy)+'px';d.el.style.cursor=shiftHeld?'ns-resize':'grabbing'});
      if(!this.proj.lockV){let found=null;document.querySelectorAll('.sw-row').forEach(r=>{const rect=r.getBoundingClientRect();if(ev.clientY>=rect.top&&ev.clientY<=rect.bottom&&r.dataset.slId&&!r.classList.contains('sl-hidden-indicator'))found=r});
        if(found){const sl=this.gs(found.dataset.slId);let rect=found.getBoundingClientRect();const yInSw=ev.clientY-rect.top;
          const subs=sl&&sl.collapsed==='expanded'?sl.subSwimlanes||[]:[];
          let bandTop=0,bandH=rect.height;
          const bands=[];
          const _computeBands=()=>{bandTop=0;bandH=rect.height;bands.length=0;
            if(subs.length>0){const dv=[];found.querySelectorAll('.sub-sw-div').forEach(d=>{const t=parseFloat(d.style.top)||0;dv.push(d.classList.contains('sub-rh')?t+3:t)});
              let pY=0;for(let si=0;si<subs.length;si++){const yE=si<dv.length?dv[si]:rect.height;bands.push({ssId:subs[si].id,yStart:pY,yEnd:yE});pY=yE}
              if(bands.length&&pY<rect.height)bands[bands.length-1].yEnd=rect.height;
              for(const b of bands){if(yInSw>=b.yStart&&yInSw<b.yEnd){bandTop=b.yStart;bandH=b.yEnd-b.yStart;break}}}};
          _computeBands();
          // --- CSS-only expansion check (no renderTL, no DOM destruction) ---
          const primaryD=dragItems.find(d=>d.id===it.id);
          if(primaryD){const isT=it.type==='task',curL=parseFloat(primaryD.el.style.left);
            const nx=curL+(isT?0:8),snapDate=this.xD(nx,tl);
            const yInBand=yInSw-bandTop,snapRow=Math.max(0,Math.floor((yInBand-6)/38));
            const maxGR=snapRow+Math.max(0,...dragItems.map(d=>d.rowOffset));
            const neededH=(maxGR+1)*38+10;
            let currentTargetId='';
            if(subs.length>0){for(const b of bands){if(yInSw>=b.yStart&&yInSw<b.yEnd){currentTargetId=b.ssId;break}}}else{currentTargetId=found.dataset.slId}
            // If cursor moved to a different band/swimlane, revert previous expansion first
            if(_activeExpandId&&_activeExpandId!==currentTargetId){
              _cssRevertAll();_activeExpandId='';
              // Re-read layout after revert
              rect=found.getBoundingClientRect();
              _computeBands();
              // Recompute bandH after revert since band sizes changed back
              const yInBand2=yInSw-bandTop;
              // bandH is already recomputed by _computeBands
            }
            if(neededH>bandH&&!_expandedMap.has(currentTargetId)){
              const delta=neededH-bandH;
              const bandEnd=bandTop+bandH; // bottom of current band before expansion
              _cssExpand(currentTargetId,delta,found.dataset.slId,subs.length>0,bandEnd);
              _activeExpandId=currentTargetId;
              // Re-read rect and bands after CSS resize
              rect=found.getBoundingClientRect();
              _computeBands()}
            else if(neededH<=bandH&&_activeExpandId===currentTargetId){
              // Band already has enough room (e.g. moved to higher row) — revert expansion
              // Actually keep it: once expanded, stay expanded while in that band
            }
            // --- Create/update highlight band ---
            if(hlRow!==found||!hlEl){if(hlEl)hlEl.remove();hlEl=document.createElement('div');hlEl.className='drag-band-hl';found.appendChild(hlEl);hlRow=found}
            hlEl.style.top=bandTop+'px';hlEl.style.height=bandH+'px';
            // --- Create/position ghosts ---
            const MAX_GHOSTS=15,showAll=dragItems.length<=MAX_GHOSTS;
            const ghostItems=showAll?dragItems:[primaryD];
            const _foundSlId=found?.dataset?.slId||'';if(ghostRow!==_foundSlId||ghostEls.length!==ghostItems.length){ghostEls.forEach(g=>g.el.remove());ghostEls=[];ghostItems.forEach(d=>{const g=document.createElement('div');g.className=d.id===it.id?'drag-ghost drag-ghost-primary':'drag-ghost drag-ghost-secondary';found.appendChild(g);ghostEls.push({el:g,d})});ghostRow=_foundSlId}
            ghostEls.forEach(({el:g,d})=>{const dIt=d.item,gIsT=dIt.type==='task';
              const dCurL=parseFloat(d.el.style.left);
              const dSnap=dCurL===d.oL?(gIsT?dIt.startDate:dIt.date):(()=>{const dNx=dCurL+(gIsT?0:8);return this.xD(dNx,tl)})();
              const gX=gIsT?this.dX(dSnap,tl):this.dXMid(dSnap,tl)-8;
              const gEnd=gIsT?this._calcEndDate({startDate:dSnap,duration:dIt.duration,durMode:dIt.durMode}):null;
              const gW=gIsT?Math.max(8,(this.dXEnd(gEnd,tl)||0)-(this.dX(dSnap,tl)||0)):16;
              const gRow=snapRow+d.rowOffset,gY=bandTop+6+gRow*38;
              g.style.left=gX+'px';g.style.top=gY+'px';g.style.width=gW+'px';g.style.height=(gIsT?'22':'16')+'px'});
          }}
        else if(hlEl){hlEl.remove();hlEl=null;hlRow=null;ghostEls.forEach(g=>g.el.remove());ghostEls=[];ghostRow=null;
          _cssRevertAll();_activeExpandId='';}}
      /* --- Drag date feedback (works regardless of lockV) --- */
      {const primaryD=dragItems.find(d=>d.id===it.id);
        if(primaryD){const isT=it.type==='task',curL=parseFloat(primaryD.el.style.left);
          const snapDate=curL===primaryD.oL?origDate:(()=>{const nx=curL+(isT?0:8);return this.xD(nx,tl)})();
          const newEnd=isT?this._calcEndDate({startDate:snapDate,duration:it.duration,durMode:it.durMode}):null;
          const delta=U.days(origDate,snapDate);
          // Delta badge at cursor
          if(!tipEl){tipEl=document.createElement('div');tipEl.className='drag-delta-tip';document.body.appendChild(tipEl)}
          tipEl.textContent=this._fmtDragDelta(delta);
          tipEl.style.left=(ev.clientX+16)+'px';tipEl.style.top=(ev.clientY-28)+'px';
          // Bottom status strip
          if(!stripEl){stripEl=document.createElement('div');stripEl.className='drag-date-strip';document.body.appendChild(stripEl)}
          const _nSuffix=dragItems.length>1?' ('+dragItems.length+' items)':'';
          if(isT){stripEl.textContent='Start: '+U.fmt(origDate,'MMM D')+' → '+U.fmt(snapDate,'MMM D')+'    End: '+U.fmt(it.endDate,'MMM D')+' → '+U.fmt(newEnd,'MMM D')+_nSuffix}
          else{stripEl.textContent='Date: '+U.fmt(origDate,'MMM D')+' → '+U.fmt(snapDate,'MMM D')+_nSuffix}
          // Header column highlight
          if(!shiftHeld){
            let sc=-1,ec=-1;
            for(let ci=0;ci<tl.cols.length;ci++){if(sc<0&&snapDate>=tl.cols[ci].start&&snapDate<=tl.cols[ci].end)sc=ci;if(isT&&newEnd&&newEnd>=tl.cols[ci].start&&newEnd<=tl.cols[ci].end)ec=ci}
            if(ec<0)ec=sc;
            if(sc!==prevHdrStart||ec!==prevHdrEnd){
              const hdrRows=this.$.tl_hdr.querySelectorAll('.th-row');const lastRow=hdrRows[hdrRows.length-1];
              if(lastRow){const cells=lastRow.children;for(let ci=0;ci<cells.length;ci++)cells[ci].classList.toggle('drag-target',ci>=sc&&ci<=ec)}
              prevHdrStart=sc;prevHdrEnd=ec}
          }
        }
      }
    }};
    const _cleanFeedback=()=>{if(tipEl){tipEl.remove();tipEl=null}if(stripEl){stripEl.remove();stripEl=null}const hdrRows=this.$.tl_hdr.querySelectorAll('.th-row');const lastRow=hdrRows[hdrRows.length-1];if(lastRow){for(const c of lastRow.children)c.classList.remove('drag-target')}prevHdrStart=prevHdrEnd=-1};
    const up=ev=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);document.removeEventListener('keydown',esc);dragItems.forEach(d=>d.el.classList.remove('dragging'));if(hlEl){hlEl.remove();hlEl=null;hlRow=null}ghostEls.forEach(g=>g.el.remove());ghostEls=[];ghostRow=null;_cleanFeedback();if(!dr){this.sched();return}if(dr){
      dragItems.forEach(d=>{
        const nL=parseFloat(d.el.style.left);
        // B52: skip date update if item didn't move horizontally (shift+drag / lockH)
        // — the dX()→xD() round-trip is lossy (Math.round in xD can shift by ±1 at boundary fractions)
        if(nL===d.oL)return;
        const nx=nL+(d.item.type==='milestone'?8:0),nd=this.xD(nx,tl);
        if(!this.proj.lockH){if(d.item.type==='milestone')d.item.date=nd;else{d.item.startDate=nd;d.item.endDate=this._calcEndDate(d.item)}}
      });
      const origSlId=it.swimlaneId;
      if(!this.proj.lockV){
        let targetSlId=null,targetRect=null,targetRow=null;
        document.querySelectorAll('.sw-row').forEach(slEl=>{const r=slEl.getBoundingClientRect();if(ev.clientY>=r.top&&ev.clientY<=r.bottom&&slEl.dataset.slId&&!slEl.classList.contains('sl-hidden-indicator')){targetSlId=slEl.dataset.slId;targetRect=r;targetRow=slEl}});
        if(targetSlId){
          dragItems.forEach(dd=>dd.item.swimlaneId=targetSlId);
          const sl=this.gs(targetSlId);
          const yInSw=ev.clientY-targetRect.top;
          const rH=38;
          const subs=sl&&sl.collapsed==='expanded'?sl.subSwimlanes||[]:[];
          if(subs.length>0){
            const dividers=[];
            targetRow.querySelectorAll('.sub-sw-div').forEach(d=>{const t=parseFloat(d.style.top)||0;dividers.push(d.classList.contains('sub-rh')?t+3:t)});
            const bands=[];let prevY=0;
            for(let si=0;si<subs.length;si++){const yEnd=si<dividers.length?dividers[si]:targetRect.height;bands.push({ssId:subs[si].id,yStart:prevY,yEnd});prevY=yEnd}
            if(bands.length&&prevY<targetRect.height)bands[bands.length-1].yEnd=targetRect.height;
            let dropSubSw='',dropSubRow=0;
            for(const band of bands){if(yInSw>=band.yStart&&yInSw<band.yEnd){dropSubSw=band.ssId;dropSubRow=Math.max(0,Math.floor((yInSw-band.yStart-6)/rH));break}}
            if(!dropSubSw&&bands.length){dropSubSw=bands[0].ssId;dropSubRow=0}
            // Use compacted row offsets for multi-drag bundling
            dragItems.forEach(dd=>{dd.item.subSwimId=dropSubSw;dd.item.subRow=Math.max(0,dropSubRow+dd.rowOffset)});
          }else{
            const baseRow=Math.max(0,Math.floor((yInSw-6)/rH));
            dragItems.forEach(dd=>{dd.item.subSwimId='';dd.item.subRow=Math.max(0,baseRow+dd.rowOffset)});
          }
          // Toast for multi-item cross-swimlane drop
          if(dragItems.length>1&&targetSlId!==origSlId){const tSl=this.gs(targetSlId);this.toast('Moved '+dragItems.length+' items to '+(tSl?.name||'swimlane'))}
        }
      }
      // Revert all CSS-only expansions on drop — sched()+renderTL() will rebuild at correct heights
      _cssRevertAll();_activeExpandId='';
      if(this.proj.autoRange)this.autoRange();
      if(this.proj.schedulingMode==='scheduled'){
        const pinnedIds=[],snapped=[];
        dragItems.forEach(d=>{
          if(!d.item.deps?.length||d.item.pinned)return;
          const earliest=this._computeEarliestStart(d.item);
          if(!earliest)return;
          const curStart=d.item.type==='task'?d.item.startDate:d.item.date;
          if(curStart<earliest){
            if(d.item.type==='task'){d.item.startDate=earliest;d.item.endDate=this._calcEndDate(d.item)}
            else d.item.date=earliest;
            snapped.push(d.item.id);
          }else if(curStart>earliest){
            d.item.pinned=true;
            pinnedIds.push(d.item.id);
            if(!this._pinFlashIds)this._pinFlashIds=new Set();
            this._pinFlashIds.add(d.item.id);
          }
        });
        if(snapped.length)this.toast('\u2190 Snapped back \u2014 can\u2019t start before dependencies allow','info');
        if(pinnedIds.length){
          const undoDepth=this.undoStack.length;const pIds=[...pinnedIds];
          const msg=pIds.length===1?'\ud83d\udccc Pinned \u2014 scheduling will skip this item':'\ud83d\udccc Pinned '+pIds.length+' items \u2014 scheduling will skip them';
          this.toast(msg,'warn',5000,'Undo',()=>{
            if(this.undoStack.length===undoDepth){this.undo()}
            else{this.snap();let n=0;pIds.forEach(id=>{const it=this.gi(id);if(it&&it.pinned){it.pinned=false;n++}});if(n){this.sched();this.autoSave();this.refreshPanel();this.toast('Unpinned '+n+' item'+(n>1?'s':''),'info')}}
          });
        }
      }
      this.sched();this.autoSave();
      if(this.sel.length===1){const selIt=this.gi(this.sel[0]);if(selIt)this.openPanel(selIt)}else if(this.sel.length>1)this.openBulkPanel()}};
    const esc=ev2=>{if(ev2.key==='Escape'&&dr){ev2.preventDefault();
      dragItems.forEach(d=>{d.el.style.left=d.oL+'px';d.el.style.top=d.oT+'px';d.el.classList.remove('dragging')});
      if(hlEl){hlEl.remove();hlEl=null;hlRow=null}ghostEls.forEach(g=>g.el.remove());ghostEls=[];ghostRow=null;_cleanFeedback();
      // Revert all CSS-only expansions on escape
      _cssRevertAll();_activeExpandId='';
      document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);document.removeEventListener('keydown',esc);
      if(this.undoStack.length)this.undoStack.pop();
      if(dragItems.length>1)this.toast('Drag cancelled – '+dragItems.length+' items restored');
      this.sched();dr=false}};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);document.addEventListener('keydown',esc)},

  startTR(e,rh){e.stopPropagation();e.preventDefault();const iid=rh.dataset.iid,side=rh.dataset.side,it=this.gi(iid);if(!it)return;
    const tl=this.met(),sx=e.clientX,oS=it.startDate,oE=it.endDate;const isWork=this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';this.snap();const mv=ev=>{const dx=ev.clientX-sx,dayD=Math.round((dx/tl.tw)*U.days(tl.start,tl.end));if(side==='left'){it.startDate=U.addDays(oS,dayD);if(U.days(it.startDate,it.endDate)<0)it.startDate=it.endDate}else{it.endDate=U.addDays(oE,dayD);if(U.days(it.startDate,it.endDate)<0)it.endDate=it.startDate}it.duration=isWork?this._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);this.sched(true,false);this.refreshPanel()};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave();this.refreshPanel()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)},

  bindRH(){document.querySelectorAll('.sl-rh').forEach(h=>{h.onmousedown=e=>{e.preventDefault();const sl=this.gs(h.dataset.slId);if(!sl)return;const slEl=h.closest('.sw-row'),lblEl=this.$.tl_sl_labels.querySelector(`[data-sl-id="${sl.id}"]`);const sY=e.clientY,sH=slEl.offsetHeight;const hasSubs=sl.subSwimlanes?.length>0&&sl.collapsed==='expanded';const lastSs=hasSubs?sl.subSwimlanes[sl.subSwimlanes.length-1]:null;const startLastH=lastSs?(lastSs.height||50):0;const mv=ev=>{const nh=Math.max(50,sH+ev.clientY-sY);if(hasSubs&&lastSs){lastSs.height=Math.max(50,startLastH+ev.clientY-sY)}else{sl.height=nh}slEl.style.height=nh+'px';if(lblEl)lblEl.style.height=nh+'px';this.sched(true,false)};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);this.sched();this.autoSave()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}});document.querySelectorAll('.sub-rh').forEach(h=>{h.onmousedown=e=>{e.preventDefault();e.stopPropagation();const sl=this.gs(h.dataset.slId);if(!sl)return;const ss=sl.subSwimlanes.find(s=>s.id===h.dataset.ssId);if(!ss)return;const sY=e.clientY,startH=ss.height||50;const mv=ev=>{ss.height=Math.max(50,startH+ev.clientY-sY);this.sched(true,false)};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);this.sched();this.autoSave()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}})},

  async copyScreenshot(viewportOnly=false){try{const typeLabel=viewportOnly?'Viewport':'Full timeline';this.toast('Generating '+typeLabel+'…');const svg=this.buildExportSVG(viewportOnly);const img=new Image();const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);let dpr=Math.max(2,window.devicePixelRatio||2);img.onload=async()=>{if(!img.naturalWidth||!img.naturalHeight){this.toast('Image failed to render','error');URL.revokeObjectURL(url);return}const maxDim=16384;if(img.naturalWidth*dpr>maxDim||img.naturalHeight*dpr>maxDim)dpr=Math.floor(maxDim/Math.max(img.naturalWidth,img.naturalHeight))||1;const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*dpr);c.height=Math.round(img.naturalHeight*dpr);const ctx=c.getContext('2d');if(!ctx){this.toast('Canvas too large to render','error');URL.revokeObjectURL(url);return}ctx.scale(dpr,dpr);ctx.drawImage(img,0,0);try{const b=await new Promise(r=>c.toBlob(r,'image/png'));if(!b){this.toast('Render failed','error');URL.revokeObjectURL(url);return}await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);this.toast(typeLabel+' copied to clipboard!')}catch(err){this.toast('Copy failed','error')}URL.revokeObjectURL(url)};img.onerror=()=>{this.toast('Failed','error');URL.revokeObjectURL(url)};img.src=url}catch(err){this.toast('Not supported','error')}},

  buildExportSVG(viewportOnly=false){
    const tl=this.met(),p=this.proj,th=this.getTheme(),rH=38;
    const hR=this.buildHdrRows(tl),rowHH=22,totalHdrH=hR.length*rowHH;
    const gfs=p.fontSize||11;
    /* Build swimlane metrics — include ALL items, we handle hidden rendering per-item */
    const sm=[];for(const sl of p.swimlanes){
      const slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      const visItems=slItems.filter(i=>!(p.hideMode&&i.hidden));
      const isMinimized=sl.collapsed==='minimized';const isHidden=sl.collapsed==='collapsed';
      const isCollapsed=isMinimized||isHidden;const hasSubs=sl.subSwimlanes?.length>0;
      const subMeta=[];
      if(!isCollapsed&&hasSubs){
        const groups=new Map();for(const ss of sl.subSwimlanes)groups.set(ss.id,[]);
        for(const it of visItems){if(it.subSwimId&&groups.has(it.subSwimId))groups.get(it.subSwimId).push(it);else{const fid=sl.subSwimlanes[0]?.id;if(fid)(groups.get(fid)||[]).push(it)}}
        for(const[ssId,items]of groups){const ss=sl.subSwimlanes.find(s=>s.id===ssId);const isSubMin=ss&&ss.collapsed==='minimized';if(isSubMin){subMeta.push({ssId,h:20,items:[],minimized:true})}else{const mr=items.reduce((m,i)=>Math.max(m,i.subRow||0),0);const contentH=Math.max(50,(mr+1)*rH+10);const ssH=ss&&ss.height>0?Math.max(ss.height,contentH):contentH;subMeta.push({ssId,h:ssH,items:slItems.filter(i=>i.subSwimId===ssId||(!i.subSwimId&&ssId===sl.subSwimlanes[0]?.id)),minimized:false})}}
      }else if(!isCollapsed){const mr=visItems.reduce((m,i)=>Math.max(m,i.subRow||0),0);subMeta.push({ssId:'',h:Math.max(sl.height||120,(mr+1)*rH+10),items:slItems})}
      const h=isHidden?0:isMinimized?28:(subMeta.reduce((s,m)=>s+m.h,0)||80);
      sm.push({sl,items:isCollapsed?[]:slItems,h,subMeta,collapsed:isCollapsed,hidden:isHidden})
    }
    const totalBodyH=sm.reduce((s,m)=>s+m.h,0);
    const lw=this.proj.labelWidth||160;
    /* Critical path set (if toggled on) */
    const critIds=this._critPath?this.getCriticalPath():null;
    /* For full export: fit to actual item extent with padding */
    let vpX=0,vpW=tl.tw,vpY=0,vpH=totalBodyH;
    if(viewportOnly){
      const bs=this.$.tl_body_scroll;vpX=bs.scrollLeft;vpW=bs.clientWidth;vpY=bs.scrollTop;vpH=Math.min(bs.clientHeight,totalBodyH-bs.scrollTop);
    }else{
      /* Fit-to-content: use shared _itemExtents with canvas text measurement */
      const collapsedSlIds=new Set(p.swimlanes.filter(sl=>sl.collapsed!=='expanded').map(sl=>sl.id));
      const collapsedSubIds=new Set();
      p.swimlanes.forEach(sl=>{if(sl.subSwimlanes)sl.subSwimlanes.forEach(ss=>{if(ss.collapsed==='minimized')collapsedSubIds.add(ss.id)})});
      const fitItems=p.items.filter(i=>!(p.hideMode&&i.hidden)&&!collapsedSlIds.has(i.swimlaneId)&&(!i.subSwimId||!collapsedSubIds.has(i.subSwimId)));
      const ext=this._itemExtents(fitItems,tl);
      if(ext){
        const fitPad=20;/* small breathing room on each side */
        vpX=Math.max(0,ext.minPx-fitPad);
        vpW=ext.maxPx-vpX+fitPad;
      }
    }
    const wmPos=p.wmPos||'bottom-center';const wmH=p.watermark&&wmPos.includes('bottom')?24:0;
    const W=lw+vpW,H=totalHdrH+vpH+wmH;
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>text{font-family:'DM Sans',sans-serif}</style><rect width="${W}" height="${H}" fill="${th.bg}"/>`;
    /* Weekend shading — match DOM: CSS base rgba(0,0,0,0.15) * inline opacity */
    if(p.showWeekends&&!(p.weekendAutoHide&&p.timescale==='years')){
      const wkOp=0.15*((p.weekendOpacity||8)/100);
      for(let ci=0;ci<tl.cols.length;ci++){
        const c=tl.cols[ci],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
        const numDays=Math.max(1,U.days(c.start,c.end)+1);
        const cur=new Date(cs);
        while(cur<=ce){
          if(cur.getDay()===0||cur.getDay()===6){
            const dayIdx=U.days(c.start,U.iso(cur));
            const dayX=Math.round(ci*tl.cw+(dayIdx/numDays)*tl.cw)-vpX+lw;
            const dayW=Math.round(ci*tl.cw+((dayIdx+1)/numDays)*tl.cw)-Math.round(ci*tl.cw+(dayIdx/numDays)*tl.cw);
            if(dayX+dayW>lw&&dayX<W)svg+=`<rect x="${dayX}" y="${totalHdrH}" width="${Math.max(1,dayW)}" height="${vpH}" fill="#000" opacity="${wkOp}"/>`;
          }
          cur.setDate(cur.getDate()+1);
        }
      }
    }
    /* Holiday shading */
    if(p.showHolidays&&p.holidays.length){
      const hClr=p.holidayColor||'#e5534b';
      const hOp=(p.holidayOpacity||12)/100;
      const hr=parseInt(hClr.slice(1,3),16),hg=parseInt(hClr.slice(3,5),16),hb=parseInt(hClr.slice(5,7),16);
      for(const hol of p.holidays){
        const x1=this.dX(hol.start,tl),x2=this.dXEnd(hol.end,tl);
        if(x1===null||x2===null)continue;
        const hw=Math.max(1,x2-x1);
        const hsx=lw+x1-vpX;
        if(hsx+hw<lw||hsx>W)continue;
        svg+=`<rect x="${hsx}" y="${totalHdrH}" width="${hw}" height="${vpH}" fill="rgba(${hr},${hg},${hb},${hOp})"/>`;
        if(p.holidayLabels){
          const DNAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],MNAMES=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const _hd=ds=>{const dt=new Date(ds+'T12:00:00');return DNAMES[dt.getDay()]+' '+MNAMES[dt.getMonth()]+' '+dt.getDate()};
          const rangeStr=hol.start===hol.end?_hd(hol.start):_hd(hol.start)+' – '+_hd(hol.end);
          const saFlag=hol.schedAround!==false?' ⏩':' ○';
          const labelText=U.esc(hol.name)+' · '+rangeStr+saFlag;
          const lblOp=Math.min(1,hOp*3+.25);
          svg+=`<text x="${hsx+4}" y="${totalHdrH+12}" fill="rgba(${hr},${hg},${hb},${lblOp})" font-size="9" font-weight="600" writing-mode="tb">${labelText}</text>`;
        }
      }
    }
    /* Grid column lines — vertical dividers matching on-screen .grid-col border-right */
    for(let ci=1;ci<tl.cols.length;ci++){const x=ci*tl.cw-vpX+lw;if(x>lw&&x<W)svg+=`<line x1="${x}" y1="${totalHdrH}" x2="${x}" y2="${totalHdrH+vpH}" stroke="#e8ecf0" stroke-width="1"/>`}
    /* Draw body content (items) */
    let yO=0;const svgItemYMap=new Map();const svgItemXMap=new Map();/* {id: {left,right,midY}} for dep arrows */
    const svgVLines=[];/* vertical line data for export */
    for(const{sl,items,h,subMeta,collapsed,hidden}of sm){
      if(hidden){yO+=h;continue}
      const slYStart=yO;
      const rowTop=yO-vpY+totalHdrH,rowBot=rowTop+h;
      if(viewportOnly&&(rowBot<totalHdrH||rowTop>H)){yO+=h;continue}
      svg+=`<line x1="${lw}" y1="${rowTop+h}" x2="${W}" y2="${rowTop+h}" stroke="#d0d5dc" stroke-width="1"/>`;
      if(!collapsed){
        let subYOff=0;
        for(const sub of subMeta){
          if(subYOff>0)svg+=`<line x1="${lw}" y1="${rowTop+subYOff}" x2="${W}" y2="${rowTop+subYOff}" stroke="#000" opacity="0.08"/>`;
          for(const it of sub.items){
            /* Hidden item handling: hideMode ON → skip entirely; hideMode OFF → render greyed */
            if(p.hideMode&&it.hidden)continue;
            const isHidden=it.hidden&&!p.hideMode;/* visible but greyed out */
            const itemOp=isHidden?0.3:1;
            const f=it.dateFormat||p.dateFormat,fmt=it.dateFormat||p.dateFormat,fs=it.fontSize||gfs,tc=it.textColor||th.tlTx,etc=it.edgeTextColor||th.tlTx2;
            const itemY=rowTop+subYOff+6+(it.subRow||0)*rH;
            svgItemYMap.set(it.id,itemY);
            /* Export status setup */
            const eSD=this._getStatusDef(it.status);
            const eSDCfg=p.statusDisplay||{};
            const eSDShow=eSDCfg.show;
            const eSDMode=eSDCfg.mode||'emoji';
            const eSDPos=eSDCfg.badgePos||'inline';
            const eSDColorOvr=eSDCfg.colorOverride;
            let eRenderColor=it.color;
            if(eSDShow&&eSDColorOvr){if(eSD)eRenderColor=eSD.color;else if(eSDCfg.blankColor)eRenderColor=eSDCfg.blankColor}
            const eUseInline=eSD&&eSDShow&&eSDPos==='inline';
        if(it.type==='task'){
          const ix=this.dX(it.startDate,tl),ix2=this.dXEnd(it.endDate,tl),w=Math.max(8,(ix2||0)-(ix||0)),iy=itemY,barH=22;
          const renderX=lw+ix-vpX;
          if(viewportOnly&&(renderX+w<lw-20||renderX>W+20)){continue}
          /* Task bar */
          svg+=`<rect x="${renderX}" y="${iy}" width="${w}" height="${barH}" rx="4" fill="${eRenderColor}" opacity="${0.85*itemOp}"/>`;
          /* Critical path border */
          if(critIds&&critIds.has(it.id))svg+=`<rect x="${renderX-4}" y="${iy-4}" width="${w+8}" height="${barH+8}" rx="6" fill="none" stroke="#fb8500" stroke-width="2" opacity="${itemOp}"/>`;
          svgItemXMap.set(it.id,{left:renderX,right:renderX+w,midY:iy+barH/2});
          /* Progress fill */
          if(it.progress>0){const pw=w*(it.progress/100);svg+=`<rect x="${renderX}" y="${iy}" width="${pw}" height="${barH}" rx="4" fill="${eRenderColor}" opacity="${0.45*itemOp}"/>`;if(w>30)svg+=`<text x="${renderX+w/2}" y="${iy+barH/2+4}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" opacity="${0.9*itemOp}">${it.progress}%</text>`}
          /* Status badge (non-inline) */
          if(eSD&&eSDShow&&eSDPos!=='inline'){
            if(eSDMode==='emoji'){const bx=eSDPos==='top-left'?renderX-4:renderX+w-4,by=eSDPos==='top-left'?iy+2:iy+barH+2;svg+=`<text x="${bx}" y="${by}" font-size="10" opacity="${itemOp}">${eSD.emoji}</text>`}
            else if(eSDMode==='shortName'){const snW=this._mt(eSD.shortName,8,'700')+6,bx=eSDPos==='top-left'?renderX-4:renderX+w-snW+4,by=eSDPos==='top-left'?iy-4:iy+barH+2;svg+=`<rect x="${bx}" y="${by}" width="${snW}" height="12" rx="3" fill="${eSD.color}" opacity="${itemOp}"/><text x="${bx+snW/2}" y="${by+9}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" opacity="${itemOp}">${U.esc(eSD.shortName)}</text>`}
            else if(eSDMode==='text'){const bx=eSDPos==='top-left'?renderX-4:renderX+w+4,by=eSDPos==='top-left'?iy+4:iy+barH+10;svg+=`<text x="${bx}" y="${by}" fill="${eSD.color}" font-size="8" font-weight="600" opacity="${itemOp}">${U.esc(eSD.name)}</text>`}
          }
          /* Edge date labels */
          if(it.showStartDate)svg+=`<text x="${renderX-4}" y="${iy+barH/2+fs*0.3}" fill="${etc}" font-size="${Math.max(8,fs-1)}" text-anchor="end" opacity="${itemOp}">${U.fmt(it.startDate,fmt)}</text>`;
          if(it.showEndDate)svg+=`<text x="${renderX+w+4}" y="${iy+barH/2+fs*0.3}" fill="${etc}" font-size="${Math.max(8,fs-1)}" opacity="${itemOp}">${U.fmt(it.endDate,fmt)}</text>`;
          /* Name + secondary label */
          const lp=it.labelPosition||'right';
          const midY=iy+barH/2+fs*0.35;
          let dateStr='';
          {const parts=[];const hasOwner=it.showOwner&&it.owner;const hasDur=it.showDuration;const durTxt=hasDur?this._fmtDurLabel(it):'';if(hasOwner&&hasDur)parts.push(it.owner+' ('+durTxt+')');else if(hasOwner)parts.push(it.owner);else if(hasDur)parts.push(durTxt);dateStr=parts.join(' ')||''}
          /* Inline status prefix for export */
          const eInlinePfx=eUseInline?(eSDMode==='emoji'?eSD.emoji+' ':eSDMode==='text'?U.esc(eSD.name)+' ':'('+U.esc(eSD.shortName)+') '):'';
          if(lp==='right'){
            if(eInlinePfx){svg+=`<text x="${renderX+w+6}" y="${dateStr?midY-fs*0.35:midY}" font-size="${fs}" font-weight="600" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}
            else{svg+=`<text x="${renderX+w+6}" y="${dateStr?midY-fs*0.35:midY}" fill="${tc}" font-size="${fs}" font-weight="600" opacity="${itemOp}">${U.esc(it.name)}</text>`}
            if(dateStr)svg+=`<text x="${renderX+w+6}" y="${midY+fs*0.55}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='left'){
            if(eInlinePfx){svg+=`<text x="${renderX-6}" y="${dateStr?midY-fs*0.35:midY}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}
            else{svg+=`<text x="${renderX-6}" y="${dateStr?midY-fs*0.35:midY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}">${U.esc(it.name)}</text>`}
            if(dateStr)svg+=`<text x="${renderX-6}" y="${midY+fs*0.55}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="end" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='top'){
            if(eInlinePfx){svg+=`<text x="${renderX+w/2}" y="${iy-4-(dateStr?fs:0)}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}
            else{svg+=`<text x="${renderX+w/2}" y="${iy-4-(dateStr?fs:0)}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`}
            if(dateStr)svg+=`<text x="${renderX+w/2}" y="${iy-4}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='bottom'){
            if(eInlinePfx){svg+=`<text x="${renderX+w/2}" y="${iy+barH+fs+2}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}
            else{svg+=`<text x="${renderX+w/2}" y="${iy+barH+fs+2}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`}
            if(dateStr)svg+=`<text x="${renderX+w/2}" y="${iy+barH+fs*2+2}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else{
            if(eInlinePfx){svg+=`<text x="${renderX+w/2}" y="${midY}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}
            else{svg+=`<text x="${renderX+w/2}" y="${midY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`}
          }
        }else{
          /* Milestone */
          const ix=this.dXMid(it.date,tl),iy=itemY,iconH=16;const ic=ICONS.find(i=>i.id===it.iconType)||ICONS[0];
          const renderX=lw+ix-vpX;
          if(viewportOnly&&(renderX<lw-80||renderX>W+80)){continue}
          svg+=`<g transform="translate(${renderX-8},${iy})" opacity="${itemOp}"><svg width="16" height="16" viewBox="0 0 24 24"><path d="${ic.p}" fill="${eRenderColor}"/></svg></g>`;
          /* Critical path border */
          if(critIds&&critIds.has(it.id))svg+=`<rect x="${renderX-12}" y="${iy-4}" width="24" height="24" rx="6" fill="none" stroke="#fb8500" stroke-width="2" opacity="${itemOp}"/>`;
          svgItemXMap.set(it.id,{left:renderX-8,right:renderX+8,midY:iy+iconH/2});
          /* Status badge (non-inline) for milestone */
          if(eSD&&eSDShow&&eSDPos!=='inline'){
            if(eSDMode==='emoji'){const bx=eSDPos==='top-left'?renderX-12:renderX+4,by=eSDPos==='top-left'?iy+2:iy+iconH+2;svg+=`<text x="${bx}" y="${by}" font-size="10" opacity="${itemOp}">${eSD.emoji}</text>`}
            else if(eSDMode==='shortName'){const snW=this._mt(eSD.shortName,8,'700')+6,bx=eSDPos==='top-left'?renderX-12:renderX+4,by=eSDPos==='top-left'?iy-4:iy+iconH+2;svg+=`<rect x="${bx}" y="${by}" width="${snW}" height="12" rx="3" fill="${eSD.color}" opacity="${itemOp}"/><text x="${bx+snW/2}" y="${by+9}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" opacity="${itemOp}">${U.esc(eSD.shortName)}</text>`}
            else if(eSDMode==='text'){const bx=eSDPos==='top-left'?renderX-12:renderX+12,by=eSDPos==='top-left'?iy+4:iy+iconH+10;svg+=`<text x="${bx}" y="${by}" fill="${eSD.color}" font-size="8" font-weight="600" opacity="${itemOp}">${U.esc(eSD.name)}</text>`}
          }
          const lp=it.labelPosition||'right';
          const mMidY=iy+iconH/2+fs*0.35;
          let dateStr='';
          if(it.showDate!==false){const hasOwner=it.showOwner&&it.owner;dateStr=U.fmt(it.date,f);if(hasOwner)dateStr=it.owner+(dateStr?' · '+dateStr:'')}
          const eInlinePfx=eUseInline?(eSDMode==='emoji'?eSD.emoji+' ':eSDMode==='text'?U.esc(eSD.name)+' ':'('+U.esc(eSD.shortName)+') '):'';
          if(lp==='right'){if(eInlinePfx){svg+=`<text x="${renderX+12}" y="${dateStr?iy+fs*0.8:mMidY}" font-size="${fs}" font-weight="600" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}else{svg+=`<text x="${renderX+12}" y="${dateStr?iy+fs*0.8:mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" opacity="${itemOp}">${U.esc(it.name)}</text>`};if(dateStr)svg+=`<text x="${renderX+12}" y="${iy+fs*0.8+fs}" fill="${tc}" font-size="${fs-1}" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='left'){if(eInlinePfx){svg+=`<text x="${renderX-12}" y="${dateStr?iy+fs*0.8:mMidY}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}else{svg+=`<text x="${renderX-12}" y="${dateStr?iy+fs*0.8:mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}">${U.esc(it.name)}</text>`};if(dateStr)svg+=`<text x="${renderX-12}" y="${iy+fs*0.8+fs}" fill="${tc}" font-size="${fs-1}" text-anchor="end" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='top'){if(eInlinePfx){svg+=`<text x="${renderX}" y="${iy-4-(dateStr?fs:0)}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}else{svg+=`<text x="${renderX}" y="${iy-4-(dateStr?fs:0)}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`};if(dateStr)svg+=`<text x="${renderX}" y="${iy-4}" fill="${tc}" font-size="${fs-1}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='bottom'){if(eInlinePfx){svg+=`<text x="${renderX}" y="${iy+iconH+fs+2}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}else{svg+=`<text x="${renderX}" y="${iy+iconH+fs+2}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`};if(dateStr)svg+=`<text x="${renderX}" y="${iy+iconH+fs*2+2}" fill="${tc}" font-size="${fs-1}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else{if(eInlinePfx){svg+=`<text x="${renderX}" y="${mMidY}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}"><tspan fill="${eSD.color}" font-weight="700">${eInlinePfx}</tspan><tspan fill="${tc}">${U.esc(it.name)}</tspan></text>`}else{svg+=`<text x="${renderX}" y="${mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`}}
        }
        /* Collect vertical line data */
        if(it.vLine?.enabled){const vx=it.type==='task'?this.dX(it.startDate,tl):this.dXMid(it.date,tl);if(vx!==null)svgVLines.push({x:lw+vx-vpX,vLine:it.vLine,slY:rowTop,slH:h,subY:subYOff,subH:sub.h,iy:subYOff+6+(it.subRow||0)*rH})}
        }
          subYOff+=sub.h;
        }
      }yO+=h}
    /* Dependency arrows */
    if(p.showDeps){const depFilt=p.depFilter||'all';
      for(const it of p.items){if(!it.deps?.length)continue;
        if(p.hideMode&&it.hidden)continue;
        const tPos=svgItemXMap.get(it.id);if(!tPos)continue;
        for(const d of it.deps){const did=this.depId(d),lag=this.depLag(d),dtype=this.depType(d);
          /* F60: swimlane filter */
          if(depFilt==='swimlane'){const pred0=this.gi(did);if(pred0&&pred0.swimlaneId!==it.swimlaneId)continue}
          const sPos=svgItemXMap.get(did);if(!sPos)continue;
          /* Attachment points based on link type */
          let sx,sy,tx,ty;
          if(dtype==='SS'){sx=sPos.left;sy=sPos.midY;tx=tPos.left;ty=tPos.midY}
          else if(dtype==='FF'){sx=sPos.right;sy=sPos.midY;tx=tPos.right;ty=tPos.midY}
          else{sx=sPos.right;sy=sPos.midY;tx=tPos.left;ty=tPos.midY}
          /* Violation detection — same logic as rDeps */
          let violated=false;const iStart=it.type==='task'?it.startDate:it.date;const pred=this.gi(did);
          const idm=it.type==='task'?(it.durMode||'cal'):'work';
          if(pred){let req=null;
            if(dtype==='FS'){const pEnd=this._depEnd(pred);if(pEnd)req=this._addLagWorkingDays(pEnd,lag,idm)}
            else if(dtype==='SS'){const pStart=pred.type==='task'?pred.startDate:pred.date;if(pStart)req=this._addLagWorkingDays(pStart,lag,idm)}
            else if(dtype==='FF'){const pEnd=this._depEnd(pred);const iEnd=this._depEnd(it);if(pEnd&&iEnd&&iEnd<this._addLagWorkingDays(pEnd,lag,idm))violated=true}
            if(req&&iStart&&iStart<req)violated=true}
          const clr=violated?'#d4726a':it.color;const dash=violated?' stroke-dasharray="4,3"':'';const opa=violated?'0.7':'0.4';
          const mx=(sx+tx)/2;
          svg+=`<path d="M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}" stroke="${clr}" stroke-opacity="${opa}" stroke-width="1.5" fill="none"${dash}/>`;
          const a=Math.atan2(ty-sy,tx-mx),s=6;
          svg+=`<polygon fill="${clr}" fill-opacity="${opa}" points="${tx},${ty} ${tx-s*Math.cos(a-.4)},${ty-s*Math.sin(a-.4)} ${tx-s*Math.cos(a+.4)},${ty-s*Math.sin(a+.4)}"/>`;
          /* Lag label */
          if(lag!==0){const lx=(sx+tx)/2,ly=(sy+ty)/2-6;
            const lagUnit=(p.scheduleAroundNonWorking&&idm==='work')?'wd':'d';
            svg+=`<text x="${lx}" y="${ly}" fill="${clr}" font-size="8" font-family="monospace" text-anchor="middle" opacity="0.7">${lag>0?'+':''}${lag}${lagUnit}</text>`}
      }}}
    /* Vertical lines */
    for(const vl of svgVLines){const v=vl.vLine;if(!v)continue;
      const isDash=v.style==='dashed';
      let top=totalHdrH,bot=totalHdrH+vpH;
      if(v.extent==='sub'){top=vl.slY+vl.subY;bot=vl.slY+vl.subY+vl.subH}
      else if(v.extent==='swim'){top=vl.slY;bot=vl.slY+vl.slH}
      if(v.direction==='down'){top=vl.slY+vl.iy}
      else if(v.direction==='up'){bot=vl.slY+vl.iy+16}
      svg+=`<line x1="${vl.x}" y1="${top}" x2="${vl.x}" y2="${bot}" stroke="${v.color}" stroke-width="2" opacity="0.6"${isDash?' stroke-dasharray="4,3"':''}/>`}
    /* Today marker */
    if(p.showToday){const tx=this.dX(U.iso(new Date()),tl);if(tx!==null){const todayX=lw+tx-vpX;if(todayX>=lw&&todayX<=W){svg+=`<line x1="${todayX}" y1="${totalHdrH}" x2="${todayX}" y2="${totalHdrH+vpH}" stroke="#e5534b" stroke-width="2"/>`;svg+=`<polygon points="${todayX-5},${totalHdrH} ${todayX+5},${totalHdrH} ${todayX},${totalHdrH+6}" fill="#e5534b"/>`;svg+=`<text x="${todayX}" y="${totalHdrH+16}" fill="#e5534b" font-size="8" font-weight="700" text-anchor="middle">Today</text>`}}}
    /* TTT labels */
    if(p.tttEnabled&&p.tttMilestoneId){
      const refIt=this.gi(p.tttMilestoneId);
      if(refIt){const refDate=refIt.date||refIt.startDate;if(refDate){
        for(const it of p.items){
          if(p.hideMode&&it.hidden)continue;
          const iy=svgItemYMap.get(it.id);if(iy==null)continue;
          const targetDate=it.type==='task'?it.endDate:it.date;if(!targetDate)continue;
          const ix=it.type==='task'?this.dXEnd(targetDate,tl):this.dXMid(targetDate,tl);if(ix===null)continue;
          const diffWeeks=Math.round(U.days(refDate,targetDate)/7);
          const label=it.id===p.tttMilestoneId?'0':String(diffWeeks);
          const clr=(it.id===p.tttMilestoneId||diffWeeks>=0)?'#2ea043':'#e5534b';
          svg+=`<text x="${lw+ix-vpX+(it.type==='task'?2:10)}" y="${iy+32}" fill="${clr}" font-size="9" font-weight="700" font-family="monospace">${label}</text>`
        }
      }}}
    /* Float labels */
    if(p.showFloat){
      this.calculateFloat();
      for(const it of p.items){
        if(p.hideMode&&it.hidden)continue;
        const iy=svgItemYMap.get(it.id);if(iy==null)continue;
        if(it._float==null)continue;
        const hasDeps=it.deps?.length>0;
        const hasSuccs=p.items.some(s=>s.deps?.some(d=>this.depId(d)===it.id));
        if(!hasDeps&&!hasSuccs)continue;
        const ix=it.type==='task'?this.dXEnd(it.endDate,tl):this.dXMid(it.date,tl);if(ix===null)continue;
        const fl=it._float;
        const clr=fl===0?'#e5534b':'#888';const fw=fl===0?'700':'600';
        svg+=`<text x="${lw+ix-vpX+(it.type==='task'?2:10)}" y="${iy+32}" fill="${clr}" font-size="8" font-weight="${fw}" font-family="monospace">${fl}d</text>`
      }
    }
    /* Swimlane label backgrounds — draw ALL rects first so no rect masks overflow text */
    yO=0;for(const{sl,h,subMeta:subs,collapsed,hidden}of sm){if(hidden){yO+=h;continue}const rowTop=yO-vpY+totalHdrH;if(!(viewportOnly&&(rowTop+h<totalHdrH||rowTop>H))){
      const clampT=Math.max(totalHdrH,rowTop),clampH=Math.min(h,rowTop+h-clampT);
      svg+=`<rect x="0" y="${clampT}" width="${lw}" height="${clampH}" fill="${sl.color}"/>`;
      const hasSubs=!collapsed&&sl.subSwimlanes?.length>0&&subs.length>1;
      if(hasSubs){const mainW=60;svg+=`<line x1="${mainW}" y1="${clampT}" x2="${mainW}" y2="${clampT+clampH}" stroke="rgba(255,255,255,0.15)"/>`;
        let subY=0;for(let si=0;si<subs.length;si++){if(si>0)svg+=`<line x1="${mainW}" y1="${rowTop+subY}" x2="${lw}" y2="${rowTop+subY}" stroke="rgba(255,255,255,0.15)"/>`;subY+=subs[si].h}}
    }yO+=h}
    /* Swimlane label text — drawn AFTER all rects so overflow shows on top of all backgrounds */
    yO=0;for(const{sl,h,subMeta:subs,collapsed,hidden}of sm){if(hidden){yO+=h;continue}const rowTop=yO-vpY+totalHdrH;if(!(viewportOnly&&(rowTop+h<totalHdrH||rowTop>H))){
      const hasSubs=!collapsed&&sl.subSwimlanes?.length>0&&subs.length>1;
      if(hasSubs){
        const mainW=60,subW=lw-mainW;
        const availH=h-12;const expMainFs=sl.fontSize||11;const wrapLines=this._wrapText(sl.name,availH>0?availH:h,expMainFs,'600');const nLines=wrapLines.length||1;let mfs=expMainFs;if(nLines===1){const tw=this._mt(sl.name,expMainFs,'600');if(tw>availH&&availH>0)mfs=Math.max(8,Math.round(expMainFs*availH/tw))}
        const lh=mfs*1.2;const totalTH=nLines*lh;const cx=mainW/2,cy=rowTop+h/2;
        let vtxt=`<g transform="rotate(-90,${cx},${cy})"><text fill="#fff" font-size="${mfs}" font-weight="600" text-anchor="middle">`;
        for(let li=0;li<nLines;li++){const ly=cy-totalTH/2+lh/2+li*lh;vtxt+=`<tspan x="${cx}" y="${ly}" dominant-baseline="central">${U.esc(wrapLines[li])}</tspan>`}
        vtxt+=`</text></g>`;svg+=vtxt;
        let subY=0;for(let si=0;si<subs.length;si++){const sub=subs[si];
          const ss=sl.subSwimlanes.find(s=>s.id===sub.ssId);
          if(ss){const expSubFs=ss.fontSize||9.5;if(sub.minimized){svg+=`<text x="${mainW+subW/2}" fill="#fff" font-size="${Math.min(8,expSubFs)}" font-weight="500" text-anchor="middle" opacity="0.5"><tspan x="${mainW+subW/2}" y="${rowTop+subY+10}" dominant-baseline="central">${U.esc(ss.name)}</tspan></text>`}else{svg+=this._svgText(ss.name,mainW+subW/2,rowTop+subY,subW,sub.h,expSubFs,'500','opacity="0.85"')}}
          subY+=sub.h}
      }else{
        svg+=this._svgText(sl.name,lw/2,rowTop,lw,h,sl.fontSize||12,'600','')}
    }yO+=h}
    /* Header rows */
    let hdrY=0;
    const isDaysHybridExp=p.timescale==='days'&&(p.dayLabelFormat||'letter')==='hybrid';
    hR.forEach((row,ri)=>{let hx=lw;svg+=`<rect x="${lw}" y="${hdrY}" width="${vpW}" height="${rowHH}" fill="${th.hdr}"/>`;
      const hFs=p.headerFontSize||10.5;row.forEach(cell=>{const cw=cell.width!=null?cell.width:cell.span*tl.cw,cx=hx-vpX;if(cx+cw>lw&&cx<lw+vpW){if(cell.boundary)svg+=`<line x1="${cx}" y1="${hdrY}" x2="${cx}" y2="${hdrY+rowHH}" stroke="rgba(255,255,255,0.35)"/>`;if(isDaysHybridExp&&ri===hR.length-1&&cell.dayLetter){svg+=`<text x="${cx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`;svg+=`<text x="${cx+cw-2}" y="${hdrY+5}" fill="rgba(255,255,255,0.6)" font-size="7" font-weight="500" text-anchor="end">${cell.dayLetter}</text>`}else{svg+=`<text x="${cx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`}svg+=`<line x1="${cx+cw}" y1="${hdrY}" x2="${cx+cw}" y2="${hdrY+rowHH}" stroke="rgba(255,255,255,0.2)"/>`}hx+=cw});
      svg+=`<line x1="${lw}" y1="${hdrY+rowHH}" x2="${lw+vpW}" y2="${hdrY+rowHH}" stroke="rgba(255,255,255,0.2)"/>`;hdrY+=rowHH});
    svg+=`<rect x="0" y="0" width="${lw}" height="${totalHdrH}" fill="${th.hdr}"/>`;
    svg+=`<text x="${lw/2}" y="${totalHdrH/2+4}" fill="#fff" font-size="9" font-weight="600" text-anchor="middle">${U.esc(p.name)}</text>`;
    svg+=`<line x1="0" y1="${totalHdrH}" x2="${W}" y2="${totalHdrH}" stroke="rgba(0,0,0,0.15)"/>`;
    svg+=`<line x1="${lw}" y1="${totalHdrH}" x2="${lw}" y2="${totalHdrH+vpH}" stroke="rgba(0,0,0,0.10)"/>`;
    /* Watermark */
    if(p.watermark){let wmText='Last Updated: '+U.fmt(p.wmDate||U.iso(new Date()),p.dateFormat);if(p.wmShowOwner&&p.owner)wmText+=' | '+p.owner;
      const pos=p.wmPos||'bottom-center';let wx,anc;
      const contentW=lw+vpW;/* watermark positioned relative to content area, not text padding */
      if(pos.includes('left')){wx=lw+8;anc='start'}else if(pos.includes('right')){wx=contentW-8;anc='end'}else{wx=(lw+contentW)/2;anc='middle'}
      const wy=pos.includes('top')?totalHdrH+14:totalHdrH+vpH+16;
      svg+=`<text x="${wx}" y="${wy}" fill="#888" font-size="11" font-style="italic" text-anchor="${anc}">${U.esc(wmText)}</text>`}
    svg+=`</svg>`;return svg
  },

  /* ===== DATA TABLE ===== */
  _populateFilterDropdowns(){
    const p=this.proj;
    if(this.$.flt_swim){const cur=this.$.flt_swim.value;let h='<option value="">Lane…</option>';p.swimlanes.forEach(sl=>{h+=`<option value="${sl.id}">${U.esc(sl.name)}</option>`});this.$.flt_swim.innerHTML=h;this.$.flt_swim.value=cur}
    if(this.$.flt_sub){const cur=this.$.flt_sub.value;let h='<option value="">Sub…</option>';const seen=new Set();p.swimlanes.forEach(sl=>{(sl.subSwimlanes||[]).forEach(ss=>{if(!seen.has(ss.id)){seen.add(ss.id);h+=`<option value="${ss.id}">${U.esc(ss.name)}</option>`}})});this.$.flt_sub.innerHTML=h;this.$.flt_sub.value=cur}
    if(this.$.flt_status){const cur=this.$.flt_status.value;let h='<option value="">Status…</option><option value="_none">(No status)</option>';(p.statusDefs||[]).forEach(sd=>{if(sd.id==='blank')return;h+=`<option value="${sd.id}">${(sd.emoji?sd.emoji+' ':'')+U.esc(sd.name)}</option>`});this.$.flt_status.innerHTML=h;this.$.flt_status.value=cur}
  },
  renderDT(){
    const p=this.proj;
    const cols=[{k:'_cb',l:'',w:52},{k:'name',l:'Name',w:160},{k:'owner',l:'Owner',w:90},{k:'type',l:'Type',w:55},{k:'startDate',l:'Start',w:100},{k:'endDate',l:'End',w:100},{k:'duration',l:'Dur',w:50},{k:'status',l:'Status',w:55},{k:'swimlaneId',l:'Lane',w:90},{k:'subSwimId',l:'Sub',w:75},{k:'color',l:'',w:28},{k:'subRow',l:'Row',w:34},{k:'deps',l:'Dep',w:32},{k:'progress',l:'%',w:36},{k:'pinned',l:'📌',w:28},{k:'hidden',l:'👁',w:28},{k:'notes',l:'Notes',w:120}];
    this._dtCols=cols;
    const sc=this._sortCol,sd=this._sortDir;
    /* Build visible item ids first so header checkbox can reflect state */
    const visibleIds=[];
    const fltType=this.$.flt_type?.value||'';
    const fltName=(this.$.flt_name?.value||'').toLowerCase();
    const fltOwner=(this.$.flt_owner?.value||'').toLowerCase();
    const fltSwim=this.$.flt_swim?.value||'';
    const fltSub=this.$.flt_sub?.value||'';
    const fltNotes=(this.$.flt_notes?.value||'').toLowerCase();
    const fltStart=this.$.flt_start?.value||'';
    const fltEnd=this.$.flt_end?.value||'';
    const fltStatus=this.$.flt_status?.value||'';
    const anyFlt=fltType||fltName||fltOwner||fltSwim||fltSub||fltNotes||fltStart||fltEnd||fltStatus;
    const _fltMatch=it=>{
      if(fltType&&it.type!==fltType)return false;
      if(fltName&&!it.name.toLowerCase().includes(fltName))return false;
      if(fltOwner&&!(it.owner||'').toLowerCase().includes(fltOwner))return false;
      if(fltSwim&&it.swimlaneId!==fltSwim)return false;
      if(fltSub&&(it.subSwimId||'')!==fltSub)return false;
      if(fltNotes&&!(it.notes||'').toLowerCase().includes(fltNotes))return false;
      if(fltStart&&(it.date||it.startDate||'')<fltStart)return false;
      if(fltEnd&&(it.endDate||it.date||'')>fltEnd)return false;
      if(fltStatus){if(fltStatus==='_none'){if(it.status)return false}else{if(it.status!==fltStatus)return false}}
      return true;
    };
    const statusOrder=new Map((p.statusDefs||[]).map((sd,i)=>[sd.id,i]));
    const gv=(it,k)=>{if(k==='startDate')return it.type==='milestone'?(it.date||''):(it.startDate||'');if(k==='deps')return(it.deps||[]).length;if(k==='duration')return it.duration||0;if(k==='owner')return it.owner||'';if(k==='notes')return it.notes||'';if(k==='pinned')return it.pinned?1:0;if(k==='status')return statusOrder.get(it.status||'blank')??999;return it[k]||''};
    for(const sl of p.swimlanes){
      let slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      if(anyFlt)slItems=slItems.filter(_fltMatch);
      slItems.forEach(i=>visibleIds.push(i.id));
    }
    const allSel=visibleIds.length>0&&visibleIds.every(id=>this.sel.includes(id));
    const someSel=!allSel&&visibleIds.some(id=>this.sel.includes(id));
    this.$.dt_head.innerHTML=`<tr>${cols.map(c=>{
      if(c.k==='_cb'){return`<th style="width:${c.w}px;min-width:${c.w}px" data-col="_cb"><input type="checkbox" id="dt-sel-all" title="Select / deselect all visible" ${allSel?'checked':''}${someSel?' class="dt-some"':''}><button id="dt-invert" class="dt-inv-btn" title="Invert selection">⇅</button></th>`}
      const arr=c.k===sc?(sd==='asc'?'↑':'↓'):'';return`<th style="width:${c.w}px;min-width:${c.w}px" data-col="${c.k}" data-sortable="1">${c.l}${arr?`<span class="sort-arrow">${arr}</span>`:''}<div class="th-rs"></div></th>`}).join('')}</tr>`;
    const rows=[];
    for(const sl of p.swimlanes){
      let slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      if(anyFlt)slItems=slItems.filter(_fltMatch);
      if(sc)slItems.sort((a,b)=>{let va=gv(a,sc),vb=gv(b,sc);if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();return va<vb?(sd==='asc'?-1:1):va>vb?(sd==='asc'?1:-1):0});
      rows.push(`<tr class="dt-sw-hdr" data-sl-id="${sl.id}"><td colspan="${cols.length}"><span class="dt-sw-clr" style="background:${sl.color}"></span>${U.esc(sl.name)}</td></tr>`);
      const subSws=sl.subSwimlanes||[];
      for(const it of slItems){
        const sel=this.sel.includes(it.id),dc=(it.deps||[]).length;
        const isM=this._searchMatches.includes(it.id),isC=this._searchMatches[this._searchIdx]===it.id;
        const isCalc=p.schedulingMode==='scheduled'&&dc>0&&!it.pinned;
        const cLC=isCalc?'field-locked':'';
        rows.push(`<tr class="${sel?'selected':''}${isM?' search-match':''}${isC?' search-cur':''}" data-iid="${it.id}" data-ctx="dt-row">
          <td><input type="checkbox" class="dt-cb" ${sel?'checked':''} data-id="${it.id}"></td>
          <td><input class="dt-in" data-f="name" value="${U.esc(it.name)}" data-id="${it.id}"></td>
          <td><input class="dt-in" data-f="owner" value="${U.esc(it.owner||'')}" data-id="${it.id}" placeholder="—"></td>
          <td><select class="dt-sel" data-f="type" data-id="${it.id}"><option value="milestone" ${it.type==='milestone'?'selected':''}>Mile</option><option value="task" ${it.type==='task'?'selected':''}>Task</option></select></td>
          <td><input class="dt-in ${cLC}" type="date" data-f="startDate" value="${it.type==='milestone'?(it.date||''):(it.startDate||'')}" data-id="${it.id}" ${isCalc?'readonly':''}></td>
          <td><input class="dt-in ${cLC}" type="date" data-f="endDate" value="${it.endDate||''}" data-id="${it.id}" ${it.type==='milestone'||isCalc?'disabled':''}></td>
          <td><input class="dt-in" type="number" data-f="duration" value="${it.duration||''}" data-id="${it.id}" min="1" style="width:44px" ${it.type==='milestone'?'disabled':''}></td>
          <td><select class="dt-sel dt-status-sel" data-f="status" data-id="${it.id}"><option value="">—</option>${(this.proj.statusDefs||[]).filter(sd=>sd.id!=='blank').map(sd=>`<option value="${sd.id}" ${sd.id===it.status?'selected':''}>${sd.emoji} ${U.esc(sd.shortName)}</option>`).join('')}</select></td>
          <td><select class="dt-sel" data-f="swimlaneId" data-id="${it.id}">${p.swimlanes.map(s=>`<option value="${s.id}" ${s.id===it.swimlaneId?'selected':''}>${s.name}</option>`).join('')}</select></td>
          <td><select class="dt-sel" data-f="subSwimId" data-id="${it.id}"><option value="">—</option>${subSws.map(ss=>`<option value="${ss.id}" ${ss.id===it.subSwimId?'selected':''}>${ss.name}</option>`).join('')}</select></td>
          <td><input type="color" class="dt-clr" value="${it.color}" data-f="color" data-id="${it.id}"></td>
          <td><input class="dt-in" type="number" data-f="subRow" value="${it.subRow||0}" min="0" max="10" data-id="${it.id}" style="width:32px"></td>
          <td style="text-align:center"><span class="dep-badge${dc?' has':''}">${dc||'—'}</span></td>
          <td><input class="dt-in" type="number" data-f="progress" value="${it.progress||0}" min="0" max="100" data-id="${it.id}" style="width:36px"></td>
          <td style="text-align:center"><input type="checkbox" class="dt-pin" data-id="${it.id}" ${it.pinned?'checked':''}></td>
          <td style="text-align:center"><input type="checkbox" class="dt-hid" data-id="${it.id}" ${it.hidden?'checked':''}></td>
          <td><input class="dt-in" data-f="notes" value="${U.esc(it.notes||'')}" data-id="${it.id}" placeholder="—"></td>
        </tr>`)
      }
    }
    this.$.dt_body.innerHTML=rows.join('');this.bindDT()
  },

  _dtSelect(id,shift,ctrl){
    const prev=this.sel.slice();
    if(shift&&this._lastShiftSel){
      const allIds=[...this.$.dt_body.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
      const i1=allIds.indexOf(this._lastShiftSel),i2=allIds.indexOf(id);
      if(i1>=0&&i2>=0){const lo=Math.min(i1,i2),hi=Math.max(i1,i2);this.sel=allIds.slice(lo,hi+1)}
    }else if(ctrl){
      const idx=this.sel.indexOf(id);if(idx>=0)this.sel.splice(idx,1);else this.sel.push(id);
      this._lastShiftSel=id;
    }else{
      if(this.sel.length===1&&this.sel[0]===id){this._lastShiftSel=id;return}
      this.sel=[id];this._lastShiftSel=id;
    }
    if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}
    else if(this.sel.length>1)this.openBulkPanel();
    else this.closePanel();
    this.sched();
  },

  bindDT(){
    const tb=this.$.dt_body;
    /* Select All / Deselect All */
    const selAllCb=document.getElementById('dt-sel-all');
    if(selAllCb){
      const visIds=[...tb.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
      const allChecked=visIds.length>0&&visIds.every(id=>this.sel.includes(id));
      const someChecked=!allChecked&&visIds.some(id=>this.sel.includes(id));
      selAllCb.indeterminate=someChecked;
      selAllCb.onchange=()=>{
      const visIds=[...tb.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
      if(selAllCb.checked){visIds.forEach(id=>{if(!this.sel.includes(id))this.sel.push(id)})}
      else{const vs=new Set(visIds);this.sel=this.sel.filter(id=>!vs.has(id))}
      if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();else this.closePanel();
      this.sched();
    }}
    /* Invert Selection */
    const invBtn=document.getElementById('dt-invert');
    if(invBtn)invBtn.onclick=()=>{
      const visIds=[...tb.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
      const selSet=new Set(this.sel);
      const newSel=this.sel.filter(id=>!visIds.includes(id));
      visIds.forEach(id=>{if(!selSet.has(id))newSel.push(id)});
      this.sel=newSel;
      if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();else this.closePanel();
      this.sched();
    };
    tb.onchange=e=>{const t=e.target,id=t.dataset?.id,f=t.dataset?.f;
      if(t.classList.contains('dt-cb')){
        const rid=t.dataset.id;
        if(t.checked){if(!this.sel.includes(rid))this.sel.push(rid)}else this.sel=this.sel.filter(x=>x!==rid);
        this._lastShiftSel=rid;
        if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();
        this.sched();return
      }
      if(t.classList.contains('dt-pin')){const it=this.gi(t.dataset.id);if(it){this.snap();it.pinned=t.checked;this.sched();this.autoSave()}return}
      if(t.classList.contains('dt-hid')){const it=this.gi(t.dataset.id);if(it){this.snap();it.hidden=t.checked;this.sched();this.autoSave()}return}
      if(!id||!f)return;const it=this.gi(id);if(!it)return;const val=t.type==='number'?+t.value:t.value;
      this.snap();
      if(f==='type'){it.type=val;if(val==='task'&&!it.startDate){it.startDate=it.date;it.duration=14;it.durMode='cal';it.endDate=this._calcEndDate(it)}else if(val==='milestone'&&!it.date)it.date=it.startDate}
      else if(f==='startDate'){
        if(it.type==='milestone')it.date=val;
        else{
          it.startDate=val;
          if(it.endDate){
            const isWork=this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
            it.duration=isWork?this._countWorkingDays(val,U.addDays(it.endDate,1)):(U.days(val,it.endDate)+1);
          }
        }
      }else if(f==='endDate'){
        it.endDate=val;
        if(it.startDate){
          const isWork=this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
          it.duration=isWork?this._countWorkingDays(it.startDate,U.addDays(val,1)):(U.days(it.startDate,val)+1);
        }
      }else if(f==='duration'){
        it.duration=val;
        if(it.startDate){it.endDate=this._calcEndDate(it)}
      }else if(f==='status'){it.status=val;it.statusDate=it.status?U.iso(new Date()):''}
      else if(f==='owner'){it.owner=val}
      else if(f==='notes'){it.notes=val}
      else it[f]=val;
      if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave();this.refreshPanel()
    };
    tb.oninput=e=>{const f=e.target.dataset?.f,id=e.target.dataset?.id;if(!f||!id)return;const it=this.gi(id);if(!it)return;
      if(f==='name'){it.name=e.target.value;this.autoSave();if(this.view==='split')this.sched(true,false)}
      else if(f==='owner'){it.owner=e.target.value;this.autoSave()}
      else if(f==='notes'){it.notes=e.target.value;this.autoSave()}
    };
    // Right-click context menu on data table rows — column-aware bulk edit
    tb.oncontextmenu=e=>{
      const row=e.target.closest('tr[data-iid]');if(!row)return;e.preventDefault();
      const td=e.target.closest('td');if(!td)return;
      const id=row.dataset.iid;if(!this.sel.includes(id))this.sel=[id];
      const it=this.gi(id);if(!it)return;
      const ci=td.cellIndex;const colKey=this._dtCols?.[ci]?.k||null;
      this._buildDtCtxMenu(colKey,it,e.clientX,e.clientY);
    };
    tb.onclick=e=>{
      if(e.target.closest('.dt-sw-hdr')&&e.detail===2){const sl=this.gs(e.target.closest('.dt-sw-hdr').dataset.slId);if(sl)this.showSwM(sl)}
    };
    tb.onmousedown=e=>{
      const row=e.target.closest('tr[data-iid]');if(!row)return;
      // Shift+click on selection checkbox → range select (shiftKey reliable on mousedown)
      const cb=e.target.closest('.dt-cb');
      if(cb&&e.shiftKey&&this._lastShiftSel){e.preventDefault();this._dtSelect(cb.dataset.id,true,false);return}
      if(e.target.closest('.dt-cb,.dt-pin,.dt-hid'))return;
      // B37: Right-click on an already-selected row preserves multi-selection
      if(e.button===2&&this.sel.includes(row.dataset.iid))return;
      /* B45: Clicking a <select> (status dropdown) silently sets selection without
         triggering sched()/re-render so the native dropdown stays open. The row gets
         visually selected on the next render (triggered by onchange).
         NOTE: Must run AFTER B37 guard — otherwise right-click on a status cell
         collapses multi-selection before contextmenu fires (B51 regression). */
      if(e.target.closest('select')){const id=row.dataset.iid;if(!(this.sel.length===1&&this.sel[0]===id)){this.sel=[id];this._lastShiftSel=id}return}
      this._dtSelect(row.dataset.iid,e.shiftKey,e.ctrlKey||e.metaKey);
    };
    this.$.dt_head.onclick=e=>{const th=e.target.closest('th[data-sortable]');if(!th)return;const col=th.dataset.col;if(this._sortCol===col)this._sortDir=this._sortDir==='asc'?'desc':'asc';else{this._sortCol=col;this._sortDir='asc'}this.sched(false,true)};
    this.$.dt_head.onmousedown=e=>{const rh=e.target.closest('.th-rs');if(!rh)return;e.preventDefault();const th=rh.parentElement,sx=e.clientX,sw=th.getBoundingClientRect().width;const mv=ev=>{const nw=Math.max(25,sw+ev.clientX-sx);th.style.width=nw+'px';th.style.minWidth=nw+'px';const ci=th.cellIndex;if(ci>=0){this.$.dt_body.querySelectorAll('tr').forEach(row=>{const td=row.cells[ci];if(td){td.style.width=nw+'px';td.style.minWidth=nw+'px'}})}};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}
  },

  /* ── Data Table Context Menu (Column-Aware Bulk Edit) ── */
  _buildDtCtxMenu(colKey,it,x,y){
    const menu=this.$.dt_ctx_menu;if(!menu)return;
    const n=this.sel.length;const multi=n>1;
    let h='';
    // Text fields: name, owner, notes
    if(['name','owner','notes'].includes(colKey)){
      const val=it[colKey]||'';const preview=val.length>25?val.slice(0,25)+'…':val;
      if(multi)h+=`<div class="ctx-hint">Edit ${colKey} for ${n} selected items</div>`;
      if(colKey!=='name')h+=`<div class="ctx-item" data-dta="copy-val">Apply "${U.esc(preview)}" to all</div>`;
      h+=`<div class="ctx-item" data-dta="prepend">Prepend text…</div>`;
      h+=`<div class="ctx-item" data-dta="append">Append text…</div>`;
      h+=`<div class="ctx-sep"></div>`;
      h+=`<div class="ctx-item" data-dta="clear">Clear ${colKey}</div>`;
    }
    // Status
    else if(colKey==='status'){
      if(multi)h+=`<div class="ctx-hint">Set status for ${n} selected items</div>`;
      const defs=this.proj.statusDefs||[];
      h+=`<div class="ctx-item${!it.status?' ctx-active':''}" data-dta="set-status" data-v="">(None)</div>`;
      defs.filter(sd=>sd.id!=='blank').forEach(sd=>{
        h+=`<div class="ctx-item${sd.id===it.status?' ctx-active':''}" data-dta="set-status" data-v="${sd.id}">${sd.emoji} ${U.esc(sd.name)}</div>`;
      });
    }
    // Swimlane
    else if(colKey==='swimlaneId'){
      if(multi)h+=`<div class="ctx-hint">Move ${n} selected items to lane</div>`;
      this.proj.swimlanes.forEach(s=>{
        h+=`<div class="ctx-item${s.id===it.swimlaneId?' ctx-active':''}" data-dta="set-swim" data-v="${s.id}">${U.esc(s.name)}</div>`;
      });
    }
    // Sub-swimlane
    else if(colKey==='subSwimId'){
      const sl=this.proj.swimlanes.find(s=>s.id===it.swimlaneId);
      const subs=sl?.subSwimlanes||[];
      if(multi)h+=`<div class="ctx-hint">Move ${n} selected items to sub-lane</div>`;
      subs.forEach(ss=>{
        h+=`<div class="ctx-item${ss.id===it.subSwimId?' ctx-active':''}" data-dta="set-sub" data-v="${ss.id}" data-sl="${it.swimlaneId}">${U.esc(ss.name)}</div>`;
      });
      h+=`<div class="ctx-item${!it.subSwimId?' ctx-active':''}" data-dta="set-sub" data-v="" data-sl="${it.swimlaneId}">(None)</div>`;
    }
    // Color
    else if(colKey==='color'){
      h+=`<div class="ctx-item" data-dta="copy-val">Apply <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${it.color};vertical-align:middle"></span> to ${multi?n+' selected items':'this item'}</div>`;
      h+=`<div class="ctx-sep"></div><div class="ctx-clr-grid">`;
      COLORS.forEach(c=>{h+=`<div class="ctx-clr-sw${c===it.color?' active':''}" data-dta="set-color" data-v="${c}" style="background:${c}" title="${c}"></div>`});
      h+=`</div>`;
    }
    // Row (subRow)
    else if(colKey==='subRow'){
      const rv=it.subRow||0;
      h+=`<div class="ctx-hint">${multi?`Set row for ${n} selected items`:'Set row'} (within each item's own lane)</div>`;
      for(let r=0;r<=5;r++){h+=`<div class="ctx-item${r===rv?' ctx-active':''}" data-dta="set-row" data-v="${r}">Row ${r}</div>`}
    }
    // Progress
    else if(colKey==='progress'){
      const pv=it.progress||0;
      h+=`<div class="ctx-item" data-dta="set-progress-single" data-v="${pv}">Set to ${pv}%</div>`;
      if(multi){h+=`<div class="ctx-sep"></div><div class="ctx-item" data-dta="copy-val">Apply ${pv}% to ${n} selected items</div>`}
      h+=`<div class="ctx-sep"></div>`;
      [0,25,50,75,100].forEach(p=>{h+=`<div class="ctx-item${p===pv?' ctx-active':''}" data-dta="set-progress" data-v="${p}">${p}%</div>`});
    }
    // Pinned
    else if(colKey==='pinned'){
      if(multi){
        h+=`<div class="ctx-item" data-dta="pin-all">📌 Pin ${n} selected items</div>`;
        h+=`<div class="ctx-item" data-dta="unpin-all">Unpin ${n} selected items</div>`;
        h+=`<div class="ctx-item" data-dta="toggle-pin">Toggle pin for ${n} selected</div>`;
      }else{
        h+=`<div class="ctx-item" data-dta="toggle-pin">${it.pinned?'✓ ':''}📌 Pin Date</div>`;
      }
    }
    // Hidden
    else if(colKey==='hidden'){
      if(multi){
        h+=`<div class="ctx-item" data-dta="hide-all">👁 Hide ${n} selected items</div>`;
        h+=`<div class="ctx-item" data-dta="show-all">Show ${n} selected items</div>`;
        h+=`<div class="ctx-item" data-dta="toggle-hidden">Toggle visibility for ${n} selected</div>`;
      }else{
        h+=`<div class="ctx-item" data-dta="toggle-hidden">${it.hidden?'✓ ':''}👁 Hidden</div>`;
      }
    }
    // Type
    else if(colKey==='type'){
      if(multi)h+=`<div class="ctx-hint">Set type for ${n} selected items</div>`;
      h+=`<div class="ctx-item${it.type==='milestone'?' ctx-active':''}" data-dta="set-type" data-v="milestone">Milestone</div>`;
      h+=`<div class="ctx-item${it.type==='task'?' ctx-active':''}" data-dta="set-type" data-v="task">Task</div>`;
      h+=`<div class="ctx-sep"></div>`;
      h+=`<div class="ctx-hint">Milestone→Task adds 14-day duration</div>`;
      h+=`<div class="ctx-hint">Task→Milestone keeps start date only</div>`;
    }
    // Universal footer (always)
    if(!['pinned','hidden'].includes(colKey)){
      h+=`<div class="ctx-sep"></div>`;
      h+=`<div class="ctx-item" data-dta="toggle-pin">${it.pinned?'✓ ':''}📌 Pin Date</div>`;
    }
    h+=`<div class="ctx-item" data-dta="del">Delete</div>`;
    menu.innerHTML=h;
    menu.style.left=Math.min(x,window.innerWidth-220)+'px';
    menu.style.top=Math.min(y,window.innerHeight-Math.min(menu.scrollHeight||300,400)-10)+'px';
    menu.classList.remove('hidden');
    // Reposition after render if needed
    requestAnimationFrame(()=>{const r=menu.getBoundingClientRect();if(r.bottom>window.innerHeight-8)menu.style.top=Math.max(4,window.innerHeight-r.height-8)+'px'});
    menu.onclick=ev=>{
      const el=ev.target.closest('[data-dta]');if(!el)return;
      const a=el.dataset.dta;if(!a)return;
      menu.classList.add('hidden');
      this._execDtCtxAction(a,colKey,it,el,x,y);
    };
    const hide=()=>{menu.classList.add('hidden');document.removeEventListener('click',hide)};
    setTimeout(()=>document.addEventListener('click',hide),0);
  },

  _execDtCtxAction(action,colKey,it,el,x,y){
    const items=this.sel.map(id=>this.gi(id)).filter(Boolean);
    if(action==='copy-val'){
      this.snap();
      if(['name','owner','notes'].includes(colKey)){
        const val=it[colKey]||'';items.forEach(i=>{i[colKey]=val});
      }else if(colKey==='color'){
        items.forEach(i=>{i.color=it.color});
      }else if(colKey==='progress'){
        items.forEach(i=>{i.progress=it.progress||0});
      }
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Applied to ${items.length} item${items.length===1?'':'s'}`);
    }
    else if(action==='prepend'||action==='append'){
      this._showDtCtxInput(action,colKey,items,x,y);return;
    }
    else if(action==='clear'){
      this.snap();items.forEach(i=>{i[colKey]=''});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Cleared ${colKey} for ${items.length} item${items.length===1?'':'s'}`);
    }
    else if(action==='set-status'){
      const v=el.dataset.v;this.snap();
      items.forEach(i=>{i.status=v||'';i.statusDate=i.status?U.iso(new Date()):''});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Status updated for ${items.length} item${items.length===1?'':'s'}`);
    }
    else if(action==='set-swim'){
      const v=el.dataset.v;this.snap();
      const sl=this.proj.swimlanes.find(s=>s.id===v);
      items.forEach(i=>{i.swimlaneId=v;i.subSwimId=''});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Moved ${items.length} item${items.length===1?'':'s'} to ${sl?.name||'lane'}`);
    }
    else if(action==='set-sub'){
      const v=el.dataset.v;const slId=el.dataset.sl;this.snap();
      items.forEach(i=>{i.swimlaneId=slId;i.subSwimId=v});
      this.sched();this.autoSave();this.refreshPanel();
      const sl=this.proj.swimlanes.find(s=>s.id===slId);const ss=(sl?.subSwimlanes||[]).find(s=>s.id===v);
      this.toast(v?`Moved to ${ss?.name||'sub'}`:('Cleared sub-swimlane'));
    }
    else if(action==='set-color'){
      const v=el.dataset.v;this.snap();items.forEach(i=>{i.color=v});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Color applied to ${items.length} item${items.length===1?'':'s'}`);
    }
    else if(action==='set-row'){
      const v=+el.dataset.v;this.snap();items.forEach(i=>{i.subRow=v});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Row set to ${v}`);
    }
    else if(action==='set-progress'){
      const v=+el.dataset.v;this.snap();items.forEach(i=>{i.progress=v});
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Progress set to ${v}%`);
    }
    else if(action==='set-progress-single'){
      // Single item quick edit — no-op since already at that value, but allow from preset clicks
      return;
    }
    else if(action==='set-type'){
      const v=el.dataset.v;this.snap();
      items.forEach(i=>{
        if(i.type===v)return;
        i.type=v;
        if(v==='task'&&!i.startDate){i.startDate=i.date;i.duration=14;i.durMode='cal';i.endDate=this._calcEndDate(i)}
        else if(v==='milestone'&&!i.date)i.date=i.startDate;
      });
      this.sched();this.autoSave();this.refreshPanel();this.toast(`Type set for ${items.length} item${items.length===1?'':'s'}`);
    }
    else if(action==='pin-all'){this.snap();items.forEach(i=>{i.pinned=true});this.sched();this.autoSave();this.refreshPanel();this.toast(`Pinned ${items.length} items`)}
    else if(action==='unpin-all'){this.snap();items.forEach(i=>{i.pinned=false});this.sched();this.autoSave();this.refreshPanel();this.toast(`Unpinned ${items.length} items`)}
    else if(action==='toggle-pin'){this.snap();items.forEach(i=>{i.pinned=!i.pinned});this.sched();this.autoSave();this.refreshPanel();this.toast('Toggled pin')}
    else if(action==='hide-all'){this.snap();items.forEach(i=>{i.hidden=true});this.sched();this.autoSave();this.refreshPanel();this.toast(`Hidden ${items.length} items`);if(this.proj.hideMode)this._hintHidePill()}
    else if(action==='show-all'){this.snap();items.forEach(i=>{i.hidden=false});this.sched();this.autoSave();this.refreshPanel();this.toast(`Shown ${items.length} items`);if(this.proj.hideMode)this._hintHidePill()}
    else if(action==='toggle-hidden'){this.snap();items.forEach(i=>{i.hidden=!i.hidden});this.sched();this.autoSave();this.refreshPanel();this.toast('Toggled visibility');if(this.proj.hideMode)this._hintHidePill()}
    else if(action==='del'){
      this.snap();const s=new Set(this.sel);
      this.proj.items.forEach(i=>i.deps=(i.deps||[]).filter(d=>!s.has(this.depId(d))));
      this.proj.items=this.proj.items.filter(i=>!s.has(i.id));this.sel=[];
      this.sched();this.autoSave();this.closePanel();this.toast('Deleted');
    }
  },

  _showDtCtxInput(mode,field,items,x,y){
    const el=document.getElementById('dt-ctx-input');if(!el)return;
    const n=items.length;
    el.querySelector('.dci-label').textContent=`${mode==='prepend'?'Prepend to':'Append to'} ${field} for ${n} item${n===1?'':'s'}`;
    const inp=document.getElementById('dci-val');
    inp.value='';inp.placeholder=mode==='prepend'?'Text to prepend…':'Text to append…';
    el.style.left=Math.min(x,window.innerWidth-240)+'px';
    el.style.top=Math.min(y,window.innerHeight-80)+'px';
    el.classList.remove('hidden');
    inp.focus();
    const apply=()=>{
      const val=inp.value;
      if(!val){el.classList.add('hidden');return}
      this.snap();
      items.forEach(i=>{
        if(mode==='prepend')i[field]=val+(i[field]||'');
        else i[field]=(i[field]||'')+val;
      });
      el.classList.add('hidden');
      this.sched();this.autoSave();this.refreshPanel();
      this.toast(`${mode==='prepend'?'Prepended':'Appended'} to ${n} item${n===1?'':'s'}`);
    };
    document.getElementById('dci-apply').onclick=apply;
    document.getElementById('dci-cancel').onclick=()=>el.classList.add('hidden');
    inp.onkeydown=e=>{
      e.stopPropagation(); // prevent shortcut dispatcher
      if(e.key==='Enter'){e.preventDefault();apply()}
      else if(e.key==='Escape'){e.preventDefault();el.classList.add('hidden')}
    };
  },

  doSearch(){const term=this.$.data_search.value.trim().toLowerCase();this._searchTerm=term;this._searchMatches=[];this._searchIdx=-1;if(term){this.proj.items.forEach(i=>{if(i.name.toLowerCase().includes(term)||(i.owner||'').toLowerCase().includes(term)||(i.notes||'').toLowerCase().includes(term))this._searchMatches.push(i.id)});if(this._searchMatches.length)this._searchIdx=0}this.$.data_search_ct.textContent=this._searchMatches.length?`${this._searchIdx+1}/${this._searchMatches.length}`:'';this.sched(false,true);if(this._searchMatches.length)this.scrollToSM()},
  searchNav(d){if(!this._searchMatches.length)return;this._searchIdx=(this._searchIdx+d+this._searchMatches.length)%this._searchMatches.length;this.$.data_search_ct.textContent=`${this._searchIdx+1}/${this._searchMatches.length}`;this.sched(false,true);this.scrollToSM()},
  scrollToSM(){const id=this._searchMatches[this._searchIdx];if(!id)return;const r=this.$.dt_body.querySelector(`tr[data-iid="${id}"]`);if(r)r.scrollIntoView({block:'center',behavior:'smooth'})},

  /* Advanced Search */
  doAdvSearch(addToSel){
    const term=document.getElementById('as-term')?.value||'';
    const useRegex=document.getElementById('as-regex')?.checked;
    const searchName=document.getElementById('as-name')?.checked;
    const searchOwner=document.getElementById('as-owner')?.checked;
    const searchNotes=document.getElementById('as-notes')?.checked;
    const searchDates=document.getElementById('as-dates')?.checked;
    const searchStatus=document.getElementById('as-status')?.checked;
    if(!term){this.toast('Enter a search term','error');return}
    let matcher;
    try{matcher=useRegex?new RegExp(term,'i'):{test:s=>s.toLowerCase().includes(term.toLowerCase())}}catch(e){this.toast('Invalid regex','error');return}
    const matches=[];
    for(const it of this.proj.items){
      let found=false;
      if(searchName&&matcher.test(it.name))found=true;
      if(searchOwner&&matcher.test(it.owner||''))found=true;
      if(searchNotes&&matcher.test(it.notes||''))found=true;
      if(searchStatus){const sd=this._getStatusDef(it.status);if(sd&&matcher.test(sd.name))found=true}
      if(searchDates){
        if(matcher.test(it.date||'')||matcher.test(it.startDate||'')||matcher.test(it.endDate||''))found=true;
      }
      if(found)matches.push(it.id);
    }
    if(addToSel){matches.forEach(id=>{if(!this.sel.includes(id))this.sel.push(id)})}else this.sel=matches;
    const resEl=document.getElementById('as-results');if(resEl)resEl.textContent=`Found ${matches.length} item(s)`;
    this.sched();if(matches.length>1)this.openBulkPanel();else if(matches.length===1){const it=this.gi(matches[0]);if(it)this.openPanel(it)}
  },

  /* Lasso Mode Toggle */
  _lassoMode:false,
  toggleLassoMode(){
    this._lassoMode=!this._lassoMode;
    document.getElementById('btn-lasso')?.classList.toggle('active',this._lassoMode);
    this.sched();this.toast(this._lassoMode?'Lasso mode ON — click and drag to select':'Lasso mode OFF')
  },

  exportSVG(){const svg=this.buildExportSVG();const b=new Blob([svg],{type:'image/svg+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.svg';a.click();URL.revokeObjectURL(a.href);this.toast('SVG exported!')},

  async exportPNG(){try{this.toast('Generating PNG…');const svg=this.buildExportSVG();const img=new Image();const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);let dpr=Math.max(3,window.devicePixelRatio||3);img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight){this.toast('Image failed to render','error');URL.revokeObjectURL(url);return}const maxDim=16384;if(img.naturalWidth*dpr>maxDim||img.naturalHeight*dpr>maxDim)dpr=Math.floor(maxDim/Math.max(img.naturalWidth,img.naturalHeight))||1;const c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*dpr);c.height=Math.round(img.naturalHeight*dpr);const ctx=c.getContext('2d');if(!ctx){this.toast('Canvas too large to export','error');URL.revokeObjectURL(url);return}ctx.scale(dpr,dpr);ctx.drawImage(img,0,0);c.toBlob(b=>{if(!b){this.toast('Render failed','error');URL.revokeObjectURL(url);return}const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.png';a.click();URL.revokeObjectURL(a.href);this.toast('PNG exported!')},'image/png')};img.onerror=()=>{this.toast('PNG generation failed','error');URL.revokeObjectURL(url)};img.src=url}catch(err){this.toast('PNG export not supported','error')}},

  exportDataCSV(){
    const p=this.proj,rows=[['Name','Owner','Type','Start','End','Duration','Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate','URL Links']];
    for(const sl of p.swimlanes){for(const it of p.items.filter(i=>i.swimlaneId===sl.id)){
      const sd=this._getStatusDef(it.status);rows.push([it.name,it.owner||'',it.type,it.type==='milestone'?it.date:it.startDate,it.endDate||'',it.duration||'',sl.name,it.subRow||0,it.color,it.progress||0,it.pinned?'Y':'N',it.hidden?'Y':'N',it.notes||'',this._fmtPreds(it),sd?sd.name:'',it.statusDate||'',(it.links||[]).map(lk=>lk.url).join('; ')])}}
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.csv';a.click();URL.revokeObjectURL(a.href);this.toast('CSV exported!')
  },

  _deSelectedCols:null,
  showDataExport(){
    const allCols=['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate','LabelPos','FontSize','TextColor','DateFormat','ShowDate','URL Links'];
    this._deSelectedCols=new Set(allCols);
    const cc=document.getElementById('de-custom-cols');
    cc.innerHTML=allCols.map(c=>`<label class="apply-chk" style="min-width:120px"><input type="checkbox" checked data-dc="${c}"> ${c}</label>`).join('');
    cc.querySelectorAll('input').forEach(cb=>{cb.onchange=()=>{if(cb.checked)this._deSelectedCols.add(cb.dataset.dc);else this._deSelectedCols.delete(cb.dataset.dc)}});
    const modeEl=document.getElementById('de-mode');modeEl.value='all';cc.classList.add('hidden');
    modeEl.onchange=()=>cc.classList.toggle('hidden',modeEl.value==='all');
    this.showModal('data-export-modal')
  },
  doDataExport(target){
    const p=this.proj,mode=document.getElementById('de-mode').value;
    const allCols=['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate','LabelPos','FontSize','TextColor','DateFormat','ShowDate','URL Links'];
    const cols=mode==='all'?allCols:[...this._deSelectedCols];
    const getVal=(it,col)=>{const sl=this.gs(it.swimlaneId);switch(col){case'Name':return it.name;case'Owner':return it.owner||'';case'Type':return it.type;case'Start':return it.type==='milestone'?it.date:it.startDate;case'End':return it.endDate||'';case'Duration':return it.duration||'';case'Swimlane':return sl?.name||'';case'SubSwim':const ss=sl?.subSwimlanes?.find(s=>s.id===it.subSwimId);return ss?.name||'';case'Row':return it.subRow||0;case'Color':return it.color;case'Progress':return it.progress||0;case'Pinned':return it.pinned?'Y':'N';case'Hidden':return it.hidden?'Y':'N';case'Notes':return it.notes||'';case'Predecessors':return this._fmtPreds(it);case'Status':const sd=this._getStatusDef(it.status);return sd?sd.name:'';case'StatusDate':return it.statusDate||'';case'LabelPos':return it.labelPosition;case'FontSize':return it.fontSize||0;case'TextColor':return it.textColor||'';case'DateFormat':return it.dateFormat||'';case'ShowDate':return it.showDate!==false?'Y':'N';case'URL Links':return(it.links||[]).map(lk=>lk.name?lk.name+': '+lk.url:lk.url).join('; ');default:return''}};
    const rows=[cols];p.items.forEach(it=>rows.push(cols.map(c=>getVal(it,c))));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join('\t')).join('\n');
    document.getElementById('data-export-modal').classList.add('hidden');
    if(target==='clipboard'){navigator.clipboard.writeText(csv).then(()=>this.toast('Copied to clipboard!')).catch(()=>this.toast('Copy failed','error'))}
    else{const b=new Blob([csv.replace(/\t/g,',')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(p.name||'data')+'.csv';a.click();URL.revokeObjectURL(a.href);this.toast('Exported!')}
  },

  /* Help Modal */
  _buildHelpShortcutTable(){
    const kbdS='background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)';
    const tdS='padding:3px 8px;border-bottom:1px solid var(--brd)';
    const tdS2='padding:3px;border-bottom:1px solid var(--brd)';
    let rows=[];
    const boundActions=SHORTCUT_ACTIONS.filter(a=>a.special!=='nudge').filter(a=>{
      const b=this._getBindings(a.id);return b.length>0;
    });
    // Build pairs of (label, kbd) for 2-column layout
    const pairs=[];
    boundActions.forEach(a=>{
      const bindings=this._getBindings(a.id);
      const isCustom=this._scOverrides&&a.id in this._scOverrides&&!a.reserved;
      const marker=isCustom?'<span style="color:var(--acc);font-weight:700"> *</span>':'';
      const kbds=bindings.map(b=>`<kbd style="${kbdS}">${U.esc(this._displayCombo(b))}</kbd>`).join(' / ');
      pairs.push({kbd:kbds,label:U.esc(a.label)+marker});
    });
    // Add nudge as a single combined entry
    const nudgeBindings=this._getBindings('nudgeLeft');
    if(nudgeBindings.length){
      pairs.push({kbd:`<kbd style="${kbdS}">←→↑↓</kbd>`,label:'Nudge items'});
      pairs.push({kbd:`<kbd style="${kbdS}">Ctrl+←→</kbd>`,label:'Nudge faster (hold)'});
    }
    // Add mouse references
    MOUSE_REFS.forEach(r=>{pairs.push({kbd:`<kbd style="${kbdS}">${U.esc(r.combo)}</kbd>`,label:U.esc(r.desc)})});
    // Render as 2-column table
    let h='<table style="width:100%;border-collapse:collapse;font-size:11px"><tbody>';
    for(let i=0;i<pairs.length;i+=2){
      const a=pairs[i],b=pairs[i+1];
      h+=`<tr><td style="${tdS}">${a.kbd}</td><td style="${tdS2}">${a.label}</td>`;
      if(b)h+=`<td style="${tdS}">${b.kbd}</td><td style="${tdS2}">${b.label}</td>`;
      else h+='<td style="'+tdS+'"></td><td style="'+tdS2+'"></td>';
      h+='</tr>';
    }
    h+='</tbody></table>';
    return h;
  },
  showHelp(){
    const h=`<div style="font-size:12.5px;line-height:1.7;color:var(--tx2)">
    <h3 style="color:var(--tx1);margin-bottom:12px;font-size:15px">🚀 Quick Start Guide</h3>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">1. Create Your Timeline</strong><p>Start with a blank project or choose a template from <strong>New</strong> (📄). Your timeline has <em>swimlanes</em> (horizontal sections) and <em>items</em> (milestones & tasks).</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">2. Add Items</strong><p>Click <strong>+ Mile</strong> or <strong>+ Task</strong> in the toolbar. Items appear in the selected swimlane. Right-click the timeline for "Add Here" at a specific date. To bulk-add items, switch to <strong>Data View</strong> and click <strong>📋 Paste</strong> — paste tab-separated rows from Excel (<code>Name [Tab] Date</code> for milestones, or <code>Name [Tab] Start [Tab] End</code> for tasks) and they'll be imported into your chosen swimlane.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">3. Edit Properties</strong><p>Click any item to open the <strong>Properties Panel</strong>. Change dates, colors, icons, owner, notes, and more. Pin the panel 📌 to keep it open.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">4. Drag & Arrange</strong><p><strong>Drag items</strong> left/right to change dates, or up/down to move between rows and sub-swimlanes. A <strong>dashed ghost outline</strong> shows exactly where the item will snap to on the grid. While dragging, a <strong>delta badge</strong> follows your cursor showing how far you've moved (<code>+3d</code>, <code>+14d · 2w 0d</code>), the <strong>header highlights</strong> the target date columns, and a <strong>status strip</strong> at the bottom shows original and target dates.</p><p>Hold <strong>Shift</strong> while dragging to <strong>lock horizontal movement</strong> (move vertically only). Press <strong>Escape</strong> to <strong>cancel a drag</strong> and restore the original position. Use <strong>Ctrl+click</strong> to multi-select items, then drag them as a group. <strong>Arrow keys</strong> nudge selected items precisely; hold <strong>Ctrl</strong> for faster movement (7 days). The <strong>Lock</strong> toggle (Tools menu) prevents all item movement until unlocked.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">5. Task Timing</strong><p>Tasks have <strong>Start/End/Duration</strong>. Changing Start or End recalculates Duration; changing Duration updates End. Use <strong>📌 Pin Date</strong> to protect items from Propagate.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">6. Dependencies</strong><p><strong>Ctrl+click</strong> to multi-select, then right-click → <strong>Link Dependency</strong>. Each link has a <strong>type</strong> (FS, SS, FF) and optional <strong>lag</strong> (days). Right-click → <strong>Propagate to Successors</strong> to push date changes downstream. Violated links show as dashed red arrows. Enable <strong>Critical Path</strong> to highlight zero-float items. Use <strong>View → Show Float</strong> to see scheduling flexibility.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">7. Scheduling Mode</strong><p>Open <strong>Settings → Scheduling</strong> to switch between <strong>Manual</strong> (default — you control dates, Propagate on demand) and <strong>Auto-Scheduled</strong> (dates auto-calculate from dependencies). In Auto mode, successor dates are calculated fields shown in blue. <strong>📌 Pin Date</strong> overrides auto-scheduling for individual items. A preview shows what will change before switching modes.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">8. Views</strong><p>Switch between <strong>Timeline</strong>, <strong>Data</strong> (spreadsheet with filters), and <strong>Split</strong> views. Use the <strong>Filter Bar</strong> to narrow items by name, owner, notes, or dates.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">9. Swimlanes</strong><p>Click <strong>+ Lane</strong> to add. <strong>Double-click</strong> a lane label to edit its name, color, and sub-swimlanes. <strong>Collapse</strong> lanes with the ▼ button. Minimized lanes show ▶ to expand and 👁 to hide. Drag the resize handle between lane labels and the timeline grid to adjust label column width.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">10. Selection & Navigation</strong><p><strong>Ctrl+click</strong> for multi-select. <strong>Alt+drag</strong> or use <strong>Lasso Mode</strong> (toolbar) for area selection. <strong>Ctrl+A</strong> selects all items. <strong>Advanced Search</strong> with regex for complex queries.</p><p><strong>Pan Mode</strong> (Tools → ✋ Pan Mode) lets you click and drag to scroll the timeline in any direction — like the hand tool in Figma or Photoshop. You can also <strong>middle-mouse drag</strong> to pan at any time without toggling. Pan and Lasso modes are mutually exclusive. Press <strong>Escape</strong> to exit Pan Mode. Bind a key to <em>Toggle Pan Mode</em> in Settings → Shortcuts for quick access.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">11. Export & Share</strong><p>Use 📷 for screenshots (full or viewport). Export as SVG, PNG, CSV, or JSON from <strong>Settings → Export</strong>. <strong>Fit to Content</strong> auto-zooms to show everything. Enable the <strong>Watermark</strong> in Settings to add a "Last Updated" date stamp to your timeline — it appears on-screen and is included in all exports and screenshots. You can choose the position and optionally include the project owner.</p></div>
    <h3 style="color:var(--tx1);margin:16px 0 12px;font-size:14px">⌨ Keyboard Shortcuts</h3>
    ${this._buildHelpShortcutTable()}
    <div style="font-size:10px;color:var(--tx3);margin-top:6px">Shortcuts marked with <span style="color:var(--acc);font-weight:700">*</span> have been customized from defaults. Manage shortcuts in <strong>Settings → Shortcuts</strong> (<kbd style="background:var(--bg2);padding:1px 4px;border-radius:3px;font-size:9px;font-family:var(--mono)">Ctrl+Shift+K</kbd>).</div>
    <h3 style="color:var(--tx1);margin:16px 0 12px;font-size:14px">💡 Tips</h3>
    <ul style="padding-left:18px;margin:0">
    <li>Use <strong>Auto-Arrange</strong> (right-click → context menu) to automatically space overlapping items</li>
    <li>Toggle <strong>Lasso Mode</strong> in the toolbar, or hold <strong>Alt</strong> and drag to lasso-select</li>
    <li>Use <strong>Pan Mode</strong> (Tools → ✋) or <strong>middle-mouse drag</strong> to scroll the timeline by grabbing and dragging</li>
    <li>Enable <strong>Weekend Shading</strong> and <strong>Holiday Shading</strong> in Settings to visualize non-working time. Import holidays by pasting from Excel (Name + Date columns).</li>
    <li>Use <strong>Fit to Content</strong> to auto-zoom to show all items</li>
    <li>Toggle <strong>Critical Path</strong> to highlight zero-float items in your dependency network</li>
    <li>Use <strong>Propagate to Successors</strong> (right-click) to push date changes through the dependency chain</li>
    <li><strong>📌 Pin</strong> items to protect them from being moved by Propagate or auto-scheduling</li>
    <li>Switch to <strong>Auto-Scheduled Mode</strong> in Settings → Scheduling to have dates auto-calculate from dependencies</li>
    <li>Use <strong>View → Show Float</strong> to see each item's scheduling flexibility (0d = critical path)</li>
    <li>The <strong>Filter Bar</strong> in Data View lets you filter by name, owner, notes, and dates</li>
    <li>Use <strong>Advanced Search</strong> (🔎) with regex for powerful item finding</li>
    <li><strong>Right-click</strong> any item or the timeline background for quick actions — link dependencies, propagate, auto-arrange, change label position, and more</li>
    <li><strong>Double-click</strong> a swimlane label to edit its name, color, and sub-swimlanes</li>
    <li>In <strong>Data View</strong>, use the <strong>⇅ Invert Selection</strong> button (top-left, next to the select-all checkbox) to flip which items are selected</li>
    <li><strong>Ctrl+Scroll</strong> on the timeline or the view zoom bar to zoom in/out (±5%). Add <strong>Shift</strong> for fine zoom (±1%)</li>
    </ul>
    <h3 style="color:var(--tx1);margin:16px 0 12px;font-size:14px">⚠ Notes / Troubleshooting</h3>
    <ul style="padding-left:18px;margin:0">
    <li><strong>Items not scheduling correctly?</strong> Check the item's <strong>Work Type</strong> (Calendar vs. Working Days) in the Properties Panel. Calendar counts every day; Working Days skips weekends and holidays. Make sure the type matches your intent.</li>
    <li><strong>Dates landing on weekends or holidays?</strong> Open <strong>Settings → Scheduling</strong> and check the <strong>"Schedule Around Non-Working Days"</strong> toggle. When enabled, tasks auto-adjust to avoid weekends and configured holidays.</li>
    <li><strong>Holidays not being respected?</strong> Each holiday has its own <strong>"Schedule Around"</strong> checkbox (Settings → Holidays). You can also toggle all holidays on/off collectively with the master switch. Make sure both the individual holiday and the global toggle are enabled.</li>
    <li><strong>Can't move or nudge items?</strong> The <strong>Lock</strong> toggle (Tools menu) prevents all item movement. Check the toolbar — if Lock is active, click it to unlock.</li>
    <li><strong>Missing items on the timeline?</strong> You may have <strong>Hide Mode</strong> enabled (eye icon in the toolbar). Hidden items are only visible when Hide Mode is off (shown at 30% opacity). Toggle Hide Mode to see everything.</li>
    <li><strong>Quick selection tricks:</strong> In <strong>Data View</strong>, use the <strong>⇅</strong> button (top-left header) to <strong>Invert Selection</strong> — select a few items, then invert to operate on everything else.</li>
    </ul></div>`;
    this.$.help_body.innerHTML=h;this.showModal('help-modal')
  },

  /* Critical Path */
  _critPath:false,
  toggleCritPath(){
    this._critPath=!this._critPath;document.getElementById('btn-crit-path')?.classList.toggle('active',this._critPath);
    this.sched();this.toast(this._critPath?'Critical path ON':'Critical path OFF')
  },
  getCriticalPath(){
    // Use float calculation for accurate critical path
    this.calculateFloat();
    const crit=new Set();
    for(const it of this.proj.items){
      if(it._float===0&&it.deps?.length)crit.add(it.id);
      // Also include predecessors of zero-float items that are themselves zero-float
      if(it._float===0){
        for(const d of it.deps||[]){const pred=this.gi(this.depId(d));if(pred&&pred._float===0)crit.add(pred.id)}
        crit.add(it.id)}}
    return crit.size?crit:null
  },

  /* Auto-Arrange — delegates to label-aware _autoLayoutItems.
     When scope='all' or 'swimlane', we must include ALL items in affected groups
     so density calculation matches import. For 'selection', we still include the
     full sub-swimlane group so the algorithm sees the same density context. */
  autoArrange(scope='all'){
    this.snap();
    let items;
    if(scope==='selection'&&this.sel.length){
      /* Collect full sub-swimlane groups for any selected item so density context matches */
      const grpKeys=new Set();
      this.sel.forEach(id=>{const it=this.gi(id);if(it)grpKeys.add(it.swimlaneId+'|'+(it.subSwimId||''))});
      items=this.proj.items.filter(it=>grpKeys.has(it.swimlaneId+'|'+(it.subSwimId||'')));
    }else if(scope==='swimlane'&&this.sel.length){
      const it=this.gi(this.sel[0]);items=it?this.proj.items.filter(i=>i.swimlaneId===it.swimlaneId):[];
    }else items=[...this.proj.items];
    this._autoLayoutItems(items);
    this.sched();this.autoSave();this.toast('Auto-arranged!')
  },

  autoFitHeights(){
    this.snap();
    const p=this.proj,rH=38;
    let changed=0;
    for(const sl of p.swimlanes){
      if(sl.collapsed!=='expanded')continue;
      const slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      const hasSubs=sl.subSwimlanes?.length>0;
      if(hasSubs){
        for(const ss of sl.subSwimlanes){
          if(ss.collapsed==='minimized')continue;
          const ssItems=slItems.filter(i=>i.subSwimId===ss.id||(!i.subSwimId&&ss===sl.subSwimlanes[0]));
          const vis=ssItems.filter(i=>!(p.hideMode&&i.hidden));
          const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
          const contentH=Math.max(50,(mr+1)*rH+10);
          if(ss.height!==contentH){ss.height=contentH;changed++}
        }
      }else{
        const vis=slItems.filter(i=>!(p.hideMode&&i.hidden));
        const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
        const contentH=Math.max(50,(mr+1)*rH+10);
        if(sl.height!==contentH){sl.height=contentH;changed++}
      }
    }
    this.sched();this.autoSave();
    this.toast(changed?`Heights auto-fitted (${changed} lane${changed===1?'':'s'})`:'Heights already optimal');
  },

  /* Pan — middle-mouse or pan-mode+left-drag scrolls the viewport */
  startPan(e){
    e.preventDefault();
    const bs=this.$.tl_body_scroll;
    const sx=e.clientX,sy=e.clientY;
    const sl=bs.scrollLeft,st=bs.scrollTop;
    this._panning=true;
    this.$.tl_body.style.cursor='grabbing';
    const mv=ev=>{ev.preventDefault();bs.scrollLeft=sl-(ev.clientX-sx);bs.scrollTop=st-(ev.clientY-sy)};
    const up=()=>{
      document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);window.removeEventListener('blur',up);
      this._panning=false;
      this.$.tl_body.style.cursor=this._panMode?'grab':this._lassoMode?'crosshair':'';
    };
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);window.addEventListener('blur',up);
  },

  /* Lasso Selection — uses fixed-position overlay + getBoundingClientRect for hit testing */
  _lasso:null,
  startLasso(e){
    const sx=e.clientX,sy=e.clientY;
    const additive=e.ctrlKey||e.metaKey;
    const priorSel=additive?[...this.sel]:[];
    const el=document.createElement('div');
    el.style.cssText='position:fixed;border:2px dashed #3b82f6;background:rgba(59,130,246,0.1);pointer-events:none;z-index:9000';
    document.body.appendChild(el);this._lasso={sx,sy,el};
    const mv=ev=>{
      ev.preventDefault();
      const cx=ev.clientX,cy=ev.clientY;
      const l=Math.min(sx,cx),t=Math.min(sy,cy),w=Math.abs(cx-sx),h=Math.abs(cy-sy);
      el.style.left=l+'px';el.style.top=t+'px';el.style.width=w+'px';el.style.height=h+'px';
      const newSel=new Set(priorSel);
      document.querySelectorAll('.tl-item').forEach(itEl=>{
        const r=itEl.getBoundingClientRect();
        if(r.right>l&&r.left<l+w&&r.bottom>t&&r.top<t+h)newSel.add(itEl.dataset.iid);
      });
      this.sel=[...newSel];
      this.sched(true,false);
    };
    const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);
      if(el.parentNode)el.remove();this._lasso=null;
      if(this.sel.length>1)this.openBulkPanel();else if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}
      this.sched()};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);
  },
};
document.addEventListener('DOMContentLoaded',()=>App.init());