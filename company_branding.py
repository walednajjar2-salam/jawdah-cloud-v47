"""Shared company branding defaults and document HTML builders."""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict

DEFAULT_COMPANY_SETTINGS: Dict[str, Any] = {
    "name_ar": "جودة الانطلاقة للخدمات ل.ل.س",
    "name_en": "Quality of Launch Services LLC",
    "cr_no": "1466316",
    "postal_code": "611",
    "po_box": "320",
    "vat_rate": 0.05,
    "vat_reg_no": "",
    "logo_url": "assets/logo-primary.png",
    "description_ar": (
        "جودة الانطلاقة للخدمات ل.ل.س هي مؤسسة خدمية متخصصة في تقديم الخدمات المتعلقة بالعقارات، "
        "بالإضافة إلى خدمات الضيافة للمناسبات والعزاء، من خلال كادر وظيفي مترابط وذو خبرة طويلة في هذه المجالات، "
        "بما يضمن تقديم خدمات منظمة وموثوقة وبجودة عالية."
    ),
    "description_en": (
        "Quality of Launch Services LLC is a service-oriented company specializing in real estate-related services "
        "and hospitality services for various occasions, including events and condolence gatherings. The company "
        "operates with a well-coordinated professional team that has extensive experience in these fields, "
        "ensuring reliable, organized, and high-quality service delivery."
    ),
    "contacts": {
        "customer_service": "25225026",
        "hospitality_manager": "92204210",
    },
    "bank": {
        "name": "Bank Muscat",
        "accounts": [
            {"name": "Starting Quality Project", "number": "0378063651660017", "phone": ""},
            {"name": "Yaqoub Al Khusaibi", "number": "0368001970950016", "phone": "92200218"},
        ],
    },
}


def _escape(value: Any) -> str:
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def merge_company_settings(raw: Dict[str, Any] | None) -> Dict[str, Any]:
    merged = deepcopy(DEFAULT_COMPANY_SETTINGS)
    if not raw:
        return merged
    for key, value in raw.items():
        if key in {"bank", "contacts"} and isinstance(value, dict):
            merged[key] = {**merged.get(key, {}), **value}
        elif key == "bank" and isinstance(value, dict) and isinstance(value.get("accounts"), list):
            merged["bank"] = {**merged.get("bank", {}), **value}
        else:
            merged[key] = value
    return merged


