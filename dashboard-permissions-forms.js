"use strict";
(function(){
  const host=document.getElementById("dashboardRulesHost");
  if(!host||!window.FibrazoDashboardPermissions||!window.firebase?.auth)return;
  let mountedUser="";
  window.firebase.auth().onAuthStateChanged(async user=>{
    const email=String(user?.email||"").trim().toLowerCase();
    if(email!=="eduardo@fibrazo.com"||!user.emailVerified){host.hidden=true;host.replaceChildren();mountedUser="";return;}
    if(mountedUser===email)return;
    mountedUser=email;host.hidden=false;
    const ui=window.FibrazoDashboardPermissions.mount({dashboard:"forms",host,getUser:()=>window.firebase.auth().currentUser});
    await ui.load();
  });
})();
