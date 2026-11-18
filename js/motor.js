/* WalkForLife - motor de cálculo (sin DOM).
 * Se carga en el navegador con <script src="js/motor.js"> y es importable en Node/servidor (require). */
const RIT = { perdida:{min:.5,max:1,rec:.75}, ganancia:{min:.25,max:.5,rec:.4} }; // kg/semana saludables

// ============================================================
// CÁLCULOS
// ============================================================
function calcIMC(peso,alturaM){return peso/(alturaM*alturaM);}
function descIMC(imc){
  if(imc<18.5)return{texto:'Bajo peso',color:'badge-blue'};
  if(imc<25)return{texto:'Peso normal',color:'badge-green'};
  if(imc<30)return{texto:'Sobrepeso',color:'badge-orange'};
  if(imc<35)return{texto:'Obesidad grado I',color:'badge-orange'};
  return{texto:'Obesidad grado II+',color:'badge-orange'};
}
/** Mifflin-St Jeor */
function calcTMB(peso,alturaCm,edad,sexo){
  return sexo==='hombre' ? 10*peso+6.25*alturaCm-5*edad+5 : 10*peso+6.25*alturaCm-5*edad-161;
}
function calcTDEE(tmb){return Math.round(tmb*1.375);}
/** Objetivo teórico ideal (null si normopeso): IMC 24.9 si exceso, IMC 20 si bajo peso; plazo a ritmo recomendado, fases de 12 meses */
function objetivoIdeal(peso,h){const imc=peso/((h/100)*(h/100)); if(imc>=18.5&&imc<25)return null;
  const g=imc<18.5, meta=g?20:24.9, R=RIT[g?'ganancia':'perdida']; let pm=meta*(h/100)*(h/100); pm=g?Math.ceil(pm*10)/10:Math.floor(pm*10)/10;
  const cambio=Math.abs(pm-peso), meses=Math.ceil(cambio/R.rec/4.33); let pa=pm, ma=meses, fases=false;
  if(meses>12){fases=true;ma=12;pa=+(peso+(g?1:-1)*R.rec*4.33*12).toFixed(1);}
  return {g,imc,meta,pm,cambio,rec:R.rec,meses,fases,pa,ma};}
/** Ajuste calórico diario con signo (negativo = superávit). Ganancia: 1 kg ≈ 7700 kcal, entre 250 y 500 kcal/día */
function ajusteKcal(g,r){return g?-Math.min(500,Math.max(250,Math.round(r*1100/50)*50)):(r>0.75?750:(r>0.5?625:500));}
/** Peso proyectado tras 'sem' semanas, con tope en el objetivo, según la dirección */
function proy(d,sem){const g=d.tipoPlan==='ganancia',v=d.pesoActual+(g?1:-1)*Math.min(Math.abs(d.perdidaSemanal),1)*sem;return g?Math.min(v,d.pesoObjetivo):Math.max(v,d.pesoObjetivo);}
function etiquetaPlan(d){if(d.tipoPlan!=='ganancia')return 'Pérdida de peso';return (d.imcInicio||d.imcActual)<18.5?'Ganancia de peso saludable (bajo peso)':'Ganancia muscular saludable';}
/** Planes de ganancia guardados por versiones anteriores eran hipocalóricos: se recalculan */
function normalizarPlan(d){
  if(d&&d.tipoPlan==='ganancia'&&(d.deficit>0||d.perdidaTotal<0)){
    const R=RIT.ganancia; d.perdidaTotal=Math.abs(d.pesoObjetivo-d.pesoActual);
    let r=d.perdidaTotal/((d.meses||1)*4.33); if(r>R.max){r=R.rec;d.meses=Math.ceil(d.perdidaTotal/r/4.33);}
    d.perdidaSemanal=r; d.deficit=ajusteKcal(true,r); d.calObjetivo=d.tdee-d.deficit; d.semanas=d.meses*4.33;
  } return d;}
/*MOTOR-INICIO (funciones puras, sin DOM: testeables en Node y reutilizables en servidor)*/
/** Gasto diario por ejercicio planificado (kcal/día): MET neto (MET-1) × peso × horas, promediando las 6 semanas de progresión */
function gastoEjercicioDiario(items,peso){let sem=0;
  for(const a of items){const pr=a.progresion||[]; if(!pr.length)continue; let s=0;
    for(const p of pr){const n=(String(p.min).match(/\d+/g)||[]).map(Number); const mid=n.length?n.reduce((x,y)=>x+y,0)/n.length:0;
      s+=Math.max(1,Math.round((a.pct/100)*p.dias))*(mid/60)*Math.max(0,a.met-1)*peso;}
    sem+=s/pr.length;}
  return sem/7;}
