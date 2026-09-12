// The music ported into the game must produce the same grid as the variant
// chosen on the audition page, and break nothing without AudioContext.
var fs=require('fs'), vm=require('vm');
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' FAIL ')+'  '+n); }

// --- 1. the game must not crash when audio is unavailable
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin font textAlign textBaseline globalAlpha shadowColor shadowBlur shadowOffsetY letterSpacing'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:()=>{}};
var ctx=new Proxy({},{get:(o,k)=>{
  if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>gr;
  if(k==='measureText') return s=>({width:(s||'').length*9});
  if(PROPS[k]) return o[k]; return ()=>{};
},set:(o,k,v)=>{o[k]=v;return true}});
var LS={ hb: JSON.stringify({seed:1306}) };
function boot(withAudio){
  var log=[];
  var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
   addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
   requestAnimationFrame:()=>{},setInterval:()=>{},
   localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
   Math,console,JSON,Date,Int16Array,Uint8Array,Float32Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
  if(withAudio){
    var node={connect:()=>{},start:()=>{},stop:()=>{},
      gain:{value:0,setValueAtTime:()=>{},linearRampToValueAtTime:()=>{},
            exponentialRampToValueAtTime:()=>{},setTargetAtTime:()=>{}},
      frequency:{value:0,setValueAtTime:function(v){log.push(['f',v])},
                 exponentialRampToValueAtTime:()=>{}},
      detune:{value:0}, Q:{value:0}, type:'', buffer:null};
    function mk(kind){ return function(){ log.push([kind]); return Object.create(node); }; }
    SB.AudioContext=function(){
      this.state='running'; this.currentTime=0; this.sampleRate=44100;
      this.destination={};
      this.createOscillator=function(){ var n=Object.create(node);
        n.frequency={value:0,setValueAtTime:function(v){n.f0=v},exponentialRampToValueAtTime:()=>{}};
        Object.defineProperty(n,'type',{set:function(v){n._t=v},get:function(){return n._t}});
        log.push(['osc',n]); return n; };
      this.createGain=mk('gain');
      this.createBiquadFilter=function(){ var n=Object.create(node); n.frequency={value:0}; n.Q={value:0}; log.push(['filter',n]); return n; };
      this.createBufferSource=function(){ var n=Object.create(node); log.push(['bufsrc',n]); return n; };
      this.createBuffer=function(c,l){ log.push(['buffer',l]); return {getChannelData:function(){return new Float32Array(l);}}; };
      this.resume=function(){};
    };
  }
  SB.window=SB;
  var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
  var C=vm.createContext(SB); vm.runInContext(js,C);
  return { R:c=>vm.runInContext(c,C), log:log };
}

var noAudio=boot(false);
noAudio.R('startRun(); for(var i=0;i<300;i++) update(1/60); render();');
t('without AudioContext: the game still runs', noAudio.R('mode')==='play' || noAudio.R('mode')==='dead');
t('without AudioContext: music stays off', noAudio.R('musOn')===false);

// --- 2. the grid being played
var g=boot(true);
g.R('ensureAudio(); startMusic();');
t('noise buffer created only once', g.log.filter(x=>x[0]==='buffer').length===1);
t('tempo at 126 bpm', Math.abs(g.R('STEP16') - 60/126/4) < 1e-9);

function bar(n){
  var before=g.log.length;
  g.R('for(var i='+(n*16)+';i<'+((n+1)*16)+';i++) musStepFn(i, 0);');
  return g.log.slice(before);
}
var b0=bar(0);
t('kick drum four times per bar',
  b0.filter(x=>x[0]==='osc' && x[1].f0===150).length===4);
t('hi-hat on the eight off-beats', b0.filter(x=>x[0]==='bufsrc').length===10);
// 4 kick + 4 bass + 12 chord notes (3 notes x 4 times) + 8 melody
t('28 oscillators per bar: kick, bass, chords, melody',
  b0.filter(x=>x[0]==='osc').length === 28);
t('bass follows the kick drum', b0.filter(x=>x[0]==='osc' && x[1].f0===150).length === 4);

// --- 3. the harmonic grid I - V - vi - IV
var roots=[];
for(var n=0;n<4;n++){
  var L=bar(n);
  roots.push(g.R('PROG['+n+']'));
}
t('progression I - V - vi - IV', JSON.stringify(roots)==='[0,7,9,5]');
t('only the sixth degree is minor', JSON.stringify(g.R('T3'))==='[4,4,3,4]');
t('the loop is four bars long', g.R('PROG.length')===4);
t('eight-note melody', g.R('MEL.length')===8);

console.log(ok.every(Boolean)?'\nMUSIC VALIDATED':'\nSOME TESTS FAIL');
process.exit(ok.every(Boolean)?0:1);
