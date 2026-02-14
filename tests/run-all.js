#!/usr/bin/env node
/**
 * Timeline Studio — Aggregate Test Runner
 * Discovers and runs all test_*.js files, aggregates results.
 */
const{execSync}=require('child_process');
const path=require('path');
const fs=require('fs');

const RED='\x1b[31m',GREEN='\x1b[32m',CYAN='\x1b[36m',DIM='\x1b[2m',RESET='\x1b[0m';

function findTests(dir,base){
  const results=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name==='visual')continue; // skip visual tests (require npm deps)
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()){results.push(...findTests(full,base))}
    else if(entry.name.startsWith('test_')&&entry.name.endsWith('.js')){
      results.push(full);
    }
  }
  return results;
}

const testsDir=path.resolve(__dirname);
const files=findTests(testsDir,testsDir).sort();

console.log(`${CYAN}Timeline Studio — Running ${files.length} test files${RESET}\n`);

let totalFiles=0,passedFiles=0,failedFiles=0;
const failures=[];

for(const file of files){
  const rel=path.relative(testsDir,file);
  console.log(`${CYAN}\u2501\u2501\u2501 ${rel} \u2501\u2501\u2501${RESET}`);
  try{
    const output=execSync(`node "${file}"`,{encoding:'utf8',timeout:30000,stdio:'pipe'});
    process.stdout.write(output);
    // Check exit code via output (the process would throw on non-zero exit)
    totalFiles++;passedFiles++;
  }catch(e){
    // Non-zero exit = test failures
    if(e.stdout)process.stdout.write(e.stdout);
    if(e.stderr)process.stderr.write(e.stderr);
    totalFiles++;failedFiles++;
    failures.push(rel);
  }
  console.log('');
}

console.log(`\n${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
console.log(`  FILES: ${totalFiles}   ${GREEN}PASSED: ${passedFiles}${RESET}   ${failedFiles?RED:GREEN}FAILED: ${failedFiles}${RESET}`);
console.log(`${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
if(failures.length){
  console.log(`\n${RED}FAILED FILES:${RESET}`);
  failures.forEach((f,i)=>console.log(`  ${i+1}. ${f}`));
}
process.exit(failedFiles?1:0);
