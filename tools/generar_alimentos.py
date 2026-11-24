import csv,json,re,subprocess,sys,statistics as st
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
"""Regenera js/alimentos.js a partir de (1) bedca/alimentos_BEDCA_completado.csv y (2) MENU_SEMANAL de WalkForLife.html.
Uso (desde la raíz del proyecto):  python3 tools/generar_alimentos.py
Imprime kcal por día y los términos que no ha podido interpretar. Después ejecutar tests/motor.test.js."""
rows={r['id']:r for r in csv.DictReader(open(ROOT/'bedca'/'alimentos_BEDCA_completado.csv',encoding='utf-8-sig'),delimiter=';')}
f=lambda x:(float(x) if x not in (None,'') else None)
F={}  # id -> dict(n,k,s,u)
for i,r in rows.items():
    if r['fuente_dato']=='calcular_desde_receta': continue
    F[i]={'n':r['alimento_en_los_menus'],'k':f(r['kcal_100g']),'s':'BEDCA' if f(r['kcal_100g']) else None,'u':f(r['gramos_por_unidad']),'p':f(r['proteina_g_100g'])}
def setk(i,k,s,n=None):
    F[i]['k']=k;F[i]['s']=s
    if n:F[i]['n']=n
# correcciones aportadas por el autor y decisiones
setk('A12',93,'BEDCA','Dorada a la plancha')           # captura BEDCA: 93 kcal, P17 G2.7
setk('A45',160,'BEDCA (recalculado)','Garbanzos cocidos (hervidos)')  # BEDCA hervido: energía 360 kcal incoherente con 59% agua; macros+fibra -> 160
setk('A20',57,'estimación','Yogur griego 0%')          # el dato BEDCA era de yogur griego entero
EST={'A18':80,'A21':62,'A22':95,'A26':264,'A34':360,'A39':300,'A40':440,'A46':230,'A65':45,'A71':659,'A73':486,'A75':5,'A76':130,'A77':385,'A78':70}
for i,k in EST.items(): setk(i,k,'estimación')
setk('A72',round((F['A69']['k']+F['A70']['k'])/2,1),'estimación (media nuez/almendra BEDCA)')
F['A70']['u']=F['A70']['u'] or 1.2; F['A71']['u']=F['A71']['u'] or 5
mean=lambda *ids: st.mean(F[i]['k'] for i in ids)
def derived(i,n,k,s='estimación'): F[i]={'n':n,'k':round(k,1),'s':s,'u':None,'p':None}
derived('ENS','Ensalada (media lechuga, tomate, pepino)',mean('A53','A50','A52'),'BEDCA (media)')
derived('VER','Verduras variadas (media calabacín, pimiento, cebolla, tomate)',mean('A48','A51','A58','A50'),'BEDCA (media)')
derived('FRU','Fruta de temporada (media manzana, pera, plátano, naranja)',mean('A61','A62','A63','A67'),'BEDCA (media)')
derived('PROT','Proteína a elegir (media pollo, ternera, merluza)',mean('A03','A06','A11'),'BEDCA (media)')
derived('CARB','Carbohidrato cocido (arroz/pasta cocidos)',130)
derived('ARC','Arroz cocido',135); derived('GUI','Guisantes',80)
# platos compuestos: kcal totales de la receta / peso cocinado estimado
DISH={'paella_vm':('Paella de verduras y marisco',[('A36',150),('A18',200),('VER',150),('A50',100),('A74',20)],785),
'paella_mx':('Paella mixta',[('A36',150),('A03',150),('A18',100),('A59',100),('A50',100),('A74',20)],775),
'pizza':('Pizza casera integral de verduras',[('A43',80),('A50',50),('VER',100),('A27',30)],290),
'cocido':('Cocido ligero',[('A45',150),('A03',100),('VER',150)],875),
'tresdel':('Arroz tres delicias',[('ARC',150),('A01',50),('GUI',50),('A57',50),('A08',30),('A79',5),('A74',10)],345),
'tort_pat':('Tortilla de patata',[('A41',300),('A01',150),('A58',60),('A74',30)],540),
'lent_est':('Lentejas estofadas con verduras',[('A44',200),('A57',80),('A58',60),('A51',70),('A50',100),('A74',15)],510),
'sopa':('Sopa de verduras',[('VER',300),('A74',10)],1000),
'cr_calabaza':('Crema de calabaza',[('A49',300),('A58',60),('A41',100),('A74',10)],760),
'cr_calabacin':('Crema de calabacín',[('A48',300),('A58',60),('A41',50),('A74',10)],710),
'cr_verduras':('Crema de verduras',[('VER',300),('A74',10)],600),
'sushi':('Sushi casero',[('A36',150),('A13',80),('A52',50),('A68',50)],555),
'ens_quinoa':('Ensalada de quinoa',[('A38',80),('VER',100),('A26',30),('A74',10)],380),
'tost_fr':('Tostadas francesas integrales',[('A32',60),('A01',50),('A30',50),('A74',5)],60),
'curry':('Pollo al curry suave',[('A03',150),('A74',5),('A78',50)],150),
'hamb':('Hamburguesa de pavo casera',[('A04',150),('A74',5)],150),
'fajitas':('Fajitas de pollo',[('A03',120),('A74',5)],120),
'revuelto':('Revuelto de champiñones',[('A56',150),('A74',5)],150)}
# proteína (g/100 g): BEDCA del CSV; correcciones del autor y estimaciones de referencia (marcadas como estimación)
F['A12']['p']=17.0; F['A45']['p']=8.9; F['A20']['p']=10.0; F['A74']['p']=0.0
for i,v in {'A18':13,'A21':11,'A22':11,'A26':14,'A34':10,'A39':9,'A40':7,'A46':8,'A65':0.8,'A71':14.3,'A73':17,'A75':0.5,'A76':0.3,'A77':80,'A78':0.5}.items(): F[i]['p']=v
F['A72']['p']=round((F['A69']['p']+F['A70']['p'])/2,1)
for i,ids in {'ENS':('A53','A50','A52'),'VER':('A48','A51','A58','A50'),'FRU':('A61','A62','A63','A67'),'PROT':('A03','A06','A11')}.items(): F[i]['p']=round(st.mean(F[j]['p'] for j in ids),1)
F['CARB']['p']=2.7; F['ARC']['p']=2.7; F['GUI']['p']=5.4
for i,v in F.items():
    if v.get('k') is not None and v.get('p') is None: raise SystemExit('Falta proteína de '+i)
