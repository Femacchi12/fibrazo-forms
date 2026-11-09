"use strict";
// Interfaz compartida: quien integra proporciona la identidad y el nodo anfitrión.
// La autorización de cambios se comprueba de nuevo en el servidor.
(function(root){
  const API="https://fibrazo-forms.vercel.app/api/dashboard-permissions";
  const OWNER="eduardo@fibrazo.com";
  const norm=v=>String(v||"").trim().toLowerCase();
  const validEmail=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const validDomain=s=>/^@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(s);
  const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
  function mount({dashboard,host,getUser}){
    if(!host||typeof getUser!=="function")throw new Error("INVALID_HOST");
    host.replaceChildren();
    let revision=null,busy=false;
    const box=el("section");box.className="dashboard-permissions";
    const title=el("h3","Acceso de lectura al dashboard");
    const intro=el("p","Agrega dominios y correos autorizados para consultar este dashboard.");
    const domainLabel=el("label","Dominios (uno por línea)");
    const domain=el("textarea");domain.rows=3;domain.placeholder="@fibrazo.com";domainLabel.appendChild(domain);
    const emailLabel=el("label","Correos específicos (uno por línea)");
    const emails=el("textarea");emails.rows=3;emails.placeholder="persona@empresa.com";emailLabel.appendChild(emails);
    const save=el("button","Guardar accesos");save.type="button";
    const status=el("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
    box.append(title,intro,domainLabel,emailLabel,save,status);host.appendChild(box);
    const words=t=>[...new Set(t.split(/[\n,;]+/).map(norm).filter(Boolean))];
    async function request(method,body){
      const user=getUser();
      if(!user||norm(user.email)!==OWNER||user.emailVerified!==true)throw new Error("ADMIN_REQUIRED");
      const token=await user.getIdToken();
      const response=await fetch(API+(method==="GET"?"?dashboard="+encodeURIComponent(dashboard):""),{
        method,headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},
        ...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"REQUEST_FAILED");
      if(!data.admin)throw new Error("ADMIN_REQUIRED");
      return data;
    }
    async function load(){
      try{status.textContent="Cargando accesos…";save.disabled=true;
        const result=await request("GET");revision=result.revision;
        domain.value=result.rules.filter(x=>x.kind==="domain").map(x=>x.subject).join("\n");
        emails.value=result.rules.filter(x=>x.kind==="email").map(x=>x.subject).join("\n");
        status.textContent="";
      }catch(e){status.textContent="No se pudieron cargar los permisos. Verifica tu sesión y vuelve a intentar.";revision=null;}
      finally{save.disabled=revision===null;}
    }
    save.addEventListener("click",async()=>{
      if(busy||revision===null)return;
      const ds=words(domain.value).map(x=>x.startsWith("@")?x:"@"+x), es=words(emails.value);
      if(ds.some(x=>!validDomain(x))||es.some(x=>!validEmail(x))){status.textContent="Revisa los dominios y correos ingresados.";return;}
      const rules=[...ds.map(subject=>({kind:"domain",subject})),...es.map(subject=>({kind:"email",subject}))];
      try{busy=true;save.disabled=true;status.textContent="Guardando…";
        const data=await request("PUT",{dashboard,rules,revision});revision=data.revision;
        status.textContent="Accesos guardados.";
      }catch(e){status.textContent=e.message==="STALE_POLICY"?"Los permisos cambiaron. Vuelve a cargar antes de guardar.":"No se pudieron guardar los permisos.";
        if(e.message==="STALE_POLICY")revision=null;
      }finally{busy=false;save.disabled=revision===null;}
    });
    return {load};
  }
  root.FibrazoDashboardPermissions={mount};
})(window);
