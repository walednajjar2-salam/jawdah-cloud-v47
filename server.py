#!/usr/bin/env python3
"""
Launch Quality LLC
Real Estate & Hospitality Management System backend.
Run: python server.py
Run with the configured platform URL
"""
from __future__ import annotations

import csv
import hashlib
import hmac
import io
import json
import mimetypes
import os
import secrets
import sqlite3
import sys
import time
import urllib.parse
from datetime import date, datetime, timedelta
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from company_branding import DEFAULT_COMPANY_SETTINGS, build_contract_html, default_legal_terms, load_company_settings, save_company_settings

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = Path(os.environ.get("JAWDAH_DATA_DIR", str(BASE_DIR / "data"))).resolve()
DB_PATH = Path(os.environ.get("JAWDAH_DB_PATH", str(DATA_DIR / "jawdah.sqlite3"))).resolve()
COMPANY_SETTINGS_PATH = Path(os.environ.get("JAWDAH_COMPANY_SETTINGS", str(DATA_DIR / "company_settings.json"))).resolve()
HOST = os.environ.get("JAWDAH_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT") or os.environ.get("JAWDAH_PORT", "8765"))
CORS_ORIGIN = os.environ.get("JAWDAH_CORS_ORIGIN", "*").strip()
APP_VERSION = "Launch-Quality-LLC-v47-railway"
MAX_JSON_BYTES = int(os.environ.get("JAWDAH_MAX_JSON_BYTES", "1048576"))
LOGIN_RATE_LIMIT = int(os.environ.get("JAWDAH_LOGIN_RATE_LIMIT", "8"))
LOGIN_WINDOW_SEC = int(os.environ.get("JAWDAH_LOGIN_WINDOW_SEC", "300"))
SESSION_HOURS = int(os.environ.get("JAWDAH_SESSION_HOURS", "12"))
DEBUG_ERRORS = os.environ.get("JAWDAH_DEBUG", "").strip().lower() in ("1", "true", "yes")
_LOGIN_ATTEMPTS: Dict[str, List[float]] = {}

