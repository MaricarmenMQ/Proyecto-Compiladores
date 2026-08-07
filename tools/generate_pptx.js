const pptxgen = require('pptxgenjs');
const { warnIfSlideHasOverlaps, warnIfSlideElementsOutOfBounds } = require('/home/oai/skills/slides/pptxgenjs_helpers');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'SAM-Lang';
pptx.subject = 'Proyecto final compiladores';
pptx.title = 'SAM-Lang Final';
pptx.company = 'Proyecto académico';
pptx.lang = 'es-PE';
pptx.theme = {
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  lang: 'es-PE'
};
pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.333, height: 7.5 });

const C = {
  bg: 'F3F7FA', dark: '122033', green: '0F766E', green2:'0B4F49', muted:'526170', white:'FFFFFF', soft:'D9EDE9', black:'101820'
};

function addTitle(slide, title, subtitle){
  slide.background = { color: C.bg };
  slide.addText(title, {x:0.6,y:0.35,w:8.5,h:0.45,fontFace:'Arial',fontSize:28,bold:true,color:C.dark,margin:0});
  if(subtitle) slide.addText(subtitle,{x:0.6,y:0.85,w:10,h:0.35,fontSize:13,color:C.muted,margin:0});
  slide.addShape(pptx.ShapeType.rect,{x:0.6,y:1.25,w:2.2,h:0.06,fill:{color:C.green},line:{color:C.green}});
}
function pill(slide, text, x,y,w){
  slide.addShape(pptx.ShapeType.roundRect,{x,y,w,h:0.42,rectRadius:0.05,fill:{color:C.soft},line:{color:C.soft}});
  slide.addText(text,{x:x+0.15,y:y+0.11,w:w-0.3,h:0.2,fontSize:11,bold:true,color:C.green2,margin:0,align:'center'});
}
function footer(slide,n){
  slide.addText(`SAM-Lang · ${n}/12`,{x:11.1,y:7.05,w:1.6,h:0.25,fontSize:9,color:C.muted,align:'right',margin:0});
}
function body(slide, items, x=0.8, y=1.6, w=5.7){
  slide.addText(items.map(t=>'• '+t).join('\n'),{x,y,w,h:4.8,fontSize:16,color:C.dark,breakLine:false,fit:'shrink',valign:'mid'});
}
function code(slide, text, x,y,w,h){
  slide.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.04,fill:{color:C.black},line:{color:C.black}});
  slide.addText(text,{x:x+0.2,y:y+0.18,w:w-0.4,h:h-0.35,fontFace:'Consolas',fontSize:12,color:'7FFFD4',margin:0,breakLine:false,fit:'shrink'});
}
function diagramPipeline(slide, labels, y=2.4){
  const start=0.6, gap=0.18, w=1.42, h=0.7;
  labels.forEach((l,i)=>{
    const x=start+i*(w+gap);
    if(i>0){ slide.addShape(pptx.ShapeType.line,{x:x-gap+0.03,y:y+h/2,w:gap-0.06,h:0,line:{color:C.green,width:2,beginArrowType:'none',endArrowType:'triangle'}}); }
    slide.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:0.04,fill:{color:i%2?C.soft:C.white},line:{color:C.green,width:1.2}});
    slide.addText(l,{x:x+0.06,y:y+0.18,w:w-0.12,h:0.3,fontSize:11,bold:true,color:C.dark,align:'center',margin:0,fit:'shrink'});
  });
}

const slides=[];
let s;

