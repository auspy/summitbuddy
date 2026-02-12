import { MessageCircle, ExternalLink } from "lucide-react";
import type { CardSpeaker } from "@/lib/entity-lookup";

export function SpeakerCard({
  speaker,
  onTap,
  onAskAI,
}: {
  speaker: CardSpeaker;
  onTap: () => void;
  onAskAI?: (prompt: string) => void;
}) {
  return (
    <div className="my-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 transition-colors">
      <button
        onClick={onTap}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-t-xl transition-colors"
      >
        {speaker.photoUrl ? (
          <img
            src={speaker.photoUrl}
            alt={speaker.name}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {speaker.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {speaker.name}
          </p>
          {speaker.title && (
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {speaker.title}
            </p>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 border-t border-zinc-100 dark:border-zinc-700/40 px-2 py-1.5">
        {onAskAI && (
          <button
            onClick={() =>
              onAskAI(
                `Tell me more about speaker ${speaker.name}. What sessions are they in?`
              )
            }
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <MessageCircle size={12} />
            Ask AI
          </button>
        )}
        <a
          href="https://impact.indiaai.gov.in/speakers"
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
