"use client";

import { useState, useEffect, useCallback } from "react";

export interface CardSession {
  id: string;
  title: string;
  date: string;
  day: number;
  startTime?: string;
  endTime?: string;
  venue: string;
  hall?: string;
  type: string;
  speakers: { name: string; role?: string }[];
  tags: string[];
  description: string;
}

export interface CardSpeaker {
  id: string;
  name: string;
  title?: string;
  photoUrl?: string;
  sessions: string[];
  tags: string[];
}

export interface CardExhibitor {
  id: string;
  name: string;
  hall: string;
  category: string;
  subCategory?: string;
  logo: string;
}

export interface CardAgendaDay {
  date: string;
  day: number;
  dayLabel: string;
  theme: string;
  description: string;
  sessionCount: number;
  venues: string[];
}

export interface CardFlagshipEvent {
  id: string;
  name: string;
  description: string;
  dates?: string;
  venue?: string;
}

export interface CardData {
  sessions: CardSession[];
  speakers: CardSpeaker[];
  exhibitors: CardExhibitor[];
  agenda: CardAgendaDay[];
  events: CardFlagshipEvent[];
}

export type MatchedEntity =
  | { type: "session"; data: CardSession }
  | { type: "speaker"; data: CardSpeaker }
  | { type: "exhibitor"; data: CardExhibitor };

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Scans full response text and finds all entities mentioned in it.
 * Returns deduplicated matches ordered by first appearance.
 */
class EntityIndex {
  private sessions: { norm: string; truncNorm: string; entity: MatchedEntity }[] = [];
  private speakers: { norm: string; entity: MatchedEntity }[] = [];
  private exhibitors: { norm: string; entity: MatchedEntity }[] = [];

  constructor(data: CardData) {
    for (const s of data.sessions) {
      const norm = normalize(s.title);
      const entity: MatchedEntity = { type: "session", data: s };
      // Also store truncated version (system prompt truncates at 80 chars)
      const truncNorm =
        s.title.length > 80
          ? normalize(s.title.substring(0, 77))
          : norm;
      this.sessions.push({ norm, truncNorm, entity });
    }

    for (const s of data.speakers) {
      const norm = normalize(s.name);
      this.speakers.push({ norm, entity: { type: "speaker", data: s } });
    }

    for (const e of data.exhibitors) {
      const norm = normalize(e.name);
      this.exhibitors.push({ norm, entity: { type: "exhibitor", data: e } });
    }
  }

  /**
   * Scan response text for all entity mentions.
   * Sessions: match if ≥30 consecutive chars of a title appear in text.
   * Speakers: match if full name (≥2 words) appears in text.
   * Exhibitors: match if full name (≥6 chars) appears in text.
   */
  findInText(text: string): MatchedEntity[] {
    const norm = normalize(text);
    const seen = new Set<string>();
    const results: { entity: MatchedEntity; pos: number }[] = [];

    // Sessions — match on truncated title (≥30 chars) or full title
    for (const s of this.sessions) {
      // Use truncated version for matching (shorter = more likely to appear)
      const matchStr = s.truncNorm.length > 30 ? s.truncNorm.substring(0, 30) : s.truncNorm;
      if (matchStr.length >= 25) {
        const pos = norm.indexOf(matchStr);
        if (pos !== -1 && !seen.has(s.entity.data.id)) {
          seen.add(s.entity.data.id);
          results.push({ entity: s.entity, pos });
        }
      }
    }

    // Speakers — full name must appear
    for (const s of this.speakers) {
      // Skip single-word names or very short names to avoid false positives
      if (s.norm.length < 6 || !s.norm.includes(" ")) continue;
      const pos = norm.indexOf(s.norm);
      if (pos !== -1 && !seen.has(s.entity.data.id)) {
        seen.add(s.entity.data.id);
        results.push({ entity: s.entity, pos });
      }
    }

    // Exhibitors — full name must appear, skip very short names
    for (const e of this.exhibitors) {
      if (e.norm.length < 6) continue;
      const pos = norm.indexOf(e.norm);
      if (pos !== -1 && !seen.has(e.entity.data.id)) {
        seen.add(e.entity.data.id);
        results.push({ entity: e.entity, pos });
      }
    }

    // Sort by position in text (first mentioned first)
    results.sort((a, b) => a.pos - b.pos);
    return results.map((r) => r.entity);
  }
}

export function useEntityLookup() {
  const [data, setData] = useState<CardData | null>(null);
  const [index, setIndex] = useState<EntityIndex | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d: CardData) => {
        setData(d);
        setIndex(new EntityIndex(d));
      })
      .catch(console.error);
  }, []);

  const findEntities = useCallback(
    (text: string): MatchedEntity[] => {
      if (!index) return [];
      return index.findInText(text);
    },
    [index]
  );

  return { data, findEntities, ready: !!index };
}
