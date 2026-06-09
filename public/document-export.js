/* PDF export for invoices, contracts, and branded documents */
window.DocumentExport = {
  async waitForFrame(iframe, ms = 900) {
    await new Promise((resolve, reject) => {
      iframe.onload = resolve;
      iframe.onerror = reject;
    });
    await new Promise(r => setTimeout(r, ms));
    const doc = iframe.contentDocument;
    if (!doc) return;
    const imgs = [...doc.images];
    await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
      img.onload = img.onerror = res;
    })));
  },

  async downloadHtmlAsPdf(html, filename) {
    if (!window.html2pdf) throw new Error('PDF library not loaded');
    const iframe = document.createElement('iframe');
    iframe.className = 'pdf-render-frame';
    iframe.title = 'PDF render';
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
    try {
      await this.waitForFrame(iframe);
      const doc = iframe.contentDocument;
      const element = doc.querySelector('.qls-doc') || doc.body;
      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#fdfbf7' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(element).save();
    } finally {
      iframe.remove();
    }
  },
};

async function downloadHtmlAsPdf(html, filename) {
  try {
    toast('جاري تجهيز PDF...');
    await DocumentExport.downloadHtmlAsPdf(html, filename);
    toast('تم تنزيل PDF بنجاح');
  } catch (e) {
    toast(e.message || 'تعذر إنشاء PDF', true);
  }
}
