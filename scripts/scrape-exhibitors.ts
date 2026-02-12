import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const OUTPUT_FILE = path.join(DATA_DIR, "exhibitors.json");

async function scrapeExhibitors() {
  console.log("Starting exhibitor scraper...");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Track API calls
  const apiCalls: { url: string; data: unknown }[] = [];
  page.on("response", async (response) => {
    const url = response.url();
    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("json")) {
      try {
        const data = await response.json();
        apiCalls.push({ url, data });
        console.log(`[API] ${url}`);
      } catch {}
    }
  });

  console.log("Navigating to exhibitors page...");
  await page.goto("https://www.impactexpo.indiaai.gov.in/list-of-exhibitors", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Wait for content to load
  await page.waitForTimeout(3000);

  // Try to extract the hardcoded JS array directly
  console.log("Attempting to extract exhibitor data from JS context...");

  // Try multiple approaches to find the data
  const exhibitorData = await page.evaluate(() => {
    // Approach 1: Look for a global variable
    const win = window as Record<string, unknown>;
    if (win.exhibitors) return win.exhibitors;
    if (win.__NEXT_DATA__) return (win.__NEXT_DATA__ as Record<string, unknown>);

    // Approach 2: Look for Livewire component data
    const livewireEls = document.querySelectorAll("[wire\\:snapshot]");
    const livewireData: unknown[] = [];
    livewireEls.forEach((el) => {
      const snapshot = el.getAttribute("wire:snapshot");
      if (snapshot) {
        try {
          livewireData.push(JSON.parse(snapshot));
        } catch {}
      }
    });
    if (livewireData.length > 0) return { livewire: livewireData };

    // Approach 3: Extract from script tags
    const scripts = document.querySelectorAll("script");
    const scriptData: string[] = [];
    scripts.forEach((script) => {
      const text = script.textContent || "";
      if (
        text.includes("exhibitor") ||
        text.includes("Exhibitor") ||
        text.includes("company")
      ) {
        scriptData.push(text.substring(0, 5000));
      }
    });
    if (scriptData.length > 0) return { scripts: scriptData };

    // Approach 4: Scrape from DOM
    const cards = document.querySelectorAll(
      ".exhibitor-card, [class*=exhibitor], .card, tr, li"
    );
    const domData: Record<string, string | null>[] = [];
    cards.forEach((card) => {
      const text = card.textContent?.trim();
      if (text && text.length > 5 && text.length < 500) {
        domData.push({
          text,
          html: card.innerHTML?.substring(0, 1000) || null,
          tag: card.tagName,
          classes: card.className || null,
        });
      }
    });
    if (domData.length > 10) return { dom: domData.slice(0, 50) };

    return { html: document.body.innerHTML.substring(0, 10000) };
  });

  console.log("Extracted data type:", typeof exhibitorData);
  console.log(
    "Data keys:",
    exhibitorData && typeof exhibitorData === "object"
      ? Object.keys(exhibitorData)
      : "N/A"
  );

  // Save raw extraction for analysis
  const rawFile = path.join(DATA_DIR, "exhibitors-raw.json");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(rawFile, JSON.stringify(exhibitorData, null, 2));
  console.log(`Raw data saved to ${rawFile}`);

  // Also save any API calls captured
  if (apiCalls.length > 0) {
    const apiFile = path.join(DATA_DIR, "exhibitors-api-calls.json");
    fs.writeFileSync(apiFile, JSON.stringify(apiCalls, null, 2));
    console.log(`API calls saved to ${apiFile} (${apiCalls.length} calls)`);
  }

  // Now try to get the full page source and extract JS arrays
  console.log("Extracting from page source...");
  const pageContent = await page.content();
  const sourceFile = path.join(DATA_DIR, "exhibitors-page-source.html");
  fs.writeFileSync(sourceFile, pageContent);
  console.log(`Page source saved to ${sourceFile} (${pageContent.length} chars)`);

  // Search for exhibitor array patterns in page source
  const patterns = [
    /const\s+exhibitors\s*=\s*\[([\s\S]*?)\];/,
    /let\s+exhibitors\s*=\s*\[([\s\S]*?)\];/,
    /var\s+exhibitors\s*=\s*\[([\s\S]*?)\];/,
    /"exhibitors"\s*:\s*\[([\s\S]*?)\]/,
    /exhibitorList\s*=\s*\[([\s\S]*?)\];/,
  ];

  for (const pattern of patterns) {
    const match = pageContent.match(pattern);
    if (match) {
      console.log(`Found exhibitor data with pattern: ${pattern.source.substring(0, 50)}`);
      console.log(`Match length: ${match[0].length} chars`);
      const arrayFile = path.join(DATA_DIR, "exhibitors-array-match.txt");
      fs.writeFileSync(arrayFile, match[0].substring(0, 50000));
      break;
    }
  }

  // Try to get the actual table/list data from the page
  console.log("Extracting exhibitor list from rendered DOM...");
  const domExhibitors = await page.evaluate(() => {
    const results: Record<string, string | null>[] = [];

    // Look for table rows
    const rows = document.querySelectorAll("table tbody tr");
    if (rows.length > 0) {
      rows.forEach((row) => {
        const cells = row.querySelectorAll("td");
        results.push({
          col1: cells[0]?.textContent?.trim() || null,
          col2: cells[1]?.textContent?.trim() || null,
          col3: cells[2]?.textContent?.trim() || null,
          col4: cells[3]?.textContent?.trim() || null,
          col5: cells[4]?.textContent?.trim() || null,
        });
      });
      return { source: "table", count: results.length, data: results };
    }

    // Look for grid/card items
    const items = document.querySelectorAll(
      '[class*="grid"] > div, [class*="list"] > div, [class*="exhibitor"]'
    );
    if (items.length > 0) {
      items.forEach((item) => {
        const img = item.querySelector("img");
        results.push({
          text: item.textContent?.trim()?.substring(0, 200) || null,
          imgSrc: img?.getAttribute("src") || null,
          imgAlt: img?.getAttribute("alt") || null,
          classes: item.className || null,
        });
      });
      return { source: "grid", count: results.length, data: results.slice(0, 50) };
    }

    // Try Alpine.js x-data
    const alpineEls = document.querySelectorAll("[x-data]");
    const alpineData: string[] = [];
    alpineEls.forEach((el) => {
      const xdata = el.getAttribute("x-data");
      if (xdata && xdata.length > 50) {
        alpineData.push(xdata.substring(0, 5000));
      }
    });
    if (alpineData.length > 0) {
      return { source: "alpine", count: alpineData.length, data: alpineData };
    }

    return { source: "none", count: 0 };
  });

  console.log(
    `DOM extraction: source=${domExhibitors.source}, count=${domExhibitors.count}`
  );
  const domFile = path.join(DATA_DIR, "exhibitors-dom.json");
  fs.writeFileSync(domFile, JSON.stringify(domExhibitors, null, 2));

  await browser.close();
  console.log("Browser closed. Check data/ directory for raw output files.");
}

scrapeExhibitors().catch(console.error);
