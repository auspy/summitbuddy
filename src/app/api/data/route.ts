import { loadSummitData } from "@/lib/data-loader";
import { NextResponse } from "next/server";

export async function GET() {
  const data = loadSummitData();

  const cardData = {
    sessions: data.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
      venue: s.venue,
      hall: s.hall,
      type: s.type,
      speakers: s.speakers,
      tags: s.tags,
      description: s.description,
    })),
    speakers: data.speakers.map((s) => ({
      id: s.id,
      name: s.name,
      title: s.title,
      photoUrl: s.photoUrl,
      sessions: s.sessions,
      tags: s.tags,
    })),
    exhibitors: data.exhibitors.map((e) => ({
      id: e.id,
      name: e.name,
      hall: e.hall,
      category: e.category,
      subCategory: e.subCategory,
      logo: e.logo,
    })),
    agenda: data.agenda.map((a) => ({
      date: a.date,
      day: a.day,
      dayLabel: a.dayLabel,
      theme: a.theme,
      description: a.description,
      sessionCount: a.sessionCount,
      venues: a.venues,
    })),
    events: data.events.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      dates: e.dates,
      venue: e.venue,
    })),
  };

  return NextResponse.json(cardData, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
