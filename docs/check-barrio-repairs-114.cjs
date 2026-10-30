// Dataset regression: run proposed/recorded geometries through the actual engine.
const assert=require('node:assert/strict'),data=require('./geo-audit-114-repairs.json');
const {_internals:i}=require('../api/_territorial');
let tested=0,changed=0,maxBoundaryDifferenceM=0;
for(const row of data.rows.filter(r=>r.eligible)){
  assert(row.valid&&row.roundedValid&&!row.bboxChange);
  const before=i.parseWkt(row.oldWkt),after=i.parseWkt(row.newWkt);
  assert(before.length&&after.length);
  const coords=before.flat(2),xs=coords.map(p=>p[0]),ys=coords.map(p=>p[1]);
  const bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],points=[];
  for(let x=0;x<25;x++)for(let y=0;y<25;y++)points.push([bbox[0]+(x+.37)/25*(bbox[2]-bbox[0]),bbox[1]+(y+.41)/25*(bbox[3]-bbox[1])]);
  for(const [x,y]of coords)for(const dx of [-.00001,.00001])for(const dy of [-.00001,.00001])points.push([x+dx,y+dy]);
  for(const [x,y]of points){
    tested++;
    if(i.inGeometry(x,y,before)!==i.inGeometry(x,y,after)){
      changed++;
      const distance=Math.min(i.geometryDistance(x,y,before),i.geometryDistance(x,y,after));
      maxBoundaryDifferenceM=Math.max(distance,maxBoundaryDifferenceM);
      // The engine includes epsilon-wide segment boundaries. Repair may remove a
      // collapsed spur; no sampled classification may change >0.5 m from an edge.
      assert(distance<=.5,`${row.city}:${row.row} classification changed ${distance} m from boundary`);
    }
  }
}
assert.equal(data.rows.filter(r=>r.eligible).length,54);
assert.equal(data.rows.filter(r=>!r.eligible).length,2);
console.log('GEO114 PASS',JSON.stringify({tested,changed,maxBoundaryDifferenceM}));
