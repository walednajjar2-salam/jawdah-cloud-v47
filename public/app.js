const Jawdah = {
  token: localStorage.getItem('jawdah_cloud_token') || '',
  user: null,
  data: {},
  dashboard: null,
  activeSection: 'dashboard',
  charts: {},
  invoiceForPrint: null,
  uiPermissions: null,
  liveStream: null,
  fieldMode: localStorage.getItem('jawdah_field_mode') === '1'
};
function haptic(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||12); }catch(e){} }
const PROPERTY_STATUSES = ['شاغرة', 'محجوزة', 'مستأجرة', 'صيانة'];
const NAV_SAAS_ITEMS = [
  ['dashboard','لوحة التحكم','🏠'],
  ['properties','المشاريع','🏢'],
  ['tasks','المهام','📋'],
  ['clients','العملاء','👥'],
  ['contracts','العقود','📄'],
  ['revenues','الإيرادات','💰'],
  ['invoices','المدفوعات','💳'],
  ['admin-expenses','المصروفات','📊'],
  ['maintenance','الصيانة','🔧'],
  ['reports','التقارير','📈'],
  ['messages','التنبيهات','🔔'],
  ['walid','وليد · الذكاء','🤖'],
  ['enterprise','التوسع','🏛️'],
  ['production','المتابعة','✅'],
  ['timeline','الجدول الزمني','📅'],
  ['backup','المستندات','📂'],
  ['settings','الإعدادات','⚙️']
];
const SECTION_TITLES = {
  dashboard:'لوحة التحكم','owner-staff':'متابعة الموظفين',properties:'المشاريع',tasks:'المهام',clients:'العملاء',contracts:'العقود',
  revenues:'الإيرادات',invoices:'المدفوعات','admin-expenses':'المصروفات',maintenance:'الصيانة',
  reports:'التقارير',messages:'مركز التنبيهات',walid:'وليد · الذكاء التشغيلي',enterprise:'التوسع المؤسسي',production:'المتابعة',timeline:'الجدول الزمني',
  backup:'المستندات',settings:'الإعدادات',accounts:'الحسابات',users:'المستخدمين',qa:'اختبار التشغيل',
  purchases:'فواتير المشتريات',payroll:'الرواتب',inventory:'المخزن',bank:'كشف البنك',
  'chart-accounts':'دليل الحسابات','bank-reconciliation':'تسوية البنك','financial-periods':'الفترات المالية',statements:'القوائم المالية',
  approvals:'مركز الاعتمادات'
};
function resolveSection(id){ return id==='settings' ? (['admin','owner'].includes(Jawdah.user?.role) ? 'users' : 'backup') : id; }
function canSeeApprovals(){ return Jawdah.user && ['admin','owner','accountant','operations'].includes(Jawdah.user.role); }
function canDecideApprovals(){ return Jawdah.user && ['admin','owner','accountant'].includes(Jawdah.user.role); }
function canSeeInventory(){ return Jawdah.user && ['admin','owner','accountant','operations','maintenance'].includes(Jawdah.user.role); }
function canSeeFinanceSection(id){
  if(id==='inventory') return canSeeInventory();
  return canSeeFinance();
}
const FINANCE_SECTIONS = new Set(['revenues','admin-expenses','accounts','purchases','payroll','inventory','bank','chart-accounts','statements','bank-reconciliation','financial-periods']);
const APP_UI_VERSION = '2026.2';
const DISPLAY_OWNER_NAME = 'يعقوب فاضل حمد الخصيبي';
const DISPLAY_OWNER_ROLE = 'المالك العام';
const OWNER_USERNAMES = new Set(['owner','yaqoub.khasibi','yaqoub','waleed.najjar']);
const DASH_EXEC_COMMANDS = [
  {label:'إضافة عميل', section:'clients', icon:'👥'},
  {label:'إضافة عقار / بناية', section:'properties', icon:'🏢'},
  {label:'إدارة الوحدات', section:'properties', icon:'🏠'},
  {label:'إنشاء عقد', section:'contracts', icon:'📄'},
  {label:'فاتورة من عقد', section:'invoices', icon:'🧾'},
  {label:'تحصيل دفعة', section:'invoices', icon:'💳'},
  {label:'تجديد عقد', section:'contracts', icon:'🔁'},
  {label:'تقرير مالي', section:'reports', icon:'📈'},
  {label:'Backup فوري', section:'backup', icon:'💾', action:'backup'},
  {label:'اختبار التشغيل', section:'qa', icon:'✅', action:'qa'}
];
const DASH_ALL_COMMANDS = [
  {label:'لوحة التحكم', section:'dashboard', icon:'🏠'},
  {label:'المشاريع', section:'properties', icon:'🏢'},
  {label:'المهام', section:'tasks', icon:'📋'},
  {label:'العملاء', section:'clients', icon:'👥'},
  {label:'العقود', section:'contracts', icon:'📄'},
  {label:'المدفوعات', section:'invoices', icon:'💳'},
  {label:'الصيانة', section:'maintenance', icon:'🔧'},
  {label:'التقارير', section:'reports', icon:'📈'},
  {label:'الرسائل', section:'messages', icon:'📨'},
  {label:'المتابعة', section:'production', icon:'✅', action:'production'},
  {label:'الجدول الزمني', section:'timeline', icon:'📅'},
  {label:'المستندات', section:'backup', icon:'📂'},
  {label:'الإيرادات', section:'revenues', icon:'💰', finance:true},
  {label:'المصروفات', section:'admin-expenses', icon:'📊', finance:true},
  {label:'الحسابات', section:'accounts', icon:'💼', finance:true},
  {label:'مشتريات', section:'purchases', icon:'🧾', finance:true},
  {label:'الرواتب', section:'payroll', icon:'👔', finance:true},
  {label:'المخزن', section:'inventory', icon:'📦', finance:true},
  {label:'كشف البنك', section:'bank', icon:'🏦', finance:true},
  {label:'دليل الحسابات', section:'chart-accounts', icon:'📒', finance:true},
  {label:'قوائم مالية', section:'statements', icon:'📘', finance:true, action:'statements'},
  {label:'تسوية البنك', section:'bank-reconciliation', icon:'⚖️', finance:true},
  {label:'الفترات المالية', section:'financial-periods', icon:'📅', finance:true},
  {label:'المستخدمين', section:'users', icon:'🛡️', admin:true},
  {label:'اختبار التشغيل', section:'qa', icon:'🔬', action:'qa'}
];
const OPS_QUICK_COMMANDS = [
  {label:'عقار', section:'properties', icon:'🏢'},
  {label:'عميل', section:'clients', icon:'👥'},
  {label:'عقد', section:'contracts', icon:'📄'},
  {label:'صيانة', section:'maintenance', icon:'🔧'},
  {label:'فاتورة', section:'invoices', icon:'💳'},
  {label:'مصروف', section:'admin-expenses', icon:'📊', finance:true},
  {label:'مالي', section:'accounts', icon:'💼', finance:true},
  {label:'مشتريات', section:'purchases', icon:'🧾', finance:true},
  {label:'رواتب', section:'payroll', icon:'👔', finance:true},
  {label:'مخزن', section:'inventory', icon:'📦', finance:true},
  {label:'بنك', section:'bank', icon:'🏦', finance:true},
  {label:'تقارير', section:'reports', icon:'📈'},
  {label:'Backup', section:'backup', icon:'💾', action:'backup'},
  {label:'متابعة', section:'production', icon:'✅', action:'production'},
  {label:'اختبار', section:'qa', icon:'🔬', action:'qa'}
];
function dashKpis(){ return Jawdah.dashboard?.kpis || {properties:0,rented:0,vacant:0,income:0,expense:0,net:0,overdue:0,occupancy:0,health:0,maintenance:0,expiring:0,expired:0,billed:0,paid:0}; }
function kpiSparkSvg(vals,color){
  const c=color||'#F5D76E';
  const v=vals&&vals.length?vals:[2,4,3,5,4,6];
  const max=Math.max(...v,1);
  const pts=v.map((n,i)=>{const x=2+i*(36/Math.max(v.length-1,1)); const y=14-(n/max)*12; return x+','+y;}).join(' ');
  return '<svg class="kpi-spark" viewBox="0 0 40 16" aria-hidden="true"><polyline fill="none" stroke="'+c+'" stroke-width="1.6" stroke-linecap="round" points="'+pts+'"/></svg>';
}
function kpiStatusTone(key,k){
  if(['overdue','maintenance','vacant','expired','expiring'].includes(key)) return Number(k[key]||0)>0?'tone-warn':'tone-ok';
  if(key==='health'||key==='occupancy'){const v=Number(k[key]||0); return v>=85?'tone-ok':v>=65?'tone-med':'tone-warn';}
  if(key==='net'||key==='income'||key==='paid') return Number(k[key]||0)>0?'tone-ok':'tone-neutral';
  return 'tone-neutral';
}
function renderKpiPro(item,series,k){
  const spark=kpiSparkSvg(series.map(x=>Number(x.income||0)));
  const tone=kpiStatusTone(item.key||'',k);
  const trend=item.trend||'↑';
  const key=htmlEscape(item.key||item.go||'');
  return '<article class="saas-kpi saas-kpi-pro saas-glass '+tone+'" data-kpi-key="'+key+'" onclick="openKpiInsightPanel(\''+key+'\')"><div class="saas-kpi-top"><div class="saas-kpi-icon">'+item.icon+'</div>'+spark+'</div><div class="saas-kpi-body"><strong>'+item.value+'</strong><span class="saas-kpi-trend">'+trend+'</span></div><span>'+item.label+'</span><small class="saas-kpi-hint">'+htmlEscape(item.hint||'')+' · اضغط للتحليل</small></article>';
}
function kpiCatalog(){
  const k=dashKpis();
  const series=chartSeries();
  return {
    properties:{icon:'🏢',label:'إجمالي المشاريع',value:fmt(k.properties),go:'properties',hint:'محفظة كاملة',trend:'↑',analysis:'Portfolio size / حجم المحفظة العقارية'},
    rented:{icon:'✅',label:'المشاريع النشطة',value:fmt(k.rented),go:'properties',hint:'مستأجرة',trend:'↑',analysis:'Active leased units / الوحدات المؤجرة'},
    income:{icon:'💰',label:'الإيرادات',value:money(k.income),go:canSeeFinance()?'revenues':'reports',hint:'إجمالي',trend:'↑',analysis:'Total recognized income / إجمالي الإيرادات'},
    expense:{icon:'📊',label:'المصروفات',value:money(k.expense),go:canSeeFinance()?'admin-expenses':'reports',hint:'تشغيل',trend:'↓',analysis:'Operating expenses / المصروفات التشغيلية'},
    net:{icon:'📈',label:'صافي الربح',value:money(k.net),go:'reports',hint:'هامش',trend:Number(k.net||0)>=0?'↑':'↓',analysis:'Net profit after expenses / صافي الربح'},
    health:{icon:'🎯',label:'جاهزية النظام',value:fmt(k.health)+'%',go:'reports',hint:'صحة',trend:'↑',analysis:'Composite health score / مؤشر الجاهزية'},
    vacant:{icon:'🏠',label:'وحدات شاغرة',value:fmt(k.vacant||0),go:'properties',hint:'تسويق',trend:'↓',analysis:'Vacant inventory / وحدات شاغرة'},
    maintenance:{icon:'🔧',label:'صيانة مفتوحة',value:fmt(k.maintenance||0),go:'maintenance',hint:'طلبات',trend:'↓',analysis:'Open maintenance queue / طلبات الصيانة'},
    overdue:{icon:'⏰',label:'المتأخرات',value:money(k.overdue||0),go:'invoices',hint:'تحصيل',trend:'↓',analysis:'Overdue receivables / ذمم متأخرة'},
    occupancy:{icon:'🔑',label:'الإشغال',value:fmt(k.occupancy)+'%',go:'properties',hint:'مؤشر',trend:'↑',analysis:'Occupancy rate / نسبة الإشغال'},
    paid:{icon:'💳',label:'التحصيل',value:money(k.paid||0),go:'invoices',hint:'محصّل',trend:'↑',analysis:'Collected amounts / المبالغ المحصّلة'}
  };
}
function openKpiInsightPanel(key){
  const cat=kpiCatalog();
  const item=cat[key]||Object.values(cat).find(x=>x.go===key)||Object.values(cat)[0];
  if(!item) return;
  const panel=$('#kpiInsightPanel'); if(!panel) return;
  const series=chartSeries();
  const spark=kpiSparkSvg(series.map(x=>Number(x.income||0)),'#F5D76E');
  panel.innerHTML='<div class="kpi-insight-backdrop" onclick="closeKpiInsightPanel()"></div><div class="kpi-insight-sheet saas-glass"><button type="button" class="kpi-insight-close ghost" onclick="closeKpiInsightPanel()">✕</button><div class="kpi-insight-head"><span class="saas-kpi-icon">'+item.icon+'</span><div><h3>'+htmlEscape(item.label)+'</h3><strong>'+item.value+'</strong><span class="saas-kpi-trend">'+item.trend+'</span></div></div>'+spark+'<p class="kpi-insight-analysis">'+htmlEscape(item.analysis)+'</p><div class="kpi-insight-actions"><button type="button" class="gold-btn" onclick="closeKpiInsightPanel();showSection(\''+item.go+'\')">فتح '+htmlEscape(item.label)+'</button><button type="button" class="ghost" onclick="closeKpiInsightPanel();showSection(\'reports\')">التقارير</button></div></div>';
  panel.classList.add('show');
  haptic(12);
}
function closeKpiInsightPanel(){ const p=$('#kpiInsightPanel'); if(p) p.classList.remove('show'); }
function uiAllowedSection(id){ const s=Jawdah.uiPermissions?.sections; return !s||!s.length||s.includes(id); }
function uiAllowedKpi(key){ const k=Jawdah.uiPermissions?.kpis; return !k||!k.length||k.includes(key); }
function dashDecisions(){ return Jawdah.dashboard?.decisions || []; }
function canAccessSection(id){
  if(!uiAllowedSection(id)) return false;
  if(id==='inventory' && !canSeeInventory()) return false;
  if(FINANCE_SECTIONS.has(id) && id!=='inventory' && !canSeeFinance()) return false;
  if(id==='users' && !['admin','owner'].includes(Jawdah.user?.role)) return false;
  if(id==='owner-staff' && !['admin','owner'].includes(Jawdah.user?.role)) return false;
  if(id==='approvals' && !canSeeApprovals()) return false;
  return true;
}
function friendlyMsg(e, fallback='تعذر إتمام العملية'){
  const raw=String(typeof e==='string'?e:(e?.message||'')).trim();
  const detail=String(e?.detail||'').trim();
  const combined=detail && (raw==='Server error'||!raw) ? detail : raw;
  if(!combined||combined==='Request failed'||combined==='Invalid response'||/failed to fetch|network/i.test(combined)) return fallback;
  if(/403|forbidden|permission denied|صلاح/i.test(combined)) return 'لا تملك صلاحية لهذه العملية — استخدم حساب admin أو operations';
  if(/401|unauthorized|token|session|authentication/i.test(combined)) return 'انتهت الجلسة، سجّل الدخول مجدداً';
  if(/404|not found|لم يتم/i.test(combined)) return 'العنصر غير موجود';
  if(/duplicate|unique|exists/i.test(combined)) return 'البيانات مسجلة مسبقاً';
  if(/contract requires property|invalid property or client/i.test(combined)) return 'اختر العقار والعميل وأدخل مبلغ إيجار أكبر من صفر';
  if(/create invoices from a contract/i.test(combined)) return 'الفاتورة تُنشأ من العقد فقط — من العقود اضغط «فاتورة» أو اعتمد العقد';
  if(/manual invoice requires/i.test(combined)) return 'أنشئ عقداً أولاً ثم أنشئ الفاتورة منه';
  if(/missing required field/i.test(combined)) return 'أكمل الحقول المطلوبة (البناية، الشقة، الغرفة، الموقع للعقار)';
  if(/missing.*name|اسم العميل/i.test(combined)) return 'اسم العميل مطلوب';
  if(/[\u0600-\u06FF]/.test(combined)) return combined.replace(/^(error|detail)[:\s]*/i,'');
  if(/not null constraint|integrity/i.test(combined)) return 'بيانات ناقصة أو غير مكتملة — راجع الحقول المطلوبة';
  return combined.length>3 ? combined : fallback;
}
function toastOk(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }
function toastNotice(msg){ toastOk(friendlyMsg(msg,'يرجى مراجعة البيانات')); }
function toastErr(e, fallback){ toastOk(friendlyMsg(e,fallback)); }
function htmlEscape(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
const FAB_QUICK_COMMANDS = [
  {label:'لوحة التحكم', section:'dashboard', icon:'🏠'},
  {label:'إضافة عقار', section:'properties', icon:'🏢'},
  {label:'إضافة عميل', section:'clients', icon:'👥'},
  {label:'إنشاء عقد', section:'contracts', icon:'📄'},
  {label:'الفواتير', section:'invoices', icon:'💳'},
  {label:'التقارير', section:'reports', icon:'📈'},
  {label:'Backup', section:'backup', icon:'💾', action:'backup'},
  {label:'اختبار', section:'qa', icon:'✅', action:'qa'}
];
function syncFabDock(){
  const dock=$('#saasFabDock'); if(!dock) return;
  const loggedIn=$('#app') && !$('#app').classList.contains('hidden') && Jawdah.user;
  dock.classList.toggle('hidden', !loggedIn);
  const menu=$('#saasFabMenu'); if(!menu || !loggedIn) return;
  menu.innerHTML=FAB_QUICK_COMMANDS.filter(cmd=>{
    if(cmd.finance && !canSeeFinanceSection(cmd.section)) return false;
    return canAccessSection(cmd.section);
  }).map(cmd=>`<button type="button" class="saas-fab-item" data-fab-section="${htmlEscape(cmd.section)}" data-fab-action="${htmlEscape(cmd.action||'')}"><span class="saas-fab-item-ico">${cmd.icon}</span><span>${htmlEscape(cmd.label)}</span></button>`).join('');
  if(!menu.dataset.bound){
    menu.dataset.bound='1';
    menu.addEventListener('click',e=>{
      const b=e.target.closest('[data-fab-section]'); if(!b) return;
      dashCommandClick(b.dataset.fabSection,b.dataset.fabAction||'');
      $('#saasFabDock')?.classList.remove('open');
      $('#saasFabToggle')?.setAttribute('aria-expanded','false');
    });
  }
}
function initFabDock(){
  const dock=$('#saasFabDock'), toggle=$('#saasFabToggle'), top=$('#saasScrollTop');
  if(toggle && dock){
    toggle.onclick=e=>{ e.stopPropagation(); const open=dock.classList.toggle('open'); toggle.setAttribute('aria-expanded', open?'true':'false'); };
    document.addEventListener('click',e=>{
      if(!dock.classList.contains('open')) return;
      if(!dock.contains(e.target)){ dock.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); }
    });
  }
  if(top){
    top.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
    const onScroll=()=>top.classList.toggle('visible', window.scrollY>420);
    window.addEventListener('scroll',onScroll,{passive:true});
    onScroll();
  }
}
function syncOpsBar(){
  const bar=$('#opsQuickBar'); if(!bar) return;
  try{
    bar.innerHTML='<span class="ops-label">عمليات:</span>';
    OPS_QUICK_COMMANDS.forEach(cmd=>{
      if(cmd.finance && !canSeeFinanceSection(cmd.section)) return;
      if(cmd.admin && !['admin','owner'].includes(Jawdah.user?.role)) return;
      if(!canAccessSection(cmd.section)) return;
      const b=document.createElement('button'); b.type='button';
      b.textContent=`${cmd.icon} ${cmd.label}`;
      b.onclick=()=>dashCommandClick(cmd.section, cmd.action||'');
      bar.appendChild(b);
    });
  }catch(e){}
}
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
  if(!res.ok || data.ok === false){
    const msg=(data.error==='Server error'&&data.detail)?data.detail:(data.error||data.detail||'');
    const err=new Error(msg); err.status=res.status; err.detail=data.detail; throw err;
  }
  return data;
};
const fmt = n => Number(n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const money = n => fmt(n) + ' OMR';
function dashCommandClick(section, action){
  try{
    if(action==='backup') return (window.downloadBackup||downloadBackup)();
    if(action==='qa') return (window.runQA||runQA)();
    if(action==='production'){ showSection('production'); return (window.loadProductionStatus||loadProductionStatus)?.(); }
    if(action==='statements'){ showSection('statements'); return (window.loadFinancialStatements||loadFinancialStatements)?.(); }
    if(section==='reports' || action==='reports'){ showSection('reports'); return (window.renderReports||renderReports)?.(); }
    showSection(section);
  }catch(e){ toastErr(e); }
}
window.dashCommandClick = dashCommandClick;
function renderDashCommands(){
  try{
    const k=dashKpis();
    const data=Jawdah.data||{};
    const collectionRate=k.billed?Math.round((Number(k.paid||0)/Number(k.billed||1))*100):0;
    const openMaint=(data.maintenance||[]).filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/)).length;
    const hero=$('#dashHeroStats');
    if(hero) hero.innerHTML=[
      `<span class="saas-chip">جاهزية ${fmt(k.health||0)}%</span>`,
      `<span class="saas-chip">الإشغال ${fmt(k.occupancy||0)}%</span>`,
      `<span class="saas-chip">التحصيل ${fmt(collectionRate)}%</span>`,
      `<span class="saas-chip ${Number(k.overdue||0)>0?'danger':''}">متأخر ${money(k.overdue||0)}</span>`,
      `<span class="saas-chip">صيانة ${fmt(openMaint)}</span>`
    ].join('');
    const mkBtn=(cmd,exec)=>`<button type="button" class="saas-cmd${exec?' saas-cmd-exec':''}" data-dash-section="${htmlEscape(cmd.section)}" data-dash-action="${htmlEscape(cmd.action||'')}"><span class="saas-cmd-icon">${cmd.icon}</span><b>${htmlEscape(cmd.label)}</b>${exec?'<small>أمر تنفيذي سريع</small>':''}</button>`;
    const quick=$('#dashQuickActions');
    if(quick){
      quick.innerHTML=DASH_EXEC_COMMANDS.filter(cmd=>canAccessSection(cmd.section)).map(cmd=>mkBtn(cmd,true)).join('');
      if(!quick.dataset.bound){ quick.dataset.bound='1'; quick.addEventListener('click',e=>{ const b=e.target.closest('[data-dash-section]'); if(!b) return; dashCommandClick(b.dataset.dashSection,b.dataset.dashAction||''); }); }
    }
    const grid=$('#dashCommandGrid');
    if(grid){
      grid.innerHTML=DASH_ALL_COMMANDS.filter(cmd=>{
        if(cmd.finance && !canSeeFinanceSection(cmd.section)) return false;
        if(cmd.admin && !['admin','owner'].includes(Jawdah.user?.role)) return false;
        return canAccessSection(cmd.section);
      }).map(cmd=>mkBtn(cmd,false)).join('');
      if(!grid.dataset.bound){ grid.dataset.bound='1'; grid.addEventListener('click',e=>{ const b=e.target.closest('[data-dash-section]'); if(!b) return; dashCommandClick(b.dataset.dashSection,b.dataset.dashAction||''); }); }
    }
    const panel=$('#dashDecisionPanel');
    if(panel){
      const decisions=dashDecisions();
      const matrix=`<div class="saas-ops-matrix"><div><b>العملاء</b><span>${fmt((data.clients||[]).length)}</span></div><div><b>العقارات</b><span>${fmt(k.properties||0)}</span></div><div><b>العقود</b><span>${fmt((data.contracts||[]).length)}</span></div><div><b>الفواتير</b><span>${fmt((data.invoices||[]).length)}</span></div><div><b>التحصيل</b><span>${money(k.paid||0)}</span></div><div><b>الصافي</b><span>${money(k.net||0)}</span></div></div>`;
      panel.innerHTML=`<h4>📌 قرارات الآن</h4>${matrix}${decisions.length?decisions.map(d=>`<div class="saas-decision-row"><span class="saas-status pending">${htmlEscape(d.level||'تنبيه')}</span><p>${htmlEscape(d.text)}</p></div>`).join(''):'<p class="mini">لا قرارات عاجلة — النظام مستقر</p>'}`;
    }
  }catch(e){}
}
const today = () => new Date().toISOString().slice(0,10);
const byId = (table,id) => (Jawdah.data[table]||[]).find(x=>x.id===id) || {};
const roleName = r => ({owner:DISPLAY_OWNER_ROLE,admin:'مدير تنفيذي',accountant:'محاسب',operations:'العمليات',maintenance:'الصيانة',viewer:'مشاهد'}[r]||r);
function displayUserName(u){
  if(!u) return '';
  if(u.role==='owner' || OWNER_USERNAMES.has(String(u.username||'').toLowerCase())) return DISPLAY_OWNER_NAME;
  return u.name || u.username || '';
}
function displayUserRole(u){
  if(!u) return '';
  if(u.role==='owner' || OWNER_USERNAMES.has(String(u.username||'').toLowerCase())) return DISPLAY_OWNER_ROLE;
  return roleName(u.role);
}
function syncLoginOwnerBranding(){
  const name=DISPLAY_OWNER_NAME;
  const slogan='نحو التميز والتقدم في عالم الضيافة والعقارات';
  const label=`${name} · ${slogan}`;
  const track=document.querySelector('.login-owner-track');
  if(track){
    document.querySelector('.login-owner-ticker')?.setAttribute('aria-label',label);
    track.innerHTML=[
      `<span class="login-owner-item"><em>${htmlEscape(name)}</em> · <strong>${slogan}</strong></span>`,
      `<span class="login-owner-item" aria-hidden="true"><em>${htmlEscape(name)}</em> · <strong>${slogan}</strong></span>`,
      `<span class="login-owner-item" aria-hidden="true"><em>${htmlEscape(name)}</em> · <strong>${slogan}</strong></span>`
    ].join('');
  }
  document.querySelectorAll('.footer-ar span, .footer-en span').forEach(el=>{
    if(el.textContent.includes('المالك:')) el.textContent='المالك: '+name;
    if(el.textContent.includes('Owner:')) el.textContent='Owner: Yaqoub Fadel Saeed Al-Khasibi';
  });
}
function applyUserHeader(){
  if(!Jawdah.user) return;
  const name=displayUserName(Jawdah.user);
  const role=displayUserRole(Jawdah.user);
  const initial=(name||'ي').trim().charAt(0);
  if($('#userName')) $('#userName').textContent=name;
  if($('#userRole')) $('#userRole').textContent=role;
  if($('#avatar')) $('#avatar').textContent=initial;
}
function toast(msg, err=false){ if(err) toastNotice(msg); else toastOk(msg); }
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
    localStorage.setItem('jawdah_last_user', username);
    if(res.must_change_password) Jawdah.user.must_change_password=true;
    showAppShell();
    await loadAll(); haptic(12); toast('تم تسجيل الدخول');
  }catch(e){ toastErr(e,'اسم المستخدم أو كلمة المرور غير صحيحة'); }
}
async function logout(){ try{await api('logout',{method:'POST'});}catch(e){} localStorage.removeItem('jawdah_cloud_token'); Jawdah.token=''; showLoginShell(); }
function ensureDashActive(){
  const dash=$('#sec-dashboard');
  if(!dash) return;
  if(!dash.classList.contains('active')){
    $$('.section').forEach(sec=>sec.classList.remove('active','section-fade-out','section-fade-in'));
    dash.classList.add('active');
  }
}
function showLoginShell(){
  document.body.classList.add('login-ultra','saas-login','enterprise-vision','va-theme');
  document.body.classList.remove('saas-luxury','dash-pro-active','field-mode','app-ready');
  $('#app')?.classList.add('hidden');
  $('#loginScreen')?.classList.remove('hidden');
  if(typeof window.__lqHideBoot==='function') window.__lqHideBoot();
  if(typeof syncVisionLayers==='function') syncVisionLayers();
}
function showAppShell(){
  document.body.classList.remove('login-ultra','saas-login');
  document.body.classList.add('saas-luxury','enterprise-vision','va-theme','app-ready');
  $('#app')?.classList.remove('hidden');
  $('#loginScreen')?.classList.add('hidden');
  ensureDashActive();
  if(typeof renderDashLoadingSkeleton==='function') renderDashLoadingSkeleton();
  if(typeof window.__lqShowBoot==='function') window.__lqShowBoot('جاري تحميل لوحة التحكم…');
  if(typeof syncVisionLayers==='function') syncVisionLayers();
}
async function checkSession(){
  Jawdah.token=Jawdah.token||localStorage.getItem('jawdah_cloud_token')||'';
  if(!Jawdah.token){
    showLoginShell();
    return;
  }
  try{
    const me=await api('me');
    Jawdah.user=me.user;
    showAppShell();
    await loadAll();
  }catch(e){
    localStorage.removeItem('jawdah_cloud_token');
    Jawdah.token='';
    showLoginShell();
  }
}
function renderDashLoadingSkeleton(){
  const sk=(cls,n)=>Array(n).fill('<div class="saas-skeleton '+cls+'"></div>').join('');
  const kpiHost=$('#saasKpiRow'); if(kpiHost) kpiHost.innerHTML=sk('saas-skeleton-kpi',8);
  const kpiHost2=$('#saasKpiRow2'); if(kpiHost2) kpiHost2.innerHTML=sk('saas-skeleton-kpi',4);
  const hero=$('#dashExecHero'); if(hero){ hero.className='saas-exec-hero saas-glass lq-area-hero'; hero.innerHTML=sk('saas-skeleton-hero',1); }
  const sim=$('#dashSimStage'); if(sim){ sim.className='lq-sim-stage saas-glass lq-area-sim'; sim.innerHTML=sk('saas-skeleton-tile',1); }
  const mega=$('#dashMegaCockpit'); if(mega){ mega.className='dash-mega-cockpit lq-area-cockpit'; mega.innerHTML=sk('saas-skeleton-tile',6); }
  $$('.saas-chart-panel .canvas-wrap').forEach(w=>{
    w.classList.remove('chart-drawn');
    let overlay=w.querySelector('.saas-chart-loading');
    if(!overlay){ overlay=document.createElement('div'); overlay.className='saas-skeleton saas-skeleton-chart saas-chart-loading'; overlay.style.cssText='position:absolute;inset:0;z-index:2'; w.appendChild(overlay); }
    overlay.style.display='block';
  });
}
async function loadAll(){
  renderDashLoadingSkeleton();
  ensureDashActive();
  try{
    const res=await api('bootstrap');     Jawdah.data=res.data; Jawdah.dashboard=res.dashboard; Jawdah.user=res.user;
    try{
      const perm=await api('permissions/ui');
      Jawdah.uiPermissions={
        sections:perm.sections||[],
        kpis:perm.kpis||[],
        write_sections:perm.write_sections||[],
        read_only:Boolean(perm.read_only),
        role:perm.role||Jawdah.user?.role,
      };
    }catch(e){ Jawdah.uiPermissions=null; }
    if(typeof window.lqApplyRoleUi==='function') window.lqApplyRoleUi();
    applyUserHeader();
    if(window.LQ_STAFF_FIELD) window.LQ_STAFF_FIELD.autoFieldForRole();
    applyFieldMode();
    buildNav(); renderSidebarUser(); syncOpsBar(); syncFabDock(); renderAll();
    const bootSec = window.__lqBootSection || Jawdah.activeSection || 'dashboard';
    showSection(bootSec);
    if (window.__lqBootSection) window.__lqBootSection = null;
    ensureEnglishDigits();
    if(window.LQ_ALERT_CENTER && Jawdah.dashboard?.kpis){
      window.LQ_ALERT_CENTER.updateBell({ total: Jawdah.dashboard.kpis.alert_center_total });
    }
    connectLiveStream();
    if(typeof refreshVisionAi==='function') refreshVisionAi();
    if(window.LQ_WALID_INTEL) window.LQ_WALID_INTEL.refresh().catch(()=>{});
    if(typeof syncEnterpriseVision==='function') syncEnterpriseVision();
    if(window.LQ_FIELD_APP && typeof LQ_FIELD_APP.afterBoot==='function') await LQ_FIELD_APP.afterBoot();
    if(window.LQ_SECURITY && typeof LQ_SECURITY.gateAfterAuth==='function') LQ_SECURITY.gateAfterAuth();
  }catch(e){
    toastErr(e,'تعذر تحميل البيانات');
    ensureDashActive();
    showSection('dashboard');
    const kpiHost=$('#saasKpiRow'); if(kpiHost) kpiHost.innerHTML='<p class="mini" style="grid-column:1/-1;padding:16px">تعذر تحميل البيانات — أعد المحاولة</p>';
  }finally{
    if(typeof window.__lqHideBoot==='function') window.__lqHideBoot();
  }
}
function renderSidebarUser(){
  const el=$('#sidebarUser'); if(!el||!Jawdah.user) return;
  const name=displayUserName(Jawdah.user);
  const role=displayUserRole(Jawdah.user);
  const initial=(name||'ي').trim().charAt(0);
  el.innerHTML=`<div class="su-avatar">${initial}</div><div class="su-info"><div class="su-name">${htmlEscape(name)}</div><div class="su-role">${htmlEscape(role)}</div><button type="button" class="su-logout">Sign Out · خروج</button></div>`;
  el.querySelector('.su-logout').onclick=logout;
}
function buildNav(){
  const nav=$('#nav'); if(!nav) return; nav.innerHTML='';
  const addGroup=(t)=>{const g=document.createElement('div'); g.className='nav-group-label'; g.textContent=t; nav.appendChild(g);};
  if(['admin','owner'].includes(Jawdah.user?.role)){
    addGroup('Owner · المالك');
    const ob=document.createElement('button'); ob.dataset.section='owner-staff';
    ob.innerHTML='<span class="nav-icon">👑</span><span class="nav-text"><span class="nav-ar">متابعة الموظفين</span></span>';
    ob.onclick=()=>showSection('owner-staff'); nav.appendChild(ob);
  }
  addGroup('Operations · التشغيل');
  NAV_SAAS_ITEMS.forEach(([id,label,icon])=>{
    if(!uiAllowedSection(id)) return;
    if(['revenues','admin-expenses'].includes(id) && !canSeeFinance()) return;
    if(id==='settings' && !Jawdah.user) return;
    const b=document.createElement('button'); b.dataset.section=id;
    b.innerHTML=`<span class="nav-icon">${icon}</span><span class="nav-text"><span class="nav-ar">${label}</span></span>`;
    b.onclick=()=>showSection(id); nav.appendChild(b);
  });
  if(canSeeFinance() || canSeeInventory()){
    addGroup('Finance · المالية');
    [['accounts','الحسابات','💼'],['purchases','مشتريات','🧾'],['payroll','رواتب','👔'],['inventory','مخزن','📦'],['bank','البنك','🏦'],['chart-accounts','دليل حسابات','📒'],['statements','قوائم مالية','📘']].forEach(([id,label,icon])=>{
      if(!canSeeFinanceSection(id)) return;
      const b=document.createElement('button'); b.dataset.section=id; b.className='nav-finance-extra';
      b.innerHTML=`<span class="nav-icon">${icon}</span><span class="nav-text"><span class="nav-ar">${label}</span></span>`;
      b.onclick=()=>showSection(id); nav.appendChild(b);
    });
  }
  if(canSeeApprovals()){
    addGroup('Governance · الاعتمادات');
    const b=document.createElement('button'); b.dataset.section='approvals';
    b.innerHTML='<span class="nav-icon">✅</span><span class="nav-text"><span class="nav-ar">مركز الاعتمادات</span></span>';
    b.onclick=()=>showSection('approvals'); nav.appendChild(b);
  }
  if(['admin','owner'].includes(Jawdah.user?.role)){
    addGroup('Intelligence · الإدارة');
    const b=document.createElement('button'); b.dataset.section='users';
    b.innerHTML=`<span class="nav-icon">🛡️</span><span class="nav-text"><span class="nav-ar">المستخدمين</span></span>`;
    b.onclick=()=>showSection('users'); nav.appendChild(b);
  }
  renderDashSideMenu();
}
function renderDashSideMenu(){
  const host=$('#dashSideMenu'); if(!host) return;
  const items=[];
  NAV_SAAS_ITEMS.forEach(([id,label,icon])=>{
    if(['revenues','admin-expenses'].includes(id) && !canSeeFinance()) return;
    items.push({id,label,icon});
  });
  if(canSeeFinance() || canSeeInventory()){
    [['accounts','الحسابات','💼'],['purchases','مشتريات','🧾'],['payroll','رواتب','👔'],['inventory','مخزن','📦'],['bank','البنك','🏦'],['chart-accounts','دليل حسابات','📒'],['statements','قوائم مالية','📘']].forEach(([id,label,icon])=>{ if(canSeeFinanceSection(id)) items.push({id,label,icon}); });
  }
  if(['admin','owner'].includes(Jawdah.user?.role)) items.push({id:'users',label:'المستخدمين',icon:'🛡️'});
  const active=Jawdah.activeSection||'dashboard';
  host.innerHTML=items.map(x=>`<button type="button" class="saas-dash-menu-btn${active===x.id?' active':''}" onclick="showSection('${x.id}')"><span class="saas-dash-menu-ico">${x.icon}</span><span>${htmlEscape(x.label)}</span></button>`).join('');
}
function renderSectionSkeleton(id){
  const sec=$('#sec-'+resolveSection(id)); if(!sec||id==='dashboard') return;
  if(sec.querySelector('.section-skeleton-overlay')) return;
  const overlay=document.createElement('div');
  overlay.className='section-skeleton-overlay';
  overlay.innerHTML='<div class="saas-skeleton saas-skeleton-tile"></div><div class="saas-skeleton saas-skeleton-tile"></div><div class="saas-skeleton saas-skeleton-tile"></div>';
  sec.appendChild(overlay);
  setTimeout(()=>overlay.remove(),450);
}
function showSection(id){
  if(!canAccessSection(id)){
    const label=SECTION_TITLES[id]||id;
    toastOk(`لا تملك صلاحية الوصول إلى: ${label}`);
    return;
  }
  const resolved=resolveSection(id);
  const needsSkeleton=!['dashboard','owner-staff','tasks','messages','walid','enterprise','timeline'].includes(resolved);
  if(needsSkeleton){ const sk=$('#sec-'+resolved); if(sk && !sk.dataset.rendered) renderSectionSkeleton(id); }
  Jawdah.activeSection=id;
  let s=$('#sec-'+resolved);
  if(!s){ id='dashboard'; Jawdah.activeSection='dashboard'; s=$('#sec-dashboard'); }
  if(s){
    s.classList.add('active','section-fade-in');
    s.dataset.rendered='1';
    $$('.section').forEach(sec=>{
      if(sec!==s) sec.classList.remove('active','section-fade-out','section-fade-in');
    });
    setTimeout(()=>s.classList.remove('section-fade-in'),320);
  }
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.section===id));
  document.body.classList.toggle('dash-pro-active', resolved==='dashboard');
  $('#sectionTitle').textContent = SECTION_TITLES[id]||SECTION_TITLES[resolved]||'مشاريع الانطلاقة';
  if(resolved==='tasks') renderTasksPage();
  if(resolved==='messages') renderMessagesPage();
  if(resolved==='walid') renderWalidPage();
  if(resolved==='enterprise') renderEnterprisePage();
  if(resolved==='timeline') renderTimelinePage();
  if(resolved==='owner-staff' && window.LQ_OWNER_STAFF) LQ_OWNER_STAFF.render();
  if(resolved==='dashboard') renderDashboard();
  populateSelects();
  if(resolved==='reports' && typeof renderReports === 'function') renderReports();
  if(resolved==='contracts'){
    renderContracts();
    if(typeof window.renderContractsAdvanced==='function') window.renderContractsAdvanced();
  }
  if(resolved==='statements' && typeof loadFinancialStatements === 'function') loadFinancialStatements();
  if(typeof renderFinanceSuite==='function' && ['revenues','admin-expenses','accounts','purchases','payroll','inventory','bank','chart-accounts','statements','bank-reconciliation','financial-periods'].includes(resolved)) renderFinanceSuite();
  if(resolved==='approvals' && window.LQ_APPROVALS){ const g=$('#approvalsGuide'); if(g) g.innerHTML=LQ_APPROVALS.explainHtml(); LQ_APPROVALS.renderTable(); }
  if(innerWidth<1100) $('#sidebar').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  setTimeout(scheduleDrawCharts,50); ensureEnglishDigits();
}
function renderAll(){
  try{
    renderProperties(); renderClients(); renderContracts(); renderInvoices(); renderAccounts(); renderMaintenance(); renderUsers(); renderBackup(); renderQA();
    if(typeof renderFinanceSuite==='function') renderFinanceSuite();
    if($('#sec-dashboard')?.classList.contains('active')) renderDashboard();
  }catch(e){}
}
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
  if(st.includes('done')||st.includes('closed')||st.includes('complete')) return `<span class="mq-tag done">Completed</span>`;
  if(String(m.priority||'').toLowerCase()==='high') return `<span class="mq-tag high">High Priority</span>`;
  return `<span class="mq-tag progress">In Progress</span>`;
}
function mapStatusBadge(status){
  const s=String(status||'');
  if(s.includes('مستأ')||s.toLowerCase().includes('rent')) return `<span class="map-rented-badge">Rented</span>`;
  if(s.includes('شاغ')||s.toLowerCase().includes('vacant')) return `<span class="map-vacant-badge">Vacant</span>`;
  if(s.includes('صيان')||s.toLowerCase().includes('maint')) return `<span class="map-maint-badge">Maintenance</span>`;
  return `<span class="map-rented-badge">${s||'Active'}</span>`;
}
function showMapPopup(p, leftPct, topPct){
  const box=$('#mapPopup'); if(!box) return;
  const photoUrl=typeof lqPropertyImageUrl==='function'?lqPropertyImageUrl(p):null;
  const thumb=photoUrl
    ? `<div class="map-thumb"><img class="lq-prop-photo" src="${htmlEscape(photoUrl)}" alt="${htmlEscape(propertyLabel(p))}"></div>`
    : `<div class="map-thumb">${typeof lqPropertyEmoji==='function'?lqPropertyEmoji(p):'🏠'}</div>`;
  box.classList.remove('hidden');
  box.style.left=`clamp(12px, calc(${leftPct}% - 130px), calc(100% - 292px))`;
  box.style.top=`clamp(12px, calc(${topPct}% - 8px), calc(100% - 220px))`;
  box.innerHTML=`${thumb}<h4>${propertyLabel(p)}</h4><p>${p.location||'Oman'}</p><div class="price">${money(p.price||0)} <small>/ month</small></div>${mapStatusBadge(p.status)}`;
}
function showMapPopupById(id, leftPct, topPct){ showMapPopup(byId('properties', id), leftPct, topPct); }
function projectProgress(p){
  const s=String(p.status||'');
  if(s.includes('مستأ')||s.toLowerCase().includes('rent')) return 100;
  if(s.includes('محج')||s.toLowerCase().includes('pend')) return 65;
  if(s.includes('صيان')||s.toLowerCase().includes('maint')) return 40;
  return 15;
}
function projectStatusClass(p){
  const s=String(p.status||'');
  if(s.includes('مستأ')||s.toLowerCase().includes('rent')) return 'active';
  if(s.includes('صيان')||s.toLowerCase().includes('maint')) return 'maint';
  return 'pending';
}
function renderTasksPage(){
  const box=$('#tasksPageBox'); if(!box) return;
  const data=Jawdah.data||{};
  const openMaint=(data.maintenance||[]).filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/));
  const renewals=renewalQueue();
  const overdue=(data.invoices||[]).filter(x=>Number(x.amount||0)>Number(x.paid_amount||0) && String(x.due_date||'')<today());
  box.innerHTML=`<div class="card"><div class="toolbar"><button class="gold-btn" onclick="showSection('maintenance')">+ طلب صيانة</button><button class="ghost" onclick="showSection('contracts')">+ عقد</button><button class="ghost" onclick="showSection('invoices')">الفواتير</button></div><h3>📋 المهام</h3><div class="saas-task-list">${openMaint.map(m=>`<div class="saas-task-item"><div><b>${m.title||'صيانة'}</b><p>${propertyLabel(byId('properties',m.property_id))} · ${m.priority||'Medium'}</p></div>${maintQueueTag(m)}</div>`).join('')||'<p class="mini">لا مهام مفتوحة</p>'}</div></div>
  <div class="card" style="margin-top:16px"><h3>عقود تحتاج متابعة</h3>${renewals.map(({contract:c,meta})=>`<div class="saas-task-item"><div><b>${c.contract_no||c.id}</b><p>${byId('clients',c.client_id).name||''} · ${c.end_date}</p></div><span class="saas-status pending">${meta.label}</span></div>`).join('')||'<p class="mini">لا عقود</p>'}</div>
  <div class="card" style="margin-top:16px"><h3>فواتير متأخرة</h3>${overdue.slice(0,8).map(i=>`<div class="saas-task-item"><div><b>${i.invoice_no||i.id}</b><p>${money(Number(i.amount)-Number(i.paid_amount))} · ${i.due_date}</p></div><button class="ghost" onclick="openPayment('${i.id}')">تحصيل</button></div>`).join('')||'<p class="mini">لا متأخرات</p>'}</div>`;
}
function renderEnterprisePage(){
  const box=$('#enterpriseBox'); if(!box) return;
  if(window.LQ_ENTERPRISE){
    box.innerHTML='<p class="mini">جاري التحميل…</p>';
    window.LQ_ENTERPRISE.refresh().catch(()=>{});
    return;
  }
  box.innerHTML='<p class="mini">Enterprise module loading…</p>';
}
function renderWalidPage(){
  const box=$('#walidIntelBox'); if(!box) return;
  if(window.LQ_WALID_INTEL){
    box.innerHTML='<p class="mini">جاري تحميل وليد…</p>';
    window.LQ_WALID_INTEL.refresh().catch(()=>{});
    return;
  }
  box.innerHTML='<p class="mini">Walid module loading…</p>';
}
function renderMessagesPage(){
  const box=$('#messagesPageBox'); if(!box) return;
  if(window.LQ_ALERT_CENTER){
    box.innerHTML='<p class="mini">جاري تحميل مركز التنبيهات...</p>';
    api('alert_center').then(res=>{
      window.LQ_ALERT_CENTER.render(box, res.center);
    }).catch(e=>{
      box.innerHTML=window.LQ_ALERT_CENTER.explainHtml()+'<p class="badge overdue">تعذر التحميل</p>';
      if(typeof toastErr==='function') toastErr(e);
    });
    return;
  }
  const k=dashKpis();
  const decisions=Jawdah.dashboard?.decisions||[];
  const openMaint=(Jawdah.data.maintenance||[]).filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/));
  box.innerHTML=`<div class="card"><h3>📨 الرسائل والتنبيهات</h3><div class="saas-task-list">${decisions.map(d=>`<div class="saas-task-item"><div><b>${d.level}</b><p>${d.text}</p></div></div>`).join('')}${openMaint.slice(0,5).map(m=>`<div class="saas-task-item"><div><b>صيانة</b><p>${m.title} · ${propertyLabel(byId('properties',m.property_id))}</p></div></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>ملخص</h3><div class="saas-fin-grid"><div class="saas-glass saas-fin-card"><span>متأخرات</span><strong>${money(k.overdue||0)}</strong></div><div class="saas-glass saas-fin-card"><span>صيانة</span><strong>${fmt(k.maintenance||0)}</strong></div><div class="saas-glass saas-fin-card"><span>عقود</span><strong>${fmt((k.expiring||0)+(k.expired||0))}</strong></div><div class="saas-glass saas-fin-card"><span>الصحة</span><strong>${fmt(k.health||0)}%</strong></div></div></div>`;
}
function renderTimelinePage(){
  const box=$('#timelinePageBox'); if(!box) return;
  const contracts=[...(Jawdah.data.contracts||[])].sort((a,b)=>String(a.end_date).localeCompare(String(b.end_date)));
  box.innerHTML=`<div class="card"><h3>📅 الجدول الزمني للعقود</h3><div class="saas-timeline">${contracts.slice(0,20).map(c=>{const m=contractRenewalMeta(c); return `<div class="saas-timeline-item"><b>${c.contract_no||c.id}</b> · ${byId('clients',c.client_id).name||''}<br><span class="mini">${propertyLabel(byId('properties',c.property_id))} · ${c.start_date} → ${c.end_date}</span> ${m.label?`<span class="saas-status pending">${m.label}</span>`:''}</div>`;}).join('')||'<p class="mini">لا عقود</p>'}</div></div>`;
}
function dashGreeting(){
  const h=new Date().getHours();
  if(h<12) return 'صباح الخير';
  if(h<18) return 'مساء الخير';
  return 'مساء النور';
}
function healthRingSvg(pct){
  const p=Math.max(0,Math.min(100,Number(pct||0)));
  const off=283-(283*p/100);
  return `<svg class="saas-health-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" class="ring-bg"/><circle cx="50" cy="50" r="45" class="ring-fg" style="stroke-dashoffset:${off}"/><text x="50" y="54" text-anchor="middle" transform="rotate(90 50 50)">${fmt(p)}%</text></svg>`;
}
function renderVaDashBanner(k){
  const host=$('#vaDashBanner'); if(!host) return;
  const coll=k.billed?Math.round((Number(k.paid||0)/Number(k.billed||1))*100):0;
  host.innerHTML=`<div class="va-dash-banner-left"><span class="va-dash-pill">🌟 Visual Analytics</span><h2>Data Insights Dashboard</h2><p>لوحة تحليلات مباشرة · عقارات · مالية · ضيافة · ذكاء تنفيذي</p></div><div class="va-dash-banner-stats"><div class="va-dash-stat"><b>${fmt(k.occupancy||0)}%</b><span>إشغال</span></div><div class="va-dash-stat"><b>${fmt(coll)}%</b><span>تحصيل</span></div><div class="va-dash-stat"><b>${money(k.net||0)}</b><span>صافي</span></div><div class="va-dash-stat"><b>${fmt(k.health||0)}%</b><span>جاهزية</span></div></div>`;
}
function renderDashExecHero(k){
  const host=$('#dashExecHero'); if(!host) return;
  const name=displayUserName(Jawdah.user)||DISPLAY_OWNER_NAME;
  const d=new Date().toLocaleDateString('ar-OM',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const collection=k.billed?Math.round((Number(k.paid||0)/Number(k.billed||1))*100):0;
  host.innerHTML=`<div class="exec-hero-left"><span class="exec-badge exec-badge-command">🌟 Data Insights · Visual Analytics</span><h2>${dashGreeting()}، ${htmlEscape(name)}</h2><p>مشاريع الانطلاقة — مركز تحليلات البيانات التنفيذية · BI مباشر</p><div class="exec-meta exec-meta-command"><span class="exec-pill exec-pill-gold">Health ${fmt(k.health||0)}%</span><span class="exec-pill">Occupancy ${fmt(k.occupancy||0)}%</span><span class="exec-pill">Collection ${fmt(collection)}%</span><span class="exec-pill">Net ${money(k.net||0)}</span><span>📅 ${d}</span></div></div><div class="exec-hero-stats exec-hero-stats-command"><div class="exec-stat"><b>${fmt(k.properties)}</b><span>إجمالي المشاريع</span></div><div class="exec-stat"><b>${money(k.income||0)}</b><span>الإيرادات</span></div><div class="exec-stat"><b>${money(k.expense||0)}</b><span>المصروفات</span></div><div class="exec-stat"><b>${money(k.net||0)}</b><span>صافي الربح</span></div><div class="exec-health">${healthRingSvg(k.health)}<span>صحة التشغيل</span></div></div>`;
}
function renderDashPropStatus(k){
  const host=$('#dashPropStatus'); if(!host) return;
  const total=Math.max(1,Number(k.properties||0));
  const items=[
    {l:'مستأجرة',v:Number(k.rented||0),c:'rented',pct:Math.round((Number(k.rented||0)/total)*100)},
    {l:'شاغرة',v:Number(k.vacant||0),c:'vacant',pct:Math.round((Number(k.vacant||0)/total)*100)},
    {l:'محجوزة',v:Number(k.reserved||0),c:'reserved',pct:Math.round((Number(k.reserved||0)/total)*100)},
    {l:'صيانة',v:Number(k.maintenance_properties||0),c:'maint',pct:Math.round((Number(k.maintenance_properties||0)/total)*100)}
  ];
  host.innerHTML=`<div class="prop-status-head"><h4>📍 حالة المحفظة العقارية</h4><span>${fmt(k.properties)} وحدة · ${fmt(k.occupancy||0)}% إشغال</span></div><div class="prop-status-bars">${items.map(x=>`<div class="prop-bar-item"><div class="prop-bar-top"><span>${x.l}</span><b>${fmt(x.v)} · ${fmt(x.pct)}%</b></div><div class="prop-bar-track ${x.c}"><i style="width:${x.pct}%"></i></div></div>`).join('')}</div>`;
}
function renderDashRenewalStrip(){
  const host=$('#dashRenewalStrip'); if(!host) return;
  const queue=renewalQueue();
  if(!queue.length){ host.innerHTML=''; host.className='saas-renewal-strip lq-area-empty'; return; }
  host.className='saas-renewal-strip saas-glass';
  host.innerHTML=`<div class="renewal-strip-head"><h4>🔁 عقود تحتاج قراراً فورياً</h4><button type="button" class="saas-link-btn" onclick="showSection('contracts')">إدارة العقود ←</button></div><div class="renewal-strip-list">${queue.slice(0,5).map(({contract:c,meta})=>`<div class="renewal-strip-item"><div><b>${htmlEscape(c.contract_no||c.id)}</b><p>${htmlEscape(byId('clients',c.client_id).name||'')} · ${htmlEscape(propertyLabel(byId('properties',c.property_id)))} · ${c.end_date}</p></div><span class="saas-status pending">${htmlEscape(meta.label)}</span><button type="button" class="ghost" onclick="renewContract('${c.id}')">تجديد</button></div>`).join('')}</div>`;
}
function renderDashInsights(k,data){
  const host=$('#dashInsights'); if(!host) return;
  const insights=[];
  const decisions=dashDecisions();
  decisions.forEach(d=>insights.push({icon:d.level==='High'?'🔴':d.level==='Medium'?'🟡':'🟢',t:d.text,p:d.level==='High'?'high':d.level==='Medium'?'med':'ok'}));
  if(Number(k.overdue||0)>0) insights.push({icon:'💳',t:`ذمم متأخرة بقيمة ${money(k.overdue)} — أولوية تحصيل`,p:'high'});
  if(Number(k.expired||0)>0) insights.push({icon:'📄',t:`${fmt(k.expired)} عقد منتهٍ يحتاج إغلاق أو تجديد`,p:'high'});
  if(Number(k.expiring||0)>0) insights.push({icon:'⏳',t:`${fmt(k.expiring)} عقد يقترب من الانتهاء`,p:'med'});
  if(Number(k.vacant||0)>0) insights.push({icon:'🏠',t:`${fmt(k.vacant)} وحدة شاغرة — فرصة تسويق`,p:'med'});
  if(Number(k.maintenance||0)>0) insights.push({icon:'🔧',t:`${fmt(k.maintenance)} طلب صيانة مفتوح`,p:'med'});
  if(!insights.length) insights.push({icon:'✅',t:'الوضع التشغيلي مستقر — لا مخاطر عاجلة',p:'ok'});
  host.innerHTML=`<h4>قرارات ذكية</h4><div class="insight-list">${insights.slice(0,8).map(x=>`<div class="insight-item ${x.p}"><span class="insight-ico">${x.icon}</span><p>${htmlEscape(x.t)}</p></div>`).join('')}</div>`;
}
function renderDashCashFlow(k){
  const host=$('#dashCashFlow'); if(!host) return;
  const series=chartSeries();
  const max=Math.max(...series.map(x=>Math.max(Number(x.income||0),Number(x.expense||0))),1);
  host.innerHTML=`<h4>التدفق النقدي · 6 أشهر</h4><div class="cashflow-bars">${series.map(x=>{const inc=Number(x.income||0), exp=Number(x.expense||0); const ih=(inc/max)*100, eh=(exp/max)*100; const m=String(x.month||'').slice(5); return `<div class="cashflow-month"><div class="cashflow-col"><i class="inc" style="height:${ih}%"></i><i class="exp" style="height:${eh}%"></i></div><span>${m}</span><small>${money(inc-exp)}</small></div>`;}).join('')}</div><div class="cashflow-legend"><span><i class="inc"></i> إيراد</span><span><i class="exp"></i> مصروف</span><span>صافي: ${money(k.net||0)}</span></div>`;
}
function dashEngine(data,k){
  const invoices=data.invoices||[], contracts=data.contracts||[], clients=data.clients||[], props=data.properties||[], maint=data.maintenance||[], accounts=data.accounts||[];
  const todayStr=today();
  const daysLate=d=>{const x=new Date(String(d||todayStr)+'T00:00:00'), n=new Date(); return Math.max(0,Math.floor((n-x)/(86400000)));};
  const clientScores=clients.map(c=>{
    const inv=invoices.filter(i=>i.client_id===c.id);
    const total=inv.reduce((s,i)=>s+Number(i.amount||0),0), paid=inv.reduce((s,i)=>s+Number(i.paid_amount||0),0);
    return {client:c,total,paid,outstanding:Math.max(0,total-paid),count:inv.length};
  }).sort((a,b)=>b.paid-a.paid);
  const propScores=props.map(p=>{
    const inv=invoices.filter(i=>i.property_id===p.id);
    const paid=inv.reduce((s,i)=>s+Number(i.paid_amount||0),0);
    const active=contracts.find(x=>x.property_id===p.id && String(x.status||'').toLowerCase()==='active');
    return {property:p,paid,rent:Number(active?.rent_amount||p.price||0),status:p.status||'—'};
  }).sort((a,b)=>b.paid-a.paid);
  const aging={'0-30':0,'31-60':0,'61-90':0,'90+':0};
  invoices.forEach(inv=>{
    const rem=Math.max(0,Number(inv.amount||0)-Number(inv.paid_amount||0)); if(!rem) return;
    const late=daysLate(inv.due_date);
    if(late<=30) aging['0-30']+=rem; else if(late<=60) aging['31-60']+=rem; else if(late<=90) aging['61-90']+=rem; else aging['90+']+=rem;
  });
  const activeContracts=contracts.filter(c=>String(c.status||'').toLowerCase()==='active');
  const pipeline=[
    {l:'مسودات',v:contracts.filter(c=>String(c.status||'').toLowerCase()==='draft').length,c:'draft'},
    {l:'نشطة',v:activeContracts.length,c:'active'},
    {l:'تنتهي قريباً',v:Number(k.expiring||0),c:'warn'},
    {l:'منتهية',v:Number(k.expired||0),c:'danger'}
  ];
  const events=[];
  invoices.filter(i=>Number(i.amount||0)>Number(i.paid_amount||0)).forEach(i=>{
    events.push({d:i.due_date||todayStr,t:'فاتورة',title:i.invoice_no||i.id,sub:byId('clients',i.client_id).name||'',prio:daysLate(i.due_date)>0?'high':'med'});
  });
  activeContracts.forEach(c=>{
    events.push({d:c.end_date,t:'عقد',title:c.contract_no||c.id,sub:byId('clients',c.client_id).name||'',prio:daysLate(c.end_date)>0?'high':'med'});
  });
  const openMaint=maint.filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/));
  openMaint.forEach(m=>events.push({d:m.request_date||todayStr,t:'صيانة',title:m.title||'طلب',sub:propertyLabel(byId('properties',m.property_id)),prio:String(m.priority||'').toLowerCase()==='high'?'high':'med'}));
  events.sort((a,b)=>String(a.d).localeCompare(String(b.d)));
  const byBuilding={};
  props.forEach(p=>{const b=p.building_no||'عام'; if(!byBuilding[b]) byBuilding[b]={total:0,rented:0,vacant:0}; byBuilding[b].total++; const s=String(p.status||''); if(s.includes('مستأ')) byBuilding[b].rented++; else if(s.includes('شاغ')) byBuilding[b].vacant++; });
  const buildingRows=Object.entries(byBuilding).map(([b,x])=>({b,...x,occ:x.total?Math.round((x.rented/x.total)*100):0})).sort((a,b)=>b.total-a.total);
  const monthlyForecast=activeContracts.reduce((s,c)=>s+Number(c.rent_amount||0),0);
  const openMaintCount=maint.filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/)).length;
  const closedMaintCount=maint.filter(x=>String(x.status||'').toLowerCase().match(/closed|done|complete/)).length;
  const maintTotal=openMaintCount+closedMaintCount;
  const slaPct=maintTotal?Math.round((closedMaintCount/maintTotal)*100):100;
  const collectionPct=k.billed?Math.round((Number(k.paid||0)/Number(k.billed))*100):0;
  const profitMargin=k.income?Math.round((Number(k.net||0)/Number(k.income))*100):0;
  const risks=[];
  if(Number(k.overdue||0)>0) risks.push({l:'ذمم متأخرة',v:money(k.overdue),s:'high'});
  if(Number(k.expired||0)>0) risks.push({l:'عقود منتهية',v:fmt(k.expired),s:'high'});
  if(Number(k.expiring||0)>0) risks.push({l:'تجديد عاجل',v:fmt(k.expiring),s:'med'});
  if(openMaintCount>3) risks.push({l:'صيانة مفتوحة',v:fmt(openMaintCount),s:'med'});
  if(Number(k.vacant||0)>0) risks.push({l:'وحدات شاغرة',v:fmt(k.vacant),s:'low'});
  if(collectionPct<80) risks.push({l:'تحصيل منخفض',v:fmt(collectionPct)+'%',s:'med'});
  const series=chartSeries();
  const heat=series.map(x=>({m:String(x.month||'').slice(5),score:Math.min(100,Math.round((Number(x.income||0)/(Math.max(Number(x.expense||0),1)))*20+Number(k.occupancy||0)*0.5))}));
  const brief=[
    `المحفظة تضم ${fmt(k.properties)} وحدة بإشغال ${fmt(k.occupancy||0)}%.`,
    `الإيرادات ${money(k.income||0)} والمصروفات ${money(k.expense||0)} بصافي ${money(k.net||0)} (هامش ${profitMargin}%).`,
    `التحصيل عند ${fmt(collectionPct)}% مع ذمم متأخرة ${money(k.overdue||0)}.`,
    activeContracts.length?`إيراد شهري متوقع من العقود النشطة: ${money(monthlyForecast)}.`:'لا عقود نشطة حالياً — أولوية التسويق والتأجير.',
    openMaintCount?`${fmt(openMaintCount)} طلب صيانة مفتوح يحتاج إغلاق لرفع جودة الخدمة.`:'لا طلبات صيانة مفتوحة — التشغيل مستقر.'
  ].join(' ');
  const ticker=[
    `⚡ جاهزية النظام ${fmt(k.health||0)}%`,
    `🏢 إشغال ${fmt(k.occupancy||0)}% · ${fmt(k.rented||0)} مستأجرة`,
    `💳 تحصيل ${fmt(collectionPct)}% · متأخر ${money(k.overdue||0)}`,
    `📄 ${fmt(activeContracts.length)} عقد نشط · ${fmt(k.expiring||0)} ينتهي قريباً`,
    `🔧 صيانة ${fmt(openMaintCount)} مفتوحة · SLA ${fmt(slaPct)}%`,
    `📈 صافي ${money(k.net||0)} · هامش ${profitMargin}%`
  ];
  return {clientScores,propScores,aging,pipeline,events:events.slice(0,16),buildingRows,monthlyForecast,slaPct,collectionPct,profitMargin,risks,heat,brief,ticker,openMaintCount,closedMaintCount};
}
function gaugeSvg(pct,label,color){
  const p=Math.max(0,Math.min(100,Number(pct||0))), off=176-(176*p/100);
  return `<div class="bento-gauge"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" class="g-bg"/><circle cx="32" cy="32" r="28" class="g-fg" style="stroke:${color||'#6D5DFC'};stroke-dashoffset:${off}"/><text x="32" y="36" text-anchor="middle">${fmt(p)}%</text></svg><span>${htmlEscape(label)}</span></div>`;
}
function renderDashLiveTicker(ticker){
  const host=$('#dashLiveTicker'); if(!host||!ticker?.length) return;
  const items=ticker.map(t=>`<span class="ticker-item">${htmlEscape(t)}</span>`).join('');
  host.innerHTML=`<div class="ticker-track"><div class="ticker-inner">${items}${items}</div></div>`;
}
function renderDashSimStage(k,eng){
  const host=$('#dashSimStage'); if(!host) return;
  const health=Math.round(Number(k.health||k.occupancy||0));
  const occ=Math.round(Number(k.occupancy||0));
  const coll=eng?.collectionPct||0;
  const margin=eng?.profitMargin||0;
  const towers=Math.min(7,Math.max(3,Number(k.properties||0)||3));
  const towerHtml=Array.from({length:towers},(_,i)=>`<i class="lq-sim-tower" style="height:${38+(i%4)*14}%"></i>`).join('');
  const nodes=[
    {b:occ+'%',s:'إشغال',c:'#00D4FF'},
    {b:coll+'%',s:'تحصيل',c:'#00C853'},
    {b:money(k.net||0),s:'صافي',c:'#D4AF37'},
    {b:fmt(eng?.openMaintCount||0),s:'صيانة',c:'#FFB300'}
  ];
  host.innerHTML=`<div class="lq-sim-inner">
    <div class="lq-sim-head">
      <h3><em>Launch Ops</em> · محاكاة تشغيل المحفظة</h3>
      <span class="lq-sim-badge"><i></i> LIVE SIMULATION</span>
    </div>
    <div class="lq-sim-core">
      <div class="lq-sim-city">${towerHtml}</div>
      <div class="lq-sim-orbit">
        <span class="lq-sim-ring r1"></span>
        <span class="lq-sim-ring r2"></span>
        <span class="lq-sim-ring r3"></span>
        <div class="lq-sim-nucleus"><b>${fmt(health)}%</b><span>صحة التشغيل</span></div>
        ${nodes.map((n,i)=>`<div class="lq-sim-node lq-sim-node-${['t','r','b','l'][i]}" style="border-color:${n.c}44;box-shadow:0 0 24px ${n.c}22"><b style="color:${n.c}">${htmlEscape(n.b)}</b><small>${htmlEscape(n.s)}</small></div>`).join('')}
      </div>
    </div>
    <div class="lq-sim-foot">
      <div class="lq-sim-metric"><b>${fmt(k.properties||0)}</b><span>وحدة</span></div>
      <div class="lq-sim-metric"><b>${fmt(k.rented||0)}</b><span>مستأجرة</span></div>
      <div class="lq-sim-metric"><b>${money(k.income||0)}</b><span>إيراد</span></div>
      <div class="lq-sim-metric"><b>${fmt(margin)}%</b><span>هامش</span></div>
    </div>
  </div>`;
}
function renderDashKpiTertiary(k){
  const host=$('#saasKpiRow3'); if(!host) return;
  const items=[
    {icon:'🏦',label:'رصيد البنك',value:money(k.bank_balance||0),go:'bank',hint:'سيولة'},
    {icon:'👔',label:'الرواتب',value:money(k.payroll||0),go:'payroll',hint:'شهري'},
    {icon:'📦',label:'قيمة المخزون',value:money(k.inventory_value||0),go:'inventory',hint:'أصول'},
    {icon:'🧾',label:'مشتريات مستحقة',value:money(k.purchases_due||0),go:'purchases',hint:'ذمم'},
    {icon:'📅',label:'عقود تنتهي',value:fmt(k.expiring||0),go:'contracts',hint:'متابعة'},
    {icon:'⚠️',label:'عقود منتهية',value:fmt(k.expired||0),go:'contracts',hint:'قرار'},
    {icon:'💎',label:'فواتير مصدرة',value:money(k.billed||0),go:'invoices',hint:'إجمالي'},
    {icon:'✅',label:'محصّل',value:money(k.paid||0),go:'invoices',hint:'نقدي'}
  ].filter((_,i)=>canSeeFinance()||i>=4);
  host.innerHTML=items.map(x=>`<article class="saas-kpi saas-kpi-tert saas-glass" onclick="showSection('${x.go}')"><div class="saas-kpi-icon">${x.icon}</div><strong>${x.value}</strong><span>${x.label}</span><small class="saas-kpi-hint">${x.hint}</small></article>`).join('');
}
function renderDashMegaCockpit(k,data,eng){
  const host=$('#dashMegaCockpit'); if(!host) return;
  const gauges=[
    gaugeSvg(k.occupancy,'إشغال','#00D4FF'),
    gaugeSvg(eng.collectionPct,'تحصيل','#00C853'),
    gaugeSvg(k.health,'جاهزية','#6D5DFC'),
    gaugeSvg(eng.profitMargin,'هامش ربح','#7C4DFF'),
    gaugeSvg(eng.slaPct,'SLA صيانة','#FFB300'),
    gaugeSvg(k.vacant&&k.properties?Math.round((Number(k.vacant)/Number(k.properties))*100):0,'شغور','#FF5252')
  ].join('');
  const riskHtml=eng.risks.length?eng.risks.map(r=>`<div class="risk-pill ${r.s} glow-pulse"><b>${htmlEscape(r.l)}</b><span>${htmlEscape(r.v)}</span></div>`).join(''):'<p class="mini">لا مخاطر حرجة</p>';
  const clientsHtml=eng.clientScores.slice(0,6).map((x,i)=>`<div class="rank-row" onclick="showSection('clients')"><span class="rank-no">${i+1}</span><div><b>${htmlEscape(x.client.name||'')}</b><small>${fmt(x.count)} فاتورة</small></div><strong>${money(x.paid)}</strong></div>`).join('')||'<p class="mini">لا عملاء</p>';
  const propsHtml=eng.propScores.slice(0,6).map((x,i)=>`<div class="rank-row" onclick="showSection('properties')"><span class="rank-no">${i+1}</span><div><b>${htmlEscape(propertyLabel(x.property))}</b><small>${htmlEscape(x.status)}</small></div><strong>${money(x.paid||x.rent)}</strong></div>`).join('')||'<p class="mini">لا عقارات</p>';
  const pipeMax=Math.max(...eng.pipeline.map(x=>x.v),1);
  const pipeHtml=eng.pipeline.map(x=>`<div class="pipe-item"><div class="pipe-top"><span>${x.l}</span><b>${fmt(x.v)}</b></div><div class="pipe-track ${x.c}"><i style="width:${Math.round((x.v/pipeMax)*100)}%"></i></div></div>`).join('');
  const agingMax=Math.max(...Object.values(eng.aging),1);
  const agingHtml=Object.entries(eng.aging).map(([lb,v])=>`<div class="aging-bar-item"><span>${lb} يوم</span><div class="aging-track"><i style="width:${Math.round((v/agingMax)*100)}%"></i></div><b>${money(v)}</b></div>`).join('');
  const eventsHtml=eng.events.length?eng.events.map(e=>`<div class="event-row ${e.prio}"><span class="event-date">${e.d||'—'}</span><div><b>${htmlEscape(e.title)}</b><small>${htmlEscape(e.t)} · ${htmlEscape(e.sub)}</small></div></div>`).join(''):'<p class="mini">لا أحداث قادمة</p>';
  const bldHtml=eng.buildingRows.slice(0,6).map(b=>`<div class="bld-row"><b>بناية ${htmlEscape(b.b)}</b><span>${fmt(b.total)} وحدة</span><div class="bld-bar"><i style="width:${b.occ}%"></i></div><small>${fmt(b.occ)}% إشغال</small></div>`).join('')||'<p class="mini">لا بيانات بنايات</p>';
  const heatHtml=eng.heat.map(h=>`<div class="heat-cell" style="--heat:${h.score}" title="${h.m}"><span>${h.m}</span><i></i></div>`).join('');
  const activeCount=(data.contracts||[]).filter(c=>String(c.status||'').toLowerCase()==='active').length;
  host.innerHTML=`
    <article class="bento-tile bento-span-12 saas-glass bento-brief bento-ai-brief cockpit-zone glow-pulse"><span class="cockpit-zone-label">AI Brief · ملخص ذكي</span><div class="bento-head"><h4>📋 الملخص التنفيذي</h4><span class="saas-sub">Executive Brief · ${new Date().toLocaleTimeString('ar-OM',{hour:'2-digit',minute:'2-digit'})}</span></div><p class="exec-brief-text">${htmlEscape(eng.brief)}</p></article>
    <article class="bento-tile bento-span-8 saas-glass cockpit-zone mega-revenue-engine"><span class="cockpit-zone-label">Revenue Engine · محرك الإيراد</span><div class="bento-head"><h4>🎛️ لوحة المؤشرات</h4><button type="button" class="saas-link-btn" onclick="showSection('revenues')">المالية</button></div><div class="bento-gauges">${gauges}</div><div class="forecast-box" style="margin-top:14px"><strong>${money(eng.monthlyForecast)}</strong><span>توقع شهري · ${fmt(activeCount)} عقد نشط · تحصيل ${fmt(eng.collectionPct)}%</span></div></article>
    <article class="bento-tile bento-span-4 saas-glass cockpit-zone mega-risk-radar"><span class="cockpit-zone-label">Risk Radar · رادار المخاطر</span><div class="bento-head"><h4>⚠️ مصفوفة المخاطر</h4><button type="button" class="saas-link-btn" onclick="showSection('reports')">التقارير</button></div><div class="risk-grid">${riskHtml}</div></article>
    <article class="bento-tile bento-span-6 saas-glass cockpit-zone mega-portfolio-map"><span class="cockpit-zone-label">Portfolio Map · خريطة المحفظة</span><div class="bento-head"><h4>🔥 حرارة الأداء · 6 أشهر</h4><button type="button" class="saas-link-btn" onclick="showSection('properties')">المحفظة</button></div><div class="heat-map">${heatHtml}</div><div class="bld-list" style="margin-top:12px">${bldHtml}</div></article>
    <article class="bento-tile bento-span-6 saas-glass cockpit-zone"><div class="bento-head"><h4>💳 أعمار الذمم + مسار العقود</h4></div><div class="pipe-list" style="margin-bottom:12px">${pipeHtml}</div><div class="aging-bars">${agingHtml}</div></article>
    <article class="bento-tile bento-span-4 saas-glass"><div class="bento-head"><h4>👥 أفضل العملاء</h4><button type="button" class="saas-link-btn" onclick="showSection('clients')">الكل</button></div><div class="rank-list">${clientsHtml}</div></article>
    <article class="bento-tile bento-span-4 saas-glass"><div class="bento-head"><h4>🏢 أداء العقارات</h4><button type="button" class="saas-link-btn" onclick="showSection('properties')">الكل</button></div><div class="rank-list">${propsHtml}</div></article>
    <article class="bento-tile bento-span-4 saas-glass"><div class="bento-head"><h4>🔧 عمليات الصيانة</h4></div><div class="maint-ops"><div><b>${fmt(eng.openMaintCount)}</b><span>مفتوحة</span></div><div><b>${fmt(eng.closedMaintCount)}</b><span>مغلقة</span></div><div><b>${fmt(eng.slaPct)}%</b><span>SLA</span></div></div><button type="button" class="ghost" onclick="showSection('maintenance')">إدارة الصيانة</button></article>
    <article class="bento-tile bento-span-12 saas-glass"><div class="bento-head"><h4>📅 الأحداث القادمة</h4><button type="button" class="saas-link-btn" onclick="showSection('timeline')">الجدول</button></div><div class="event-list">${eventsHtml}</div></article>`;
}
function renderDashRecentInvoices(invoices){
  const host=$('#dashRecentInvoices'); if(!host) return;
  const rows=[...invoices].sort((a,b)=>String(b.due_date||'').localeCompare(String(a.due_date||''))).slice(0,8);
  if(!rows.length){ host.innerHTML='<p class="mini" style="padding:16px">لا فواتير مسجلة بعد</p>'; return; }
  host.innerHTML=`<div class="table-wrap"><table><thead><tr><th>الفاتورة</th><th>العميل</th><th>المبلغ</th><th>المدفوع</th><th>المتبقي</th><th>الاستحقاق</th><th>الحالة</th></tr></thead><tbody>${rows.map(i=>{const rem=Math.max(0,Number(i.amount||0)-Number(i.paid_amount||0)); return `<tr onclick="showSection('invoices')" style="cursor:pointer"><td><b>${htmlEscape(i.invoice_no||i.id)}</b></td><td>${htmlEscape(byId('clients',i.client_id).name||'')}</td><td>${money(i.amount)}</td><td>${money(i.paid_amount)}</td><td>${money(rem)}</td><td>${i.due_date||'—'}</td><td>${statusBadge(i.status||(rem>0?'Pending':'Paid'))}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function renderDashboard(){
  const k=dashKpis();
  const data=Jawdah.data||{};
  const props=data.properties||[];
  const contracts=data.contracts||[];
  const clients=data.clients||[];
  const invoices=data.invoices||[];
  const maint=data.maintenance||[];
  const openMaint=maint.filter(x=>!String(x.status||'').toLowerCase().match(/closed|done|complete/));
  const completedMaint=maint.filter(x=>String(x.status||'').toLowerCase().match(/closed|done|complete/));
  const activeClients=clients.filter(c=>contracts.some(x=>x.client_id===c.id && String(x.status||'').toLowerCase()==='active')).length;
  const completedProjects=contracts.filter(c=>['closed','renewed','expired'].includes(String(c.status||'').toLowerCase())).length;
  const profitPct=k.income?Math.round((Number(k.net||0)/Number(k.income))*100):0;
  const bell=$('#bellDot');
  if(bell) bell.classList.toggle('hidden', !(Number(k.overdue||0)>0 || openMaint.length>0));

  const series=chartSeries();
  const kpis=[
    {key:'properties',icon:'🏢',label:'إجمالي المشاريع',value:fmt(k.properties),go:'properties',hint:'محفظة كاملة',trend:'↑'},
    {key:'rented',icon:'✅',label:'المشاريع النشطة',value:fmt(k.rented),go:'properties',hint:'مستأجرة',trend:'↑'},
    {key:'expired',icon:'🏁',label:'المشاريع المكتملة',value:fmt(completedProjects),go:'contracts',hint:'عقود منتهية',trend:'→'},
    {key:'clients',icon:'👥',label:'العملاء النشطون',value:fmt(activeClients),go:'clients',hint:'بعقود نشطة',trend:'↑'},
    {key:'income',icon:'💰',label:'الإيرادات الكلية',value:money(k.income),go:canSeeFinance()?'revenues':'reports',hint:'إجمالي',trend:'↑'},
    {key:'expense',icon:'📊',label:'المصروفات',value:money(k.expense),go:canSeeFinance()?'admin-expenses':'reports',hint:'تشغيلية',trend:'↓'},
    {key:'net',icon:'📈',label:'الأرباح',value:money(k.net),go:'reports',hint:`هامش ${profitPct}%`,trend:Number(k.net||0)>=0?'↑':'↓'},
    {key:'health',icon:'🎯',label:'نسبة الإنجاز',value:fmt(k.health||k.occupancy)+'%',go:'reports',hint:'صحة النظام',trend:'↑'}
  ];
  const kpis2=[
    {key:'vacant',icon:'🏠',label:'وحدات شاغرة',value:fmt(k.vacant||0),go:'properties',hint:'تسويق',trend:Number(k.vacant||0)>0?'↓':'↑'},
    {key:'maintenance',icon:'🔧',label:'صيانة مفتوحة',value:fmt(openMaint.length),go:'maintenance',hint:'طلبات',trend:openMaint.length?'↓':'↑'},
    {key:'contracts',icon:'📄',label:'عقود نشطة',value:fmt(contracts.filter(c=>String(c.status||'').toLowerCase()==='active').length),go:'contracts',hint:'سارية',trend:'↑'},
    {key:'paid',icon:'💳',label:'نسبة التحصيل',value:fmt(k.billed?Math.round((Number(k.paid||0)/Number(k.billed))*100):0)+'%',go:'invoices',hint:money(k.paid||0),trend:'↑'}
  ];
  const kpiHost=$('#saasKpiRow');
  if(kpiHost) kpiHost.innerHTML=kpis.filter(x=>uiAllowedKpi(x.key)).map(x=>renderKpiPro(x,series,k)).join('');
  const kpiHost2=$('#saasKpiRow2');
  if(kpiHost2) kpiHost2.innerHTML=kpis2.filter(x=>uiAllowedKpi(x.key)).map(x=>renderKpiPro(x,series,k)).join('');

  renderVaDashBanner(k);
  renderDashExecHero(k);
  renderDashPropStatus(k);
  renderDashRenewalStrip();
  const eng=dashEngine(data,k);
  renderDashSimStage(k,eng);
  renderDashLiveTicker(eng.ticker);
  renderDashKpiTertiary(k);
  renderDashMegaCockpit(k,data,eng);
  renderDashInsights(k,data);
  renderDashCashFlow(k);
  renderDashRecentInvoices(invoices);

  const welcome=$('#dashWelcomeMeta');
  if(welcome) welcome.innerHTML=`<span class="saas-chip">إشغال ${fmt(k.occupancy)}%</span><span class="saas-chip">صافي ${money(k.net||0)}</span><span class="saas-chip">عقود ${fmt(contracts.length)}</span><span class="saas-chip">عملاء ${fmt(clients.length)}</span><span class="saas-chip ${Number(k.overdue||0)>0?'danger':''}">متأخر ${money(k.overdue||0)}</span>`;

  const positions=[[18,24],[43,42],[68,58],[28,70],[78,32],[52,22],[36,61],[22,84],[84,54],[61,76]];
  const gis=$('#gisPins');
  if(gis) gis.innerHTML=props.map((p,i)=>{
    const st=String(p.status||'');
    const cls=st.includes('صيان')||st.toLowerCase().includes('maint')?'red':(st.includes('شاغ')||st.toLowerCase().includes('vacant')?'blue':(st.includes('محج')||st.toLowerCase().includes('pend')?'orange':'gold'));
    const [left,top]=positions[i%positions.length];
    return `<button type="button" class="pin ${cls}" title="${propertyLabel(p)}" style="left:${left}%;top:${top}%" onclick="showMapPopupById('${p.id}',${left},${top})"></button>`;
  }).join('');
  if(props[0]) showMapPopup(props[0], positions[0][0], positions[0][1]);

  const projGrid=$('#saasProjectsGrid');
  if(projGrid) projGrid.innerHTML=props.slice(0,12).map(p=>{
    const prog=projectProgress(p);
    const cls=projectStatusClass(p);
    const c=contracts.find(x=>x.property_id===p.id && String(x.status||'').toLowerCase()==='active');
    return `<article class="saas-glass saas-project-card" onclick="showSection('properties')">${typeof lqPropertyThumbHtml==='function'?lqPropertyThumbHtml(p,{hero:true}):''}<div class="proj-top"><h4>${propertyLabel(p)}</h4><span class="saas-status ${cls}">${p.status||'—'}</span></div><div class="saas-prog-bar"><i style="width:${prog}%"></i></div><div class="saas-proj-meta"><span>💵 ${money(p.price||0)}</span><span>📍 ${p.location||'Oman'}</span>${c?`<span>📅 ${c.end_date}</span>`:''}</div></article>`;
  }).join('')||'<p class="mini">لا مشاريع بعد</p>';

  const tasksBox=$('#saasTasksBox .saas-task-list');
  if(tasksBox){
    const items=[...openMaint.slice(0,4).map(m=>({t:m.title||'صيانة',s:propertyLabel(byId('properties',m.property_id)),tag:maintQueueTag(m),over:false})),...renewalQueue().slice(0,2).map(({contract:c,meta})=>({t:'تجديد عقد',s:c.contract_no||c.id,tag:`<span class="saas-status pending">${meta.label}</span>`,over:meta.days<0}))];
    tasksBox.innerHTML=items.length?items.map(x=>`<div class="saas-task-item"><div><b>${x.t}</b><p>${x.s}</p></div>${x.tag}</div>`).join(''):'<p class="mini">لا مهام عاجلة</p>';
  }
  const actBox=$('#saasActivityBox .saas-timeline');
  if(actBox){
    const acts=[...dashDecisions().map(d=>({t:d.text,d:today()})),...openMaint.slice(0,3).map(m=>({t:'صيانة: '+(m.title||''),d:m.request_date||today()}))].slice(0,6);
    actBox.innerHTML=acts.map(a=>`<div class="saas-timeline-item"><b>${a.t}</b><br><span class="mini">${a.d}</span></div>`).join('')||'<p class="mini">لا نشاط</p>';
  }

  const recentPay=invoices.filter(i=>Number(i.paid_amount||0)>0).slice(-3).reverse();
  const outstanding=invoices.filter(i=>Number(i.amount||0)>Number(i.paid_amount||0));
  const finGrid=$('#saasFinGrid');
  if(finGrid) finGrid.innerHTML=[
    {l:'آخر مدفوعات',v:recentPay.length?money(recentPay[0].paid_amount):money(0),a:'invoices'},
    {l:'فواتير مستحقة',v:money(k.overdue||0),a:'invoices'},
    {l:'ملخص المصروفات',v:money(k.expense),a:canSeeFinance()?'admin-expenses':'reports'},
    {l:'تحليل الربح',v:`${money(k.net)} (${profitPct}%)`,a:'reports'}
  ].map(x=>`<div class="saas-glass saas-fin-card" onclick="showSection('${x.a}')"><span>${x.l}</span><strong>${x.v}</strong></div>`).join('');

  const repGrid=$('#saasReportsGrid');
  if(repGrid) repGrid.innerHTML=[
    {i:'📊',t:'تقارير الأداء',a:'reports',fn:"dashCommandClick('reports','reports')"},
    {i:'💰',t:'التقارير المالية',a:'statements',fn:"dashCommandClick('statements','statements')"},
    {i:'🏢',t:'تقارير المشاريع',a:'properties',fn:'exportCsv(\'properties\')'},
    {i:'⬇️',t:'تصدير',a:'backup',fn:'downloadBackup()'}
  ].map(x=>`<div class="saas-glass saas-report-card" onclick="${x.fn}"><div class="icon">${x.i}</div><b>${x.t}</b><span>فتح ←</span></div>`).join('');

  renderDashCommands();
  renderDashSideMenu();
  scheduleDrawCharts();
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
    return `${renewBtn}${String(r.status||'').toLowerCase()==='active'?'':(canDecideApprovals()?`<button class="gold-btn" onclick="approveContract('${r.id}')">اعتماد</button>`:`<button class="gold-btn" onclick="requestContractApproval('${r.id}')">طلب اعتماد</button>`)} <button class="ghost" onclick="contractDocument('${r.id}')">العقد</button> <button class="ghost" onclick="invoiceFromContract('${r.id}')">فاتورة</button> <button class="ghost" onclick="editRecord('contracts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('contracts','${r.id}')">حذف</button>`;
  });
}
function renderInvoices(){
  const rows=filterRows('invoices',['invoice_no','description','status']);
  $('#invoicesTable').innerHTML=tableHtml([['رقم','invoice_no'],['العميل','client_id',(v)=>byId('clients',v).name||v],['الوحدة','property_id',(v)=>propertyLabel(byId('properties',v))],['الإصدار','issue_date'],['الاستحقاق','due_date'],['قبل VAT','subtotal',(v,r)=>money(v||r.amount)],['VAT','vat_amount',(v)=>money(v||0)],['الإجمالي','amount',(v)=>money(v)],['المدفوع','paid_amount',(v)=>money(v)],['المتبقي','amount',(v,r)=>money(Number(r.amount)-Number(r.paid_amount))],['الحالة','status',(v)=>statusBadge(v)]],rows,r=>{
    const voidBtn=String(r.status||'').toLowerCase()==='void'?'':`<button class="danger" onclick="voidInvoice('${r.id}')">إلغاء</button>`;
    return `<button class="gold-btn" onclick="openPayment('${r.id}')">تحصيل</button> <button class="ghost" onclick="printInvoice('${r.id}')">طباعة</button> <button class="ghost" onclick="showInvoiceAudit('${r.id}')">سجل</button> ${voidBtn}`;
  });
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
  if(!Jawdah.data.users && !['admin','owner'].includes(Jawdah.user?.role)){ $('#usersTable').innerHTML='<div class="card">هذا القسم للمدير فقط</div>'; return; }
  if(!Jawdah.data.users){ $('#usersTable').innerHTML='<div class="card mini">جاري تحميل المستخدمين...</div>'; return; }
  $('#usersTable').innerHTML=tableHtml([['المستخدم','username'],['الاسم','name'],['الدور','role',(v)=>roleName(v)],['نشط','active',(v)=>v?'نعم':'لا'],['آخر دخول','last_login']],Jawdah.data.users,r=>`<button class="ghost" onclick="editRecord('users','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('users','${r.id}')">حذف</button>`);
}
function lqDocCard(icon, title, sub, href, file){
  return `<article class="lq-doc-card saas-glass"><span class="icon">${icon}</span><div style="flex:1"><b>${htmlEscape(title)}</b><small>${htmlEscape(sub)}</small></div><a class="gold-btn" href="${href}" download="${htmlEscape(file)}" style="text-decoration:none;white-space:nowrap;font-size:.85rem;padding:8px 14px">تنزيل</a></article>`;
}
function renderBackup(){
  const counts=Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,(v||[]).length]));
  let html=Object.entries(counts).map(([k,v])=>`<span class="badge">${k}: ${fmt(v)}</span>`).join(' ');
  html += `<div class="saas-section-head" style="margin-top:18px"><h3>📂 مستندات وعقود رسمية</h3><span class="saas-sub">قوالب Word بترويسة Launch Quality الذهبية</span></div>`;
  html += `<div class="lq-doc-grid">`;
  html += lqDocCard('📋','لائحة الصلاحيات والمسؤوليات','الموارد البشرية · HR','/documents/lq-hr-responsibilities.docx','lq-hr-responsibilities.docx');
  html += lqDocCard('📄','عقد إيجار محمي','Residential / Commercial Lease','/documents/lq-contract-template.docx','lq-contract-template.docx');
  html += lqDocCard('🧾','فاتورة رسمية','Tax Invoice Template','/documents/lq-invoice-template.docx','lq-invoice-template.docx');
  html += lqDocCard('✉️','خطاب رسمي','Official Letterhead','/documents/lq-official-letter.docx','lq-official-letter.docx');
  html += `</div>`;
  html += `<div class="card" style="margin-top:16px"><h4>☁️ نسخ خارج Railway (Off-site)</h4><p class="mini">1) أنشئ webhook على <a href="https://webhook.site" target="_blank" rel="noopener">webhook.site</a> · 2) أضف على Railway: <code>LQ_OFFSITE_BACKUP_URL</code> · 3) اضغط «نسخ احتياطي الآن»</p></div>`;
  api('backup/status').then(st=>{
    if(st.auto_backup?.enabled){
      html += `<p class="mini" style="margin-top:12px">نسخ احتياطي تلقائي: كل ${fmt(st.auto_backup.interval_hours)} ساعة — آخر نسخة: ${st.auto_backup.last_backup||'لم تُنشأ بعد'} — يحتفظ بـ ${fmt(st.auto_backup.retention)} نسخة</p>`;
      html += `<p class="mini">Off-site: ${st.offsite?.enabled?'مفعّل':'فعّل LQ_OFFSITE_BACKUP_URL'} — آخر دفع: ${st.offsite?.last_push||'—'}</p>`;
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
    toast('تم إنشاء نسخة احتياطية: '+res.backup.timestamp+(res.backup.offsite?.ok?' · Off-site OK':(res.backup.offsite?.skipped?'':' · Off-site فشل')));
    renderBackup();
  }catch(e){ toastErr(e); }
}
function renderQA(){
  $('#qaBox').innerHTML='<p>اضغط تشغيل الاختبار لفحص الترابط والتخزين والفواتير والحسابات.</p>';
}
function populateSelects(){
  fillSelect('#pBranch', Jawdah.data.branches||[], true, 'id', 'name');
  fillSelect('#contractProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  fillSelect('#contractClient', Jawdah.data.clients||[], true, 'id', 'name');
  fillSelect('#accClient', Jawdah.data.clients||[], true, 'id', 'name');
  fillSelect('#accProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  fillSelect('#maintProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  const propOpts='<option value="">بدون عقار</option>'+(Jawdah.data.properties||[]).map(p=>`<option value="${p.id}">${propertyLabel(p)}</option>`).join('');
  ['#piProperty','#revProperty','#gaProperty'].forEach(s=>{ if($(s)) $(s).innerHTML=propOpts; });
  const clientOpts='<option value="">بدون عميل</option>'+(Jawdah.data.clients||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  if($('#revClient')) $('#revClient').innerHTML=clientOpts;
  const itemOpts=(Jawdah.data.inventory_items||[]).map(i=>`<option value="${i.id}">${i.sku} - ${i.name}</option>`).join('');
  if($('#stockItem')) $('#stockItem').innerHTML=itemOpts || '<option value="">لا أصناف</option>';
  const accOpts='<option value="">غير مطابق</option>'+(Jawdah.data.accounts||[]).map(a=>`<option value="${a.id}">${a.entry_date} - ${a.category} - ${money(a.amount)}</option>`).join('');
  if($('#bankMatch')) $('#bankMatch').innerHTML=accOpts;
  const coaParentOpts='<option value="">بدون حساب أب</option>'+(Jawdah.data.chart_accounts||[]).map(a=>`<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
  if($('#coaParent')) $('#coaParent').innerHTML=coaParentOpts;
  ['piDate','revDate','salDate','gaDate','stockDate','bankDate','fpStart','fpEnd','accDate'].forEach(id=>{ if($('#'+id) && !$('#'+id).value) $('#'+id).value=today(); });
  if($('#salMonth') && !$('#salMonth').value) $('#salMonth').value=today().slice(0,7);
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
async function createClient(){
  const name=val('cName');
  if(!name){ toastNotice('اسم العميل مطلوب'); return; }
  await saveNew('clients',{name,phone:val('cPhone'),email:val('cEmail'),national_id:val('cNational'),balance:0,notes:val('cNotes')});
}
async function createContract(){
  const property_id=val('contractProperty');
  const client_id=val('contractClient');
  const rent=num('contractRent');
  if(!property_id||!client_id){ toastNotice('اختر العقار والعميل من القائمة'); return; }
  if(!rent||rent<=0){ toastNotice('مبلغ الإيجار الشهري مطلوب وأكبر من صفر'); return; }
  await saveNew('contracts',{contract_type:val('contractType')||'Residential',property_id,client_id,tenant_nationality:val('tenantNationality'),tenant_id_no:val('tenantIdNo'),unit_details:val('unitDetails'),start_date:val('contractStart')||today(),end_date:val('contractEnd')||today(),rent_amount:rent,deposit_amount:num('contractDeposit'),late_fee:num('contractLateFee'),grace_days:num('contractGraceDays')||5,renewal_notice_days:num('contractRenewalDays')||30,status:'Draft',payment_cycle:'monthly',legal_terms:val('contractLegalTerms'),notes:val('contractNotes')});
}
async function createProperty(){
  const building=val('pBuilding'), apartment=val('pApartment'), room=val('pRoom'), location=val('pLocation');
  if(!building||!apartment||!room||!location){ toastNotice('أكمل: رقم البناية، الشقة، الغرفة، والموقع'); return; }
  const photoFile=$('#pPhoto')?.files?.[0];
  try{
    const res=await api('properties',{method:'POST',body:JSON.stringify({branch_id:val('pBranch')||null,building_no:building,apartment_no:apartment,room_no:room,status:val('pStatus'),price:num('pPrice'),location,notes:val('pNotes'),image:'🏠',last_update:today()})});
    const propertyId=res.item?.id;
    if(photoFile&&propertyId&&typeof lqUploadPropertyPhoto==='function'){
      await lqUploadPropertyPhoto(propertyId, photoFile);
    }
    toast('تم الحفظ');
    $('#pPhoto')&&( $('#pPhoto').value='');
    const prev=$('#pPhotoPreview'); if(prev){ prev.classList.add('hidden'); prev.removeAttribute('src'); }
    window.__lqFlowSaveHint={table:'properties'};
    await loadAll();
  }catch(e){ toastErr(e); }
}
async function createAccount(){ await saveNew('accounts',{entry_date:val('accDate')||today(),type:val('accType'),category:val('accCategory'),description:val('accDesc'),client_id:val('accClient')||null,property_id:val('accProperty')||null,invoice_id:null,amount:num('accAmount')}); }
async function createMaintenance(){ await saveNew('maintenance',{property_id:val('maintProperty'),title:val('maintTitle'),priority:val('maintPriority'),status:'Open',request_date:today(),cost:num('maintCost'),notes:val('maintNotes')}); }
async function createUser(){ await saveNew('users',{username:val('uUsername'),name:val('uName'),role:val('uRole'),password:val('uPassword'),active:true}); }
async function saveNew(table,row){ try{ await api(table,{method:'POST',body:JSON.stringify(row)}); toast('تم الحفظ'); await loadAll(); }catch(e){toastErr(e)} }
function val(id){ return ($('#'+id)?.value||'').trim(); } function num(id){ return Number(val(id)||0); }
async function delRecord(table,id){ if(!confirm('تأكيد الحذف؟')) return; try{ await api(`${table}/${id}`,{method:'DELETE'}); toast('تم الحذف'); await loadAll(); }catch(e){toastErr(e)} }
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
  if(field === 'deposit_received') return [['1','نعم — تم الاستلام'],['0','لا — لم يُستلم']];
  if(opts[field]) return opts[field].map(x=>[x, field==='role'?roleName(x):(x==='1'?'نعم':x==='0'?'لا':x)]);
  return null;
}
const EDIT_CONFIG = {
  properties: {title:'تعديل عقار', fields:[['building_no','رقم البناية','text'],['apartment_no','رقم الشقة','text'],['room_no','رقم الغرفة','text'],['status','الحالة','select'],['price','السعر','number'],['location','الموقع','text'],['name','اسم العرض (اختياري)','text'],['type','النوع','select'],['image','رمز/صورة','text'],['notes','ملاحظات','textarea']]},
  clients: {title:'تعديل عميل', fields:[['name','اسم العميل','text'],['phone','الهاتف','text'],['email','البريد','text'],['national_id','الهوية/السجل','text'],['balance','الرصيد الافتتاحي','number'],['notes','ملاحظات','textarea']]},
  contracts: {title:'تعديل عقد', fields:[['contract_no','رقم العقد','text'],['contract_type','نوع العقد','select'],['property_id','العقار','select'],['client_id','العميل','select'],['tenant_nationality','جنسية المستأجر','text'],['tenant_id_no','رقم الهوية/السجل','text'],['unit_details','تفاصيل الوحدة','textarea'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['rent_amount','قيمة الإيجار','number'],['deposit_amount','التأمين','number'],['deposit_received','استلام التأمين المالي','select'],['deposit_received_at','تاريخ استلام التأمين','date'],['deposit_received_amount','مبلغ التأمين المستلم','number'],['late_fee','غرامة التأخير','number'],['grace_days','مهلة السداد بالأيام','number'],['renewal_notice_days','تنبيه التجديد بالأيام','number'],['status','الحالة','select'],['payment_cycle','دورة الدفع','select'],['legal_terms','الشروط القانونية','textarea'],['notes','ملاحظات','textarea']]},
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
  if(!cfg || !row.id){ toastNotice('لم يتم العثور على السجل'); return; }
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
  }catch(e){ toastErr(e); }
}
async function invoiceFromContract(contractId){ try{ const due=prompt('تاريخ الاستحقاق YYYY-MM-DD', today()); const desc=prompt('وصف الفاتورة','Rent invoice'); const res=await api('invoice_from_contract',{method:'POST',body:JSON.stringify({contract_id:contractId,due_date:due||today(),description:desc||'Rent invoice'})}); toast('تم إنشاء الفاتورة '+res.item.invoice_no); await loadAll(); showSection('invoices'); }catch(e){toastErr(e)} }
async function approveContract(contractId){ try{ if(!confirm('اعتماد العقد سيولد جدول الفواتير الشهرية حسب مدة العقد. هل تريد المتابعة؟')) return; const res=await api('approve_contract',{method:'POST',body:JSON.stringify({contract_id:contractId})}); toast('تم اعتماد العقد وتوليد '+(res.created_invoices||[]).length+' فاتورة'); await loadAll(); showSection('contracts'); }catch(e){toastErr(e)} }
async function renewContract(contractId){
  const c = byId('contracts', contractId);
  if(!c.id) return toastNotice('لم يتم العثور على العقد');
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
  }catch(e){ toastErr(e); }
}
function showHtmlPreview(title, html, fileName){
  window.__lqPreviewHtml = html || '';
  window.__lqPreviewFile = fileName || 'launch-quality-preview.html';
  const body = $('#genericModalBody');
  if(!body) return;
  body.innerHTML = `<div class="lq-html-preview" style="display:grid;gap:14px">
    <div class="lq-detail-head">
      <div><h2>${htmlEscape(title || 'معاينة')}</h2><p>جاهز للطباعة أو التنزيل</p></div>
      <div class="toolbar"><button class="gold-btn" onclick="printHtmlPreview()">طباعة</button><button class="ghost" onclick="downloadHtmlPreview()">تنزيل HTML</button></div>
    </div>
    <iframe id="lqHtmlPreviewFrame" title="${htmlEscape(title || 'Preview')}" srcdoc="${htmlEscape(html || '')}" style="width:100%;height:min(72vh,820px);border:1px solid rgba(255,255,255,.16);border-radius:10px;background:#fff"></iframe>
  </div>`;
  openModal('genericModal');
}
function printHtmlPreview(){
  try{ const frame=$('#lqHtmlPreviewFrame'); frame?.contentWindow?.focus(); frame?.contentWindow?.print(); }
  catch(e){ toastNotice('تعذر فتح الطباعة من المعاينة'); }
}
function downloadHtmlPreview(){ downloadFile(window.__lqPreviewFile || 'launch-quality-preview.html', window.__lqPreviewHtml || '', 'text/html'); }
async function contractDocument(contractId){
  let w = null;
  try{
    w = window.open('', '_blank');
    if(w){
      w.document.write('<!doctype html><meta charset="utf-8"><title>Loading contract</title><body style="font-family:Arial;padding:24px">Loading contract preview...</body>');
      w.document.close();
    }
    const res=await api('contract_template',{method:'POST',body:JSON.stringify({contract_id:contractId})});
    if(w && !w.closed){
      w.document.open();
      w.document.write(res.html);
      w.document.close();
      w.focus();
      return;
    }
    showHtmlPreview('معاينة العقد', res.html, `contract-${contractId}.html`);
  }catch(e){
    try{ if(w && !w.closed) w.close(); }catch(_){}
    toastErr(e);
  }
}

function openPayment(id){ const inv=byId('invoices',id); const remaining=Number(inv.amount)-Number(inv.paid_amount); $('#payInvoiceId').value=id; $('#payAmount').value=remaining.toFixed(2); $('#payInfo').textContent=`${inv.invoice_no} - المتبقي ${money(remaining)}`; openModal('paymentModal'); }
async function submitPayment(){ try{ const res=await api('pay_invoice',{method:'POST',body:JSON.stringify({invoice_id:val('payInvoiceId'),amount:num('payAmount'),method:val('payMethod'),note:val('payNote')})}); closeModal('paymentModal'); toast(res.approval_required?'تم إرسال طلب اعتماد للتحصيل — راجع مركز الاعتمادات':'تم التحصيل وتحديث الحسابات'); await loadAll(); }catch(e){toastErr(e)} }
function printInvoice(id){
  const inv=byId('invoices',id);
  if(!inv) return;
  Jawdah.invoiceForPrint=inv;
  if(window.LQ_PRINT?.buildTaxInvoiceHtml){
    $('#invoicePreview').innerHTML=window.LQ_PRINT.buildTaxInvoiceHtml(inv);
    openModal('invoiceModal');
    return;
  }
  const client=byId('clients',inv.client_id), prop=byId('properties',inv.property_id), contract=byId('contracts',inv.contract_id);
  const rem=Number(inv.amount)-Number(inv.paid_amount);
  const unit=propertyUnitLine(prop);
  $('#invoicePreview').innerHTML=`<div class="invoice-paper"><p>${inv.invoice_no}</p></div>`;
  openModal('invoiceModal');
}
function downloadInvoice(){
  const base=window.location.origin+(window.location.pathname.replace(/\/[^/]*$/,'/'));
  const body=$('#invoicePreview').innerHTML;
  const html='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  downloadFile(`invoice-${Jawdah.invoiceForPrint?.invoice_no||'file'}.html`,html,'text/html');
}
async function voidInvoice(id){
  const inv=byId('invoices',id);
  if(!inv.id) return;
  if(Number(inv.paid_amount||0)>0) return toastNotice('لا يمكن إلغاء فاتورة عليها دفعات — استخدم إعادة الإصدار');
  const reason=prompt('سبب الإلغاء (Void):','تصحيح محاسبي');
  if(reason===null) return;
  try{
    await api('void_invoice',{method:'POST',body:JSON.stringify({invoice_id:id,reason:reason||'Void'})});
    toast('تم إلغاء الفاتورة');
    await loadAll();
  }catch(e){toastErr(e)}
}
async function showInvoiceAudit(id){
  try{
    const res=await api('invoice_audit?invoice_id='+encodeURIComponent(id));
    const rows=(res.events||[]).map(e=>`<tr><td>${escapeHtml(e.created_at||'')}</td><td>${escapeHtml(e.username||'')}</td><td>${escapeHtml(e.action||'')}</td><td>${escapeHtml(e.details||'')}</td></tr>`).join('')||'<tr><td colspan="4">لا توجد أحداث</td></tr>';
    $('#genericModalBody').innerHTML=`<h2>سجل الفاتورة ${escapeHtml(res.invoice_no||id)}</h2><div class="table-wrap"><table><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th></tr></thead><tbody>${rows}</tbody></table></div><div class="toolbar"><button class="ghost" onclick="closeModal('genericModal')">إغلاق</button></div>`;
    openModal('genericModal');
  }catch(e){toastErr(e)}
}
window.voidInvoice=voidInvoice;
window.showInvoiceAudit=showInvoiceAudit;
function clientStatement(id){ const c=byId('clients',id); const inv=(Jawdah.data.invoices||[]).filter(x=>x.client_id===id); const acc=(Jawdah.data.accounts||[]).filter(x=>x.client_id===id); const total=inv.reduce((s,x)=>s+Number(x.amount||0),0), paid=inv.reduce((s,x)=>s+Number(x.paid_amount||0),0); $('#genericModalBody').innerHTML=`<h2>كشف حساب ${escapeHtml(c.name)}</h2><p>إجمالي الفواتير: ${money(total)} | المدفوع: ${money(paid)} | المتبقي: ${money(total-paid)}</p><div class="toolbar"><button class="gold-btn" onclick="printClientStatement('${id}')">كشف PDF / طباعة</button></div>${tableHtml([['رقم','invoice_no'],['تاريخ','issue_date'],['إجمالي','amount',(v)=>money(v)],['مدفوع','paid_amount',(v)=>money(v)],['حالة','status',(v)=>badge(v)]],inv)}<h3>الحركات</h3>${tableHtml([['تاريخ','entry_date'],['نوع','type'],['وصف','description'],['مبلغ','amount',(v)=>money(v)]],acc)}`; openModal('genericModal'); }
function openModal(id){ $('#'+id).classList.add('show'); ensureEnglishDigits($('#'+id)); } function closeModal(id){ $('#'+id).classList.remove('show'); }
async function downloadBackup(){ try{ const res=await api('backup'); downloadFile('jawdah-cloud-backup.json', JSON.stringify(res.backup,null,2), 'application/json'); }catch(e){toastErr(e)} }
window.downloadBackup = downloadBackup;
async function downloadBackupFile(kind, timestamp){
  try{
    const qs=new URLSearchParams({kind});
    if(timestamp) qs.set('timestamp', timestamp);
    const res=await fetch('/api/backup/download?'+qs,{headers:{Authorization:'Bearer '+Jawdah.token}});
    if(!res.ok){ const err=await res.text(); throw new Error(err||''); }
    const blob=await res.blob();
    const cd=res.headers.get('Content-Disposition')||'';
    const match=cd.match(/filename="?([^"]+)"?/);
    const name=match?match[1]:`jawdah-backup.${kind==='sqlite'?'sqlite3':'json'}`;
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('تم تنزيل '+name);
  }catch(e){ toastErr(e); }
}
function downloadFile(name,content,type='text/plain'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
async function exportCsv(table){ try{ const res=await fetch('/api/export/'+table,{headers:{Authorization:'Bearer '+Jawdah.token}}); if(!res.ok) throw new Error(''); const blob=await res.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jawdah-'+table+'.csv'; a.click(); }catch(e){toastErr(e,'تعذر تصدير الملف')} }
function renderReports(){
  const k=dashKpis(); const decisions=dashDecisions();
  $('#reportsBox').innerHTML=`<div class="kpis grid"><div class="kpi"><span>الإيرادات</span><strong>${money(k.income)}</strong></div><div class="kpi"><span>المصروفات</span><strong>${money(k.expense)}</strong></div><div class="kpi"><span>الصافي</span><strong>${money(k.net)}</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(k.overdue)}</strong></div></div><div class="card"><h3>قرارات تنفيذية</h3>${decisions.length?decisions.map(d=>`<p><span class="badge">${d.level}</span> ${d.text}</p>`).join(''):'<p class="mini">لا توجد قرارات حالياً</p>'}</div>`;
}
async function runQA(){
  const problems=[]; const data=Jawdah.data;
  (data.contracts||[]).forEach(c=>{ if(!byId('properties',c.property_id).id) problems.push('عقد بدون عقار: '+c.id); if(!byId('clients',c.client_id).id) problems.push('عقد بدون عميل: '+c.id); });
  (data.invoices||[]).forEach(i=>{ if(!byId('contracts',i.contract_id).id) problems.push('فاتورة بدون عقد: '+i.invoice_no); if(Number(i.paid_amount)>Number(i.amount)) problems.push('فاتورة مدفوعة أكثر من الإجمالي: '+i.invoice_no); });
  const localScore=Math.max(0,100-problems.length*10);
  let html=`<div class="card lq-ops-guide"><h3>✅ فحص التشغيل — خيار أ</h3><p class="mini">سلسلة العمل: عقار → عميل → عقد → فاتورة → تحصيل</p><ol class="check-list" style="text-align:right"><li>المشاريع: أضف بناية + شقة + غرفة + موقع</li><li>العملاء: اسم العميل مطلوب</li><li>العقود: اختر عقار وعميل + إيجار &gt; 0</li><li>الفواتير: من العقود → زر «فاتورة»</li><li>التحصيل: من الفواتير → تحصيل</li></ol></div>`;
  html+=`<div class="kpi"><span>فحص محلي</span><strong>${fmt(localScore)}%</strong></div>${problems.length?problems.map(p=>`<p class="badge overdue">${htmlEscape(p)}</p>`).join(''):'<p class="badge paid">الترابط المحلي سليم</p>'}`;
  $('#qaBox').innerHTML=html+'<p class="mini">جاري فحص الإنتاج…</p>';
  try{
    const ops=await api('operations_check');
    const checks=ops.checks||[];
    html+=`<div class="kpi" style="margin-top:12px"><span>جاهزية التشغيل</span><strong>${fmt(ops.score||0)}%</strong></div>`;
    html+=checks.map(c=>`<p class="badge ${c.ok?'paid':'overdue'}">${htmlEscape(c.name)}: ${htmlEscape(String(c.value??''))}${c.hint&&!c.ok?' · '+htmlEscape(c.hint):''}</p>`).join('');
    if(ops.offsite&&!ops.offsite.enabled){
      html+=`<p class="mini" style="margin-top:10px">Off-site: أضف على Railway <code>LQ_OFFSITE_BACKUP_URL</code> (مثلاً webhook من webhook.site للتجربة) ثم «نسخ احتياطي الآن».</p>`;
    } else if(ops.offsite){
      html+=`<p class="mini">Off-site: مفعّل · آخر دفع: ${ops.offsite.last_push||'—'}</p>`;
    }
    const v=await api('backup/verify');
    const vr=v.verification||{};
    html+=`<p class="mini" style="margin-top:12px">فحص النسخ الاحتياطي: ${fmt(vr.score||0)}% — ${vr.ok?'ناجح':'يحتاج مراجعة'}</p>`;
  }catch(e){ html+=`<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`; }
  $('#qaBox').innerHTML=html;
}
window.runQA = runQA;
function drawCharts(){
  try{
  const series=chartSeries();
  const labels=series.map(x=>x.month||x.label||'');
  const priorIncome=series.map((x,i)=> i>0?Number(series[i-1].income||0):Number(x.income||0)*0.85);
  const priorExpense=series.map((x,i)=> i>0?Number(series[i-1].expense||0):Number(x.expense||0)*0.85);
  drawLinePro('incomeChart', series.map(x=>Number(x.income||0)), labels, priorIncome);
  drawDonutPro('occupancyChart', dashKpis().occupancy);
  drawBarPro('maintCostChart', series.map(x=>Number(x.expense||0)), labels, priorExpense);
  drawProductivityChart('productivityChart', series);
  const k=dashKpis();
  const collPct=k.billed?Math.round((Number(k.paid||0)/Number(k.billed))*100):0;
  const collectionSeries=series.map(x=>{
    const inc=Number(x.income||0);
    const base=k.billed?Math.min(100,Math.round((inc/Math.max(Number(k.billed)/6,1))*60)):0;
    return Math.min(100,Math.round(base*0.5+collPct*0.5));
  });
  drawLinePro('collectionChart', collectionSeries.length?collectionSeries:series.map(()=>collPct), labels, collectionSeries.map((v,i)=> i>0?collectionSeries[i-1]:Math.max(0,v-5)));
  const netSeries=series.map(x=>Math.max(0,Number(x.income||0)-Number(x.expense||0)));
  drawBarPro('netProfitChart', netSeries, labels, netSeries.map((v,i)=> i>0?netSeries[i-1]:v*0.9));
  if($('#expenseChart')) drawBar('expenseChart', series.map(x=>Number(x.expense||0)));
  $$('.saas-chart-panel .canvas-wrap .saas-chart-loading').forEach(el=>{ el.style.display='none'; });
  }catch(e){}
}
function drawProductivityChart(id, series){
  const c=$('#'+id); if(!c) return;
  const wrap=c.parentElement;
  const maint=Jawdah.data?.maintenance||[];
  const months=(series||chartSeries()).map(x=>x.month||'');
  if(!months.length) return;
  const openCounts=months.map(m=>maint.filter(x=>String(x.request_date||'').startsWith(m) && !String(x.status||'').toLowerCase().match(/closed|done|complete/)).length);
  const doneCounts=months.map(m=>maint.filter(x=>String(x.request_date||'').startsWith(m) && String(x.status||'').toLowerCase().match(/closed|done|complete/)).length);
  const priorDone=doneCounts.map((v,i)=> i>0?doneCounts[i-1]:Math.max(0,v-1));
  const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h);
  const max=Math.max(...openCounts,...doneCounts,...priorDone,1)*1.3;
  const bw=(w-50)/months.length*.35;
  priorDone.forEach((v,i)=>{
    const x=24+i*(w-50)/months.length+8+bw+4, bh=(v/max)*(h-36);
    g.fillStyle='rgba(245,215,110,.35)'; g.fillRect(x,h-22-bh,bw*.4,bh);
  });
  months.forEach((m,i)=>{
    const x=24+i*(w-50)/months.length+8;
    const oh=(openCounts[i]/max)*(h-36), dh=(doneCounts[i]/max)*(h-36);
    g.fillStyle='rgba(109,93,252,.7)'; g.fillRect(x,h-22-oh,bw,oh);
    g.fillStyle='rgba(0,212,255,.7)'; g.fillRect(x+bw+4,h-22-dh,bw,dh);
  });
  g.fillStyle='rgba(139,149,168,.8)'; g.font='10px Tajawal,sans-serif';
  months.forEach((lb,i)=>{ g.fillText(String(lb).slice(5), 24+i*(w-50)/months.length, h-6); });
  if(wrap){
    wrap.classList.add('chart-drawn');
    if(!wrap.querySelector('.chart-compare-legend')){
      wrap.insertAdjacentHTML('beforeend','<div class="chart-compare-legend"><span><i class="cur"></i>الشهر الحالي</span><span><i class="prior"></i>الشهر السابق</span></div>');
    }
  }
}
function drawLinePro(id, arr, labels=[], compareArr=null){
  const c=$('#'+id); if(!c) return;
  const wrap=c.parentElement;
  const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h);
  const vals=[...arr,...(compareArr||[]),1], max=Math.max(...vals)*1.25;
  g.strokeStyle='rgba(255,255,255,.08)';
  for(let i=0;i<4;i++){let y=20+i*(h-50)/3;g.beginPath();g.moveTo(20,y);g.lineTo(w-20,y);g.stroke();}
  const plotLine=(data,dashed,gold)=>{
    g.beginPath();
    data.forEach((v,i)=>{ const x=24+i*(w-48)/(data.length-1||1), y=h-28-(v/max)*(h-58); i?g.lineTo(x,y):g.moveTo(x,y); });
    if(gold){
      const gr=g.createLinearGradient(0,0,w,0);
      gr.addColorStop(0,'#D4AF37'); gr.addColorStop(.5,'#F5D76E'); gr.addColorStop(1,'#C9A227');
      g.strokeStyle=gr;
    } else {
      const gr=g.createLinearGradient(0,0,w,0);
      gr.addColorStop(0,'#6D5DFC'); gr.addColorStop(1,'#00D4FF');
      g.strokeStyle=gr;
    }
    g.lineWidth=dashed?2:3;
    g.setLineDash(dashed ? [6, 5] : []);
    g.shadowColor=dashed?'rgba(245,215,110,.25)':'rgba(109,93,252,.4)';
    g.shadowBlur=dashed?0:10;
    g.stroke(); g.shadowBlur=0; g.setLineDash([]);
  };
  if(compareArr && compareArr.length===arr.length) plotLine(compareArr,true,true);
  plotLine(arr,false,false);
  arr.forEach((v,i)=>{ const x=24+i*(w-48)/(arr.length-1||1), y=h-28-(v/max)*(h-58); g.beginPath(); g.fillStyle='#7C4DFF'; g.arc(x,y,4,0,Math.PI*2); g.fill(); });
  g.fillStyle='rgba(139,149,168,.85)'; g.font='10px Tajawal,sans-serif';
  labels.slice(0,arr.length).forEach((lb,i)=>{ const x=24+i*(w-48)/(arr.length-1||1); g.fillText(String(lb).slice(5), x-8, h-8); });
  if(wrap){
    wrap.classList.add('chart-drawn');
    if(compareArr && !wrap.querySelector('.chart-compare-legend')){
      wrap.insertAdjacentHTML('beforeend','<div class="chart-compare-legend"><span><i class="cur"></i>الشهر الحالي</span><span><i class="prior"></i>الشهر السابق</span></div>');
    }
  }
}
function drawDonutPro(id,p){ const c=$('#'+id); if(!c) return; const wrap=c.parentElement; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/2.8; g.lineWidth=14; g.strokeStyle='rgba(255,255,255,.08)'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const pct=Math.max(0,Math.min(100,Number(p||0))); const prior=Math.max(0,Math.min(100,pct*0.88)); g.lineWidth=10; g.strokeStyle='rgba(245,215,110,.35)'; g.beginPath(); g.arc(x,y,r+8,-Math.PI/2,-Math.PI/2+Math.PI*2*(prior/100)); g.stroke(); const gr=g.createLinearGradient(x-r,y-r,x+r,y+r); gr.addColorStop(0,'#D4AF37'); gr.addColorStop(1,'#6D5DFC'); g.strokeStyle=gr; g.lineWidth=14; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*(pct/100)); g.stroke(); if(pct<100){ g.strokeStyle='#00D4FF'; g.beginPath(); g.arc(x,y,r,-Math.PI/2+Math.PI*2*(pct/100),-Math.PI/2+Math.PI*2); g.stroke(); } g.fillStyle='#fff'; g.font='700 22px Tajawal'; g.textAlign='center'; g.fillText(fmt(pct)+'%',x,y+8); if(wrap){ wrap.classList.add('chart-drawn'); if(!wrap.querySelector('.chart-compare-legend')) wrap.insertAdjacentHTML('beforeend','<div class="chart-compare-legend"><span><i class="cur"></i>الشهر الحالي</span><span><i class="prior"></i>الشهر السابق</span></div>'); } }
function connectLiveStream(){
  if(Jawdah.liveStream){ try{ Jawdah.liveStream.close(); }catch(e){} Jawdah.liveStream=null; }
  if(!Jawdah.token) return;
  const url='/api/events/stream?token='+encodeURIComponent(Jawdah.token);
  try{
    const es=new EventSource(url);
    Jawdah.liveStream=es;
    es.onmessage=(ev)=>{
      try{ applyLiveEvent(JSON.parse(ev.data||'{}')); }catch(e){}
    };
    es.onerror=()=>{ es.close(); Jawdah.liveStream=null; setTimeout(connectLiveStream,30000); };
  }catch(e){}
}
function applyLiveEvent(payload){
  if(!payload) return;
  const k=payload.kpis||{};
  const host=$('#dashLiveTicker');
  if(host && payload.type==='kpis'){
    const parts=[];
    if(k.overdue!=null) parts.push('متأخرات '+money(k.overdue));
    if(k.expiring!=null) parts.push('عقود '+fmt(k.expiring));
    if(k.health!=null) parts.push('جاهزية '+fmt(k.health)+'%');
    if(payload.deltas && payload.deltas.overdue) parts.push('Δ متأخرات '+money(payload.deltas.overdue));
    if(parts.length) renderDashLiveTicker(parts);
  }
  const bell=$('#bellDot');
  if(bell && payload.type==='kpis'){
    const pa=Number(k.pending_approvals||0);
    const ac=Number(k.alert_center_total||0);
    bell.classList.toggle('hidden', !(Number(k.overdue||0)>0 || Number(k.expiring||0)>0 || pa>0 || ac>0));
  }
  const backupEl=$('#topBackupStatus');
  if(backupEl && payload.last_backup){
    backupEl.textContent='Backup · '+String(payload.last_backup).slice(0,16);
    backupEl.classList.remove('hidden');
  }
}
function toggleFieldMode(){
  Jawdah.fieldMode=!Jawdah.fieldMode;
  localStorage.setItem('jawdah_field_mode', Jawdah.fieldMode?'1':'0');
  applyFieldMode();
  haptic(12);
}
function applyFieldMode(){
  document.body.classList.toggle('field-mode', !!Jawdah.fieldMode);
  const btn=$('#fieldModeBtn');
  if(btn) btn.classList.toggle('active', !!Jawdah.fieldMode);
  renderFieldModeGrid();
  if(window.LQ_STAFF_FIELD){
    window.LQ_STAFF_FIELD.enhanceFieldGrid();
    window.LQ_STAFF_FIELD.renderPanel();
  }
  if(window.LQ_FIELD_APP && typeof LQ_FIELD_APP.onFieldModeChange==='function') LQ_FIELD_APP.onFieldModeChange();
}
function renderFieldModeGrid(){
  const host=$('#fieldModeGrid'); if(!host) return;
  if(!Jawdah.fieldMode){ host.innerHTML=''; return; }
  const k=dashKpis();
  host.innerHTML=[
    {icon:'🔧',label:'صيانة',go:'maintenance',v:fmt(k.maintenance||0)},
    {icon:'🧾',label:'فواتير',go:'invoices',v:money(k.overdue||0)},
    {icon:'🏢',label:'عقارات',go:'properties',v:fmt(k.properties||0)}
  ].map(x=>'<button type="button" class="field-mode-card saas-glass" onclick="showSection(\''+x.go+'\')"><span>'+x.icon+'</span><b>'+x.label+'</b><small>'+x.v+'</small></button>').join('');
}
async function openExecutiveReport(){
  const url='/api/report/executive?token='+encodeURIComponent(Jawdah.token||'');
  const w=window.open(url,'_blank','noopener');
  if(w) return;
  try{
    const res=await fetch(url);
    if(!res.ok) throw new Error(await res.text());
    const html=await res.text();
    showHtmlPreview('التقرير التنفيذي', html, 'launch-quality-executive-report.html');
  }catch(e){
    if(typeof downloadFinancialReport==='function'){
      toastNotice('تعذر فتح التقرير التنفيذي — جاري تنزيل التقرير المالي البديل');
      downloadFinancialReport();
      return;
    }
    toastErr(e,'تعذر فتح التقرير التنفيذي');
  }
}
function drawBarPro(id,arr,labels=[],compareArr=null){
  const c=$('#'+id); if(!c) return;
  const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h);
  const vals=[...arr,...(compareArr||[]),1], max=Math.max(...vals)*1.25;
  const colors=['#6D5DFC','#7C4DFF','#00D4FF','#6D5DFC','#7C4DFF','#00D4FF'];
  const bw=(w-50)/arr.length*.55;
  if(compareArr && compareArr.length===arr.length){
    compareArr.forEach((v,i)=>{
      const x=24+i*(w-50)/arr.length+8+bw*.55, bh=(v/max)*(h-36);
      g.fillStyle='rgba(245,215,110,.35)'; g.fillRect(x,h-22-bh,bw*.4,bh);
    });
  }
  arr.forEach((v,i)=>{
    const x=24+i*(w-50)/arr.length+8, bh=(v/max)*(h-36);
    const gr=g.createLinearGradient(0,h-22-bh,0,h-22);
    gr.addColorStop(0,colors[i%colors.length]); gr.addColorStop(1,'rgba(109,93,252,.4)');
    g.fillStyle=gr; g.fillRect(x,h-22-bh,bw,bh);
  });
  g.fillStyle='rgba(139,149,168,.85)'; g.font='10px Tajawal,sans-serif';
  labels.slice(0,arr.length).forEach((lb,i)=>{ const x=24+i*(w-50)/arr.length+8; g.fillText(String(lb).slice(5), x, h-6); });
  const wrap=c.parentElement;
  if(wrap){
    wrap.classList.add('chart-drawn');
    if(compareArr && !wrap.querySelector('.chart-compare-legend')){
      wrap.insertAdjacentHTML('beforeend','<div class="chart-compare-legend"><span><i class="cur"></i>الشهر الحالي</span><span><i class="prior"></i>الشهر السابق</span></div>');
    }
  }
}
function chartSeries(){
  if(Jawdah.dashboard?.series?.length) return Jawdah.dashboard.series;
  const accounts=Jawdah.data?.accounts||[];
  const out=[];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    const key=d.toISOString().slice(0,7);
    let income=0, expense=0;
    accounts.forEach(a=>{
      if(!String(a.entry_date||'').startsWith(key)) return;
      const amt=Number(a.amount||0);
      if(a.type==='income') income+=amt; else if(a.type==='expense') expense+=amt;
    });
    out.push({month:key,income,expense});
  }
  if(out.some(x=>x.income||x.expense)) return out;
  const invoices=Jawdah.data?.invoices||[];
  return out.map(x=>{
    const paid=invoices.filter(inv=>String(inv.paid_date||inv.due_date||'').startsWith(x.month)).reduce((s,inv)=>s+Number(inv.paid_amount||0),0);
    return paid?{...x,income:paid}:x;
  });
}
function scheduleDrawCharts(retry=0){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    drawCharts();
    if(retry<4){
      const probe=$('#incomeChart');
      const h=probe?.getBoundingClientRect().height||0;
      if(!probe||h<16) setTimeout(()=>scheduleDrawCharts(retry+1),100+retry*80);
    }
  }));
}
function prepCanvas(c){
  const wrap=c?.parentElement;
  let w=Math.floor(c.getBoundingClientRect().width);
  let h=Math.floor(c.getBoundingClientRect().height);
  if(w<16 && wrap) w=Math.max(16, wrap.clientWidth||wrap.offsetWidth||320);
  if(h<16 && wrap) h=Math.max(16, wrap.clientHeight||wrap.offsetHeight||200);
  if(w<16) w=320;
  if(h<16) h=200;
  c.style.width=w+'px'; c.style.height=h+'px';
  const dpr=Math.min(window.devicePixelRatio||1,2);
  c.width=Math.max(1,Math.floor(w*dpr)); c.height=Math.max(1,Math.floor(h*dpr));
  const g=c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  return [g,w,h];
}
function drawDonut(id,p){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/3; g.lineWidth=22; g.lineCap='round'; g.strokeStyle='rgba(148,163,184,.14)'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const gr=g.createLinearGradient(x-r,y-r,x+r,y+r); gr.addColorStop(0,'#9fd4d0'); gr.addColorStop(.5,'#6aab9e'); gr.addColorStop(1,'#4a8580'); g.strokeStyle=gr; g.shadowBlur=0; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*p/100); g.stroke(); g.fillStyle='#e2e8f0'; g.font='700 28px Segoe UI'; g.textAlign='center'; g.fillText(fmt(p)+'%',x,y+6); g.font='13px Segoe UI'; g.fillStyle='rgba(148,163,184,.85)'; g.fillText('Occupancy',x,y+28); }
function drawBar(id,arr){ const c=$('#'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const max=Math.max(...arr,1)*1.2, bw=(w-60)/arr.length*.65; arr.forEach((v,i)=>{const x=30+i*(w-60)/arr.length+10, bh=(v/max)*(h-50); const grd=g.createLinearGradient(0,h-25-bh,0,h-25); grd.addColorStop(0,'#9fd4d0'); grd.addColorStop(1,'#4a8580'); g.fillStyle=grd; g.shadowBlur=0; g.fillRect(x,h-25-bh,bw,bh);}); }
function initClock(){ setInterval(()=>{ const d=new Date(); $('#clock').textContent=d.toLocaleTimeString('en-US',{hour12:false}); },1000); }
function initLoginCinema(){
  const screen=$('#loginScreen');
  if(!screen||window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
}
function initDashboardCharts(){
  const dash=$('#sec-dashboard'); if(!dash||window.__lqChartsObs) return;
  window.__lqChartsObs=true;
  if(typeof ResizeObserver!=='undefined'){
    const ro=new ResizeObserver(()=>{ if(dash.classList.contains('active')) scheduleDrawCharts(); });
    ro.observe(dash);
  }
  window.addEventListener('resize',()=>{ if(dash.classList.contains('active')) scheduleDrawCharts(); });
}
function bind(){
  $('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout; $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open'); $('#globalSearch').oninput=()=>renderAll();
  $('#fieldModeBtn')?.addEventListener('click', toggleFieldMode);
  initLoginCinema();
  initDashboardCharts();
  initFabDock();
  if(typeof initEnterpriseVision==='function') initEnterpriseVision();
  document.addEventListener('input',e=>ensureEnglishDigits(e.target));
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') closeKpiInsightPanel();
    if(e.key==='Enter' && $('#loginScreen') && !$('#loginScreen').classList.contains('hidden')) login();
    if(e.ctrlKey&&e.key.toLowerCase()==='k'){ e.preventDefault(); $('#globalSearch').focus(); }
    if(e.key==='/' && document.activeElement.tagName!=='INPUT'){e.preventDefault();$('#globalSearch').focus();}
  });
}
window.LAUNCH_QUALITY_CHECK=()=>({system:'Launch Quality LLC',user:Jawdah.user?.username||null,tables:Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,v.length])),dashboard:Jawdah.dashboard});
window.addEventListener('load',()=>{ syncLoginOwnerBranding(); bind(); initClock(); checkSession(); setInterval(()=>ensureEnglishDigits(),3000); });
window.addEventListener('error',()=>true);
window.addEventListener('unhandledrejection',e=>{ e.preventDefault(); });


/* Launch Quality LLC - production experience layer */
(function(){
  const oldRenderDashboard = window.renderDashboard;
  window.renderDashboard = function(){
    oldRenderDashboard && oldRenderDashboard();
    try{
      const banner = document.getElementById('launchBanner');
      if(banner) banner.classList.add('hidden');
    }catch(e){}
    scheduleDrawCharts();
    if(typeof refreshVisionAi==='function') refreshVisionAi();
  };
  const oldBuildNav = window.buildNav;
  window.buildNav = function(){
    oldBuildNav && oldBuildNav();
  };
  const oldCheck = window.JAWDAH_CLOUD_CHECK;
  window.JAWDAH_CLOUD_CHECK = function(){
    const base = oldCheck ? oldCheck() : {};
    return {...base, version:APP_UI_VERSION, theme:'enterprise-vision', editVerified:true, apiConnected:true};
  };
  window.addEventListener('load',()=>{
    document.title = 'Launch Quality LLC';
    setTimeout(()=>{
      const brandSmall = document.querySelector('.brand-copy-pro small'); if(brandSmall && !brandSmall.textContent.trim()) brandSmall.textContent = APP_UI_VERSION;
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
      <div class="card"><h3>أرصدة المستأجرين</h3>${tableHtml([['المستأجر','client',(v,r)=>r.client.name],['إجمالي','total',(v)=>money(v)],['مدفوع','paid',(v)=>money(v)],['متبقي','outstanding',(v)=>money(v)]], e.tenantBalances)}</div>
      ${window.LQ_ACCOUNTANT_REPORTS ? window.LQ_ACCOUNTANT_REPORTS.toolbarHtml() : ''}`;
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
  const prevBuildNav=buildNav;
  buildNav=function(){ prevBuildNav && prevBuildNav(); };
  const oldPopulate=populateSelects;
  populateSelects=function(){ oldPopulate(); };
  const oldRenderAll=renderAll;
  renderAll=function(){ oldRenderAll(); populateSelects(); renderFinanceSuite(); };
  function safe(rows){return Array.isArray(rows)?rows:[]}
  window.renderFinanceSuite=function(){ renderPurchaseInvoices(); renderRevenues(); renderSalaries(); renderAdminExpenses(); renderInventory(); renderBank(); renderChartAccounts(); renderBankReconciliations(); renderFinancialPeriods(); renderFinanceHero(); };
  window.renderFinanceHero=function(){ const k=dashKpis(); const host=$('#accountingExecutive'); if(host){ host.innerHTML=`<div class="kpi"><span>فواتير مشتريات مستحقة</span><strong>${money(k.purchases_due||0)}</strong></div><div class="kpi"><span>الرواتب</span><strong>${money(k.payroll||0)}</strong></div><div class="kpi"><span>قيمة المخزون</span><strong>${money(k.inventory_value||0)}</strong></div><div class="kpi"><span>رصيد البنك</span><strong>${money(k.bank_balance||0)}</strong></div>`; }};
  window.renderPurchaseInvoices=function(){ const rows=safe(Jawdah.data.purchase_invoices); if($('#purchaseInvoicesTable')) $('#purchaseInvoicesTable').innerHTML=tableHtml([['رقم','purchase_no'],['المورد','supplier'],['التاريخ','invoice_date'],['التصنيف','category'],['الإجمالي','amount',v=>money(v)],['المدفوع','paid_amount',v=>money(v)],['الحالة','status',v=>badge(v)]],rows); };
  window.renderRevenues=function(){ const rows=safe(Jawdah.data.revenues); if($('#revenuesTable')) $('#revenuesTable').innerHTML=tableHtml([['رقم','revenue_no'],['التاريخ','revenue_date'],['المصدر','source'],['التصنيف','category'],['الوصف','description'],['المبلغ','amount',v=>money(v)]],rows); };
  window.renderSalaries=function(){ const rows=safe(Jawdah.data.salaries); if($('#salariesTable')) $('#salariesTable').innerHTML=tableHtml([['الموظف','employee_name'],['الشهر','salary_month'],['أساسي','basic_salary',v=>money(v)],['بدلات','allowances',v=>money(v)],['استقطاعات','deductions',v=>money(v)],['الصافي','net_salary',v=>money(v)],['الحالة','status',v=>badge(v)]],rows); };
  window.renderAdminExpenses=function(){ const rows=safe(Jawdah.data.admin_expenses); if($('#adminExpensesTable')) $('#adminExpensesTable').innerHTML=tableHtml([['التاريخ','expense_date'],['التصنيف','category'],['الوصف','description'],['المورد','supplier'],['العقار','property_id',v=>byId('properties',v).name||''],['المبلغ','amount',v=>money(v)]],rows); };
  window.renderInventory=function(){ const rows=safe(Jawdah.data.inventory_items); if($('#inventoryTable')) $('#inventoryTable').innerHTML=tableHtml([['SKU','sku'],['الصنف','name'],['التصنيف','category'],['الكمية','quantity',v=>fmt(v)],['الحد الأدنى','min_quantity',v=>fmt(v)],['تكلفة الوحدة','unit_cost',v=>money(v)],['القيمة','id',(_,r)=>money(Number(r.quantity||0)*Number(r.unit_cost||0))],['الحالة','id',(_,r)=>Number(r.quantity||0)<=Number(r.min_quantity||0)?'<span class="low-stock">إعادة طلب</span>':'<span class="linked-ok">جيد</span>']],rows); };
  window.renderBank=function(){ const rows=safe(Jawdah.data.bank_transactions); if($('#bankTable')) $('#bankTable').innerHTML=tableHtml([['التاريخ','bank_date'],['البنك','bank_name'],['المرجع','reference'],['النوع','type'],['الوصف','description'],['المبلغ','amount',v=>money(v)],['فاتورة','matched_invoice_id',(v,r)=>byId('invoices',v).invoice_no||'—'],['المطابقة','status',v=>badge(v)]],rows); };
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
    if($('#bankReconciliationsTable')) $('#bankReconciliationsTable').innerHTML=tableHtml([['البنك','bank_name'],['الفترة','period_name'],['رصيد الدفاتر','book_balance',v=>money(v)],['رصيد البنك','bank_balance',v=>money(v)],['الفرق','difference',v=>money(v)],['مطابقة','matched_count'],['غير مطابقة','unmatched_count'],['الحالة','status',v=>badge(v)],['بواسطة','reconciled_by'],['التاريخ','reconciled_at']],rows,r=>{ const acts=canWriteFinance()?`<button class="ghost" onclick="editRecord('bank_reconciliations','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('bank_reconciliations','${r.id}')">حذف</button>`:''; return `${acts} <button class="ghost" onclick="printBankReconciliation('${r.id}')">PDF</button>`; });
    if(window.LQ_BANK_CLOSE && window.LQ_BANK_CLOSE.loadBankAlerts) window.LQ_BANK_CLOSE.loadBankAlerts();
  };
  window.renderFinancialPeriods=function(){
    const rows=safe(Jawdah.data.financial_periods);
    if($('#financialPeriodsTable')) $('#financialPeriodsTable').innerHTML=tableHtml([['الفترة','period_name'],['البداية','start_date'],['النهاية','end_date'],['الحالة','status',v=>badge(v)],['أغلق بواسطة','closed_by'],['تاريخ الإغلاق','closed_at'],['ملاحظات','notes']],rows,r=>{
      const closeBtn=canWriteFinance() && String(r.status||'').toLowerCase()==='open'?`<button class="gold-btn" onclick="closeFinancialPeriod('${r.id}',false)">إقفال الفترة</button>`:'';
      const editBtn=canWriteFinance()?`<button class="ghost" onclick="editRecord('financial_periods','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('financial_periods','${r.id}')">حذف</button>`:'';
      return `${editBtn} ${closeBtn}`;
    });
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
      if(res.open_periods && window.LQ_BANK_CLOSE) window.LQ_BANK_CLOSE.populatePeriodSelect(res.open_periods);
      const preview=$('#reconciliationPreview');
      if(preview) preview.innerHTML=`<span class="badge">حركات: ${fmt(res.transaction_count||0)}</span><span class="badge paid">مطابقة: ${fmt(res.matched_count||0)}</span><span class="badge ${res.unmatched_count? 'overdue':'paid'}">غير مطابقة: ${fmt(res.unmatched_count||0)}</span><span class="badge">رصيد الدفاتر: ${money(res.book_balance||0)}</span>`;
      if(window.LQ_BANK_CLOSE) window.LQ_BANK_CLOSE.renderPreviewBox(res);
      updateRecDifference();
      toast('تم تحليل التسوية');
    }catch(e){ toastErr(e); }
  };
  window.createBankReconciliation=async function(){
    try{
      if(!val('recBank')) return toastNotice('أدخل اسم البنك');
      if(!num('recBookBalance')) await previewBankReconciliation();
      const book=num('recBookBalance'), bank=num('recBankBalance');
      const diff=book-bank;
      const period=val('recPeriod')||today().slice(0,7);
      let matched=0, unmatched=0, pStart='', pEnd='';
      try{
        const prev=await api('bank_reconciliation_preview?'+new URLSearchParams({bank_name:val('recBank'), period_name:period}).toString());
        matched=prev.matched_count||0; unmatched=prev.unmatched_count||0;
        pStart=prev.period_start||''; pEnd=prev.period_end||'';
      }catch(_e){}
      await postTable('bank_reconciliations',{
        bank_name:val('recBank'),
        period_name:period,
        book_balance:book,
        bank_balance:bank,
        difference:diff,
        status:Math.abs(diff)<0.001?'Reconciled':'Variance',
        reconciled_by:Jawdah.user?.name||Jawdah.user?.username||'System',
        reconciled_at:new Date().toISOString(),
        notes:val('recNotes'),
        matched_count:matched,
        unmatched_count:unmatched,
        period_start:pStart,
        period_end:pEnd
      });
    }catch(e){ toastErr(e); }
  };
  window.createChartAccount=()=>postTable('chart_accounts',{code:val('coaCode'),name:val('coaName'),type:val('coaType')||'Expense',parent_code:val('coaParent')||null,active:1,notes:val('coaNotes')});
  window.createFinancialPeriod=()=>postTable('financial_periods',{period_name:val('fpName'),start_date:val('fpStart')||today(),end_date:val('fpEnd')||today(),status:val('fpStatus')||'Open',closed_by:null,closed_at:null,notes:val('fpNotes')});
  async function postTable(table, data){ try{ await api(table,{method:'POST',body:JSON.stringify(data)}); toast('تم الحفظ'); await loadAll(); }catch(e){ toastErr(e); } }
  window.createPurchaseInvoice=()=>postTable('purchase_invoices',{supplier:val('piSupplier'),invoice_date:val('piDate')||today(),due_date:val('piDue'),category:val('piCategory')||'Purchases',description:val('piDesc'),amount:num('piAmount'),paid_amount:num('piPaid'),status:num('piPaid')>=num('piAmount')?'Paid':(num('piPaid')>0?'Partial':'Pending'),property_id:val('piProperty')||null});
  window.createRevenue=()=>postTable('revenues',{revenue_date:val('revDate')||today(),source:val('revSource')||'Other',category:val('revCategory')||'Other Revenue',description:val('revDesc'),amount:num('revAmount'),client_id:val('revClient')||null,property_id:val('revProperty')||null});
  window.createSalary=()=>{const basic=num('salBasic'),allow=num('salAllow'),ded=num('salDeduct'); return postTable('salaries',{employee_name:val('salEmployee'),salary_month:val('salMonth')||today().slice(0,7),basic_salary:basic,allowances:allow,deductions:ded,net_salary:basic+allow-ded,status:val('salStatus'),payment_date:val('salDate')||today()});};
  window.createAdminExpense=()=>postTable('admin_expenses',{expense_date:val('gaDate')||today(),category:val('gaCategory')||'General & Administrative',description:val('gaDesc'),amount:num('gaAmount'),supplier:val('gaSupplier'),property_id:val('gaProperty')||null});
  window.createInventoryItem=()=>postTable('inventory_items',{sku:val('itemSku'),name:val('itemName'),category:val('itemCategory'),unit:val('itemUnit')||'pcs',quantity:num('itemQty'),min_quantity:num('itemMin'),unit_cost:num('itemCost'),location:val('itemLocation')});
  window.createInventoryTransaction=()=>postTable('inventory_transactions',{item_id:val('stockItem'),tx_date:val('stockDate')||today(),tx_type:val('stockType'),quantity:num('stockQty'),unit_cost:num('stockCost'),reference:val('stockRef')});
  window.createBankTransaction=()=>postTable('bank_transactions',{bank_date:val('bankDate')||today(),bank_name:val('bankName')||'Main Bank',reference:val('bankRef'),type:val('bankType'),description:val('bankDesc'),amount:num('bankAmount'),matched_account_id:val('bankMatch')||null,status:val('bankMatch')?'Matched':'Unmatched'});
  window.loadFinancialStatements=async function(){ try{ const res=await api('financial_statements'); const s=res.statements; $('#statementsBox').innerHTML=`<div class="statement-grid"><div class="statement-card"><h3>قائمة الدخل</h3><div class="statement-row"><span>الإيرادات</span><b>${money(s.income_statement.revenue)}</b></div><div class="statement-row"><span>المصروفات</span><b>${money(s.income_statement.expenses)}</b></div><div class="statement-row"><span>الرواتب</span><b>${money(s.income_statement.payroll)}</b></div><div class="statement-row"><span>إدارية وعمومية</span><b>${money(s.income_statement.general_admin)}</b></div><div class="statement-row"><span>صافي الدخل</span><b>${money(s.income_statement.net_income)}</b></div></div><div class="statement-card"><h3>الميزانية</h3><div class="statement-row"><span>البنك</span><b>${money(s.balance_sheet.assets.cash_bank)}</b></div><div class="statement-row"><span>الذمم المدينة</span><b>${money(s.balance_sheet.assets.accounts_receivable)}</b></div><div class="statement-row"><span>المخزون</span><b>${money(s.balance_sheet.assets.inventory)}</b></div><div class="statement-row"><span>الذمم الدائنة</span><b>${money(s.balance_sheet.liabilities.accounts_payable)}</b></div><div class="statement-row"><span>الأرباح المحتجزة</span><b>${money(s.balance_sheet.equity.retained_earnings)}</b></div></div><div class="statement-card"><h3>ربط التخزين</h3><p class="linked-ok">Backup / CSV / Restore يشمل الجداول المالية الجديدة.</p><p>${s.linked_storage.tables.join(' · ')}</p></div></div>`; ensureEnglishDigits($('#statementsBox')); }catch(e){toastErr(e)} };
  const oldBackup=renderBackup;
  renderBackup=function(){ oldBackup(); const extra=['purchase_invoices','revenues','salaries','admin_expenses','inventory_items','inventory_transactions','bank_transactions','chart_accounts','bank_reconciliations','financial_periods']; const box=$('#backupStatus'); if(box) box.innerHTML += `<p class="mini">يشمل التخزين المالي: ${extra.join(', ')}</p>`; };
  document.addEventListener('input', e=>{ if(e.target && e.target.id==='recBankBalance') updateRecDifference(); });
})();


(function(){
  const oldShow = showSection;
  showSection=function(id){
    oldShow(id);
    if(id==='production') $('#sectionTitle').textContent='المتابعة';
  };
  const oldBuild = buildNav;
  buildNav=function(){ oldBuild(); };
  const oldRenderAll2=renderAll;
  renderAll=function(){ oldRenderAll2(); renderProductionUsers(); };
  window.renderProductionUsers=function(){
    const users=Jawdah.data.users||[];
    const required=['owner','ahmed.najjar','waleed.najjar','ahoud.shuaili','properties.manager','operations','ali.hospitality','maintenance','viewer','accountant','razan.accounting','razan.shuaili'];
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
    }catch(e){toastErr(e)}
  };
})();
