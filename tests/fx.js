// Each power must produce its effect, and only when it is active.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var ARCS={n:0};
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='arc'||k==='fillRect') return function(){ ARCS.n++; };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306, best:99999, dbl:1, glide:1, dash:1, sh:3, mem:3}) };
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }
function kinds(){ return R('parts.map(function(p){return p.k})'); }
function count(k){ return kinds().filter(x=>x===k).length; }

// --- DOUBLE JUMP: crown of sparkles
R('startRun(); parts=[]; P.ground=0; P.jumps=1; P.vy=100; tapped=1; update(1/60);');
t('double jump -> sparkles (k=1)', count(1) >= 14);
t('double jump -> sparkles fall back gently',
  R('parts.filter(function(p){return p.k===1}).every(function(p){return p.g<0.4})'));

// --- DASH: rainbow puffs trailing behind
R('startRun(); parts=[]; P.ground=0; P.dashUsed=0; P.dash=0; dashTap=1;');
R('for(var i=0;i<10;i++) update(1/60);');
t('dash -> puffs (k=2)', count(2) >= 6);
t('dash -> puffs emitted BEHIND the unicorn',
  R('parts.filter(function(p){return p.k===2}).every(function(p){return p.x <= P.x && p.vx < 0})'));
t('dash -> puffs float instead of falling',
  R('parts.filter(function(p){return p.k===2}).every(function(p){return p.g < 0})'));

// --- GLIDE: stars + spread legs, only when active
R('startRun(); parts=[]; P.ground=0; P.vy=400; jumpHeld=0; update(1/60);');
t('glide inactive -> P.gl at 0 and no stars', R('P.gl')===0 && count(1)===0);
R('parts=[]; P.ground=0; P.vy=400; jumpHeld=1;');
R('for(var i=0;i<20;i++){ P.vy=400; update(1/60); }');
t('glide active -> P.gl at 1', R('P.gl')===1);
t('glide active -> trail of stars', count(1) >= 3);
t('glide active -> fall speed capped', R('P.vy') <= 111);

// --- SHIELD: drawn only while charges remain
R('startRun(); mode="play"; P.sh=3; P.inv=0;');
t('shield with 3 charges -> effect drawn', (ARCS.n=0, R('drawShield(camX,camY)'), ARCS.n) >= 9);
R('P.sh=0; P.inv=0;');
t('empty shield -> no effect', (ARCS.n=0, R('drawShield(camX,camY)'), ARCS.n) === 0);

// --- MEMORY: landing on a trail sparkles
// jumpHeld must be reset to 0: otherwise the glide from the previous test
// slows the fall and skews the landing.
R('startRun(); jumpHeld=0; var br=new Array(NB).fill(-1); for(var i=60;i<=120;i++) br[i]=300; ghosts=[br];');
R('P.x=70*BW; P.y=180; P.vy=700; P.ground=0; parts=[];');
R('for(var i=0;i<60;i++){ update(1/60); if(P.ground) break; }');
t('landing on a trail -> sparkles', R('P.ground') && count(1) > 0);
R('startRun(); jumpHeld=0; P.x=40; P.y=ground[5]-260; P.vy=700; P.ground=0; parts=[]; ghosts=[];');
R('for(var i=0;i<60;i++){ update(1/60); if(P.ground) break; }');
t('landing on solid ground -> no sparkles', R('P.ground') && count(1) === 0);

// --- DEATH: the unicorn bursts into confetti
R('startRun(); jumpHeld=0; conf=[]; parts=[]; boom=0; P.sh=0; P.inv=0; die();');
t('death -> burst of confetti', R('conf.length') >= 100);
t('death -> star sparkles thrown out', R('parts.filter(function(p){return p.k===1}).length') >= 26);
t('death -> shockwave armed', R('boom') > 1.5 && R('boomX') > 0);
t('death -> we do switch to the death screen', R('mode') === 'dead');
var UNI = { n:0 };
R('mode="dead"');
t('the unicorn is no longer drawn after exploding',
  (UNI.n = 0, R('(function(){var n=0,o=drawUnicorn;drawUnicorn=function(){n++};render();drawUnicorn=o;return n})()')) === 0);
