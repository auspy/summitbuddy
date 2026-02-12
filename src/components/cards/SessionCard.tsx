import {
  Calendar,
  MapPin,
  Users,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import type { CardSession } from "@/lib/entity-lookup";

const DAY_LABELS: Record<number, string> = {
  1: "Day 1",
  2: "Day 2",
  3: "Day 3",
  4: "Day 4",
  5: "Day 5",
};

function formatDate(date: string, day: number): string {
  const d = new Date(date + "T00:00:00");
  const month = d.toLocaleString("en-IN", { month: "short" });
  const dayNum = d.getDate();
  return `${month} ${dayNum} (${DAY_LABELS[day] || ""})`;
}

export function SessionCard({
  session,
  onTap,
  onAskAI,
}: {
  session: CardSession;
  onTap: () => void;
  onAskAI?: (prompt: string) => void;
}) {
  const timeStr = [session.startTime, session.endTime]
    .filter(Boolean)
    .join("–");
  const speakerNames = session.speakers.map((s) => s.name).join(", ");

  return (
    <div className="my-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 transition-colors">
      <button
        onClick={onTap}
        className="w-full p-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-t-xl transition-colors"
      >
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
          {session.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {(session.date || timeStr) && (
            <span className="flex items-center gap-1">
              <Calendar size={11} className="flex-shrink-0" />
              {formatDate(session.date, session.day)}
              {timeStr && `, ${timeStr}`}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin size={11} className="flex-shrink-0" />
            {session.hall || session.venue}
          </span>
        </div>
        {speakerNames && (
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Users size={11} className="flex-shrink-0" />
            <span className="truncate">{speakerNames}</span>
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1">
          <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
            {session.type === "Main Summit Session" ? "Main" : session.type}
          </span>
          {session.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      </button>
      <div className="flex items-center gap-1 border-t border-zinc-100 dark:border-zinc-700/40 px-2 py-1.5">
        {onAskAI && (
          <button
            onClick={() =>
              onAskAI(`Tell me more about the session "${session.title}"`)
            }
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <MessageCircle size={12} />
            Ask AI
          </button>
        )}
        <a
          href="https://impact.indiaai.gov.in/agenda"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          <ExternalLink size={12} />
          Official Site
        </a>
      </div>
    </div>
  );
}
