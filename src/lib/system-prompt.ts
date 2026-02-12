import { SummitData, UserProfile } from "./types";

export function buildSystemPrompt(
  data: SummitData,
  profile?: UserProfile
): string {
  // Compact session format: minimize tokens while keeping essential info
  const sessionLines = data.sessions.map((s) => {
    const speakers = s.speakers.map((sp) => sp.name).join(", ");
    const time = s.startTime ? ` ${s.startTime}` : "";
    const hall = s.hall ? ` [${s.hall}]` : "";
    const tags = s.tags.length > 0 ? ` #${s.tags.slice(0, 3).join(" #")}` : "";
    return `- ${s.id}|${s.date}${time}|${s.venue}${hall}|${s.type}|${s.title}|${speakers}${tags}`;
  });

  // Group sessions by date for easier reference
  const sessionsByDate: Record<string, string[]> = {};
  for (const line of sessionLines) {
    const date = line.split("|")[1]?.split(" ")[0] || "";
    if (!sessionsByDate[date]) sessionsByDate[date] = [];
    sessionsByDate[date].push(line);
  }

  const sessionsText = Object.entries(sessionsByDate)
    .map(([date, lines]) => `### ${date} (${lines.length} sessions)\n${lines.join("\n")}`)
    .join("\n\n");

  // Compact exhibitor format
  const exhibitorsByCategory: Record<string, string[]> = {};
  for (const e of data.exhibitors) {
    const cat = e.category || "Other";
    if (!exhibitorsByCategory[cat]) exhibitorsByCategory[cat] = [];
    exhibitorsByCategory[cat].push(`${e.name} (Hall ${e.hall})`);
  }

  const exhibitorsText = Object.entries(exhibitorsByCategory)
    .map(
      ([cat, names]) =>
        `**${cat}** (${names.length}): ${names.slice(0, 30).join(", ")}${names.length > 30 ? ` ...and ${names.length - 30} more` : ""}`
    )
    .join("\n");

  // Compact speaker format
  const speakerLines = data.speakers
    .map((s) => `${s.name}${s.title ? ` — ${s.title}` : ""}`)
    .join(", ");

  let prompt = `You are Summit Buddy, the AI guide for the India AI Impact Summit 2026 (Feb 16-20, Bharat Mandapam, New Delhi).

35,000+ attendees, 100+ countries, 481 sessions, 681 exhibitors, 500+ AI startups.

## Seven Chakras (Thematic Framework)
1. Human Capital Development
2. Inclusion for Social Empowerment
3. Safe & Trusted AI
4. Resilience, Innovation & Efficiency
5. Science
6. Democratizing AI Resources
7. AI for Economic Development & Social Good

## Three Sutras
1. AI designed for the benefit of all
2. AI developed so as not to harm any
3. AI operating on transparency and responsibility

## Key Venues
- Bharat Mandapam — Main (Expo Halls 1-15, Plenary Hall)
- Sushma Swaraj Bhawan — Workshops, roundtables
- Ambedkar International Centre — Select sessions

## Schedule
- Feb 16-18: Pre-summit, industry sessions, research symposium, expo, challenges
- Feb 19-20: Leaders' Summit (heads of state, ministers, CEO roundtable, GPAI)
- Feb 16-20: AI Impact Expo (10am-6pm daily)

## Agenda
${data.agenda.map((a) => `**Day ${a.day} (${a.date}, ${a.dayLabel})**: ${a.theme}. ${a.description} (${a.sessionCount} sessions at ${a.venues.join(", ")})`).join("\n")}

## Flagship Events
${data.events.map((e) => `- **${e.name}** (${e.dates}): ${e.description}`).join("\n")}

## Sessions (${data.sessions.length} total)
Format: id|date time|venue [hall]|type|title|speakers #tags
${sessionsText}

## Key Speakers (${data.speakers.length})
${speakerLines}

## Exhibitors (${data.exhibitors.length} total)
${exhibitorsText}

## Working Groups
${data.workingGroups.map((wg) => `- **Chakra ${wg.chakraNumber}: ${wg.name}** — ${wg.description}`).join("\n")}

## Guidelines
- Recommend sessions with: title, date/time, venue, relevance
- Rate: ⭐⭐⭐ perfect match, ⭐⭐ good fit, ⭐ might interest
- Flag overlaps: "⚠️ Overlaps with [X]"
- Mention venue/hall for wayfinding
- Be honest if data is limited
- Some sessions (CEO Roundtable, GPAI, Leaders' Plenary) may be invite-only
- Suggest breaks ("grab chai at the expo food court")
- For logistics: impact-summit@indiaai.gov.in
- When referring to a session, include its ID for reference`;

  if (profile && (profile.role || profile.interests?.length || profile.days?.length)) {
    prompt += `

## User Profile
${profile.role ? `Role: ${profile.role}` : ""}
${profile.interests?.length ? `Interests: ${profile.interests.join(", ")}` : ""}
${profile.days?.length ? `Days: ${profile.days.map((d) => `Day ${d} (Feb ${15 + d})`).join(", ")}` : ""}
${profile.priority ? `Priority: ${profile.priority}` : ""}
${profile.organization ? `Org: ${profile.organization}` : ""}
Personalize all recommendations based on this profile.`;
  }

  return prompt;
}

