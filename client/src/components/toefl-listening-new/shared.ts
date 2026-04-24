export interface ScriptLine {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface ListeningQuestionItem {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Passage {
  id: string;
  type: "conversation" | "lecture";
  title: string;
  script: ScriptLine[] | string;
  audioUrl: string;
  duration: number;
  image: string;
  questions: ListeningQuestionItem[];
}
