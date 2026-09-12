// Every seed must produce a playable world, not just 1306.
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
  // 1. start on flat ground
  var startOk=true; for(var i=0;i<28;i++) if(ground[i]<0) startOk=false;
  // 2. no ledge out of reach (jump = 73 px of rise, 21 buckets)
  var unfair=0, NBv=7600, k=0;
  while(k<NBv){
    if(ground[k]<0){ var st=k; while(k<NBv&&ground[k]<0) k++;
      var w=k-st, from=ground[st-1], to=ground[k], isl=false;
      for(var q=st;q<k;q++) if(plats[q]>=0) isl=true;
      if(w<=21 && !isl && to<from-73) unfair++;
    } else k++;
  }
  // 3. every hard gap really is impossible to clear in one jump
  var hardOk=hard.every(h=>h[1]>21);
  if(!startOk||unfair||!hardOk){ bad++; console.log('  FAIL seed',seed,{startOk:startOk,unfair:unfair,hardOk:hardOk}); }
  // The learning zone must remain clearable by a beginner.
  // Curriculum: each mechanic waits for its flag.
  var F1=250, F3=750, spikesBefore=0, crowsBefore=0, easyMaxGap=0, worstGap=0, k2=0;
  for(var q2=0;q2<F1;q2++) if(spk[q2]) spikesBefore++;
  crowsBefore = crows.filter(function(c){ return c.b < F3; }).length;
  while(k2<2508){ if(ground[k2]<0){ var st2=k2; while(k2<2508&&ground[k2]<0) k2++;
      var wq=k2-st2; if(wq>worstGap) worstGap=wq; if(st2<100&&wq>easyMaxGap) easyMaxGap=wq; } else k2++; }
  if(spikesBefore || crowsBefore || easyMaxGap>18 || worstGap>37){
    bad++; console.log('  FAIL seed',seed,
      {spikesBefore250m:spikesBefore, crowsBefore750m:crowsBefore, gapBefore100m:easyMaxGap, maxGap:worstGap}); }
  var flagOk = flags.length===10 && flags.every(function(f){return ground[f.b]>=0;});
  var crowOk = crows.every(function(c){return c.b>750;});
  if(!flagOk||!crowOk){ bad++; console.log('  FAIL seed',seed,{flagOk:flagOk,crowOk:crowOk}); }
  stats.push([hard.length,prisms.length,crows.length]);
}
var hs=stats.map(s=>s[0]), ps=stats.map(s=>s[1]);
console.log('40 random seeds tested, defective worlds:',bad);
console.log('hard gaps      min',Math.min.apply(0,hs),' max',Math.max.apply(0,hs),' average',(hs.reduce((a,b)=>a+b)/40|0));
console.log('prisms         min',Math.min.apply(0,ps),' max',Math.max.apply(0,ps));
var cs=stats.map(function(x){return x[2];});
console.log('crows          min',Math.min.apply(0,cs),' max',Math.max.apply(0,cs));
console.log('flags          10 per world, all on solid ground');
console.log('curriculum: 0 spikes before 250 m, 0 crows before 750 m,');
console.log('            gap <= 18 before 100 m, and <= 37 everywhere (jump range = 21)');
process.exit(bad?1:0);
