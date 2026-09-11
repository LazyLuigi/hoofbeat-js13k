// Le panneau de debogage doit vraiment faire ce qu'il annonce.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var drawn=[], gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='fillText'||k==='strokeText') return function(s){ drawn.push(String(s)); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306, best:1234, p:50, mem:1}) };
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
function tapRow(i){ var r=R('devRow('+i+')'); R('press('+(r.x+r.w/2)+','+(r.y+r.h/2)+')'); }

// --- ouverture depuis n importe quel ecran
['attract','title','dead','play'].forEach(function(m){
  R('mode="'+m+'"');
  var b=R('devBtn()');
  R('press('+(b.x+b.w/2)+','+(b.y+b.h/2)+')');
  t('ouvre le panneau depuis "'+m+'"', R('mode')==='dev' && R('devBack')===m);
  tapRow(4);                                     // CLOSE (5e ligne depuis l ajout du pilote)
});
t('CLOSE revient a l ecran precedent', R('mode')==='play');

// --- le jeu est en pause pendant le panneau
R('mode="play"; startRun(); mode="dev";');
var x0=R('P.x');
R('for(var i=0;i<60;i++) update(1/60);');
t('le jeu est fige tant que le panneau est ouvert', R('P.x')===x0);

// --- UNLOCK ALL
R('mode="dev"; devBack="title";'); tapRow(1);
t('UNLOCK ALL : tout est debloque', R('[0,1,2,3,4,5,6,7,8,9].every(function(i){return unl(i)})'));
t('UNLOCK ALL : ameliorations au maximum',
  R('S.mem')===3 && R('S.dbl')===1 && R('S.glide')===1 && R('S.sh')===3 &&
  R('S.dash')===1 && R('S.sht')===3 && R('S.rew')===3);
t('UNLOCK ALL : credits fournis', R('S.p')>=999);
t('UNLOCK ALL : ecrit dans la sauvegarde', JSON.parse(LS.hb).sht===3);

// --- SKIP +1000 m
R('mode="dev"; devBack="title";'); tapRow(2);
t('SKIP depuis un menu : lance un run', R('mode')==='play');
var m1=R('P.x/BW|0');
t('SKIP : avance d environ 1000 m ('+m1+' m)', m1>950 && m1<1100);
t('SKIP : atterrit sur du sol solide', R('ground[bucket(P.x)]')>=0 && R('P.ground')===1);
t('SKIP : pas de credits offerts au passage', R('runGain')===0);
R('mode="dev"; devBack="play";'); tapRow(2);
var m2=R('P.x/BW|0');
t('SKIP en pleine partie : cumule ('+m1+' -> '+m2+' m)', m2>m1+950);
for(var q=0;q<3;q++){ R('mode="dev"; devBack="play";'); tapRow(2); }
t('SKIP repete atteint la zone des corbeaux ('+(R('P.x/BW|0'))+' m)',
  R('crows.some(function(c){return Math.abs(c.b*BW-P.x)<2000})'));

// --- WIPE (isole : on repart d une progression connue)
R('S.p=50; S.best=1234; S.mem=1; S.sht=2; S.sh=3; S.rew=1; S.skin=3;');
var seed0=R('S.seed');
R('mode="dev"; devBack="title";'); tapRow(0);
t('WIPE : nouvelle graine', R('S.seed')!==seed0);
t('WIPE : progression remise a zero', R('S.p')===0 && R('S.best')===0 && R('S.mem')===0);
t('WIPE : AUCUN champ ne devient undefined',
  R('["p","best","mem","dbl","dash","glide","sh","sht","rew","skin","ngp","runs"].every(function(k){return S[k]===0})'));
t('WIPE : trainees effacees', R('ghosts.length')===0);
t('WIPE : retour au titre', R('mode')==='title');

// --- rendu
R('mode="dev"'); drawn=[]; R('render()');
t('le panneau affiche ses quatre actions',
  ['WIPE SAVE','UNLOCK ALL','SKIP +1000 M','CLOSE'].every(function(l){return drawn.map(function(x){return String(x).toUpperCase()}).indexOf(l)>=0}));
R('mode="attract"'); drawn=[]; R('render()');
t('le bouton DEV est visible hors panneau', drawn.indexOf('DEV')>=0);
R('DEV=0'); drawn=[]; R('render()');
t('DEV=0 : plus aucun element de debogage', drawn.indexOf('DEV')<0);

console.log(ok.every(Boolean)?'\nPANNEAU DE DEBOGAGE VALIDE':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
