let DB=[],dbReady=false,filt='all',editId=null,pC='#FF6B9D',pR=0,nPh=[],gpsC=null;
const TL={ranunculus:'נוריות',sweetpea:'Sweet Pea',calendula:'Calendula',other:'אחר'};
const TE={ranunculus:'🌺',sweetpea:'🌸',calendula:'🌼',other:'🌿'};
const SL={flowering:'בפריחה',seeding:'בזרעים',dormant:'רדום',selected:'נבחר'};
const SE={flowering:'🟢',seeding:'🟡',dormant:'⚪',selected:'🔵'};
const TC={ranunculus:'tp-ran',sweetpea:'tp-swe',calendula:'tp-cal',other:'tp-oth'};
const PSB={flowering:'ps-flowering',seeding:'ps-seeding',dormant:'ps-dormant',selected:'ps-selected'};

// IndexedDB
let db;
function initDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('VarietiesDB',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{db=request.result;resolve()};
    request.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('varieties')){
        db.createObjectStore('varieties',{keyPath:'id'})
      }
    }
  })
}

async function load(){
  try{
    const tx=db.transaction('varieties','readonly');
    const store=tx.objectStore('varieties');
    const request=store.getAll();
    return new Promise((resolve,reject)=>{
      request.onsuccess=()=>{DB=request.result||[];console.log('✅ נטען:',DB.length);resolve(true)};
      request.onerror=()=>reject(request.error)
    })
  }catch(e){console.error('❌ טעינה:',e);return false}
}

async function save(){
  try{
    const tx=db.transaction('varieties','readwrite');
    const store=tx.objectStore('varieties');
    store.clear();
    DB.forEach(v=>store.add(v));
    await new Promise((resolve,reject)=>{
      tx.oncomplete=()=>{console.log('💾 נשמר:',DB.length);resolve()};
      tx.onerror=()=>reject(tx.error)
    });
    return true
  }catch(e){console.error('❌ שמירה:',e);showToast('⚠️ שגיאה');return false}
}

async function boot(){
  await initDB();
  dbReady=true;
  await load();
  if(!DB.length){
    DB=[{id:Date.now(),name:'נוריה ורודה — שורה 4',type:'ranunculus',color:'#FF6B9D',locText:'שורה 4, עמדה 7',gps:null,status:'selected',rating:5,traits:'ריח עז, גבעול ארוך',notes:'צבע ייחודי',photos:[],created:today(),updated:today()}];
    await save()
  }
  renderAll();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').then(()=>console.log('✅ SW')).catch(e=>console.error('SW:',e))
  }
}

function renderAll(){updateStats();renderList()}
function updateStats(){
  document.getElementById('sTotal').textContent=DB.length;
  document.getElementById('sFlow').textContent=DB.filter(v=>v.status==='flowering').length;
  document.getElementById('sSel').textContent=DB.filter(v=>v.status==='selected').length;
  document.getElementById('sGps').textContent=DB.filter(v=>v.gps).length
}
function getFilt(){
  const q=document.getElementById('srch').value.toLowerCase();
  return DB.filter(v=>{
    const mf=filt==='all'?true:filt==='selected'?v.status==='selected':v.type===filt;
    const ms=!q||v.name.toLowerCase().includes(q)||(v.traits||'').toLowerCase().includes(q)||(v.locText||'').toLowerCase().includes(q);
    return mf&&ms
  })
}

