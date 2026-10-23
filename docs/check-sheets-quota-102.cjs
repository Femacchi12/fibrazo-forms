const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let now=0,calls=0,fail=false;
class Clock extends Date{static now(){return now;}}
const context=vm.createContext({module:{exports:{}},process:{env:{GOOGLE_SHEET_ID:'fixture'}},Date:Clock,console,require:n=>n==='firebase-admin'?{apps:[true]}:n==='googleapis'?{google:{sheets:()=>({spreadsheets:{values:{batchGet:async()=>{calls++;await Promise.resolve();if(fail)throw Error('QUOTA429');return{data:{valueRanges:[{values:[['FORM','Form']]},{values:[['person@test','COLABORADOR','ACTIVO']]},{values:[['person@test','FORM',true]]}]}};}}}})}}:require(n)});
vm.runInContext(fs.readFileSync(__dirname+'/../api/_core.js','utf8'),context);
(async()=>{
 const c=context.module.exports;
 const all=await Promise.all(Array.from({length:20},()=>Promise.all([c.loadForms({}),c.loadUsers({}),c.loadFormPermissions({})])));
 assert.equal(calls,1);assert.equal(all[0][0][0].id,'FORM');assert(c.permissionFor(all[0][2],'person@test','FORM').canView);assert(!c.permissionFor(all[0][2],'other@test','FORM').canView);
 await c.loadForms({});assert.equal(calls,1);
 now=15001;fail=true;await assert.rejects(c.loadForms({}),/QUOTA/);assert.equal(calls,2);
 fail=false;await c.loadForms({});assert.equal(calls,3);
 c.invalidateConfiguration();await c.loadUsers({});assert.equal(calls,4);
 const source=fs.readFileSync(__dirname+'/../api/_territorial.js','utf8');const code=source.slice(source.indexOf('const territorialFlights='),source.indexOf('function loadCatalog(auth)'));
 let reads=0;const t=vm.createContext({Map,Promise});vm.runInContext(code+';this.run=territorialFlight;',t);
 const responses=await Promise.all(Array.from({length:20},()=>t.run('same',async()=>{reads++;return{real:true};})));assert.equal(reads,1);assert(responses.every(x=>x.real));
 await assert.rejects(t.run('bad',async()=>{throw Error('failed');}));await t.run('bad',async()=>{reads++;});assert.equal(reads,2);
 console.log('PASS102: 60 concurrent configuration consumers use one Sheets batch read; access remains user-specific; expired cache fails closed, failure can recover, admin invalidation refreshes; concurrent geographic reads coalesce and failed reads release');
})().catch(e=>{console.error(e);process.exitCode=1});
