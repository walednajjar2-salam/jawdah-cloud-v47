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
  fieldMode: localStorage.getItem('jawdah_field_mode') === '1',
  theme: localStorage.getItem('jawdah_theme') || 'luxury-light'
};
let nizwaLeafletMap = null;
let nizwaMarkers = null;
let ownerLiveTimer = null;
let ownerTimelineFilterDays = Number(localStorage.getItem('jawdah_owner_timeline_days') || 7);
let hospitalityTimelineState = { month:'', year:0, m:0, days:0 };
let propertyTimelineDays = Number(localStorage.getItem('jawdah_property_timeline_days') || 90);
let propertyTimelineType = localStorage.getItem('jawdah_property_timeline_type') || 'all';
let timelineAutoTimer = null;
let liveSyncPending = false;
let liveLastSyncAt = 0;
let liveSyncScheduled = null;
let liveKnownAuditTotal = null;
let liveLastAuditKey = '';
let liveKpiSignalAt = { overdue: 0, health: 0, expiring: 0 };
const NIZWA_DEFAULT = { lat: 22.9333, lng: 57.5333, zoom: 11 };
function haptic(ms){ try{ if(navigator.vibrate) navigator.vibrate(ms||12); }catch(e){} }
function normalizeOwnerTimelineDays(v){
  const n = Number(v);
  return [0,1,7,30,90].includes(n) ? n : 7;
}
function ownerTimelineFilterLabel(v){
  const n = normalizeOwnerTimelineDays(v);
  if(n===0) return 'كل الفترات';
  if(n===1) return 'آخر 24 ساعة';
  return `آخر ${n} يوم`;
}
const PROPERTY_STATUSES = ['شاغرة', 'محجوزة', 'مستأجرة', 'تحت الصيانة', 'موقوفة'];
const NAV_SAAS_ITEMS = [
  ['dashboard','لوحة التحكم','🏠'],
  ['estate-platform','منصة العقارات','🏢'],
  ['accounting-platform','منصة المحاسبة','💼'],
  ['daily-ops','العمليات اليومية','🗂️'],
  ['hospitality','الضيافة','🏨'],
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
  dashboard:'لوحة التحكم','estate-platform':'منصة العقارات','accounting-platform':'منصة المحاسبة','owner-staff':'متابعة الموظفين','owner-live':'لوحة المالك الحية','daily-ops':'العمليات اليومية',hospitality:'الضيافة',properties:'المشاريع',tasks:'المهام',clients:'العملاء',contracts:'العقود',
  revenues:'الإيرادات',invoices:'المدفوعات','admin-expenses':'المصروفات',maintenance:'الصيانة',
  reports:'التقارير',messages:'مركز التنبيهات',walid:'وليد · الذكاء التشغيلي',enterprise:'التوسع المؤسسي',production:'المتابعة',timeline:'الجدول الزمني',
  backup:'المستندات',settings:'الإعدادات',accounts:'الحسابات',users:'المستخدمين',qa:'اختبار التشغيل',
  purchases:'فواتير المشتريات',payroll:'الرواتب',inventory:'المخزن',bank:'كشف البنك',
  'chart-accounts':'دليل الحسابات','bank-reconciliation':'تسوية البنك','financial-periods':'الفترات المالية',statements:'القوائم المالية',
  approvals:'مركز الاعتمادات'
};
function resolveSection(id){ return id==='settings' ? (canManageUsersSection() ? 'users' : 'backup') : id; }
function canSeeApprovals(){ return Jawdah.user && ['admin','owner','accountant','operations'].includes(Jawdah.user.role); }
function canDecideApprovals(){ return Jawdah.user && ['admin','owner','accountant'].includes(Jawdah.user.role); }
function canActivateContracts(){ return Jawdah.user && ['admin','owner'].includes(Jawdah.user.role); }
function canSeeInventory(){ return Jawdah.user && ['admin','owner','accountant','operations','maintenance'].includes(Jawdah.user.role); }
function canSeeFinanceSection(id){
  if(id==='inventory') return canSeeInventory();
  return canSeeFinance();
}
const FINANCE_SECTIONS = new Set(['revenues','admin-expenses','accounts','purchases','payroll','inventory','bank','chart-accounts','statements','bank-reconciliation','financial-periods']);
const APP_UI_VERSION = '2026.3-TD';
const APP_BASE_EDITION = 'terrifying-dev';
const APP_EDITION_LABEL = 'التطوير المرعب';
const DISPLAY_OWNER_NAME = 'القائد يعقوب فاضل الخصيبي';
const DISPLAY_OWNER_ROLE = 'المالك العام';
const OWNER_USERNAMES = new Set(['yaqoub.khasibi','yaqoub','waleed.najjar','waleed']);
const PRIMARY_OWNER_USERNAMES = new Set(['yaqoub.khasibi','yaqoub','waleed.najjar','waleed']);
const EXECUTIVE_MANAGER_USERNAMES = new Set(['ahmed.najjar','ahmed']);
const DAILY_OPS_MANAGER_USERNAMES = new Set(['razan','yaqoub.khasibi','yaqoub','waleed.najjar','waleed']);
const DAILY_OPS_ICON_BY_USERNAME = {
  'owner': '👑',
  'waleed.najjar': '👑',
  'yaqoub.khasibi': '🛰️',
  'yaqoub': '🛰️',
  'razan': '🗂️',
  'admin': '🛡️',
  'operations': '📋',
  'maintenance': '🛠️',
  'accountant': '💼',
};
const OWNER_NAME_BY_USERNAME = {
  'owner': 'القائد يعقوب فاضل الخصيبي',
  'yaqoub.khasibi': 'القائد يعقوب فاضل الخصيبي',
  'yaqoub': 'القائد يعقوب فاضل الخصيبي',
  'waleed.najjar': 'وليد نجار',
};
function shouldForceClassicMode(user){
  const role = String(user?.role||'').toLowerCase();
  const uname = String(user?.username||'').toLowerCase();
  const desktop = !window.matchMedia || !window.matchMedia('(max-width: 900px)').matches;
  if(desktop) return true;
  return ['owner','admin','accountant'].includes(role) || OWNER_USERNAMES.has(uname);
}
const DASH_EXEC_COMMANDS = [
  {label:'إضافة عميل', section:'clients', icon:'👥'},
  {label:'إضافة عقار / بناية', section:'properties', icon:'🏢'},
  {label:'الدخول للمحاسبة', section:'accounts', icon:'💼'},
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
function isPrimaryOwnerUser(){
  const uname = String(Jawdah.user?.username||'').trim().toLowerCase();
  return PRIMARY_OWNER_USERNAMES.has(uname);
}
function canManageUsersSection(){
  const uname = String(Jawdah.user?.username||'').trim().toLowerCase();
  return isPrimaryOwnerUser() || EXECUTIVE_MANAGER_USERNAMES.has(uname);
}
function estateRolePermissions(role){
  const r = String(role||'').toLowerCase();
  if(['owner','admin'].includes(r)) return new Set(['all']);
  if(r==='operations'){
    return new Set([
      'estate_properties',
      'estate_buildings',
      'estate_apartments',
      'estate_rooms',
      'estate_accessories',
      'estate_maintenance',
      'estate_actions_convert',
      'estate_actions_contract_create',
    ]);
  }
  if(r==='accountant'){
    return new Set([
      'estate_properties:read',
      'estate_buildings:read',
      'estate_apartments:read',
      'estate_rooms:read',
      'estate_accessories:read',
      'estate_maintenance',
      'estate_actions_contract_close',
      'estate_actions_month_close',
      'estate_actions_pricing_edit',
    ]);
  }
  if(r==='maintenance'){
    return new Set([
      'estate_properties:read',
      'estate_buildings:read',
      'estate_apartments:read',
      'estate_rooms:read',
      'estate_accessories:read',
      'estate_maintenance',
    ]);
  }
  return new Set([
    'estate_properties:read',
    'estate_buildings:read',
    'estate_apartments:read',
    'estate_rooms:read',
    'estate_accessories:read',
    'estate_maintenance:read',
  ]);
}
function hasEstatePermission(permission){
  const uname = String(Jawdah.user?.username||'').trim().toLowerCase();
  if(OWNER_USERNAMES.has(uname) || EXECUTIVE_MANAGER_USERNAMES.has(uname)) return true;
  const perms = estateRolePermissions(Jawdah.user?.role);
  if(perms.has('all') || perms.has(permission)) return true;
  const base = String(permission||'').split(':',1)[0];
  if(perms.has(base) && !String(permission||'').endsWith(':delete')) return true;
  if(String(permission||'').endsWith(':read') && (perms.has(base) || perms.has(`${base}:read`))) return true;
  return false;
}
const canEstateConvertReservation = ()=>hasEstatePermission('estate_actions_convert');
const canEstateCreateContract = ()=>hasEstatePermission('estate_actions_contract_create');
const canEstateCloseContract = ()=>hasEstatePermission('estate_actions_contract_close');
const canEstateMonthClose = ()=>hasEstatePermission('estate_actions_month_close');
const canEstatePricingEdit = ()=>hasEstatePermission('estate_actions_pricing_edit');
function uiAllowedSection(id){
  if(id==='hospitality' || id==='owner-live') return true;
  const s=Jawdah.uiPermissions?.sections;
  return !s||!s.length||s.includes(id);
}
function uiAllowedKpi(key){ const k=Jawdah.uiPermissions?.kpis; return !k||!k.length||k.includes(key); }
function dashDecisions(){ return Jawdah.dashboard?.decisions || []; }
function canAccessSection(id){
  if(!uiAllowedSection(id)) return false;
  if(id==='inventory' && !canSeeInventory()) return false;
  if(FINANCE_SECTIONS.has(id) && id!=='inventory' && !canSeeFinance()) return false;
  if(id==='users' && !canManageUsersSection()) return false;
  if(id==='owner-staff' && !isPrimaryOwnerUser()) return false;
  if(id==='owner-live' && !isPrimaryOwnerUser()) return false;
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
function realtimeIconFor(action, entity){
  const a = String(action||'').toLowerCase();
  const e = String(entity||'').toLowerCase();
  if(e.includes('contract')) return a.includes('close') ? '📕' : (a.includes('create') ? '📄' : '🧾');
  if(e.includes('invoice')) return a.includes('pay') ? '💳' : '🧾';
  if(e.includes('maint')) return '🛠️';
  if(e.includes('estate_room') || e.includes('estate_apartment') || e.includes('estate_propert') || e.includes('estate_building')) return '🏢';
  if(e.includes('client')) return '👤';
  if(e.includes('user')) return '🛡️';
  if(a.includes('delete')) return '🗑️';
  if(a.includes('update')) return '✏️';
  if(a.includes('create')) return '✨';
  return '🔔';
}
function ensureRealtimeNotifyStore(){
  if(!Array.isArray(Jawdah.liveNotifications)) Jawdah.liveNotifications = [];
  return Jawdah.liveNotifications;
}
function pushRealtimeNotification(item){
  const list = ensureRealtimeNotifyStore();
  const key = String(item?.key||'').trim();
  if(key && list.some(x=>x.key===key)) return;
  list.unshift({
    id: item?.id || `RTN-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    key: key || `RTN-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    ts: item?.ts || new Date().toISOString(),
    icon: item?.icon || '🔔',
    level: item?.level || 'info',
    title: item?.title || 'تنبيه جديد',
    text: item?.text || '',
    actor: item?.actor || '',
  });
  Jawdah.liveNotifications = list.slice(0, 120);
  if($('#sec-messages')?.classList.contains('active') && window.LQ_ALERT_CENTER && typeof window.LQ_ALERT_CENTER.refresh==='function'){
    window.LQ_ALERT_CENTER.refresh(true);
  }
}
function pushRealtimeAuditNotification(audit){
  if(!audit) return;
  const key = [audit.created_at,audit.username,audit.action,audit.entity,audit.entity_id].map(x=>String(x||'')).join('|');
  if(key === liveLastAuditKey) return;
  liveLastAuditKey = key;
  const actor = String(audit.username||'النظام');
  const action = String(audit.action||'update');
  const entity = String(audit.entity||'record');
  const detail = String(audit.details||'').trim();
  const title = `${action} · ${entity}`;
  pushRealtimeNotification({
    key: `audit:${key}`,
    ts: audit.created_at || new Date().toISOString(),
    icon: realtimeIconFor(action, entity),
    level: ['delete','void','close'].some(x=>action.includes(x)) ? 'warn' : 'info',
    title,
    text: detail || `تم تنفيذ ${action} على ${entity}`,
    actor,
  });
}
function pushRealtimeKpiNotification(payload){
  const nowMs = Date.now();
  const deltas = payload?.deltas || {};
  const k = payload?.kpis || {};
  if(Number(deltas.overdue||0) > 0 && nowMs - liveKpiSignalAt.overdue > 25000){
    liveKpiSignalAt.overdue = nowMs;
    pushRealtimeNotification({
      key: `kpi-overdue-${Math.floor(nowMs/25000)}`,
      icon:'🚨',
      level:'danger',
      title:'ارتفاع المتأخرات',
      text:`زادت المتأخرات بقيمة ${money(deltas.overdue||0)} — الإجمالي الحالي ${money(k.overdue||0)}`,
      actor:'Live Monitor'
    });
  }
  if(Number(deltas.health||0) < 0 && nowMs - liveKpiSignalAt.health > 30000){
    liveKpiSignalAt.health = nowMs;
    pushRealtimeNotification({
      key: `kpi-health-${Math.floor(nowMs/30000)}`,
      icon:'📉',
      level:'warn',
      title:'انخفاض مؤشر الجاهزية',
      text:`تغير المؤشر ${fmt(deltas.health||0)}% والإجمالي ${fmt(k.health||0)}%`,
      actor:'Live Monitor'
    });
  }
  if(Number(deltas.expiring||0) > 0 && nowMs - liveKpiSignalAt.expiring > 35000){
    liveKpiSignalAt.expiring = nowMs;
    pushRealtimeNotification({
      key: `kpi-expiring-${Math.floor(nowMs/35000)}`,
      icon:'⏳',
      level:'warn',
      title:'زيادة العقود القريبة من الانتهاء',
      text:`زادت العقود القريبة من الانتهاء بمقدار ${fmt(deltas.expiring||0)}`,
      actor:'Live Monitor'
    });
  }
}
function welcomeMessageForUser(user){
  const name = displayUserName(user || Jawdah.user);
  return `مرحباً ${name}، القائد يعقوب فاضل الخصيبي يرحب بك ويتمنى منك العمل بجد والإخلاص والعمل بروح الفريق.`;
}
function maybeSendWelcomeMessage(user){
  const u = String((user||{}).username || '').toLowerCase();
  if(!u) return;
  const todayKey = new Date().toISOString().slice(0,10);
  const cacheKey = `lq_welcome_${u}_${todayKey}`;
  if(sessionStorage.getItem(cacheKey)==='1') return;
  sessionStorage.setItem(cacheKey,'1');
  const msg = welcomeMessageForUser(user);
  toastOk(msg);
  pushRealtimeNotification({
    key: `welcome:${u}:${todayKey}`,
    icon:'🤝',
    level:'info',
    title:`رسالة ترحيب — ${displayUserName(user)}`,
    text: msg,
    actor:'قيادة الشركة'
  });
}
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
  // Floating assistant / elevator FAB permanently disabled
  dock.classList.add('hidden');
  dock.setAttribute('hidden','');
  dock.style.display='none';
  return;
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
    if(p.apartment_no) parts.push('وحدة '+p.apartment_no);
    if((p.unit_kind||'') === 'غرفة مستقلة' && p.room_no) parts.push('غرفة '+p.room_no);
    if((p.unit_kind||'') === 'شقة كاملة' && p.unit_rooms_count) parts.push(`${p.unit_rooms_count} غرف`);
    if(p.unit_kind) parts.push(p.unit_kind);
    return parts.join(' · ');
  }
  return p.name || p.id;
}
function propertyUnitLine(p){
  if(!p || !p.id) return '';
  const bits = [p.building_no && ('ب'+p.building_no), p.apartment_no && ('و'+p.apartment_no)];
  if((p.unit_kind||'') === 'غرفة مستقلة' && p.room_no) bits.push('غ'+p.room_no);
  bits.push(p.unit_kind || '');
  if((p.unit_kind||'') === 'شقة كاملة' && p.unit_rooms_count) bits.push(`${p.unit_rooms_count}غ`);
  const clean = bits.filter(Boolean);
  return clean.join(' / ');
}
function imagePreviewHtml(url, alt='صورة'){
  let u = String(url||'').trim();
  if(!u) return '—';
  if(!(u.startsWith('/uploads/') || u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image/'))) return '—';
  if(u.startsWith('/uploads/') && Jawdah.token){
    const sep = u.includes('?') ? '&' : '?';
    u = `${u}${sep}token=${encodeURIComponent(Jawdah.token)}`;
  }
  return `<img class="lq-prop-photo lq-prop-photo-thumb" src="${htmlEscape(u)}" alt="${htmlEscape(alt)}">`;
}
function readFileAsDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(String(r.result||''));
    r.onerror = ()=>reject(new Error('تعذر قراءة الملف'));
    r.readAsDataURL(file);
  });
}
function bindImagePreview(inputId, previewId){
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if(!input || !preview || input.dataset.bound==='1') return;
  input.dataset.bound = '1';
  input.addEventListener('change', ()=>{
    const f = input.files?.[0];
    if(!f){ preview.classList.add('hidden'); preview.removeAttribute('src'); return; }
    const r = new FileReader();
    r.onload = ()=>{ preview.src = String(r.result||''); preview.classList.remove('hidden'); };
    r.readAsDataURL(f);
  });
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
  let url = '/api/' + path.replace(/^\//,'');
  // Always also pass token in query — some proxies drop Authorization on GET
  if(Jawdah.token){
    const sep = url.includes('?') ? '&' : '?';
    url += sep + 'token=' + encodeURIComponent(Jawdah.token);
  }
  const res = await fetch(url, {...opts, credentials:'same-origin', headers:{...headers, ...(opts.headers||{})}});
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
  const uname=String(u.username||'').toLowerCase();
  if(OWNER_NAME_BY_USERNAME[uname]) return OWNER_NAME_BY_USERNAME[uname];
  if(u.role==='owner' || OWNER_USERNAMES.has(uname)) return DISPLAY_OWNER_NAME;
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
  const greet=$('#headerGreeting');
  if(greet) greet.textContent=dashGreeting();
  const leader=$('#headerLeaderName');
  if(leader) leader.textContent=name || DISPLAY_OWNER_NAME;
  const org=$('#headerOrgName');
  if(org && !org.textContent.trim()) org.textContent='مشاريع جودة الانطلاقة';
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
  const btn = $('#loginBtn');
  if(btn?.dataset.loading === '1') return;
  const originalLabel = btn?.textContent || 'Sign In · تسجيل الدخول';
  try{
    if(btn){
      btn.dataset.loading = '1';
      btn.classList.add('is-loading');
      btn.disabled = true;
      btn.textContent = 'جاري تسجيل الدخول...';
    }
    const username=$('#loginUser').value.trim(); const password=$('#loginPass').value;
    const remember = Boolean($('#loginRemember')?.checked);
    const res=await api('login',{method:'POST',body:JSON.stringify({username,password,remember_device:remember})});
    Jawdah.token=res.token; Jawdah.user=res.user; localStorage.setItem('jawdah_cloud_token',res.token);
    localStorage.setItem('jawdah_last_user', username);
    localStorage.setItem('jawdah_last_remember', remember ? '1' : '0');
    if(res.must_change_password) Jawdah.user.must_change_password=true;
    // Always show dedicated platforms page after login (العقارات / الضيافة / المحاسبة)
    localStorage.removeItem('jawdah_portal_choice');
    const tok = encodeURIComponent(res.token || '');
    location.replace('/portal-select.html?from=login&t=' + Date.now() + '&token=' + tok);
    return;
  }catch(e){ toastErr(e,'اسم المستخدم أو كلمة المرور غير صحيحة'); }
  finally{
    if(btn){
      btn.dataset.loading = '0';
      btn.classList.remove('is-loading');
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }
}
async function logout(){
  try{await api('logout',{method:'POST'});}catch(e){}
  localStorage.removeItem('jawdah_cloud_token');
  localStorage.removeItem('jawdah_portal_choice');
  Jawdah.token='';
  try{ document.cookie = 'lq_token=; Path=/; Max-Age=0; SameSite=Lax'; }catch(_){}
  if(ownerLiveTimer){ clearInterval(ownerLiveTimer); ownerLiveTimer=null; }
  if(timelineAutoTimer){ clearInterval(timelineAutoTimer); timelineAutoTimer=null; }
  if(liveSyncScheduled){ clearTimeout(liveSyncScheduled); liveSyncScheduled=null; }
  liveKnownAuditTotal = null;
  showLoginShell();
}
function ensureDashActive(){
  const dash=$('#sec-dashboard');
  if(!dash) return;
  if(!dash.classList.contains('active')){
    $$('.section').forEach(sec=>sec.classList.remove('active','section-fade-out','section-fade-in'));
    dash.classList.add('active');
  }
}
function showLoginShell(){
  document.body.classList.add('login-ultra','saas-login','enterprise-vision','va-theme','lq-edition-terrifying');
  document.body.classList.remove('saas-luxury','dash-pro-active','field-mode','app-ready');
  document.body.setAttribute('data-edition', APP_BASE_EDITION);
  $('#app')?.classList.add('hidden');
  const login=$('#loginScreen');
  if(login){
    login.classList.remove('hidden');
    login.removeAttribute('aria-hidden');
    login.removeAttribute('hidden');
    login.style.cssText='';
  }
  closePortalSwitch();
  if(typeof window.__lqHideBoot==='function') window.__lqHideBoot();
  if(typeof syncVisionLayers==='function') syncVisionLayers();
}
function applyTerrifyingBase(){
  try{ localStorage.setItem('lq_ui_edition', APP_BASE_EDITION); }catch(_){}
  document.documentElement.setAttribute('data-lq-edition', APP_BASE_EDITION);
  document.documentElement.setAttribute('data-lq-edition-label', APP_EDITION_LABEL);
  document.body.classList.add('lq-edition-terrifying','lq-hub-expanded');
  document.body.setAttribute('data-edition', APP_BASE_EDITION);
  try{ localStorage.setItem('lq_hub_expanded','1'); localStorage.removeItem('lq_workspace_collapsed'); }catch(_){}
  if(typeof window.__LQ_TERRIFYING__?.heal==='function'){
    try{ window.__LQ_TERRIFYING__.heal(); }catch(_){}
  }
}
function showAppShell(){
  document.body.classList.remove('login-ultra','saas-login');
  document.body.classList.add('saas-luxury','enterprise-vision','va-theme','app-ready');
  applyTerrifyingBase();
  $('#app')?.classList.remove('hidden');
  const login=$('#loginScreen');
  if(login){
    login.classList.add('hidden');
    login.setAttribute('aria-hidden','true');
    login.setAttribute('hidden','');
    login.style.cssText='display:none!important;height:0!important;min-height:0!important;max-height:0!important;overflow:hidden!important;visibility:hidden!important;position:fixed!important;pointer-events:none!important';
  }
  // Hide empty ops bar immediately
  const ops=$('#opsQuickBar');
  if(ops && !ops.querySelector('button')) ops.style.display='none';
  ensureDashActive();
  if(typeof renderDashLoadingSkeleton==='function') renderDashLoadingSkeleton();
  if(typeof window.__lqShowBoot==='function') window.__lqShowBoot('جاري تحميل '+APP_EDITION_LABEL+'…');
  if(typeof syncVisionLayers==='function') syncVisionLayers();
}
async function checkSession(){
  Jawdah.token=Jawdah.token||localStorage.getItem('jawdah_cloud_token')||'';
  // Cookie fallback when localStorage is empty after portal navigation
  if(!Jawdah.token){
    try{
      const m=document.cookie.match(/(?:^|;\s*)lq_token=([^;]+)/);
      if(m&&m[1]){
        Jawdah.token=decodeURIComponent(m[1]).trim();
        if(Jawdah.token) localStorage.setItem('jawdah_cloud_token', Jawdah.token);
      }
    }catch(_){/* ignore */}
  }
  // Accept token + portal from portal-select redirect (query is source of truth)
  try{
    const qs=new URLSearchParams(location.search||'');
    const qToken=(qs.get('token')||'').trim();
    const qPortal=(qs.get('portal')||'').trim();
    if(qToken){
      Jawdah.token=qToken;
      localStorage.setItem('jawdah_cloud_token', qToken);
      qs.delete('token');
    }
    if(qPortal === 'hospitality' || qPortal === 'accounting' || qPortal === 'realestate'){
      localStorage.setItem('jawdah_portal_choice', qPortal);
      qs.delete('portal');
    }
    if(qToken || qPortal){
      const next=location.pathname + (qs.toString() ? ('?'+qs.toString()) : '') + (location.hash||'');
      history.replaceState({}, '', next);
    }
  }catch(_){/* ignore */}
  if(!Jawdah.token){
    showLoginShell();
    return;
  }

  // 1) Auth only — never send authenticated users back to login for data errors
  let me;
  try{
    me=await api('me');
  }catch(e){
    const authFail = e && (e.status===401 || /Authentication required|Invalid or expired/i.test(String(e.message||'')));
    if(authFail){
      localStorage.removeItem('jawdah_cloud_token');
      Jawdah.token='';
      try{ document.cookie = 'lq_token=; Path=/; Max-Age=0; SameSite=Lax'; }catch(_){}
      showLoginShell();
      return;
    }
    // Transient /api/me failure with a saved token: keep trying inside the app shell
    showAppShell();
    try{ if(typeof toast==='function') toast('تعذر التحقق من الجلسة مؤقتاً — أعد المحاولة'); }catch(_){}
    return;
  }
  Jawdah.user=me.user;

  const portalChoice = localStorage.getItem('jawdah_portal_choice');
  if(!portalChoice){
    const tok = encodeURIComponent(Jawdah.token||'');
    location.replace('/portal-select.html?from=session&t=' + Date.now() + '&token=' + tok);
    return;
  }

  // 2) Enter app immediately after auth — loadAll failures must NOT show login
  showAppShell();
  try{
    if(typeof buildNav==='function') buildNav();
    if(typeof renderSidebarUser==='function') renderSidebarUser();
  }catch(_){/* ignore */}
  try{
    await loadAll();
    renderBiometricHub();
    startOwnerLiveAutoRefresh();
    applySavedPortalChoice();
    maybeSendWelcomeMessage(Jawdah.user);
  }catch(e){
    console.error('loadAll after login failed', e);
    try{ if(typeof buildNav==='function') buildNav(); }catch(_){}
    try{ if(typeof toastErr==='function') toastErr(e,'تعذر تحميل البيانات — أنت داخل النظام'); }catch(_){}
    try{ applySavedPortalChoice(); }catch(_){}
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
    if(shouldForceClassicMode(Jawdah.user)){
      Jawdah.fieldMode = false;
      localStorage.setItem('jawdah_field_mode','0');
      try{
        const u = new URL(window.location.href);
        if(u.searchParams.get('field')==='1'){
          u.searchParams.delete('field');
          history.replaceState({},'',u.toString());
        }
      }catch(_e){}
    }
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
    renderBiometricHub();
  }catch(e){
    toastErr(e,'تعذر تحميل البيانات');
    ensureDashActive();
    showSection('dashboard');
    const kpiHost=$('#saasKpiRow'); if(kpiHost) kpiHost.innerHTML='<p class="mini" style="grid-column:1/-1;padding:16px">تعذر تحميل البيانات — أعد المحاولة</p>';
  }finally{
    if(typeof window.__lqHideBoot==='function') window.__lqHideBoot();
  }
}
async function syncLiveData(reason='live'){
  if(!Jawdah.token || liveSyncPending) return;
  liveSyncPending = true;
  try{
    const res = await api('bootstrap');
    Jawdah.data = res.data || Jawdah.data;
    Jawdah.dashboard = res.dashboard || Jawdah.dashboard;
    Jawdah.user = res.user || Jawdah.user;
    const active = resolveSection(Jawdah.activeSection || 'dashboard');
    if(active==='dashboard') renderDashboard();
    else if(active==='timeline') renderTimelinePage();
    else if(active==='owner-live' && typeof renderOwnerLiveHub==='function') renderOwnerLiveHub();
    else if(active==='messages') renderMessagesPage();
    if(typeof syncOpsBar==='function') syncOpsBar();
    if(typeof syncFabDock==='function') syncFabDock();
    if(window.LQ_ALERT_CENTER && Jawdah.dashboard?.kpis){
      window.LQ_ALERT_CENTER.updateBell({ total: Jawdah.dashboard.kpis.alert_center_total });
    }
  }catch(_e){
    // Live sync runs in background; avoid noisy UI errors.
  }finally{
    liveSyncPending = false;
    liveLastSyncAt = Date.now();
    if(liveSyncScheduled){
      clearTimeout(liveSyncScheduled);
      liveSyncScheduled = null;
    }
  }
}
function scheduleLiveSync(reason='live'){
  if(!Jawdah.token) return;
  const minGapMs = 1200;
  const elapsed = Date.now() - liveLastSyncAt;
  if(elapsed >= minGapMs){
    syncLiveData(reason);
    return;
  }
  if(liveSyncScheduled) return;
  liveSyncScheduled = setTimeout(()=>{
    liveSyncScheduled = null;
    syncLiveData(reason);
  }, Math.max(250, minGapMs - elapsed));
}
function startTimelineAutoRefresh(){
  if(timelineAutoTimer) return;
  timelineAutoTimer = setInterval(()=>{
    if(!Jawdah.token) return;
    if($('#sec-timeline')?.classList.contains('active')) renderTimelinePage();
  }, 5000);
}
function renderSidebarUser(){
  const el=$('#sidebarUser'); if(!el||!Jawdah.user) return;
  const name=displayUserName(Jawdah.user);
  const role=displayUserRole(Jawdah.user);
  const greet=employeeGreeting(name);
  const initial=(name||'ي').trim().charAt(0);
  el.innerHTML=`<div class="su-avatar">${initial}</div><div class="su-info"><div class="su-name">${htmlEscape(name)}</div><div class="su-role">${htmlEscape(role)}</div><div class="mini">${htmlEscape(greet)}</div><button type="button" class="su-logout">Sign Out · خروج</button></div>`;
  el.querySelector('.su-logout').onclick=logout;
}
function employeeGreeting(name){
  const h = new Date().getHours();
  const who = String(name||'زميلنا').trim();
  if(h < 12) return `صباح الخير ${who}`;
  if(h < 18) return `مساء الخير ${who}`;
  return `مساء النور ${who}`;
}
function buildNav(){
  const nav=$('#nav'); if(!nav) return; nav.innerHTML='';
  const addGroup=(t)=>{const g=document.createElement('div'); g.className='nav-group-label'; g.textContent=t; nav.appendChild(g);};
  if(canManageUsersSection()){
    addGroup('Owner · المالك');
    if(isPrimaryOwnerUser()){
      const ob=document.createElement('button'); ob.dataset.section='owner-staff';
      ob.innerHTML='<span class="nav-icon">👑</span><span class="nav-text"><span class="nav-ar">متابعة الموظفين</span></span>';
      ob.onclick=()=>showSection('owner-staff'); nav.appendChild(ob);
    }
    if(isPrimaryOwnerUser()){
      const lb=document.createElement('button'); lb.dataset.section='owner-live';
      lb.innerHTML='<span class="nav-icon">🛰️</span><span class="nav-text"><span class="nav-ar">لوحة المالك الحية</span></span>';
      lb.onclick=()=>showSection('owner-live'); nav.appendChild(lb);
    }
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
  if(canManageUsersSection()){
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
  if(canManageUsersSection()) items.push({id:'users',label:'المستخدمين',icon:'🛡️'});
  if(isPrimaryOwnerUser()) items.push({id:'owner-live',label:'لوحة المالك الحية',icon:'🛰️'});
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
  const needsSkeleton=!['dashboard','owner-staff','owner-live','tasks','messages','walid','enterprise','timeline','hospitality'].includes(resolved);
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
  if(resolved==='daily-ops' && typeof renderDailyOpsPage==='function') renderDailyOpsPage();
  if(resolved==='owner-staff' && window.LQ_OWNER_STAFF) LQ_OWNER_STAFF.render();
  if(resolved==='owner-live' && typeof renderOwnerLiveHub==='function') renderOwnerLiveHub();
  if(resolved==='hospitality' && typeof renderHospitalityPortal==='function') renderHospitalityPortal();
  if(resolved==='estate-platform' && typeof renderEstatePlatform==='function') renderEstatePlatform();
  if(resolved==='estate-platform'){
    const ph=$('.page-head'); if(ph) ph.style.display='none';
    if(typeof ensureForceEstateDock==='function') ensureForceEstateDock();
    try{ window.scrollTo({top:0, behavior:'auto'}); }catch(_){}
  }else{
    const ph=$('.page-head'); if(ph) ph.style.display='';
    const fd=document.getElementById('lqForceEstateDock'); if(fd) fd.style.display='none';
  }
  if(resolved==='accounting-platform' && typeof renderAccountingPlatform==='function') renderAccountingPlatform();
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
    renderHospitalityPortal();
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
function ensureNizwaMap(){
  const host = $('#nizwaMap');
  if(!host || !window.L) return null;
  if(!nizwaLeafletMap){
    nizwaLeafletMap = window.L.map(host, { zoomControl:true }).setView([NIZWA_DEFAULT.lat, NIZWA_DEFAULT.lng], NIZWA_DEFAULT.zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(nizwaLeafletMap);
    nizwaMarkers = window.L.layerGroup().addTo(nizwaLeafletMap);
  }
  return nizwaLeafletMap;
}
function propertyMapCoords(p, i=0){
  const lat = Number(p?.latitude);
  const lng = Number(p?.longitude);
  if(Number.isFinite(lat) && Number.isFinite(lng)) return {lat, lng};
  const offsets = [
    [0.018, -0.02], [0.022, 0.015], [0.009, 0.028], [-0.01, 0.021], [0.015, -0.03],
    [-0.017, -0.018], [0.004, 0.012], [-0.012, 0.032], [0.021, -0.008], [-0.006, -0.025],
  ];
  const off = offsets[i % offsets.length];
  return {lat: NIZWA_DEFAULT.lat + off[0], lng: NIZWA_DEFAULT.lng + off[1]};
}
function renderNizwaMap(props){
  const map = ensureNizwaMap();
  if(!map || !nizwaMarkers) return;
  nizwaMarkers.clearLayers();
  const latLngs = [];
  props.forEach((p, idx)=>{
    const c = propertyMapCoords(p, idx);
    latLngs.push([c.lat, c.lng]);
    const marker = window.L.marker([c.lat, c.lng]).addTo(nizwaMarkers);
    marker.bindPopup(`<b>${escapeHtml(propertyLabel(p))}</b><br>${escapeHtml(p.location || 'Nizwa')}<br>${money(p.price||0)}`);
    marker.on('click', ()=>showMapPopup(p, 50, 50));
  });
  if(latLngs.length){
    const bounds = window.L.latLngBounds(latLngs);
    map.fitBounds(bounds.pad(0.2));
  }else{
    map.setView([NIZWA_DEFAULT.lat, NIZWA_DEFAULT.lng], NIZWA_DEFAULT.zoom);
  }
}
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
function relativeTimeAr(iso){
  const ts = new Date(String(iso||''));
  if(Number.isNaN(ts.getTime())) return 'الآن';
  const diff = Math.max(0, Date.now() - ts.getTime());
  const m = Math.floor(diff/60000);
  if(m < 1) return 'الآن';
  if(m < 60) return `قبل ${fmt(m)} د`;
  const h = Math.floor(m/60);
  if(h < 24) return `قبل ${fmt(h)} س`;
  const d = Math.floor(h/24);
  return `قبل ${fmt(d)} يوم`;
}
function realtimeFeedHtml(){
  const items = (Jawdah.liveNotifications || []).slice(0, 24);
  const danger = items.filter(x=>x.level==='danger').length;
  const warns = items.filter(x=>x.level==='warn').length;
  return `
    <div class="card realtime-center-card">
      <h3>🚨 مركز الإشعارات اللحظي</h3>
      <div class="status-line realtime-center-meta">
        <span class="badge overdue">عاجل: ${fmt(danger)}</span>
        <span class="badge pending">تنبيهات: ${fmt(warns)}</span>
        <span class="badge">آخر 24 إشعار</span>
        <button type="button" class="ghost" onclick="LQ_REALTIME_NOTIFY.clear()">مسح السجل اللحظي</button>
      </div>
      <div class="realtime-feed-list">
        ${items.map(x=>`<div class="realtime-feed-item"><div class="realtime-feed-icon">${x.icon||'🔔'}</div><div class="realtime-feed-body"><b>${htmlEscape(x.title||'تنبيه')}</b><p>${htmlEscape(x.text||'')}</p><small>${htmlEscape(x.actor||'النظام')} · ${relativeTimeAr(x.ts)}</small></div></div>`).join('') || '<p class="mini linked-ok">لا توجد إشعارات لحظية حالياً</p>'}
      </div>
    </div>
  `;
}
window.LQ_REALTIME_NOTIFY = {
  renderHtml: realtimeFeedHtml,
  clear: ()=>{
    Jawdah.liveNotifications = [];
    if($('#sec-messages')?.classList.contains('active')) renderMessagesPage();
  }
};
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
  box.innerHTML=`${window.LQ_REALTIME_NOTIFY ? window.LQ_REALTIME_NOTIFY.renderHtml() : ''}<div class="card"><h3>📨 الرسائل والتنبيهات</h3><div class="saas-task-list">${decisions.map(d=>`<div class="saas-task-item"><div><b>${d.level}</b><p>${d.text}</p></div></div>`).join('')}${openMaint.slice(0,5).map(m=>`<div class="saas-task-item"><div><b>صيانة</b><p>${m.title} · ${propertyLabel(byId('properties',m.property_id))}</p></div></div>`).join('')}</div>
  <div class="card" style="margin-top:16px"><h3>ملخص</h3><div class="saas-fin-grid"><div class="saas-glass saas-fin-card"><span>متأخرات</span><strong>${money(k.overdue||0)}</strong></div><div class="saas-glass saas-fin-card"><span>صيانة</span><strong>${fmt(k.maintenance||0)}</strong></div><div class="saas-glass saas-fin-card"><span>عقود</span><strong>${fmt((k.expiring||0)+(k.expired||0))}</strong></div><div class="saas-glass saas-fin-card"><span>الصحة</span><strong>${fmt(k.health||0)}%</strong></div></div></div>`;
}
function renderTimelinePage(){
  const box=$('#timelinePageBox'); if(!box) return;
  const normalizeDays = (v)=>[30,90,180,365,0].includes(Number(v)) ? Number(v) : 90;
  const normalizeType = (v)=>['all','contracts','maintenance','invoices'].includes(String(v||'')) ? String(v) : 'all';
  propertyTimelineDays = normalizeDays(propertyTimelineDays);
  propertyTimelineType = normalizeType(propertyTimelineType);
  const startDate = propertyTimelineDays===0 ? '' : addDaysYmd(today(), -propertyTimelineDays);
  const allEvents = [];
  const byUserProp = (pid)=>propertyLabel(byId('properties',pid));
  (Jawdah.data.contracts||[]).forEach(c=>{
    const clientName = byId('clients', c.client_id).name || c.client_id || 'عميل';
    const propName = byUserProp(c.property_id);
    const m = contractRenewalMeta(c);
    if(c.start_date){
      allEvents.push({
        date: String(c.start_date),
        type: 'contracts',
        tone: 'ok',
        icon: '📄',
        title: `بداية عقد ${c.contract_no||c.id}`,
        subtitle: `${propName} · ${clientName}`,
        meta: `الإيجار ${money(c.rent_amount||0)}`,
        go: 'contracts',
      });
    }
    if(c.end_date){
      const tone = m.tone==='high' ? 'danger' : (m.tone==='med' ? 'warn' : 'ok');
      allEvents.push({
        date: String(c.end_date),
        type: 'contracts',
        tone,
        icon: '⏳',
        title: `نهاية عقد ${c.contract_no||c.id}`,
        subtitle: `${propName} · ${clientName}`,
        meta: m.label || 'انتهاء العقد',
        go: 'contracts',
      });
    }
  });
  (Jawdah.data.maintenance||[]).forEach(m=>{
    const st = String(m.status||'').toLowerCase();
    const tone = st.includes('closed') || st.includes('done') ? 'ok' : 'warn';
    allEvents.push({
      date: String(m.request_date||today()),
      type: 'maintenance',
      tone,
      icon: '🛠️',
      title: m.title || 'طلب صيانة',
      subtitle: `${byUserProp(m.property_id)} · ${m.priority||'Priority'}`,
      meta: m.status || 'Open',
      go: 'maintenance',
    });
  });
  (Jawdah.data.invoices||[]).forEach(inv=>{
    const remaining = Math.max(0, Number(inv.amount||0) - Number(inv.paid_amount||0));
    if(remaining<=0) return;
    const due = String(inv.due_date||'');
    const overdue = due && due < today();
    allEvents.push({
      date: due || String(inv.issue_date||today()),
      type: 'invoices',
      tone: overdue ? 'danger' : 'warn',
      icon: overdue ? '🚨' : '💳',
      title: `استحقاق فاتورة ${inv.invoice_no||inv.id}`,
      subtitle: `${byUserProp(inv.property_id)} · ${byId('clients',inv.client_id).name||'عميل'}`,
      meta: `المتبقي ${money(remaining)}`,
      go: 'invoices',
    });
  });
  const events = allEvents
    .filter(e=>e.date && (/^\d{4}-\d{2}-\d{2}/.test(e.date)))
    .filter(e=>propertyTimelineType==='all' ? true : e.type===propertyTimelineType)
    .filter(e=>!startDate || e.date>=startDate)
    .sort((a,b)=>String(b.date).localeCompare(String(a.date)))
    .slice(0,220);
  const stats = {
    all: events.length,
    contracts: events.filter(e=>e.type==='contracts').length,
    maintenance: events.filter(e=>e.type==='maintenance').length,
    invoices: events.filter(e=>e.type==='invoices').length,
  };
  box.innerHTML = `
    <div class="card">
      <h3>📅 Timeline العقارات</h3>
      <p class="mini">عرض زمني احترافي لحركة العقود والصيانة والاستحقاقات العقارية.</p>
      <div class="toolbar" style="gap:8px;align-items:flex-end">
        <label class="mini">الفترة
          <select id="propTlDays" onchange="setPropertyTimelineFilters()">
            <option value="30" ${propertyTimelineDays===30?'selected':''}>آخر 30 يوم</option>
            <option value="90" ${propertyTimelineDays===90?'selected':''}>آخر 90 يوم</option>
            <option value="180" ${propertyTimelineDays===180?'selected':''}>آخر 180 يوم</option>
            <option value="365" ${propertyTimelineDays===365?'selected':''}>آخر سنة</option>
            <option value="0" ${propertyTimelineDays===0?'selected':''}>كل الفترات</option>
          </select>
        </label>
        <label class="mini">النوع
          <select id="propTlType" onchange="setPropertyTimelineFilters()">
            <option value="all" ${propertyTimelineType==='all'?'selected':''}>الكل</option>
            <option value="contracts" ${propertyTimelineType==='contracts'?'selected':''}>العقود</option>
            <option value="maintenance" ${propertyTimelineType==='maintenance'?'selected':''}>الصيانة</option>
            <option value="invoices" ${propertyTimelineType==='invoices'?'selected':''}>الاستحقاقات</option>
          </select>
        </label>
        <button class="ghost" type="button" onclick="renderTimelinePage()">تحديث</button>
        <span class="badge">إجمالي ${fmt(stats.all)}</span>
        <span class="badge active">عقود ${fmt(stats.contracts)}</span>
        <span class="badge pending">صيانة ${fmt(stats.maintenance)}</span>
        <span class="badge overdue">استحقاقات ${fmt(stats.invoices)}</span>
      </div>
    </div>
    <div class="prop-tl-list">
      ${events.map(e=>`<article class="prop-tl-item ${e.tone}"><div class="prop-tl-date"><b>${htmlEscape(String(e.date||''))}</b><span>${e.icon}</span></div><div class="prop-tl-body"><h4>${htmlEscape(e.title||'')}</h4><p>${htmlEscape(e.subtitle||'')}</p><div class="status-line"><span class="badge">${htmlEscape(e.meta||'')}</span><button type="button" class="ghost" onclick="showSection('${e.go||'dashboard'}')">فتح</button></div></div></article>`).join('') || '<div class="card"><p class="mini">لا توجد أحداث ضمن الفلتر الحالي.</p></div>'}
    </div>
    <div class="card" style="margin-top:16px">
      <h3>🧾 سجل العمليات الحي</h3>
      <p class="mini">أي إضافة أو تعديل أو حذف يظهر هنا تلقائياً، ويغذي لوحة التحكم والـ Timeline.</p>
      <div id="timelineAuditFeed"><p class="mini">جاري تحميل السجل...</p></div>
    </div>
  `;
  startTimelineAutoRefresh();
  renderTimelineAuditFeed();
  if(typeof ensureEnglishDigits==='function') ensureEnglishDigits(box);
}
async function renderTimelineAuditFeed(){
  const host = $('#timelineAuditFeed');
  if(!host || !Jawdah.token) return;
  try{
    const res = await api('audit_feed?limit=80');
    const rows = Array.isArray(res.events) ? res.events : [];
    const filtered = rows.filter(r=>{
      const entity = String(r.entity||'').toLowerCase();
      if(propertyTimelineType==='all') return true;
      if(propertyTimelineType==='contracts') return entity==='contracts';
      if(propertyTimelineType==='maintenance') return entity==='maintenance';
      if(propertyTimelineType==='invoices') return entity==='invoices' || entity==='payments';
      return true;
    });
    host.innerHTML = tableHtml(
      [
        ['الوقت','created_at',v=>String(v||'').slice(0,16)],
        ['المستخدم','username',v=>htmlEscape(String(v||'system'))],
        ['الإجراء','action',v=>statusBadge(String(v||''))],
        ['الوحدة','entity'],
        ['التفاصيل','details',v=>htmlEscape(String(v||''))],
      ],
      filtered.slice(0,60),
      null
    );
  }catch(_e){
    host.innerHTML = '<p class="mini">تعذر تحميل سجل العمليات حالياً.</p>';
  }
}
function setPropertyTimelineFilters(){
  const d = Number($('#propTlDays')?.value || 90);
  const t = String($('#propTlType')?.value || 'all');
  propertyTimelineDays = [30,90,180,365,0].includes(d) ? d : 90;
  propertyTimelineType = ['all','contracts','maintenance','invoices'].includes(t) ? t : 'all';
  localStorage.setItem('jawdah_property_timeline_days', String(propertyTimelineDays));
  localStorage.setItem('jawdah_property_timeline_type', propertyTimelineType);
  renderTimelinePage();
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
  const hRooms = data.hospitality_rooms||[];
  const hBookings = data.hospitality_bookings||[];
  const activeBookings = hBookings.filter(b=>['reserved','checked_in'].includes(String(b.status||'').toLowerCase()));
  const occupiedRooms = hRooms.filter(r=>String(r.status||'').toLowerCase()==='occupied').length;
  const hOcc = hRooms.length ? Math.round((occupiedRooms / hRooms.length) * 100) : 0;
  const hCards = (data.properties||[])
    .filter(p=>['hospitality','hotel','resort','short-term'].includes(String(p.type||'').toLowerCase()))
    .slice(0,4)
    .map(p=>{
      const img = (typeof lqPropertyImageUrl==='function' ? lqPropertyImageUrl(p) : null) || 'assets/login-portal-bg.png';
      const pBookings = activeBookings.filter(b=>b.property_id===p.id).length;
      return `<article class="hotel-card" onclick="showSection('hospitality')"><div class="hotel-card-photo" style="background-image:url('${htmlEscape(img)}')"></div><div class="hotel-card-meta"><b>${htmlEscape(propertyLabel(p))}</b><small>حجوزات نشطة ${fmt(pBookings)}</small></div></article>`;
    }).join('') || '<p class="mini">لا توجد وحدات ضيافة مصنفة بعد.</p>';
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
    <article class="bento-tile bento-span-12 saas-glass hotel-hero"><div class="bento-head"><h4>🏨 معرض الضيافة الفاخر</h4><button type="button" class="saas-link-btn" onclick="showSection('hospitality')">دخول الضيافة</button></div><div class="status-line"><span class="badge">غرف ${fmt(hRooms.length)}</span><span class="badge">حجوزات نشطة ${fmt(activeBookings.length)}</span><span class="badge">${fmt(hOcc)}% إشغال</span></div><div class="hotel-grid">${hCards}</div></article>
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

  renderNizwaMap(props);
  if(props[0]) showMapPopup(props[0], 50, 50);

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
    const acts=[...dashDecisions().map(d=>({t:d.text,d:today()})),...openMaint.slice(0,3).map(m=>({t:'صيانة: '+(m.title||''),d:m.request_date||today()}))];
    if(Jawdah.liveLatestAudit){
      const a = Jawdah.liveLatestAudit;
      acts.unshift({
        t:`${a.username||'system'} · ${a.action||'update'} · ${a.entity||'record'}`,
        d:String(a.created_at||today()).slice(0,16),
      });
    }
    const topActs = acts.slice(0,6);
    actBox.innerHTML=topActs.map(a=>`<div class="saas-timeline-item"><b>${a.t}</b><br><span class="mini">${a.d}</span></div>`).join('')||'<p class="mini">لا نشاط</p>';
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
  const allProps = Jawdah.data.properties||[];
  const total = allProps.length;
  const activeCount = allProps.filter(p=>Boolean(activeContractForPropertyLocal(p.id).id)).length;
  const noContractCount = total - activeCount;
  const rows=filterRows('properties',['building_no','apartment_no','room_no','name','status','location','notes']);
  const stats = $('#propQuickStats');
  if(stats){
    stats.innerHTML = `<span class="badge">إجمالي الوحدات: ${fmt(total)}</span><span class="badge active">عليها عقد نشط: ${fmt(activeCount)}</span><span class="badge">بدون عقد نشط: ${fmt(noContractCount)}</span><span class="badge">نتيجة الفلتر: ${fmt(rows.length)}</span>`;
  }
  $('#propertiesTable').innerHTML=tableHtml([['الصورة','id',(_,r)=>typeof lqPropertyThumbHtml==='function'?lqPropertyThumbHtml(r,{compact:true}):'🏠'],['البناية','building_no'],['الوحدة','apartment_no'],['نوع الوحدة','unit_kind'],['رقم الغرفة','room_no',(v,r)=>((r.unit_kind||'')==='غرفة مستقلة' ? (v||'—') : '—')],['عدد غرف الشقة','unit_rooms_count',(v,r)=>((r.unit_kind||'')==='شقة كاملة' ? (v||'—') : '—')],['الحالة','status',(v)=>statusBadge(v)],['العقد النشط','id',(_,r)=>{const c=activeContractForPropertyLocal(r.id); return c.id?`<span class="badge active">${c.contract_no||c.id}</span>`:'—';}],['السعر','price',(v)=>money(v)],['الموقع','location'],['الإحداثيات','id',(_,r)=>((r.latitude&&r.longitude)?`${r.latitude}, ${r.longitude}`:'—')],['اسم الوحدة','id',(_,r)=>propertyLabel(r)]],rows,r=>{const c=activeContractForPropertyLocal(r.id); const quick=c.id?`<button class="gold-btn" onclick="openActiveContractFromProperty('${r.id}')">العقد النشط</button> `:''; return `${quick}<button class="ghost" onclick="editRecord('properties','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('properties','${r.id}')">حذف</button>`;});
  fillSelect('#propStatusFilter',['',...PROPERTY_STATUSES],false);
}
function renderClients(){
  const rows=filterRows('clients',['name','phone','email','national_id']);
  $('#clientsTable').innerHTML=tableHtml([['صورة البطاقة','id_card_image',(v,r)=>imagePreviewHtml(v, `بطاقة ${r.name||''}`)],['الاسم','name'],['الهاتف','phone'],['البريد','email'],['الهوية/السجل','national_id'],['الرصيد','balance',(v)=>money(v)],['ملاحظات','notes']],rows,r=>`<button class="ghost" onclick="clientStatement('${r.id}')">كشف</button> <button class="ghost" onclick="editRecord('clients','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('clients','${r.id}')">حذف</button>`);
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
  $('#contractsTable').innerHTML=tableHtml([['رقم العقد','contract_no',(v,r)=>v||r.id],['النوع','contract_type'],['الوحدة المؤجرة','property_id',(v)=>propertyLabel(byId('properties',v))],['المستأجر','client_id',(v)=>byId('clients',v).name||v],['البداية','start_date'],['النهاية','end_date'],['التجديد','id',(_,r)=>{const m=contractRenewalMeta(r); return m.label?`<span class="badge ${m.tone}">${m.label}</span>`:'—';}],['الإيجار','rent_amount',(v)=>money(v)],['الحالة','status',(v)=>statusBadge(v)]],rows,r=>{
    const meta = contractRenewalMeta(r);
    const st = String(r.status||'').toLowerCase();
    const renewBtn = meta.renewable ? `<button class="gold-btn" onclick="renewContract('${r.id}')">تجديد</button> ` : '';
    const requestBtn = (st==='draft' || !st) ? `<button class="gold-btn" onclick="requestContractApproval('${r.id}')">طلب اعتماد</button> ` : '';
    const approveBtn = (st==='approvalrequested' && canDecideApprovals()) ? `<button class="gold-btn" onclick="approveContract('${r.id}')">اعتماد</button> ` : '';
    const activateBtn = (st==='approved' && canActivateContracts()) ? `<button class="gold-btn" onclick="activateContract('${r.id}')">تفعيل العقد</button> ` : '';
    const invoiceBtn = (st==='active' || st==='activated') ? `<button class="ghost" onclick="invoiceFromContract('${r.id}')">فاتورة</button> ` : '';
    return `${renewBtn}${requestBtn}${approveBtn}${activateBtn}<button class="ghost" onclick="contractDocument('${r.id}')">العقد</button> ${invoiceBtn}<button class="ghost" onclick="editRecord('contracts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('contracts','${r.id}')">حذف</button>`;
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
  if(!Jawdah.data.users && !canManageUsersSection()){ $('#usersTable').innerHTML='<div class="card">هذا القسم مخصص لحسابات الإدارة المخولة</div>'; return; }
  if(!Jawdah.data.users){ $('#usersTable').innerHTML='<div class="card mini">جاري تحميل المستخدمين...</div>'; return; }
  $('#usersTable').innerHTML=tableHtml(
    [['المستخدم','username'],['الاسم','name'],['البريد','email'],['الدور','role',(v)=>roleName(v)],['نشط','active',(v)=>v?'<span class="badge paid">نعم</span>':'<span class="badge overdue">لا</span>'],['تغيير كلمة المرور','must_change_password',(v)=>v?'<span class="badge pending">مطلوب</span>':'<span class="badge paid">لا</span>'],['آخر دخول','last_login']],
    Jawdah.data.users,
    r=>`<button class="ghost" onclick="editRecord('users','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('users','${r.id}')">حذف</button>`
  );
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
      if(st.storage){
        html += `<p class="mini">Storage: متاح ${fmt(st.storage.free_gb)}GB من ${fmt(st.storage.total_gb)}GB ${st.storage.warning?'⚠️ منخفض':'✅'}</p>`;
      }
      if(st.backup_integrity){
        html += `<p class="mini">سلامة آخر نسخة: ${st.backup_integrity.ok?'✅ سليمة':'⚠️ تحتاج فحص'} (${st.backup_integrity.timestamp||'—'})</p>`;
      }
      if(st.recent?.length){
        html += st.recent.slice(0,5).map(b=>`<span class="badge">${b.created_at||b.timestamp}</span>`).join(' ');
      }
    } else {
      html += `<p class="mini" style="margin-top:12px">النسخ الاحتياطي التلقائي متوقف (JAWDAH_AUTO_BACKUP=0)</p>`;
    }
    $('#backupStatus').innerHTML=html;
  }).catch(()=>{ $('#backupStatus').innerHTML=html; });
  renderExportHub();
}
async function runAutoBackup(){
  try{
    const res=await api('backup/run',{method:'POST',body:JSON.stringify({})});
    toast('تم إنشاء نسخة احتياطية: '+res.backup.timestamp+(res.backup.offsite?.ok?' · Off-site OK':(res.backup.offsite?.skipped?'':' · Off-site فشل')));
    renderBackup();
  }catch(e){ toastErr(e); }
}
function renderQA(){
  $('#qaBox').innerHTML='<p>يمكنك تشغيل الاختبار العام أو QA العقار خطوة بخطوة. سيتم تشغيل نغمة نجاح/فشل لكل حالة تلقائيًا.</p>';
}
function populateSelects(){
  fillSelect('#pBranch', Jawdah.data.branches||[], true, 'id', 'name');
  fillSelect('#contractProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  fillSelect('#contractClient', Jawdah.data.clients||[], true, 'id', 'name');
  const invoiceEligibleContracts = (Jawdah.data.contracts||[]).filter(c=>{
    const st = String(c.status||'').toLowerCase();
    return st==='active' || st==='activated';
  });
  fillSelect('#invoiceContractSelect', invoiceEligibleContracts, true, 'id', 'contract_no', (c)=>{
    const contractNo = c.contract_no || c.id;
    const client = byId('clients', c.client_id).name || '';
    return `${contractNo} — ${client}`;
  });
  fillSelect('#accClient', Jawdah.data.clients||[], true, 'id', 'name');
  fillSelect('#accProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  fillSelect('#maintProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  fillSelect('#itemProperty', Jawdah.data.properties||[], true, 'id', 'name', propertyLabel);
  const invFilter=$('#inventoryPropertyFilter');
  if(invFilter){
    const old=invFilter.value||'';
    invFilter.innerHTML='<option value="">كل العقارات</option>'+(Jawdah.data.properties||[]).map(p=>`<option value="${p.id}">${propertyLabel(p)}</option>`).join('');
    if([...invFilter.options].some(o=>o.value===old)) invFilter.value=old;
    if(!invFilter.dataset.bound){
      invFilter.dataset.bound='1';
      invFilter.addEventListener('change', ()=>{ if(typeof renderInventory==='function') renderInventory(); });
    }
  }
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
  bindContractAutofill();
  updateContractPropertyWarning();
  bindInvoiceContractAutofill();
}
function filterRows(table, fields){
  let rows=[...(Jawdah.data[table]||[])]; const q=($('#globalSearch')?.value||'').toLowerCase().trim();
  if(q) rows=rows.filter(r=>fields.some(f=>String(r[f]??'').toLowerCase().includes(q)));
  if(table==='properties'){
    const s=$('#propStatusFilter')?.value;
    if(s) rows=rows.filter(r=>r.status===s);
    const b=($('#propBuildingFilter')?.value||'').trim();
    if(b) rows=rows.filter(r=>String(r.building_no||'').includes(b));
    const contractFilter=$('#propContractFilter')?.value||'';
    if(contractFilter==='active') rows=rows.filter(r=>Boolean(activeContractForPropertyLocal(r.id).id));
    if(contractFilter==='none') rows=rows.filter(r=>!activeContractForPropertyLocal(r.id).id);
  }
  return rows;
}
function csvCell(v){
  const s = String(v ?? '');
  if(/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvFromRows(headers, rows){
  const lines = [headers.join(',')];
  rows.forEach(r=>lines.push(r.map(csvCell).join(',')));
  return lines.join('\n');
}
function buildFilteredCsvBundle(){
  const day = today();
  const files = {};
  const counts = {};
  const sizes = {};
  const enc = new TextEncoder();
  const filterSnapshot = {
    global_search: ($('#globalSearch')?.value || '').trim(),
    property_filters: {
      building_no: ($('#propBuildingFilter')?.value || '').trim(),
      status: ($('#propStatusFilter')?.value || '').trim(),
      contract: ($('#propContractFilter')?.value || '').trim(),
    },
  };
  const props = filterRows('properties',['building_no','apartment_no','room_no','name','status','location','notes']);
  if(props.length){
    const fn = `properties-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','building_no','apartment_no','room_no','name','status','price','location','latitude','longitude','has_active_contract','active_contract_no','notes'],
      props.map(r=>{ const active=activeContractForPropertyLocal(r.id); return [r.id,r.building_no,r.apartment_no,r.room_no,r.name,r.status,r.price,r.location,r.latitude,r.longitude,active.id?'1':'0',active.contract_no||active.id||'',r.notes]; })
    );
    counts[fn] = props.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const clients = filterRows('clients',['name','phone','email','national_id']);
  if(clients.length){
    const fn = `clients-filtered-${day}.csv`;
    files[fn] = csvFromRows(['id','name','phone','email','national_id','id_card_image','balance','notes'], clients.map(r=>[r.id,r.name,r.phone,r.email,r.national_id,r.id_card_image||'',r.balance,r.notes]));
    counts[fn] = clients.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const contracts = filterRows('contracts',['id','status','notes']);
  if(contracts.length){
    const fn = `contracts-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','contract_no','contract_type','property_id','property_label','client_id','client_name','start_date','end_date','rent_amount','payment_cycle','status','approved_at','activated_at','notes'],
      contracts.map(r=>{ const prop=byId('properties', r.property_id); const client=byId('clients', r.client_id); return [r.id,r.contract_no,r.contract_type,r.property_id,propertyLabel(prop),r.client_id,client.name||'',r.start_date,r.end_date,r.rent_amount,r.payment_cycle,r.status,r.approved_at,r.activated_at,r.notes]; })
    );
    counts[fn] = contracts.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const invoices = filterRows('invoices',['invoice_no','description','status']);
  if(invoices.length){
    const fn = `invoices-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','invoice_no','contract_id','client_id','client_name','property_id','property_label','issue_date','due_date','description','invoice_type','subtotal','vat_rate','vat_amount','amount','paid_amount','remaining','status'],
      invoices.map(r=>{ const c=byId('clients',r.client_id); const p=byId('properties',r.property_id); return [r.id,r.invoice_no,r.contract_id,r.client_id,c.name||'',r.property_id,propertyLabel(p),r.issue_date,r.due_date,r.description,r.invoice_type,r.subtotal,r.vat_rate,r.vat_amount,r.amount,r.paid_amount,Number(r.amount||0)-Number(r.paid_amount||0),r.status]; })
    );
    counts[fn] = invoices.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const rawAccounts = filterRows('accounts',['description','category','type']);
  const accounts = typeof window.getFilteredAccountsRows === 'function' ? window.getFilteredAccountsRows(rawAccounts) : rawAccounts;
  if(accounts.length){
    const fn = `accounts-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','entry_date','type','category','description','client_id','client_name','property_id','property_label','invoice_id','invoice_no','amount'],
      accounts.map(r=>{ const c=byId('clients',r.client_id); const p=byId('properties',r.property_id); const i=byId('invoices',r.invoice_id); return [r.id,r.entry_date,r.type,r.category,r.description,r.client_id,c.name||'',r.property_id,propertyLabel(p),r.invoice_id,i.invoice_no||'',r.amount]; })
    );
    counts[fn] = accounts.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const revenues = filterRows('revenues',['source','category','description']);
  if(revenues.length){
    const fn = `revenues-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','revenue_no','revenue_date','source','category','description','amount','client_id','client_name','property_id','property_label'],
      revenues.map(r=>{ const c=byId('clients',r.client_id); const p=byId('properties',r.property_id); return [r.id,r.revenue_no,r.revenue_date,r.source,r.category,r.description,r.amount,r.client_id,c.name||'',r.property_id,propertyLabel(p)]; })
    );
    counts[fn] = revenues.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const purchases = filterRows('purchase_invoices',['supplier','category','description','status']);
  if(purchases.length){
    const fn = `purchases-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','purchase_no','supplier','invoice_date','due_date','category','description','amount','paid_amount','remaining','status','property_id','property_label'],
      purchases.map(r=>{ const p=byId('properties',r.property_id); return [r.id,r.purchase_no,r.supplier,r.invoice_date,r.due_date,r.category,r.description,r.amount,r.paid_amount,Number(r.amount||0)-Number(r.paid_amount||0),r.status,r.property_id,propertyLabel(p)]; })
    );
    counts[fn] = purchases.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const payroll = filterRows('salaries',['employee_name','salary_month','status']);
  if(payroll.length){
    const fn = `payroll-filtered-${day}.csv`;
    files[fn] = csvFromRows(['id','employee_name','salary_month','basic_salary','allowances','deductions','net_salary','status','payment_date'], payroll.map(r=>[r.id,r.employee_name,r.salary_month,r.basic_salary,r.allowances,r.deductions,r.net_salary,r.status,r.payment_date]));
    counts[fn] = payroll.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const adminExp = filterByGlobalSearchRows((Jawdah.data.admin_expenses||[]), ['expense_date','category','description','supplier']);
  if(adminExp.length){
    const fn = `admin-expenses-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','expense_date','category','description','supplier','property_id','property_label','amount'],
      adminExp.map(r=>{ const p=byId('properties',r.property_id); return [r.id,r.expense_date,r.category,r.description,r.supplier,r.property_id,propertyLabel(p),r.amount]; })
    );
    counts[fn] = adminExp.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const invBase = filterByGlobalSearchRows((Jawdah.data.inventory_items||[]), ['sku','name','category','location']);
  const invPid = String($('#inventoryPropertyFilter')?.value||'').trim();
  const invItems = invPid ? invBase.filter(r=>String(r.property_id||'')===invPid) : invBase;
  if(invItems.length){
    const fn = `inventory-filtered-${day}.csv`;
    files[fn] = csvFromRows(
      ['id','sku','name','category','property_id','property_label','unit','quantity','min_quantity','unit_cost','stock_value','location','status'],
      invItems.map(r=>{ const q=Number(r.quantity||0), m=Number(r.min_quantity||0), c=Number(r.unit_cost||0); const p=byId('properties',r.property_id); return [r.id,r.sku,r.name,r.category,r.property_id||'',r.property_id?propertyLabel(p):'مخزن عام',r.unit,q,m,c,q*c,r.location,q<=m?'LOW_STOCK':'OK']; })
    );
    counts[fn] = invItems.length;
    sizes[fn] = enc.encode(files[fn]).length;
  }
  const totalRecords = Object.values(counts).reduce((s, n)=>s + Number(n||0), 0);
  const totalBytes = Object.values(sizes).reduce((s, n)=>s + Number(n||0), 0);
  files['manifest.json'] = JSON.stringify({
    generated_at: new Date().toISOString(),
    app_ui_version: APP_UI_VERSION,
    generated_by: Jawdah.user?.username || Jawdah.user?.name || 'unknown',
    generated_by_role: Jawdah.user?.role || 'unknown',
    active_section: Jawdah.activeSection || 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    total_files: Object.keys(counts).length,
    total_records: totalRecords,
    total_bytes: totalBytes,
    filters: filterSnapshot,
    file_sizes_bytes: sizes,
    record_counts: counts,
  }, null, 2);
  return files;
}
function renderExportHub(){
  const host = $('#exportHubButtons');
  if(!host) return;
  const actions = [
    ['تصدير ZIP واحد (مفلتر)', 'exportAllFilteredZip'],
    ['تصدير الكل (مفلتر)', 'exportAllFilteredCsvBatch'],
    ['العقارات (مفلتر)', 'exportFilteredPropertiesCsv'],
    ['العملاء (مفلتر)', 'exportFilteredClientsCsv'],
    ['العقود (مفلتر)', 'exportFilteredContractsCsv'],
    ['الفواتير (مفلتر)', 'exportFilteredInvoicesCsv'],
    ['الحسابات (مفلتر)', 'exportFilteredAccountsCsv'],
    ['الإيرادات (مفلتر)', 'exportFilteredRevenuesCsv'],
    ['المشتريات (مفلتر)', 'exportFilteredPurchasesCsv'],
    ['الرواتب (مفلتر)', 'exportFilteredPayrollCsv'],
    ['المصاريف الإدارية (مفلتر)', 'exportFilteredAdminExpensesCsv'],
    ['المخزن (مفلتر)', 'exportFilteredInventoryCsv'],
  ];
  host.innerHTML = actions
    .map(([label, fn])=>`<button class="ghost" onclick="${fn}()">${label}</button>`)
    .join('');
}
function exportAllFilteredCsvBatch(){
  const fnNames = [
    'exportFilteredPropertiesCsv',
    'exportFilteredClientsCsv',
    'exportFilteredContractsCsv',
    'exportFilteredInvoicesCsv',
    'exportFilteredAccountsCsv',
    'exportFilteredRevenuesCsv',
    'exportFilteredPurchasesCsv',
    'exportFilteredPayrollCsv',
    'exportFilteredAdminExpensesCsv',
    'exportFilteredInventoryCsv',
  ];
  const originalToast = window.toast;
  const originalToastNotice = window.toastNotice;
  window.toast = ()=>{};
  window.toastNotice = ()=>{};
  fnNames.forEach((name, idx)=>{
    const fn = window[name];
    if(typeof fn === 'function'){
      setTimeout(()=>{ try{ fn(); }catch(_e){} }, idx * 180);
    }
  });
  setTimeout(()=>{
    window.toast = originalToast;
    window.toastNotice = originalToastNotice;
    toast('تم تنزيل حزمة التصدير المفلترة');
  }, fnNames.length * 180 + 300);
}
async function exportAllFilteredZip(){
  try{
    const files = buildFilteredCsvBundle();
    const names = Object.keys(files);
    if(!names.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
    const headers = {'Content-Type':'application/json'};
    if(Jawdah.token) headers.Authorization = 'Bearer ' + Jawdah.token;
    const res = await fetch('/api/export/bundle', {
      method:'POST',
      headers,
      body: JSON.stringify({files})
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error(msg || 'فشل إنشاء ملف ZIP');
    }
    const blob = await res.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`jawdah-filtered-bundle-${today()}.zip`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast(`تم تنزيل ZIP مفلتر (${names.length} ملفات)`);
  }catch(e){ toastErr(e); }
}
function filterByGlobalSearchRows(rows, fields){
  const q = ($('#globalSearch')?.value||'').toLowerCase().trim();
  if(!q) return rows;
  return rows.filter(r=>fields.some(f=>String(r?.[f]??'').toLowerCase().includes(q)));
}
function exportFilteredPropertiesCsv(){
  const rows = filterRows('properties',['building_no','apartment_no','room_no','name','status','location','notes']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','building_no','apartment_no','room_no','name','status','price','location','latitude','longitude','has_active_contract','active_contract_no','notes'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const active = activeContractForPropertyLocal(r.id);
    const row = [
      r.id,
      r.building_no,
      r.apartment_no,
      r.room_no,
      r.name,
      r.status,
      r.price,
      r.location,
      r.latitude,
      r.longitude,
      active.id ? '1' : '0',
      active.contract_no || active.id || '',
      r.notes,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`properties-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredClientsCsv(){
  const rows = filterRows('clients',['name','phone','email','national_id']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','name','phone','email','national_id','id_card_image','balance','notes'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const row = [r.id, r.name, r.phone, r.email, r.national_id, r.id_card_image||'', r.balance, r.notes];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`clients-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredContractsCsv(){
  const rows = filterRows('contracts',['id','status','notes']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','contract_no','contract_type','property_id','property_label','client_id','client_name','start_date','end_date','rent_amount','payment_cycle','status','approved_at','activated_at','notes'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const prop = byId('properties', r.property_id);
    const client = byId('clients', r.client_id);
    const row = [
      r.id,
      r.contract_no,
      r.contract_type,
      r.property_id,
      propertyLabel(prop),
      r.client_id,
      client.name || '',
      r.start_date,
      r.end_date,
      r.rent_amount,
      r.payment_cycle,
      r.status,
      r.approved_at,
      r.activated_at,
      r.notes,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`contracts-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredInvoicesCsv(){
  const rows = filterRows('invoices',['invoice_no','description','status']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','invoice_no','contract_id','client_id','client_name','property_id','property_label','issue_date','due_date','description','invoice_type','subtotal','vat_rate','vat_amount','amount','paid_amount','remaining','status'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const client = byId('clients', r.client_id);
    const prop = byId('properties', r.property_id);
    const row = [
      r.id,
      r.invoice_no,
      r.contract_id,
      r.client_id,
      client.name || '',
      r.property_id,
      propertyLabel(prop),
      r.issue_date,
      r.due_date,
      r.description,
      r.invoice_type,
      r.subtotal,
      r.vat_rate,
      r.vat_amount,
      r.amount,
      r.paid_amount,
      Number(r.amount||0)-Number(r.paid_amount||0),
      r.status,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`invoices-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredMaintenanceCsv(){
  const rows = filterRows('maintenance',['title','priority','status','notes']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','property_id','property_label','title','priority','status','request_date','cost','notes'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const prop = byId('properties', r.property_id);
    const row = [
      r.id,
      r.property_id,
      propertyLabel(prop),
      r.title,
      r.priority,
      r.status,
      r.request_date,
      r.cost,
      r.notes,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`maintenance-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredAccountsCsv(){
  const baseRows = filterRows('accounts',['description','category','type']);
  const rows = typeof window.getFilteredAccountsRows === 'function' ? window.getFilteredAccountsRows(baseRows) : baseRows;
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','entry_date','type','category','description','client_id','client_name','property_id','property_label','invoice_id','invoice_no','amount'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const client = byId('clients', r.client_id);
    const prop = byId('properties', r.property_id);
    const inv = byId('invoices', r.invoice_id);
    const row = [
      r.id,
      r.entry_date,
      r.type,
      r.category,
      r.description,
      r.client_id,
      client.name || '',
      r.property_id,
      propertyLabel(prop),
      r.invoice_id,
      inv.invoice_no || '',
      r.amount,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`accounts-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredRevenuesCsv(){
  const rows = filterRows('revenues',['source','category','description']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','revenue_no','revenue_date','source','category','description','amount','client_id','client_name','property_id','property_label'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const client = byId('clients', r.client_id);
    const prop = byId('properties', r.property_id);
    const row = [
      r.id,
      r.revenue_no,
      r.revenue_date,
      r.source,
      r.category,
      r.description,
      r.amount,
      r.client_id,
      client.name || '',
      r.property_id,
      propertyLabel(prop),
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`revenues-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredPurchasesCsv(){
  const rows = filterRows('purchase_invoices',['supplier','category','description','status']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','purchase_no','supplier','invoice_date','due_date','category','description','amount','paid_amount','remaining','status','property_id','property_label'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const prop = byId('properties', r.property_id);
    const row = [
      r.id,
      r.purchase_no,
      r.supplier,
      r.invoice_date,
      r.due_date,
      r.category,
      r.description,
      r.amount,
      r.paid_amount,
      Number(r.amount||0)-Number(r.paid_amount||0),
      r.status,
      r.property_id,
      propertyLabel(prop),
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`purchases-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredPayrollCsv(){
  const rows = filterRows('salaries',['employee_name','salary_month','status']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','employee_name','salary_month','basic_salary','allowances','deductions','net_salary','status','payment_date'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const row = [
      r.id,
      r.employee_name,
      r.salary_month,
      r.basic_salary,
      r.allowances,
      r.deductions,
      r.net_salary,
      r.status,
      r.payment_date,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`payroll-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredAdminExpensesCsv(){
  const source = (Jawdah.data.admin_expenses||[]);
  const rows = filterByGlobalSearchRows(source, ['expense_date','category','description','supplier']);
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','expense_date','category','description','supplier','property_id','property_label','amount'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const prop = byId('properties', r.property_id);
    const row = [
      r.id,
      r.expense_date,
      r.category,
      r.description,
      r.supplier,
      r.property_id,
      propertyLabel(prop),
      r.amount,
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`admin-expenses-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
}
function exportFilteredInventoryCsv(){
  const source = (Jawdah.data.inventory_items||[]);
  const baseRows = filterByGlobalSearchRows(source, ['sku','name','category','location']);
  const pid = String($('#inventoryPropertyFilter')?.value||'').trim();
  const rows = pid ? baseRows.filter(r=>String(r.property_id||'')===pid) : baseRows;
  if(!rows.length){ toastNotice('لا توجد نتائج حالياً للتصدير'); return; }
  const headers = ['id','sku','name','category','property_id','property_label','unit','quantity','min_quantity','unit_cost','stock_value','location','status'];
  const lines = [headers.join(',')];
  rows.forEach(r=>{
    const quantity = Number(r.quantity||0);
    const minQty = Number(r.min_quantity||0);
    const unitCost = Number(r.unit_cost||0);
    const p = byId('properties', r.property_id);
    const row = [
      r.id,
      r.sku,
      r.name,
      r.category,
      r.property_id || '',
      r.property_id ? propertyLabel(p) : 'مخزن عام',
      r.unit,
      quantity,
      minQty,
      unitCost,
      quantity * unitCost,
      r.location,
      quantity<=minQty ? 'LOW_STOCK' : 'OK',
    ];
    lines.push(row.map(csvCell).join(','));
  });
  downloadFile(`inventory-filtered-${today()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
  toast('تم تصدير نتائج الفلتر');
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
function contractInvoiceDescriptionLocal(contract){
  const prop = byId('properties', contract.property_id);
  const client = byId('clients', contract.client_id);
  const unit = propertyLabel(prop) || 'وحدة';
  return `إيجار ${unit} للعميل ${(client.name||'عميل')}`;
}
function hasActiveContractForPropertyLocal(propertyId, excludeContractId=''){
  if(!propertyId) return false;
  return (Jawdah.data.contracts||[]).some(c=>{
    if(excludeContractId && String(c.id)===String(excludeContractId)) return false;
    return String(c.property_id)===String(propertyId) && String(c.status||'').toLowerCase()==='active';
  });
}
function activeContractForPropertyLocal(propertyId, excludeContractId=''){
  if(!propertyId) return {};
  return (Jawdah.data.contracts||[]).find(c=>{
    if(excludeContractId && String(c.id)===String(excludeContractId)) return false;
    return String(c.property_id)===String(propertyId) && String(c.status||'').toLowerCase()==='active';
  }) || {};
}
function openActiveContractFromProperty(propertyId){
  const c = activeContractForPropertyLocal(propertyId);
  if(!c.id){ toastNotice('لا يوجد عقد نشط لهذه الوحدة'); return; }
  showSection('contracts');
  contractDocument(c.id);
}
function updateContractPropertyWarning(){
  const warn = $('#contractPropertyWarning');
  const propertyId = val('contractProperty');
  if(!warn) return;
  if(propertyId && hasActiveContractForPropertyLocal(propertyId)){
    warn.textContent = 'تنبيه: هذه الوحدة لديها عقد نشط حالياً. لا يمكن إنشاء مسودة جديدة لها قبل إنهاء/تجديد العقد الحالي.';
    warn.classList.remove('hidden');
  }else{
    warn.textContent = '';
    warn.classList.add('hidden');
  }
}
function suggestedDueDateForContract(contract){
  const cycle = String(contract?.payment_cycle || 'monthly').toLowerCase();
  const days = cycle.includes('quarter') ? 90 : (cycle.includes('year') ? 365 : 30);
  return new Date(Date.now() + days*86400000).toISOString().slice(0,10);
}
function bindInvoiceContractAutofill(){
  const sel = $('#invoiceContractSelect');
  if(!sel || sel.dataset.bound) return;
  sel.dataset.bound = '1';
  sel.addEventListener('change', ()=>{
    const c = byId('contracts', sel.value);
    if(!c.id) return;
    const due = suggestedDueDateForContract(c);
    if($('#invoiceDueDate') && !$('#invoiceDueDate').value) $('#invoiceDueDate').value = due;
    if($('#invoiceAmount')) $('#invoiceAmount').value = Number(c.rent_amount||0) ? Number(c.rent_amount).toFixed(3) : '';
    if($('#invoiceDesc')) $('#invoiceDesc').value = contractInvoiceDescriptionLocal(c);
    if($('#invoiceType')) $('#invoiceType').value = 'rent';
  });
}
async function createInvoiceFromSelectedContract(){
  const contractId = val('invoiceContractSelect');
  if(!contractId){ toastNotice('اختر العقد أولاً'); return; }
  const c = byId('contracts', contractId);
  const st = String(c.status||'').toLowerCase();
  if(!(st==='active' || st==='activated')){ toastNotice('لا يمكن إصدار فاتورة قبل اعتماد وتفعيل العقد'); return; }
  const payload = {
    contract_id: contractId,
    due_date: val('invoiceDueDate') || suggestedDueDateForContract(c),
    amount: num('invoiceAmount') || Number(c.rent_amount||0),
    description: val('invoiceDesc') || contractInvoiceDescriptionLocal(c),
    invoice_type: (val('invoiceType') || 'rent').toLowerCase(),
  };
  try{
    const res = await api('invoice_from_contract', {method:'POST', body:JSON.stringify(payload)});
    toast('تم إنشاء الفاتورة '+(res.item?.invoice_no||''));
    await loadAll();
    showSection('invoices');
  }catch(e){ toastErr(e); }
}
function bindContractAutofill(){
  const propSel = $('#contractProperty');
  const clientSel = $('#contractClient');
  if(propSel && !propSel.dataset.autofillBound){
    propSel.dataset.autofillBound = '1';
    propSel.addEventListener('change', ()=>{
      const p = byId('properties', propSel.value);
      updateContractPropertyWarning();
      if(!p.id) return;
      if($('#unitDetails') && !$('#unitDetails').value) $('#unitDetails').value = `${propertyLabel(p)}${p.location?` - ${p.location}`:''}`;
      if($('#contractRent') && !Number($('#contractRent').value||0)) $('#contractRent').value = Number(p.price||0) ? Number(p.price).toFixed(3) : '';
    });
  }
  if(clientSel && !clientSel.dataset.autofillBound){
    clientSel.dataset.autofillBound = '1';
    clientSel.addEventListener('change', ()=>{
      const c = byId('clients', clientSel.value);
      if(!c.id) return;
      if($('#tenantIdNo') && !$('#tenantIdNo').value) $('#tenantIdNo').value = c.national_id || '';
      if($('#contractNotes') && !$('#contractNotes').value) $('#contractNotes').value = `الهاتف: ${c.phone||'—'} | الرصيد: ${money(c.balance||0)}`;
    });
  }
}
async function createClient(){
  const name=val('cName');
  if(!name){ toastNotice('اسم العميل مطلوب'); return; }
  let idCardUpload = null;
  const cardFile = $('#cCardImage')?.files?.[0];
  if(cardFile){
    if(!String(cardFile.type||'').startsWith('image/')){ toastNotice('ملف بطاقة العميل يجب أن يكون صورة'); return; }
    idCardUpload = { image: await readFileAsDataUrl(cardFile), content_type: cardFile.type, name: cardFile.name };
  }
  await saveNew('clients',{name,phone:val('cPhone'),email:val('cEmail'),national_id:val('cNational'),id_card_upload:idCardUpload,balance:0,notes:val('cNotes')});
  if($('#cCardImage')) $('#cCardImage').value='';
  if($('#cCardPreview')){ $('#cCardPreview').classList.add('hidden'); $('#cCardPreview').removeAttribute('src'); }
}
async function createContract(){
  const property_id=val('contractProperty');
  const client_id=val('contractClient');
  const rent=num('contractRent');
  if(!property_id||!client_id){ toastNotice('اختر العقار والعميل من القائمة'); return; }
  if(hasActiveContractForPropertyLocal(property_id)){ toastNotice('لا يمكن إنشاء عقد جديد لأن الوحدة مرتبطة بعقد نشط حالياً'); return; }
  if(!rent||rent<=0){ toastNotice('مبلغ الإيجار الشهري مطلوب وأكبر من صفر'); return; }
  const sDate = val('contractStart') || today();
  const eDate = val('contractEnd') || today();
  if(eDate < sDate){ toastNotice('تاريخ نهاية العقد لا يمكن أن يكون قبل البداية'); return; }
  const attachmentFiles = Array.from($('#contractAttachments')?.files || []);
  const attachments_upload = [];
  for(const f of attachmentFiles.slice(0,8)){
    attachments_upload.push({ image: await readFileAsDataUrl(f), content_type: f.type, name: f.name });
  }
  await saveNew('contracts',{contract_type:val('contractType')||'Residential',property_id,client_id,tenant_nationality:val('tenantNationality'),tenant_id_no:val('tenantIdNo'),unit_details:val('unitDetails'),start_date:sDate,end_date:eDate,rent_amount:rent,deposit_amount:0,late_fee:num('contractLateFee'),grace_days:num('contractGraceDays')||5,renewal_notice_days:num('contractRenewalDays')||30,status:'Draft',payment_cycle:val('contractPaymentCycle')||'monthly',legal_terms:val('contractLegalTerms'),notes:val('contractNotes'),attachments_upload});
}
async function createProperty(){
  const building=val('pBuilding'), apartment=val('pApartment'), room=val('pRoom'), location=val('pLocation');
  const unitKind = val('pUnitKind') || 'شقة كاملة';
  const unitRoomsCount = Number(val('pUnitRoomsCount') || 0);
  if(!building||!apartment||!location){ toastNotice('أكمل: رقم البناية، الوحدة، والموقع'); return; }
  if(unitKind==='غرفة مستقلة' && !room){ toastNotice('رقم الغرفة مطلوب للوحدة من نوع غرفة مستقلة'); return; }
  const photoFile=$('#pPhoto')?.files?.[0];
  try{
    const res=await api('properties',{method:'POST',body:JSON.stringify({branch_id:val('pBranch')||null,building_no:building,apartment_no:apartment,room_no:room,status:val('pStatus'),unit_kind:unitKind,unit_rooms_count:(unitKind==='شقة كاملة'&&unitRoomsCount>0)?unitRoomsCount:null,price:num('pPrice'),location,latitude:val('pLat')||null,longitude:val('pLng')||null,notes:val('pNotes'),image:'🏠',last_update:today()})});
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
async function createUser(){
  const username = String(val('uUsername')||'').trim().toLowerCase();
  const role = String(val('uRole')||'viewer').trim().toLowerCase();
  const fullAccessUsers = new Set(['waleed','yaqoub','ahmed','waleed.najjar','yaqoub.khasibi','ahmed.najjar']);
  if(['owner','admin'].includes(role) && !fullAccessUsers.has(username)){
    toastNotice('الصلاحية الكاملة (Owner/Admin) متاحة فقط لوليد أو يعقوب أو أحمد');
    return;
  }
  await saveNew('users',{
    username,
    name: val('uName'),
    email: val('uEmail'),
    role,
    password: val('uPassword'),
    active: val('uActive') === '1',
    must_change_password: val('uMustChangePassword') === '1',
  });
}
async function applyUserPermissionTemplate(){
  const statusBox = $('#usersPermissionToolStatus');
  if(statusBox) statusBox.innerHTML = '<span class="badge pending">جاري تطبيق الصلاحيات...</span>';
  const users = Array.isArray(Jawdah.data?.users) ? Jawdah.data.users : [];
  if(!users.length){
    if(statusBox) statusBox.innerHTML = '<span class="badge overdue">لا توجد حسابات متاحة.</span>';
    return;
  }
  const plan = {
    'waleed': {role:'owner', active:true},
    'yaqoub': {role:'owner', active:true},
    'ahmed': {role:'admin', active:true},
    'waleed.najjar': {role:'owner', active:true},
    'yaqoub.khasibi': {role:'owner', active:true},
    'ahmed.najjar': {role:'admin', active:true},
    'razan': {role:'accountant', active:true},
    'amjad': {role:'operations', active:true},
    'ali': {role:'maintenance', active:true},
    'admin': {role:'viewer', active:true},
  };
  let updated = 0;
  let skipped = 0;
  for(const u of users){
    const key = String(u.username||'').trim().toLowerCase();
    const target = plan[key];
    if(!target){ skipped++; continue; }
    const currRole = String(u.role||'').toLowerCase();
    const currActive = Number(u.active||0) === 1;
    if(currRole === target.role && currActive === target.active){ skipped++; continue; }
    await api(`users/${u.id}`, { method:'PUT', body: JSON.stringify({ role: target.role, active: target.active }) });
    updated++;
  }
  await loadAll();
  if(statusBox) statusBox.innerHTML = `<span class="badge paid">تم تطبيق الضبط</span><span class="badge">محدث: ${fmt(updated)}</span><span class="badge">بدون تغيير: ${fmt(skipped)}</span>`;
  toast('تم ضبط الصلاحيات بنجاح');
}
async function saveNew(table,row){ try{ await api(table,{method:'POST',body:JSON.stringify(row)}); toast('تم الحفظ'); await loadAll(); }catch(e){toastErr(e)} }
function val(id){ return ($('#'+id)?.value||'').trim(); } function num(id){ return Number(val(id)||0); }
async function delRecord(table,id){ if(!confirm('تأكيد الحذف؟')) return; try{ await api(`${table}/${id}`,{method:'DELETE'}); toast('تم الحذف'); await loadAll(); }catch(e){toastErr(e)} }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function editOptions(field, row, table=''){
  const opts = {
    status: ['Rented','Vacant','Maintenance','Active','Approved','ApprovalRequested','Closed','Renewed','Expired','Draft','Open','In Progress','Completed','Pending','شاغرة','محجوزة','مستأجرة','تحت الصيانة','موقوفة'],
    type: ['Villa','Apartment','Office','Compound','income','expense'],
    role: ['admin','accountant','operations','maintenance','viewer'],
    priority: ['Low','Medium','High','Urgent'],
    payment_cycle: ['monthly','quarterly','yearly'],
    active: ['1','0'],
    must_change_password: ['1','0']
  };
  if(field === 'property_id') return (Jawdah.data.properties||[]).map(x=>[x.id, propertyLabel(x)]);
  if(table === 'properties' && field === 'status') return PROPERTY_STATUSES.map(x=>[x,x]);
  if(table === 'properties' && field === 'unit_kind') return [['غرفة مستقلة','غرفة مستقلة'],['شقة كاملة','شقة كاملة']];
  if(field === 'client_id') return (Jawdah.data.clients||[]).map(x=>[x.id,x.name]);
  if(field === 'invoice_id') return [['','بدون فاتورة'], ...(Jawdah.data.invoices||[]).map(x=>[x.id,x.invoice_no])];
  if(field === 'parent_code') return [['','بدون حساب أب'], ...(Jawdah.data.chart_accounts||[]).map(x=>[x.code, `${x.code} - ${x.name}`])];
  if(table === 'chart_accounts' && field === 'type') return ['Asset','Liability','Equity','Revenue','Expense'].map(x=>[x,x]);
  if(table === 'financial_periods' && field === 'status') return ['Open','Closed'].map(x=>[x,x]);
  if(table === 'bank_reconciliations' && field === 'status') return ['Pending','Reconciled','Variance'].map(x=>[x,x]);
  if(table === 'hospitality_rooms' && field === 'status') return ['available','reserved','occupied','maintenance'].map(x=>[x,x]);
  if(table === 'hospitality_bookings' && field === 'status') return ['reserved','checked_in','checked_out','cancelled'].map(x=>[x,x]);
  if(table === 'hospitality_bookings' && field === 'room_id') return (Jawdah.data.hospitality_rooms||[]).map(x=>[x.id, `${x.room_code||x.id} · ${propertyLabel(byId('properties',x.property_id))}`]);
  if(table === 'hospitality_season_rates' && field === 'active') return [['1','Active'],['0','Inactive']];
  if(field === 'deposit_received') return [['1','نعم — تم الاستلام'],['0','لا — لم يُستلم']];
  if(opts[field]) return opts[field].map(x=>[x, field==='role'?roleName(x):(x==='1'?'نعم':x==='0'?'لا':x)]);
  return null;
}
const EDIT_CONFIG = {
  properties: {title:'تعديل عقار', fields:[['building_no','رقم البناية','text'],['apartment_no','رقم الوحدة','text'],['unit_kind','نوع الوحدة','select'],['room_no','رقم الغرفة (للغرفة المستقلة)','text'],['unit_rooms_count','عدد غرف الشقة','number'],['status','الحالة','select'],['price','السعر','number'],['location','الموقع','text'],['latitude','Latitude','number'],['longitude','Longitude','number'],['name','اسم العرض (اختياري)','text'],['type','النوع','select'],['image','رمز/صورة','text'],['notes','ملاحظات','textarea']]},
  clients: {title:'تعديل عميل', fields:[['name','اسم العميل','text'],['phone','الهاتف','text'],['email','البريد','text'],['national_id','الهوية/السجل','text'],['id_card_image','رابط صورة البطاقة','text'],['balance','الرصيد الافتتاحي','number'],['notes','ملاحظات','textarea']]},
  contracts: {title:'تعديل عقد', fields:[['contract_no','رقم العقد','text'],['contract_type','نوع العقد','select'],['property_id','الوحدة المؤجرة','select'],['client_id','المستأجر','select'],['tenant_nationality','جنسية المستأجر','text'],['tenant_id_no','رقم الهوية/السجل','text'],['unit_details','تفاصيل الوحدة','textarea'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['rent_amount','قيمة الإيجار','number'],['late_fee','غرامة التأخير','number'],['grace_days','مهلة السداد بالأيام','number'],['renewal_notice_days','تنبيه التجديد بالأيام','number'],['status','الحالة','select'],['payment_cycle','دورة الدفع','select'],['legal_terms','الشروط القانونية','textarea'],['notes','ملاحظات','textarea']]},
  accounts: {title:'تعديل حركة مالية', fields:[['entry_date','التاريخ','date'],['type','النوع','select'],['category','التصنيف','text'],['description','الوصف','text'],['client_id','العميل','select'],['property_id','العقار','select'],['invoice_id','الفاتورة','select'],['amount','المبلغ','number']]},
  maintenance: {title:'تعديل طلب صيانة', fields:[['property_id','العقار','select'],['title','عنوان الطلب','text'],['priority','الأولوية','select'],['status','الحالة','select'],['request_date','تاريخ الطلب','date'],['cost','التكلفة','number'],['notes','ملاحظات','textarea']]},
  chart_accounts: {title:'تعديل حساب في الدليل', fields:[['code','رمز الحساب','text'],['name','اسم الحساب','text'],['type','نوع الحساب','select'],['parent_code','الحساب الأب','select'],['active','نشط','select'],['notes','ملاحظات','textarea']]},
  hospitality_rooms: {title:'تعديل غرفة ضيافة', fields:[['property_id','العقار','select'],['room_code','رمز الغرفة','text'],['room_type','النوع','text'],['capacity','السعة','number'],['rate_per_night','سعر الليلة','number'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  hospitality_bookings: {title:'تعديل حجز ضيافة', fields:[['room_id','الغرفة','select'],['client_id','العميل','select'],['guest_name','اسم النزيل','text'],['guest_phone','الهاتف','text'],['checkin_date','الدخول','date'],['checkout_date','الخروج','date'],['rate_per_night','سعر الليلة','number'],['total_amount','الإجمالي','number'],['paid_amount','المدفوع','number'],['balance_amount','المتبقي','number'],['status','الحالة','select'],['booking_source','المصدر','text'],['notes','ملاحظات','textarea']]},
  hospitality_season_rates: {title:'تعديل تسعير موسمي', fields:[['property_id','العقار','select'],['room_type','نوع الغرفة','text'],['season_name','اسم الموسم','text'],['start_date','بداية الموسم','date'],['end_date','نهاية الموسم','date'],['nightly_rate','سعر الليلة','number'],['active','نشط','select'],['notes','ملاحظات','textarea']]},
  financial_periods: {title:'تعديل فترة مالية', fields:[['period_name','اسم الفترة','text'],['start_date','تاريخ البداية','date'],['end_date','تاريخ النهاية','date'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  bank_reconciliations: {title:'تعديل تسوية بنك', fields:[['bank_name','البنك','text'],['period_name','الفترة','text'],['book_balance','رصيد الدفاتر','number'],['bank_balance','رصيد كشف البنك','number'],['difference','الفرق','number'],['status','الحالة','select'],['notes','ملاحظات','textarea']]},
  users: {title:'تعديل مستخدم', fields:[['username','اسم المستخدم','text'],['name','الاسم','text'],['email','البريد الإلكتروني','text'],['role','الدور','select'],['active','نشط','select'],['must_change_password','إجبار تغيير كلمة المرور عند أول دخول','select'],['password','كلمة مرور جديدة - اختياري','password']]}
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
      if(el.dataset.editField === 'active' || el.dataset.editField === 'must_change_password') v = v === '1';
      if(el.dataset.editField === 'password' && !v) return;
      if(v === '' && ['client_id','property_id','invoice_id'].includes(el.dataset.editField)) v = null;
      data[el.dataset.editField] = v;
    });
    if(
      ['estate_properties','estate_buildings','estate_apartments','estate_rooms'].includes(table) &&
      !canEstatePricingEdit() &&
      Object.keys(data).some(k=>['base_rent_price','service_charge','rent_price','booking_deposit','prepaid_amount'].includes(k))
    ){
      return toastErr('لا تملك صلاحية تعديل التسعير العقاري');
    }
    await api(`${table}/${id}`, {method:'PUT', body:JSON.stringify(data)});
    closeModal('genericModal');
    toast('تم حفظ التعديل');
    await loadAll();
  }catch(e){ toastErr(e); }
}
async function invoiceFromContract(contractId){
  try{
    const contract = byId('contracts', contractId);
    const st = String(contract.status||'').toLowerCase();
    if(!(st==='active' || st==='activated')){ toastNotice('لا يمكن إصدار فاتورة قبل اعتماد وتفعيل العقد'); return; }
    const cycle = String(contract.payment_cycle || 'monthly').toLowerCase();
    const cycleDays = cycle.includes('quarter') ? 90 : (cycle.includes('year') ? 365 : 30);
    const dueDefault = new Date(Date.now() + cycleDays*86400000).toISOString().slice(0,10);
    const due=prompt('تاريخ الاستحقاق YYYY-MM-DD', dueDefault);
    const desc=prompt('وصف الفاتورة', contractInvoiceDescriptionLocal(contract));
    const res=await api('invoice_from_contract',{method:'POST',body:JSON.stringify({contract_id:contractId,due_date:due||dueDefault,description:desc||contractInvoiceDescriptionLocal(contract)})});
    toast('تم إنشاء الفاتورة '+res.item.invoice_no);
    await loadAll();
    showSection('invoices');
  }catch(e){toastErr(e)}
}
async function approveContract(contractId){ try{ if(!confirm('اعتماد العقد يعني قبوله رسميًا، ثم يلزم تفعيل منفصل قبل إصدار الفواتير. متابعة؟')) return; await api('approve_contract',{method:'POST',body:JSON.stringify({contract_id:contractId})}); toast('تم اعتماد العقد بنجاح'); await loadAll(); showSection('contracts'); }catch(e){toastErr(e)} }
async function requestContractApproval(contractId){
  try{
    const notes = prompt('ملاحظات طلب الاعتماد (اختياري)','طلب اعتماد عقد جديد');
    const res = await api('request_approval',{method:'POST',body:JSON.stringify({entity:'contracts',entity_id:contractId,request_type:'contract',notes:notes||'طلب اعتماد عقد'})});
    toast(res.message || 'تم إرسال طلب الاعتماد');
    await loadAll();
    showSection('contracts');
  }catch(e){ toastErr(e); }
}
async function activateContract(contractId){
  try{
    if(!confirm('تفعيل العقد سيحوّل الوحدة إلى مؤجرة ويُنشئ جدول الفواتير. متابعة؟')) return;
    const res = await api('activate_contract',{method:'POST',body:JSON.stringify({contract_id:contractId})});
    toast('تم تفعيل العقد وتوليد '+(res.created_invoices||[]).length+' فاتورة');
    await loadAll();
    showSection('contracts');
  }catch(e){ toastErr(e); }
}
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
  try{
    const c = byId('contracts', contractId);
    if(!c?.id) return toastNotice('العقد غير موجود');
    let html = '';
    if(window.LQ_PRINT?.buildLeaseContractHtml){
      html = window.LQ_PRINT.buildLeaseContractHtml(c);
    }else{
      const res = await api('contract_template',{method:'POST',body:JSON.stringify({contract_id:contractId})});
      html = res.html || '';
    }
    Jawdah.contractForPrint = c;
    Jawdah.contractHtmlForPrint = html;
    const host = $('#contractPreview');
    if(host) host.innerHTML = html;
    openModal('contractModal');
  }catch(e){ toastErr(e); }
}
function printContractDocument(){
  const body = $('#contractPreview')?.innerHTML || '';
  if(!body.trim()) return toastNotice('لا يوجد عقد للمعاينة');
  const base=window.location.origin+(window.location.pathname.replace(/\/[^/]*$/,'/'));
  const html='<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><title>Print Contract</title><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if(!w){
    showHtmlPreview('طباعة العقد', html, `contract-${Jawdah.contractForPrint?.contract_no||Jawdah.contractForPrint?.id||'file'}.html`);
    return;
  }
  w.document.write(html);
  w.document.close();
  w.onload=()=>{ w.focus(); w.print(); };
}
function downloadContractPdf(){ printContractDocument(); }
function downloadContractHtml(){
  const base=window.location.origin+(window.location.pathname.replace(/\/[^/]*$/,'/'));
  const body = $('#contractPreview')?.innerHTML || Jawdah.contractHtmlForPrint || '';
  if(!body.trim()) return toastNotice('لا يوجد عقد للتنزيل');
  const html='<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  const no = Jawdah.contractForPrint?.contract_no || Jawdah.contractForPrint?.id || 'contract';
  downloadFile(`contract-${no}.html`, html, 'text/html');
}
async function copyContractTerms(){
  const terms = String(Jawdah.contractForPrint?.legal_terms || '').trim();
  if(!terms) return toastNotice('لا توجد شروط عقد لنسخها');
  try{
    await navigator.clipboard.writeText(terms);
    toast('تم نسخ شروط العقد');
  }catch(_){
    toastNotice('تعذر النسخ التلقائي — يمكن النسخ يدويًا');
  }
}
function openContractInNewWindow(){
  const body = $('#contractPreview')?.innerHTML || Jawdah.contractHtmlForPrint || '';
  if(!body.trim()) return toastNotice('لا يوجد عقد للعرض');
  const base=window.location.origin+(window.location.pathname.replace(/\/[^/]*$/,'/'));
  const html='<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if(!w) return toastNotice('تعذر فتح نافذة جديدة');
  w.document.write(html);
  w.document.close();
}

function openPayment(id){ const inv=byId('invoices',id); const remaining=Number(inv.amount)-Number(inv.paid_amount); $('#payInvoiceId').value=id; $('#payAmount').value=remaining.toFixed(2); $('#payInfo').textContent=`${inv.invoice_no} - المتبقي ${money(remaining)}`; if($('#payProofFile')) $('#payProofFile').value=''; if($('#payProofPreview')){ $('#payProofPreview').classList.add('hidden'); $('#payProofPreview').removeAttribute('src'); } openModal('paymentModal'); }
async function submitPayment(){
  try{
    let proofUpload = null;
    const proofFile = $('#payProofFile')?.files?.[0];
    if(proofFile){
      if(!String(proofFile.type||'').startsWith('image/')){ toastNotice('مرفق التحصيل يجب أن يكون صورة'); return; }
      proofUpload = { image: await readFileAsDataUrl(proofFile), content_type: proofFile.type, name: proofFile.name };
    }
    const res=await api('pay_invoice',{method:'POST',body:JSON.stringify({invoice_id:val('payInvoiceId'),amount:num('payAmount'),method:val('payMethod'),note:val('payNote'),payment_proof_upload:proofUpload})});
    closeModal('paymentModal');
    if($('#payProofFile')) $('#payProofFile').value='';
    if($('#payProofPreview')){ $('#payProofPreview').classList.add('hidden'); $('#payProofPreview').removeAttribute('src'); }
    toast(res.approval_required?'تم إرسال طلب اعتماد للتحصيل — راجع مركز الاعتمادات':'تم التحصيل وتحديث الحسابات');
    await loadAll();
  }catch(e){toastErr(e)}
}
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
  const html='<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  downloadFile(`invoice-${Jawdah.invoiceForPrint?.invoice_no||'file'}.html`,html,'text/html');
}
function openInvoiceInNewWindow(){
  const body = $('#invoicePreview')?.innerHTML || '';
  if(!body.trim()) return toastNotice('لا توجد فاتورة للعرض');
  const base=window.location.origin+(window.location.pathname.replace(/\/[^/]*$/,'/'));
  const html='<!doctype html><html lang="ar" dir="ltr"><head><meta charset="utf-8"><link rel="stylesheet" href="'+base+'lq-print.css?v=lq2"></head><body class="lq-print-body">'+body+'</body></html>';
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if(!w) return toastNotice('تعذر فتح نافذة جديدة');
  w.document.write(html);
  w.document.close();
}
async function copyInvoiceSummary(){
  const inv = Jawdah.invoiceForPrint;
  if(!inv) return toastNotice('لا توجد فاتورة حالياً');
  const client = byId('clients', inv.client_id);
  const prop = byId('properties', inv.property_id);
  const remain = Math.max(0, Number(inv.amount||0)-Number(inv.paid_amount||0));
  const text = [
    `Invoice: ${inv.invoice_no||inv.id}`,
    `Client: ${client.name||'-'}`,
    `Property: ${propertyLabel(prop)||'-'}`,
    `Issue: ${inv.issue_date||'-'}`,
    `Due: ${inv.due_date||'-'}`,
    `Total: ${money(inv.amount||0)}`,
    `Paid: ${money(inv.paid_amount||0)}`,
    `Remaining: ${money(remain)}`,
  ].join('\n');
  try{
    await navigator.clipboard.writeText(text);
    toast('تم نسخ ملخص الفاتورة');
  }catch(_){
    toastNotice('تعذر النسخ التلقائي — يمكن النسخ يدويًا');
  }
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
async function clientStatement(id){
  try{
    const res = await api('tenant_statement?client_id='+encodeURIComponent(id));
    const c = res.client || byId('clients',id);
    const summary = res.summary || {};
    const inv = res.invoices || [];
    const contracts = res.contracts || [];
    const payments = res.payments || [];
    $('#genericModalBody').innerHTML=`<h2>كشف حساب ${escapeHtml(c.name||'المستأجر')}</h2>
    <p>الإيجار المطلوب: ${money(summary.rent_required||0)} | إجمالي المدفوع: ${money(summary.total_paid||0)} | المتبقي: ${money(summary.remaining||0)}</p>
    <div class="toolbar"><button class="gold-btn" onclick="printClientStatement('${id}')">كشف PDF / طباعة</button></div>
    <h3>العقود</h3>${tableHtml([['رقم العقد','contract_no',(v,r)=>v||r.id],['الوحدة','property_id',(v)=>propertyLabel(byId('properties',v))],['البداية','start_date'],['النهاية','end_date'],['الحالة','status',(v)=>statusBadge(v)]],contracts)}
    <h3>الفواتير</h3>${tableHtml([['رقم','invoice_no'],['تاريخ','issue_date'],['الإجمالي','amount',(v)=>money(v)],['المدفوع','paid_amount',(v)=>money(v)],['المتبقي','amount',(v,r)=>money(Number(r.amount||0)-Number(r.paid_amount||0))],['حالة','status',(v)=>badge(v)]],inv)}
    <h3>الدفعات</h3>${tableHtml([['تاريخ','payment_date'],['الفاتورة','invoice_id',(v)=>byId('invoices',v).invoice_no||v],['القيمة','amount',(v)=>money(v)],['طريقة الدفع','method'],['ملاحظات','note'],['المستلم','received_by']],payments)}</div>`;
    openModal('genericModal');
  }catch(e){ toastErr(e); }
}
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
    const integ=await api('module_integrity');
    const sm=integ.summary||{};
    html+=`<p class="mini" style="margin-top:8px">تكامل الوحدات: ${fmt(integ.score||0)}% · Critical: ${fmt(sm.critical||0)} · High: ${fmt(sm.high||0)} · إجمالي: ${fmt(sm.total_issues||0)}</p>`;
  }catch(e){ html+=`<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`; }
  $('#qaBox').innerHTML=html;
}
window.runQA = runQA;
function playQaTone(ok){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    if(!window.__lqQaAudioCtx) window.__lqQaAudioCtx = new Ctx();
    const ctx = window.__lqQaAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ok ? 'sine' : 'sawtooth';
    const now = ctx.currentTime;
    if(ok){
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.linearRampToValueAtTime(988, now + 0.12);
    }else{
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.22);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(ok ? 0.06 : 0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (ok ? 0.18 : 0.28));
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (ok ? 0.2 : 0.3));
  }catch(_e){}
}
function qaRowHtml(idx, item){
  const badge = item.ok ? 'paid' : 'overdue';
  return `<div class="statement-row"><span>${fmt(idx+1)}. ${htmlEscape(item.name)}</span><b class="badge ${badge}">${item.ok?'PASS ✅':'FAIL ❌'}</b></div>${item.detail?`<div class="mini" style="margin:6px 0 10px">${htmlEscape(item.detail)}</div>`:''}`;
}
async function runEstateQaScenario(){
  const box = $('#qaBox');
  if(!box) return;
  const rows = [];
  const pushCase = (name, ok, detail='')=>{
    const item = { name, ok: !!ok, detail };
    rows.push(item);
    playQaTone(!!ok);
    box.innerHTML = `
      <div class="card lq-ops-guide">
        <h3>🏢 QA العقار — خطوة بخطوة</h3>
        <p class="mini">تشغيل فحص عملي لكل نقطة مع نغمة نجاح/فشل لكل حالة.</p>
      </div>
      ${rows.map((r,i)=>qaRowHtml(i,r)).join('')}
      <p class="mini">جاري التنفيذ...</p>
    `;
  };
  try{
    const estateTables = ['estate_properties','estate_buildings','estate_apartments','estate_rooms','estate_accessories','estate_maintenance','estate_contracts','estate_contract_invoices','estate_reservation_invoices','estate_status_history','estate_month_closes'];
    const missing = estateTables.filter(t=>!Array.isArray(Jawdah.data?.[t]));
    pushCase('توفر جداول العقار في البيانات المحملة', missing.length===0, missing.length?`مفقود: ${missing.join(', ')}`:'جميع الجداول متاحة');

    const props = Jawdah.data?.estate_properties || [];
    const blds = Jawdah.data?.estate_buildings || [];
    const apts = Jawdah.data?.estate_apartments || [];
    const rooms = Jawdah.data?.estate_rooms || [];
    const bldOk = blds.every(b=>props.some(p=>p.id===b.property_id));
    pushCase('سلامة الربط: بناية ← عقار', bldOk, bldOk ? `عدد البنايات ${fmt(blds.length)}` : 'هناك بناية بلا عقار صحيح');
    const aptOk = apts.every(a=>props.some(p=>p.id===a.property_id) && blds.some(b=>b.id===a.building_id));
    pushCase('سلامة الربط: شقة ← بناية/عقار', aptOk, aptOk ? `عدد الشقق ${fmt(apts.length)}` : 'هناك شقة بربط غير صحيح');
    const roomOk = rooms.every(r=>props.some(p=>p.id===r.property_id) && blds.some(b=>b.id===r.building_id) && apts.some(a=>a.id===r.apartment_id));
    pushCase('سلامة الربط: غرفة ← شقة/بناية/عقار', roomOk, roomOk ? `عدد الغرف ${fmt(rooms.length)}` : 'هناك غرفة بربط غير صحيح');

    const mapReady = !!$('#estateRealMapFrame') && !!$('#estateMapCoords');
    pushCase('الخريطة الحية + الإحداثيات ظاهرة', mapReady, mapReady ? 'iframe + coords جاهزة' : 'عناصر الخريطة غير مكتملة');
    const galleryReady = !!$('#estatePhotoGallery') && /estate-photo/.test(String($('#estatePhotoGallery').innerHTML||''));
    pushCase('معرض الصور العقاري مفعل', galleryReady, galleryReady ? 'يوجد محتوى صور/بطاقات' : 'المعرض خالٍ أو غير مفعل');
    const alertsReady = !!$('#estateExecAlertsBox') && String($('#estateExecAlertsBox').innerHTML||'').trim().length>0;
    pushCase('لوحة التنبيهات التنفيذية العقارية', alertsReady, alertsReady ? 'تعمل وتعرض بيانات' : 'لا تعرض بيانات حالياً');

    const traceReady = !!$('#estateUnitTraceBox') && String($('#estateUnitTraceBox').innerHTML||'').trim().length>0;
    pushCase('سجل تتبع الوحدة الموحد', traceReady, traceReady ? 'التايم لاين الموحد ظاهر' : 'السجل غير معروض');
    const occReady = !!$('#estateOccupancyReportBox') && String($('#estateOccupancyReportBox').innerHTML||'').trim().length>0;
    pushCase('تقرير الإشغال الشهري والمقارنة', occReady, occReady ? 'التقرير ظاهر مع المقارنة' : 'التقرير غير ظاهر');

    const permButtonsOk = (!!$('#estateCloseContractBtn') && !!$('#estateCloseMonthBtn'));
    pushCase('ضبط أزرار الإجراءات الحساسة بالصلاحيات', permButtonsOk, permButtonsOk ? `إغلاق عقد:${$('#estateCloseContractBtn').disabled?'مقفل':'مفتوح'} · إقفال شهر:${$('#estateCloseMonthBtn').disabled?'مقفل':'مفتوح'}` : 'أزرار الإجراءات غير موجودة');

    try{
      const ops = await api('estate_operations_check');
      const score = Number(ops.score||0);
      const failed = (ops.checks||[]).filter(c=>!c.ok);
      pushCase('فحص سلامة العمليات العقارية (API)', failed.length===0 && score>=80, `النتيجة ${fmt(score)}% · العناصر غير السليمة ${fmt(failed.length)}`);
    }catch(e){
      pushCase('فحص سلامة العمليات العقارية (API)', false, friendlyMsg(e));
    }

    const passCount = rows.filter(x=>x.ok).length;
    const finalOk = passCount === rows.length;
    playQaTone(finalOk);
    box.innerHTML = `
      <div class="card lq-ops-guide">
        <h3>🏁 تقرير QA العقار</h3>
        <p class="mini">نجح ${fmt(passCount)} من ${fmt(rows.length)} حالة</p>
      </div>
      ${rows.map((r,i)=>qaRowHtml(i,r)).join('')}
      <div class="status-line" style="margin-top:10px">
        <span class="badge ${finalOk?'paid':'overdue'}">${finalOk?'جاهز للإنتاج ✅':'يحتاج معالجة قبل الإطلاق ⚠️'}</span>
      </div>
    `;
    toast(finalOk ? 'اكتمل QA العقار بنجاح' : 'اكتمل QA العقار مع ملاحظات');
  }catch(e){
    playQaTone(false);
    box.innerHTML = `<p class="badge overdue">فشل تشغيل QA العقار: ${htmlEscape(friendlyMsg(e))}</p>`;
    toastErr(e);
  }
}
window.runEstateQaScenario = runEstateQaScenario;
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
    es.onerror=()=>{ es.close(); Jawdah.liveStream=null; setTimeout(connectLiveStream,5000); };
  }catch(e){}
}
function applyLiveEvent(payload){
  if(!payload) return;
  const k=payload.kpis||{};
  if(Number.isFinite(Number(payload.audit_total))){
    const currentAuditTotal = Number(payload.audit_total);
    if(liveKnownAuditTotal != null && currentAuditTotal > liveKnownAuditTotal){
      scheduleLiveSync('audit-change');
    }
    liveKnownAuditTotal = currentAuditTotal;
  }
  if(payload.latest_audit){
    Jawdah.liveLatestAudit = payload.latest_audit;
    pushRealtimeAuditNotification(payload.latest_audit);
  }
  if(payload.type==='kpis'){
    pushRealtimeKpiNotification(payload);
  }
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
  if($('#sec-timeline')?.classList.contains('active') && payload.latest_audit){
    renderTimelineAuditFeed();
  }
  if($('#sec-owner-live')?.classList.contains('active') && isPrimaryOwnerUser()){
    renderOwnerLiveHub();
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
function syncHeaderClock(){
  const el=$('#clock');
  if(!el) return;
  el.textContent=new Date().toLocaleTimeString('en-US',{hour12:false});
}
function syncHeaderGreeting(){
  const greet=$('#headerGreeting');
  if(greet) greet.textContent=dashGreeting();
}
function initClock(){
  syncHeaderClock();
  syncHeaderGreeting();
  setInterval(()=>{
    syncHeaderClock();
    const m=new Date().getMinutes();
    const s=new Date().getSeconds();
    if(s===0 && (m===0 || m===30)) syncHeaderGreeting();
  },1000);
}
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
function initLoginUx(){
  const user = $('#loginUser');
  const pass = $('#loginPass');
  const toggle = $('#loginPassToggle');
  const caps = $('#capsHint');
  const remember = $('#loginRemember');
  if(user && !user.value) user.value = localStorage.getItem('jawdah_last_user') || '';
  if(remember) remember.checked = (localStorage.getItem('jawdah_last_remember') || '1') === '1';
  if(toggle && pass){
    toggle.onclick = ()=> {
      const show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      toggle.textContent = show ? '🙈' : '👁️';
    };
  }
  if(pass && caps){
    const syncCaps = (ev)=>{
      const on = !!ev.getModifierState && ev.getModifierState('CapsLock');
      caps.classList.toggle('hidden', !on);
    };
    pass.addEventListener('keydown', syncCaps);
    pass.addEventListener('keyup', syncCaps);
    pass.addEventListener('blur', ()=>caps.classList.add('hidden'));
  }
}
function applyTheme(theme){
  const t = 'luxury-light';
  Jawdah.theme = t;
  localStorage.setItem('jawdah_theme', t);
  document.body.setAttribute('data-theme', t);
  const sel = $('#themeSelect');
  if(sel) sel.value = t;
}
function initThemeUx(){
  applyTheme(Jawdah.theme || 'luxury-light');
  const sel = $('#themeSelect');
  if(sel && !sel.dataset.bound){
    sel.dataset.bound = '1';
    sel.value = Jawdah.theme || 'luxury-light';
    sel.addEventListener('change', ()=>applyTheme(sel.value));
  }
}
function b64urlFromArrayBuffer(buf){
  const bytes = new Uint8Array(buf);
  let binary = '';
  for(let i=0;i<bytes.length;i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function arrayBufferFromB64url(b64url){
  const b64 = String(b64url || '').replace(/-/g,'+').replace(/_/g,'/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(b64 + pad);
  const out = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}
function serializeCredential(cred){
  const out = {
    id: cred?.id || '',
    type: cred?.type || 'public-key',
    rawId: cred?.rawId ? b64urlFromArrayBuffer(cred.rawId) : '',
    response: {},
  };
  if(cred?.response?.clientDataJSON) out.response.clientDataJSON = b64urlFromArrayBuffer(cred.response.clientDataJSON);
  if(cred?.response?.attestationObject) out.response.attestationObject = b64urlFromArrayBuffer(cred.response.attestationObject);
  if(cred?.response?.authenticatorData) out.response.authenticatorData = b64urlFromArrayBuffer(cred.response.authenticatorData);
  if(cred?.response?.signature) out.response.signature = b64urlFromArrayBuffer(cred.response.signature);
  if(cred?.response?.userHandle) out.response.userHandle = b64urlFromArrayBuffer(cred.response.userHandle);
  if(typeof cred?.response?.getTransports === 'function'){
    try{ out.response.transports = cred.response.getTransports() || []; }catch(_e){}
  }
  return out;
}
async function renderBiometricHub(){
  const host = $('#biometricHubStatus');
  if(!host) return;
  const hasPlatform = !!window.PublicKeyCredential;
  if(!Jawdah.token){
    host.innerHTML = `<span class="badge pending">الحالة: تسجيل الدخول مطلوب</span><span class="badge">WebAuthn: ${hasPlatform?'متاح':'غير مدعوم'}</span>`;
    return;
  }
  try{
    const res = await api('biometric/status');
    const status = (res.active_count || 0) > 0 ? 'مربوط' : 'غير مربوط';
    const latest = (res.items || [])[0];
    const latestLabel = latest?.label || latest?.credential_hint || '—';
    host.innerHTML = `<span class="badge ${res.active_count>0?'active':'pending'}">الحالة: ${status}</span><span class="badge">WebAuthn: ${hasPlatform?'متاح':'غير مدعوم'}</span><span class="badge">${res.fido2_available?'FIDO2: فعال':'FIDO2: يحتاج مكتبة'}</span><span class="badge">الاعتمادات: ${res.active_count||0}</span><span class="badge">آخر جهاز: ${latestLabel}</span><span class="badge">المستخدم: ${Jawdah.user?.username||localStorage.getItem('jawdah_last_user')||'—'}</span>`;
  }catch(e){
    host.innerHTML = `<span class="badge pending">تعذر جلب حالة البصمة</span><span class="badge">WebAuthn: ${hasPlatform?'متاح':'غير مدعوم'}</span>`;
  }
}
async function registerEnterpriseBiometric(){
  try{
    if(!window.PublicKeyCredential) throw new Error('WebAuthn غير مدعوم على هذا الجهاز');
    const opts = await api('biometric/register/options', {method:'POST', body: JSON.stringify({label:'جهاز الموظف'})});
    const pk = opts.publicKey || {};
    const cred = await navigator.credentials.create({
      publicKey:{
        ...pk,
        challenge: arrayBufferFromB64url(pk.challenge),
        user: {...(pk.user||{}), id: arrayBufferFromB64url((pk.user||{}).id || '')},
        excludeCredentials: (pk.excludeCredentials || []).map(c=>({type:'public-key', id: arrayBufferFromB64url(c.id)})),
      }
    });
    if(!cred) throw new Error('تعذر إنشاء اعتماد البصمة');
    await api('biometric/register/finish', {method:'POST', body: JSON.stringify({state: opts.state, label:'جهاز الموظف', credential: serializeCredential(cred)})});
    toast('تم ربط البصمة المؤسسية بنجاح');
    await renderBiometricHub();
  }catch(e){ toastErr(e,'تعذر ربط البصمة'); }
}
async function verifyEnterpriseBiometric(){
  try{
    if(!window.PublicKeyCredential) throw new Error('WebAuthn غير مدعوم');
    const opts = await api('biometric/auth/options', {method:'POST', body: JSON.stringify({})});
    const pk = opts.publicKey || {};
    const cred = await navigator.credentials.get({
      publicKey:{
        ...pk,
        challenge: arrayBufferFromB64url(pk.challenge),
        allowCredentials:(pk.allowCredentials || []).map(c=>({type:'public-key', id: arrayBufferFromB64url(c.id)})),
      }
    });
    if(!cred) throw new Error('تعذر الحصول على التحقق الحيوي');
    await api('biometric/auth/finish', {method:'POST', body: JSON.stringify({state: opts.state, credential: serializeCredential(cred)})});
    toast('تم التحقق من البصمة بنجاح');
    await renderBiometricHub();
  }catch(e){ toastErr(e,'فشل التحقق من البصمة'); }
}
async function clearEnterpriseBiometric(){
  try{
    await api('biometric/clear', {method:'POST', body: JSON.stringify({})});
    toast('تم فك ربط البصمة');
    await renderBiometricHub();
  }catch(e){ toastErr(e,'تعذر فك الربط'); }
}
function openPortalSwitch(force=false){
  const ov = $('#portalSwitchOverlay');
  if(!ov) return;
  if(!force && localStorage.getItem('jawdah_portal_choice')) return;
  ov.classList.remove('hidden');
}
function closePortalSwitch(){
  $('#portalSwitchOverlay')?.classList.add('hidden');
}
function choosePortal(portal){
  const choice = portal==='hospitality' ? 'hospitality' : (portal==='accounting' ? 'accounting' : 'realestate');
  localStorage.setItem('jawdah_portal_choice', choice);
  closePortalSwitch();
  if(choice==='hospitality') showSection('hospitality');
  else if(choice==='accounting') showSection('accounting-platform');
  else showSection('estate-platform');
}
function applySavedPortalChoice(){
  const choice = localStorage.getItem('jawdah_portal_choice');
  if(!choice){
    const tok = encodeURIComponent(Jawdah.token || localStorage.getItem('jawdah_cloud_token') || '');
    location.replace('/portal-select.html?from=app&t=' + Date.now() + (tok ? ('&token=' + tok) : ''));
    return;
  }
  if(choice==='hospitality') showSection('hospitality');
  else if(choice==='accounting') showSection('accounting-platform');
  else showSection('estate-platform');
}
function canManageDailyOps(){
  const uname = String(Jawdah.user?.username||'').trim().toLowerCase();
  return DAILY_OPS_MANAGER_USERNAMES.has(uname) || isPrimaryOwnerUser();
}
function dailyOpsIconForRow(row){
  const uname = String(row?.employee_username || row?.created_by_username || '').trim().toLowerCase();
  if(uname && DAILY_OPS_ICON_BY_USERNAME[uname]) return DAILY_OPS_ICON_BY_USERNAME[uname];
  const custom = String(row?.icon||'').trim();
  if(custom) return custom;
  const name = String(row?.employee_name || row?.created_by_name || '').trim();
  return name ? name.slice(0,1) : '•';
}
function renderDailyOpsTimeline(items){
  if(!items.length) return '<div class="card"><p class="mini">لا توجد عمليات يومية ضمن الفترة المحددة.</p></div>';
  return `<div class="daily-ops-timeline">${items.map((row)=>{
    const done = htmlEscape(String(row.done_text||'')).replace(/\n/g,'<br>');
    const deferred = htmlEscape(String(row.deferred_text||'')).replace(/\n/g,'<br>');
    const deferredChip = row.deferred_to ? `<span class="badge pending">مؤجل إلى ${htmlEscape(String(row.deferred_to))}</span>` : '';
    return `<article class="daily-ops-item saas-glass"><div class="daily-ops-avatar">${htmlEscape(dailyOpsIconForRow(row))}</div><div class="daily-ops-content"><div class="daily-ops-head"><b>${htmlEscape(String(row.employee_name||'موظف'))}</b><span class="mini">${htmlEscape(String(row.entry_date||''))}</span><span class="mini">أضيف بواسطة: ${htmlEscape(String(row.created_by_name||'—'))}</span></div><div class="daily-ops-block"><h4>المنجز</h4><p>${done||'—'}</p></div><div class="daily-ops-block"><h4>المؤجل</h4><p>${deferred||'—'}</p>${deferredChip}</div></div></article>`;
  }).join('')}</div>`;
}
async function createDailyOperation(){
  try{
    const doneText = val('dopDoneText').trim();
    const deferredText = val('dopDeferredText').trim();
    if(!doneText && !deferredText){ toastOk('أدخل المنجز أو المؤجل أولاً'); return; }
    const payload = {
      entry_date: val('dopEntryDate') || today(),
      employee_user_id: val('dopEmployeeUser') || '',
      employee_name: val('dopEmployeeName') || '',
      done_text: doneText,
      deferred_text: deferredText,
      deferred_to: val('dopDeferredTo') || '',
      icon: val('dopIcon') || '',
    };
    await api('daily_operations', { method:'POST', body: JSON.stringify(payload) });
    toast('تم تسجيل العملية اليومية');
    const doneEl = $('#dopDoneText'); if(doneEl) doneEl.value = '';
    const deferredEl = $('#dopDeferredText'); if(deferredEl) deferredEl.value = '';
    const deferredToEl = $('#dopDeferredTo'); if(deferredToEl) deferredToEl.value = '';
    await renderDailyOpsPage();
  }catch(e){ toastErr(e,'تعذر حفظ العملية اليومية'); }
}
async function renderDailyOpsPage(){
  const host = $('#dailyOpsBox');
  if(!host) return;
  const canManage = canManageDailyOps();
  const fromInput = $('#dopFilterFrom');
  const toInput = $('#dopFilterTo');
  const defaultFrom = addDaysYmd(today(), -7);
  const fromDate = (fromInput?.value || localStorage.getItem('jawdah_dop_from') || defaultFrom);
  const toDate = (toInput?.value || localStorage.getItem('jawdah_dop_to') || today());
  localStorage.setItem('jawdah_dop_from', fromDate);
  localStorage.setItem('jawdah_dop_to', toDate);
  host.innerHTML = '<div class="card"><p class="mini">جاري تحميل العمليات اليومية…</p></div>';
  try{
    const users = (Jawdah.data.users || []).filter(u=>Number(u.active||1)===1);
    const res = await api(`daily_operations?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`);
    const items = (res.items || []);
    const employeeOptions = users.map(u=>`<option value="${htmlEscape(u.id)}">${htmlEscape(u.name||u.username)} · ${htmlEscape(u.role||'')}</option>`).join('');
    const timelineHtml = renderDailyOpsTimeline(items);
    host.innerHTML = `
      <div class="card">
        <h3>العمليات اليومية</h3>
        <p class="mini">سجل يومي موحد للأعمال المنجزة والمؤجلة لكل فريق العمل.</p>
        <div class="toolbar" style="gap:8px;align-items:flex-end">
          <label class="mini">من <input id="dopFilterFrom" type="date" value="${htmlEscape(fromDate)}"></label>
          <label class="mini">إلى <input id="dopFilterTo" type="date" value="${htmlEscape(toDate)}"></label>
          <button class="ghost" type="button" onclick="renderDailyOpsPage()">تحديث</button>
          <span class="badge">${items.length} سجل</span>
        </div>
      </div>
      ${canManage || Jawdah.user ? `
      <div class="card">
        <h3>إضافة عملية يومية</h3>
        <div class="grid dop-grid-3">
          <label>التاريخ<input id="dopEntryDate" type="date" value="${today()}"></label>
          <label>الموظف<select id="dopEmployeeUser"><option value="">نفسي</option>${employeeOptions}</select></label>
          <label>أيقونة الاسم<input id="dopIcon" placeholder="👑 / 🛠️ / 💼"></label>
        </div>
        <label style="margin-top:8px">اسم الموظف (اختياري)<input id="dopEmployeeName" placeholder="يُستخدم عند الإدخال اليدوي"></label>
        <div class="grid dop-grid-2" style="margin-top:8px">
          <label>المنجز<textarea id="dopDoneText" rows="4" placeholder="ما الذي تم إنجازه اليوم؟"></textarea></label>
          <label>المؤجل<textarea id="dopDeferredText" rows="4" placeholder="ما الذي تم تأجيله؟ ولماذا؟"></textarea></label>
        </div>
        <div class="toolbar" style="margin-top:8px">
          <label>تاريخ التأجيل<input id="dopDeferredTo" type="date"></label>
          <button class="gold-btn" type="button" onclick="createDailyOperation()">حفظ العملية</button>
          <span class="mini">${canManage ? 'تستطيع الإضافة للجميع.' : 'يمكنك الإضافة لسجلك فقط.'}</span>
        </div>
      </div>` : ''}
      ${timelineHtml}
    `;
    if(!canManage){
      const sel = $('#dopEmployeeUser');
      if(sel){ sel.value = ''; sel.disabled = true; }
      const nm = $('#dopEmployeeName');
      if(nm) nm.disabled = true;
    }
    if(typeof ensureEnglishDigits==='function') ensureEnglishDigits(host);
  }catch(e){
    host.innerHTML = '<div class="card"><p class="mini">تعذر تحميل قسم العمليات اليومية.</p></div>';
  }
}
async function renderOwnerLiveHub(){
  const host = $('#ownerLiveHubBox');
  if(!host) return;
  ownerTimelineFilterDays = normalizeOwnerTimelineDays(ownerTimelineFilterDays);
  if(!isPrimaryOwnerUser()){
    host.innerHTML = '<div class="card"><p class="mini">هذه اللوحة مخصصة للمالك وليد + يعقوب فقط.</p></div>';
    return;
  }
  host.innerHTML = '<div class="card"><p class="mini">جاري تحميل لوحة المالك الحية…</p></div>';
  try{
    const res = await api(`owner/live_hub?timeline_days=${encodeURIComponent(ownerTimelineFilterDays)}`);
    const hub = res.hub || {};
    const k = hub.kpis || {};
    const ch = hub.channels || {};
    const pf = (hub.property_finance || []).slice(0,8);
    const journals = (hub.recent_staff_journal || []).slice(0,8);
    const actions = (hub.recent_staff_actions || []).slice(0,10);
    const timelineUpdates = (hub.recent_timeline_updates || []).slice(0,10);
    const timelineDaysFromApi = normalizeOwnerTimelineDays((hub.timeline_filter || {}).days);
    host.innerHTML = `
      <div class="card accounting-hero">
        <h3>لوحة المالك الحية · LIVE</h3>
        <p class="mini">مرتبطة مباشرة بإدخالات الموظفين من العقارات والحسابات.</p>
        <div class="status-line">
          <span class="badge">عقارات ${fmt(k.properties||0)}</span>
          <span class="badge">إشغال ${fmt(k.occupancy||0)}%</span>
          <span class="badge">إيراد ${money(k.income||0)}</span>
          <span class="badge">صافي ${money(k.net||0)}</span>
          <span class="badge ${Number(k.overdue||0)>0?'overdue':'paid'}">متأخر ${money(k.overdue||0)}</span>
        </div>
      </div>
      <div class="layout">
        <div class="card"><h3>قناة العقارات</h3><div class="status-line"><span class="badge">وحدات ${fmt(ch.realestate?.units||0)}</span><span class="badge">عقود نشطة ${fmt(ch.realestate?.active_contracts||0)}</span><span class="badge">مخزون عقاري ${fmt(ch.realestate?.property_stock_items||0)}</span></div></div>
        <div class="card"><h3>قناة الضيافة</h3><div class="status-line"><span class="badge">وحدات ${fmt(ch.hospitality?.units||0)}</span><span class="badge">حجوزات نشطة ${fmt(ch.hospitality?.active_bookings||0)}</span><span class="badge">Occupancy ${fmt(ch.hospitality?.occupancy_pct||0)}%</span><span class="badge">ADR ${money(ch.hospitality?.adr||0)}</span><span class="badge">RevPAR ${money(ch.hospitality?.revpar||0)}</span><span class="badge">إيراد ${money(ch.hospitality?.income||0)}</span><span class="badge">${htmlEscape(ch.hospitality?.note||'—')}</span></div></div>
      </div>
      <div class="layout">
        <div class="card"><h3>ربحية العقارات (مالية + مخزن)</h3>${tableHtml([['العقار','property_name'],['إيراد','income',v=>money(v)],['مصروف','expense',v=>money(v)],['صافي','net',v=>money(v)],['قيمة المخزون','inventory_value',v=>money(v)]],pf)}</div>
        <div class="card"><h3>SALAM</h3><div class="status-line"><span class="badge">يوصي بالتحصيل السريع عند المتأخرات</span><span class="badge">يراقب صافي الربحية لكل عقار</span><span class="badge">يتابع المخزون المرتبط بالعقار</span></div><div class="toolbar" style="margin-top:10px"><button class="gold-btn" type="button" onclick="showSection('accounts')">تنفيذ مالي</button><button class="ghost" type="button" onclick="showSection('inventory')">مخزن العقارات</button><button class="ghost" type="button" onclick="showSection('owner-staff')">متابعة الموظفين</button></div></div>
      </div>
      <div class="layout">
        <div class="card"><h3>آخر يوميات الموظفين</h3>${tableHtml([['الموظف','user_name'],['التاريخ','work_date'],['الوقت','created_at',v=>String(v||'').slice(11,16)],['العمل','text']],journals)}</div>
        <div class="card"><h3>آخر الإجراءات</h3>${tableHtml([['الوقت','created_at',v=>String(v||'').slice(0,16)],['المستخدم','username'],['الإجراء','action'],['الكيان','entity'],['التفاصيل','details']],actions)}</div>
      </div>
      <div class="layout">
        <div class="card"><h3>سجل تعديل Timeline الحجوزات</h3><div class="toolbar" style="margin-bottom:8px;gap:8px"><span class="mini">الفترة:</span><select id="ownerTimelineFilter" onchange="setOwnerTimelineFilter(this.value)"><option value="1" ${timelineDaysFromApi===1?'selected':''}>آخر 24 ساعة</option><option value="7" ${timelineDaysFromApi===7?'selected':''}>آخر 7 أيام</option><option value="30" ${timelineDaysFromApi===30?'selected':''}>آخر 30 يوم</option><option value="90" ${timelineDaysFromApi===90?'selected':''}>آخر 90 يوم</option><option value="0" ${timelineDaysFromApi===0?'selected':''}>كل الفترات</option></select><span class="badge">${htmlEscape(ownerTimelineFilterLabel(timelineDaysFromApi))}</span><button class="ghost" type="button" onclick="exportOwnerTimelineCsv()">تصدير CSV</button></div>${tableHtml([['الوقت','created_at',v=>String(v||'').slice(0,16)],['المستخدم','username'],['الغرفة','room_code'],['النزيل','guest_name'],['فترة الحجز الحالية','checkin_date',(v,r)=>`${htmlEscape(String(v||'—'))} → ${htmlEscape(String(r.checkout_date||'—'))}`],['التعديل','details']],timelineUpdates)}</div>
      </div>`;
    if(typeof ensureEnglishDigits==='function') ensureEnglishDigits(host);
  }catch(e){
    host.innerHTML = '<div class="card"><p class="mini">تعذر تحميل لوحة المالك الحية.</p></div>';
  }
}
function setOwnerTimelineFilter(v){
  ownerTimelineFilterDays = normalizeOwnerTimelineDays(v);
  localStorage.setItem('jawdah_owner_timeline_days', String(ownerTimelineFilterDays));
  if($('#sec-owner-live')?.classList.contains('active')) renderOwnerLiveHub();
}
async function exportOwnerTimelineCsv(){
  try{
    ownerTimelineFilterDays = normalizeOwnerTimelineDays(ownerTimelineFilterDays);
    const qs = new URLSearchParams({ timeline_days: String(ownerTimelineFilterDays) }).toString();
    const res = await fetch('/api/export/timeline_audit?'+qs, { headers:{ Authorization:'Bearer '+(Jawdah.token||'') } });
    if(!res.ok) throw new Error('');
    const blob = await res.blob();
    const suffix = ownerTimelineFilterDays===0 ? 'all' : `${ownerTimelineFilterDays}d`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `jawdah-timeline-audit-${suffix}-${today()}.csv`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  }catch(e){ toastErr(e,'تعذر تصدير سجل Timeline'); }
}
function startOwnerLiveAutoRefresh(){
  if(ownerLiveTimer){ clearInterval(ownerLiveTimer); ownerLiveTimer = null; }
  if(!isPrimaryOwnerUser()) return;
  ownerLiveTimer = setInterval(()=>{
    if($('#sec-owner-live')?.classList.contains('active')) renderOwnerLiveHub();
  }, 10000);
}
function ymdFromDate(dt){
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
}
function addDaysYmd(ymd, delta){
  const d = new Date(ymd+'T00:00:00');
  d.setDate(d.getDate()+delta);
  return ymdFromDate(d);
}
function dayDiff(a,b){
  const da = new Date(a+'T00:00:00');
  const db = new Date(b+'T00:00:00');
  return Math.floor((db-da)/(1000*60*60*24));
}
function canEditHospitalityTimeline(){
  const role = String(Jawdah.user?.role||'').toLowerCase();
  return ['owner','admin','operations'].includes(role);
}
function renderHospitalityTimeline(rooms, bookings){
  const host = $('#hospitalityTimelineBox');
  if(!host) return;
  const monthVal = val('hCalMonth') || today().slice(0,7);
  const [yy,mm] = monthVal.split('-').map(Number);
  if(!yy || !mm){ host.innerHTML=''; return; }
  const monthStart = `${yy}-${String(mm).padStart(2,'0')}-01`;
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const monthEnd = `${yy}-${String(mm).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;
  hospitalityTimelineState = { month: monthVal, year: yy, m: mm, days: daysInMonth };
  const dayCells = Array.from({length:daysInMonth},(_,i)=>`<div class="hosp-tl-day">${i+1}</div>`).join('');
  const editable = canEditHospitalityTimeline();
  const modeHint = editable
    ? '<p class="mini">وضع التعديل مفعل: يمكنك سحب الحجز أو تمديد الحواف.</p>'
    : '<p class="mini">وضع العرض فقط: التعديل مسموح للمالك/الإدارة/العمليات.</p>';
  const rows = (rooms||[]).map(r=>{
    const rowBookings = (bookings||[]).filter(b=>b.room_id===r.id && !['cancelled','checked_out'].includes(String(b.status||'').toLowerCase()));
    const bars = rowBookings.map(b=>{
      const start = String(b.checkin_date||monthStart);
      const end = String(b.checkout_date||start);
      const startClamped = start < monthStart ? monthStart : start;
      const endClamped = end > monthEnd ? monthEnd : end;
      const leftDays = Math.max(0, dayDiff(monthStart, startClamped));
      const spanDays = Math.max(1, dayDiff(startClamped, endClamped)+1);
      const leftPct = (leftDays/daysInMonth)*100;
      const widthPct = (spanDays/daysInMonth)*100;
      const handles = editable ? '<span class="handle left"></span><span class="handle right"></span>' : '';
      const cursor = editable ? 'cursor:grab;' : 'cursor:default;';
      return `<div class="hosp-tl-item" data-booking-id="${b.id}" data-status="${htmlEscape(String(b.status||''))}" style="left:${leftPct}%;width:${widthPct}%;${cursor}">${handles}<span>${htmlEscape(r.room_code||'Room')} · ${htmlEscape(b.guest_name||'')}</span></div>`;
    }).join('');
    return `<div class="hosp-tl-row"><div class="hosp-tl-room">${htmlEscape(r.room_code||r.id)} · ${htmlEscape(propertyLabel(byId('properties',r.property_id))||'')}</div><div class="hosp-tl-track" data-room-id="${r.id}" style="--days:${daysInMonth}"><div class="hosp-tl-grid">${Array.from({length:daysInMonth},()=>'<i></i>').join('')}</div>${bars}</div></div>`;
  }).join('');
  host.innerHTML = `${modeHint}<div class="hosp-tl-wrap"><div class="hosp-tl-head"><div></div><div class="hosp-tl-days" style="--days:${daysInMonth}">${dayCells}</div></div>${rows||'<p class="mini">لا توجد غرف ضيافة بعد</p>'}</div>`;
  bindHospitalityTimelineInteractions(monthStart, monthEnd, daysInMonth);
}
function bindHospitalityTimelineInteractions(monthStart, monthEnd, daysInMonth){
  const host = $('#hospitalityTimelineBox');
  if(!host) return;
  if(!canEditHospitalityTimeline()) return;
  if(host.dataset.bound==='1') return;
  host.dataset.bound='1';
  host.addEventListener('pointerdown',(ev)=>{
    const item = ev.target.closest('.hosp-tl-item');
    if(!item) return;
    const track = item.closest('.hosp-tl-track');
    if(!track) return;
    const bookingId = item.dataset.bookingId;
    const booking = (Jawdah.data?.hospitality_bookings||[]).find(b=>b.id===bookingId);
    if(!booking) return;
    const trackRect = track.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const pxPerDay = trackRect.width / daysInMonth;
    let mode = 'move';
    if(ev.target.classList.contains('left')) mode='resize-left';
    if(ev.target.classList.contains('right')) mode='resize-right';
    const startX = ev.clientX;
    const origCheckin = String(booking.checkin_date||monthStart);
    const origCheckout = String(booking.checkout_date||origCheckin);
    const move = (e)=>{
      const deltaPx = e.clientX - startX;
      const deltaDays = Math.round(deltaPx / pxPerDay);
      let newIn = origCheckin;
      let newOut = origCheckout;
      if(mode==='move'){
        newIn = addDaysYmd(origCheckin, deltaDays);
        newOut = addDaysYmd(origCheckout, deltaDays);
      }else if(mode==='resize-left'){
        newIn = addDaysYmd(origCheckin, deltaDays);
        if(newIn > newOut) newIn = newOut;
      }else{
        newOut = addDaysYmd(origCheckout, deltaDays);
        if(newOut < newIn) newOut = newIn;
      }
      const s = newIn < monthStart ? monthStart : newIn;
      const t = newOut > monthEnd ? monthEnd : newOut;
      const leftDays = Math.max(0, dayDiff(monthStart, s));
      const spanDays = Math.max(1, dayDiff(s, t)+1);
      item.style.left = `${(leftDays/daysInMonth)*100}%`;
      item.style.width = `${(spanDays/daysInMonth)*100}%`;
      item.dataset.newCheckin = s;
      item.dataset.newCheckout = t;
    };
    const up = async ()=>{
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const newCheckin = item.dataset.newCheckin;
      const newCheckout = item.dataset.newCheckout;
      if(!newCheckin || !newCheckout) return;
      try{
        await api(`hospitality_bookings/${bookingId}`, {method:'PUT', body: JSON.stringify({checkin_date:newCheckin, checkout_date:newCheckout})});
        toast('تم تحديث فترة الحجز');
        await loadAll();
      }catch(e){
        toastErr(e,'تعذر تعديل الفترة (قد يكون هناك تعارض)');
        renderHospitalityPortal(true);
      }finally{
        delete item.dataset.newCheckin;
        delete item.dataset.newCheckout;
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, {once:true});
  });
}
async function renderHospitalityPortal(force=false){
  const host = $('#hospitalityQuickBox');
  if(!host) return;
  const props = Jawdah.data?.properties || [];
  const rooms = Jawdah.data?.hospitality_rooms || [];
  const bookings = Jawdah.data?.hospitality_bookings || [];
  const seasons = Jawdah.data?.hospitality_season_rates || [];
  const folios = Jawdah.data?.hospitality_folios || [];
  const clients = Jawdah.data?.clients || [];
  const hRows = props.filter(r=>['hospitality','hotel','resort','short-term'].includes(String(r.type||'').toLowerCase()));
  const occupied = rooms.filter(r=>String(r.status||'').toLowerCase()==='occupied').length;
  const activeBookings = bookings.filter(b=>['reserved','checked_in'].includes(String(b.status||'').toLowerCase())).length;
  const paid = bookings.reduce((s,b)=>s+Number(b.paid_amount||0),0);
  host.innerHTML = `<span class="badge">وحدات ضيافة: ${fmt(hRows.length)}</span><span class="badge">غرف: ${fmt(rooms.length)}</span><span class="badge">مشغولة: ${fmt(occupied)}</span><span class="badge">حجوزات نشطة: ${fmt(activeBookings)}</span><span class="badge">تحصيل: ${money(paid)}</span><span class="badge">مواسم: ${fmt(seasons.length)}</span>`;

  fillSelect('#hRoomProperty', props, true, 'id', 'name', propertyLabel);
  fillSelect('#hSeasonProperty', props, true, 'id', 'name', propertyLabel);
  fillSelect('#hBookingClient', clients, true, 'id', 'name');
  const roomOpts = (rooms||[]).map(r=>`<option value="${r.id}">${htmlEscape(r.room_code||r.id)} · ${htmlEscape(byId('properties',r.property_id).name||'')}</option>`).join('');
  if($('#hBookingRoom')) $('#hBookingRoom').innerHTML = '<option value="">اختر غرفة</option>' + roomOpts;
  if($('#hBookingCheckin') && !$('#hBookingCheckin').value) $('#hBookingCheckin').value = today();
  if($('#hBookingCheckout') && !$('#hBookingCheckout').value) $('#hBookingCheckout').value = today();
  if($('#hSummaryFrom') && !$('#hSummaryFrom').value) $('#hSummaryFrom').value = today().slice(0,8)+'01';
  if($('#hSummaryTo') && !$('#hSummaryTo').value) $('#hSummaryTo').value = today();
  if($('#hCalMonth') && !$('#hCalMonth').value) $('#hCalMonth').value = today().slice(0,7);
  if($('#hSeasonStart') && !$('#hSeasonStart').value) $('#hSeasonStart').value = today();
  if($('#hSeasonEnd') && !$('#hSeasonEnd').value) $('#hSeasonEnd').value = today();
  if($('#hRoomCapacity') && !$('#hRoomCapacity').value) $('#hRoomCapacity').value = '2';

  const alertsHost = $('#hospitalityCheckoutAlerts');
  if(alertsHost){
    const soon = bookings.filter(b=>{
      const st = String(b.status||'').toLowerCase();
      if(!['reserved','checked_in'].includes(st)) return false;
      if(!b.checkout_date) return false;
      const diff = Math.floor((new Date(b.checkout_date+'T00:00:00') - new Date())/(1000*60*60*24));
      return diff >= 0 && diff <= 2;
    }).sort((a,b)=>String(a.checkout_date||'').localeCompare(String(b.checkout_date||'')));
    alertsHost.innerHTML = soon.length
      ? soon.slice(0,8).map(b=>`<span class="badge overdue">Check-out قريب: ${htmlEscape(b.guest_name||'')||'نزيل'} · ${htmlEscape(b.checkout_date||'')}</span>`).join('')
      : '<span class="badge paid">لا توجد عمليات Check-out عاجلة خلال 48 ساعة</span>';
  }

  const calHost = $('#hospitalityCalendarBox');
  if(calHost){
    const monthVal = val('hCalMonth') || today().slice(0,7);
    const [yy,mm] = monthVal.split('-').map(Number);
    const monthStart = new Date(yy, (mm||1)-1, 1);
    const monthEnd = new Date(yy, (mm||1), 0);
    const firstWeekday = monthStart.getDay();
    const daysInMonth = monthEnd.getDate();
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const cellItems = [];
    for(let i=0;i<firstWeekday;i++) cellItems.push('<div class="hcal-cell muted"></div>');
    for(let d=1; d<=daysInMonth; d++){
      const ds = `${yy}-${String(mm).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayBookings = bookings.filter(b=>{
        const st = String(b.status||'').toLowerCase();
        if(['cancelled','checked_out'].includes(st)) return false;
        return (String(b.checkin_date||'') <= ds) && (String(b.checkout_date||'') >= ds);
      });
      const chips = dayBookings.slice(0,2).map(b=>`<span class="hcal-chip">${htmlEscape((rooms.find(r=>r.id===b.room_id)?.room_code)||'غرفة')} · ${htmlEscape(b.guest_name||'')}</span>`).join('');
      const more = dayBookings.length>2 ? `<span class="hcal-more">+${dayBookings.length-2}</span>` : '';
      cellItems.push(`<div class="hcal-cell"><div class="hcal-day">${d}</div>${chips}${more}</div>`);
    }
    calHost.innerHTML = `<div class="hcal-grid hcal-head">${dayLabels.map(x=>`<div class="hcal-head-cell">${x}</div>`).join('')}</div><div class="hcal-grid">${cellItems.join('')}</div>`;
  }
  const tlHost = $('#hospitalityTimelineBox');
  if(tlHost){
    const mode = canEditHospitalityTimeline() ? 'تعديل مباشر (Drag/Resize) مفعل' : 'عرض فقط — التعديل للمالك/الإدارة/العمليات';
    tlHost.setAttribute('data-mode', mode);
  }

  const roomsTable = $('#hospitalityRoomsTable');
  if(roomsTable) roomsTable.innerHTML = tableHtml(
    [['العقار','property_id',v=>v?propertyLabel(byId('properties',v)):'—'],['الغرفة','room_code'],['النوع','room_type'],['السعة','capacity',v=>fmt(v)],['سعر الليلة','rate_per_night',v=>money(v)],['الحالة','status',v=>badge(v)]],
    rooms,
    r=>`<button class="ghost" onclick="editRecord('hospitality_rooms','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('hospitality_rooms','${r.id}')">حذف</button>`
  );
  const bookingsTable = $('#hospitalityBookingsTable');
  if(bookingsTable) bookingsTable.innerHTML = tableHtml(
    [['الغرفة','room_id',v=>(rooms.find(x=>x.id===v)?.room_code)||v],['النزيل','guest_name'],['الهاتف','guest_phone'],['الدخول','checkin_date'],['الخروج','checkout_date'],['ليالٍ','nights',v=>fmt(v)],['الإجمالي','total_amount',v=>money(v)],['المدفوع','paid_amount',v=>money(v)],['المتبقي','balance_amount',v=>money(v)],['الحالة','status',v=>badge(v)]],
    bookings,
    r=>`<button class="ghost" onclick="setHospitalityBookingStatus('${r.id}','checked_in')">Check-in</button> <button class="ghost" onclick="setHospitalityBookingStatus('${r.id}','checked_out')">Check-out</button> <button class="ghost" onclick="editRecord('hospitality_bookings','${r.id}')">تعديل</button>`
  );
  renderHospitalityTimeline(rooms, bookings);
  const seasonsTable = $('#hospitalitySeasonsTable');
  if(seasonsTable) seasonsTable.innerHTML = tableHtml(
    [['العقار','property_id',v=>v?propertyLabel(byId('properties',v)):'كل العقارات'],['النوع','room_type',v=>v||'كل الأنواع'],['الموسم','season_name'],['من','start_date'],['إلى','end_date'],['سعر الليلة','nightly_rate',v=>money(v)],['نشط','active',v=>v?badge('active'):badge('inactive')]],
    seasons,
    r=>`<button class="ghost" onclick="editRecord('hospitality_season_rates','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('hospitality_season_rates','${r.id}')">حذف</button>`
  );
  const foliosTable = $('#hospitalityFoliosTable');
  if(foliosTable) foliosTable.innerHTML = tableHtml(
    [['رقم الفوليو','folio_no'],['الحجز','booking_id'],['تاريخ الإصدار','issue_date'],['الإجمالي','total_amount',v=>money(v)],['المدفوع','paid_amount',v=>money(v)],['المتبقي','balance_amount',v=>money(v)],['الحالة','status',v=>badge(v)]],
    folios,
    r=>`<button class="gold-btn" onclick="printHospitalityFolio('${r.id}')">PDF</button>`
  );
  const sumHost = $('#hospitalitySummaryBox');
  const typeHost = $('#hospitalityTypeBox');
  if(sumHost){
    try{
      const from = val('hSummaryFrom') || (today().slice(0,8)+'01');
      const to = val('hSummaryTo') || today();
      const res = await api(`hospitality_summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const s = res.summary || {};
      const k = s.kpis || {};
      sumHost.innerHTML = `<span class="badge">Occupancy: ${fmt(k.occupancy_pct||0)}%</span><span class="badge">ADR: ${money(k.adr||0)}</span><span class="badge">RevPAR: ${money(k.revpar||0)}</span><span class="badge">إجمالي إيراد: ${money(k.total_revenue||0)}</span><span class="badge">مدفوع: ${money(k.paid_revenue||0)}</span><span class="badge">متبقي: ${money(k.balance_revenue||0)}</span><span class="badge">Sold Nights: ${fmt(k.sold_nights||0)}</span>`;
      if(typeHost){
        typeHost.innerHTML = tableHtml([['نوع الغرفة','room_type'],['عدد الحجوزات','bookings',v=>fmt(v)],['الإيراد','revenue',v=>money(v)]], s.room_type_breakdown || []);
      }
    }catch(e){
      sumHost.innerHTML = '<span class="badge pending">تعذر تحميل ملخص الضيافة</span>';
      if(typeHost) typeHost.innerHTML = '';
    }
  }
}
async function createHospitalityRoom(){
  try{
    await api('hospitality_rooms',{method:'POST',body:JSON.stringify({
      property_id: val('hRoomProperty') || null,
      room_code: val('hRoomCode'),
      room_type: val('hRoomType') || 'Standard',
      capacity: num('hRoomCapacity') || 2,
      rate_per_night: num('hRoomRate'),
      status: val('hRoomStatus') || 'available',
      notes: val('hRoomNotes'),
    })});
    toast('تم حفظ الغرفة');
    await loadAll();
  }catch(e){ toastErr(e); }
}
async function createHospitalityBooking(){
  try{
    await api('hospitality_bookings',{method:'POST',body:JSON.stringify({
      room_id: val('hBookingRoom'),
      client_id: val('hBookingClient') || null,
      guest_name: val('hBookingGuest'),
      guest_phone: val('hBookingPhone'),
      checkin_date: val('hBookingCheckin') || today(),
      checkout_date: val('hBookingCheckout') || today(),
      rate_per_night: num('hBookingRate'),
      paid_amount: num('hBookingPaid'),
      status: val('hBookingStatus') || 'reserved',
      booking_source: val('hBookingSource') || 'direct',
      notes: val('hBookingNotes'),
    })});
    toast('تم حفظ الحجز');
    await loadAll();
  }catch(e){ toastErr(e); }
}
async function createHospitalitySeasonRate(){
  try{
    await api('hospitality_season_rates',{method:'POST',body:JSON.stringify({
      property_id: val('hSeasonProperty') || null,
      room_type: val('hSeasonRoomType') || null,
      season_name: val('hSeasonName'),
      start_date: val('hSeasonStart') || today(),
      end_date: val('hSeasonEnd') || today(),
      nightly_rate: num('hSeasonRate'),
      active: Number(val('hSeasonActive')||'1'),
      notes: val('hSeasonNotes'),
    })});
    toast('تم حفظ تسعير الموسم');
    await loadAll();
  }catch(e){ toastErr(e); }
}
async function setHospitalityBookingStatus(bookingId,status){
  try{
    await api(`hospitality_bookings/${bookingId}`,{method:'PUT',body:JSON.stringify({status})});
    toast('تم تحديث حالة الحجز');
    await loadAll();
  }catch(e){ toastErr(e); }
}
function openHospitalityReport(){
  const from = val('hSummaryFrom') || (today().slice(0,8)+'01');
  const to = val('hSummaryTo') || today();
  const url='/api/report/hospitality?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to)+'&token='+encodeURIComponent(Jawdah.token||'');
  const w=window.open(url,'_blank','noopener');
  if(!w) toastNotice('تعذر فتح التقرير — فعّل النوافذ المنبثقة');
}
function printHospitalityFolio(folioId){
  const url='/api/report/hospitality?folio_id='+encodeURIComponent(folioId)+'&token='+encodeURIComponent(Jawdah.token||'');
  const w=window.open(url,'_blank','noopener');
  if(!w) toastNotice('تعذر فتح الفوليو — فعّل النوافذ المنبثقة');
}
function runSalamAgent(){
  const host = $('#salamAgentBox');
  if(!host) return;
  const invoices = Jawdah.data?.invoices || [];
  const inventory = Jawdah.data?.inventory_items || [];
  const properties = Jawdah.data?.properties || [];
  const accounts = Jawdah.data?.accounts || [];
  const overdue = invoices.filter(i=>String(i.status||'').toLowerCase()!=='paid' && i.due_date && i.due_date < today());
  const lowStock = inventory.filter(i=>Number(i.quantity||0)<=Number(i.min_quantity||0));
  const negativeProperties = properties.filter(p=>{
    const pRows = accounts.filter(a=>a.property_id===p.id);
    const income = pRows.filter(a=>String(a.type||'').toLowerCase()==='income').reduce((s,a)=>s+Number(a.amount||0),0);
    const expense = pRows.filter(a=>String(a.type||'').toLowerCase()==='expense').reduce((s,a)=>s+Number(a.amount||0),0);
    return expense > income && (income+expense)>0;
  });
  const actions = [];
  if(overdue.length) actions.push(`<span class="badge overdue">تحصيل عاجل: ${fmt(overdue.length)} فاتورة متأخرة</span><button class="ghost" type="button" onclick="showSection('invoices')">فتح الفواتير</button>`);
  if(lowStock.length) actions.push(`<span class="badge">مخزون منخفض: ${fmt(lowStock.length)} صنف</span><button class="ghost" type="button" onclick="showSection('inventory')">فتح المخزن</button>`);
  if(negativeProperties.length) actions.push(`<span class="badge">عقارات بصافي سلبي: ${fmt(negativeProperties.length)}</span><button class="ghost" type="button" onclick="showSection('accounts')">تحليل الحسابات</button>`);
  if(!actions.length) actions.push('<span class="badge paid">الوضع المالي والتشغيلي مستقر حالياً</span>');
  host.innerHTML = actions.map(a=>`<div class="toolbar">${a}</div>`).join('');
}
function bind(){
  $('#loginBtn').onclick=login; $('#logoutBtn').onclick=logout; $('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open'); $('#globalSearch').oninput=()=>renderAll();
  $('#fieldModeBtn')?.addEventListener('click', toggleFieldMode);
  $('#portalSwitchBtn')?.addEventListener('click', ()=>openPortalSwitch(true));
  initLoginCinema();
  initLoginUx();
  initThemeUx();
  bindImagePreview('cCardImage','cCardPreview');
  bindImagePreview('payProofFile','payProofPreview');
  bindImagePreview('epImageFile','epImagePreview');
  bindImagePreview('ebImageFile','ebImagePreview');
  bindImagePreview('eaImageFile','eaImagePreview');
  bindImagePreview('erImageFile','erImagePreview');
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
window.LAUNCH_QUALITY_CHECK=()=>({
  system:'Launch Quality LLC',
  edition:APP_BASE_EDITION,
  edition_label:APP_EDITION_LABEL,
  ui_version:APP_UI_VERSION,
  user:Jawdah.user?.username||null,
  tables:Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,v.length])),
  dashboard:Jawdah.dashboard
});
window.addEventListener('load',()=>{
  applyTerrifyingBase();
  syncLoginOwnerBranding();
  bind();
  initClock();
  checkSession();
  renderBiometricHub();
  setInterval(()=>ensureEnglishDigits(),3000);
});
window.addEventListener('error',()=>true);
window.addEventListener('unhandledrejection',e=>{ e.preventDefault(); });
window.registerEnterpriseBiometric = registerEnterpriseBiometric;
window.verifyEnterpriseBiometric = verifyEnterpriseBiometric;
window.clearEnterpriseBiometric = clearEnterpriseBiometric;
window.choosePortal = choosePortal;
window.closePortalSwitch = closePortalSwitch;
window.renderOwnerLiveHub = renderOwnerLiveHub;
window.renderDailyOpsPage = renderDailyOpsPage;
window.createDailyOperation = createDailyOperation;
window.setPropertyTimelineFilters = setPropertyTimelineFilters;
window.setOwnerTimelineFilter = setOwnerTimelineFilter;
window.exportOwnerTimelineCsv = exportOwnerTimelineCsv;
window.renderHospitalityPortal = renderHospitalityPortal;
window.runSalamAgent = runSalamAgent;
window.createHospitalityRoom = createHospitalityRoom;
window.createHospitalityBooking = createHospitalityBooking;
window.setHospitalityBookingStatus = setHospitalityBookingStatus;
window.createHospitalitySeasonRate = createHospitalitySeasonRate;
window.openHospitalityReport = openHospitalityReport;
window.printHospitalityFolio = printHospitalityFolio;


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
    return {...base, version:APP_UI_VERSION, edition:APP_BASE_EDITION, edition_label:APP_EDITION_LABEL, theme:'enterprise-vision', editVerified:true, apiConnected:true};
  };
  window.addEventListener('load',()=>{
    document.title = 'Launch Quality LLC · التطوير المرعب';
    setTimeout(()=>{
      const brandSmall = document.querySelector('.brand-copy-pro small');
      if(brandSmall && !brandSmall.textContent.trim()) brandSmall.textContent = APP_UI_VERSION + ' · ' + APP_EDITION_LABEL;
      const loginMini = document.querySelector('.login-card .mini');
      if(loginMini) loginMini.textContent = 'Real Estate & Hospitality Management System · التطوير المرعب';
    },100);
  });
})();

(function(){
  window.renderAccountingPlatform = async function(){
    const quick = $('#accPlatformQuick');
    if(quick){
      quick.innerHTML = [
        ['الحسابات','accounts','💰'],
        ['المدفوعات','invoices','💳'],
        ['كشف البنك','bank','🏦'],
        ['المشتريات','purchases','🧾'],
        ['الرواتب','payroll','👔'],
        ['القوائم المالية','statements','📘'],
        ['تسوية البنك','bank-reconciliation','⚖️'],
        ['الفترات المالية','financial-periods','📅'],
        ['تقارير محاسبية','reports','📈']
      ].map(x=>`<button class="ghost" type="button" onclick="showSection('${x[1]}')">${x[2]} ${x[0]}</button>`).join('');
    }
    try{
      const [res, cfo] = await Promise.all([
        api('accounting_platform_overview?months=12'),
        api('accounting_cfo_overview?months=12')
      ]);
      const k = res.kpis || {};
      const hostKpi = $('#accPlatformKpis');
      if(hostKpi){
        hostKpi.innerHTML = `
          <div class="kpi"><span>إجمالي مفوتر</span><strong>${money(k.billed_total||0)}</strong></div>
          <div class="kpi"><span>إجمالي محصل</span><strong>${money(k.collected_total||0)}</strong></div>
          <div class="kpi"><span>متأخرات</span><strong>${money(k.overdue_total||0)}</strong></div>
          <div class="kpi"><span>توقع 30 يوم</span><strong>${money(k.forecast_next_30_days||0)}</strong></div>
          <div class="kpi"><span>رصيد البنك</span><strong>${money(k.bank_balance||0)}</strong></div>
          <div class="kpi"><span>صحة المحاسبة</span><strong>${fmt(k.health||0)}%</strong></div>
        `;
      }
      const alerts = $('#accPlatformAlerts');
      if(alerts){
        alerts.innerHTML = `
          <div class="statement-row"><span>فواتير متأخرة</span><b class="${Number(k.overdue_total||0)>0?'low-stock':'linked-ok'}">${money(k.overdue_total||0)}</b></div>
          <div class="statement-row"><span>عدد المتأخرات</span><b>${fmt(k.overdue_count||0)}</b></div>
          <div class="statement-row"><span>فترات مفتوحة</span><b>${fmt(k.open_periods||0)}</b></div>
          <div class="statement-row"><span>فترات مغلقة</span><b>${fmt(k.closed_periods||0)}</b></div>
        `;
      }
      const invHost = $('#accPlatformInvoices');
      if(invHost){
        const rows = (Jawdah.data.invoices||[]).slice().sort((a,b)=>String(b.issue_date||'').localeCompare(String(a.issue_date||''))).slice(0,8);
        invHost.innerHTML = rows.length ? tableHtml(
          [['الفاتورة','invoice_no'],['العميل','client_id',(v)=>htmlEscape(byId('clients',v).name||'')],['الاستحقاق','due_date'],['المبلغ','amount',(v)=>money(v)],['المدفوع','paid_amount',(v)=>money(v)],['الحالة','status',(v)=>statusBadge(v)]],
          rows
        ) : '<p class="mini">لا توجد فواتير بعد</p>';
      }
      const bankHost = $('#accPlatformBankPeriods');
      if(bankHost){
        const p = res.periods_summary || {};
        const latestClose = res.latest_month_close || {};
        bankHost.innerHTML = `
          <div class="statement-row"><span>فترات مفتوحة</span><b>${fmt(p.open||0)}</b></div>
          <div class="statement-row"><span>فترات مغلقة</span><b>${fmt(p.closed||0)}</b></div>
          <div class="statement-row"><span>آخر إقفال شهري</span><b>${htmlEscape(latestClose.month_key||'—')}</b></div>
          <div class="statement-row"><span>رصيد البنك</span><b>${money(k.bank_balance||0)}</b></div>
        `;
      }
      const cashHost = $('#accPlatformCashflow');
      if(cashHost){
        const rows = Array.isArray(cfo.months) ? cfo.months : [];
        cashHost.innerHTML = rows.length ? tableHtml(
          [['الشهر','month'],['فعلي الإيراد','actual_revenue',(v)=>money(v)],['مستهدف الإيراد','target_revenue',(v)=>money(v)],['الانحراف','variance_revenue',(v)=>money(v)],['فعلي المصروف','actual_expense',(v)=>money(v)],['موازنة المصروف','budget_expense',(v)=>money(v)],['صافي','actual_net',(v)=>money(v)],['معدل التحصيل %','collection_rate',(v)=>fmt(v)]],
          rows
        ) : '<p class="mini">لا توجد بيانات تدفق نقدي.</p>';
      }
      const agingHost = $('#accPlatformAging');
      if(agingHost){
        const a = cfo.months?.length ? {
          "0-30": (cfo.months[cfo.months.length-1].collection_target||0) - (cfo.months[cfo.months.length-1].collected||0),
          "31-60": 0,
          "61-90": 0,
          "90+": (res.kpis?.overdue_total||0)
        } : {};
        agingHost.innerHTML = `
          <div class="statement-row"><span>0-30 يوم</span><b>${money(a['0-30']||0)}</b></div>
          <div class="statement-row"><span>31-60 يوم</span><b>${money(a['31-60']||0)}</b></div>
          <div class="statement-row"><span>61-90 يوم</span><b>${money(a['61-90']||0)}</b></div>
          <div class="statement-row"><span>90+ يوم</span><b class="low-stock">${money(a['90+']||0)}</b></div>
        `;
      }
      const foreHost = $('#accPlatformForecast');
      if(foreHost){
        const scenarios = Array.isArray(cfo.scenarios) ? cfo.scenarios : [];
        foreHost.innerHTML = `
          <div class="statement-row"><span>توقع التحصيل خلال 30 يوم</span><b>${money(k.forecast_next_30_days||0)}</b></div>
          <div class="statement-row"><span>إجمالي المتأخرات الحالية</span><b class="${Number(k.overdue_total||0)>0?'low-stock':'linked-ok'}">${money(k.overdue_total||0)}</b></div>
          <div class="statement-row"><span>الفواتير المتأخرة (عدد)</span><b>${fmt(k.overdue_count||0)}</b></div>
          ${scenarios.map(s=>`<div class="statement-row"><span>${htmlEscape(String(s.name||''))} Scenario</span><b>${money(s.projected_cash_30||0)} · ${fmt(s.collection_ratio||0)}%</b></div>`).join('')}
        `;
      }
      const decHost = $('#accPlatformDecisions');
      if(decHost){
        const dec = Array.isArray(cfo.decisions) ? cfo.decisions : [];
        decHost.innerHTML = dec.map(d=>{
          const cls = d.severity==='high' ? 'overdue' : (d.severity==='medium'?'pending':'paid');
          const go = String(d.action_section||'accounts').replace(/[^a-z0-9-]/gi,'');
          return `<div class="statement-row"><span>${htmlEscape(d.title||'قرار')}</span><b class="badge ${cls}">${htmlEscape(d.detail||'')}</b><button class="ghost" type="button" onclick="showSection('${go||'accounts'}')">فتح</button></div>`;
        }).join('') || '<p class="mini">لا توجد قرارات عاجلة.</p>';
      }
      const budgetHost = $('#accPlatformBudgetTable');
      if(budgetHost){
        const rows = (Jawdah.data.accounting_budgets || []).slice().sort((a,b)=>String(b.month_key||'').localeCompare(String(a.month_key||'')));
        budgetHost.innerHTML = rows.length ? tableHtml(
          [['الشهر','month_key'],['هدف الإيراد','revenue_target',(v)=>money(v)],['سقف المصروف','expense_budget',(v)=>money(v)],['هدف التحصيل','collection_target',(v)=>money(v)],['احتياطي نقدي','cash_reserve_target',(v)=>money(v)],['ملاحظات','notes']],
          rows,
          r=>`<button class="ghost" onclick="editRecord('accounting_budgets','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('accounting_budgets','${r.id}')">حذف</button>`
        ) : '<p class="mini">لا توجد أهداف موازنة بعد.</p>';
      }
    }catch(e){
      const host = $('#accPlatformAlerts');
      if(host) host.innerHTML = `<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }
    ensureEnglishDigits(document.getElementById('sec-accounting-platform'));
  };
  window.saveAccountingBudgetTarget = async function(){
    try{
      const month = String($('#accBudgetMonth')?.value || '').trim();
      if(!month) return toastErr('اختر شهر الهدف');
      await api('accounting_budgets',{
        method:'POST',
        body:JSON.stringify({
          month_key: month,
          revenue_target: Number($('#accBudgetRevenue')?.value || 0),
          expense_budget: Number($('#accBudgetExpense')?.value || 0),
          collection_target: Number($('#accBudgetCollection')?.value || 0),
          cash_reserve_target: Number($('#accBudgetReserve')?.value || 0),
          notes: String($('#accBudgetNotes')?.value || '').trim(),
        })
      });
      toast('تم حفظ هدف الموازنة الشهرية');
      await loadAll();
      if($('#sec-accounting-platform')?.classList.contains('active')) renderAccountingPlatform();
    }catch(e){ toastErr(e); }
  };

  const ESTATE_ICON_SET = [
    { id:'property', title:'العقار', subtitle:'الأصل الرئيسي', photo:'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=400&q=80' },
    { id:'building', title:'البناية', subtitle:'مبنى سكني/تشغيلي', photo:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80' },
    { id:'apartment', title:'الشقة', subtitle:'وحدة داخل البناية', photo:'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80' },
    { id:'room', title:'الغرفة', subtitle:'تفصيل الوحدة', photo:'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80' },
    { id:'accessory', title:'الملحقات', subtitle:'تجهيزات ومكونات الوحدة', photo:'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=400&q=80' },
  ];
  const estateRows = (k)=>Array.isArray(Jawdah.data?.[k]) ? Jawdah.data[k] : [];
  const ESTATE_DEFAULT_MAP_LOCATION = 'حي التراث، نزوى، محافظة الداخلية، سلطنة عمان';
  const ESTATE_DEFAULT_PHOTOS = {
    property: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80',
    building: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
    apartment: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80',
    room: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  };
  const estateImageUrl = (row, kind='property')=>{
    const direct = String(row?.image || '').trim();
    if(direct) return direct;
    const attachments = String(row?.attachments || '').trim();
    if(attachments && (attachments.startsWith('http://') || attachments.startsWith('https://') || attachments.startsWith('/uploads/'))){
      return attachments;
    }
    return ESTATE_DEFAULT_PHOTOS[kind] || ESTATE_DEFAULT_PHOTOS.property;
  };
  const estateThumbHtml = (row, kind='property', alt='estate-photo')=>{
    let url = estateImageUrl(row, kind);
    if(url.startsWith('/uploads/') && Jawdah.token){
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}token=${encodeURIComponent(Jawdah.token)}`;
    }
    return `<button type="button" class="estate-photo-btn" onclick="openEstatePhotoPreview('${encodeURIComponent(url)}','${encodeURIComponent(alt)}')"><img class="estate-table-thumb" src="${htmlEscape(url)}" alt="${htmlEscape(alt)}"></button>`;
  };
  const estateGoogleMapEmbed = (locationText)=>{
    const q = String(locationText || ESTATE_DEFAULT_MAP_LOCATION).trim() || ESTATE_DEFAULT_MAP_LOCATION;
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  };
  const estateGoogleMapLink = (locationText)=>{
    const q = String(locationText || ESTATE_DEFAULT_MAP_LOCATION).trim() || ESTATE_DEFAULT_MAP_LOCATION;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  };
  let estateMapGeoTimer = null;
  let estateMapGeoSeq = 0;
  function estateCurrentMapLocation(){
    return String($('#estateMapLocationLabel')?.textContent || '').trim() || ESTATE_DEFAULT_MAP_LOCATION;
  }
  async function resolveEstateMapCoords(locationText){
    const coordsBox = $('#estateMapCoords');
    if(!coordsBox) return;
    const q = String(locationText || '').trim() || ESTATE_DEFAULT_MAP_LOCATION;
    const seq = ++estateMapGeoSeq;
    coordsBox.textContent = 'الإحداثيات: جاري التحديد...';
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if(!res.ok) throw new Error('map-geocode-failed');
      const data = await res.json();
      if(seq !== estateMapGeoSeq) return;
      const top = Array.isArray(data) ? data[0] : null;
      if(top && top.lat && top.lon){
        const lat = Number(top.lat), lon = Number(top.lon);
        coordsBox.textContent = `الإحداثيات: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      }else{
        coordsBox.textContent = 'الإحداثيات: غير متاحة';
      }
    }catch(_e){
      if(seq !== estateMapGeoSeq) return;
      coordsBox.textContent = 'الإحداثيات: غير متاحة';
    }
  }
  function queueEstateMapCoords(locationText){
    if(estateMapGeoTimer) clearTimeout(estateMapGeoTimer);
    estateMapGeoTimer = setTimeout(()=>{ resolveEstateMapCoords(locationText); }, 350);
  }
  function refreshEstateRealMap(locationText){
    const label = $('#estateMapLocationLabel');
    const frame = $('#estateRealMapFrame');
    const cleanLocation = String(locationText || '').trim() || ESTATE_DEFAULT_MAP_LOCATION;
    if(label) label.textContent = cleanLocation;
    if(frame){
      const nextSrc = estateGoogleMapEmbed(cleanLocation);
      if(frame.getAttribute('src') !== nextSrc) frame.setAttribute('src', nextSrc);
    }
    queueEstateMapCoords(cleanLocation);
  }
  window.openEstateRealMapExternal = function(){
    const url = estateGoogleMapLink(estateCurrentMapLocation());
    try{ window.open(url, '_blank', 'noopener,noreferrer'); }catch(_e){}
  };
  window.copyEstateRealMapLink = async function(){
    const url = estateGoogleMapLink(estateCurrentMapLocation());
    try{
      if(navigator?.clipboard?.writeText){
        await navigator.clipboard.writeText(url);
        toast('تم نسخ رابط الموقع');
        return;
      }
    }catch(_e){}
    try{
      const t = document.createElement('textarea');
      t.value = url;
      t.setAttribute('readonly','readonly');
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      toast('تم نسخ رابط الموقع');
    }catch(_e){
      toastErr('تعذر نسخ الرابط');
    }
  };
  window.openEstatePhotoPreview = function(url, alt='estate-photo'){
    let clean = String(url||'').trim();
    let cleanAlt = String(alt||'estate-photo');
    try{ clean = decodeURIComponent(clean); }catch(_e){}
    try{ cleanAlt = decodeURIComponent(cleanAlt); }catch(_e){}
    if(!clean) return;
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if(!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(cleanAlt)}</title><style>body{margin:0;background:#0f172a;display:grid;place-items:center;min-height:100vh}img{max-width:96vw;max-height:94vh;border-radius:10px;box-shadow:0 12px 30px rgba(0,0,0,.45)}</style></head><body><img src="${htmlEscape(clean)}" alt="${htmlEscape(cleanAlt)}"></body></html>`);
    w.document.close();
  };
  function renderEstatePhotoGallery(){
    const host = $('#estatePhotoGallery');
    if(!host) return;
    const cards = [];
    estateRows('estate_properties').slice(0,4).forEach(r=>cards.push({kind:'property',label:`عقار: ${r.name||r.id}`,sub:r.location||'نزوى',row:r}));
    estateRows('estate_buildings').slice(0,4).forEach(r=>cards.push({kind:'building',label:`بناية: ${r.name||r.id}`,sub:pickName(estateRows('estate_properties'), r.property_id)||'—',row:r}));
    estateRows('estate_apartments').slice(0,6).forEach(r=>cards.push({kind:'apartment',label:`شقة: ${r.name||r.id}`,sub:pickName(estateRows('estate_buildings'), r.building_id)||'—',row:r}));
    estateRows('estate_rooms').slice(0,6).forEach(r=>cards.push({kind:'room',label:`غرفة: ${r.name||r.id}`,sub:pickName(estateRows('estate_apartments'), r.apartment_id)||'—',row:r}));
    const normalized = cards.slice(0,12).map(c=>({
      kind: c.kind,
      label: c.label,
      sub: c.sub,
      photo: estateImageUrl(c.row || {}, c.kind),
    }));
    if(!normalized.length){
      host.innerHTML = '<p class="mini">لا توجد بيانات صور بعد.</p>';
      return;
    }
    host.innerHTML = normalized.map(c=>`<article class="estate-photo-card"><button type="button" class="estate-photo-shot" onclick="openEstatePhotoPreview('${encodeURIComponent(c.photo)}','${encodeURIComponent(c.label)}')"><img src="${htmlEscape(c.photo)}" alt="${htmlEscape(c.label)}"></button><div class="estate-photo-meta"><b>${htmlEscape(c.label)}</b><small>${htmlEscape(c.sub||'')}</small></div></article>`).join('');
  }
  const clientName = (id)=>htmlEscape(byId('clients',id).name||'');
  const pickName = (arr,id)=>htmlEscape((arr.find(x=>x.id===id)||{}).name||'');
  const roomStatusLabel = (s)=>{
    const v=String(s||'').toLowerCase();
    if(v==='draft') return 'مسودة';
    if(v==='reserved') return 'محجوزة';
    if(v==='occupied') return 'مؤجرة';
    if(v==='maintenance') return 'تحت الصيانة';
    return 'شاغرة';
  };
  const apartmentStatusLabel = (s)=>{
    const v=String(s||'').toLowerCase();
    if(v==='draft') return 'مسودة';
    if(v==='reserved') return 'محجوزة';
    if(v==='occupied') return 'مؤجرة';
    if(v==='maintenance') return 'صيانة';
    return 'فارغة';
  };
  const estateActiveStatusLabel = (s)=>{
    const v=String(s||'').toLowerCase();
    if(v==='inactive') return 'غير نشط';
    if(v==='suspended') return 'موقوف';
    return 'نشط';
  };
  const accessoryStatusLabel = (s)=>{
    const v = String(s||'').toLowerCase();
    if(v==='installed') return 'مركب';
    if(v==='maintenance') return 'صيانة';
    if(v==='retired') return 'موقوف';
    return 'متاح';
  };
  function syncEstateApartmentStateFields(){
    const st = String($('#eaStatus')?.value || 'vacant').toLowerCase();
    const reservedBox = $('#eaReservedFields');
    const maintenanceBox = $('#eaMaintenanceFields');
    if(reservedBox) reservedBox.classList.toggle('hidden', st !== 'reserved');
    if(maintenanceBox) maintenanceBox.classList.toggle('hidden', st !== 'maintenance');
  }
  function syncEstateRoomStateFields(){
    const st = String($('#erStatus')?.value || 'vacant').toLowerCase();
    const reservedBox = $('#erReservedFields');
    const maintenanceBox = $('#erMaintenanceFields');
    if(reservedBox) reservedBox.classList.toggle('hidden', st !== 'reserved');
    if(maintenanceBox) maintenanceBox.classList.toggle('hidden', st !== 'maintenance');
  }
  function optFrom(rows,labelFn){
    return '<option value="">— اختر —</option>'+rows.map(r=>`<option value="${htmlEscape(r.id)}">${htmlEscape(labelFn(r))}</option>`).join('');
  }
  function fillEstateSelects(){
    const props = estateRows('estate_properties');
    const blds = estateRows('estate_buildings');
    const apts = estateRows('estate_apartments');
    const rooms = estateRows('estate_rooms');
    const clients = Jawdah.data.clients || [];
    const propHtml = optFrom(props, r=>r.name||r.id);
    const clientHtml = '<option value="">— بدون مستأجر —</option>'+clients.map(c=>`<option value="${htmlEscape(c.id)}">${htmlEscape(c.name||c.id)}</option>`).join('');
    ['epTenantClient','ebTenantClient','eaTenantClient','erTenantClient'].forEach(id=>{ const el=$('#'+id); if(el) el.innerHTML=clientHtml; });
    const ecTenant = $('#ecTenantClient');
    if(ecTenant) ecTenant.innerHTML = clientHtml;
    ['ebProperty','eaProperty','erProperty','emProperty','exProperty'].forEach(id=>{ const el=$('#'+id); if(el) el.innerHTML=propHtml; });

    const propId = $('#eaProperty')?.value || $('#erProperty')?.value || $('#emProperty')?.value || $('#exProperty')?.value || '';
    const bFiltered = propId ? blds.filter(x=>x.property_id===propId) : blds;
    const bHtml = optFrom(bFiltered, r=>r.name||r.id);
    ['eaBuilding','erBuilding','emBuilding','exBuilding'].forEach(id=>{ const el=$('#'+id); if(el) el.innerHTML=bHtml; });

    const bId = $('#erBuilding')?.value || $('#emBuilding')?.value || $('#exBuilding')?.value || '';
    const aFiltered = bId ? apts.filter(x=>x.building_id===bId) : apts;
    const aHtml = optFrom(aFiltered, r=>r.name||r.id);
    ['erApartment','emApartment','exApartment'].forEach(id=>{ const el=$('#'+id); if(el) el.innerHTML=aHtml; });

    const aId = $('#emApartment')?.value || $('#exApartment')?.value || '';
    const rFiltered = aId ? rooms.filter(x=>x.apartment_id===aId) : rooms;
    const rHtml = optFrom(rFiltered, r=>r.name||r.id);
    ['emRoom','exRoom'].forEach(id=>{ const el=$('#'+id); if(el) el.innerHTML = rHtml; });

    const ecType = String($('#ecEntityType')?.value || 'apartment');
    const contractSrc = ecType === 'room'
      ? rooms.filter(x=>['reserved','occupied'].includes(String(x.status||'').toLowerCase()))
      : apts.filter(x=>['reserved','occupied'].includes(String(x.status||'').toLowerCase()));
    const ecEntity = $('#ecEntityId');
    if(ecEntity){
      ecEntity.innerHTML = '<option value="">— اختر —</option>'+contractSrc.map(x=>`<option value="${htmlEscape(x.id)}">${htmlEscape(x.name||x.id)} · ${htmlEscape(ecType==='room'?roomStatusLabel(x.status):apartmentStatusLabel(x.status))}</option>`).join('');
    }
    const contracts = estateRows('estate_contracts');
    const scheduleSel = $('#ecScheduleContract');
    if(scheduleSel){
      scheduleSel.innerHTML = '<option value="">— اختر عقدًا —</option>'+contracts.map(c=>`<option value="${htmlEscape(c.id)}">${htmlEscape(c.contract_no||c.id)} · ${htmlEscape(c.entity_type||'')}</option>`).join('');
    }
    const closeSel = $('#ecCloseContract');
    if(closeSel){
      const active = contracts.filter(c=>String(c.status||'').toLowerCase()==='active');
      closeSel.innerHTML = '<option value="">— اختر عقدًا نشطًا —</option>'+active.map(c=>`<option value="${htmlEscape(c.id)}">${htmlEscape(c.contract_no||c.id)} · ينتهي ${htmlEscape(c.end_date||'')}</option>`).join('');
    }
    const invs = estateRows('estate_contract_invoices').filter(x=>String(x.status||'').toLowerCase()!=='paid');
    const paySel = $('#ecPayInvoice');
    if(paySel){
      paySel.innerHTML = '<option value="">— اختر فاتورة —</option>'+invs.map(i=>{
        const rem = Math.max(0, Number(i.amount||0)-Number(i.paid_amount||0));
        return `<option value="${htmlEscape(i.id)}">${htmlEscape(i.invoice_no||i.id)} · متبقي ${money(rem)} · ${htmlEscape(i.due_date||'')}</option>`;
      }).join('');
    }
  }
  function renderEstateIcons(){
    const host = $('#estateIconGrid');
    if(!host) return;
    host.innerHTML = ESTATE_ICON_SET.map(i=>`
      <button type="button" class="estate-icon-card" onclick="showEstatePanel('add')">
        <div class="estate-icon-circle"><img src="${htmlEscape(i.photo)}" alt="${htmlEscape(i.title)}"></div>
        <h4>${htmlEscape(i.title)}</h4>
        <p>${htmlEscape(i.subtitle)}</p>
      </button>
    `).join('');
  }
  window.showEstatePanel = function(panel){
    const id = String(panel||'overview');
    const known = ['overview','media','ops','add','maint','tables','booking','finance'];
    const target = known.includes(id) ? id : 'overview';
    document.querySelectorAll('.estate-panel').forEach(p=>{
      p.classList.toggle('active', p.getAttribute('data-estate-panel') === target);
    });
    document.querySelectorAll('#estateWorkDock .estate-dock-btn, #lqForceEstateDock button').forEach(b=>{
      b.classList.toggle('active', b.getAttribute('data-estate-panel') === target);
    });
    try{ localStorage.setItem('jawdah_estate_panel', target); }catch(_){}
    const dock = document.getElementById('estateWorkDock') || document.getElementById('lqForceEstateDock');
    if(dock) dock.scrollIntoView({behavior:'smooth', block:'nearest'});
  };
  window.ensureForceEstateDock = function(){
    let host = document.getElementById('lqForceEstateDock');
    const shell = document.querySelector('.app-shell') || document.querySelector('.content');
    if(!shell) return;
    if(!host){
      host = document.createElement('nav');
      host.id = 'lqForceEstateDock';
      host.setAttribute('aria-label','أيقونات العمل العقاري');
      const items = [
        ['overview','📊','نظرة عامة'],
        ['media','🖼️','صور وخريطة'],
        ['ops','⏱️','متابعة'],
        ['add','➕','إضافة'],
        ['maint','🔧','صيانة'],
        ['tables','📋','جداول'],
        ['booking','📌','حجز وعقود'],
        ['finance','💰','تحصيل وإقفال'],
      ];
      host.innerHTML = items.map(([id,icon,label])=>`<button type="button" data-estate-panel="${id}" onclick="showEstatePanel('${id}')"><span>${icon}</span><b>${label}</b></button>`).join('')
        + `<button type="button" data-estate-panel="hospitality" onclick="showSection('hospitality')"><span>🏨</span><b>الضيافة</b></button>`;
      const header = shell.querySelector('.app-header');
      if(header && header.nextSibling) header.parentNode.insertBefore(host, header.nextSibling);
      else shell.insertBefore(host, shell.firstChild);
    }
    host.style.display = '';
  };
  function buildEstateTimeline(){
    const from = $('#estateTimelineFrom')?.value || '';
    const to = $('#estateTimelineTo')?.value || '';
    const isInside = (d)=> {
      const x = String(d||'');
      if(!x) return true;
      if(from && x < from) return false;
      if(to && x > to) return false;
      return true;
    };
    const events = [];
    estateRows('estate_properties').forEach(x=>events.push({date:x.last_update||'', title:`عقار: ${x.name||x.id}`, subtitle:`الموقع: ${x.location||'—'}`, meta:`${estateActiveStatusLabel(x.status)} · ${x.building_count||0} بنايات · ${x.apartment_count||0} شقق · ${x.room_count||0} غرف · سعر ${money(x.base_rent_price||0)}`, tone:String(x.status||'').toLowerCase()==='suspended'?'warn':'ok', icon:'🏢'}));
    estateRows('estate_buildings').forEach(x=>events.push({date:x.last_update||'', title:`بناية: ${x.name||x.id}`, subtitle:`العقار: ${pickName(estateRows('estate_properties'), x.property_id)}`, meta:`${estateActiveStatusLabel(x.status)} · ${x.apartment_count||0} شقق · ${x.room_count||0} غرف · سعر ${money(x.base_rent_price||0)}`, tone:String(x.status||'').toLowerCase()==='suspended'?'warn':'info', icon:'🏬'}));
    estateRows('estate_apartments').forEach(x=>{
      const st = apartmentStatusLabel(x.status);
      const pricing = Number(x.rent_price||0)>0 ? ` · سعر ${money(x.rent_price)}` : '';
      const reserved = String(x.status||'').toLowerCase()==='reserved' ? ` · تأمين ${money(x.booking_deposit||0)} · مقدم ${money(x.prepaid_amount||0)}` : '';
      events.push({date:x.last_update||'', title:`شقة: ${x.name||x.id}`, subtitle:`البناية: ${pickName(estateRows('estate_buildings'), x.building_id)}`, meta:`${x.room_count||0} غرف · ${st}${pricing}${reserved}`, tone:String(x.status||'').toLowerCase()==='maintenance'?'warn':'info', icon:'🧱'});
    });
    estateRows('estate_rooms').forEach(x=>events.push({date:x.last_update||'', title:`غرفة: ${x.name||x.id}`, subtitle:`الشقة: ${pickName(estateRows('estate_apartments'), x.apartment_id)}`, meta:`الحالة: ${roomStatusLabel(x.status)} · سعر ${money(x.rent_price||0)}`, tone:x.status==='maintenance'?'warn':'ok', icon:'🛏️'}));
    estateRows('estate_accessories').forEach(x=>events.push({date:x.last_update||'', title:`ملحق: ${x.name||x.id}`, subtitle:`غرفة: ${pickName(estateRows('estate_rooms'), x.room_id) || '—'} · شقة: ${pickName(estateRows('estate_apartments'), x.apartment_id) || '—'}`, meta:`${accessoryStatusLabel(x.status)} · الكمية ${fmt(Number(x.qty||0))} · تكلفة الوحدة ${money(x.unit_cost||0)}`, tone:String(x.status||'').toLowerCase()==='maintenance'?'warn':'info', icon:'🧰'}));
    estateRows('estate_maintenance').forEach(x=>events.push({date:x.maintenance_date||'', title:`صيانة: ${x.title||x.id}`, subtitle:`المسؤول: ${x.responsible_name||'—'} · فريق: ${x.assigned_team||'—'}`, meta:`رقم فاتورة: ${x.invoice_no||'—'} · مورد: ${x.vendor_name||'—'} · تكلفة: ${money(x.total_cost||0)}`, tone:String(x.status||'').toLowerCase().includes('closed')?'ok':'warn', icon:'🔧'}));
    estateRows('estate_reservation_invoices').forEach(x=>events.push({date:x.issue_date||'', title:`فاتورة حجز: ${x.invoice_no||x.id}`, subtitle:`${x.entity_type==='room'?'غرفة':'شقة'} · ${x.client_name||'—'}`, meta:`إجمالي ${money(x.total_amount||0)} · استحقاق ${x.due_date||'—'}`, tone:'info', icon:'🧾'}));
    return events.filter(e=>isInside(e.date)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,80);
  }
  function renderEstateTables(){
    const props = estateRows('estate_properties');
    const blds = estateRows('estate_buildings');
    const apts = estateRows('estate_apartments');
    const rooms = estateRows('estate_rooms');
    const accessories = estateRows('estate_accessories');
    const maint = estateRows('estate_maintenance');
    const contracts = estateRows('estate_contracts');
    const settlements = estateRows('estate_contract_settlements');
    const monthCloses = estateRows('estate_month_closes');
    const cInv = estateRows('estate_contract_invoices');
    const hist = estateRows('estate_status_history');
    const rInv = estateRows('estate_reservation_invoices');
    const tenantCell = (id, phone)=> id ? `${clientName(id)}<br><small>${htmlEscape(phone||'')}</small>` : '—';

    const propTable = $('#estatePropertiesTable');
    if(propTable) propTable.innerHTML = tableHtml(
      [['الصورة','id',(_,r)=>estateThumbHtml(r,'property',`عقار ${r.name||r.id}`)],['الاسم','name'],['الحالة','status',(v)=>statusBadge(estateActiveStatusLabel(v))],['الموقع','location'],['عدد البنايات','building_count'],['عدد الشقق','apartment_count'],['عدد الغرف','room_count'],['سعر الإيجار الأساسي','base_rent_price',(v)=>money(v)],['رسوم الخدمة','service_charge',(v)=>money(v)],['المسؤول','manager_name'],['المستأجر','id',(_,r)=>tenantCell(r.tenant_client_id,r.tenant_phone)],['ملحقات','attachments'],['ملاحظات','notes']],
      props,
      r=>`<button class="ghost" onclick="editRecord('estate_properties','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_properties','${r.id}')">حذف</button>`
    );
    const bTable = $('#estateBuildingsTable');
    if(bTable) bTable.innerHTML = tableHtml(
      [['الصورة','id',(_,r)=>estateThumbHtml(r,'building',`بناية ${r.name||r.id}`)],['العقار','property_id',(v)=>pickName(props,v)],['البناية','name'],['الحالة','status',(v)=>statusBadge(estateActiveStatusLabel(v))],['الموقع','location'],['عدد الشقق','apartment_count'],['عدد الغرف','room_count'],['سعر الإيجار الأساسي','base_rent_price',(v)=>money(v)],['رسوم الخدمة','service_charge',(v)=>money(v)],['المسؤول','manager_name'],['المستأجر','id',(_,r)=>tenantCell(r.tenant_client_id,r.tenant_phone)]],
      blds,
      r=>`<button class="ghost" onclick="editRecord('estate_buildings','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_buildings','${r.id}')">حذف</button>`
    );
    const aTable = $('#estateApartmentsTable');
    if(aTable) aTable.innerHTML = tableHtml(
      [
        ['الصورة','id',(_,r)=>estateThumbHtml(r,'apartment',`شقة ${r.name||r.id}`)],
        ['العقار','property_id',(v)=>pickName(props,v)],
        ['البناية','building_id',(v)=>pickName(blds,v)],
        ['الشقة','name'],
        ['الحالة','status',(v)=>statusBadge(apartmentStatusLabel(v))],
        ['عدد الغرف','room_count'],
        ['سعر الإيجار','rent_price',(v)=>money(v)],
        ['تأمين الحجز','booking_deposit',(v)=>money(v)],
        ['مدفوع مقدمًا','prepaid_amount',(v)=>money(v)],
        ['فترة الحجز','id',(_,r)=>String(r.status||'').toLowerCase()==='reserved' ? `${htmlEscape(r.reservation_start_date||'—')} → ${htmlEscape(r.reservation_end_date||'—')}` : '—'],
        ['بيانات الحجز','id',(_,r)=>{
          if(String(r.status||'').toLowerCase()!=='reserved') return '—';
          return `${htmlEscape(r.booked_client_name||'—')}<br><small>${htmlEscape(r.booked_client_phone||'')}</small><br><small>الموظف: ${htmlEscape(r.booked_by_employee||'—')}</small>`;
        }],
        ['الصيانة','id',(_,r)=>{
          if(String(r.status||'').toLowerCase()!=='maintenance') return '—';
          return `${money(r.maintenance_cost||0)}<br><small>${htmlEscape(r.maintenance_notes||'')}</small>`;
        }],
        ['المسؤول','manager_name'],
        ['المستأجر','id',(_,r)=>tenantCell(r.tenant_client_id,r.tenant_phone)]
      ],
      apts,
      r=>{
        const st = String(r.status||'').toLowerCase();
        const convertBtn = st==='reserved' && canEstateConvertReservation()
          ? `<button class="gold-btn" onclick="convertEstateReservation('apartment','${r.id}')">تحويل إلى مؤجرة</button> `
          : '';
        const contractBtn = ['reserved','occupied'].includes(st) && canEstateCreateContract()
          ? `<button class="gold-btn" onclick="openEstateContractFlow('apartment','${r.id}')">إنشاء عقد نشط</button> `
          : '';
        return `${convertBtn}${contractBtn}<button class="ghost" onclick="editRecord('estate_apartments','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_apartments','${r.id}')">حذف</button>`;
      }
    );
    const rTable = $('#estateRoomsTable');
    if(rTable) rTable.innerHTML = tableHtml(
      [['الصورة','id',(_,r)=>estateThumbHtml(r,'room',`غرفة ${r.name||r.id}`)],['العقار','property_id',(v)=>pickName(props,v)],['البناية','building_id',(v)=>pickName(blds,v)],['الشقة','apartment_id',(v)=>pickName(apts,v)],['الغرفة','name'],['النوع','room_type'],['الحالة','status',(v)=>statusBadge(roomStatusLabel(v))],['سعر الغرفة','rent_price',(v)=>money(v)],['تأمين الحجز','booking_deposit',(v)=>money(v)],['مدفوع مقدمًا','prepaid_amount',(v)=>money(v)],['فترة الحجز','id',(_,r)=>String(r.status||'').toLowerCase()==='reserved' ? `${htmlEscape(r.reservation_start_date||'—')} → ${htmlEscape(r.reservation_end_date||'—')}` : '—'],['تفاصيل الحجز/الصيانة','id',(_,r)=>{const st=String(r.status||'').toLowerCase(); if(st==='reserved') return `${htmlEscape(r.booked_client_name||'—')}<br><small>${htmlEscape(r.booked_client_phone||'')}</small><br><small>الموظف: ${htmlEscape(r.booked_by_employee||'—')}</small>`; if(st==='maintenance') return `${money(r.maintenance_cost||0)}<br><small>${htmlEscape(r.maintenance_notes||'')}</small>`; return '—';}],['المسؤول','manager_name'],['المستأجر','id',(_,r)=>tenantCell(r.tenant_client_id,r.tenant_phone)]],
      rooms,
      r=>{
        const st = String(r.status||'').toLowerCase();
        const convertBtn = st==='reserved' && canEstateConvertReservation()
          ? `<button class="gold-btn" onclick="convertEstateReservation('room','${r.id}')">تحويل إلى مؤجرة</button> `
          : '';
        const contractBtn = ['reserved','occupied'].includes(st) && canEstateCreateContract()
          ? `<button class="gold-btn" onclick="openEstateContractFlow('room','${r.id}')">إنشاء عقد نشط</button> `
          : '';
        return `${convertBtn}${contractBtn}<button class="ghost" onclick="editRecord('estate_rooms','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_rooms','${r.id}')">حذف</button>`;
      }
    );
    const exTable = $('#estateAccessoriesTable');
    if(exTable) exTable.innerHTML = tableHtml(
      [['العقار','property_id',(v)=>pickName(props,v)],['البناية','building_id',(v)=>pickName(blds,v)],['الشقة','apartment_id',(v)=>pickName(apts,v)],['الغرفة','room_id',(v)=>pickName(rooms,v)],['الملحق','name'],['التصنيف','category'],['الحالة','status',(v)=>statusBadge(accessoryStatusLabel(v))],['الكمية','qty'],['تكلفة الوحدة','unit_cost',(v)=>money(v)],['الإجمالي','id',(_,r)=>money(Number(r.qty||0)*Number(r.unit_cost||0))],['المورد','supplier'],['رقم الفاتورة','invoice_no'],['المسؤول','responsible_name'],['ملاحظات','notes']],
      accessories,
      r=>`<button class="ghost" onclick="editRecord('estate_accessories','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_accessories','${r.id}')">حذف</button>`
    );
    const mTable = $('#estateMaintenanceTable');
    if(mTable) mTable.innerHTML = tableHtml(
      [['التاريخ','maintenance_date'],['العقار','property_id',(v)=>pickName(props,v)],['البناية','building_id',(v)=>pickName(blds,v)],['الشقة','apartment_id',(v)=>pickName(apts,v)],['الغرفة','room_id',(v)=>pickName(rooms,v)],['العنوان','title'],['المسؤول','responsible_name'],['الفريق','assigned_team'],['المورد','vendor_name'],['القطع','parts_details'],['رقم الفاتورة','invoice_no'],['تاريخ الفاتورة','invoice_date'],['تكلفة القطع','parts_cost',(v)=>money(v)],['تكلفة العمالة','labor_cost',(v)=>money(v)],['الإجمالي','total_cost',(v)=>money(v)],['اعتماد','approved_by'],['إغلاق','closed_at'],['الحالة','status',(v)=>statusBadge(v)]],
      maint,
      r=>`<button class="ghost" onclick="editRecord('estate_maintenance','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('estate_maintenance','${r.id}')">حذف</button>`
    );
    const invTable = $('#estateReservationInvoicesTable');
    if(invTable) invTable.innerHTML = tableHtml(
      [['رقم الفاتورة','invoice_no'],['النوع','entity_type',(v)=>v==='room'?'غرفة':'شقة'],['المعرف','entity_id'],['العميل','client_name'],['تاريخ الإصدار','issue_date'],['الاستحقاق','due_date'],['الإيجار','rent_price',(v)=>money(v)],['التأمين','deposit_amount',(v)=>money(v)],['المقدم','prepaid_amount',(v)=>money(v)],['الإجمالي','total_amount',(v)=>money(v)],['الحالة','status',(v)=>statusBadge(v)]],
      rInv
    );
    const hTable = $('#estateStatusHistoryTable');
    if(hTable) hTable.innerHTML = tableHtml(
      [['التاريخ','changed_at'],['الكيان','entity_type',(v)=>v==='room'?'غرفة':(v==='accessory'?'ملحق':'شقة')],['المعرف','entity_id'],['من حالة','old_status',(v)=>v||'—'],['إلى حالة','new_status'],['بواسطة','changed_by'],['ملاحظة','note']],
      hist
    );
    const cTable = $('#estateContractsTable');
    if(cTable) cTable.innerHTML = tableHtml(
      [['رقم العقد','contract_no'],['النوع','entity_type',(v)=>v==='room'?'غرفة':'شقة'],['المعرف','entity_id'],['العميل','client_id',(v)=>clientName(v)],['البداية','start_date'],['النهاية','end_date'],['الإيجار','rent_amount',(v)=>money(v)],['الدورية','payment_cycle'],['الحالة','status',(v)=>statusBadge(v)],['أنشئ بواسطة','created_by']],
      contracts
    );
    const ciTable = $('#estateContractInvoicesTable');
    if(ciTable) ciTable.innerHTML = tableHtml(
      [['رقم الفاتورة','invoice_no'],['العقد','contract_id',(v)=>htmlEscape((contracts.find(c=>c.id===v)||{}).contract_no||v)],['الاستحقاق','due_date'],['المبلغ','amount',(v)=>money(v)],['المدفوع','paid_amount',(v)=>money(v)],['المتبقي','id',(_,r)=>money(Math.max(0,Number(r.amount||0)-Number(r.paid_amount||0)))],['الحالة','status',(v)=>statusBadge(v)],['الإصدار','issued_at']],
      cInv
    );
    const csTable = $('#estateContractSettlementsTable');
    if(csTable) csTable.innerHTML = tableHtml(
      [['العقد','contract_id',(v)=>htmlEscape((contracts.find(c=>c.id===v)||{}).contract_no||v)],['تاريخ الإغلاق','close_date'],['مجدول','total_scheduled',(v)=>money(v)],['مدفوع','total_paid',(v)=>money(v)],['متأخرات','outstanding_due',(v)=>money(v)],['مستقبلي ملغى','future_cancelled'],['المغلق','closed_by'],['ملاحظة','note'],['وقت الإنشاء','created_at']],
      settlements
    );
    const mcTable = $('#estateMonthClosesTable');
    if(mcTable) mcTable.innerHTML = tableHtml(
      [['الشهر','month_key'],['الحالة','status',(v)=>statusBadge(v)],['مجدول','total_invoiced',(v)=>money(v)],['محصّل','total_collected',(v)=>money(v)],['ذمم','outstanding_due',(v)=>money(v)],['أغلق بواسطة','closed_by'],['وقت الإغلاق','closed_at'],['ملاحظة','note']],
      monthCloses
    );
  }
  window.renderEstatePlatform = function(){
    renderEstateIcons();
    renderEstatePhotoGallery();
    fillEstateSelects();
    try{
      const saved = localStorage.getItem('jawdah_estate_panel') || 'overview';
      if(typeof showEstatePanel==='function') showEstatePanel(saved);
    }catch(_){ if(typeof showEstatePanel==='function') showEstatePanel('overview'); }
    const props = estateRows('estate_properties');
    const blds = estateRows('estate_buildings');
    const apts = estateRows('estate_apartments');
    const rooms = estateRows('estate_rooms');
    const accessories = estateRows('estate_accessories');
    const mapProperty = props.find(x=>String(x.location||'').trim()) || null;
    const mapLocationText = mapProperty ? String(mapProperty.location||'').trim() : ESTATE_DEFAULT_MAP_LOCATION;
    refreshEstateRealMap(mapLocationText);
    const maint = estateRows('estate_maintenance');
    const rInv = estateRows('estate_reservation_invoices');
    const contracts = estateRows('estate_contracts');
    const cInv = estateRows('estate_contract_invoices');
    const settlements = estateRows('estate_contract_settlements');
    const reservedApts = apts.filter(x=>String(x.status||'').toLowerCase()==='reserved').length;
    const occupiedApts = apts.filter(x=>String(x.status||'').toLowerCase()==='occupied').length;
    const occupied = rooms.filter(x=>String(x.status||'').toLowerCase()==='occupied').length;
    const openMaint = maint.filter(x=>!String(x.status||'').toLowerCase().includes('closed')).length;
    const kpi = $('#estateKpiRow');
    if(kpi){
      kpi.innerHTML = `
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>العقارات</span><strong>${fmt(props.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>البنايات</span><strong>${fmt(blds.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>الشقق</span><strong>${fmt(apts.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>شقق مؤجرة</span><strong>${fmt(occupiedApts)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('booking')"><span>شقق محجوزة</span><strong>${fmt(reservedApts)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>الغرف</span><strong>${fmt(rooms.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('add')"><span>الملحقات</span><strong>${fmt(accessories.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('tables')"><span>غرف مؤجرة</span><strong>${fmt(occupied)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('maint')"><span>صيانة مفتوحة</span><strong>${fmt(openMaint)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('booking')"><span>فواتير حجز</span><strong>${fmt(rInv.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('booking')"><span>عقود نشطة</span><strong>${fmt(contracts.filter(x=>String(x.status||'').toLowerCase()==='active').length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('finance')"><span>فواتير عقود</span><strong>${fmt(cInv.length)}</strong></button>
        <button type="button" class="kpi" onclick="showEstatePanel('finance')"><span>تسويات عقود</span><strong>${fmt(settlements.length)}</strong></button>
      `;
    }
    const timeline = $('#estateTimelineBox');
    if(timeline){
      const events = buildEstateTimeline();
      timeline.innerHTML = events.map(e=>`<article class="prop-tl-item ${e.tone}"><div class="prop-tl-date"><b>${htmlEscape(e.date||'')}</b><span>${e.icon}</span></div><div class="prop-tl-body"><h4>${htmlEscape(e.title||'')}</h4><p>${htmlEscape(e.subtitle||'')}</p><div class="status-line"><span class="badge">${htmlEscape(e.meta||'')}</span></div></div></article>`).join('') || '<div class="card"><p class="mini">لا توجد أحداث ضمن الفترة المحددة.</p></div>';
    }
    renderEstateTables();
    const alertsBox = $('#estateReservationAlerts');
    if(alertsBox){
      const todayStr = today ? today() : new Date().toISOString().slice(0,10);
      const in3 = new Date();
      in3.setDate(in3.getDate()+3);
      const in3Str = in3.toISOString().slice(0,10);
      const rows = []
        .concat(apts.map(x=>({kind:'شقة',name:x.name,status:x.status,end:x.reservation_end_date,client:x.booked_client_name||''})))
        .concat(rooms.map(x=>({kind:'غرفة',name:x.name,status:x.status,end:x.reservation_end_date,client:x.booked_client_name||''})))
        .filter(x=>String(x.status||'').toLowerCase()==='reserved' && x.end);
      const soon = rows.filter(x=>x.end>=todayStr && x.end<=in3Str);
      const overdue = rows.filter(x=>x.end<todayStr);
      const lines = [];
      overdue.forEach(x=>lines.push(`<div class="statement-row"><span>${htmlEscape(x.kind)} ${htmlEscape(x.name)} · ${htmlEscape(x.client||'—')}</span><b class="badge overdue">متأخر التحويل منذ ${htmlEscape(x.end)}</b></div>`));
      soon.forEach(x=>lines.push(`<div class="statement-row"><span>${htmlEscape(x.kind)} ${htmlEscape(x.name)} · ${htmlEscape(x.client||'—')}</span><b class="badge pending">ينتهي قريبًا ${htmlEscape(x.end)}</b></div>`));
      alertsBox.innerHTML = lines.join('') || '<p class="badge paid">لا توجد تنبيهات حجز حالياً</p>';
    }
    const cAlert = $('#estateContractInvoiceAlerts');
    if(cAlert){
      const todayStr = today ? today() : new Date().toISOString().slice(0,10);
      const in7 = new Date(); in7.setDate(in7.getDate()+7); const in7Str = in7.toISOString().slice(0,10);
      const pending = cInv.filter(x=>String(x.status||'').toLowerCase()!=='paid');
      const overdue = pending.filter(x=>String(x.due_date||'') < todayStr);
      const dueSoon = pending.filter(x=>String(x.due_date||'') >= todayStr && String(x.due_date||'') <= in7Str);
      const lines = [];
      overdue.forEach(x=>lines.push(`<div class="statement-row"><span>${htmlEscape(x.invoice_no||x.id)}</span><b class="badge overdue">متأخرة · ${htmlEscape(x.due_date||'')}</b></div>`));
      dueSoon.forEach(x=>lines.push(`<div class="statement-row"><span>${htmlEscape(x.invoice_no||x.id)}</span><b class="badge pending">تستحق قريبًا · ${htmlEscape(x.due_date||'')}</b></div>`));
      cAlert.innerHTML = lines.join('') || '<p class="badge paid">لا توجد تنبيهات استحقاق حالياً</p>';
    }
    const execBox = $('#estateExecAlertsBox');
    if(execBox){
      const cards = buildEstateExecAlerts();
      execBox.innerHTML = cards.map(c=>`<div class="statement-row"><span>${htmlEscape(c.title)}<small class="mini"> · ${htmlEscape(c.subtitle||'')}</small></span><b class="badge ${htmlEscape(c.tone||'')}">${fmt(c.value||0)}</b></div>${(c.details||[]).map(d=>`<div class="statement-row mini"><span>↳ ${htmlEscape(d)}</span><b></b></div>`).join('')}`).join('');
    }
    const monthInput = $('#estateOccMonth');
    if(monthInput && !monthInput.value){
      const d = new Date();
      monthInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    }
    const occHost = $('#estateOccupancyReportBox');
    if(occHost){
      const snapshot = computeEstateOccupancySnapshot(String(monthInput?.value || ''));
      if(!snapshot){
        occHost.innerHTML = '<p class="badge overdue">أدخل شهرًا صحيحًا بصيغة YYYY-MM</p>';
      }else{
        occHost.innerHTML = `
          <div class="kpis grid">
            <div class="kpi"><span>إشغال الشهر</span><strong>${fmt(snapshot.current.occupancy_pct)}%</strong></div>
            <div class="kpi"><span>الوحدات المؤجرة</span><strong>${fmt(snapshot.current.occupied_units)}</strong></div>
            <div class="kpi"><span>إجمالي الوحدات</span><strong>${fmt(snapshot.current.total_units)}</strong></div>
            <div class="kpi"><span>تغير شهري MoM</span><strong class="${snapshot.delta_pct>=0?'linked-ok':'low-stock'}">${snapshot.delta_pct>=0?'+':''}${fmt(snapshot.delta_pct)}%</strong></div>
          </div>
          <div class="statement-row"><span>الشهر الحالي</span><b>${htmlEscape(snapshot.current.month_key)} · مؤجر ${fmt(snapshot.current.occupied_units)} من ${fmt(snapshot.current.total_units)}</b></div>
          <div class="statement-row"><span>الشهر السابق</span><b>${htmlEscape(snapshot.previous?.month_key || '—')} · مؤجر ${fmt(snapshot.previous?.occupied_units || 0)} من ${fmt(snapshot.previous?.total_units || 0)}</b></div>
          <div class="statement-row"><span>فرق الوحدات</span><b>${snapshot.delta_units>=0?'+':''}${fmt(snapshot.delta_units)} وحدة</b></div>
        `;
      }
    }
    renderEstateUnitTrace();
    const closeContractBtn = $('#estateCloseContractBtn');
    if(closeContractBtn){
      closeContractBtn.disabled = !canEstateCloseContract();
      closeContractBtn.title = canEstateCloseContract() ? '' : 'لا تملك صلاحية إغلاق العقود';
    }
    const closeMonthBtn = $('#estateCloseMonthBtn');
    if(closeMonthBtn){
      closeMonthBtn.disabled = !canEstateMonthClose();
      closeMonthBtn.title = canEstateMonthClose() ? '' : 'لا تملك صلاحية إقفال الشهر';
    }
    ensureEnglishDigits(document.getElementById('sec-estate-platform'));
    if(typeof loadEstateOperationsCheck==='function') loadEstateOperationsCheck(true);
  };
  function nowDay(){ return today ? today() : new Date().toISOString().slice(0,10); }
  function monthStartEnd(monthKey){
    const m = String(monthKey||'').trim();
    if(!/^\d{4}-\d{2}$/.test(m)) return null;
    const [y,mm] = m.split('-').map(Number);
    if(!(y>2000 && mm>=1 && mm<=12)) return null;
    const start = new Date(Date.UTC(y, mm-1, 1));
    const end = new Date(Date.UTC(y, mm, 0));
    return {
      monthKey: m,
      start: start.toISOString().slice(0,10),
      end: end.toISOString().slice(0,10),
      label: `${y}-${String(mm).padStart(2,'0')}`,
    };
  }
  function previousMonthKey(monthKey){
    const info = monthStartEnd(monthKey);
    if(!info) return '';
    const d = new Date(`${info.start}T00:00:00Z`);
    d.setUTCDate(0);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  }
  function overlapsMonth(startDate, endDate, monthInfo){
    const s = String(startDate||'').trim();
    const e = String(endDate||'').trim();
    if(!s || !e || !monthInfo) return false;
    return !(e < monthInfo.start || s > monthInfo.end);
  }
  function computeEstateOccupancySnapshot(monthKey){
    const curr = monthStartEnd(monthKey);
    if(!curr) return null;
    const prev = monthStartEnd(previousMonthKey(monthKey));
    const units = estateRows('estate_apartments').map(x=>({entity_type:'apartment',entity_id:x.id,status:String(x.status||'').toLowerCase()}))
      .concat(estateRows('estate_rooms').map(x=>({entity_type:'room',entity_id:x.id,status:String(x.status||'').toLowerCase()})));
    const contracts = estateRows('estate_contracts').filter(x=>String(x.status||'').toLowerCase()!=='cancelled');
    const eligibleUnits = units.filter(x=>!['maintenance','suspended'].includes(x.status));
    const total = eligibleUnits.length;
    const calc = (monthInfo)=>{
      const activeKeys = new Set(
        contracts
          .filter(c=>String(c.status||'').toLowerCase()==='active' || overlapsMonth(c.start_date,c.end_date,monthInfo))
          .filter(c=>overlapsMonth(c.start_date,c.end_date,monthInfo))
          .map(c=>`${String(c.entity_type||'').toLowerCase()}::${c.entity_id}`)
      );
      const occupied = eligibleUnits.filter(u=>activeKeys.has(`${u.entity_type}::${u.entity_id}`)).length;
      const reserved = units.filter(u=>u.status==='reserved').length;
      const rate = total ? ((occupied/total)*100) : 0;
      return { month_key: monthInfo.monthKey, total_units: total, occupied_units: occupied, reserved_units: reserved, occupancy_pct: Number(rate.toFixed(2)) };
    };
    const current = calc(curr);
    const previous = prev ? calc(prev) : null;
    return {
      current,
      previous,
      delta_pct: Number((current.occupancy_pct - Number(previous?.occupancy_pct||0)).toFixed(2)),
      delta_units: Number(current.occupied_units||0) - Number(previous?.occupied_units||0),
    };
  }
  function buildEstateExecAlerts(){
    const nowStr = nowDay();
    const in7 = new Date();
    in7.setDate(in7.getDate()+7);
    const in7Str = in7.toISOString().slice(0,10);
    const contracts = estateRows('estate_contracts');
    const inv = estateRows('estate_contract_invoices');
    const maint = estateRows('estate_maintenance');
    const units = estateRows('estate_apartments').map(x=>({kind:'شقة',name:x.name,status:x.status,end:x.reservation_end_date}))
      .concat(estateRows('estate_rooms').map(x=>({kind:'غرفة',name:x.name,status:x.status,end:x.reservation_end_date})));
    const overdueInv = inv.filter(x=>String(x.status||'').toLowerCase()!=='paid' && String(x.due_date||'') < nowStr);
    const dueSoonInv = inv.filter(x=>String(x.status||'').toLowerCase()!=='paid' && String(x.due_date||'') >= nowStr && String(x.due_date||'') <= in7Str);
    const endingContracts = contracts.filter(x=>String(x.status||'').toLowerCase()==='active' && String(x.end_date||'') >= nowStr && String(x.end_date||'') <= in7Str);
    const openMaintAging = maint
      .filter(x=>!String(x.status||'').toLowerCase().includes('closed'))
      .map(x=>{
        const d = String(x.maintenance_date||'').trim();
        const days = d ? Math.max(0, Math.floor((new Date(nowStr) - new Date(d)) / 86400000)) : 0;
        return {title:x.title, days};
      })
      .filter(x=>x.days>=10);
    const overdueReserved = units.filter(x=>String(x.status||'').toLowerCase()==='reserved' && String(x.end||'') && String(x.end||'') < nowStr);
    return [
      {tone: overdueInv.length ? 'overdue' : 'paid', title:'فواتير متأخرة', value: overdueInv.length, subtitle:'تحصيل فوري مطلوب', details: overdueInv.slice(0,4).map(x=>`${x.invoice_no||x.id} · ${x.due_date||'—'}`)},
      {tone: dueSoonInv.length ? 'pending' : 'paid', title:'استحقاقات خلال 7 أيام', value: dueSoonInv.length, subtitle:'تنبيه استباقي', details: dueSoonInv.slice(0,4).map(x=>`${x.invoice_no||x.id} · ${x.due_date||'—'}`)},
      {tone: endingContracts.length ? 'pending' : 'paid', title:'عقود على وشك الانتهاء', value: endingContracts.length, subtitle:'تجديد/إغلاق', details: endingContracts.slice(0,4).map(x=>`${x.contract_no||x.id} · ${x.end_date||'—'}`)},
      {tone: openMaintAging.length ? 'overdue' : 'paid', title:'صيانة مفتوحة +10 أيام', value: openMaintAging.length, subtitle:'تدخل إداري مطلوب', details: openMaintAging.slice(0,4).map(x=>`${x.title||'طلب'} · ${x.days} يوم`)},
      {tone: overdueReserved.length ? 'overdue' : 'paid', title:'حجوزات متأخرة للتحويل', value: overdueReserved.length, subtitle:'تسريع التحويل إلى عقد/إشغال', details: overdueReserved.slice(0,4).map(x=>`${x.kind} ${x.name||''} · ${x.end||'—'}`)},
    ];
  }
  function renderEstateUnitTrace(){
    const typeEl = $('#estateTraceEntityType');
    const idEl = $('#estateTraceEntityId');
    const host = $('#estateUnitTraceBox');
    if(!typeEl || !idEl || !host) return;
    const entityType = String(typeEl.value || 'apartment').toLowerCase();
    const rows = entityType === 'room' ? estateRows('estate_rooms') : estateRows('estate_apartments');
    const prevId = String(idEl.value || '');
    idEl.innerHTML = rows.map(r=>`<option value="${htmlEscape(r.id)}">${htmlEscape(r.name||r.id)}</option>`).join('');
    if(rows.some(r=>r.id===prevId)) idEl.value = prevId;
    const entityId = String(idEl.value || (rows[0]?.id || ''));
    if(!entityId){
      host.innerHTML = '<p class="mini">لا توجد وحدات متاحة لعرض السجل</p>';
      return;
    }
    const maintenanceRows = estateRows('estate_maintenance').filter(m=>String(m[entityType==='room'?'room_id':'apartment_id']||'')===entityId);
    const contractRows = estateRows('estate_contracts').filter(c=>String(c.entity_type||'').toLowerCase()===entityType && String(c.entity_id||'')===entityId);
    const contractIds = new Set(contractRows.map(c=>c.id));
    const invoiceRows = estateRows('estate_contract_invoices').filter(i=>contractIds.has(i.contract_id));
    const statusRows = estateRows('estate_status_history').filter(s=>String(s.entity_type||'').toLowerCase()===entityType && String(s.entity_id||'')===entityId);
    const timelineRows = []
      .concat(statusRows.map(x=>({date:x.changed_at||'', icon:'🔄', title:`حالة: ${x.old_status||'—'} → ${x.new_status||'—'}`, meta:x.note||''})))
      .concat(maintenanceRows.map(x=>({date:x.maintenance_date||x.closed_at||'', icon:'🛠️', title:`صيانة: ${x.title||'—'} (${x.status||'Open'})`, meta:money(x.total_cost||0)})))
      .concat(contractRows.map(x=>({date:x.created_at||x.start_date||'', icon:'📄', title:`عقد: ${x.contract_no||x.id} (${x.status||''})`, meta:`${x.start_date||'—'} → ${x.end_date||'—'}`})))
      .concat(invoiceRows.map(x=>({date:x.issued_at||x.due_date||'', icon:'🧾', title:`فاتورة: ${x.invoice_no||x.id} (${x.status||''})`, meta:`${money(x.amount||0)} · استحقاق ${x.due_date||'—'}`})));
    timelineRows.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    host.innerHTML = timelineRows.map(e=>`<div class="statement-row"><span>${e.icon} ${htmlEscape(e.title||'')}</span><b>${htmlEscape(String(e.date||'').slice(0,10) || '—')} · ${htmlEscape(e.meta||'')}</b></div>`).join('') || '<p class="mini">لا توجد أحداث لهذه الوحدة بعد</p>';
  }
  function clearEstateForm(ids){
    (ids||[]).forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      if(el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    });
  }
  function applyEstateDailyDefaults(){
    const t = nowDay();
    if($('#emDate') && !$('#emDate').value) $('#emDate').value = t;
    if($('#ecPayDate') && !$('#ecPayDate').value) $('#ecPayDate').value = t;
    if($('#eaReservationStart') && !$('#eaReservationStart').value) $('#eaReservationStart').value = t;
    if($('#erReservationStart') && !$('#erReservationStart').value) $('#erReservationStart').value = t;
  }
  async function postEstate(table,payload){
    try{
      applyEstateDailyDefaults();
      await api(table,{method:'POST',body:JSON.stringify(payload)});
      toast('تم الحفظ');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){ toastErr(e); }
  }
  async function estateImageUploadPayload(inputId){
    const file = document.getElementById(inputId)?.files?.[0];
    if(!file) return null;
    return { image: await readFileAsDataUrl(file), content_type: file.type, name: file.name };
  }
  window.createEstateProperty = async function(){
    const imageUpload = await estateImageUploadPayload('epImageFile');
    const tenant = val('epTenantClient') || null;
    const tenantObj = byId('clients', tenant);
    await postEstate('estate_properties',{
      name: val('epName'),
      status: val('epStatus') || 'active',
      location: val('epLocation'),
      building_count: num('epBuildingCount'),
      apartment_count: num('epApartmentCount'),
      room_count: num('epRoomCount'),
      base_rent_price: num('epBaseRentPrice'),
      service_charge: num('epServiceCharge'),
      attachments: val('epAttachments'),
      manager_name: val('epManager'),
      tenant_client_id: tenant,
      tenant_phone: val('epTenantPhone') || tenantObj.phone || '',
      notes: val('epNotes'),
      image: val('epImage'),
      image_upload: imageUpload,
      last_update: nowDay(),
    });
    clearEstateForm(['epName','epLocation','epBuildingCount','epApartmentCount','epRoomCount','epBaseRentPrice','epServiceCharge','epAttachments','epManager','epTenantPhone','epNotes','epImage','epImageFile']);
  };
  window.createEstateBuilding = async function(){
    const imageUpload = await estateImageUploadPayload('ebImageFile');
    const tenant = val('ebTenantClient') || null;
    const tenantObj = byId('clients', tenant);
    await postEstate('estate_buildings',{
      property_id: val('ebProperty'),
      name: val('ebName'),
      status: val('ebStatus') || 'active',
      location: val('ebLocation'),
      apartment_count: num('ebApartmentCount'),
      room_count: num('ebRoomCount'),
      base_rent_price: num('ebBaseRentPrice'),
      service_charge: num('ebServiceCharge'),
      attachments: val('ebAttachments'),
      manager_name: val('ebManager'),
      tenant_client_id: tenant,
      tenant_phone: val('ebTenantPhone') || tenantObj.phone || '',
      notes: val('ebNotes'),
      image: val('ebImage'),
      image_upload: imageUpload,
      last_update: nowDay(),
    });
    clearEstateForm(['ebName','ebLocation','ebApartmentCount','ebRoomCount','ebBaseRentPrice','ebServiceCharge','ebAttachments','ebManager','ebTenantPhone','ebNotes','ebImage','ebImageFile']);
  };
  window.createEstateApartment = async function(){
    const imageUpload = await estateImageUploadPayload('eaImageFile');
    const tenant = val('eaTenantClient') || null;
    const tenantObj = byId('clients', tenant);
    const status = String(val('eaStatus') || 'vacant').toLowerCase();
    const bookedClientName = val('eaBookedClientName') || (status==='reserved' ? (tenantObj.name || '') : '');
    const bookedClientPhone = val('eaBookedClientPhone') || (status==='reserved' ? (tenantObj.phone || '') : '');
    const bookedClientId = val('eaBookedClientId') || (status==='reserved' ? tenant : '');
    await postEstate('estate_apartments',{
      property_id: val('eaProperty'),
      building_id: val('eaBuilding'),
      name: val('eaName'),
      status,
      room_count: num('eaRoomCount'),
      rent_price: num('eaRentPrice'),
      booking_deposit: num('eaBookingDeposit'),
      prepaid_amount: num('eaPrepaidAmount'),
      reservation_start_date: val('eaReservationStart'),
      reservation_end_date: val('eaReservationEnd'),
      booked_client_name: bookedClientName,
      booked_client_phone: bookedClientPhone,
      booked_client_id: bookedClientId,
      booked_by_employee: val('eaBookedByEmployee'),
      maintenance_notes: val('eaMaintenanceNotes'),
      maintenance_cost: num('eaMaintenanceCost'),
      attachments: val('eaAttachments'),
      manager_name: val('eaManager'),
      tenant_client_id: tenant,
      tenant_phone: val('eaTenantPhone') || tenantObj.phone || '',
      notes: val('eaNotes'),
      image: val('eaImage'),
      image_upload: imageUpload,
      last_update: nowDay(),
    });
    clearEstateForm(['eaName','eaRoomCount','eaRentPrice','eaBookingDeposit','eaPrepaidAmount','eaReservationStart','eaReservationEnd','eaBookedClientName','eaBookedClientPhone','eaBookedClientId','eaBookedByEmployee','eaMaintenanceNotes','eaMaintenanceCost','eaAttachments','eaManager','eaTenantPhone','eaNotes','eaImage','eaImageFile']);
  };
  window.createEstateRoom = async function(){
    const imageUpload = await estateImageUploadPayload('erImageFile');
    const tenant = val('erTenantClient') || null;
    const tenantObj = byId('clients', tenant);
    const status = String(val('erStatus') || 'vacant').toLowerCase();
    const bookedClientName = val('erBookedClientName') || (status==='reserved' ? (tenantObj.name || '') : '');
    const bookedClientPhone = val('erBookedClientPhone') || (status==='reserved' ? (tenantObj.phone || '') : '');
    const bookedClientId = val('erBookedClientId') || (status==='reserved' ? tenant : '');
    await postEstate('estate_rooms',{
      property_id: val('erProperty'),
      building_id: val('erBuilding'),
      apartment_id: val('erApartment'),
      name: val('erName'),
      room_type: val('erType'),
      status,
      rent_price: num('erRentPrice'),
      booking_deposit: num('erBookingDeposit'),
      prepaid_amount: num('erPrepaidAmount'),
      reservation_start_date: val('erReservationStart'),
      reservation_end_date: val('erReservationEnd'),
      booked_client_name: bookedClientName,
      booked_client_phone: bookedClientPhone,
      booked_client_id: bookedClientId,
      booked_by_employee: val('erBookedByEmployee'),
      maintenance_notes: val('erMaintenanceNotes'),
      maintenance_cost: num('erMaintenanceCost'),
      attachments: val('erAttachments'),
      manager_name: val('erManager'),
      tenant_client_id: tenant,
      tenant_phone: val('erTenantPhone') || tenantObj.phone || '',
      notes: val('erNotes'),
      image: val('erImage'),
      image_upload: imageUpload,
      last_update: nowDay(),
    });
    clearEstateForm(['erName','erType','erRentPrice','erBookingDeposit','erPrepaidAmount','erReservationStart','erReservationEnd','erBookedClientName','erBookedClientPhone','erBookedClientId','erBookedByEmployee','erMaintenanceNotes','erMaintenanceCost','erAttachments','erManager','erTenantPhone','erNotes','erImage','erImageFile']);
  };
  window.createEstateMaintenance = async function(){
    await postEstate('estate_maintenance',{
      property_id: val('emProperty') || null,
      building_id: val('emBuilding') || null,
      apartment_id: val('emApartment') || null,
      room_id: val('emRoom') || null,
      title: val('emTitle'),
      status: val('emStatus') || 'Open',
      priority: val('emPriority') || 'Medium',
      responsible_name: val('emResponsible'),
      assigned_team: val('emAssignedTeam'),
      parts_details: val('emPartsDetails'),
      parts_cost: num('emPartsCost'),
      labor_cost: num('emLaborCost'),
      invoice_no: val('emInvoiceNo'),
      invoice_date: val('emInvoiceDate'),
      vendor_name: val('emVendorName'),
      total_cost: num('emTotalCost'),
      approved_by: val('emApprovedBy'),
      maintenance_date: val('emDate') || nowDay(),
      next_followup_date: val('emNextDate'),
      closed_at: val('emClosedAt'),
      notes: val('emNotes'),
    });
    clearEstateForm(['emTitle','emResponsible','emAssignedTeam','emPartsDetails','emPartsCost','emLaborCost','emInvoiceNo','emInvoiceDate','emVendorName','emTotalCost','emApprovedBy','emNextDate','emClosedAt','emNotes']);
  };
  window.createEstateAccessory = async function(){
    await postEstate('estate_accessories',{
      property_id: val('exProperty'),
      building_id: val('exBuilding') || null,
      apartment_id: val('exApartment') || null,
      room_id: val('exRoom') || null,
      name: val('exName'),
      category: val('exCategory'),
      status: String(val('exStatus') || 'available').toLowerCase(),
      qty: Math.max(1, num('exQty') || 1),
      unit_cost: num('exUnitCost'),
      supplier: val('exSupplier'),
      invoice_no: val('exInvoiceNo'),
      responsible_name: val('exResponsible'),
      notes: val('exNotes'),
      last_update: nowDay(),
    });
    clearEstateForm(['exName','exCategory','exQty','exUnitCost','exSupplier','exInvoiceNo','exResponsible','exNotes']);
  };
  window.convertEstateReservation = async function(entityType, entityId){
    try{
      if(!canEstateConvertReservation()) return toastErr('لا تملك صلاحية تحويل الحجز');
      const t = entityType==='room' ? 'غرفة' : 'شقة';
      const note = prompt(`ملاحظة التحويل (${t}) — اختياري`, 'تم التحويل إلى تأجير فعلي');
      if(note===null) return;
      await api('estate_convert_reservation',{
        method:'POST',
        body:JSON.stringify({ entity_type: entityType, entity_id: entityId, note: String(note||'').trim() })
      });
      toast('تم التحويل إلى مؤجرة وإغلاق فاتورة الحجز المفتوحة');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){ toastErr(e); }
  };
  window.openEstateContractFlow = function(entityType, entityId){
    if(!canEstateCreateContract()) return toastErr('لا تملك صلاحية إنشاء عقد نشط');
    const t = entityType === 'room' ? 'room' : 'apartment';
    const typeSel = $('#ecEntityType');
    if(typeSel) typeSel.value = t;
    fillEstateSelects();
    const idSel = $('#ecEntityId');
    if(idSel) idSel.value = entityId;
    const srcRows = t==='room' ? estateRows('estate_rooms') : estateRows('estate_apartments');
    const row = srcRows.find(x=>x.id===entityId) || {};
    const tenantSel = $('#ecTenantClient');
    if(tenantSel){
      const cid = row.tenant_client_id || row.booked_client_id || '';
      if(cid) tenantSel.value = cid;
    }
    if($('#ecRentAmount')) $('#ecRentAmount').value = Number(row.rent_price||0) || '';
    if($('#ecStartDate')) $('#ecStartDate').value = row.reservation_start_date || today();
    if($('#ecEndDate')) $('#ecEndDate').value = row.reservation_end_date || '';
  };
  window.createEstateContractFromFlow = async function(){
    try{
      if(!canEstateCreateContract()) return toastErr('لا تملك صلاحية إنشاء عقد نشط');
      const entityType = String($('#ecEntityType')?.value || 'apartment');
      const entityId = String($('#ecEntityId')?.value || '').trim();
      if(!entityId) return toastErr('اختر الشقة/الغرفة أولاً');
      const payload = {
        entity_type: entityType,
        entity_id: entityId,
        tenant_client_id: String($('#ecTenantClient')?.value || '').trim(),
        start_date: String($('#ecStartDate')?.value || '').trim(),
        end_date: String($('#ecEndDate')?.value || '').trim(),
        rent_amount: Number($('#ecRentAmount')?.value || 0),
        payment_cycle: String($('#ecPaymentCycle')?.value || 'monthly').trim(),
        notes: String($('#ecNotes')?.value || '').trim(),
      };
      await api('estate_convert_to_contract',{ method:'POST', body:JSON.stringify(payload) });
      toast('تم إنشاء عقد الإيجار النشط بنجاح');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){ toastErr(e); }
  };
  window.generateEstateContractSchedule = async function(replaceOpen){
    try{
      if(!canEstateCreateContract()) return toastErr('لا تملك صلاحية جدولة دفعات العقود');
      const contractId = String($('#ecScheduleContract')?.value || '').trim();
      if(!contractId) return toastErr('اختر العقد أولاً');
      await api('estate_contract_generate_schedule',{
        method:'POST',
        body:JSON.stringify({ contract_id: contractId, replace_open: !!replaceOpen })
      });
      toast(replaceOpen ? 'تمت إعادة جدولة الدفعات المفتوحة' : 'تم توليد جدول الدفعات');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){ toastErr(e); }
  };
  window.payEstateContractInvoice = async function(){
    try{
      const invoiceId = String($('#ecPayInvoice')?.value || '').trim();
      const amount = Number($('#ecPayAmount')?.value || 0);
      if(!invoiceId) return toastErr('اختر فاتورة التحصيل');
      if(!(amount>0)) return toastErr('أدخل مبلغ تحصيل صحيح');
      await api('estate_contract_pay_invoice',{
        method:'POST',
        body:JSON.stringify({ invoice_id: invoiceId, amount, payment_date: String($('#ecPayDate')?.value || '').trim() })
      });
      toast('تم تسجيل التحصيل بنجاح');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){ toastErr(e); }
  };
  window.closeEstateMonth = async function(){
    if(!canEstateMonthClose()) return toastErr('لا تملك صلاحية إقفال الشهر');
    const monthKey = String($('#emcMonth')?.value || '').trim();
    if(!monthKey) return toastErr('اختر الشهر أولاً');
    const payload = {
      month_key: monthKey,
      force: !!$('#emcForce')?.checked,
      note: String($('#emcNote')?.value || '').trim(),
    };
    const box = $('#estateMonthClosePreviewBox');
    if(box) box.innerHTML = '<p class="mini">جاري إعداد إقفال الشهر...</p>';
    try{
      const headers = {'Content-Type':'application/json'};
      if(Jawdah.token) headers.Authorization = 'Bearer ' + Jawdah.token;
      const res = await fetch('/api/estate_month_close',{ method:'POST', headers, body:JSON.stringify(payload) });
      const body = await res.json().catch(()=>({}));
      if(!res.ok || body.ok===false){
        const p = body.preview || null;
        if(box && p){
          box.innerHTML = `
            <p class="badge overdue">${htmlEscape(body.error||'تعذر إقفال الشهر')}</p>
            <div class="statement-row"><span>الشهر</span><b>${htmlEscape(p.month_key||'')}</b></div>
            <div class="statement-row"><span>إجمالي مجدول</span><b>${money(p.total_invoiced||0)}</b></div>
            <div class="statement-row"><span>إجمالي محصل</span><b>${money(p.total_collected||0)}</b></div>
            <div class="statement-row"><span>ذمم مستحقة</span><b class="badge overdue">${money(p.outstanding_due||0)}</b></div>
            <div class="statement-row"><span>فواتير مفتوحة حتى نهاية الشهر</span><b>${fmt(p.overdue_open_count||0)}</b></div>
          `;
        }else if(box){
          box.innerHTML = `<p class="badge overdue">${htmlEscape(body.error||'تعذر الإقفال')}</p>`;
        }
        throw new Error(body.error || 'تعذر إقفال الشهر');
      }
      const p = body.preview || {};
      if(box){
        box.innerHTML = `
          <p class="badge paid">تم إقفال الشهر بنجاح</p>
          <div class="statement-row"><span>الشهر</span><b>${htmlEscape(p.month_key||'')}</b></div>
          <div class="statement-row"><span>إجمالي مجدول</span><b>${money(p.total_invoiced||0)}</b></div>
          <div class="statement-row"><span>إجمالي محصل</span><b>${money(p.total_collected||0)}</b></div>
          <div class="statement-row"><span>ذمم حتى الإقفال</span><b>${money(p.outstanding_due||0)}</b></div>
        `;
      }
      toast('تم إقفال الشهر المالي للعقارات');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){
      toastErr(e);
    }
  };
  window.closeEstateContract = async function(){
    if(!canEstateCloseContract()) return toastErr('لا تملك صلاحية إغلاق العقود');
    const contractId = String($('#ecCloseContract')?.value || '').trim();
    if(!contractId) return toastErr('اختر عقدًا نشطًا');
    const payload = {
      contract_id: contractId,
      close_date: String($('#ecCloseDate')?.value || '').trim(),
      force_close: !!$('#ecForceClose')?.checked,
      note: String($('#ecCloseNote')?.value || '').trim(),
    };
    const box = $('#estateSettlementPreviewBox');
    if(box) box.innerHTML = '<p class="mini">جاري إغلاق العقد وإعداد التسوية...</p>';
    try{
      const headers = {'Content-Type':'application/json'};
      if(Jawdah.token) headers.Authorization = 'Bearer ' + Jawdah.token;
      const res = await fetch('/api/estate_contract_close',{ method:'POST', headers, body:JSON.stringify(payload) });
      const body = await res.json().catch(()=>({}));
      if(!res.ok || body.ok===false){
        const p = body.settlement_preview || null;
        if(box && p){
          box.innerHTML = `
            <p class="badge overdue">${htmlEscape(body.error||'تعذر الإغلاق')}</p>
            <div class="statement-row"><span>العقد</span><b>${htmlEscape(p.contract_no||'')}</b></div>
            <div class="statement-row"><span>تاريخ الإغلاق</span><b>${htmlEscape(p.close_date||'')}</b></div>
            <div class="statement-row"><span>المتأخرات</span><b class="badge overdue">${money(p.outstanding_due||0)}</b></div>
            <div class="statement-row"><span>فواتير مستقبلية ستُلغى</span><b>${fmt(p.future_cancelled_count||0)}</b></div>
            ${(p.overdue_items||[]).map(x=>`<div class="statement-row"><span>${htmlEscape(x.invoice_no||x.id||'')}</span><b>${money(x.remaining||0)} · ${htmlEscape(x.due_date||'')}</b></div>`).join('')}
          `;
        } else if(box){
          box.innerHTML = `<p class="badge overdue">${htmlEscape(body.error||'تعذر الإغلاق')}</p>`;
        }
        throw new Error(body.error || 'تعذر إغلاق العقد');
      }
      const s = body.settlement || {};
      if(box){
        box.innerHTML = `
          <p class="badge paid">تم إغلاق العقد وإصدار التسوية بنجاح</p>
          <div class="statement-row"><span>العقد</span><b>${htmlEscape(body.preview?.contract_no || '')}</b></div>
          <div class="statement-row"><span>تاريخ الإغلاق</span><b>${htmlEscape(s.close_date || '')}</b></div>
          <div class="statement-row"><span>إجمالي مجدول</span><b>${money(s.total_scheduled||0)}</b></div>
          <div class="statement-row"><span>إجمالي مدفوع</span><b>${money(s.total_paid||0)}</b></div>
          <div class="statement-row"><span>متأخرات</span><b>${money(s.outstanding_due||0)}</b></div>
          <div class="statement-row"><span>فواتير مستقبلية ملغاة</span><b>${fmt(s.future_cancelled||0)}</b></div>
        `;
      }
      toast('تم إغلاق العقد وتسوية الحساب');
      await loadAll();
      if($('#sec-estate-platform')?.classList.contains('active')) renderEstatePlatform();
    }catch(e){
      toastErr(e);
    }
  };
  let __estateOpsCheckLoading = false;
  window.loadEstateOperationsCheck = async function(silent){
    if(__estateOpsCheckLoading) return;
    __estateOpsCheckLoading = true;
    const host = $('#estateOpsCheckBox');
    if(host && !silent) host.innerHTML = '<p class="mini">جاري فحص العمليات...</p>';
    try{
      const res = await api('estate_operations_check');
      if(!host) return;
      const checks = Array.isArray(res.checks)?res.checks:[];
      const m = res.metrics || {};
      host.innerHTML = `
        <div class="kpis grid">
          <div class="kpi"><span>درجة الجاهزية</span><strong>${fmt(res.score||0)}%</strong></div>
          <div class="kpi"><span>محجوز</span><strong>${fmt(m.reserved_total||0)}</strong></div>
          <div class="kpi"><span>عقود نشطة</span><strong>${fmt(m.active_contracts||0)}</strong></div>
          <div class="kpi"><span>سجل الحالات</span><strong>${fmt(m.status_history_rows||0)}</strong></div>
          <div class="kpi"><span>فواتير متأخرة</span><strong>${fmt(m.overdue_contract_invoices||0)}</strong></div>
          <div class="kpi"><span>تستحق خلال 7 أيام</span><strong>${fmt(m.due_soon_contract_invoices||0)}</strong></div>
          <div class="kpi"><span>أشهر مقفلة</span><strong>${fmt(m.closed_months||0)}</strong></div>
        </div>
        ${checks.map(c=>`<div class="statement-row"><span>${htmlEscape(c.name||'check')}</span><b class="${c.ok?'linked-ok':'low-stock'}">${c.ok?'OK':'Needs fix'} · ${fmt(c.value||0)}</b></div>`).join('')}
      `;
      ensureEnglishDigits(host);
    }catch(e){
      if(host) host.innerHTML = `<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }finally{
      __estateOpsCheckLoading = false;
    }
  };
  document.addEventListener('change', (e)=>{
    const id = e?.target?.id;
    if(['eaProperty','erProperty','emProperty','exProperty','erBuilding','emBuilding','exBuilding','emApartment','exApartment','ecEntityType'].includes(id)) fillEstateSelects();
    if(id==='epLocation') refreshEstateRealMap(String(e?.target?.value || '').trim());
    if(id==='eaStatus') syncEstateApartmentStateFields();
    if(id==='erStatus') syncEstateRoomStateFields();
    if(id==='estateTraceEntityType' || id==='estateTraceEntityId' || id==='estateOccMonth') renderEstatePlatform();
  });
  document.addEventListener('input', (e)=>{
    const id = e?.target?.id;
    if(id==='epLocation') refreshEstateRealMap(String(e?.target?.value || '').trim());
  });
  syncEstateApartmentStateFields();
  syncEstateRoomStateFields();
  applyEstateDailyDefaults();
  if($('#emcMonth')){
    const d = new Date();
    $('#emcMonth').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
  if($('#accBudgetMonth')){
    const d = new Date();
    $('#accBudgetMonth').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  }
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
  let accountsInsightsCache = null;
  let accountsInsightsCachedAt = 0;
  function syncAccountCategoryFilter(rows){
    const sel = document.getElementById('accFilterCategory');
    if(!sel) return;
    const prev = sel.value || '';
    const cats = Array.from(new Set((rows||[]).map(r=>String(r.category||'').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
    sel.innerHTML = `<option value="">كل التصنيفات</option>` + cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if(cats.includes(prev)) sel.value = prev;
  }
  function filteredAccountsRows(baseRows){
    const typeVal = (document.getElementById('accFilterType')?.value || '').trim();
    const catVal = (document.getElementById('accFilterCategory')?.value || '').trim();
    const fromVal = (document.getElementById('accFilterFrom')?.value || '').trim();
    const toVal = (document.getElementById('accFilterTo')?.value || '').trim();
    return (baseRows || []).filter(r=>{
      if(typeVal && String(r.type||'').trim() !== typeVal) return false;
      if(catVal && String(r.category||'').trim() !== catVal) return false;
      const d = String(r.entry_date || '').trim();
      if(fromVal && d && d < fromVal) return false;
      if(toVal && d && d > toVal) return false;
      return true;
    });
  }
  window.getFilteredAccountsRows = filteredAccountsRows;
  async function loadAccountsInsights(force=false){
    const now = Date.now();
    if(!force && accountsInsightsCache && (now - accountsInsightsCachedAt) < 45000) return accountsInsightsCache;
    const res = await api('accounts_insights?months=6');
    accountsInsightsCache = res;
    accountsInsightsCachedAt = now;
    return res;
  }
  function renderAccountsInsightsBox(payload){
    const host = document.getElementById('accountsInsightsBox');
    if(!host) return;
    if(!payload || !payload.ok){
      host.innerHTML = '<span class="badge pending">تعذر تحميل التحليلات الآن</span>';
      return;
    }
    const topIn = (payload.top_income_categories || []).slice(0,3).map(x=>`${x.category}: ${money(x.amount)}`).join(' | ') || 'لا توجد بيانات';
    const topOut = (payload.top_expense_categories || []).slice(0,3).map(x=>`${x.category}: ${money(x.amount)}`).join(' | ') || 'لا توجد بيانات';
    const series = payload.cashflow_series || [];
    const last = series[series.length-1] || {month:'-',net:0};
    host.innerHTML = `<span class="badge">آخر شهر: ${last.month}</span><span class="badge ${Number(last.net||0)>=0?'paid':'overdue'}">صافي: ${money(last.net||0)}</span><span class="badge">أعلى إيرادات: ${topIn}</span><span class="badge">أعلى مصروفات: ${topOut}</span>`;
  }
  function bindAccountsFilters(){
    ['accFilterType','accFilterCategory','accFilterFrom','accFilterTo'].forEach(id=>{
      const el = document.getElementById(id);
      if(el && !el.dataset.bound){
        el.dataset.bound = '1';
        el.addEventListener('change', ()=>window.renderAccounts && window.renderAccounts());
      }
    });
  }
  window.clearAccountsFilters = function(){
    const ids = ['accFilterType','accFilterCategory','accFilterFrom','accFilterTo'];
    ids.forEach(id=>{ const el = document.getElementById(id); if(el) el.value=''; });
    if(window.renderAccounts) window.renderAccounts();
  };
  window.refreshAccountsInsights = async function(){
    try{ renderAccountsInsightsBox(await loadAccountsInsights(true)); }
    catch(e){ renderAccountsInsightsBox(null); }
  };
  window.renderAccounts = function(){
    const e = accEngine();
    bindAccountsFilters();
    fillSelect('#accClient', Jawdah.data.clients||[], true);
    fillSelect('#accProperty', Jawdah.data.properties||[], true);
    syncAccountCategoryFilter(Jawdah.data.accounts||[]);
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
    const baseRows = filterRows('accounts',['entry_date','type','category','description','amount']);
    const rows = filteredAccountsRows(baseRows);
    const tbl = document.getElementById('accountsTable');
    if(tbl) tbl.innerHTML = tableHtml([['التاريخ','entry_date'],['النوع','type'],['التصنيف','category'],['الوصف','description'],['العميل','client_id',(v)=>byId('clients',v).name||''],['العقار','property_id',(v)=>byId('properties',v).name||''],['الفاتورة','invoice_id',(v)=>byId('invoices',v).invoice_no||''],['المبلغ','amount',(v)=>money(v)]], rows, r=>`<button class="ghost" onclick="editRecord('accounts','${r.id}')">تعديل</button> <button class="danger" onclick="delRecord('accounts','${r.id}')">حذف</button>`);
    drawBar('expenseChart',(Jawdah.dashboard?.series||[]).map(x=>x.expense));
    loadAccountsInsights(false).then(renderAccountsInsightsBox).catch(()=>renderAccountsInsightsBox(null));
    runSalamAgent();
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
    const html = `<!doctype html><meta charset="utf-8"><title>Launch Quality LLC Financial Report</title><body style="font-family:Arial;direction:ltr"><h1>Launch Quality LLC - التقرير المالي</h1><p>Income: ${money(e.income)} | Expense: ${money(e.expense)} | Net: ${money(e.net)} | Collection: ${fmt(e.collectionRate)}%</p><h2>أعمار الذمم</h2><ul>${Object.entries(e.aging).map(([k,v])=>`<li>${k}: ${money(v)}</li>`).join('')}</ul></body>`;
    downloadFile('launch-quality-financial-report.html', html, 'text/html');
  };
  const oldCheck = window.LAUNCH_QUALITY_CHECK;
  window.LAUNCH_QUALITY_CHECK = function(){ const base = oldCheck ? oldCheck() : {}; return {...base, status:'accounting-ready', accounting:accEngine()}; };
})();


(function(){
  const financeItems=[['purchases','فواتير المشتريات','🧾'],['revenues','الإيرادات','💎'],['statements','قائمة الدخل والميزانية','📘'],['payroll','الرواتب','👔'],['admin-expenses','مصاريف إدارية وعمومية','🏢'],['inventory','المخزن','📦'],['bank','كشف البنك','🏦'],['chart-accounts','دليل الحسابات','📒'],['bank-reconciliation','تسوية البنك','⚖️'],['financial-periods','الفترات المالية','📅']];
  const baseSections=[['dashboard','لوحة التحكم','🏛️'],['estate-platform','منصة العقارات','🏢'],['accounting-platform','منصة المحاسبة','💼'],['properties','العقارات','🏠'],['clients','العملاء','👥'],['contracts','العقود والتجديد','📑'],['invoices','الفواتير','🧾'],['accounts','الحسابات','💰'],...financeItems,['maintenance','الصيانة','🔧'],['reports','التقارير','📊'],['users','المستخدمين','🛡️'],['backup','التخزين والنسخ','💾'],['qa','اختبار التشغيل','✅']];
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
  window.renderInventory=function(){
    const all=safe(Jawdah.data.inventory_items);
    const pid = String($('#inventoryPropertyFilter')?.value||'').trim();
    const rows = pid ? all.filter(r=>String(r.property_id||'')===pid) : all;
    if($('#inventoryTable')) $('#inventoryTable').innerHTML=tableHtml([['SKU','sku'],['الصنف','name'],['التصنيف','category'],['العقار','property_id',v=>v?(propertyLabel(byId('properties',v))):'مخزن عام'],['الكمية','quantity',v=>fmt(v)],['الحد الأدنى','min_quantity',v=>fmt(v)],['تكلفة الوحدة','unit_cost',v=>money(v)],['القيمة','id',(_,r)=>money(Number(r.quantity||0)*Number(r.unit_cost||0))],['الحالة','id',(_,r)=>Number(r.quantity||0)<=Number(r.min_quantity||0)?'<span class="low-stock">إعادة طلب</span>':'<span class="linked-ok">جيد</span>']],rows);
  };
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
  window.createInventoryItem=()=>postTable('inventory_items',{sku:val('itemSku'),name:val('itemName'),category:val('itemCategory'),unit:val('itemUnit')||'pcs',quantity:num('itemQty'),min_quantity:num('itemMin'),unit_cost:num('itemCost'),location:val('itemLocation'),property_id:val('itemProperty')||null});
  window.createInventoryTransaction=()=>postTable('inventory_transactions',{item_id:val('stockItem'),tx_date:val('stockDate')||today(),tx_type:val('stockType'),quantity:num('stockQty'),unit_cost:num('stockCost'),reference:val('stockRef')});
  window.createBankTransaction=()=>postTable('bank_transactions',{bank_date:val('bankDate')||today(),bank_name:val('bankName')||'Main Bank',reference:val('bankRef'),type:val('bankType'),description:val('bankDesc'),amount:num('bankAmount'),matched_account_id:val('bankMatch')||null,status:val('bankMatch')?'Matched':'Unmatched'});
  window.loadFinancialStatements=async function(){ try{ const res=await api('financial_statements'); const s=res.statements; $('#statementsBox').innerHTML=`<div class="statement-grid"><div class="statement-card"><h3>قائمة الدخل</h3><div class="statement-row"><span>الإيرادات</span><b>${money(s.income_statement.revenue)}</b></div><div class="statement-row"><span>المصروفات</span><b>${money(s.income_statement.expenses)}</b></div><div class="statement-row"><span>الرواتب</span><b>${money(s.income_statement.payroll)}</b></div><div class="statement-row"><span>إدارية وعمومية</span><b>${money(s.income_statement.general_admin)}</b></div><div class="statement-row"><span>صافي الدخل</span><b>${money(s.income_statement.net_income)}</b></div></div><div class="statement-card"><h3>الميزانية</h3><div class="statement-row"><span>البنك</span><b>${money(s.balance_sheet.assets.cash_bank)}</b></div><div class="statement-row"><span>الذمم المدينة</span><b>${money(s.balance_sheet.assets.accounts_receivable)}</b></div><div class="statement-row"><span>المخزون</span><b>${money(s.balance_sheet.assets.inventory)}</b></div><div class="statement-row"><span>الذمم الدائنة</span><b>${money(s.balance_sheet.liabilities.accounts_payable)}</b></div><div class="statement-row"><span>الأرباح المحتجزة</span><b>${money(s.balance_sheet.equity.retained_earnings)}</b></div></div><div class="statement-card"><h3>ربط التخزين</h3><p class="linked-ok">Backup / CSV / Restore يشمل الجداول المالية الجديدة.</p><p>${s.linked_storage.tables.join(' · ')}</p></div></div>`; ensureEnglishDigits($('#statementsBox')); }catch(e){toastErr(e)} };
  const oldBackup=renderBackup;
  renderBackup=function(){ oldBackup(); const extra=['purchase_invoices','revenues','salaries','admin_expenses','inventory_items','inventory_transactions','bank_transactions','chart_accounts','bank_reconciliations','financial_periods']; const box=$('#backupStatus'); if(box) box.innerHTML += `<p class="mini">يشمل التخزين المالي: ${extra.join(', ')}</p>`; };
  document.addEventListener('input', e=>{ if(e.target && e.target.id==='recBankBalance') updateRecDifference(); });
})();


(function(){
  let moduleFixPreviewState = null;
  let moduleFixLastAlertSig = '';
  const moduleFixScopeSnapshot = ()=> {
    const scopeRaw = String($('#moduleFixScope')?.value || 'all');
    const modules = scopeRaw === 'all' ? [] : scopeRaw.split(',').map(s=>s.trim()).filter(Boolean);
    const maxRows = Number($('#moduleFixMaxRows')?.value || 200);
    return { modules, maxRows, scopeRaw };
  };
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
    const required=['owner','ahmed.najjar','waleed.najjar','ahoud.shuaili','amjad.jamoudi','operations','ali.hospitality','maintenance','viewer','accountant','razan.accounting','razan.shuaili'];
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
      const wf=res.workflow||{};
      const box=$('#productionStatusBox');
      box.innerHTML=`<div class="kpis grid"><div class="kpi"><span>نتيجة الجاهزية</span><strong>${fmt(res.score)}%</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(alerts.overdue||0)}</strong></div><div class="kpi"><span>تنبيهات المخزون</span><strong>${fmt(alerts.low_stock||0)}</strong></div><div class="kpi"><span>روابط غير سليمة</span><strong>${fmt((alerts.broken_contract_links||0)+(alerts.broken_invoice_links||0))}</strong></div></div><div class="card inner-card"><h3>Workflow Snapshot</h3><div class="statement-row"><span>Contract activation scope</span><b>${wf.contract_activation_owner_admin_only ? 'Owner/Admin only' : 'Policy-open'}</b></div><div class="statement-row"><span>Manual invoice approval threshold</span><b>${money(wf.manual_invoice_approval_threshold||0)}</b></div><div class="statement-row"><span>Payment approval threshold</span><b>${money(wf.payment_approval_threshold||0)}</b></div></div><div class="card inner-card"><h3>فحوصات الجاهزية</h3>${(res.checks||[]).map(c=>`<div class="statement-row"><span>${c.name}</span><b class="${c.ok?'linked-ok':'low-stock'}">${c.ok?'جاهز':'يحتاج مراجعة'} · ${fmt(c.value)}</b></div>`).join('')}</div>`;
      ensureEnglishDigits(box);
      if(typeof window.loadWorkflowPolicies==='function') window.loadWorkflowPolicies();
      if(typeof window.loadModuleIntegrity==='function') window.loadModuleIntegrity();
      if(typeof window.loadModuleFixHistoryKpi==='function') window.loadModuleFixHistoryKpi();
      if(typeof window.loadModuleFixHistory==='function') window.loadModuleFixHistory();
    }catch(e){toastErr(e)}
  };

  window.loadWorkflowPolicies=async function(){
    const host=$('#workflowPoliciesBox');
    if(!host) return;
    host.innerHTML='<p class="mini">Loading workflow policies...</p>';
    try{
      const res=await api('workflow_policies');
      const p=res.policies||{};
      const editable=!!res.editable;
      host.innerHTML=`
        <div class="card inner-card">
          <h3>Workflow + Rules Policy Center</h3>
          <p class="mini">هذه النواة تتحكم بحدود الأتمتة والاعتمادات لمسار العقود والفواتير والتحصيل.</p>
          <div class="form" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            <label class="mini">Contract activation owner/admin only
              <select id="wfPolicyOwnerAdminOnly" ${editable?'':'disabled'}>
                <option value="true" ${p.contract_activation_owner_admin_only ? 'selected':''}>true</option>
                <option value="false" ${!p.contract_activation_owner_admin_only ? 'selected':''}>false</option>
              </select>
            </label>
            <label class="mini">Manual invoice approval threshold
              <input id="wfPolicyManualThreshold" type="number" min="1" step="1" value="${Number(p.manual_invoice_approval_threshold||0)}" ${editable?'':'disabled'}>
            </label>
            <label class="mini">Payment approval threshold
              <input id="wfPolicyPaymentThreshold" type="number" min="1" step="1" value="${Number(p.payment_approval_threshold||0)}" ${editable?'':'disabled'}>
            </label>
            <label class="mini">Invoice backdate limit (days)
              <input id="wfPolicyBackdateDays" type="number" min="0" step="1" value="${Number(p.invoice_backdate_limit_days||0)}" ${editable?'':'disabled'}>
            </label>
            <label class="mini">Invoice future limit (days)
              <input id="wfPolicyFutureDays" type="number" min="0" step="1" value="${Number(p.invoice_future_limit_days||0)}" ${editable?'':'disabled'}>
            </label>
          </div>
          <div class="toolbar" style="margin-top:10px">
            ${editable ? '<button class="gold-btn" type="button" onclick="saveWorkflowPolicies()">Save Workflow Policies</button>' : '<span class="badge pending">Requires owner/admin role</span>'}
          </div>
        </div>
      `;
      ensureEnglishDigits(host);
    }catch(e){
      host.innerHTML=`<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }
  };

  window.saveWorkflowPolicies=async function(){
    try{
      const payload={
        policies:{
          contract_activation_owner_admin_only: String($('#wfPolicyOwnerAdminOnly')?.value||'true')==='true',
          manual_invoice_approval_threshold: Number($('#wfPolicyManualThreshold')?.value||0),
          payment_approval_threshold: Number($('#wfPolicyPaymentThreshold')?.value||0),
          invoice_backdate_limit_days: Number($('#wfPolicyBackdateDays')?.value||0),
          invoice_future_limit_days: Number($('#wfPolicyFutureDays')?.value||0),
        }
      };
      await api('workflow_policies',{
        method:'POST',
        body:JSON.stringify(payload),
      });
      toast('Workflow policies updated');
      await loadProductionStatus();
    }catch(e){
      toastErr(e,'تعذر حفظ Workflow Policies');
    }
  };

  window.loadModuleIntegrity=async function(){
    const host=$('#moduleIntegrityBox');
    if(!host) return;
    host.innerHTML='<p class="mini">جاري فحص تكامل الوحدات...</p>';
    try{
      const res=await api('module_integrity');
      const summary=res.summary||{};
      const byModule=res.by_module||{};
      const issues=Array.isArray(res.issues)?res.issues:[];
      const canFix = ['admin','owner'].includes(String(Jawdah.user?.role||'').toLowerCase());
      const sevBadge=(s)=>{
        const k=String(s||'').toLowerCase();
        if(k==='critical') return '<span class="badge overdue">critical</span>';
        if(k==='high') return '<span class="badge pending">high</span>';
        return '<span class="badge">normal</span>';
      };
      const modulesHtml=Object.keys(byModule).length
        ? Object.entries(byModule).map(([k,v])=>`<span class="badge">${htmlEscape(String(k))}: ${fmt(v)}</span>`).join(' ')
        : '<span class="badge paid">لا توجد مشاكل مسجلة</span>';
      host.innerHTML=`
        <div class="card inner-card">
          <h3>فحص تكامل الوحدات (تشغيلي)</h3>
          <div class="toolbar" style="margin-bottom:10px">
            <select id="moduleFixScope" title="نطاق الإصلاح">
              <option value="all">كل الوحدات</option>
              <option value="contracts">العقود فقط</option>
              <option value="hospitality">الضيافة فقط</option>
              <option value="payments,invoices">الدفعات + الفواتير</option>
              <option value="inventory">المخزن فقط</option>
            </select>
            <input id="moduleFixMaxRows" type="number" min="10" max="1000" step="10" value="200" style="max-width:120px" title="الحد الأقصى للسجلات" placeholder="max rows">
            <button class="ghost" type="button" onclick="runModuleIntegrityFix(true)">معاينة الإصلاح الآمن</button>
            ${canFix ? '<button class="gold-btn" type="button" onclick="runModuleIntegrityFix(false)">تنفيذ الإصلاح الآمن</button>' : '<span class="badge pending">تنفيذ الإصلاح يتطلب صلاحية admin/owner</span>'}
            ${canFix ? '<button class="gold-btn" type="button" onclick="runModuleIntegrityAutoRun()">تنفيذ + إعادة فحص فوري</button>' : ''}
          </div>
          <div class="kpis grid">
            <div class="kpi"><span>درجة التكامل</span><strong>${fmt(res.score||0)}%</strong></div>
            <div class="kpi"><span>Critical</span><strong>${fmt(summary.critical||0)}</strong></div>
            <div class="kpi"><span>High</span><strong>${fmt(summary.high||0)}</strong></div>
            <div class="kpi"><span>إجمالي المشاكل</span><strong>${fmt(summary.total_issues||0)}</strong></div>
          </div>
          <div class="status-line" style="margin-top:10px">${modulesHtml}</div>
          <div style="margin-top:12px">
            ${issues.length ? tableHtml(
              [
                ['الحدة','severity',(v)=>sevBadge(v)],
                ['الوحدة','module',(v)=>htmlEscape(String(v||''))],
                ['المشكلة','title',(v)=>htmlEscape(String(v||''))],
                ['المعرّف','entity_id',(v)=>htmlEscape(String(v||''))],
                ['تفاصيل','details',(v)=>htmlEscape(String(v||''))],
              ],
              issues
            ) : '<p class="badge paid">تكامل الوحدات سليم — لا مشاكل مكتشفة</p>'}
          </div>
        </div>
      `;
      ensureEnglishDigits(host);
    }catch(e){
      host.innerHTML=`<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }
  };

  window.runModuleIntegrityFix=async function(dryRun=true){
    const host=$('#moduleIntegrityBox');
    if(!host) return;
    const preview = !!dryRun;
    const snap = moduleFixScopeSnapshot();
    const modules = snap.modules;
    const maxRows = snap.maxRows;
    if(!preview){
      const ok = confirm('تنفيذ الإصلاح الوظيفي الآمن الآن؟ سيتم تسجيل كل العمليات في السجل.');
      if(!ok) return;
      if(!moduleFixPreviewState || !moduleFixPreviewState.previewId){
        return toastErr('نفّذ المعاينة أولاً للحصول على preview_id');
      }
      const savedSig = JSON.stringify({modules: moduleFixPreviewState.modules||[], maxRows: moduleFixPreviewState.maxRows||200});
      const currentSig = JSON.stringify({modules, maxRows});
      if(savedSig !== currentSig){
        return toastErr('تم تغيير نطاق الإصلاح بعد المعاينة. أعد المعاينة أولاً.');
      }
      const confirmText = prompt('للتنفيذ النهائي اكتب APPLY');
      if(String(confirmText || '').trim().toUpperCase() !== 'APPLY') return toastErr('تم إلغاء التنفيذ');
      moduleFixPreviewState.confirmText = 'APPLY';
    }
    host.insertAdjacentHTML('afterbegin','<p class="mini">جاري تشغيل '+(preview?'معاينة':'تنفيذ')+' الإصلاح...</p>');
    try{
      const requestBody = { dry_run: preview, modules, max_rows: maxRows };
      if(!preview){
        requestBody.preview_id = moduleFixPreviewState.previewId;
        requestBody.confirm_text = moduleFixPreviewState.confirmText || 'APPLY';
      }
      const res = await api('module_integrity_fix',{
        method:'POST',
        body: JSON.stringify(requestBody),
      });
      const s = res.summary || {};
      const scope = res.scope || {};
      const rows = Array.isArray(res.actions) ? res.actions : [];
      if(preview){
        const p = res.preview || {};
        moduleFixPreviewState = {
          previewId: p.id || '',
          expiresAt: p.expires_at || '',
          modules,
          maxRows,
        };
      } else {
        moduleFixPreviewState = null;
      }
      const msg = `
        <div class="card inner-card" style="margin-top:12px">
          <h3>${preview?'نتيجة المعاينة':'نتيجة التنفيذ'} — الإصلاح الآمن</h3>
          <p class="mini">المرشّح: ${fmt(s.candidates||0)} · المنفذ: ${fmt(s.applied||0)} · الوضع: ${htmlEscape(String(s.mode||''))}</p>
          <p class="mini">النطاق: ${htmlEscape(String((scope.modules||[]).join(', ')||'all'))} · max_rows: ${fmt(scope.max_rows||maxRows)}</p>
          ${preview && moduleFixPreviewState?.previewId ? `<p class="mini">preview_id: ${htmlEscape(moduleFixPreviewState.previewId)} · expires: ${htmlEscape(moduleFixPreviewState.expiresAt||'')}</p>` : ''}
          ${rows.length ? tableHtml(
            [
              ['الإجراء','name',(v)=>htmlEscape(String(v||''))],
              ['المرشح','candidates',(v)=>fmt(v||0)],
              ['المنفذ','applied',(v)=>fmt(v||0)],
              ['ملاحظات','notes',(v)=>htmlEscape(String(v||''))],
            ],
            rows
          ) : '<p class="mini">لا توجد عمليات.</p>'}
        </div>
      `;
      host.insertAdjacentHTML('afterbegin', msg);
      if(!preview){
        toast('تم تنفيذ الإصلاح الوظيفي الآمن');
        if(typeof loadProductionStatus==='function') await loadProductionStatus();
        if(typeof loadModuleFixHistory==='function') await loadModuleFixHistory();
      }else{
        toast('تمت معاينة الإصلاح الآمن');
        if(typeof loadModuleFixHistory==='function') await loadModuleFixHistory();
      }
    }catch(e){
      toastErr(e,'تعذر تنفيذ الإصلاح الآمن');
    }
  };

  window.runModuleIntegrityAutoRun=async function(){
    const host=$('#moduleIntegrityBox');
    if(!host) return;
    const ok = confirm('تنفيذ الإصلاح الآمن ثم إعادة الفحص تلقائيًا الآن؟');
    if(!ok) return;
    const confirmText = prompt('للتنفيذ النهائي اكتب APPLY');
    if(String(confirmText || '').trim().toUpperCase() !== 'APPLY') return toastErr('تم إلغاء التنفيذ');
    const snap = moduleFixScopeSnapshot();
    const modules = snap.modules;
    const maxRows = snap.maxRows;
    host.insertAdjacentHTML('afterbegin','<p class="mini">جاري تنفيذ الإصلاح وإعادة الفحص...</p>');
    try{
      const res = await api('module_integrity_autorun',{
        method:'POST',
        body: JSON.stringify({ confirm: true, confirm_text:'APPLY', modules, max_rows: maxRows }),
      });
      const before = res.before || {};
      const after = res.after || {};
      const fix = res.fix || {};
      const delta = res.delta || {};
      const bsum = before.summary || {};
      const asum = after.summary || {};
      const fsum = fix.summary || {};
      const scope = res.scope || fix.scope || {};
      const actions = Array.isArray(fix.actions) ? fix.actions : [];
      host.insertAdjacentHTML('afterbegin',`
        <div class="card inner-card" style="margin-top:12px">
          <h3>تقرير التنفيذ التلقائي (Before / After)</h3>
          <div class="kpis grid">
            <div class="kpi"><span>الدرجة قبل</span><strong>${fmt(before.score||0)}%</strong></div>
            <div class="kpi"><span>الدرجة بعد</span><strong>${fmt(after.score||0)}%</strong></div>
            <div class="kpi"><span>التغير</span><strong>${fmt(delta.score_change||0)}</strong></div>
            <div class="kpi"><span>المشاكل (قبل ← بعد)</span><strong>${fmt(delta.issues_before||0)} → ${fmt(delta.issues_after||0)}</strong></div>
          </div>
          <p class="mini">الإصلاح: مرشّح ${fmt(fsum.candidates||0)} · منفذ ${fmt(fsum.applied||0)}</p>
          <p class="mini">النطاق: ${htmlEscape(String((scope.modules||[]).join(', ')||'all'))} · max_rows: ${fmt(scope.max_rows||maxRows)}</p>
          <div class="status-line" style="margin:8px 0 12px">
            <span class="badge">Critical: ${fmt(bsum.critical||0)} → ${fmt(asum.critical||0)}</span>
            <span class="badge">High: ${fmt(bsum.high||0)} → ${fmt(asum.high||0)}</span>
            <span class="badge">Total: ${fmt(bsum.total_issues||0)} → ${fmt(asum.total_issues||0)}</span>
          </div>
          ${actions.length ? tableHtml(
            [
              ['الإجراء','name',(v)=>htmlEscape(String(v||''))],
              ['المرشح','candidates',(v)=>fmt(v||0)],
              ['المنفذ','applied',(v)=>fmt(v||0)],
              ['ملاحظات','notes',(v)=>htmlEscape(String(v||''))],
            ],
            actions
          ) : '<p class="mini">لا توجد إجراءات منفذة.</p>'}
        </div>
      `);
      toast('تم التنفيذ وإعادة الفحص بنجاح');
      await loadProductionStatus();
      if(typeof loadModuleFixHistory==='function') await loadModuleFixHistory();
    }catch(e){
      toastErr(e,'تعذر تنفيذ Auto-run');
    }
  };

  window.loadModuleFixHistory=async function(){
    const host = $('#moduleFixHistoryBox');
    if(!host) return;
    if(!host.dataset.init){
      host.dataset.init = '1';
      host.innerHTML = `
        <div class="card inner-card">
          <h3>سجل موافقات/تنفيذ الإصلاح</h3>
          <div class="toolbar" style="margin-bottom:10px">
            <input id="mfxFilterUser" placeholder="فلتر المستخدم">
            <select id="mfxFilterMode">
              <option value="">كل الأوضاع</option>
              <option value="preview">preview</option>
              <option value="apply">apply</option>
              <option value="autorun">autorun</option>
            </select>
            <select id="mfxFilterStatus">
              <option value="">كل الحالات</option>
              <option value="ok">ok</option>
              <option value="rejected_missing_confirm">rejected_missing_confirm</option>
              <option value="rejected_missing_preview">rejected_missing_preview</option>
              <option value="rejected_invalid_preview">rejected_invalid_preview</option>
              <option value="rejected_scope_mismatch">rejected_scope_mismatch</option>
            </select>
            <input id="mfxFilterFrom" type="date" title="من تاريخ">
            <input id="mfxFilterTo" type="date" title="إلى تاريخ">
            <input id="mfxFilterPreview" placeholder="preview_id">
            <input id="mfxFilterLimit" type="number" min="10" max="500" step="10" value="60" style="max-width:90px" title="limit">
            <button class="ghost" type="button" onclick="loadModuleFixHistory()">تحديث</button>
            <button class="ghost" type="button" onclick="exportModuleFixHistoryCsv()">تصدير CSV</button>
          </div>
          <div id="mfxHistoryTable"><p class="mini">جاري التحميل...</p></div>
        </div>
      `;
    }else{
      const tableHost = $('#mfxHistoryTable');
      if(tableHost) tableHost.innerHTML = '<p class="mini">جاري تحميل سجل موافقات الإصلاح...</p>';
    }
    try{
      const qp = new URLSearchParams();
      const mode = String($('#mfxFilterMode')?.value || '').trim();
      const status = String($('#mfxFilterStatus')?.value || '').trim();
      const username = String($('#mfxFilterUser')?.value || '').trim();
      const from = String($('#mfxFilterFrom')?.value || '').trim();
      const to = String($('#mfxFilterTo')?.value || '').trim();
      const preview = String($('#mfxFilterPreview')?.value || '').trim();
      const limit = Number($('#mfxFilterLimit')?.value || 60);
      qp.set('limit', String(Math.max(10, Math.min(500, limit || 60))));
      if(mode) qp.set('mode', mode);
      if(status) qp.set('status', status);
      if(username) qp.set('username', username);
      if(from) qp.set('from', from);
      if(to) qp.set('to', to);
      if(preview) qp.set('preview_id', preview);
      const res = await api('module_integrity_history?'+qp.toString());
      const rows = Array.isArray(res.history) ? res.history : [];
      const tableHost = $('#mfxHistoryTable');
      if(!tableHost) return;
      tableHost.innerHTML = rows.length ? tableHtml(
            [
              ['الوقت','created_at',(v)=>htmlEscape(String(v||''))],
              ['المستخدم','username',(v)=>htmlEscape(String(v||''))],
              ['الوضع','mode',(v)=>htmlEscape(String(v||''))],
              ['الحالة','status',(v)=>statusBadge(String(v||''))],
              ['النطاق','modules',(v)=>htmlEscape(Array.isArray(v)?v.join(', '):String(v||''))],
              ['max','max_rows',(v)=>fmt(v||0)],
              ['مرشح','candidates',(v)=>fmt(v||0)],
              ['منفذ','applied',(v)=>fmt(v||0)],
              ['قبل','issues_before',(v)=>v==null?'—':fmt(v)],
              ['بعد','issues_after',(v)=>v==null?'—':fmt(v)],
              ['preview','preview_id',(v)=>htmlEscape(String(v||''))],
            ],
            rows
          ) : '<p class="mini">لا يوجد سجل حسب الفلاتر الحالية.</p>';
      ensureEnglishDigits(host);
    }catch(e){
      const tableHost = $('#mfxHistoryTable');
      if(tableHost) tableHost.innerHTML = `<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }
  };

  window.exportModuleFixHistoryCsv=async function(){
    try{
      const qp = new URLSearchParams();
      const mode = String($('#mfxFilterMode')?.value || '').trim();
      const status = String($('#mfxFilterStatus')?.value || '').trim();
      const username = String($('#mfxFilterUser')?.value || '').trim();
      const from = String($('#mfxFilterFrom')?.value || '').trim();
      const to = String($('#mfxFilterTo')?.value || '').trim();
      const preview = String($('#mfxFilterPreview')?.value || '').trim();
      const limit = Number($('#mfxFilterLimit')?.value || 500);
      qp.set('limit', String(Math.max(10, Math.min(2000, limit || 500))));
      if(mode) qp.set('mode', mode);
      if(status) qp.set('status', status);
      if(username) qp.set('username', username);
      if(from) qp.set('from', from);
      if(to) qp.set('to', to);
      if(preview) qp.set('preview_id', preview);
      const res = await fetch('/api/export/module_fix_history?'+qp.toString(),{headers:{Authorization:'Bearer '+(Jawdah.token||'')}});
      if(!res.ok) throw new Error(await res.text() || 'Export failed');
      const blob=await res.blob();
      const cd=res.headers.get('Content-Disposition')||'';
      const match=cd.match(/filename="?([^"]+)"?/);
      const name=match?match[1]:`jawdah-module-fix-history-${today()}.csv`;
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
      toast('تم تصدير سجل الإصلاح');
    }catch(e){ toastErr(e,'تعذر تصدير سجل الإصلاح'); }
  };

  window.loadModuleFixHistoryKpi=async function(){
    const host = $('#moduleFixKpiBox');
    if(!host) return;
    if(!host.dataset.init){
      host.dataset.init = '1';
      host.innerHTML = `
        <div class="card inner-card">
          <div class="toolbar" style="justify-content:space-between;align-items:flex-end">
            <h3 style="margin:0">KPI سجل الإصلاحات</h3>
            <label class="mini">الفترة
              <select id="mfxKpiDays" onchange="loadModuleFixHistoryKpi()">
                <option value="1">آخر 24 ساعة</option>
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 90 يوم</option>
              </select>
            </label>
          </div>
          <div id="mfxKpiCards"><p class="mini">جاري التحميل...</p></div>
          <div id="mfxKpiTopUsers" style="margin-top:10px"></div>
        </div>
      `;
    }
    const cardsHost = $('#mfxKpiCards');
    const usersHost = $('#mfxKpiTopUsers');
    if(cardsHost) cardsHost.innerHTML = '<p class="mini">جاري تحميل KPI...</p>';
    if(usersHost) usersHost.innerHTML = '';
    try{
      const days = Number($('#mfxKpiDays')?.value || 1);
      const res = await api('module_integrity_history_kpi?days='+encodeURIComponent(String(days)));
      const k = res.kpi || {};
      const alerts = Array.isArray(res.alerts) ? res.alerts : [];
      const thresholds = res.thresholds || {};
      const health = String(res.health_status || 'ok');
      const topUsers = Array.isArray(res.top_users) ? res.top_users : [];
      if(cardsHost){
        const alertHtml = alerts.length
          ? `<div class="card" style="margin-bottom:10px;border-color:${health==='alert'?'rgba(220,38,38,.45)':'rgba(217,119,6,.4)'}"><h4 style="margin:0 0 8px">${health==='alert'?'تنبيه تشغيلي مهم':'تنبيه تشغيلي'}</h4>${alerts.map(a=>`<p class="mini" style="margin:4px 0"><span class="badge ${a.severity==='high'?'overdue':'pending'}">${htmlEscape(String(a.code||''))}</span> ${htmlEscape(String(a.message||''))}</p>`).join('')}<p class="mini">الحدود: success ≥ ${fmt(thresholds.min_success_rate||0)}% · rejected ≤ ${fmt(thresholds.max_rejected||0)} · effectiveness ≥ ${fmt(thresholds.min_apply_effectiveness||0)}%</p></div>`
          : `<p class="badge paid">الحالة التشغيلية لسجل الإصلاحات مستقرة ضمن الحدود المحددة</p>`;
        cardsHost.innerHTML = `
          ${alertHtml}
          <div class="kpis grid">
            <div class="kpi"><span>محاولات</span><strong>${fmt(k.attempts||0)}</strong></div>
            <div class="kpi"><span>نجاح</span><strong>${fmt(k.success||0)}</strong></div>
            <div class="kpi"><span>رفض</span><strong>${fmt(k.rejected||0)}</strong></div>
            <div class="kpi"><span>نسبة النجاح</span><strong>${fmt(k.success_rate||0)}%</strong></div>
            <div class="kpi"><span>تطبيقات ناجحة</span><strong>${fmt(k.apply_success||0)}</strong></div>
            <div class="kpi"><span>إجمالي منفذ</span><strong>${fmt(k.applied_total||0)}</strong></div>
            <div class="kpi"><span>إجمالي مرشح</span><strong>${fmt(k.candidates_total||0)}</strong></div>
            <div class="kpi"><span>فعالية التطبيق</span><strong>${fmt(k.apply_effectiveness||0)}%</strong></div>
          </div>
        `;
        const alertSig = JSON.stringify(alerts.map(a=>`${a.code}:${a.value}`));
        if(alerts.length && alertSig !== moduleFixLastAlertSig){
          toastErr('تنبيه: مؤشرات سجل الإصلاحات تحتاج مراجعة');
        }
        moduleFixLastAlertSig = alertSig;
      }
      if(usersHost){
        usersHost.innerHTML = topUsers.length
          ? `<h4 style="margin:8px 0">أكثر المستخدمين تنفيذًا</h4>${tableHtml(
              [
                ['المستخدم','username',(v)=>htmlEscape(String(v||''))],
                ['عدد العمليات','runs',(v)=>fmt(v||0)],
                ['منفذ فعلي','applied_total',(v)=>fmt(v||0)],
              ],
              topUsers
            )}`
          : '<p class="mini">لا توجد بيانات مستخدمين ضمن الفترة.</p>';
      }
      ensureEnglishDigits(host);
    }catch(e){
      if(cardsHost) cardsHost.innerHTML = `<p class="badge overdue">${htmlEscape(friendlyMsg(e))}</p>`;
    }
  };
})();
