import { getStorageItem, setStorageItem } from "../modules/storage.js";
import { showModalDialog } from "../modules/dialog.js";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_ID,
  clearAnalyticsCookies,
  setCollectionEnabled
} from "../modules/analytics.js";
import { buildLegalNotice } from "../modules/legal.js";
import { SITE } from "../site-config.js";

// Analytics consent (given, declined, or withdrawn later), the Google
// Analytics loader, and the privacy and imprint dialogs.
export function createPrivacyControls() {
  const $ = (id) => document.getElementById(id);
  const consentSlot = $("consent-slot");
  const analyticsStatus = $("analytics-status");
  const analyticsToggle = $("analytics-toggle");
  const LEGAL_NOTICE = buildLegalNotice(SITE);
  let banner = null;

  function renderAnalyticsState(granted) {
    analyticsStatus.textContent = granted ? "Analytics on" : "Analytics off";
    analyticsToggle.textContent = granted ? "Turn off analytics" : "Allow analytics";
  }

  function grantAnalytics() {
    setStorageItem(ANALYTICS_CONSENT_KEY, "granted");
    loadAnalytics();
    setCollectionEnabled(true);
    renderAnalyticsState(true);
  }

  // Withdrawal stops sending data from a page where the tag already loaded,
  // removes the analytics cookies, and keeps the tag from loading next time.
  function withdrawAnalytics() {
    setStorageItem(ANALYTICS_CONSENT_KEY, "denied");
    setCollectionEnabled(false);
    clearAnalyticsCookies();
    renderAnalyticsState(false);
  }

  // Removing the banner would drop focus to the page body, so hand it to the
  // next control in reading order.
  function closeBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
    document.querySelector('.start-tab[tabindex="0"]')?.focus();
  }

  function setupAnalyticsConsent() {
    const savedConsent = getStorageItem(ANALYTICS_CONSENT_KEY);
    renderAnalyticsState(savedConsent === "granted");
    if (savedConsent === "granted") {
      loadAnalytics();
    }
    if (savedConsent === "granted" || savedConsent === "denied") return;

    const copy = document.createElement("div");
    const badge = document.createElement("span");
    const text = document.createElement("p");
    const allow = document.createElement("button");
    const decline = document.createElement("button");
    banner = document.createElement("section");
    banner.className = "consent-banner";
    banner.setAttribute("aria-label", "Analytics privacy choice");
    copy.className = "consent-copy";
    badge.className = "consent-badge";
    badge.textContent = "Privacy first";
    text.textContent = "Help improve this free study app by allowing privacy-conscious Google Analytics. Analytics stays off unless you consent.";
    allow.className = "primary-action";
    allow.type = "button";
    allow.textContent = "Allow analytics";
    decline.className = "secondary-action";
    decline.type = "button";
    decline.textContent = "Keep off";
    allow.addEventListener("click", () => {
      grantAnalytics();
      closeBanner();
    });
    decline.addEventListener("click", () => {
      withdrawAnalytics();
      closeBanner();
    });
    copy.append(badge, text);
    banner.append(copy, allow, decline);
    (consentSlot || document.body).append(banner);
  }

  analyticsToggle.addEventListener("click", () => {
    const wasGranted = getStorageItem(ANALYTICS_CONSENT_KEY) === "granted";
    if (wasGranted) {
      withdrawAnalytics();
    } else {
      grantAnalytics();
    }
    // A choice made here settles the banner too.
    if (banner) {
      banner.remove();
      banner = null;
    }
  });

  function loadAnalytics() {
    if (document.querySelector(`script[src*="${ANALYTICS_ID}"]`)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("consent", "default", {
      ad_storage: "denied",
      analytics_storage: "granted",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", ANALYTICS_ID, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
    document.head.append(script);
  }

  function showLegalPanel(panel, trigger) {
    const content = LEGAL_NOTICE[panel] || LEGAL_NOTICE.privacy;
    const titleId = `legal-title-${panel}`;

    showModalDialog({
      className: "legal-modal",
      title: content.title,
      labelledBy: titleId,
      trigger,
      renderContent(modal) {
        content.sections.forEach((section) => {
          const heading = document.createElement("h3");
          heading.textContent = section.heading;
          modal.append(heading);
          section.paragraphs.forEach((paragraph) => {
            const copy = document.createElement("p");
            copy.textContent = paragraph;
            modal.append(copy);
          });
        });
      }
    });
  }

  document.querySelectorAll("[data-legal-panel]").forEach((button) => {
    button.addEventListener("click", () => showLegalPanel(button.dataset.legalPanel, button));
  });
  setupAnalyticsConsent();
}
