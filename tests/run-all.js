#!/usr/bin/env node
/**
 * Timeline Studio - Aggregate Test Runner
 * Discovers and runs all test_*.js files, aggregates results.
 */
const {execFileSync}=require('child_process');
const path=require('path');
const fs=require('fs');

const RED='\x1b[31m',GREEN='\x1b[32m',CYAN='\x1b[36m',DIM='\x1b[2m',RESET='\x1b[0m';

function findTests(dir){
  const results=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='visual')continue; // skip visual tests (require npm deps)
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())results.push(...findTests(full));
    else if(entry.name.startsWith('test_')&&entry.name.endsWith('.js'))results.push(full);
  }
  return results;
}

function canSpawnChildren(){
  try{
    execFileSync(process.execPath,['-v'],{encoding:'utf8',stdio:'pipe'});
    return true;
  }catch(e){
    return !(e&&e.code==='EPERM');
  }
}

function runViaChild(file){
  const output=execFileSync(process.execPath,[file],{encoding:'utf8',timeout:30000,stdio:'pipe'});
  process.stdout.write(output);
}

function runInProcess(file,testsRoot){
  const originalExit=process.exit;
  let exitCode=0;

  // Isolate each test file by clearing cached test modules.
  for(const k of Object.keys(require.cache)){
    if(k.startsWith(testsRoot))delete require.cache[k];
  }

  process.exit=(code=0)=>{
    const err=new Error('__TEST_EXIT__:'+code);
    err.__isTestExit=true;
    throw err;
  };

  try{
    require(file);
  }catch(e){
    if(e&&e.__isTestExit){
      const raw=String(e.message||'').split(':')[1];
      const parsed=Number.parseInt(raw,10);
      exitCode=Number.isNaN(parsed)?1:parsed;
    }else{
      throw e;
    }
  }finally{
    process.exit=originalExit;
  }

  if(exitCode!==0){
    const err=new Error('Test exited with code '+exitCode);
    err.code=exitCode;
    throw err;
  }
}

const testsDir=path.resolve(__dirname);
const files=findTests(testsDir).sort();
const useChildren=canSpawnChildren();

console.log(`${CYAN}Timeline Studio - Running ${files.length} test files${RESET}\n`);
if(!useChildren){
  console.log(`${DIM}Child process spawn blocked; running tests in-process fallback.${RESET}\n`);
}

let totalFiles=0,passedFiles=0,failedFiles=0;
const failures=[];

for(const file of files){
  const rel=path.relative(testsDir,file);
  console.log(`${CYAN}--- ${rel} ---${RESET}`);
  try{
    if(useChildren)runViaChild(file);
    else runInProcess(file,testsDir);
    totalFiles++;passedFiles++;
  }catch(e){
    if(useChildren){
      if(e.stdout)process.stdout.write(e.stdout);
      if(e.stderr)process.stderr.write(e.stderr);
    }else if(e&&e.stack){
      console.error(e.stack);
    }
    totalFiles++;failedFiles++;
    failures.push(rel);
  }
  console.log('');
}

console.log(`\n${CYAN}------------------------------------------------${RESET}`);
console.log(`  FILES: ${totalFiles}   ${GREEN}PASSED: ${passedFiles}${RESET}   ${failedFiles?RED:GREEN}FAILED: ${failedFiles}${RESET}`);
console.log(`${CYAN}------------------------------------------------${RESET}`);
if(failures.length){
  console.log(`\n${RED}FAILED FILES:${RESET}`);
  failures.forEach((f,i)=>console.log(`  ${i+1}. ${f}`));
}
process.exit(failedFiles?1:0);