# Fallback assets: Railway can still open the app even if the public folder is misplaced.
FALLBACK_INDEX_HTML = "<!doctype html>\n<html lang=\"ar\" dir=\"rtl\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n  <title>Launch Quality LLC</title>\n  <link rel=\"stylesheet\" href=\"app.css\">\n</head>\n<body>\n  <main id=\"loginScreen\" class=\"login hidden\">\n    <section class=\"login-card\">\n      <img src=\"assets/logo.png\" alt=\"Jawdah logo\">\n      <h1>Launch Quality LLC</h1>\n      <p class=\"mini\">Real Estate & Hospitality Management System</p>\n      <input id=\"loginUser\" placeholder=\"اسم المستخدم\" autocomplete=\"username\" value=\"admin\">\n      <input id=\"loginPass\" placeholder=\"كلمة المرور\" type=\"password\" autocomplete=\"current-password\" value=\"admin123\">\n      <button id=\"loginBtn\" class=\"gold-btn\" style=\"width:100%;margin-top:10px\">تسجيل الدخول</button>\n      <p class=\"mini\">admin / admin123</p>\n    </section>\n  </main>\n\n  <main id=\"app\" class=\"app hidden\">\n    <aside id=\"sidebar\" class=\"sidebar\">\n      <div class=\"brand\">\n        <img src=\"assets/logo.png\" alt=\"logo\">\n        <div><h1>Launch Quality LLC</h1><small>Real Estate & Hospitality Management</small></div>\n      </div>\n      <nav id=\"nav\" class=\"nav\"></nav>\n    </aside>\n    <section class=\"content\">\n      <header class=\"topbar\">\n        <button id=\"menuBtn\" class=\"ghost mobile-nav\">☰</button>\n        <div class=\"search\"><input id=\"globalSearch\" placeholder=\"بحث سريع Ctrl + K\"></div>\n        <button class=\"gold-btn\" onclick=\"showSection('properties')\">+ إضافة</button>\n        <div id=\"clock\" class=\"top-pill\">00:00:00</div>\n        <div class=\"userbox\"><div id=\"avatar\" class=\"avatar\">J</div><div><b id=\"userName\">User</b><br><small id=\"userRole\" class=\"mini\">Role</small></div></div>\n        <button id=\"logoutBtn\" class=\"ghost\">خروج</button>\n      </header>\n      <h2 id=\"sectionTitle\">لوحة التحكم التنفيذية</h2>\n\n      <section id=\"sec-dashboard\" class=\"section active\">\n        <div class=\"hero\"><h2>مركز القيادة التنفيذي للعقارات والضيافة</h2><p>نظام إدارة عقارية وضيافة يربط التشغيل المالي والإداري مباشرة: العقار ← العميل ← العقد ← الفاتورة ← التحصيل ← الحسابات.</p><div id=\"heroStats\" class=\"status-line\" style=\"margin-top:14px\"></div></div>\n        <div id=\"kpiGrid\" class=\"grid kpis\"></div>\n        <div class=\"layout\">\n          <div class=\"card\"><h3>الإيرادات والمصروفات</h3><div class=\"canvas-wrap\"><canvas id=\"incomeChart\"></canvas></div></div>\n          <div class=\"card\"><h3>خريطة GIS تشغيلية</h3><div class=\"gis\"><div id=\"gisPins\"></div></div></div>\n        </div>\n        <div class=\"layout\">\n          <div class=\"card\"><h3>قرارات الآن</h3><div id=\"decisionList\"></div></div>\n          <div class=\"card\"><h3>الإشغال</h3><div class=\"canvas-wrap\"><canvas id=\"occupancyChart\"></canvas></div></div>\n        </div>\n        <div class=\"card\"><h3>إجراءات سريعة</h3><div id=\"quickActions\" class=\"quick\"></div></div>\n      </section>\n\n      <section id=\"sec-properties\" class=\"section\">\n        <div class=\"card\"><h3>إضافة عقار</h3><div class=\"form\"><input id=\"pImage\" placeholder=\"إيموجي/رمز\" value=\"🏠\"><input id=\"pName\" placeholder=\"اسم العقار\"><input id=\"pType\" placeholder=\"النوع\"><select id=\"pStatus\"><option>Rented</option><option>Vacant</option><option>Maintenance</option></select><input id=\"pPrice\" placeholder=\"السعر\"><input id=\"pLocation\" placeholder=\"الموقع\"><textarea id=\"pNotes\" placeholder=\"ملاحظات\"></textarea></div><button class=\"gold-btn\" onclick=\"createProperty()\">حفظ العقار</button></div>\n        <div class=\"card\"><div class=\"toolbar\"><select id=\"propStatusFilter\" onchange=\"renderProperties()\"></select><button class=\"ghost\" onclick=\"exportCsv('properties')\">تصدير CSV</button></div><div id=\"propertiesTable\"></div></div>\n      </section>\n\n      <section id=\"sec-clients\" class=\"section\">\n        <div class=\"card\"><h3>إضافة عميل</h3><div class=\"form\"><input id=\"cName\" placeholder=\"اسم العميل\"><input id=\"cPhone\" placeholder=\"الهاتف\"><input id=\"cEmail\" placeholder=\"البريد\"><input id=\"cNational\" placeholder=\"الهوية/السجل\"><textarea id=\"cNotes\" placeholder=\"ملاحظات\"></textarea></div><button class=\"gold-btn\" onclick=\"createClient()\">حفظ العميل</button></div>\n        <div class=\"card\"><div class=\"toolbar\"><button class=\"ghost\" onclick=\"exportCsv('clients')\">تصدير CSV</button></div><div id=\"clientsTable\"></div></div>\n      </section>\n\n      <section id=\"sec-contracts\" class=\"section\">\n        <div class=\"card\"><h3>إنشاء عقد</h3><div class=\"form\"><select id=\"contractProperty\"></select><select id=\"contractClient\"></select><input id=\"contractStart\" type=\"date\"><input id=\"contractEnd\" type=\"date\"><input id=\"contractRent\" placeholder=\"قيمة الإيجار\"><textarea id=\"contractNotes\" placeholder=\"ملاحظات العقد\"></textarea></div><button class=\"gold-btn\" onclick=\"createContract()\">حفظ العقد</button></div>\n        <div class=\"card\"><div class=\"toolbar\"><button class=\"ghost\" onclick=\"exportCsv('contracts')\">تصدير CSV</button></div><div id=\"contractsTable\"></div></div>\n      </section>\n\n      <section id=\"sec-invoices\" class=\"section\">\n        <div class=\"card\"><h3>الفواتير والتحصيل</h3><p class=\"mini\">يتم إنشاء الفاتورة من العقد فقط لضمان الربط الصحيح.</p><div id=\"invoicesTable\"></div></div>\n      </section>\n\n      <section id=\"sec-accounts\" class=\"section\">\n        <div class=\"card\"><h3>إضافة حركة مالية</h3><div class=\"form\"><input id=\"accDate\" type=\"date\"><select id=\"accType\"><option value=\"income\">income</option><option value=\"expense\">expense</option></select><input id=\"accCategory\" placeholder=\"التصنيف\"><input id=\"accDesc\" placeholder=\"الوصف\"><input id=\"accAmount\" placeholder=\"المبلغ\"></div><button class=\"gold-btn\" onclick=\"createAccount()\">حفظ الحركة</button></div>\n        <div class=\"card\"><h3>ملخص الحسابات</h3><div id=\"accountSummary\" class=\"status-line\"></div><div class=\"canvas-wrap\"><canvas id=\"expenseChart\"></canvas></div></div>\n        <div class=\"card\"><div class=\"toolbar\"><button class=\"ghost\" onclick=\"exportCsv('accounts')\">تصدير CSV</button></div><div id=\"accountsTable\"></div></div>\n      </section>\n\n      <section id=\"sec-maintenance\" class=\"section\">\n        <div class=\"card\"><h3>طلب صيانة</h3><div class=\"form\"><select id=\"maintProperty\"></select><input id=\"maintTitle\" placeholder=\"عنوان الطلب\"><select id=\"maintPriority\"><option>High</option><option>Medium</option><option>Low</option></select><input id=\"maintCost\" placeholder=\"التكلفة المتوقعة\"><textarea id=\"maintNotes\" placeholder=\"تفاصيل\"></textarea></div><button class=\"gold-btn\" onclick=\"createMaintenance()\">حفظ الطلب</button></div>\n        <div class=\"grid\" id=\"maintenanceGrid\" style=\"grid-template-columns:repeat(auto-fit,minmax(260px,1fr))\"></div>\n      </section>\n\n      <section id=\"sec-reports\" class=\"section\">\n        <div id=\"reportsBox\"></div>\n        <div class=\"card\"><button class=\"gold-btn\" onclick=\"renderReports()\">تحديث التقرير</button> <button class=\"ghost\" onclick=\"downloadBackup()\">تنزيل Backup</button></div>\n      </section>\n\n      <section id=\"sec-users\" class=\"section\">\n        <div class=\"card\"><h3>إضافة مستخدم</h3><div class=\"form\"><input id=\"uUsername\" placeholder=\"اسم المستخدم\"><input id=\"uName\" placeholder=\"الاسم\"><select id=\"uRole\"><option value=\"admin\">admin</option><option value=\"accountant\">accountant</option><option value=\"operations\">operations</option><option value=\"maintenance\">maintenance</option><option value=\"viewer\">viewer</option></select><input id=\"uPassword\" placeholder=\"كلمة المرور\"></div><button class=\"gold-btn\" onclick=\"createUser()\">حفظ المستخدم</button></div>\n        <div class=\"card\"><div id=\"usersTable\"></div></div>\n      </section>\n\n      <section id=\"sec-backup\" class=\"section\">\n        <div class=\"card\"><h3>مركز التخزين والنسخ الاحتياطي</h3><div id=\"backupStatus\" class=\"status-line\"></div><div class=\"toolbar\" style=\"margin-top:16px\"><button class=\"gold-btn\" onclick=\"downloadBackup()\">تنزيل Backup JSON</button><button class=\"ghost\" onclick=\"exportCsv('properties')\">عقارات CSV</button><button class=\"ghost\" onclick=\"exportCsv('clients')\">عملاء CSV</button><button class=\"ghost\" onclick=\"exportCsv('contracts')\">عقود CSV</button><button class=\"ghost\" onclick=\"exportCsv('invoices')\">فواتير CSV</button><button class=\"ghost\" onclick=\"exportCsv('accounts')\">حسابات CSV</button></div></div>\n      </section>\n\n      <section id=\"sec-qa\" class=\"section\">\n        <div class=\"card\"><h3>اختبار التشغيل</h3><button class=\"gold-btn\" onclick=\"runQA()\">تشغيل الاختبار الآن</button><div id=\"qaBox\" style=\"margin-top:15px\"></div></div>\n      </section>\n    </section>\n  </main>\n\n  <div id=\"paymentModal\" class=\"modal\"><div class=\"modal-box\"><h2>تحصيل فاتورة</h2><p id=\"payInfo\"></p><input id=\"payInvoiceId\" type=\"hidden\"><div class=\"form\"><input id=\"payAmount\" placeholder=\"المبلغ\"><select id=\"payMethod\"><option>Cash</option><option>Bank Transfer</option><option>Card</option></select><input id=\"payNote\" placeholder=\"ملاحظة\"></div><button class=\"gold-btn\" onclick=\"submitPayment()\">تأكيد التحصيل</button> <button class=\"ghost\" onclick=\"closeModal('paymentModal')\">إغلاق</button></div></div>\n  <div id=\"invoiceModal\" class=\"modal\"><div class=\"modal-box\"><div id=\"invoicePreview\"></div><div class=\"toolbar\"><button class=\"gold-btn\" onclick=\"window.print()\">طباعة A4</button><button class=\"ghost\" onclick=\"downloadInvoice()\">تنزيل HTML</button><button class=\"ghost\" onclick=\"closeModal('invoiceModal')\">إغلاق</button></div></div></div>\n  <div id=\"genericModal\" class=\"modal\"><div class=\"modal-box\"><div id=\"genericModalBody\"></div><button class=\"ghost\" onclick=\"closeModal('genericModal')\">إغلاق</button></div></div>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n"
FALLBACK_CSS = ":root{\n  --bg:#030712;\n  --navy:#07111f;\n  --navy2:#0b1728;\n  --navy3:#111f34;\n  --panel:rgba(11,23,40,.82);\n  --panel2:rgba(17,31,52,.72);\n  --glass:rgba(255,255,255,.075);\n  --text:#f8f5ec;\n  --muted:#aeb8c9;\n  --gold:#d8b15b;\n  --gold2:#fff0b8;\n  --gold3:#9c6d21;\n  --silver:#dce3ef;\n  --silver2:#93a4ba;\n  --blue:#4ea1ff;\n  --red:#ff6666;\n  --line:rgba(255,255,255,.13);\n  --line-gold:rgba(216,177,91,.42);\n  --shadow:0 28px 85px rgba(0,0,0,.42);\n  --soft:0 16px 45px rgba(0,0,0,.22);\n  --radius:24px;\n  --side:300px;\n}\n*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:\"Tajawal\",\"Segoe UI\",Arial,sans-serif;background:radial-gradient(circle at 14% 10%,rgba(216,177,91,.22),transparent 27%),radial-gradient(circle at 82% 0%,rgba(78,161,255,.14),transparent 30%),linear-gradient(135deg,#030712 0%,#07111f 44%,#0b1220 100%);color:var(--text);min-height:100vh;overflow-x:hidden}body:before{content:\"\";position:fixed;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(216,177,91,.07),transparent 18%,transparent 82%,rgba(216,177,91,.06)),radial-gradient(circle at 50% 110%,rgba(216,177,91,.14),transparent 38%);z-index:-1}button,input,select,textarea{font:inherit}button{cursor:pointer}.hidden{display:none!important}.app{min-height:100vh;display:grid;grid-template-columns:var(--side) 1fr}.sidebar{position:sticky;top:0;height:100vh;padding:22px;background:linear-gradient(180deg,rgba(15,25,42,.95),rgba(5,11,22,.97));border-left:1px solid var(--line-gold);box-shadow:var(--shadow);overflow-y:auto}.sidebar::-webkit-scrollbar{width:6px}.sidebar::-webkit-scrollbar-thumb{background:rgba(216,177,91,.45);border-radius:20px}.brand{display:flex;align-items:center;gap:14px;margin-bottom:24px;border:1px solid rgba(216,177,91,.25);border-radius:26px;padding:12px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(216,177,91,.08))}.brand img{width:64px;height:64px;border-radius:22px;object-fit:cover;border:2px solid rgba(216,177,91,.95);box-shadow:0 0 38px rgba(216,177,91,.38)}.brand h1{font-size:19px;margin:0;color:var(--gold2)}.brand small{color:var(--muted)}.nav{display:grid;gap:10px}.nav button{border:1px solid var(--line);background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.025));color:var(--text);padding:13px 14px;border-radius:18px;display:flex;justify-content:space-between;align-items:center;transition:.22s;box-shadow:0 10px 22px rgba(0,0,0,.12)}.nav button:hover,.nav button.active{background:linear-gradient(135deg,rgba(216,177,91,.28),rgba(255,255,255,.08));border-color:rgba(216,177,91,.78);transform:translateX(-4px);box-shadow:0 14px 34px rgba(216,177,91,.16), inset 0 1px 0 rgba(255,255,255,.16)}.content{padding:22px 24px 34px;min-width:0}.topbar{display:flex;align-items:center;gap:12px;margin-bottom:20px;position:sticky;top:10px;z-index:10;background:linear-gradient(180deg,rgba(8,18,32,.86),rgba(8,18,32,.62));backdrop-filter:blur(18px);padding:10px;border:1px solid rgba(216,177,91,.25);border-radius:26px;box-shadow:0 18px 48px rgba(0,0,0,.26)}.search{flex:1;position:relative}.search input{width:100%;border:1px solid var(--line);background:rgba(255,255,255,.055);color:var(--text);padding:14px 18px;border-radius:18px;outline:none}.search input:focus{border-color:rgba(216,177,91,.72);box-shadow:0 0 0 4px rgba(216,177,91,.1)}.top-pill{border:1px solid rgba(216,177,91,.55);background:linear-gradient(135deg,rgba(216,177,91,.24),rgba(255,255,255,.07));color:var(--gold2);padding:12px 15px;border-radius:18px;white-space:nowrap;font-weight:800}.gold-btn,.primary{border:0;background:linear-gradient(135deg,#9a681e,#f4d77f 48%,#b88328);color:#101010;border-radius:17px;padding:12px 18px;font-weight:900;box-shadow:0 18px 42px rgba(216,177,91,.27), inset 0 1px 0 rgba(255,255,255,.5)}.gold-btn:hover{filter:brightness(1.08);transform:translateY(-1px)}.ghost{border:1px solid var(--line);background:linear-gradient(135deg,rgba(255,255,255,.075),rgba(255,255,255,.035));color:var(--text);border-radius:15px;padding:10px 13px}.ghost:hover{border-color:rgba(216,177,91,.45);background:rgba(216,177,91,.08)}.danger{border:0;background:linear-gradient(135deg,#7f1d1d,#ff7474);color:#fff;border-radius:15px;padding:10px 13px;font-weight:900}.userbox{display:flex;align-items:center;gap:10px}.avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#fff1b8,#b8862e);color:#111;border:2px solid var(--gold2);font-weight:900}.content>h2{font-size:24px;margin:8px 0 18px;color:var(--gold2);letter-spacing:.2px}.hero{position:relative;overflow:hidden;border:1px solid rgba(216,177,91,.32);border-radius:34px;background:linear-gradient(135deg,rgba(255,255,255,.11),rgba(255,255,255,.035)),radial-gradient(circle at 12% 15%,rgba(216,177,91,.28),transparent 32%),radial-gradient(circle at 85% 25%,rgba(78,161,255,.14),transparent 30%),linear-gradient(135deg,#0a1627,#111d31);padding:30px;margin-bottom:20px;box-shadow:var(--shadow)}.hero:before{content:\"Jawdah Command Center\";position:absolute;left:28px;bottom:10px;font-size:56px;font-weight:900;color:rgba(255,255,255,.035);letter-spacing:1px;white-space:nowrap}.hero:after{content:\"\";position:absolute;inset:auto -110px -160px auto;width:420px;height:420px;background:radial-gradient(circle,rgba(216,177,91,.36),transparent 62%);filter:blur(12px)}.hero h2{font-size:36px;margin:0 0 10px;color:var(--gold2)}.hero p{margin:0;color:var(--muted);max-width:920px;line-height:1.9}.grid{display:grid;gap:16px}.kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.kpi{border:1px solid rgba(216,177,91,.18);border-radius:26px;background:linear-gradient(145deg,rgba(255,255,255,.105),rgba(255,255,255,.035));padding:18px;box-shadow:0 18px 52px rgba(0,0,0,.24);position:relative;overflow:hidden;transition:.22s;min-height:142px}.kpi:hover{transform:translateY(-3px);border-color:rgba(216,177,91,.55);box-shadow:0 24px 68px rgba(0,0,0,.32),0 0 26px rgba(216,177,91,.12)}.kpi:before{content:\"\";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,transparent,var(--gold),var(--gold2),transparent)}.kpi:after{content:\"\";position:absolute;left:-25%;bottom:-55%;width:180px;height:180px;background:radial-gradient(circle,rgba(216,177,91,.18),transparent 62%)}.kpi .icon{font-size:31px;filter:drop-shadow(0 8px 18px rgba(216,177,91,.28))}.kpi strong{display:block;font-size:31px;margin:10px 0 4px;color:#fff}.kpi span{color:var(--muted)}.layout{display:grid;grid-template-columns:1.18fr .82fr;gap:16px;margin-top:16px}.card{border:1px solid rgba(216,177,91,.16);border-radius:26px;background:linear-gradient(145deg,rgba(255,255,255,.095),rgba(255,255,255,.032));padding:18px;box-shadow:0 18px 48px rgba(0,0,0,.22);min-width:0}.card h3{margin:0 0 14px;color:var(--gold2)}.canvas-wrap{height:280px}.canvas-wrap canvas{width:100%;height:100%}.gis{height:330px;border-radius:24px;background:radial-gradient(circle at 40% 35%,rgba(216,177,91,.14),transparent 30%),linear-gradient(135deg,#10233a,#0b1628);position:relative;overflow:hidden;border:1px solid rgba(216,177,91,.18)}.gis:before{content:\"\";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);background-size:35px 35px;opacity:.35}.gis:after{content:\"\";position:absolute;inset:15%;border:1px solid rgba(216,177,91,.18);border-radius:50%;filter:blur(.2px)}.pin{position:absolute;width:18px;height:18px;border-radius:50%;box-shadow:0 0 0 8px rgba(255,255,255,.08),0 0 25px currentColor;border:2px solid rgba(255,255,255,.75)}.pin.gold{color:#f6d77f;background:#f6d77f}.pin.blue{color:#60a5fa;background:#60a5fa}.pin.red{color:#ff6b6b;background:#ff6b6b}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.toolbar input,.toolbar select,.form input,.form select,.form textarea{border:1px solid var(--line);background:rgba(255,255,255,.065);color:var(--text);border-radius:15px;padding:11px 12px;outline:none}.toolbar option,.form option{background:#0b1728;color:#fff}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:18px;background:rgba(2,6,23,.18)}table{width:100%;border-collapse:collapse;min-width:880px}th,td{padding:13px;border-bottom:1px solid rgba(255,255,255,.075);text-align:right;vertical-align:middle}th{color:var(--gold2);background:rgba(216,177,91,.09);position:sticky;top:0}td{color:#edf2fa}.badge{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid var(--line);font-size:13px;color:var(--silver)}.paid,.active,.rented{color:#1b1302;background:linear-gradient(135deg,#b9882c,#ffe49a);border-color:rgba(216,177,91,.8);font-weight:800}.partial,.pending{color:#261a02;background:linear-gradient(135deg,#b68b39,#e8d9ac);border-color:rgba(216,177,91,.65);font-weight:800}.overdue,.maintenance,.open{color:#fff;background:linear-gradient(135deg,#7f1d1d,#e15b5b);border-color:rgba(255,115,115,.65);font-weight:800}.vacant{color:#06172c;background:linear-gradient(135deg,#79b7ff,#dceaff);border-color:rgba(96,165,250,.65);font-weight:800}.section{display:none}.section.active{display:block}.form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:15px}.form textarea{grid-column:1/-1;min-height:90px}.modal{position:fixed;inset:0;background:rgba(0,0,0,.68);display:none;align-items:center;justify-content:center;z-index:30;padding:16px}.modal.show{display:flex}.modal-box{width:min(880px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(216,177,91,.38);border-radius:28px;background:#081426;color:var(--text);padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.55)}.invoice-paper{background:#fff;color:#111;border-radius:18px;padding:30px;direction:ltr}.invoice-paper .head{display:flex;justify-content:space-between;border-bottom:4px solid #d8b15b;padding-bottom:16px;margin-bottom:18px}.invoice-paper table{min-width:0;color:#111}.invoice-paper th{background:#071426;color:#fff}.invoice-paper td{color:#111;border-color:#ddd}.login{min-height:100vh;display:grid;place-items:center;padding:20px}.login-card{width:min(460px,100%);border:1px solid rgba(216,177,91,.35);border-radius:32px;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.04));padding:32px;box-shadow:var(--shadow);text-align:center}.login-card img{width:96px;height:96px;border-radius:30px;border:2px solid var(--gold);object-fit:cover}.login-card input{width:100%;margin:9px 0;border:1px solid var(--line);background:rgba(255,255,255,.08);color:#fff;padding:14px;border-radius:16px;outline:none}.toast{position:fixed;bottom:22px;left:22px;background:#101d30;border:1px solid rgba(216,177,91,.45);padding:14px 18px;border-radius:18px;box-shadow:var(--shadow);z-index:50}.toast.err{border-color:#ef4444}.mobile-nav{display:none}.mini{font-size:13px;color:var(--muted)}.status-line{display:flex;gap:10px;flex-wrap:wrap}.quick{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.quick button{text-align:right;padding:18px;border-radius:22px}.executive-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:16px}.executive-chip{border:1px solid rgba(216,177,91,.2);background:rgba(255,255,255,.055);border-radius:20px;padding:14px}.executive-chip b{color:var(--gold2)}@media(max-width:1100px){.app{grid-template-columns:1fr}.sidebar{position:fixed;right:-320px;width:290px;z-index:40;transition:.25s}.sidebar.open{right:0}.content{padding:14px}.kpis{grid-template-columns:repeat(2,1fr)}.layout{grid-template-columns:1fr}.form{grid-template-columns:1fr}.mobile-nav{display:inline-flex}.topbar{flex-wrap:wrap}.quick{grid-template-columns:repeat(2,1fr)}.executive-strip{grid-template-columns:1fr}}@media(max-width:650px){.kpis{grid-template-columns:1fr}.hero h2{font-size:25px}.hero:before{font-size:34px}.userbox{width:100%;justify-content:space-between}.top-pill{font-size:13px}.quick{grid-template-columns:1fr}}@media print{body{background:#fff;color:#000}.app,.modal .ghost,.modal .gold-btn{display:none!important}.modal{display:block!important;position:static;background:#fff;padding:0}.modal-box{box-shadow:none;border:0;max-height:none;width:100%;padding:0}.invoice-paper{border-radius:0;padding:0}}\n"
FALLBACK_JS = 'const Jawdah = {\n  token: localStorage.getItem(\'jawdah_cloud_token\') || \'\',\n  user: null,\n  data: {},\n  dashboard: null,\n  activeSection: \'dashboard\',\n  charts: {},\n  invoiceForPrint: null\n};\nconst $ = s => document.querySelector(s);\nconst $$ = s => Array.from(document.querySelectorAll(s));\nconst api = async (path, opts={}) => {\n  const headers = {\'Content-Type\':\'application/json\'};\n  if(Jawdah.token) headers.Authorization = \'Bearer \' + Jawdah.token;\n  const res = await fetch(\'/api/\' + path.replace(/^\\//,\'\'), {...opts, headers:{...headers, ...(opts.headers||{})}});\n  const text = await res.text();\n  let data;\n  try{ data = text ? JSON.parse(text) : {}; }catch(e){ data = {ok:false,error:text || \'Invalid response\'}; }\n  if(!res.ok || data.ok === false) throw new Error(data.error || data.detail || \'Request failed\');\n  return data;\n};\nconst fmt = n => Number(n||0).toLocaleString(\'en-US\',{maximumFractionDigits:2});\nconst money = n => fmt(n) + \' OMR\';\nconst today = () => new Date().toISOString().slice(0,10);\nconst byId = (table,id) => (Jawdah.data[table]||[]).find(x=>x.id===id) || {};\nconst roleName = r => ({admin:\'مدير النظام\',accountant:\'محاسب\',operations:\'تشغيل\',maintenance:\'صيانة\',viewer:\'مشاهد\'}[r]||r);\nfunction toast(msg, err=false){ const t=document.createElement(\'div\'); t.className=\'toast\'+(err?\' err\':\'\'); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }\nfunction ensureEnglishDigits(root=document.body){\n  const rx=/[\\u0660-\\u0669\\u06F0-\\u06F9]/g;\n  const convert=s=>String(s).replace(rx,ch=>String(ch.charCodeAt(0)-((ch.charCodeAt(0)>=0x06F0)?0x06F0:0x0660)));\n  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);\n  let n; while(n=walk.nextNode()){ if(rx.test(n.nodeValue)) n.nodeValue=convert(n.nodeValue); }\n  $$(\'input,textarea\').forEach(el=>{ if(rx.test(el.value)) el.value=convert(el.value); });\n}\nasync function login(){\n  try{\n    const username=$(\'#loginUser\').value.trim(); const password=$(\'#loginPass\').value;\n    const res=await api(\'login\',{method:\'POST\',body:JSON.stringify({username,password})});\n    Jawdah.token=res.token; Jawdah.user=res.user; localStorage.setItem(\'jawdah_cloud_token\',res.token);\n    $(\'#loginScreen\').classList.add(\'hidden\'); $(\'#app\').classList.remove(\'hidden\'); await loadAll(); toast(\'تم تسجيل الدخول\');\n  }catch(e){toast(e.message,true)}\n}\nasync function logout(){ try{await api(\'logout\',{method:\'POST\'});}catch(e){} localStorage.removeItem(\'jawdah_cloud_token\'); location.reload(); }\nasync function checkSession(){\n  if(!Jawdah.token){ $(\'#loginScreen\').classList.remove(\'hidden\'); return; }\n  try{ const me=await api(\'me\'); Jawdah.user=me.user; $(\'#loginScreen\').classList.add(\'hidden\'); $(\'#app\').classList.remove(\'hidden\'); await loadAll(); }\n  catch(e){ localStorage.removeItem(\'jawdah_cloud_token\'); $(\'#loginScreen\').classList.remove(\'hidden\'); }\n}\nasync function loadAll(){\n  const res=await api(\'bootstrap\'); Jawdah.data=res.data; Jawdah.dashboard=res.dashboard; Jawdah.user=res.user;\n  $(\'#userName\').textContent=Jawdah.user.name; $(\'#userRole\').textContent=roleName(Jawdah.user.role); $(\'#avatar\').textContent=(Jawdah.user.name||\'J\').slice(0,1).toUpperCase();\n  buildNav(); renderAll(); showSection(Jawdah.activeSection||\'dashboard\'); ensureEnglishDigits();\n}\nfunction buildNav(){\n  const items=[[\'dashboard\',\'لوحة التحكم\',\'🏛️\'],[\'properties\',\'العقارات\',\'🏠\'],[\'clients\',\'العملاء\',\'👥\'],[\'contracts\',\'العقود\',\'📑\'],[\'invoices\',\'الفواتير\',\'🧾\'],[\'accounts\',\'الحسابات\',\'💰\'],[\'maintenance\',\'الصيانة\',\'🔧\'],[\'reports\',\'التقارير\',\'📊\'],[\'users\',\'المستخدمين\',\'🛡️\'],[\'backup\',\'التخزين والنسخ\',\'💾\'],[\'qa\',\'اختبار التشغيل\',\'✅\']];\n  const nav=$(\'#nav\'); nav.innerHTML=\'\';\n  items.forEach(([id,label,icon])=>{\n    if(id===\'users\' && Jawdah.user.role!==\'admin\') return;\n    const b=document.createElement(\'button\'); b.dataset.section=id; b.innerHTML=`<span>${icon} ${label}</span><small>›</small>`; b.onclick=()=>showSection(id); nav.appendChild(b);\n  });\n}\nfunction showSection(id){\n  Jawdah.activeSection=id; $$(\'.section\').forEach(s=>s.classList.remove(\'active\')); const s=$(\'#sec-\'+id); if(s) s.classList.add(\'active\');\n  $$(\'#nav button\').forEach(b=>b.classList.toggle(\'active\',b.dataset.section===id));\n  $(\'#sectionTitle\').textContent = ({dashboard:\'لوحة التحكم التنفيذية\',properties:\'العقارات\',clients:\'العملاء\',contracts:\'العقود\',invoices:\'الفواتير\',accounts:\'الحسابات\',maintenance:\'الصيانة\',reports:\'التقارير المالية\',users:\'المستخدمين والصلاحيات\',backup:\'التخزين والنسخ الاحتياطي\',qa:\'اختبار التشغيل\'}[id]||\'Jawdah\');\n  if(innerWidth<1100) $(\'#sidebar\').classList.remove(\'open\'); setTimeout(drawCharts,50); ensureEnglishDigits();\n}\nfunction renderAll(){ renderDashboard(); renderProperties(); renderClients(); renderContracts(); renderInvoices(); renderAccounts(); renderMaintenance(); renderUsers(); renderBackup(); renderQA(); }\nfunction renderDashboard(){\n  const k=Jawdah.dashboard.kpis;\n  const collectionRate = k.billed ? Math.round((Number(k.paid||0)/Number(k.billed||1))*100) : 0;\n  $(\'#heroStats\').innerHTML=`<span class="badge paid">جاهزية النظام ${fmt(k.health)}%</span><span class="badge">الإشغال ${fmt(k.occupancy)}%</span><span class="badge">التحصيل ${fmt(collectionRate)}%</span><span class="badge">صافي الدخل ${money(k.net)}</span>`;\n  const kpis=[[\'🏛️\',\'إجمالي العقارات\',k.properties,\'properties\'],[\'🔑\',\'العقارات المؤجرة\',k.rented,\'properties\'],[\'🏠\',\'العقارات الشاغرة\',k.vacant,\'properties\'],[\'🧾\',\'إجمالي الفوترة\',k.billed,\'invoices\',\'money\'],[\'💳\',\'إجمالي التحصيل\',k.paid,\'accounts\',\'money\'],[\'⏰\',\'المبالغ المتأخرة\',k.overdue,\'invoices\',\'money\'],[\'🔧\',\'طلبات الصيانة المفتوحة\',k.maintenance,\'maintenance\'],[\'📈\',\'صافي الربح\',k.net,\'accounts\',\'money\']];\n  $(\'#kpiGrid\').innerHTML=kpis.map(x=>`<div class="kpi" onclick="showSection(\'${x[3]}\')"><div class="icon">${x[0]}</div><span>${x[1]}</span><strong>${x[4]?money(x[2]):fmt(x[2])}</strong><small class="mini">فتح التفاصيل</small></div>`).join(\'\');\n  $(\'#decisionList\').innerHTML=`<div class="executive-strip"><div class="executive-chip"><b>مؤشر التحصيل</b><br><span class="mini">${fmt(collectionRate)}% من إجمالي الفواتير</span></div><div class="executive-chip"><b>مؤشر الإشغال</b><br><span class="mini">${fmt(k.occupancy)}% من الوحدات</span></div><div class="executive-chip"><b>القرار التالي</b><br><span class="mini">راجع المتأخرات والصيانة أولاً</span></div></div>` + Jawdah.dashboard.decisions.map(d=>`<div class="card" style="padding:13px;margin-bottom:10px"><span class="badge">${d.level}</span><p>${d.text}</p></div>`).join(\'\');\n  const props=Jawdah.data.properties||[];\n  $(\'#gisPins\').innerHTML=props.map((p,i)=>{ const cls=(p.status||\'\').toLowerCase().includes(\'maintenance\')?\'red\':((p.status||\'\').toLowerCase().includes(\'vacant\')?\'blue\':\'gold\'); const left=[18,43,68,28,78,52,36][i%7], top=[24,42,58,70,32,22,64][i%7]; return `<button class="pin ${cls}" title="${p.name}" style="left:${left}%;top:${top}%" onclick="toast(\'${p.name} - ${p.status}\')"></button>` }).join(\'\');\n  $(\'#quickActions\').innerHTML=[[\'إضافة عقار\',\'properties\',\'🏠\'],[\'إضافة عميل\',\'clients\',\'👥\'],[\'إنشاء عقد\',\'contracts\',\'📑\'],[\'فاتورة من عقد\',\'invoices\',\'🧾\'],[\'تحصيل دفعة\',\'invoices\',\'💳\'],[\'Backup فوري\',\'backup\',\'💾\'],[\'تقرير مالي\',\'reports\',\'📊\'],[\'اختبار التشغيل\',\'qa\',\'✅\']].map(q=>`<button class="ghost" onclick="showSection(\'${q[1]}\')"><b>${q[2]} ${q[0]}</b><br><small class="mini">أمر تنفيذي سريع</small></button>`).join(\'\');\n}\nfunction tableHtml(cols, rows, actions){\n  return `<div class="table-wrap"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join(\'\')}${actions?\'<th>إجراء</th>\':\'\'}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${c[2]?c[2](r[c[1]],r):(r[c[1]]??\'\')}</td>`).join(\'\')}${actions?`<td>${actions(r)}</td>`:\'\'}</tr>`).join(\'\')||`<tr><td colspan="${cols.length+1}">لا توجد بيانات</td></tr>`}</tbody></table></div>`;\n}\nfunction renderProperties(){\n  const rows=filterRows(\'properties\',[\'name\',\'type\',\'status\',\'location\']);\n  $(\'#propertiesTable\').innerHTML=tableHtml([[\'الصورة\',\'image\'],[\'الاسم\',\'name\'],[\'النوع\',\'type\'],[\'الحالة\',\'status\',(v)=>badge(v)],[\'السعر\',\'price\',(v)=>money(v)],[\'الموقع\',\'location\'],[\'آخر تحديث\',\'last_update\']],rows,r=>`<button class="ghost" onclick="editRecord(\'properties\',\'${r.id}\')">تعديل</button> <button class="danger" onclick="delRecord(\'properties\',\'${r.id}\')">حذف</button>`);\n  fillSelect(\'#propStatusFilter\',[\'\',\'Rented\',\'Vacant\',\'Maintenance\'],false);\n}\nfunction renderClients(){\n  const rows=filterRows(\'clients\',[\'name\',\'phone\',\'email\',\'national_id\']);\n  $(\'#clientsTable\').innerHTML=tableHtml([[\'الاسم\',\'name\'],[\'الهاتف\',\'phone\'],[\'البريد\',\'email\'],[\'الهوية/السجل\',\'national_id\'],[\'الرصيد\',\'balance\',(v)=>money(v)],[\'ملاحظات\',\'notes\']],rows,r=>`<button class="ghost" onclick="clientStatement(\'${r.id}\')">كشف</button> <button class="ghost" onclick="editRecord(\'clients\',\'${r.id}\')">تعديل</button> <button class="danger" onclick="delRecord(\'clients\',\'${r.id}\')">حذف</button>`);\n}\nfunction renderContracts(){\n  fillSelect(\'#contractProperty\',Jawdah.data.properties||[],true,\'id\',\'name\'); fillSelect(\'#contractClient\',Jawdah.data.clients||[],true,\'id\',\'name\');\n  const rows=filterRows(\'contracts\',[\'id\',\'status\',\'notes\']);\n  $(\'#contractsTable\').innerHTML=tableHtml([[\'العقد\',\'id\'],[\'العقار\',\'property_id\',(v)=>byId(\'properties\',v).name||v],[\'العميل\',\'client_id\',(v)=>byId(\'clients\',v).name||v],[\'البداية\',\'start_date\'],[\'النهاية\',\'end_date\'],[\'الإيجار\',\'rent_amount\',(v)=>money(v)],[\'الحالة\',\'status\',(v)=>badge(v)]],rows,r=>`<button class="gold-btn" onclick="invoiceFromContract(\'${r.id}\')">فاتورة</button> <button class="ghost" onclick="editRecord(\'contracts\',\'${r.id}\')">تعديل</button> <button class="danger" onclick="delRecord(\'contracts\',\'${r.id}\')">حذف</button>`);\n}\nfunction renderInvoices(){\n  const rows=filterRows(\'invoices\',[\'invoice_no\',\'description\',\'status\']);\n  $(\'#invoicesTable\').innerHTML=tableHtml([[\'رقم\',\'invoice_no\'],[\'العميل\',\'client_id\',(v)=>byId(\'clients\',v).name||v],[\'العقار\',\'property_id\',(v)=>byId(\'properties\',v).name||v],[\'الإصدار\',\'issue_date\'],[\'الاستحقاق\',\'due_date\'],[\'الإجمالي\',\'amount\',(v)=>money(v)],[\'المدفوع\',\'paid_amount\',(v)=>money(v)],[\'المتبقي\',\'amount\',(v,r)=>money(Number(r.amount)-Number(r.paid_amount))],[\'الحالة\',\'status\',(v)=>badge(v)]],rows,r=>`<button class="gold-btn" onclick="openPayment(\'${r.id}\')">تحصيل</button> <button class="ghost" onclick="printInvoice(\'${r.id}\')">طباعة</button> <button class="danger" onclick="delRecord(\'invoices\',\'${r.id}\')">حذف</button>`);\n}\nfunction renderAccounts(){\n  const rows=filterRows(\'accounts\',[\'description\',\'category\',\'type\']);\n  $(\'#accountsTable\').innerHTML=tableHtml([[\'التاريخ\',\'entry_date\'],[\'النوع\',\'type\',(v)=>badge(v)],[\'التصنيف\',\'category\'],[\'الوصف\',\'description\'],[\'العميل\',\'client_id\',(v)=>v?(byId(\'clients\',v).name||v):\'\'],[\'العقار\',\'property_id\',(v)=>v?(byId(\'properties\',v).name||v):\'\'],[\'الفاتورة\',\'invoice_id\',(v)=>v?(byId(\'invoices\',v).invoice_no||v):\'\'],[\'المبلغ\',\'amount\',(v)=>money(v)]],rows,r=>`<button class="ghost" onclick="editRecord(\'accounts\',\'${r.id}\')">تعديل</button> <button class="danger" onclick="delRecord(\'accounts\',\'${r.id}\')">حذف</button>`);\n  const income=rows.filter(x=>x.type===\'income\').reduce((s,x)=>s+Number(x.amount||0),0), expense=rows.filter(x=>x.type===\'expense\').reduce((s,x)=>s+Number(x.amount||0),0);\n  $(\'#accountSummary\').innerHTML=`<span class="badge">إيرادات ${money(income)}</span><span class="badge">مصروفات ${money(expense)}</span><span class="badge">صافي ${money(income-expense)}</span>`;\n}\nfunction renderMaintenance(){\n  fillSelect(\'#maintProperty\',Jawdah.data.properties||[],true,\'id\',\'name\');\n  const rows=filterRows(\'maintenance\',[\'title\',\'priority\',\'status\',\'notes\']);\n  $(\'#maintenanceGrid\').innerHTML=rows.map(m=>`<div class="card"><h3>${m.title}</h3><p>${byId(\'properties\',m.property_id).name||m.property_id}</p><span class="badge">${m.priority}</span> <span class="badge">${m.status}</span><p>التكلفة: ${money(m.cost)}</p><button class="ghost" onclick="editRecord(\'maintenance\',\'${m.id}\')">متابعة</button> <button class="danger" onclick="delRecord(\'maintenance\',\'${m.id}\')">حذف</button></div>`).join(\'\')||\'<div class="card">لا توجد طلبات صيانة</div>\';\n}\nfunction renderUsers(){\n  if(!Jawdah.data.users){ $(\'#usersTable\').innerHTML=\'<div class="card">هذا القسم للمدير فقط</div>\'; return; }\n  $(\'#usersTable\').innerHTML=tableHtml([[\'المستخدم\',\'username\'],[\'الاسم\',\'name\'],[\'الدور\',\'role\',(v)=>roleName(v)],[\'نشط\',\'active\',(v)=>v?\'نعم\':\'لا\'],[\'آخر دخول\',\'last_login\']],Jawdah.data.users,r=>`<button class="ghost" onclick="editRecord(\'users\',\'${r.id}\')">تعديل</button> <button class="danger" onclick="delRecord(\'users\',\'${r.id}\')">حذف</button>`);\n}\nfunction renderBackup(){\n  const counts=Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,(v||[]).length]));\n  $(\'#backupStatus\').innerHTML=Object.entries(counts).map(([k,v])=>`<span class="badge">${k}: ${fmt(v)}</span>`).join(\' \');\n}\nfunction renderQA(){\n  $(\'#qaBox\').innerHTML=\'<p>اضغط تشغيل الاختبار لفحص الترابط والتخزين والفواتير والحسابات.</p>\';\n}\nfunction filterRows(table, fields){\n  let rows=[...(Jawdah.data[table]||[])]; const q=($(\'#globalSearch\')?.value||\'\').toLowerCase().trim();\n  if(q) rows=rows.filter(r=>fields.some(f=>String(r[f]??\'\').toLowerCase().includes(q)));\n  if(table===\'properties\'){ const s=$(\'#propStatusFilter\')?.value; if(s) rows=rows.filter(r=>r.status===s); }\n  return rows;\n}\nfunction badge(v){ const cls=String(v||\'\').toLowerCase(); return `<span class="badge ${cls}">${v||\'\'}</span>`; }\nfunction fillSelect(sel, data, objects=false, valueKey=\'id\', textKey=\'name\'){\n  const el=$(sel); if(!el) return; const old=el.value; let html=\'<option value="">اختر</option>\';\n  if(objects) html+=data.map(x=>`<option value="${x[valueKey]}">${x[textKey]}</option>`).join(\'\'); else html+=data.map(x=>`<option value="${x}">${x||\'الكل\'}</option>`).join(\'\');\n  el.innerHTML=html; if([...el.options].some(o=>o.value===old)) el.value=old;\n}\nasync function createProperty(){ await saveNew(\'properties\',{name:val(\'pName\'),type:val(\'pType\'),status:val(\'pStatus\'),price:num(\'pPrice\'),location:val(\'pLocation\'),image:val(\'pImage\')||\'🏠\',last_update:today(),notes:val(\'pNotes\')}); }\nasync function createClient(){ await saveNew(\'clients\',{name:val(\'cName\'),phone:val(\'cPhone\'),email:val(\'cEmail\'),national_id:val(\'cNational\'),balance:0,notes:val(\'cNotes\')}); }\nasync function createContract(){ await saveNew(\'contracts\',{property_id:val(\'contractProperty\'),client_id:val(\'contractClient\'),start_date:val(\'contractStart\')||today(),end_date:val(\'contractEnd\')||today(),rent_amount:num(\'contractRent\'),status:\'Active\',payment_cycle:\'monthly\',notes:val(\'contractNotes\')}); }\nasync function createAccount(){ await saveNew(\'accounts\',{entry_date:val(\'accDate\')||today(),type:val(\'accType\'),category:val(\'accCategory\'),description:val(\'accDesc\'),client_id:val(\'accClient\')||null,property_id:val(\'accProperty\')||null,invoice_id:null,amount:num(\'accAmount\')}); }\nasync function createMaintenance(){ await saveNew(\'maintenance\',{property_id:val(\'maintProperty\'),title:val(\'maintTitle\'),priority:val(\'maintPriority\'),status:\'Open\',request_date:today(),cost:num(\'maintCost\'),notes:val(\'maintNotes\')}); }\nasync function createUser(){ await saveNew(\'users\',{username:val(\'uUsername\'),name:val(\'uName\'),role:val(\'uRole\'),password:val(\'uPassword\'),active:true}); }\nasync function saveNew(table,row){ try{ await api(table,{method:\'POST\',body:JSON.stringify(row)}); toast(\'تم الحفظ\'); await loadAll(); }catch(e){toast(e.message,true)} }\nfunction val(id){ return ($(\'#\'+id)?.value||\'\').trim(); } function num(id){ return Number(val(id)||0); }\nasync function delRecord(table,id){ if(!confirm(\'تأكيد الحذف؟\')) return; try{ await api(`${table}/${id}`,{method:\'DELETE\'}); toast(\'تم الحذف\'); await loadAll(); }catch(e){toast(e.message,true)} }\nfunction escapeHtml(v){ return String(v ?? \'\').replace(/[&<>"\']/g, ch => ({\'&\':\'&amp;\',\'<\':\'&lt;\',\'>\':\'&gt;\',\'"\':\'&quot;\',"\'":\'&#39;\'}[ch])); }\nfunction editOptions(field, row){\n  const opts = {\n    status: [\'Rented\',\'Vacant\',\'Maintenance\',\'Active\',\'Closed\',\'Open\',\'In Progress\',\'Completed\',\'Pending\'],\n    type: [\'Villa\',\'Apartment\',\'Office\',\'Compound\',\'income\',\'expense\'],\n    role: [\'admin\',\'accountant\',\'operations\',\'maintenance\',\'viewer\'],\n    priority: [\'Low\',\'Medium\',\'High\',\'Urgent\'],\n    payment_cycle: [\'monthly\',\'quarterly\',\'yearly\'],\n    active: [\'1\',\'0\']\n  };\n  if(field === \'property_id\') return (Jawdah.data.properties||[]).map(x=>[x.id,x.name]);\n  if(field === \'client_id\') return (Jawdah.data.clients||[]).map(x=>[x.id,x.name]);\n  if(field === \'invoice_id\') return [[\'\',\'بدون فاتورة\'], ...(Jawdah.data.invoices||[]).map(x=>[x.id,x.invoice_no])];\n  if(opts[field]) return opts[field].map(x=>[x, field===\'role\'?roleName(x):(x===\'1\'?\'نعم\':x===\'0\'?\'لا\':x)]);\n  return null;\n}\nconst EDIT_CONFIG = {\n  properties: {title:\'تعديل عقار\', fields:[[\'name\',\'اسم العقار\',\'text\'],[\'type\',\'النوع\',\'select\'],[\'status\',\'الحالة\',\'select\'],[\'price\',\'السعر\',\'number\'],[\'location\',\'الموقع\',\'text\'],[\'image\',\'رمز/صورة\',\'text\'],[\'notes\',\'ملاحظات\',\'textarea\']]},\n  clients: {title:\'تعديل عميل\', fields:[[\'name\',\'اسم العميل\',\'text\'],[\'phone\',\'الهاتف\',\'text\'],[\'email\',\'البريد\',\'text\'],[\'national_id\',\'الهوية/السجل\',\'text\'],[\'balance\',\'الرصيد الافتتاحي\',\'number\'],[\'notes\',\'ملاحظات\',\'textarea\']]},\n  contracts: {title:\'تعديل عقد\', fields:[[\'property_id\',\'العقار\',\'select\'],[\'client_id\',\'العميل\',\'select\'],[\'start_date\',\'تاريخ البداية\',\'date\'],[\'end_date\',\'تاريخ النهاية\',\'date\'],[\'rent_amount\',\'قيمة الإيجار\',\'number\'],[\'status\',\'الحالة\',\'select\'],[\'payment_cycle\',\'دورة الدفع\',\'select\'],[\'notes\',\'ملاحظات\',\'textarea\']]},\n  accounts: {title:\'تعديل حركة مالية\', fields:[[\'entry_date\',\'التاريخ\',\'date\'],[\'type\',\'النوع\',\'select\'],[\'category\',\'التصنيف\',\'text\'],[\'description\',\'الوصف\',\'text\'],[\'client_id\',\'العميل\',\'select\'],[\'property_id\',\'العقار\',\'select\'],[\'invoice_id\',\'الفاتورة\',\'select\'],[\'amount\',\'المبلغ\',\'number\']]},\n  maintenance: {title:\'تعديل طلب صيانة\', fields:[[\'property_id\',\'العقار\',\'select\'],[\'title\',\'عنوان الطلب\',\'text\'],[\'priority\',\'الأولوية\',\'select\'],[\'status\',\'الحالة\',\'select\'],[\'request_date\',\'تاريخ الطلب\',\'date\'],[\'cost\',\'التكلفة\',\'number\'],[\'notes\',\'ملاحظات\',\'textarea\']]},\n  users: {title:\'تعديل مستخدم\', fields:[[\'username\',\'اسم المستخدم\',\'text\'],[\'name\',\'الاسم\',\'text\'],[\'role\',\'الدور\',\'select\'],[\'active\',\'نشط\',\'select\'],[\'password\',\'كلمة مرور جديدة - اختياري\',\'password\']]}\n};\nfunction editRecord(table,id){\n  const cfg = EDIT_CONFIG[table];\n  const row = byId(table,id);\n  if(!cfg || !row.id){ toast(\'لم يتم العثور على السجل\', true); return; }\n  const fields = cfg.fields.map(([key,label,type])=>{\n    const value = key === \'password\' ? \'\' : (row[key] ?? \'\');\n    const options = editOptions(key,row);\n    if(type === \'textarea\') return `<label>${label}<textarea data-edit-field="${key}" rows="3">${escapeHtml(value)}</textarea></label>`;\n    if(options) return `<label>${label}<select data-edit-field="${key}">${options.map(([v,t])=>`<option value="${escapeHtml(v)}" ${String(value)===String(v)?\'selected\':\'\'}>${escapeHtml(t)}</option>`).join(\'\')}</select></label>`;\n    return `<label>${label}<input data-edit-field="${key}" type="${type}" value="${escapeHtml(value)}" ${type===\'number\'?\'step="0.001"\':\'\'}></label>`;\n  }).join(\'\');\n  $(\'#genericModalBody\').innerHTML = `<h2>${cfg.title}</h2><p class="mini">تعديل مباشر محفوظ في قاعدة البيانات عبر API.</p><div class="form edit-form">${fields}</div><div class="toolbar"><button class="gold-btn" onclick="submitEditRecord(\'${table}\',\'${id}\')">حفظ التعديل</button><button class="ghost" onclick="closeModal(\'genericModal\')">إلغاء</button></div>`;\n  openModal(\'genericModal\');\n}\nasync function submitEditRecord(table,id){\n  try{\n    const data = {};\n    $$(\'#genericModalBody [data-edit-field]\').forEach(el=>{\n      let v = el.value;\n      if(el.type === \'number\') v = Number(v || 0);\n      if(el.dataset.editField === \'active\') v = v === \'1\';\n      if(el.dataset.editField === \'password\' && !v) return;\n      if(v === \'\' && [\'client_id\',\'property_id\',\'invoice_id\'].includes(el.dataset.editField)) v = null;\n      data[el.dataset.editField] = v;\n    });\n    await api(`${table}/${id}`, {method:\'PUT\', body:JSON.stringify(data)});\n    closeModal(\'genericModal\');\n    toast(\'تم حفظ التعديل\');\n    await loadAll();\n  }catch(e){ toast(e.message, true); }\n}\nasync function invoiceFromContract(contractId){ try{ const due=prompt(\'تاريخ الاستحقاق YYYY-MM-DD\', today()); const desc=prompt(\'وصف الفاتورة\',\'Rent invoice\'); const res=await api(\'invoice_from_contract\',{method:\'POST\',body:JSON.stringify({contract_id:contractId,due_date:due||today(),description:desc||\'Rent invoice\'})}); toast(\'تم إنشاء الفاتورة \'+res.item.invoice_no); await loadAll(); showSection(\'invoices\'); }catch(e){toast(e.message,true)} }\nfunction openPayment(id){ const inv=byId(\'invoices\',id); const remaining=Number(inv.amount)-Number(inv.paid_amount); $(\'#payInvoiceId\').value=id; $(\'#payAmount\').value=remaining.toFixed(2); $(\'#payInfo\').textContent=`${inv.invoice_no} - المتبقي ${money(remaining)}`; openModal(\'paymentModal\'); }\nasync function submitPayment(){ try{ await api(\'pay_invoice\',{method:\'POST\',body:JSON.stringify({invoice_id:val(\'payInvoiceId\'),amount:num(\'payAmount\'),method:val(\'payMethod\'),note:val(\'payNote\')})}); closeModal(\'paymentModal\'); toast(\'تم التحصيل وتحديث الحسابات\'); await loadAll(); }catch(e){toast(e.message,true)} }\nfunction printInvoice(id){ const inv=byId(\'invoices\',id), client=byId(\'clients\',inv.client_id), prop=byId(\'properties\',inv.property_id), contract=byId(\'contracts\',inv.contract_id); Jawdah.invoiceForPrint=inv; const rem=Number(inv.amount)-Number(inv.paid_amount);\n  $(\'#invoicePreview\').innerHTML=`<div class="invoice-paper"><div class="head"><div><h1>INVOICE</h1><h2>Quality of Launch</h2><p>Real Estate & Hospitality Services<br>GSM: 96203068 / 92120205<br>C.R: 1466316 | Postal Code: 611 | Sultanate of Oman</p></div><div><h2>${inv.invoice_no}</h2><p>Issue: ${inv.issue_date}<br>Due: ${inv.due_date}<br>Status: ${inv.status}</p></div></div><div class="grid" style="grid-template-columns:1fr 1fr"><div><h3>Client</h3><p>${client.name||\'\'}<br>${client.phone||\'\'}<br>${client.email||\'\'}</p></div><div><h3>Contract / Property</h3><p>${contract.id||\'\'}<br>${prop.name||\'\'}<br>${prop.location||\'\'}</p></div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody><tr><td>${inv.description}</td><td>${money(inv.amount)}</td></tr></tbody></table><h3>Total: ${money(inv.amount)}</h3><h3>Paid: ${money(inv.paid_amount)}</h3><h3>Remaining: ${money(rem)}</h3><div style="margin-top:40px;display:flex;justify-content:space-between"><p>Prepared By: __________</p><p>Client Signature: __________</p><p>Company Stamp: __________</p></div></div>`; openModal(\'invoiceModal\'); }\nfunction downloadInvoice(){ const html=\'<!doctype html><meta charset="utf-8">\'+$(\'#invoicePreview\').innerHTML; downloadFile(`invoice-${Jawdah.invoiceForPrint?.invoice_no||\'file\'}.html`,html,\'text/html\'); }\nfunction clientStatement(id){ const c=byId(\'clients\',id); const inv=(Jawdah.data.invoices||[]).filter(x=>x.client_id===id); const acc=(Jawdah.data.accounts||[]).filter(x=>x.client_id===id); const total=inv.reduce((s,x)=>s+Number(x.amount||0),0), paid=inv.reduce((s,x)=>s+Number(x.paid_amount||0),0); $(\'#genericModalBody\').innerHTML=`<h2>كشف حساب ${c.name}</h2><p>إجمالي الفواتير: ${money(total)} | المدفوع: ${money(paid)} | المتبقي: ${money(total-paid)}</p>${tableHtml([[\'رقم\',\'invoice_no\'],[\'تاريخ\',\'issue_date\'],[\'إجمالي\',\'amount\',(v)=>money(v)],[\'مدفوع\',\'paid_amount\',(v)=>money(v)],[\'حالة\',\'status\',(v)=>badge(v)]],inv)}<h3>الحركات</h3>${tableHtml([[\'تاريخ\',\'entry_date\'],[\'نوع\',\'type\'],[\'وصف\',\'description\'],[\'مبلغ\',\'amount\',(v)=>money(v)]],acc)}`; openModal(\'genericModal\'); }\nfunction openModal(id){ $(\'#\'+id).classList.add(\'show\'); ensureEnglishDigits($(\'#\'+id)); } function closeModal(id){ $(\'#\'+id).classList.remove(\'show\'); }\nasync function downloadBackup(){ try{ const res=await api(\'backup\'); downloadFile(\'jawdah-cloud-backup.json\', JSON.stringify(res.backup,null,2), \'application/json\'); }catch(e){toast(e.message,true)} }\nfunction downloadFile(name,content,type=\'text/plain\'){ const a=document.createElement(\'a\'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }\nasync function exportCsv(table){ try{ const res=await fetch(\'/api/export/\'+table,{headers:{Authorization:\'Bearer \'+Jawdah.token}}); if(!res.ok) throw new Error(\'Export failed\'); const blob=await res.blob(); const a=document.createElement(\'a\'); a.href=URL.createObjectURL(blob); a.download=\'jawdah-\'+table+\'.csv\'; a.click(); }catch(e){toast(e.message,true)} }\nfunction renderReports(){\n  const k=Jawdah.dashboard.kpis; $(\'#reportsBox\').innerHTML=`<div class="kpis grid"><div class="kpi"><span>الإيرادات</span><strong>${money(k.income)}</strong></div><div class="kpi"><span>المصروفات</span><strong>${money(k.expense)}</strong></div><div class="kpi"><span>الصافي</span><strong>${money(k.net)}</strong></div><div class="kpi"><span>المتأخرات</span><strong>${money(k.overdue)}</strong></div></div><div class="card"><h3>قرارات تنفيذية</h3>${Jawdah.dashboard.decisions.map(d=>`<p><span class="badge">${d.level}</span> ${d.text}</p>`).join(\'\')}</div>`;\n}\nfunction runQA(){\n  const problems=[]; const data=Jawdah.data;\n  (data.contracts||[]).forEach(c=>{ if(!byId(\'properties\',c.property_id).id) problems.push(\'عقد بدون عقار: \'+c.id); if(!byId(\'clients\',c.client_id).id) problems.push(\'عقد بدون عميل: \'+c.id); });\n  (data.invoices||[]).forEach(i=>{ if(!byId(\'contracts\',i.contract_id).id) problems.push(\'فاتورة بدون عقد: \'+i.invoice_no); if(Number(i.paid_amount)>Number(i.amount)) problems.push(\'فاتورة مدفوعة أكثر من الإجمالي: \'+i.invoice_no); });\n  const score=Math.max(0,100-problems.length*10);\n  $(\'#qaBox\').innerHTML=`<div class="kpi"><span>نتيجة الجاهزية</span><strong>${fmt(score)}%</strong></div>${problems.length?problems.map(p=>`<p class="badge overdue">${p}</p>`).join(\'\'):\'<p class="badge paid">كل الفحوصات الأساسية ناجحة</p>\'}`;\n}\nfunction drawCharts(){ if(!Jawdah.dashboard) return; drawLine(\'incomeChart\',Jawdah.dashboard.series.map(x=>x.income),Jawdah.dashboard.series.map(x=>x.expense)); drawDonut(\'occupancyChart\',Jawdah.dashboard.kpis.occupancy); drawBar(\'expenseChart\',Jawdah.dashboard.series.map(x=>x.expense)); }\nfunction ctx(id){ const c=$(\'#\'+id); return c?c.getContext(\'2d\'):null; }\nfunction prepCanvas(c){ const r=c.getBoundingClientRect(); c.width=r.width*devicePixelRatio; c.height=r.height*devicePixelRatio; const g=c.getContext(\'2d\'); g.scale(devicePixelRatio,devicePixelRatio); return [g,r.width,r.height]; }\nfunction drawLine(id,a,b){ const c=$(\'#\'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const vals=[...a,...b,1], max=Math.max(...vals)*1.22; const area=(arr,color1,color2)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.lineTo(w-32,h-34); g.lineTo(32,h-34); g.closePath(); const gr=g.createLinearGradient(0,28,0,h-34); gr.addColorStop(0,color1); gr.addColorStop(1,color2); g.fillStyle=gr; g.fill(); }; const plot=(arr,color)=>{ g.beginPath(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); i?g.lineTo(x,y):g.moveTo(x,y); }); g.strokeStyle=color; g.lineWidth=4; g.shadowBlur=16; g.shadowColor=color; g.stroke(); arr.forEach((v,i)=>{ const x=32+i*(w-64)/(arr.length-1||1), y=h-34-(v/max)*(h-70); g.beginPath(); g.fillStyle=color; g.arc(x,y,4,0,Math.PI*2); g.fill(); }); g.shadowBlur=0; }; g.strokeStyle=\'rgba(255,255,255,.12)\'; for(let i=0;i<5;i++){let y=24+i*(h-58)/4;g.beginPath();g.moveTo(24,y);g.lineTo(w-24,y);g.stroke();} area(a,\'rgba(246,215,127,.28)\',\'rgba(246,215,127,0)\'); plot(a,\'#f6d77f\'); plot(b,\'#8fbfff\'); }\nfunction drawDonut(id,p){ const c=$(\'#\'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const x=w/2,y=h/2,r=Math.min(w,h)/3; g.lineWidth=26; g.lineCap=\'round\'; g.strokeStyle=\'rgba(255,255,255,.12)\'; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.stroke(); const gr=g.createLinearGradient(x-r,y-r,x+r,y+r); gr.addColorStop(0,\'#fff0b8\'); gr.addColorStop(.5,\'#d8b15b\'); gr.addColorStop(1,\'#8f631b\'); g.strokeStyle=gr; g.shadowBlur=20; g.shadowColor=\'rgba(216,177,91,.4)\'; g.beginPath(); g.arc(x,y,r,-Math.PI/2,-Math.PI/2+Math.PI*2*p/100); g.stroke(); g.shadowBlur=0; g.fillStyle=\'#fff\'; g.font=\'800 30px Segoe UI\'; g.textAlign=\'center\'; g.fillText(fmt(p)+\'%\',x,y+6); g.font=\'13px Segoe UI\'; g.fillStyle=\'rgba(255,255,255,.7)\'; g.fillText(\'Occupancy\',x,y+28); }\nfunction drawBar(id,arr){ const c=$(\'#\'+id); if(!c) return; const [g,w,h]=prepCanvas(c); g.clearRect(0,0,w,h); const max=Math.max(...arr,1)*1.2, bw=(w-60)/arr.length*.65; arr.forEach((v,i)=>{const x=30+i*(w-60)/arr.length+10, bh=(v/max)*(h-50); const grd=g.createLinearGradient(0,h-25-bh,0,h-25); grd.addColorStop(0,\'#f6d77f\'); grd.addColorStop(1,\'#8f631b\'); g.fillStyle=grd; g.shadowBlur=16; g.shadowColor=\'rgba(216,177,91,.38)\'; g.fillRect(x,h-25-bh,bw,bh);}); g.shadowBlur=0; }\nfunction initClock(){ setInterval(()=>{ const d=new Date(); $(\'#clock\').textContent=d.toLocaleTimeString(\'en-US\',{hour12:false}); },1000); }\nfunction bind(){\n  $(\'#loginBtn\').onclick=login; $(\'#logoutBtn\').onclick=logout; $(\'#menuBtn\').onclick=()=>$(\'#sidebar\').classList.toggle(\'open\'); $(\'#globalSearch\').oninput=()=>renderAll();\n  document.addEventListener(\'input\',e=>ensureEnglishDigits(e.target));\n  document.addEventListener(\'keydown\',e=>{ if(e.ctrlKey&&e.key.toLowerCase()===\'k\'){ e.preventDefault(); $(\'#globalSearch\').focus(); } if(e.key===\'/\' && document.activeElement.tagName!==\'INPUT\'){e.preventDefault();$(\'#globalSearch\').focus();} });\n}\nwindow.JAWDAH_CLOUD_CHECK=()=>({status:\'v40-executive-dashboard\',user:Jawdah.user?.username||null,tables:Object.fromEntries(Object.entries(Jawdah.data).map(([k,v])=>[k,v.length])),dashboard:Jawdah.dashboard});\nwindow.addEventListener(\'load\',()=>{ bind(); initClock(); checkSession(); setInterval(()=>ensureEnglishDigits(),3000); });\n'

