/* WalkForLife - recomendaciones para pacientes en tratamiento con agonistas del receptor GLP-1.
 * Fuente: paquete de recomendaciones nutricionales aportado por el autor de la aplicación (noviembre de 2026).
 * Orientativo: no sustituye las indicaciones del equipo médico. */
const GLP1 = {
  intro: 'Los agonistas del receptor GLP-1 (semaglutida, liraglutida, dulaglutida, tirzepatida, entre otros) reducen el apetito, enlentecen el vaciamiento gástrico y favorecen la pérdida de peso. Estas recomendaciones buscan maximizar la eficacia del tratamiento, preservar la masa muscular y minimizar efectos adversos como náuseas, vómitos, estreñimiento o sensación excesiva de plenitud.',
  aviso: 'Recomendaciones orientativas basadas en el paquete de recomendaciones para tratamiento con agonistas GLP-1 aportado por el autor de la aplicación. No sustituyen las indicaciones de tu equipo médico.',
  reglas: ['Priorizar la proteína en cada comida.', 'Comer despacio y en pequeñas cantidades (4–5 comidas).', 'Beber agua aunque no haya sed (1,5–2,5 litros al día).', 'Aumentar progresivamente la fibra (25–35 g/día).', 'Evitar las comidas grasas y los ultraprocesados.', 'Realizar entrenamiento de fuerza de forma regular (mínimo 2–3 días/semana; ideal 3–4).', 'Seguir un patrón de dieta mediterránea.'],
  alarma: ['Vómitos persistentes.', 'Incapacidad para mantener la hidratación.', 'Pérdida de peso superior al 1,5–2 % semanal durante varias semanas.', 'Debilidad muscular marcada.', 'Mareos frecuentes.', 'Dolor abdominal intenso.', 'Visión borrosa o disminución brusca de la agudeza visual (poco frecuente, pero debe motivar consulta médica; especialmente con semaglutida).'],
  proteinaIntenso: 'Con ejercicio intenso se recomiendan 1,5–2 g de proteína por kg de peso y día.',
  proteinaFuentes: 'pescado, pollo y pavo, huevos, lácteos ricos en proteína (queso fresco, queso batido, yogur griego natural), legumbres, tofu, tempeh y soja',
  reparto: { desayuno: '20–30 g', comida: '25–40 g', cena: '25–40 g' },
  comer: ['Realizar 4–5 comidas pequeñas.', 'Masticar lentamente.', 'Dejar de comer al primer signo de saciedad.', 'No intentar terminar el plato por obligación.'],
  grasas: { limitar: 'fritos, rebozados, embutidos grasos, bollería y comida rápida (suelen empeorar las náuseas)', preferir: 'plancha, horno, vapor o airfryer' },
  fibra: 'Objetivo de 25–35 g/día (verduras, frutas enteras, legumbres, avena y pan integral). Incrementar la fibra de forma gradual y acompañarla siempre de suficiente agua.',
  hidratacion: '1,5–2,5 litros diarios (más si hay actividad física intensa): agua, infusiones o caldos desgrasados. Evita las bebidas con gas: favorecen el reflujo gastroesofágico. Con la saciedad muchas personas beben menos.',
  liquidas: 'Reducir refrescos azucarados, zumos industriales, alcohol y batidos hipercalóricos: no generan la misma saciedad que los alimentos sólidos y dificultan el control ponderal.',
  efectos: [
    { t: 'Si aparece náusea', l: ['Comer pequeñas cantidades.', 'Alimentos suaves: arroz, patata cocida, pan tostado, plátano.', 'Evitar olores intensos, comidas copiosas y grasas.'] },
    { t: 'Si aparece estreñimiento', l: ['25–35 g de fibra diaria, aumentada de forma gradual.', '2 litros de agua.', 'Caminar al menos 30 minutos al día.', 'Considerar semillas de chía o lino.'] },
    { t: 'Si aparece diarrea', l: ['Reducir temporalmente café, alcohol, picantes y exceso de fibra insoluble.', 'Reforzar la hidratación.'] },
    { t: 'Para evitar el reflujo gastroesofágico', l: ['Evitar las bebidas con gas (favorecen el reflujo).', 'No acostarse inmediatamente después de cenar.'] }
  ],
  patron: {
    base: ['Verduras en cada comida.', 'Fruta: 2–3 piezas/día.', 'Legumbres: 3–5 veces/semana.', 'Pescado: 2–4 veces/semana.', 'Aceite de oliva virgen extra.', 'Frutos secos naturales.', 'Cereales integrales.'],
    limitar: ['Ultraprocesados.', 'Azúcares añadidos.', 'Harinas refinadas.', 'Alcohol.']
  },
  menu: [
    ['Desayuno', 'Yogur griego natural alto en proteína, copos de avena y frutos rojos'],
    ['Media mañana', 'Queso fresco y una fruta'],
    ['Comida', 'Ensalada variada; lentejas con verduras y pollo; mandarina'],
    ['Merienda', 'Yogur proteico'],
    ['Cena', 'Salmón al horno, verduras asadas y una pequeña ración de patata cocida']
  ],
  fuerza: 'Entrenamiento de fuerza de grandes grupos musculares: como mínimo 2–3 días/semana, e ideal 3–4 sesiones semanales. La combinación de GLP-1 + entrenamiento de fuerza + proteína adecuada ofrece los mejores resultados corporales. Perder masa muscular junto con la grasa es uno de los principales problemas con semaglutida o tirzepatida.'
};
/** Texto plano compatible con jsPDF (Latin-1): guiones simples, sin emoji ni símbolos fuera de WinAnsi */
function glp1PDFtxt(t) { return String(t).replace(/[–—]/g, '-').replace(/≥/g, '>=').replace(/[^\x00-\xFF]/g, '').trim(); }
/** Líneas del apartado GLP-1 del PDF: [['h', título] | ['b', viñeta], ...] */
function glp1Lineas(d) {
  const pg = (typeof proteinaGLP1 !== 'undefined') ? proteinaGLP1 : require('./motor.js').proteinaGLP1;
  const renal = (d.cribado || []).includes('renal'), P = pg(d.pesoObjetivo || d.pesoActual, d.edad, d.glp1Intenso), f = n => String(n).replace('.', ','), L = [];
  L.push(['b', GLP1.intro]);
  L.push(['h', 'Proteina diaria objetivo']);
  if (renal) {
    L.push(['b', 'Enfermedad renal cronica: el objetivo de proteina debe pautarlo tu nefrologo; no se indican cifras.']);
  } else {
    L.push(['b', P.min + '-' + P.max + ' g/dia (' + f(P.gmin) + '-' + f(P.gmax) + ' g/kg de peso objetivo, ' + P.ref + ' kg' + (P.intenso ? '; ejercicio intenso' : (d.edad >= 65 ? '; en mayores de 65 anos 1,2-1,5 g/kg' : '')) + ').']);
    L.push(['b', 'Reparto: desayuno ' + GLP1.reparto.desayuno + ', comida ' + GLP1.reparto.comida + ', cena ' + GLP1.reparto.cena + '. Fuentes: ' + GLP1.proteinaFuentes + '.']);
  }
  L.push(['h', 'Reglas clave']); GLP1.reglas.forEach(r => L.push(['b', r]));
  L.push(['h', 'Como comer']); GLP1.comer.forEach(r => L.push(['b', r]));
  L.push(['b', 'Limitar: ' + GLP1.grasas.limitar + '. Preferir: ' + GLP1.grasas.preferir + '.']);
  L.push(['b', GLP1.fibra]); L.push(['b', GLP1.hidratacion]); L.push(['b', GLP1.liquidas]); L.push(['b', GLP1.fuerza]);
  GLP1.efectos.forEach(e => { L.push(['h', e.t]); e.l.forEach(x => L.push(['b', x])); });
  L.push(['h', 'Ejemplo de menu diario']); GLP1.menu.forEach(m => L.push(['b', m[0] + ': ' + m[1] + '.']));
  L.push(['h', 'Senales de alarma: consulta con tu equipo medico']); GLP1.alarma.forEach(a => L.push(['b', a]));
  L.push(['b', GLP1.aviso]);
  return L.map(([k, t]) => [k, glp1PDFtxt(t)]);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { GLP1, glp1Lineas, glp1PDFtxt };
