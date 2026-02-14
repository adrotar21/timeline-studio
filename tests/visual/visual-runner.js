#!/usr/bin/env node
/**
 * Timeline Studio — Visual Regression Test Runner
 * Uses Playwright to capture screenshots and compare against baselines.
 *
 * Usage:
 *   node visual-runner.js                  # Compare against baselines
 *   node visual-runner.js --update-baselines  # Capture new baselines
 *
 * Prerequisites:
 *   cd tests/visual && npm install
 */
const fs=require('fs');
const path=require('path');
const{execSync}=require('child_process');

const RED='\x1b[31m',GREEN='\x1b[32m',CYAN='\x1b[36m',DIM='\x1b[2m',RESET='\x1b[0m',YELLOW='\x1b[33m';

// Check if dependencies are installed
try{require.resolve('playwright')}catch(e){
  console.log(`${RED}Playwright not installed. Run: cd tests/visual && npm install${RESET}`);
  process.exit(1);
}

const tests=require('./visual-tests');
const updateBaselines=process.argv.includes('--update-baselines');
const BASELINES_DIR=path.join(__dirname,'baselines');
const DIFF_DIR=path.join(__dirname,'diffs');
const THRESHOLD=0.001; // 0.1% pixel difference tolerance
const PROJECT_ROOT=path.resolve(__dirname,'..','..'); // TimelineProject/
const SHOWCASE_FILE=path.join(PROJECT_ROOT,'Showcase.tlproj');

