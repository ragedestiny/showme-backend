// Netlify runs this after building a deploy preview (see netlify.toml).
// It points the preview's /api forwarding rule at the STAGING backend, so
// trying out a preview never reads or changes production data.
// Production builds never run this file, so production's rule is untouched.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "build/_redirects";
const PRODUCTION_API = "https://us-central1-showme-backend-789.cloudfunctions.net/apiv2";
const STAGING_API = "https://us-central1-showme-staging.cloudfunctions.net/apiv2";

const rules = readFileSync(FILE, "utf8");

// Stop the build rather than publish a preview that quietly talks to
// production (e.g. if the rule in public/_redirects was edited)
if (!rules.includes(PRODUCTION_API)) {
  console.error(`${FILE} has no rule for ${PRODUCTION_API}; can't switch it to staging`);
  process.exit(1);
}

writeFileSync(FILE, rules.replaceAll(PRODUCTION_API, STAGING_API));
console.log(`Deploy preview: /api now goes to ${STAGING_API}`);