R('mode="play"');
t('the unicorn comes back into play',
  R('(function(){var n=0,o=drawUnicorn;drawUnicorn=function(){n++};render();drawUnicorn=o;return n})()') === 1);
R('startRun();');
t('restarting clears the explosion', R('conf.length') === 0 && R('boom') === 0);

// --- FALL: lethal 220 px below the local ground, never below a trail
R('startRun(); jumpHeld=0; S.sh=3; P.sh=3; P.inv=0;');
var ref=R('fallRef(bucket(P.x))');
R('P.y='+(ref+150)+'; P.ground=0; P.vy=300; mode="play";');
R('for(var i=0;i<6;i++){ update(1/60); if(mode!=="play") break; }');
t('150 px below the local ground: still alive', R('mode') === 'play');
R('P.y='+(ref+230)+'; P.vy=0; P.ground=0; P.sh=3; P.inv=0; mode="play"; update(1/60);');
t('beyond 220 px: instant death', R('mode') === 'dead');
t('death by falling ignores the shield', R('P.sh') === 3);

// The case that used to kill mid-air: a trail very high in the sky, then
// a fall toward the platform. The reference must not be the trail.
R('startRun(); jumpHeld=0; var skyT=new Array(NB).fill(-1); for(var i=8;i<=14;i++) skyT[i]=20; ghosts=[skyT];');
R('P.x=10*BW; P.y=20; P.vy=0; P.ground=1; mode="play";');
R('for(var i=0;i<4;i++) update(1/60);');            // running on the sky trail
t('we stand on a trail at y=20', !!R('P.ground') && R('P.y')<=24);
R('for(var i=0;i<60;i++){ update(1/60); if(!P.ground) break; }');   // we leave the trail
R('for(var i=0;i<200;i++){ update(1/60); if(mode!=="play"||P.ground) break; }');
t('falling off the trail we LAND on the ground instead of dying mid-air',
  R('mode')==='play' && !!R('P.ground') && R('P.y')>200);
// --- SPIKE: only hurts within its height
R('startRun(); jumpHeld=0; S.sh=3; P.sh=3; P.inv=0;');
R('var sb=0; for(var i=40;i<NB;i++) if(spk[i]){ sb=i; break; }');
t('a spike exists in the world', R('sb') > 0);
R('P.x=sb*BW+3; P.y=ground[sb]+80; P.ground=0; P.vy=200; P.inv=0;');
R('update(1/60);');
t('falling 80 px below the spike: the shield stays intact', R('P.sh') === 3);
R('P.x=sb*BW+3; P.y=ground[sb]; P.ground=1; P.vy=0; P.inv=0; update(1/60);');
t('touching the spike at its height: the shield takes the hit', R('P.sh') === 2);

// --- DEATH DELAY: the explosion plays alone before the panel
R('startRun(); jumpHeld=0; P.sh=0; P.inv=0;');
R('var _p=panel, PN=0; panel=function(){ PN++; return _p.apply(null, arguments); };');
R('die();');
t('death arms the delay', R('deadT') > 0.9);
R('PN=0; render();');
t('right after death: no panel drawn', R('PN') === 0);
t('but the explosion is there', R('conf.length') > 100 && R('boom') > 0);

// a player who taps must neither restart nor trigger a button
var ub = R('upBtn()');
R('press(' + (ub.x + ub.w / 2) + ',' + (ub.y + ub.h / 2) + ');');
t('a press on the UPGRADES area does nothing', R('mode') === 'dead');
R('tapped=1; update(1/60);');
t('a press does not restart the run', R('mode') === 'dead');

R('for(var i=0;i<70;i++) update(1/60);');          // ~1.17 s
t('after one second the delay has elapsed', R('deadT') <= 0);
R('PN=0; render();');
t('the panel then appears', R('PN') === 1);
R('tapped=1; update(1/60);');
t('and the press restarts the run', R('mode') === 'play');
R('panel=_p;');

// --- no particle leak
R('startRun(); jumpHeld=0; for(var i=0;i<2400;i++){ if(i%23===0) tapped=1; if(i%97===0) dashTap=1; jumpHeld=i%50<20; update(1/60); }');
t('no particle leak over 40 s', R('parts.length') < 400);
console.log('       live particles after 40 s:', R('parts.length'));

console.log(ok.every(Boolean)?'\nPOWER EFFECTS VALIDATED':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
