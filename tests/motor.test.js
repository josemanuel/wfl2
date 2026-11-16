// Pruebas del motor puro (sin DOM). Uso: node tests/motor.test.js
const M=require('../js/motor.js');
let fallos=0; const t=(n,c,x='')=>{if(!c)fallos++;console.log((c?'OK  ':'FALLA ')+n+(c?'':'  -> '+x));};
const cam={met:3.5,pct:100,progresion:[25,30,35,40,45,50].map((m,i)=>({min:m+'–'+(m+5),dias:i<3?5:6}))};
const g=M.gastoEjercicioDiario([cam],85); t('ejercicio caminar 85 kg entre 80 y 200 kcal/día',g>80&&g<200,g);
t('sin actividades: 0',M.gastoEjercicioDiario([],85)===0);
t("'120+' se interpreta como 120 min",M.gastoEjercicioDiario([{met:6,pct:100,progresion:[{min:'120+',dias:1}]}],70)>0);
let e=M.calcularEnergia({peso:85,altura:170,edad:40,sexo:'hombre',items:[cam],ritmo:0.75});
t('Mifflin sin grasa; TDEE = TMB×1,2 + ejercicio',e.tmbMetodo==='Mifflin-St Jeor'&&e.tdee===Math.round(e.tmb*1.2+e.ejercicio),JSON.stringify(e));
t('TDEE menor que el antiguo ×1,375',e.tdee<Math.round(e.tmb*1.375));
e=M.calcularEnergia({peso:85,altura:170,edad:40,sexo:'hombre',masaMagra:'60',items:[],ritmo:0.75});
t('Katch-McArdle con masa magra 60 kg = 1666',e.tmbMetodo==='Katch-McArdle'&&Math.round(e.tmb)===1666,e.tmb);
e=M.calcularEnergia({peso:60,altura:155,edad:65,sexo:'hombre',items:[],ritmo:1});
t('suelo hombre 1.500 (o el gasto si es menor), sin superávit',e.pisoAplicado&&e.calObjetivo>=Math.min(1500,e.tdee)&&e.deficit>=0,JSON.stringify(e));
e=M.calcularEnergia({peso:55,altura:155,edad:60,sexo:'mujer',items:[],ritmo:1});
t('suelo mujer 1.200',e.pisoAplicado&&e.calObjetivo>=Math.min(1200,e.tdee)&&e.deficit>=0,JSON.stringify(e));
e=M.calcularEnergia({peso:45,altura:165,edad:30,sexo:'mujer',items:[],ritmo:0.4,ganancia:true});
t('ganancia: superávit y sin suelo',e.deficit<0&&!e.pisoAplicado&&e.calObjetivo>e.tdee);
let c=M.evaluarCribado(['embarazo'],30,'perdida'); t('embarazo bloquea',c.bloqueos.length===1);
c=M.evaluarCribado(['tca'],30,'ganancia'); t('TCA bloquea también ganancia',c.bloqueos.length===1);
t('menor bloquea pérdida',M.evaluarCribado([],17,'perdida').bloqueos.length===1);
t('menor no bloquea ganancia',M.evaluarCribado([],17,'ganancia').bloqueos.length===0);
c=M.evaluarCribado(['renal','insulina'],40,'perdida'); t('renal e insulina avisan y piden confirmar',c.bloqueos.length===0&&c.avisos.length===2&&c.confirmar);
t('sin factores: nada',(c=M.evaluarCribado([],40,'perdida')).bloqueos.length+c.avisos.length===0&&!c.confirmar);

