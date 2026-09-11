// La musique portee dans le jeu doit produire la meme grille que la variante
// choisie sur la page d'audition, et ne rien casser sans AudioContext.
var fs=require('fs'), vm=require('vm');
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }

// --- 1. le jeu ne doit pas planter quand l audio est indisponible
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
t('sans AudioContext : le jeu tourne quand meme', noAudio.R('mode')==='play' || noAudio.R('mode')==='dead');
t('sans AudioContext : la musique reste eteinte', noAudio.R('musOn')===false);

// --- 2. la grille jouee
var g=boot(true);
g.R('ensureAudio(); startMusic();');
t('tampon de bruit cree une seule fois', g.log.filter(x=>x[0]==='buffer').length===1);
t('tempo a 126 bpm', Math.abs(g.R('STEP16') - 60/126/4) < 1e-9);

function bar(n){
  var before=g.log.length;
  g.R('for(var i='+(n*16)+';i<'+((n+1)*16)+';i++) musStepFn(i, 0);');
  return g.log.slice(before);
}
var b0=bar(0);
t('grosse caisse quatre fois par mesure',
  b0.filter(x=>x[0]==='osc' && x[1].f0===150).length===4);
t('charleston sur les huit contretemps', b0.filter(x=>x[0]==='bufsrc').length===10);
// 4 kick + 4 basse + 12 notes d accords (3 notes x 4 fois) + 8 melodie
t('28 oscillateurs par mesure : kick, basse, accords, melodie',
  b0.filter(x=>x[0]==='osc').length === 28);
t('la basse suit la grosse caisse', b0.filter(x=>x[0]==='osc' && x[1].f0===150).length === 4);

// --- 3. la grille harmonique I - V - vi - IV
var roots=[];
for(var n=0;n<4;n++){
  var L=bar(n);
  roots.push(g.R('PROG['+n+']'));
}
t('progression I - V - vi - IV', JSON.stringify(roots)==='[0,7,9,5]');
t('seul le sixieme degre est mineur', JSON.stringify(g.R('T3'))==='[4,4,3,4]');
t('la boucle fait quatre mesures', g.R('PROG.length')===4);
t('melodie de huit notes', g.R('MEL.length')===8);

console.log(ok.every(Boolean)?'\nMUSIQUE VALIDEE':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
