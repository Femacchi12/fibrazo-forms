"use strict";
(function(){
  let button=null,section=null,current=null,controller=null;
  const base="https://fibrazo-forms.vercel.app";
  function remove(){button?.remove();section?.remove();button=null;section=null;current=null;controller=null;}
  async function update(event){
    remove();
    const detail=event.detail||{},user=detail.user,dashboard=detail.dashboard;
    if(String(user?.email||"").trim().toLowerCase()!=="eduardo@fibrazo.com"||user.emailVerified!==true)return;
    current=user;
    const target=document.querySelector(".view-switch.fz-social-nav")||document.querySelector(".analysis-tabs")||document.querySelector(".header-account")||document.querySelector(".auth-session");
    if(!target)return;
    button=document.createElement("button");button.type="button";button.textContent="Administrar";
    button.className="dashboard-access-admin";button.setAttribute("aria-expanded","false");
    section=document.createElement("section");section.hidden=true;
    section.id="dashboardAccessSection";section.setAttribute("aria-label","Administrar accesos");
    target.appendChild(button);target.insertAdjacentElement("afterend",section);
    button.addEventListener("click",async()=>{
      section.hidden=!section.hidden;button.setAttribute("aria-expanded",String(!section.hidden));
      if(!section.hidden&&!controller){
        controller=window.FibrazoDashboardPermissions.mount({dashboard,host:section,getUser:()=>current});
        await controller.load();
      }
      if(!section.hidden)section.scrollIntoView({behavior:"smooth",block:"start"});
    });
  }
  window.addEventListener("fibrazo-dashboard-auth",update);
  window.addEventListener("fibrazo-dashboard-signout",remove);
})();
