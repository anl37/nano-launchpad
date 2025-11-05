import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConnectionProfile, MeetPlan } from '@/types/connection';

export type MeetingType = 'SURPRISE' | 'DIRECT';
export type MeetingStatus = 'idle' | 'pending' | 'active' | 'ending' | 'ended';
export type EndSource = 'manual' | 'auto' | 'timeout';

export interface Meeting {
  id: string;
  sessionId: string;
  type: MeetingType;
  userName: string;
  meetCode: string;
  startedAt: Date;
  spaceName?: string;
  venue?: string;
  landmark?: string;
  sharedEmojiCode?: string;
  status: MeetingStatus;
}

interface MeetingContextValue {
  currentMeeting: Meeting | null;
  recentMeetings: Meeting[];
  connections: ConnectionProfile[];
  plans: MeetPlan[];
  startMeeting: (meeting: Omit<Meeting, 'status'>) => void;
  endMeeting: (source: EndSource) => void;
  clearMeeting: () => void;
  addOrUpdateConnection: (userId: string, name: string, interests: string[]) => void;
  addPlan: (plan: MeetPlan) => void;
}

const MeetingContext = createContext<MeetingContextValue | undefined>(undefined);

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (!context) {
    throw new Error('useMeeting must be used within MeetingProvider');
  }
  return context;
};

interface MeetingProviderProps {
  children: ReactNode;
  onMeetingEnd?: (meeting: Meeting, source: EndSource) => void;
}

export const MeetingProvider = ({ children, onMeetingEnd }: MeetingProviderProps) => {
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [connections, setConnections] = useState<ConnectionProfile[]>([
    // Mock data for testing
    {
      userId: "alex-123",
      name: "Alex",
      interests: ["coffee", "reading", "art"],
      lastMetAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      meetHistory: [
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      ],
      emojiSignature: "☕",
    },
    {
      userId: "jessica-456",
      name: "Jessica",
      interests: ["yoga", "nature", "tea"],
      lastMetAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      meetHistory: [
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      ],
      emojiSignature: "🧘",
    },
    {
      userId: "sam-789",
      name: "Sam",
      interests: ["music", "beer", "food"],
      lastMetAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      meetHistory: [
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      ],
      emojiSignature: "🎵",
    },
  ]);
  const [plans, setPlans] = useState<MeetPlan[]>([]);

  const startMeeting = useCallback((meeting: Omit<Meeting, 'status'>) => {
    setCurrentMeeting({
      ...meeting,
      status: 'active',
    });
  }, []);

  const endMeeting = useCallback((source: EndSource) => {
    if (!currentMeeting) return;

    const endedMeeting: Meeting = {
      ...currentMeeting,
      status: 'ended',
    };

    setCurrentMeeting(endedMeeting);
    
    // Add to recent meetings (keep last 5)
    setRecentMeetings(prev => [endedMeeting, ...prev].slice(0, 5));
    
    // Trigger the end callback (opens feedback modal)
    onMeetingEnd?.(endedMeeting, source);
  }, [currentMeeting, onMeetingEnd]);

  const clearMeeting = useCallback(() => {
    setCurrentMeeting(null);
  }, []);

  const addOrUpdateConnection = useCallback((userId: string, name: string, interests: string[]) => {
    setConnections(prev => {
      const existingIndex = prev.findIndex(c => c.userId === userId);
      const now = new Date();

      if (existingIndex >= 0) {
        // Update existing connection
        const updated = [...prev];
        const existing = updated[existingIndex];
        updated[existingIndex] = {
          ...existing,
          lastMetAt: now,
          meetHistory: [...existing.meetHistory, now],
        };
        // Move to top
        const [connection] = updated.splice(existingIndex, 1);
        return [connection, ...updated];
      } else {
        // Add new connection at top
        return [{
          userId,
          name,
          interests,
          lastMetAt: now,
          meetHistory: [now],
        }, ...prev];
      }
    });
  }, []);

  const addPlan = useCallback((plan: MeetPlan) => {
    setPlans(prev => [plan, ...prev]);
  }, []);

  return (
    <MeetingContext.Provider
      value={{
        currentMeeting,
        recentMeetings,
        connections,
        plans,
        startMeeting,
        endMeeting,
        clearMeeting,
        addOrUpdateConnection,
        addPlan,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};
