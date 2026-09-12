// Does the party really trigger, and does the mystery hold?
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var drawn=[];
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='fillText'||k==='strokeText') return function(s){ drawn.push(s); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306}) };   // fixed seed: otherwise the test depends on randomness
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB; SB.__drawn=function(x){ drawn.push(x); };
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
// Version 80: text is drawn by T_ as rectangles, we listen to it too.
vm.runInContext("if(typeof T_==='function'){ var _T=T_; T_=function(s){ __drawn(String(s).toUpperCase()); return _T.apply(null,arguments); }; }",C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }

// --- mystery: nothing locked may reveal its name
R('S.best=0; mode="shop"'); drawn=[]; R('for(var i=0;i<3;i++) render();');
var names=R('FLAG');
var leaked=names.filter(n=>n!=='NEW GAME +'&&drawn.some(d=>String(d).indexOf(n)>=0));
t('locked shop: no power name displayed', leaked.length===0);
t('locked shop: "Unlock a new PowerUp" prompt present',
  drawn.some(d=>String(d).toUpperCase().indexOf('UNLOCK A NEW POWERUP')>=0));
console.log('       displayed example:', drawn.filter(d=>String(d).indexOf('at ')===0)[0]);

// --- once unlocked, the name appears
R('S.best=1e9'); drawn=[]; R('for(var i=0;i<3;i++) render();');
t('unlocked shop: names appear',
  ['MEMORY','SHIELD','BEAM','REWIND','COAT'].every(n=>drawn.some(d=>String(d).indexOf(n)>=0)));
t('unlocked shop: no more lock prompt',
  !drawn.some(d=>String(d).toUpperCase().indexOf('UNLOCK A NEW POWERUP')>=0));

// --- locked flag in the world
R('S.best=0; mode="play"; startRun(); P.x=flags[0].b*BW-200; camX=P.x-100;');
drawn=[]; R('render();');
t('locked flag: shows "? ? ?" and the distance',
  drawn.some(d=>String(d).indexOf('? ? ?')>=0) && !drawn.some(d=>d==='MEMORY'));

// --- crossing: confetti, waves, banner
R('S.best=0; startRun(); P.x=flags[0].b*BW-40;');
var cBefore=R('conf.length');
R('for(var i=0;i<40;i++) update(1/60);');
t('crossing -> confetti spawned', R('conf.length')>60);
t('crossing -> party armed', R('party')>1.5);
t('crossing -> banner = power name', R('bannerTxt')==='MEMORY');
t('crossing -> unlock saved', R('unl(0)') && !!LS.hb);
drawn=[]; R('render();');
t('banner shows POWER UP', drawn.some(d=>d==='POWER UP') && drawn.some(d=>d==='MEMORY'));

// --- confetti fall back down and vanish
R("for(var i=0;i<700;i++) update(1/60);");
t('confetti cleaned up after the party', R('conf.length')===0 && R('party')<=0);

// --- UPGRADES button: three states, no counter
R('S.best=0; S.p=999; mode="title"');
t('nothing unlocked -> greyed button (state 0)', R('shopState()') === 0);
R('S.best=flags[0].b; S.p=0; S.mem=0');
t('family open but no credits -> state 1', R('shopState()') === 1);
R('S.p=10');
t('purchase possible -> state 2, the button sparkles', R('shopState()') === 2);
R('S.mem=3; S.p=999');
t('family maxed out -> falls back to state 1', R('shopState()') === 1);
R('S.best=0; S.p=999; S.mem=0');
t('full credits but everything locked -> stays in state 0', R('shopState()') === 0);
drawn = [];
[0, 1, 2].forEach(function(want){
  if(want === 0) R('S.best=0; S.p=999');
  if(want === 1) R('S.best=flags[0].b; S.p=0');
  if(want === 2) R('S.best=flags[0].b; S.p=999; S.mem=0');
  R('mode="title"; render()');
});
t('label stays "UPGRADES" without counter, in all three states',
  drawn.filter(function(d){ return String(d).indexOf('UPGRADES') === 0; })
       .every(function(d){ return d === 'UPGRADES'; }));

console.log(ok.every(Boolean)?'\nPARTY AND MYSTERY VALIDATED':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
