"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo, FormEvent } from "react";
import { Send, User, Bot, Sparkles, ChevronDown, X } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { useEntityLookup, type MatchedEntity } from "@/lib/entity-lookup";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { DetailSheet } from "@/components/cards/DetailSheet";
import { EventFeed } from "@/components/EventFeed";

const QUICK_PROMPTS = [
  "Recommend sessions for me",
  "Who are the keynote speakers?",
  "Show me AI startups at the expo",
  "Where can I meet investors?",
];

const ROLES = [
  "Founder / Startup",
  "Researcher / Academic",
  "Investor / VC",
  "Policymaker / Government",
  "Developer / Engineer",
  "Student",
  "Media / Journalist",
  "Corporate Executive",
  "Other",
];

const INTERESTS = [
  "Healthcare AI",
  "Education",
  "AI Safety & Ethics",
  "LLMs & Foundation Models",
  "Startups & Innovation",
  "Policy & Governance",
  "Agriculture",
  "Finance & FinTech",
  "Open Source AI",
  "Compute & Infrastructure",
  "Climate & Energy",
  "Research",
  "Defense & Security",
  "Robotics",
  "NLP & Language",
];

export default function Home() {
  const [profile, setProfile] = useState<UserProfile>({});
  const [showProfile, setShowProfile] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [detailEntity, setDetailEntity] = useState<MatchedEntity | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: cardData, findEntities } = useEntityLookup();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { profile },
      }),
    [profile]
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load profile from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("summit-buddy-profile");
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveProfile = (p: UserProfile) => {
    setProfile(p);
    localStorage.setItem("summit-buddy-profile", JSON.stringify(p));
    setShowProfile(false);
  };

  const handleSend = (text: string) => {
    if (!text.trim() || isLoading) return;
    setInputValue("");
    sendMessage({ text });
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">
                Summit Buddy
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                India AI Impact Summit 2026
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <User size={14} />
            {profile.role ? profile.role : "Set Profile"}
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-messages flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-3xl space-y-4 py-4">
          {messages.length === 0 && cardData && (
            <EventFeed
              cardData={cardData}
              onEntityTap={setDetailEntity}
              onAskAI={handleSend}
              onSetProfile={() => setShowProfile(true)}
              hasProfile={!!profile.role}
            />
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Bot size={16} />
                  </div>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {message.role === "assistant" ? (
                  (() => {
                    const text =
                      message.parts
                        ?.filter((p) => p.type === "text")
                        .map((p) => (p as { type: "text"; text: string }).text)
                        .join("") || "";
                    return (
                      <MarkdownRenderer
                        content={text}
                        entities={findEntities(text)}
                        onEntityTap={setDetailEntity}
                        onAskAI={handleSend}
                      />
                    );
                  })()
                ) : (
                  <span>
                    {message.parts
                      ?.filter((p) => p.type === "text")
                      .map((p) => (p as { type: "text"; text: string }).text)
                      .join("") || ""}
                  </span>
                )}
              </div>
              {message.role === "user" && (
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                    <User size={16} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <X size={16} />
                </div>
              </div>
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error.message?.includes("429")
                  ? "Too many requests — please wait a moment and try again."
                  : "Something went wrong. Please try again."}
              </div>
            </div>
          )}

          {isLoading &&
            !error &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Bot size={16} />
                  </div>
                </div>
                <div className="rounded-2xl bg-zinc-100 dark:bg-zinc-900 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-zinc-400" />
                  </div>
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick prompts (show after messages start) */}
      {messages.length > 0 && messages.length < 4 && !isLoading && (
        <div className="flex-shrink-0 border-t border-zinc-100 dark:border-zinc-800/50 px-4 py-2">
          <div className="mx-auto flex max-w-3xl flex-wrap gap-2">
            {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={`flex-shrink-0 px-4 py-3 transition-colors ${
        messages.length === 0
          ? "bg-blue-600 dark:bg-blue-700"
          : "border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
      }`}>
        {messages.length === 0 && (
          <p className="mx-auto max-w-3xl mb-2 text-[11px] font-medium text-white/80 text-center">
            Ask me anything about the summit
          </p>
        )}
        <form
          onSubmit={handleFormSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={messages.length === 0 ? "Ask Summit Buddy..." : "Ask about sessions, speakers, exhibitors..."}
              className={`w-full rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 ${
                messages.length === 0
                  ? "border-0 bg-white/95 text-zinc-800 placeholder:text-zinc-400 focus:ring-white/50"
                  : "border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-blue-500 focus:border-blue-500"
              }`}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              messages.length === 0
                ? "bg-white text-blue-600 hover:bg-blue-50"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          profile={profile}
          onSave={saveProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Detail Sheet */}
      {detailEntity && (
        <DetailSheet
          entity={detailEntity}
          data={cardData}
          onClose={() => setDetailEntity(null)}
          onNavigate={setDetailEntity}
          onAskAI={handleSend}
        />
      )}
    </div>
  );
}

function ProfileModal({
  profile,
  onSave,
  onClose,
}: {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
  onClose: () => void;
}) {
  const [localProfile, setLocalProfile] = useState<UserProfile>({ ...profile });

  const toggleInterest = (interest: string) => {
    const current = localProfile.interests || [];
    const updated = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];
    setLocalProfile({ ...localProfile, interests: updated });
  };

  const toggleDay = (day: number) => {
    const current = localProfile.days || [];
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    setLocalProfile({ ...localProfile, days: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 rounded-t-2xl">
          <h3 className="text-base font-semibold">Your Profile</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          {/* Role */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Your Role
            </label>
            <div className="relative">
              <select
                value={localProfile.role || ""}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, role: e.target.value })
                }
                className="w-full appearance-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-sm pr-8"
              >
                <option value="">Select your role...</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Interests
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    (localProfile.interests || []).includes(interest)
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Days attending */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Days Attending
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`flex-1 rounded-lg border py-2 text-center text-xs font-medium transition-colors ${
                    (localProfile.days || []).includes(day)
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <div className="text-[10px] text-zinc-400">Feb</div>
                  <div>{15 + day}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Learning", "Networking", "Showcasing", "Policy", "Research"].map(
                (p) => (
                  <button
                    key={p}
                    onClick={() =>
                      setLocalProfile({ ...localProfile, priority: p })
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      localProfile.priority === p
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Organization */}
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Organization
            </label>
            <input
              type="text"
              value={localProfile.organization || ""}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  organization: e.target.value,
                })
              }
              placeholder="Your company or institution"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2.5 text-sm placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
          <button
            onClick={() => onSave(localProfile)}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
