const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(__dirname+'/../ux-v04.js','utf8');
const start=src.indexOf('  const ispCatalogFlights='),end=src.indexOf('  function clearOperators(){',start);
let email='eduardo@fibrazo.test',requests=0,gate,mode='ok',paint=0,timerId=0;
const storage=new Map(),timers=new Map(),listeners={},state={ispOptions:[]};
const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const ctx=vm.createContext({state,publicMode:false,currentUser:()=>({email,getIdToken:async()=> 'fixture-token'}),localStorage,normalizeCityName:s=>String(s).toLowerCase(),refreshIspSuggestions:()=>paint++,Map,Date,Promise,AbortController,setTimeout:f=>{timers.set(++timerId,f);return timerId;},clearTimeout:id=>timers.delete(id),queueMicrotask(){},window:{addEventListener:(n,f)=>listeners[n]=f},fetch:async()=>{requests++;await new Promise(r=>gate=r);if(mode==='fail')throw Error('Weak signal');return{ok:mode!=='denied',status:mode==='denied'?403:200,json:async()=>({isps:['Complete Networks','Another ISP']})};}});
vm.runInContext(src.slice(start,end)+';this.run=loadSharedIsps;this.local=loadLocalIsps;',ctx);
async function tick(){await Promise.resolve();await Promise.resolve();}
(async()=>{
 const a=ctx.run(),b=ctx.run();await tick();assert.equal(requests,1,'concurrent opening shares one catalog request');gate();await Promise.all([a,b]);assert(state.ispOptions.includes('Complete Networks'));assert(paint>0);
 state.ispOptions=[];ctx.local();assert(state.ispOptions.includes('Complete Networks'),'complete catalog is synchronous after resetting form');
 await ctx.run();assert.equal(requests,1,'recent successful fetch not repeated on each form');
 vm.runInContext('ispCatalogFresh.clear()',ctx);mode='fail';const cached=ctx.run();assert(state.ispOptions.includes('Another ISP'),'cached operators visible while request remains pending');await tick();gate();await cached;assert(state.ispOptions.includes('Complete Networks'),'weak signal keeps cached operators');
 mode='ok';const old=ctx.run();await tick();email='other@fibrazo.test';state.ispOptions=[];ctx.local();assert.equal(state.ispOptions.length,0,'another account cannot inherit shared cache');gate();await old;assert.equal(state.ispOptions.length,0,'late response from old owner ignored');
 email='eduardo@fibrazo.test';ctx.local();mode='denied';const denied=ctx.run();await tick();gate();await denied;assert.equal(state.ispOptions.length,0);assert(!storage.has('fibrazo:shared-isps-v104:'+email),'explicit denial removes shared catalog cache');
 assert(src.includes('input.refreshIspOptions=()=>{if(!list.hidden)paint();}'));assert(src.includes('input.refreshIspOptions?.();'));
 console.log('PASS104: complete catalog persists across forms, immediate cached options while network/GPS pending, one concurrent request, failure retention, account isolation, stale response rejection, denied-cache removal, open dropdown refresh hook');
})().catch(e=>{console.error(e);process.exitCode=1});