/** Energía: TMB (Katch-McArdle si se conoce la masa magra; si no, Mifflin-St Jeor) × 1,2 (vida sedentaria) + ejercicio planificado.
 *  Suelo calórico en pérdida: 1.200 kcal mujeres / 1.500 hombres (nunca por encima del gasto: no se genera superávit en un plan de pérdida). */
function calcularEnergia(o){
  const lm=parseFloat(o.masaMagra), kat=lm>0, tmb=kat?370+21.6*lm:calcTMB(o.peso,o.altura,o.edad,o.sexo);
  const ej=gastoEjercicioDiario(o.items||[],o.peso), tdee=Math.round(tmb*1.2+ej);
  let cal=tdee-ajusteKcal(!!o.ganancia,o.ritmo), aplicado=false; const piso=o.sexo==='hombre'?1500:1200;
  if(!o.ganancia&&cal<piso){cal=Math.min(piso,tdee);aplicado=true;}
  return {tmb,tmbMetodo:kat?'Katch-McArdle':'Mifflin-St Jeor',ejercicio:Math.round(ej),tdee,deficit:tdee-cal,calObjetivo:cal,piso,pisoAplicado:aplicado};}
/** Cribado de seguridad: bloqueos (no se genera plan), avisos y confirmación previa */
function evaluarCribado(sel,edad,tipoPlan){const b=[],a=[];
  if(sel.includes('embarazo'))b.push('Embarazo o lactancia: no se genera un plan de peso. Las necesidades energéticas cambian y debe pautarlo tu matrona, obstetra o médico.');
  if(sel.includes('tca'))b.push('Antecedentes de trastorno de la conducta alimentaria: una herramienta de objetivos de peso y calorías puede ser perjudicial. Consúltalo con tu equipo de salud mental o tu médico.');
  if(edad&&edad<18&&tipoPlan==='perdida')b.push('Menor de 18 años: un plan de pérdida de peso debe pautarlo tu pediatra o médico.');
  if(sel.includes('renal'))a.push('Enfermedad renal crónica: evita la dieta alta en proteínas y consulta a tu nefrólogo antes de seguir el plan.');
  if(sel.includes('insulina'))a.push('Diabetes con insulina o sulfonilureas: el déficit calórico y el ejercicio aumentan el riesgo de hipoglucemia. Ajusta el tratamiento con tu médico antes de empezar.');
  return {bloqueos:b,avisos:a,confirmar:sel.includes('insulina'),sel};}
function calcularAvisosClinicos(imc,edad){const a=[];
  if(imc<16)a.push({t:'rojo',m:'IMC inferior a 16: delgadez severa. Se recomienda valoración médica antes de iniciar cualquier plan.'});
  if(edad&&edad<18)a.push({t:'ambar',m:'Menor de 18 años: el IMC debe interpretarse con percentiles. Consulta con su pediatra o médico.'});
  return a;}
/**
 * Clasifica el % de grasa según tablas ACE (American Council on Exercise)
 * y genera un consejo orientativo.
 */
function clasificarGrasa(pct, sexo) {
  if (sexo === 'hombre') {
    if (pct < 6)  return { texto: 'Grasa esencial (muy bajo)', color: 'badge-blue',   consejo: 'Nivel inferior al minimo fisiologico recomendado. Consulta a un profesional.' };
    if (pct < 14) return { texto: 'Atletico',                  color: 'badge-green',  consejo: 'Nivel propio de deportistas. Ideal para el rendimiento fisico.' };
    if (pct < 18) return { texto: 'En forma (fitness)',        color: 'badge-green',  consejo: 'Excelente nivel de composicion corporal.' };
    if (pct < 25) return { texto: 'Aceptable',                 color: 'badge-orange', consejo: 'Dentro del rango normal para adultos. Hay margen de mejora.' };
    return               { texto: 'Obesidad (exceso de grasa)',color: 'badge-orange', consejo: 'Un porcentaje elevado aumenta el riesgo cardiometabolico independientemente del IMC.' };
  } else {
    if (pct < 14) return { texto: 'Grasa esencial (muy bajo)', color: 'badge-blue',   consejo: 'Nivel inferior al minimo fisiologico recomendado. Consulta a un profesional.' };
    if (pct < 21) return { texto: 'Atletico',                  color: 'badge-green',  consejo: 'Nivel propio de deportistas. Ideal para el rendimiento fisico.' };
    if (pct < 25) return { texto: 'En forma (fitness)',        color: 'badge-green',  consejo: 'Excelente nivel de composicion corporal.' };
    if (pct < 32) return { texto: 'Aceptable',                 color: 'badge-orange', consejo: 'Dentro del rango normal para adultos. Hay margen de mejora.' };
    return               { texto: 'Obesidad (exceso de grasa)',color: 'badge-orange', consejo: 'Un porcentaje elevado aumenta el riesgo cardiometabolico independientemente del IMC.' };
  }
}
/** Interpola linealmente el MET correspondiente a una velocidad dada */
function interpolarMET(tabla, velocidad) {
  if (velocidad <= tabla[0].v) return tabla[0].met;
  if (velocidad >= tabla[tabla.length-1].v) return tabla[tabla.length-1].met;
  for (let i = 0; i < tabla.length-1; i++) {
    if (velocidad >= tabla[i].v && velocidad <= tabla[i+1].v) {
      const frac = (velocidad - tabla[i].v) / (tabla[i+1].v - tabla[i].v);
      return +(tabla[i].met + frac * (tabla[i+1].met - tabla[i].met)).toFixed(1);
    }
  }
  return tabla[tabla.length-1].met;
}