async function run(){
  // Dynamic imports for ESM packages
  const{chromium}=require('playwright');
  let PNG,pixelmatch;
  try{
    PNG=require('pngjs').PNG;
    pixelmatch=require('pixelmatch');
  }catch(e){
    console.log(`${RED}pngjs or pixelmatch not installed. Run: cd tests/visual && npm install${RESET}`);
    process.exit(1);
  }

  // Start a simple HTTP server
  const http=require('http');
  const server=http.createServer((req,res)=>{
    let filePath=path.join(PROJECT_ROOT,req.url==='/'?'index.html':req.url.replace(/^\//,''));
    if(!fs.existsSync(filePath)){res.writeHead(404);res.end('Not found');return}
    const ext=path.extname(filePath).toLowerCase();
    const mimeTypes={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
    res.writeHead(200,{'Content-Type':mimeTypes[ext]||'application/octet-stream'});
    res.end(fs.readFileSync(filePath));
  });

  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  const baseURL=`http://127.0.0.1:${port}`;
  console.log(`${CYAN}Server running at ${baseURL}${RESET}`);

  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:800}});

  let total=0,passed=0,failed=0,skipped=0;
  const failures=[];

  // Ensure directories exist
  if(!fs.existsSync(DIFF_DIR))fs.mkdirSync(DIFF_DIR,{recursive:true});

  for(const test of tests){
    total++;
    const themeDir=path.join(BASELINES_DIR,test.theme);
    if(!fs.existsSync(themeDir))fs.mkdirSync(themeDir,{recursive:true});
    const baselinePath=path.join(themeDir,`${test.name}.png`);
    const currentPath=path.join(DIFF_DIR,`current-${test.name}.png`);
    const diffPath=path.join(DIFF_DIR,`diff-${test.name}.png`);

    try{
      const page=await context.newPage();
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');

      // Load Showcase project if it exists
      if(fs.existsSync(SHOWCASE_FILE)){
        const showcaseData=fs.readFileSync(SHOWCASE_FILE,'utf8');
        await page.evaluate((data)=>{
          try{
            const proj=JSON.parse(data);
            if(window.App){
              App.proj=proj;
              App.migrate();
              App.applyTheme();
              App.sched(true,true);
            }
          }catch(e){}
        },showcaseData);
        await page.waitForTimeout(500);
      }

      // Apply theme
      if(test.theme!=='default'){
        await page.evaluate((theme)=>{
          if(window.App){App.proj.theme=theme;App.applyTheme();App.sched(true,true)}
        },test.theme);
        await page.waitForTimeout(300);
      }

      // Set view
      if(test.view==='data'){
        await page.evaluate(()=>{if(window.App)App.setView('data')});
      }else if(test.view==='split'){
        await page.evaluate(()=>{if(window.App)App.setView('split')});
      }
      await page.waitForTimeout(300);

      // Perform action
      switch(test.action){
        case'load':break; // No action needed
        case'open-settings-status':
          await page.evaluate(()=>{if(window.App)App.showSettings()});
          await page.waitForTimeout(300);
          break;
        case'select-item':
          await page.evaluate(()=>{
            if(window.App&&App.proj.items.length){App.sel=new Set([App.proj.items[0].id]);App.openPanel(App.proj.items[0])}
          });
          await page.waitForTimeout(300);
          break;
        case'right-click-item':
          await page.evaluate(()=>{
            if(window.App&&App.proj.items.length){
              App.sel=new Set([App.proj.items[0].id]);
              const el=document.querySelector('.tl-item');
              if(el){const r=el.getBoundingClientRect();App.showCtx({clientX:r.left+10,clientY:r.top+10,preventDefault(){}},App.proj.items[0].id)}
            }
          });
          await page.waitForTimeout(300);
          break;
        case'set-status-display-emoji':
          await page.evaluate(()=>{if(window.App){App.proj.statusDisplay.mode='emoji';App.proj.statusDisplay.badgePos='inline';App.sched(true,false)}});
          await page.waitForTimeout(300);
          break;
        case'set-status-display-shortName':
          await page.evaluate(()=>{if(window.App){App.proj.statusDisplay.mode='shortName';App.proj.statusDisplay.badgePos='bottom-right';App.sched(true,false)}});
          await page.waitForTimeout(300);
          break;
        case'set-status-color-override':
          await page.evaluate(()=>{if(window.App){App.proj.statusDisplay.colorOverride=true;App.sched(true,false)}});
          await page.waitForTimeout(300);
          break;
        case'trigger-export-check':
          // Just take a screenshot of the timeline view (export test is about visual consistency)
          break;
      }

      // Take screenshot
      const screenshot=await page.screenshot({fullPage:false});
      await page.close();

      if(updateBaselines){
        fs.writeFileSync(baselinePath,screenshot);
        console.log(`  ${GREEN}\u2705${RESET} ${test.name}${DIM} \u2192 baseline saved${RESET}`);
        passed++;
        continue;
      }

      // Compare with baseline
      if(!fs.existsSync(baselinePath)){
        console.log(`  ${YELLOW}\u26a0${RESET} ${test.name}${DIM} \u2192 no baseline (run with --update-baselines)${RESET}`);
        skipped++;
        continue;
      }

      fs.writeFileSync(currentPath,screenshot);

      const baseline=PNG.sync.read(fs.readFileSync(baselinePath));
      const current=PNG.sync.read(screenshot);

      if(baseline.width!==current.width||baseline.height!==current.height){
        console.log(`  ${RED}\u274c${RESET} ${test.name}: size mismatch (${baseline.width}x${baseline.height} vs ${current.width}x${current.height})`);
        failed++;
        failures.push(test.name+' (size mismatch)');
        continue;
      }

      const diff=new PNG({width:baseline.width,height:baseline.height});
      const numDiffPixels=pixelmatch(baseline.data,current.data,diff.data,baseline.width,baseline.height,{threshold:0.1});
      const diffPercent=numDiffPixels/(baseline.width*baseline.height);

      if(diffPercent>THRESHOLD){
        fs.writeFileSync(diffPath,PNG.sync.write(diff));
        console.log(`  ${RED}\u274c${RESET} ${test.name}: ${(diffPercent*100).toFixed(2)}% different (${numDiffPixels} pixels) \u2192 ${path.basename(diffPath)}`);
        failed++;
        failures.push(`${test.name} (${(diffPercent*100).toFixed(2)}% diff)`);
      }else{
        console.log(`  ${GREEN}\u2705${RESET} ${test.name}${DIM} \u2192 ${(diffPercent*100).toFixed(3)}% diff${RESET}`);
        passed++;
        // Clean up matching current screenshots
        if(fs.existsSync(currentPath))fs.unlinkSync(currentPath);
        if(fs.existsSync(diffPath))fs.unlinkSync(diffPath);
      }

    }catch(err){
      console.log(`  ${RED}\u274c${RESET} ${test.name}: ${err.message}`);
      failed++;
      failures.push(`${test.name} (error: ${err.message})`);
    }
  }

  await browser.close();
  server.close();

  console.log(`\n${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
  console.log(`  TOTAL: ${total}   ${GREEN}PASSED: ${passed}${RESET}   ${failed?RED:GREEN}FAILED: ${failed}${RESET}   ${skipped?YELLOW:''}SKIPPED: ${skipped}${RESET}`);
  console.log(`${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
  if(failures.length){console.log(`\n${RED}FAILURES:${RESET}`);failures.forEach((f,i)=>console.log(`  ${i+1}. ${f}`))}
  if(updateBaselines)console.log(`\n${GREEN}Baselines updated. Commit the new screenshots.${RESET}`);
  process.exit(failed?1:0);
}

run().catch(err=>{console.error(err);process.exit(1)});
