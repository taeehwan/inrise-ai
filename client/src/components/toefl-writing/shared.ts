export interface WritingTest {
  id: string;
  title: string;
  type: "integrated" | "discussion";
  readingPassage?: string;
  listeningScript?: string;
  discussionTopic?: string;
  studentOpinions?: Array<{
    name: string;
    opinion: string;
    avatar: string;
  }>;
  timeLimit: number;
  readingTime?: number;
}

export type WritingSelectionType = "integrated" | "discussion" | null;
