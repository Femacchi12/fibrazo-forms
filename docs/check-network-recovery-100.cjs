const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=n=>fs.readFileSync(__dirname+'/../'+n,'utf8');
function section(s,start,end){return s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));}
async function admin(){
 let user={uid:'edu',email:'edu@test',getIdToken:async()=> 'token'},mode='network',cleared=0,timer;
 const nav={hidden:false};
 const env={navigator:{onLine:true},current:()=>user,window:{FIBRAZO_ACCESS_META:{email:'edu@test',admin:true}},nav,
 loadInFlight:false,loadOwner:'',retryNeeded:true,lastAttempt:0,Date,AbortController,Promise,Error,
 setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){},msg(){},forceForms:()=>{nav.hidden=true;cleared++;},renderGlobal(){},renderForms(){},items:[],admins:[],adminMeta:{},
 fetch:async()=>{if(mode==='network')throw Error('offline');return {status:403,ok:false,json:async()=>({})};}};
 const ctx=vm.createContext(env);vm.runInContext(section(read('admin-v03.js'),'  async function load(){','  /* VIS-019')+';this.run=load;',ctx);
 await ctx.run();assert.equal(nav.hidden,false);assert.equal(cleared,0);assert(ctx.retryNeeded);assert(!ctx.loadInFlight);
 mode='denied';await ctx.run();assert(nav.hidden);assert.equal(cleared,1);assert(!ctx.retryNeeded);
 user={uid:'edu',email:'edu@test',getIdToken:()=>new Promise(()=>{})};const pending=ctx.run();timer();await pending;assert(!ctx.loadInFlight);assert(ctx.retryNeeded);
 // A transient failure must not expose another user's cached admin capability.
 user={uid:'other',email:'other@test',getIdToken:async()=> 'token'};mode='network';await ctx.run();assert(nav.hidden);
}
async function catalog(){
 let mode='failure',calls=0;const store=new Map(),state={cityCatalog:[],viewActive:true};
 const env={state,catalogRequest:null,catalogLastAttempt:0,catalogNeedsRetry:true,Date,JSON,Array,Error,console:{warn(){}},navigator:{onLine:true},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},userScopedKey:k=>k+':edu',updateFilters(){},mapStatus(){},authorizedFetch:async()=>{calls++;if(mode==='failure')throw Error('offline');if(mode==='denied')throw Object.assign(Error('denied'),{status:403});return{cities:['Neiva','Ibagué']};}};
 const ctx=vm.createContext(env),src=read('map-v01.js');vm.runInContext(section(src,'  function restoreCityCatalog(){','  function recoverMapConnection(){')+';this.run=loadCityCatalog;',ctx);
 await ctx.run();assert(ctx.catalogNeedsRetry);assert.equal(ctx.catalogRequest,null);
 mode='success';await ctx.run();assert.equal(state.cityCatalog.length,2);assert(!ctx.catalogNeedsRetry);assert(store.size);
 state.cityCatalog=[];mode='failure';await ctx.run();assert.equal(state.cityCatalog[0],'Neiva');assert(ctx.catalogNeedsRetry);
 mode='denied';await ctx.run();assert.equal(state.cityCatalog.length,0);assert.equal(store.size,0);
 env.navigator.onLine=false;const before=calls;await ctx.run();assert.equal(calls,before);
}
(async()=>{await admin();await catalog();console.log('PASS100: transient admin failure preserves verified account UI, explicit403 hides, blocked token deadline releases request; other account cannot inherit admin; city catalog retries, scoped cache survives transient failures, explicit denial clears cache, offline makes no request');})().catch(e=>{console.error(e);process.exitCode=1});
