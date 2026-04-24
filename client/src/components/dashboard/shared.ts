import type { Dispatch, SetStateAction } from "react";
import type { Test, TestAttempt } from "@shared/schema";

export interface SavedExplanation {
  id: string;
  type: "explanation" | "feedback";
  section: string;
  questionText: string;
  content: any;
  createdAt: string;
}

export interface FeedbackRequest {
  id: string;
  testType: string;
  questionType: string;
  status: "pending" | "approved" | "rejected";
  totalScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardResultsSectionProps {
  completedAttempts: TestAttempt[];
  tests: Test[];
  toeflAttempts: TestAttempt[];
  greAttempts: TestAttempt[];
  satAttempts: TestAttempt[];
  averageScore: number;
  totalTimeSpent: number;
}

export interface DashboardFeedbackSectionProps {
  feedbackRequests: FeedbackRequest[];
  pendingRequests: FeedbackRequest[];
  approvedRequests: FeedbackRequest[];
  savedExplanations: SavedExplanation[];
  explanationTab: string;
  expandedExplanation: string | null;
  setExplanationTab: Dispatch<SetStateAction<string>>;
  setExpandedExplanation: Dispatch<SetStateAction<string | null>>;
}