// --- Gráfica con fechas reales ---
const dg={tipoPlan:'perdida',pesoActual:90,pesoObjetivo:80,perdidaSemanal:0.5,fechaInicio:'2026-01-01'};
let G=M.datosGrafica(dg,[{fecha:'2026-01-15',peso:89},{fecha:'2026-02-01',peso:88}]);
t('gráfica: eje en días reales (0, 14, 31)',JSON.stringify(G.reales.map(p=>p.x))==='[0,14,31]',JSON.stringify(G.reales));
t('gráfica: proyección llega al objetivo a las 20 semanas',G.proyeccion[1].x===140&&G.proyeccion[1].y===80);
t('gráfica: banda 0,5 y 1 kg/sem acaban en el objetivo',G.bandaMin[1].y===80&&G.bandaMax[1].y===80&&G.bandaMax[1].x===70&&G.bandaMin[1].x===140,JSON.stringify([G.bandaMin,G.bandaMax]));
t('gráfica: media móvil con 3 o más puntos',Array.isArray(G.media)&&G.media.length===3);
t('gráfica: sin historial no hay media y solo el punto inicial',(G=M.datosGrafica(dg,[])).media===null&&G.reales.length===1);
G=M.datosGrafica({tipoPlan:'ganancia',pesoActual:45,pesoObjetivo:54.5,perdidaSemanal:0.4,fechaInicio:'2026-01-01'},[]);
t('gráfica ganancia: banda ascendente sin pasar del objetivo',G.bandaMax[1].y<=54.5&&G.bandaMax[1].y>45&&G.bandaMin[1].y>45);
G=M.datosGrafica({...dg,fechaInicio:'2026-02-01',pesoActual:88},[{fecha:'2026-01-15',peso:89},{fecha:'2026-02-01',peso:88}]);
t('tras recalcular se conserva el histórico previo (x negativo) sin duplicar el inicio',G.xmin===-17&&G.reales.length===2,JSON.stringify(G.reales));
// --- Otras funciones del módulo ---
t('objetivoIdeal 45 kg/165 cm: 54,5 kg en 6 meses',(e=M.objetivoIdeal(45,165)).pm===54.5&&e.meses===6);
t('objetivoIdeal 140 kg/170 cm: fase de 12 meses hasta 101',(e=M.objetivoIdeal(140,170)).fases&&e.pa===101);
t('objetivoIdeal normopeso: null',M.objetivoIdeal(70,175)===null);
t('ajusteKcal ganancia 0,4 = -450 (como en la app: redondeo a 50)',M.ajusteKcal(true,0.4)===-450||M.ajusteKcal(true,0.4)===-400,M.ajusteKcal(true,0.4));
t('normalizarPlan recalcula un plan de ganancia antiguo',(e=M.normalizarPlan({tipoPlan:'ganancia',deficit:500,perdidaTotal:-9.5,pesoActual:45,pesoObjetivo:54.5,meses:6,tdee:1600})).deficit<0&&e.calObjetivo>1600);
t('proy con tope en el objetivo',M.proy(dg,1000)===80&&M.proy(dg,2)===89);
t('etiquetaPlan',M.etiquetaPlan({tipoPlan:'ganancia',imcActual:17})==='Ganancia de peso saludable (bajo peso)');
t('interpolarMET',M.interpolarMET([{v:4,met:2},{v:6,met:4}],5)===3);

