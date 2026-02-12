"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  X,
} from "lucide-react";
import type {
  CardData,
  CardSession,
  MatchedEntity,
} from "@/lib/entity-lookup";
import { SessionCard } from "./cards/SessionCard";

// Display labels for session tags (skip "main-summit-session" since it's a type, not topic)
const TAG_LABELS: Record<string, string> = {
  governance: "Governance",
  "ai-governance": "AI Governance",
  startup: "Startups",
  compute: "Compute",
  "ai-safety": "AI Safety",
  infrastructure: "Infrastructure",
  education: "Education",
  research: "Research",
  healthcare: "Healthcare",
  energy: "Energy",
  investment: "Investment",
  defense: "Defense",
  finance: "Finance",
  "open-source": "Open Source",
  agriculture: "Agriculture",
  "computer-vision": "Computer Vision",
  llm: "LLMs",
  nlp: "NLP",
  robotics: "Robotics",
};

const QUICK_PROMPTS = [
  "Recommend sessions for me",
  "Who are the keynote speakers?",
  "Show me AI startups at the expo",
  "Where can I meet investors?",
];

interface EventFeedProps {
  cardData: CardData;
  onEntityTap: (entity: MatchedEntity) => void;
  onAskAI: (prompt: string) => void;
  onSetProfile: () => void;
  hasProfile: boolean;
}

export function EventFeed({
  cardData,
  onEntityTap,
  onAskAI,
  onSetProfile,
  hasProfile,
}: EventFeedProps) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  // Collect unique tags from sessions (excluding "main-summit-session")
  const { availableTags, tagCounts } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of cardData.sessions) {
      for (const t of s.tags) {
        if (t !== "main-summit-session" && TAG_LABELS[t]) {
          counts.set(t, (counts.get(t) || 0) + 1);
        }
      }
    }
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    return { availableTags: sorted, tagCounts: counts };
  }, [cardData.sessions]);

  // Filter sessions by selected tag
  const filterByTag = (sessions: CardSession[]): CardSession[] => {
    if (!selectedTag) return sessions;
    return sessions.filter((s) => s.tags.includes(selectedTag));
  };

  // Group sessions by time slot for the selected day
  const timeSlots = useMemo(() => {
    const daySessions = filterByTag(
      cardData.sessions.filter((s) => s.day === selectedDay)
    );

    const grouped = new Map<string, CardSession[]>();
    for (const s of daySessions) {
      const time = s.startTime || "TBD";
      if (!grouped.has(time)) grouped.set(time, []);
      grouped.get(time)!.push(s);
    }

    return Array.from(grouped.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardData.sessions, selectedDay, selectedTag]);

  const totalFiltered = timeSlots.reduce((sum, [, s]) => sum + s.length, 0);
  const currentAgenda = cardData.agenda.find((a) => a.day === selectedDay);

  const toggleSlot = (time: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(time)) next.delete(time);
      else next.add(time);
      return next;
    });
  };

  const handleTagClick = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
      setExpandedSlots(new Set());
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Sparkles size={24} />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          India AI Impact Summit 2026
        </h2>
        <div className="mt-1.5 flex items-center justify-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar size={11} /> Feb 16–20
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={11} /> Bharat Mandapam
          </span>
          <span className="flex items-center gap-1">
            <Users size={11} /> 35,000+
          </span>
        </div>
      </div>

      {/* Profile nudge */}
      {!hasProfile && (
        <button
          onClick={onSetProfile}
          className="mt-4 mx-auto flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-2 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <User size={12} />
          Set your profile for personalized picks
        </button>
      )}

      {/* Topic Filters */}
      {availableTags.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => {
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {TAG_LABELS[tag] || tag}
                  <span className={`text-[9px] ${isActive ? "text-white/70" : "text-zinc-400 dark:text-zinc-500"}`}>
                    {tagCounts.get(tag) || 0}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedTag && (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5">
              <p className="flex-1 text-[11px] text-blue-700 dark:text-blue-300">
                Showing <span className="font-semibold">{TAG_LABELS[selectedTag] || selectedTag}</span> sessions
              </p>
              <button
                onClick={() => setSelectedTag(null)}
                className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Day Tabs - Sticky */}
      <div className="sticky top-0 z-10 -mx-4 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 pt-3 pb-2">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "4px" }}>
          {cardData.agenda.map((day) => (
            <button
              key={day.day}
              onClick={() => {
                setSelectedDay(day.day);
                setExpandedSlots(new Set());
              }}
              className={`rounded-lg px-2 py-2 text-center transition-colors ${
                selectedDay === day.day
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              <div className="text-[10px] font-medium">
                {day.date.split("-")[2]}{" "}
                {new Date(day.date + "T00:00:00").toLocaleString("en", {
                  month: "short",
                })}
              </div>
              <div className="text-[10px] opacity-75 truncate">
                Day {day.day}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Day Header */}
      {currentAgenda && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {currentAgenda.theme}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
            {currentAgenda.description}
          </p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
            <span>
              {selectedTag ? `${totalFiltered} matching` : currentAgenda.sessionCount} sessions
            </span>
            <span>{currentAgenda.venues.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Sessions by time slot */}
      <div className="mt-4 space-y-4">
        {timeSlots.length === 0 && selectedTag && (
          <div className="py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No {TAG_LABELS[selectedTag] || selectedTag} sessions on Day {selectedDay}.
            <br />
            <button
              onClick={() => setSelectedTag(null)}
              className="mt-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
            >
              Show all sessions
            </button>
          </div>
        )}
        {timeSlots.map(([time, sessions]) => {
          const isExpanded = expandedSlots.has(time);
          const visibleCount = 3;
          const shown = isExpanded
            ? sessions
            : sessions.slice(0, visibleCount);
          const hiddenCount = sessions.length - visibleCount;

          return (
            <div key={time}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {time}
                </span>
                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-[10px] text-zinc-400">
                  {sessions.length} session{sessions.length !== 1 && "s"}
                </span>
              </div>

              {shown.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onTap={() =>
                    onEntityTap({ type: "session", data: session })
                  }
                  onAskAI={onAskAI}
                />
              ))}

              {hiddenCount > 0 && (
                <button
                  onClick={() => toggleSlot(time)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp size={14} />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} />
                      Show {hiddenCount} more
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick prompts */}
      <div className="mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <p className="mb-2 text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider text-center">
          Or ask me anything
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onAskAI(prompt)}
              className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
