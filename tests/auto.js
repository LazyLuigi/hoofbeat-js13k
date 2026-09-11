// Le pilote de capture doit enchainer les parties, acheter, et progresser.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin font textAlign textBaseline globalAlpha shadowColor shadowBlur shadowOffsetY letterSpacing'.split(' ').forEach(p=>PROPS[p]=1);
var gr={addColorStop:()=>{}};
var ctx=new Proxy({},{get:(t,k)=>{
  if(k==='createLinearGradient'||k==='createRadialGradient') return ()=>gr;
  if(k==='measureText') return s=>({width:9});
  if(PROPS[k]) return t[k]; return ()=>{};
},set:(t,k,v)=>{t[k]=v;return true}});
function boot(seed){
  var LS={ hb: JSON.stringify({seed:seed}) };
  var SB={document:{getElementById:()=>({getContext:()=>ctx,addEventListener:()=>{},width:0,height:0}),createElement:()=>({getContext:()=>ctx,width:0,height:0})},
   addEventListener:()=>{},innerWidth:390,innerHeight:844,devicePixelRatio:3,requestAnimationFrame:()=>{},setInterval:()=>{},
   localStorage:{getItem:k=>k in LS?LS[k]:null,setItem:(k,v)=>{LS[k]=v},removeItem:k=>{delete LS[k]}},
   Math,console,JSON,Date,Int16Array,Uint8Array,Float32Array,Array,Object,String,Number,Proxy,isNaN,parseInt};
  SB.window=SB;
  var js=/<script>([\s\S]*)<\/script>/.exec(fs.readFileSync(process.argv[2]||'index.html','utf8'))[1];
  var C=vm.createContext(SB); vm.runInContext(js,C); return c=>vm.runInContext(c,C);
}
var ok=[]; function t(n,v){ ok.push(v); console.log((v?'  OK  ':' ECHEC')+'  '+n); }

// --- bascule depuis le menu DEV
var R = boot(1306);
t('le pilote est eteint au demarrage', R('AUTO') === 0);
R('mode="dev"; devBack="attract";');
var r3 = R('devRow(3)');
R('devClick(' + (r3.x + r3.w / 2) + ',' + (r3.y + r3.h / 2) + ');');
t('la ligne AUTOPILOT l allume', !!R('AUTO'));
t('et referme le panneau', R('mode') !== 'dev');
R('mode="dev"; devClick(' + (r3.x + r3.w / 2) + ',' + (r3.y + r3.h / 2) + ');');
t('un second appui l eteint', !R('AUTO'));

// --- cinq minutes de jeu automatique
R('AUTO=1; mode="attract";');   // on referme le panneau, sinon le pilote attend
var lives = 0, best = 0, last = R('P.x'), buys = 0, prevUp = R('S.mem+S.dbl+S.glide+S.sh+S.dash+S.sht+S.rew');
for(var f = 0; f < 18000; f++){
  R('update(1/60)');
  var x = R('P.x');
  if(x < last - 50) lives++;
  last = x;
  if(x / 8 > best) best = x / 8 | 0;
  var up = R('S.mem+S.dbl+S.glide+S.sh+S.dash+S.sht+S.rew');
  if(up > prevUp){ buys += up - prevUp; prevUp = up; }
}
console.log('       5 min : ' + lives + ' vies, record ' + best + ' m, ' + buys + ' ameliorations achetees, ' + R('S.p') + ' credits restants');
t('il enchaine les parties sans se bloquer', lives > 8);
t('il progresse au-dela du premier drapeau', best > 250);
t('il depense ses credits', buys > 0);
t('il reste en jeu, jamais coince sur un ecran', ['play','dead','win'].indexOf(R('mode')) >= 0);
t('rien n a ete casse : le mode est coherent', R('AUTO') === 1 || R('AUTO') === true);

// --- il utilise les pouvoirs quand il les a
R = boot(42);
R('AUTO=1; S.best=99999; S.mem=3; S.dbl=1; S.glide=1; S.dash=1; S.sh=3; S.sht=3; save();');
var dashes = 0, glides = 0;
R('var DH=0; var _d=die;');
for(var f2 = 0; f2 < 9000; f2++){
  R('update(1/60)');
  if(R('P.dash') > 0) dashes++;
  if(R('P.gl')) glides++;
}
console.log('       avec tous les pouvoirs : ' + dashes + ' frames de ruee, ' + glides + ' frames de plane');
t('il se sert de la ruee', dashes > 0);
t('il se sert du plane', glides > 0);

console.log(ok.every(Boolean) ? '\nPILOTE DE CAPTURE VALIDE' : '\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean) ? 0 : 1);
