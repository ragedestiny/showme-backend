// Waits for QA Wolf's verdict ("greenlight") on a deployment we just reported,
// and passes or fails this CI step with it. The step's check is named
// "QA Wolf verdict", and "Promote to production" only promotes commits whose
// check passed. Uses QA Wolf's own SDK: deployment.waitForVerdict works out
// which test runs belong to the deployment and waits for them to finish.
import { makeQaWolfSdk } from "@qawolf/ci-sdk";

const { QAWOLF_API_KEY, DEPLOYMENT_ID } = process.env;
if (!QAWOLF_API_KEY || !DEPLOYMENT_ID) {
  console.error("::error::QAWOLF_API_KEY and DEPLOYMENT_ID must both be set");
  process.exit(1);
}

// Workaround for @qawolf/ci-sdk 3.3.0: it sends every API call as a POST,
// but QA Wolf's server only accepts GET for read calls (such as "which runs
// belong to this deployment?") and answers 405. When that happens, ask the
// same question again as a GET (the input goes in the URL instead of the
// body). Once the SDK is fixed, the POST succeeds and this never triggers.
const fetchWithGetFallback = async (url, init = {}) => {
  const response = await fetch(url, init);
  if (response.status !== 405 || init.method !== "POST") return response;
  const getUrl = new URL(url);
  getUrl.searchParams.set("input", init.body ?? "{}");
  const { body, ...rest } = init;
  const headers = { ...rest.headers };
  delete headers["Content-Type"];
  return fetch(getUrl, { ...rest, headers, method: "GET" });
};

const { deployment } = makeQaWolfSdk(
  { apiKey: QAWOLF_API_KEY },
  { fetch: fetchWithGetFallback }
);
const verdict = await deployment.waitForVerdict({
  deploymentId: DEPLOYMENT_ID,
  timeout: 30 * 60 * 1000, // below the job's 40 minute limit
});

for (const run of verdict.runs ?? []) {
  console.log(`QA Wolf run (${run.triggerName}): ${run.status}  ${run.runUrl}`);
}

switch (verdict.outcome) {
  case "passed":
    console.log("QA Wolf verdict: passed. This commit can be promoted.");
    process.exit(0);
  case "failed":
    console.error(`::error::QA Wolf verdict: failed, with ${verdict.blockingBugCount} blocking bug(s). See the run links above.`);
    break;
  case "not-tested":
    // We expect the staging trigger to test every deployment
    console.error(`::error::QA Wolf did not test this deployment (${verdict.reason}).`);
    break;
  case "superseded":
    console.error("::error::A newer staging deploy replaced this test run; that deploy carries the verdict.");
    break;
  default:
    console.error(`::error::No QA Wolf verdict: ${verdict.outcome}. ${verdict.message ?? ""}`);
}
process.exit(1);