for k,(n,ing,w) in DISH.items():
    F['P_'+k]={'n':n,'k':round(sum(F[i]['k']*g/100 for i,g in ing)/w*100,1),'p':round(sum(F[i]['p']*g/100 for i,g in ing)/w*100,1),'s':'estimación (receta)','u':None}
F['P_batido']={'n':'Batido de frutas','k':F['FRU']['k'],'p':F['FRU']['p'],'s':'estimación','u':None}
RULES=[('batido proteico','A77'),('batido de frutas','P_batido'),('paella de verduras y marisco','P_paella_vm'),('paella mixta','P_paella_mx'),('pizza','P_pizza'),('cocido','P_cocido'),('tres delicias','P_tresdel'),
('tortilla de patata','P_tort_pat'),('lentejas estofadas','P_lent_est'),('sopa','P_sopa'),('crema de calabaza','P_cr_calabaza'),('crema de calabac','P_cr_calabacin'),('crema de verduras','P_cr_verduras'),
('sushi','P_sushi'),('ensalada de quinoa','P_ens_quinoa'),('tostadas francesas','P_tost_fr'),('pollo al curry','P_curry'),('hamburguesa de pavo','P_hamb'),('fajitas','P_fajitas'),('revuelto de champi','P_revuelto'),
('nueces de brasil','A71'),('nueces','A69'),('almendras','A70'),('frutos secos','A72'),('semillas','A73'),('chía','A73'),('tortilla de 3 claras','A02'),('tortilla de 2 huevos','A01'),('tortilla francesa','A01'),('claras','A02'),('huevo','A01'),
('pavo a la plancha','A04'),('lonchas de pavo','A05'),('pollo','A03'),('ternera','A06'),('solomillo','A07'),('jamón york','A08'),('jamón serrano','A09'),('jamón','A08'),('chorizo','A10'),('merluza','A11'),('pescado blanco','A11'),('dorada','A12'),('salmón','A13'),
('atún','A14'),('sardinas','A16'),('gambas','A17'),('yogur griego','A20'),('yogur natural','A19'),('proteico','A21'),('skyr','A21'),('cottage','A22'),('requesón','A23'),('queso fresco','A24'),('queso','A25'),('kéfir','A28'),('leche desnatada','A29'),('leche','A30'),('yogur','A19'),
('tostada','A32'),('bocadillo','A32'),('pan integral','A32'),('avena','A33'),('cereal','A34'),('arroz','A35'),('pasta','A37'),('quinoa','A38'),('tortilla','A39'),('galletas','A40'),('patata','A41'),('boniato','A42'),
('lentejas','A44'),('garbanzos','A45'),('hummus','A46'),('espinacas','A47'),('calabacín','A48'),('pimientos','A51'),('tomate','A50'),('ensalada','ENS'),('brócoli','A54'),('espárragos','A55'),('champiñones','A56'),('zanahoria','A57'),('pepino','A52'),
('ración vegetal','VER'),('verduras','VER'),('proteína a elegir','PROT'),('carbohidrato','CARB'),('manzana','A61'),('pera','A62'),('plátano','A63'),('fresas','A64'),('frutos rojos','A65'),('piña','A66'),('fruta','FRU'),('aguacate','A68'),
('aove','A74'),('caldo','A75'),('mermelada','A76'),('whey','A77'),('café','Z'),('infusión','Z'),('canela','Z'),('agua','Z')]
def food(t):
    t=t.lower()
    for k,v in RULES:
        if k in t: return v
