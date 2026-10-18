// Hlavní logika aplikace Cyklo databáze.
const STORAGE_KEY='cykloDatabaze_v4';
function enrich(x){const t=String(x.title||'').toUpperCase();return {...x,dpnk:x.dpnk!==undefined?!!x.dpnk:(t.includes('DPNK')||t.includes('ZPNK')),bike_type:x.bike_type||(Number(x.elevation_m)===0?'Rotoped':'PELLS')};}
let DATA;try{const saved=localStorage.getItem(STORAGE_KEY);DATA=saved?JSON.parse(saved).map(enrich):INITIAL.map(enrich)}catch(e){DATA=INITIAL.map(enrich)}
let sortKey='date',sortDir=-1,current=[],activeYear='2026';const $=id=>document.getElementById(id);
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));scheduleCloudSave()}catch(e){alert('Nepodařilo se uložit změny do prohlížeče. Doporučuji exportovat databázi do CSV.')}}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtTime(s){s=Number(s)||0;let h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`}
function fmtLongTime(s){let h=Math.floor(s/3600),m=Math.floor(s%3600/60);return (h?`${h} h `:'')+`${m} min`}
function timeToSeconds(v){if(!v)return null;let p=v.trim().split(':').map(Number);if(p.some(n=>!Number.isFinite(n)))return null;if(p.length===2)return p[0]*60+p[1];if(p.length===3)return p[0]*3600+p[1]*60+p[2];return null}
function compare(v,op,t){if(op==='eq')return v===t;if(op==='gt')return v>t;if(op==='gte')return v>=t;if(op==='lt')return v<t;if(op==='lte')return v<=t;return true}
function matches(x){let q=$('q').value.trim().toLowerCase(),fr=$('from').value,to=$('to').value,min=parseFloat($('minKm').value||0),eff=$('eff').value,fd=$('filterDpnk').value,fb=$('filterBike').value;return (!q||String(x.title||'').toLowerCase().includes(q))&&(!fr||x.date>=fr)&&(!to||x.date<=to)&&Number(x.distance_km)>=min&&(!eff||x.relative_effort!==null&&x.relative_effort!==undefined)&&(!fd||String(Number(!!x.dpnk))===fd)&&(!fb||x.bike_type===fb)}
function refreshYearSummary(){const a=current;const sumBike=bike=>a.filter(x=>x.bike_type===bike).reduce((s,x)=>s+Number(x.distance_km||0),0);$('statPellsKm').textContent=sumBike('PELLS').toLocaleString('cs-CZ',{maximumFractionDigits:1});$('statRotopedKm').textContent=sumBike('Rotoped').toLocaleString('cs-CZ',{maximumFractionDigits:1});$('statElevation').textContent=a.reduce((s,x)=>s+Number(x.elevation_m||0),0).toLocaleString('cs-CZ');$('statRides').textContent=a.length.toLocaleString('cs-CZ')}
function updateYearButtons(){for(const [id,yr] of [['year2025','2025'],['year2026','2026']]){const active=$('from').value===`${yr}-01-01`&&$('to').value===`${yr}-12-31`;$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active))}}
function render(){current=DATA.filter(matches);current.sort((a,b)=>{let A=a[sortKey],B=b[sortKey];if(sortKey==='dpnk'){A=Number(!!A);B=Number(!!B)}if(A===null||A===undefined)A=-Infinity;if(B===null||B===undefined)B=-Infinity;return (A>B?1:A<B?-1:0)*sortDir});
 $('body').innerHTML=current.map(x=>`<tr><td class="row-check">${current.indexOf(x)+1}</td><td>${esc(x.date.split('-').reverse().join('. '))}</td><td>${esc(x.title)}</td><td>${esc(x.duration)}</td><td>${Number(x.distance_km).toLocaleString('cs-CZ',{minimumFractionDigits:2,maximumFractionDigits:2})} km</td><td>${Number(x.elevation_m)||0} m</td><td>${x.relative_effort??''}</td><td class="row-check"><input class="dpnk-check" type="checkbox" data-dpnk="${x.id}" ${x.dpnk?'checked':''} aria-label="Cesta do práce DPNK"></td><td><select class="bike-select" data-bike="${x.id}"><option value="PELLS" ${x.bike_type==='PELLS'?'selected':''}>PELLS</option><option value="Rotoped" ${x.bike_type==='Rotoped'?'selected':''}>Rotoped</option></select></td></tr>`).join('')||'<tr><td colspan="9" class="empty">Žádné záznamy neodpovídají filtrům.</td></tr>';
 refreshYearSummary();updateYearButtons();updateGoalProgress();renderMonthlyOverview();if(!$('visualizationModal').hidden)drawVisualization();}
function setYear(y){activeYear=y;$('from').value=`${y}-01-01`;$('to').value=`${y}-12-31`;loadGoalInputs();render()}
const GOALS_KEY='cykloDatabaze_yearGoals_v1';
function readGoals(){try{return JSON.parse(localStorage.getItem(GOALS_KEY)||'{}')}catch(e){return {}}}
function goalsForYear(){const all=readGoals();const g=all[activeYear]||{};return {pellsKm:Number(g.pellsKm??g.km??0),rotopedKm:Number(g.rotopedKm||0),elevation:Number(g.elevation||0),dpnk:Number(g.dpnk||0)}}
function loadGoalInputs(){const g=goalsForYear();$('goalPellsKm').value=g.pellsKm||'';$('goalRotopedKm').value=g.rotopedKm||'';$('goalElevation').value=g.elevation||'';$('goalDpnk').value=g.dpnk||'';$('profileYear').textContent=activeYear;$('goalsSaveYear').textContent=activeYear;$('goalsStatus').textContent=''}
function goalMetric(done,target,unit,decimals=0){const safeDone=Number(done)||0,safeTarget=Number(target)||0;return {label:`${safeDone.toLocaleString('cs-CZ',{maximumFractionDigits:decimals})} / ${safeTarget.toLocaleString('cs-CZ',{maximumFractionDigits:decimals})} ${unit}`,remaining:Math.max(0,safeTarget-safeDone),percent:safeTarget>0?Math.min(100,safeDone/safeTarget*100):0,target:safeTarget,done:safeDone}}
function paintGoal(key,metric,unit,decimals=0){$('done'+key).textContent=metric.label;$('bar'+key).style.width=metric.percent+'%';$('left'+key).textContent=metric.target<=0?'Nastav si roční cíl':metric.remaining>0?`Zbývá ${metric.remaining.toLocaleString('cs-CZ',{maximumFractionDigits:decimals})} ${unit}`:`Cíl splněn 🎉`}
function updateGoalProgress(){if(!$('goalPellsKm'))return;const g=goalsForYear(),a=DATA.filter(x=>String(x.date||'').startsWith(activeYear));const pellsKm=a.filter(x=>x.bike_type==='PELLS').reduce((s,x)=>s+Number(x.distance_km||0),0),rotopedKm=a.filter(x=>x.bike_type==='Rotoped').reduce((s,x)=>s+Number(x.distance_km||0),0),elev=a.reduce((s,x)=>s+Number(x.elevation_m||0),0),dpnk=a.filter(x=>x.dpnk).length;paintGoal('PellsKm',goalMetric(pellsKm,g.pellsKm,'km',2),'km',2);paintGoal('RotopedKm',goalMetric(rotopedKm,g.rotopedKm,'km',2),'km',2);paintGoal('Elevation',goalMetric(elev,g.elevation,'m'),'m');paintGoal('Dpnk',goalMetric(dpnk,g.dpnk,'jízd'),'jízd')}
// Panely jsou ve výchozím stavu skryté; otevírají se pouze příslušnou ikonou.
$('syncPanel').open=false;
$('syncToggleButton').addEventListener('click',()=>{const panel=$('syncPanel');panel.open=!panel.open;$('syncToggleButton').setAttribute('aria-expanded',String(panel.open));if(panel.open)panel.scrollIntoView({behavior:'smooth',block:'nearest'})});
$('exportToggleButton').addEventListener('click',()=>{const panel=$('exportMenu');panel.hidden=!panel.hidden;$('exportToggleButton').setAttribute('aria-expanded',String(!panel.hidden));});
// + opens an explicit menu; selecting an action then opens the form or file picker.
const addMenu=$('addRideMenu');
function setAddMenu(open){addMenu.hidden=!open;$('addRideButton').setAttribute('aria-expanded',String(open));}
// Assign one handler (not addEventListener) so an old duplicate handler cannot immediately close it.
$('addRideButton').onclick=(event)=>{event.preventDefault();event.stopPropagation();setAddMenu(addMenu.hidden);};
document.addEventListener('click',event=>{if(!event.target.closest('.add-action-wrap'))setAddMenu(false)});
document.addEventListener('keydown',event=>{if(event.key==='Escape')setAddMenu(false)});
$('closeAddMenu').onclick=()=>setAddMenu(false);
$('addManualOption').onclick=()=>{setAddMenu(false);toggleAddPanel(true);$('newDate').focus();};
$('addImportOption').onclick=()=>{setAddMenu(false);toggleAddPanel(true);$('stravaCsv').click();};
$('closeAddPanel').onclick=()=>toggleAddPanel(false);
$('profileButton').addEventListener('click',()=>{const panel=$('profilePanel');panel.hidden=!panel.hidden;$('profileButton').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){loadGoalInputs();panel.scrollIntoView({behavior:'smooth',block:'start'})}});
$('goalsForm').addEventListener('submit',e=>{e.preventDefault();const vals={pellsKm:Math.max(0,Number($('goalPellsKm').value)||0),rotopedKm:Math.max(0,Number($('goalRotopedKm').value)||0),elevation:Math.max(0,Number($('goalElevation').value)||0),dpnk:Math.max(0,Math.floor(Number($('goalDpnk').value)||0))};const all=readGoals();all[activeYear]=vals;try{localStorage.setItem(GOALS_KEY,JSON.stringify(all));$('goalsStatus').textContent=`Cíle pro ${activeYear} byly uloženy v tomto prohlížeči.`;updateGoalProgress()}catch(err){alert('Cíle se nepodařilo uložit do prohlížeče.')}});
$('year2025').onclick=()=>setYear('2025');$('year2026').onclick=()=>setYear('2026');$('allDates').onclick=()=>{$('from').value='';$('to').value='';render()};
function toggleAddPanel(forceOpen){const panel=$('addRidePanel');const open=typeof forceOpen==='boolean'?forceOpen:panel.hidden;panel.hidden=!open;$('addRideButton').setAttribute('aria-expanded',String(open));$('addRideButton').title=open?'Zavřít přidání jízdy a import':'Přidat jízdu nebo importovat CSV';if(open){panel.scrollIntoView({behavior:'smooth',block:'start'});$('newDate').value=$('newDate').value||new Date().toISOString().slice(0,10);}}

['q','from','to','minKm','eff','filterDpnk','filterBike'].forEach(id=>$(id).addEventListener('input',render));['eff','filterDpnk','filterBike'].forEach(id=>$(id).addEventListener('change',render));
$('reset').onclick=()=>{['q','from','to','minKm'].forEach(id=>$(id).value='');['eff','filterDpnk','filterBike'].forEach(id=>$(id).selectedIndex=0);render()};
document.querySelector('thead').addEventListener('click',e=>{let th=e.target.closest('th[data-k]');if(!th)return;let k=th.dataset.k;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1}render()});
$('body').addEventListener('change',e=>{const t=e.target;if(t.dataset.dpnk!==undefined){let x=DATA.find(a=>String(a.id)===String(t.dataset.dpnk));if(x){x.dpnk=t.checked;save();render()}return}if(t.dataset.bike!==undefined){let x=DATA.find(a=>String(a.id)===String(t.dataset.bike));if(x){x.bike_type=t.value;save();render()}}});
function parseDuration(v){let s=timeToSeconds(v);if(s===null||s<0)throw Error('Čas zadej například 45:30 nebo 1:05:30.');return s}
// Typ kola se vybírá ručně; 0 m samo o sobě neznamená rotoped.

$('newTitle').addEventListener('input',()=>{let t=$('newTitle').value.toUpperCase();$('newDpnk').checked=t.includes('DPNK')||t.includes('ZPNK')});
$('newForm').addEventListener('submit',e=>{e.preventDefault();try{let date=$('newDate').value,title=$('newTitle').value.trim(),durationSeconds=parseDuration($('newDuration').value),distance=Number($('newDistance').value),elevation=Number($('newElevation').value),effort=$('newEffort').value===''?null:Number($('newEffort').value);if(!date||!title||!Number.isFinite(distance)||distance<0||!Number.isFinite(elevation)||elevation<0)throw Error('Zkontroluj datum, název, vzdálenost a nastoupané metry.');let id=DATA.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;let row={id,date,title,duration:fmtTime(durationSeconds),duration_seconds:durationSeconds,distance_km:distance,elevation_m:elevation,relative_effort:effort,dpnk:$('newDpnk').checked,bike_type:$('newBike').value};DATA.push(row);save();$('newForm').reset();$('newElevation').value='0';$('newBike').value='Rotoped';$('newDpnk').checked=false;activeYear=date.slice(0,4);$('addRidePanel').hidden=true;$('addRideButton').setAttribute('aria-expanded','false');render();}catch(err){alert(err.message||'Záznam se nepodařilo přidat.')}});
// Měsíční přehled a samostatná vizualizace v modálním okně.
const MONTHS=['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
function getMonthlyRows(from,to,bike,dpnkMode){return DATA.filter(x=>(!from||x.date>=from)&&(!to||x.date<=to)&&(!bike||x.bike_type===bike)&&(dpnkMode!=='dpnk'||!!x.dpnk));}
function renderMonthlyOverview(){
 const el=$('monthlyBars');if(!el)return;
 const rows=DATA.filter(matches),from=$('from').value,to=$('to').value;
 const yearLabel=$('monthlyYearLabel');
 if(yearLabel){const y=from.slice(0,4);const year=(from&&to&&from===y+'-01-01'&&to===y+'-12-31')?y:'';yearLabel.textContent=year?'ROK '+year:'';yearLabel.hidden=!year;}
 const allBikes=!$('filterBike').value,pells=Array(12).fill(0),rotoped=Array(12).fill(0),sums=Array(12).fill(0);
 rows.forEach(x=>{const m=Number(String(x.date).slice(5,7))-1;if(m<0||m>11)return;const km=Number(x.distance_km)||0;sums[m]+=km;if(x.bike_type==='PELLS')pells[m]+=km;if(x.bike_type==='Rotoped')rotoped[m]+=km;});
 const max=Math.max(1,...sums);
 el.innerHTML=sums.map((v,i)=>{const pHeight=pells[i]/max*100,rHeight=rotoped[i]/max*100;const title=`${MONTHS[i]}: PELLS ${pells[i].toLocaleString('cs-CZ',{maximumFractionDigits:1})} km, rotoped ${rotoped[i].toLocaleString('cs-CZ',{maximumFractionDigits:1})} km`;const bar=allBikes?`<div class="month-bar-fill month-bar-pells" style="height:${pHeight}%"></div><div class="month-bar-fill month-bar-rotoped" style="height:${rHeight}%"></div>`:`<div class="month-bar-fill ${$('filterBike').value==='Rotoped'?'month-bar-rotoped':'month-bar-pells'}" style="height:${Math.max(v>0?3:0,v/max*100)}%"></div>`;return `<div class="month-bar-item" title="${title}"><div class="month-bar-track">${bar}</div><strong>${v.toLocaleString('cs-CZ',{maximumFractionDigits:0})}</strong><span>${MONTHS[i]}</span></div>`;}).join('');
}
function openVisualization(){const modal=$('visualizationModal');modal.hidden=false;$('vizFrom').value=$('from').value||'2025-01-01';$('vizTo').value=$('to').value||new Date().toISOString().slice(0,10);$('vizBike').value=$('filterBike').value;$('vizDpnk').value=$('filterDpnk').value==='1'?'dpnk':'all';drawVisualization();$('closeVisualization').focus();}
function drawVisualization(){const canvas=$('rideChart');if(!canvas||$('visualizationModal').hidden)return;const ctx=canvas.getContext('2d');const from=$('vizFrom').value,to=$('vizTo').value,bike=$('vizBike').value,mode=$('vizDpnk').value;const rows=getMonthlyRows(from,to,bike,'all');const years=[];rows.forEach(r=>{const y=String(r.date).slice(0,4);if(y&&!years.includes(y))years.push(y)});years.sort();const labels=[];years.forEach(y=>MONTHS.forEach((m,i)=>labels.push({label:m,year:y,month:i})));if(!labels.length){const y=(from||to||new Date().toISOString().slice(0,10)).slice(0,4);MONTHS.forEach((m,i)=>labels.push({label:m,year:y,month:i}));}
 let series;
 // Pokud je vybráno „Vše“ u typu kola, zobraz PELLS a rotoped jako barevně odlišené části sloupců.
 // PELLS používá dosavadní zelenou, rotoped zlatou. Filtr DPNK zůstává respektován.
 if(!bike && mode!=='split'){
   series=[
     {key:'pells',label:'PELLS',test:r=>r.bike_type==='PELLS'&&(mode!=='dpnk'||!!r.dpnk),color:'#176b50'},
     {key:'rotoped',label:'Rotoped',test:r=>r.bike_type==='Rotoped'&&(mode!=='dpnk'||!!r.dpnk),color:'#f4c542'}
   ];
 } else if(mode==='split'){
   series=[
     {key:'other',label:'Ostatní jízdy',test:r=>!r.dpnk,color:'#79b8a0'},
     {key:'dpnk',label:'DPNK',test:r=>!!r.dpnk,color:'#176b50'}
   ];
 } else {
   series=[{key:'km',label:mode==='dpnk'?'DPNK':'Kilometry',test:r=>mode!=='dpnk'||!!r.dpnk,color:bike==='Rotoped'?'#f4c542':'#176b50'}];
 }
 const vals=labels.map(l=>series.map(s=>rows.filter(r=>String(r.date).slice(0,4)===l.year&&Number(String(r.date).slice(5,7))===l.month+1&&s.test(r)).reduce((sum,r)=>sum+(Number(r.distance_km)||0),0)));const max=Math.max(1,...vals.map(a=>a.reduce((x,y)=>x+y,0)));const W=1200,H=560;canvas.width=W;canvas.height=H;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);const left=70,right=25,top=35,bottom=85,plotH=H-top-bottom,plotW=W-left-right;ctx.font='16px system-ui';ctx.fillStyle='#24332d';ctx.textAlign='left';ctx.fillText('Ujeté kilometry po měsících',left,22);
 for(let t=0;t<=4;t++){const val=max*t/4,y=top+plotH-(plotH*t/4);ctx.strokeStyle='#e4ebe7';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(W-right,y);ctx.stroke();ctx.fillStyle='#63716a';ctx.textAlign='right';ctx.fillText(val.toLocaleString('cs-CZ',{maximumFractionDigits:0}),left-10,y+5)}
 const slot=plotW/labels.length,bw=Math.min(30,slot*.64);labels.forEach((l,i)=>{let yBase=top+plotH;vals[i].forEach((v,j)=>{const h=v/max*plotH;ctx.fillStyle=series[j].color;ctx.fillRect(left+i*slot+(slot-bw)/2,yBase-h,bw,h);yBase-=h});ctx.fillStyle='#35423c';ctx.textAlign='center';ctx.font='12px system-ui';ctx.fillText(l.label,left+i*slot+slot/2,H-bottom+22);if(i===0||labels[i-1].year!==l.year){ctx.font='bold 13px system-ui';ctx.fillText(l.year,left+i*slot+slot/2,H-bottom+48)}});
 $('chartLegend').innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');}
$('visualizeButton').addEventListener('click',openVisualization);$('visualizeFromOverview').addEventListener('click',openVisualization);$('vizApply').addEventListener('click',drawVisualization);['vizFrom','vizTo','vizBike','vizDpnk'].forEach(id=>$(id).addEventListener('change',drawVisualization));
$('closeVisualization').addEventListener('click',()=>{$('visualizationModal').hidden=true});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('visualizationModal').hidden)$('visualizationModal').hidden=true});
$('copyChart').addEventListener('click',async()=>{const status=$('copyChartStatus');try{const canvas=$('rideChart');if(!navigator.clipboard||!window.ClipboardItem||!canvas.toBlob)throw Error('Tento prohlížeč nepodporuje kopírování obrázků. Otevři aplikaci přes HTTPS v Chrome nebo Edge.');const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);status.textContent='Graf je zkopírován jako obrázek. Můžeš ho vložit pomocí Ctrl+V.';}catch(e){status.textContent=e.message||'Kopírování se nepodařilo. Povol schránku pro tuto stránku.';}});

function exportCSV(rows,filename){let head=['id','date','title','duration','duration_seconds','distance_km','elevation_m','relative_effort','dpnk','bike_type'];let escv=v=>'"'+String(v??'').replaceAll('"','""')+'"';let txt='\ufeff'+head.join(';')+'\r\n'+rows.map(r=>head.map(k=>escv(k==='dpnk'?(r.dpnk?1:0):r[k])).join(';')).join('\r\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('csv').onclick=()=>{exportCSV(current,'filtrovane_aktivity.csv');$('exportMenu').hidden=true;$('exportToggleButton').setAttribute('aria-expanded','false')};$('allCsv').onclick=()=>{exportCSV(DATA,'cyklo_databaze_zaloha.csv');$('exportMenu').hidden=true;$('exportToggleButton').setAttribute('aria-expanded','false')};

// Import Strava CSV (export from our Python importer). Does not overwrite existing manual fields.
function parseCsvLine(line,delimiter=','){const out=[];let v='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&q&&line[i+1]==='"'){v+='"';i++}else if(c==='"')q=!q;else if(c===delimiter&&!q){out.push(v);v=''}else v+=c}out.push(v);return out}
$('chooseStravaCsv').addEventListener('click',()=>{$('stravaCsv').click()});
async function importStravaCsvText(text,sourceLabel='CSV'){
 const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)throw Error('CSV je prázdné.');
 const delim=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
 const heads=parseCsvLine(lines[0],delim).map(x=>x.trim());const rows=lines.slice(1).map(line=>Object.fromEntries(parseCsvLine(line,delim).map((v,i)=>[heads[i],v])));
 const existingIds=new Set(DATA.map(x=>String(x.strava_id||'')).filter(Boolean));let added=0,matched=0,skipped=0;
 for(const r of rows){const type=String(r.sport_type||r.type||'').toLowerCase();if(!/^(ride|virtualride|ebikeride|mountainbikeride|gravelride|velomobile)$/.test(type)){skipped++;continue}
 const date=String(r.date_local||r.start_date_local||'').slice(0,10);if(!/^20\d\d-\d\d-\d\d$/.test(date)){skipped++;continue}const km=Number(r.distance_km||0);if(!Number.isFinite(km)||km<=0){skipped++;continue}
 const sid=String(r.strava_id||'');if(sid&&existingIds.has(sid)){skipped++;continue}
 const existing=DATA.find(x=>x.date===date&&Math.abs(Number(x.distance_km)-km)<0.025);if(existing){if(sid)existing.strava_id=sid;matched++;continue}
 const title=String(r.name||'Jízda ze Stravy'),elev=Number(r.elevation_m||0),dur=Number(r.moving_time_seconds||0),id=DATA.reduce((m,x)=>Math.max(m,Number(x.id)||0),0)+1;
 DATA.push({id,date,title,duration:fmtTime(dur),duration_seconds:dur,distance_km:km,elevation_m:elev,relative_effort:null,dpnk:/DPNK|ZPNK/i.test(title),bike_type:(String(r.trainer).toLowerCase()==='true'||type==='virtualride')?'Rotoped':'PELLS',strava_id:sid});if(sid)existingIds.add(sid);added++}
 if(added||matched){save();render()}return {added,matched,skipped};
}

$('stravaCsv').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const result=await importStravaCsvText(await file.text(),file.name);alert(`Import dokončen. Přidáno ${result.added} jízd, propojeno s existujícími záznamy ${result.matched}, přeskočeno ${result.skipped} aktivit jiných sportů nebo již importovaných.`)}catch(err){alert('CSV se nepodařilo importovat: '+err.message)}finally{e.target.value=''}});
// On GitHub Pages, merge the latest CSV periodically published by GitHub Actions.
// Local file:// preview cannot fetch same-origin CSV, so manual import remains available there.
async function refreshStravaFeed(){if(!/^https?:$/.test(location.protocol))return;try{const r=await fetch('./data/strava_activities_2025_2026.csv?updated='+Date.now(),{cache:'no-store'});if(!r.ok)return;const result=await importStravaCsvText(await r.text(),'automatický zdroj');if(result.added)console.info(`Automaticky doplněno ${result.added} jízd ze Stravy.`)}catch(e){console.warn('Automatické načtení Strava CSV se nepodařilo; lokální data zůstávají zachována.',e)}}

// Cloud sync: Supabase Auth + one JSON snapshot per signed-in user. Local storage remains the offline cache.
let cloudClient=null, cloudUser=null, cloudReady=false, applyingCloud=false, cloudTimer=null;
const syncStatus=$('syncStatus');
function status(msg){if(syncStatus)syncStatus.textContent=msg}
function setCloudControls(){const logged=!!cloudUser;$('syncSignOut').hidden=!logged;$('syncEmail').disabled=logged;$('syncSendCode').hidden=logged;$('syncCode').disabled=logged;$('syncVerifyCode').hidden=logged||$('syncCode').hidden;$('syncNow').disabled=!logged;}
function cloudConfigReady(){return window.CYKLO_SUPABASE_URL&&window.CYKLO_SUPABASE_ANON_KEY&&window.CYKLO_SUPABASE_URL.startsWith('https://')&&!window.CYKLO_SUPABASE_ANON_KEY.includes('DOPLNIT')}
async function initCloud(){
 if(!cloudConfigReady()||!window.supabase){status('Cloud není nastaven – lokální režim');setCloudControls();return}
 try{cloudClient=window.supabase.createClient(window.CYKLO_SUPABASE_URL,window.CYKLO_SUPABASE_ANON_KEY);const {data:{session}}=await cloudClient.auth.getSession();cloudUser=session?.user||null;setCloudControls();if(cloudUser)await loadCloudState();else status('Přihlas se pro synchronizaci');cloudClient.auth.onAuthStateChange((event,session)=>{cloudUser=session?.user||null;setCloudControls();if(event==='SIGNED_IN')setTimeout(()=>loadCloudState(),0);if(event==='SIGNED_OUT'){cloudReady=false;status('Odhlášeno – data zůstávají v tomto zařízení')}})}catch(e){status('Cloud se nepodařilo připojit')}
}
async function loadCloudState(){if(!cloudClient||!cloudUser)return;status('Načítám cloudová data…');try{const {data,error}=await cloudClient.from('cycling_state').select('payload,updated_at').eq('owner_id',cloudUser.id).maybeSingle();if(error)throw error;if(data&&data.payload&&Array.isArray(data.payload.activities)){applyingCloud=true;DATA=data.payload.activities.map(enrich);localStorage.setItem(STORAGE_KEY,JSON.stringify(DATA));applyingCloud=false;cloudReady=true;render();status('Synchronizováno · '+new Date(data.updated_at).toLocaleString('cs-CZ'))}else{cloudReady=true;await pushCloudState();status('První synchronizace dokončena')}}catch(e){applyingCloud=false;cloudReady=false;status('Chyba synchronizace: '+(e.message||'zkontroluj nastavení'))}}
async function pushCloudState(){if(!cloudClient||!cloudUser||!cloudReady||applyingCloud)return;status('Ukládám do cloudu…');try{const {error}=await cloudClient.from('cycling_state').upsert({owner_id:cloudUser.id,payload:{activities:DATA},updated_at:new Date().toISOString()},{onConflict:'owner_id'});if(error)throw error;status('Synchronizováno · '+new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'}))}catch(e){status('Cloud se nepodařilo uložit – lokální data zachována')}}
function scheduleCloudSave(){if(applyingCloud||!cloudReady||!cloudUser)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>pushCloudState(),700)}
async function requestEmailCode(){if(!cloudClient){alert('Nejdřív je potřeba nastavit Supabase podle NASTAVENI_CLOUD.md. Synchronizace zatím není nakonfigurovaná.');return}const email=$('syncEmail').value.trim();if(!email){alert('Zadej e-mail.');return}status('Odesílám přihlašovací kód…');try{const result=await cloudClient.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(result.error)throw result.error;$('syncCode').hidden=false;$('syncVerifyCode').hidden=false;status('Kód odeslán na e-mail. Zadej šestimístný kód.')}catch(e){status('Kód se nepodařilo odeslat');alert('Odeslání kódu selhalo: '+(e.message||'zkontroluj nastavení Supabase'))}}
async function verifyEmailCode(){if(!cloudClient)return;const email=$('syncEmail').value.trim(),token=$('syncCode').value.trim();if(!email||!/^\d{6}$/.test(token)){alert('Zadej e-mail a šestimístný kód.');return}status('Ověřuji kód…');try{const result=await cloudClient.auth.verifyOtp({email,token,type:'email'});if(result.error)throw result.error;cloudUser=result.data.user;setCloudControls();await loadCloudState()}catch(e){status('Ověření kódu se nezdařilo');alert('Kód se nepodařilo ověřit: '+(e.message||'zkontroluj kód a nastavení e-mailu v Supabase'))}}
$('syncSendCode').onclick=requestEmailCode;$('syncVerifyCode').onclick=verifyEmailCode;$('syncNow').onclick=()=>loadCloudState();$('syncSignOut').onclick=async()=>{if(cloudClient)await cloudClient.auth.signOut();cloudUser=null;cloudReady=false;setCloudControls();status('Odhlášeno – data zůstávají lokálně')};
window.addEventListener('online',()=>{if(cloudUser)loadCloudState()});
if('serviceWorker' in navigator && location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
initCloud();
if(!$('from').value&&!$('to').value){$('from').value='2026-01-01';$('to').value='2026-12-31'}
loadGoalInputs();
render();

refreshStravaFeed();
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshStravaFeed()});
