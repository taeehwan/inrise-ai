export const SPEAKER_ROLE_LABELS = [
  "Woman",
  "Man",
  "Student",
  "Professor",
  "Narrator",
  "Lecturer",
  "Teacher",
  "Librarian",
  "Assistant",
  "Advisor",
  "Male",
  "Female",
  "Speaker\\s*\\d*",
  "Host",
  "Guest",
  "Interviewer",
  "Interviewee",
  "Dean",
  "Director",
  "Manager",
  "Receptionist",
  "Counselor",
  "Coach",
  "Instructor",
  "Tutor",
  "Mentor",
  "Administrator",
  "Coordinator",
  "Podcast Host",
  "Podcast\\s*Host",
] as const;

export function stripSpeakerLabels(text: string): string {
  const roleLabels = SPEAKER_ROLE_LABELS.join("|");
  const speakerPattern = new RegExp(`^(${roleLabels})(\\s*\\d*)?\\s*:\\s*`, "gim");
  const newlineSpeakerPattern = new RegExp(`\\n(${roleLabels})(\\s*\\d*)?\\s*:\\s*`, "gi");
  const wholeLabelLinePattern = new RegExp(`^\\s*(${roleLabels})(\\s*\\d*)?\\s*:\\s*\\W*\\s*$`, "gim");

  return text
    .replace(wholeLabelLinePattern, "")
    .replace(speakerPattern, "")
    .replace(newlineSpeakerPattern, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();
}

export function stripOptionsFromScript(script: string): string {
  if (!script) return "";

  const optionLinePattern = /^\s*(?:\(?[A-Da-d]\)?[\.\)]\s+|\([A-Da-d]\)\s+|[A-Da-d][\.\)]\s+)/;
  const lines = script.split("\n");
  let candidateStart = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    if (optionLinePattern.test(trimmed)) {
      candidateStart = i;
    } else {
      break;
    }
  }

  if (candidateStart >= 0) {
    const optionLines = lines.slice(candidateStart).filter((line) => line.trim() !== "");
    const optionLetters = optionLines
      .map((line) => {
        const match = line.trim().match(/^\(?([A-Da-d])\)?[\.\)]/);
        return match ? match[1].toUpperCase() : null;
      })
      .filter(Boolean) as string[];
    const hasABC = optionLetters.includes("A") && optionLetters.includes("B") && optionLetters.includes("C");

    if (hasABC) {
      if (candidateStart > 0) {
        const cleaned = lines.slice(0, candidateStart).join("\n").trim();
        if (cleaned.length > 0) return cleaned;
      } else {
        return "";
      }
    }
  }

  const inlinePattern = /\s+(?:A[\.\)]\s+|\(A\)\s+).{3,}?\s+(?:B[\.\)]\s+|\(B\)\s+).{3,}?\s+(?:C[\.\)]\s+|\(C\)\s+).{3,}/;
  const inlineMatch = script.match(inlinePattern);
  if (inlineMatch && inlineMatch.index !== undefined && inlineMatch.index > 10) {
    const cleaned = script.substring(0, inlineMatch.index).trim();
    if (cleaned.length > 0) return cleaned;
  }

  return script;
}

export function stripOptionContentFromText(questionText: string, options: string[]): string {
  if (!questionText || options.length === 0) return questionText;

  const normalizeOpt = (value: string) =>
    value.replace(/^\s*\(?[A-Da-d][.)]\s*/i, "").toLowerCase().replace(/[^\w\s]/g, "").trim();

  const normalizedOptions = options.map(normalizeOpt).filter((option) => option.length > 4);
  const lines = questionText.split("\n");
  const filtered = lines.filter((line) => {
    const normalizedLine = normalizeOpt(line);
    if (normalizedLine.length === 0) return false;
    if (normalizedOptions.some((option) => option === normalizedLine)) return false;

    const lineWords = normalizedLine.split(/\s+/);
    if (lineWords.length >= 2) {
      const lineWordSet = new Set(lineWords);
      if (
        normalizedOptions.some((option) => {
          const optionWords = option.split(/\s+/);
          if (optionWords.length < 3) return false;
          const overlapCount = optionWords.filter((word) => lineWordSet.has(word)).length;
          return overlapCount / optionWords.length >= 0.75;
        })
      ) {
        return false;
      }
    }

    return true;
  });

  return filtered.join("\n").trim();
}