def split(s,seps):  # separa solo fuera de paréntesis
    s=s.replace('verduras y marisco','verduras\x01y\x01marisco'); out=[];d=0;cur='';i=0
    while i<len(s):
        c=s[i]; d+= (c=='(')-(c==')')
        hit=next((x for x in seps if d==0 and s.startswith(x,i)),None)
        if hit: out.append(cur);cur='';i+=len(hit);continue
        cur+=c;i+=1
    return [x.replace('\x01',' ') for x in out+[cur]]
TOK=re.compile(r'(\d+(?:[.,]\d+)?)\s*(g|ml)\b')
NUT='k'   # nutriente que calculan alt_kcal/comida: 'k' = kcal, 'p' = proteína (g)
OVR={'Wrap integral (1 tortilla 50g) de pollo (100g)':('Wrap integral (1 tortilla 50g) de pollo ({{100g}})',{'k':(F['A39']['k']*.5,F['A03']['k']),'p':(F['A39']['p']*.5,F['A03']['p'])}),
 'Tortilla de calabacín (2 huevos + 100g calabacín)':('Tortilla de calabacín (2 huevos + 100g calabacín)',{'k':(F['A01']['k']*1+F['A48']['k']+F['A74']['k']*.05,0),'p':(F['A01']['p']*1+F['A48']['p']+F['A74']['p']*.05,0)})}
def alt_kcal(a):
    """devuelve (tpl, fijo, esc, ok, est)"""
    a0=a.strip()
    if a0 in OVR: t,v=OVR[a0]; fj,es=v[NUT]; return t,fj,es,True,False
    fid=food(a0)
    if fid=='Z': return a0,0,0,True,False
    tok=TOK.findall(a0); cnt=re.search(r'(\d+|½)\s+(?!g\b|ml\b)[a-záéíóúñ]+',a0)
    if fid is None or F[fid][NUT] is None:
        return a0,0,0,(not tok and not cnt),False   # sin número ni alimento: descriptor ("verduras")
    est='estim' in (F[fid]['s'] or '')
    k=F[fid][NUT]; unit_start=re.match(r'\s*(\d+|½)\s+(?!g\b|ml\b)[a-záéíóúñ]',a0)
    if tok:
        q=float(tok[0][0].replace(',','.'))
        kc=k*q/100
        if unit_start: return a0,kc,0,True,est
        return TOK.sub(lambda m:'{{'+m.group(1)+m.group(2)+'}}',a0,count=1),0,kc,True,est
    if cnt:
        n=0.5 if cnt.group(1)=='½' else int(cnt.group(1)); u=F[fid]['u']
        if u: return a0,k*n*u/100,0,True,est
        return a0,0,0,False,est
    return a0,0,0,True,False   # alimento citado sin cantidad (p. ej. 'tomate' dentro de un plato)
