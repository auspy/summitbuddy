import {
  X,
  Calendar,
  MapPin,
  Users,
  Tag,
  Building2,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import type {
  MatchedEntity,
  CardData,
  CardSession,
  CardSpeaker,
  CardExhibitor,
} from "@/lib/entity-lookup";

export function DetailSheet({
  entity,
  data,
  onClose,
  onNavigate,
  onAskAI,
}: {
  entity: MatchedEntity;
  data: CardData | null;
  onClose: () => void;
  onNavigate: (entity: MatchedEntity) => void;
  onAskAI?: (prompt: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-900 shadow-2xl animate-slide-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3 rounded-t-2xl">
          <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            {entity.type}
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {entity.type === "session" && (
            <SessionDetail
              session={entity.data}
              allSpeakers={data?.speakers || []}
              onNavigate={onNavigate}
            />
          )}
          {entity.type === "speaker" && (
            <SpeakerDetail
              speaker={entity.data}
              allSessions={data?.sessions || []}
              onNavigate={onNavigate}
            />
          )}
          {entity.type === "exhibitor" && (
            <ExhibitorDetail exhibitor={entity.data} />
          )}
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
          {onAskAI && (
            <button
              onClick={() => {
                const name =
                  entity.type === "session"
                    ? `the session "${entity.data.title}"`
                    : entity.type === "speaker"
                      ? `speaker ${entity.data.name}`
                      : `exhibitor "${entity.data.name}"`;
                onAskAI(`Tell me more about ${name}`);
                onClose();
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <MessageCircle size={14} />
              Ask AI
            </button>
          )}
          <a
            href={
              entity.type === "exhibitor"
                ? "https://www.impactexpo.indiaai.gov.in/list-of-exhibitors"
                : entity.type === "speaker"
                  ? "https://impact.indiaai.gov.in/speakers"
                  : "https://impact.indiaai.gov.in/agenda"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ExternalLink size={14} />
            Official Site
          </a>
        </div>
      </div>
    </div>
  );
}

function SessionDetail({
  session,
  allSpeakers,
  onNavigate,
}: {
  session: CardSession;
  allSpeakers: CardSpeaker[];
  onNavigate: (entity: MatchedEntity) => void;
}) {
  const timeStr = [session.startTime, session.endTime]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {session.title}
      </h2>

      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="flex-shrink-0 text-blue-500" />
          <span>
            {session.date}
            {timeStr && ` · ${timeStr}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="flex-shrink-0 text-blue-500" />
          <span>
            {session.venue}
            {session.hall && ` · ${session.hall}`}
          </span>
        </div>
        {session.speakers.length > 0 && (
          <div className="flex items-start gap-2">
            <Users size={14} className="mt-0.5 flex-shrink-0 text-blue-500" />
            <div className="flex flex-wrap gap-1">
              {session.speakers.map((sp) => {
                const fullSpeaker = allSpeakers.find(
                  (s) => s.name.toLowerCase() === sp.name.toLowerCase()
                );
                if (fullSpeaker) {
                  return (
                    <button
                      key={sp.name}
                      onClick={() =>
                        onNavigate({ type: "speaker", data: fullSpeaker })
                      }
                      className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      {sp.name}
                    </button>
                  );
                }
                return (
                  <span
                    key={sp.name}
                    className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    {sp.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {session.description && (
        <div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {session.description}
          </p>
        </div>
      )}

      {session.tags.length > 0 && (
        <div className="flex items-start gap-2">
          <Tag size={14} className="mt-0.5 flex-shrink-0 text-zinc-400" />
          <div className="flex flex-wrap gap-1">
            {session.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakerDetail({
  speaker,
  allSessions,
  onNavigate,
}: {
  speaker: CardSpeaker;
  allSessions: CardSession[];
  onNavigate: (entity: MatchedEntity) => void;
}) {
  const speakerSessions = allSessions.filter((s) =>
    s.speakers.some(
      (sp) => sp.name.toLowerCase() === speaker.name.toLowerCase()
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {speaker.photoUrl ? (
          <img
            src={speaker.photoUrl}
            alt={speaker.name}
            className="h-16 w-16 flex-shrink-0 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xl font-medium text-zinc-500 dark:text-zinc-400">
            {speaker.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {speaker.name}
          </h2>
          {speaker.title && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {speaker.title}
            </p>
          )}
        </div>
      </div>

      {speaker.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {speaker.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 dark:bg-zinc-700/50 px-2 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {speakerSessions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Sessions ({speakerSessions.length})
          </h3>
          <div className="space-y-1.5">
            {speakerSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onNavigate({ type: "session", data: s })}
                className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <Calendar
                  size={12}
                  className="mt-0.5 flex-shrink-0 text-zinc-400"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 leading-snug">
                    {s.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.date} {s.startTime && `· ${s.startTime}`} ·{" "}
                    {s.hall || s.venue}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExhibitorDetail({
  exhibitor,
}: {
  exhibitor: CardExhibitor;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {exhibitor.logo ? (
          <img
            src={exhibitor.logo}
            alt={exhibitor.name}
            className="h-16 w-16 flex-shrink-0 rounded-xl object-contain bg-white dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-200 dark:bg-zinc-700 text-lg font-medium text-zinc-500 dark:text-zinc-400">
            {exhibitor.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {exhibitor.name}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {exhibitor.category}
            {exhibitor.subCategory && ` · ${exhibitor.subCategory}`}
          </p>
        </div>
      </div>

      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="flex-shrink-0 text-blue-500" />
          <span>Hall {exhibitor.hall}, Bharat Mandapam</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="flex-shrink-0 text-blue-500" />
          <span>AI Impact Expo · Open 10am–6pm daily</span>
        </div>
      </div>
    </div>
  );
}
