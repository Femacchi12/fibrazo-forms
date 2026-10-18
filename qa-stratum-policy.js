// FO-CHG-063 | QA-only provisional strata selector (no canonical claims).
// Pure decision logic used by the test-only form interface.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.FIBRAZO_QA_STRATUM_POLICY=api;
})(typeof window!=="undefined"?window:null,function(){
  const valid=value=>/^[1-6]$/.test(String(value||"").trim());
  function suggest(reference){
    if(!reference||reference.canonical!==false)return null;
    const status=String(reference.status||"");
    if(status==="DENTRO"&&valid(reference.value)){
      return {value:String(reference.value),match:"QA_DENTRO",ambiguous:false,candidates:[{estrato:String(reference.value),distanceM:0}]};
    }
    if(status!=="FUERA")return null;
    const candidates=(Array.isArray(reference.nearby)?reference.nearby:[])
      .map(item=>({estrato:String(item.estrato||""),distanceM:Number(item.distanceM)}))
      .filter(item=>valid(item.estrato)&&Number.isFinite(item.distanceM)&&item.distanceM>=0&&item.distanceM<=25)
      .sort((a,b)=>a.distanceM-b.distanceM||a.estrato.localeCompare(b.estrato));
    if(!candidates.length)return null;
    return {value:candidates[0].estrato,match:"QA_CERCANO",ambiguous:candidates.length>1,candidates};
  }
  return {suggest};
});
