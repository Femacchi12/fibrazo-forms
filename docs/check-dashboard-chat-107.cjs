const assert=require('node:assert/strict');
const Module=require('node:module');
const analytics=require('../api/_chat-data');
const query={intent:'strata',cities:['Neiva'],operator:'',stratum:'',period:'',priceKind:'regular',service:'internet'};
function point(id,owner,manual,auto,operator='Networks'){
 const r=Array(83).fill('');Object.assign(r,{0:'2026-10-24T15:00:00.000Z',1:id,2:'Neiva',3:'BARRIO',9:'Sí',12:operator,17:2.95,18:-75.28,24:owner,26:'Presencial',45:'DENTRO',47:'BARRIO',51:'DENTRO',53:auto,64:manual});return r;
}
const header=Array(83).fill(''),rows=[header,point('ID1','edu@fibrazo.com','3','2'),point('ID2','other@fibrazo.com','','1'),point('ID1','edu@fibrazo.com','3','2','Wirlet'),point('TEST','edu@fibrazo.com','','1')];rows[4][82]='Sí';
const limited={email:'edu@fibrazo.com',all:false,presential:true,virtual:false,competition:false};
const own=analytics.points(rows,[],[],'source',limited);assert.equal(own.length,1);assert.equal(own[0].stratum,'3');assert(own[0].operators.includes('Wirtel'));assert(!own[0].operators.includes('Networks'));
assert.equal(analytics.points(rows,[],[],'source',{...limited,presential:false}).length,0);
const snap={points:own,plans:[[]],sourceId:'source',competitionId:'competition',coverage:[[]],operators:[[]]};
const result=analytics.analyze(query,snap,limited);assert.match(result.text,/1 puntos únicos/);assert.match(result.text,/1 tienen estrato observado/);assert.equal(result.tables[1].rows[0][0],'3');assert.match(result.notes.join(' '),/únicamente tus registros/);
assert.equal(analytics.canonical('Networ'),'Networks');assert.equal(analytics.canonical('Nov'),'NovaNet');assert.equal(analytics.canonical('NovaRed Comunicaciones'),'NovaRed Comunicaciones');
assert.throws(()=>analytics.validateQuery({...query,cities:['Bogus']},['Neiva'],[]),/UNKNOWN_CITY/);
assert.throws(()=>analytics.validateQuery({...query,stratum:'8'},['Neiva'],[]),/INVALID_QUERY/);
assert.equal(analytics.number('50.000'),50000);assert.equal(analytics.number('50,000'),50000);assert.equal(analytics.number('No informado'),null);assert.equal(analytics.number(''),null);
function plan(name,price,period='2026-10',service='Internet',modality='Mensual',promo=''){
 const r=Array(36).fill('');Object.assign(r,{1:'2026-10-20',5:'Neiva',9:name,11:service,14:100,16:price,17:promo,21:service.includes('TV')?'Sí':'No',26:'Por validar',28:modality,29:period});return r;
}
const offers=[[],plan('Old',1000,'2026-09'),plan('Lowest',50000),plan('Tied','50.000'),plan('Daily',1000,'2026-10','Internet','Diario'),plan('Bundle',2000,'2026-10','Internet + TV'),plan('Promo',70000,'2026-10','Internet','Mensual',10000),plan('Expired',10)];offers.at(-1)[3]='2020-01-01';
const prices=analytics.analyze({...query,intent:'prices'},{...snap,plans:offers},{...limited,competition:true});assert.match(prices.text,/Lowest, Tied/);assert.match(prices.text,/3 ofertas comparables/);assert(!prices.text.includes('Old'));assert.equal(prices.tables[0].rows[0][0],'Lowest');
const promotion=analytics.analyze({...query,intent:'prices',priceKind:'promotion'},{...snap,plans:offers},{...limited,competition:true});assert.match(promotion.text,/Promo/);
assert.match(analytics.analyze({...query,intent:'prices'},snap,limited).text,/dashboard de competencia/);
const guided=analytics.guided('Operadores por estrato 2 en Neiva',{},['Neiva'],['Networks']);assert.equal(guided.stratum,'2');assert.equal(guided.intent,'strata');assert.deepEqual(guided.cities,['Neiva']);
assert.equal(analytics.guided('Borra todos los datos',{},['Neiva'],[]).intent,'unsupported');
const coverage=[Array(26).fill('')];for(const [name,state]of[['Visible','Presencia observada'],['Retirado','No presta servicio']]){const r=Array(26).fill('');r[3]='Neiva';r[9]=name;r[18]='2026-10';r[20]=state;coverage.push(r);}
const summary=analytics.analyze({...query,intent:'summary'},{...snap,coverage},{...limited,competition:true});assert.equal(summary.tables[0].rows.length,1);assert.equal(summary.tables[0].rows[0][0],'Visible');

