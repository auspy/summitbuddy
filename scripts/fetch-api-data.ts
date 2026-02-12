import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const BASE_URL = "https://cms-uatimpact.indiaai.in/api";

async function fetchJSON(url: string): Promise<unknown> {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`  Error: ${response.status} ${response.statusText}`);
    return null;
  }
  return response.json();
}

async function fetchAllSessions() {
  console.log("=== FETCHING ALL SESSIONS ===");

  const allSessions: unknown[] = [];
  let page = 1;
  const pageSize = 100;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/session-cards?sort[0]=date:asc&sort[1]=startTime:asc&populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const result = await fetchJSON(url) as { data: unknown[]; meta: { pagination: { pageCount: number; total: number } } } | null;

    if (!result?.data) {
      console.log(`No data on page ${page}, stopping`);
      break;
    }

    allSessions.push(...result.data);
    totalPages = result.meta?.pagination?.pageCount || 1;
    console.log(`  Page ${page}/${totalPages}: got ${result.data.length} sessions (total so far: ${allSessions.length})`);
    page++;
  }

  console.log(`Total sessions fetched: ${allSessions.length}`);
  fs.writeFileSync(
    path.join(DATA_DIR, "sessions-api-all.json"),
    JSON.stringify(allSessions, null, 2)
  );
  return allSessions;
}

async function exploreApiEndpoints() {
  console.log("\n=== EXPLORING API ENDPOINTS ===");

  // Common Strapi endpoints to try
  const endpoints = [
    "session-types",
    "speakers",
    "key-attendees",
    "attendees",
    "agenda",
    "agendas",
    "events",
    "programs",
    "working-groups",
    "venues",
    "tracks",
    "categories",
    "tags",
    "pages",
    "homepage",
    "about",
    "research-symposium",
    "exhibitors",
    "content-type-builder/content-types",
  ];

  const found: { endpoint: string; data: unknown }[] = [];

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}/${endpoint}?populate=*&pagination[pageSize]=5`;
    const result = await fetchJSON(url);
    if (result) {
      found.push({ endpoint, data: result });
      const dataArr = (result as { data?: unknown[] }).data;
      console.log(`  ✓ ${endpoint}: ${Array.isArray(dataArr) ? dataArr.length + " records" : "found"}`);
    } else {
      console.log(`  ✗ ${endpoint}: not found`);
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "api-endpoints-explored.json"),
    JSON.stringify(found, null, 2)
  );
  return found;
}

async function fetchKeyAttendees() {
  console.log("\n=== FETCHING KEY ATTENDEES ===");

  // Try various speaker/attendee endpoints
  const speakerEndpoints = [
    "speakers?populate=*&pagination[pageSize]=100",
    "key-attendees?populate=*&pagination[pageSize]=100",
    "attendees?populate=*&pagination[pageSize]=100",
    "session-cards?fields[0]=speakers&pagination[pageSize]=200",
  ];

  for (const endpoint of speakerEndpoints) {
    const url = `${BASE_URL}/${endpoint}`;
    const result = await fetchJSON(url);
    if (result) {
      fs.writeFileSync(
        path.join(DATA_DIR, `speakers-api-${endpoint.split("?")[0].replace("/", "-")}.json`),
        JSON.stringify(result, null, 2)
      );
    }
  }
}

async function main() {
  try {
    await fetchAllSessions();
    await exploreApiEndpoints();
    await fetchKeyAttendees();
    console.log("\n=== API data fetch complete ===");
  } catch (e) {
    console.error("Error:", e);
  }
}

main();
