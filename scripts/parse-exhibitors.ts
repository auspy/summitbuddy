import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");

// Read the full page source and extract the exhibitors array
const pageSource = fs.readFileSync(
  path.join(DATA_DIR, "exhibitors-page-source.html"),
  "utf-8"
);

// Find the exhibitors array in the page source
const marker = "const exhibitors = [";
const startIdx = pageSource.indexOf(marker);
if (startIdx === -1) {
  console.error("Could not find exhibitors array in page source");
  process.exit(1);
}

const arrayStartIdx = startIdx + marker.length - 1; // include the [

// Find the matching closing bracket
let depth = 0;
let endIdx = arrayStartIdx;
for (let i = arrayStartIdx; i < pageSource.length; i++) {
  if (pageSource[i] === "[") depth++;
  if (pageSource[i] === "]") depth--;
  if (depth === 0) {
    endIdx = i;
    break;
  }
}

const arrayText = pageSource.substring(arrayStartIdx, endIdx + 1);

// Evaluate the JS array (it uses single quotes and unquoted keys)
// We'll use Function constructor as a safe eval
const exhibitors = new Function(`return ${arrayText}`)();

console.log(`Parsed ${exhibitors.length} exhibitors`);

// Generate IDs and clean up
interface RawExhibitor {
  name: string;
  hall: string;
  sqm: string;
  categories: string;
  subCategory?: string;
  logo: string;
}

const cleanedExhibitors = (exhibitors as RawExhibitor[]).map(
  (e: RawExhibitor, i: number) => ({
    id: `exhibitor_${String(i + 1).padStart(3, "0")}`,
    name: e.name?.trim() || "Unknown",
    hall: e.hall?.trim() || "",
    sqm: e.sqm?.trim() || "",
    category: e.categories?.trim() || "",
    subCategory: e.subCategory?.trim() || undefined,
    logo: e.logo?.trim() || "",
  })
);

// Stats
const categories: Record<string, number> = {};
const halls: Record<string, number> = {};
cleanedExhibitors.forEach((e) => {
  categories[e.category] = (categories[e.category] || 0) + 1;
  halls[e.hall] = (halls[e.hall] || 0) + 1;
});

console.log("\nCategories:", categories);
console.log("\nHalls:", halls);
console.log(`\nTotal exhibitors: ${cleanedExhibitors.length}`);

// Write clean JSON
const outputFile = path.join(DATA_DIR, "exhibitors.json");
fs.writeFileSync(
  outputFile,
  JSON.stringify({ exhibitors: cleanedExhibitors }, null, 2)
);
console.log(`\nWritten to ${outputFile}`);

// Show a few samples
console.log("\nSample exhibitors:");
cleanedExhibitors.slice(0, 3).forEach((e) => console.log(`  ${e.name} (${e.category}, Hall ${e.hall})`));
