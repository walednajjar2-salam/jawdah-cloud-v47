const Jawdah = {
  token: localStorage.getItem('jawdah_cloud_token') || '',
  user: null,
  data: {},
  dashboard: null,
  activeSection: 'dashboard',
  charts: {},
  invoiceForPrint: null
};
const PROPERTY_STATUSES = ['شاغرة', 'محجوزة', 'مستأجرة', 'صيانة'];
const STATUS_CLASS = {
  'شاغرة': 'vacant', 'محجوزة': 'pending', 'مستأجرة': 'rented', 'صيانة': 'maintenance',
  vacant: 'vacant', rented: 'rented', maintenance: 'maintenance', pending: 'pending',
  partial: 'partial', paid: 'paid', active: 'active', overdue: 'overdue', open: 'open',
  income: 'paid', expense: 'overdue', draft: 'draft', renewed: 'renewed', expired: 'expired'
};
function propertyLabel(p){
  if(!p || !p.id) return '';
  if(p.building_no || p.apartment_no || p.room_no){
    const parts = [];
    if(p.building_no) parts.push('بناية '+p.building_no);
    if(p.apartment_no) parts.push('شقة '+p.apartment_no);
    if(p.room_no) parts.push('غرفة '+p.room_no);
    return parts.join(' · ');
  }
  return p.name || p.id;
}
function propertyUnitLine(p){
  if(!p || !p.id) return '';
  const bits = [p.building_no && ('ب'+p.building_no), p.apartment_no && ('ش'+p.apartment_no), p.room_no && ('غ'+p.room_no)].filter(Boolean);
  return bits.join(' / ');
}
function statusBadge(v){
  const raw = String(v ?? '');
  const lower = raw.toLowerCase();
  let cls = STATUS_CLASS[raw] || STATUS_CLASS[lower];
  if(!cls){
    if(raw.includes('مستأ') || lower.includes('rent') || lower.includes('lease')) cls = 'rented';
    else if(raw.includes('شاغ') || lower.includes('vacant')) cls = 'vacant';
    else if(raw.includes('صيان') || lower.includes('maint')) cls = 'maintenance';
    else if(raw.includes('محج') || lower.includes('pend') || lower.includes('reserv')) cls = 'pending';
    else cls = lower.replace(/\s+/g, '-');
  }
  return `<span class="badge ${cls}">${raw}</span>`;
}
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const api = async (path, opts={}) => {
  const headers = {'Content-Type':'application/json'};
  if(Jawdah.token) headers.Authorization = 'Bearer ' + Jawdah.token;
  const res = await fetch('/api/' + path.replace(/^\//,''), {...opts, headers:{...headers, ...(opts.headers||{})}});
  const text = await res.text();
  let data;
  try{ data = text ? JSON.parse(text) : {}; }catch(e){ data = {ok:false,error:text || 'Invalid response'}; }
  if(!res.ok || data.ok === false) throw new Error(data.error || data.detail || 'Request failed');
  return data;
};
const fmt = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const money = n => fmt(n) + ' OMR';
const today = () => new Date().toISOString().slice(0,10);
const byId = (table,id) => (Jawdah.data[table]||[]).find(x=>x.id===id) || {};
const roleName = r => ({owner:'General Owner',admin:'System Admin',accountant:'Accountant',operations:'Operations',maintenance:'Maintenance',viewer:'Viewer'}[r]||r);
function toast(msg, err=false){ const t=document.createElement('div'); t.className='toast'+(err?' err':''); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }
function ensureEnglishDigits(root=document.body){
  const rx=/[\u0660-\u0669\u06F0-\u06F9]/g;
  const convert=s=>String(s).replace(rx,ch=>String(ch.charCodeAt(0)-((ch.charCodeAt(0)>=0x06F0)?0x06F0:0x0660)));
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n; while(n=walk.nextNode()){ if(rx.test(n.nodeValue)) n.nodeValue=convert(n.nodeValue); }
  $$('input,textarea').forEach(el=>{ if(rx.test(el.value)) el.value=convert(el.value); });
}
async function login(){
  try{
    const username=$('#loginUser').value.trim(); const password=$('#loginPass').value;
    const res=await api('login',{method:'POST',body:JSON.stringify({username,password})});
    Jawdah.token=res.token; Jawdah.user=res.user; localStorage.setItem('jawdah_cloud_token',res.token);
    $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); await loadAll(); toast('تم تسجيل الدخول');
  }catch(e){toast(e.message,true)}
}
async function logout(){ try{await api('logout',{method:'POST'});}catch(e){} localStorage.removeItem('jawdah_cloud_token'); location.reload(); }
async function checkSession(){
  if(!Jawdah.token){ $('#loginScreen').classList.remove('hidden'); return; }
  try{ const me=await api('me'); Jawdah.user=me.user; $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); await loadAll(); }
  catch(e){ localStorage.removeItem('jawdah_cloud_token'); $('#loginScreen').classList.remove('hidden'); }
}
async function loadAll(){
  const res=await api('bootstrap'); Jawdah.data=res.data; Jawdah.dashboard=res.dashboard; Jawdah.user=res.user;
  $('#userName').textContent=Jawdah.user.name; $('#userRole').textContent=roleName(Jawdah.user.role); $('#avatar').textContent=(Jawdah.user.name||'J').slice(0,1).toUpperCase();
  buildNav(); renderAll(); showSection(Jawdah.activeSection||'dashboard'); ensureEnglishDigits();
}
function buildNav(){
  const items=[['dashboard','لوحة التحكم','🏛️'],['properties','العقارات','🏠'],['clients','العملاء','👥'],['contracts','العقود والتجديد','📑'],['invoices','الفواتير','🧾'],['accounts','الحسابات','💰'],['maintenance','الصيانة','🔧'],['reports','التقارير','📊'],['users','المستخدمين','🛡️'],['backup','التخزين والنسخ','💾'],['qa','اختبار التشغيل','✅']];
  const nav=$('#nav'); nav.innerHTML='';
  items.forEach(([id,label,icon])=>{
    if(id==='users' && Jawdah.user.role!=='admin') return;
    const b=document.createElement('button'); b.dataset.section=id; b.innerHTML=`<span>${icon} ${label}</span><small>›</small>`; b.onclick=()=>showSection(id); nav.appendChild(b);
  });
}
function showSection(id){
  Jawdah.activeSection=id; $$('.section').forEach(s=>s.classList.remove('active')); const s=$('#sec-'+id); if(s) s.classList.add('active');
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
  document.body.classList.toggle('dash-pro-active', id==='dashboard');
  $('#sectionTitle').textContent = ({dashboard:'لوحة التحكم',properties:'العقارات',clients:'العملاء',contracts:'العقود والتجديد',invoices:'الفواتير',accounts:'الحسابات',maintenance:'الصيانة',reports:'التقارير المالية',users:'المستخدمين والصلاحيات',backup:'التخزين والنسخ الاحتياطي',qa:'اختبار التشغيل'}[id]||'Jawdah');
  if(innerWidth<1100) $('#sidebar').classList.remove('open'); setTimeout(drawCharts,50); ensureEnglishDigits();
}
function renderAll(){ renderDashboard(); renderProperties(); renderClients(); renderContracts(); renderInvoices(); renderAccounts(); renderMaintenance(); renderUsers(); renderBackup(); renderQA(); }
function houseArt(kind){
  const n = kind==='total'?3: (kind==='maint'?3:2);
  return `<div class="house-art ${kind}">${Array.from({length:n},()=>'<i></i>').join('')}</div>`;
}
function propStatusDot(status){
  const s=String(status||'');
  if(s.includes('مستأ')||s.toLowerCase().includes('rent')) return `<span class="status-dot rented"><i></i>مستأجرة</span>`;
  if(s.includes('صيان')||s.toLowerCase().includes('maint')) return `<span class="status-dot maint"><i></i>صيانة</span>`;
  return `<span class="status-dot vacant"><i></i>شاغرة</span>`;
}
function maintQueueTag(m){
  const st=String(m.status||'').toLowerCase();
  if(st.includes('done')||st.includes('closed')||st.includes('complete')) return `<span class="mq-tag done">مكتمل</span>`;
  if(String(m.priority||'').toLowerCase()==='high') return `<span class="mq-tag high">أولوية عالية</span>`;
  return `<span class="mq-tag progress">قيد التنفيذ</span>`;
}
function showMapPopup(p, leftPct, topPct){
  const box=$('#mapPopup'); if(!box) return;
  const thumb=p.image && !String(p.image).startsWith('http') ? p.image : '🏠';
  box.classList.remove('hidden');
  box.style.left=`calc(${leftPct}% - 120px)`;
  box.style.top=`calc(${topPct}% - 10px)`;
  box.innerHTML=`<div class="map-thumb">${thumb}</div><h4>${propertyLabel(p)}</h4><p>${p.location||'—'}</p><div class="price">${money(p.price||0)} / شهر</div>${statusBadge(p.status)}`;
}
function showMapPopupById(id, leftPct, topPct){ showMapPopup(byId('properties', id), leftPct, topPct); }
function renderDashboard(){
  const k=Jawdah.dashboard.kpis;
  const data=Jawdah.data || {};
  const props=data.properties||[];
  const maint=data.maintenance||[];
  const openMaint=maint.filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/));
  const overdueInv=(data.invoices||[]).filter(x=>Number(x.amount||0)>Number(x.paid_amount||0));
  const collectionRate = k.billed ? Math.round((Number(k.paid||0)/Number(k.billed||1))*100) : 0;
  const forecastOcc = Math.min(100, Math.round(Number(k.occupancy||0) + (collectionRate > 80 ? 6 : 2)));
  const riskContracts = Number(k.expiring||0) + Number(k.expired||0);
  const bell=$('#bellDot');
  if(bell) bell.classList.toggle('hidden', !(Number(k.overdue||0)>0 || riskContracts>0 || openMaint.length>0));

  const kpis=[
    {art:'total',label:'إجمالي العقارات',value:fmt(k.properties),section:'properties'},
    {art:'rented',label:'العقارات المؤجرة',value:fmt(k.rented),section:'properties'},
    {art:'vacant',label:'العقارات الشاغرة',value:fmt(k.vacant),section:'properties'},
    {art:'expiring',label:'تنتهي قريباً',value:fmt(k.expiring||0),section:'contracts',danger:true},
    {art:'overdue',label:'مدفوعات متأخرة',value:fmt(overdueInv.length),section:'invoices',warn:true},
    {art:'maint',label:'صيانة مفتوحة',value:fmt(k.maintenance||openMaint.length),section:'maintenance'}
  ];
  const row=$('#dashKpiRow');
  if(row) row.innerHTML=kpis.map(x=>`<article class="dash-kpi${x.danger?' danger':''}${x.warn?' warn':''}" onclick="showSection('${x.section}')"><div><strong>${x.value}</strong><span>${x.label}</span></div>${houseArt(x.art)}</article>`).join('');

  const occLabel=$('#occPctLabel');
  if(occLabel) occLabel.textContent=fmt(k.occupancy)+'%';

  const positions=[[18,24],[43,42],[68,58],[28,70],[78,32],[52,22],[36,61],[22,84],[84,54],[61,76]];
  $('#gisPins').innerHTML=props.map((p,i)=>{
    const st=String(p.status||'');
    const cls=st.includes('صيان')||st.toLowerCase().includes('maint')?'red':(st.includes('شاغ')||st.toLowerCase().includes('vacant')?'blue':(st.includes('محج')||st.toLowerCase().includes('pend')?'orange':'gold'));
    const [left,top]=positions[i%positions.length];
    return `<button type="button" class="pin ${cls}" title="${propertyLabel(p)}" style="left:${left}%;top:${top}%" onclick="showMapPopupById('${p.id}',${left},${top})"></button>`;
  }).join('');
  if(props[0]) showMapPopup(props[0], positions[0][0], positions[0][1]);

  const maintRows=openMaint.slice(0,3);
  $('#maintQueue').innerHTML=maintRows.length ? maintRows.map(m=>`<div class="mq-item"><div><b>${m.title||'طلب صيانة'}</b><div class="mini">${propertyLabel(byId('properties',m.property_id))}</div></div>${maintQueueTag(m)}</div>`).join('') : '<div class="mq-item"><b>لا توجد طلبات مفتوحة</b><span class="mq-tag done">جاهز</span></div>';

  const propRows=props.slice(0,6);
  $('#dashPropsTable').innerHTML=`<div class="table-wrap"><table><thead><tr><th></th><th>العقار</th><th>الحالة</th><th>الإيجار الشهري</th></tr></thead><tbody>${propRows.map(p=>`<tr><td><div class="prop-thumb">${p.image||'🏠'}</div></td><td class="prop-name-cell"><b>${propertyLabel(p)}</b><small>${p.location||''}</small></td><td>${propStatusDot(p.status)}</td><td><b>${money(p.price||0)}</b></td></tr>`).join('')||'<tr><td colspan="4">لا توجد عقارات</td></tr>'}</tbody></table></div>`;

  $('#dashMaintCards').innerHTML=maintRows.slice(0,2).map(m=>`<div class="maint-card"><div class="thumb">🔧</div><div><b>${m.title||'صيانة'}</b><p>${propertyLabel(byId('properties',m.property_id))}</p></div><button type="button" class="view-btn" onclick="showSection('maintenance')">عرض</button></div>`).join('') || '<div class="maint-card"><div class="thumb">✓</div><div><b>لا توجد طلبات</b><p>كل شيء مستقر</p></div></div>';

  $('#aiAssistant').innerHTML=`<div class="ai-head"><div class="spark">✨</div><h3>AI Assistant</h3></div><div class="ai-list"><div><b>Occupancy Forecast:</b> ${fmt(forecastOcc)}%</div><div><b>Contracts at Risk:</b> ${fmt(riskContracts)}</div><div><b>Income Optimization:</b> ${Number(k.overdue||0)>0?'Focus on overdue collections':'Increase occupancy on vacant units'}</div></div><button type="button" class="insights-btn" onclick="showSection('reports')">Get Insights</button>`;
}
function tableHtml(cols, rows, actions){
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}${actions?'<th>إجراء</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[2]?c[2](r[c[1]],r):(r[c[1]]??'')}</td>`).join('')}${actions?`<td>${actions(r)}</td>`:''}</tr>`).join('')||`<tr><td colspan="${cols.length+1}">لا توجد بيانات</td></tr>`}</tbody></table></div>`;
}
function renderProperties(){
  const rows=filterRows('properties',['building_no','apartment_no','room_no','name','status','location','notes']);
  $('#propertiesTable').innerHTML=tableHtml([['البناية','building_no'],['الشقة','apartment_no'],['الغرفة','room_no'],['الحالة','status',(v)=>statusBadge(v)],['السعر','price',(v)=>money(v)],['الموقع','location'],['الوحدة','id',(_,r)=>propertyLabel(r)]],rows,r=>`<button class="ghost" onclick="editRecord('properties','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('properties','${r.id}')">حذف</button>`);
  fillSelect('#propStatusFilter',['',...PROPERTY_STATUSES],false);
}
function renderClients(){
  const rows=filterRows('clients',['name','phone','email','national_id']);
  $('#clientsTable').innerHTML=tableHtml([['الاسم','name'],['الهاتف','phone'],['البريد','email'],['الهوية/السجل','national_id'],['الرصيد','balance',(v)=>money(v)],['ملاحظات','notes']],rows,r=>`<button class="ghost" onclick="clientStatement('${r.id}')">كشف</button> <button class="ghost" onclick="editRecord('clients','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('clients','${r.id}')">حذف</button>`);
}
function renderContracts(){
  fillSelect('#contractProperty',Jawdah.data.properties||[],true,'id','name',propertyLabel); fillSelect('#contractClient',Jawdah.data.clients||[],true,'id','name');
  const rows=filterRows('contracts',['id','status','notes']);
  const renewalHost = $('#renewalQueueBox');
  if(renewalHost){
    const queue = renewalQueue();
    renewalHost.innerHTML = queue.length
      ? `<div class="renewal-panel"><h3>🔁 قرارات التجديد (${queue.length})</h3><p class="mini">عقود نشطة تقترب من تاريخ النهاية أو منتهية وتحتاج قرار تجديد قبل تحولها إلى شغور.</p>${queue.map(({contract:c, meta})=>`<div class="renewal-row"><div><b>${c.contract_no||c.id}</b> · ${byId('clients',c.client_id).name||c.client_id}<br><span class="mini">${propertyLabel(byId('properties',c.property_id))} · ينتهي ${c.end_date}</span></div><span class="badge ${meta.tone}">${meta.label}</span><button class="gold-btn" onclick="renewContract('${c.id}')">تجديد</button></div>`).join('')}</div>`
      : `<div class="renewal-panel renewal-ok"><h3>🔁 التجديد</h3><p class="mini">لا توجد عقود تحتاج قرار تجديد حالياً.</p></div>`;
  }
  $('#contractsTable').innerHTML=tableHtml([['رقم العقد','contract_no',(v,r)=>v||r.id],['النوع','contract_type'],['الوحدة','property_id',(v)=>propertyLabel(byId('properties',v))],['العميل','client_id',(v)=>byId('clients',v).name||v],['البداية','start_date'],['النهاية','end_date'],['التجديد','id',(_,r)=>{const m=contractRenewalMeta(r); return m.label?`<span class="badge ${m.tone}">${m.label}</span>`:'—';}],['الإيجار','rent_amount',(v)=>money(v)],['التأمين','deposit_amount',(v)=>money(v)],['الحالة','status',(v)=>statusBadge(v)]],rows,r=>{
    const meta = contractRenewalMeta(r);
    const renewBtn = meta.renewable ? `<button class="gold-btn" onclick="renewContract('${r.id}')">تجديد</button> ` : '';
    return `${renewBtn}<button class="gold-btn" onclick="approveContract('${r.id}')">اعتماد</button> <button class="ghost" onclick="contractDocument('${r.id}')">العقد</button> <button class="ghost" onclick="invoiceFromContract('${r.id}')">فاتورة</button> <button class="ghost" onclick="editRecord('contracts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('contracts','${r.id}')">حذف</button>`;
  });
}
function renderInvoices(){
  const rows=filterRows('invoices',['invoice_no','description','status']);
  $('#invoicesTable').innerHTML=tableHtml([['رقم','invoice_no'],['العميل','client_id',(v)=>byId('clients',v).name||v],['الوحدة','property_id',(v)=>propertyLabel(byId('properties',v))],['الإصدار','issue_date'],['الاستحقاق','due_date'],['الإجمالي','amount',(v)=>money(v)],['المدفوع','paid_amount',(v)=>money(v)],['المتبقي','amount',(v,r)=>money(Number(r.amount)-Number(r.paid_amount))],['الحالة','status',(v)=>statusBadge(v)]],rows,r=>`<button class="gold-btn" onclick="openPayment('${r.id}')">تحصيل</button> <button class="ghost" onclick="printInvoice('${r.id}')">طباعة</button> <button class="danger" onclick="delRecord('invoices','${r.id}')">حذف</button>`);
}
function renderAccounts(){
  const rows=filterRows('accounts',['description','category','type']);
  $('#accountsTable').innerHTML=tableHtml([['التاريخ','entry_date'],['النوع','type',(v)=>statusBadge(v)],['التصنيف','category'],['الوصف','description'],['العميل','client_id',(v)=>v?(byId('clients',v).name||v):''],['الوحدة','property_id',(v)=>v?propertyLabel(byId('properties',v)):'' ],['الفاتورة','invoice_id',(v)=>v?(byId('invoices',v).invoice_no||v):''],['المبلغ','amount',(v)=>money(v)]],rows,r=>`<button class="ghost" onclick="editRecord('accounts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('accounts','${r.id}')">حذف</button>`);
  const income=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0), expense=rows.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
  $('#accountSummary').innerHTML=`<span class="badge">إيرادات ${money(income)}</span><span class="badge">مصروفات ${money(expense)}</span><span class="badge">صافي ${money(income-expense)}</span>`;
}
function renderMaintenance(){
  fillSelect('#maintProperty',Jawdah.data.properties||[],true,'id','name',propertyLabel);
  const rows=filterRows('maintenance',['title','priority','status','notes']);
  $('#maintenanceGrid').innerHTML=rows.map(m=>`<div class="card"><h3>${m.title}</h3><p>${propertyLabel(byId('properties',m.property_id))||m.property_id}</p><span class="badge">${m.priority}</span> <span class="badge">${m.status}</span><p>التكلفة: ${money(m.cost)}</p><button class="ghost" onclick="editRecord('maintenance','${m.id}')">متابعة</button> <button class="danger" onclick="delRecord('maintenance','${m.id}')">حذف</button></div>`).join('')||'<div class="card">لا توجد طلبات صيانة</div>';
}
function renderUsers(){
  if(!Jawdah.data.users){ $('#usersTable').innerHTML='<div class="card">هذا القسم للمدير فقط</div>'; return; }
  $('#usersTable').innerHTML=tableHtml([['المستخدم','username'],['الاسم','name'],['الدور','role',(v)=>roleName(v)],['نشط','active',(v)=>v?'نعم':'لا'],['آخر دخول','last_login']],Jawdah.data.users,r=>`<button class="ghost" onclick="editRecord('users','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('users','${r.id}')">حذف</button>`);
}
function renderBackup(){
  const counts=Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,(v||[]).length]));
  let html=Object.entries(counts).map(([k,v])=>`<span class="badge">${k}: ${fmt(v)}</span>`).join(' ');
  api('backup/status').then(st=>{
    if(st.auto_backup?.enabled){
      html += `<p class="mini" style="margin-top:12px">نسخ احتياطي تلقائي: كل ${fmt(st.auto_backup.interval_hours)} ساعة — آخر نسخة: ${st.auto_backup.last_backup||'لم تُنشأ بعد'} — يحتفظ بـ ${fmt(st.auto_backup.retention)} نسخة</p>`;
      if(st.recent?.length){
        html += st.recent.slice(0,5).map(b=>`<span class="badge">${b.created_at||b.timestamp}</span>`).join(' ');
      }
    } else {
      html += `<p class="mini" style="margin-top:12px">النسخ الاحتياطي التلقائي متوقف (JAWDAH_AUTO_BACKUP=0)</p>`;
    }
    $('#backupStatus').innerHTML=html;
  }).catch(()=>{ $('#backupStatus').innerHTML=html; });
}
async function runAutoBackup(){
  try{
    const res=await api('backup/run',{method:'POST',body:JSON.stringify({})});
    toast('تم إنشاء نسخة احتياطية: '+res.backup.timestamp);
    renderBackup();
  }catch(e){ toast(e.message,true); }
}
function renderQA(){
  $('#qaBox').innerHTML='<p>اضغط تشغيل الاختبار لفحص الترابط والتخزين والفواتير والحسابات.</p>';
}
function filterRows(table, fields){
  let rows=[...(Jawdah.data[table]||[])]; const q=($('#globalSearch')?.value||'').toLowerCase().trim();
  if(q) rows=rows.filter(r=>fields.some(f=>String(r[f]??'').toLowerCase().includes(q)));
  if(table==='properties'){ const s=$('#propStatusFilter')?.value; if(s) rows=rows.filter(r=>r.status===s); const b=($('#propBuildingFilter')?.value||'').trim(); if(b) rows=rows.filter(r=>String(r.building_no||'').includes(b)); }
  return rows;
}
function badge(v){ return statusBadge(v); }
function contractDaysLeft(endDate){
  if(!endDate) return null;
  const end = new Date(String(endDate)+'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.floor((end - now) / 86400000);
}
function contractRenewalMeta(c){
  const days = contractDaysLeft(c.end_date);
  const notice = Number(c.renewal_notice_days || 30);
  const status = String(c.status || '').toLowerCase();
  if(status !== 'active') return {days, label:'', tone:'', renewable:false};
  if(days === null) return {days, label:'', tone:'', renewable:false};
  if(days < 0) return {days, label:'منتهٍ', tone:'overdue', renewable:true};
  if(days <= notice) return {days, label:`تجديد خلال ${days} يوم`, tone:'pending', renewable:true};
  return {days, label:`${days} يوم`, tone:'active', renewable:false};
}
function renewalQueue(){
  return (Jawdah.data.contracts||[])
    .map(c=>({contract:c, meta:contractRenewalMeta(c)}))
    .filter(x=>x.meta.renewable)
    .sort((a,b)=>(a.meta.days??999)-(b.meta.days??999));
}
function fillSelect(sel, data, objects=false, valueKey='id', textKey='name', labelFn=null){
  const el=$(sel); if(!el) return; const old=el.value; let html='<option value="">اختر</option>';
  if(objects) html+=data.map(x=>`<option value="${x[valueKey]}">${labelFn?labelFn(x):(x[textKey]??'')}</option>`).join(''); else html+=data.map(x=>`<option value="${x}">${x||'الكل'}</option>`).join('');
  el.innerHTML=html; if([...el.options].some(o=>o.value===old)) el.value=old;
}
async function createProperty(){ await saveNew('properties',{building_no:val('pBuilding'),apartment_no:val('pApartment'),room_no:val('pRoom'),status:val('pStatus'),price:num('pPrice'),location:val('pLocation'),notes:val('pNotes'),image:'🏠',last_update:today()}); }
async function createClient(){ await saveNew('clients',{name:val('cName'),phone:val('cPhone'),email:val('cEmail'),national_id:val('cNational'),balance:0,notes:val('cNotes')}); }
async function createContract(){ await saveNew('contracts',{contract_type:val('contractType')||'Residential',property_id:val('contractProperty'),client_id:val('contractClient'),tenant_nationality:val('tenantNationality'),tenant_id_no:val('tenantIdNo'),unit_details:val('unitDetails'),start_date:val('contractStart')||today(),end_date:val('contractEnd')||today(),rent_amount:num('contractRent'),deposit_amount:num('contractDeposit'),late_fee:num('contractLateFee'),grace_days:num('contractGraceDays')||5,renewal_notice_days:num('contractRenewalDays')||30,status:'Draft',payment_cycle:'monthly',legal_terms:val('contractLegalTerms'),notes:val('contractNotes')}); }
async function createAccount(){ await saveNew('accounts',{entry_date:val('accDate')||today(),type:val('accType'),category:val('accCategory'),description:val('accDesc'),client_id:val('accClient')||null,property_id:val('accProperty')||null,invoice_id:null,amount:num('accAmount')}); }
async function createMaintenance(){ await saveNew('maintenance',{property_id:val('maintProperty'),title:val('maintTitle'),priority:val('maintPriority'),status:'Open',request_date:today(),cost:num('maintCost'),notes:val('maintNotes')}); }
async function createUser(){ await saveNew('users',{username:val('uUsername'),name:val('uName'),role:val('uRole'),password:val('uPassword'),active:true}); }
async function saveNew(table,row){ try{ await api(table,{method:'POST',body:JSON.stringify(row)}); toast('تم الحفظ'); await loadAll(); }catch(e){toast(e.message,true)} }
function val(id){ return ($('#'+id)?.value||'').trim(); } function num(id){ return Number(val(id)||0); }
async function delRecord(table,id){ if(!confirm('تأكيد الحذف؟')) return; try{ await api(`${table}/${id}`,{method:'DELETE'}); toast('تم الحذف'); await loadAll(); }catch(e){toast(e.message,true)} }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function editOptions(field, row, table=''){
  const opts = {
    status: ['Rented','Vacant','Maintenance','Active','Closed','Renewed','Expired','Draft','Open','In Progress','Completed','Pending'],
    type: ['Villa','Apartment','Office','Compound','income','expense'],
    role: ['admin','accountant','operations','maintenance','viewer'],
    priority: ['Low','Medium','High','Urgent'],
    payment_cycle: ['monthly','quarterly','yearly'],
    active: ['1','0']
  };
  if(field === 'property_id') return (Jawdah.data.properties||[]).map(x=>[x.id, propertyLabel(x)]);
  if(table === 'properties' && field === 'status') return PROPERTY_STATUSES.map(x=>[x,x]);
  if(field === 'client_id') return (Jawdah.data.clients||[]).map(x=>[x.id,x.name]);
  if(field === 'invoice_id') return [['','بدون فاتورة'], ...(Jawdah.data.invoices||[]).map(x=>[x.id,x.invoice_no])];
  if(field === 'parent_code') return [['','بدون حساب أب'], ...(Jawdah.data.chart_accounts||[]).map(x=>[x.code, `${x.code} - ${x.name}`])];
  if(table === 'chart_accounts' && field === 'type') return ['Asset','Liability','Equity','Revenue','Expense'].map(x=>[x,x]);
  if(table === 'financial_periods' && field === 'status') return ['Open','Closed'].map(x=>[x,x]);
  if(table === 'bank_reconciliations' && field === 'status') return ['Pending','Reconciled','Variance'].map(x=>[x,x]);
  if(opts[field]) return opts[field].map(x=>[x, field==='role'?roleName(x):(x==='1'?'نعم':x==='0'?'لا':x)]);
  return null;
}
const EDIT_CONFIG = {
  properties: {title:'تعديل عقار', fields:[['building_no','رقم البناية','text'],['apartment_no','رقم الشقة','text'],['room_no','رقم الغرفة','text'],['status','الحالة','select'],['price','السعر','number'],['location','الموقع','text'],['name','اسم العرض (اختياري)','text'],['type','النوع','select'],['image','رمز/صورة','text'],['notes','ملاحظات','textarea']]},
  clients: {title:'تعديل عميل', fields:[['name','اسم العميل','text'],['phone','الهاتف','text'],['email','البريد','text'],['national_id','الهوية/السجل','text'],['balance','الرصيد الافتتاحي','number'],['notes','ملاحظات','textarea']]},
  contracts: {title:'تعديل عقد', fields:[['contract_no','رقم العقد','text'],['contract_type','نوع العقد','select'],['property_id','العقار','select'],['client_id','العميل','select'],['tenant_nationality','جنسية المستأجر','text'],['tenant_id_no','رقم الهوية/السجل','text'],['unit_details','تفاصيل الوحدة','textarea'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['rent_amount','قيمة الإيجار','number'],['deposit_amount','التأمين','number'],['late_fee','غرامة التأخير','number'],['grace_days','مهلة السداد بالأيام','number'],['renewal_notice_days','تنبيه التجديد بالأيام','number'],['status','الحالة','select'],['payment_cycle','دورة الدفع','select'],['legal_terms','الشروط القانونية','textarea'],['notes','ملاحظات','textarea']]},
  accounts: {title:'تعديل حركة مالية', fields:[['entry_date','التاريخ','date'],['type','النوع','select'],['category','التصنيف','text'],['description','الوصف','text'],['client_id','العميل','select'],['property_id','العقار','select'],['invoice_id','الفاتورة','select'],['amount','المبلغ','number']]},
  maintenance: {title:'تعديل طلب صيانة', fields:[['property_id','العقار','select'],['title','عنوان الطلب','text'],['priority','الأولوية','select'],['status','الحالة','select'],['request_date','تاريخ الطلب','date'],['cost','التكلفة','number'],['notes','ملاحظات','textarea']]},
  chart_accounts: {title:'تعديل حساب في الدليل', fields:[['code','رمز الحساب','text'],['name','اسم الحساب','text'],['type','نوع الحساب','select'],['parent_code','الحساب الأب','select'],['active','نشط','select'],['notes','ملاحظات','textarea']]},
  financial_periods: {title:'تعديل فترة مالية', fields:[['period_name','اسم الفترة','text'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  bank_reconciliations: {title:'تعديل تسوية بنك', fields:[['bank_name','البنك','text'],['period_name','الفترة','text'],['book_balance','رصيد الدفاتر','number'],['bank_balance','رصيد كشف البنك','number'],['difference','الفرق','number'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  users: {title:'تعديل مستخدم', fields:[['username','اسم المستخدم','text'],['name','الاسم','text'],['role','الدور','select'],['active','نشط','select'],['password','كلمة مرور جديدة - اختياري','password']]}
};
function editRecord(table,id){
  const cfg = EDIT_CONFIG[table];
  const row = byId(table,id);
  if(!cfg || !row.id){ toast('لم يتم العثور على السجل', true); return; }
  const fields = cfg.fields.map(([key,label,type])=>{
    const value = key === 'password' ? '' : (row[key] ?? '');
    const options = editOptions(key,row,table);
    if(type === 'textarea') return `<label>${label}<textarea data-edit-field="${key}" rows="3">${escapeHtml(value)}</textarea></label>`;
    if(options) return `<label>${label}<select data-edit-field="${key}">${options.map(([v,t])=>`<option value="${escapeHtml(v)}" ${String(value)===String(v)?'selected':''}>${escapeHtml(t)}</option>`).join('')}</select></label>`;
    return `<label>${label}<input data-edit-field="${key}" type="${type}" value="${escapeHtml(value)}" ${type==='number'?'step="0.001"':''}></label>`;
  }).join('');
  $('#genericModalBody').innerHTML = `<h2>${cfg.title}</h2><p class="mini">تعديل مباشر محفوظ في النظام.</p><div class="form edit-form">${fields}</div><div class="toolbar"><button class="gold-btn" onclick="submitEditRecord('${table}','${id}')">حفظ التعديل</button><button class="ghost" onclick="closeModal('genericModal')">إلغاء</button></div>`;
  openModal('genericModal');
}
async function submitEditRecord(table,id){
  try{
    const data = {};
    $$('#genericModalBody [data-edit-field]').forEach(el=>{
      let v = el.value;
      if(el.type === 'number') v = Number(v || 0);
      if(el.dataset.editField === 'active') v = v === '1';
      if(el.dataset.editField === 'password' && !v) return;
      if(v === '' && ['client_id','property_id','invoice_id'].includes(el.dataset.editField)) v = null;
      data[el.dataset.editField] = v;
    });
    await api(`${table}/${id}`, {method:'PUT', body:JSON.stringify(data)});
    closeModal('genericModal');
    toast('تم حفظ التعديل');
    await loadAll();
  }catch(e){ toast(e.message, true); }
}
async function invoiceFromContract(contractId){ try{ const due=prompt('تاريخ الاستحقاق YYYY-MM-DD', today()); const desc=prompt('وصف الفاتورة','Rent invoice'); const res=await api('invoice_from_contract',{method:'POST',body:JSON.stringify({contract_id:contractId,due_date:due||today(),description:desc||'Rent invoice'})}); toast('تم إنشاء الفاتورة '+res.item.invoice_no); await loadAll(); showSection('invoices'); }catch(e){toast(e.message,true)} }
async function approveContract(contractId){ try{ if(!confirm('اعتماد العقد سيولد جدول الفواتير الشهرية حسب مدة العقد. هل تريد المتابعة؟')) return; const res=await api('approve_contract',{method:'POST',body:JSON.stringify({contract_id:contractId})}); toast('تم اعتماد العقد وتوليد '+(res.created_invoices||[]).length+' فاتورة'); await loadAll(); showSection('contracts'); }catch(e){toast(e.message,true)} }
async function renewContract(contractId){
  const c = byId('contracts', contractId);
  if(!c.id) return toast('لم يتم العثور على العقد', true);
  const oldStart = c.start_date || today();
  const oldEnd = c.end_date || today();
  const defaultMonths = Math.max(1, Math.round((new Date(oldEnd+'T00:00:00') - new Date(oldStart+'T00:00:00')) / (1000*60*60*24*30)));
  const months = Number(prompt('مدة التجديد بالأشهر', String(defaultMonths)) || 0);
  if(!months || months <= 0) return;
  const newRentRaw = prompt('الإيجار الشهري الجديد OMR (اترك فارغاً للإبقاء على نفس القيمة)', String(c.rent_amount || ''));
  const payload = {contract_id: contractId, months};
  if(newRentRaw && String(newRentRaw).trim()) payload.rent_amount = Number(newRentRaw);
  try{
    const res = await api('renew_contract', {method:'POST', body:JSON.stringify(payload)});
    toast('تم إنشاء عقد التجديد: ' + (res.contract?.contract_no || res.contract?.id));
    await loadAll();
    showSection('contracts');
  }catch(e){ toast(e.message, true); }
}
async function contractDocument(contractId){ try{ const res=await api('contract_template',{method:'POST',body:JSON.stringify({contract_id:contractId})}); const w=window.open('', '_blank'); w.document.write(res.html); w.document.close(); }catch(e){toast(e.message,true)} }

function openPayment(id){ const inv=byId('invoices',id); const remaining=Number(inv.amount)-Number(inv.paid_amount); $('#payInvoiceId').value=id; $('#payAmount').value=remaining.toFixed(2); $('#payInfo').textContent=`${inv.invoice_no} - المتبقي ${money(remaining)}`; openModal('paymentModal'); }
async function submitPayment(){ try{ await api('pay_invoice',{method:'POST',body:JSON.stringify({invoice_id:val('payInvoiceId'),amount:num('payAmount'),method:val('payMethod'),note:val('payNote')})}); closeModal('paymentModal'); toast('تم التحصيل وتحديث الحسابات'); await loadAll(); }catch(e){toast(e.message,true)} }
function printInvoice(id){ const inv=byId('invoices',id), client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id); Jawdah.invoiceForPrint=inv; const rem=Number(inv.amount)-Number(inv.paid_amount); const unit=propertyUnitLine(prop);
  $('#invoicePreview').innerHTML=`<div class="invoice-paper"><div class="head"><div><h1>INVOICE</h1><h2>Quality of Launch</h2><p>Real Estate & Hospitality Services<br>GSM: 96203068 / 92120205<br>C.R: 1466316 | Postal Code: 611 | Sultanate of Oman</p></div><div><h2>${inv.invoice_no}</h2><p>Issue: ${inv.issue_date}<br>Due: ${inv.due_date}<br>Status: ${inv.status}</p></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div><h3>Client</h3><p>${client.name||''}<br>${client.phone||''}<br>${client.email||''}</p></div><div><h3>Contract / Property</h3><p>${contract.contract_no||contract.id||''}<br>${propertyLabel(prop)}<br>${unit?('Unit: '+unit+'<br>'):''}${prop.location||''}</p></div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${inv.description}</td><td>${money(inv.amount)}</td></tr></tbody></table><h3>Total: ${money(inv.amount)}</h3><h3>Paid: ${money(inv.paid_amount)}</h3><h3>Remaining: ${money(rem)}</h3><div style="margin-top:40px;display:flex;justify-content:space-between"><p>Prepared By: __________</p><p>Client Signature: __________</p><p>Company Stamp: __________</p></div></div>`; openModal('invoiceModal'); }
function downloadInvoice(){ const html='<!doctype html><meta charset="utf-8">'+$('#invoicePreview').innerHTML; downloadFile(`invoice-${Jawdah.invoiceForPrint?.invoice_no||'file'}.html`,html,'text/html'); }
function clientStatement(id){ const c=byId('clients',id); const inv=(Jawdah.data.invoices||[]).filter(x=>x.client_id===id); const acc=(Jawdah.data.accounts||[]).filter(x=>x.client_id===id); const total=inv.reduce((s,x)=>s+Number(x.amount||0),0), paid=inv.reduce((s,x)=>s+Number(x.paid_amount||0),0); $('#genericModalBody').innerHTML=`<h2>كشف حساب ${c.name}</h2><p>إجمالي الفواتير: ${money(total)} | المدفوع: ${money(paid)} | المتبقي: ${money(total-paid)}</p>${tableHtml([['رقم','invoice_no'],['تاريخ','issue_date'],['إجمالي','amount',(v)=>money(v)],['مدفوع','paid_amount',(v)=>money(v)],['حالة','status',(v)=>badge(v)]],inv)}<h3>الحركات</h3>${tableHtml([['تاريخ','entry_date'],['نوع','type'],['وصف','description'],['مبلغ','amount',(v)=>money(v)]],acc)}`; openModal('genericModal'); }
function openModal(id){ $('#'+id).classList.add('show'); ensureEnglishDigits($('#'+id)); } function closeModal(id){ $('#'+id).classList.remove('show'); }
async function downloadBackup(){ try{ const res=await api('backup'); downloadFile('jawdah-cloud-backup.json', JSON.stringify(res.backup,null,2), 'application/json'); }catch(e){toast(e.message,true)} }
async function downloadBackupFile(kind, timestamp){
  try{
    const qs=new URLSearchParams({kind});
    if(timestamp) qs.set('timestamp', timestamp);
    const res=await fetch('/api/backup/download?'+qs,{headers:{Authorization:'Bearer '+Jawdah.token}});
    if(!res.ok){ const err=await res.text(); throw new Error(err||'Download failed'); }
    const blob=await res.blob();
    const cd=res.headers.get('Content-Disposition')||'';
    const match=cd.match(/filename="?([^"]+)"?/);
    const name=match?match[1]:`jawdah-backup.${kind==='sqlite'?'sqlite3':'json'}`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('تم تنزيل '+name);
  }catch(e){ toast(e.message,true); }
}
function downloadFile(name,content,type='text/plain'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
async function exportCsv(table){ try{ const res=await fetch('/api/export/'+table,{headers:{Authorization:'Bearer '+Jawdah.token}}); if(!res.ok) throw new Error('Export failed'); const blob=await res.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jawdah-'+table+'.csv'; a.click(); }catch(e){toast(e.message,true)} }
function renderReports(){
  const k=Jawdah.dashboard.kpis; $('#reportsBox').innerHTML=`<div class="kpis grid"><div class="kpi"><span>الإيرادات</span><strong>${money(k.income)}</strong></div><div class="kpi"><span>المصروفات</span><strong>${money(k.expense)}</strong></div><div class="kpi"><span>الصافي</span><strong>${money(k.net)}</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(k.overdue)}</strong></div></div><div class="card"><h3>قرارات تنفيذية</h3>${Jawdah.dashboard.decisions.map(d=>`<p><span class="badge">${d.level}</span> ${d.text}</p>`).join('')}</div>`;
}
async function runQA(){
  const problems=[]; const data=Jawdah.data;
  (data.contracts||[]).forEach(c=>{ if(!byId('properties',c.property_id).id) problems.push('عقد بدون عقار: '+c.id); if(!byId('clients',c.client_id).id) problems.push('عقد بدون عميل: '+c.id); });
  (data.invoices||[]).forEach(i=>{ if(!byId('contracts',i.contract_id).id) problems.push('فاتورة بدون عقد: '+i.invoice_no); if(Number(i.paid_amount)>Number(i.amount)) problems.push('فاتورة مدفوعة أكثر من الإجمالي: '+i.invoice_no); });
  const score=Math.max(0,100-problems.length*10);
  let html=`<div class="kpi"><span>نتيجة الجاهزية</span><strong>${fmt(score)}%</strong></div>${problems.length?problems.map(p=>`<p class="badge overdue">${p}</p>`).join(''):'<p class="badge paid">كل الفحوصات الأساسية ناجحة</p>'}`;
  try{
    const v=await api('backup/verify');
    const vr=v.verification||{};
    html+=`<p class="mini" style="margin-top:12px">فحص النسخ الاحتياطي والاستعادة: ${fmt(vr.score||0)}% — ${vr.ok?'ناجح':'يحتاج مراجعة'}</p>`;
  const failed=(vr.checks||[]).filter(c=>!c.ok);
  if(failed.length) html+=failed.slice(0,8).map(c=>`<p class="badge overdue">${c.name}: ${c.value??''}</p>`).join('');
  else if(vr.latest_backup) html+=`<p class="badge paid">آخر نسخة: ${vr.latest_backup.created_at||vr.latest_backup.timestamp}</p>`;
  }catch(e){ html+=`<p class="badge overdue">تعذر فحص النسخ الاحتياطي: ${e.message}</p>`; }
  $('#qaBox').innerHTML=html;
}
function drawCharts(){ if(!Jawdah.dashboard) return; drawLinePro('incomeChart', Jawdah.dashboard.series.map(x=>x.income)); drawDonutPro('occupancyChart', Jawdah.dashboard.kpis.occupancy); drawBarPro('maintCostChart', Jawdah.dashboard.series.map(x=>x.expense)); if($('#expenseChart')) drawBar('expenseChart', Jawdah.dashboard.series.map(x=>x.expense)); }
function prepCanvas(c){ const r=c.getBoundingClientRect(); c.width=r.width*devicePixelRatio; c.height=r.height*devicePixelRatio; const g=c.getContext('2d'); g.scale(devicePixelRatio,devicePixelRatio); return [g,r.width,r.height]; }
function drawLinePro(id, arr){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const vals=[...arr,1], max=Math.max(...vals)*1.25; g.strokeStyle='rgba(255,255,255,.12)'; for(let i=0;i<4;i++){let y=20+i*(h-50)/3;g.beginPath();g.moveTo(20,y);g.lineTo(w-20,y);g.stroke();} g.beginPath(); arr.forEach((v,i)=>{ const x=24+i*(w-48)/(arr.length-1||1), y=h-28-(v/max)*(h-58); i?g.lineTo(x,y):g.moveTo(x,y); }); g.strokeStyle='#f59e0b'; g.lineWidth=3; g.shadowColor='rgba(245,158,11,.35)'; g.shadowBlur=8; g.stroke(); g.shadowBlur=0; arr.forEach((v,i)=>{ const x=24+i*(w-48)/(arr.length-1||1), y=h-28-(v/max)*(h-58); g.beginPath(); g.fillStyle='#fbbf24'; g.arc(x,y,4,0,Math.PI*2); g.fill(); }); }
function drawDonutPro(id,p){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/2.8; g.lineWidth=16; g.strokeStyle='#e2e8f0'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const pct=Math.max(0,Math.min(100,Number(p||0))); g.strokeStyle='#2563eb'; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(pct/100)); g.stroke(); if(pct<100){ g.strokeStyle='#f59e0b'; g.beginPath(); g.arc(x,y,r,-Math.PI/2+Math.PI*2*(pct/100),-Math.PI/2+Math.PI*2); g.stroke(); } }
function drawBarPro(id,arr){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const max=Math.max(...arr,1)*1.25, colors=['#2563eb','#f59e0b','#ef4444','#3b82f6','#d97706','#64748b']; const bw=(w-50)/arr.length*.55; arr.forEach((v,i)=>{ const x=24+i*(w-50)/arr.length+8, bh=(v/max)*(h-36); g.fillStyle=colors[i%colors.length]; g.fillRect(x,h-22-bh,bw,bh); }); }
function drawLine(id,a,b){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const vals=[...a,...b,1], max=Math.max(...vals)*1.22; const area=(arr,color1,color2)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.lineTo(w-32,h-34); g.lineTo(32,h-34); g.closePath(); const gr=g.createLinearGradient(0,28,0,h-34); gr.addColorStop(0,color1); gr.addColorStop(1,color2); g.fillStyle=gr; g.fill(); }; const plot=(arr,color)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.strokeStyle=color; g.lineWidth=3; g.shadowBlur=0; g.stroke(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); g.beginPath(); g.fillStyle=color; g.arc(x,y,3.5,0,Math.PI*2); g.fill(); }); }; g.strokeStyle='rgba(148,163,184,.12)'; for(let i=0;i<5;i++){let y=24+i*(h-58)/4;g.beginPath();g.moveTo(24,y);g.lineTo(w-24,y);g.stroke();} area(a,'rgba(106,171,158,.18)','rgba(106,171,158,0)'); plot(a,'#6aab9e'); plot(b,'#7eb8d4'); }
function drawDonut(id,p){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/3; g.lineWidth=22; g.lineCap='round'; g.strokeStyle='rgba(148,163,184,.14)'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const gr=g.createLinearGradient(x-r,y-r,x+r,y+r); gr.addColorStop(0,'#9fd4d0'); gr.addColorStop(.5,'#6aab9e'); gr.addColorStop(1,'#4a8580'); g.strokeStyle=gr; g.shadowBlur=0; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*p/100); g.stroke(); g.fillStyle='#e2e8f0'; g.font='700 28px Segoe UI'; g.textAlign='center'; g.fillText(fmt(p)+'%',x,y+6); g.font='13px Segoe UI'; g.fillStyle='rgba(148,163,184,.85)'; g.fillText('Occupancy',x,y+28); }
function drawBar(id,arr){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const max=Math.max(...arr,1)*1.2, bw=(w-60)/arr.length*.65; arr.forEach((v,i)=>{const x=30+i*(w-60)/arr.length+10, bh=(v/max)*(h-50); const grd=g.createLinearGradient(0,h-25-bh,0,h-25); grd.addColorStop(0,'#9fd4d0'); grd.addColorStop(1,'#4a8580'); g.fillStyle=grd; g.shadowBlur=0; g.fillRect(x,h-25-bh,bw,bh);}); }
function initClock(){ setInterval(()=>{ const d=new Date(); $('#clock').textContent=d.toLocaleTimeString('en-US',{hour12:false}); },1000); }
function bind(){
  $('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout; $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open'); $('#globalSearch').oninput=()=>renderAll();
  document.addEventListener('input',e=>ensureEnglishDigits(e.target));
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter' && $('#loginScreen') && !$('#loginScreen').classList.contains('hidden')) login();
    if(e.ctrlKey&&e.key.toLowerCase()==='k'){ e.preventDefault(); $('#globalSearch').focus(); }
    if(e.key==='/' && document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#globalSearch').focus();}
  });
}
window.LAUNCH_QUALITY_CHECK=()=>({system:'Launch Quality LLC',user:Jawdah.user?.username||null,tables:Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,v.length])),dashboard:Jawdah.dashboard});
window.addEventListener('load',()=>{ bind(); initClock(); checkSession(); setInterval(()=>ensureEnglishDigits(),3000); });


