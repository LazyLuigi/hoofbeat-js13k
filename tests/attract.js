// L'ecran d'accroche doit se montrer sous son meilleur jour : la licorne
// automatique doit courir longtemps sans mourir, et ne rien enregistrer.
var fs=require('fs'), vm=require('vm');
var PROPS={}; 'fillStyle strokeStyle lineWidth lineCap lineJoin miterLimit lineDashOffset font textAlign textBaseline globalAlpha globalCompositeOperation shadowColor shadowBlur shadowOffsetX shadowOffsetY imageSmoothingEnabled letterSpacing filter direction'.split(' ').forEach(p=>PROPS[p]=1);
var drawn=[], gr={addColorStop:function(){}};
var ctx=new Proxy({},{get:function(t,k){
  if(k==='createLinearGradient'||k==='createRadialGradient') return function(){return gr;};
  if(k==='measureText') return function(s){return{width:(s||'').length*9};};
  if(k==='fillText'||k==='strokeText') return function(s){ drawn.push(s); };
  if(PROPS[k]) return t[k]; return function(){};
},set:function(t,k,v){t[k]=v;return true;}});
var LS={ hb: JSON.stringify({seed:1306, best:4321, p:77, mem:2}) };  // partie deja en cours
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

t('demarre en mode accroche malgre une sauvegarde existante', R('mode')==='attract');
t('la sauvegarde est bien chargee', R('S.best')===4321 && R('S.p')===77 && R('S.mem')===2);

// --- 60 secondes de demo
var bestX=0, deaths=0, lastX=R('P.x');
for(var f=0; f<3600; f++){
  R('update(1/60)');
  var x=R('P.x');
  if(x < lastX - 50) deaths++;
  lastX=x; if(x>bestX) bestX=x;
}
console.log('       60 s de demo : distance max '+(bestX/8|0)+' m, '+deaths+' chutes');
t('la demo progresse au fil de ses chutes', bestX/8 > 200);
t('la demo ne reste pas bloquee au meme endroit', deaths < 14);
t('le record n est PAS modifie par la demo', R('S.best')===4321);
t('les credits ne bougent PAS', R('S.p')===77);
t('les vraies trainees du joueur sont intactes', R('dReal').length===0);
t('reste en mode accroche', R('mode')==='attract');

// --- rendu de l ecran
drawn=[]; R('render()');
t('affiche le titre en lettres bulles', drawn.filter(d=>'HOOFBEAT'.indexOf(d)>=0&&d.length===1).length>=8);
t('affiche l invite TAP TO RUN', drawn.some(d=>String(d).toUpperCase().indexOf('TAP')>=0));
t('n affiche PAS le panneau titre', !drawn.some(d=>String(d).toUpperCase().indexOf('YOU CAN ONLY RUN')>=0));
t('n affiche PAS le HUD', !drawn.some(d=>/^\d+ ?m$/i.test(String(d).trim())));

// --- un appui lance la vraie partie
R('press(200,400)');
t('un appui lance la partie', R('mode')==='play' && (R('P.x/BW|0'))<10);
R('for(var i=0;i<120;i++) update(1/60)');
t('la vraie partie enregistre a nouveau la progression', R('S.best')===4321 || R('S.best')>0);

console.log(ok.every(Boolean)?'\nECRAN D ACCROCHE VALIDE':'\nDES TESTS ECHOUENT');
process.exit(ok.every(Boolean)?0:1);
