// Verifie que toute l'echelle de deblocage tient debout.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306}) };
var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
 addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,
 requestAnimationFrame:()=>{},setInterval:()=>{},
 localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
 Math,console,JSON,Date,Int16Array,Uint8Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
SB.window=SB;
var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
var C=vm.createContext(SB); vm.runInContext(js,C);
var R=c=>vm.runInContext(c,C);
var ok=[];
function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }

// --- 1. echelle des drapeaux
var fl=R('flags.map(f=>f.b)'), GOAL=R('GOAL');
console.log('Drapeaux (m) :', fl.join(' '));
t('10 drapeaux, croissants, tous sur du sol', fl.length===10 && fl.every((b,i)=>i===0||b>fl[i-1]) && R('flags.every(f=>ground[f.b]>=0)'));
t('dernier drapeau proche de l arrivee', fl[9]>=GOAL-80);

// --- 2. verrouillage
R('S.best=0');
t('a 0 m, rien n est debloque', R('[0,1,2,3,4,5,6,7,8,9].every(i=>!unl(i))'));
R('S.best='+fl[3]);
t('au 4e drapeau, exactement 4 familles ouvertes', R('[0,1,2,3].every(i=>unl(i)) && ![4,5,6,7,8,9].some(i=>unl(i))'));

// --- 3. bouclier
R('S.best=1e9; S.sh=2; startRun(); P.sh=S.sh; P.inv=0');
R('hurt()'); var a=R('P.sh'); R('P.inv=0; hurt()'); var b=R('P.sh');
R('P.inv=0'); R('hurt()');
t('bouclier absorbe 2 chocs puis laisse mourir', a===1 && b===0 && R("mode")!=='play');

// --- 4. corbeaux
var nc=R('crows.length');
t('corbeaux generes uniquement apres le drapeau 3 (750 m)', nc>0 && R('crows.every(function(c){return c.b>750})'));
console.log('       ('+nc+' corbeaux)');

// --- 5. tir
R('S.sht=3; S.sh=9; S.best=1e9; startRun()');
R('P.x=crows[0].b*BW-600; P.y=P.gy=ground[bucket(P.x)]>=0?ground[bucket(P.x)]:P.y; P.sh=9; RT=0; P.cd=0; crows.forEach(function(c){c.k=0})');
var before=R('crows.filter(c=>!c.k).length');
R('for(var i=0;i<60;i++) update(1/60)');
var after=R('crows.filter(c=>!c.k).length');
t('le rayon detruit des corbeaux devant', after<before);
t('rechargement remis a 20-N', Math.abs(R('P.cd')-17)<1);

// --- 6. rembobinage
R('S.rew=2; startRun(); for(var i=0;i<400;i++){ if(i%50===0) tapped=true; update(1/60); }');
var xb=R('P.x'), cr=R('canRew()');
R('die()');
var deadMode=R('mode'), ghostsAfterDeath=R('ghosts.length');
R('doRewind()');
t('rembobinage disponible puis actif', cr && deadMode==='dead' && R('mode')==='play');
t('recule dans le temps', R('P.x')<xb);
t('la trainee poussee par la mort est annulee', R('ghosts.length')===ghostsAfterDeath-1);
t('une seule fois par run', !R('canRew()'));
// Les boutons REWIND et UPGRADES doivent etre disjoints sur l ecran de mort.
R('S.rew=2; rewUsed=0; rew=[[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1],[1,1,1]]; mode="dead"');
var rb=R('rewBtn()'), ub=R('upBtn()');
t('REWIND et UPGRADES ne se chevauchent pas', rb.y+rb.h <= ub.y || ub.y+ub.h <= rb.y);

// --- 7. pelages
t('5 pelages, cycle sans sortir du tableau', R('SKIN.length')===5 && R('S.skin=4; S.skin=(S.skin+1)%SKIN.length; S.skin')===0);

// --- 8. new game +
var cnt = '(function(){var n=0;for(var i=0;i<NB;i++)if(plats[i]>=0)n++;return n})()';
R('S.ngp=0; genLevel(4242);'); var p0=R(cnt);
R('S.ngp=1; genLevel(4242);'); var p1=R(cnt);
t('NG+ : une plateforme sur deux retiree, a graine egale ('+p0+' -> '+p1+')', p1 < p0 * 0.62 && p1 > 0);
R('S.ngp=0; genLevel(S.seed);');
var seedBefore=R('S.seed');
R('S.p=500; S.mem=3; newGamePlus()');
t('NG+ : nouveau monde', R('S.seed')!==seedBefore);
t('NG+ : ameliorations conservees', R('S.mem')===3 && R('S.p')===500);
t('NG+ : compteur incremente', R('S.ngp')===1);

console.log(ok.every(Boolean)?'\nECHELLE COMPLETE VALIDEE':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
