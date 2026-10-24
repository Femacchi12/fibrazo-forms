// FO-CHG-103: approved fieldwork references, kept separate from geometry facts.
const n=v=>Number(String(v??'').replace(',','.'));
function reference(row,intel=false){
 const at=intel?36:163,lat=n(row[intel?9:17]),lon=n(row[intel?10:18]);
 if(!['FO-CHG-103','FO-CHG-106'].includes(row[at+6])||row[at+8]!==lat+','+lon)return null;
 const layer=(offset)=>({value:String(row[at+offset]||''),method:String(row[at+offset+1]||''),distanceM:row[at+offset+2]===''?null:n(row[at+offset+2])});
 const barrio=layer(0);let estrato=layer(3);
 const manual=String(row[intel?29:64]||'').trim();
 if(/^[1-6]$/.test(manual))estrato={value:manual,method:'OBSERVADO',distanceM:null};
 else if(estrato.method==='OBSERVADO')return null;
 if(barrio.value&&!['DENTRO','CERCANO'].includes(barrio.method))return null;
 if(estrato.value&&(!['DENTRO','CERCANO','OBSERVADO'].includes(estrato.method)||!/^[1-6]$/.test(estrato.value)))return null;
 if(!barrio.value&&!estrato.value)return null;
 return {barrio,estrato,version:row[at+6]};
}
function attach(rows,extra,offset){return rows.map((row,i)=>{const out=[...row];if(extra?.[i]?.length){while(out.length<offset)out.push('');out.splice(offset,extra[i].length,...extra[i]);}return out;});}
function mapLayer(value){return {status:value.method==='CERCANO'?'FUERA':value.method,assigned:value.method==='CERCANO'?'':value.value,nearby:value.method==='CERCANO'?value.value:'',distanceM:value.distanceM};}
function applyPoint(point,row,intel=false){const ref=reference(row,intel);if(ref){if(ref.barrio.value)point.barrio=mapLayer(ref.barrio);if(ref.estrato.value)point.estrato=mapLayer(ref.estrato);point.operationalReference=ref;}return point;}
function fieldStratum(t){return require('../background-territory').stratumValue({estratoStatus:t?.estrato?.status,estrato:t?.estrato?.assigned?.name,estratoNearby:t?.estrato?.nearby?.name,estratoDistanceM:t?.estrato?.distanceM});}
function valuesFor(t,p){
 const b=t?.barrio,bname=b?.status==='DENTRO'?b.assigned?.name:b?.status==='FUERA'?b.nearby?.name:'',value=fieldStratum(t),manual=String(p.data?.estrato_observado||'');
 const observed=/^[1-6]$/.test(manual),distance=l=>l?.distanceM==null?'':l.distanceM;
 return [bname||'',bname?(b.status==='DENTRO'?'DENTRO':'CERCANO'):'SIN_DATOS',bname?distance(b):'',observed?manual:value,observed?'OBSERVADO':value?(t.estrato.status==='DENTRO'?'DENTRO':'CERCANO'):'SIN_DATOS',observed?'':value?distance(t.estrato):'','FO-CHG-106',new Date().toISOString(),n(p.location?.lat)+','+n(p.location?.lng)];
}
module.exports={reference,attach,applyPoint,fieldStratum,valuesFor};
