(function () {
  var deferredPrompt = null;
  var installButton = null;

  function createInstallButton() {
    if (installButton || window.matchMedia("(display-mode: standalone)").matches) return;
    installButton = document.createElement("button");
    installButton.type = "button";
    installButton.id = "lqInstallAppBtn";
    installButton.textContent = "تثبيت التطبيق";
    installButton.setAttribute("aria-label", "تثبيت تطبيق Launch Quality ERP");
    installButton.style.cssText = [
      "position:fixed",
      "left:18px",
      "bottom:18px",
      "z-index:250",
      "border:1px solid rgba(47,220,196,.55)",
      "background:linear-gradient(135deg,rgba(5,18,28,.94),rgba(10,42,52,.92))",
      "color:#e8fffb",
      "border-radius:999px",
      "padding:11px 16px",
      "font:800 13px Tajawal,Segoe UI,Arial,sans-serif",
      "box-shadow:0 16px 40px rgba(0,0,0,.34),0 0 22px rgba(47,220,196,.18)",
      "cursor:pointer"
    ].join(";");
    installButton.addEventListener("click", installApp);
    document.body.appendChild(installButton);
  }

  function hideInstallButton() {
    if (installButton) {
      installButton.remove();
      installButton = null;
    }
  }

  async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      hideInstallButton();
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    createInstallButton();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    hideInstallButton();
  });

  window.LQ_PWA = {
    canInstall: function () { return !!deferredPrompt; },
    showInstallButton: createInstallButton
  };
})();
