/* Modern lifelike 3D icon images — NAJAR & AL SAMOOM TRADING */
window.NajjarIcons = (function () {
  const V = "at14";
  const base = "/auto-trading/assets/icons";

  const files = {
    dash: "dash.png",
    car: "car.png",
    "car-auto": "car-auto.png",
    suv: "suv.png",
    truck: "truck.png",
    buy: "buy.png",
    sale: "sale.png",
    exp: "exp.png",
    ledger: "ledger.png",
    world: "world.png",
    staff: "staff.png",
    company: "company.png",
    ok: "ok.png",
    chart: "chart.png",
    wa: "wa.png",
    "flag-us": "flag-us.png",
    "flag-om": "flag-om.png",
    "flag-ae": "flag-ae.png",
    "flag-jo": "flag-jo.png",
    "flag-ir": "flag-ir.png",
    "flag-in": "flag-in.png",
    "flag-sa": "flag-sa.png",
  };

  function url(name) {
    const file = files[name] || files.car;
    return `${base}/${file}?v=${V}`;
  }

  function get(name) {
    const flag = String(name || "").startsWith("flag-") ? " nt-flag-img" : "";
    return `<img class="nt-ico nt-ico-img${flag}" src="${url(name)}" alt="" draggable="false" loading="lazy">`;
  }

  function paint(root) {
    if (!root) return;
    root.querySelectorAll("[data-ico]").forEach((el) => {
      const name = el.getAttribute("data-ico");
      el.innerHTML = get(name);
    });
  }

  return { get, paint, url, files };
})();
