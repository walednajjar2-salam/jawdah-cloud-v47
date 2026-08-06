/* عقود · فواتير · سندات — تصميم قريب من موقع النجار والسموم */
(function (global) {
  const LOGO = '/auto-trading/assets/logo-official-clear.png?v=at13';

  function esc(v) {
    return String(v ?? '').replace(/[&<>'"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[c]));
  }

  function money(v) {
    return `${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })} ر.ع`;
  }

  function dmy(v) {
    if (!v) return '—';
    const p = String(v).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : esc(v);
  }

  function docStyles() {
    return `
      @page { size: A4; margin: 12mm; }
      :root{
        --gold:#caa14a; --gold2:#f0d98a; --ink:#1a1408; --muted:#6b5a3a;
        --line:rgba(202,161,74,.55); --soft:#fffaf0; --bg:#fff;
      }
      *{box-sizing:border-box}
      body{
        margin:0; padding:0;
        font-family:"Cairo","Tajawal",Tahoma,Arial,sans-serif;
        color:var(--ink); background:#efe6d2;
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .sheet{
        width:210mm; min-height:297mm; margin:12px auto; padding:18mm 16mm;
        background:
          radial-gradient(circle at 12% 0%, rgba(240,217,138,.22), transparent 34%),
          linear-gradient(180deg,#fffef9 0%, #fff 48%, #fffaf0 100%);
        border:1px solid var(--line);
        box-shadow:0 18px 40px rgba(0,0,0,.18);
        position:relative;
      }
      .sheet:before{
        content:""; position:absolute; inset:8px; border:1px solid rgba(202,161,74,.28);
        pointer-events:none;
      }
      .brand{
        display:grid; grid-template-columns:110px 1fr 110px; gap:10px;
        align-items:center; border-bottom:3px solid var(--gold); padding-bottom:12px; margin-bottom:14px;
      }
      .brand img{width:96px; height:auto; object-fit:contain}
      .brand-center{text-align:center}
      .brand-center h1{
        margin:0; font-size:20px; letter-spacing:.04em; color:#111;
        font-family:"Playfair Display","Cairo",serif;
      }
      .brand-center h2{margin:4px 0 0; font-size:14px; color:var(--gold); font-weight:800}
      .brand-center p{margin:4px 0 0; font-size:11px; color:var(--muted)}
      .badge{
        display:inline-block; margin-top:8px; padding:4px 12px; border-radius:999px;
        background:linear-gradient(135deg,#1a1408,#3a2a10); color:var(--gold2);
        font-size:12px; font-weight:800; border:1px solid var(--gold);
      }
      .meta-row{
        display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;
        margin:10px 0 14px; font-size:12px; color:var(--muted);
      }
      .meta-row strong{color:var(--ink)}
      h3.sec{
        margin:16px 0 8px; font-size:14px; color:#111;
        border-right:4px solid var(--gold); padding-right:8px;
      }
      table{width:100%; border-collapse:collapse; margin:8px 0 12px}
      th,td{border:1px solid var(--line); padding:8px 10px; text-align:right; font-size:12.5px; vertical-align:top}
      th{width:32%; background:linear-gradient(180deg,#fff6df,#f7ecd0); color:#3a2a10; font-weight:800}
      .box{
        border:1px solid var(--line); border-radius:12px; padding:12px 14px;
        background:var(--soft); margin:10px 0; font-size:12.5px; line-height:1.7;
      }
      .clauses{font-size:12.5px; line-height:1.85; margin:8px 0 0; padding-right:18px}
      .clauses li{margin:4px 0}
      .sign-grid{
        display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:28px;
      }
      .sign{
        border:1px dashed var(--line); border-radius:12px; padding:14px; min-height:120px;
        background:rgba(255,255,255,.7);
      }
      .sign b{display:block; margin-bottom:8px; color:#111}
      .sign .line{margin-top:42px; border-top:1px solid #cbb98a; padding-top:6px; font-size:11px; color:var(--muted)}
      .totals{
        margin-top:10px; border:2px solid var(--gold); border-radius:12px; overflow:hidden;
      }
      .totals table{margin:0}
      .totals th,.totals td{border:none; border-bottom:1px solid var(--line)}
      .totals tr:last-child th,.totals tr:last-child td{border-bottom:none; background:#1a1408; color:var(--gold2); font-size:14px}
      .foot{
        margin-top:22px; padding-top:10px; border-top:1px solid var(--line);
        text-align:center; font-size:11px; color:var(--muted);
      }
      .watermark{
        position:absolute; inset:0; display:grid; place-items:center; pointer-events:none; opacity:.045;
      }
      .watermark img{width:62%; max-width:420px}
      @media print{
        body{background:#fff}
        .sheet{margin:0; box-shadow:none; border:none; width:auto; min-height:auto}
        .no-print{display:none !important}
      }
    `;
  }

  function brandHeader(c, docTitleAr, docTitleEn, docNo) {
    const company = c || {};
    return `
      <div class="watermark"><img src="${LOGO}" alt=""></div>
      <div class="brand">
        <img src="${LOGO}" alt="NAJJAR & AL SAMOOM">
        <div class="brand-center">
          <h1>NAJJAR &amp; AL SAMOOM TRADING</h1>
          <h2>النجار والسموم للتجارة</h2>
          <p>USED &amp; IMPORTED CARS · ${esc(company.address_ar || 'نزوى — الفلج')} · سلطنة عُمان</p>
          <div class="badge">${esc(docTitleAr)}${docTitleEn ? ' · ' + esc(docTitleEn) : ''}</div>
        </div>
        <div style="text-align:left;font-size:11px;color:var(--muted);line-height:1.6">
          <div dir="ltr">+968 71924089</div>
          <div dir="ltr">+968 93391994</div>
          <div dir="ltr">+968 77548482</div>
        </div>
      </div>
      <div class="meta-row">
        <span>رقم المستند: <strong dir="ltr">${esc(docNo || '—')}</strong></span>
        <span>التاريخ: <strong>${esc(arguments[4] || '—')}</strong></span>
        <span>المكان: <strong>نزوى — سلطنة عُمان</strong></span>
      </div>
    `;
  }

  function bankBox(c) {
    const bank = (c || {}).bank || {};
    return `
      <div class="box">
        <b>بيانات التحويل البنكي · ${esc(bank.name_ar || 'بنك صحار الدولي')}</b><br>
        اسم الحساب: ${esc(bank.account_name_en || 'Al Najjar Trading')}<br>
        IBAN: <span dir="ltr">${esc(bank.iban || '')}</span><br>
        SWIFT: <span dir="ltr">${esc(bank.swift || '')}</span>
      </div>`;
  }

  function vehicleTable(v) {
    return `
      <h3 class="sec">بيانات المركبة</h3>
      <table>
        <tr><th>الماركة / الطراز</th><td>${esc(v.make || '')} ${esc(v.model || '')} ${esc(v.variant || '')}</td></tr>
        <tr><th>السنة / اللون / النوع</th><td>${esc(v.year || '—')} · ${esc(v.color || '—')} · ${esc(v.vehicle_type || '—')}</td></tr>
        <tr><th>رقم المخزون</th><td dir="ltr">${esc(v.stock_no || '—')}</td></tr>
        <tr><th>رقم الهيكل (VIN)</th><td dir="ltr">${esc(v.vin || '—')}</td></tr>
        <tr><th>رقم المحرك</th><td dir="ltr">${esc(v.engine_no || '—')}${v.engine_cc ? ' · ' + esc(v.engine_cc) + ' cc' : ''}</td></tr>
        <tr><th>رقم اللوحة</th><td>${esc(v.plate_no || '—')}</td></tr>
        <tr><th>بلد المنشأ / مرجع الاستيراد</th><td>${esc(v.origin_country || '—')} · ${esc(v.import_ref || '—')}</td></tr>
      </table>`;
  }

  function signBlock(leftTitle, rightTitle) {
    return `
      <div class="sign-grid">
        <div class="sign"><b>${esc(leftTitle)}</b><div class="line">التوقيع / الختم</div></div>
        <div class="sign"><b>${esc(rightTitle)}</b><div class="line">التوقيع</div></div>
      </div>`;
  }

  function openDoc(title, innerHtml) {
    const w = window.open('', '_blank');
    if (!w) {
      if (typeof toast === 'function') toast('فعّل النوافذ المنبثقة للطباعة', 'error');
      return;
    }
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <title>${esc(title)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
      <style>${docStyles()}</style></head>
      <body><div class="sheet">${innerHtml}
        <div class="foot">NAJJAR &amp; AL SAMOOM TRADING · C.R. Trade · Nizwa Falaj · Sultanate of Oman<br>
        هذا المستند صادر إلكترونياً من نظام الشركة · للطباعة الرسمية ضع الختم والتوقيع</div>
      </div>
      <div class="no-print" style="text-align:center;margin:12px">
        <button onclick="window.print()" style="padding:10px 18px;border-radius:10px;border:1px solid #caa14a;background:#1a1408;color:#f0d98a;font-weight:800;cursor:pointer">طباعة / PDF</button>
      </div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch (_) {} }, 450);
  }

  /** عقد بيع مركبة — سلطنة عُمان */
  function printSaleContract(sale, vehicle, company) {
    const v = Object.assign({}, vehicle || {}, sale || {});
    const c = company || {};
    const price = Number(sale.sale_price || 0);
    const deposit = Number(sale.deposit_amount || 0);
    const remaining = Math.max(0, price - deposit);
    const body = `
      ${brandHeader(c, 'عقد بيع مركبة', 'Vehicle Sale Contract', sale.sale_no, dmy(sale.sale_date))}
      <div class="box">
        تم الاتفاق في سلطنة عُمان — ولاية نزوى، بين كل من:<br>
        <b>الطرف الأول (البائع):</b> النجار والسموم للتجارة — NAJJAR &amp; AL SAMOOM TRADING، مقرها ${esc(c.address_ar || 'نزوى — الفلج')}.<br>
        <b>الطرف الثاني (المشتري):</b> ${esc(sale.buyer_name || '—')}
        ${sale.buyer_id ? ' · رقم الهوية/البطاقة: <span dir="ltr">' + esc(sale.buyer_id) + '</span>' : ''}
        ${sale.buyer_phone ? ' · هاتف: <span dir="ltr">' + esc(sale.buyer_phone) + '</span>' : ''}.
      </div>
      ${vehicleTable(v)}
      <h3 class="sec">الثمن وطريقة السداد</h3>
      <div class="totals"><table>
        <tr><th>سعر البيع المتفق عليه</th><td><b>${money(price)}</b></td></tr>
        <tr><th>المبلغ المدفوع / العربون</th><td>${money(deposit)}</td></tr>
        <tr><th>المتبقي</th><td>${money(remaining)}</td></tr>
        <tr><th>طريقة الدفع</th><td>${esc(sale.payment_method || '—')}</td></tr>
      </table></div>
      ${bankBox(c)}
      <h3 class="sec">الشروط والأحكام (عُمان)</h3>
      <ol class="clauses">
        <li>يقر الطرف الأول بملكية المركبة وحقه في بيعها، ويسلّمها للطرف الثاني بالحالة المعاينة وقت البيع.</li>
        <li>يتحمّل الطرف الثاني رسوم نقل الملكية لدى شرطة عُمان السلطانية / المرور وأي رسوم حكومية لاحقة.</li>
        <li>بعد استلام كامل الثمن، تنتقل حيازة المركبة للمشتري، ولا يحق لأي طرف الرجوع إلا وفق اتفاق مكتوب أو حكم مختص.</li>
        <li>أي عيب ظاهر تمت معاينته من المشتري قبل الشراء يُعدّ مقبولاً، ما لم يُذكر خلافه في الملاحظات.</li>
        <li>يخضع هذا العقد لأنظمة سلطنة عُمان، ويكون الاختصاص لمحاكم نزوى عند النزاع.</li>
        ${sale.notes ? '<li>ملاحظات خاصة: ' + esc(sale.notes) + '</li>' : ''}
      </ol>
      ${signBlock('الطرف الأول — الشركة / الختم', 'الطرف الثاني — المشتري')}`;
    openDoc('عقد بيع — ' + (sale.sale_no || ''), body);
  }

  /** عقد شراء مركبة — الشركة تشتري من بائع */
  function printPurchaseContract(purchase, vehicle, company) {
    const v = Object.assign({}, vehicle || {}, purchase || {});
    const c = company || {};
    const price = Number(purchase.purchase_price || 0);
    const paid = Number(purchase.paid_amount != null ? purchase.paid_amount : price);
    const body = `
      ${brandHeader(c, 'عقد شراء مركبة', 'Vehicle Purchase Contract', purchase.purchase_no, dmy(purchase.purchase_date))}
      <div class="box">
        تم الاتفاق في سلطنة عُمان — ولاية نزوى، بين كل من:<br>
        <b>الطرف الأول (البائع / المالك السابق):</b> ${esc(purchase.seller_name || '—')}
        ${purchase.seller_id ? ' · الهوية/السجل: <span dir="ltr">' + esc(purchase.seller_id) + '</span>' : ''}
        ${purchase.seller_phone ? ' · هاتف: <span dir="ltr">' + esc(purchase.seller_phone) + '</span>' : ''}.<br>
        <b>الطرف الثاني (المشتري):</b> النجار والسموم للتجارة — NAJJAR &amp; AL SAMOOM TRADING.
      </div>
      ${vehicleTable(v)}
      <h3 class="sec">قيمة الشراء</h3>
      <div class="totals"><table>
        <tr><th>سعر الشراء</th><td><b>${money(price)}</b></td></tr>
        <tr><th>المبلغ المدفوع</th><td>${money(paid)}</td></tr>
        <tr><th>طريقة الدفع</th><td>${esc(purchase.payment_method || '—')}</td></tr>
        <tr><th>مصدر/بلد</th><td>${esc(purchase.source_country || v.origin_country || '—')}</td></tr>
      </table></div>
      <h3 class="sec">التعهدات</h3>
      <ol class="clauses">
        <li>يقر الطرف الأول أنه المالك الشرعي للمركبة وأنها غير مرهونة أو متنازع عليها، ما لم يُفصح عن خلاف ذلك كتابةً.</li>
        <li>يلتزم الطرف الأول بتسليم المركبة ومستنداتها المتاحة، والتعاون في إجراءات نقل الملكية.</li>
        <li>يدفع الطرف الثاني الثمن المتفق عليه وفق طريقة السداد الموضحة أعلاه.</li>
        <li>يخضع العقد لقوانين سلطنة عُمان واختصاص محاكم نزوى.</li>
        ${purchase.notes ? '<li>ملاحظات: ' + esc(purchase.notes) + '</li>' : ''}
      </ol>
      ${signBlock('الطرف الأول — البائع', 'الطرف الثاني — الشركة / الختم')}`;
    openDoc('عقد شراء — ' + (purchase.purchase_no || ''), body);
  }

  /** فاتورة بيع */
  function printSaleInvoice(sale, vehicle, company) {
    const v = Object.assign({}, vehicle || {}, sale || {});
    const c = company || {};
    const price = Number(sale.sale_price || 0);
    const deposit = Number(sale.deposit_amount || 0);
    const invNo = 'INV-' + String(sale.sale_no || '').replace(/^AT-S-/, '');
    const body = `
      ${brandHeader(c, 'فاتورة بيع', 'Tax Invoice / Sales Invoice', invNo, dmy(sale.sale_date))}
      <table>
        <tr><th>العميل / المشتري</th><td>${esc(sale.buyer_name || '—')}</td></tr>
        <tr><th>الهاتف</th><td dir="ltr">${esc(sale.buyer_phone || '—')}</td></tr>
        <tr><th>رقم الهوية</th><td dir="ltr">${esc(sale.buyer_id || '—')}</td></tr>
        <tr><th>مرجع البيع</th><td dir="ltr">${esc(sale.sale_no || '—')}</td></tr>
      </table>
      <h3 class="sec">تفاصيل الفاتورة</h3>
      <table>
        <tr><th>البيان</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
        <tr>
          <td>${esc(v.make || '')} ${esc(v.model || '')} ${esc(v.variant || '')}<br>
            <span style="color:var(--muted);font-size:11px">VIN: <span dir="ltr">${esc(v.vin || '—')}</span> · مخزون ${esc(v.stock_no || '—')}</span>
          </td>
          <td>1</td>
          <td>${money(price)}</td>
          <td><b>${money(price)}</b></td>
        </tr>
      </table>
      <div class="totals"><table>
        <tr><th>المدفوع / العربون</th><td>${money(deposit)}</td></tr>
        <tr><th>المتبقي</th><td>${money(Math.max(0, price - deposit))}</td></tr>
        <tr><th>الإجمالي المستحق</th><td>${money(price)}</td></tr>
      </table></div>
      ${bankBox(c)}
      ${signBlock('المحاسب / البائع', 'العميل')}`;
    openDoc('فاتورة بيع — ' + invNo, body);
  }

  /** فاتورة شراء (داخلية) */
  function printPurchaseInvoice(purchase, vehicle, company) {
    const v = Object.assign({}, vehicle || {}, purchase || {});
    const c = company || {};
    const price = Number(purchase.purchase_price || 0);
    const invNo = 'PINV-' + String(purchase.purchase_no || '').replace(/^AT-P-/, '');
    const body = `
      ${brandHeader(c, 'فاتورة شراء', 'Purchase Invoice', invNo, dmy(purchase.purchase_date))}
      <table>
        <tr><th>المورد / البائع</th><td>${esc(purchase.seller_name || '—')}</td></tr>
        <tr><th>الهاتف</th><td dir="ltr">${esc(purchase.seller_phone || '—')}</td></tr>
        <tr><th>الهوية / السجل</th><td dir="ltr">${esc(purchase.seller_id || '—')}</td></tr>
        <tr><th>مرجع الشراء</th><td dir="ltr">${esc(purchase.purchase_no || '—')}</td></tr>
      </table>
      <table>
        <tr><th>البيان</th><th>السعر</th></tr>
        <tr>
          <td>${esc(v.make || '')} ${esc(v.model || '')} · ${esc(v.stock_no || '—')}<br>
            <span style="font-size:11px;color:var(--muted)">VIN: <span dir="ltr">${esc(v.vin || '—')}</span></span>
          </td>
          <td><b>${money(price)}</b></td>
        </tr>
      </table>
      <div class="totals"><table>
        <tr><th>طريقة الدفع</th><td>${esc(purchase.payment_method || '—')}</td></tr>
        <tr><th>إجمالي فاتورة الشراء</th><td>${money(price)}</td></tr>
      </table></div>
      ${signBlock('المستلم / المشتريات', 'اعتماد الإدارة')}`;
    openDoc('فاتورة شراء — ' + invNo, body);
  }

  /** سند قبض — استلام مبلغ من عميل */
  function printReceiptVoucher(sale, company) {
    const c = company || {};
    const amount = Number(sale.deposit_amount || sale.sale_price || 0);
    const no = 'RV-' + String(sale.sale_no || '').replace(/^AT-S-/, '');
    const body = `
      ${brandHeader(c, 'سند قبض', 'Receipt Voucher', no, dmy(sale.sale_date))}
      <div class="box">استلمنا من المكرم/ة: <b>${esc(sale.buyer_name || '—')}</b>
        ${sale.buyer_phone ? ' · <span dir="ltr">' + esc(sale.buyer_phone) + '</span>' : ''}</div>
      <div class="totals"><table>
        <tr><th>مبلغ وقدره</th><td><b>${money(amount)}</b></td></tr>
        <tr><th>وذلك عن</th><td>عربون/دفعة بيع مركبة ${esc(sale.stock_no || '')} · مرجع ${esc(sale.sale_no || '')}</td></tr>
        <tr><th>طريقة القبض</th><td>${esc(sale.payment_method || '—')}</td></tr>
      </table></div>
      ${bankBox(c)}
      ${signBlock('المحاسب المستلم', 'الدافع / العميل')}`;
    openDoc('سند قبض — ' + no, body);
  }

  /** سند صرف — صرف مبلغ (شراء أو مصروف) */
  function printPaymentVoucher(payload, company) {
    const c = company || {};
    const kind = payload.kind || 'purchase'; // purchase | expense
    const amount = Number(payload.amount || 0);
    const date = payload.date || payload.purchase_date || payload.expense_date;
    const ref = payload.ref_no || payload.purchase_no || payload.expense_no || '';
    const payee = payload.payee || payload.seller_name || '—';
    const reason = payload.reason
      || (kind === 'expense'
        ? `مصروف: ${payload.category || ''} ${payload.stock_no ? '· مركبة ' + payload.stock_no : ''}`
        : `شراء مركبة ${payload.stock_no || ''} · مرجع ${ref}`);
    const no = (kind === 'expense' ? 'PV-E-' : 'PV-P-') + String(ref).replace(/^AT-[PE]-/, '');
    const body = `
      ${brandHeader(c, 'سند صرف', 'Payment Voucher', no, dmy(date))}
      <div class="box">يُصرف للمكرم/ة: <b>${esc(payee)}</b></div>
      <div class="totals"><table>
        <tr><th>مبلغ وقدره</th><td><b>${money(amount)}</b></td></tr>
        <tr><th>وذلك عن</th><td>${esc(reason)}</td></tr>
        <tr><th>طريقة الصرف</th><td>${esc(payload.payment_method || '—')}</td></tr>
        <tr><th>المرجع</th><td dir="ltr">${esc(ref || '—')}</td></tr>
      </table></div>
      ${payload.notes ? '<div class="box">ملاحظات: ' + esc(payload.notes) + '</div>' : ''}
      ${signBlock('أمر الصرف / الإدارة', 'المستلم')}`;
    openDoc('سند صرف — ' + no, body);
  }

  global.NajjarPrintDocs = {
    printSaleContract,
    printPurchaseContract,
    printSaleInvoice,
    printPurchaseInvoice,
    printReceiptVoucher,
    printPaymentVoucher,
  };
})(window);
