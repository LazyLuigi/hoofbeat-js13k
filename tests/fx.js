// Chaque pouvoir doit produire son effet, et seulement quand il est actif.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var ARCS={n:0};
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='arc'||k==='fillRect') return function(){ ARCS.n++; };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306, best:99999, dbl:1, glide:1, dash:1, sh:3, mem:3}) };
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
var R=c=>vm.runInContext(c,C);
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }
function kinds(){ return R('parts.map(function(p){return p.k})'); }
function count(k){ return kinds().filter(x=>x===k).length; }

// --- DOUBLE SAUT : couronne de paillettes
R('startRun(); parts=[]; P.ground=0; P.jumps=1; P.vy=100; tapped=1; update(1/60);');
t('double saut -> paillettes (k=1)', count(1) >= 14);
t('double saut -> paillettes qui retombent doucement',
  R('parts.filter(function(p){return p.k===1}).every(function(p){return p.g<0.4})'));

// --- RUEE : bouffees arc-en-ciel vers l arriere
R('startRun(); parts=[]; P.ground=0; P.dashUsed=0; P.dash=0; dashTap=1;');
R('for(var i=0;i<10;i++) update(1/60);');
t('ruee -> bouffees (k=2)', count(2) >= 6);
t('ruee -> bouffees emises DERRIERE la licorne',
  R('parts.filter(function(p){return p.k===2}).every(function(p){return p.x <= P.x && p.vx < 0})'));
t('ruee -> les bouffees flottent au lieu de tomber',
  R('parts.filter(function(p){return p.k===2}).every(function(p){return p.g < 0})'));

// --- PLANE : etoiles + pattes ecartees, uniquement quand actif
R('startRun(); parts=[]; P.ground=0; P.vy=400; jumpHeld=0; update(1/60);');
t('plane inactif -> P.gl a 0 et aucune etoile', R('P.gl')===0 && count(1)===0);
R('parts=[]; P.ground=0; P.vy=400; jumpHeld=1;');
R('for(var i=0;i<20;i++){ P.vy=400; update(1/60); }');
t('plane actif -> P.gl a 1', R('P.gl')===1);
t('plane actif -> trainee d etoiles', count(1) >= 3);
t('plane actif -> vitesse de chute plafonnee', R('P.vy') <= 111);

// --- BOUCLIER : dessine seulement s il reste des charges
R('startRun(); mode="play"; P.sh=3; P.inv=0;');
t('bouclier a 3 charges -> effet dessine', (ARCS.n=0, R('drawShield(camX,camY)'), ARCS.n) >= 9);
R('P.sh=0; P.inv=0;');
t('bouclier vide -> aucun effet', (ARCS.n=0, R('drawShield(camX,camY)'), ARCS.n) === 0);

// --- MEMOIRE : atterrir sur une trainee scintille
// jumpHeld doit etre remis a 0 : sinon le plane du test precedent
// freine la chute et fausse l atterrissage.
R('startRun(); jumpHeld=0; var br=new Array(NB).fill(-1); for(var i=60;i<=120;i++) br[i]=300; ghosts=[br];');
R('P.x=70*BW; P.y=180; P.vy=700; P.ground=0; parts=[];');
R('for(var i=0;i<60;i++){ update(1/60); if(P.ground) break; }');
t('atterrissage sur une trainee -> paillettes', R('P.ground') && count(1) > 0);
R('startRun(); jumpHeld=0; P.x=40; P.y=ground[5]-260; P.vy=700; P.ground=0; parts=[]; ghosts=[];');
R('for(var i=0;i<60;i++){ update(1/60); if(P.ground) break; }');
t('atterrissage sur la terre ferme -> pas de paillettes', R('P.ground') && count(1) === 0);

// --- MORT : la licorne explose en confettis
R('startRun(); jumpHeld=0; conf=[]; parts=[]; boom=0; P.sh=0; P.inv=0; die();');
t('mort -> gerbe de confettis', R('conf.length') >= 100);
t('mort -> paillettes en etoile projetees', R('parts.filter(function(p){return p.k===1}).length') >= 26);
t('mort -> onde de choc armee', R('boom') > 1.5 && R('boomX') > 0);
t('mort -> on passe bien sur l ecran de mort', R('mode') === 'dead');
var UNI = { n:0 };
R('mode="dead"');
t('la licorne n est plus dessinee apres avoir explose',
  (UNI.n = 0, R('(function(){var n=0,o=drawUnicorn;drawUnicorn=function(){n++};render();drawUnicorn=o;return n})()')) === 0);
