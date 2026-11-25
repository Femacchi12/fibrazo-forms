const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const cfg=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
const calls=[];
const ctx={module:{exports:async()=>calls.push('map')},require:id=>async()=>calls.push(id)};
const code=fs.readFileSync(path.join(root,'api/map.js'),'utf8');
vm.runInNewContext(code.slice(code.indexOf('// Shared map entry point;')),ctx);
(async()=>{const res={status(n){assert.equal(n,404);return this},json(){calls.push('404')}};
for(const route of [undefined,'map-search','map-city-catalog','unknown'])await ctx.module.exports({query:route===undefined?{}:{__map_route:route}},res);
assert.deepEqual(calls,['map','./_map-search','./_map-city-catalog','404']);
for(const route of ['map-search','map-city-catalog']){assert.ok(cfg.rewrites.some(r=>r.source==='/api/'+route&&r.destination==='/api/map?__map_route='+route));assert.ok(!fs.existsSync(path.join(root,'api',route+'.js')));assert.ok(fs.existsSync(path.join(root,'api','_'+route+'.js')))}
const count=fs.readdirSync(path.join(root,'api')).filter(x=>/^[^_.].*\.js$/.test(x)).length;assert.ok(count<=12);console.log('PASS map routing and function budget:',count);})().catch(e=>{console.error(e);process.exitCode=1});
