// Chaque graine doit produire un monde jouable, pas seulement la 1306.
var fs=require('fs'), vm=require('vm');
var src=fs.readFileSync(process.argv[2]||'index.html','utf8');
var gen=/function genLevel\(seed\)\{[\s\S]*?\n\}/.exec(src)[0]
  .replace(/  clouds = \[\];[\s\S]*?\n/,'  return hard1;\n')
  .replace('prisms = [];','prisms = []; var hard1 = [];')
  .replace('var gapStart = i;','var gapStart = i; if(hard) hard1.push([i,gap]);');
var code=`
function rng(s){ return function(){ s|=0; s=s+0x6D2B79F5|0;
  var t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296; }; }
var BW=8,NB=2508,GOAL=NB-8,EASY=100,MS=40,CP=200,ground,plats,spk,prisms,crows,flags;
var FP=[10,20,30,40,50,60,70,80,90,100];
var S={ngp:0};
`+gen;
var C=vm.createContext({Math,Int16Array,Uint8Array,Array,console});
vm.runInContext(code,C);

var bad=0, stats=[];
for(var t=0;t<40;t++){
  var seed=(Math.random()*2e9|0)||7;
  var hard=vm.runInContext('genLevel('+seed+')',C);
  var ground=vm.runInContext('ground',C), plats=vm.runInContext('plats',C);
  var prisms=vm.runInContext('prisms',C), flags=vm.runInContext('flags',C), crows=vm.runInContext('crows',C);
  var spk=vm.runInContext('spk',C);
  // 1. depart sur du sol plat
  var startOk=true; for(var i=0;i<28;i++) if(ground[i]<0) startOk=false;
  // 2. aucun rebord hors de portee (saut = 73 px de montee, 21 buckets)
  var unfair=0, NBv=7600, k=0;
  while(k<NBv){
    if(ground[k]<0){ var st=k; while(k<NBv&&ground[k]<0) k++;
      var w=k-st, from=ground[st-1], to=ground[k], isl=false;
      for(var q=st;q<k;q++) if(plats[q]>=0) isl=true;
      if(w<=21 && !isl && to<from-73) unfair++;
    } else k++;
  }
  // 3. tous les gouffres durs sont bien infranchissables d'un saut
  var hardOk=hard.every(h=>h[1]>21);
  if(!startOk||unfair||!hardOk){ bad++; console.log('  PROBLEME graine',seed,{startOk:startOk,unfair:unfair,hardOk:hardOk}); }
  // La zone d apprentissage doit rester franchissable par un debutant.
  // Curriculum : chaque mecanique attend son drapeau.
  var F1=250, F3=750, spikesBefore=0, crowsBefore=0, easyMaxGap=0, worstGap=0, k2=0;
  for(var q2=0;q2<F1;q2++) if(spk[q2]) spikesBefore++;
  crowsBefore = crows.filter(function(c){ return c.b < F3; }).length;
  while(k2<2508){ if(ground[k2]<0){ var st2=k2; while(k2<2508&&ground[k2]<0) k2++;
      var wq=k2-st2; if(wq>worstGap) worstGap=wq; if(st2<100&&wq>easyMaxGap) easyMaxGap=wq; } else k2++; }
  if(spikesBefore || crowsBefore || easyMaxGap>18 || worstGap>37){
    bad++; console.log('  PROBLEME graine',seed,
      {picsAvant250m:spikesBefore, corbeauxAvant750m:crowsBefore, gouffreAvant100m:easyMaxGap, gouffreMax:worstGap}); }
  var flagOk = flags.length===10 && flags.every(function(f){return ground[f.b]>=0;});
  var crowOk = crows.every(function(c){return c.b>750;});
  if(!flagOk||!crowOk){ bad++; console.log('  PROBLEME graine',seed,{flagOk:flagOk,crowOk:crowOk}); }
  stats.push([hard.length,prisms.length,crows.length]);
}
var hs=stats.map(s=>s[0]), ps=stats.map(s=>s[1]);
console.log('40 graines aleatoires testees, mondes defectueux :',bad);
console.log('gouffres durs  min',Math.min.apply(0,hs),' max',Math.max.apply(0,hs),' moyenne',(hs.reduce((a,b)=>a+b)/40|0));
console.log('prismes        min',Math.min.apply(0,ps),' max',Math.max.apply(0,ps));
var cs=stats.map(function(x){return x[2];});
console.log('corbeaux       min',Math.min.apply(0,cs),' max',Math.max.apply(0,cs));
console.log('drapeaux       10 par monde, tous sur du sol solide');
console.log('curriculum : 0 pic avant 250 m, 0 corbeau avant 750 m,');
console.log('             gouffre <= 18 avant 100 m, et <= 37 partout (portee du saut = 21)');
process.exit(bad?1:0);
