const GRACE=60; // minutes after scheduled time before a dose counts as Missed
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const hm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const t12=t=>{let[h,m]=t.split(':').map(Number);return(h%12||12)+':'+pad(m)+(h<12?' AM':' PM')};
const mins=t=>{let[h,m]=t.split(':').map(Number);return h*60+m};
const today=ymd(new Date());
let S;
const seed={residents:[{id:'R001',name:'Ravi',age:72,gender:'Male',room:'101'},{id:'R002',name:'Lakshmi',age:75,gender:'Female',room:'102'},{id:'R003',name:'Ramesh',age:80,gender:'Male',room:'103'}],
meds:[{id:1,rid:'R001',name:'Tablet X',dose:'500 mg',freq:'Once daily',times:['08:00'],start:ymd(new Date(Date.now()-5*864e5)),end:'',note:'After breakfast'},
{id:2,rid:'R002',name:'Tablet Y',dose:'250 mg',freq:'Twice daily',times:['09:00','21:00'],start:ymd(new Date(Date.now()-5*864e5)),end:'',note:''},
{id:3,rid:'R003',name:'Tablet Z',dose:'10 mg',freq:'Once daily',times:['13:00'],start:ymd(new Date(Date.now()-5*864e5)),end:'',note:'With water'}],logs:{},nid:4};
try{S=JSON.parse(localStorage.getItem('medicare'))}catch(e){}
if(!S)S=seed;
const save=()=>{try{localStorage.setItem('medicare',JSON.stringify(S))}catch(e){}};
const rname=id=>(S.residents.find(r=>r.id===id)||{name:'?'}).name;
function dosesFor(date){const out=[];S.meds.forEach(m=>{if(m.start>date||(m.end&&m.end<date))return;m.times.forEach(t=>out.push({key:date+'|'+m.id+'|'+t,date,m,t,given:S.logs[date+'|'+m.id+'|'+t]}))});return out.sort((a,b)=>a.t.localeCompare(b.t))}
function status(d){if(d.given)return'Given';const now=new Date(),n=ymd(now);if(d.date<n)return'Missed';const cur=mins(hm(now)),s=mins(d.t);if(cur>s+GRACE)return'Missed';if(cur>=s)return'Pending';return'Upcoming'}
let tab='Dashboard';
const tabs=['Dashboard','Today','Residents','Medicines','History'];
function nav(){$('#nav').innerHTML=tabs.map(t=>`<button class="${t===tab?'on':''}" onclick="tab='${t}';render()">${t}</button>`).join('')}
function doseCard(d,btn){const st=status(d);return`<div class="card row"><div><b>${esc(rname(d.m.rid))}</b> – ${esc(d.m.name)} (${esc(d.m.dose)})<div class="mut">Scheduled ${t12(d.t)}${d.given?' · Given at '+t12(d.given):''}${d.m.note?' · '+esc(d.m.note):''}</div></div><div class="row"><span class="tag ${st}">${st==='Given'?'✅ ':st==='Missed'?'❌ ':'⏳ '}${st}</span>${btn&&!d.given?`<button class="act" onclick="give('${d.key}')">Mark Given</button>`:''}</div></div>`}
function give(k){S.logs[k]=hm(new Date());save();render()}
function addRes(e){e.preventDefault();const f=e.target;S.residents.push({id:f.id.value.trim(),name:f.name.value.trim(),age:+f.age.value,gender:f.gender.value,room:f.room.value.trim()});save();render()}
function addMed(e){e.preventDefault();const f=e.target;const times=f.times.value.split(',').map(x=>x.trim()).filter(x=>/^\d{1,2}:\d{2}$/.test(x)).map(x=>pad(x.split(':')[0])+':'+x.split(':')[1]);if(!times.length){alert('Enter times like 08:00, 20:00');return}S.meds.push({id:S.nid++,rid:f.rid.value,name:f.name.value.trim(),dose:f.dose.value.trim(),freq:f.freq.value,times,start:f.start.value,end:f.end.value,note:f.note.value.trim()});save();render()}
function delRes(id){if(confirm('Delete resident and their medicines?')){S.residents=S.residents.filter(r=>r.id!==id);S.meds=S.meds.filter(m=>m.rid!==id);save();render()}}
function delMed(id){if(confirm('Delete this medicine?')){S.meds=S.meds.filter(m=>m.id!==id);save();render()}}
function render(){nav();const ds=dosesFor(today),st=ds.map(status);const c=k=>st.filter(x=>x===k).length;let h='';
if(tab==='Dashboard'){const late=ds.filter(d=>status(d)==='Pending'||status(d)==='Missed');
h=`<div class="grid"><div class="stat"><b>${S.residents.length}</b><span>Residents</span></div><div class="stat"><b>${S.meds.length}</b><span>Medicines</span></div><div class="stat"><b class="Given">${c('Given')}</b><span>Given today</span></div><div class="stat"><b class="Pending">${c('Pending')}</b><span>Pending</span></div><div class="stat"><b class="Missed">${c('Missed')}</b><span>Missed</span></div><div class="stat"><b>${c('Upcoming')}</b><span>Upcoming</span></div></div>`;
h+=late.map(d=>`<div class="alert">⚠️ ${esc(rname(d.m.rid))}'s ${esc(d.m.name)} scheduled for ${t12(d.t)} is ${status(d)==='Missed'?'missed':'still pending'}.</div>`).join('');
h+='<h2>Today\'s medicines</h2>'+(ds.map(d=>doseCard(d,true)).join('')||'<p class="mut">No medicines scheduled today.</p>')}
else if(tab==='Today'){h='<h2>Today – '+today+'</h2>'+(ds.map(d=>doseCard(d,true)).join('')||'<p class="mut">Nothing scheduled.</p>')}
else if(tab==='Residents'){h=`<h2>Add resident</h2><form onsubmit="addRes(event)"><input name="id" placeholder="Resident ID (R004)" required><input name="name" placeholder="Name" required><input name="age" type="number" min="40" max="120" placeholder="Age" required><select name="gender"><option>Male</option><option>Female</option><option>Other</option></select><input name="room" placeholder="Room/Bed" required><button class="act">Add</button></form><h2>All residents</h2>`+S.residents.map(r=>`<div class="card row"><div><b>${esc(r.id)} – ${esc(r.name)}</b><div class="mut">${r.age} yrs · ${esc(r.gender)} · Room ${esc(r.room)}</div></div><button class="del" onclick="delRes('${esc(r.id)}')">Delete</button></div>`).join('')}
else if(tab==='Medicines'){h=`<h2>Add medicine</h2><form onsubmit="addMed(event)"><select name="rid">${S.residents.map(r=>`<option value="${esc(r.id)}">${esc(r.name)} (${esc(r.id)})</option>`).join('')}</select><input name="name" placeholder="Medicine name" required><input name="dose" placeholder="Dosage (500 mg)" required><select name="freq"><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>As scheduled</option></select><input name="times" placeholder="Times: 08:00, 20:00" required><input name="start" type="date" value="${today}" required><input name="end" type="date" title="End date (optional)"><input name="note" placeholder="Instructions (optional)"><button class="act">Add</button></form><h2>Prescriptions</h2>`+S.meds.map(m=>`<div class="card row"><div><b>${esc(rname(m.rid))}</b> → ${esc(m.name)} · ${esc(m.dose)}<div class="mut">${esc(m.freq)} at ${m.times.map(t12).join(', ')} · ${m.start} to ${m.end||'ongoing'}${m.note?' · '+esc(m.note):''}</div></div><button class="del" onclick="delMed(${m.id})">Delete</button></div>`).join('')}
else{let rows='';for(let i=0;i<7;i++){const d=ymd(new Date(Date.now()-i*864e5));dosesFor(d).forEach(x=>{const s=status(x);if(s==='Upcoming')return;rows+=`<tr><td>${d}</td><td>${esc(rname(x.m.rid))}</td><td>${esc(x.m.name)}</td><td>${t12(x.t)}</td><td>${x.given?t12(x.given):'—'}</td><td class="${s}"><b>${s}</b></td></tr>`})}
h=`<h2>Administration history (last 7 days)</h2><div class="card scroll"><table><tr><th>Date</th><th>Resident</th><th>Medicine</th><th>Scheduled</th><th>Administered</th><th>Status</th></tr>${rows||'<tr><td colspan="6">No records yet.</td></tr>'}</table></div>`}
$('#app').innerHTML=h}
render();setInterval(()=>{if(tab==='Dashboard'||tab==='Today')render()},60000);