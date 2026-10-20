const fs=require('fs'),assert=require('node:assert/strict');
const ui=fs.readFileSync(__dirname+'/../ux-v04.js','utf8'),mod=require('../background-territory');
const review=ui.slice(ui.indexOf('  async function review(){'),ui.indexOf('  function edit(){'));
async function checkReview(point,pending){
 const state={gps:point,gpsCapturePending:pending,geoPromise:new Promise(()=>{}),form:{id:'EXPLORACION_PRESENCIAL'},locationValidated:false};
 const dom={formWorkspace:{hidden:false},reviewWorkspace:{hidden:true},successWorkspace:{hidden:true}};
 let built=0,validated=0,status='';
 const fn=new Function('backgroundTerritoryEnabled','requireTestChoice','state','window','setStatus','validateAll','activeSections','renderSection','showValidation','$','buildReview','isExplorationForm','resolveExplorationMunicipality',review+'return review;')(
  ()=>true,()=>true,state,{FIBRAZO_BACKGROUND_TERRITORY:mod,scrollTo(){}},s=>status=s,()=>{validated++;return[]},()=>[],()=>{},()=>{},id=>dom[id],()=>built++,()=>true,async()=>{}
 );
 await Promise.race([fn(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Review waited on territorial request')),100))]);
 if(point&&!pending){assert.equal(built,1);assert.equal(validated,1);assert.equal(dom.reviewWorkspace.hidden,false);}
 else{assert.equal(built,0);assert.equal(validated,0);assert.match(status,/coordenada/);}
}
async function lateLookup(){
 const start=ui.indexOf('  async function queryExplorationEnrichment('),end=ui.indexOf('  async function resolveExplorationMunicipality(',start),source=ui.slice(start,end);
 const state={form:{id:'EXPLORACION_PRESENCIAL'},startedAt:1,gps:{lat:4,lng:-73},geoLookupId:0,geoLookupCancelled:false};
 let resolve,called=false,writes=0;
 const actual=new Function('state','navigator','geoStatus','currentUser','AbortController','setTimeout','clearTimeout','fetch','setGeoField','applyDetectedCity',source+'return queryExplorationEnrichment;')(
 state,{onLine:true},()=>{},()=>({getIdToken:async()=> 'fixture'}),AbortController,(f,n)=>{const t=setTimeout(f,n);t.unref();return t},clearTimeout,()=>{called=true;return new Promise(r=>resolve=r)},()=>writes++,()=>writes++);
 const task=actual(4,-73);await Promise.resolve();await Promise.resolve();assert.ok(called);
 state.form={id:'EXPLORACION_PRESENCIAL'};state.startedAt=2;state.geoLookupId=1;
 resolve({ok:true,json:async()=>({ok:true,cityStatus:'DENTRO',city:'Wrong next form'})});
 await task;assert.equal(writes,0);
}
(async()=>{await checkReview({lat:4,lng:-73},false);await checkReview(null,true);await checkReview(null,false);await lateLookup();console.log('FO-CHG-081 UX: immediate review with valid point, GPS guard, late response isolation PASS')})().catch(e=>{console.error(e);process.exitCode=1});