/** Datos de la gráfica con eje temporal real (días desde fechaInicio), banda de ritmo saludable y media móvil de 7 días */
function datosGrafica(d,hist){
  const g=d.tipoPlan==='ganancia', R=RIT[g?'ganancia':'perdida'], sg=g?1:-1, t0=Date.parse(d.fechaInicio), p0=d.pesoActual, ob=d.pesoObjetivo;
  const dia=f=>Math.round((Date.parse(f)-t0)/864e5);
  const pts=(hist||[]).map(r=>({x:dia(r.fecha),y:r.peso})); if(!pts.some(p=>p.x===0))pts.push({x:0,y:p0}); pts.sort((a,b)=>a.x-b.x);
  const semObj=Math.abs(ob-p0)/Math.max(.01,Math.abs(d.perdidaSemanal));
  const ultimo=Math.max(...pts.map(p=>p.x)), xmin=Math.min(...pts.map(p=>p.x)), xmax=Math.max(28,Math.round(semObj*7*1.25),ultimo+7);
  const banda=r=>{const xe=Math.min(Math.abs(ob-p0)/r*7,xmax);return [{x:0,y:p0},{x:+xe.toFixed(1),y:+(p0+sg*r*xe/7).toFixed(2)}];};
  const media=pts.length>=3?pts.map(p=>{const w=pts.filter(q=>q.x<=p.x&&q.x>p.x-7);return {x:p.x,y:+(w.reduce((s,q)=>s+q.y,0)/w.length).toFixed(2)};}):null;
  return {proyeccion:[{x:0,y:p0},{x:Math.round(semObj*7),y:ob}],reales:pts,media,bandaMin:banda(R.min),bandaMax:banda(R.max),xmin,xmax};
}

/** Sustituye las cantidades escalables {{150g}} de una plantilla de menú por su valor multiplicado por f (redondeo a 5, mínimo 5). */
function aplicarFactorTpl(t,f){
  return t.replace(/\{\{(\d+(?:[.,]\d+)?)(g|ml)\}\}/g,(_,n,u)=>Math.abs(f-1)<0.005?n+u:Math.max(5,Math.round(parseFloat(n.replace(',','.'))*f/5)*5)+u);}
/** Escala un día de menú al objetivo calórico: solo cambian las cantidades en g/ml (las unidades quedan fijas).
 *  factor = (objetivo - kcal fijas) / kcal escalables, limitado a [0,5 ; 1,5]. Si algún alimento carece de datos, no se escala. */
function escalarMenuDia(dia,objetivo,opt){
  const o=Object.assign({min:0.5,max:1.5},opt||{}), C=['desayuno','snackAM','comida','snackPM','cena'];
  const fijo=C.reduce((s,m)=>s+dia[m].f,0), esc=C.reduce((s,m)=>s+dia[m].e,0), ok=C.every(m=>dia[m].k)&&esc>0;
  let f=1,limitado=false;
  if(ok&&objetivo>0){f=(objetivo-fijo)/esc; if(f<o.min){f=o.min;limitado=true;} if(f>o.max){f=o.max;limitado=true;}}
  const textos={}; C.forEach(m=>textos[m]=aplicarFactorTpl(dia[m].t,f));
  const kcal=Math.round(fijo+esc*f); if(limitado&&objetivo>0&&Math.abs(kcal-objetivo)/objetivo<=0.03)limitado=false; // el tope solo se señala si el día se desvía más de un 3 % del objetivo
  return {ok,factor:+f.toFixed(2),limitado,kcalBase:Math.round(fijo+esc),kcal,estimado:C.some(m=>dia[m].s==='E'),textos};}