function renderList(){
  const el=document.getElementById('list'),data=getFilt();
  if(!data.length){
    el.innerHTML=`<div class="empty"><div class="empty-ic">🌱</div><h3>${DB.length?'לא נמצאו':'אין זנים'}</h3><p>${DB.length?'נסה סינון אחר':'לחץ + להוספה'}</p></div>`;
    return
  }
  el.innerHTML=data.map(v=>{
    const bgCol=v.color&&v.color!=='#FFFFFF'?v.color+'33':'#F2EAD8';
    const photoHtml=v.photos?.length
      ?`<div class="vcard-photo"><img src="${v.photos[0]}">${v.photos.length>1?`<div class="photo-count">📷 ${v.photos.length}</div>`:''}<div class="photo-status ${PSB[v.status]}">${SE[v.status]} ${SL[v.status]}</div></div>`
      :`<div class="vcard-photo" style="background:${bgCol}"><span style="font-size:60px">${TE[v.type]}</span><div class="photo-status ${PSB[v.status]}">${SE[v.status]} ${SL[v.status]}</div></div>`;
    const stars='★'.repeat(v.rating||0)+'☆'.repeat(5-(v.rating||0));
    const loc=v.gps?`📡 ${v.locText||cs(v.gps)}`:v.locText?`📍 ${v.locText}`:'📍 ללא';
    const traits=(v.traits||'').split(',').filter(Boolean).slice(0,3).map(t=>`<span class="trait-tag">${t.trim()}</span>`).join('');
    return `<div class="vcard">${photoHtml}<div class="vcard-body"><div class="vcard-name">${v.name}</div><div class="vcard-type"><span class="type-pill ${TC[v.type]}">${TE[v.type]} ${TL[v.type]}</span><span class="color-sw" style="background:${v.color||'#ccc'}"></span><span class="stars" style="font-size:15px">${stars}</span></div><div class="vcard-details"><div class="vcd-item"><div class="vcd-label">מיקום</div><div class="vcd-val" style="font-size:12px">${loc}</div></div><div class="vcd-item"><div class="vcd-label">עדכון</div><div class="vcd-val" style="font-size:12px">${v.updated}</div></div></div>${traits?`<div class="traits-row">${traits}</div>`:''}</div><div class="vcard-actions"><button class="cta cta-outline" onclick="alert('פרטים')">📋</button><button class="cta cta-bark" onclick="openEdit(${v.id})">✏️ עריכה</button><button class="cta ${v.status==='selected'?'cta-gold':'cta-sel'}" onclick="togSel(${v.id})">${v.status==='selected'?'✅':'⭐'}</button></div></div>`
  }).join('')
}

