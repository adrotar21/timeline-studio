/**
 * Timeline Studio — Test Builders / Factory Functions
 * Creates valid test data objects with sensible defaults.
 */
const{U}=require('./mock-engine');

function makeStatusDefs(){
  return[
    {id:'blank',name:'',desc:'',color:'',shortName:'',emoji:''},
    {id:'tbd',name:'TBD',desc:'Not yet determined',color:'#6b7280',shortName:'?',emoji:'\u2753'},
    {id:'on-track',name:'On Track',desc:'Progressing as planned',color:'#22c55e',shortName:'G',emoji:'\ud83d\udfe2'},
    {id:'at-risk',name:'At Risk',desc:'May miss target',color:'#eab308',shortName:'Y',emoji:'\ud83d\udfe1'},
    {id:'off-track',name:'Off Track',desc:'Behind schedule',color:'#ef4444',shortName:'R',emoji:'\ud83d\udd34'},
    {id:'complete',name:'Complete',desc:'Finished',color:'#3b82f6',shortName:'B',emoji:'\ud83d\udd35'},
    {id:'not-started',name:'Not Started',desc:'Has not begun',color:'#9ca3af',shortName:'N',emoji:'\u26aa'},
  ];
}

function makeStatusDisplay(overrides={}){
  return Object.assign({show:true,mode:'emoji',badgePos:'inline',colorOverride:false,blankColor:''},overrides);
}

function makeProj(overrides={}){
  const p={
    version:2,
    name:'Test Project',
    owner:'Tester',
    dateFormat:'MM/DD/YYYY',
    timescale:'weeks',
    headerLayers:1,
    timelineStart:'2026-01-01',
    timelineEnd:'2026-06-30',
    autoRange:false,
    showToday:true,
    showDeps:true,
    locked:false,lockH:false,lockV:false,
    hideMode:false,
    theme:'default',
    bgColor:'',headerColor:'',
    zoom:1,fontSize:11,
    watermark:'',wmDate:false,wmPos:'bottom-right',wmShowOwner:false,
    showWeekends:true,weekendOpacity:40,weekendAutoHide:false,
    holidays:[],showHolidays:true,holidayOpacity:20,holidayColor:'#ff6b6b',holidayLabels:false,
    scheduleAroundNonWorking:false,
    defaultFolder:'',
    tttEnabled:false,tttMilestoneId:'',showFloat:false,
    schedulingMode:'manual',
    labelWidth:160,
    statusDefs:makeStatusDefs(),
    statusDisplay:makeStatusDisplay(),
    swimlanes:[{id:'sw1',name:'Default',color:'',collapsed:'expanded',height:100,subSwims:[]}],
    items:[],
  };
  return Object.assign(p,overrides);
}

let _itemCounter=0;
function makeItem(type,overrides={}){
  _itemCounter++;
  const id=overrides.id||('it_'+_itemCounter);
  const base={
    id,
    type,
    name:overrides.name||('Item '+_itemCounter),
    swimlaneId:overrides.swimlaneId||'sw1',
    subSwimId:overrides.subSwimId||'',
    subRow:overrides.subRow||0,
    color:overrides.color||'#4f8cc9',
    labelPosition:overrides.labelPosition||'right',
    showDate:overrides.showDate||false,
    showDuration:overrides.showDuration||false,
    showOwner:overrides.showOwner||false,
    durationFmt:overrides.durationFmt||'days',
    showStartDate:overrides.showStartDate||false,
    showEndDate:overrides.showEndDate||false,
    textColor:overrides.textColor||'',
    edgeTextColor:overrides.edgeTextColor||'',
    dateFormat:overrides.dateFormat||'',
    deps:overrides.deps||[],
    progress:overrides.progress||0,
    pinned:overrides.pinned||false,
    hidden:overrides.hidden||false,
    duration:0,
    fontSize:overrides.fontSize||11,
    owner:overrides.owner||'',
    notes:overrides.notes||'',
    status:overrides.status||'',
    statusDate:overrides.statusDate||'',
    vLine:overrides.vLine||{enabled:false,style:'solid',color:'#888888',direction:'down',extent:'full'},
  };
  if(type==='milestone'){
    base.date=overrides.date||'2026-01-15';
    base.iconType=overrides.iconType||'diamond';
  }else{
    base.startDate=overrides.startDate||'2026-01-05';
    base.duration=overrides.duration!=null?overrides.duration:5;
    base.durMode=overrides.durMode||'cal';
    base.endDate=overrides.endDate||U.addDays(base.startDate,Math.max(0,base.duration-1));
  }
  return base;
}

function makeSwim(overrides={}){
  const id=overrides.id||('sw_'+Math.random().toString(36).slice(2,7));
  return{
    id,
    name:overrides.name||'Swimlane',
    color:overrides.color||'',
    collapsed:overrides.collapsed||'expanded',
    height:overrides.height||100,
    subSwims:(overrides.subSwims||[]).map((ss,i)=>({
      id:ss.id||('ss_'+Math.random().toString(36).slice(2,7)),
      name:ss.name||('Sub '+(i+1)),
      color:ss.color||'',
      collapsed:ss.collapsed||'expanded',
      height:ss.height||60,
    })),
  };
}

function addDep(item,predId,type,lag){
  if(!item.deps)item.deps=[];
  item.deps.push({id:predId,type:type||'FS',lag:lag||0});
  return item;
}

function addItems(proj,...items){
  for(const it of items)proj.items.push(it);
  return proj;
}

function resetItemCounter(){_itemCounter=0}

module.exports={makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter};
