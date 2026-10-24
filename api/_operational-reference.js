// FO-CHG-103: approved fieldwork references, kept separate from geometry facts.
const n=v=>Number(String(v??'').replace(',','.'));
function reference(row,intel=false){
 const at=intel?36:163,lat=n(row[intel?9:17]),lon=n(row[intel?10:18]);
 if(row[at+6]!=='FO-CHG-103'||row[at+8]!==lat+','+lon)return null;
 const layer=(offset)=>({value:String(row[at+offset]||''),method:String(row[at+offset+1]||''),distanceM:row[at+offset+2]===''?null:n(row[at+offset+2])});
 const barrio=layer(0);let estrato=layer(3);
 const manual=String(row[intel?29:64]||'').trim();
 if(/^[1-6]$/.test(manual))estrato={value:manual,method:'OBSERVADO',distanceM:null};
 else if(estrato.method==='OBSERVADO')return null;
 if(!['DENTRO','CERCANO'].includes(barrio.method)||!['DENTRO','CERCANO','OBSERVADO'].includes(estrato.method)||!barrio.value||!/^[1-6]$/.test(estrato.value))return null;
 return {barrio,estrato,version:row[at+6]};
}
function attach(rows,extra,offset){return rows.map((row,i)=>{const out=[...row];if(extra?.[i]?.length){while(out.length<offset)out.push('');out.splice(offset,extra[i].length,...extra[i]);}return out;});}
function mapLayer(value){return {status:value.method==='CERCANO'?'FUERA':value.method,assigned:value.method==='CERCANO'?'':value.value,nearby:value.method==='CERCANO'?value.value:'',distanceM:value.distanceM};}
function applyPoint(point,row,intel=false){const ref=reference(row,intel);if(ref){point.barrio=mapLayer(ref.barrio);point.estrato=mapLayer(ref.estrato);point.operationalReference=ref;}return point;}
module.exports={reference,attach,applyPoint};
