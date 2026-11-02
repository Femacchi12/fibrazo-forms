// Column G scopes approved identities to municipalities. Legacy rows remain AMB-only.
const defaults=['Bucaramanga','Floridablanca','Girón','Piedecuesta'];
const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const cities=row=>String(row[6]||'').trim()?String(row[6]).split(/[;,|]/).map(x=>x.trim()).filter(Boolean):defaults;
const applies=(row,city)=>/^confirmado/i.test(String(row[3]||''))&&cities(row).some(c=>fold(c)===fold(city));
module.exports={cities,applies};
