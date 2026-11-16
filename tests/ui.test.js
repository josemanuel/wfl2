const {JSDOM}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','WalkForLife.html'),'utf8').replace('<script src="js/glp1.js"></script>',()=>'<script>'+fs.readFileSync(require('path').join(__dirname,'..','js','glp1.js'),'utf8')+'</script>').replace('<script src="js/alimentos.js"></script>',()=>'<script>'+fs.readFileSync(require('path').join(__dirname,'..','js','alimentos.js'),'utf8')+'</script>').replace('<script src="js/motor.js"></script>',()=>'<script>'+fs.readFileSync(require('path').join(__dirname,'..','js','motor.js'),'utf8')+'</script>');
let confirms=0, res=[]; const ok=(n,c,x='')=>{res.push((c?'OK  ':'FALLA ')+n+(c?'':'  -> '+x));};
function mk(pre){return new JSDOM(html,{runScripts:'dangerously',url:'https://localhost/',pretendToBeVisual:true,beforeParse(w){
  w.tailwind={};w.Chart=class{constructor(c,g){w.__cfg=g;}destroy(){}}; w.jspdf={jsPDF:function(){return new Proxy({},{get:()=>()=>({})})}};
  w.HTMLCanvasElement.prototype.getContext=()=>({}); w.confirm=()=>{confirms++;return true;}; w.alert=()=>{};
  w.Element.prototype.scrollIntoView=()=>{}; w.scrollTo=()=>{}; w.matchMedia=()=>({matches:false});
  if(pre)w.localStorage.setItem('walkforlife_data_v1',pre);}});}
