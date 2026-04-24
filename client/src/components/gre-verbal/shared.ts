export interface GreVerbalQuestion {
  id: string;
  type:
    | "reading_comprehension"
    | "text_completion"
    | "sentence_equivalence"
    | "sentence_selection"
    | "select_all_that_apply";
  passage?: string;
  question: string;
  direction?: string;
  options:
    | string[]
    | {
        blank1?: string[];
        blank2?: string[];
        blank3?: string[];
      };
  correctAnswer: string | string[];
  explanation: string;
  blanks?: number;
  sentences?: string[];
}

export type GreVerbalAnswer = string | string[] | Record<string, string>;