/* Launch Quality LLC - production experience layer */
(function(){
  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    oldRenderDashboard && oldRenderDashboard();
    try{
      const banner = document.getElementById('launchBanner');
      if(banner) banner.classList.add('hidden');
    }catch(e){ console.warn('production dashboard layer', e); }
  };
  const oldBuildNav = window.buildNav;
  window.buildNav = function(){
    oldBuildNav && oldBuildNav();
    document.querySelectorAll('#nav button span').forEach(s=>{
      s.innerHTML = s.innerHTML.replace('لوحة التحكم','Command Center');
    });
  };
  const oldCheck = window.JAWDAH_CLOUD_CHECK;
  window.JAWDAH_CLOUD_CHECK = function(){
    const base = oldCheck ? oldCheck() : {};
    return {...base, version:VERSION, theme:'navy-gold-silver-launch-ready', editVerified:true, apiConnected:true};
  };
  window.addEventListener('load',()=>{
    document.title = 'Launch Quality LLC';
    setTimeout(()=>{
      const brandSmall = document.querySelector('.brand small'); if(brandSmall) brandSmall.textContent = VERSION;
      const loginMini = document.querySelector('.login-card .mini'); if(loginMini) loginMini.textContent = 'Real Estate & Hospitality Management System';
    },100);
  });
})();

