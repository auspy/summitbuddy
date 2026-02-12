import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

async function scrapeSessions() {
  console.log("Starting sessions scraper with network interception...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track ALL network responses for API discovery
  const apiResponses: { url: string; status: number; contentType: string; dataPreview?: string }[] = [];
  const jsonResponses: { url: string; data: unknown }[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()["content-type"] || "";

    // Log all non-asset requests
    if (
      !url.match(/\.(png|jpg|jpeg|gif|svg|ico|css|woff|woff2|ttf|eot|webp)(\?|$)/i) &&
      !url.includes("google") &&
      !url.includes("analytics") &&
      !url.includes("gtag")
    ) {
      apiResponses.push({ url, status, contentType });
    }

    // Capture JSON responses
    if (contentType.includes("json") || contentType.includes("javascript")) {
      try {
        const text = await response.text();
        if (text.length > 100 && (text.includes("session") || text.includes("Session") || text.includes("event") || text.includes("speaker"))) {
          try {
            const data = JSON.parse(text);
            jsonResponses.push({ url, data });
            console.log(`[JSON API] ${url} (${text.length} chars)`);
          } catch {
            // Not JSON, might be JS
            if (text.includes("session") || text.includes("Session")) {
              console.log(`[JS with session data] ${url} (${text.length} chars)`);
              fs.writeFileSync(
                path.join(DATA_DIR, `sessions-js-${jsonResponses.length}.txt`),
                text.substring(0, 50000)
              );
            }
          }
        }
      } catch {}
    }

    // Also capture RSC (React Server Components) payloads
    if (url.includes("_rsc") || url.includes("__next") || contentType.includes("x-component")) {
      try {
        const text = await response.text();
        if (text.length > 500) {
          console.log(`[RSC Payload] ${url} (${text.length} chars)`);
          fs.writeFileSync(
            path.join(DATA_DIR, `sessions-rsc-${apiResponses.length}.txt`),
            text.substring(0, 100000)
          );
        }
      } catch {}
    }
  });

  // Navigate to sessions page
  console.log("\n--- Navigating to /sessions ---");
  await page.goto("https://impact.indiaai.gov.in/sessions", {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  // Wait for content to potentially load
  await page.waitForTimeout(5000);

  // Check what the page shows
  const pageState = await page.evaluate(() => {
    const body = document.body.innerText;
    const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
    const sessionElements = document.querySelectorAll('[class*="session"], [class*="card"], [class*="event-card"]');

    return {
      bodyTextLength: body.length,
      bodyPreview: body.substring(0, 2000),
      loadingCount: loadingElements.length,
      sessionCount: sessionElements.length,
      title: document.title,
      hasLoadingText: body.includes("Loading"),
    };
  });

  console.log(`\nPage state: title="${pageState.title}", body=${pageState.bodyTextLength} chars`);
  console.log(`Loading elements: ${pageState.loadingCount}, Session elements: ${pageState.sessionCount}`);
  console.log(`Has loading text: ${pageState.hasLoadingText}`);
  console.log(`Body preview:\n${pageState.bodyPreview.substring(0, 500)}`);

  // Try to extract session data from the DOM
  const domSessions = await page.evaluate(() => {
    // Look for Next.js data
    const win = window as Record<string, unknown>;
    if (win.__NEXT_DATA__) {
      return { source: "next_data", data: win.__NEXT_DATA__ };
    }

    // Look for embedded JSON in script tags
    const scripts = Array.from(document.querySelectorAll('script'));
    const dataScripts: string[] = [];
    for (const script of scripts) {
      const text = script.textContent || '';
      if (text.includes('session') && text.length > 200) {
        dataScripts.push(text.substring(0, 10000));
      }
    }
    if (dataScripts.length > 0) {
      return { source: "scripts", data: dataScripts };
    }

    // Try to scrape rendered cards
    const cards = document.querySelectorAll('a[href*="session"], div[class*="card"], div[class*="session"]');
    const sessions: Record<string, string | null>[] = [];
    cards.forEach((card) => {
      const title = card.querySelector('h2, h3, h4, [class*="title"]')?.textContent?.trim();
      if (title) {
        sessions.push({
          title,
          description: card.querySelector('p, [class*="desc"]')?.textContent?.trim() || null,
          link: card.closest('a')?.href || card.querySelector('a')?.href || null,
          text: card.textContent?.trim()?.substring(0, 300) || null,
        });
      }
    });
    if (sessions.length > 0) {
      return { source: "dom_cards", data: sessions };
    }

    // Look for links to individual session pages
    const links = Array.from(document.querySelectorAll('a[href*="/sessions/"]'));
    const sessionLinks = links.map(l => ({
      href: (l as HTMLAnchorElement).href,
      text: l.textContent?.trim()?.substring(0, 200),
    }));
    if (sessionLinks.length > 0) {
      return { source: "links", data: sessionLinks };
    }

    return { source: "none", bodyPreview: document.body.innerText.substring(0, 5000) };
  });

  console.log(`\nDOM extraction source: ${domSessions.source}`);

  // Save all collected data
  fs.writeFileSync(
    path.join(DATA_DIR, "sessions-network.json"),
    JSON.stringify(apiResponses, null, 2)
  );
  console.log(`\nSaved ${apiResponses.length} network requests to sessions-network.json`);

  if (jsonResponses.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "sessions-api-responses.json"),
      JSON.stringify(jsonResponses, null, 2)
    );
    console.log(`Saved ${jsonResponses.length} JSON API responses`);
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "sessions-dom.json"),
    JSON.stringify(domSessions, null, 2)
  );

  // Save full page HTML for analysis
  const html = await page.content();
  fs.writeFileSync(path.join(DATA_DIR, "sessions-page.html"), html);
  console.log(`Saved page HTML (${html.length} chars)`);

  // Now try session type filters if they exist
  console.log("\n--- Checking for session type filters ---");
  const filters = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [class*="filter"], [class*="tab"]'));
    return buttons.map(b => ({
      text: b.textContent?.trim()?.substring(0, 100),
      tag: b.tagName,
      classes: b.className?.substring(0, 200),
    })).filter(b => b.text && b.text.length > 0 && b.text.length < 100);
  });
  console.log(`Found ${filters.length} potential filter buttons:`, filters.slice(0, 10));

  // Also try the research symposium sessions URL
  console.log("\n--- Trying /sessions?type=RESEARCH_SYMPOSIUM_SESSION ---");
  await page.goto("https://impact.indiaai.gov.in/sessions?type=RESEARCH_SYMPOSIUM_SESSION", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  const researchState = await page.evaluate(() => ({
    bodyPreview: document.body.innerText.substring(0, 2000),
    title: document.title,
  }));
  console.log(`Research sessions page: ${researchState.bodyPreview.substring(0, 500)}`);

  await browser.close();
  console.log("\n--- Sessions scraper complete ---");
}

scrapeSessions().catch(console.error);
