import { createRoot } from "react-dom/client";
import { useState } from "react";
import App from "./App.tsx";
import "./index.css";
import { MeetingProvider, Meeting, EndSource, useMeeting } from "./context/MeetingContext";
import { FeedbackModal, FeedbackData } from "./components/FeedbackModal";

function MeetingUI() {
  return (
    <>
    </>
  );
}

function Root() {
  const [feedbackMeeting, setFeedbackMeeting] = useState<Meeting | null>(null);

  const handleMeetingEnd = (meeting: Meeting, source: EndSource) => {
    console.log('Meeting ended:', meeting.id, 'Source:', source);
    setFeedbackMeeting(meeting);
  };

  const handleFeedbackSubmit = (feedback: FeedbackData) => {
    if (!feedbackMeeting) return;
    
    console.log('Feedback submitted for meeting:', feedbackMeeting.id, feedback);
    
    // TODO: Write to Firestore
    // await setDoc(doc(db, 'meetings', feedbackMeeting.id, 'feedback', currentUserId), {
    //   ...feedback,
    //   createdAt: serverTimestamp()
    // });
    
    setFeedbackMeeting(null);
  };

  return (
    <MeetingProvider onMeetingEnd={handleMeetingEnd}>
      <App />
      <MeetingUI />
      <FeedbackModal
        open={!!feedbackMeeting}
        onClose={() => setFeedbackMeeting(null)}
        onSubmit={handleFeedbackSubmit}
        userName={feedbackMeeting?.userName}
      />
    </MeetingProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
