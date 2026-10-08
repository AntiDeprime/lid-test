import { ANALYTICS_CONSENT_KEY } from "./analytics.js";
import { LANGUAGE_KEY } from "./preferences.js";
import { EXAM_SESSION_KEY } from "./exam-session.js";
import { STORAGE_KEY, UNREADABLE_PROGRESS_KEY } from "./storage.js";

const FALLBACK_OPERATOR = "Responsible project maintainer: AntiDeprime. Contact and issue reporting: https://github.com/AntiDeprime/lid-test/issues";

export function hasOperatorDetails(operator = {}) {
  return Boolean(operator.name?.trim() && operator.address?.trim() && operator.email?.trim());
}

function describeOperator(operator) {
  return hasOperatorDetails(operator)
    ? `${operator.name.trim()}, ${operator.address.trim().replace(/\s*\n\s*/g, ", ")}. Email: ${operator.email.trim()}`
    : null;
}

// The Privacy and Imprint dialogs, as sections of plain paragraphs. They
// describe what the app really does (the storage keys come from the modules
// that write them) and fill in who is responsible from site-config.js.
export function buildLegalNotice(site = {}) {
  const operator = describeOperator(site.operator);
  const retention = Number.isFinite(site.analyticsRetentionMonths) && site.analyticsRetentionMonths > 0
    ? `Google Analytics keeps this data for ${site.analyticsRetentionMonths} months, as set in the operator's Google Analytics property.`
    : "How long Google Analytics keeps this data is set in the operator's Google Analytics property.";
  const contact = operator ? `Contact: ${site.operator.email.trim()}.` : "Use the contact in the Imprint.";

  return {
    privacy: {
      title: "Privacy",
      sections: [
        {
          heading: "Who is responsible",
          paragraphs: [operator
            ? `${operator}.`
            : "The project maintainer named in the Imprint is responsible for this app."]
        },
        {
          heading: "What stays in your browser",
          paragraphs: [
            `The app saves its data only in this browser's local storage: your study progress, weak questions, bookmarks and exam history (${STORAGE_KEY}, and ${UNREADABLE_PROGRESS_KEY} if saved progress could not be read), an unfinished exam simulation (${EXAM_SESSION_KEY}), your translation language (${LANGUAGE_KEY}), and your analytics choice (${ANALYTICS_CONSENT_KEY}).`,
            "None of it is sent to a server. There are no accounts, and your answers and progress leave your device only if you export a backup yourself. Reset progress on the Progress tab deletes your study data; clearing this site's data in your browser deletes everything."
          ]
        },
        {
          heading: "Analytics, only if you allow it",
          paragraphs: [
            "Analytics is off until you choose Allow analytics. If you allow it, the app loads Google Analytics 4 from Google to count visits and where they come from. Google receives the technical data your browser sends with every request, including your IP address, together with the page address, the referring site, and browser and device details, and sets analytics cookies on this site.",
            "The tag is configured without advertising storage, Google Signals, or ad personalization. " + retention
          ]
        },
        {
          heading: "Legal basis and your choices",
          paragraphs: [
            "Analytics runs only on your consent (Art. 6(1)(a) GDPR and § 25(1) TDDDG). The data the app needs to work, such as your progress and language, is stored because you use the app and involves no tracking (§ 25(2) no. 2 TDDDG).",
            "You can withdraw consent at any time with Turn off analytics at the bottom of the start page. That stops sending data and removes the analytics cookies this site can reach; it does not affect what was collected before.",
            `You have the right to access, correction, deletion, restriction, portability and objection (Art. 15 to 21 GDPR) and to complain to a data protection authority. ${contact}`
          ]
        }
      ]
    },
    imprint: {
      title: "Imprint",
      sections: [
        {
          heading: "Operator",
          paragraphs: [operator ? `${operator}.` : FALLBACK_OPERATOR]
        },
        {
          heading: "About this app",
          paragraphs: [
            "LiD Test Prep is a free practice app for the Leben in Deutschland / Einbürgerungstest catalogue. It is not an official BAMF or government service.",
            "The questions and images come from the BAMF catalogue dated 7 May 2025. Explanations and translations were written for this app and are unofficial study aids; German is the only language of the real test."
          ]
        }
      ]
    }
  };
}