(function(){
  function sum(arr, fn){ return (arr||[]).reduce((s,x)=>s+Number(fn(x)||0),0); }
  function daysLate(due){ const d = new Date(due+'T00:00:00'); const n = new Date(); return Math.max(0, Math.floor((n-d)/(1000*60*60*24))); }
  function accEngine(){
    const data = Jawdah.data || {};
    const invoices = data.invoices || [], accounts = data.accounts || [], clients = data.clients || [], props = data.properties || [], contracts = data.contracts || [];
    const billed = sum(invoices, x=>x.amount), paid = sum(invoices, x=>x.paid_amount);
    const outstanding = Math.max(0, billed - paid);
    const income = sum(accounts.filter(x=>x.type==='income'), x=>x.amount);
    const expense = sum(accounts.filter(x=>x.type==='expense'), x=>x.amount);
    const activeRent = sum(contracts.filter(x=>String(x.status||'').toLowerCase()==='active'), x=>x.rent_amount);
    const aging = {'0-30':0,'31-60':0,'61-90':0,'90+':0};
    invoices.forEach(inv=>{
      const rem = Math.max(0, Number(inv.amount||0)-Number(inv.paid_amount||0));
      if(!rem) return;
      const late = daysLate(inv.due_date||today());
      if(late<=30) aging['0-30'] += rem; else if(late<=60) aging['31-60'] += rem; else if(late<=90) aging['61-90'] += rem; else aging['90+'] += rem;
    });
    const tenantBalances = clients.map(c=>{
      const inv = invoices.filter(x=>x.client_id===c.id);
      const total = sum(inv,x=>x.amount), p = sum(inv,x=>x.paid_amount), rem = Math.max(0,total-p);
      return {client:c, total, paid:p, outstanding:rem, invoices:inv.length};
    }).sort((a,b)=>b.outstanding-a.outstanding);
    const propertyProfit = props.map(p=>{
      const pinv = invoices.filter(x=>x.property_id===p.id);
      const pacc = accounts.filter(x=>x.property_id===p.id);
      const revenue = sum(pacc.filter(x=>x.type==='income'), x=>x.amount) || sum(pinv,x=>x.paid_amount);
      const cost = sum(pacc.filter(x=>x.type==='expense'), x=>x.amount);
      const billedProp = sum(pinv,x=>x.amount);
      const outstandingProp = Math.max(0, billedProp - sum(pinv,x=>x.paid_amount));
      return {property:p, revenue, cost, net:revenue-cost, outstanding:outstandingProp};
    }).sort((a,b)=>b.net-a.net);
    const collectionRate = billed ? Math.round((paid/billed)*100) : 0;
    const profitMargin = income ? Math.round(((income-expense)/income)*100) : 0;
    return {billed, paid, outstanding, income, expense, net:income-expense, activeRent, collectionRate, profitMargin, aging, tenantBalances, propertyProfit};
  }
  function miniKpi(label, value, hint=''){
    return `<div class="kpi"><span>${label}</span><strong>${value}</strong>${hint?`<small class="mini">${hint}</small>`:''}</div>`;
  }
  window.renderAccounts = function(){
    const e = accEngine();
    fillSelect('#accClient', Jawdah.data.clients||[], true);
    fillSelect('#accProperty', Jawdah.data.properties||[], true);
    const exec = document.getElementById('accountingExecutive');
    if(exec){
      exec.innerHTML = [
        miniKpi('إجمالي الفواتير', money(e.billed)),
        miniKpi('التحصيل', money(e.paid), `${fmt(e.collectionRate)}%`),
        miniKpi('الذمم المدينة', money(e.outstanding)),
        miniKpi('صافي الربح', money(e.net), `هامش ${fmt(e.profitMargin)}%`),
        miniKpi('المصروفات', money(e.expense)),
        miniKpi('إيجار العقود النشطة', money(e.activeRent))
      ].join('');
    }
    const summary = document.getElementById('accountSummary');
    if(summary) summary.innerHTML = `<span class="badge">Income: ${money(e.income)}</span><span class="badge">Expense: ${money(e.expense)}</span><span class="badge paid">Net: ${money(e.net)}</span><span class="badge overdue">Outstanding: ${money(e.outstanding)}</span>`;
    const aging = document.getElementById('agingBox');
    if(aging) aging.innerHTML = `<div class="aging-grid">${Object.entries(e.aging).map(([k,v])=>`<div class="aging-card"><b>${k}</b><strong>${money(v)}</strong></div>`).join('')}</div>`;
    const tenant = document.getElementById('tenantBalanceBox');
    if(tenant) tenant.innerHTML = tableHtml([['المستأجر','client',(v,r)=>r.client.name],['الفواتير','invoices',(v)=>fmt(v)],['إجمالي','total',(v)=>money(v)],['مدفوع','paid',(v)=>money(v)],['متبقي','outstanding',(v)=>money(v)]], e.tenantBalances.slice(0,8), r=>`<button class="ghost" onclick="clientStatement('${r.client.id}')">كشف</button>`);
    const profit = document.getElementById('propertyProfitBox');
    if(profit) profit.innerHTML = tableHtml([['العقار','property',(v,r)=>r.property.name],['إيراد','revenue',(v)=>money(v)],['مصروف','cost',(v)=>money(v)],['صافي','net',(v)=>money(v)],['متبقي','outstanding',(v)=>money(v)]], e.propertyProfit.slice(0,8));
    const rows = filterRows('accounts',['entry_date','type','category','description','amount']);
    const tbl = document.getElementById('accountsTable');
    if(tbl) tbl.innerHTML = tableHtml([['التاريخ','entry_date'],['النوع','type'],['التصنيف','category'],['الوصف','description'],['العميل','client_id',(v)=>byId('clients',v).name||''],['العقار','property_id',(v)=>byId('properties',v).name||''],['الفاتورة','invoice_id',(v)=>byId('invoices',v).invoice_no||''],['المبلغ','amount',(v)=>money(v)]], rows, r=>`<button class="ghost" onclick="editRecord('accounts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('accounts','${r.id}')">حذف</button>`);
    drawBar('expenseChart',(Jawdah.dashboard?.series||[]).map(x=>x.expense));
    ensureEnglishDigits(document.getElementById('sec-accounts'));
  };
  window.renderReports = function(){
    const e = accEngine();
    const risks = [];
    if(e.outstanding>0) risks.push(`متابعة ذمم مدينة بقيمة ${money(e.outstanding)}`);
    if(e.collectionRate<85) risks.push(`نسبة التحصيل ${fmt(e.collectionRate)}% وتحتاج رفع قبل إقفال الشهر`);
    if(e.expense>e.income*0.55 && e.income>0) risks.push('المصروفات مرتفعة مقارنة بالإيرادات');
    const html = `
      <div class="kpis grid">
        ${miniKpi('إيرادات', money(e.income))}
        ${miniKpi('مصروفات', money(e.expense))}
        ${miniKpi('صافي الربح', money(e.net))}
        ${miniKpi('التحصيل', fmt(e.collectionRate)+'%')}
        ${miniKpi('ذمم مدينة', money(e.outstanding))}
        ${miniKpi('إيجار متوقع', money(e.activeRent))}
      </div>
      <div class="layout">
        <div class="card"><h3>أعمار الذمم المدينة</h3><div class="aging-grid">${Object.entries(e.aging).map(([k,v])=>`<div class="aging-card"><b>${k}</b><strong>${money(v)}</strong></div>`).join('')}</div></div>
        <div class="card"><h3>قرارات مالية</h3>${(risks.length?risks:['الوضع المالي مستقر حسب البيانات الحالية']).map(x=>`<p><span class="badge">Finance</span> ${x}</p>`).join('')}</div>
      </div>
      <div class="card"><h3>ربحية العقارات</h3>${tableHtml([['العقار','property',(v,r)=>r.property.name],['إيراد','revenue',(v)=>money(v)],['مصروف','cost',(v)=>money(v)],['صافي','net',(v)=>money(v)],['ذمم','outstanding',(v)=>money(v)]], e.propertyProfit)}</div>
      <div class="card"><h3>أرصدة المستأجرين</h3>${tableHtml([['المستأجر','client',(v,r)=>r.client.name],['إجمالي','total',(v)=>money(v)],['مدفوع','paid',(v)=>money(v)],['متبقي','outstanding',(v)=>money(v)]], e.tenantBalances)}</div>`;
    const box = document.getElementById('reportsBox'); if(box) box.innerHTML = html;
    ensureEnglishDigits(box);
  };
  window.downloadFinancialReport = function(){
    const e = accEngine();
    const html = `<!doctype html><meta charset="utf-8"><title>Launch Quality LLC Financial Report</title><body style="font-family:Arial;direction:rtl"><h1>Launch Quality LLC - التقرير المالي</h1><p>Income: ${money(e.income)} | Expense: ${money(e.expense)} | Net: ${money(e.net)} | Collection: ${fmt(e.collectionRate)}%</p><h2>أعمار الذمم</h2><ul>${Object.entries(e.aging).map(([k,v])=>`<li>${k}: ${money(v)}</li>`).join('')}</ul></body>`;
    downloadFile('launch-quality-financial-report.html', html, 'text/html');
  };
  const oldCheck = window.LAUNCH_QUALITY_CHECK;
  window.LAUNCH_QUALITY_CHECK = function(){ const base = oldCheck ? oldCheck() : {}; return {...base, status:'accounting-ready', accounting:accEngine()}; };
})();


