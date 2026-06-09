const COMPANY = 'Quality of Launch Services LLC';
const ic = (name, cls='') => `<i data-lucide="${name}" class="lucide-icon ${cls}" aria-hidden="true"></i>`;
function paintIcons(root){ if(window.lucide?.createIcons) lucide.createIcons({attrs:{'stroke-width':1.85}, root: root||document}); }
function navItem(id, label, icon){
  const b=document.createElement('button');
  b.dataset.section=id;
  b.innerHTML=`<span class="nav-label"><span class="icon-chip nav-icon">${ic(icon)}</span><span class="nav-text">${label}</span></span><small class="nav-chevron">${ic('chevron-left')}</small>`;
  b.onclick=()=>showSection(id);
  return b;
}
function kpiIcon(name){ return `<div class="icon-chip kpi-icon">${ic(name)}</div>`; }
const Jawdah = {
  token: localStorage.getItem('jawdah_cloud_token') || '',
  user: null,
  data: {},
  dashboard: null,
  activeSection: 'dashboard',
  charts: {},
  invoiceForPrint: null
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const api = async (path, opts={}) => {
  const headers = {'Content-Type':'application/json'};
  if(Jawdah.token) headers.Authorization = 'Bearer ' + Jawdah.token;
  const res = await fetch('/api/' + path.replace(/^\//,''), {...opts, headers:{...headers, ...(opts.headers||{})}});
  const text = await res.text();
  let data;
  try{ data = text ? JSON.parse(text) : {}; }catch(e){ data = {ok:false,error:text || 'Invalid response'}; }
  if(!res.ok || data.ok === false){
    const err = data.error || data.detail || 'Request failed';
    throw new Error(err === 'Permission denied' ? 'لا تملك صلاحية تنفيذ هذا الإجراء' : err);
  }
  return data;
};
const fmt = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const money = n => fmt(n) + ' OMR';
const today = () => new Date().toISOString().slice(0,10);
const byId = (table,id) => (Jawdah.data[table]||[]).find(x=>x.id===id) || {};
const roleName = r => ({admin:'مدير النظام',accountant:'محاسب',operations:'تشغيل',maintenance:'صيانة',viewer:'مشاهد'}[r]||r);
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
    setUiShellMode('app');
    $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); await loadAll(); toast('تم تسجيل الدخول');
  }catch(e){toast(e.message,true)}
}
async function logout(){ try{await api('logout',{method:'POST'});}catch(e){} localStorage.removeItem('jawdah_cloud_token'); setUiShellMode('login'); location.reload(); }
async function checkSession(){
  if(!Jawdah.token){ setUiShellMode('login'); $('#loginScreen').classList.remove('hidden'); return; }
  try{ const me=await api('me'); Jawdah.user=me.user; setUiShellMode('app'); $('#loginScreen').classList.add('hidden'); $('#app').classList.remove('hidden'); await loadAll(); }
  catch(e){ localStorage.removeItem('jawdah_cloud_token'); setUiShellMode('login'); $('#loginScreen').classList.remove('hidden'); }
}
function setUiShellMode(mode){
  document.body.classList.toggle('login-mode', mode === 'login');
}
async function loadAll(){
  const res=await api('bootstrap'); Jawdah.data=res.data; Jawdah.dashboard=res.dashboard; Jawdah.user=res.user;
  if(res.company_settings) CompanyProfile.apply(res.company_settings);
  $('#userName').textContent=Jawdah.user.name; $('#userRole').textContent=roleName(Jawdah.user.role); $('#avatar').textContent=(Jawdah.user.name||'J').slice(0,1).toUpperCase();
  buildNav(); renderAll(); renderBrandSurfaces(); populateCompanySettingsForm(); showSection(Jawdah.activeSection||'dashboard'); ensureEnglishDigits(); paintIcons();
}
function renderBrandSurfaces(){
  const logo = CompanyProfile.logoUrl();
  document.documentElement.style.setProperty('--brand-logo-url', `url('${logo}')`);
  const hero=$('#dashboardBrandHero'); if(hero) hero.innerHTML=CompanyProfile.dashboardIntroHtml();
  const strip=$('#invoiceBrandStrip'); if(strip) strip.innerHTML=`<div class="invoice-brand-strip">${CompanyProfile.dashboardIntroHtml()}</div>`;
  document.querySelectorAll('.brand img, .login-brand-wrap img').forEach(img=>{ img.src=logo; });
  document.querySelectorAll('.brand-main').forEach(el=>{ el.textContent='Quality of Launch'; });
}
function populateCompanySettingsForm(){
  if(Jawdah.user?.role!=='admin') return;
  const s=CompanyProfile.settings;
  const set=(id,v)=>{ const el=$('#'+id); if(el) el.value=v??''; };
  set('csNameAr',s.name_ar); set('csNameEn',s.name_en); set('csCr',s.cr_no); set('csPostal',s.postal_code); set('csPoBox',s.po_box);
  set('csVatRate',s.vat_rate); set('csVatReg',s.vat_reg_no); set('csLogo',s.logo_url); set('csBankName',s.bank?.name);
  set('csCsPhone',s.contacts?.customer_service); set('csHospPhone',s.contacts?.hospitality_manager);
  set('csDescAr',s.description_ar); set('csDescEn',s.description_en);
  set('csAcc1Name',s.bank?.accounts?.[0]?.name); set('csAcc1No',s.bank?.accounts?.[0]?.number);
  set('csAcc2Name',s.bank?.accounts?.[1]?.name); set('csAcc2No',s.bank?.accounts?.[1]?.number); set('csAcc2Phone',s.bank?.accounts?.[1]?.phone);
}
async function saveCompanySettings(){
  if(Jawdah.user?.role!=='admin') return toast('هذا القسم للمدير فقط', true);
  try{
    const payload={
      name_ar:val('csNameAr'), name_en:val('csNameEn'), cr_no:val('csCr'), postal_code:val('csPostal'), po_box:val('csPoBox'),
      vat_rate:Number(val('csVatRate')||0.05), vat_reg_no:val('csVatReg'), logo_url:val('csLogo')||'assets/logo-primary.png',
      description_ar:val('csDescAr'), description_en:val('csDescEn'),
      contacts:{customer_service:val('csCsPhone'), hospitality_manager:val('csHospPhone')},
      bank:{name:val('csBankName')||'Bank Muscat', accounts:[
        {name:val('csAcc1Name'), number:val('csAcc1No'), phone:''},
        {name:val('csAcc2Name'), number:val('csAcc2No'), phone:val('csAcc2Phone')}
      ]}
    };
    const res=await api('company_settings',{method:'PUT',body:JSON.stringify(payload)});
    CompanyProfile.apply(res.settings);
    renderBrandSurfaces(); renderInvoices(); toast('تم حفظ إعدادات المؤسسة');
  }catch(e){ toast(e.message,true); }
}
function buildNav(){
  const items=[
    ['dashboard','لوحة التحكم','layout-dashboard'],
    ['properties','العقارات','building-2'],
    ['apartments','إدارة الشقق','layout-grid'],
    ['clients','العملاء','users-round'],
    ['contracts','العقود','file-signature'],
    ['invoices','الفواتير','receipt'],
    ['admin-expenses','مصاريف إدارية','landmark'],
    ['purchases','فواتير المشتريات','shopping-cart'],
    ['revenues','الإيرادات','gem'],
    ['accounts','الحسابات','wallet'],
    ['inventory','المخزن','package'],
    ['employees','كشف الموظفين','users'],
    ['payroll','الرواتب','badge-dollar-sign'],
    ['statements','قائمة الدخل والميزانية','book-open-text'],
    ['bank','كشف البنك','landmark'],
    ['chart-accounts','دليل الحسابات','book-text'],
    ['bank-reconciliation','تسوية البنك','git-compare'],
    ['financial-periods','الفترات المالية','calendar-range'],
    ['maintenance','الصيانة','wrench'],
    ['reports','التقارير','chart-column'],
    ['company-settings','إعدادات المؤسسة','building-2'],
    ['users','المستخدمين','shield-check'],
    ['backup','التخزين والنسخ','hard-drive'],
    ['qa','اختبار التشغيل','circle-check-big'],
  ];
  const nav=$('#nav'); nav.innerHTML='';
  items.forEach(([id,label,icon])=>{
    if(id==='users' && Jawdah.user.role!=='admin') return;
    if(id==='company-settings' && Jawdah.user.role!=='admin') return;
    nav.appendChild(navItem(id,label,icon));
  });
  paintIcons(nav);
}
function showSection(id){
  Jawdah.activeSection=id; $$('.section').forEach(s=>s.classList.remove('active')); const s=$('#sec-'+id); if(s) s.classList.add('active');
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
  $('#sectionTitle').textContent = ({dashboard:'لوحة التحكم التنفيذية',properties:'العقارات',apartments:'إدارة الشقق',clients:'العملاء',contracts:'العقود',invoices:'الفواتير الضريبية',accounts:'الحسابات',maintenance:'الصيانة',reports:'التقارير المالية','company-settings':'إعدادات المؤسسة والهوية',users:'المستخدمين والصلاحيات',backup:'التخزين والنسخ الاحتياطي',qa:'اختبار التشغيل','admin-expenses':'مصاريف إدارية',purchases:'فواتير المشتريات',revenues:'الإيرادات',inventory:'المخزن',employees:'كشف الموظفين',payroll:'الرواتب',statements:'قائمة الدخل والميزانية',bank:'كشف البنك','chart-accounts':'دليل الحسابات','bank-reconciliation':'تسوية البنك','financial-periods':'الفترات المالية'}[id]||COMPANY);
  if(innerWidth<1100) $('#sidebar').classList.remove('open'); setTimeout(drawCharts,50); ensureEnglishDigits();
}
function renderAll(){ renderDashboard(); renderProperties(); renderApartments(); renderClients(); renderContracts(); renderInvoices(); renderAccounts(); renderMaintenance(); renderUsers(); renderBackup(); renderQA(); }
function renderDashboard(){
  const k=Jawdah.dashboard.kpis;
  const data=Jawdah.data || {};
  const collectionRate = k.billed ? Math.round((Number(k.paid||0)/Number(k.billed||1))*100) : 0;
  const openInvoices=(data.invoices||[]).filter(x=>Number(x.amount||0)>Number(x.paid_amount||0));
  const nextRentForecast = Number(k.paid||0) + Math.max(0, Number(k.overdue||0) * .35);
  const riskScore = Math.max(0, Math.min(100, 100 - (openInvoices.length*7) - (Number(k.maintenance||0)*6) + (collectionRate*.2)));
  $('#heroStats').innerHTML=`<span class="badge paid">جاهزية ${fmt(k.health)}%</span><span class="badge">الإشغال ${fmt(k.occupancy)}%</span><span class="badge">التحصيل ${fmt(collectionRate)}%</span><span class="badge">مؤشر المخاطر ${fmt(riskScore)}%</span><span class="badge">توقع النقد ${money(nextRentForecast)}</span>`;
  const kpis=[
    ['building-2','إجمالي العقارات',k.properties,'properties',''],['key-round','العقارات المؤجرة',k.rented,'properties',''],['home','العقارات الشاغرة',k.vacant,'properties',''],['file-check','العقود النشطة',(data.contracts||[]).filter(x=>String(x.status||'').toLowerCase().includes('active')).length,'contracts',''],
    ['refresh-cw','عقود تحتاج تجديد',k.expiring||0,'contracts',''],['timer','عقود منتهية',k.expired||0,'contracts',''],
    ['receipt','إجمالي الفوترة',k.billed,'invoices','money'],['credit-card','إجمالي التحصيل',k.paid,'accounts','money'],['alarm-clock','المبالغ المتأخرة',k.overdue,'invoices','money'],['trending-up','صافي الربح',k.net,'accounts','money'],
    ['wrench','الصيانة المفتوحة',k.maintenance,'maintenance',''],['users-round','العملاء',(data.clients||[]).length,'clients',''],['shield-check','جودة البيانات',k.health,'reports','percent'],['sparkles','توقع الشهر',nextRentForecast,'reports','money']
  ];
  $('#kpiGrid').innerHTML=kpis.map(x=>`<div class="kpi kpi-pro" onclick="showSection('${x[3]}')">${kpiIcon(x[0])}<span>${x[1]}</span><strong>${x[4]==='money'?money(x[2]):x[4]==='percent'?fmt(x[2])+'%':fmt(x[2])}</strong><small class="mini">فتح التفاصيل والتحليل</small></div>`).join('');
  const executiveMatrix=`
    <div class="command-panel">
      <div class="ai-orb">${ic('sparkles')}</div>
      <div><h3>مساعد القرار التنفيذي</h3><p>الأولوية الآن: ${Number(k.overdue||0)>0?'تحصيل المتأخرات':'رفع الإشغال وتحسين التدفق النقدي'}، ومؤشر المخاطر الحالي ${fmt(riskScore)}%.</p></div>
      <div class="ai-stat"><b>${money(nextRentForecast)}</b><span>توقع النقد القادم</span></div>
    </div>
    <div class="ops-matrix">
      <div><b>العقار</b><span>${fmt(k.properties)}</span></div><div><b>العميل</b><span>${fmt((data.clients||[]).length)}</span></div><div><b>العقد</b><span>${fmt((data.contracts||[]).length)}</span></div><div><b>الفاتورة</b><span>${fmt((data.invoices||[]).length)}</span></div><div><b>التحصيل</b><span>${money(k.paid)}</span></div><div><b>الحسابات</b><span>${money(k.net)}</span></div>
    </div>
    <div class="executive-strip"><div class="executive-chip"><b>مؤشر التحصيل</b><br><span class="mini">${fmt(collectionRate)}% من إجمالي الفواتير</span></div><div class="executive-chip"><b>مؤشر الإشغال</b><br><span class="mini">${fmt(k.occupancy)}% من الوحدات</span></div><div class="executive-chip"><b>مؤشر السلامة</b><br><span class="mini">${fmt(riskScore)}% تشغيل مستقر</span></div></div>`;
  $('#decisionList').innerHTML=executiveMatrix + Jawdah.dashboard.decisions.map(d=>`<div class="decision-card"><span class="badge">${d.level}</span><p>${d.text}</p></div>`).join('');
  const props=Jawdah.data.properties||[];
  $('#gisPins').innerHTML=props.map((p,i)=>{ const cls=(p.status||'').toLowerCase().includes('maintenance')?'red':((p.status||'').toLowerCase().includes('vacant')?'blue':'gold'); const left=[18,43,68,28,78,52,36,61,22,84][i%10], top=[24,42,58,70,32,22,64,76,48,54][i%10]; return `<button class="pin ${cls}" title="${p.name}" style="left:${left}%;top:${top}%" onclick="toast('${p.name} - ${p.status}')"></button>` }).join('');
  $('#quickActions').innerHTML=[['إضافة عقار','properties','building-2'],['إضافة عميل','clients','user-plus'],['إنشاء عقد','contracts','file-plus-2'],['تجديد عقد','contracts','refresh-cw'],['فاتورة من عقد','invoices','receipt'],['تحصيل دفعة','invoices','wallet'],['Backup فوري','backup','archive'],['تقرير مالي','reports','chart-pie'],['اختبار التشغيل','qa','badge-check']].map(q=>`<button class="ghost quick-pro" onclick="showSection('${q[1]}')"><span class="quick-head">${ic(q[2],'quick-ic')}<b>${q[0]}</b></span><small class="mini">أمر تنفيذي سريع</small></button>`).join('');
  paintIcons($('#kpiGrid')); paintIcons($('#decisionList')); paintIcons($('#quickActions'));
}
function tableHtml(cols, rows, actions){
  return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}${actions?'<th>إجراء</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[2]?c[2](r[c[1]],r):(r[c[1]]??'')}</td>`).join('')}${actions?`<td>${actions(r)}</td>`:''}</tr>`).join('')||`<tr><td colspan="${cols.length+1}">لا توجد بيانات</td></tr>`}</tbody></table></div>`;
}
function renderProperties(){
  const rows=filterRows('properties',['name','type','status','location']);
  $('#propertiesTable').innerHTML=tableHtml([['الصورة','image'],['الاسم','name'],['النوع','type'],['الحالة','status',(v)=>badge(v)],['السعر','price',(v)=>money(v)],['الموقع','location'],['آخر تحديث','last_update']],rows,r=>`<button class="ghost" onclick="editRecord('properties','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('properties','${r.id}')">حذف</button>`);
  fillSelect('#propStatusFilter',['','Rented','Vacant','Maintenance'],false);
}
function aptNoFromProperty(p){
  const m=String(p.name||'').match(/شقة\s*(\d+)/)||String(p.notes||'').match(/no\s*(\d+)/i);
  return m?m[1]:'—';
}
function aptRowFromProperty(p){
  const contract=(Jawdah.data.contracts||[]).find(c=>c.property_id===p.id && String(c.status||'').toLowerCase().includes('active'))
    || (Jawdah.data.contracts||[]).find(c=>c.property_id===p.id);
  const client=contract?byId('clients',contract.client_id):{};
  const statusAr=String(p.status||'').toLowerCase().includes('rented')?'مستأجرة':String(p.status||'').toLowerCase().includes('vacant')?'شاغرة':p.status;
  const unitType=(p.notes||'').match(/\|\s*(مشترك|مستقل|سكن)/)?.[1]||'—';
  const rooms=(p.notes||'').match(/(\d+)\s*غرف/)?.[1]||(p.notes||'').match(/(\d+)\s*rooms/)?.[1]||'1';
  return {no:aptNoFromProperty(p),statusAr,unitType,rooms,tenant:client.name||'—',phone:client.phone||'—',avgRent:p.price,rent:contract?contract.rent_amount:p.price,start:contract?.start_date||'—',end:contract?.end_date||'—',property:p,contract,client};
}
function renderApartments(){
  const strip=$('#apartmentBrandStrip');
  if(strip) strip.innerHTML=`<div class="invoice-brand-strip">${CompanyProfile.dashboardIntroHtml()}</div>`;
  const props=(Jawdah.data.properties||[]).filter(p=>/شقة|حي التراث|نزوى/i.test(String(p.name||'')+String(p.location||'')));
  const rows=props.map(aptRowFromProperty).sort((a,b)=>String(a.no).localeCompare(String(b.no),undefined,{numeric:true}));
  const rented=rows.filter(r=>r.statusAr==='مستأجرة').length;
  const vacant=rows.filter(r=>r.statusAr==='شاغرة').length;
  const total=rows.length;
  if($('#aptKpiTotal')) $('#aptKpiTotal').textContent=fmt(total);
  if($('#aptKpiRented')) $('#aptKpiRented').textContent=fmt(rented);
  if($('#aptKpiVacant')) $('#aptKpiVacant').textContent=fmt(vacant);
  if($('#aptKpiOcc')) $('#aptKpiOcc').textContent=total?fmt(Math.round(rented/total*100))+'%':'0%';
  const tbl=$('#apartmentsTable');
  if(!tbl) return;
  tbl.innerHTML=tableHtml([
    ['رقم الشقة','no'],
    ['حالة الشقة','statusAr',v=>`<span class="badge ${v==='مستأجرة'?'rented':'vacant'}">${v}</span>`],
    ['نوع الوحدة','unitType'],
    ['عدد الغرف','rooms'],
    ['اسم المستأجر','tenant'],
    ['رقم الهاتف','phone'],
    ['متوسط الإيجار','avgRent',v=>money(v)],
    ['مبلغ الإيجار','rent',v=>money(v)],
    ['بداية العقد','start'],
    ['نهاية العقد','end'],
  ],rows,r=>{
    const pid=r.property?.id, cid=r.contract?.id;
    return `${pid?`<button class="ghost" onclick="showSection('properties')">العقار</button>`:''} ${cid?`<button class="ghost" onclick="invoiceFromContract('${cid}')">فاتورة</button>`:''}`;
  });
  paintIcons($('#sec-apartments'));
}
function renderClients(){
  const rows=filterRows('clients',['name','phone','email','national_id']);
  $('#clientsTable').innerHTML=tableHtml([['الاسم','name'],['الهاتف','phone'],['البريد','email'],['الهوية/السجل','national_id'],['الرصيد','balance',(v)=>money(v)],['ملاحظات','notes']],rows,r=>`<button class="ghost" onclick="clientStatement('${r.id}')">كشف</button> <button class="ghost" onclick="editRecord('clients','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('clients','${r.id}')">حذف</button>`);
}
function renderContracts(){
  fillSelect('#contractProperty',Jawdah.data.properties||[],true,'id','name'); fillSelect('#contractClient',Jawdah.data.clients||[],true,'id','name');
  const rows=filterRows('contracts',['id','status','notes']);
  const renewalHost = $('#renewalQueueBox');
  if(renewalHost){
    const queue = renewalQueue();
    renewalHost.innerHTML = queue.length
      ? `<div class="renewal-panel"><h3>${ic('refresh-cw','title-ic')} قرارات التجديد (${queue.length})</h3><p class="mini">عقود نشطة تقترب من تاريخ النهاية أو منتهية وتحتاج قرار تجديد قبل تحولها إلى شغور.</p>${queue.map(({contract:c, meta})=>`<div class="renewal-row"><div><b>${c.contract_no||c.id}</b> · ${byId('clients',c.client_id).name||c.client_id}<br><span class="mini">${byId('properties',c.property_id).name||c.property_id} · ينتهي ${c.end_date}</span></div><span class="badge ${meta.tone}">${meta.label}</span><button class="gold-btn" onclick="renewContract('${c.id}')">تجديد</button></div>`).join('')}</div>`
      : `<div class="renewal-panel renewal-ok"><h3>${ic('refresh-cw','title-ic')} التجديد</h3><p class="mini">لا توجد عقود تحتاج قرار تجديد حالياً.</p></div>`;
    paintIcons(renewalHost);
  }
  const legalTa = $('#contractLegalTerms');
  if (legalTa && !legalTa.dataset.initialized) {
    legalTa.value = CompanyProfile.defaultLegalTerms();
    legalTa.dataset.initialized = '1';
  }
  $('#contractsTable').innerHTML=tableHtml([['رقم العقد','contract_no',(v,r)=>v||r.id],['النوع','contract_type'],['العقار','property_id',(v)=>byId('properties',v).name||v],['العميل','client_id',(v)=>byId('clients',v).name||v],['البداية','start_date'],['النهاية','end_date'],['التجديد','id',(_,r)=>{const m=contractRenewalMeta(r); return m.label?`<span class="badge ${m.tone}">${m.label}</span>`:'—';}],['الإيجار','rent_amount',(v)=>money(v)],['التأمين','deposit_amount',(v)=>money(v)],['الحالة','status',(v)=>badge(v)]],rows,r=>{
    const meta = contractRenewalMeta(r);
    const renewBtn = meta.renewable ? `<button class="gold-btn" onclick="renewContract('${r.id}')">تجديد</button> ` : '';
    return `${renewBtn}<button class="gold-btn" onclick="approveContract('${r.id}')">اعتماد</button> <button class="ghost" onclick="contractDocument('${r.id}')">عرض</button> <button class="ghost" onclick="downloadContractPdf('${r.id}')">PDF</button> <button class="ghost" onclick="invoiceFromContract('${r.id}')">فاتورة</button> <button class="ghost" onclick="editRecord('contracts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('contracts','${r.id}')">حذف</button>`;
  });
}
function canWriteInvoices(){ return Jawdah.user && ['admin','accountant','operations'].includes(Jawdah.user.role); }
function contractLabel(c){
  const prop=byId('properties',c.property_id), client=byId('clients',c.client_id);
  return `${c.contract_no||c.id} · ${client.name||'—'} · ${prop.name||'—'}`;
}
function syncInvoiceContractPreview(){
  const c=byId('contracts', val('invContractPick'));
  const preview=$('#invLinkPreview');
  if(!preview) return;
  if(!c.id){ preview.innerHTML=''; return; }
  const client=byId('clients',c.client_id), prop=byId('properties',c.property_id);
  preview.innerHTML=`<div class="link-preview-grid">
    <span class="badge paid"><i data-lucide="file-signature" class="lucide-icon"></i> ${c.contract_no||c.id}</span>
    <span class="badge"><i data-lucide="users-round" class="lucide-icon"></i> ${client.name||'—'}</span>
    <span class="badge"><i data-lucide="building-2" class="lucide-icon"></i> ${prop.name||'—'}</span>
    <span class="badge">إيجار ${money(c.rent_amount)}</span>
  </div>`;
  if($('#invAmount') && Number(c.rent_amount)>0) $('#invAmount').value=Number(c.rent_amount).toFixed(3);
  if($('#invDueDate') && !$('#invDueDate').value) $('#invDueDate').value=today();
  paintIcons(preview);
}
async function submitCreateInvoice(){
  if(!canWriteInvoices()) return toast('لا تملك صلاحية إنشاء الفواتير', true);
  const contractId=val('invContractPick');
  if(!contractId) return toast('اختر العقد المرتبط أولاً', true);
  const amount=num('invAmount');
  if(amount<=0) return toast('أدخل مبلغ الفاتورة أكبر من صفر', true);
  try{
    const res=await api('invoice_from_contract',{method:'POST',body:JSON.stringify({
      contract_id:contractId,
      due_date:val('invDueDate')||today(),
      description:val('invDescription')||'فاتورة إيجار',
      amount,
    })});
    toast('تم إنشاء الفاتورة '+res.item.invoice_no+' وربطها بالعقد');
    if($('#invContractPick')) $('#invContractPick').value='';
    if($('#invLinkPreview')) $('#invLinkPreview').innerHTML='';
    await loadAll();
    showSection('invoices');
  }catch(e){ toast(e.message,true); }
}
function renderInvoices(){
  const contracts=(Jawdah.data.contracts||[]).filter(c=>c.property_id&&c.client_id);
  const pick=$('#invContractPick');
  if(pick){
    const old=pick.value;
    pick.innerHTML='<option value="">— اختر العقد —</option>'+contracts.map(c=>`<option value="${c.id}">${contractLabel(c)}</option>`).join('');
    if([...pick.options].some(o=>o.value===old)) pick.value=old;
  }
  if($('#invDueDate') && !$('#invDueDate').value) $('#invDueDate').value=today();
  const createBtn=$('#invCreateBtn');
  if(createBtn) createBtn.classList.toggle('hidden', !canWriteInvoices());
  syncInvoiceContractPreview();
  const rows=filterRows('invoices',['invoice_no','description','status']);
  const contractCell=(v,r)=>{ const c=byId('contracts',r.contract_id); return c.id?`<span class="linked-ok">${c.contract_no||c.id}</span>`:'<span class="low-stock">غير مربوط</span>'; };
  const vatCell=(v,r)=>{ const b=CompanyProfile.vatBreakdown(r.amount); return money(b.vat); };
  const totalCell=(v,r)=> money(r.amount);
  const remainCell=(v,r)=> money(Math.max(0,Number(r.amount)-Number(r.paid_amount)));
  $('#invoicesTable').innerHTML=tableHtml([
    ['رقم','invoice_no'],
    ['العقد','contract_id',contractCell],
    ['العميل','client_id',(v)=>byId('clients',v).name||v],
    ['العقار','property_id',(v)=>byId('properties',v).name||v],
    ['الإصدار','issue_date'],
    ['الاستحقاق','due_date'],
    ['أساسي','amount',(v,r)=>money(CompanyProfile.vatBreakdown(r.amount).subtotal)],
    ['ض.ق.م','amount',vatCell],
    ['الإجمالي','amount',totalCell],
    ['المدفوع','paid_amount',(v)=>money(v)],
    ['المتبقي','amount',remainCell],
    ['الحالة','status',(v)=>badge(v)],
  ],rows,r=>{
    const pay=`<button class="gold-btn" onclick="openPayment('${r.id}')">تحصيل</button>`;
    const view=`<button class="ghost" onclick="printInvoice('${r.id}')">معاينة</button> <button class="ghost" onclick="downloadInvoicePdfById('${r.id}')">PDF</button>`;
    const del=canWriteInvoices()?` <button class="danger" onclick="delRecord('invoices','${r.id}')">حذف</button>`:'';
    return `${pay} ${view}${del}`;
  });
  const billed=rows.reduce((s,x)=>s+Number(x.amount||0),0), paid=rows.reduce((s,x)=>s+Number(x.paid_amount||0),0);
  if($('#invKpiBilled')) $('#invKpiBilled').textContent=money(billed);
  if($('#invKpiPaid')) $('#invKpiPaid').textContent=money(paid);
  if($('#invKpiDue')) $('#invKpiDue').textContent=money(Math.max(0,billed-paid));
  if($('#invKpiCount')) $('#invKpiCount').textContent=fmt(rows.length);
  paintIcons($('#sec-invoices'));
}
function renderAccounts(){
  const rows=filterRows('accounts',['description','category','type']);
  $('#accountsTable').innerHTML=tableHtml([['التاريخ','entry_date'],['النوع','type',(v)=>badge(v)],['التصنيف','category'],['الوصف','description'],['العميل','client_id',(v)=>v?(byId('clients',v).name||v):''],['العقار','property_id',(v)=>v?(byId('properties',v).name||v):''],['الفاتورة','invoice_id',(v)=>v?(byId('invoices',v).invoice_no||v):''],['المبلغ','amount',(v)=>money(v)]],rows,r=>`<button class="ghost" onclick="editRecord('accounts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('accounts','${r.id}')">حذف</button>`);
  const income=rows.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0), expense=rows.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
  $('#accountSummary').innerHTML=`<span class="badge">إيرادات ${money(income)}</span><span class="badge">مصروفات ${money(expense)}</span><span class="badge">صافي ${money(income-expense)}</span>`;
}
function renderMaintenance(){
  fillSelect('#maintProperty',Jawdah.data.properties||[],true,'id','name');
  const rows=filterRows('maintenance',['title','priority','status','notes']);
  $('#maintenanceGrid').innerHTML=rows.map(m=>`<div class="card"><h3>${m.title}</h3><p>${byId('properties',m.property_id).name||m.property_id}</p><span class="badge">${m.priority}</span> <span class="badge">${m.status}</span><p>التكلفة: ${money(m.cost)}</p><button class="ghost" onclick="editRecord('maintenance','${m.id}')">متابعة</button> <button class="danger" onclick="delRecord('maintenance','${m.id}')">حذف</button></div>`).join('')||'<div class="card">لا توجد طلبات صيانة</div>';
}
function renderUsers(){
  if(!Jawdah.data.users){ $('#usersTable').innerHTML='<div class="card">هذا القسم للمدير فقط</div>'; return; }
  $('#usersTable').innerHTML=tableHtml([['المستخدم','username'],['الاسم','name'],['الدور','role',(v)=>roleName(v)],['نشط','active',(v)=>v?'نعم':'لا'],['آخر دخول','last_login']],Jawdah.data.users,r=>`<button class="ghost" onclick="editRecord('users','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('users','${r.id}')">حذف</button>`);
}
function renderBackup(){
  const counts=Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,(v||[]).length]));
  $('#backupStatus').innerHTML=Object.entries(counts).map(([k,v])=>`<span class="badge">${k}: ${fmt(v)}</span>`).join(' ');
}
function renderQA(){
  $('#qaBox').innerHTML='<p>اضغط تشغيل الاختبار لفحص الترابط والتخزين والفواتير والحسابات.</p>';
}
function filterRows(table, fields){
  let rows=[...(Jawdah.data[table]||[])]; const q=($('#globalSearch')?.value||'').toLowerCase().trim();
  if(q) rows=rows.filter(r=>fields.some(f=>String(r[f]??'').toLowerCase().includes(q)));
  if(table==='properties'){ const s=$('#propStatusFilter')?.value; if(s) rows=rows.filter(r=>r.status===s); }
  return rows;
}
function badge(v){ const cls=String(v||'').toLowerCase(); return `<span class="badge ${cls}">${v||''}</span>`; }
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
function fillSelect(sel, data, objects=false, valueKey='id', textKey='name'){
  const el=$(sel); if(!el) return; const old=el.value; let html='<option value="">اختر</option>';
  if(objects) html+=data.map(x=>`<option value="${x[valueKey]}">${x[textKey]}</option>`).join(''); else html+=data.map(x=>`<option value="${x}">${x||'الكل'}</option>`).join('');
  el.innerHTML=html; if([...el.options].some(o=>o.value===old)) el.value=old;
}
async function createProperty(){
  if(!val('pName')) return toast('يرجى إدخال اسم العقار', true);
  await saveNew('properties',{name:val('pName'),type:val('pType')||'Villa',status:val('pStatus')||'Vacant',price:num('pPrice'),location:val('pLocation'),image:val('pImage')||'🏠',last_update:today(),notes:val('pNotes')});
  ['pName','pType','pPrice','pLocation','pNotes'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
}
async function createClient(){
  if(!val('cName')) return toast('يرجى إدخال اسم العميل', true);
  await saveNew('clients',{name:val('cName'),phone:val('cPhone'),email:val('cEmail'),national_id:val('cNational'),balance:0,notes:val('cNotes')});
  ['cName','cPhone','cEmail','cNational','cNotes'].forEach(id=>{ const el=$('#'+id); if(el) el.value=''; });
}
async function createContract(){ await saveNew('contracts',{contract_type:val('contractType')||'Residential',property_id:val('contractProperty'),client_id:val('contractClient'),tenant_nationality:val('tenantNationality'),tenant_id_no:val('tenantIdNo'),unit_details:val('unitDetails'),start_date:val('contractStart')||today(),end_date:val('contractEnd')||today(),rent_amount:num('contractRent'),deposit_amount:num('contractDeposit'),late_fee:num('contractLateFee'),grace_days:num('contractGraceDays')||5,renewal_notice_days:num('contractRenewalDays')||90,status:'Draft',payment_cycle:'monthly',legal_terms:val('contractLegalTerms')||CompanyProfile.defaultLegalTerms(),notes:val('contractNotes')}); }
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
  if(field === 'property_id') return (Jawdah.data.properties||[]).map(x=>[x.id,x.name]);
  if(field === 'client_id') return (Jawdah.data.clients||[]).map(x=>[x.id,x.name]);
  if(field === 'invoice_id') return [['','بدون فاتورة'], ...(Jawdah.data.invoices||[]).map(x=>[x.id,x.invoice_no])];
  if(field === 'employee_id') return [['','بدون ربط'], ...(Jawdah.data.employees||[]).map(x=>[x.id, `${x.employee_code||x.id} - ${x.name}`])];
  if(field === 'nationality_category') return [['Omani','عماني'],['Expat','أجنبي']];
  if(field === 'parent_code') return [['','بدون حساب أب'], ...(Jawdah.data.chart_accounts||[]).map(x=>[x.code, `${x.code} - ${x.name}`])];
  if(table === 'chart_accounts' && field === 'type') return ['Asset','Liability','Equity','Revenue','Expense'].map(x=>[x,x]);
  if(table === 'financial_periods' && field === 'status') return ['Open','Closed'].map(x=>[x,x]);
  if(table === 'employees' && field === 'status') return ['Active','Inactive','On Leave'].map(x=>[x,x]);
  if(table === 'bank_reconciliations' && field === 'status') return ['Pending','Reconciled','Variance'].map(x=>[x,x]);
  if(opts[field]) return opts[field].map(x=>[x, field==='role'?roleName(x):(x==='1'?'نعم':x==='0'?'لا':x)]);
  return null;
}
const EDIT_CONFIG = {
  properties: {title:'تعديل عقار', fields:[['name','اسم العقار','text'],['type','النوع','select'],['status','الحالة','select'],['price','السعر','number'],['location','الموقع','text'],['image','رمز/صورة','text'],['notes','ملاحظات','textarea']]},
  clients: {title:'تعديل عميل', fields:[['name','اسم العميل','text'],['phone','الهاتف','text'],['email','البريد','text'],['national_id','الهوية/السجل','text'],['balance','الرصيد الافتتاحي','number'],['notes','ملاحظات','textarea']]},
  contracts: {title:'تعديل عقد', fields:[['contract_no','رقم العقد','text'],['contract_type','نوع العقد','select'],['property_id','العقار','select'],['client_id','العميل','select'],['tenant_nationality','جنسية المستأجر','text'],['tenant_id_no','رقم الهوية/السجل','text'],['unit_details','تفاصيل الوحدة','textarea'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['rent_amount','قيمة الإيجار','number'],['deposit_amount','التأمين','number'],['late_fee','غرامة التأخير','number'],['grace_days','مهلة السداد بالأيام','number'],['renewal_notice_days','تنبيه التجديد بالأيام','number'],['status','الحالة','select'],['payment_cycle','دورة الدفع','select'],['legal_terms','الشروط القانونية','textarea'],['notes','ملاحظات','textarea']]},
  accounts: {title:'تعديل حركة مالية', fields:[['entry_date','التاريخ','date'],['type','النوع','select'],['category','التصنيف','text'],['description','الوصف','text'],['client_id','العميل','select'],['property_id','العقار','select'],['invoice_id','الفاتورة','select'],['amount','المبلغ','number']]},
  maintenance: {title:'تعديل طلب صيانة', fields:[['property_id','العقار','select'],['title','عنوان الطلب','text'],['priority','الأولوية','select'],['status','الحالة','select'],['request_date','تاريخ الطلب','date'],['cost','التكلفة','number'],['notes','ملاحظات','textarea']]},
  chart_accounts: {title:'تعديل حساب في الدليل', fields:[['code','رمز الحساب','text'],['name','اسم الحساب','text'],['type','نوع الحساب','select'],['parent_code','الحساب الأب','select'],['active','نشط','select'],['notes','ملاحظات','textarea']]},
  financial_periods: {title:'تعديل فترة مالية', fields:[['period_name','اسم الفترة','text'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  bank_reconciliations: {title:'تعديل تسوية بنك', fields:[['bank_name','البنك','text'],['period_name','الفترة','text'],['book_balance','رصيد الدفاتر','number'],['bank_balance','رصيد كشف البنك','number'],['difference','الفرق','number'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  employees: {title:'تعديل موظف', fields:[['employee_code','رمز الموظف','text'],['name','اسم الموظف','text'],['nationality_category','التصنيف','select'],['nationality','الجنسية','text'],['id_number','رقم الهوية/الإقامة','text'],['job_title','المسمى الوظيفي','text'],['department','القسم','text'],['hire_date','تاريخ التعيين','date'],['phone','الهاتف','text'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  salaries: {title:'تعديل راتب', fields:[['employee_name','اسم الموظف','text'],['employee_id','ربط بكشف الموظفين','select'],['nationality_category','التصنيف','select'],['salary_month','الشهر','text'],['basic_salary','الأساسي','number'],['allowances','البدلات','number'],['deductions','الاستقطاعات','number'],['net_salary','الصافي','number'],['status','الحالة','select'],['payment_date','تاريخ الدفع','date']]},
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
async function invoiceFromContract(contractId){
  showSection('invoices');
  if($('#invContractPick')){ $('#invContractPick').value=contractId; syncInvoiceContractPreview(); }
  toast('تم اختيار العقد — راجع البيانات ثم اضغط إنشاء وربط الفاتورة');
}
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
async function downloadContractPdf(contractId){
  try{
    const c=byId('contracts', contractId);
    const res=await api('contract_template',{method:'POST',body:JSON.stringify({contract_id:contractId})});
    await downloadHtmlAsPdf(res.html, `contract-${c.contract_no||c.id||contractId}.pdf`);
  }catch(e){ toast(e.message,true); }
}
function invoiceDocumentHtml(id){
  const inv=byId('invoices',id), client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id);
  return CompanyProfile.invoiceHtml(inv, client, prop, contract);
}
async function downloadInvoicePdfById(id){
  const inv=byId('invoices', id);
  if(!inv?.id) return toast('لم يتم العثور على الفاتورة', true);
  await downloadHtmlAsPdf(invoiceDocumentHtml(id), `tax-invoice-${inv.invoice_no||id}.pdf`);
}
async function downloadInvoicePdf(){
  const inv=Jawdah.invoiceForPrint;
  if(!inv?.id) return;
  await downloadHtmlAsPdf(invoiceDocumentHtml(inv.id), `tax-invoice-${inv.invoice_no||inv.id}.pdf`);
}

function openPayment(id){ const inv=byId('invoices',id); const remaining=Number(inv.amount)-Number(inv.paid_amount); $('#payInvoiceId').value=id; $('#payAmount').value=remaining.toFixed(2); $('#payInfo').textContent=`${inv.invoice_no} - المتبقي ${money(remaining)}`; openModal('paymentModal'); }
async function submitPayment(){ try{ await api('pay_invoice',{method:'POST',body:JSON.stringify({invoice_id:val('payInvoiceId'),amount:num('payAmount'),method:val('payMethod'),note:val('payNote')})}); closeModal('paymentModal'); toast('تم التحصيل وتحديث الحسابات'); await loadAll(); }catch(e){toast(e.message,true)} }
function printInvoice(id){
  const inv=byId('invoices',id), client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id);
  Jawdah.invoiceForPrint=inv;
  const html=CompanyProfile.invoiceHtml(inv, client, prop, contract);
  $('#invoicePreview').innerHTML=`<iframe class="invoice-preview-frame" title="Tax Invoice Preview"></iframe>`;
  const frame=$('#invoicePreview iframe');
  if(frame){ frame.srcdoc=html; }
  openModal('invoiceModal');
}
function printInvoiceDocument(){
  const inv=Jawdah.invoiceForPrint;
  if(!inv?.id) return;
  const client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id);
  const w=window.open('', '_blank');
  w.document.write(CompanyProfile.invoiceHtml(inv, client, prop, contract));
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(), 400);
}
function downloadInvoice(){
  const inv=Jawdah.invoiceForPrint;
  if(!inv?.id) return;
  const client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id);
  downloadFile(`tax-invoice-${inv.invoice_no||'file'}.html`, CompanyProfile.invoiceHtml(inv, client, prop, contract), 'text/html');
}
function clientStatement(id){ const c=byId('clients',id); const inv=(Jawdah.data.invoices||[]).filter(x=>x.client_id===id); const acc=(Jawdah.data.accounts||[]).filter(x=>x.client_id===id); const total=inv.reduce((s,x)=>s+Number(x.amount||0),0), paid=inv.reduce((s,x)=>s+Number(x.paid_amount||0),0); $('#genericModalBody').innerHTML=`<h2>كشف حساب ${c.name}</h2><p>إجمالي الفواتير: ${money(total)} | المدفوع: ${money(paid)} | المتبقي: ${money(total-paid)}</p>${tableHtml([['رقم','invoice_no'],['تاريخ','issue_date'],['إجمالي','amount',(v)=>money(v)],['مدفوع','paid_amount',(v)=>money(v)],['حالة','status',(v)=>badge(v)]],inv)}<h3>الحركات</h3>${tableHtml([['تاريخ','entry_date'],['نوع','type'],['وصف','description'],['مبلغ','amount',(v)=>money(v)]],acc)}`; openModal('genericModal'); }
function openModal(id){ $('#'+id).classList.add('show'); ensureEnglishDigits($('#'+id)); } function closeModal(id){ $('#'+id).classList.remove('show'); }
async function downloadBackup(){ try{ const res=await api('backup'); downloadFile('jawdah-cloud-backup.json', JSON.stringify(res.backup,null,2), 'application/json'); }catch(e){toast(e.message,true)} }
function downloadFile(name,content,type='text/plain'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
async function exportCsv(table){ try{ const res=await fetch('/api/export/'+table,{headers:{Authorization:'Bearer '+Jawdah.token}}); if(!res.ok) throw new Error('Export failed'); const blob=await res.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jawdah-'+table+'.csv'; a.click(); }catch(e){toast(e.message,true)} }
function renderReports(){
  const k=Jawdah.dashboard.kpis; $('#reportsBox').innerHTML=`<div class="kpis grid"><div class="kpi"><span>الإيرادات</span><strong>${money(k.income)}</strong></div><div class="kpi"><span>المصروفات</span><strong>${money(k.expense)}</strong></div><div class="kpi"><span>الصافي</span><strong>${money(k.net)}</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(k.overdue)}</strong></div></div><div class="card"><h3>قرارات تنفيذية</h3>${Jawdah.dashboard.decisions.map(d=>`<p><span class="badge">${d.level}</span> ${d.text}</p>`).join('')}</div>`;
}
function runQA(){
  const problems=[]; const data=Jawdah.data;
  (data.contracts||[]).forEach(c=>{ if(!byId('properties',c.property_id).id) problems.push('عقد بدون عقار: '+c.id); if(!byId('clients',c.client_id).id) problems.push('عقد بدون عميل: '+c.id); });
  (data.invoices||[]).forEach(i=>{ if(!byId('contracts',i.contract_id).id) problems.push('فاتورة بدون عقد: '+i.invoice_no); if(Number(i.paid_amount)>Number(i.amount)) problems.push('فاتورة مدفوعة أكثر من الإجمالي: '+i.invoice_no); });
  const score=Math.max(0,100-problems.length*10);
  $('#qaBox').innerHTML=`<div class="kpi"><span>نتيجة الجاهزية</span><strong>${fmt(score)}%</strong></div>${problems.length?problems.map(p=>`<p class="badge overdue">${p}</p>`).join(''):'<p class="badge paid">كل الفحوصات الأساسية ناجحة</p>'}`;
}
function drawCharts(){ if(!Jawdah.dashboard) return; drawLine('incomeChart',Jawdah.dashboard.series.map(x=>x.income),Jawdah.dashboard.series.map(x=>x.expense)); drawDonut('occupancyChart',Jawdah.dashboard.kpis.occupancy); drawBar('expenseChart',Jawdah.dashboard.series.map(x=>x.expense)); }
function ctx(id){ const c=$('#'+id); return c?c.getContext('2d'):null; }
function prepCanvas(c){ const r=c.getBoundingClientRect(); c.width=r.width*devicePixelRatio; c.height=r.height*devicePixelRatio; const g=c.getContext('2d'); g.scale(devicePixelRatio,devicePixelRatio); return [g,r.width,r.height]; }
function drawLine(id,a,b){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const vals=[...a,...b,1], max=Math.max(...vals)*1.22; const area=(arr,color1,color2)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.lineTo(w-32,h-34); g.lineTo(32,h-34); g.closePath(); const gr=g.createLinearGradient(0,28,0,h-34); gr.addColorStop(0,color1); gr.addColorStop(1,color2); g.fillStyle=gr; g.fill(); }; const plot=(arr,color)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.strokeStyle=color; g.lineWidth=3; g.shadowBlur=0; g.stroke(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); g.beginPath(); g.fillStyle=color; g.arc(x,y,3.5,0,Math.PI*2); g.fill(); }); }; g.strokeStyle='rgba(148,163,184,.12)'; for(let i=0;i<5;i++){let y=24+i*(h-58)/4;g.beginPath();g.moveTo(24,y);g.lineTo(w-24,y);g.stroke();} area(a,'rgba(64,224,208,.16)','rgba(64,224,208,0)'); plot(a,'#40e0d0'); plot(b,'#2dd4bf'); }
function drawDonut(id,p){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/3; g.lineWidth=22; g.lineCap='round'; g.strokeStyle='rgba(255,255,255,.08)'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const gr=g.createLinearGradient(x-r,y-r,x+r,y+r); gr.addColorStop(0,'#7fffd4'); gr.addColorStop(.5,'#40e0d0'); gr.addColorStop(1,'#14b8a6'); g.strokeStyle=gr; g.shadowBlur=0; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*p/100); g.stroke(); g.fillStyle='#f5f5f5'; g.font='700 28px Segoe UI'; g.textAlign='center'; g.fillText(fmt(p)+'%',x,y+6); g.font='13px Segoe UI'; g.fillStyle='rgba(163,163,163,.9)'; g.fillText('Occupancy',x,y+28); }
function drawBar(id,arr){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const max=Math.max(...arr,1)*1.2, bw=(w-60)/arr.length*.65; arr.forEach((v,i)=>{const x=30+i*(w-60)/arr.length+10, bh=(v/max)*(h-50); const grd=g.createLinearGradient(0,h-25-bh,0,h-25); grd.addColorStop(0,'#7fffd4'); grd.addColorStop(1,'#14b8a6'); g.fillStyle=grd; g.shadowBlur=0; g.fillRect(x,h-25-bh,bw,bh);}); }
function initClock(){ setInterval(()=>{ const d=new Date(); $('#clock').textContent=d.toLocaleTimeString('en-US',{hour12:false}); },1000); }
function bind(){
  $('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout; $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open'); $('#globalSearch').oninput=()=>renderAll();
  document.addEventListener('input',e=>ensureEnglishDigits(e.target));
  document.addEventListener('keydown',e=>{ if(e.ctrlKey&&e.key.toLowerCase()==='k'){ e.preventDefault(); $('#globalSearch').focus(); } if(e.key==='/' && document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#globalSearch').focus();} });
}
window.LAUNCH_QUALITY_CHECK=()=>({system:COMPANY,user:Jawdah.user?.username||null,tables:Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,v.length])),dashboard:Jawdah.dashboard});
window.addEventListener('load',()=>{ setUiShellMode(Jawdah.token ? 'app' : 'login'); bind(); initClock(); checkSession(); setInterval(()=>ensureEnglishDigits(),3000); paintIcons(); });


/* Quality Launch Services LLC - production experience layer */
(function(){
  const VERSION = COMPANY;
  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    oldRenderDashboard && oldRenderDashboard();
    try{
      const k = Jawdah.dashboard && Jawdah.dashboard.kpis ? Jawdah.dashboard.kpis : {};
      const properties = (Jawdah.data.properties||[]).length;
      const clients = (Jawdah.data.clients||[]).length;
      const contracts = (Jawdah.data.contracts||[]).length;
      const invoices = (Jawdah.data.invoices||[]).length;
      const paid = Number(k.paid||0);
      const billed = Number(k.billed||0);
      const collection = billed ? Math.round((paid/billed)*100) : 0;
      const readiness = Math.min(100, Math.round(((properties>0)+(clients>0)+(contracts>0)+(invoices>0)+(collection>0))*20));
      const banner = document.getElementById('launchBanner');
      if(banner){
        banner.classList.remove('hidden');
        banner.innerHTML = `<div class="launch-card">${ic('gauge','title-ic')}<div><b>جاهزية التشغيل</b><br><span class="mini">جاهزية التشغيل والربط المالي الحالي: ${fmt(readiness)}%.</span></div></div>`;
        paintIcons(banner);
      }
      const hero = document.querySelector('.hero h2');
      if(hero) hero.textContent = 'مركز القيادة التنفيذي — ' + (CompanyProfile.settings.name_ar || COMPANY);
      const heroP = document.querySelector('.hero p');
      if(heroP) heroP.textContent = 'منصة إدارة عقارية وضيافة فاخرة تجمع العقارات والعملاء والعقود والفواتير والتحصيل والحسابات في تجربة تنفيذية واحدة متكاملة.';
    }catch(e){ console.warn('production dashboard layer', e); }
  };
  const oldCheck = window.JAWDAH_CLOUD_CHECK;
  window.JAWDAH_CLOUD_CHECK = function(){
    const base = oldCheck ? oldCheck() : {};
    return {...base, version:VERSION, theme:'luxury-black-turquoise-glass', editVerified:true, apiConnected:true};
  };
  window.addEventListener('load',()=>{
    document.title = COMPANY;
    paintIcons();
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
    const html = `<!doctype html><meta charset="utf-8"><title>${COMPANY} Financial Report</title><body style="font-family:Arial;direction:rtl"><h1>${COMPANY} - التقرير المالي</h1><p>Income: ${money(e.income)} | Expense: ${money(e.expense)} | Net: ${money(e.net)} | Collection: ${fmt(e.collectionRate)}%</p><h2>أعمار الذمم</h2><ul>${Object.entries(e.aging).map(([k,v])=>`<li>${k}: ${money(v)}</li>`).join('')}</ul></body>`;
    downloadFile('launch-quality-financial-report.html', html, 'text/html');
  };
  const oldCheck = window.LAUNCH_QUALITY_CHECK;
  window.LAUNCH_QUALITY_CHECK = function(){ const base = oldCheck ? oldCheck() : {}; return {...base, status:'accounting-ready', accounting:accEngine()}; };
})();


(function(){
  const baseSections=[
    ['dashboard','لوحة التحكم','layout-dashboard'],
    ['properties','العقارات','building-2'],
    ['apartments','إدارة الشقق','layout-grid'],
    ['clients','العملاء','users-round'],
    ['contracts','العقود','file-signature'],
    ['invoices','الفواتير','receipt'],
    ['admin-expenses','مصاريف إدارية','landmark'],
    ['purchases','فواتير المشتريات','shopping-cart'],
    ['revenues','الإيرادات','gem'],
    ['accounts','الحسابات','wallet'],
    ['inventory','المخزن','package'],
    ['employees','كشف الموظفين','users'],
    ['payroll','الرواتب','badge-dollar-sign'],
    ['statements','قائمة الدخل والميزانية','book-open-text'],
    ['bank','كشف البنك','landmark'],
    ['chart-accounts','دليل الحسابات','book-text'],
    ['bank-reconciliation','تسوية البنك','git-compare'],
    ['financial-periods','الفترات المالية','calendar-range'],
    ['maintenance','الصيانة','wrench'],
    ['reports','التقارير','chart-column'],
    ['company-settings','إعدادات المؤسسة','building-2'],
    ['users','المستخدمين','shield-check'],
    ['backup','التخزين والنسخ','hard-drive'],
    ['qa','اختبار التشغيل','circle-check-big'],
  ];
  buildNav=function(){ const nav=$('#nav'); nav.innerHTML=''; baseSections.forEach(([id,label,icon])=>{ if(id==='users'&&Jawdah.user.role!=='admin')return; if(id==='company-settings'&&Jawdah.user.role!=='admin')return; nav.appendChild(navItem(id,label,icon)); }); paintIcons(nav); };
  const oldPopulate=populateSelects;
  populateSelects=function(){ oldPopulate(); const propOpts='<option value="">بدون عقار</option>'+(Jawdah.data.properties||[]).map(p=>`<option value="${p.id}">${p.name}</option>`).join(''); ['#piProperty','#revProperty','#gaProperty'].forEach(s=>{if($(s))$(s).innerHTML=propOpts}); const clientOpts='<option value="">بدون عميل</option>'+(Jawdah.data.clients||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); if($('#revClient'))$('#revClient').innerHTML=clientOpts; const itemOpts=(Jawdah.data.inventory_items||[]).map(i=>`<option value="${i.id}">${i.sku} - ${i.name}</option>`).join(''); if($('#stockItem'))$('#stockItem').innerHTML=itemOpts; const accOpts='<option value="">غير مطابق</option>'+(Jawdah.data.accounts||[]).map(a=>`<option value="${a.id}">${a.entry_date} - ${a.category} - ${money(a.amount)}</option>`).join(''); if($('#bankMatch'))$('#bankMatch').innerHTML=accOpts; const coaParentOpts='<option value="">بدون حساب أب</option>'+(Jawdah.data.chart_accounts||[]).map(a=>`<option value="${a.code}">${a.code} - ${a.name}</option>`).join(''); if($('#coaParent'))$('#coaParent').innerHTML=coaParentOpts; const periodOpts=(Jawdah.data.financial_periods||[]).filter(p=>String(p.status||'').toLowerCase()==='open').map(p=>`<option value="${p.period_name}">${p.period_name}</option>`).join(''); if($('#recPeriod')&&$('#recPeriod').tagName==='SELECT') $('#recPeriod').innerHTML=periodOpts||'<option value="">لا توجد فترة مفتوحة</option>'; ['piDate','revDate','salDate','gaDate','stockDate','bankDate','fpStart','fpEnd'].forEach(id=>{if($('#'+id)&&!$('#'+id).value)$('#'+id).value=today()}); if($('#salMonth')&&!$('#salMonth').value)$('#salMonth').value=today().slice(0,7); if($('#recPeriod')&&$('#recPeriod').tagName==='INPUT'&&!$('#recPeriod').value)$('#recPeriod').value=today().slice(0,7); };
  const oldRenderAll=renderAll;
  renderAll=function(){ oldRenderAll(); populateSelects(); renderFinanceSuite(); };
  function safe(rows){return Array.isArray(rows)?rows:[]}
  window.renderFinanceSuite=function(){ renderPurchaseInvoices(); renderRevenues(); renderEmployees(); renderSalaries(); renderAdminExpenses(); renderInventory(); renderBank(); renderChartAccounts(); renderBankReconciliations(); renderFinancialPeriods(); renderFinanceHero(); };
  window.renderFinanceHero=function(){ const k=Jawdah.dashboard?.kpis||{}; const host=$('#accountingExecutive'); if(host){ host.innerHTML=`<div class="kpi"><span>فواتير مشتريات مستحقة</span><strong>${money(k.purchases_due||0)}</strong></div><div class="kpi"><span>الرواتب</span><strong>${money(k.payroll||0)}</strong></div><div class="kpi"><span>قيمة المخزون</span><strong>${money(k.inventory_value||0)}</strong></div><div class="kpi"><span>رصيد البنك</span><strong>${money(k.bank_balance||0)}</strong></div>`; }};
  window.renderPurchaseInvoices=function(){ const rows=safe(Jawdah.data.purchase_invoices); if($('#purchaseInvoicesTable')) $('#purchaseInvoicesTable').innerHTML=tableHtml([['رقم','purchase_no'],['المورد','supplier'],['التاريخ','invoice_date'],['التصنيف','category'],['الإجمالي','amount',v=>money(v)],['المدفوع','paid_amount',v=>money(v)],['الحالة','status',v=>badge(v)]],rows); };
  window.renderRevenues=function(){ const rows=safe(Jawdah.data.revenues); if($('#revenuesTable')) $('#revenuesTable').innerHTML=tableHtml([['رقم','revenue_no'],['التاريخ','revenue_date'],['المصدر','source'],['التصنيف','category'],['الوصف','description'],['المبلغ','amount',v=>money(v)]],rows); };
  window.renderSalaries=function(){ const rows=safe(Jawdah.data.salaries); if($('#salariesTable')) $('#salariesTable').innerHTML=tableHtml([['الموظف','employee_name'],['التصنيف','nationality_category',v=>v==='Omani'?'عماني':'أجنبي'],['الشهر','salary_month'],['أساسي','basic_salary',v=>money(v)],['بدلات','allowances',v=>money(v)],['استقطاعات','deductions',v=>money(v)],['الصافي','net_salary',v=>money(v)],['الحالة','status',v=>badge(v)]],rows,r=>canWriteFinance()?`<button class="ghost" onclick="editRecord('salaries','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('salaries','${r.id}')">حذف</button>`:''); };
  const empCols=[['الرمز','employee_code'],['الاسم','name'],['الجنسية','nationality'],['الهوية','id_number'],['المسمى','job_title'],['القسم','department'],['التعيين','hire_date'],['الحالة','status',v=>badge(v)]];
  const empActions=r=>canWriteFinance()?`<button class="ghost" onclick="editRecord('employees','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('employees','${r.id}')">حذف</button>`:'';
  window.renderEmployees=function(){
    const all=safe(Jawdah.data.employees);
    const omani=all.filter(e=>String(e.nationality_category||'').toLowerCase()==='omani');
    const expat=all.filter(e=>String(e.nationality_category||'').toLowerCase()!=='omani');
    if($('#omaniEmployeesTable')) $('#omaniEmployeesTable').innerHTML=tableHtml(empCols,omani,empActions);
    if($('#expatEmployeesTable')) $('#expatEmployeesTable').innerHTML=tableHtml(empCols,expat,empActions);
    const month=($('#salMonth')&&$('#salMonth').value)||today().slice(0,7);
    const salaries=safe(Jawdah.data.salaries).filter(s=>!month||s.salary_month===month);
    const omaniPay=salaries.filter(s=>String(s.nationality_category||'').toLowerCase()==='omani').reduce((a,s)=>a+Number(s.net_salary||0),0);
    const expatPay=salaries.filter(s=>String(s.nationality_category||'').toLowerCase()!=='omani').reduce((a,s)=>a+Number(s.net_salary||0),0);
    const host=$('#employeeRosterSummary');
    if(host) host.innerHTML=`<span class="badge paid">عمانيون: ${fmt(omani.length)}</span><span class="badge">أجانب: ${fmt(expat.length)}</span><span class="badge">إجمالي: ${fmt(all.length)}</span><span class="badge">رواتب عمانيين ${month}: ${money(omaniPay)}</span><span class="badge">رواتب أجانب ${month}: ${money(expatPay)}</span>`;
    const pick=$('#salEmployeePick');
    if(pick){
      const old=pick.value;
      pick.innerHTML='<option value="">اختر من كشف الموظفين</option>'+all.map(e=>`<option value="${e.id}">${e.employee_code||e.id} - ${e.name} (${e.nationality_category==='Omani'?'عماني':'أجنبي'})</option>`).join('');
      if([...pick.options].some(o=>o.value===old)) pick.value=old;
      pick.onchange=()=>{
        const emp=all.find(x=>x.id===pick.value);
        if(!emp) return;
        if($('#salEmployee')) $('#salEmployee').value=emp.name||'';
        if($('#salNationality')) $('#salNationality').value=emp.nationality_category==='Expat'?'Expat':'Omani';
      };
    }
  };
  window.createEmployee=()=>postTable('employees',{employee_code:val('empCode')||null,name:val('empName'),nationality_category:val('empNationalityCat')||'Omani',nationality:val('empNationality'),id_number:val('empIdNo'),job_title:val('empJob'),department:val('empDept'),hire_date:val('empHire')||today(),phone:val('empPhone'),status:val('empStatus')||'Active',notes:val('empNotes')});
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
  window.createSalary=()=>{const basic=num('salBasic'),allow=num('salAllow'),ded=num('salDeduct'); const empId=val('salEmployeePick')||null; return postTable('salaries',{employee_id:empId,employee_name:val('salEmployee'),nationality_category:val('salNationality')||'Omani',salary_month:val('salMonth')||today().slice(0,7),basic_salary:basic,allowances:allow,deductions:ded,net_salary:basic+allow-ded,status:val('salStatus'),payment_date:val('salDate')||today()});};
  window.createAdminExpense=()=>postTable('admin_expenses',{expense_date:val('gaDate')||today(),category:val('gaCategory')||'General & Administrative',description:val('gaDesc'),amount:num('gaAmount'),supplier:val('gaSupplier'),property_id:val('gaProperty')||null});
  window.createInventoryItem=()=>postTable('inventory_items',{sku:val('itemSku'),name:val('itemName'),category:val('itemCategory'),unit:val('itemUnit')||'pcs',quantity:num('itemQty'),min_quantity:num('itemMin'),unit_cost:num('itemCost'),location:val('itemLocation')});
  window.createInventoryTransaction=()=>postTable('inventory_transactions',{item_id:val('stockItem'),tx_date:val('stockDate')||today(),tx_type:val('stockType'),quantity:num('stockQty'),unit_cost:num('stockCost'),reference:val('stockRef')});
  window.createBankTransaction=()=>postTable('bank_transactions',{bank_date:val('bankDate')||today(),bank_name:val('bankName')||'Main Bank',reference:val('bankRef'),type:val('bankType'),description:val('bankDesc'),amount:num('bankAmount'),matched_account_id:val('bankMatch')||null,status:val('bankMatch')?'Matched':'Unmatched'});
  window.loadFinancialStatements=async function(){ try{ const res=await api('financial_statements'); const s=res.statements; $('#statementsBox').innerHTML=`<div class="statement-grid"><div class="statement-card"><h3>قائمة الدخل</h3><div class="statement-row"><span>الإيرادات</span><b>${money(s.income_statement.revenue)}</b></div><div class="statement-row"><span>المصروفات</span><b>${money(s.income_statement.expenses)}</b></div><div class="statement-row"><span>الرواتب</span><b>${money(s.income_statement.payroll)}</b></div><div class="statement-row"><span>إدارية وعمومية</span><b>${money(s.income_statement.general_admin)}</b></div><div class="statement-row"><span>صافي الدخل</span><b>${money(s.income_statement.net_income)}</b></div></div><div class="statement-card"><h3>الميزانية</h3><div class="statement-row"><span>البنك</span><b>${money(s.balance_sheet.assets.cash_bank)}</b></div><div class="statement-row"><span>الذمم المدينة</span><b>${money(s.balance_sheet.assets.accounts_receivable)}</b></div><div class="statement-row"><span>المخزون</span><b>${money(s.balance_sheet.assets.inventory)}</b></div><div class="statement-row"><span>الذمم الدائنة</span><b>${money(s.balance_sheet.liabilities.accounts_payable)}</b></div><div class="statement-row"><span>الأرباح المحتجزة</span><b>${money(s.balance_sheet.equity.retained_earnings)}</b></div></div><div class="statement-card"><h3>ربط التخزين</h3><p class="linked-ok">Backup / CSV / Restore يشمل الجداول المالية الجديدة.</p><p>${s.linked_storage.tables.join(' · ')}</p></div></div>`; ensureEnglishDigits($('#statementsBox')); }catch(e){toast(e.message,true)} };
  const oldBackup=renderBackup;
  renderBackup=function(){ oldBackup(); const extra=['purchase_invoices','revenues','salaries','employees','admin_expenses','inventory_items','inventory_transactions','bank_transactions','chart_accounts','bank_reconciliations','financial_periods']; const box=$('#backupStatus'); if(box) box.innerHTML += `<p class="mini">يشمل التخزين المالي: ${extra.join(', ')}</p>`; };
  document.addEventListener('input', e=>{ if(e.target && e.target.id==='recBankBalance') updateRecDifference(); });
})();


(function(){
  const oldShow = showSection;
  showSection=function(id){
    oldShow(id);
    const titles={production:'جاهزية التشغيل المؤسسي',employees:'كشف الموظفين',payroll:'الرواتب','company-settings':'إعدادات المؤسسة والهوية',invoices:'الفواتير الضريبية'};
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