/**
 * Compressed system prompt for providers with low token limits (e.g. Groq free tier ~12K TPM).
 * Strips speakers per session, shortens titles, drops exhibitor names.
 * Target: <10K tokens (~40K chars).
 */
export function buildCompressedSystemPrompt(
  data: SummitData,
  profile?: UserProfile
): string {
  // Filter sessions to user's days if specified, otherwise all
  const userDays = profile?.days;
  const filteredSessions = userDays?.length
    ? data.sessions.filter((s) => userDays.includes(s.day))
    : data.sessions;

  // Ultra-compact: "HH:MM Title @Hall" — no speakers, no IDs
  const sessionsByDate: Record<string, string[]> = {};
  for (const s of filteredSessions) {
    if (!sessionsByDate[s.date]) sessionsByDate[s.date] = [];
    const time = s.startTime || "TBD";
    const loc = s.hall || s.venue;
    // Truncate long titles to 80 chars
    const title = s.title.length > 80 ? s.title.substring(0, 77) + "..." : s.title;
    sessionsByDate[s.date].push(`${time} ${title} @${loc}`);
  }

  const sessionsText = Object.entries(sessionsByDate)
    .sort()
    .map(([date, lines]) => {
      const dayNum = parseInt(date.split("-")[2]) - 15;
      return `D${dayNum}(${date},${lines.length}):\n${lines.join("\n")}`;
    })
    .join("\n");

  // Exhibitor counts only
  const catCounts: Record<string, number> = {};
  for (const e of data.exhibitors) {
    catCounts[e.category] = (catCounts[e.category] || 0) + 1;
  }

  // Top 20 speaker names only
  const topSpeakers = data.speakers.slice(0, 20).map((s) => s.name).join(", ");

  let prompt = `Summit Buddy: AI guide for India AI Impact Summit 2026, Feb 16-20, Bharat Mandapam, New Delhi.
35K attendees, 100+ countries, ${data.sessions.length} sessions, ${data.exhibitors.length} exhibitors.

Venues: Bharat Mandapam(Halls 1-15), Sushma Swaraj Bhawan, Ambedkar Centre
Feb 16-18: industry/research/expo. Feb 19-20: Leaders' Summit. Expo daily 10am-6pm.
Chakras: 1.Human Capital 2.Inclusion 3.Safe AI 4.Innovation 5.Science 6.Democratizing AI 7.Social Good

Events: ${data.events.map((e) => e.name).join(", ")}
Speakers: ${topSpeakers}, +${data.speakers.length - 20} more
Exhibitors: ${Object.entries(catCounts).map(([c, n]) => `${c}:${n}`).join(", ")}. Halls 1-15.

${userDays?.length ? `Showing ${filteredSessions.length} sessions for user's days only.` : `All ${filteredSessions.length} sessions:`}
${sessionsText}

Be helpful, recommend sessions by title/time/venue. Flag conflicts. Mention venue. Be honest about gaps.

Format: Bold session titles exactly as given: **Session Title Here**. Bold speaker names: **Speaker Name**. Use ### for section headings. Use bullet lists not tables. 3-5 recommendations max per response. For each: bold title, then brief relevance note.`;

  if (profile && (profile.role || profile.interests?.length)) {
    prompt += `\nUser: ${profile.role || ""} interests:${profile.interests?.join(",") || "any"} priority:${profile.priority || ""}`;
  }

  return prompt;
}
