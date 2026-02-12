import * as fs from "fs";
import * as path from "path";
import { SummitData } from "./types";

let cachedData: SummitData | null = null;

function loadJSON(filename: string): unknown {
  const filepath = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`Data file not found: ${filepath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

export function loadSummitData(): SummitData {
  if (cachedData) return cachedData;

  const exhibitorsFile = loadJSON("exhibitors.json") as {
    exhibitors: SummitData["exhibitors"];
  } | null;

  cachedData = {
    sessions: (loadJSON("sessions.json") as SummitData["sessions"]) || [],
    speakers: (loadJSON("speakers.json") as SummitData["speakers"]) || [],
    agenda: (loadJSON("agenda.json") as SummitData["agenda"]) || [],
    exhibitors: exhibitorsFile?.exhibitors || [],
    events:
      (loadJSON("events.json") as SummitData["events"]) || [],
    workingGroups:
      (loadJSON("working-groups.json") as SummitData["workingGroups"]) || [],
  };

  return cachedData;
}