(function(){
  const financeItems=[['purchases','فواتير المشتريات','🧾'],['revenues','الإيرادات','💎'],['statements','قائمة الدخل والميزانية','📘'],['payroll','الرواتب','👔'],['admin-expenses','مصاريف إدارية وعمومية','🏢'],['inventory','المخزن','📦'],['bank','كشف البنك','🏦'],['chart-accounts','دليل الحسابات','📒'],['bank-reconciliation','تسوية البنك','⚖️'],['financial-periods','الفترات المالية','📅']];
  const baseSections=[['dashboard','لوحة التحكم','🏛️'],['properties','العقارات','🏠'],['clients','العملاء','👥'],['contracts','العقود والتجديد','📑'],['invoices','الفواتير','🧾'],['accounts','الحسابات','💰'],...financeItems,['maintenance','الصيانة','🔧'],['reports','التقارير','📊'],['users','المستخدمين','🛡️'],['backup','التخزين والنسخ','💾'],['qa','اختبار التشغيل','✅']];
  buildNav=function(){ const nav=$('#nav'); nav.innerHTML=''; baseSections.forEach(([id,label,icon])=>{ if(id==='users'&&Jawdah.user.role!=='admin')return; const b=document.createElement('button'); b.dataset.section=id; b.innerHTML=`<span>${icon} ${label}</span><small>›</small>`; b.onclick=()=>showSection(id); nav.appendChild(b); }); };
  const oldPopulate=populateSelects;
  populateSelects=function(){ oldPopulate(); const propOpts='<option value="">بدون عقار</option>'+(Jawdah.data.properties||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); ['#piProperty','#revProperty','#gaProperty'].forEach(s=>{if($(s))$(s).innerHTML=propOpts}); const clientOpts='<option value="">بدون عميل</option>'+(Jawdah.data.clients||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); if($('#revClient'))$('#revClient').innerHTML=clientOpts; const itemOpts=(Jawdah.data.inventory_items||[]).map(i=>`<option value="${i.id}">${i.sku} - ${i.name}</option>`).join(''); if($('#stockItem'))$('#stockItem').innerHTML=itemOpts; const accOpts='<option value="">غير مطابق</option>'+(Jawdah.data.accounts||[]).map(a=>`<option value="${a.id}">${a.entry_date} - ${a.category} - ${money(a.amount)}</option>`).join(''); if($('#bankMatch'))$('#bankMatch').innerHTML=accOpts; const coaParentOpts='<option value="">بدون حساب أب</option>'+(Jawdah.data.chart_accounts||[]).map(a=>`<option value="${a.code}">${a.code} - ${a.name}</option>`).join(''); if($('#coaParent'))$('#coaParent').innerHTML=coaParentOpts; const periodOpts=(Jawdah.data.financial_periods||[]).filter(p=>String(p.status||'').toLowerCase()==='open').map(p=>`<option value="${p.period_name}">${p.period_name}</option>`).join(''); if($('#recPeriod')&&$('#recPeriod').tagName==='SELECT') $('#recPeriod').innerHTML=periodOpts||'<option value="">لا توجد فترة مفتوحة</option>'; ['piDate','revDate','salDate','gaDate','stockDate','bankDate','fpStart','fpEnd'].forEach(id=>{if($('#'+id)&&!$('#'+id).value)$('#'+id).value=today()}); if($('#salMonth')&&!$('#salMonth').value)$('#salMonth').value=today().slice(0,7); if($('#recPeriod')&&$('#recPeriod').tagName==='INPUT'&&!$('#recPeriod').value)$('#recPeriod').value=today().slice(0,7); };
  const oldRenderAll=renderAll;
  renderAll=function(){ oldRenderAll(); populateSelects(); renderFinanceSuite(); };
  function safe(rows){return Array.isArray(rows)?rows:[]}
  window.renderFinanceSuite=function(){ renderPurchaseInvoices(); renderRevenues(); renderSalaries(); renderAdminExpenses(); renderInventory(); renderBank(); renderChartAccounts(); renderBankReconciliations(); renderFinancialPeriods(); renderFinanceHero(); };
  window.renderFinanceHero=function(){ const k=Jawdah.dashboard?.kpis||{}; const host=$('#accountingExecutive'); if(host){ host.innerHTML=`<div class="kpi"><span>فواتير مشتريات مستحقة</span><strong>${money(k.purchases_due||0)}</strong></div><div class="kpi"><span>الرواتب</span><strong>${money(k.payroll||0)}</strong></div><div class="kpi"><span>قيمة المخزون</span><strong>${money(k.inventory_value||0)}</strong></div><div class="kpi"><span>رصيد البنك</span><strong>${money(k.bank_balance||0)}</strong></div>`; }};
  window.renderPurchaseInvoices=function(){ const rows=safe(Jawdah.data.purchase_invoices); if($('#purchaseInvoicesTable')) $('#purchaseInvoicesTable').innerHTML=tableHtml([['رقم','purchase_no'],['المورد','supplier'],['التاريخ','invoice_date'],['التصنيف','category'],['الإجمالي','amount',v=>money(v)],['المدفوع','paid_amount',v=>money(v)],['الحالة','status',v=>badge(v)]],rows); };
  window.renderRevenues=function(){ const rows=safe(Jawdah.data.revenues); if($('#revenuesTable')) $('#revenuesTable').innerHTML=tableHtml([['رقم','revenue_no'],['التاريخ','revenue_date'],['المصدر','source'],['التصنيف','category'],['الوصف','description'],['المبلغ','amount',v=>money(v)]],rows); };
  window.renderSalaries=function(){ const rows=safe(Jawdah.data.salaries); if($('#salariesTable')) $('#salariesTable').innerHTML=tableHtml([['الموظف','employee_name'],['الشهر','salary_month'],['أساسي','basic_salary',v=>money(v)],['بدلات','allowances',v=>money(v)],['استقطاعات','deductions',v=>money(v)],['الصافي','net_salary',v=>money(v)],['الحالة','status',v=>badge(v)]],rows); };
  window.renderAdminExpenses=function(){ const rows=safe(Jawdah.data.admin_expenses); if($('#adminExpensesTable')) $('#adminExpensesTable').innerHTML=tableHtml([['التاريخ','expense_date'],['التصنيف','category'],['الوصف','description'],['المورد','supplier'],['العقار','property_id',v=>byId('properties',v).name||''],['المبلغ','amount',v=>money(v)]],rows); };
  window.renderInventory=function(){ const rows=safe(Jawdah.data.inventory_items); if($('#inventoryTable')) $('#inventoryTable').innerHTML=tableHtml([['SKU','sku'],['الصنف','name'],['التصنيف','category'],['الكمية','quantity',v=>fmt(v)],['الحد الأدنى','min_quantity',v=>fmt(v)],['تكلفة الوحدة','unit_cost',v=>money(v)],['القيمة','id',(_,r)=>money(Number(r.quantity||0)*Number(r.unit_cost||0))],['الحالة','id',(_,r)=>Number(r.quantity||0)<=Number(r.min_quantity||0)?'<span class="low-stock">إعادة طلب</span>':'<span class="linked-ok">جيد</span>']],rows); };
  window.renderBank=function(){ const rows=safe(Jawdah.data.bank_transactions); if($('#bankTable')) $('#bankTable').innerHTML=tableHtml([['التاريخ','bank_date'],['البنك','bank_name'],['المرجع','reference'],['النوع','type'],['الوصف','description'],['المبلغ','amount',v=>money(v)],['المطابقة','status',v=>badge(v)]],rows); };
  const coaTypeLabel = t=>({Asset:'أصول',Liability:'خصوم',Equity:'حقوق ملكية',Revenue:'إيرادات',Expense:'مصروفات'}[t]||t);
  const coaTypeClass = t=>String(t||'').toLowerCase();
  window.renderChartAccounts=function(){
    const rows=safe(Jawdah.data.chart_accounts).slice().sort((a,b)=>String(a.code).localeCompare(String(b.code)));
    const summary=$('#coaSummary');
    if(summary){
      const byType={};
      rows.forEach(r=>{ const t=r.type||'Other'; byType[t]=(byType[t]||0)+1; });
      summary.innerHTML=Object.entries(byType).map(([t,n])=>`<span class="badge coa-${coaTypeClass(t)}">${coaTypeLabel(t)}: ${fmt(n)}</span>`).join(' ');
    }
    if($('#chartAccountsTable')) $('#chartAccountsTable').innerHTML=tableHtml([['الرمز','code'],['الاسم','name'],['النوع','type',v=>`<span class="badge coa-${coaTypeClass(v)}">${coaTypeLabel(v)}</span>`],['الأب','parent_code',v=>v||'—'],['نشط','active',v=>v?'<span class="linked-ok">نعم</span>':'لا'],['ملاحظات','notes']],rows,r=>canWriteFinance()?`<button class="ghost" onclick="editRecord('chart_accounts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('chart_accounts','${r.id}')">حذف</button>`:'<span class="mini">عرض فقط</span>');
  };
  window.renderBankReconciliations=function(){
    const rows=safe(Jawdah.data.bank_reconciliations);
    if($('#bankReconciliationsTable')) $('#bankReconciliationsTable').innerHTML=tableHtml([['البنك','bank_name'],['الفترة','period_name'],['رصيد الدفاتر','book_balance',v=>money(v)],['رصيد البنك','bank_balance',v=>money(v)],['الفرق','difference',v=>money(v)],['الحالة','status',v=>badge(v)],['بواسطة','reconciled_by'],['التاريخ','reconciled_at']],rows,r=>canWriteFinance()?`<button class="ghost" onclick="editRecord('bank_reconciliations','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('bank_reconciliations','${r.id}')">حذف</button>`:'');
  };
  window.renderFinancialPeriods=function(){
    const rows=safe(Jawdah.data.financial_periods);
    if($('#financialPeriodsTable')) $('#financialPeriodsTable').innerHTML=tableHtml([['الفترة','period_name'],['البداية','start_date'],['النهاية','end_date'],['الحالة','status',v=>badge(v)],['أغلق بواسطة','closed_by'],['تاريخ الإغلاق','closed_at'],['ملاحظات','notes']],rows,r=>canWriteFinance()?`<button class="ghost" onclick="editRecord('financial_periods','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('financial_periods','${r.id}')">حذف</button>`:'');
  };
  function canWriteFinance(){ return Jawdah.user && ['admin','accountant'].includes(Jawdah.user.role); }
  function updateRecDifference(){
    const book=num('recBookBalance'), bank=num('recBankBalance');
    const diff=book-bank;
    const el=$('#recDifference'); if(el) el.value=diff.toFixed(3);
    const preview=$('#reconciliationPreview');
    if(preview) preview.innerHTML=`<span class="badge ${Math.abs(diff)<0.001?'paid':'overdue'}">الفرق: ${money(diff)}</span><span class="badge">${Math.abs(diff)<0.001?'متطابق':'يحتاج مراجعة'}</span>`;
  }
  window.previewBankReconciliation=async function(){
    try{
      const bank=val('recBank')||'Main Bank';
      const period=val('recPeriod');
      const q=new URLSearchParams({bank_name:bank, period_name:period}).toString();
      const res=await api('bank_reconciliation_preview?'+q);
      if($('#recBookBalance')) $('#recBookBalance').value=Number(res.book_balance||0).toFixed(3);
      if($('#recBank')&&!val('recBank')) $('#recBank').value=bank;
      const preview=$('#reconciliationPreview');
      if(preview) preview.innerHTML=`<span class="badge">حركات البنك: ${fmt(res.transaction_count||0)}</span><span class="badge">رصيد الدفاتر: ${money(res.book_balance||0)}</span>`;
      updateRecDifference();
      toast('تم حساب رصيد الدفاتر');
    }catch(e){ toast(e.message,true); }
  };
  window.createBankReconciliation=async function(){
    try{
      if(!val('recBank')) return toast('أدخل اسم البنك', true);
      if(!num('recBookBalance')) await previewBankReconciliation();
      const book=num('recBookBalance'), bank=num('recBankBalance');
      const diff=book-bank;
      await postTable('bank_reconciliations',{
        bank_name:val('recBank'),
        period_name:val('recPeriod')||today().slice(0,7),
        book_balance:book,
        bank_balance:bank,
        difference:diff,
        status:Math.abs(diff)<0.001?'Reconciled':'Variance',
        reconciled_by:Jawdah.user?.name||Jawdah.user?.username||'System',
        reconciled_at:new Date().toISOString(),
        notes:val('recNotes')
      });
    }catch(e){ toast(e.message,true); }
  };
  window.createChartAccount=()=>postTable('chart_accounts',{code:val('coaCode'),name:val('coaName'),type:val('coaType')||'Expense',parent_code:val('coaParent')||null,active:1,notes:val('coaNotes')});
  window.createFinancialPeriod=()=>postTable('financial_periods',{period_name:val('fpName'),start_date:val('fpStart')||today(),end_date:val('fpEnd')||today(),status:val('fpStatus')||'Open',closed_by:null,closed_at:null,notes:val('fpNotes')});
  async function postTable(table, data){ await api(table,{method:'POST',body:JSON.stringify(data)}); toast('تم الحفظ'); await loadAll(); }
  window.createPurchaseInvoice=()=>postTable('purchase_invoices',{supplier:val('piSupplier'),invoice_date:val('piDate')||today(),due_date:val('piDue'),category:val('piCategory')||'Purchases',description:val('piDesc'),amount:num('piAmount'),paid_amount:num('piPaid'),status:num('piPaid')>=num('piAmount')?'Paid':(num('piPaid')>0?'Partial':'Pending'),property_id:val('piProperty')||null});
  window.createRevenue=()=>postTable('revenues',{revenue_date:val('revDate')||today(),source:val('revSource')||'Other',category:val('revCategory')||'Other Revenue',description:val('revDesc'),amount:num('revAmount'),client_id:val('revClient')||null,property_id:val('revProperty')||null});
  window.createSalary=()=>{const basic=num('salBasic'),allow=num('salAllow'),ded=num('salDeduct'); return postTable('salaries',{employee_name:val('salEmployee'),salary_month:val('salMonth')||today().slice(0,7),basic_salary:basic,allowances:allow,deductions:ded,net_salary:basic+allow-ded,status:val('salStatus'),payment_date:val('salDate')||today()});};
  window.createAdminExpense=()=>postTable('admin_expenses',{expense_date:val('gaDate')||today(),category:val('gaCategory')||'General & Administrative',description:val('gaDesc'),amount:num('gaAmount'),supplier:val('gaSupplier'),property_id:val('gaProperty')||null});
  window.createInventoryItem=()=>postTable('inventory_items',{sku:val('itemSku'),name:val('itemName'),category:val('itemCategory'),unit:val('itemUnit')||'pcs',quantity:num('itemQty'),min_quantity:num('itemMin'),unit_cost:num('itemCost'),location:val('itemLocation')});
  window.createInventoryTransaction=()=>postTable('inventory_transactions',{item_id:val('stockItem'),tx_date:val('stockDate')||today(),tx_type:val('stockType'),quantity:num('stockQty'),unit_cost:num('stockCost'),reference:val('stockRef')});
  window.createBankTransaction=()=>postTable('bank_transactions',{bank_date:val('bankDate')||today(),bank_name:val('bankName')||'Main Bank',reference:val('bankRef'),type:val('bankType'),description:val('bankDesc'),amount:num('bankAmount'),matched_account_id:val('bankMatch')||null,status:val('bankMatch')?'Matched':'Unmatched'});
  window.loadFinancialStatements=async function(){ try{ const res=await api('financial_statements'); const s=res.statements; $('#statementsBox').innerHTML=`<div class="statement-grid"><div class="statement-card"><h3>قائمة الدخل</h3><div class="statement-row"><span>الإيرادات</span><b>${money(s.income_statement.revenue)}</b></div><div class="statement-row"><span>المصروفات</span><b>${money(s.income_statement.expenses)}</b></div><div class="statement-row"><span>الرواتب</span><b>${money(s.income_statement.payroll)}</b></div><div class="statement-row"><span>إدارية وعمومية</span><b>${money(s.income_statement.general_admin)}</b></div><div class="statement-row"><span>صافي الدخل</span><b>${money(s.income_statement.net_income)}</b></div></div><div class="statement-card"><h3>الميزانية</h3><div class="statement-row"><span>البنك</span><b>${money(s.balance_sheet.assets.cash_bank)}</b></div><div class="statement-row"><span>الذمم المدينة</span><b>${money(s.balance_sheet.assets.accounts_receivable)}</b></div><div class="statement-row"><span>المخزون</span><b>${money(s.balance_sheet.assets.inventory)}</b></div><div class="statement-row"><span>الذمم الدائنة</span><b>${money(s.balance_sheet.liabilities.accounts_payable)}</b></div><div class="statement-row"><span>الأرباح المحتجزة</span><b>${money(s.balance_sheet.equity.retained_earnings)}</b></div></div><div class="statement-card"><h3>ربط التخزين</h3><p class="linked-ok">Backup / CSV / Restore يشمل الجداول المالية الجديدة.</p><p>${s.linked_storage.tables.join(' · ')}</p></div></div>`; ensureEnglishDigits($('#statementsBox')); }catch(e){toast(e.message,true)} };
  const oldBackup=renderBackup;
  renderBackup=function(){ oldBackup(); const extra=['purchase_invoices','revenues','salaries','admin_expenses','inventory_items','inventory_transactions','bank_transactions','chart_accounts','bank_reconciliations','financial_periods']; const box=$('#backupStatus'); if(box) box.innerHTML += `<p class="mini">يشمل التخزين المالي: ${extra.join(', ')}</p>`; };
  document.addEventListener('input', e=>{ if(e.target && e.target.id==='recBankBalance') updateRecDifference(); });
})();


