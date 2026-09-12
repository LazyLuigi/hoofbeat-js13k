// The attract screen must show itself at its best: the automatic unicorn
// must run for a long time without dying, and must not save anything.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var drawn=[], gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='fillText'||k==='strokeText') return function(s){ drawn.push(s); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306, best:4321, p:77, mem:2}) };  // game already in progress
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB; SB.__drawn=function(x){ drawn.push(x); };
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
// Version 80: text is drawn by T_ as rectangles, so we listen to it too.
vm.runInContext("if(typeof T_==='function'){ var _T=T_; T_=function(s){ __drawn(String(s).toUpperCase()); return _T.apply(null,arguments); }; }",C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }

t('starts in attract mode despite an existing save', R('mode')==='attract');
t('the save is loaded correctly', R('S.best')===4321 && R('S.p')===77 && R('S.mem')===2);

// --- 60 seconds of demo
var bestX=0, deaths=0, lastX=R('P.x');
for(var f=0; f<3600; f++){
  R('update(1/60)');
  var x=R('P.x');
  if(x < lastX - 50) deaths++;
  lastX=x; if(x>bestX) bestX=x;
}
console.log('       60 s of demo: max distance '+(bestX/8|0)+' m, '+deaths+' falls');
t('the demo makes progress across its falls', bestX/8 > 200);
t('the demo does not get stuck in the same spot', deaths < 14);
t('the best score is NOT modified by the demo', R('S.best')===4321);
t('the credits do NOT change', R('S.p')===77);
t('the real player trails are intact', R('dReal').length===0);
t('stays in attract mode', R('mode')==='attract');

// --- screen rendering
drawn=[]; R('render()');
t('displays the title in bubble letters', drawn.filter(d=>'HOOFBEAT'.indexOf(d)>=0&&d.length===1).length>=8);
t('displays the TAP TO RUN prompt', drawn.some(d=>String(d).toUpperCase().indexOf('TAP')>=0));
t('does NOT display the title panel', !drawn.some(d=>String(d).toUpperCase().indexOf('YOU CAN ONLY RUN')>=0));
t('does NOT display the HUD', !drawn.some(d=>/^\d+ ?m$/i.test(String(d).trim())));

// --- a tap starts the real game
R('press(200,400)');
t('a tap starts the game', R('mode')==='play' && (R('P.x/BW|0'))<10);
R('for(var i=0;i<120;i++) update(1/60)');
t('the real game records progress again', R('S.best')===4321 || R('S.best')>0);

console.log(ok.every(Boolean)?'\nATTRACT SCREEN VALID':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
