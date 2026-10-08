import { getStorageItem, setStorageItem } from "../modules/storage.js";
import { showModalDialog } from "../modules/dialog.js";

// Analytics consent, the Google Analytics loader, and the privacy and
// imprint dialogs.
export function createPrivacyControls() {
  const $ = (id) => document.getElementById(id);
  const consentSlot = $("consent-slot");
  const analyticsStatus = $("analytics-status");

  const ANALYTICS_ID = "G-6LN5H6T5LW";
  const ANALYTICS_CONSENT_KEY = "lidAnalyticsConsent";
  const LEGAL_NOTICE = {
    privacy: {
      title: "Privacy",
      paragraphs: [
        "This app stores study progress, weak questions, bookmarks, an unfinished exam simulation, and analytics consent locally in this browser.",
        "Google Analytics loads only after explicit consent. The tag is configured without advertising storage, Google Signals, or ad personalization signals.",
        "No account is required, and this static app does not send your answers or saved progress to an app server."
      ]
    },
    imprint: {
      title: "Imprint",
      paragraphs: [
        "LiD Test Prep is maintained as an educational open-source practice app for the Leben in Deutschland / Einbürgerungstest catalogue.",
        "Responsible project maintainer: AntiDeprime. Contact and issue reporting: https://github.com/AntiDeprime/lid-test/issues",
        "This app is not an official BAMF or government service."
      ]
    }
  };

  function setupAnalyticsConsent() {
    const savedConsent = getStorageItem(ANALYTICS_CONSENT_KEY);
    if (savedConsent === "granted") {
      loadAnalytics();
      return;
    }

    if (savedConsent === "denied") {
      analyticsStatus.textContent = "Analytics off";
      return;
    }

    const banner = document.createElement("section");
    const copy = document.createElement("div");
    const badge = document.createElement("span");
    const text = document.createElement("p");
    const allow = document.createElement("button");
    const decline = document.createElement("button");
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
    // Removing the banner would drop focus to the page body, so hand it to the
    // next control in reading order.
    const closeBanner = () => {
      banner.remove();
      document.querySelector('.start-tab[tabindex="0"]')?.focus();
    };
    allow.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "granted");
      closeBanner();
      loadAnalytics();
    });
    decline.addEventListener("click", () => {
      setStorageItem(ANALYTICS_CONSENT_KEY, "denied");
      analyticsStatus.textContent = "Analytics off";
      closeBanner();
    });
    copy.append(badge, text);
    banner.append(copy, allow, decline);
    (consentSlot || document.body).append(banner);
  }

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
    analyticsStatus.textContent = "Analytics on";
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
        content.paragraphs.forEach((paragraph) => {
          const copy = document.createElement("p");
          copy.textContent = paragraph;
          modal.append(copy);
        });
      }
    });
  }

  document.querySelectorAll("[data-legal-panel]").forEach((button) => {
    button.addEventListener("click", () => showLegalPanel(button.dataset.legalPanel, button));
  });
  setupAnalyticsConsent();
}
