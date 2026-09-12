// Strict SDK contract tests against readable code and production Terser options.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const {minify} = require('terser');
const source = /<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2] || 'index.html', 'utf8'))[1];
const definitions = JSON.parse(fs.readFileSync('wavedash-achievements.json')).achievements;
const harness = fs.readFileSync('tests/party.js', 'utf8').split('var js=')[0];
const tick = async () => { for(let i=0;i<80;i++) await Promise.resolve(); };
function boot(js, sdk, best=0){
  const base = vm.createContext({require,console,process});
  vm.runInContext(harness, base);
  base.SB.Wavedash = sdk;
  base.LS.hb = JSON.stringify({seed:1306,best});
  const c = vm.createContext(base.SB);
  vm.runInContext(js,c);
  return code => vm.runInContext(code,c);
}
(async()=>{
  const min = (await minify(source,{compress:{passes:3,unsafe:true},mangle:false})).code;
  for(const [label,js] of [['source',source],['terser',min]]){
    let resolveStats, awards=[], uploads=[], init=0, ready=false;
    const known = new Set();
    const sdk={
      init(){init++;return true;},
      requestStats(){return new Promise(r=>{resolveStats=()=>{ready=true;r({success:true,data:true});};});},
      getAchievement(id){assert.equal(ready,true);return known.has(id);},
      setAchievement(id,now){assert.equal(ready,true);assert.equal(typeof now,'boolean');assert.equal(now,true);assert(definitions.some(d=>d.identifier===id));awards.push(id);known.add(id);return true;},
      async getOrCreateLeaderboard(name,sort,type){assert.equal(name,'best-distance-v1');assert.equal(sort,1);assert.equal(type,0);return {success:true,data:{id:'lb-test'}};},
      async uploadLeaderboardScore(id,score,keep){assert.equal(id,'lb-test');assert.equal(typeof keep,'boolean');assert.equal(keep,true);assert(Number.isInteger(score));uploads.push(score);return {success:true};}
    };
    const R=boot(js,sdk);assert.equal(init,1);
    assert.deepEqual(Array.from(R('WD_IDS')),definitions.map(d=>d.identifier));
    R('startRun(); P.x=flags[0].b*BW; P.y=ground[flags[0].b]; update(0)');
    assert.equal(awards.length,0);resolveStats();await tick();
    assert.deepEqual(awards,['MEMORY']);
    for(let i=1;i<10;i++) R(`startRun(); P.x=flags[${i}].b*BW; P.y=ground[flags[${i}].b]; update(0)`);
    await tick();assert.equal(awards.length,10);
    R('wdSync(); wdSync()');await tick();assert.equal(awards.length,10);
    R('S.best=0; P.x=0; endRun(false)');await tick();assert.equal(uploads.at(-1),0);
    R('S.best=1234; startRun(); endRun(false)');await tick();assert.equal(uploads.at(-1),1234);
    const restored=boot(js,sdk,2600);resolveStats();await tick();assert.equal(awards.length,10);
    assert.equal(restored('wdPending.size'),0);
    for(const broken of [undefined,{},Object.fromEntries(Object.keys(sdk).map(k=>[k,()=>{throw Error('offline');}])),Object.fromEntries(Object.keys(sdk).map(k=>[k,async()=>{throw Error('offline');}])),Object.fromEntries(Object.keys(sdk).map(k=>[k,()=>({success:false})])),{...sdk,uploadLeaderboardScore:async()=>{throw Error('upload');}}]){
      const B=boot(js,broken); B('startRun(); wdAward(0); endRun(false)');await tick();assert.equal(B('mode'),'dead');
    }
    let requests=0, attempts=0;
    const retry=boot(js,{...sdk,requestStats:async()=>({success:++requests>1,data:requests>1}),getAchievement:()=>false,setAchievement:()=>++attempts>1});
    await tick();retry('wdAward(0); startRun()');await tick();assert.equal(retry('wdPending.size'),1);
    retry('startRun()');await tick();assert.equal(retry('wdPending.size'),0);
    console.log(label+': ten crossings, delayed stats, duplicates, restored save, zero/best scores, missing SDK, failures and retries pass');
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