def load_company_settings(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return deepcopy(DEFAULT_COMPANY_SETTINGS)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return merge_company_settings(raw if isinstance(raw, dict) else {})
    except (OSError, json.JSONDecodeError):
        return deepcopy(DEFAULT_COMPANY_SETTINGS)


def save_company_settings(path: Path, settings: Dict[str, Any]) -> Dict[str, Any]:
    clean = merge_company_settings(settings)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
    return clean


def vat_breakdown(gross_amount: Any, rate: float) -> Dict[str, float]:
    gross = float(gross_amount or 0)
    if not rate or rate <= 0:
        return {"subtotal": gross, "vat": 0.0, "total": gross, "rate": 0.0}
    subtotal = gross / (1 + rate)
    vat = gross - subtotal
    return {"subtotal": subtotal, "vat": vat, "total": gross, "rate": rate}


def document_styles(settings: Dict[str, Any]) -> str:
    logo = _escape(settings.get("logo_url", "assets/logo-primary.png"))
    return f"""@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Outfit:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');
:root{{--gold:#b8892f;--gold-light:#d4af37;--ink:#1a1a1a;--muted:#5c5348;--line:#e8dcc8;--paper:#fdfbf7;--accent:#8b6914}}
*{{box-sizing:border-box}}body{{margin:0;font-family:"Outfit","Tajawal",Arial,sans-serif;color:var(--ink);background:#fff}}
.qls-doc{{position:relative;background:var(--paper);padding:32px;max-width:920px;margin:0 auto;overflow:hidden}}
.qls-doc:before{{content:"";position:absolute;inset:0;background:url('{logo}') center 42% / 58% no-repeat;opacity:.045;pointer-events:none;z-index:0}}
.qls-doc>*{{position:relative;z-index:1}}
.qls-doc-header{{text-align:center;margin-bottom:22px;padding-bottom:18px;border-bottom:2px solid var(--gold-light)}}
.qls-logo{{width:min(220px,72vw);height:auto;object-fit:contain;filter:drop-shadow(0 8px 18px rgba(184,137,47,.18));margin:0 auto 12px;display:block}}
.qls-names .ar{{font-family:"Tajawal",sans-serif;font-size:1.35rem;font-weight:800;color:var(--gold);margin:0 0 4px}}
.qls-names .en{{font-family:"Cormorant Garamond",serif;font-size:1.15rem;font-weight:700;color:var(--ink);margin:0}}
.qls-intro{{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px;text-align:justify}}
.qls-intro p{{margin:0;font-size:11px;line-height:1.75;color:var(--muted)}}
.qls-intro .ar{{direction:rtl;font-family:"Tajawal",sans-serif}}
.qls-intro .en{{direction:ltr;font-family:"Outfit",sans-serif}}
.qls-meta-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:20px 0}}
.qls-card{{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:rgba(255,255,255,.82);box-shadow:0 4px 16px rgba(139,105,20,.06)}}
.qls-card h4{{margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--gold);font-weight:700}}
.qls-card p,.qls-card li{{margin:0 0 6px;font-size:12px;line-height:1.65;color:var(--ink)}}
.qls-card ul{{margin:0;padding:0 0 0 18px}}
.qls-card .label{{color:var(--muted);font-size:11px;display:block}}
.qls-card .value{{font-weight:600}}
.qls-vat-badge{{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:linear-gradient(135deg,#fff8e8,#f5ecd6);border:1px solid var(--gold-light);color:var(--gold);font-size:11px;font-weight:700;margin-top:10px}}
.qls-title-row{{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-start;gap:16px;margin:22px 0 18px}}
.qls-title-row h1{{margin:0;font-size:1.6rem;color:var(--ink)}}
.qls-title-row .meta{{font-size:12px;color:var(--muted);line-height:1.8}}
.qls-table{{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}}
.qls-table th,.qls-table td{{border:1px solid var(--line);padding:10px 12px;text-align:right}}
.qls-table th{{background:linear-gradient(180deg,#faf6ee,#f3ead8);color:var(--gold);font-weight:700}}
.qls-totals{{margin-right:auto;max-width:360px;width:100%}}
.qls-totals .row{{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line);font-size:13px}}
.qls-totals .row.total{{font-size:15px;font-weight:800;color:var(--gold);border-bottom:0;padding-top:12px}}
.qls-signatures{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:36px;padding-top:18px;border-top:1px solid var(--line)}}
.qls-signatures .sig{{min-height:72px;border-bottom:1px solid #bbb;font-size:11px;color:var(--muted);padding-top:8px}}
.qls-footer{{margin-top:24px;padding-top:14px;border-top:1px solid var(--line);font-size:10px;color:var(--muted);text-align:center;line-height:1.7}}
@media(max-width:720px){{.qls-intro,.qls-meta-grid{{grid-template-columns:1fr}}.qls-signatures{{grid-template-columns:1fr}}}}
@media print{{body{{background:#fff}}.qls-doc{{padding:18px;max-width:none}}.qls-doc:before{{opacity:.035}}}}"""


def header_html(settings: Dict[str, Any]) -> str:
    bank_accounts = settings.get("bank", {}).get("accounts", [])
    bank_items = []
    for i, account in enumerate(bank_accounts, start=1):
        phone = f'<br><span class="label">Phone</span> <span class="value">{_escape(account.get("phone"))}</span>' if account.get("phone") else ""
        bank_items.append(
            f'<li><span class="label">Account {i}</span><span class="value">{_escape(account.get("name"))}</span>'
            f'<br><span class="value" dir="ltr">{_escape(account.get("number"))}</span>{phone}</li>'
        )
    vat_pct = int(float(settings.get("vat_rate") or 0) * 100)
    contacts = settings.get("contacts") or {}
    return f"""
      <header class="qls-doc-header">
        <img class="qls-logo" src="{_escape(settings.get('logo_url'))}" alt="{_escape(settings.get('name_en'))}">
        <div class="qls-names">
          <p class="ar">{_escape(settings.get('name_ar'))}</p>
          <p class="en">{_escape(settings.get('name_en'))}</p>
        </div>
        <div class="qls-intro">
          <p class="ar">{_escape(settings.get('description_ar'))}</p>
          <p class="en">{_escape(settings.get('description_en'))}</p>
        </div>
        <span class="qls-vat-badge">Tax Invoice · فاتورة ضريبية · VAT {vat_pct}%</span>
      </header>
      <div class="qls-meta-grid">
        <div class="qls-card">
          <h4>Company · المؤسسة</h4>
          <p><span class="label">C.R. No.</span> <span class="value">{_escape(settings.get('cr_no'))}</span></p>
          <p><span class="label">Postal Code</span> <span class="value">{_escape(settings.get('postal_code'))}</span></p>
          <p><span class="label">P.O. Box</span> <span class="value">{_escape(settings.get('po_box'))}</span></p>
          {'<p><span class="label">VAT Reg.</span> <span class="value">' + _escape(settings.get('vat_reg_no')) + '</span></p>' if settings.get('vat_reg_no') else ''}
          <p><span class="label">Customer Service</span> <span class="value">{_escape(contacts.get('customer_service'))}</span></p>
          <p><span class="label">Hospitality</span> <span class="value">{_escape(contacts.get('hospitality_manager'))}</span></p>
        </div>
        <div class="qls-card">
          <h4>{_escape(settings.get('bank', {}).get('name', 'Bank'))} · البنك</h4>
          <ul>{''.join(bank_items)}</ul>
        </div>
      </div>"""


def build_contract_html(settings: Dict[str, Any], contract: Dict[str, Any], client: Dict[str, Any] | None, prop: Dict[str, Any] | None) -> str:
    c = contract
    client = client or {}
    prop = prop or {}
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{_escape(c.get('contract_no') or c.get('id'))}</title><style>{document_styles(settings)}</style></head><body>
      <article class="qls-doc">
        {header_html(settings)}
        <div class="qls-title-row">
          <div><h1>عقد إيجار / Lease Contract</h1><div class="meta">{_escape(c.get('contract_no') or c.get('id'))} · {_escape(c.get('contract_type') or 'Residential')}</div></div>
          <div class="meta">Sultanate of Oman · سلطنة عُمان</div>
        </div>
        <table class="qls-table"><thead><tr><th>البند</th><th>التفاصيل</th><th>Item</th><th>Details</th></tr></thead><tbody>
          <tr><td>المستأجر</td><td>{_escape(client.get('name'))}</td><td>Tenant</td><td>{_escape(client.get('name'))}</td></tr>
          <tr><td>الهوية/السجل</td><td>{_escape(c.get('tenant_id_no') or client.get('national_id'))}</td><td>ID/CR</td><td>{_escape(c.get('tenant_id_no') or client.get('national_id'))}</td></tr>
          <tr><td>العقار</td><td>{_escape(prop.get('name'))}</td><td>Property</td><td>{_escape(prop.get('name'))}</td></tr>
          <tr><td>الوحدة</td><td>{_escape(c.get('unit_details') or prop.get('location'))}</td><td>Unit</td><td>{_escape(c.get('unit_details') or prop.get('location'))}</td></tr>
          <tr><td>البداية</td><td>{_escape(c.get('start_date'))}</td><td>Start</td><td>{_escape(c.get('start_date'))}</td></tr>
          <tr><td>النهاية</td><td>{_escape(c.get('end_date'))}</td><td>End</td><td>{_escape(c.get('end_date'))}</td></tr>
          <tr><td>الإيجار</td><td>{float(c.get('rent_amount') or 0):.3f} OMR</td><td>Rent</td><td>{float(c.get('rent_amount') or 0):.3f} OMR</td></tr>
          <tr><td>التأمين</td><td>{float(c.get('deposit_amount') or 0):.3f} OMR</td><td>Deposit</td><td>{float(c.get('deposit_amount') or 0):.3f} OMR</td></tr>
        </tbody></table>
        <div class="qls-card" style="margin-top:18px"><h4>Protection Terms · الشروط القانونية</h4><p>{_escape(c.get('legal_terms'))}</p></div>
        <div class="qls-signatures"><div class="sig">Tenant Signature · توقيع المستأجر</div><div class="sig">{_escape(c.get('company_signatory') or settings.get('name_en'))}</div><div class="sig">Company Stamp · ختم المؤسسة</div></div>
        <footer class="qls-footer">{_escape(settings.get('name_en'))} · Bank: {_escape(settings.get('bank', {}).get('name'))}</footer>
      </article></body></html>"""
