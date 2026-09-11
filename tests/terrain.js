// Le decor du sol doit etre STABLE quand la camera avance : on capture les
// positions monde des vermicelles a deux positions de camera qui changent
// le bucket de depart visible, et on exige le meme ensemble.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin font textAlign textBaseline globalAlpha shadowColor shadowBlur shadowOffsetY letterSpacing'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:function(){}}, tr=[], arcs=[];
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:9};};
  if(k==='translate') return function(x,y){ tr.push([x,y]); };
  if(k==='arc') return function(x,y,r){ arcs.push([x,y,r]); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306}) };
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Float32Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }

// Positions MONDE des vermicelles, limitees a la zone visible commune aux
// deux cameras : ceux qui entrent ou sortent par un bord sont normaux.
function sprinklesAt(cx, lo, hi){
  tr=[]; R('camX='+cx+'; camY=200; drawTerrain('+cx+', 200, Math.max(0,bucket('+cx+')-2), Math.min(NB,bucket('+cx+'+W)+3));');
  return tr.map(function(p){ return [Math.round((p[0]+cx)*10)/10, Math.round(p[1]*10)/10]; })
           .filter(function(p){ return p[0]>=lo && p[0]<=hi; })
           .map(function(p){ return p[0]+':'+p[1]; }).sort().join('|');
}
// La premiere plateforme (buckets 0 a ~50) depasse l'ecran : on avance de 8 px
// pour changer b0, puis encore de 8. Les vermicelles ne doivent pas bouger.
var W=R('W'), a=sprinklesAt(40,80,40+W-40), b=sprinklesAt(48,80,40+W-40), c=sprinklesAt(56,80,40+W-40);
t('vermicelles identiques quand le bucket de depart visible change (+8 px)', a===b && b===c && a.length>0);
console.log('       '+(a.split('|').length)+' vermicelles suivis');

// Meme test sur le nuage, seconde moitie : arcs en coordonnees monde
function arcsAt(cx, lo, hi){
  arcs=[]; R('camX='+cx+'; camY=200; drawTerrain('+cx+', 200, Math.max(0,bucket('+cx+')-2), Math.min(NB,bucket('+cx+'+W)+3));');
  return arcs.map(function(p){ return [Math.round((p[0]+cx)*10)/10, Math.round(p[1]*10)/10, Math.round(p[2]*10)/10]; })
             .filter(function(p){ return p[0]>=lo && p[0]<=hi; })
             .map(function(p){ return p.join(':'); }).sort().join('|');
}
var far=R('(function(){for(var b=Math.round(GOAL*0.7);b<NB;b++) if(ground[b]>=0&&ground[b+1]>=0&&ground[b+2]>=0) return b;return 0})()')*8;
var d=arcsAt(far+30, far+80, far+30+W-40), e=arcsAt(far+38, far+80, far+30+W-40);
t('arcs du nuage identiques quand la camera avance de 8 px', d===e && d.length>0);
console.log(ok.every(Boolean)?'\nDECOR DU SOL STABLE':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