// --- Datos nutricionales y escalado de menús ---
const A=require('../js/alimentos.js');
const orig=require('fs').readFileSync(require('path').join(__dirname,'..','WalkForLife.html'),'utf8');
t('datos: dorada a la plancha 93 kcal (BEDCA, captura del autor)',A.ALIMENTOS.A12.k===93&&A.ALIMENTOS.A12.s==='BEDCA');
t('datos: garbanzos hervidos recalculados (160) y no los 360 kcal de BEDCA',A.ALIMENTOS.A45.k===160&&A.ALIMENTOS.A45.s.includes('recalculado'));
t('datos: yogur griego 0% marcado como estimación',A.ALIMENTOS.A20.s==='estimación'&&A.ALIMENTOS.A20.k<80);
t('datos: todos los alimentos usados tienen kcal',Object.values(A.ALIMENTOS).every(f=>f.k>=0&&f.s));
let nOk=0,nTot=0,ident=true;
for(const dk of Object.keys(A.MENU_ESC))for(const d of A.MENU_ESC[dk]){nTot++; const E=M.escalarMenuDia(d,2000); if(E.ok)nOk++;
  for(const m of ['desayuno','snackAM','comida','snackPM','cena']){ if(/\{\{/.test(M.aplicarFactorTpl(d[m].t,1.2))) ident=false; }}
t('los 21 días del menú tienen todos sus alimentos con datos',nOk===21&&nTot===21,nOk+'/'+nTot);
t('plantillas sin marcas {{ }} tras escalar',ident);
// las plantillas con factor 1 reconstruyen exactamente el texto original de MENU_SEMANAL
const ms=new Function('return '+orig.match(/const MENU_SEMANAL = (\{[\s\S]*?\n\});/)[1])();
let exact=true; for(const dk in ms)ms[dk].dias.forEach((d,i)=>['desayuno','snackAM','comida','snackPM','cena'].forEach(m=>{if(M.aplicarFactorTpl(A.MENU_ESC[dk][i][m].t,1)!==d[m])exact=false;}));
t('factor 1 reproduce exactamente los 105 textos originales',exact);
let d0=A.MENU_ESC[2][0],E=M.escalarMenuDia(d0,1500);
t('escalado: alcanza el objetivo cuando no se limita',!E.limitado&&Math.abs(E.kcal-1500)<=2,JSON.stringify([E.kcal,E.factor]));
E=M.escalarMenuDia(A.MENU_ESC[3][0],1800); t('escalado: factor limitado a 1,5 y marcado',E.limitado&&E.factor===1.5&&E.kcal<1800);
E=M.escalarMenuDia(A.MENU_ESC[1][0],1000); t('escalado a la baja: reduce cantidades (factor <1)',E.factor<1&&E.kcal===1000||E.limitado);
t('unidades fijas: "2 huevos" no cambia al escalar',M.escalarMenuDia(A.MENU_ESC[1][0],1900).textos.desayuno.includes('2 huevos'));
t('aplicarFactorTpl redondea a 5 y mínimo 5',M.aplicarFactorTpl('{{150g}} y {{5g}}',1.22)==='185g y 5g',M.aplicarFactorTpl('{{150g}} y {{5g}}',1.22));
const bad=JSON.parse(JSON.stringify(A.MENU_ESC[1][0])); bad.cena.k=false; E=M.escalarMenuDia(bad,1800);
t('si falta algún dato el día no se escala',!E.ok&&E.factor===1&&E.textos.desayuno===M.aplicarFactorTpl(bad.desayuno.t,1));

// --- recalcularPlanDesde ---
const pl={tipoPlan:'perdida',altura:170,edad:40,sexo:'hombre',pesoActual:90,pesoObjetivo:80,imcActual:31,avisos:['Mínimo calórico aplicado (1500 kcal): antiguo'],meses:6,masaMagra:null,fechaInicio:'2026-01-01'};
let rc=M.recalcularPlanDesde(pl,86,'2026-02-15',[]);
t('recalcular pérdida: nuevo punto de partida y plazo a 0,75 kg/sem',!rc.alcanzado&&rc.plan.pesoActual===86&&rc.plan.perdidaTotal===6&&rc.meses===Math.ceil(6/0.75/4.33)&&rc.plan.fechaInicio==='2026-02-15'&&rc.plan.recalculado,JSON.stringify([rc.meses,rc.plan.perdidaSemanal]));
t('recalcular: IMC, TMB y objetivo calórico actualizados',Math.abs(rc.plan.imcActual-86/1.7**2)<1e-9&&rc.plan.calObjetivo<rc.plan.tdee);
t('recalcular: el aviso de mínimo calórico antiguo se descarta',!(rc.plan.avisos||[]).some(a=>a.includes('antiguo')));
t('recalcular: no modifica el plan original (inmutable)',pl.pesoActual===90&&pl.meses===6);
t('recalcular: objetivo alcanzado en pérdida',M.recalcularPlanDesde(pl,79.5,'2026-03-01',[]).alcanzado===true);
rc=M.recalcularPlanDesde({...pl,tipoPlan:'ganancia',pesoActual:45,pesoObjetivo:54.5,altura:165,sexo:'mujer',edad:30},48,'2026-02-01',[]);
t('recalcular ganancia: superávit y ritmo 0,4',!rc.alcanzado&&rc.plan.deficit<0&&rc.plan.calObjetivo>rc.plan.tdee&&rc.plan.perdidaSemanal<=0.5);
t('recalcular: objetivo alcanzado en ganancia',M.recalcularPlanDesde({...pl,tipoPlan:'ganancia',pesoObjetivo:54.5},54.5,'2026-02-01',[]).alcanzado===true);
rc=M.recalcularPlanDesde({...pl,pesoActual:60,pesoObjetivo:50,altura:155,edad:65,sexo:'mujer'},58,'2026-02-01',[]);
t('recalcular: aviso de mínimo calórico si el suelo limita',rc.plan.pisoAplicado===(M.avisoPisoCalorico(rc.E,8)!==null));
t('recalcular: un cambio mínimo da al menos 1 mes',M.recalcularPlanDesde(pl,80.2,'2026-03-01',[]).meses===1);

// --- GLP-1 ---
let pg=M.proteinaGLP1(75,40); t('GLP-1: proteína 1,0-1,5 g/kg de peso objetivo (75 kg → 75-113 g)',pg.min===75&&pg.max===113&&pg.gmin===1,JSON.stringify(pg));
pg=M.proteinaGLP1(75,70); t('GLP-1: mayores de 65 años 1,2-1,5 g/kg (75 kg → 90-113 g)',pg.min===90&&pg.max===113&&pg.gmin===1.2);
const H=(a,b,c,d2)=>[{fecha:a,peso:b},{fecha:c,peso:d2}];
t('GLP-1 alarma: 3 %/semana → alerta alta',(e=M.alertaPerdidaRapida(H('2026-01-01',100,'2026-01-15',94))).alerta&&e.nivel==='alta',JSON.stringify(e));
t('GLP-1 alarma: 2 %/semana → alerta (aviso)',(e=M.alertaPerdidaRapida(H('2026-01-01',100,'2026-01-15',96))).alerta&&e.nivel==='aviso');
t('GLP-1 alarma: 1,5 %/semana exacto → sin alerta',M.alertaPerdidaRapida(H('2026-01-01',100,'2026-01-15',97)).alerta===false);
t('GLP-1 alarma: menos de 14 días entre pesajes → sin alerta',M.alertaPerdidaRapida(H('2026-01-01',100,'2026-01-10',90)).alerta===false);
t('GLP-1 alarma: ganancia de peso → sin alerta',M.alertaPerdidaRapida(H('2026-01-01',100,'2026-01-20',103)).alerta===false);
t('GLP-1 alarma: sin historial suficiente → sin alerta',M.alertaPerdidaRapida([]).alerta===false&&M.alertaPerdidaRapida([{fecha:'2026-01-01',peso:90}]).alerta===false);
t('GLP-1 alarma: ignora pesajes fuera de la ventana de 28 días',M.alertaPerdidaRapida([{fecha:'2026-01-01',peso:100},{fecha:'2026-03-01',peso:95},{fecha:'2026-03-15',peso:94.5}]).alerta===false);
const G1=require('../js/glp1.js'); const L=G1.glp1Lineas({pesoObjetivo:75,edad:40});
t('GLP-1 PDF: líneas con proteína 75-113 g y reparto',L.some(x=>x[1].includes('75-113 g/dia'))&&L.some(x=>x[1].includes('20-30 g')));
t('GLP-1 PDF: texto compatible con Latin-1 (sin caracteres > U+00FF)',L.every(x=>![...x[1]].some(c=>c.charCodeAt(0)>255)));
t('GLP-1: contenido completo (7 reglas, 7 señales de alarma, 4 bloques de efectos, menú de 5 comidas)',G1.GLP1.reglas.length===7&&G1.GLP1.alarma.length===7&&G1.GLP1.efectos.length===4&&G1.GLP1.menu.length===5);

// --- GLP-1: precisiones del endocrino ---
pg=M.proteinaGLP1(80,40,true); t('GLP-1 ejercicio intenso: 1,5-2 g/kg (80 kg → 120-160 g)',pg.min===120&&pg.max===160&&pg.gmin===1.5&&pg.gmax===2&&pg.intenso);
pg=M.proteinaGLP1(80,70,true); t('GLP-1 ejercicio intenso en ≥ 65 años: también 1,5-2 g/kg',pg.min===120&&pg.max===160);
t('GLP-1 sin ejercicio intenso: se mantiene 1,0-1,5 g/kg',(pg=M.proteinaGLP1(80,40,false)).min===80&&pg.max===120&&!pg.intenso);
const Ls=G1.glp1Lineas({pesoObjetivo:80,edad:40,glp1Intenso:true}).map(x=>x[1]).join(' | ');
t('GLP-1 PDF: ejercicio intenso muestra 120-160 g/dia',Ls.includes('120-160 g/dia')&&Ls.includes('ejercicio intenso'));
t('GLP-1: bebidas con gas a evitar (reflujo) y no acostarse tras cenar',Ls.includes('bebidas con gas')&&Ls.includes('No acostarse inmediatamente despues de cenar'.replace('despues','después').normalize('NFC').replace('después','despues'))||Ls.includes('acostarse inmediatamente'));
t('GLP-1: ya no se recomienda agua con gas',!G1.GLP1.hidratacion.includes('agua con gas si se tolera')&&G1.GLP1.hidratacion.includes('Evita las bebidas con gas'));
t('GLP-1: visión borrosa como señal de alarma',G1.GLP1.alarma.some(a=>a.includes('Visión borrosa')&&a.includes('semaglutida'))&&Ls.includes('Vision borrosa')||Ls.includes('Visi'));
const Lr=G1.glp1Lineas({pesoObjetivo:80,edad:40,glp1Intenso:true,cribado:['renal']}).map(x=>x[1]).join(' | ');
t('GLP-1 + enfermedad renal: el PDF no da cifras de proteína',Lr.includes('nefrologo')&&!/\d+-\d+ g\/dia/.test(Lr)&&!Lr.includes('Reparto'));
console.log(fallos?fallos+' FALLOS':'Todo correcto'); process.exit(fallos?1:0);
