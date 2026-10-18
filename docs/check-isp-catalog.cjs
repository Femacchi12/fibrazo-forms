const assert=require("node:assert/strict");
const {competitionOperatorNames,uniqueNames}=require("../api/_isp-catalog");

const row=(name,type="Local / regional",visible="Sí")=>{
  const values=Array(30).fill("");
  values[1]=name;
  values[4]=type;
  values[29]=visible;
  return values;
};

assert.deepEqual(
  competitionOperatorNames([
    row("Asonet Colombia"),
    row("AlpaSurfnet"),
    row("Conextel Colombia"),
    row("Claro"),
    row("Operador oculto","Local / regional","No"),
    row("Operador nacional","Nacional","Sí")
  ]),
  ["Asonet Colombia","AlpaSurfnet","Conextel Colombia"]
);

assert.deepEqual(
  uniqueNames(["AlpaSurfnet"," alpasurfnet ","Ágil Net","Agil Net","Sin ISP"]),
  ["Ágil Net","AlpaSurfnet"]
);

assert.deepEqual(uniqueNames(["Asonet Colombia","ASONET COLOMBIA"]),["Asonet Colombia"]);

console.log("ISP catalog checks passed");
