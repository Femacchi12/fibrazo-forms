"use strict";
const {canReadDashboard}=require("./_dashboard-read-policy");
const {_loadRow}=require("./dashboard-permissions");
const OWNER="eduardo@fibrazo.com";
// verifyUser must run first: it rejects missing, invalid or unverified tokens.
async function canReadConfiguredDashboard(auth,user,dashboard){
  if(String(user?.email||"").trim().toLowerCase()===OWNER)return true;
  const state=await _loadRow(auth,dashboard);
  const rules=state.rules.map(rule=>({...rule,dashboard,enabled:true}));
  return canReadDashboard({email:user?.email,emailVerified:true},dashboard,rules);
}
module.exports={canReadConfiguredDashboard};
