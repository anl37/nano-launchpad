export interface ConnectionProfile {
  userId: string;
  name: string;
  interests: string[];
  lastMetAt: Date;
  meetHistory: Date[];
  avatar?: string;
  emojiSignature?: string;
}

export interface VenueSuggestion {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceM: number;
  matchScore: number; // 0-100 based on interest alignment
  tags: string[];
  openNow: boolean;
  opensAt?: { hour: number; minute: number };
  rating?: number;
  description?: string;
  type?: string; // normalized type: coffee, stadium, garden, sight, hangout, restaurant, study, shopping
  landmarks?: string[];
  hours?: {
    weekly?: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', Array<{ open: string; close: string }>>;
    timezone?: string;
    holidayClosedToday?: boolean;
  };
}

export interface WeeklyHeatmap {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface MeetPlan {
  id: string;
  matchName: string;
  place: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  startAt: Date;
  meetCode: string;
  distanceM: number;
  status: "confirmed";
  sharedEmojiCode?: string;
  landmark?: string;
}
