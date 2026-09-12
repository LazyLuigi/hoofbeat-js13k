// Target test: can a rainbow bridge still be tunneled through?
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
// Fixed seed: the test places an artificial bridge over real terrain.
var LS={ hb: JSON.stringify({seed:1306}) };
var S={document:{getElementById:()=>canvas,createElement:()=>({getContext:()=>ctx,width:0,height:0})},addEventListener:()=>{},innerWidth:390,innerHeight:844,
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 devicePixelRatio:3,requestAnimationFrame:()=>{},setInterval:()=>{},Math,console,JSON,Date,
 Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
S.window=S;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(S); vm.runInContext(js,C,{filename:'game.js'});

function test(name, code){ var r=vm.runInContext(code,C); console.log((r?'  OK  ':' FAIL ') + '  ' + name); return r; }

// Artificial flat bridge at y=300, buckets 60 to 120.
vm.runInContext(`
  var bridge = new Array(NB).fill(-1);
  for(var i=60;i<=120;i++) bridge[i]=300;
  ghosts=[bridge];
`,C);

var results=[];
for(var vy of [200,470,800,1200,1800,2600]){
  var ok = test('fall at '+vy+' px/s -> the bridge catches', `
    (function(){
      P.x=70*BW; P.y=180; P.vy=${vy}; P.ground=false; P.dash=0; mode='play'; cur=newTrail();
      for(var f=0;f<90;f++){ update(1/60); if(P.ground) return P.y <= 301 && P.y > 280; }
      return false;
    })()`);
  results.push(ok);
}
// same test at full dash (12 horizontal px per frame)
var okDash = test('dashing (2.7x) -> the bridge catches', `
  (function(){
    S.dash=1; P.x=62*BW; P.y=200; P.vy=900; P.ground=false; P.dash=0.19; P.dashUsed=true;
    mode='play'; cur=newTrail();
    for(var f=0;f<90;f++){ update(1/60); if(P.ground) return P.y<=301 && P.y>280; }
    return false;
  })()`);
results.push(okDash);

// the bridge stays passable FROM BELOW (one-way platform)
var okUp = test('crossing from below -> allowed', `
  (function(){
    P.x=70*BW; P.y=460; P.vy=-900; P.ground=false; P.dash=0; mode='play'; cur=newTrail();
    for(var f=0;f<22;f++){ update(1/60); }
    return P.y < 285;
  })()`);
results.push(okUp);

// sloped bridge: interpolation must yield a continuous surface
vm.runInContext(`
  var slope=new Array(NB).fill(-1);
  for(var i=60;i<=120;i++) slope[i]=260+(i-60)*3;
  ghosts=[slope];
`,C);
var okSlope = test('sloped bridge -> running on it without dropping off', `
  (function(){
    P.x=61*BW; P.y=250; P.vy=100; P.ground=0; P.dash=0; mode='play'; cur=newTrail(); jumpHeld=0;
    var landed=0, frames=0;
    // Only measure while ON the bridge: at 270 px/s we leave it
    // in 60 frames, and counting beyond that says nothing about the slope.
    for(var f=0;f<120 && bucket(P.x)<=118;f++){ update(1/60); frames++; if(P.ground) landed++; if(P.y>700) return false; }
    return frames>20 && landed > frames*0.7;
  })()`);
results.push(okSlope);

console.log(results.every(Boolean) ? '\nALL TESTS PASS' : '\nSOME TESTS FAIL');
process.exit(results.every(Boolean)?0:1);
