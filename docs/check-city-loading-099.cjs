const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root=__dirname+'/../';
function method(name){const s=fs.readFileSync(root+'map-v01.js','utf8');const start=s.indexOf('  async function '+name+'(');const end=s.indexOf('\n  function ',start+3);const asyncEnd=s.indexOf('\n  async function ',start+3);return s.slice(start,Math.min(...[end,asyncEnd].filter(x=>x>start)));}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function server(){
 const make=(id,city,email='owner@test')=>{const r=Array(83).fill('');Object.assign(r,{0:'2026-10-23',1:id,2:city,17:2.94,18:-75.28,24:email,26:'Presencial'});return r;};
 const old=make('OLD-NEIVA','Neiva'),rows=[old,...Array.from({length:2100},(_,i)=>make('OTHER'+i,'Ibagué')),make('PRIVATE','Neiva','other@test'),make('ACCENT','Montería'),make('AMB','Girón')];
 const intel=Array(32).fill('');Object.assign(intel,{0:'2026-10-23',1:'INTEL',2:'ISP',9:2.94,10:-75.28,16:'Neiva',19:'owner@test'});
 const core={SHEET_ID:'fixture',gauth:()=>({}),verifyUser:async()=>({email:'owner@test'}),loadForms:async()=>[{id:'EXPLORACION_PRESENCIAL'},{id:'INTELIGENCIA_OPERADOR'}],userCapabilities:async()=>({base:false,permissions:[]}),canUseDashboard:()=>true,permissionFor:()=>({}),canAccess:()=>true,httpError:(m,status)=>Object.assign(Error(m),{status})};
 const context={module:{exports:{}},console,require:name=>name==='./_operational-reference'?require('../api/_operational-reference'):name==='./_core'?core:name==='googleapis'?{google:{sheets:()=>({spreadsheets:{values:{batchGet:async arg=>({data:{valueRanges:arg.ranges.map(range=>({values:range.includes('FH2:')||range.includes('AK2:')?[]:range.startsWith('RESP_EXPLORACION')?rows:[intel]}))}})}}})}}:require(name)};
 vm.runInNewContext(fs.readFileSync(root+'api/map.js','utf8'),context);
 async function get(cities){let result;await context.module.exports({method:'GET',query:{cities}},{setHeader(){},status(n){assert.equal(n,200);return this;},json(x){result=x;}});return result.points.map(p=>p.id);}
 assert.deepEqual(Array.from(await get('neiva')),['OLD-NEIVA','INTEL']);
 assert.deepEqual(Array.from(await get('monteria')),['ACCENT']);assert.deepEqual(Array.from(await get('bucaramanga-amb')),['AMB']);
 assert.equal((await get('villavicencio')).length,0);
}
async function client(){
 let city='neiva',requests=[],busy=new Set(),status=[];
 const state={points:[],pointsController:null,loadedOnce:true,mapQaAuthorized:false};
 const env={state,pointScope:()=>city,firebase:{auth:()=>({currentUser:{}})},AbortController,Date,encodeURIComponent,$:()=>null,beginMapBusy:()=>{const x={};busy.add(x);return x;},endMapBusy:x=>busy.delete(x),mapStatus:x=>status.push(x),authorizedFetch:(url,controller)=>{const d=deferred();requests.push({url,controller,...d});return d.promise;},cachePoints(){},cachedPoints:()=>[],updateFilters(){},renderMarkers(){}};
 const context=vm.createContext(env);vm.runInContext(method('loadPoints')+';this.run=loadPoints;',context);
 const a=context.run();city='ibague';const b=context.run();assert(requests[0].controller.signal.aborted);
 requests[1].resolve({points:[{id:'IBG'}]});await b;requests[0].resolve({points:[{id:'NEI'}]});await a;
 assert.equal(state.points[0].id,'IBG');assert.equal(busy.size,0);assert(requests[0].url.includes('cities=neiva'));assert(requests[1].url.includes('cities=ibague'));
 city='';await context.run();assert.equal(requests.length,2);assert.equal(state.points.length,0);
}
async function deadline(){
 let timer,fetches=0;const context=vm.createContext({polygonResponseCache:new Map(),firebase:{auth:()=>({currentUser:{getIdToken:()=>new Promise(()=>{})}})},AbortController,DOMException,Error,Date,Promise,setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},fetch:()=>{fetches++;}});
 vm.runInContext(method('authorizedFetch')+';this.run=authorizedFetch;',context);
 const task=context.run('/api/map');timer();await assert.rejects(task,/tardó demasiado/);assert.equal(fetches,0);
}
async function cityOnly(){
 let full=0,reads=0,result;const context={module:{exports:{}},console,process:{env:{}},require:name=>name==='googleapis'?{google:{}}:name==='./_core'?{verifyUser:async()=>({}),gauth:()=>({}),httpError:m=>Error(m)}:name==='./_territorial'?{resolveMapCity:async()=>{reads++;return {status:'DENTRO',assigned:{name:'Neiva'}};},resolveTerritorial:()=>{full++;throw Error('must not enrich');}}:require(name)};
 vm.runInNewContext(fs.readFileSync(root+'api/exploration.js','utf8'),context);
 await context.module.exports({method:'GET',query:{lat:2.94,lng:-75.28,cityOnly:'1'}},{setHeader(){},status(n){assert.equal(n,200);return this;},json(x){result=x;}});assert.equal(reads,1);assert.equal(full,0);assert.equal(result.city,'Neiva');
}
(async()=>{await server();await client();await deadline();await cityOnly();console.log('PASS099: city/AMB/accent filtering before limit, old city points retained, ownership, separate intelligence, empty-city no fetch, stale response isolation, busy cleanup, auth deadline, lightweight GPS without full enrichment');})().catch(e=>{console.error(e);process.exitCode=1});
