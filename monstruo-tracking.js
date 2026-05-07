// monstruo-tracking.js — Sprint 87.2 Bloque 4
// Privacy-first: cero tracking cross-site, cookie soberana de primera parte.
(function () {
  "use strict";
  var RUN_ID = window.__MONSTRUO_RUN_ID__ || "unknown";
  var INGEST = window.__MONSTRUO_INGEST_URL__ || "/v1/traffic/ingest";
  var COOKIE_NAME = "monstruo_sid";
  var SESSION_TTL_MIN = 30;

  function _uuid() {
    if (window.crypto && window.crypto.randomUUID) {
      try { return window.crypto.randomUUID(); } catch (e) {}
    }
    return "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  function _getSid() {
    var match = document.cookie.match(/(?:^|;\s*)monstruo_sid=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    var sid = _uuid();
    var expires = new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000).toUTCString();
    document.cookie = COOKIE_NAME + "=" + encodeURIComponent(sid) +
      "; path=/; expires=" + expires + "; SameSite=Lax";
    return sid;
  }

  function _device() {
    var ua = navigator.userAgent || "";
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) return "mobile";
    return "desktop";
  }

  function _ping(eventType, extra) {
    var payload = {
      run_id: RUN_ID,
      session_id: _getSid(),
      event_type: eventType,
      url: window.location.href,
      referrer: document.referrer || "",
      device: _device(),
      ts: new Date().toISOString(),
      extra: extra || {}
    };
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon(INGEST, blob);
      } else {
        fetch(INGEST, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () { /* swallow */ });
      }
    } catch (e) { /* privacy-first: nunca tirar errores al usuario */ }
  }

  // Pageview al cargar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { _ping("pageview"); });
  } else {
    _ping("pageview");
  }

  // Tiempo en página al salir
  var loadedAt = Date.now();
  window.addEventListener("beforeunload", function () {
    _ping("unload", { time_on_page_ms: Date.now() - loadedAt });
  });

  // CTA clicks
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains("btn")) {
      _ping("cta_click", { text: (t.textContent || "").trim().slice(0, 80) });
    }
  });
})();