// Exercise the actual HTTP handler: CORS + authentication + form ACL before any data read.
const originalLoad=Module._load;let reads=0,authenticated=false,allowed=false;
const core={SHEET_ID:'source',httpError:(m,s)=>Object.assign(Error(m),{status:s}),verifyUser:async()=>{if(!authenticated)throw Object.assign(Error('AUTH_REQUIRED'),{status:401});return{email:'edu@fibrazo.com'};},gauth:()=>({}),loadForms:async()=>[{id:'EXPLORACION_PRESENCIAL'},{id:'INTELIGENCIA_OPERADOR'}],userCapabilities:async()=>({base:false,adminActive:false,permissions:[]}),canUseDashboard:()=>true,permissionFor:()=>({}),canAccess:()=>allowed};
const google={sheets:()=>({spreadsheets:{get:async()=>{reads++;return{data:{sheets:[]}};}}})};
Module._load=function(name,...args){if(name==='./_core')return core;if(name==='googleapis')return{google};return originalLoad.call(this,name,...args);};
const handler=require('../api/_chat');Module._load=originalLoad;
async function call(req){const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(v){this.body=v;return this;},end(){return this;}};await handler({method:'GET',query:{},headers:{},...req},res);return res;}
(async()=>{
 assert.equal((await call({})).code,401);authenticated=true;assert.equal((await call({})).code,403);assert.equal(reads,0);
 assert.equal((await call({method:'OPTIONS',headers:{origin:'https://evil.example'}})).code,403);
 const cors=await call({method:'OPTIONS',headers:{origin:'https://femacchi12.github.io'}});assert.equal(cors.code,204);assert.equal(cors.headers['Access-Control-Allow-Origin'],'https://femacchi12.github.io');
 // Persistent counter test: two concurrent reservations cannot both acquire the lease.
 const map=new Map();const api={spreadsheets:{developerMetadata:{get:async({metadataId})=>{if(!map.has(metadataId))throw Object.assign(Error('not found'),{code:404});return{data:map.get(metadataId)};}},batchUpdate:async({requestBody})=>{for(const r of requestBody.requests){if(r.createDeveloperMetadata){const m=r.createDeveloperMetadata.developerMetadata;if(map.has(m.metadataId))throw Object.assign(Error('exists'),{code:409});map.set(m.metadataId,m);}else if(r.updateDeveloperMetadata){const x=r.updateDeveloperMetadata;for(const f of x.dataFilters){const id=f.developerMetadataLookup.metadataId;map.set(id,{...map.get(id),...x.developerMetadata});}}else if(r.deleteDeveloperMetadata){const l=r.deleteDeveloperMetadata.dataFilter.developerMetadataLookup;if(map.get(l.metadataId)?.metadataValue===l.metadataValue)map.delete(l.metadataId);}}return{data:{}};}}};
 const concurrent=await Promise.allSettled([handler.reserve(api,'edu@fibrazo.com'),handler.reserve(api,'edu@fibrazo.com')]);assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
 for(let i=1;i<20;i++)await handler.reserve(api,'edu@fibrazo.com');await assert.rejects(handler.reserve(api,'edu@fibrazo.com'),/CHAT_DAILY_LIMIT/);assert(!map.has(2082107));
 const total=JSON.parse(map.get(2082108).metadataValue);assert.equal(total.total,20);assert(!JSON.stringify(total).includes('edu@'));total.total=100;map.get(2082108).metadataValue=JSON.stringify(total);await assert.rejects(handler.reserve(api,'another@fibrazo.com'),/CHAT_DAILY_LIMIT/);
 console.log('FO-CHG-107 PASS: deduplication, manual priority, owner/form ACL, price comparability, CORS and persistent concurrent AI limits.');
})().catch(e=>{console.error(e);process.exitCode=1;});
