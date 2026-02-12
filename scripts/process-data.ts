import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "..", "data");

// ===== Load raw data =====
function loadJSON(filename: string): unknown {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Warning: ${filename} not found`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

// ===== Process Sessions =====
interface RawSession {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venue: string | null;
  room: string | null;
  speakers: { id: number; heading: string; title: string; body: string }[];
  knowledgePartners: { id: number; title: string }[];
  sessionType: { displayLabel: string; value: string } | null;
  links: { id: number; heading: string; url: string }[];
  globalSearch: string | null;
  durationMinutes: number | null;
  notes: string | null;
  capacity: number | null;
}

function processSessions(rawSessions: RawSession[]) {
  const dayMap: Record<string, number> = {
    "2026-02-16": 1,
    "2026-02-17": 2,
    "2026-02-18": 3,
    "2026-02-19": 4,
    "2026-02-20": 5,
  };

  return rawSessions.map((s) => {
    const startTime = s.startTime
      ? s.startTime.substring(0, 5) // "09:30:00.000" -> "09:30"
      : undefined;
    const endTime = s.endTime
      ? s.endTime.substring(0, 5)
      : undefined;

    // Generate tags from title, description, and session type
    const tags = generateSessionTags(s);

    return {
      id: `session_${s.id}`,
      title: s.title?.trim() || "Untitled Session",
      description: s.description?.trim() || "",
      date: s.date,
      day: dayMap[s.date] || 0,
      startTime,
      endTime,
      venue: s.venue?.trim() || "",
      hall: s.room?.trim() || undefined,
      type: s.sessionType?.displayLabel || "Session",
      typeValue: s.sessionType?.value || "",
      speakers: (s.speakers || []).map((sp) => ({
        name: sp.heading?.trim() || "",
        role: sp.title?.trim() || undefined,
      })),
      knowledgePartners: (s.knowledgePartners || []).map((kp) => kp.title),
      tags,
      durationMinutes: s.durationMinutes || undefined,
      notes: s.notes?.trim() || undefined,
      capacity: s.capacity || undefined,
      links: (s.links || []).map((l) => ({ label: l.heading, url: l.url })),
    };
  });
}

function generateSessionTags(s: RawSession): string[] {
  const tags: string[] = [];
  const text = `${s.title || ""} ${s.description || ""} ${s.globalSearch || ""}`.toLowerCase();

  // Sector tags
  const sectorKeywords: Record<string, string[]> = {
    healthcare: ["health", "medical", "clinical", "pharma", "diagnostic"],
    education: ["education", "learning", "student", "university", "skill", "school", "academic"],
    agriculture: ["agri", "farm", "crop", "food security"],
    energy: ["energy", "climate", "green", "carbon", "sustainability", "renewable"],
    finance: ["financ", "banking", "fintech", "payment"],
    defense: ["defense", "defence", "security", "cyber", "military"],
    governance: ["governance", "policy", "regulation", "government", "public sector"],
    infrastructure: ["infrastructure", "smart city", "urban", "transport"],
  };

  for (const [tag, keywords] of Object.entries(sectorKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }

  // AI topic tags
  const aiKeywords: Record<string, string[]> = {
    llm: ["llm", "large language", "foundation model", "generative ai", "gen ai"],
    nlp: ["nlp", "natural language", "language model", "multilingual", "translation"],
    "computer-vision": ["vision", "image", "visual", "video"],
    robotics: ["robot", "autonomous", "drone"],
    "ai-safety": ["safety", "alignment", "trustworth", "responsible ai", "ethical"],
    "ai-governance": ["governance", "regulation", "framework", "standard", "compliance"],
    "open-source": ["open source", "open-source", "democratiz"],
    compute: ["compute", "gpu", "hpc", "cloud", "infrastructure"],
    startup: ["startup", "entrepreneur", "innovation", "incubat"],
    investment: ["invest", "funding", "venture", "capital"],
    research: ["research", "paper", "academic", "symposium", "phd"],
  };

  for (const [tag, keywords] of Object.entries(aiKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.push(tag);
    }
  }

  // Session type tag
  if (s.sessionType?.value) {
    tags.push(s.sessionType.value.toLowerCase().replace(/_/g, "-"));
  }

  return [...new Set(tags)];
}

// ===== Process Speakers =====
interface RawSpeaker {
  id: number;
  documentId: string;
  name: string;
  category: string | null;
  designation: string | null;
  showOnHomepage: boolean | null;
  isKeyAttendee: boolean | null;
  isRsSpeaker: boolean | null;
  isInternationalSpeaker: boolean | null;
  image: {
    url: string;
    formats?: {
      small?: { url: string };
      thumbnail?: { url: string };
    };
  } | null;
}

function processSpeakers(rawSpeakers: RawSpeaker[], sessions: ReturnType<typeof processSessions>) {
  // Build a map of speaker name -> session IDs
  const speakerSessions: Record<string, string[]> = {};
  for (const session of sessions) {
    for (const sp of session.speakers) {
      const key = sp.name.toLowerCase().trim();
      if (!speakerSessions[key]) speakerSessions[key] = [];
      speakerSessions[key].push(session.id);
    }
  }

  return rawSpeakers.map((sp) => {
    const key = sp.name.toLowerCase().trim();
    const photoUrl =
      sp.image?.formats?.small?.url || sp.image?.url || undefined;

    const tags: string[] = [];
    if (sp.isRsSpeaker) tags.push("research-symposium");
    if (sp.isKeyAttendee) tags.push("key-attendee");
    if (sp.isInternationalSpeaker) tags.push("international");
    if (sp.showOnHomepage) tags.push("featured");

    return {
      id: `speaker_${sp.id}`,
      name: sp.name?.trim() || "Unknown",
      title: sp.designation?.trim() || undefined,
      organization: undefined, // extract from designation if possible
      country: undefined,
      photoUrl,
      sessions: speakerSessions[key] || [],
      tags,
    };
  });
}

// ===== Process Agendas =====
interface RawAgenda {
  id: number;
  date: string;
  weekday: string;
  description: string;
}

function processAgendas(rawAgendas: RawAgenda[], sessions: ReturnType<typeof processSessions>) {
  const dayMap: Record<string, number> = {
    "2026-02-16": 1,
    "2026-02-17": 2,
    "2026-02-18": 3,
    "2026-02-19": 4,
    "2026-02-20": 5,
  };

  const dayThemes: Record<number, string> = {
    1: "Opening & Foundations",
    2: "Sectoral Deep Dives & Knowledge Compendiums",
    3: "Research Symposium & Industry Sessions",
    4: "Leaders' Summit — Day 1",
    5: "Leaders' Summit — Day 2 & Close",
  };

  return rawAgendas.map((a) => {
    const day = dayMap[a.date] || 0;
    const daySessions = sessions
      .filter((s) => s.date === a.date)
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

    const venues = [...new Set(daySessions.map((s) => s.venue).filter(Boolean))];

    return {
      date: a.date,
      day,
      dayLabel: `${a.weekday}, February ${a.date.split("-")[2]}`,
      theme: dayThemes[day] || "",
      description: a.description?.trim() || "",
      sessionCount: daySessions.length,
      venues,
      events: daySessions.slice(0, 5).map((s) => ({
        title: s.title,
        time: s.startTime,
        venue: s.venue,
        type: s.type,
      })),
    };
  });
}

// ===== Main =====
function main() {
  console.log("Processing all scraped data...\n");

  // Load raw data
  const rawSessions = (loadJSON("sessions-api-all.json") as RawSession[]) || [];
  const rawSpeakers = (loadJSON("speakers-api-all.json") as RawSpeaker[]) || [];
  const rawAgendas = (loadJSON("agendas-api-all.json") as RawAgenda[]) || [];
  const rawExhibitors = loadJSON("exhibitors.json") as { exhibitors: unknown[] } | null;

  console.log(`Raw data loaded:`);
  console.log(`  Sessions: ${rawSessions.length}`);
  console.log(`  Speakers: ${rawSpeakers.length}`);
  console.log(`  Agendas: ${rawAgendas.length}`);
  console.log(`  Exhibitors: ${rawExhibitors?.exhibitors?.length || 0}`);

  // Process
  const sessions = processSessions(rawSessions);
  const speakers = processSpeakers(rawSpeakers, sessions);
  const agenda = processAgendas(rawAgendas, sessions);

  // Stats
  console.log(`\nProcessed data:`);
  console.log(`  Sessions: ${sessions.length}`);
  console.log(`  Speakers: ${speakers.length}`);
  console.log(`  Agenda days: ${agenda.length}`);

  // Session type distribution
  const typeCount: Record<string, number> = {};
  sessions.forEach((s) => {
    typeCount[s.type] = (typeCount[s.type] || 0) + 1;
  });
  console.log(`\nSession types:`, typeCount);

  // Date distribution
  const dateCount: Record<string, number> = {};
  sessions.forEach((s) => {
    dateCount[s.date] = (dateCount[s.date] || 0) + 1;
  });
  console.log(`Sessions by date:`, dateCount);

  // Venue distribution
  const venueCount: Record<string, number> = {};
  sessions.forEach((s) => {
    if (s.venue) venueCount[s.venue] = (venueCount[s.venue] || 0) + 1;
  });
  console.log(`Sessions by venue:`, venueCount);

  // Tag distribution (top 10)
  const tagCount: Record<string, number> = {};
  sessions.forEach((s) => {
    s.tags.forEach((t) => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  console.log(`Top tags:`, topTags);

  // Build the working groups data (from known information)
  const workingGroups = [
    {
      id: "wg_1",
      name: "Human Capital Development",
      chakraNumber: 1,
      description:
        "Skills, talent, workforce development, and education in the AI era",
      coChairs: [],
      focusAreas: [
        "AI workforce development",
        "Skills training",
        "Education transformation",
        "Talent pipeline",
      ],
    },
    {
      id: "wg_2",
      name: "Inclusion for Social Empowerment",
      chakraNumber: 2,
      description:
        "Gender equity, accessibility, underserved communities, and digital inclusion",
      coChairs: [],
      focusAreas: [
        "Gender equity in AI",
        "Accessibility",
        "Underserved communities",
        "Digital inclusion",
      ],
    },
    {
      id: "wg_3",
      name: "Safe & Trusted AI",
      chakraNumber: 3,
      description:
        "AI safety, governance, ethics, regulation, and trust frameworks",
      coChairs: [],
      focusAreas: [
        "AI safety",
        "Governance frameworks",
        "Ethics",
        "Regulation",
        "Trust",
      ],
    },
    {
      id: "wg_4",
      name: "Resilience, Innovation & Efficiency",
      chakraNumber: 4,
      description:
        "Enterprise AI, productivity, manufacturing, defense, and innovation",
      coChairs: [],
      focusAreas: [
        "Enterprise AI",
        "Manufacturing",
        "Defense",
        "Productivity",
        "Innovation",
      ],
    },
    {
      id: "wg_5",
      name: "Science",
      chakraNumber: 5,
      description:
        "Research, foundational models, frontier AI, and academic collaboration",
      coChairs: [],
      focusAreas: [
        "Foundational models",
        "Frontier AI",
        "Academic collaboration",
        "Research",
      ],
    },
    {
      id: "wg_6",
      name: "Democratizing AI Resources",
      chakraNumber: 6,
      description:
        "Compute access, open-source, infrastructure, GPUs, and resource sharing",
      coChairs: [],
      focusAreas: [
        "Compute access",
        "Open-source AI",
        "Infrastructure",
        "Resource sharing",
      ],
    },
    {
      id: "wg_7",
      name: "AI for Economic Development & Social Good",
      chakraNumber: 7,
      description:
        "Healthcare, agriculture, education, energy, climate, and social impact",
      coChairs: [],
      focusAreas: [
        "Healthcare AI",
        "Agriculture",
        "Education",
        "Energy",
        "Climate",
        "Social impact",
      ],
    },
  ];

  // Build flagship events
  const events = [
    {
      id: "event_ai_for_all",
      name: "AI for ALL Global Impact Challenge",
      description:
        "A global challenge inviting participants to build AI solutions addressing real-world problems across sectors like health, education, agriculture, and more.",
      dates: "Feb 16-18, 2026",
      venue: "Bharat Mandapam",
    },
    {
      id: "event_ai_by_her",
      name: "AI by HER",
      description:
        "A program celebrating and empowering women in AI. Features mentoring, workshops, panels on gender diversity in tech.",
      dates: "Feb 16-18, 2026",
      venue: "Bharat Mandapam",
    },
    {
      id: "event_yuvai",
      name: "YUVAi Global Youth Challenge",
      description:
        "Youth-focused AI challenge engaging young innovators and students in building AI solutions.",
      dates: "Feb 16-18, 2026",
      venue: "Bharat Mandapam",
    },
    {
      id: "event_research_symposium",
      name: "Research Symposium",
      description:
        "Full-day academic research event featuring plenary talks, spotlight sessions, and poster showcases. Speakers include Yoshua Bengio, Yann LeCun, Demis Hassabis, Stuart Russell, Sara Hooker, and Neil Lawrence.",
      dates: "Feb 18, 2026",
      venue: "Bharat Mandapam",
    },
    {
      id: "event_tinkerpreneur",
      name: "India AI Tinkerpreneur (Atal Tinkering Labs)",
      description:
        "An innovation program connecting Atal Tinkering Labs with AI opportunities for young tinkerers and innovators.",
      dates: "Feb 16-18, 2026",
      venue: "Bharat Mandapam",
    },
    {
      id: "event_expo",
      name: "AI Impact Expo",
      description:
        "The largest AI expo in India featuring 300+ exhibitors, 500+ startups, country pavilions, and demos across 15 halls at Bharat Mandapam.",
      dates: "Feb 16-20, 2026 (10am-6pm daily)",
      venue: "Bharat Mandapam, Halls 1-15",
    },
  ];

  // Write processed data
  const outputData = {
    sessions,
    speakers,
    agenda,
    exhibitors: rawExhibitors?.exhibitors || [],
    events,
    workingGroups,
    metadata: {
      processedAt: new Date().toISOString(),
      counts: {
        sessions: sessions.length,
        speakers: speakers.length,
        agendaDays: agenda.length,
        exhibitors: rawExhibitors?.exhibitors?.length || 0,
        events: events.length,
        workingGroups: workingGroups.length,
      },
    },
  };

  fs.writeFileSync(
    path.join(DATA_DIR, "summit-data.json"),
    JSON.stringify(outputData, null, 2)
  );

  // Also write individual files for easier loading
  fs.writeFileSync(
    path.join(DATA_DIR, "sessions.json"),
    JSON.stringify(sessions, null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "speakers.json"),
    JSON.stringify(speakers, null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "agenda.json"),
    JSON.stringify(agenda, null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "events.json"),
    JSON.stringify(events, null, 2)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "working-groups.json"),
    JSON.stringify(workingGroups, null, 2)
  );

  console.log(`\nAll processed data written to data/ directory`);
  console.log(`Main file: data/summit-data.json`);
}

main();
