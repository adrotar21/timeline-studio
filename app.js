/* Timeline Studio v0.22.0 — README polish, repo cleanup, test relocation */
const U={
  id:()=>'id_'+Math.random().toString(36).substr(2,9),
  clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),
  days(a,b){return Math.round((new Date(b)-new Date(a))/864e5)},
  addDays(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return U.iso(x)},
  iso(d){if(!d)return'';const x=d instanceof Date?d:new Date(d);return`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`},
  parseDate(s){if(!s)return null;s=s.trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return new Date(s+'T12:00:00');if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const[m,d,y]=s.split('/').map(Number);return new Date(y,m-1,d)}const d=new Date(s);return isNaN(d)?null:d},
  fmt(date,f){if(!date)return'';const d=date instanceof Date?date:new Date(date+'T12:00:00');if(isNaN(d))return'';const ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];const mf=['January','February','March','April','May','June','July','August','September','October','November','December'];const dd=d.getDate(),mm=d.getMonth(),yy=d.getFullYear();if(f&&f.startsWith('custom:')){let t=f.slice(7);t=t.replace(/YYYY/g,String(yy));t=t.replace(/YY/g,String(yy).slice(-2));t=t.replace(/MMMM/g,mf[mm]);t=t.replace(/MMM/g,ms[mm]);t=t.replace(/MM/g,String(mm+1).padStart(2,'0'));t=t.replace(/(?<![DM])M(?![MYa-z])/g,String(mm+1));t=t.replace(/DD/g,String(dd).padStart(2,'0'));t=t.replace(/(?<![DMY])D(?![DMY])/g,String(dd));return t}switch(f){case'MM/DD/YYYY':return`${String(mm+1).padStart(2,'0')}/${String(dd).padStart(2,'0')}/${yy}`;case'DD/MM/YYYY':return`${String(dd).padStart(2,'0')}/${String(mm+1).padStart(2,'0')}/${yy}`;case'YYYY-MM-DD':return U.iso(d);case'M/D':return`${mm+1}/${dd}`;case'MMM D':return`${ms[mm]} ${dd}`;default:return`${ms[mm]} ${dd}, ${yy}`}},
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

function newProj(){const n=new Date();return{version:2,name:'New Timeline',owner:'',dateFormat:'MMM D, YYYY',timescale:'months',headerLayers:2,timelineStart:U.iso(new Date(n.getFullYear(),0,1)),timelineEnd:U.iso(new Date(n.getFullYear(),11,31)),autoRange:true,showToday:true,showDeps:true,locked:false,lockH:false,lockV:false,hideMode:false,theme:'default',bgColor:'#ffffff',headerColor:'#1a2332',zoom:100,fontSize:11,watermark:false,wmDate:'',wmPos:'bottom-center',wmShowOwner:false,showWeekends:false,weekendOpacity:8,weekendAutoHide:true,holidays:[],showHolidays:false,holidayOpacity:12,holidayColor:'#e5534b',holidayLabels:true,scheduleAroundNonWorking:true,defaultFolder:'',tttEnabled:false,tttMilestoneId:'',showFloat:false,schedulingMode:'manual',labelWidth:160,swimlanes:[{id:U.id(),name:'Swimlane 1',color:'#2C5F7C',height:120,subSwimlanes:[],collapsed:'expanded'}],items:[]}}

