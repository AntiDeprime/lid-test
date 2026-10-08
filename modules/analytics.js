// Google Analytics consent helpers. The tag only loads after consent, and
// consent can be withdrawn at any time.
export const ANALYTICS_ID = "G-6LN5H6T5LW";
export const ANALYTICS_CONSENT_KEY = "lidAnalyticsConsent";

// Google Analytics 4 sets `_ga` and `_ga_<measurement id without "G-">`.
export function getAnalyticsCookieNames(id = ANALYTICS_ID) {
  return ["_ga", `_ga_${id.replace(/^G-/, "")}`];
}

// Domains a cookie set by this page could carry, most specific first:
// "www.example.org" -> www.example.org, .www.example.org, example.org, .example.org.
export function getCookieDomains(hostname) {
  const labels = String(hostname || "").split(".").filter(Boolean);
  if (labels.length < 2 || labels.every((label) => /^\d+$/.test(label))) return labels.length ? [hostname] : [];

  const domains = [];
  for (let start = 0; start <= labels.length - 2; start += 1) {
    const domain = labels.slice(start).join(".");
    domains.push(domain, `.${domain}`);
  }
  return domains;
}

export function clearAnalyticsCookies({ doc = document, hostname = window.location.hostname, id = ANALYTICS_ID } = {}) {
  const expired = "Thu, 01 Jan 1970 00:00:00 GMT";
  getAnalyticsCookieNames(id).forEach((name) => {
    doc.cookie = `${name}=; expires=${expired}; path=/`;
    getCookieDomains(hostname).forEach((domain) => {
      doc.cookie = `${name}=; expires=${expired}; path=/; domain=${domain}`;
    });
  });
}

// Stops (or resumes) sending data from a page where the tag already loaded.
export function setCollectionEnabled(enabled, { win = window, id = ANALYTICS_ID } = {}) {
  win[`ga-disable-${id}`] = !enabled;
  if (typeof win.gtag === "function") {
    win.gtag("consent", "update", { analytics_storage: enabled ? "granted" : "denied" });
  }
}
