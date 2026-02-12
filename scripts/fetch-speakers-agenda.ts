import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");
const BASE_URL = "https://cms-uatimpact.indiaai.in/api";

async function fetchJSON(url: string): Promise<unknown> {
  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`  Error: ${response.status}`);
    return null;
  }
  return response.json();
}

async function fetchAll(endpoint: string, label: string): Promise<unknown[]> {
  const all: unknown[] = [];
  let page = 1;
  const pageSize = 100;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/${endpoint}?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
    const result = await fetchJSON(url) as { data: unknown[]; meta: { pagination: { pageCount: number; total: number } } } | null;

    if (!result?.data) break;

    all.push(...result.data);
    totalPages = result.meta?.pagination?.pageCount || 1;
    const total = result.meta?.pagination?.total || "?";
    console.log(`  ${label} page ${page}/${totalPages}: got ${result.data.length} (${all.length}/${total})`);
    page++;
  }

  return all;
}

async function main() {
  // Fetch all speakers
  console.log("=== FETCHING ALL SPEAKERS ===");
  const speakers = await fetchAll("speakers", "Speakers");
  console.log(`Total speakers: ${speakers.length}`);
  fs.writeFileSync(
    path.join(DATA_DIR, "speakers-api-all.json"),
    JSON.stringify(speakers, null, 2)
  );

  // Fetch all agendas
  console.log("\n=== FETCHING ALL AGENDAS ===");
  const agendas = await fetchAll("agendas", "Agendas");
  console.log(`Total agendas: ${agendas.length}`);
  fs.writeFileSync(
    path.join(DATA_DIR, "agendas-api-all.json"),
    JSON.stringify(agendas, null, 2)
  );

  // Fetch all pages
  console.log("\n=== FETCHING ALL PAGES ===");
  const pages = await fetchAll("pages", "Pages");
  console.log(`Total pages: ${pages.length}`);
  fs.writeFileSync(
    path.join(DATA_DIR, "pages-api-all.json"),
    JSON.stringify(pages, null, 2)
  );

  // Fetch session types
  console.log("\n=== FETCHING SESSION TYPES ===");
  const sessionTypes = await fetchAll("session-types", "Session Types");
  console.log(`Total session types: ${sessionTypes.length}`);
  fs.writeFileSync(
    path.join(DATA_DIR, "session-types-api.json"),
    JSON.stringify(sessionTypes, null, 2)
  );

  console.log("\n=== All API data fetched ===");
}

main().catch(console.error);
