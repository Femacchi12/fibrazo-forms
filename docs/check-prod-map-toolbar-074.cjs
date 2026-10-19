const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const code=fs.readFileSync(path.join(__dirname,"../map-v01.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../styles.css"),"utf8");
const sw=fs.readFileSync(path.join(__dirname,"../service-worker.js"),"utf8");
assert.match(html,/<button id="mapQaOptimizeToolbar"[^>]*\shidden\b/);
assert.match(css,/#mapQaOptimizeToolbar\[hidden\]\{display:none!important\}/);
assert.match(sw,/v0\.8\.127-20261019-map-toolbar074/);
assert.match(code,/button.hidden=!isBuc/);
assert.match(code,/const fullKey=layer==="estratos"/);
assert.match(code,/if\(fullKey&&!state.manualRefreshId/);
assert.match(code,/state\.polygonFullLoadingKey===fullKey/);
assert.match(code,/qaDissolve=1/);
const start=code.indexOf("  function updateQaToolbar(){");
const end=code.indexOf("\n  function ",start+3);
assert.ok(start>0&&end>start);
const method=code.slice(start,end);
for(const [city,hidden,disabled] of [
 ["neiva",true,true],["villavicencio",true,true],["ibague",true,true],
 ["cartagena",true,true],["",true,true],["bucaramanga-amb",false,false]
]){
 const btn={hidden:false,disabled:true,classList:{toggle(){}},setAttribute(){},title:"",textContent:""};
 const quick={hidden:false,disabled:false,classList:{toggle(){}},setAttribute(){},title:"",textContent:""};
 const state={qaDissolveEstratos:true};
 const render=new Function("filterValues","isAmbCity","state","$",method+"return updateQaToolbar;");
 render(()=>city?[city]:[],x=>x==="bucaramanga-amb",state,id=>id==="mapQaOptimizeToolbar"?btn:id==="mapQuickEstratoUnion"?quick:null)();
 assert.equal(btn.hidden,hidden,city+" badge");
 assert.equal(btn.disabled,disabled,city+" disabled");
 assert.equal(quick.hidden,hidden,city+" quick");
}
console.log("FO-CHG-074 toolbar visibility / AMB comparator / full-city cache guards PASS");