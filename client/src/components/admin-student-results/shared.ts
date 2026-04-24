export interface StudentResult {
  id: string;
  userId: string;
  testId?: string;
  topicId?: string;
  section: string;
  examType: string;
  score?: number | null;
  feedback?: string | null;
  transcription?: string | null;
  essayText?: string | null;
  recordingUrl?: string | null;
  status?: string;
  timeSpent?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
  userName: string;
  userEmail: string;
  answers?: any;
  resultType?: string;
  questionContent?: string;
  questionType?: string;
  userAnswer?: string;
  testType?: string;
}

export interface StudentMessageDraftState {
  subject: string;
  body: string;
}
