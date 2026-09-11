// Harnais sans navigateur : contexte canvas factice, on appelle render() dans
// chaque mode pour attraper les fonctions manquantes et les fautes de frappe.
var fs=require('fs'), vm=require('vm');
var calls={};
var PROPS={};
'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(function(p){ PROPS[p]=1; });
function stubCtx(){
  var g={addColorStop:function(){}};
  return new Proxy({}, { get:function(t,k){
    if(k==='canvas') return {width:800,height:600};
    if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return g;};
    if(k==='measureText') return function(s){return {width:(s||'').length*9};};
    if(k==='setTransform'||k==='save'||k==='restore') return function(){};
    if(PROPS[k]) return t[k];
    return function(){ calls[k]=(calls[k]||0)+1; };
  }, set:function(t,k,v){ t[k]=v; return true; }});
}
var ctx=stubCtx();
var canvas={ getContext:function(){return ctx;}, addEventListener:function(){}, width:0, height:0 };
var raf=[];
var sandbox={
  innerHeight:844, innerWidth:390,
  document:{ getElementById:function(){return canvas;}, createElement:function(){ return {getContext:function(){return stubCtx();}, width:0, height:0}; } },
  addEventListener:function(){}, innerWidth:390, innerHeight:844, devicePixelRatio:3,
  requestAnimationFrame:function(f){ raf.push(f); }, setInterval:function(){},
  Math:Math, console:console, JSON:JSON, Date:Date, Int16Array:Int16Array, Uint8Array:Uint8Array,
  Array:Array, Object:Object, String:String, Number:Number, Proxy:Proxy, isNaN:isNaN, parseInt:parseInt
};
sandbox.window=sandbox;
var src=fs.readFileSync(process.argv[2]||'index.html','utf8');
var js=/<script>([\s\S]*)<\/script>/.exec(src)[1];
var ctxv=vm.createContext(sandbox);
vm.runInContext(js,ctxv,{filename:'game.js'});
// une frame par mode
var modes=['title','play','dead','win','shop'];
vm.runInContext("startRun();",ctxv);
for(var m of modes){
  vm.runInContext("mode='"+m+"';",ctxv);
  for(var f=0;f<8;f++) vm.runInContext("update(1/60); render();",ctxv);
  console.log('mode',m.padEnd(6),'OK');
}
// 30 secondes de jeu reel
vm.runInContext("startRun(); for(var i=0;i<1800;i++){ if(i%37===0) tapped=true; update(1/60); render(); }",ctxv);
console.log('1800 frames de jeu   OK');
console.log('mode final:',vm.runInContext("mode",ctxv),'| bucket:',vm.runInContext("P.x/BW|0",ctxv),'| particules:',vm.runInContext("parts.length",ctxv));