export function buildChooseResponseQuestionText(rawScript: string, options: string[]): string {
  const speakerNames =
    "Woman|Man|Student|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\\s*\\d*|Host|Guest|Interviewer|Interviewee|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\\s*Host";

  const speakerEmptyLabelRe = new RegExp(`^(${speakerNames})\\s*:\\s*\\W*\\s*$`, "i");
  let questionText = rawScript
    .split("\n")
    .filter((line) => !speakerEmptyLabelRe.test(line.trim()))
    .join("\n");

  const speakerPlusOptionRe = new RegExp(`^(${speakerNames})\\s*\\d*\\s*:\\s*\\(?[A-D1-4][.)]`, "i");
  questionText = questionText
    .split("\n")
    .filter((line) => !speakerPlusOptionRe.test(line.trim()))
    .join("\n");

  questionText = stripSpeakerLabels(questionText);
  questionText = questionText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) return false;
      if (/^\(?[A-Da-d1-4][.)]\s+.+/.test(trimmed)) return false;
      if (/^\(?[A-Da-d1-4][.)]\s*$/.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();

  questionText = stripOptionsFromScript(questionText);

  if (options.length > 0) {
    const cleanOptText = (value: string) => value.replace(/^\s*\(?[A-Da-d1-4][.)]\s*/i, "").trim();
    const optTexts = options.map(cleanOptText).filter((option) => option.length > 5);
    questionText = questionText
      .split("\n")
      .map((line) => {
        let result = line;
        for (const optText of optTexts) {
          const lowerLine = result.toLowerCase();
          const lowerOpt = optText.toLowerCase();
          const pos = lowerLine.indexOf(lowerOpt);
          if (pos >= 0 && pos > result.length * 0.3) {
            result = result.substring(0, pos).replace(/\s*\(?[A-Da-d1-4][.\)]\s*$/, "").trim();
          }
        }
        return result;
      })
      .filter((line) => line.trim().length > 0)
      .join("\n")
      .trim();
  }

  questionText = questionText
    .split("\n")
    .map((line) => line.replace(/\s+\(?[A-Da-d][.)]\s+\S.+$/, "").trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();

  questionText = stripOptionContentFromText(questionText, options);
  questionText = questionText.replace(/^question\s*\d+\.?\s*/i, "").trim();
  questionText = questionText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim().toLowerCase();
      if (/^(options|choices|answer\s*choices|the\s+options\s+are|select\s+from|select\s+one)[\s:]*$/i.test(trimmed)) return false;
      if (/^(option|choice)\s*[a-d1-4][\s:.]/i.test(trimmed)) return false;
      return true;
    })
    .join("\n")
    .trim();

  questionText = questionText
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (/^[-•·]\s+.+/.test(trimmed)) {
        const normalize = (value: string) => value.toLowerCase().replace(/[^\w\s]/g, "").trim();
        const normalizedLine = normalize(trimmed.replace(/^[-•·]\s+/, ""));
        if (
          options.some((option) => {
            const normalizedOption = normalize(option.replace(/^\s*\(?[A-Da-d][.)]\s*/i, ""));
            return normalizedOption.length > 4 && (normalizedOption === normalizedLine || (normalizedOption.length > 8 && normalizedLine.includes(normalizedOption)));
          })
        ) {
          return false;
        }
      }
      return true;
    })
    .join("\n")
    .trim();

  const speakerOnlyRe = new RegExp(`^(${speakerNames})\\s*\\d*\\s*:?\\s*\\W*\\s*$`, "i");
  questionText = questionText
    .split("\n")
    .filter((line) => !speakerOnlyRe.test(line.trim()))
    .join("\n")
    .trim();

  questionText = questionText
    .split("\n")
    .filter((line) => !/^\s*[A-Da-d]\s*$/.test(line.trim()))
    .join("\n")
    .trim();

  if (questionText) {
    questionText = stripSpeakerLabels(questionText);
  }

  return questionText || "";
}

export interface DialogueSegment {
  speaker: string;
  text: string;
}

export function parseDialogueSegments(text: string): DialogueSegment[] {
  const rolePattern = SPEAKER_ROLE_LABELS.map((role) => role.replace(/\s+/g, "\\s+")).join("|");
  const linePatternWithText = new RegExp(`^\\s*(${rolePattern})\\s*\\d*\\s*:\\s*(.+)`, "i");
  const linePatternEmpty = new RegExp(`^\\s*(${rolePattern})\\s*\\d*\\s*:\\s*$`, "i");

  const lines = text.split("\n");
  const segments: DialogueSegment[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const line of lines) {
    const matchWithText = line.match(linePatternWithText);
    const matchEmpty = !matchWithText ? line.match(linePatternEmpty) : null;

    if (matchWithText) {
      if (currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = matchWithText[1].trim();
      currentText = matchWithText[2].trim();
    } else if (matchEmpty) {
      if (currentSpeaker && currentText.trim()) {
        segments.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      currentSpeaker = matchEmpty[1].trim();
      currentText = "";
    } else if (currentSpeaker && line.trim()) {
      currentText += ` ${line.trim()}`;
    }
  }

  if (currentSpeaker && currentText.trim()) {
    segments.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return segments;
}

export function getSpeakerGender(speaker: string): "female" | "male" | "unknown" {
  const lower = speaker.toLowerCase().trim();
  const femaleRoles = ["woman", "female", "receptionist", "librarian", "counselor", "coordinator", "hostess"];
  const maleRoles = ["man", "male", "professor", "dean", "director", "host", "interviewer"];
  if (femaleRoles.some((role) => lower.includes(role))) return "female";
  if (maleRoles.some((role) => lower.includes(role))) return "male";
  return "unknown";
}
