// FO-CHG-063 · QA provisional selection cannot leak into canonical submissions.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {suggest}=require("../qa-stratum-policy.js");
assert.deepEqual(suggest({status:"FUERA",canonical:false,nearby:[{estrato:"1",distanceM:1.8}]}),{
  value:"1",match:"QA_CERCANO",ambiguous:false,candidates:[{estrato:"1",distanceM:1.8}]
});
assert.deepEqual(suggest({status:"FUERA",canonical:false,nearby:[{estrato:"2",distanceM:4.9},{estrato:"1",distanceM:3.5}]}),{
  value:"1",match:"QA_CERCANO",ambiguous:true,candidates:[{estrato:"1",distanceM:3.5},{estrato:"2",distanceM:4.9}]
});
assert.equal(suggest({status:"DENTRO",canonical:false,value:"2"}).value,"2");
assert.equal(suggest({status:"DENTRO",canonical:true,value:"2"}),null);
assert.equal(suggest({status:"FUERA",canonical:false,nearby:[{estrato:"3",distanceM:30}]}),null);
assert.equal(suggest({status:"AMBIGUO",canonical:false}),null);
const ux=fs.readFileSync(path.join(__dirname,"../ux-v04.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
assert.ok(ux.includes('const allowed=mayIdentifyTest()&&state.isTest&&isExplorationForm()&&current;'));
assert.ok(ux.includes('if(!payload.isTest&&String(payload.location?.estratoStatus||"").startsWith("QA_"))'));
assert.ok(ux.includes('control.dataset.qaSession="1"'));
assert.ok(ux.includes('delete control.dataset.qaSession;'));
assert.ok(html.includes('/qa-stratum-policy.js?v='));
assert.ok(html.indexOf('/qa-stratum-policy.js?v=')<html.indexOf('/ux-v04.js?v='));
console.log("FO-CHG-063: QA suggestion/persistence guards passed");
