// Promotion gate: has QA Wolf greenlit this exact commit on staging?
// Used by the "QA Wolf greenlight" job of promote-production.yml, before the
// production approval is even requested. Following QA Wolf's guidance:
//   1. find the newest staging deployment QA Wolf received for the commit
//   2. find the test run(s) its trigger started
//   3. ask QA Wolf's greenlight endpoint, live, about each run
//      (https://docs.qawolf.com/v0-ci-greenlight): green only when the run
//      completed with zero blocking bugs. Asking at promotion time means a
//      failure QA Wolf has since triaged as non-blocking no longer blocks.
// The answer must be about our own run: if a newer run replaced it (for
// example a deploy from the other repository), that run may be testing
// different code, so the commit is not greenlit and its tests must be re-run.
// QA Wolf's SDK (@qawolf/ci-sdk 3.3.0) is not used: it sends read calls as
// POST (the server answers 405) and mangles the replies. Needs Node 18+.

const {
  QAWOLF_API_KEY,
  SHA,
  WORKSPACE_ID,
  STAGING_ENVIRONMENT_ID,
  WAIT_MINUTES = "20",
} = process.env;
const TRPC = "https://app.qawolf.com/api/trpc/public.";
const GREENLIGHT = "https://app.qawolf.com/api/v0/ci-greenlight/";
const deadline = Date.now() + Number(WAIT_MINUTES) * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};
const rerunAdvice =
  "Re-run the staging tests for this commit (Actions > the staging workflow > Run workflow), then promote again.";

for (const [name, value] of Object.entries({ QAWOLF_API_KEY, SHA, WORKSPACE_ID, STAGING_ENVIRONMENT_ID })) {
  if (!value) fail(`${name} must be set`);
}

// GET with retries for network hiccups and server errors; other errors stop us
const getJson = async (url, what) => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${QAWOLF_API_KEY}` } });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { status: response.status, body };
      if (response.status < 500) return { status: response.status, body };
      console.log(`${what}: ${response.status}, retrying...`);
    } catch (error) {
      console.log(`${what}: ${error.message}, retrying...`);
    }
    await sleep(10 * 1000);
  }
  fail(`${what} kept failing`);
};

// A read call to QA Wolf's public API; the input goes in the URL as { json }
const read = async (procedure, input) => {
  const url = `${TRPC}${procedure}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const { status, body } = await getJson(url, procedure);
  if (status >= 400) fail(`QA Wolf API ${procedure}: ${status} ${body.error?.json?.message ?? ""}`);
  return body.result?.data?.json ?? body.result?.data;
};

const wait = async (why) => {
  if (Date.now() > deadline) {
    fail(`Gave up after ${WAIT_MINUTES} minutes: ${why}. Try promoting again later.`);
  }
  console.log(`${why}, waiting...`);
  await sleep(20 * 1000);
};

// 1. The newest staging deployment QA Wolf received for this commit
const findDeployment = async () => {
  let cursor;
  for (let page = 0; page < 5; page++) {
    const { deployments = [], nextCursor } = await read("deployment.find", {
      workspaceId: WORKSPACE_ID,
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    const match = deployments.find(
      (d) => d.commitSha === SHA && d.environmentId === STAGING_ENVIRONMENT_ID && d.status === "success"
    );
    if (match) return match;
    if (!nextCursor) return undefined;
    cursor = nextCursor;
  }
  return undefined;
};

let deployment;
while (!(deployment = await findDeployment())) {
  await wait(`QA Wolf has no staging deployment for ${SHA} yet`);
}
console.log(`Staging deployment ${deployment.id} (${deployment.deployedAt})`);

// 2. The run(s) the trigger started for that deployment
let runIds;
for (;;) {
  const { state, evaluations = [] } = await read("deployment.listTriggerEvaluations", {
    deploymentId: deployment.id,
  });
  const matched = evaluations.filter((e) => e.verdict?.outcome === "matched");
  if (state === "evaluated" && matched.length === 0) {
    fail(`QA Wolf did not test ${SHA}: no trigger matched its staging deployment.`);
  }
  const notRun = matched.find((e) => e.verdict.run && e.verdict.run.status !== "ran" && e.verdict.run.status !== "starting");
  if (notRun) fail(`QA Wolf did not run tests for ${SHA} (${notRun.verdict.run.status}). ${rerunAdvice}`);
  runIds = matched.map((e) => e.verdict.run?.runId).filter(Boolean);
  if (state === "evaluated" && runIds.length === matched.length) break;
  await wait("QA Wolf is still starting the test run");
}

// 3. Live greenlight for each run, which must be about that run itself
for (const runId of runIds) {
  for (;;) {
    const { status, body: g } = await getJson(GREENLIGHT + runId, "greenlight");
    if (status === 401 || status === 403) fail(`QA Wolf greenlight: ${status} (check QAWOLF_API_KEY)`);
    if (status >= 400) fail(`QA Wolf greenlight for run ${runId}: HTTP ${status}`);
    if (g.relevantRunId && g.relevantRunId !== runId) {
      fail(`QA Wolf run ${runId} for ${SHA} was replaced by a newer run (${g.relevantRunUrl}), which may test different code. ${rerunAdvice}`);
    }
    if (g.runStage === "canceled") fail(`QA Wolf run ${runId} was canceled. ${rerunAdvice}`);
    if (g.runStage === "completed") {
      if (g.greenlight !== true) {
        fail(`QA Wolf found ${g.blockingBugsCount ?? "?"} blocking bug(s) in run ${runId}: ${g.relevantRunWithBugsUrl ?? g.rootRunUrl}`);
      }
      console.log(`QA Wolf run ${runId}: greenlit (0 blocking bugs)  ${g.rootRunUrl ?? ""}`);
      break;
    }
    await wait(`QA Wolf run ${runId} is ${g.runStage}`);
  }
}

console.log(`QA Wolf greenlit ${SHA}. OK to promote.`);
