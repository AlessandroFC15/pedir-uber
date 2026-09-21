// Launches a dedicated Chrome instance with remote debugging enabled,
// using a profile separate from the user's everyday Chrome, so Playwright
// can attach to it via CDP without touching their normal browsing session.

const { spawn } = require("child_process");
const path = require("path");
const os = require("os");
const http = require("http");

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = 9222;
const PROFILE_DIR = path.join(os.homedir(), ".pedir-uber-v2-chrome-profile");

function spawnDedicatedChrome() {
  const child = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--no-default-browser-check",
    ],
    { stdio: "ignore", detached: true }
  );
  child.unref();
  return child;
}

function isDebugPortReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${DEBUG_PORT}/json/version`, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForDebugPort(timeoutMs = 15000, intervalMs = 300) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isDebugPortReady()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

// Launches Chrome if the debug port isn't already up, then waits until
// it's actually reachable before returning. Safe to call even if a
// dedicated Chrome from a previous run is still alive on that port.
async function launchDedicatedChrome() {
  if (await isDebugPortReady()) {
    return { alreadyRunning: true, debugPort: DEBUG_PORT, profileDir: PROFILE_DIR };
  }

  spawnDedicatedChrome();
  const ready = await waitForDebugPort();
  if (!ready) {
    throw new Error(
      `Dedicated Chrome did not open its debug port (${DEBUG_PORT}) within the timeout.`
    );
  }
  return { alreadyRunning: false, debugPort: DEBUG_PORT, profileDir: PROFILE_DIR };
}

module.exports = { launchDedicatedChrome, DEBUG_PORT, PROFILE_DIR };
