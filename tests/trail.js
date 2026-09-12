// The trail must never come out dotted. A "hole" = 1 to 3 empty buckets
// between two filled buckets. Real gaps (landing) span dozens of buckets.
// We play WITHOUT a ghost trail: otherwise running over an old trail
// creates a legitimate break, since we only record while airborne.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin font textAlign textBaseline globalAlpha shadowColor shadowBlur shadowOffsetY letterSpacing'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:()=>{}};
var ctx=new Proxy({},{get:(t,k)=>{
  if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>gr;
  if(k==='measureText') return s=>({width:9});
  if(PROPS[k]) return t[k]; return ()=>{};
},set:(t,k,v)=>{t[k]=v;return true}});
function boot(seed, extra){
  var LS={ hb: JSON.stringify(Object.assign({seed:seed}, extra||{})) };
  var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
   addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,requestAnimationFrame:()=>{},setInterval:()=>{},
   localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
   Math,console,JSON,Date,Int16Array,Uint8Array,Float32Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
  SB.window=SB;
  var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
  var C=vm.createContext(SB); vm.runInContext(js,C); return c=>vm.runInContext(c,C);
}
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }

// Precise invariant: if the unicorn is IN THE AIR from the start to the end of a frame,
// then every bucket it crossed during that frame must have a sample.
// Breaks on the ground remain legitimate.
function run(dt, dash){
  var R=boot(1306, dash?{dash:1,best:99999}:{});
  var holes=0, checked=0;
  for(var life=0; life<12; life++){
    R('ghosts=[]; startRun(); jumpHeld=0;');
    for(var f=0; f<300 && R('mode')==='play'; f++){
      if(f%31===0) R('tapped=1');
      if(dash && f%19===0) R('dashTap=1');
      var b0=R('bucket(P.x)'), g0=R('P.ground');
      R('update('+dt+')');
      var b1=R('bucket(P.x)'), g1=R('P.ground');
      if(g0 || g1) continue;                       // ground contact: no recording
      var cur=R('cur');
      for(var b=b0; b<=b1; b++){ checked++; if(cur[b] < 0) holes++; }
    }
  }
  return [holes, checked];
}
[['60 fps', 1/60, false], ['60 fps + dash', 1/60, true], ['30 fps', 1/30, false],
 ['22 fps, dt capped', 0.045, false], ['22 fps + dash', 0.045, true]].forEach(function(c){
  var r = run(c[1], c[2]);
  t(c[0].padEnd(20) + ' no holes (' + r[1] + ' samples)', r[0] === 0);
});
console.log(ok.every(Boolean)?'\nTRAIL CONTINUOUS':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