# Keep fallback assets synchronized with the real public files.
# This protects Railway deployments even if static routing uses the fallback branch.
def _load_public_asset(name: str, fallback: str) -> str:
    try:
        path = PUBLIC_DIR / name
        if path.exists():
            return path.read_text(encoding="utf-8")
    except Exception:
        pass
    return fallback

FALLBACK_INDEX_HTML = _load_public_asset("index.html", FALLBACK_INDEX_HTML)
FALLBACK_CSS = _load_public_asset("app.css", FALLBACK_CSS)
FALLBACK_JS = _load_public_asset("app.js", FALLBACK_JS)


ROLE_PERMISSIONS = {
    "admin": {"all"},
    "accountant": {"dashboard", "properties", "clients", "contracts:read", "invoices", "accounts", "purchase_invoices", "revenues", "salaries", "employees", "admin_expenses", "inventory_items", "inventory_transactions", "bank_transactions", "chart_accounts", "financial_periods", "approvals:read", "bank_reconciliations", "reports", "backup:export"},
    "operations": {"dashboard", "properties", "clients", "contracts", "invoices", "maintenance", "employees:read", "reports:read"},
    "maintenance": {"dashboard", "properties:read", "maintenance", "reports:read"},
    "viewer": {"dashboard", "properties:read", "clients:read", "contracts:read", "invoices:read", "accounts:read", "purchase_invoices:read", "revenues:read", "salaries:read", "employees:read", "admin_expenses:read", "inventory_items:read", "bank_transactions:read", "chart_accounts:read", "financial_periods:read", "approvals:read", "bank_reconciliations:read", "maintenance:read", "reports:read", "backup:export"},
}

