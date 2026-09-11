// La fete se declenche-t-elle vraiment, et le mystere tient-il ?
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var drawn=[];
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='fillText'||k==='strokeText') return function(s){ drawn.push(s); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306}) };   // graine figee : sinon le test depend du hasard
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB; SB.__drawn=function(x){ drawn.push(x); };
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
// Version 80 : le texte est dessine par T_ en rectangles, on l'ecoute aussi.
vm.runInContext("if(typeof T_==='function'){ var _T=T_; T_=function(s){ __drawn(String(s).toUpperCase()); return _T.apply(null,arguments); }; }",C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }

// --- mystere : rien de verrouille ne doit reveler son nom
R('S.best=0; mode="shop"'); drawn=[]; R('for(var i=0;i<3;i++) render();');
var names=R('FLAG');
var leaked=names.filter(n=>n!=='NEW GAME +'&&drawn.some(d=>String(d).indexOf(n)>=0));
t('boutique verrouillee : aucun nom de pouvoir affiche', leaked.length===0);
t('boutique verrouillee : invite "Unlock a new PowerUp" presente',
  drawn.some(d=>String(d).toUpperCase().indexOf('UNLOCK A NEW POWERUP')>=0));
console.log('       exemple affiche :', drawn.filter(d=>String(d).indexOf('at ')===0)[0]);

// --- une fois debloque, le nom apparait
R('S.best=1e9'); drawn=[]; R('for(var i=0;i<3;i++) render();');
t('boutique debloquee : les noms apparaissent',
  ['MEMORY','SHIELD','BEAM','REWIND','COAT'].every(n=>drawn.some(d=>String(d).indexOf(n)>=0)));
t('boutique debloquee : plus aucune invite de verrouillage',
  !drawn.some(d=>String(d).toUpperCase().indexOf('UNLOCK A NEW POWERUP')>=0));

// --- drapeau verrouille dans le monde
R('S.best=0; mode="play"; startRun(); P.x=flags[0].b*BW-200; camX=P.x-100;');
drawn=[]; R('render();');
t('drapeau verrouille : affiche "? ? ?" et la distance',
  drawn.some(d=>String(d).indexOf('? ? ?')>=0) && !drawn.some(d=>d==='MEMORY'));

// --- franchissement : confettis, ondes, banniere
R('S.best=0; startRun(); P.x=flags[0].b*BW-40;');
var cBefore=R('conf.length');
R('for(var i=0;i<40;i++) update(1/60);');
t('franchissement -> confettis generes', R('conf.length')>60);
t('franchissement -> fete armee', R('party')>1.5);
t('franchissement -> banniere = nom du pouvoir', R('bannerTxt')==='MEMORY');
t('franchissement -> deblocage sauvegarde', R('unl(0)') && !!LS.hb);
drawn=[]; R('render();');
t('banniere affiche POWER UP', drawn.some(d=>d==='POWER UP') && drawn.some(d=>d==='MEMORY'));

// --- les confettis retombent et disparaissent
R("for(var i=0;i<700;i++) update(1/60);");
t('confettis nettoyes apres la fete', R('conf.length')===0 && R('party')<=0);

// --- bouton UPGRADES : trois etats, aucun compteur
R('S.best=0; S.p=999; mode="title"');
t('rien de debloque -> bouton grise (etat 0)', R('shopState()') === 0);
R('S.best=flags[0].b; S.p=0; S.mem=0');
t('famille ouverte mais sans credits -> etat 1', R('shopState()') === 1);
R('S.p=10');
t('achat possible -> etat 2, le bouton scintille', R('shopState()') === 2);
R('S.mem=3; S.p=999');
t('famille au maximum -> retombe en etat 1', R('shopState()') === 1);
R('S.best=0; S.p=999; S.mem=0');
t('credits pleins mais tout verrouille -> reste en etat 0', R('shopState()') === 0);
drawn = [];
[0, 1, 2].forEach(function(want){
  if(want === 0) R('S.best=0; S.p=999');
  if(want === 1) R('S.best=flags[0].b; S.p=0');
  if(want === 2) R('S.best=flags[0].b; S.p=999; S.mem=0');
  R('mode="title"; render()');
});
t('le libelle reste "UPGRADES" sans compteur, dans les trois etats',
  drawn.filter(function(d){ return String(d).indexOf('UPGRADES') === 0; })
       .every(function(d){ return d === 'UPGRADES'; }));

console.log(ok.every(Boolean)?'\nFETE ET MYSTERE VALIDES':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