s=pptx.addSlide(); slides.push(s); s.background={color:C.green2};
s.addText('SAM-Lang',{x:0.75,y:2.1,w:8,h:0.8,fontSize:52,bold:true,color:C.white,margin:0});
s.addText('Lenguaje para creación y comunicación de agentes inteligentes',{x:0.8,y:3.05,w:9.5,h:0.35,fontSize:20,color:'D9EDE9',margin:0});
s.addText('Compilador completo: lexer · parser · AST · semántica · runtime · TAC · optimización · SAM-VM',{x:0.8,y:4.0,w:10.8,h:0.35,fontSize:14,color:C.white,margin:0}); footer(s,1);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Problema y enfoque','Por qué crear un lenguaje específico para agentes');
body(s,['Los agentes requieren objetivo, memoria, permisos, herramientas y flujos.','Un lenguaje general no expresa estas entidades de forma directa.','SAM-Lang convierte una declaración legible en un agente ejecutable.']);
code(s,'agente MedicoAI {\n  objetivo: "Apoyar el triaje";\n  memoria: persistente;\n}',7.1,1.8,5.2,2.0); footer(s,2);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Objetivos del proyecto','Alcance técnico entregado');
body(s,['Diseñar un lenguaje propio orientado a agentes.','Implementar análisis léxico, sintáctico y semántico.','Construir AST, runtime y comunicación entre agentes.','Generar TAC, optimizarlo y emitir código final SAM-VM.']);
pill(s,'Lenguaje propio',7.1,1.8,2.4); pill(s,'Runtime',9.8,1.8,1.7); pill(s,'SAM-VM',7.1,2.5,2.0); pill(s,'Web',9.4,2.5,1.4); footer(s,3);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Arquitectura del compilador','Cadena completa de procesamiento');
diagramPipeline(s,['Código','Lexer','Parser','AST','Semántica','Runtime','TAC','SAM-VM'],2.7); footer(s,4);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Diseño del lenguaje','Sintaxis base de SAM-Lang');
code(s,'agente Analista {\n  objetivo: "Analizar datos";\n  inteligencia: razonador;\n  memoria: compartida;\n\n  flujo analisis {\n    recibir datos;\n    responder "datos procesados";\n  }\n}',0.8,1.65,5.8,4.7);
body(s,['Declaración con palabra reservada agente.','Campos semánticos: objetivo, inteligencia y memoria.','Flujos con acciones: recibir, responder, delega, coordina.'],7.1,1.75,5.2); footer(s,5);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Análisis léxico y sintáctico','Unidad 1 cubierta');
body(s,['Tokens: agente, runtime, objetivo, flujo, si, sino, depende_de.','AFD implementado en el lexer para reconocer cadenas, números, identificadores y operadores.','Parser descendente + PDA tabular para validar estructura.']);
code(s,'TOKEN_AGENTE\nTOKEN_VAR\nTOKEN_OBJETIVO\nTOKEN_CADENA\nTOKEN_FLUJO',7.1,1.8,4.4,2.1); footer(s,6);

s=pptx.addSlide(); slides.push(s); addTitle(s,'AST y análisis semántico','La sintaxis se transforma en significado');
body(s,['AST con NodoPrograma, NodoAgente, NodoRuntime, NodoFlujo y NodoCondicional.','Tabla semántica para agentes y runtimes.','Validación de duplicados, dependencias, coordinadores y delegaciones inexistentes.']);
code(s,'NodoPrograma\n ├─ NodoAgente: Medico\n │   ├─ objetivo\n │   └─ flujo diagnostico\n └─ NodoRuntime',7.0,1.85,4.9,2.6); footer(s,7);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Runtime y comunicación','Agentes activos y mensajes internos');
body(s,['El runtime instancia cada agente validado.','Las dependencias y delegaciones generan mensajes.','La comunicación queda registrada como historial ejecutable.']);
code(s,'Medico -> Analista\n[dependencia] solicita colaboracion\nAnalista -> Medico\n[respuesta] informacion procesada',7.0,1.8,5.2,2.6); footer(s,8);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Código intermedio TAC','Middle-end del compilador');
body(s,['El AST se transforma en instrucciones independientes de la sintaxis original.','Las acciones se convierten en CALL con temporales.','Los condicionales generan etiquetas y saltos.']);
code(s,'CREATE_AGENT Medico\nSET_OBJECTIVE Medico, "Diagnostico"\nCALL Medico, recibir -> T1\nCALL Medico, responder -> T2',6.7,1.75,5.6,2.8); footer(s,9);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Optimización y SAM-VM','Back-end del compilador');
body(s,['El optimizador elimina instrucciones redundantes.','El generador final emite código SAM-VM.','La salida se guarda como archivo .samvm.']);
code(s,'LOAD_AGENT Medico\nSET_OBJECTIVE Medico "Diagnostico"\nEXECUTE Medico.responder -> T2\nHALT',6.8,1.85,5.4,2.6); footer(s,10);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Interfaz web','Editor, ejecución y salida del compilador');
body(s,['Compilador completo migrado a JavaScript.','Funciona al abrir web/index.html, sin servidor ni API.','Muestra tokens, AST, runtime, TAC, SAM-VM y respuesta del agente.']);
code(s,'Abrir web/index.html\nCompilar y ejecutar\nProbar agente creado\n→ respuesta + traza',6.8,1.85,5.4,2.5); footer(s,11);

s=pptx.addSlide(); slides.push(s); addTitle(s,'Conclusiones','Resultado final');
body(s,['SAM-Lang cubre las fases principales del sílabo.','Integra C++17 y una migración web autónoma en JavaScript.','La entrega incluye código, autómatas, pruebas, ejemplos y documentación.'],0.8,1.75,7.0);
pill(s,'Lexer',8.5,1.8,1.3); pill(s,'Parser',10.0,1.8,1.4); pill(s,'AST',8.5,2.5,1.2); pill(s,'Semántica',10.0,2.5,1.9); pill(s,'Runtime',8.5,3.2,1.7); pill(s,'SAM-VM',10.5,3.2,1.6); footer(s,12);

for (const sl of slides) {
  warnIfSlideHasOverlaps(sl, pptx);
  warnIfSlideElementsOutOfBounds(sl, pptx);
}

pptx.writeFile({ fileName: '/mnt/data/SAM-LANG-FINAL/documentacion/Presentacion_SAM_Lang.pptx' });
