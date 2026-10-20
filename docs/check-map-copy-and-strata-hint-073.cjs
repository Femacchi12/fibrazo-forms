// FO-CHG-073: map click copied locally (sheet stops bubbling) and form explains near-vs-out.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const map=fs.readFileSync(path.join(__dirname,"../map-v01.js"),"utf8");
const form=fs.readFileSync(path.join(__dirname,"../ux-v04.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert.ok(map.includes("sheet.addEventListener(\"click\",event=>{\n      handleMapCoordinateCopy(event);"));
assert.ok(map.includes('data-map-copy-point data-lat="'+String.fromCharCode(39)+'+Number(lat)+'));
assert.ok(map.includes('document.addEventListener("click",handleMapCoordinateCopy)'));
assert.ok(css.includes("FO-CHG-073 · Compact Copy and Go"));
assert.match(html,/src="\/map-v01\.js\?v=[^"]+"/);
assert.ok(form.includes("Más de 25 m: no se sugiere automáticamente; referencia no canónica."));
assert.ok(form.includes("No se encontró polígono QA de estrato a menos de 5 km"));
assert.ok(form.includes("const qaNearby=")); // 25m rule preserved
async function run(){
 let copied=null,noticeText="",count=0,status="",fallback;
 const navigator={clipboard:{writeText:async v=>{copied=v;count++;}}};
 const document={
   createElement:()=>({style:{},setAttribute(){},remove(){},select(){},focus(){},textContent:""}),
   body:{appendChild(){},},
   execCommand:()=>false
 };
 const src=map.slice(map.indexOf("  async function copyCoordinates("),map.indexOf("  function startFormAtCoordinate("));
 const make=new Function("navigator","document","mapStatus","setTimeout",src+"return {copyCoordinates,handleMapCoordinateCopy};");
 const f=make(navigator,document,(v,t)=>{status=t},()=>{});
 assert.equal(await f.copyCoordinates(4.152076,-73.619264),true);
 assert.equal(copied,"4.1520760, -73.6192640");
 let appended=null,prevented=false;
 const parent={querySelector(){return null},appendChild(el){appended=el}};
 const btn={dataset:{lat:"2.919908",lng:"-75.264103"},parentElement:parent};
 assert.equal(f.handleMapCoordinateCopy({target:{closest:()=>btn},preventDefault(){prevented=true}}),true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(copied,"2.9199080, -75.2641030");
 assert.equal(prevented,true);assert.equal(appended?.textContent,"✓ Copiado");
 assert.equal(count,2);
 assert.equal(f.handleMapCoordinateCopy({target:{closest:()=>null},preventDefault(){throw Error("No copy")}}),false);
}
run().then(()=>console.log("FO-CHG-073 copy/feedback and advisory-only strata UX PASS")).catch(e=>{console.error(e);process.exitCode=1;});
