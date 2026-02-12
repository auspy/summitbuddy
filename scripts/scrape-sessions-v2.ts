import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

async function scrapeSessions() {
  console.log("Starting sessions scraper v2 (with realistic browser config)...");

  const browser = await chromium.launch({
    headless: false, // Use headed mode to avoid detection
    args: [
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "Asia/Kolkata",
  });

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  // Track API calls
  const apiCalls: { url: string; data: unknown }[] = [];
  const allRequests: string[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    allRequests.push(`${response.status()} ${url}`);

    const ct = response.headers()["content-type"] || "";
    if (ct.includes("json")) {
      try {
        const data = await response.json();
        apiCalls.push({ url, data });
        console.log(`[API] ${response.status()} ${url}`);
      } catch {}
    }

    // Capture RSC payloads
    if (ct.includes("text/x-component") || url.includes("_rsc")) {
      try {
        const text = await response.text();
        if (text.length > 500) {
          const idx = apiCalls.length;
          fs.writeFileSync(path.join(DATA_DIR, `sessions-v2-rsc-${idx}.txt`), text);
          console.log(`[RSC] ${url} (${text.length} chars)`);
        }
      } catch {}
    }
  });

  console.log("Navigating to sessions page...");
  try {
    const response = await page.goto("https://impact.indiaai.gov.in/sessions", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    console.log(`Response status: ${response?.status()}`);

    if (response?.status() === 403) {
      console.log("Got 403 - trying with different approach...");

      // Try going to homepage first then navigating
      await page.goto("https://impact.indiaai.gov.in/", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
      console.log("Homepage loaded, now navigating to sessions...");

      // Click on sessions link if it exists
      const sessionsLink = await page.$('a[href*="/sessions"]');
      if (sessionsLink) {
        await sessionsLink.click();
        await page.waitForTimeout(5000);
        console.log("Navigated via link click");
      } else {
        // Direct navigate
        await page.goto("https://impact.indiaai.gov.in/sessions", {
          waitUntil: "networkidle",
          timeout: 30000,
        });
      }
    }

    await page.waitForTimeout(5000);

    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
    console.log(`Page content preview:\n${pageText.substring(0, 500)}`);

    // Extract whatever we can from the page
    const pageData = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        html: document.body.innerHTML.substring(0, 50000),
        title: document.title,
        url: window.location.href,
      };
    });

    fs.writeFileSync(
      path.join(DATA_DIR, "sessions-v2-page.json"),
      JSON.stringify({ text: pageData.text.substring(0, 20000), title: pageData.title, url: pageData.url }, null, 2)
    );

    // Save HTML
    const html = await page.content();
    fs.writeFileSync(path.join(DATA_DIR, "sessions-v2-page.html"), html);
    console.log(`Saved page HTML (${html.length} chars)`);

  } catch (e) {
    console.error("Navigation error:", e);
  }

  // Save all network requests
  fs.writeFileSync(
    path.join(DATA_DIR, "sessions-v2-network.json"),
    JSON.stringify(allRequests, null, 2)
  );

  if (apiCalls.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "sessions-v2-api.json"),
      JSON.stringify(apiCalls, null, 2)
    );
  }

  await browser.close();
  console.log("\nSessions v2 scraper complete");
}

scrapeSessions().catch(console.error);
