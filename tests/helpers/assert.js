/**
 * Timeline Studio — Shared Assertion Library
 * Extracted from test_comprehensive.js and test_expanded.js
 */

const RED='\x1b[31m',GREEN='\x1b[32m',CYAN='\x1b[36m',DIM='\x1b[2m',RESET='\x1b[0m';
let total=0,passed=0,failed=0,errors=[];

function assert(name,got,expected){
  total++;const g=String(got),e=String(expected);
  if(g===e){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 ${g}${RESET}`)}
  else{failed++;const msg=`${name}: got "${g}", expected "${e}"`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}
}
function assertT(name,cond){assert(name,!!cond,true)}
function assertF(name,cond){assert(name,!!cond,false)}
function assertGte(name,got,min){total++;if(got>=min){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 ${got} >= ${min}${RESET}`)}else{failed++;const msg=`${name}: got ${got}, expected >= ${min}`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function assertLte(name,got,max){total++;if(got<=max){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 ${got} <= ${max}${RESET}`)}else{failed++;const msg=`${name}: got ${got}, expected <= ${max}`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function assertNeq(name,got,notExpected){total++;if(String(got)!==String(notExpected)){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 ${got} \u2260 ${notExpected}${RESET}`)}else{failed++;const msg=`${name}: got "${got}", should NOT equal "${notExpected}"`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function assertIncludes(name,str,sub){total++;const s=String(str);if(s.includes(sub)){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 includes "${sub}"${RESET}`)}else{failed++;const msg=`${name}: "${s.slice(0,80)}..." does not include "${sub}"`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function assertNotIncludes(name,str,sub){total++;const s=String(str);if(!s.includes(sub)){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 does not include "${sub}"${RESET}`)}else{failed++;const msg=`${name}: should NOT include "${sub}"`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function assertThrows(name,fn){total++;try{fn();failed++;const msg=`${name}: expected to throw but did not`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}catch(e){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 threw${RESET}`)}}
function assertApprox(name,got,expected,tolerance){total++;if(Math.abs(got-expected)<=tolerance){passed++;console.log(`  ${GREEN}\u2705${RESET} ${name}${DIM} \u2192 ${got} \u2248 ${expected}${RESET}`)}else{failed++;const msg=`${name}: got ${got}, expected ~${expected} (\u00b1${tolerance})`;errors.push(msg);console.log(`  ${RED}\u274c${RESET} ${msg}`)}}
function section(s){console.log(`\n${CYAN}\u2501\u2501\u2501 ${s} \u2501\u2501\u2501${RESET}`)}
function summary(){
  console.log(`\n${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
  console.log(`  TOTAL: ${total}   ${GREEN}PASSED: ${passed}${RESET}   ${failed?RED:GREEN}FAILED: ${failed}${RESET}`);
  console.log(`${CYAN}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
  if(errors.length){console.log(`\n${RED}FAILURES:${RESET}`);errors.forEach((e,i)=>console.log(`  ${i+1}. ${e}`))}
  return{total,passed,failed};
}
function getStats(){return{total,passed,failed}}
function resetStats(){total=0;passed=0;failed=0;errors=[]}

module.exports={assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,assertThrows,assertApprox,section,summary,getStats,resetStats};
