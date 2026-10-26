const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nav=require('../operator-navigation');
const catalog={operators:[{id:'OP-NET',name:'Networks',brand:'Networks',city:'Neiva',cities:['Neiva'],visible:true},{id:'OP-WIR',name:'Wirtel',city:'Neiva',cities:['Neiva'],visible:true},{id:'OP-CLR',name:'Claro',city:'Colombia',cities:['Neiva'],visible:true}],aliases:[]};
assert.equal(nav.resolve(catalog,'Networ','Neiva').operator.id,'OP-NET');assert.equal(nav.resolve(catalog,'Wirlet','Neiva').operator.id,'OP-WIR');
assert.equal(nav.resolve(catalog,'Networ','Villavicencio').status,'missing');assert.equal(nav.resolve(catalog,'Networks','Cartagena').status,'missing-city');
const ambiguous={operators:[...catalog.operators,{...catalog.operators[0],id:'OP-NET-2'}]};assert.equal(nav.resolve(ambiguous,'Networks','Neiva').status,'ambiguous');
assert.equal(nav.resolve(catalog,'Alfa Visión','Neiva').status,'missing');
const linked=new URL(nav.link(nav.resolve(catalog,'Claro HFC','Neiva'),'Claro HFC','Neiva'));assert.equal(linked.searchParams.get('operatorId'),'OP-CLR');assert.equal(linked.searchParams.get('technology'),'HFC');assert.equal(linked.searchParams.get('city'),'Neiva');
const entries=nav.entries(['Networks','Claro HFC','Movistar','Asonet']);assert.deepEqual(entries.map(x=>x.label),['Incumbente 1','Incumbente 2','ISP 1','ISP 2']);assert.equal(entries[2].name,'Networks');
const shared=nav.mapLink('https://fibrazo-forms.vercel.app',['Neiva'],['isp:networks']);const parsed=nav.mapRequest(shared);assert(parsed.only&&parsed.view);assert.deepEqual(parsed.cities,['Neiva']);assert.deepEqual(parsed.operators,['isp:networks']);
assert(!shared.includes('user='));assert(!shared.includes('token'));assert(!nav.mapLink('https://fibrazo-forms.vercel.app',['Neiva','Cartagena'],['claro']).includes('operator='));
// Exercise the real popup, fullscreen and share code against a minimal DOM contract.
const nodes={};const classes=()=>({toggle(){},add(){},remove(){}});
for(const id of ['mapCanvasWrap','mapOnlyView','mapFullscreen','mapStatus','mapShareStatus','mapShareUrl'])nodes[id]={classList:classes(),setAttribute(){},append(){},before(){},focus(){},select(){}};
const document={readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]||null,body:{classList:classes()},createComment:()=>({after(){}})};
const ctx={window:{FIBRAZO_OPERATOR_NAV:nav,firebase:{auth:()=>({currentUser:{email:'edu@fibrazo.com'}})}},document,location:{href:'https://fibrazo-forms.vercel.app/?view=map&map=only&city=Neiva',origin:'https://fibrazo-forms.vercel.app'},history:{replaceState(_,__,url){ctx.location.href=url;}},setTimeout:fn=>fn(),navigator:{clipboard:{writeText:async()=>{throw Error('denied')}}},URL,AbortController,Option:function(text,value){this.textContent=text;this.value=value;},console};
ctx.window.window=ctx.window;ctx.firebase=ctx.window.firebase;
let script=fs.readFileSync(require.resolve('../map-v01.js'),'utf8');script=script.replace('  if(document.readyState==="loading")',`  window._test={state,popupHtml,pointPopupHtml,setMapFullscreen,shareMap,applySharedCities,applySharedOperators,setCatalog:v=>operatorCatalog=v};\n  if(document.readyState==="loading")`);vm.runInNewContext(script,ctx);
const map=ctx.window._test;map.state.map={invalidateSize(){}};map.setCatalog(catalog);
const point={lat:2.95,lng:-75.28,type:'Presencial',timestamp:'2026-10-26T12:00:00Z',user:'qa@example.invalid',city:{status:'DENTRO',assigned:'Neiva'},barrio:{status:'DENTRO',assigned:'TEST'},estrato:{status:'DENTRO',assigned:'2'},operators:['Claro HFC','Networks','<img src=x onerror=alert(1)>']};
const html=map.pointPopupHtml(point);assert(html.includes('Incumbente 1'));assert(html.includes('ISP 1'));assert(html.includes('operatorId=OP-NET'));assert(html.includes('qa@example.invalid'));assert(html.includes('Coordenadas'));assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(html.includes('Sin ficha disponible'));
map.setMapFullscreen(true);assert.equal(new URL(ctx.location.href).searchParams.get('map'),'only');assert.equal(nodes.mapOnlyView.textContent,'↙ Volver al dashboard');map.setMapFullscreen(false);assert.equal(new URL(ctx.location.href).searchParams.get('map'),null);
console.log('PASS108: approved aliases, canonical IDs, ambiguous/missing records, operator rows, XSS escaping, shared scope and fullscreen URL.');
// Real catalog handler: authentication, form ACL, cached permission recheck, DTO only.
const Module=require('node:module'),originalLoad=Module._load;let signedIn=false,allowed=false,reads=0;
const op=Array(32).fill('');op[0]='OP-NET';op[1]='Networks';op[11]='Neiva';op[17]='Private note not for navigation';op[29]='Sí';
const presence=Array(26).fill('');presence[3]='Neiva';presence[8]='OP-NET';presence[20]='Presencia observada';
const core={httpError:(m,s)=>Object.assign(Error(m),{status:s}),verifyUser:async()=>{if(!signedIn)throw Object.assign(Error('AUTH_REQUIRED'),{status:401});return{email:'qa@example.invalid'};},gauth:()=>({}),loadForms:async()=>[{id:'EXPLORACION_PRESENCIAL'}],userCapabilities:async()=>({permissions:[]}),canUseDashboard:()=>true,permissionFor:()=>({}),canAccess:()=>allowed};
const google={sheets:()=>({spreadsheets:{values:{batchGet:async()=>{reads++;return{data:{valueRanges:[{values:[[],op]},{values:[[],presence]},{values:[[]]},{values:[[]]}]}};}}}})};
Module._load=function(name,...args){if(name==='./_core')return core;if(name==='googleapis')return{google};return originalLoad.call(this,name,...args);};const catalogHandler=require('../api/_operator-catalog');Module._load=originalLoad;
async function callCatalog(){const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await catalogHandler({method:'GET'},res);return res;}
(async()=>{
 assert.equal((await callCatalog()).code,401);signedIn=true;assert.equal((await callCatalog()).code,403);assert.equal(reads,0);
 allowed=true;const result=await callCatalog();assert.equal(result.code,200);assert.equal(result.body.operators[0].id,'OP-NET');assert.deepEqual(result.body.operators[0].cities,['Neiva']);assert(!JSON.stringify(result.body).includes('Private note'));assert.equal(reads,1);
 allowed=false;assert.equal((await callCatalog()).code,403);assert.equal(reads,1);
 await map.shareMap();assert.equal(nodes.mapShareUrl.hidden,false);assert.match(nodes.mapShareUrl.value,/map=only/);assert.match(nodes.mapShareStatus.textContent,/iniciar sesión/);
 console.log('PASS108 API: unauthenticated/unauthorized denied, cached ACL rechecked, read-only minimal catalog, clipboard fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
