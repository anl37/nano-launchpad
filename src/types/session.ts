export interface Session {
  id: string;
  users: [string, string];
  spaceId: string;
  status: 'pending' | 'accepted' | 'talking' | 'idle' | 'completed';
  state: 'awaitingIcebreaker' | 'talking' | 'nextUpExploring' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IcebreakerSession {
  sessionId: string;
  currentQuestionIndex: number;
  questions: string[];
  lastShuffledAt: Date;
}

export interface SafetySession {
  id: string;
  sessionId: string;
  users: [string, string];
  status: 'armed' | 'disarmed';
  armedAt: Date;
  disarmedAt?: Date;
  lastCheckinAt?: Date;
  localeEmergency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SOSEvent {
  id: string;
  meetPlanId: string;
  userId: string;
  triggeredAt: Date;
  action: 'openDialer' | 'callConfirmed';
  numberDialed: string;
  locationSnap?: { lat: number; lng: number; accuracyM: number };
  resolvedAt?: Date;
  resolution?: 'userSafe' | 'unknown';
}

export interface SafetySettings {
  enableCheckins: boolean;
  preferredEmergencyNumber?: string;
}

export const mockIcebreakers = [
  "What brought you here today — routine or trying something new?",
  "Morning person or night owl for this?",
  "Two truths and a tiny lie?",
  "If we have 15 mins later: coffee or short walk?",
  "What's your go-to spot around here?",
  "Best thing you discovered this week?",
  "Indoor workout or outdoor adventure?",
  "Weekend plans or going with the flow?",
  "Guilty pleasure podcast or playlist?",
  "Early bird coffee or afternoon pick-me-up?",
  "Current obsession or long-time hobby?",
  "Dream collaboration or solo project?",
  "What's your favorite thing about this neighborhood?",
  "Book you're reading or show you're watching?",
  "Coffee order says a lot — what's yours?",
];
