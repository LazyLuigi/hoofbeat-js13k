// Test cible : peut-on encore traverser un pont arc-en-ciel ?
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var g={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return g;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(PROPS[k]) return t[k];
  return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var canvas={getContext:()=>ctx,addEventListener:()=>{},width:0,height:0};
// Graine figee : le test pose un pont artificiel sur du terrain reel.
var LS={ hb: JSON.stringify({seed:1306}) };
var S={document:{getElementById:()=>canvas,createElement:()=>({getContext:()=>ctx,width:0,height:0})},addEventListener:()=>{},innerWidth:390,innerHeight:844,
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 devicePixelRatio:3,requestAnimationFrame:()=>{},setInterval:()=>{},Math,console,JSON,Date,
 Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
S.window=S;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(S); vm.runInContext(js,C,{filename:'game.js'});

function test(name, code){ var r=vm.runInContext(code,C); console.log((r?'  OK  ':' ECHEC') + '  ' + name); return r; }

// Pont plat artificiel a y=300, des buckets 60 a 120.
vm.runInContext(`
  var bridge = new Array(NB).fill(-1);
  for(var i=60;i<=120;i++) bridge[i]=300;
  ghosts=[bridge];
`,C);

var results=[];
for(var vy of [200,470,800,1200,1800,2600]){
  var ok = test('chute a '+vy+' px/s -> le pont accroche', `
    (function(){
      P.x=70*BW; P.y=180; P.vy=${vy}; P.ground=false; P.dash=0; mode='play'; cur=newTrail();
      for(var f=0;f<90;f++){ update(1/60); if(P.ground) return P.y <= 301 && P.y > 280; }
      return false;
    })()`);
  results.push(ok);
}
// meme test en pleine ruee (12 px horizontaux par frame)
var okDash = test('en ruee (2.7x) -> le pont accroche', `
  (function(){
    S.dash=1; P.x=62*BW; P.y=200; P.vy=900; P.ground=false; P.dash=0.19; P.dashUsed=true;
    mode='play'; cur=newTrail();
    for(var f=0;f<90;f++){ update(1/60); if(P.ground) return P.y<=301 && P.y>280; }
    return false;
  })()`);
results.push(okDash);

// le pont reste traversable PAR LE BAS (plateforme a sens unique)
var okUp = test('traversee par le bas -> autorisee', `
  (function(){
    P.x=70*BW; P.y=460; P.vy=-900; P.ground=false; P.dash=0; mode='play'; cur=newTrail();
    for(var f=0;f<22;f++){ update(1/60); }
    return P.y < 285;
  })()`);
results.push(okUp);

// pont en pente : l'interpolation doit donner une surface continue
vm.runInContext(`
  var slope=new Array(NB).fill(-1);
  for(var i=60;i<=120;i++) slope[i]=260+(i-60)*3;
  ghosts=[slope];
`,C);
var okSlope = test('pont en pente -> on court dessus sans decrocher', `
  (function(){
    P.x=61*BW; P.y=250; P.vy=100; P.ground=0; P.dash=0; mode='play'; cur=newTrail(); jumpHeld=0;
    var landed=0, frames=0;
    // On ne mesure que tant qu'on est SUR le pont : a 270 px/s on en sort
    // en 60 frames, et compter au-dela ne dit plus rien de la pente.
    for(var f=0;f<120 && bucket(P.x)<=118;f++){ update(1/60); frames++; if(P.ground) landed++; if(P.y>700) return false; }
    return frames>20 && landed > frames*0.7;
  })()`);
results.push(okSlope);

console.log(results.every(Boolean) ? '\nTOUS LES TESTS PASSENT' : '\nDES TESTS ECHOUENT');
process.exit(results.every(Boolean)?0:1);