const tick=()=>new Promise(r=>setTimeout(r,30));
async function setv(w,id,v,ev='input'){const e=w.document.getElementById(id);e.value=v;e.dispatchEvent(new w.Event(ev,{bubbles:true}));await tick();}
const $=(w,id)=>w.document.getElementById(id), hid=(w,id)=>$(w,id).classList.contains('hidden'), pd=(w,k)=>w.eval('planData.'+k);
(async()=>{
 // 1 bajo peso
 let d=mk(),w=d.window; await tick();
 await setv(w,'altura','165'); await setv(w,'pesoActual','45'); await setv(w,'edad','30'); await setv(w,'sexo','mujer','change');
 ok('bajo peso: casilla oculta, aviso visible',w.document.getElementById('modoGanancia').closest('div').classList.contains('hidden')&&!hid(w,'gananciaAviso'));
 ok('bajo peso: tarjeta ideal + autorrelleno 54.5 / 6 meses',!hid(w,'objetivoIdealCard')&&$(w,'pesoObjetivo').value==='54.5'&&$(w,'meses').value==='6',$(w,'pesoObjetivo').value+'/'+$(w,'meses').value);
 w.generarPlan(); await tick();
 ok('bajo peso: plan ganancia con superávit',pd(w,'tipoPlan')==='ganancia'&&pd(w,'deficit')<0&&pd(w,'calObjetivo')>pd(w,'tdee'),JSON.stringify([pd(w,'tipoPlan'),pd(w,'deficit')]));
 ok('bajo peso: etiqueta y render',w.eval('etiquetaPlan(planData)').includes('bajo peso')&&$(w,'evaluacionContent').innerHTML.includes('Kg a ganar'));
 const raw=w.localStorage.getItem('walkforlife_data_v1');
 // 6 plan desactualizado
 await setv(w,'pesoActual','46'); ok('plan desactualizado visible',$(w,'planDesactualizado').style.display==='flex');
 await setv(w,'pesoActual','45'); ok('al revertir desaparece',$(w,'planDesactualizado').style.display==='none');
 // 5 ritmo excesivo ganancia
 await setv(w,'pesoObjetivo','55'); await setv(w,'meses','2','change'); w.generarPlan(); await tick();
 ok('ritmo excesivo ganancia: alerta, 0.4 kg/sem y meses ampliados',!hid(w,'alertaSeguridad')&&pd(w,'perdidaSemanal')===0.4&&pd(w,'meses')>2&&pd(w,'mesesSolicitados')===2,JSON.stringify([pd(w,'perdidaSemanal'),pd(w,'meses')]));
 // 2 sobrepeso
 d=mk(); w=d.window; await tick(); await setv(w,'altura','170'); await setv(w,'pesoActual','90'); await setv(w,'edad','40'); await setv(w,'sexo','hombre','change');
 ok('sobrepeso: ideal 71.9 / 6 meses, casilla oculta',$(w,'pesoObjetivo').value==='71.9'&&$(w,'meses').value==='6'&&hid(w,'modoGananciaDiv'));
 await setv(w,'grasaDirecta','30'); w.generarPlan(); await tick();
 ok('sobrepeso: pérdida con déficit',pd(w,'tipoPlan')==='perdida'&&pd(w,'deficit')>0);
 ok('primer plan incluye % grasa',pd(w,'grasaPct')===30,String(pd(w,'grasaPct')));
 ok('dieta pérdida: lista limitar con zumos',$(w,'dietaContent').innerHTML.includes('Zumos de fruta'));
 // 3 obesidad por fases
 d=mk(); w=d.window; await tick(); await setv(w,'altura','170'); await setv(w,'pesoActual','140');
 ok('obesidad: fase 12 meses hasta 101.0',$(w,'pesoObjetivo').value==='101.0'&&$(w,'meses').value==='12'&&$(w,'objetivoIdealCard').innerHTML.includes('primera fase'),$(w,'pesoObjetivo').value);
 // 4 normopeso
 d=mk(); w=d.window; await tick(); await setv(w,'altura','175'); await setv(w,'pesoActual','70');
 ok('normopeso: sin tarjeta, casilla visible',hid(w,'objetivoIdealCard')&&!hid(w,'modoGananciaDiv')&&!w.document.getElementById('modoGanancia').closest('div').classList.contains('hidden'));
 // 7 IMC<16
 d=mk(); w=d.window; await tick(); await setv(w,'altura','165'); await setv(w,'pesoActual','38'); await setv(w,'edad','25'); await setv(w,'sexo','mujer','change');
 ok('IMC<16: aviso rojo visible',!hid(w,'avisosClinicos')&&$(w,'avisosClinicos').innerHTML.includes('delgadez severa'));
 const c0=confirms; w.generarPlan(); await tick(); ok('IMC<16: confirm antes de generar',confirms>c0);
 // 8 datos previos
 d=mk(raw); w=d.window; await tick();
 ok('datos previos: modal visible y nada restaurado',!hid(w,'modalDatosPrevios')&&$(w,'altura').value===''&&$(w,'resumenDatosPrevios').innerHTML.includes('kg'));
 await setv(w,'nombre','x'); ok('sin decidir no se sobrescribe el guardado',w.localStorage.getItem('walkforlife_data_v1')===raw);
 w.continuarConDatosPrevios(); await tick();
 ok('continuar: restaura datos y plan',$(w,'altura').value==='165'&&!hid(w,'resultados')&&hid(w,'modalDatosPrevios'));
 d=mk(raw); w=d.window; await tick(); w.empezarDeCero(); await tick();
 ok('borrar: vacía almacenamiento',w.localStorage.getItem('walkforlife_data_v1')===null&&hid(w,'modalDatosPrevios'));
 // plan de ganancia antiguo (hipocalórico) se normaliza
 const old=JSON.parse(raw); old.planData.deficit=500; old.planData.calObjetivo=old.planData.tdee-500; old.planData.perdidaTotal=-9.5; old.planData.perdidaSemanal=-0.3;
 d=mk(JSON.stringify(old)); w=d.window; await tick(); w.continuarConDatosPrevios(); await tick();
 ok('plan ganancia antiguo se recalcula con superávit',pd(w,'deficit')<0&&pd(w,'calObjetivo')>pd(w,'tdee'),String(pd(w,'deficit')));

 // --- Fase 2: cribado, suelo, Katch ---
 const chk=async(w,id)=>{const e=$(w,id);e.checked=true;e.dispatchEvent(new w.Event('change',{bubbles:true}));await tick();};
 const base=async(w,alt,pes,sex='mujer')=>{await setv(w,'altura',alt);await setv(w,'pesoActual',pes);await setv(w,'edad','35');await setv(w,'sexo',sex,'change');};
 d=mk(); w=d.window; await tick(); await base(w,'165','45'); await chk(w,'cr-embarazo'); w.generarPlan(); await tick();
 ok('embarazo: bloqueo visible, sin plan',w.document.getElementById('bloqueoCribado').style.display!=='none'&&!pd(w,'pesoActual')&&hid(w,'resultados'));
 d=mk(); w=d.window; await tick(); await base(w,'165','45'); await chk(w,'cr-tca'); w.generarPlan(); await tick();
 ok('TCA: bloqueo también en ganancia',!pd(w,'pesoActual'));
 d=mk(); w=d.window; await tick(); await base(w,'170','90'); await chk(w,'cr-insulina'); const c1=confirms; w.generarPlan(); await tick();
 ok('insulina: pide confirmación, genera plan y deja aviso',confirms>c1&&pd(w,'pesoActual')&&pd(w,'avisos').some(a=>a.includes('hipoglucemia')));
 d=mk(); w=d.window; await tick(); await base(w,'170','90'); await chk(w,'cr-renal'); w.generarPlan(); await tick();
 ok('renal: banner y ⛔ en alta proteína',$(w,'dietaContent').innerHTML.includes('Enfermedad renal')&&$(w,'dietaContent').innerHTML.includes('Alta proteína ⛔'));
 const raw2=w.localStorage.getItem('walkforlife_data_v1');
 d=mk(raw2); w=d.window; await tick(); w.continuarConDatosPrevios(); await tick();
 ok('cribado se guarda y se restaura',$(w,'cr-renal').checked===true);
 await chk(w,'cr-tca'); ok('cambiar el cribado marca el plan como desactualizado',$(w,'planDesactualizado').style.display==='flex');
 d=mk(); w=d.window; await tick(); await base(w,'170','90','hombre'); await setv(w,'grasaDirecta','30'); w.generarPlan(); await tick();
 ok('Katch-McArdle cuando hay % de grasa',pd(w,'tmbMetodo')==='Katch-McArdle'&&$(w,'evaluacionContent').innerHTML.includes('Katch-McArdle'),pd(w,'tmbMetodo'));
 ok('TDEE incluye ejercicio y factor visible',pd(w,'gastoEjercicio')>0&&$(w,'evaluacionContent').innerHTML.includes('ejercicio +'));
 d=mk(); w=d.window; await tick(); await base(w,'150','52'); await setv(w,'pesoObjetivo','45'); await setv(w,'meses','1','change'); w.generarPlan(); await tick();
 ok('suelo 1.200 en mujer y aviso de mínimo',pd(w,'calObjetivo')>=Math.min(1200,pd(w,'tdee'))&&pd(w,'deficit')>=0&&(!pd(w,'pisoAplicado')||pd(w,'avisos').some(a=>a.includes('Mínimo calórico'))),JSON.stringify([pd(w,'calObjetivo'),pd(w,'tdee'),pd(w,'avisos')]));

 // --- Gráfica con fechas reales (UI) ---
 d=mk(); w=d.window; await tick(); await base(w,'165','45'); w.generarPlan(); await tick();
 const f0=pd(w,'fechaInicio'), f14=new Date(Date.parse(f0)+14*864e5).toISOString().slice(0,10);
 await setv(w,'registroFecha',f14); await setv(w,'registroPeso','45.8'); w.agregarRegistro(); await tick();
 const cfg=w.__cfg, real=cfg.data.datasets.find(x=>x.label==='Evolución real (kg)');
 ok('gráfica: serie real con fecha real (día 14)',real&&real.data.length===2&&real.data[1].x===14&&real.data[1].y===45.8,JSON.stringify(real&&real.data));
 ok('gráfica: eje lineal y banda rellena',cfg.options.scales.x.type==='linear'&&cfg.data.datasets.some(x=>x.fill==='-1'));
 ok('gráfica: la banda oculta de la leyenda',cfg.options.plugins.legend.labels.filter({text:'_banda máx'})===false);

 // --- Menús escalados (UI) ---
 d=mk(); w=d.window; await tick(); await base(w,'170','90','hombre'); w.generarPlan(); await tick();
 const dc=$(w,'dietaContent').innerHTML;
 ok('menús: nota de raciones ajustadas y fuente BEDCA',dc.includes('Raciones ajustadas a tu objetivo de '+pd(w,'calObjetivo')+' kcal')&&dc.includes('BEDCA'));
 ok('menús: sin marcas {{ }} sin resolver',!dc.includes('{{'));
 ok('menús: cada día muestra su kcal estimadas',(dc.match(/~\d{3,4} kcal/g)||[]).length>=21,String((dc.match(/~\d{3,4} kcal/g)||[]).length));
 const m0=w.eval('menuDia(1,0)'); ok('menús: menuDia devuelve texto escalado',m0.E.ok&&typeof m0.desayuno==='string'&&!m0.desayuno.includes('{{'));
 ok('menús: la receta sigue enlazada tras escalar',dc.includes('WalkForLife-Recetas.html#paella-verduras-marisco'));

 // --- Recalcular plan (UI) ---
 d=mk(); w=d.window; await tick(); await base(w,'170','90','hombre'); await setv(w,'pesoObjetivo','80'); await setv(w,'meses','6','change'); w.generarPlan(); await tick();
 const ev0=$(w,'evaluacionContent').innerHTML, f0b=pd(w,'fechaInicio'), fR=new Date(Date.parse(f0b)+30*864e5).toISOString().slice(0,10);
 await setv(w,'registroFecha',fR); await setv(w,'registroPeso','87'); w.agregarRegistro(); await tick(); w.recalcularPlan(); await tick();
 ok('recalcular (UI): plan marcado y peso de partida actualizado',pd(w,'recalculado')===true&&pd(w,'pesoActual')===87&&pd(w,'fechaInicio')===fR);
 ok('recalcular (UI): la pestaña Evaluación se refresca con el nuevo plan',$(w,'evaluacionContent').innerHTML!==ev0&&$(w,'evaluacionContent').innerHTML.includes(pd(w,'calObjetivo')+' kcal'));
 ok('recalcular (UI): mensaje de confirmación y sin aviso de plan desactualizado',$(w,'desviacionTexto').innerHTML.includes('Plan recalculado')&&$(w,'planDesactualizado').style.display!=='flex');
 const cfg2=w.__cfg; ok('recalcular (UI): la gráfica parte de la nueva fecha y conserva el histórico',cfg2.options.scales.x.min===0&&cfg2.data.datasets.some(x=>x.label==='Evolución real (kg)'));

 // --- GLP-1 (UI) ---
 d=mk(); w=d.window; await tick(); await base(w,'170','90','mujer'); await chk(w,'tx-glp1'); w.generarPlan(); await tick();
 const evG=$(w,'evaluacionContent').innerHTML, dtG=$(w,'dietaContent').innerHTML;
 ok('GLP-1: el plan guarda el tratamiento',pd(w,'glp1')===true);
 ok('GLP-1: panel en Evaluación con proteína por kg de peso objetivo',evG.includes('agonistas GLP-1')&&evG.includes('Proteína/día')&&evG.includes(w.eval('proteinaGLP1(planData.pesoObjetivo,planData.edad).min')+'–'));
 ok('GLP-1: Dietas recomienda la mediterránea y adapta las listas',dtG.includes('Dieta adaptada a GLP-1')&&dtG.includes('Mediterránea ⭐')&&dtG.includes('Fritos y rebozados'));
 ok('GLP-1: ejercicio prioriza la fuerza',$(w,'ejercicioContent').innerHTML.includes('Con GLP-1: prioriza la fuerza'));
 ok('GLP-1: las raciones del menú nunca se amplían (factor ≤ 1)',w.eval('[1,2,3].every(n=>[0,1,2,3,4,5,6].every(i=>menuDia(n,i).E.factor<=1))')&&dtG.includes('las raciones no se amplían'));
 const fG=pd(w,'fechaInicio'), dd=n=>new Date(Date.parse(fG)+n*864e5).toISOString().slice(0,10);
 await setv(w,'registroFecha',dd(7)); await setv(w,'registroPeso','88'); w.agregarRegistro(); await tick();
 ok('GLP-1: un solo pesaje no dispara la alerta',!w.document.getElementById('alertaGLP1')||w.document.getElementById('alertaGLP1').style.display==='none');
 await setv(w,'registroFecha',dd(21)); await setv(w,'registroPeso','82'); w.agregarRegistro(); await tick();
 const aG=w.document.getElementById('alertaGLP1'); ok('GLP-1: pérdida rápida sostenida muestra la alerta',aG&&aG.style.display!=='none'&&aG.innerHTML.includes('Pérdida de peso rápida'),aG&&aG.innerHTML);
 const rawG=w.localStorage.getItem('walkforlife_data_v1'); d=mk(rawG); w=d.window; await tick(); w.continuarConDatosPrevios(); await tick();
 ok('GLP-1: la casilla se guarda y se restaura',$(w,'tx-glp1').checked===true&&pd(w,'glp1')===true);
 d=mk(); w=d.window; await tick(); await base(w,'170','90','mujer'); w.generarPlan(); await tick();
 ok('sin GLP-1: no aparece ningún bloque ni alerta',!$(w,'evaluacionContent').innerHTML.includes('agonistas GLP-1')&&!$(w,'dietaContent').innerHTML.includes('Dieta adaptada a GLP-1')&&w.eval('menuDia(1,0).E.factor')>0);
 ok('PDF (listas): el guion de rangos se conserva (2-3 piezas, no 23)',w.eval("alimPDF('rec',planData).some(t=>t.includes('2-3 piezas'))")&&!w.eval("alimPDF('rec',planData).some(t=>t.includes('(23'))"));
 ok('PDF: las listas GLP-1 no contienen caracteres fuera de Latin-1',(await (async()=>{await chk(w,'tx-glp1');w.generarPlan();await tick();return w.eval("['rec','lim'].every(k=>alimPDF(k,planData).every(t=>![...t].some(c=>c.charCodeAt(0)>255)))");})()));

 // --- GLP-1: precisiones del endocrino (UI) ---
 d=mk(); w=d.window; await tick(); await base(w,'170','90','hombre');
 ok('GLP-1: la casilla de ejercicio intenso está oculta sin tratamiento',$(w,'glp1IntensoWrap').style.display==='none');
 await chk(w,'tx-glp1'); ok('GLP-1: al marcar el tratamiento aparece la casilla de ejercicio intenso',$(w,'glp1IntensoWrap').style.display!=='none');
 await chk(w,'tx-glp1-intenso'); w.generarPlan(); await tick();
 const pI=w.eval('proteinaGLP1(planData.pesoObjetivo,planData.edad,true)'), evI=$(w,'evaluacionContent').innerHTML;
 ok('GLP-1 intenso: el plan guarda la opción y el panel muestra 1,5–2 g/kg',pd(w,'glp1Intenso')===true&&evI.includes(pI.min+'–'+pI.max+' g')&&evI.includes('1,5–2 g de proteína/kg')&&evI.includes('ejercicio intenso'),evI.slice(evI.indexOf('Orientativo'),evI.indexOf('Orientativo')+120));
 ok('GLP-1: panel con visión borrosa, sin agua con gas y con reflujo',evI.includes('Visión borrosa')&&!$(w,'dietaContent').innerHTML.includes('agua con gas si se tolera')&&$(w,'dietaContent').innerHTML.includes('Para evitar el reflujo gastroesofágico')&&$(w,'dietaContent').innerHTML.includes('No acostarse inmediatamente después de cenar'));
 ok('GLP-1: bebidas con gas en la lista de alimentos a limitar',$(w,'dietaContent').innerHTML.includes('Bebidas con gas'));
 const rawI=w.localStorage.getItem('walkforlife_data_v1'); d=mk(rawI); w=d.window; await tick(); w.continuarConDatosPrevios(); await tick();
 ok('GLP-1: ejercicio intenso se restaura y la casilla es visible',$(w,'tx-glp1-intenso').checked&&$(w,'glp1IntensoWrap').style.display!=='none'&&pd(w,'glp1Intenso')===true);
 await chk(w,'cr-renal'); w.generarPlan(); await tick();
 const evR=$(w,'evaluacionContent').innerHTML; ok('GLP-1 + renal: el panel no muestra cifras de proteína y remite al nefrólogo',evR.includes('nefrólogo')&&!evR.includes('Proteína/día')&&evR.includes('Reglas clave'));
 d=mk(); w=d.window; await tick(); await base(w,'170','90','hombre'); await chk(w,'tx-glp1-intenso'); w.generarPlan(); await tick();
 ok('ejercicio intenso sin GLP-1 no tiene efecto',pd(w,'glp1')===false&&pd(w,'glp1Intenso')===false);

 // --- Las casillas de GLP-1 y cribado se guardan al marcarlas (aunque no se genere el plan) ---
 d=mk(); w=d.window; await tick(); await chk(w,'tx-glp1'); await chk(w,'cr-renal'); await new Promise(r=>setTimeout(r,700));
 const rawC=JSON.parse(w.localStorage.getItem('walkforlife_data_v1')||'{}'); ok('GLP-1 y cribado se guardan al marcarlos sin generar el plan',rawC.formulario&&rawC.formulario.glp1===true&&(rawC.formulario.cribado||[]).includes('renal'),JSON.stringify(rawC.formulario||{}).slice(0,200));
 console.log(res.join('\n')); console.log(res.filter(x=>x.startsWith('FALLA')).length+' fallos de '+res.length);
 process.exit(0);
})().catch(e=>{console.log('ERROR',e);process.exit(1)});