TABLES = {
    "properties": ["id", "name", "type", "status", "price", "location", "image", "last_update", "notes"],
    "clients": ["id", "name", "phone", "email", "national_id", "balance", "notes"],
    "contracts": ["id", "contract_no", "contract_type", "property_id", "client_id", "tenant_nationality", "tenant_id_no", "unit_details", "start_date", "end_date", "rent_amount", "deposit_amount", "late_fee", "grace_days", "renewal_notice_days", "status", "payment_cycle", "legal_terms", "company_signatory", "approved_at", "notes"],
    "invoices": ["id", "invoice_no", "contract_id", "client_id", "property_id", "issue_date", "due_date", "description", "amount", "paid_amount", "status"],
    "payments": ["id", "invoice_id", "client_id", "property_id", "contract_id", "payment_date", "amount", "method", "note"],
    "accounts": ["id", "entry_date", "type", "category", "description", "client_id", "property_id", "invoice_id", "amount"],
    "purchase_invoices": ["id", "purchase_no", "supplier", "invoice_date", "due_date", "category", "description", "amount", "paid_amount", "status", "property_id", "account_id"],
    "revenues": ["id", "revenue_no", "revenue_date", "source", "category", "description", "amount", "client_id", "property_id", "account_id"],
    "salaries": ["id", "employee_name", "employee_id", "nationality_category", "id_number", "job_title", "department", "salary_month", "basic_salary", "allowances", "deductions", "net_salary", "status", "payment_date", "account_id"],
    "employees": ["id", "employee_code", "name", "nationality_category", "nationality", "id_number", "job_title", "department", "hire_date", "phone", "status", "notes"],
    "admin_expenses": ["id", "expense_date", "category", "description", "amount", "supplier", "property_id", "account_id"],
    "inventory_items": ["id", "sku", "name", "category", "unit", "quantity", "min_quantity", "unit_cost", "location", "notes"],
    "inventory_transactions": ["id", "item_id", "tx_date", "tx_type", "quantity", "unit_cost", "reference", "notes"],
    "bank_transactions": ["id", "bank_date", "bank_name", "reference", "type", "description", "amount", "matched_account_id", "status"],
    "chart_accounts": ["id", "code", "name", "type", "parent_code", "active", "notes"],
    "financial_periods": ["id", "period_name", "start_date", "end_date", "status", "closed_by", "closed_at", "notes"],
    "approvals": ["id", "entity", "entity_id", "request_type", "status", "requested_by", "approved_by", "requested_at", "approved_at", "notes"],
    "bank_reconciliations": ["id", "bank_name", "period_name", "book_balance", "bank_balance", "difference", "status", "reconciled_by", "reconciled_at", "notes"],
    "maintenance": ["id", "property_id", "title", "priority", "status", "request_date", "cost", "notes"],
    "users": ["id", "username", "name", "role", "active", "created_at", "last_login"],
    "audit_log": ["id", "created_at", "username", "action", "entity", "entity_id", "details"],
}