def comida(s):
    parts=split(s,[' + ',', ',' y ',' con ']); T=[];fj=es=0;ok=True;est=False
    for p in parts:
        alts=split(p,[' o ',' ó ']); R=[alt_kcal(a) for a in alts]
        # plantilla: se escalan solo los tokens de términos no unitarios
        T.append(' o '.join(r[0] for r in R)); fj+=st.mean(r[1] for r in R); es+=st.mean(r[2] for r in R); ok&=all(r[3] for r in R); est|=any(r[4] for r in R)
    # reconstruir plantilla respetando separadores originales: sustituir token a token sobre el original
    return fj,es,ok,est
def tpl_of(s):
    # marca en el original solo los tokens de términos escalables
    out=s; res='';i=0
    parts=split(s,[' + ',', ',' y ',' con ']); 
    pos=0; segs=[]
    for p in parts:
        idx=s.index(p,pos); segs.append((idx,p)); pos=idx+len(p)
    res='';last=0
    for idx,p in segs:
        res+=s[last:idx]
        subs=[];q=0
        for a in split(p,[' o ',' ó ']):
            j=p.index(a,q); subs.append((j,a)); q=j+len(a)
        r2='';l2=0
        for j,a in subs:
            r2+=p[l2:j]; r2+=alt_kcal(a)[0] if a.strip() not in OVR else OVR[a.strip()][0]; l2=j+len(a)
        r2+=p[l2:]; res+=r2; last=idx+len(p)
    return res+s[last:]
_js = r"""const fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8').match(/<script>([\s\S]*?)<\/script>/g).pop();console.log(JSON.stringify(new Function('return '+h.match(/const MENU_SEMANAL = (\{[\s\S]*?\n\});/)[1])()))"""
M = json.loads(subprocess.run(['node','-e',_js,str(ROOT/'WalkForLife.html')],capture_output=True,text=True,check=True).stdout); OUT = {}; stats = []
for dk,dv in M.items():
    OUT[dk]=[]
    for d in dv['dias']:
        day={};tf=te=0;allok=True
        for m in ('desayuno','snackAM','comida','snackPM','cena'):
            NUT='k'; fj,es,ok,est=comida(d[m]); NUT='p'; pf,pe,okp,_e=comida(d[m]); NUT='k'
            day[m]={'t':tpl_of(d[m]),'f':round(fj,1),'e':round(es,1),'pf':round(pf,1),'pe':round(pe,1),'k':ok and okp,'s':'E' if est else 'B'}
            tf+=fj;te+=es;allok&=ok
        OUT[dk].append(day); stats.append((dk,d['dia'],round(tf+te),round(tf),allok,[m for m in day if not day[m]['k']],'prot',round(sum(day[m]['pf']+day[m]['pe'] for m in day))))
F2={k:{kk:vv for kk,vv in v.items() if vv is not None} for k,v in F.items()}
_cab="/* WalkForLife - datos nutricionales de los menús (GENERADO por tools/generar_alimentos.py; no editar a mano).\n * Fuente: BEDCA (Consorcio BEDCA y AESAN, https://www.bedca.net) cuando s='BEDCA'; el resto son estimaciones orientativas\n * (s='estimación...') derivadas de recetas o de valores de referencia. Revisar antes de uso clínico.\n * k = kcal/100 g (o ml), p = proteína g/100 g, u = gramos por unidad.\n * pf/pe = proteína (g) fija/escalable de cada comida.\n * MENU_ESC[dieta][día][comida] = { t: plantilla con {{cantidad}} escalable, f: kcal fijas (unidades), e: kcal escalables, k: datos completos, s: B|E (E = usa estimaciones) } */\n"
(ROOT/'js'/'alimentos.js').write_text(_cab+"const ALIMENTOS = "+json.dumps(F2,ensure_ascii=False,separators=(',',':'))+";\nconst MENU_ESC = "+json.dumps(OUT,ensure_ascii=False,separators=(',',':'))+";\nif (typeof module !== 'undefined' && module.exports) module.exports = { ALIMENTOS, MENU_ESC };\n",encoding='utf-8')
print('js/alimentos.js regenerado')
print('platos k/100:',{k:v['k'] for k,v in F.items() if k.startswith('P_')})
for s in stats: print(*s)
# identidad plantilla = original
bad=[(dk,i,m) for dk in M for i,d in enumerate(M[dk]['dias']) for m in ('desayuno','snackAM','comida','snackPM','cena') if re.sub(r'\{\{(\d+(?:[.,]\d+)?(?:g|ml))\}\}',r'\1',OUT[dk][i][m]['t'])!=d[m]]
print('plantillas que no reconstruyen el original:',bad)
