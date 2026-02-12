import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

async function scrapeAgendaAndSpeakers() {
  console.log("Starting agenda + speakers scraper...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // ===== AGENDA =====
  console.log("\n=== SCRAPING AGENDA ===");

  const agendaPage = await context.newPage();

  // Track API calls
  const agendaApiCalls: { url: string; data: unknown }[] = [];
  agendaPage.on("response", async (response) => {
    const ct = response.headers()["content-type"] || "";
    if (ct.includes("json")) {
      try {
        const data = await response.json();
        agendaApiCalls.push({ url: response.url(), data });
      } catch {}
    }
  });

  await agendaPage.goto("https://impact.indiaai.gov.in/agenda", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await agendaPage.waitForTimeout(3000);

  const agendaData = await agendaPage.evaluate(() => {
    const body = document.body.innerText;

    // Look for __NEXT_DATA__
    const win = window as Record<string, unknown>;
    if (win.__NEXT_DATA__) {
      return { source: "next_data", data: win.__NEXT_DATA__, text: body.substring(0, 5000) };
    }

    return { source: "text", text: body, htmlLength: document.body.innerHTML.length };
  });

  fs.writeFileSync(
    path.join(DATA_DIR, "agenda-main.json"),
    JSON.stringify(agendaData, null, 2)
  );
  console.log(`Main agenda page: source=${agendaData.source}`);

  if (agendaApiCalls.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "agenda-api-calls.json"),
      JSON.stringify(agendaApiCalls, null, 2)
    );
  }

  // Save full HTML
  const agendaHtml = await agendaPage.content();
  fs.writeFileSync(path.join(DATA_DIR, "agenda-page.html"), agendaHtml);

  // Scrape each day's agenda page
  const dayUrls = [
    "16-february-2026",
    "17-february-2026",
    "18-february-2026",
    "19-february-2026",
    "20-february-2026",
  ];

  const allDayData: Record<string, unknown> = {};
  for (const dayUrl of dayUrls) {
    const url = `https://impact.indiaai.gov.in/agenda/${dayUrl}`;
    console.log(`  Scraping ${url}...`);
    await agendaPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await agendaPage.waitForTimeout(2000);

    const dayData = await agendaPage.evaluate(() => {
      const body = document.body.innerText;

      // Extract structured content
      const sections: Record<string, string | null>[] = [];
      const headings = document.querySelectorAll('h1, h2, h3, h4');
      headings.forEach(h => {
        const nextSibling = h.nextElementSibling;
        sections.push({
          heading: h.textContent?.trim() || null,
          level: h.tagName,
          content: nextSibling?.textContent?.trim()?.substring(0, 500) || null,
        });
      });

      // Look for event cards or list items
      const cards = document.querySelectorAll('[class*="card"], [class*="event"], [class*="session"]');
      const events: Record<string, string | null>[] = [];
      cards.forEach(card => {
        events.push({
          text: card.textContent?.trim()?.substring(0, 300) || null,
          classes: card.className?.substring(0, 100) || null,
        });
      });

      return {
        text: body.substring(0, 10000),
        sections,
        events: events.slice(0, 50),
        title: document.title,
      };
    });

    allDayData[dayUrl] = dayData;

    // Also save HTML for each day
    const dayHtml = await agendaPage.content();
    fs.writeFileSync(path.join(DATA_DIR, `agenda-${dayUrl}.html`), dayHtml);
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "agenda-days.json"),
    JSON.stringify(allDayData, null, 2)
  );
  console.log("Agenda scraping complete");

  await agendaPage.close();

  // ===== KEY ATTENDEES / SPEAKERS =====
  console.log("\n=== SCRAPING KEY ATTENDEES ===");

  const speakersPage = await context.newPage();

  const speakerApiCalls: { url: string; data: unknown }[] = [];
  speakersPage.on("response", async (response) => {
    const url = response.url();
    const ct = response.headers()["content-type"] || "";

    if (ct.includes("json")) {
      try {
        const data = await response.json();
        speakerApiCalls.push({ url, data });
        console.log(`  [Speaker API] ${url}`);
      } catch {}
    }

    // Capture RSC payloads
    if (url.includes("_rsc") || ct.includes("x-component") || ct.includes("text/x-component")) {
      try {
        const text = await response.text();
        if (text.length > 500) {
          fs.writeFileSync(
            path.join(DATA_DIR, `speakers-rsc-${speakerApiCalls.length}.txt`),
            text.substring(0, 200000)
          );
          console.log(`  [RSC] ${url} (${text.length} chars)`);
        }
      } catch {}
    }
  });

  await speakersPage.goto("https://impact.indiaai.gov.in/key-attendees", {
    waitUntil: "networkidle",
    timeout: 45000,
  });
  await speakersPage.waitForTimeout(5000);

  const speakersData = await speakersPage.evaluate(() => {
    const body = document.body.innerText;

    // Look for __NEXT_DATA__
    const win = window as Record<string, unknown>;
    if (win.__NEXT_DATA__) {
      return { source: "next_data", data: win.__NEXT_DATA__ };
    }

    // Extract speaker cards from DOM
    const cards = document.querySelectorAll('[class*="card"], [class*="speaker"], [class*="attendee"]');
    const speakers: Record<string, string | null>[] = [];
    cards.forEach(card => {
      const img = card.querySelector('img');
      const name = card.querySelector('h2, h3, h4, [class*="name"]')?.textContent?.trim();
      if (name) {
        speakers.push({
          name,
          title: card.querySelector('[class*="title"], [class*="designation"], p')?.textContent?.trim() || null,
          org: card.querySelector('[class*="org"], [class*="company"]')?.textContent?.trim() || null,
          imgSrc: img?.getAttribute('src') || null,
          imgAlt: img?.getAttribute('alt') || null,
          fullText: card.textContent?.trim()?.substring(0, 300) || null,
        });
      }
    });

    if (speakers.length > 0) {
      return { source: "dom_cards", data: speakers };
    }

    // Try grid items with images
    const gridItems = document.querySelectorAll('div > img');
    const imgItems: Record<string, string | null>[] = [];
    gridItems.forEach(img => {
      const parent = img.closest('div');
      if (parent) {
        imgItems.push({
          imgSrc: img.getAttribute('src'),
          imgAlt: img.getAttribute('alt'),
          parentText: parent.textContent?.trim()?.substring(0, 200) || null,
        });
      }
    });

    return {
      source: "text",
      text: body.substring(0, 10000),
      images: imgItems.slice(0, 50),
    };
  });

  console.log(`Speakers extraction source: ${speakersData.source}`);

  fs.writeFileSync(
    path.join(DATA_DIR, "speakers-raw.json"),
    JSON.stringify(speakersData, null, 2)
  );

  if (speakerApiCalls.length > 0) {
    fs.writeFileSync(
      path.join(DATA_DIR, "speakers-api-calls.json"),
      JSON.stringify(speakerApiCalls, null, 2)
    );
    console.log(`Saved ${speakerApiCalls.length} speaker API calls`);
  }

  // Save HTML
  const speakersHtml = await speakersPage.content();
  fs.writeFileSync(path.join(DATA_DIR, "speakers-page.html"), speakersHtml);

  await speakersPage.close();

  // ===== EVENTS PAGES =====
  console.log("\n=== SCRAPING EVENT PAGES ===");

  const eventUrls = [
    { slug: "ai-for-all", name: "AI for ALL" },
    { slug: "ai-by-her", name: "AI by HER" },
    { slug: "yuvai", name: "YUVAi" },
    { slug: "research-symposium", name: "Research Symposium" },
    { slug: "atal-tinkering-labs", name: "Atal Tinkering Labs" },
  ];

  const eventsData: Record<string, unknown> = {};
  const eventPage = await context.newPage();

  for (const event of eventUrls) {
    const url = `https://impact.indiaai.gov.in/events/${event.slug}`;
    console.log(`  Scraping ${event.name} (${url})...`);

    try {
      await eventPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await eventPage.waitForTimeout(2000);

      const data = await eventPage.evaluate(() => {
        const body = document.body.innerText;
        const sections: Record<string, string | null>[] = [];
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(h => {
          sections.push({
            heading: h.textContent?.trim() || null,
            level: h.tagName,
          });
        });

        return {
          text: body.substring(0, 10000),
          title: document.title,
          sections,
        };
      });

      eventsData[event.slug] = { name: event.name, ...data };

      // Save HTML
      const html = await eventPage.content();
      fs.writeFileSync(path.join(DATA_DIR, `event-${event.slug}.html`), html);
    } catch (e) {
      console.log(`  Error scraping ${event.name}: ${e}`);
      eventsData[event.slug] = { name: event.name, error: String(e) };
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "events-raw.json"),
    JSON.stringify(eventsData, null, 2)
  );

  await eventPage.close();

  // ===== WORKING GROUPS =====
  console.log("\n=== SCRAPING WORKING GROUPS ===");

  const wgSlugs = [
    "human-capital",
    "inclusion-social-empowerment",
    "safe-trusted-ai",
    "science",
    "resilience-innovation-efficiency",
    "democratizing-ai-resources",
    "ai-for-economic-growth",
  ];

  const wgData: Record<string, unknown> = {};
  const wgPage = await context.newPage();

  for (const slug of wgSlugs) {
    const url = `https://impact.indiaai.gov.in/working-groups/${slug}`;
    console.log(`  Scraping working group: ${slug}...`);

    try {
      await wgPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await wgPage.waitForTimeout(2000);

      const data = await wgPage.evaluate(() => {
        return {
          text: document.body.innerText.substring(0, 10000),
          title: document.title,
        };
      });

      wgData[slug] = data;

      const html = await wgPage.content();
      fs.writeFileSync(path.join(DATA_DIR, `wg-${slug}.html`), html);
    } catch (e) {
      console.log(`  Error scraping ${slug}: ${e}`);
      wgData[slug] = { error: String(e) };
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "working-groups-raw.json"),
    JSON.stringify(wgData, null, 2)
  );

  await wgPage.close();

  // ===== EXPO PROGRAMS =====
  console.log("\n=== SCRAPING EXPO PROGRAMS ===");

  const programsPage = await context.newPage();
  await programsPage.goto("https://www.impactexpo.indiaai.gov.in/programs", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await programsPage.waitForTimeout(3000);

  const programsData = await programsPage.evaluate(() => {
    // Look for data attributes used for filtering
    const items = document.querySelectorAll('[data-day], [data-title], [data-time]');
    const programs: Record<string, string | null>[] = [];
    items.forEach(item => {
      programs.push({
        day: item.getAttribute('data-day'),
        title: item.getAttribute('data-title'),
        time: item.getAttribute('data-time'),
        text: item.textContent?.trim()?.substring(0, 500) || null,
        classes: item.className?.substring(0, 200) || null,
      });
    });

    // Also get general page content
    return {
      text: document.body.innerText.substring(0, 10000),
      programs,
      title: document.title,
    };
  });

  fs.writeFileSync(
    path.join(DATA_DIR, "programs-raw.json"),
    JSON.stringify(programsData, null, 2)
  );

  const programsHtml = await programsPage.content();
  fs.writeFileSync(path.join(DATA_DIR, "programs-page.html"), programsHtml);

  console.log(`Programs: ${programsData.programs?.length || 0} items with data attributes`);

  await programsPage.close();

  // ===== ABOUT / OVERVIEW =====
  console.log("\n=== SCRAPING ABOUT PAGE ===");

  const aboutPage = await context.newPage();
  await aboutPage.goto("https://impact.indiaai.gov.in/about-summit", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await aboutPage.waitForTimeout(2000);

  const aboutData = await aboutPage.evaluate(() => ({
    text: document.body.innerText.substring(0, 15000),
    title: document.title,
  }));

  fs.writeFileSync(
    path.join(DATA_DIR, "about-raw.json"),
    JSON.stringify(aboutData, null, 2)
  );

  const aboutHtml = await aboutPage.content();
  fs.writeFileSync(path.join(DATA_DIR, "about-page.html"), aboutHtml);

  await aboutPage.close();

  // ===== RESEARCH SYMPOSIUM (main page, not events sub-page) =====
  console.log("\n=== SCRAPING RESEARCH SYMPOSIUM PAGE ===");

  const rsPage = await context.newPage();

  try {
    const response = await rsPage.goto("https://impact.indiaai.gov.in/research-symposium", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    const contentType = response?.headers()?.["content-type"] || "";
    console.log(`Research symposium content-type: ${contentType}`);

    if (contentType.includes("pdf")) {
      // It's a PDF - save it for later extraction
      const buffer = await response!.body();
      fs.writeFileSync(path.join(DATA_DIR, "research-symposium.pdf"), buffer);
      console.log("Saved as PDF file");
    } else {
      const rsData = await rsPage.evaluate(() => ({
        text: document.body.innerText.substring(0, 15000),
        title: document.title,
      }));
      fs.writeFileSync(
        path.join(DATA_DIR, "research-symposium-raw.json"),
        JSON.stringify(rsData, null, 2)
      );
    }
  } catch (e) {
    console.log(`Research symposium error: ${e}`);
  }

  await rsPage.close();

  // ===== HOMEPAGE (for pre-summit events) =====
  console.log("\n=== SCRAPING HOMEPAGE ===");

  const homePage = await context.newPage();
  await homePage.goto("https://impact.indiaai.gov.in/", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await homePage.waitForTimeout(3000);

  const homeData = await homePage.evaluate(() => ({
    text: document.body.innerText.substring(0, 20000),
    title: document.title,
  }));

  fs.writeFileSync(
    path.join(DATA_DIR, "homepage-raw.json"),
    JSON.stringify(homeData, null, 2)
  );

  await homePage.close();

  await browser.close();
  console.log("\n=== All scraping complete ===");
}

scrapeAgendaAndSpeakers().catch(console.error);
