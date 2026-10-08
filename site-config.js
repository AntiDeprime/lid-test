// The facts about this deployment that cannot be known from the code. Leave a
// value empty until it is real: the Imprint and Privacy dialogs fall back to
// the project-maintainer wording, and `node scripts/validate-site.mjs
// --production` lists everything that is still empty before launch.
// See docs/operations.md, "Launching".
export const SITE = {
  // Where the app is served from, as a full URL ending in "/". For a GitHub
  // Pages project site include the repository path. Example shape only:
  // "https://learn.example.org/". Used for the canonical link, the social
  // preview image, robots.txt, and sitemap.xml (node scripts/generate-site.mjs).
  origin: "",
  // Who is responsible for the site under GDPR and the German Telemedia
  // rules. Shown in the Imprint and Privacy dialogs.
  operator: {
    name: "",
    address: "",
    email: ""
  },
  // How long the Google Analytics property keeps event data, in months, as
  // configured in that property. Leave null if unknown; the Privacy dialog
  // then says only that it is set in the property.
  analyticsRetentionMonths: null
};