const App={
  proj:newProj(),sel:[],undoStack:[],redoStack:[],
  view:'timeline',panelOpen:false,panelPinned:false,editItem:null,
  _dirty:false,_dataDirty:false,_raf:null,_unsaved:false,
  _sortCol:null,_sortDir:'asc',
  _searchTerm:'',_searchMatches:[],_searchIdx:-1,_lastShiftSel:null,
  _fileHandle:null,_ctxDate:null,_ctxSubSwId:'',_ctxSubRow:0,_nudgeTimer:null,_nudgeSpeed:1,
  _lassoMode:false,_collapsedSl:new Set(),_pendingFit:false,

  init(){
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
     'project-name-text','unsaved-dot',
     'hide-label','ctx-link-dep',
     'help-body','np-template','np-name',
     'data-filter-bar','flt-name','flt-owner','flt-notes','flt-start','flt-end',
     'as-term','as-results',
    ].forEach(id=>{const el=document.getElementById(id);if(el)this.$[id.replace(/-/g,'_')]=el});
    this.loadAuto();this.migrate();
    this.applyTheme();this.bind();this.sched();if(this.proj.items.length)this._pendingFit=true;
    this.$.tl_body_scroll.addEventListener('scroll',()=>{
      this.$.tl_sl_labels.scrollTop=this.$.tl_body_scroll.scrollTop;
      this.$.tl_hdr_scroll.scrollLeft=this.$.tl_body_scroll.scrollLeft;
    });
  },

  migrate(){
    const p=this.proj;
    if(!p.theme)p.theme='default';if(p.autoRange==null)p.autoRange=true;
    if(p.locked==null)p.locked=false;if(p.hideMode==null)p.hideMode=false;
    if(p.headerLayers==null)p.headerLayers=2;if(p.fontSize==null)p.fontSize=11;
    if(!p.watermark)p.watermark=false;if(!p.wmDate)p.wmDate='';if(!p.wmPos)p.wmPos='bottom-center';
    if(p.showDeps==null)p.showDeps=true;if(p.showToday==null)p.showToday=true;
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
    if(p.labelWidth==null)p.labelWidth=160;
    p.swimlanes.forEach(sl=>{if(!sl.subSwimlanes)sl.subSwimlanes=[];if(!sl.height)sl.height=120;if(sl.collapsed===true)sl.collapsed='minimized';else if(!sl.collapsed||sl.collapsed===false)sl.collapsed='expanded';sl.subSwimlanes.forEach(ss=>{if(ss.height==null)ss.height=0;if(!ss.collapsed)ss.collapsed='expanded'})});
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
      this.$.project_name_text.textContent=this.proj.name||'Untitled';
      this._docTitle(this._unsaved);
      this.updateStatus();
      if(this._pendingFit){this._pendingFit=false;if(this.view==='timeline'||this.view==='split')requestAnimationFrame(()=>this.fitToContent())}
    })}
  },

  _docTitle(dirty){const n=this.proj?.name||'Timeline Studio';document.title=(dirty?'● ':'')+n+' — Timeline Studio'},
  markDirty(){this._unsaved=true;this.$.unsaved_dot.classList.remove('hidden');this._docTitle(true)},
  markClean(){this._unsaved=false;this.$.unsaved_dot.classList.add('hidden');this._docTitle(false)},
  snap(){this.undoStack.push(U.deep(this.proj));if(this.undoStack.length>40)this.undoStack.shift();this.redoStack=[];this.markDirty()},
  undo(){if(!this.undoStack.length)return;this.redoStack.push(U.deep(this.proj));this.proj=this.undoStack.pop();this.migrate();this.sched();this.refreshPanel();this.toast('Undone')},
  redo(){if(!this.redoStack.length)return;this.undoStack.push(U.deep(this.proj));this.proj=this.redoStack.pop();this.migrate();this.sched();this.refreshPanel();this.toast('Redone')},
  refreshPanel(){if(this.editItem&&this.sel.length===1){const it=this.gi(this.sel[0]);if(it){this.editItem=it;this.renderPanel(it)}}else if(this.sel.length>1)this.renderBulkPanel()},
  autoSave:U.deb(function(){try{localStorage.setItem('tls3',JSON.stringify(App.proj))}catch(e){}},400),
  loadAuto(){try{const s=localStorage.getItem('tls3');if(s)this.proj=JSON.parse(s)}catch(e){}},
  toast(m,t='success',dur=2200){const el=document.createElement('div');el.className=`toast toast-${t}`;el.textContent=m;const active=document.querySelectorAll('.toast');const offset=active.length*40;el.style.bottom=(18+offset)+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),dur)},

  async saveFile(saveAs=false){
    const data=JSON.stringify(this.proj,null,2);
    if(!saveAs&&this._fileHandle){try{const w=await this._fileHandle.createWritable();await w.write(data);await w.close();this.markClean();this.toast('Saved!');this.autoSave();return}catch(e){}}
    if(window.showSaveFilePicker){try{this._fileHandle=await window.showSaveFilePicker({suggestedName:(this.proj.name||'timeline')+'.tlproj',types:[{description:'Timeline Project',accept:{'application/json':['.tlproj','.json']}}]});const w=await this._fileHandle.createWritable();await w.write(data);await w.close();this.markClean();this.toast('Saved!');this.autoSave();return}catch(e){if(e.name==='AbortError')return}}
    const b=new Blob([data],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.tlproj';a.click();URL.revokeObjectURL(a.href);this.markClean();this.toast('Downloaded!');this.autoSave()
  },
  async openFile(){
    if(window.showOpenFilePicker){
      try{const[handle]=await window.showOpenFilePicker({types:[{description:'Timeline Project',accept:{'application/json':['.tlproj','.json']}}],multiple:false});
        const file=await handle.getFile();const text=await file.text();
        try{this.snap();this.proj=JSON.parse(text);this.migrate();this.applyTheme();this.sel=[];this._fileHandle=handle;this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();this.toast('Loaded!')}catch(err){this.toast('Invalid file','error')}
        return}catch(e){if(e.name==='AbortError')return}
    }
    this.$.file_input.click()
  },
  handleOpen(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{this.snap();this.proj=JSON.parse(ev.target.result);this.migrate();this.applyTheme();this.sel=[];this._fileHandle=null;this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();this.toast('Loaded!')}catch(err){this.toast('Invalid file','error')}};r.readAsText(f);e.target.value=''},
  newProjAct(){this.showModal('new-proj-modal');this.$.np_name.value='New Timeline';document.getElementById('np-template').value='blank'},
  createFromTemplate(){
    const tpl=document.getElementById('np-template').value,name=this.$.np_name.value.trim()||'New Timeline';
    if(tpl==='duplicate'){this.snap();const dup=U.deep(this.proj);dup.name=name+' (Copy)';this.proj=dup;this._fileHandle=null;this.sel=[];this.applyTheme();this.sched();if(this.proj.items.length)this._pendingFit=true;this.markDirty();document.getElementById('new-proj-modal').classList.add('hidden');this.toast('Duplicated!');return}
    if(this._unsaved&&!confirm('Unsaved changes will be lost.'))return;
    this.snap();
    if(tpl==='blank')this.proj=newProj();
    else if(tpl==='product-launch')this.proj=this.tplProductLaunch();
    else if(tpl==='software-dev')this.proj=this.tplSoftwareDev();
    else this.proj=newProj();
    this.proj.name=name;this._fileHandle=null;this.sel=[];this.applyTheme();this.sched();if(this.proj.items.length)this._pendingFit=true;this.markClean();
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
  showTT(el,text){clearTimeout(this._ttT);this._ttT=setTimeout(()=>{const tt=this.$.tooltip;tt.textContent=text;tt.classList.remove('hidden');const r=el.getBoundingClientRect();tt.style.left=Math.min(r.left,window.innerWidth-270)+'px';tt.style.top=(r.bottom+5)+'px';requestAnimationFrame(()=>tt.classList.add('visible'))},500)},
  hideTT(){clearTimeout(this._ttT);const tt=this.$.tooltip;tt.classList.remove('visible');setTimeout(()=>tt.classList.add('hidden'),150)},

  updateStatus(){
    const lb=document.getElementById('btn-lock'),hb=document.getElementById('btn-hide');
    if(lb)lb.innerHTML=this.proj.locked?'<span>🔒</span> <span id="lock-label">Locked</span>':'<span>🔓</span> <span id="lock-label">Unlocked</span>';
    const hl=document.getElementById('hide-label');if(hl)hl.textContent=this.proj.hideMode?'Hidden':'Visible';
    const sb=document.getElementById('sched-mode-badge');
    if(sb){sb.classList.toggle('hidden',this.proj.schedulingMode!=='scheduled');sb.onclick=()=>{this.showSettings();requestAnimationFrame(()=>{const sec=document.getElementById('sect-scheduling');if(sec)sec.scrollIntoView({behavior:'smooth',block:'start'})})}}
    const tsl=document.getElementById('toggle-sched-label');
    if(tsl)tsl.textContent=this.proj.schedulingMode==='scheduled'?'Switch to Manual':'Switch to Auto-Scheduled';
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
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!minLF||cand<minLF))minLF=cand;
          }else if(type==='SS'){
            // SS constrains pred START: LS(pred) = LS(succ) - lag
            const cand=this._addLagWorkingDays(sls,-lag,sdm);
            if(cand&&(!ssLS||cand<ssLS))ssLS=cand;
          }else if(type==='FF'){
            const sDur=s.type==='task'?Math.max(0,s.duration||0):0;
            let sLF;
            if(s.type==='task'&&this.proj.scheduleAroundNonWorking&&(s.durMode||'cal')!=='cal'){
              const sEndIncl=this._addWorkingDays(sls,sDur);
              sLF=U.addDays(sEndIncl,1);
            }else{sLF=U.addDays(sls,sDur)}
            const cand=this._addLagWorkingDays(sLF,-lag,sdm);
            if(cand&&(!minLF||cand<minLF))minLF=cand;
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
    on('btn-file-menu',()=>{this.closeAllDD();this.$.file_dropdown.classList.toggle('hidden');this.posDD(this.$.file_dropdown)});
    on('btn-new',()=>{this.$.file_dropdown.classList.add('hidden');this.newProjAct()});
    on('btn-open',()=>{this.$.file_dropdown.classList.add('hidden');this.openFile()});
    on('btn-save',()=>{this.$.file_dropdown.classList.add('hidden');this.saveFile()});
    on('btn-save-as',()=>{this.$.file_dropdown.classList.add('hidden');this._fileHandle=null;this.saveFile(true)});
    // Add dropdown
    on('btn-add-menu',()=>{this.closeAllDD();this.$.add_dropdown.classList.toggle('hidden');this.posDD(this.$.add_dropdown)});
    on('btn-add-ms',()=>{this.$.add_dropdown.classList.add('hidden');this.addItem('milestone')});
    on('btn-add-task',()=>{this.$.add_dropdown.classList.add('hidden');this.addItem('task')});
    on('btn-add-sw',()=>{this.$.add_dropdown.classList.add('hidden');this.showSwM()});
    on('btn-undo',()=>this.undo());on('btn-redo',()=>this.redo());
    // View dropdown
    on('btn-view-menu',()=>{this.closeAllDD();this.$.view_dropdown.classList.toggle('hidden');this.posDD(this.$.view_dropdown)});
    on('btn-today',()=>{this.$.view_dropdown.classList.add('hidden');this.goToday()});
    on('btn-fullscreen',()=>{this.$.view_dropdown.classList.add('hidden');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen().catch(()=>this.toast('Fullscreen not supported','error'))});
    on('btn-show-float',()=>{this.$.view_dropdown.classList.add('hidden');this.proj.showFloat=!this.proj.showFloat;document.getElementById('btn-show-float')?.classList.toggle('active',this.proj.showFloat);this.sched();this.autoSave();this.toast(this.proj.showFloat?'Float labels ON':'Float labels OFF')});
    on('btn-zoom100',()=>{this.proj.zoom=100;this.sched()});
    on('btn-fit',()=>this.fitToContent());
    on('btn-expand-all',()=>{this.snap();this.proj.swimlanes.forEach(sl=>{sl.collapsed='expanded';if(sl.subSwimlanes)sl.subSwimlanes.forEach(ss=>ss.collapsed='expanded')});this.sched();this.autoSave();this.toast('All swimlanes expanded')});
    on('btn-collapse-all',()=>{this.snap();this.proj.swimlanes.forEach(sl=>sl.collapsed='collapsed');this.sched();this.autoSave();this.toast('All swimlanes collapsed')});
    on('btn-zi',()=>this.doZoom(10));on('btn-zo',()=>this.doZoom(-10));
    this.$.zoom_lbl.addEventListener('wheel',e=>{e.preventDefault();this.doZoom(e.deltaY<0?5:-5)},{passive:false});
    /* Ctrl+Scroll zoom on timeline body: Ctrl=±5%, Ctrl+Shift=±1% */
    this.$.tl_body_scroll.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();const d=e.shiftKey?1:5;this.doZoom(e.deltaY<0?d:-d)},{passive:false});
    // Tools dropdown
    on('btn-tools-menu',()=>{this.closeAllDD();this.$.tools_dropdown.classList.toggle('hidden');this.posDD(this.$.tools_dropdown)});
    on('btn-settings',()=>this.showSettings());
    on('btn-help',()=>this.showHelp());
    on('btn-close-panel',()=>{if(this.panelPinned){this.panelPinned=false;document.getElementById('btn-pin').classList.remove('pinned')}this.panelOpen=false;this.editItem=null;this.$.props_panel.classList.add('panel-hidden')});
    on('btn-pin',()=>{this.panelPinned=!this.panelPinned;document.getElementById('btn-pin').classList.toggle('pinned',this.panelPinned)});
    on('btn-lock',()=>{this.$.tools_dropdown.classList.add('hidden');this.proj.locked=!this.proj.locked;this.proj.lockH=this.proj.locked;this.proj.lockV=this.proj.locked;this.sched();this.autoSave();this.toast(this.proj.locked?'Locked':'Unlocked')});
    on('btn-hide',()=>{this.$.tools_dropdown.classList.add('hidden');this.proj.hideMode=!this.proj.hideMode;this.sched();this.toast(this.proj.hideMode?'Hiding hidden':'Showing all')});
    on('btn-crit-path',()=>{this.$.tools_dropdown.classList.add('hidden');this.toggleCritPath()});
    on('btn-propagate-sel',()=>{this.$.tools_dropdown.classList.add('hidden');if(!this.sel.length){this.toast('Select items first','error');return}if(this.proj.schedulingMode==='scheduled'){this.toast('In Auto-Scheduled mode, dates update automatically','info');return}this.propagateFrom(this.sel)});
    on('btn-toggle-sched',()=>{this.$.tools_dropdown.classList.add('hidden');this.toggleSchedulingMode()});
    on('btn-lasso',()=>{this.$.tools_dropdown.classList.add('hidden');this._lassoMode=!this._lassoMode;document.getElementById('btn-lasso')?.classList.toggle('active',this._lassoMode);this.$.tl_body.classList.toggle('lasso-mode',this._lassoMode);this.toast(this._lassoMode?'Lasso mode ON — click and drag':'Lasso mode OFF')});
    // Screenshot items
    on('btn-snap-vp',()=>{this.$.tools_dropdown.classList.add('hidden');this.copyScreenshot(true)});
    on('btn-snap-full',()=>{this.$.tools_dropdown.classList.add('hidden');this.copyScreenshot(false)});
    document.querySelectorAll('.view-btn').forEach(b=>{b.onclick=()=>this.setView(b.dataset.view)});
    this.$.ts_sel.onchange=e=>{this.snap();this.proj.timescale=e.target.value;this.sched()};
    this.$.hl_sel.onchange=e=>{this.snap();this.proj.headerLayers=+e.target.value;this.sched()};
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
    on('btn-add-ssw',()=>this.addSubSw());on('btn-dt-paste',()=>this.showPaste());on('btn-do-paste',()=>this.doPaste());
    this.$.paste_ta.oninput=()=>this.previewPaste();
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
    on('btn-dt-filter',()=>{this.$.data_filter_bar.classList.toggle('hidden')});
    const fltKeys=['flt_name','flt_owner','flt_notes','flt_start','flt_end'];
    const updateFltInd=()=>{let count=0;fltKeys.forEach(k=>{if(this.$[k]){const has=!!this.$[k].value;this.$[k].classList.toggle('has-value',has);if(has)count++}});const fb=document.getElementById('btn-dt-filter');if(fb){let badge=fb.querySelector('.filter-count');if(count>0){if(!badge){badge=document.createElement('span');badge.className='filter-count';fb.appendChild(badge)}badge.textContent=count}else if(badge)badge.remove()}};
    const fltDeb=U.deb(()=>{this.sched(false,true);updateFltInd()},200);
    fltKeys.forEach(k=>{if(this.$[k])this.$[k].oninput=fltDeb});
    on('btn-flt-clear',()=>{fltKeys.forEach(k=>{if(this.$[k])this.$[k].value=''});updateFltInd();this.sched(false,true)});
    // Settings toggles
    document.getElementById('project-name-display').addEventListener('dblclick',()=>{document.getElementById('pn-name').value=this.proj.name;this.showModal('pname-modal');document.getElementById('pn-name').focus()});
    on('btn-pn-save',()=>{this.snap();this.proj.name=document.getElementById('pn-name').value.trim()||'Untitled';document.getElementById('pname-modal').classList.add('hidden');this.sched();this.autoSave()});
    document.getElementById('s-watermark').onchange=function(){document.getElementById('watermark-opts').classList.toggle('hidden',!this.checked)};
    document.getElementById('s-show-weekends').onchange=function(){document.getElementById('weekend-opts').classList.toggle('hidden',!this.checked)};
    document.getElementById('s-show-holidays').onchange=function(){document.getElementById('holiday-opts').classList.toggle('hidden',!this.checked)};
    const holOpSlider=document.getElementById('s-hol-opacity');if(holOpSlider)holOpSlider.oninput=function(){document.getElementById('s-hol-opval').textContent=this.value+'%'};
    document.getElementById('btn-hol-add').onclick=()=>{const box=document.getElementById('hol-add-box');box.classList.toggle('hidden');if(!box.classList.contains('hidden')){document.getElementById('hol-import-box').classList.add('hidden');document.getElementById('hol-add-name').value='';document.getElementById('hol-add-start').value='';document.getElementById('hol-add-end').value='';document.getElementById('hol-add-name').focus()}};
    document.getElementById('btn-hol-do-add').onclick=()=>this.addSingleHoliday();
    document.getElementById('hol-add-name').addEventListener('keydown',e=>{if(e.key==='Enter')this.addSingleHoliday()});
    document.getElementById('hol-add-end').addEventListener('keydown',e=>{if(e.key==='Enter')this.addSingleHoliday()});
    document.getElementById('btn-hol-import').onclick=()=>{const box=document.getElementById('hol-import-box');box.classList.toggle('hidden');if(!box.classList.contains('hidden')){document.getElementById('hol-add-box').classList.add('hidden');document.getElementById('hol-paste-ta').focus()}};
    document.getElementById('btn-hol-clear').onclick=()=>{if(confirm('Remove all holidays?')){this.snap();this.proj.holidays=[];this.renderHolList();this._recalcNonWorkingDays();this.sched();this.autoSave()}};
    document.getElementById('btn-hol-do-import').onclick=()=>this.importHolidays();
    document.getElementById('hol-paste-ta').oninput=()=>{const r=this.parseHolidays(document.getElementById('hol-paste-ta').value);document.getElementById('hol-paste-prev').textContent=r.length?`Found ${r.length} holiday${r.length>1?'s':''}`:''};
    const opSlider=document.getElementById('s-wknd-opacity');if(opSlider)opSlider.oninput=function(){document.getElementById('s-wknd-opval').textContent=this.value+'%'};
    document.querySelectorAll('.theme-card').forEach(c=>{c.onclick=()=>{document.querySelectorAll('.theme-card').forEach(x=>x.classList.remove('active'));c.classList.add('active')}});
    document.querySelectorAll('[data-close-modal]').forEach(b=>{b.onclick=e=>e.target.closest('.modal')?.classList.add('hidden')});
    document.querySelectorAll('.modal-overlay').forEach(el=>{el.onclick=()=>el.closest('.modal')?.classList.add('hidden')});
    document.addEventListener('click',e=>{
      if(!e.target.closest('#ctx-menu'))this.$.ctx_menu.classList.add('hidden');
      if(!e.target.closest('#dt-ctx-menu'))this.$.dt_ctx_menu.classList.add('hidden');
      if(!e.target.closest('.save-btn-group')){this.closeAllDD()}
    });
    this.$.ctx_menu.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(a&&!e.target.closest('.ctx-disabled'))this.ctxAct(a);this.$.ctx_menu.classList.add('hidden')});
    // DT context menu
    this.$.dt_ctx_menu.addEventListener('click',e=>{const a=e.target.closest('[data-dtact]')?.dataset.dtact;if(a)this.dtCtxAct(a);this.$.dt_ctx_menu.classList.add('hidden')});
    // Keyboard
    document.addEventListener('keydown',e=>{
      const c=e.ctrlKey||e.metaKey;const inp=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      if(c&&e.key==='z'){e.preventDefault();this.undo()}
      else if(c&&e.key==='y'){e.preventDefault();this.redo()}
      else if(c&&e.shiftKey&&(e.key==='s'||e.key==='S')){e.preventDefault();this.saveFile(true)}
      else if(c&&e.key==='s'){e.preventDefault();this.saveFile()}
      else if(c&&e.key==='n'){e.preventDefault();this.newProjAct()}
      else if(c&&e.key==='o'){e.preventDefault();this.openFile()}
      else if(c&&e.shiftKey&&(e.key==='p'||e.key==='P')&&this.sel.length&&!inp){e.preventDefault();if(this.proj.schedulingMode!=='scheduled')this.propagateFrom(this.sel)}
      else if(c&&e.shiftKey&&(e.key==='f'||e.key==='F')&&!inp){e.preventDefault();this.fitToContent()}
      else if(e.altKey&&e.key==='1'&&!inp){e.preventDefault();this.fitToContent()}
      else if(c&&(e.key==='a'||e.key==='A')&&!inp&&(this.view==='timeline'||this.view==='split')){e.preventDefault();const items=this.proj.hideMode?this.proj.items.filter(i=>!i.hidden):this.proj.items;this.sel=items.map(i=>i.id);if(this.sel.length>1)this.openBulkPanel();this.sched();this.toast(`Selected ${this.sel.length} item${this.sel.length===1?'':'s'}`)}
      else if(e.key==='Delete'&&this.sel.length&&!inp)this.deleteSel();
      else if(e.key==='Escape'){this.sel=[];if(!this.panelPinned)this.closePanel();this.$.ctx_menu.classList.add('hidden');this.$.dt_ctx_menu.classList.add('hidden');document.querySelectorAll('.modal:not(.hidden)').forEach(m=>m.classList.add('hidden'));if(this._lassoMode){this._lassoMode=false;document.getElementById('btn-lasso')?.classList.remove('active');this.$.tl_body.classList.remove('lasso-mode')}this.sched()}
      else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&this.sel.length&&!inp){
        e.preventDefault();if(this.proj.locked){if(!this._lockToastT||Date.now()-this._lockToastT>2000){this.toast('🔒 Locked — unlock to move items','info',1500);this._lockToastT=Date.now()}}else this.nudge(e.key,c)}
    });
    document.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){this._nudgeSpeed=1}});
    document.addEventListener('paste',e=>{if(this.view==='data'||this.view==='split'){const t=document.activeElement;if(t&&['INPUT','TEXTAREA','SELECT'].includes(t.tagName))return;const txt=e.clipboardData.getData('text/plain');if(txt.includes('\t')||txt.includes('\n')){e.preventDefault();this.showPaste();setTimeout(()=>{this.$.paste_ta.value=txt;this.previewPaste()},80)}}});
    window.addEventListener('beforeunload',e=>{if(this._unsaved){e.preventDefault();e.returnValue=''}});
    this.$.tl_body.addEventListener('mousedown',e=>this.onTlMD(e));
    this.$.tl_body.addEventListener('contextmenu',e=>this.onTlCtx(e));
    this.$.tl_body.addEventListener('dblclick',e=>{const iEl=e.target.closest('.tl-item');if(iEl){const it=this.gi(iEl.dataset.iid);if(it)this.openPanel(it)}});
    this.$.tl_sl_labels.addEventListener('dblclick',e=>{const lbl=e.target.closest('.sl-lbl');if(lbl){const sl=this.gs(lbl.dataset.slId);if(sl)this.showSwM(sl)}});
    // Hidden indicator click — expand collapsed swimlane
    this.$.tl_sl_labels.addEventListener('click',e=>{const ind=e.target.closest('.sl-hidden-indicator');if(ind){e.stopPropagation();const sl=this.gs(ind.dataset.slId);if(sl){this.snap();sl.collapsed='expanded';this.sched();this.autoSave()}return}const ssBtn=e.target.closest('.ss-collapse-btn');if(ssBtn){e.stopPropagation();const sl=this.gs(ssBtn.dataset.slId);if(!sl)return;const ss=sl.subSwimlanes.find(s=>s.id===ssBtn.dataset.ssId);if(!ss)return;this.snap();ss.collapsed=ss.collapsed==='minimized'?'expanded':'minimized';if(ss.collapsed==='expanded'&&sl.collapsed!=='expanded')sl.collapsed='expanded';if(sl.subSwimlanes.every(s=>s.collapsed==='minimized'))sl.collapsed='minimized';this.sched();this.autoSave();return}const btn=e.target.closest('.sl-collapse-btn');if(btn){e.stopPropagation();const sl=this.gs(btn.dataset.slId);if(sl){this.snap();const action=btn.dataset.action;if(action==='expand')sl.collapsed='expanded';else if(action==='hide')sl.collapsed='collapsed';else sl.collapsed='minimized';this.sched();this.autoSave()}}});
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
    if(this.proj.locked){if(!this._lockToastT||Date.now()-this._lockToastT>2000){this.toast('🔒 Locked — unlock to move items','info',1500);this._lockToastT=Date.now()}return}
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
    this.view=v;document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
    const tc=this.$.tl_container,dc=this.$.data_container,mc=this.$.main_content;
    mc.classList.remove('split-view');tc.classList.remove('view-active','view-hidden');dc.classList.remove('view-active','view-hidden');
    if(v==='timeline'){tc.classList.add('view-active');dc.classList.add('view-hidden')}
    else if(v==='data'){tc.classList.add('view-hidden');dc.classList.add('view-active');if(!this.panelPinned)this.closePanel()}
    else{mc.classList.add('split-view');tc.classList.add('view-active');dc.classList.add('view-active')}
    this.sched()
  },
  doZoom(d){this.proj.zoom=U.clamp((this.proj.zoom||100)+d,30,300);this.sched()},
  closeAllDD(){['file_dropdown','add_dropdown','view_dropdown','tools_dropdown'].forEach(k=>{if(this.$[k])this.$[k].classList.add('hidden')})},
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
    const nameW=this._mt(it.name||'',fs,'600');
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
    const vpW=bs.clientWidth;
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
    const newZoom=U.clamp(Math.round(z*100),30,300);
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
  goToday(){const tl=this.met();const x=this.dX(U.iso(new Date()),tl);if(x!==null)this.$.tl_body_scroll.scrollLeft=x-this.$.tl_body_scroll.clientWidth/2},
  showModal(id){document.getElementById(id).classList.remove('hidden')},
  gi(id){return this.proj.items.find(i=>i.id===id)},
  gs(id){return this.proj.swimlanes.find(s=>s.id===id)},

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
    const it={id:U.id(),type,name:type==='milestone'?'New Milestone':'New Task',swimlaneId:sl.id,subSwimId:subSwId,subRow,color:COLORS[this.proj.items.length%COLORS.length],iconType:'triangle',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:'',vLine:{enabled:false,style:'dashed',color:'#999999',direction:'both',extent:'swim'}};
    if(type==='milestone')it.date=d;else{it.startDate=d;it.duration=14;it.durMode='work';it.endDate=this._calcEndDate(it)}
    this.proj.items.push(it);this.sel=[it.id];this.openPanel(it);
    if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave()
  },
  deleteSel(){if(!this.sel.length)return;this.snap();const s=new Set(this.sel);this.proj.items.forEach(i=>i.deps=(i.deps||[]).filter(d=>!s.has(this.depId(d))));this.proj.items=this.proj.items.filter(i=>!s.has(i.id));this.sel=[];this.closePanel();this.sched();this.autoSave()},
  dupSel(){if(!this.sel.length)return;this.snap();const ns=[];this.sel.forEach(id=>{const o=this.gi(id);if(!o)return;const c=U.deep(o);c.id=U.id();c.name+=' (copy)';c.subRow=(o.subRow||0)+1;c.deps=[];ns.push(c)});this.proj.items.push(...ns);this.sel=ns.map(i=>i.id);this.sched();this.autoSave()},
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
              const t=parseFloat(d.style.top)||0;dividers.push(t)
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
    // Toggle propagate vs auto-schedule label
    const isScheduled=this.proj.schedulingMode==='scheduled';
    const cp=document.getElementById('ctx-propagate'),ca=document.getElementById('ctx-sched-auto');
    if(cp)cp.classList.toggle('hidden',isScheduled);if(ca)ca.classList.toggle('hidden',!isScheduled);
    const m=this.$.ctx_menu;m.classList.remove('hidden');m.style.left=Math.min(e.clientX,window.innerWidth-210)+'px';m.style.top=Math.min(e.clientY,window.innerHeight-400)+'px'
  },

  ctxAct(a){
    const it=this.sel.length===1?this.gi(this.sel[0]):null;
    switch(a){
      case'edit':if(it)this.openPanel(it);else if(this.sel.length>1)this.openBulkPanel();break;
      case'duplicate':this.dupSel();break;case'delete':this.deleteSel();break;
      case'add-ms-here':this.addItem('milestone',this._ctxDate,this._ctxSlId,this._ctxSubSwId,this._ctxSubRow);break;
      case'add-task-here':this.addItem('task',this._ctxDate,this._ctxSlId,this._ctxSubSwId,this._ctxSubRow);break;
      case'link-dep':this.linkDepFromSel();break;
      case'toggle-hidden':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.hidden=!i.hidden});this.sched();this.autoSave();break;
      case'toggle-pin':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.pinned=!i.pinned});this.sched();this.autoSave();break;
      case'propagate':this.propagateFrom(this.sel);break;
      case'clear-deps':this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.deps=[]});this.sched();this.autoSave();break;
      case'auto-arrange':this.autoArrange(this.sel.length?'selection':'all');break;
      case'lp-left':case'lp-right':case'lp-top':case'lp-bottom':case'lp-center':
        this.snap();this.sel.forEach(id=>{const i=this.gi(id);if(i)i.labelPosition=a.slice(3)});this.sched();this.autoSave();break;
    }
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
    else if(a==='toggle-hidden')it.hidden=!it.hidden;
    this.sched();this.autoSave();if(this.editItem&&this.editItem.id===id)this.renderPanel(it);
  },


  /* ===== SWIMLANE MODAL ===== */
  _esl:null,_tmpSubs:[],
  showSwM(sl=null){
    this._esl=sl;this.$.sw_modal_title.textContent=sl?'Edit Swimlane':'Add Swimlane';
    this.$.sw_name.value=sl?sl.name:'';this.$.sw_color.value=sl?sl.color:COLORS[this.proj.swimlanes.length%COLORS.length];
    document.getElementById('btn-del-sw').classList.toggle('hidden',!sl);
    this._tmpSubs=sl?sl.subSwimlanes.map(s=>({...s})):[];this.renderSSW();
    const pe=document.getElementById('sw-color-pre');
    if(pe){pe.innerHTML=COLORS.slice(0,10).map(c=>`<div class="cs" style="background:${c}" data-c="${c}"></div>`).join('');pe.querySelectorAll('.cs').forEach(s=>{s.onclick=()=>this.$.sw_color.value=s.dataset.c})}
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
  addSubSw(){
    if(this._tmpSubs.length===0&&this._esl){
      const defId=U.id();this._tmpSubs.push({id:defId,name:this._esl.name+' (Default)',height:0,collapsed:'expanded'});
      this.proj.items.filter(i=>i.swimlaneId===this._esl.id&&!i.subSwimId).forEach(i=>i.subSwimId=defId);
    }
    this._tmpSubs.push({id:U.id(),name:'Sub-lane '+(this._tmpSubs.length+1),height:0,collapsed:'expanded'});this.renderSSW()
  },
  saveSwM(){
    this.snap();const name=this.$.sw_name.value.trim()||'Untitled';const color=this.$.sw_color.value;
    const subs=this._tmpSubs.filter(s=>s.name.trim()).map(s=>({id:s.id,name:s.name.trim(),height:s.height||0,collapsed:s.collapsed||'expanded'}));
    if(this._esl){this._esl.name=name;this._esl.color=color;this._esl.subSwimlanes=subs}
    else this.proj.swimlanes.push({id:U.id(),name,color,height:120,subSwimlanes:subs,collapsed:'expanded'});
    document.getElementById('sw-modal').classList.add('hidden');this.sched();this.autoSave()
  },
  delSwM(){if(!this._esl||!confirm(`Delete "${this._esl.name}"?`))return;this.snap();const sid=this._esl.id;this.proj.items=this.proj.items.filter(i=>i.swimlaneId!==sid);this.proj.swimlanes=this.proj.swimlanes.filter(s=>s.id!==sid);document.getElementById('sw-modal').classList.add('hidden');this.sched();this.autoSave()},
  reorderSw(dir){
    if(!this._esl)return;const idx=this.proj.swimlanes.indexOf(this._esl);
    const ni=idx+dir;if(ni<0||ni>=this.proj.swimlanes.length)return;
    this.snap();[this.proj.swimlanes[idx],this.proj.swimlanes[ni]]=[this.proj.swimlanes[ni],this.proj.swimlanes[idx]];
    this.sched();this.autoSave();this.toast('Reordered')
  },

  showSettings(){
    const p=this.proj;this.$.s_name.value=p.name;this.$.s_owner.value=p.owner||'';
    this.$.s_start.value=p.timelineStart;this.$.s_end.value=p.timelineEnd;
    this.$.s_auto_range.checked=p.autoRange;this.$.s_today.checked=p.showToday;this.$.s_deps.checked=p.showDeps;
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
    document.getElementById('weekend-opts').classList.toggle('hidden',!p.showWeekends);
    document.getElementById('s-wknd-opacity').value=p.weekendOpacity||8;
    document.getElementById('s-wknd-opval').textContent=(p.weekendOpacity||8)+'%';
    document.getElementById('s-wknd-auto').checked=p.weekendAutoHide!==false;
    document.getElementById('s-show-holidays').checked=p.showHolidays;
    document.getElementById('holiday-opts').classList.toggle('hidden',!p.showHolidays);
    document.getElementById('s-hol-color').value=p.holidayColor||'#e5534b';
    document.getElementById('s-hol-opacity').value=p.holidayOpacity||12;
    document.getElementById('s-hol-opval').textContent=(p.holidayOpacity||12)+'%';
    document.getElementById('s-hol-labels').checked=p.holidayLabels!==false;
    document.getElementById('s-sched-around').checked=p.scheduleAroundNonWorking!==false;
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
    if(tttChk){tttChk.checked=p.tttEnabled;tttOpts.style.display=p.tttEnabled?'':'none';
      tttChk.onchange=function(){tttOpts.style.display=this.checked?'':'none'}}
    if(tttSel){tttSel.innerHTML='<option value="">— Select —</option>'+p.items.filter(i=>i.type==='milestone').map(i=>`<option value="${i.id}" ${i.id===p.tttMilestoneId?'selected':''}>${U.esc(i.name)}</option>`).join('')}
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
    this.showModal('settings-modal');
    /* Settings nav: scroll-to-top, click-to-jump, scroll-spy */
    const sContent=document.getElementById('settings-content');
    const sNav=document.getElementById('settings-nav');
    if(sContent)sContent.scrollTop=0;
    if(sNav){
      /* Reset active to first link */
      sNav.querySelectorAll('a').forEach((a,i)=>a.classList.toggle('active',i===0));
      /* Click-to-jump */
      sNav.querySelectorAll('a').forEach(a=>{a.onclick=e=>{e.preventDefault();const tgt=document.querySelector(a.getAttribute('href'));if(tgt&&sContent)tgt.scrollIntoView({behavior:'smooth',block:'start'})}});
      /* Scroll-spy via IntersectionObserver */
      if(this._settingsObs)this._settingsObs.disconnect();
      const sections=sContent.querySelectorAll('.settings-section[id]');
      this._settingsObs=new IntersectionObserver(entries=>{
        let topId=null,topR=Infinity;
        sections.forEach(s=>{const r=s.getBoundingClientRect();const cR=sContent.getBoundingClientRect();const rel=r.top-cR.top;if(rel<cR.height*0.35&&rel>-r.height&&rel<topR){topR=rel;topId=s.id}});
        if(topId){sNav.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+topId))}
      },{root:sContent,threshold:0,rootMargin:'-10% 0px -60% 0px'});
      sections.forEach(s=>this._settingsObs.observe(s));
    }
  },
  applySettings(){
    this.snap();const p=this.proj;p.name=this.$.s_name.value;p.owner=this.$.s_owner.value;
    p.timelineStart=this.$.s_start.value;p.timelineEnd=this.$.s_end.value;
    p.autoRange=this.$.s_auto_range.checked;p.showToday=this.$.s_today.checked;p.showDeps=this.$.s_deps.checked;
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
    p.watermark=this.$.s_watermark.checked;p.wmDate=this.$.s_wm_date.value;p.wmPos=this.$.s_wm_pos.value;
    p.wmShowOwner=document.getElementById('s-wm-owner').checked;
    const dfEl=document.getElementById('s-default-folder');if(dfEl)p.defaultFolder=dfEl.value.trim();
    const tttChk=document.getElementById('s-ttt-enabled');if(tttChk)p.tttEnabled=tttChk.checked;
    const tttSel=document.getElementById('s-ttt-milestone');if(tttSel)p.tttMilestoneId=tttSel.value;
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
    this.proj.timelineStart=U.iso(mn);this.proj.timelineEnd=U.iso(mx)
  },

  showPaste(){this.$.paste_sw.innerHTML=this.proj.swimlanes.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');this.$.paste_ta.value='';this.$.paste_prev.textContent='';this.showModal('paste-modal');this.$.paste_ta.focus()},
  previewPaste(){const r=this.parsePaste(this.$.paste_ta.value);this.$.paste_prev.textContent=r.length?`Found ${r.length} items`:''},
  parsePaste(text){return text.trim().split('\n').filter(l=>l.trim()).map(line=>{const c=line.split('\t').map(s=>s.trim());if(c.length<2||!c[0])return null;if(c.length>=3){const d1=U.parseDate(c[1]),d2=U.parseDate(c[2]);if(d1&&d2)return{name:c[0],type:'task',startDate:U.iso(d1),endDate:U.iso(d2)};if(d1)return{name:c[0],type:'milestone',date:U.iso(d1)}}if(c.length>=2){const d=U.parseDate(c[1]);if(d)return{name:c[0],type:'milestone',date:U.iso(d)}}return null}).filter(Boolean)},
  doPaste(){const rows=this.parsePaste(this.$.paste_ta.value);if(!rows.length){this.toast('No valid data','error');return}this.snap();const tgt=this.$.paste_sw.value;rows.forEach((r,i)=>{const it={id:U.id(),type:r.type,name:r.name,swimlaneId:tgt,subSwimId:'',subRow:i%3,color:COLORS[i%COLORS.length],iconType:'triangle',labelPosition:'right',showDate:true,showDuration:false,showOwner:false,durationFmt:'days',showStartDate:false,showEndDate:false,textColor:'',edgeTextColor:'',dateFormat:'',deps:[],progress:0,pinned:false,hidden:false,duration:null,fontSize:0,owner:'',notes:''};if(r.type==='milestone')it.date=r.date;else{it.startDate=r.startDate;it.endDate=r.endDate;it.duration=U.days(r.startDate,r.endDate)+1}this.proj.items.push(it)});if(this.proj.autoRange)this.autoRange();document.getElementById('paste-modal').classList.add('hidden');this.sched();this.autoSave();this.toast(`Imported ${rows.length} items`)},

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

  /* ===== PANEL ===== */
  openPanel(it){this.editItem=it;this.panelOpen=true;this.$.props_panel.classList.remove('panel-hidden');this.$.panel_title.textContent=it.type==='milestone'?'Milestone':'Task';this.renderPanel(it)},
  openBulkPanel(){this.panelOpen=true;this.$.props_panel.classList.remove('panel-hidden');this.$.panel_title.textContent=`Bulk Edit (${this.sel.length})`;this.renderBulkPanel()},
  closePanel(){if(this.panelPinned)return;this.panelOpen=false;this.editItem=null;this.$.props_panel.classList.add('panel-hidden')},

  renderBulkPanel(){
    const items=this.sel.map(id=>this.gi(id)).filter(Boolean);if(!items.length)return;
    const first=items[0];
    let h=`<div class="ps"><div class="ps-t">Bulk Edit — ${items.length} items</div>
      <div class="pr"><label>Color</label><div class="pcr"><input type="color" id="bp-clr" class="pci" value="${first.color}"><div class="color-presets-h">${COLORS.slice(0,10).map(c=>`<div class="cs" style="background:${c}" data-c="${c}"></div>`).join('')}</div></div></div>
      <div class="pr"><label>Text Color</label><div class="pcr"><input type="color" id="bp-tc" class="pci" value="${first.textColor||'#1a1a1a'}"><div class="color-presets-h">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="tc"></div>`).join('')}</div></div></div>
      <div class="pr"><label>Font Size (0 = global)</label><input type="number" id="bp-fs" value="${first.fontSize||0}" min="0" max="20"></div>
      <div class="pr"><label>Label Pos</label><div class="lp-grid"><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="top">T</div><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="left">L</div><div class="lp-btn" data-v="center">M</div><div class="lp-btn" data-v="right">R</div><div class="lp-btn" data-v=""></div><div class="lp-btn" data-v="bottom">B</div><div class="lp-btn" data-v=""></div></div></div>`;
    if(items.some(i=>i.type==='milestone'))h+=`<div class="pr"><label>Icon</label><div class="icon-grid">${ICONS.map(ic=>`<button class="ic-btn" data-ic="${ic.id}" title="${ic.l}"><svg width="14" height="14" viewBox="0 0 24 24" fill="${first.color}"><path d="${ic.p}"/></svg></button>`).join('')}</div></div>`;
    h+=`<div class="pr"><label><input type="checkbox" id="bp-hidden" ${items.every(i=>i.hidden)?'checked':''}> Hidden</label></div>
      <div class="pr"><label><input type="checkbox" id="bp-pin" ${items.every(i=>i.pinned)?'checked':''}> 📌 Pin Date</label>
        <div style="font-size:9.5px;color:var(--tx3);margin-top:2px;line-height:1.4">Pinned items are protected from Propagate and auto-scheduling.</div></div>
      <div class="pr"><label>Date Format</label><select id="bp-df"><option value="">Global</option>${['MMM D, YYYY','MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','M/D','MMM D'].map(f=>`<option value="${f}">${f}</option>`).join('')}</select></div>
    </div>`;
    this.$.panel_body.innerHTML=h;
    const up=fn=>{this.snap();items.forEach(fn);this.sched();this.autoSave()};
    const q=id=>document.getElementById(id);
    q('bp-clr').oninput=function(){up(i=>i.color=this.value)};
    q('bp-tc').oninput=function(){up(i=>i.textColor=this.value)};
    q('bp-fs').onchange=function(){up(i=>i.fontSize=+this.value)};
    q('bp-hidden').onchange=function(){up(i=>i.hidden=this.checked)};
    q('bp-pin').onchange=function(){up(i=>i.pinned=this.checked)};
    q('bp-df').onchange=function(){up(i=>i.dateFormat=this.value)};
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
    tg.forEach(t=>{if(ck('ap-color'))t.color=it.color;if(ck('ap-icon'))t.iconType=it.iconType;if(ck('ap-lp'))t.labelPosition=it.labelPosition;if(ck('ap-sd')){t.showDate=it.showDate;t.showDuration=it.showDuration;t.showOwner=it.showOwner}if(ck('ap-tc'))t.textColor=it.textColor;if(ck('ap-df'))t.dateFormat=it.dateFormat;if(ck('ap-fs'))t.fontSize=it.fontSize;if(ck('ap-hid'))t.hidden=it.hidden;if(ck('ap-dl'))t.pinned=it.pinned});
    document.getElementById('apply-modal').classList.add('hidden');this.sched();this.autoSave();this.toast('Applied!')},

  renderPanel(it){
    const p=this.proj,sl=this.gs(it.swimlaneId),subSws=sl?.subSwimlanes||[];
    const gfs=it.fontSize||p.fontSize||11;
    let h=`<div class="ps"><div class="ps-t">General</div>
      <div class="pr"><label>Name</label><input type="text" id="pp-nm" value="${U.esc(it.name)}"></div>
      <div class="pr"><label>Owner</label><input type="text" id="pp-owner" value="${U.esc(it.owner||'')}" placeholder="Responsible person"></div>
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
    if(it.type==='task')h+=`<div class="pr"><label>Edge Text Color</label><div class="pcr"><input type="color" id="pp-etc" class="pci" value="${it.edgeTextColor||'#5a6577'}">${TEXT_COLORS.slice(0,8).map(c=>`<div class="cs" style="background:${c}" data-c="${c}" data-f="etc"></div>`).join('')}</div></div>`;
    h+=`<div class="pr"><label>Font Size (0 = global: ${p.fontSize}px)</label><input type="number" id="pp-fs" value="${gfs}" min="0" max="20"></div>`;
    if(it.type==='milestone')h+=`<div class="pr"><label>Icon</label><div class="icon-grid">${ICONS.map(ic=>`<button class="ic-btn ${ic.id===it.iconType?'active':''}" data-ic="${ic.id}" title="${ic.l}"><svg width="14" height="14" viewBox="0 0 24 24" fill="${it.color}"><path d="${ic.p}"/></svg></button>`).join('')}</div></div>`;
    h+=`<div class="pr"><label>Label Pos</label><div class="lp-grid"><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='top'?'active':''}" data-v="top">T</div><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='left'?'active':''}" data-v="left">L</div><div class="lp-btn ${it.labelPosition==='center'?'active':''}" data-v="center">M</div><div class="lp-btn ${it.labelPosition==='right'?'active':''}" data-v="right">R</div><div class="lp-btn" data-v=""></div><div class="lp-btn ${it.labelPosition==='bottom'?'active':''}" data-v="bottom">B</div><div class="lp-btn" data-v=""></div></div></div></div>`;

    h+=`<div class="ps"><div class="ps-t">Date Display</div>
      <div class="pr"><label>Format</label><select id="pp-df"><option value="">Global (${p.dateFormat.startsWith('custom:')?p.dateFormat.slice(7):p.dateFormat})</option>${['MMM D, YYYY','MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD','M/D','MMM D'].map(f=>`<option value="${f}" ${f===it.dateFormat?'selected':''}>${f}</option>`).join('')}</select></div>
      <div class="pr"><label><input type="checkbox" id="pp-sd" ${it.showDate!==false?'checked':''}> Show Date Label</label></div>`;
    if(it.type==='task')h+=`<div class="pr"><label><input type="checkbox" id="pp-ssd" ${it.showStartDate?'checked':''}> Start Date (left edge)</label></div><div class="pr"><label><input type="checkbox" id="pp-sed" ${it.showEndDate?'checked':''}> End Date (right edge)</label></div><div class="pr"><label><input type="checkbox" id="pp-sdur" ${it.showDuration?'checked':''}> Duration</label></div><div class="pr"><label><input type="checkbox" id="pp-sown" ${it.showOwner?'checked':''}> Owner</label></div><div class="pr"><label>Dur Fmt</label><select id="pp-durfmt"><option value="days" ${it.durationFmt==='days'?'selected':''}>Days</option><option value="weeks" ${it.durationFmt==='weeks'?'selected':''}>Weeks</option><option value="months" ${it.durationFmt==='months'?'selected':''}>Months</option></select></div>`;
    else h+=`<div class="pr"><label><input type="checkbox" id="pp-sown" ${it.showOwner?'checked':''}> Owner</label></div>`;
    h+=`</div>`;

    const cd=it.deps||[];
    const cdIds=cd.map(d=>this.depId(d));
    const hasSuccs=p.items.some(s=>(s.deps||[]).some(d=>this.depId(d)===it.id));
    h+=`<div class="ps"><div class="ps-t">Dependencies</div>`;
    if(!cd.length&&!hasSuccs)h+=`<div style="font-size:9.5px;color:var(--tx3);margin-bottom:6px;line-height:1.4">No dependencies yet. Add a predecessor below, or multi-select items on the timeline (Ctrl+click) and right-click → <em>Link Dependency</em>.</div>`;
    if(cd.length){
      h+=`<div class="pr"><label>Predecessors</label><div class="dep-list">${cd.map((d,di)=>{const dep=this.gi(this.depId(d));if(!dep)return'';const type=this.depType(d),lag=this.depLag(d);return`<div class="dep-chip"><span class="dep-chip-name">${U.esc(dep.name)}</span><select class="dep-chip-type" data-di="${di}" title="Dependency type: FS (Finish→Start), SS (Start→Start), FF (Finish→Finish)"><option value="FS" ${type==='FS'?'selected':''}>FS</option><option value="SS" ${type==='SS'?'selected':''}>SS</option><option value="FF" ${type==='FF'?'selected':''}>FF</option></select><input type="number" class="dep-chip-lag" data-di="${di}" value="${lag}" title="Lag in days: positive = gap, negative = overlap" style="width:38px"><button class="dep-chip-x" data-di="${di}" title="Remove">&times;</button></div>`}).join('')}</div></div>`;
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

    h+=`<div class="prop-btn-row">`;
    if(it.subSwimId)h+=`<button class="pab" id="pp-asub">→ Sub-Lane</button>`;
    h+=`<button class="pab" id="pp-asl">→ Swimlane</button><button class="pab" id="pp-aall">→ All</button></div>`;

    this.$.panel_body.innerHTML=h;this.bindPanel(it)
  },

  bindPanel(it){
    const up=fn=>{this.snap();fn();this.sched();this.autoSave()};const q=id=>document.getElementById(id);
    q('pp-nm').oninput=function(){it.name=this.value;App.sched();App.autoSave()};
    q('pp-owner').oninput=function(){it.owner=this.value;App.autoSave()};
    q('pp-notes').oninput=function(){it.notes=this.value;App.autoSave()};
    q('pp-sl').onchange=function(){up(()=>{it.swimlaneId=this.value;it.subSwimId=''});App.renderPanel(it)};
    q('pp-ssw')?.addEventListener('change',function(){up(()=>it.subSwimId=this.value)});
    q('pp-date')?.addEventListener('change',function(){up(()=>it.date=this.value);if(App.proj.autoRange)App.autoRange()});
    if(it.type==='task'){
      const recalc=(changed)=>{
        const isWork=App.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work';
        if(changed==='start'){
          if(it.endDate){
            it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
            q('pp-dur').value=it.duration}
        }else if(changed==='end'){
          if(it.startDate){
            it.duration=isWork?App._countWorkingDays(it.startDate,U.addDays(it.endDate,1)):(U.days(it.startDate,it.endDate)+1);
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
        App.sched();App.autoSave();if(App.proj.autoRange)App.autoRange()
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
    q('pp-hidden').onchange=function(){up(()=>it.hidden=this.checked)};
    q('pp-clr').oninput=function(){it.color=this.value;App.sched();App.autoSave()};
    q('pp-tc').oninput=function(){it.textColor=this.value;App.sched();App.autoSave()};
    q('pp-etc')?.addEventListener('input',function(){it.edgeTextColor=this.value;App.sched();App.autoSave()});
    q('pp-fs').onchange=function(){up(()=>it.fontSize=+this.value)};
    q('pp-df').onchange=function(){up(()=>it.dateFormat=this.value)};
    q('pp-sd').onchange=function(){up(()=>it.showDate=this.checked)};
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
  },

  /* ===== TIMELINE METRICS ===== */
  met(){
    const p=this.proj,start=new Date(p.timelineStart+'T12:00:00'),end=new Date(p.timelineEnd+'T12:00:00'),z=(p.zoom||100)/100;
    const cols=[],cur=new Date(start);
    if(p.timescale==='weeks'){cur.setDate(cur.getDate()-cur.getDay());while(cur<=end){const sat=new Date(+cur+6*864e5);cols.push({label:'W'+Math.ceil(((cur-new Date(cur.getFullYear(),0,1))/864e5+1)/7),start:U.iso(cur),end:U.iso(sat),year:sat.getFullYear(),month:sat.getMonth(),quarter:Math.floor(sat.getMonth()/3)+1});cur.setDate(cur.getDate()+7)}}
    else if(p.timescale==='months'){cur.setDate(1);while(cur<=end){cols.push({label:cur.toLocaleDateString('en',{month:'short'}),start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),cur.getMonth()+1,0)),year:cur.getFullYear(),month:cur.getMonth(),quarter:Math.floor(cur.getMonth()/3)+1});cur.setMonth(cur.getMonth()+1)}}
    else if(p.timescale==='quarters'){cur.setMonth(Math.floor(cur.getMonth()/3)*3);cur.setDate(1);while(cur<=end){const q=Math.floor(cur.getMonth()/3)+1;cols.push({label:`Q${q}`,start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),cur.getMonth()+3,0)),year:cur.getFullYear(),quarter:q});cur.setMonth(cur.getMonth()+3)}}
    else{cur.setMonth(0);cur.setDate(1);while(cur<=end){cols.push({label:String(cur.getFullYear()),start:U.iso(cur),end:`${cur.getFullYear()}-12-31`,year:cur.getFullYear()});cur.setFullYear(cur.getFullYear()+1)}}
    const cw=({weeks:60,months:100,quarters:200,years:400}[p.timescale]||100)*z;
    return{start,end,cols,cw,tw:cols.length*cw,z}
  },
  dX(ds,tl){if(!ds||!tl.cols.length)return null;const d=new Date(ds+'T12:00:00');
    for(let i=0;i<tl.cols.length;i++){const c=tl.cols[i],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
      if(d>=cs&&d<=ce){const cd=Math.max(1,U.days(c.start,c.end)+1);return i*tl.cw+(U.days(c.start,ds)/cd)*tl.cw}}
    const f=tl.cols[0],l=tl.cols[tl.cols.length-1];
    if(d<new Date(f.start+'T12:00:00')){const cd=Math.max(1,U.days(f.start,f.end)+1);return -(U.days(ds,f.start)/cd)*tl.cw}
    const cd=Math.max(1,U.days(l.start,l.end)+1);return(tl.cols.length-1)*tl.cw+(U.days(l.start,ds)/cd)*tl.cw},
  /* dXEnd: pixel position at the END of a day (for task bar right edges) */
  dXEnd(ds,tl){return this.dX(U.addDays(ds,1),tl)},
  /* dXMid: pixel position at the CENTER of a day (for milestone icons) */
  dXMid(ds,tl){const a=this.dX(ds,tl),b=this.dX(U.addDays(ds,1),tl);return(a!=null&&b!=null)?(a+b)/2:a},
  xD(x,tl){if(!tl.cols.length)return U.iso(tl.start);const ci=Math.floor(x/tl.cw),frac=(x-ci*tl.cw)/tl.cw;
    const col=tl.cols[U.clamp(ci,0,tl.cols.length-1)];if(!col)return U.iso(tl.start);
    const cd=Math.max(1,U.days(col.start,col.end)+1);return U.addDays(col.start,Math.round(frac*cd))},

  buildHdrRows(tl){
    const layers=this.proj.headerLayers||2,ts=this.proj.timescale,rows=[];
    const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
    if(layers>=3&&(ts==='weeks'||ts==='months')){
      if(ts==='weeks'){
        rows.push(buildBoundaryRow(
          (d,first)=>{const y=first?d.getFullYear():d.getFullYear()+1;return new Date(y+(first?1:0),0,1)},
          d=>String(d.getFullYear())
        ));
      }else{const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
    }
    if(layers>=2){
      if(ts==='weeks'){
        rows.push(buildBoundaryRow(
          (d,first)=>{const m=first?d.getMonth()+1:d.getMonth()+1;return new Date(d.getFullYear(),m,1)},
          d=>MN[d.getMonth()]
        ));
      }
      else if(ts==='months'){const g=[];let cq=null,cn=0;tl.cols.forEach(c=>{const k=c.year+'-Q'+c.quarter;if(k!==cq){if(cq!==null)g.push({label:cq.split('-')[1]+' '+cq.split('-')[0],span:cn});cq=k;cn=1}else cn++});if(cq!==null)g.push({label:cq.split('-')[1]+' '+cq.split('-')[0],span:cn});rows.push(g)}
      else if(ts==='quarters'){const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
    }
    rows.push(tl.cols.map(c=>({label:c.label,span:1})));return rows
  },

  renderTL(){
    const tl=this.met(),p=this.proj,th=this.getTheme(),rH=38;
    document.documentElement.style.setProperty('--sl-w',(p.labelWidth||160)+'px');
    this.$.tl_container.style.background=th.bg;
    if(this._lassoMode)this.$.tl_body.style.cursor='crosshair';else this.$.tl_body.style.cursor='';
    const hc=th.hdr,hR=this.buildHdrRows(tl),rowH=22,totalHdrH=hR.length*rowH;
    this.$.tl_hdr_corner.style.height=totalHdrH+'px';this.$.tl_hdr_corner.style.background=hc;
    let hh='';hR.forEach(row=>{hh+=`<div class="th-row" style="background:${hc}">`;row.forEach(cell=>{const w=cell.width!=null?cell.width:cell.span*tl.cw;hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px">${cell.label}</div>`});hh+=`</div>`});
    this.$.tl_hdr.style.width=tl.tw+'px';this.$.tl_hdr.innerHTML=hh;
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
      labelsH+=`<div class="sl-lbl${isMinimized?' collapsed':''}" data-sl-id="${sl.id}" style="background:${sl.color};height:${totalH}px" title="Double-click to edit">`;
      if(isMinimized){labelsH+=`<button class="sl-collapse-btn sl-btn-expand" data-sl-id="${sl.id}" data-action="expand" title="Expand">▶</button>`;labelsH+=`<button class="sl-collapse-btn sl-btn-hide" data-sl-id="${sl.id}" data-action="hide" title="Hide">✕</button>`}else{labelsH+=`<button class="sl-collapse-btn" data-sl-id="${sl.id}" title="Minimize">▼</button>`}
      if(!isCollapsed&&hasSubs){const mainW=Math.min(60,(p.labelWidth||160)/2);const availH=totalH-12;let mfs=12;const tw=this._mt(sl.name,12,'700');if(tw>availH&&availH>0){mfs=Math.max(8,Math.floor(12*availH/tw))}labelsH+=`<div class="sl-lbl-main" style="width:${mainW}px;min-width:${mainW}px;writing-mode:vertical-rl;text-orientation:mixed;transform:rotate(180deg);font-size:${mfs}px">${U.esc(sl.name)}</div><div class="sl-lbl-subs">`;for(let smi=0;smi<subMeta.length;smi++){const{ssId,h,minimized}=subMeta[smi];const ss=sl.subSwimlanes.find(s=>s.id===ssId);const nm=ss?U.esc(ss.name):'';const icon=minimized?'&#9654;':'&#9660;';labelsH+=`<div class="sl-sub-lbl${minimized?' ss-minimized':''}" style="height:${h}px"><span class="ss-name">${nm}</span><button class="ss-collapse-btn" data-sl-id="${sl.id}" data-ss-id="${ssId}" title="${minimized?'Expand':'Minimize'}">${icon}</button></div>`}labelsH+=`</div>`}
      else labelsH+=`<div class="sl-lbl-main" style="flex:1;padding-left:20px">${U.esc(sl.name)}</div>`;
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
            const clr=it.id===p.tttMilestoneId?'#2ea043':'#e5534b';
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
            const dayX=ci*tl.cw+(dayIdx/numDays)*tl.cw;
            const dayW=tl.cw/numDays;
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
    if(p.showToday){const tx=this.dX(U.iso(new Date()),tl);if(tx!==null&&tx>=0&&tx<=tl.tw)bodyH+=`<div class="today-marker" style="left:${tx}px"><div class="today-marker-tri"></div><div class="today-marker-lbl">Today</div></div>`}
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
    this.$.tl_sl_labels.innerHTML=labelsH;this.$.tl_body.innerHTML=bodyH;this.$.tl_body.style.width=tl.tw+'px';
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
      wm.style.cssText=css}else this.$.tl_watermark.classList.add('hidden');
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
    const isT=it.type==='task',sel=this.sel.includes(it.id),fmt=it.dateFormat||this.proj.dateFormat;
    const fs=it.fontSize||this.proj.fontSize||11;
    const tc=it.textColor||th.tlTx,etc=it.edgeTextColor||th.tlTx2;
    let x,w;if(isT){x=this.dX(it.startDate,tl);const x2=this.dXEnd(it.endDate,tl);w=Math.max(8,(x2||0)-(x||0))}else{x=this.dXMid(it.date,tl);w=16}
    if(x===null)return'';const y=yOff+6+(it.subRow||0)*rH,left=x-(isT?0:8);
    let cls='tl-item';if(sel)cls+=' selected';if(it.pinned)cls+=' item-pinned';if(violatedIds.has(it.id))cls+=' dep-error';if(it.hidden)cls+=' item-hidden';if(critIds&&critIds.has(it.id))cls+=' crit-path';
    let dateStr='';
    if(isT){const parts=[];const hasOwner=it.showOwner&&it.owner;const hasDur=it.showDuration;const durTxt=hasDur?this._fmtDurLabel(it):'';if(hasOwner&&hasDur)parts.push(it.owner+' ('+durTxt+')');else if(hasOwner)parts.push(it.owner);else if(hasDur)parts.push(durTxt);dateStr=parts.join(' ')||''}else if(it.showDate!==false){const hasOwner=it.showOwner&&it.owner;dateStr=U.fmt(it.date,fmt);if(hasOwner)dateStr=it.owner+(dateStr?' · '+dateStr:'')}
    let h=`<div class="${cls}" data-iid="${it.id}" style="left:${left}px;top:${y}px;${isT?'width:'+w+'px':''}">`;
    if(isT){
      h+=`<div class="tl-task-bar" style="background:${it.color};width:${w}px">`;
      if(it.progress>0){h+=`<div class="tl-task-prog" style="width:${it.progress}%"></div>`;if(w>30)h+=`<div class="tl-task-pct">${it.progress}%</div>`}
      if(!this.proj.locked){h+=`<div class="tl-task-rs tl-task-rs-l" data-iid="${it.id}" data-side="left"></div><div class="tl-task-rs tl-task-rs-r" data-iid="${it.id}" data-side="right"></div>`}
      h+=`</div>`;
      if(it.showStartDate)h+=`<div class="tl-edge-label tl-edge-left" style="color:${etc};font-size:${Math.max(8,fs-1)}px">${U.fmt(it.startDate,fmt)}</div>`;
      if(it.showEndDate)h+=`<div class="tl-edge-label tl-edge-right" style="color:${etc};font-size:${Math.max(8,fs-1)}px">${U.fmt(it.endDate,fmt)}</div>`;
    }else{const ic=ICONS.find(i=>i.id===it.iconType)||ICONS[0];h+=`<div class="tl-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="${it.color}" stroke="${it.color}" stroke-width="0.5"><path d="${ic.p}"/></svg></div>`}
    if(it.pinned)h+=`<div class="tl-pin-badge">📌</div>`;
    const lp=it.labelPosition||'right';
    h+=`<div class="tl-label tl-label-${lp}"><span class="tl-name" style="color:${tc};font-size:${fs}px">${U.esc(it.name)}</span>`;
    if(dateStr)h+=`<span class="tl-date" style="color:${tc};font-size:${Math.max(8,fs-1.5)}px">${dateStr}</span>`;
    h+=`</div></div>`;return h
  },

  rDeps(tl){const svg=document.getElementById('dep-svg');if(!svg)return;const body=this.$.tl_body,bR=body.getBoundingClientRect();const L=[];
    for(const it of this.proj.items){if(!it.deps?.length)continue;
      for(const d of it.deps){const did=this.depId(d),lag=this.depLag(d),dtype=this.depType(d);
        const sE=body.querySelector(`[data-iid="${did}"]`),tE=body.querySelector(`[data-iid="${it.id}"]`);if(!sE||!tE)continue;
        const sr=sE.getBoundingClientRect(),tr=tE.getBoundingClientRect();
        // Attachment points based on link type
        let sx,sy,tx,ty;
        if(dtype==='SS'){sx=sr.left-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.left-bR.left;ty=tr.top+tr.height/2-bR.top}
        else if(dtype==='FF'){sx=sr.right-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.right-bR.left;ty=tr.top+tr.height/2-bR.top}
        else{sx=sr.right-bR.left;sy=sr.top+sr.height/2-bR.top;tx=tr.left-bR.left;ty=tr.top+tr.height/2-bR.top}
        // Check if this link is violated
        let violated=false;const iStart=it.type==='task'?it.startDate:it.date;const pred=this.gi(did);
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
    this.closeAllDD();this.$.ctx_menu.classList.add('hidden');this.$.dt_ctx_menu.classList.add('hidden');
    if((e.altKey||this._lassoMode||(e.ctrlKey&&!e.target.closest('.tl-item')))&&!this.proj.locked){e.preventDefault();e.stopPropagation();this.startLasso(e);return}
    const rh=e.target.closest('.tl-task-rs');if(rh&&!this.proj.locked){this.startTR(e,rh);return}const iEl=e.target.closest('.tl-item');if(iEl){const id=iEl.dataset.iid;if(e.ctrlKey||e.metaKey){const idx=this.sel.indexOf(id);if(idx>=0)this.sel.splice(idx,1);else this.sel.push(id)}else if(!this.sel.includes(id))this.sel=[id];
    if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();
    const it=this.gi(id);if(it&&!this.proj.locked)this.startDrag(e,it,iEl);this.sched();return}
    if(!e.target.closest('.sl-rh')&&!e.ctrlKey&&!e.metaKey){this.sel=[];if(!this.panelPinned)this.closePanel();this.sched()}},
  onTlCtx(e){const iEl=e.target.closest('.tl-item');if(iEl)this.showCtx(e,iEl.dataset.iid);else{e.preventDefault();this.sel=[];this.showCtx(e,null)}},

  startDrag(e,it,el){const tl=this.met(),sx=e.clientX,sy=e.clientY;
    // Gather all selected item elements and their original positions
    const dragItems=this.sel.map(id=>{const itemEl=this.$.tl_body.querySelector(`[data-iid="${id}"]`);const item=this.gi(id);if(!itemEl||!item)return null;return{id,el:itemEl,item,oL:parseInt(itemEl.style.left),oT:parseInt(itemEl.style.top)}}).filter(Boolean);
    if(!dragItems.length)return;
    let dr=false;
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!dr&&(Math.abs(dx)>3||Math.abs(dy)>3)){dr=true;dragItems.forEach(d=>d.el.classList.add('dragging'));this.snap()}if(dr){dragItems.forEach(d=>{if(!this.proj.lockH)d.el.style.left=(d.oL+dx)+'px';if(!this.proj.lockV)d.el.style.top=(d.oT+dy)+'px'})}};
    const up=ev=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);dragItems.forEach(d=>d.el.classList.remove('dragging'));if(dr){
      dragItems.forEach(d=>{
        const nL=parseInt(d.el.style.left),nT=parseInt(d.el.style.top),nx=nL+(d.item.type==='milestone'?8:0),nd=this.xD(nx,tl);
        if(!this.proj.lockH){if(d.item.type==='milestone')d.item.date=nd;else{d.item.startDate=nd;d.item.endDate=this._calcEndDate(d.item)}}
        if(!this.proj.lockV){
          // Determine target swimlane from the primary dragged item's final position
          if(d.id===it.id){document.querySelectorAll('.sw-row').forEach(slEl=>{const r=slEl.getBoundingClientRect();if(ev.clientY>=r.top&&ev.clientY<=r.bottom&&slEl.dataset.slId){dragItems.forEach(dd=>dd.item.swimlaneId=slEl.dataset.slId)}})}
          d.item.subRow=Math.max(0,Math.round((nT-6)/38));
        }
      });
      if(this.proj.autoRange)this.autoRange();
      // Scheduled mode: snap back items that were dragged earlier than their calculated position
      if(this.proj.schedulingMode==='scheduled'){
        dragItems.forEach(d=>{
          if(!d.item.deps?.length||d.item.pinned)return; // root or pinned — keep
          const earliest=this._computeEarliestStart(d.item);
          if(!earliest)return;
          const curStart=d.item.type==='task'?d.item.startDate:d.item.date;
          if(curStart<earliest){
            // Dragged earlier than allowed — snap back
            if(d.item.type==='task'){d.item.startDate=earliest;d.item.endDate=this._calcEndDate(d.item)}
            else d.item.date=earliest;
            this.toast('Snapped to calculated position','info')
          }else if(curStart>earliest){
            // Dragged later — implicitly pin
            d.item.pinned=true;
            this.toast('Item pinned at new date','info')
          }
        });
      }
      this.sched();this.autoSave();this.refreshPanel()}};
    document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)},

  startTR(e,rh){e.stopPropagation();e.preventDefault();const iid=rh.dataset.iid,side=rh.dataset.side,it=this.gi(iid);if(!it)return;
    // Block resize for work-mode tasks — calendar math would corrupt working-day duration
    if(this.proj.scheduleAroundNonWorking&&(it.durMode||'cal')==='work'){
      this.toast('Work-mode tasks can\'t be resized by dragging — use the Duration field instead','info');return}
    const tl=this.met(),sx=e.clientX,oS=it.startDate,oE=it.endDate;this.snap();const mv=ev=>{const dx=ev.clientX-sx,dayD=Math.round((dx/tl.tw)*U.days(tl.start,tl.end));if(side==='left'){it.startDate=U.addDays(oS,dayD);if(U.days(it.startDate,it.endDate)<0)it.startDate=it.endDate}else{it.endDate=U.addDays(oE,dayD);if(U.days(it.startDate,it.endDate)<0)it.endDate=it.startDate}it.duration=U.days(it.startDate,it.endDate)+1;this.sched(true,false);this.refreshPanel()};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave();this.refreshPanel()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)},

  bindRH(){document.querySelectorAll('.sl-rh').forEach(h=>{h.onmousedown=e=>{e.preventDefault();const sl=this.gs(h.dataset.slId);if(!sl)return;const slEl=h.closest('.sw-row'),lblEl=this.$.tl_sl_labels.querySelector(`[data-sl-id="${sl.id}"]`);const sY=e.clientY,sH=slEl.offsetHeight;const hasSubs=sl.subSwimlanes?.length>0&&sl.collapsed==='expanded';const lastSs=hasSubs?sl.subSwimlanes[sl.subSwimlanes.length-1]:null;const startLastH=lastSs?(lastSs.height||50):0;const mv=ev=>{const nh=Math.max(50,sH+ev.clientY-sY);if(hasSubs&&lastSs){lastSs.height=Math.max(50,startLastH+ev.clientY-sY)}else{sl.height=nh}slEl.style.height=nh+'px';if(lblEl)lblEl.style.height=nh+'px';this.sched(true,false)};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);this.sched();this.autoSave()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}});document.querySelectorAll('.sub-rh').forEach(h=>{h.onmousedown=e=>{e.preventDefault();e.stopPropagation();const sl=this.gs(h.dataset.slId);if(!sl)return;const ss=sl.subSwimlanes.find(s=>s.id===h.dataset.ssId);if(!ss)return;const sY=e.clientY,startH=ss.height||50;const mv=ev=>{ss.height=Math.max(50,startH+ev.clientY-sY);this.sched(true,false)};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);this.sched();this.autoSave()};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)}})},

  async copyScreenshot(viewportOnly=false){try{const typeLabel=viewportOnly?'Viewport':'Full timeline';this.toast('Generating '+typeLabel+'…');const svg=this.buildExportSVG(viewportOnly);const img=new Image();const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const dpr=Math.max(2,window.devicePixelRatio||2);img.onload=async()=>{const c=document.createElement('canvas');c.width=img.naturalWidth*dpr;c.height=img.naturalHeight*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.drawImage(img,0,0);try{const b=await new Promise(r=>c.toBlob(r,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':b})]);this.toast(typeLabel+' copied to clipboard!')}catch(err){this.toast('Copy failed','error')}URL.revokeObjectURL(url)};img.onerror=()=>{this.toast('Failed','error');URL.revokeObjectURL(url)};img.src=url}catch(err){this.toast('Not supported','error')}},

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
            const dayX=ci*tl.cw+(dayIdx/numDays)*tl.cw-vpX+lw;
            const dayW=tl.cw/numDays;
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
        if(it.type==='task'){
          const ix=this.dX(it.startDate,tl),ix2=this.dXEnd(it.endDate,tl),w=Math.max(8,(ix2||0)-(ix||0)),iy=itemY,barH=22;
          const renderX=lw+ix-vpX;
          if(viewportOnly&&(renderX+w<lw-20||renderX>W+20)){continue}
          /* Task bar */
          svg+=`<rect x="${renderX}" y="${iy}" width="${w}" height="${barH}" rx="4" fill="${it.color}" opacity="${0.85*itemOp}"/>`;
          svgItemXMap.set(it.id,{left:renderX,right:renderX+w,midY:iy+barH/2});
          /* Progress fill */
          if(it.progress>0){const pw=w*(it.progress/100);svg+=`<rect x="${renderX}" y="${iy}" width="${pw}" height="${barH}" rx="4" fill="${it.color}" opacity="${0.45*itemOp}"/>`;if(w>30)svg+=`<text x="${renderX+w/2}" y="${iy+barH/2+4}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" opacity="${0.9*itemOp}">${it.progress}%</text>`}
          /* Edge date labels */
          if(it.showStartDate)svg+=`<text x="${renderX-4}" y="${iy+barH/2+fs*0.3}" fill="${etc}" font-size="${Math.max(8,fs-1)}" text-anchor="end" opacity="${itemOp}">${U.fmt(it.startDate,fmt)}</text>`;
          if(it.showEndDate)svg+=`<text x="${renderX+w+4}" y="${iy+barH/2+fs*0.3}" fill="${etc}" font-size="${Math.max(8,fs-1)}" opacity="${itemOp}">${U.fmt(it.endDate,fmt)}</text>`;
          /* Name + secondary label */
          const lp=it.labelPosition||'right';
          const midY=iy+barH/2+fs*0.35;
          let dateStr='';
          {const parts=[];const hasOwner=it.showOwner&&it.owner;const hasDur=it.showDuration;const durTxt=hasDur?this._fmtDurLabel(it):'';if(hasOwner&&hasDur)parts.push(it.owner+' ('+durTxt+')');else if(hasOwner)parts.push(it.owner);else if(hasDur)parts.push(durTxt);dateStr=parts.join(' ')||''}
          if(lp==='right'){
            svg+=`<text x="${renderX+w+6}" y="${dateStr?midY-fs*0.35:midY}" fill="${tc}" font-size="${fs}" font-weight="600" opacity="${itemOp}">${U.esc(it.name)}</text>`;
            if(dateStr)svg+=`<text x="${renderX+w+6}" y="${midY+fs*0.55}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='left'){
            svg+=`<text x="${renderX-6}" y="${dateStr?midY-fs*0.35:midY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}">${U.esc(it.name)}</text>`;
            if(dateStr)svg+=`<text x="${renderX-6}" y="${midY+fs*0.55}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="end" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='top'){
            svg+=`<text x="${renderX+w/2}" y="${iy-4-(dateStr?fs:0)}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`;
            if(dateStr)svg+=`<text x="${renderX+w/2}" y="${iy-4}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else if(lp==='bottom'){
            svg+=`<text x="${renderX+w/2}" y="${iy+barH+fs+2}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`;
            if(dateStr)svg+=`<text x="${renderX+w/2}" y="${iy+barH+fs*2+2}" fill="${tc}" font-size="${Math.max(8,fs-1.5)}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`;
          }else{
            svg+=`<text x="${renderX+w/2}" y="${midY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`;
          }
        }else{
          /* Milestone */
          const ix=this.dXMid(it.date,tl),iy=itemY,iconH=16;const ic=ICONS.find(i=>i.id===it.iconType)||ICONS[0];
          const renderX=lw+ix-vpX;
          if(viewportOnly&&(renderX<lw-80||renderX>W+80)){continue}
          svg+=`<g transform="translate(${renderX-8},${iy})" opacity="${itemOp}"><svg width="16" height="16" viewBox="0 0 24 24"><path d="${ic.p}" fill="${it.color}"/></svg></g>`;
          svgItemXMap.set(it.id,{left:renderX-8,right:renderX+8,midY:iy+iconH/2});
          const lp=it.labelPosition||'right';
          const mMidY=iy+iconH/2+fs*0.35;
          let dateStr='';
          if(it.showDate!==false){const hasOwner=it.showOwner&&it.owner;dateStr=U.fmt(it.date,f);if(hasOwner)dateStr=it.owner+(dateStr?' · '+dateStr:'')}
          if(lp==='right'){svg+=`<text x="${renderX+12}" y="${dateStr?iy+fs*0.8:mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" opacity="${itemOp}">${U.esc(it.name)}</text>`;if(dateStr)svg+=`<text x="${renderX+12}" y="${iy+fs*0.8+fs}" fill="${tc}" font-size="${fs-1}" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='left'){svg+=`<text x="${renderX-12}" y="${dateStr?iy+fs*0.8:mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="end" opacity="${itemOp}">${U.esc(it.name)}</text>`;if(dateStr)svg+=`<text x="${renderX-12}" y="${iy+fs*0.8+fs}" fill="${tc}" font-size="${fs-1}" text-anchor="end" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='top'){svg+=`<text x="${renderX}" y="${iy-4-(dateStr?fs:0)}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`;if(dateStr)svg+=`<text x="${renderX}" y="${iy-4}" fill="${tc}" font-size="${fs-1}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else if(lp==='bottom'){svg+=`<text x="${renderX}" y="${iy+iconH+fs+2}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`;if(dateStr)svg+=`<text x="${renderX}" y="${iy+iconH+fs*2+2}" fill="${tc}" font-size="${fs-1}" text-anchor="middle" opacity="${0.6*itemOp}">${U.esc(dateStr)}</text>`}
          else{svg+=`<text x="${renderX}" y="${mMidY}" fill="${tc}" font-size="${fs}" font-weight="600" text-anchor="middle" opacity="${itemOp}">${U.esc(it.name)}</text>`}
        }
        /* Collect vertical line data */
        if(it.vLine?.enabled){const vx=it.type==='task'?this.dX(it.startDate,tl):this.dXMid(it.date,tl);if(vx!==null)svgVLines.push({x:lw+vx-vpX,vLine:it.vLine,slY:rowTop,slH:h,subY:subYOff,subH:sub.h,iy:subYOff+6+(it.subRow||0)*rH})}
        }
          subYOff+=sub.h;
        }
      }yO+=h}
    /* Dependency arrows */
    if(p.showDeps){
      for(const it of p.items){if(!it.deps?.length)continue;
        if(p.hideMode&&it.hidden)continue;
        const tPos=svgItemXMap.get(it.id);if(!tPos)continue;
        for(const d of it.deps){const did=this.depId(d),lag=this.depLag(d),dtype=this.depType(d);
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
          const clr=it.id===p.tttMilestoneId?'#2ea043':'#e5534b';
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
        const availH=h-12;const wrapLines=this._wrapText(sl.name,availH>0?availH:h,11,'600');const nLines=wrapLines.length||1;let mfs=11;if(nLines===1){const tw=this._mt(sl.name,11,'600');if(tw>availH&&availH>0)mfs=Math.max(8,Math.round(11*availH/tw))}
        const lh=mfs*1.2;const totalTH=nLines*lh;const cx=mainW/2,cy=rowTop+h/2;
        let vtxt=`<g transform="rotate(-90,${cx},${cy})"><text fill="#fff" font-size="${mfs}" font-weight="600" text-anchor="middle">`;
        for(let li=0;li<nLines;li++){const ly=cy-totalTH/2+lh/2+li*lh;vtxt+=`<tspan x="${cx}" y="${ly}" dominant-baseline="central">${U.esc(wrapLines[li])}</tspan>`}
        vtxt+=`</text></g>`;svg+=vtxt;
        let subY=0;for(let si=0;si<subs.length;si++){const sub=subs[si];
          const ss=sl.subSwimlanes.find(s=>s.id===sub.ssId);
          if(ss){if(sub.minimized){svg+=`<text x="${mainW+subW/2}" fill="#fff" font-size="8" font-weight="500" text-anchor="middle" opacity="0.5"><tspan x="${mainW+subW/2}" y="${rowTop+subY+10}" dominant-baseline="central">${U.esc(ss.name)}</tspan></text>`}else{svg+=this._svgText(ss.name,mainW+subW/2,rowTop+subY,subW,sub.h,9.5,'500','opacity="0.85"')}}
          subY+=sub.h}
      }else{
        svg+=this._svgText(sl.name,lw/2,rowTop,lw,h,12,'600','')}
    }yO+=h}
    /* Header rows */
    let hdrY=0;
    hR.forEach(row=>{let hx=lw;svg+=`<rect x="${lw}" y="${hdrY}" width="${vpW}" height="${rowHH}" fill="${th.hdr}"/>`;
      row.forEach(cell=>{const cw=cell.width!=null?cell.width:cell.span*tl.cw,cx=hx-vpX;if(cx+cw>lw&&cx<lw+vpW){svg+=`<text x="${cx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="10.5" font-weight="600" text-anchor="middle">${cell.label}</text>`;svg+=`<line x1="${cx+cw}" y1="${hdrY}" x2="${cx+cw}" y2="${hdrY+rowHH}" stroke="rgba(255,255,255,0.1)"/>`}hx+=cw});
      svg+=`<line x1="${lw}" y1="${hdrY+rowHH}" x2="${lw+vpW}" y2="${hdrY+rowHH}" stroke="rgba(255,255,255,0.1)"/>`;hdrY+=rowHH});
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
  renderDT(){
    const p=this.proj;
    const cols=[{k:'_cb',l:'',w:52},{k:'name',l:'Name',w:160},{k:'owner',l:'Owner',w:90},{k:'type',l:'Type',w:55},{k:'startDate',l:'Start',w:100},{k:'endDate',l:'End',w:100},{k:'duration',l:'Dur',w:50},{k:'swimlaneId',l:'Lane',w:90},{k:'subSwimId',l:'Sub',w:75},{k:'color',l:'',w:28},{k:'subRow',l:'Row',w:34},{k:'deps',l:'Dep',w:32},{k:'progress',l:'%',w:36},{k:'pinned',l:'📌',w:28},{k:'hidden',l:'👁',w:28},{k:'notes',l:'Notes',w:120}];
    const sc=this._sortCol,sd=this._sortDir;
    /* Build visible item ids first so header checkbox can reflect state */
    const visibleIds=[];
    const fltName=(this.$.flt_name?.value||'').toLowerCase();
    const fltOwner=(this.$.flt_owner?.value||'').toLowerCase();
    const fltNotes=(this.$.flt_notes?.value||'').toLowerCase();
    const fltStart=this.$.flt_start?.value||'';
    const fltEnd=this.$.flt_end?.value||'';
    const gv=(it,k)=>{if(k==='startDate')return it.type==='milestone'?(it.date||''):(it.startDate||'');if(k==='deps')return(it.deps||[]).length;if(k==='duration')return it.duration||0;if(k==='owner')return it.owner||'';if(k==='notes')return it.notes||'';if(k==='pinned')return it.pinned?1:0;return it[k]||''};
    for(const sl of p.swimlanes){
      let slItems=p.items.filter(i=>i.swimlaneId===sl.id);
      if(fltName||fltOwner||fltNotes||fltStart||fltEnd){
        slItems=slItems.filter(it=>{
          if(fltName&&!it.name.toLowerCase().includes(fltName))return false;
          if(fltOwner&&!(it.owner||'').toLowerCase().includes(fltOwner))return false;
          if(fltNotes&&!(it.notes||'').toLowerCase().includes(fltNotes))return false;
          if(fltStart&&(it.date||it.startDate||'')<fltStart)return false;
          if(fltEnd&&(it.endDate||it.date||'')>fltEnd)return false;
          return true;
        });
      }
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
      if(fltName||fltOwner||fltNotes||fltStart||fltEnd){
        slItems=slItems.filter(it=>{
          if(fltName&&!it.name.toLowerCase().includes(fltName))return false;
          if(fltOwner&&!(it.owner||'').toLowerCase().includes(fltOwner))return false;
          if(fltNotes&&!(it.notes||'').toLowerCase().includes(fltNotes))return false;
          if(fltStart&&(it.date||it.startDate||'')<fltStart)return false;
          if(fltEnd&&(it.endDate||it.date||'')>fltEnd)return false;
          return true;
        });
      }
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
        if(e.shiftKey&&this._lastShiftSel){
          const allIds=[...this.$.dt_body.querySelectorAll('tr[data-iid]')].map(r=>r.dataset.iid);
          const i1=allIds.indexOf(this._lastShiftSel),i2=allIds.indexOf(rid);
          if(i1>=0&&i2>=0){const lo=Math.min(i1,i2),hi=Math.max(i1,i2);
            for(let i=lo;i<=hi;i++)if(!this.sel.includes(allIds[i]))this.sel.push(allIds[i]);
            this.sched();return}
        }
        if(t.checked){if(!this.sel.includes(rid))this.sel.push(rid)}else this.sel=this.sel.filter(x=>x!==rid);
        this._lastShiftSel=rid;
        if(this.sel.length===1){const it=this.gi(this.sel[0]);if(it)this.openPanel(it)}else if(this.sel.length>1)this.openBulkPanel();
        this.sched();return
      }
      if(t.classList.contains('dt-pin')){const it=this.gi(t.dataset.id);if(it){this.snap();it.pinned=t.checked;this.sched();this.autoSave()}return}
      if(t.classList.contains('dt-hid')){const it=this.gi(t.dataset.id);if(it){this.snap();it.hidden=t.checked;this.sched();this.autoSave()}return}
      if(!id||!f)return;const it=this.gi(id);if(!it)return;const val=t.type==='number'?+t.value:t.value;
      this.snap();
      if(f==='type'){it.type=val;if(val==='task'&&!it.startDate){it.startDate=it.date;it.duration=14;it.durMode='work';it.endDate=this._calcEndDate(it)}else if(val==='milestone'&&!it.date)it.date=it.startDate}
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
      }else if(f==='owner'){it.owner=val}
      else if(f==='notes'){it.notes=val}
      else it[f]=val;
      if(this.proj.autoRange)this.autoRange();this.sched();this.autoSave();this.refreshPanel()
    };
    tb.oninput=e=>{const f=e.target.dataset?.f,id=e.target.dataset?.id;if(!f||!id)return;const it=this.gi(id);if(!it)return;
      if(f==='name'){it.name=e.target.value;this.autoSave();if(this.view==='split')this.sched(true,false)}
      else if(f==='owner'){it.owner=e.target.value;this.autoSave()}
      else if(f==='notes'){it.notes=e.target.value;this.autoSave()}
    };
    // Right-click context menu on data table rows
    tb.addEventListener('contextmenu',e=>{
      const row=e.target.closest('tr[data-iid]');if(!row)return;e.preventDefault();
      const id=row.dataset.iid;if(!this.sel.includes(id))this.sel=[id];
      const it=this.gi(id);if(!it)return;
      const menu=this.$['dt-ctx-menu'];if(!menu)return;
      menu.innerHTML=`<div class="ctx-item" data-a="toggle-pin">${it.pinned?'✓ ':' '}📌 Pin Date</div><div class="ctx-sep"></div><div class="ctx-item" data-a="del">Delete</div>`;
      menu.style.left=e.clientX+'px';menu.style.top=e.clientY+'px';menu.classList.remove('hidden');
      menu.onclick=ev=>{const a=ev.target.dataset?.a;if(!a)return;menu.classList.add('hidden');this.snap();
        if(a==='toggle-pin'){it.pinned=!it.pinned}
        else if(a==='del'){const s=new Set(this.sel);this.proj.items.forEach(i=>i.deps=(i.deps||[]).filter(d=>!s.has(this.depId(d))));this.proj.items=this.proj.items.filter(i=>!s.has(i.id));this.sel=[]}
        this.sched();this.autoSave()};
      const hide=()=>{menu.classList.add('hidden');document.removeEventListener('click',hide)};
      setTimeout(()=>document.addEventListener('click',hide),0);
    });
    tb.addEventListener('click',e=>{
      if(e.target.closest('.dt-sw-hdr')&&e.detail===2){const sl=this.gs(e.target.closest('.dt-sw-hdr').dataset.slId);if(sl)this.showSwM(sl)}
    });
    this.$.dt_head.addEventListener('click',e=>{const th=e.target.closest('th[data-sortable]');if(!th)return;const col=th.dataset.col;if(this._sortCol===col)this._sortDir=this._sortDir==='asc'?'desc':'asc';else{this._sortCol=col;this._sortDir='asc'}this.sched(false,true)});
    this.$.dt_head.addEventListener('mousedown',e=>{const rh=e.target.closest('.th-rs');if(!rh)return;e.preventDefault();const th=rh.parentElement,sx=e.clientX,sw=th.getBoundingClientRect().width;const mv=ev=>{const nw=Math.max(25,sw+ev.clientX-sx);th.style.width=nw+'px';th.style.minWidth=nw+'px';const ci=th.cellIndex;if(ci>=0){this.$.dt_body.querySelectorAll('tr').forEach(row=>{const td=row.cells[ci];if(td){td.style.width=nw+'px';td.style.minWidth=nw+'px'}})}};const up=()=>{document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up)};document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up)})
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
    if(!term){this.toast('Enter a search term','error');return}
    let matcher;
    try{matcher=useRegex?new RegExp(term,'i'):{test:s=>s.toLowerCase().includes(term.toLowerCase())}}catch(e){this.toast('Invalid regex','error');return}
    const matches=[];
    for(const it of this.proj.items){
      let found=false;
      if(searchName&&matcher.test(it.name))found=true;
      if(searchOwner&&matcher.test(it.owner||''))found=true;
      if(searchNotes&&matcher.test(it.notes||''))found=true;
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

  async exportPNG(){this.toast('Generating PNG…');const svg=this.buildExportSVG();const img=new Image();const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const dpr=Math.max(3,window.devicePixelRatio||3);img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth*dpr;c.height=img.naturalHeight*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.drawImage(img,0,0);c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.png';a.click();URL.revokeObjectURL(a.href);this.toast('PNG exported!')},'image/png')};img.src=url},

  exportDataCSV(){
    const p=this.proj,rows=[['Name','Owner','Type','Start','End','Duration','Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors']];
    for(const sl of p.swimlanes){for(const it of p.items.filter(i=>i.swimlaneId===sl.id)){
      rows.push([it.name,it.owner||'',it.type,it.type==='milestone'?it.date:it.startDate,it.endDate||'',it.duration||'',sl.name,it.subRow||0,it.color,it.progress||0,it.pinned?'Y':'N',it.hidden?'Y':'N',it.notes||'',this._fmtPreds(it)])}}
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(this.proj.name||'timeline')+'.csv';a.click();URL.revokeObjectURL(a.href);this.toast('CSV exported!')
  },

  _deSelectedCols:null,
  showDataExport(){
    const allCols=['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','LabelPos','FontSize','TextColor','DateFormat','ShowDate'];
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
    const allCols=['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','LabelPos','FontSize','TextColor','DateFormat','ShowDate'];
    const cols=mode==='all'?allCols:[...this._deSelectedCols];
    const getVal=(it,col)=>{const sl=this.gs(it.swimlaneId);switch(col){case'Name':return it.name;case'Owner':return it.owner||'';case'Type':return it.type;case'Start':return it.type==='milestone'?it.date:it.startDate;case'End':return it.endDate||'';case'Duration':return it.duration||'';case'Swimlane':return sl?.name||'';case'SubSwim':const ss=sl?.subSwimlanes?.find(s=>s.id===it.subSwimId);return ss?.name||'';case'Row':return it.subRow||0;case'Color':return it.color;case'Progress':return it.progress||0;case'Pinned':return it.pinned?'Y':'N';case'Hidden':return it.hidden?'Y':'N';case'Notes':return it.notes||'';case'Predecessors':return this._fmtPreds(it);case'LabelPos':return it.labelPosition;case'FontSize':return it.fontSize||0;case'TextColor':return it.textColor||'';case'DateFormat':return it.dateFormat||'';case'ShowDate':return it.showDate!==false?'Y':'N';default:return''}};
    const rows=[cols];p.items.forEach(it=>rows.push(cols.map(c=>getVal(it,c))));
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join('\t')).join('\n');
    document.getElementById('data-export-modal').classList.add('hidden');
    if(target==='clipboard'){navigator.clipboard.writeText(csv).then(()=>this.toast('Copied to clipboard!')).catch(()=>this.toast('Copy failed','error'))}
    else{const b=new Blob([csv.replace(/\t/g,',')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=(p.name||'data')+'.csv';a.click();URL.revokeObjectURL(a.href);this.toast('Exported!')}
  },

  /* Help Modal */
  showHelp(){
    const h=`<div style="font-size:12.5px;line-height:1.7;color:var(--tx2)">
    <h3 style="color:var(--tx1);margin-bottom:12px;font-size:15px">🚀 Quick Start Guide</h3>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">1. Create Your Timeline</strong><p>Start with a blank project or choose a template from <strong>New</strong> (📄). Your timeline has <em>swimlanes</em> (horizontal sections) and <em>items</em> (milestones & tasks).</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">2. Add Items</strong><p>Click <strong>+ Mile</strong> or <strong>+ Task</strong> in the toolbar. Items appear in the selected swimlane. Right-click the timeline for "Add Here" at a specific date. To bulk-add items, switch to <strong>Data View</strong> and click <strong>📋 Paste</strong> — paste tab-separated rows from Excel (<code>Name [Tab] Date</code> for milestones, or <code>Name [Tab] Start [Tab] End</code> for tasks) and they'll be imported into your chosen swimlane.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">3. Edit Properties</strong><p>Click any item to open the <strong>Properties Panel</strong>. Change dates, colors, icons, owner, notes, and more. Pin the panel 📌 to keep it open.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">4. Drag & Arrange</strong><p><strong>Drag items</strong> left/right to change dates, or up/down to change rows. Arrow keys for precise nudging; hold <strong>Ctrl</strong> to move faster. The <strong>Lock</strong> toggle (Tools menu) prevents all item movement — both dragging and arrow-key nudging — until unlocked.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">5. Task Timing</strong><p>Tasks have <strong>Start/End/Duration</strong>. Changing Start or End recalculates Duration; changing Duration updates End. Use <strong>📌 Pin Date</strong> to protect items from Propagate.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">6. Dependencies</strong><p><strong>Ctrl+click</strong> to multi-select, then right-click → <strong>Link Dependency</strong>. Each link has a <strong>type</strong> (FS, SS, FF) and optional <strong>lag</strong> (days). Right-click → <strong>Propagate to Successors</strong> to push date changes downstream. Violated links show as dashed red arrows. Enable <strong>Critical Path</strong> to highlight zero-float items. Use <strong>View → Show Float</strong> to see scheduling flexibility.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">7. Scheduling Mode</strong><p>Open <strong>Settings → Scheduling</strong> to switch between <strong>Manual</strong> (default — you control dates, Propagate on demand) and <strong>Auto-Scheduled</strong> (dates auto-calculate from dependencies). In Auto mode, successor dates are calculated fields shown in blue. <strong>📌 Pin Date</strong> overrides auto-scheduling for individual items. A preview shows what will change before switching modes.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">8. Views</strong><p>Switch between <strong>Timeline</strong>, <strong>Data</strong> (spreadsheet with filters), and <strong>Split</strong> views. Use the <strong>Filter Bar</strong> to narrow items by name, owner, notes, or dates.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">9. Swimlanes</strong><p>Click <strong>+ Lane</strong> to add. <strong>Double-click</strong> a lane label to edit its name, color, and sub-swimlanes. <strong>Collapse</strong> lanes with the ▼ button (3-state: expanded → minimized → hidden). Drag the resize handle between lane labels and the timeline grid to adjust label column width.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">10. Selection Tools</strong><p><strong>Ctrl+click</strong> for multi-select. <strong>Alt+drag</strong> or use <strong>Lasso Mode</strong> (toolbar) for area selection. <strong>Ctrl+A</strong> selects all items. <strong>Advanced Search</strong> with regex for complex queries.</p></div>
    <div style="margin-bottom:16px"><strong style="color:var(--acc)">11. Export & Share</strong><p>Use 📷 for screenshots (full or viewport). Export as SVG, PNG, CSV, or JSON from <strong>Settings → Export</strong>. <strong>Fit to Content</strong> auto-zooms to show everything. Enable the <strong>Watermark</strong> in Settings to add a "Last Updated" date stamp to your timeline — it appears on-screen and is included in all exports and screenshots. You can choose the position and optionally include the project owner.</p></div>
    <h3 style="color:var(--tx1);margin:16px 0 12px;font-size:14px">⌨ Keyboard Shortcuts</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px"><tbody>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Z</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Undo</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Y</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Redo</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+S</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Save</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+N</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">New Project</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Delete</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Delete selected</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Escape</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Deselect / close</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">←→↑↓</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Nudge items</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+←→</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Nudge faster</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Click</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Multi-select</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Alt+Drag</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Lasso select</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Lasso Mode</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Toggle in toolbar — drag to select area; hold <strong>Ctrl</strong> while in Lasso Mode to add to selection</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Scroll</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Zoom in/out (±5%)</td></tr>
    <tr><td style="padding:3px 8px"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Shift+Scroll</kbd></td><td style="padding:3px">Fine zoom (±1%)</td><td style="padding:3px 8px"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)"></kbd></td><td style="padding:3px">Also works on the view zoom bar</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Shift+P</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Propagate to Successors</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Shift+F / Alt+1</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Fit to Content</td></tr>
    <tr><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+Shift+S</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Save As</td><td style="padding:3px 8px;border-bottom:1px solid var(--brd)"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Ctrl+A</kbd></td><td style="padding:3px;border-bottom:1px solid var(--brd)">Select All</td></tr>
    <tr><td style="padding:3px 8px"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Right-click</kbd></td><td style="padding:3px">Context menu</td><td style="padding:3px 8px"><kbd style="background:var(--bg2);padding:1px 5px;border-radius:3px;font-family:var(--mono)">Double-click</kbd></td><td style="padding:3px">Edit swimlane / project name</td></tr>
    </tbody></table>
    <h3 style="color:var(--tx1);margin:16px 0 12px;font-size:14px">💡 Tips</h3>
    <ul style="padding-left:18px;margin:0">
    <li>Use <strong>Auto-Arrange</strong> (right-click → context menu) to automatically space overlapping items</li>
    <li>Toggle <strong>Lasso Mode</strong> in the toolbar, or hold <strong>Alt</strong> and drag to lasso-select</li>
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

  /* Auto-Arrange (fixed: proper Date sorting) */
  autoArrange(scope='all'){
    this.snap();
    let items;
    if(scope==='selection')items=this.sel.map(id=>this.gi(id)).filter(Boolean);
    else if(scope==='swimlane'&&this.sel.length){const it=this.gi(this.sel[0]);items=it?this.proj.items.filter(i=>i.swimlaneId===it.swimlaneId):[];
    }else items=[...this.proj.items];
    const groups=new Map();
    items.forEach(it=>{const k=it.swimlaneId+'|'+(it.subSwimId||'');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(it)});
    for(const[,grp]of groups){
      // Fixed: sort by Date objects, not string comparison
      grp.sort((a,b)=>{
        const da=new Date((a.date||a.startDate||'')+'T12:00:00');
        const db=new Date((b.date||b.startDate||'')+'T12:00:00');
        return da-db;
      });
      const rows=[];
      for(const it of grp){
        const s=it.date||it.startDate||'',e=it.endDate||it.date||s;
        let placed=false;
        for(let r=0;r<rows.length;r++){
          const last=rows[r][rows[r].length-1];
          if(U.days(last.end,s)>=1){rows[r].push({start:s,end:e});it.subRow=r;placed=true;
            if(rows[r].length>=2){const prev=rows[r][rows[r].length-2];if(U.days(prev.end,s)<=7)it.labelPosition='right'}
            break}}
        if(!placed){rows.push([{start:s,end:e}]);it.subRow=rows.length-1}
      }
    }
    this.sched();this.autoSave();this.toast('Auto-arranged!')
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