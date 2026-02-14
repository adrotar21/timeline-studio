/**
 * Timeline Studio — Visual Test Definitions
 * Each test defines a name, theme, view, and action to perform before screenshot.
 */
module.exports=[
  // Core views × all themes
  {name:'timeline-default',     theme:'default',  view:'timeline', action:'load'},
  {name:'timeline-claude',      theme:'claude',   view:'timeline', action:'load'},
  {name:'timeline-light',       theme:'light',    view:'timeline', action:'load'},
  {name:'timeline-midnight',    theme:'midnight', view:'timeline', action:'load'},
  {name:'data-view',            theme:'default',  view:'data',     action:'load'},
  {name:'split-view',           theme:'default',  view:'split',    action:'load'},

  // UI components
  {name:'settings-status',      theme:'default',  view:'timeline', action:'open-settings-status'},
  {name:'properties-pane',      theme:'default',  view:'timeline', action:'select-item'},
  {name:'context-menu',         theme:'default',  view:'timeline', action:'right-click-item'},

  // Status display modes
  {name:'status-badges-emoji',  theme:'default',  view:'timeline', action:'set-status-display-emoji'},
  {name:'status-badges-short',  theme:'default',  view:'timeline', action:'set-status-display-shortName'},
  {name:'status-color-override',theme:'default',  view:'timeline', action:'set-status-color-override'},

  // Export output
  {name:'export-png-output',    theme:'default',  view:'timeline', action:'trigger-export-check'},
];
