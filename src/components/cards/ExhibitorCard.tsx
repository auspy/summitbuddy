import { MessageCircle, ExternalLink } from "lucide-react";
import type { CardExhibitor } from "@/lib/entity-lookup";

const CATEGORY_COLORS: Record<string, string> = {
  Startup:
    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  Corporate:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  Government:
    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  Research:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  Academia:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  "Country Pavilion":
    "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
};

export function ExhibitorCard({
  exhibitor,
  onTap,
  onAskAI,
}: {
  exhibitor: CardExhibitor;
  onTap: () => void;
  onAskAI?: (prompt: string) => void;
}) {
  const colorClass =
    CATEGORY_COLORS[exhibitor.category] ||
    "bg-zinc-100 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400";

  return (
    <div className="my-1.5 w-full rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white dark:bg-zinc-800/50 transition-colors">
      <button
        onClick={onTap}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-blue-50/50 dark:hover:bg-blue-900/10 rounded-t-xl transition-colors"
      >
        {exhibitor.logo ? (
          <img
            src={exhibitor.logo}
            alt={exhibitor.name}
            className="h-10 w-10 flex-shrink-0 rounded-lg object-contain bg-white dark:bg-zinc-800 p-0.5"
          />
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-200 dark:bg-zinc-700 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {exhibitor.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {exhibitor.name}
          </p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Hall {exhibitor.hall}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${colorClass}`}
            >
              {exhibitor.category}
            </span>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1 border-t border-zinc-100 dark:border-zinc-700/40 px-2 py-1.5">
        {onAskAI && (
          <button
            onClick={() =>
              onAskAI(`Tell me more about exhibitor "${exhibitor.name}"`)
            }
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <MessageCircle size={12} />
            Ask AI
          </button>
        )}
        <a
          href="https://www.impactexpo.indiaai.gov.in/list-of-exhibitors"
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
