// Validation script for the very first piece of pedir-uber-v2: can we
// launch a dedicated Chrome instance and connect to it via Playwright's
// CDP interface? No Uber/WhatsApp/TypeSafe involved yet - just proving
// the browser plumbing works.

const { chromium } = require("playwright");
const { launchDedicatedChrome, DEBUG_PORT } = require("./launch-chrome");

async function main() {
  console.log("Launching dedicated Chrome (or reusing if already running)...");
  const { alreadyRunning } = await launchDedicatedChrome();
  console.log(alreadyRunning ? "Chrome was already running." : "Chrome launched and debug port is ready.");

  console.log(`Connecting via CDP on port ${DEBUG_PORT}...`);
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);

  const context = browser.contexts()[0];
  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://example.com");
  const title = await page.title();
  console.log(`Page title: "${title}"`);

  if (title !== "Example Domain") {
    throw new Error(`Unexpected title: "${title}"`);
  }

  console.log("CDP connection validated successfully.");
  await browser.close();
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