WRITE_ROLES = {"admin", "accountant", "operations", "maintenance"}


def now_iso() -> str:
    return datetime.now().replace(microsecond=0).isoformat(sep=" ")


def today() -> str:
    return date.today().isoformat()


def normalize_nationality_category(value: Any) -> str:
    raw = str(value or "").strip().lower()
    if raw in {"omani", "عماني", "om", "oman", "omanian", "local"}:
        return "Omani"
    return "Expat"


def nationality_label(value: Any) -> str:
    return "عماني" if normalize_nationality_category(value) == "Omani" else "أجنبي"


def client_ip(handler: BaseHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    return forwarded or handler.client_address[0]


def login_rate_key(handler: BaseHTTPRequestHandler, username: str) -> str:
    return f"{client_ip(handler)}:{username.lower()}"


def login_rate_limited(key: str) -> bool:
    now = time.time()
    attempts = [t for t in _LOGIN_ATTEMPTS.get(key, []) if now - t < LOGIN_WINDOW_SEC]
    _LOGIN_ATTEMPTS[key] = attempts
    return len(attempts) >= LOGIN_RATE_LIMIT


def register_login_failure(key: str) -> None:
    _LOGIN_ATTEMPTS.setdefault(key, []).append(time.time())


def clear_login_failures(key: str) -> None:
    _LOGIN_ATTEMPTS.pop(key, None)


def uid(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4).upper()}"