/** Aviso cuando el suelo calórico (1.200 / 1.500 kcal) limita el déficit previsto */
function avisoPisoCalorico(E,cambio){
  if(!E.pisoAplicado)return null; const r=E.deficit*7/7700;
  return 'Mínimo calórico aplicado ('+E.piso+' kcal): '+(r>0.05?'el ritmo real será ~'+r.toFixed(2)+' kg/semana (~'+Math.ceil(cambio/r/4.33)+' meses).':'con tu gasto estimado no hay margen para un déficit seguro; consulta con tu médico o dietista.');}
/** Recalcula el plan desde un nuevo peso real manteniendo el objetivo final.
 *  Devuelve {alcanzado:true} si el objetivo ya se ha cumplido, o {alcanzado:false, plan, meses, E} con el plan actualizado. */
function recalcularPlanDesde(plan,pesoNuevo,fecha,items){
  const g=plan.tipoPlan==='ganancia', R=RIT[g?'ganancia':'perdida'];
  if(g?pesoNuevo>=plan.pesoObjetivo:pesoNuevo<=plan.pesoObjetivo)return {alcanzado:true};
  const cambio=Math.abs(pesoNuevo-plan.pesoObjetivo), meses=Math.max(1,Math.ceil(cambio/(R.rec*4.33))), ritmo=Math.min(cambio/(meses*4.33),1);
  const E=calcularEnergia({peso:pesoNuevo,altura:plan.altura,edad:plan.edad,sexo:plan.sexo,masaMagra:plan.masaMagra,items,ritmo,ganancia:g});
  const piso=avisoPisoCalorico(E,cambio);
  const avisos=(plan.avisos||[]).filter(a=>!a.startsWith('Mínimo calórico')).concat(piso?[piso]:[]);
  return {alcanzado:false,meses,E,plan:Object.assign({},plan,{pesoActual:pesoNuevo,imcActual:calcIMC(pesoNuevo,plan.altura/100),tmb:E.tmb,tmbMetodo:E.tmbMetodo,tdee:E.tdee,
    deficit:E.deficit,calObjetivo:E.calObjetivo,gastoEjercicio:E.ejercicio,pisoAplicado:E.pisoAplicado,avisos,perdidaTotal:cambio,perdidaSemanal:ritmo,
    meses,semanas:meses*4.33,fechaInicio:fecha,recalculado:true})};}

/** Proteína diaria orientativa con agonistas GLP-1: 1,0-1,5 g/kg de peso ideal (objetivo); en mayores de 65 años 1,2-1,5 g/kg; con ejercicio intenso 1,5-2 g/kg */
function proteinaGLP1(pesoRef,edad,intenso){const gmin=intenso?1.5:(edad>=65?1.2:1.0),gmax=intenso?2:1.5;return {ref:Math.round(pesoRef*10)/10,gmin,gmax,intenso:!!intenso,min:Math.round(pesoRef*gmin),max:Math.round(pesoRef*gmax)};}
/** Señal de alarma GLP-1: pérdida superior al 1,5-2 % semanal sostenida (ventana de 28 días, mínimo 14 días entre pesajes) */
function alertaPerdidaRapida(hist,opt){
  const o=Object.assign({umbral:1.5,alta:2,minDias:14,ventana:28},opt||{}), h=(hist||[]).slice().sort((a,b)=>a.fecha<b.fecha?-1:1);
  if(h.length<2)return {alerta:false};
  const f=r=>Date.parse(r.fecha), ult=h[h.length-1], ini=h.find(r=>r!==ult&&f(r)>=f(ult)-o.ventana*864e5);
  if(!ini)return {alerta:false};
  const dias=(f(ult)-f(ini))/864e5; if(dias<o.minDias)return {alerta:false};
  const pct=(ini.peso-ult.peso)/ini.peso*100/(dias/7);
  return {alerta:pct>o.umbral,nivel:pct>o.alta?'alta':'aviso',pctSemana:pct,semanas:dias/7};}

if (typeof module !== 'undefined' && module.exports) module.exports = { RIT, calcIMC, descIMC, calcTMB, calcTDEE, ajusteKcal, objetivoIdeal, proy, etiquetaPlan, normalizarPlan, gastoEjercicioDiario, calcularEnergia, evaluarCribado, calcularAvisosClinicos, interpolarMET, clasificarGrasa, datosGrafica, aplicarFactorTpl, escalarMenuDia, avisoPisoCalorico, recalcularPlanDesde, proteinaGLP1, alertaPerdidaRapida };