R('mode="play"');
t('la licorne revient en jeu',
  R('(function(){var n=0,o=drawUnicorn;drawUnicorn=function(){n++};render();drawUnicorn=o;return n})()') === 1);
R('startRun();');
t('relancer nettoie l explosion', R('conf.length') === 0 && R('boom') === 0);

// --- CHUTE : mortelle a 220 px sous le sol local, jamais sous une trainee
R('startRun(); jumpHeld=0; S.sh=3; P.sh=3; P.inv=0;');
var ref=R('fallRef(bucket(P.x))');
R('P.y='+(ref+150)+'; P.ground=0; P.vy=300; mode="play";');
R('for(var i=0;i<6;i++){ update(1/60); if(mode!=="play") break; }');
t('150 px sous le sol local : on vit encore', R('mode') === 'play');
R('P.y='+(ref+230)+'; P.vy=0; P.ground=0; P.sh=3; P.inv=0; mode="play"; update(1/60);');
t('au-dela de 220 px : mort immediate', R('mode') === 'dead');
t('la mort par chute ignore le bouclier', R('P.sh') === 3);

// Le cas qui tuait en plein vol : une trainee tres haute dans le ciel, puis
// une chute vers la plateforme. La reference ne doit pas etre la trainee.
R('startRun(); jumpHeld=0; var skyT=new Array(NB).fill(-1); for(var i=8;i<=14;i++) skyT[i]=20; ghosts=[skyT];');
R('P.x=10*BW; P.y=20; P.vy=0; P.ground=1; mode="play";');
R('for(var i=0;i<4;i++) update(1/60);');            // on court sur le ruban celeste
t('on tient debout sur un ruban a y=20', !!R('P.ground') && R('P.y')<=24);
R('for(var i=0;i<60;i++){ update(1/60); if(!P.ground) break; }');   // on sort du ruban
R('for(var i=0;i<200;i++){ update(1/60); if(mode!=="play"||P.ground) break; }');
t('en tombant du ruban on ATTERRIT sur le sol au lieu de mourir en vol',
  R('mode')==='play' && !!R('P.ground') && R('P.y')>200);
// --- PIC : ne blesse que dans sa hauteur
R('startRun(); jumpHeld=0; S.sh=3; P.sh=3; P.inv=0;');
R('var sb=0; for(var i=40;i<NB;i++) if(spk[i]){ sb=i; break; }');
t('un pic existe dans le monde', R('sb') > 0);
R('P.x=sb*BW+3; P.y=ground[sb]+80; P.ground=0; P.vy=200; P.inv=0;');
R('update(1/60);');
t('on chute 80 px sous le pic : le bouclier reste intact', R('P.sh') === 3);
R('P.x=sb*BW+3; P.y=ground[sb]; P.ground=1; P.vy=0; P.inv=0; update(1/60);');
t('on touche le pic a sa hauteur : le bouclier encaisse', R('P.sh') === 2);

// --- DELAI DE MORT : l explosion joue seule avant le panneau
R('startRun(); jumpHeld=0; P.sh=0; P.inv=0;');
R('var _p=panel, PN=0; panel=function(){ PN++; return _p.apply(null, arguments); };');
R('die();');
t('la mort arme le delai', R('deadT') > 0.9);
R('PN=0; render();');
t('juste apres la mort : aucun panneau dessine', R('PN') === 0);
t('mais l explosion est bien la', R('conf.length') > 100 && R('boom') > 0);

// un joueur qui tapote ne doit ni relancer ni declencher un bouton
var ub = R('upBtn()');
R('press(' + (ub.x + ub.w / 2) + ',' + (ub.y + ub.h / 2) + ');');
t('un appui sur la zone UPGRADES ne fait rien', R('mode') === 'dead');
R('tapped=1; update(1/60);');
t('un appui ne relance pas la partie', R('mode') === 'dead');

R('for(var i=0;i<70;i++) update(1/60);');          // ~1,17 s
t('apres une seconde le delai est ecoule', R('deadT') <= 0);
R('PN=0; render();');
t('le panneau apparait alors', R('PN') === 1);
R('tapped=1; update(1/60);');
t('et l appui relance la partie', R('mode') === 'play');
R('panel=_p;');

// --- pas de fuite de particules
R('startRun(); jumpHeld=0; for(var i=0;i<2400;i++){ if(i%23===0) tapped=1; if(i%97===0) dashTap=1; jumpHeld=i%50<20; update(1/60); }');
t('aucune fuite de particules sur 40 s', R('parts.length') < 400);
console.log('       particules vivantes apres 40 s :', R('parts.length'));

console.log(ok.every(Boolean)?'\nEFFETS DE POUVOIRS VALIDES':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