def password_hash(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("ascii"), 120000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algo, salt, digest = encoded.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        candidate = password_hash(password, salt).split("$", 2)[2]
        return hmac.compare_digest(candidate, digest)
    except Exception:
        return False


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def rows_to_dicts(rows: Iterable[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [dict(r) for r in rows]


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                active INTEGER NOT NULL DEFAULT 1,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS properties (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                location TEXT,
                image TEXT,
                last_update TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                national_id TEXT,
                balance REAL NOT NULL DEFAULT 0,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS contracts (
                id TEXT PRIMARY KEY,
                property_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                rent_amount REAL NOT NULL,
                status TEXT NOT NULL,
                payment_cycle TEXT NOT NULL DEFAULT 'monthly',
                notes TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(client_id) REFERENCES clients(id)
            );
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                invoice_no TEXT UNIQUE NOT NULL,
                contract_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                property_id TEXT NOT NULL,
                issue_date TEXT NOT NULL,
                due_date TEXT NOT NULL,
                description TEXT NOT NULL,
                amount REAL NOT NULL,
                paid_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL,
                FOREIGN KEY(contract_id) REFERENCES contracts(id),
                FOREIGN KEY(client_id) REFERENCES clients(id),
                FOREIGN KEY(property_id) REFERENCES properties(id)
            );
            CREATE TABLE IF NOT EXISTS payments (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                property_id TEXT NOT NULL,
                contract_id TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                note TEXT,
                FOREIGN KEY(invoice_id) REFERENCES invoices(id),
                FOREIGN KEY(client_id) REFERENCES clients(id),
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(contract_id) REFERENCES contracts(id)
            );
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                entry_date TEXT NOT NULL,
                type TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                client_id TEXT,
                property_id TEXT,
                invoice_id TEXT,
                amount REAL NOT NULL,
                FOREIGN KEY(client_id) REFERENCES clients(id),
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(invoice_id) REFERENCES invoices(id)
            );
            CREATE TABLE IF NOT EXISTS purchase_invoices (
                id TEXT PRIMARY KEY,
                purchase_no TEXT UNIQUE NOT NULL,
                supplier TEXT NOT NULL,
                invoice_date TEXT NOT NULL,
                due_date TEXT,
                category TEXT NOT NULL,
                description TEXT,
                amount REAL NOT NULL DEFAULT 0,
                paid_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Pending',
                property_id TEXT,
                account_id TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS revenues (
                id TEXT PRIMARY KEY,
                revenue_no TEXT UNIQUE NOT NULL,
                revenue_date TEXT NOT NULL,
                source TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                amount REAL NOT NULL DEFAULT 0,
                client_id TEXT,
                property_id TEXT,
                account_id TEXT,
                FOREIGN KEY(client_id) REFERENCES clients(id),
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS salaries (
                id TEXT PRIMARY KEY,
                employee_name TEXT NOT NULL,
                employee_id TEXT,
                nationality_category TEXT NOT NULL DEFAULT 'Omani',
                id_number TEXT,
                job_title TEXT,
                department TEXT,
                salary_month TEXT NOT NULL,
                basic_salary REAL NOT NULL DEFAULT 0,
                allowances REAL NOT NULL DEFAULT 0,
                deductions REAL NOT NULL DEFAULT 0,
                net_salary REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Pending',
                payment_date TEXT,
                account_id TEXT,
                FOREIGN KEY(employee_id) REFERENCES employees(id),
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS employees (
                id TEXT PRIMARY KEY,
                employee_code TEXT,
                name TEXT NOT NULL,
                nationality_category TEXT NOT NULL DEFAULT 'Omani',
                nationality TEXT,
                id_number TEXT,
                job_title TEXT,
                department TEXT,
                hire_date TEXT,
                phone TEXT,
                status TEXT NOT NULL DEFAULT 'Active',
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS admin_expenses (
                id TEXT PRIMARY KEY,
                expense_date TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                amount REAL NOT NULL DEFAULT 0,
                supplier TEXT,
                property_id TEXT,
                account_id TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id),
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS inventory_items (
                id TEXT PRIMARY KEY,
                sku TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                unit TEXT NOT NULL DEFAULT 'pcs',
                quantity REAL NOT NULL DEFAULT 0,
                min_quantity REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                location TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS inventory_transactions (
                id TEXT PRIMARY KEY,
                item_id TEXT NOT NULL,
                tx_date TEXT NOT NULL,
                tx_type TEXT NOT NULL,
                quantity REAL NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                reference TEXT,
                notes TEXT,
                FOREIGN KEY(item_id) REFERENCES inventory_items(id)
            );
            CREATE TABLE IF NOT EXISTS bank_transactions (
                id TEXT PRIMARY KEY,
                bank_date TEXT NOT NULL,
                bank_name TEXT NOT NULL,
                reference TEXT,
                type TEXT NOT NULL,
                description TEXT,
                amount REAL NOT NULL DEFAULT 0,
                matched_account_id TEXT,
                status TEXT NOT NULL DEFAULT 'Unmatched',
                FOREIGN KEY(matched_account_id) REFERENCES accounts(id)
            );
            CREATE TABLE IF NOT EXISTS chart_accounts (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                parent_code TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS financial_periods (
                id TEXT PRIMARY KEY,
                period_name TEXT UNIQUE NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open',
                closed_by TEXT,
                closed_at TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS approvals (
                id TEXT PRIMARY KEY,
                entity TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                request_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                requested_by TEXT,
                approved_by TEXT,
                requested_at TEXT NOT NULL,
                approved_at TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS bank_reconciliations (
                id TEXT PRIMARY KEY,
                bank_name TEXT NOT NULL,
                period_name TEXT NOT NULL,
                book_balance REAL NOT NULL DEFAULT 0,
                bank_balance REAL NOT NULL DEFAULT 0,
                difference REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'Open',
                reconciled_by TEXT,
                reconciled_at TEXT,
                notes TEXT
            );
            CREATE TABLE IF NOT EXISTS maintenance (
                id TEXT PRIMARY KEY,
                property_id TEXT NOT NULL,
                title TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL,
                request_date TEXT NOT NULL,
                cost REAL NOT NULL DEFAULT 0,
                notes TEXT,
                FOREIGN KEY(property_id) REFERENCES properties(id)
            );
            CREATE TABLE IF NOT EXISTS audit_log (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                username TEXT,
                action TEXT NOT NULL,
                entity TEXT NOT NULL,
                entity_id TEXT,
                details TEXT
            );
            """
        )
        for col, definition in [
            ("contract_no", "TEXT"),
            ("contract_type", "TEXT DEFAULT 'Residential'"),
            ("tenant_nationality", "TEXT"),
            ("tenant_id_no", "TEXT"),
            ("unit_details", "TEXT"),
            ("deposit_amount", "REAL NOT NULL DEFAULT 0"),
            ("late_fee", "REAL NOT NULL DEFAULT 0"),
            ("grace_days", "INTEGER NOT NULL DEFAULT 5"),
            ("renewal_notice_days", "INTEGER NOT NULL DEFAULT 30"),
            ("legal_terms", "TEXT"),
            ("company_signatory", "TEXT"),
            ("approved_at", "TEXT"),
        ]:
            ensure_column(db, "contracts", col, definition)
        for col, definition in [
            ("employee_id", "TEXT"),
            ("nationality_category", "TEXT DEFAULT 'Omani'"),
            ("id_number", "TEXT"),
            ("job_title", "TEXT"),
            ("department", "TEXT"),
        ]:
            ensure_column(db, "salaries", col, definition)
        if os.environ.get("JAWDAH_FRESH_START", "").strip().lower() in ("1", "true", "yes"):
            reset_operational_data(db)
        seed_if_empty(db)
        seed_chart_accounts(db)
        ensure_user(db, "admin", "مدير النظام", "admin", "admin123")
        ensure_user(db, "razan.accounting", "Razan — المحاسبة", "accountant", "Jawdeh123")
        ensure_user(db, "operations", "تشغيل العقارات", "operations", "LaunchOps2026")
        ensure_user(db, "maintenance", "فريق الصيانة", "maintenance", "LaunchMaint2026")
        db.commit()


def insert(db: sqlite3.Connection, table: str, row: Dict[str, Any]) -> None:
    keys = list(row.keys())
    placeholders = ",".join(["?"] * len(keys))
    sql = f"INSERT INTO {table} ({','.join(keys)}) VALUES ({placeholders})"
    db.execute(sql, [row[k] for k in keys])


def reset_operational_data(db: sqlite3.Connection) -> None:
    tables = [
        "payments", "inventory_transactions", "bank_reconciliations", "approvals",
        "audit_log", "maintenance", "accounts", "invoices", "contracts",
        "purchase_invoices", "revenues", "salaries", "employees", "admin_expenses",
        "inventory_items", "bank_transactions", "financial_periods",
        "chart_accounts", "clients", "properties",
    ]
    db.execute("PRAGMA foreign_keys=OFF")
    for table in tables:
        db.execute(f"DELETE FROM {table}")
    db.execute("PRAGMA foreign_keys=ON")


def seed_if_empty(db: sqlite3.Connection) -> None:
    if db.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        defaults = [
            ("admin", "System Admin", "admin", "admin123"),
            ("accountant", "Accountant", "accountant", "1234"),
            ("operations", "Operations", "operations", "1234"),
            ("maintenance", "Maintenance", "maintenance", "1234"),
            ("viewer", "Viewer", "viewer", "1234"),
        ]
        for username, name, role, pwd in defaults:
            insert(db, "users", {
                "id": uid("USR"), "username": username, "name": name, "role": role,
                "active": 1, "password_hash": password_hash(pwd), "created_at": now_iso(), "last_login": None
            })


def seed_chart_accounts(db: sqlite3.Connection) -> None:
    if db.execute("SELECT COUNT(*) FROM chart_accounts").fetchone()[0] > 0:
        return
    accounts = [
        ("1000", "Cash and Bank", "Asset"),
        ("1100", "Accounts Receivable", "Asset"),
        ("1200", "Inventory", "Asset"),
        ("2000", "Accounts Payable", "Liability"),
        ("3000", "Owner Equity", "Equity"),
        ("4000", "Rental Revenue", "Revenue"),
        ("4100", "Service Revenue", "Revenue"),
        ("5000", "Property Operating Expenses", "Expense"),
        ("5100", "Maintenance Expenses", "Expense"),
        ("5200", "Payroll Expenses", "Expense"),
        ("5300", "General and Administrative Expenses", "Expense"),
    ]
    for code, name, typ in accounts:
        insert(db, "chart_accounts", {"id": uid("COA"), "code": code, "name": name, "type": typ, "parent_code": None, "active": 1, "notes": ""})



def has_permission(user: Dict[str, Any], permission: str) -> bool:
    role = user.get("role")
    perms = ROLE_PERMISSIONS.get(role, set())
    if "all" in perms:
        return True
    if permission in perms:
        return True
    base = permission.split(":", 1)[0]
    if base in perms and not permission.endswith(":delete"):
        return True
    if permission.endswith(":read") and (base in perms or f"{base}:read" in perms):
        return True
    return False


def audit(db: sqlite3.Connection, user: Optional[Dict[str, Any]], action: str, entity: str, entity_id: Optional[str], details: str = "") -> None:
    insert(db, "audit_log", {"id": uid("LOG"), "created_at": now_iso(), "username": (user or {}).get("username"), "action": action, "entity": entity, "entity_id": entity_id, "details": details})


def next_invoice_no(db: sqlite3.Connection) -> str:
    year = date.today().year
    count = db.execute("SELECT COUNT(*) FROM invoices WHERE invoice_no LIKE ?", (f"INV-{year}-%",)).fetchone()[0]
    return f"INV-{year}-{count + 1:04d}"

def next_purchase_no(db: sqlite3.Connection) -> str:
    year = date.today().year
    count = db.execute("SELECT COUNT(*) FROM purchase_invoices WHERE purchase_no LIKE ?", (f"PINV-{year}-%",)).fetchone()[0]
    return f"PINV-{year}-{count + 1:04d}"

def next_revenue_no(db: sqlite3.Connection) -> str:
    year = date.today().year
    count = db.execute("SELECT COUNT(*) FROM revenues WHERE revenue_no LIKE ?", (f"REV-{year}-%",)).fetchone()[0]
    return f"REV-{year}-{count + 1:04d}"


def next_employee_code(db: sqlite3.Connection, nationality_category: str = "Omani") -> str:
    prefix = "OM" if normalize_nationality_category(nationality_category) == "Omani" else "EXP"
    pattern = f"{prefix}-%"
    count = db.execute("SELECT COUNT(*) FROM employees WHERE employee_code LIKE ?", (pattern,)).fetchone()[0]
    return f"{prefix}-{count + 1:04d}"


def next_contract_no(db: sqlite3.Connection, contract_type: str = "Residential") -> str:
    year = date.today().year
    code = {"Residential":"RES", "Commercial":"COM", "Short-Term":"STR", "Hospitality":"HOS"}.get(contract_type, "RES")
    pattern = f"LQL-{code}-{year}-%"
    count = db.execute("SELECT COUNT(*) FROM contracts WHERE contract_no LIKE ?", (pattern,)).fetchone()[0]
    return f"LQL-{code}-{year}-{count + 1:04d}"


def add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month-1])
    return date(year, month, day)


def contract_duration_months(start: str, end: str) -> int:
    try:
        s = datetime.fromisoformat(str(start)).date()
        e = datetime.fromisoformat(str(end)).date()
    except ValueError:
        return 12
    months = max(1, (e.year - s.year) * 12 + (e.month - s.month))
    if e.day >= s.day:
        months = max(1, months)
    return months


def contract_renewal_stats(db: sqlite3.Connection) -> Dict[str, int]:
    today_d = date.today()
    expiring = 0
    expired = 0
    rows = db.execute(
        "SELECT end_date, renewal_notice_days, status FROM contracts WHERE lower(status) LIKE '%active%'"
    ).fetchall()
    for row in rows:
        try:
            end = datetime.fromisoformat(str(row["end_date"])).date()
        except ValueError:
            continue
        notice = int(row["renewal_notice_days"] or 30)
        days_left = (end - today_d).days
        if days_left < 0:
            expired += 1
        elif days_left <= notice:
            expiring += 1
    return {"expiring": expiring, "expired": expired}


def ensure_column(db: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    cols = [r[1] for r in db.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def ensure_user(db: sqlite3.Connection, username: str, name: str, role: str, password: str) -> None:
    row = db.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if row:
        db.execute("UPDATE users SET name=?, role=?, active=1 WHERE username=?", (name, role, username))
        return
    insert(db, "users", {"id": uid("USR"), "username": username, "name": name, "role": role, "active": 1, "password_hash": password_hash(password), "created_at": now_iso(), "last_login": None})


class JawdahHandler(BaseHTTPRequestHandler):
    server_status = "LaunchQuality"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def cors_origin(self) -> str:
        if CORS_ORIGIN and CORS_ORIGIN != "*":
            return CORS_ORIGIN
        origin = self.headers.get("Origin", "").strip()
        return origin or "*"

    def send_security_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
        )
        if os.environ.get("JAWDAH_HSTS", "1").strip().lower() in ("1", "true", "yes"):
            self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", self.cors_origin())
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "86400")

    def send_json(self, data: Any, status: int = 200) -> None:
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_security_headers()
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(raw)

    def read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        if length > MAX_JSON_BYTES:
            raise ValueError("Payload too large")
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw or "{}")

    def current_user(self, db: sqlite3.Connection) -> Optional[Dict[str, Any]]:
        auth = self.headers.get("Authorization", "")
        token = ""
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
        if not token:
            return None
        row = db.execute(
            """
            SELECT u.id,u.username,u.name,u.role,u.active,u.created_at,u.last_login,s.expires_at
            FROM sessions s JOIN users u ON u.id=s.user_id
            WHERE s.token=? AND u.active=1
            """,
            (token,),
        ).fetchone()
        if not row:
            return None
        if datetime.fromisoformat(row["expires_at"]) < datetime.now():
            db.execute("DELETE FROM sessions WHERE token=?", (token,))
            db.commit()
            return None
        return dict(row)

    def require_user(self, db: sqlite3.Connection, permission: Optional[str] = None) -> Optional[Dict[str, Any]]:
        user = self.current_user(db)
        if not user:
            self.send_json({"ok": False, "error": "Authentication required"}, 401)
            return None
        if permission and not has_permission(user, permission):
            self.send_json({"ok": False, "error": "لا تملك صلاحية تنفيذ هذا الإجراء"}, 403)
            return None
        return user

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api("GET", parsed.path, parsed.query)
        else:
            self.serve_static(parsed.path)

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_security_headers()
        self.send_cors_headers()
        self.end_headers()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        self.handle_api("POST", parsed.path, parsed.query)

    def do_PUT(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        self.handle_api("PUT", parsed.path, parsed.query)

    def do_DELETE(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        self.handle_api("DELETE", parsed.path, parsed.query)

    def serve_static(self, path: str) -> None:
        if path in ("/", ""):
            path = "/index.html"
        if path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        safe = Path(path.lstrip("/")).as_posix()
        full = (PUBLIC_DIR / safe).resolve()
        public_root = PUBLIC_DIR.resolve()
        if str(full).startswith(str(public_root)) and full.exists() and not full.is_dir():
            raw = full.read_bytes()
            ctype = mimetypes.guess_type(str(full))[0] or "application/octet-stream"
            if full.suffix in {".html", ".css", ".js"}:
                ctype += "; charset=utf-8"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(raw)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return
        # Safe fallback for serving the main interface.
        if path == "/index.html":
            raw = FALLBACK_INDEX_HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/app.css":
            raw = FALLBACK_CSS.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/css; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/app.js":
            raw = FALLBACK_JS.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        self.send_error(404, "File not found")

    def handle_api(self, method: str, path: str, query: str) -> None:
        try:
            with connect() as db:
                parts = [p for p in path.split("/") if p][1:]
                if not parts:
                    return self.send_json({"ok": True, "status": "production"})
                if parts[0] == "health" and method == "GET":
                    return self.send_json({
                        "ok": True,
                        "status": "healthy",
                        "service": "production",
                        "version": APP_VERSION,
                        "database": "connected",
                    })
                if parts[0] == "login" and method == "POST":
                    return self.api_login(db)
                if parts[0] == "logout" and method == "POST":
                    return self.api_logout(db)
                if parts[0] == "me" and method == "GET":
                    user = self.require_user(db)
                    return None if not user else self.send_json({"ok": True, "user": user, "permissions": sorted(ROLE_PERMISSIONS.get(user["role"], []))})
                if parts[0] == "dashboard" and method == "GET":
                    user = self.require_user(db, "dashboard")
                    return None if not user else self.api_dashboard(db)
                if parts[0] == "bootstrap" and method == "GET":
                    user = self.require_user(db, "dashboard")
                    return None if not user else self.api_bootstrap(db, user)
                if parts[0] == "invoice_from_contract" and method == "POST":
                    user = self.require_user(db, "invoices")
                    return None if not user else self.api_invoice_from_contract(db, user)
                if parts[0] == "approve_contract" and method == "POST":
                    user = self.require_user(db, "contracts")
                    return None if not user else self.api_approve_contract(db, user)
                if parts[0] == "renew_contract" and method == "POST":
                    user = self.require_user(db, "contracts")
                    return None if not user else self.api_renew_contract(db, user)
                if parts[0] == "contract_template" and method == "POST":
                    user = self.require_user(db, "contracts:read")
                    return None if not user else self.api_contract_template(db, user)
                if parts[0] == "pay_invoice" and method == "POST":
                    user = self.require_user(db, "invoices")
                    return None if not user else self.api_pay_invoice(db, user)
                if parts[0] == "financial_statements" and method == "GET":
                    user = self.require_user(db, "accounts:read")
                    return None if not user else self.api_financial_statements(db)
                if parts[0] == "company_settings" and method == "GET":
                    user = self.require_user(db, "dashboard")
                    return None if not user else self.send_json({"ok": True, "settings": load_company_settings(COMPANY_SETTINGS_PATH)})
                if parts[0] == "company_settings" and method == "PUT":
                    user = self.require_user(db, "admin")
                    if not user:
                        return
                    data = self.read_json()
                    saved = save_company_settings(COMPANY_SETTINGS_PATH, data)
                    audit(db, user, "update", "company_settings", "company", "Updated company branding settings")
                    db.commit()
                    return self.send_json({"ok": True, "settings": saved})
                if parts[0] == "employee_roster" and method == "GET":
                    user = self.require_user(db, "employees:read")
                    return None if not user else self.api_employee_roster(db, query)
                if parts[0] == "bank_reconciliation_preview" and method == "GET":
                    user = self.require_user(db, "bank_reconciliations:read")
                    return None if not user else self.api_bank_reconciliation_preview(db, query)
                if parts[0] == "production_status" and method == "GET":
                    user = self.require_user(db, "reports:read")
                    return None if not user else self.api_production_status(db)
                if parts[0] == "backup" and method == "GET":
                    user = self.require_user(db, "backup:export")
                    return None if not user else self.api_backup(db)
                if parts[0] == "restore" and method == "POST":
                    user = self.require_user(db, "admin")
                    return None if not user else self.api_restore(db, user)
                if parts[0] == "export" and method == "GET" and len(parts) >= 2:
                    user = self.require_user(db, "backup:export")
                    return None if not user else self.api_export_csv(db, parts[1])
                if parts[0] in TABLES:
                    return self.api_crud(db, method, parts, query)
                self.send_json({"ok": False, "error": "Unknown endpoint"}, 404)
        except sqlite3.IntegrityError as exc:
            detail = str(exc) if DEBUG_ERRORS else None
            self.send_json({"ok": False, "error": "Database integrity error", **({"detail": detail} if detail else {})}, 400)
        except ValueError as exc:
            self.send_json({"ok": False, "error": str(exc)}, 400)
        except json.JSONDecodeError:
            self.send_json({"ok": False, "error": "Invalid JSON body"}, 400)
        except Exception as exc:
            detail = str(exc) if DEBUG_ERRORS else None
            self.send_json({"ok": False, "error": "Server error", **({"detail": detail} if detail else {})}, 500)

    def api_employee_roster(self, db: sqlite3.Connection, query: str) -> None:
        params = urllib.parse.parse_qs(query or "")
        month = (params.get("month") or [""])[0].strip()
        employees = rows_to_dicts(db.execute("SELECT * FROM employees ORDER BY name COLLATE NOCASE").fetchall())
        omani = [e for e in employees if normalize_nationality_category(e.get("nationality_category")) == "Omani"]
        expat = [e for e in employees if normalize_nationality_category(e.get("nationality_category")) != "Omani"]
        salary_sql = "SELECT * FROM salaries"
        salary_args: Tuple[Any, ...] = ()
        if month:
            salary_sql += " WHERE salary_month=?"
            salary_args = (month,)
        salaries = rows_to_dicts(db.execute(salary_sql, salary_args).fetchall())
        payroll_total = sum(float(s.get("net_salary") or 0) for s in salaries)
        omani_payroll = sum(float(s.get("net_salary") or 0) for s in salaries if normalize_nationality_category(s.get("nationality_category")) == "Omani")
        expat_payroll = payroll_total - omani_payroll
        self.send_json({
            "ok": True,
            "month": month or None,
            "summary": {
                "total_employees": len(employees),
                "omani_count": len(omani),
                "expat_count": len(expat),
                "active_employees": sum(1 for e in employees if str(e.get("status") or "").lower() == "active"),
                "payroll_total": payroll_total,
                "omani_payroll": omani_payroll,
                "expat_payroll": expat_payroll,
            },
            "omani": omani,
            "expat": expat,
            "salaries": salaries,
        })

    def api_login(self, db: sqlite3.Connection) -> None:
        data = self.read_json()
        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))
        rate_key = login_rate_key(self, username)
        if login_rate_limited(rate_key):
            return self.send_json({"ok": False, "error": "Too many login attempts. Try again later."}, 429)
        row = db.execute("SELECT * FROM users WHERE username=? AND active=1", (username,)).fetchone()
        if not row or not verify_password(password, row["password_hash"]):
            register_login_failure(rate_key)
            return self.send_json({"ok": False, "error": "Invalid username or password"}, 401)
        clear_login_failures(rate_key)
        token = secrets.token_urlsafe(32)
        expires = (datetime.now() + timedelta(hours=SESSION_HOURS)).isoformat()
        db.execute("INSERT INTO sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)", (token, row["id"], now_iso(), expires))
        db.execute("UPDATE users SET last_login=? WHERE id=?", (now_iso(), row["id"]))
        audit(db, dict(row), "login", "users", row["id"], "User login")
        db.commit()
        user = dict(row)
        user.pop("password_hash", None)
        self.send_json({"ok": True, "token": token, "user": user})

    def api_logout(self, db: sqlite3.Connection) -> None:
        auth = self.headers.get("Authorization", "")
        token = auth[7:].strip() if auth.startswith("Bearer ") else ""
        user = self.current_user(db)
        if token:
            db.execute("DELETE FROM sessions WHERE token=?", (token,))
        if user:
            audit(db, user, "logout", "users", user["id"], "User logout")
        db.commit()
        self.send_json({"ok": True})

    def api_bootstrap(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = {}
        for table, cols in TABLES.items():
            if table == "users" and user["role"] != "admin":
                continue
            visible_cols = ",".join(cols)
            data[table] = rows_to_dicts(db.execute(f"SELECT {visible_cols} FROM {table} ORDER BY rowid DESC").fetchall())
        self.send_json({"ok": True, "data": data, "dashboard": build_dashboard(db), "user": user, "company_settings": load_company_settings(COMPANY_SETTINGS_PATH)})

    def api_dashboard(self, db: sqlite3.Connection) -> None:
        self.send_json({"ok": True, "dashboard": build_dashboard(db)})

    def api_crud(self, db: sqlite3.Connection, method: str, parts: List[str], query: str) -> None:
        table = parts[0]
        item_id = parts[1] if len(parts) > 1 else None
        perm_base = table
        read_perm = f"{perm_base}:read"
        write_perm = perm_base
        delete_perm = f"{perm_base}:delete"
        if table == "users":
            write_perm = "admin"
            read_perm = "admin"
            delete_perm = "admin"
        user = self.require_user(db, read_perm if method == "GET" else (delete_perm if method == "DELETE" else write_perm))
        if not user:
            return
        visible_cols = TABLES[table]
        if method == "GET":
            cols = ",".join(visible_cols)
            if item_id:
                row = db.execute(f"SELECT {cols} FROM {table} WHERE id=?", (item_id,)).fetchone()
                return self.send_json({"ok": bool(row), "item": dict(row) if row else None})
            return self.send_json({"ok": True, "items": rows_to_dicts(db.execute(f"SELECT {cols} FROM {table} ORDER BY rowid DESC").fetchall())})
        if method in ("POST", "PUT"):
            data = self.read_json()
            if table == "users":
                return self.save_user(db, user, method, data, item_id)
            return self.save_generic(db, user, table, data, item_id, method)
        if method == "DELETE":
            if not item_id:
                return self.send_json({"ok": False, "error": "Missing id"}, 400)
            reason = protected_delete_reason(db, table, item_id)
            if reason:
                return self.send_json({"ok": False, "error": reason}, 400)
            db.execute(f"DELETE FROM {table} WHERE id=?", (item_id,))
            audit(db, user, "delete", table, item_id, "Deleted record")
            db.commit()
            return self.send_json({"ok": True})

    def save_user(self, db: sqlite3.Connection, user: Dict[str, Any], method: str, data: Dict[str, Any], item_id: Optional[str]) -> None:
        if method == "POST":
            required = ["username", "name", "role", "password"]
            missing = [k for k in required if not data.get(k)]
            if missing:
                return self.send_json({"ok": False, "error": f"Missing: {', '.join(missing)}"}, 400)
            pwd = str(data["password"])
            if len(pwd) < 8:
                return self.send_json({"ok": False, "error": "Password must be at least 8 characters"}, 400)
            row = {
                "id": data.get("id") or uid("USR"), "username": data["username"].strip(), "name": data["name"].strip(),
                "role": data["role"], "active": int(bool(data.get("active", True))), "password_hash": password_hash(str(data["password"])),
                "created_at": now_iso(), "last_login": None,
            }
            insert(db, "users", row)
            audit(db, user, "create", "users", row["id"], f"Created user {row['username']}")
            db.commit()
            row.pop("password_hash", None)
            return self.send_json({"ok": True, "item": row})
        if not item_id:
            return self.send_json({"ok": False, "error": "Missing id"}, 400)
        current = db.execute("SELECT * FROM users WHERE id=?", (item_id,)).fetchone()
        if not current:
            return self.send_json({"ok": False, "error": "User not found"}, 404)
        fields = {"username": data.get("username", current["username"]), "name": data.get("name", current["name"]), "role": data.get("role", current["role"]), "active": int(bool(data.get("active", current["active"]))) }
        db.execute("UPDATE users SET username=?,name=?,role=?,active=? WHERE id=?", (fields["username"], fields["name"], fields["role"], fields["active"], item_id))
        if data.get("password"):
            pwd = str(data["password"])
            if len(pwd) < 8:
                return self.send_json({"ok": False, "error": "Password must be at least 8 characters"}, 400)
            db.execute("UPDATE users SET password_hash=? WHERE id=?", (password_hash(pwd), item_id))
        audit(db, user, "update", "users", item_id, f"Updated user {fields['username']}")
        db.commit()
        return self.send_json({"ok": True})

    def save_generic(self, db: sqlite3.Connection, user: Dict[str, Any], table: str, data: Dict[str, Any], item_id: Optional[str], method: str) -> None:
        row_id = item_id or data.get("id") or uid(table[:3].upper())
        data["id"] = row_id
        if table == "properties":
            if not str(data.get("name") or "").strip():
                return self.send_json({"ok": False, "error": "اسم العقار مطلوب"}, 400)
            data.setdefault("status", "Vacant")
            data.setdefault("type", "Villa")
            data.setdefault("price", 0)
            data.setdefault("location", "")
            data.setdefault("image", "🏠")
            data.setdefault("last_update", today())
        if table == "clients":
            if not str(data.get("name") or "").strip():
                return self.send_json({"ok": False, "error": "اسم العميل مطلوب"}, 400)
        if table == "contracts":
            if not data.get("property_id") or not data.get("client_id") or float(data.get("rent_amount") or 0) <= 0:
                return self.send_json({"ok": False, "error": "Contract requires property, client, and valid rent amount"}, 400)
            if not exists(db, "properties", data["property_id"]) or not exists(db, "clients", data["client_id"]):
                return self.send_json({"ok": False, "error": "Invalid property or client"}, 400)
            data.setdefault("contract_type", "Residential")
            data.setdefault("contract_no", next_contract_no(db, data.get("contract_type") or "Residential"))
            data.setdefault("deposit_amount", 0)
            data.setdefault("late_fee", 0)
            data.setdefault("grace_days", 5)
            data.setdefault("renewal_notice_days", 90)
            data.setdefault("payment_cycle", "monthly")
            data.setdefault("status", "Draft")
            data.setdefault("legal_terms", default_legal_terms())
            data.setdefault("company_signatory", "Quality Launch Services LLC")
        if table == "invoices":
            return self.send_json({"ok": False, "error": "Create invoices from a contract using the invoice action"}, 400)
        if table == "payments":
            return self.send_json({"ok": False, "error": "Create payments from an invoice using the payment action"}, 400)
        if table == "accounts" and float(data.get("amount") or 0) <= 0:
            return self.send_json({"ok": False, "error": "Account entry requires positive amount"}, 400)
        if table == "purchase_invoices":
            data.setdefault("purchase_no", next_purchase_no(db))
            data.setdefault("invoice_date", today())
            data.setdefault("status", "Pending")
            data.setdefault("paid_amount", 0)
            if float(data.get("amount") or 0) <= 0:
                return self.send_json({"ok": False, "error": "Purchase invoice requires positive amount"}, 400)
            if method == "POST":
                acc_id = uid("ACC")
                insert(db, "accounts", {"id":acc_id,"entry_date":data.get("invoice_date") or today(),"type":"expense","category":data.get("category") or "Purchases","description":f"Purchase invoice {data.get('purchase_no')} - {data.get('supplier')}","client_id":None,"property_id":data.get("property_id"),"invoice_id":None,"amount":float(data.get("amount") or 0)})
                data["account_id"] = acc_id
        if table == "revenues":
            data.setdefault("revenue_no", next_revenue_no(db))
            data.setdefault("revenue_date", today())
            if float(data.get("amount") or 0) <= 0:
                return self.send_json({"ok": False, "error": "Revenue requires positive amount"}, 400)
            if method == "POST":
                acc_id = uid("ACC")
                insert(db, "accounts", {"id":acc_id,"entry_date":data.get("revenue_date") or today(),"type":"income","category":data.get("category") or "Revenue","description":data.get("description") or f"Revenue {data.get('revenue_no')}","client_id":data.get("client_id"),"property_id":data.get("property_id"),"invoice_id":None,"amount":float(data.get("amount") or 0)})
                data["account_id"] = acc_id
        if table == "salaries":
            net = float(data.get("net_salary") or 0) or (float(data.get("basic_salary") or 0) + float(data.get("allowances") or 0) - float(data.get("deductions") or 0))
            data["net_salary"] = net
            data.setdefault("status", "Pending")
            if data.get("employee_id"):
                emp = db.execute("SELECT * FROM employees WHERE id=?", (data["employee_id"],)).fetchone()
                if emp:
                    data.setdefault("employee_name", emp["name"])
                    data.setdefault("nationality_category", emp["nationality_category"])
                    data.setdefault("id_number", emp["id_number"])
                    data.setdefault("job_title", emp["job_title"])
                    data.setdefault("department", emp["department"])
            data["nationality_category"] = normalize_nationality_category(data.get("nationality_category"))
            if not data.get("employee_name"):
                return self.send_json({"ok": False, "error": "Salary requires employee name or linked employee"}, 400)
            if net <= 0:
                return self.send_json({"ok": False, "error": "Salary net amount must be positive"}, 400)
            if method == "POST":
                acc_id = uid("ACC")
                insert(db, "accounts", {"id":acc_id,"entry_date":data.get("payment_date") or today(),"type":"expense","category":"Payroll","description":f"Salary {data.get('employee_name')} {data.get('salary_month')}","client_id":None,"property_id":None,"invoice_id":None,"amount":net})
                data["account_id"] = acc_id
        if table == "employees":
            if not str(data.get("name") or "").strip():
                return self.send_json({"ok": False, "error": "Employee name is required"}, 400)
            data["nationality_category"] = normalize_nationality_category(data.get("nationality_category"))
            data.setdefault("status", "Active")
            if not data.get("employee_code"):
                data["employee_code"] = next_employee_code(db, data["nationality_category"])
        if table == "admin_expenses":
            if float(data.get("amount") or 0) <= 0:
                return self.send_json({"ok": False, "error": "Expense requires positive amount"}, 400)
            if method == "POST":
                acc_id = uid("ACC")
                insert(db, "accounts", {"id":acc_id,"entry_date":data.get("expense_date") or today(),"type":"expense","category":data.get("category") or "G&A","description":data.get("description") or "Administrative expense","client_id":None,"property_id":data.get("property_id"),"invoice_id":None,"amount":float(data.get("amount") or 0)})
                data["account_id"] = acc_id
        if table == "inventory_transactions":
            if not exists(db, "inventory_items", data.get("item_id", "")):
                return self.send_json({"ok": False, "error": "Inventory transaction requires valid item"}, 400)
            qty = float(data.get("quantity") or 0)
            if qty <= 0:
                return self.send_json({"ok": False, "error": "Inventory quantity must be positive"}, 400)
            if method == "POST":
                sign = 1 if str(data.get("tx_type", "in")).lower() in ("in","purchase","return") else -1
                db.execute("UPDATE inventory_items SET quantity = quantity + ? WHERE id=?", (sign*qty, data.get("item_id")))
        cols = [c for c in TABLES[table] if c in data]
        clean = {c: data.get(c) for c in cols}
        if method == "POST":
            insert(db, table, clean)
            audit(db, user, "create", table, row_id, "Created record")
            db.commit()
            return self.send_json({"ok": True, "item": clean})
        else:
            if not item_id:
                return self.send_json({"ok": False, "error": "Missing id"}, 400)
            update_cols = [c for c in cols if c != "id"]
            if not update_cols:
                return self.send_json({"ok": True})
            sql = f"UPDATE {table} SET {','.join([c+'=?' for c in update_cols])} WHERE id=?"
            db.execute(sql, [clean[c] for c in update_cols] + [item_id])
            audit(db, user, "update", table, item_id, "Updated record")
            db.commit()
            return self.send_json({"ok": True})

    def api_invoice_from_contract(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        contract_id = data.get("contract_id")
        contract = db.execute("SELECT * FROM contracts WHERE id=?", (contract_id,)).fetchone()
        if not contract:
            return self.send_json({"ok": False, "error": "العقد غير موجود"}, 404)
        if not contract["property_id"] or not contract["client_id"]:
            return self.send_json({"ok": False, "error": "يجب ربط العقد بعقار وعميل قبل إنشاء الفاتورة"}, 400)
        if not exists(db, "properties", contract["property_id"]) or not exists(db, "clients", contract["client_id"]):
            return self.send_json({"ok": False, "error": "رابط العقد غير صالح — تحقق من العقار والعميل"}, 400)
        amount = float(data.get("amount") or contract["rent_amount"] or 0)
        if amount <= 0:
            return self.send_json({"ok": False, "error": "مبلغ الفاتورة يجب أن يكون أكبر من صفر"}, 400)
        invoice = {
            "id": uid("INV"),
            "invoice_no": next_invoice_no(db),
            "contract_id": contract["id"],
            "client_id": contract["client_id"],
            "property_id": contract["property_id"],
            "issue_date": data.get("issue_date") or today(),
            "due_date": data.get("due_date") or (date.today() + timedelta(days=7)).isoformat(),
            "description": data.get("description") or "Rent invoice",
            "amount": amount,
            "paid_amount": 0,
            "status": "Pending",
        }
        insert(db, "invoices", invoice)
        audit(db, user, "create", "invoices", invoice["id"], f"Invoice {invoice['invoice_no']} from contract {contract_id}")
        db.commit()
        self.send_json({"ok": True, "item": invoice})

    def api_pay_invoice(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        invoice_id = data.get("invoice_id")
        amount = float(data.get("amount") or 0)
        invoice = db.execute("SELECT * FROM invoices WHERE id=?", (invoice_id,)).fetchone()
        if not invoice:
            return self.send_json({"ok": False, "error": "Invoice not found"}, 404)
        if amount <= 0:
            return self.send_json({"ok": False, "error": "Payment amount must be positive"}, 400)
        remaining = float(invoice["amount"]) - float(invoice["paid_amount"])
        if amount > remaining + 0.001:
            return self.send_json({"ok": False, "error": "Payment exceeds remaining invoice balance"}, 400)
        new_paid = float(invoice["paid_amount"]) + amount
        status = "Paid" if new_paid >= float(invoice["amount"]) - 0.001 else "Partial"
        payment = {
            "id": uid("PAY"),
            "invoice_id": invoice["id"],
            "client_id": invoice["client_id"],
            "property_id": invoice["property_id"],
            "contract_id": invoice["contract_id"],
            "payment_date": data.get("payment_date") or today(),
            "amount": amount,
            "method": data.get("method") or "Cash",
            "note": data.get("note") or "Invoice payment",
        }
        account = {
            "id": uid("ACC"), "entry_date": payment["payment_date"], "type": "income", "category": "Collection",
            "description": f"Payment for {invoice['invoice_no']}", "client_id": invoice["client_id"], "property_id": invoice["property_id"],
            "invoice_id": invoice["id"], "amount": amount,
        }
        insert(db, "payments", payment)
        insert(db, "accounts", account)
        db.execute("UPDATE invoices SET paid_amount=?, status=? WHERE id=?", (new_paid, status, invoice["id"]))
        audit(db, user, "pay", "invoices", invoice["id"], f"Collected {amount} for {invoice['invoice_no']}")
        db.commit()
        self.send_json({"ok": True, "payment": payment, "status": status, "paid_amount": new_paid})

    def api_approve_contract(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        contract_id = data.get("contract_id")
        contract = db.execute("SELECT * FROM contracts WHERE id=?", (contract_id,)).fetchone()
        if not contract:
            return self.send_json({"ok": False, "error": "Contract not found"}, 404)
        start = datetime.fromisoformat(contract["start_date"]).date()
        end = datetime.fromisoformat(contract["end_date"]).date()
        rent = float(contract["rent_amount"] or 0)
        if rent <= 0 or end < start:
            return self.send_json({"ok": False, "error": "Invalid contract dates or rent"}, 400)
        created = []
        due = start
        i = 0
        while due <= end and i < 120:
            exists_invoice = db.execute("SELECT id FROM invoices WHERE contract_id=? AND due_date=?", (contract_id, due.isoformat())).fetchone()
            if not exists_invoice:
                inv = {
                    "id": uid("INV"), "invoice_no": next_invoice_no(db), "contract_id": contract["id"],
                    "client_id": contract["client_id"], "property_id": contract["property_id"],
                    "issue_date": today(), "due_date": due.isoformat(),
                    "description": f"Rent installment for contract {contract['contract_no'] or contract['id']}",
                    "amount": rent, "paid_amount": 0, "status": "Pending",
                }
                insert(db, "invoices", inv)
                created.append(inv)
            i += 1
            due = add_months(start, i)
            if str(contract["payment_cycle"]).lower() in ("once", "one-time", "single"):
                break
        db.execute("UPDATE contracts SET status=?, approved_at=? WHERE id=?", ("Active", now_iso(), contract_id))
        audit(db, user, "approve", "contracts", contract_id, f"Approved contract and generated {len(created)} invoices")
        db.commit()
        self.send_json({"ok": True, "created_invoices": created})

    def api_renew_contract(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        contract_id = data.get("contract_id")
        contract = db.execute("SELECT * FROM contracts WHERE id=?", (contract_id,)).fetchone()
        if not contract:
            return self.send_json({"ok": False, "error": "Contract not found"}, 404)
        status = str(contract["status"] or "").lower()
        if status in ("renewed", "closed", "draft"):
            return self.send_json({"ok": False, "error": "This contract cannot be renewed"}, 400)
        try:
            old_end = datetime.fromisoformat(str(contract["end_date"])).date()
        except ValueError:
            return self.send_json({"ok": False, "error": "Invalid contract end date"}, 400)
        months = int(data.get("months") or contract_duration_months(contract["start_date"], contract["end_date"]))
        if months <= 0 or months > 120:
            return self.send_json({"ok": False, "error": "Invalid renewal duration"}, 400)
        new_start = old_end + timedelta(days=1)
        if data.get("start_date"):
            try:
                new_start = datetime.fromisoformat(str(data["start_date"])).date()
            except ValueError:
                return self.send_json({"ok": False, "error": "Invalid start date"}, 400)
        if data.get("end_date"):
            try:
                new_end = datetime.fromisoformat(str(data["end_date"])).date()
            except ValueError:
                return self.send_json({"ok": False, "error": "Invalid end date"}, 400)
        else:
            new_end = add_months(new_start, months)
        if new_end <= new_start:
            return self.send_json({"ok": False, "error": "Renewal end date must be after start date"}, 400)
        rent = float(data["rent_amount"]) if data.get("rent_amount") not in (None, "") else float(contract["rent_amount"] or 0)
        if rent <= 0:
            return self.send_json({"ok": False, "error": "Invalid rent amount"}, 400)
        prev_no = contract["contract_no"] or contract["id"]
        new_contract = {
            "id": uid("CT"),
            "contract_no": next_contract_no(db, contract["contract_type"] or "Residential"),
            "contract_type": contract["contract_type"],
            "property_id": contract["property_id"],
            "client_id": contract["client_id"],
            "tenant_nationality": contract["tenant_nationality"],
            "tenant_id_no": contract["tenant_id_no"],
            "unit_details": contract["unit_details"],
            "start_date": new_start.isoformat(),
            "end_date": new_end.isoformat(),
            "rent_amount": rent,
            "deposit_amount": contract["deposit_amount"],
            "late_fee": contract["late_fee"],
            "grace_days": contract["grace_days"],
            "renewal_notice_days": contract["renewal_notice_days"],
            "status": "Draft",
            "payment_cycle": contract["payment_cycle"],
            "legal_terms": contract["legal_terms"] or default_legal_terms(),
            "company_signatory": contract["company_signatory"] or "Launch Quality LLC",
            "approved_at": None,
            "notes": f"Renewal from {prev_no}",
        }
        insert(db, "contracts", new_contract)
        db.execute("UPDATE contracts SET status=? WHERE id=?", ("Renewed", contract_id))
        audit(db, user, "renew", "contracts", contract_id, f"Renewed {prev_no} -> {new_contract['contract_no']}")
        db.commit()
        self.send_json({"ok": True, "contract": new_contract, "previous_contract_id": contract_id})

    def api_contract_template(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        contract_id = data.get("contract_id")
        c = db.execute("SELECT * FROM contracts WHERE id=?", (contract_id,)).fetchone()
        if not c:
            return self.send_json({"ok": False, "error": "Contract not found"}, 404)
        client = db.execute("SELECT * FROM clients WHERE id=?", (c["client_id"],)).fetchone()
        prop = db.execute("SELECT * FROM properties WHERE id=?", (c["property_id"],)).fetchone()
        settings = load_company_settings(COMPANY_SETTINGS_PATH)
        html = build_contract_html(settings, dict(c), dict(client) if client else None, dict(prop) if prop else None)
        self.send_json({"ok": True, "html": html})

    def api_bank_reconciliation_preview(self, db: sqlite3.Connection, query: str) -> None:
        params = urllib.parse.parse_qs(query or "")
        bank_name = (params.get("bank_name") or [""])[0].strip()
        period_name = (params.get("period_name") or [""])[0].strip()
        sql = "SELECT type, amount FROM bank_transactions WHERE 1=1"
        args: List[Any] = []
        if bank_name:
            sql += " AND bank_name=?"
            args.append(bank_name)
        rows = db.execute(sql, args).fetchall()
        book_balance = sum(
            (1 if str(r["type"] or "").lower() in ("deposit", "in", "income") else -1) * float(r["amount"] or 0)
            for r in rows
        )
        open_periods = db.execute(
            "SELECT period_name, start_date, end_date FROM financial_periods WHERE lower(status)='open' ORDER BY start_date DESC"
        ).fetchall()
        self.send_json({
            "ok": True,
            "bank_name": bank_name or "All Banks",
            "period_name": period_name,
            "book_balance": round(book_balance, 3),
            "transaction_count": len(rows),
            "open_periods": [dict(p) for p in open_periods],
        })

    def api_financial_statements(self, db: sqlite3.Connection) -> None:
        accounts = rows_to_dicts(db.execute("SELECT * FROM accounts").fetchall())
        invoices = rows_to_dicts(db.execute("SELECT * FROM invoices").fetchall())
        purchase_invoices = rows_to_dicts(db.execute("SELECT * FROM purchase_invoices").fetchall())
        salaries = rows_to_dicts(db.execute("SELECT * FROM salaries").fetchall())
        admin_expenses = rows_to_dicts(db.execute("SELECT * FROM admin_expenses").fetchall())
        inventory = rows_to_dicts(db.execute("SELECT * FROM inventory_items").fetchall())
        bank = rows_to_dicts(db.execute("SELECT * FROM bank_transactions").fetchall())
        income = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "income")
        expense = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "expense")
        ar = sum(max(0, float(i["amount"] or 0)-float(i["paid_amount"] or 0)) for i in invoices)
        ap = sum(max(0, float(p["amount"] or 0)-float(p["paid_amount"] or 0)) for p in purchase_invoices)
        inventory_value = sum(float(i["quantity"] or 0)*float(i["unit_cost"] or 0) for i in inventory)
        bank_balance = sum((1 if b["type"] in ("deposit","in","income") else -1)*float(b["amount"] or 0) for b in bank)
        payroll = sum(float(s["net_salary"] or 0) for s in salaries)
        ga = sum(float(e["amount"] or 0) for e in admin_expenses)
        self.send_json({"ok": True, "statements": {
            "income_statement": {"revenue": income, "expenses": expense, "net_income": income-expense, "payroll": payroll, "general_admin": ga},
            "balance_sheet": {"assets": {"cash_bank": bank_balance, "accounts_receivable": ar, "inventory": inventory_value}, "liabilities": {"accounts_payable": ap}, "equity": {"retained_earnings": income-expense}},
            "linked_storage": {"tables": sorted(TABLES.keys()), "backup_ready": True}
        }})

    def api_production_status(self, db: sqlite3.Connection) -> None:
        props = db.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
        clients = db.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
        contracts = db.execute("SELECT COUNT(*) FROM contracts").fetchone()[0]
        invoices = db.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
        accounts = db.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
        users = db.execute("SELECT COUNT(*) FROM users WHERE active=1").fetchone()[0]
        audit_rows = db.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
        chart = db.execute("SELECT COUNT(*) FROM chart_accounts").fetchone()[0]
        bank_rows = db.execute("SELECT COUNT(*) FROM bank_transactions").fetchone()[0]
        inv_bad = db.execute("SELECT COUNT(*) FROM invoices WHERE contract_id NOT IN (SELECT id FROM contracts)").fetchone()[0]
        con_bad = db.execute("SELECT COUNT(*) FROM contracts WHERE property_id NOT IN (SELECT id FROM properties) OR client_id NOT IN (SELECT id FROM clients)").fetchone()[0]
        overdue = db.execute("SELECT COALESCE(SUM(amount-paid_amount),0) FROM invoices WHERE status!='Paid' AND due_date < ?", (today(),)).fetchone()[0]
        low_stock = db.execute("SELECT COUNT(*) FROM inventory_items WHERE quantity <= min_quantity").fetchone()[0]
        checks = [
            {"name": "العقارات والوحدات", "ok": props > 0, "value": props},
            {"name": "المستأجرون", "ok": clients > 0, "value": clients},
            {"name": "العقود", "ok": contracts > 0 and con_bad == 0, "value": contracts},
            {"name": "الفواتير", "ok": invoices > 0 and inv_bad == 0, "value": invoices},
            {"name": "الحسابات", "ok": accounts > 0, "value": accounts},
            {"name": "دليل الحسابات", "ok": chart >= 8, "value": chart},
            {"name": "كشف البنك", "ok": bank_rows > 0, "value": bank_rows},
            {"name": "المستخدمون والصلاحيات", "ok": users >= 5, "value": users},
            {"name": "سجل التدقيق", "ok": audit_rows > 0, "value": audit_rows},
        ]
        score = round(sum(1 for c in checks if c["ok"]) / len(checks) * 100, 1)
        self.send_json({"ok": True, "score": score, "checks": checks, "alerts": {"overdue": float(overdue or 0), "low_stock": low_stock, "broken_contract_links": con_bad, "broken_invoice_links": inv_bad}})

    def api_backup(self, db: sqlite3.Connection) -> None:
        payload = {"status": "production", "exported_at": now_iso(), "tables": {}}
        for table, cols in TABLES.items():
            payload["tables"][table] = rows_to_dicts(db.execute(f"SELECT {','.join(cols)} FROM {table}").fetchall())
        self.send_json({"ok": True, "backup": payload})

    def api_restore(self, db: sqlite3.Connection, user: Dict[str, Any]) -> None:
        data = self.read_json()
        backup = data.get("backup") or data
        tables = backup.get("tables", {})
        mode = data.get("mode") or "merge"
        if mode == "replace":
            for table in ["audit_log","maintenance","accounts","payments","invoices","contracts","clients","properties"]:
                db.execute(f"DELETE FROM {table}")
        for table, items in tables.items():
            if table not in TABLES or table == "users":
                continue
            for item in items:
                cols = [c for c in TABLES[table] if c in item]
                if not cols or not item.get("id"):
                    continue
                values = [item[c] for c in cols]
                placeholders = ",".join(["?"] * len(cols))
                updates = ",".join([f"{c}=excluded.{c}" for c in cols if c != "id"])
                db.execute(f"INSERT INTO {table} ({','.join(cols)}) VALUES ({placeholders}) ON CONFLICT(id) DO UPDATE SET {updates}", values)
        audit(db, user, "restore", "database", None, f"Restore mode {mode}")
        db.commit()
        self.send_json({"ok": True})

    def api_export_csv(self, db: sqlite3.Connection, table: str) -> None:
        if table not in TABLES:
            return self.send_json({"ok": False, "error": "Unknown table"}, 404)
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=TABLES[table])
        writer.writeheader()
        for row in rows_to_dicts(db.execute(f"SELECT {','.join(TABLES[table])} FROM {table}").fetchall()):
            writer.writerow(row)
        raw = output.getvalue().encode("utf-8-sig")
        self.send_response(200)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f"attachment; filename=jawdah-{table}.csv")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def exists(db: sqlite3.Connection, table: str, row_id: str) -> bool:
    return db.execute(f"SELECT 1 FROM {table} WHERE id=?", (row_id,)).fetchone() is not None


def protected_delete_reason(db: sqlite3.Connection, table: str, row_id: str) -> str:
    checks = {
        "properties": [("contracts", "property_id", "Property has contracts"), ("invoices", "property_id", "Property has invoices"), ("accounts", "property_id", "Property has accounts")],
        "clients": [("contracts", "client_id", "Client has contracts"), ("invoices", "client_id", "Client has invoices"), ("accounts", "client_id", "Client has accounts")],
        "contracts": [("invoices", "contract_id", "Contract has invoices")],
        "invoices": [("payments", "invoice_id", "Invoice has payments"), ("accounts", "invoice_id", "Invoice has accounts")],
        "employees": [("salaries", "employee_id", "Employee has salary records")],
    }
    for child, col, msg in checks.get(table, []):
        if db.execute(f"SELECT 1 FROM {child} WHERE {col}=? LIMIT 1", (row_id,)).fetchone():
            return msg
    return ""


def build_dashboard(db: sqlite3.Connection) -> Dict[str, Any]:
    prop_total = db.execute("SELECT COUNT(*) FROM properties").fetchone()[0]
    client_total = db.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    contract_total = db.execute("SELECT COUNT(*) FROM contracts").fetchone()[0]
    invoice_total = db.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
    rented = db.execute("SELECT COUNT(*) FROM properties WHERE lower(status) LIKE '%rented%' OR lower(status) LIKE '%leased%'").fetchone()[0]
    vacant = db.execute("SELECT COUNT(*) FROM properties WHERE lower(status) LIKE '%vacant%'").fetchone()[0]
    maintenance_count = db.execute("SELECT COUNT(*) FROM maintenance WHERE lower(status) NOT IN ('closed','done','completed')").fetchone()[0]
    invoices = rows_to_dicts(db.execute("SELECT * FROM invoices").fetchall())
    accounts = rows_to_dicts(db.execute("SELECT * FROM accounts").fetchall())
    income = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "income")
    expense = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "expense")
    billed = sum(float(i["amount"] or 0) for i in invoices)
    paid = sum(float(i["paid_amount"] or 0) for i in invoices)
    overdue = sum(max(0, float(i["amount"] or 0) - float(i["paid_amount"] or 0)) for i in invoices if i["status"] != "Paid" and i["due_date"] < today())
    occupancy = round((rented / prop_total * 100), 1) if prop_total else 0
    months = []
    for m in range(5, -1, -1):
        d = date.today().replace(day=1) - timedelta(days=31*m)
        key = d.strftime("%Y-%m")
        month_income = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "income" and str(a["entry_date"]).startswith(key))
        month_expense = sum(float(a["amount"] or 0) for a in accounts if a["type"] == "expense" and str(a["entry_date"]).startswith(key))
        months.append({"month": key, "income": month_income, "expense": month_expense})
    health = 100
    if prop_total:
        if overdue > 0: health -= 15
        if maintenance_count > 0: health -= min(20, maintenance_count * 5)
        if occupancy < 70: health -= 15
    renewal = contract_renewal_stats(db)
    expiring = renewal["expiring"]
    expired = renewal["expired"]
    if prop_total:
        if expiring > 0: health -= min(20, expiring * 4)
        if expired > 0: health -= min(25, expired * 6)
    health = max(0, min(100, health))
    decisions = []
    if not prop_total and not client_total and not contract_total and not invoice_total:
        decisions.append({"level":"Info","text":"النظام فارغ وجاهز — ابدأ بإضافة العقارات والعملاء والعقود"})
    if expired > 0:
        decisions.append({"level":"High","text":f"{expired} عقد منتهٍ يحتاج تجديد أو إغلاق فوري"})
    if expiring > 0:
        decisions.append({"level":"High","text":f"{expiring} عقد يحتاج قرار تجديد قبل انتهاء المدة"})
    if overdue > 0:
        decisions.append({"level":"High","text":"متابعة الفواتير المتأخرة قبل إقفال الشهر"})
    if vacant > 0:
        decisions.append({"level":"Medium","text":"تسويق العقارات الشاغرة لرفع الإشغال"})
    if maintenance_count > 0:
        decisions.append({"level":"Medium","text":"إغلاق طلبات الصيانة المفتوحة لحماية جودة الخدمة"})
    if not decisions:
        decisions.append({"level":"Good","text":"التشغيل مستقر اليوم"})
    purchases_due = db.execute("SELECT COALESCE(SUM(amount-paid_amount),0) FROM purchase_invoices WHERE status != 'Paid'").fetchone()[0]
    payroll_total = db.execute("SELECT COALESCE(SUM(net_salary),0) FROM salaries").fetchone()[0]
    inventory_value = db.execute("SELECT COALESCE(SUM(quantity*unit_cost),0) FROM inventory_items").fetchone()[0]
    bank_balance = db.execute("SELECT COALESCE(SUM(CASE WHEN type IN ('deposit','in','income') THEN amount ELSE -amount END),0) FROM bank_transactions").fetchone()[0]
    return {
        "kpis": {
            "properties": prop_total, "rented": rented, "vacant": vacant, "maintenance": maintenance_count,
            "income": income, "expense": expense, "net": income - expense, "billed": billed, "paid": paid,
            "overdue": overdue, "occupancy": occupancy, "health": health,
            "purchases_due": float(purchases_due or 0), "payroll": float(payroll_total or 0), "inventory_value": float(inventory_value or 0), "bank_balance": float(bank_balance or 0),
            "expiring": expiring, "expired": expired,
        },
        "series": months,
        "decisions": decisions,
        "renewal": renewal,
    }


def main() -> None:
    init_db()
    print(f"Launch Quality LLC {APP_VERSION} running on http://{HOST}:{PORT}")
    print(f"Database: {DB_PATH}")
    print("Health check: /api/health")
    ThreadingHTTPServer((HOST, PORT), JawdahHandler).serve_forever()


if __name__ == "__main__":
    main()
