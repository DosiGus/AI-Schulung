/* ============================================================
   AI Builder Webinar — interactions, tracking, form handling
   ============================================================ */
(function () {
  "use strict";

  /* --- CONFIG: wire your form backend here ----------------
     Leave empty for demo mode (validates, then redirects to
     the thank-you page without sending data). Set to a POST
     endpoint (Formspree, Tally, your own API, Make/Zapier
     webhook) to actually store leads. Expects FormData/JSON. */
  var FORM_ENDPOINT = "";

  /* ---------- Tracking helper ---------- */
  function track(event, params) {
    params = params || {};
    // Google Tag Manager
    if (window.dataLayer) window.dataLayer.push(Object.assign({ event: event }, params));
    // GA4 gtag
    if (typeof window.gtag === "function") window.gtag("event", event, params);
    // Visible in console during development
    if (window.console && console.debug) console.debug("[track]", event, params);
  }
  window.__track = track;

  document.addEventListener("DOMContentLoaded", function () {
    track("page_view", { page: document.title });

    /* ---------- Footer year ---------- */
    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ---------- UTM / source capture ---------- */
    var params = new URLSearchParams(window.location.search);
    var source = params.get("source") || params.get("utm_source");
    if (source) {
      try { sessionStorage.setItem("lead_source", source); } catch (e) {}
    } else {
      try { source = sessionStorage.getItem("lead_source"); } catch (e) {}
    }
    var sourceField = document.getElementById("source");
    if (sourceField && source) sourceField.value = source;

    /* ---------- Sticky header shadow ---------- */
    var header = document.getElementById("header");
    if (header) {
      var onScrollHeader = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScrollHeader();
      window.addEventListener("scroll", onScrollHeader, { passive: true });
    }

    /* ---------- Reveal on scroll ---------- */
    var reveals = [].slice.call(document.querySelectorAll(".reveal"));
    var revealCheck = function () {
      var h = window.innerHeight || document.documentElement.clientHeight;
      for (var i = reveals.length - 1; i >= 0; i--) {
        if (reveals[i].getBoundingClientRect().top < h * 0.9) {
          reveals[i].classList.add("is-visible");
          reveals.splice(i, 1);
        }
      }
    };
    revealCheck();
    window.addEventListener("scroll", revealCheck, { passive: true });
    window.addEventListener("resize", revealCheck, { passive: true });
    window.addEventListener("load", revealCheck);

    /* ---------- Mobile sticky CTA ---------- */
    var sticky = document.getElementById("sticky-cta");
    var hero = document.querySelector(".hero");
    var anchor = document.getElementById("anmeldung");
    if (sticky && hero) {
      var toggleSticky = function () {
        var pastHero = window.scrollY > hero.offsetHeight * 0.7;
        // Hide once the form itself is on screen
        var formVisible = anchor && anchor.getBoundingClientRect().top < window.innerHeight;
        sticky.classList.toggle("is-visible", pastHero && !formVisible);
      };
      toggleSticky();
      window.addEventListener("scroll", toggleSticky, { passive: true });
    }

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll(".faq__item").forEach(function (item) {
      var btn = item.querySelector(".faq__q");
      var panel = item.querySelector(".faq__a");
      if (!btn || !panel) return;
      btn.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");
        // Close siblings for a clean single-open accordion
        document.querySelectorAll(".faq__item.is-open").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            other.querySelector(".faq__q").setAttribute("aria-expanded", "false");
            other.querySelector(".faq__a").style.maxHeight = null;
          }
        });
        item.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", String(!isOpen));
        panel.style.maxHeight = !isOpen ? panel.scrollHeight + "px" : null;
        if (!isOpen) track("faq_open", { question: btn.textContent.trim() });
      });
    });

    /* ---------- CTA click tracking ---------- */
    document.querySelectorAll("[data-cta]").forEach(function (el) {
      if (el.getAttribute("type") === "submit") return; // handled on submit
      el.addEventListener("click", function () {
        track("cta_click", { location: el.getAttribute("data-cta") });
      });
    });

    /* ---------- Scroll depth (50% / 90%) ---------- */
    var depthHits = {};
    var onScrollDepth = function () {
      var doc = document.documentElement;
      var scrolled = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      [0.5, 0.9].forEach(function (mark) {
        var key = "d" + mark;
        if (!depthHits[key] && scrolled >= mark) {
          depthHits[key] = true;
          track("scroll_depth", { percent: mark * 100 });
        }
      });
      if (depthHits["d0.9"]) window.removeEventListener("scroll", onScrollDepth);
    };
    window.addEventListener("scroll", onScrollDepth, { passive: true });

    /* ---------- Form ---------- */
    var form = document.getElementById("signup-form");
    if (!form) return;

    var started = false;
    form.addEventListener("input", function () {
      if (!started) { started = true; track("form_start"); }
    }, { once: false });

    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function setError(field, hasError) {
      var wrapper = field.closest(".field");
      if (wrapper) wrapper.classList.toggle("field--error", hasError);
    }

    function validate() {
      var ok = true;
      var vorname = form.vorname;
      var email = form.email;
      var status = form.status;
      var datenschutz = form.datenschutz;

      var vornameBad = !vorname.value.trim();
      setError(vorname, vornameBad); if (vornameBad) ok = false;

      var emailBad = !emailRe.test(email.value.trim());
      setError(email, emailBad); if (emailBad) ok = false;

      var statusBad = !status.value;
      setError(status, statusBad); if (statusBad) ok = false;

      var dsBad = !datenschutz.checked;
      setError(datenschutz, dsBad); if (dsBad) ok = false;

      return ok;
    }

    // Clear error as the user fixes a field
    ["vorname", "email", "status", "datenschutz"].forEach(function (name) {
      var el = form[name];
      if (el) el.addEventListener("change", function () { setError(el, false); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) {
        var firstErr = form.querySelector(".field--error input, .field--error select");
        if (firstErr) firstErr.focus();
        return;
      }

      var data = new FormData(form);
      var waGiven = !!(form.wa_optin && form.wa_optin.checked);

      track("form_submit", { source: data.get("source") || "", status: data.get("status") || "" });
      if (waGiven) track("whatsapp_optin");

      var go = function () {
        var url = "danke.html";
        if (waGiven) url += "?wa=1";
        var src = data.get("source");
        if (src) url += (waGiven ? "&" : "?") + "source=" + encodeURIComponent(src);
        window.location.href = url;
      };

      var btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Wird gesendet …"; }

      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: data
        }).then(go).catch(function () {
          // Don't trap the lead if the network call fails — still confirm.
          go();
        });
      } else {
        // Demo mode: no backend wired yet.
        setTimeout(go, 300);
      }
    });
  });
})();