(function(){
  const oldShow = showSection;
  showSection=function(id){
    oldShow(id);
    const titles={production:'جاهزية التشغيل المؤسسي'};
    if(titles[id]) $('#sectionTitle').textContent=titles[id];
  };
  const oldBuild = buildNav;
  buildNav=function(){
    oldBuild();
    const nav=$('#nav');
    if(nav && !nav.querySelector('[data-section="production"]')){
      const b=document.createElement('button');
      b.dataset.section='production';
      b.innerHTML='<span>🏁 جاهزية التشغيل</span><small>›</small>';
      b.onclick=()=>showSection('production');
      nav.appendChild(b);
    }
  };
  const oldRenderAll2=renderAll;
  renderAll=function(){ oldRenderAll2(); renderProductionUsers(); };
  window.renderProductionUsers=function(){
    const users=Jawdah.data.users||[];
    const required=['admin','razan.accounting','operations','maintenance'];
    const host=$('#productionUsersBox');
    if(!host) return;
    host.innerHTML=required.map(u=>{
      const row=users.find(x=>x.username===u);
      const role=row?roleName(row.role):'غير موجود';
      return `<div class="statement-row"><span>${u}</span><b>${row?role:'يحتاج إضافة'}</b></div>`;
    }).join('');
  };
  window.loadProductionStatus=async function(){
    try{
      const res=await api('production_status');
      const alerts=res.alerts||{};
      const box=$('#productionStatusBox');
      box.innerHTML=`<div class="kpis grid"><div class="kpi"><span>نتيجة الجاهزية</span><strong>${fmt(res.score)}%</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(alerts.overdue||0)}</strong></div><div class="kpi"><span>تنبيهات المخزون</span><strong>${fmt(alerts.low_stock||0)}</strong></div><div class="kpi"><span>روابط غير سليمة</span><strong>${fmt((alerts.broken_contract_links||0)+(alerts.broken_invoice_links||0))}</strong></div></div><div class="card inner-card"><h3>فحوصات الجاهزية</h3>${(res.checks||[]).map(c=>`<div class="statement-row"><span>${c.name}</span><b class="${c.ok?'linked-ok':'low-stock'}">${c.ok?'جاهز':'يحتاج مراجعة'} · ${fmt(c.value)}</b></div>`).join('')}</div>`;
      ensureEnglishDigits(box);
    }catch(e){toast(e.message,true)}
  };
})();
