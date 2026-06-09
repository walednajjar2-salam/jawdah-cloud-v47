/* WhatsApp & SMS reminder helpers — Oman (+968) */
window.ReminderHub = {
  normalizePhone(raw) {
    let d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('968')) return d;
    if (d.length === 8) return '968' + d;
    if (d.startsWith('0') && d.length === 9) return '968' + d.slice(1);
    return d;
  },

  waUrl(phone, text) {
    const p = this.normalizePhone(phone);
    if (!p) return '';
    return `https://wa.me/${p}?text=${encodeURIComponent(text || '')}`;
  },

  smsUrl(phone, text) {
    const p = this.normalizePhone(phone);
    if (!p) return '';
    return `sms:+${p}?body=${encodeURIComponent(text || '')}`;
  },

  companyName() {
    return (window.CompanyProfile && CompanyProfile.settings.name_ar) || 'جودة الانطلاقة للخدمات';
  },

  rentDueMessage({ tenant, unit, amount, dueDate, invoiceNo }) {
    return `السلام عليكم ${tenant || ''}\n\nتذكير من ${this.companyName()}:\nفاتورة إيجار ${invoiceNo ? 'رقم ' + invoiceNo + ' ' : ''}للوحدة ${unit || ''}\nالمبلغ: ${amount || ''} OMR\nتاريخ الاستحقاق: ${dueDate || ''}\n\nيرجى التواصل لترتيب السداد.\nشكراً لتعاونكم.`;
  },

  contractExpiryMessage({ tenant, unit, endDate, daysLeft }) {
    const tail = daysLeft < 0 ? `انتهى العقد منذ ${Math.abs(daysLeft)} يوم` : `ينتهي خلال ${daysLeft} يوم`;
    return `السلام عليكم ${tenant || ''}\n\n${this.companyName()}:\nتذكير بخصوص عقد إيجار ${unit || ''}\n${tail} (${endDate || ''})\n\nيرجى التواصل لترتيب التجديد أو الإخلاء.\nشكراً.`;
  },

  markSent(id) {
    try {
      const key = 'jawdah_reminder_sent';
      const map = JSON.parse(localStorage.getItem(key) || '{}');
      map[id] = new Date().toISOString();
      localStorage.setItem(key, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  },

  wasSentToday(id) {
    try {
      const map = JSON.parse(localStorage.getItem('jawdah_reminder_sent') || '{}');
      const t = map[id];
      if (!t) return false;
      return t.slice(0, 10) === new Date().toISOString().slice(0, 10);
    } catch (e) { return false; }
  },
};
