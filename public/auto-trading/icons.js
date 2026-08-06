/* Gold crystal icon set — NAJJAR & AL SAMOOM TRADING */
window.NajjarIcons = (function () {
  const svg = (body) =>
    `<svg class="nt-ico" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${body}</svg>`;

  const icons = {
    dash: svg(`<rect x="6" y="6" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="26" y="6" width="16" height="10" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="26" y="20" width="16" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><rect x="6" y="26" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/>`),
    car: svg(`<path fill="currentColor" d="M5 31c3 0 8 0 11 0 1-7 6-11 13-11s12 4 13 11h8c3 0 5-1 5.5-3.6.5-2.6-1-4.6-3.6-6.2-4.2-2.5-8.4-6.8-12.4-9.8C34.5 8 28 6 21.5 6.3 15 6.6 9.8 9.4 6.8 13.8 4.6 17 2.4 19.4 0 20.8V26c0 2.2 2 5 5 5z"/><circle cx="16" cy="32" r="5.2" fill="#0a0a0a" stroke="currentColor" stroke-width="2.2"/><circle cx="35" cy="32" r="5.2" fill="#0a0a0a" stroke="currentColor" stroke-width="2.2"/><path fill="#0a0a0a" d="M15 17c4.5-4 11-6.2 17.5-5.6 4.2.4 8.2 2.6 10.5 5.6-4.2 1-8.8 2-14 2-5.4 0-10-.6-14-2z"/>`),
    buy: svg(`<rect x="10" y="6" width="28" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M16 16h16M16 24h16M16 32h10" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`),
    sale: svg(`<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M24 12v24M19 17c2-2.2 8-2.2 10 1.2 2 3.2-1 5.2-5 6.2s-7 2.8-5 6c2 3 8 3 10 1" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`),
    exp: svg(`<path d="M8 28h32v10a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V28z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M24 8v22M16 18l8-10 8 10" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>`),
    ledger: svg(`<rect x="9" y="6" width="30" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M17 6v36M23 16h12M23 24h12M23 32h8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>`),
    world: svg(`<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="2.6"/><ellipse cx="24" cy="24" rx="7" ry="16" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 24h32M10 16h28M10 32h28" fill="none" stroke="currentColor" stroke-width="1.9"/>`),
    staff: svg(`<circle cx="18" cy="16" r="6" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="32" cy="16" r="5" fill="none" stroke="currentColor" stroke-width="2.3"/><path d="M6 36c1-7 6-11 12-11s11 4 12 11M28 25c4-1 9 1 11 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`),
    company: svg(`<path d="M8 40V14l12-6 8 4h12v28z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 40V22h8v18M30 20h4M30 26h4M30 32h4" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>`),
    ok: svg(`<circle cx="24" cy="24" r="16" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M14 24l7 7 13-14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`),
    chart: svg(`<path d="M8 40h32M12 34V22M22 34V14M32 34V18M40 34V10" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round"/>`),
    wa: svg(`<path fill="currentColor" d="M24 6C14.1 6 6 14 6 24c0 3.2.8 6.2 2.4 8.8L6 42l9.5-2.5A18 18 0 0 0 24 42c9.9 0 18-8.1 18-18S33.9 6 24 6zm8.2 25.4c-.5-.2-2.9-1.4-3.3-1.6-.5-.2-.8-.2-1.1.2-.3.5-1.2 1.5-1.5 1.8-.3.3-.5.3-1 .1-2.6-1.2-4.3-2.3-6-5.1-.5-.8.4-.7 1.2-2.3.1-.3 0-.6-.1-.8-.2-.2-1-2.5-1.4-3.4-.4-.9-.8-.8-1.1-.8h-.9c-.3 0-.8.1-1.2.6s-1.5 1.4-1.5 3.5 1.5 4 1.7 4.3c.2.3 2.9 4.4 7.1 6 2.7 1 3.7.8 4.4.7.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.9-.1-.1-.4-.3-.9-.5z"/>`),
  };

  function get(name) {
    return icons[name] || icons.car;
  }

  function paint(root) {
    if (!root) return;
    root.querySelectorAll("[data-ico]").forEach((el) => {
      el.innerHTML = get(el.getAttribute("data-ico"));
    });
  }

  return { get, paint, icons };
})();
