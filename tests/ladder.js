// Checks that the whole unlock ladder holds together.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306}) };
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
var R=c=>vm.runInContext(c,C);
var ok=[];
function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }

// --- 1. flag ladder
var fl=R('flags.map(f=>f.b)'), GOAL=R('GOAL');
console.log('Flags (m):', fl.join(' '));
t('10 flags, increasing, all on ground', fl.length===10 && fl.every((b,i)=>i===0||b>fl[i-1]) && R('flags.every(f=>ground[f.b]>=0)'));
t('last flag close to the finish', fl[9]>=GOAL-80);

// --- 2. locking
R('S.best=0');
t('at 0 m, nothing is unlocked', R('[0,1,2,3,4,5,6,7,8,9].every(i=>!unl(i))'));
R('S.best='+fl[3]);
t('at the 4th flag, exactly 4 families open', R('[0,1,2,3].every(i=>unl(i)) && ![4,5,6,7,8,9].some(i=>unl(i))'));

// --- 3. shield
R('S.best=1e9; S.sh=2; startRun(); P.sh=S.sh; P.inv=0');
R('hurt()'); var a=R('P.sh'); R('P.inv=0; hurt()'); var b=R('P.sh');
R('P.inv=0'); R('hurt()');
t('shield absorbs 2 hits then lets you die', a===1 && b===0 && R("mode")!=='play');

// --- 4. crows
var nc=R('crows.length');
t('crows spawned only after flag 3 (750 m)', nc>0 && R('crows.every(function(c){return c.b>750})'));
console.log('       ('+nc+' crows)');

// --- 5. shooting
R('S.sht=3; S.sh=9; S.best=1e9; startRun()');
R('P.x=crows[0].b*BW-600; P.y=P.gy=ground[bucket(P.x)]>=0?ground[bucket(P.x)]:P.y; P.sh=9; RT=0; P.cd=0; crows.forEach(function(c){c.k=0})');
var before=R('crows.filter(c=>!c.k).length');
R('for(var i=0;i<60;i++) update(1/60)');
var after=R('crows.filter(c=>!c.k).length');
t('the beam destroys crows ahead', after<before);
t('reload reset to 20-N', Math.abs(R('P.cd')-17)<1);

// --- 6. rewind
R('S.rew=2; startRun(); for(var i=0;i<400;i++){ if(i%50===0) tapped=true; update(1/60); }');
var xb=R('P.x'), cr=R('canRew()');
R('die()');
var deadMode=R('mode'), ghostsAfterDeath=R('ghosts.length');
R('doRewind()');
t('rewind available then active', cr && deadMode==='dead' && R('mode')==='play');
t('goes back in time', R('P.x')<xb);
t('the trail pushed by death is undone', R('ghosts.length')===ghostsAfterDeath-1);
t('only once per run', !R('canRew()'));
// The REWIND and UPGRADES buttons must not overlap on the death screen.
R('S.rew=2; rewUsed=0; rew=[[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]]; mode="dead"');
var rb=R('rewBtn()'), ub=R('upBtn()');
t('REWIND and UPGRADES do not overlap', rb.y+rb.h <= ub.y || ub.y+ub.h <= rb.y);

// --- 7. coats
t('5 coats, cycling stays within the array', R('SKIN.length')===5 && R('S.skin=4; S.skin=(S.skin+1)%SKIN.length; S.skin')===0);

// --- 8. new game +
var cnt = '(function(){var n=0;for(var i=0;i<NB;i++)if(plats[i]>=0)n++;return n})()';
R('S.ngp=0; genLevel(4242);'); var p0=R(cnt);
R('S.ngp=1; genLevel(4242);'); var p1=R(cnt);
t('NG+: every other platform removed, same seed ('+p0+' -> '+p1+')', p1 < p0 * 0.62 && p1 > 0);
R('S.ngp=0; genLevel(S.seed);');
var seedBefore=R('S.seed');
R('S.p=500; S.mem=3; newGamePlus()');
t('NG+: new world', R('S.seed')!==seedBefore);
t('NG+: upgrades kept', R('S.mem')===3 && R('S.p')===500);
t('NG+: counter incremented', R('S.ngp')===1);

console.log(ok.every(Boolean)?'\nFULL LADDER VALIDATED':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
