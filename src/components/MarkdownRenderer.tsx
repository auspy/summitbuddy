"use client";

import ReactMarkdown, { Components } from "react-markdown";
import { Calendar, MapPin, Users } from "lucide-react";
import type { MatchedEntity } from "@/lib/entity-lookup";
import { SessionCard } from "./cards/SessionCard";
import { SpeakerCard } from "./cards/SpeakerCard";
import { ExhibitorCard } from "./cards/ExhibitorCard";
import type { ReactNode } from "react";

interface MarkdownRendererProps {
  content: string;
  entities: MatchedEntity[];
  onEntityTap: (entity: MatchedEntity) => void;
  onAskAI?: (prompt: string) => void;
}

function getTextContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getTextContent(
      (children as { props: { children?: ReactNode } }).props.children
    );
  }
  return "";
}

const components: Components = {
  h3({ children }) {
    const text = getTextContent(children);
    const lower = text.toLowerCase();
    let Icon = null;
    if (
      lower.includes("day") ||
      lower.includes("feb") ||
      lower.includes("schedule") ||
      lower.includes("date")
    ) {
      Icon = Calendar;
    } else if (
      lower.includes("venue") ||
      lower.includes("hall") ||
      lower.includes("location")
    ) {
      Icon = MapPin;
    } else if (lower.includes("speaker") || lower.includes("panelist")) {
      Icon = Users;
    }

    return (
      <h3 className="mt-4 mb-2 flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {Icon && <Icon size={14} className="text-blue-500 flex-shrink-0" />}
        {children}
      </h3>
    );
  },

  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full text-xs">{children}</table>
      </div>
    );
  },

  thead({ children }) {
    return (
      <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
        {children}
      </thead>
    );
  },

  th({ children }) {
    return (
      <th className="px-3 py-2 text-left font-medium">{children}</th>
    );
  },

  td({ children }) {
    return (
      <td className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-2">
        {children}
      </td>
    );
  },

  code({ children, className }) {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded-full bg-zinc-100 dark:bg-zinc-700/50 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 font-normal">
        {children}
      </code>
    );
  },

  li({ children }) {
    return <li className="my-0.5 text-sm leading-relaxed">{children}</li>;
  },

  p({ children }) {
    return <p className="my-1.5 text-sm leading-relaxed">{children}</p>;
  },

  ul({ children }) {
    return <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>;
  },

  ol({ children }) {
    return (
      <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>
    );
  },
};

export function MarkdownRenderer({
  content,
  entities,
  onEntityTap,
  onAskAI,
}: MarkdownRendererProps) {
  return (
    <div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown components={components}>{content}</ReactMarkdown>
      </div>

      {entities.length > 0 && (
        <div className="mt-3 border-t border-zinc-200/60 dark:border-zinc-700/40 pt-2">
          {entities.map((entity) => {
            if (entity.type === "session") {
              return (
                <SessionCard
                  key={entity.data.id}
                  session={entity.data}
                  onTap={() => onEntityTap(entity)}
                  onAskAI={onAskAI}
                />
              );
            }
            if (entity.type === "speaker") {
              return (
                <SpeakerCard
                  key={entity.data.id}
                  speaker={entity.data}
                  onTap={() => onEntityTap(entity)}
                  onAskAI={onAskAI}
                />
              );
            }
            if (entity.type === "exhibitor") {
              return (
                <ExhibitorCard
                  key={entity.data.id}
                  exhibitor={entity.data}
                  onTap={() => onEntityTap(entity)}
                  onAskAI={onAskAI}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}
