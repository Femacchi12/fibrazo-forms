// FO-CHG-062: QA-only reference strata must not become assigned outside polygons.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {referenceResult}=require("../api/_estratos-precalc")._internals;
const rect=(x1,y1,x2,y2)=>[[[[x1,y1],[x2,y1],[x2,y2],[x1,y2],[x1,y1]]]];
const rows=[
  {estrato:"1",polygons:rect(0,0,0.0001,0.0001)},
  {estrato:"2",polygons:rect(0.00015,0,0.00025,0.0001)},
  {estrato:"3",polygons:rect(0.02,0.02,0.021,0.021)}
];
const exact=referenceResult(rows,0.00005,0.00005);
assert.equal(exact.status,"DENTRO");
assert.equal(exact.value,"1");
assert.deepEqual(exact.nearby,[]);
const between=referenceResult(rows,0.00005,0.000125);
assert.equal(between.status,"FUERA");
assert.equal(between.value,"");
assert.deepEqual(between.nearby.map(x=>x.estrato),["1","2"]);
assert.ok(between.nearby.every(x=>x.distanceM>0&&x.distanceM<25));
const far=referenceResult(rows,-0.04,-0.04);
assert.equal(far.status,"FUERA");
assert.equal(far.value,"");
assert.deepEqual(far.nearby,[]);
const overlapping=referenceResult([rows[0],{estrato:"2",polygons:rows[0].polygons}],0.00005,0.00005);
assert.equal(overlapping.status,"AMBIGUO");
assert.equal(overlapping.value,"");
const map=fs.readFileSync(path.join(__dirname,"../map-v01.js"),"utf8");
const api=fs.readFileSync(path.join(__dirname,"../api/exploration.js"),"utf8");
const ux=fs.readFileSync(path.join(__dirname,"../ux-v04.js"),"utf8");
assert.ok(map.includes("referenceStratumRow(data)"));
assert.ok(map.includes('TERRITORIAL_CACHE_KEY="fibrazoTerritorialPointCacheV4"'));
assert.ok(map.includes("QA referencial; no asignado"));
assert.ok(api.includes('VERCEL_ENV==="preview"'));
assert.ok(ux.includes("Solo referencia QA; sin asignación canónica."));
console.log("FO-CHG-062 QA reference exact / nearby / competing / out-of-coverage checks passed");