function openAdd(){
  editId=null;pC='#FF6B9D';pR=0;nPh=[];gpsC=null;
  document.getElementById('mTitle').textContent='🌱 זן חדש';
  ['fName','fLoc','fTraits','fNotes'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('fType').value='ranunculus';
  document.getElementById('fStatus').value='flowering';
  resetUI();
  document.getElementById('addModal').classList.add('on')
}

function openEdit(id){
  const v=DB.find(v=>v.id===id);
  if(!v)return;
  editId=id;pC=v.color||'#FF6B9D';pR=v.rating||0;nPh=v.photos?[...v.photos]:[];gpsC=v.gps||null;
  document.getElementById('mTitle').textContent='✏️ עריכה';
  document.getElementById('fName').value=v.name;
  document.getElementById('fType').value=v.type;
  document.getElementById('fLoc').value=v.locText||'';
  document.getElementById('fStatus').value=v.status;
  document.getElementById('fTraits').value=v.traits||'';
  document.getElementById('fNotes').value=v.notes||'';
  resetUI();
  document.querySelector(`[data-c="${pC}"]`)?.classList.add('on');
  pickR(pR);
  renderPG();
  updateGUI();
  document.getElementById('addModal').classList.add('on')
}

function resetUI(){
  document.querySelectorAll('.csw').forEach(s=>s.classList.remove('on'));
  document.querySelector(`[data-c="${pC}"]`)?.classList.add('on');
  document.querySelectorAll('.rstar').forEach(s=>s.classList.remove('on'));
  document.getElementById('pgrid').innerHTML='';
  document.getElementById('gpsLbl').textContent='לא נקלט';
  document.getElementById('gpsAcc').textContent='';
  document.getElementById('gpsAcc').className='gps-acc'
}

function updateGUI(){
  if(gpsC){
    document.getElementById('gpsLbl').textContent=cs(gpsC);
    document.getElementById('gpsAcc').className='gps-acc good';
    document.getElementById('gpsAcc').textContent=`✅ ${gpsC.acc||'?'}מ׳`
  }else{
    document.getElementById('gpsLbl').textContent='לא נקלט';
    document.getElementById('gpsAcc').textContent=''
  }
}

function pickC(el){
  document.querySelectorAll('.csw').forEach(s=>s.classList.remove('on'));
  el.classList.add('on');
  pC=el.dataset.c
}

function pickR(v){
  pR=v;
  document.querySelectorAll('.rstar').forEach(s=>s.classList.toggle('on',parseInt(s.dataset.r)<=v))
}

function addPh(e){
  Array.from(e.target.files).slice(0,5-nPh.length).forEach(f=>{
    const r=new FileReader();
    r.onload=ev=>{nPh.push(ev.target.result);renderPG()};
    r.readAsDataURL(f)
  })
}

function renderPG(){
  document.getElementById('pgrid').innerHTML=nPh.map((p,i)=>`<div class="pgi"><img src="${p}"><button class="pgdel" onclick="rmPh(${i})">✕</button></div>`).join('')
}

function rmPh(i){nPh.splice(i,1);renderPG()}

function grabGPS(){
  const btn=document.getElementById('gpsBtn');
  btn.textContent='⏳...';
  document.getElementById('gpsAcc').className='gps-acc ok';
  document.getElementById('gpsAcc').textContent='מחפש...';
  if(!navigator.geolocation){
    showToast('⚠️ GPS לא נתמך');
    btn.textContent='📡 קלוט';
    return
  }
  navigator.geolocation.getCurrentPosition(
    pos=>{
      gpsC={lat:pos.coords.latitude.toFixed(6),lng:pos.coords.longitude.toFixed(6),acc:Math.round(pos.coords.accuracy)};
      updateGUI();
      btn.textContent='📡 קלוט שוב';
      showToast('📍 GPS נקלט')
    },
    err=>{
      document.getElementById('gpsAcc').className='gps-acc bad';
      document.getElementById('gpsAcc').textContent=err.code===1?'❌ נדרשת הרשאה':'❌ כשל';
      btn.textContent='📡 נסה שוב';
      showToast('⚠️ כשל')
    },
    {enableHighAccuracy:true,timeout:15000}
  )
}

async function saveV(){
  if(!dbReady){showToast('⚠️ מאתחל...');return}
  const name=document.getElementById('fName').value.trim();
  if(!name){showToast('⚠️ חסר שם');return}
  const now=today();
  if(editId){
    const idx=DB.findIndex(v=>v.id===editId);
    if(idx>=0){
      DB[idx]={
        ...DB[idx],name,
        type:document.getElementById('fType').value,
        color:pC,
        locText:document.getElementById('fLoc').value.trim(),
        gps:gpsC,
        status:document.getElementById('fStatus').value,
        rating:pR,
        traits:document.getElementById('fTraits').value.trim(),
        notes:document.getElementById('fNotes').value.trim(),
        photos:nPh,
        updated:now
      }
    }
    showToast('✅ עודכן')
  }else{
    DB.unshift({
      id:Date.now(),name,
      type:document.getElementById('fType').value,
      color:pC,
      locText:document.getElementById('fLoc').value.trim(),
      gps:gpsC,
      status:document.getElementById('fStatus').value,
      rating:pR,
      traits:document.getElementById('fTraits').value.trim(),
      notes:document.getElementById('fNotes').value.trim(),
      photos:nPh,
      created:now,
      updated:now
    });
    showToast('✅ זן חדש נוסף')
  }
  if(await save()){
    closeM('addModal');
    renderAll()
  }
}

async function togSel(id){
  const v=DB.find(v=>v.id===id);
  if(!v)return;
  v.status=v.status==='selected'?'flowering':'selected';
  v.updated=today();
  await save();
  renderAll();
  showToast(v.status==='selected'?'⭐ נבחר':'↩️ הוסר')
}

function setF(f,btn){
  filt=f;
  document.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
  if(btn)btn.classList.add('on');
  else document.querySelector(`[data-f="${f}"]`)?.classList.add('on');
  renderList()
}

function closeM(id){document.getElementById(id).classList.remove('on')}
function bgc(e,id){if(e.target.classList.contains('overlay'))closeM(id)}
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('on');
  setTimeout(()=>t.classList.remove('on'),2500)
}

// BACKUP/RESTORE
function showBackupMenu(){
  document.getElementById('backupModal').classList.add('on')
}

function exportBackup(){
  const data={
    version:1,
    exported:new Date().toISOString(),
    varieties:DB
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`varieties_backup_${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 גיבוי יוצא');
  closeM('backupModal')
}

async function importBackup(e){
  const file=e.target.files[0];
  if(!file)return;
  try{
    const text=await file.text();
    const data=JSON.parse(text);
    if(!data.varieties||!Array.isArray(data.varieties)){
      showToast('⚠️ קובץ לא תקין');
      return
    }
    if(!confirm(`לשחזר ${data.varieties.length} זנים?\n(המידע הנוכחי יימחק)`))return;
    DB=data.varieties;
    await save();
    renderAll();
    showToast('✅ שוחזר בהצלחה');
    closeM('backupModal')
  }catch(err){
    console.error(err);
    showToast('⚠️ שגיאה בקריאה')
  }
}

function syncToCloud(){
  showToast('☁️ בקרוב...');
  closeM('backupModal')
}

function today(){return new Date().toISOString().split('T')[0]}
function cs(g){return g?`${g.lat}, ${g.lng}`:''}

boot();
