export interface Session {
  id: string;
  title: string;
  description: string;
  date: string; // "2026-02-16"
  day: number; // 1-5
  startTime?: string; // "09:00"
  endTime?: string; // "10:30"
  venue: string;
  hall?: string;
  type: string;
  track?: string; // One of the Seven Chakras
  speakers: SpeakerRef[];
  tags: string[];
}

export interface SpeakerRef {
  name: string;
  role?: string;
}

export interface Speaker {
  id: string;
  name: string;
  title?: string;
  organization?: string;
  country?: string;
  photoUrl?: string;
  sessions: string[];
  tags: string[];
}

export interface Exhibitor {
  id: string;
  name: string;
  hall: string;
  sqm: string;
  category: string;
  subCategory?: string;
  logo: string;
}

export interface DaySchedule {
  date: string;
  day: number;
  dayLabel: string;
  theme: string;
  description: string;
  sessionCount: number;
  events: AgendaEvent[];
  venues: string[];
}

export interface AgendaEvent {
  title: string;
  time?: string;
  venue?: string;
  type?: string;
  description?: string;
}

export interface FlagshipEvent {
  id: string;
  name: string;
  description: string;
  dates?: string;
  venue?: string;
  url?: string;
}

export interface WorkingGroup {
  id: string;
  name: string;
  chakraNumber: number;
  description: string;
  coChairs: string[];
  focusAreas: string[];
}

export interface SummitData {
  sessions: Session[];
  speakers: Speaker[];
  exhibitors: Exhibitor[];
  agenda: DaySchedule[];
  events: FlagshipEvent[];
  workingGroups: WorkingGroup[];
}

export interface UserProfile {
  role?: string;
  interests?: string[];
  days?: number[];
  priority?: string;
  organization?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}
