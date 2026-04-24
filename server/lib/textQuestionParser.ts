type ParsedQuestion = {
  id: string;
  questionType: string;
  questionText: string;
  options?: string[];
  correctAnswer?: number;
  explanation?: string;
  scriptIndex?: number;
  points: number;
  passageContent?: string;
  passageId?: string;
  hint?: string;
  blankNumber?: number;
  partialWord?: string;
};

type ParsedPassage = {
  id: string;
  title: string;
  content: string;
};

export function parseQuestionsFromText(questionsText: string, section: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];

  if (!questionsText || !questionsText.trim()) {
    return questions;
  }

  const lines = questionsText.split("\n");
  let currentPassage = "";
  let currentQuestionNum = 0;
  let inPassage = false;
  let currentQuestionLines: string[] = [];
  const questionStartPattern =
    /^(?:What|Why|Which|How|According|The\s+word|The\s+author|All\s+of\s+the\s+following|In\s+the\s+passage)\s/i;

  const instructionPatterns = [
    /^Fill\s+in\s+the\s+missing/i,
    /^Read\s+(?:a\s+)?(?:public\s+)?(?:transit|announcement|email|notice|advisory)/i,
    /^(?:For\s+each|Select\s+one|Choose\s+the|Mark\s+your|Answer\s+the)\s/i,
  ];

  const processQuestionBlock = () => {
    if (currentQuestionLines.length === 0) return;

    const blockText = currentQuestionLines.join("\n");
    const questionData = extractQuestionData(blockText, currentQuestionNum, section);

    if (questionData) {
      if (currentPassage) {
        questionData.passageContent = currentPassage;
      }
      questions.push(questionData);
    }

    currentQuestionLines = [];
  };

  const hasFollowingOptions = (startIdx: number) => {
    for (let j = startIdx + 1; j < Math.min(startIdx + 6, lines.length); j++) {
      const nextLine = lines[j]?.trim();
      if (!nextLine) continue;
      if (/^\(?[A-D]\)?[\)\.\:]\s+/.test(nextLine)) return true;
      if (/^\d+[\.\)]\s*/.test(nextLine)) return false;
    }
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (!trimmedLine) continue;
    if (instructionPatterns.some((pattern) => pattern.test(trimmedLine))) continue;

    if (
      /^\(Questions?\s*\d+/i.test(trimmedLine) ||
      /^Read\s+(?:in\s+)?(?:Daily|an?\s+Academic|an?\s+Email|a\s+Notice)/i.test(trimmedLine) ||
      /^Complete\s+the\s+Words/i.test(trimmedLine)
    ) {
      processQuestionBlock();
      inPassage = true;
      currentPassage = "";
      continue;
    }

    const questionNumMatch = trimmedLine.match(/^(\d+)[\.\)]/);
    const matchesQuestionPattern = questionStartPattern.test(trimmedLine) && !trimmedLine.match(/^\([A-D]\)/);
    const isNewQuestion =
      questionNumMatch || (matchesQuestionPattern && (hasFollowingOptions(i) || currentQuestionLines.length > 0));

    if (questionNumMatch) {
      processQuestionBlock();
      currentQuestionNum = parseInt(questionNumMatch[1], 10);
      inPassage = false;
    } else if (isNewQuestion && currentQuestionLines.length > 0) {
      processQuestionBlock();
      currentQuestionNum++;
      inPassage = false;
    }

    const isOptionLine = /^\(?[A-D]\)?[\)\.\:]\s+/.test(trimmedLine);
    const hasOptions = currentQuestionLines.some((line) => /^\(?[A-D]\)?[\)\.\:]\s+/.test(line));

    if (isOptionLine && currentQuestionLines.length > 0) {
      currentQuestionLines.push(trimmedLine);
    } else if (currentQuestionLines.length > 0 && !isOptionLine) {
      if (!hasOptions) {
        currentQuestionLines.push(trimmedLine);
      } else {
        processQuestionBlock();
        inPassage = true;
        currentPassage += (currentPassage ? "\n" : "") + trimmedLine;
      }
    } else if (inPassage) {
      currentPassage += (currentPassage ? "\n" : "") + trimmedLine;
    } else if (questionNumMatch || questionStartPattern.test(trimmedLine)) {
      currentQuestionLines.push(trimmedLine);
    } else {
      currentPassage += (currentPassage ? "\n" : "") + trimmedLine;
    }
  }

  processQuestionBlock();
  return questions;
}

export function extractQuestionData(blockText: string, questionNum: number, section: string): ParsedQuestion | null {
  const lines = blockText.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return null;

  let questionText = lines[0].replace(/^\d+[\.\)]\s*/, "").trim();
  if (!questionText && lines.length > 1) {
    questionText = lines[1].trim();
  }

  const options: string[] = [];
  let correctAnswer: number | undefined;
  let explanation = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const optionMatch = line.match(/^\(?([A-D])\)?[\.\)]\s*(.+)/i);
    if (optionMatch) {
      const optionLetter = optionMatch[1].toUpperCase();
      const optionText = optionMatch[2].trim();
      const optionIndex = optionLetter.charCodeAt(0) - 65;
      while (options.length <= optionIndex) {
        options.push("");
      }
      options[optionIndex] = optionText;
      continue;
    }

    const answerMatch = line.match(/(?:정답|답|Answer|Correct)\s*[:=]\s*\(?([A-D])\)?/i);
    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase().charCodeAt(0) - 65;
      continue;
    }

    const explanationMatch = line.match(/(?:설명|해설|Explanation)\s*[:=]\s*(.+)/i);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      continue;
    }

    if (explanation && !line.match(/^\(?[A-D]\)?[\.\)]/) && !line.match(/^\d+[\.\)]/)) {
      explanation += ` ${line}`;
    }
  }

  const validOptions = options.filter((option) => option.trim());
  let questionType = "multiple-choice";
  if (validOptions.length === 0) {
    questionType = "essay";
  } else if (questionText.toLowerCase().includes("fill in") || questionText.includes("[")) {
    questionType = "fill-in-blank";
  }

  return {
    id: `q${questionNum || Math.floor(Math.random() * 10000)}`,
    questionType,
    questionText,
    options: validOptions.length > 0 ? validOptions : undefined,
    correctAnswer,
    explanation: explanation || undefined,
    scriptIndex: section === "listening" ? 0 : undefined,
    points: 1,
  };
}

export function parseReadingContentAdvanced(content: string): { passages: ParsedPassage[]; questions: ParsedQuestion[] } {
  const passages: ParsedPassage[] = [];
  const questions: ParsedQuestion[] = [];

  if (!content || !content.trim()) {
    return { passages: [], questions: [] };
  }

  if (content.includes("===QUESTIONS===")) {
    const parts = content.split("===QUESTIONS===");
    const passagePart = parts[0]?.trim() || "";
    const questionsPart = parts[1]?.trim() || "";

    if (passagePart) {
      passages.push({
        id: "passage1",
        title: "Reading Passage",
        content: passagePart,
      });
    }

    const parsedQuestions = parseQuestionsFromText(questionsPart, "reading");
    return { passages, questions: parsedQuestions };
  }

  const lines = content.split("\n");
  let currentSection: { type: string; title: string; content: string[]; questionRange?: string } | null = null;
  const sectionPatterns = {
    completeWords: /^Complete\s+the\s+Words/i,
    questionRange: /^\(Questions?\s*(\d+)(?:\s*[-–]\s*(\d+))?\)/i,
    dailyLife: /^Read\s+(?:in\s+)?Daily\s+Life(?:\s*\(Part\s*(\d+)\))?/i,
    academicPassage: /^Read\s+an?\s+Academic\s+Passage/i,
    readEmail: /^Read\s+an?\s+(?:email|notice|social\s+media|public\s+transit|advisory)/i,
    fillInBlank: /^Fill\s+in\s+the\s+missing\s+(?:letters?|words?|blanks?)/i,
    transitAdvisory: /^Transit\s+Advisory/i,
    universityLibrary: /^University\s+Library/i,
    subjectHeader: /^(?:To|From|Date|Subject)\s*:/i,
    instruction: /^(?:For\s+each|Select\s+one|Choose\s+the|Mark\s+your|Answer\s+the)\s/i,
  };

  const questionStartPatterns = [
    /^(?:What|Why|Which|How|According|The\s+word|The\s+author|All\s+of\s+the\s+following|In\s+the\s+passage)\s/i,
    /^\d+[\.\)]\s*/,
  ];

  let passageIdx = 0;
  let questionIdx = 0;
  let currentPassageContent: string[] = [];
  let currentQuestionBlock: string[] = [];
  let inPassage = false;

  const flushPassage = () => {
    if (currentPassageContent.length === 0) return;
    const passageText = currentPassageContent.join("\n").trim();
    if (passageText) {
      passageIdx++;
      const passageId = `passage${passageIdx}`;
      passages.push({
        id: passageId,
        title: currentSection?.title || `Reading Passage ${passageIdx}`,
        content: passageText,
      });

      if (currentSection?.type === "fill-in-blank") {
        const blankPattern = /([A-Za-z]*(?:_[A-Za-z]*)+)\s*\[(\d+)\]/g;
        let blankMatch;
        while ((blankMatch = blankPattern.exec(passageText)) !== null) {
          const blankWord = blankMatch[1].replace(/\s+/g, "");
          const blankNum = parseInt(blankMatch[2], 10);
          const letters = blankWord.replace(/_/g, "");
          const totalLen = blankWord.length;
          const missingCount = totalLen - letters.length;
          questionIdx++;
          questions.push({
            id: `q${questionIdx}`,
            questionType: "fill-in-blank",
            questionText: `Fill in the missing letters for blank [${blankNum}]: ${blankWord}`,
            hint: `${letters.length} letters given, ${missingCount} missing`,
            blankNumber: blankNum,
            partialWord: blankWord,
            passageId,
            points: 1,
          });
        }
      }
    }
    currentPassageContent = [];
  };

  const flushQuestion = () => {
    if (currentQuestionBlock.length === 0) return;
    const blockText = currentQuestionBlock.join("\n");
    const questionData = extractQuestionData(blockText, questionIdx + 1, "reading");
    if (questionData && questionData.questionText.trim()) {
      questionIdx++;
      questionData.id = `q${questionIdx}`;
      questionData.passageId = passages.length > 0 ? passages[passages.length - 1].id : undefined;
      questions.push(questionData);
    }
    currentQuestionBlock = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    let foundSectionHeader = false;
    const rangeMatch = trimmed.match(sectionPatterns.questionRange);
    if (rangeMatch) {
      flushQuestion();
      foundSectionHeader = true;
      continue;
    }

    if (sectionPatterns.completeWords.test(trimmed) || sectionPatterns.fillInBlank.test(trimmed)) {
      flushQuestion();
      flushPassage();
      currentSection = { type: "fill-in-blank", title: "Complete the Words", content: [] };
      foundSectionHeader = true;
      inPassage = true;
      continue;
    }

    const dailyMatch = trimmed.match(sectionPatterns.dailyLife);
    if (dailyMatch) {
      flushQuestion();
      flushPassage();
      const partNum = dailyMatch[1] || "";
      currentSection = {
        type: "daily-life",
        title: `Read in Daily Life${partNum ? ` (Part ${partNum})` : ""}`,
        content: [],
      };
      foundSectionHeader = true;
      inPassage = true;
      continue;
    }

    if (sectionPatterns.academicPassage.test(trimmed)) {
      flushQuestion();
      flushPassage();
      currentSection = { type: "academic", title: "Read an Academic Passage", content: [] };
      foundSectionHeader = true;
      inPassage = true;
      continue;
    }

    if (sectionPatterns.readEmail.test(trimmed)) {
      if (currentSection && currentPassageContent.length === 0 && currentQuestionBlock.length === 0) {
        continue;
      }
      flushQuestion();
      flushPassage();
      currentSection = { type: "daily-life", title: trimmed.replace(/^Read\s+/i, ""), content: [] };
      foundSectionHeader = true;
      inPassage = true;
      continue;
    }

    if (sectionPatterns.transitAdvisory.test(trimmed) || sectionPatterns.universityLibrary.test(trimmed)) {
      if (!inPassage) {
        flushQuestion();
        inPassage = true;
      }
      currentPassageContent.push(trimmed);
      continue;
    }

    if (sectionPatterns.subjectHeader.test(trimmed)) {
      if (!inPassage) {
        flushQuestion();
        inPassage = true;
      }
      currentPassageContent.push(trimmed);
      continue;
    }

    if (sectionPatterns.instruction.test(trimmed)) continue;
    if (/^Read\s+(?:a\s+)?(?:public\s+)?(?:transit|announcement|email|notice|advisory)/i.test(trimmed)) continue;
    if (foundSectionHeader) continue;

    const isOptionLine = /^\(?[A-D]\)?[\)\.\:]\s+/.test(trimmed);
    const questionNumMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
    const hasFollowingOptions = () => {
      const window = lines.slice(i + 1, Math.min(i + 10, lines.length)).join("\n");
      return (
        /^\(?A\)?[\)\.\:]\s+/im.test(window) &&
        /^\(?B\)?[\)\.\:]\s+/im.test(window) &&
        /^\(?C\)?[\)\.\:]\s+/im.test(window) &&
        /^\(?D\)?[\)\.\:]\s+/im.test(window)
      );
    };

    const matchesQuestionPattern = questionStartPatterns.some((pattern) => pattern.test(trimmed) && !isOptionLine);
    const isQuestionStart = questionNumMatch || (matchesQuestionPattern && (hasFollowingOptions() || !inPassage));
    const activeBlockHasOptions =
      currentQuestionBlock.length > 0 && currentQuestionBlock.some((line) => /^\(?[A-D]\)?[\)\.\:]\s+/.test(line));

    if (questionNumMatch) {
      flushQuestion();
      flushPassage();
      inPassage = false;
      currentQuestionBlock = [trimmed];
    } else if (isOptionLine && currentQuestionBlock.length > 0) {
      currentQuestionBlock.push(trimmed);
    } else if (isQuestionStart && currentQuestionBlock.length === 0) {
      flushPassage();
      inPassage = false;
      currentQuestionBlock = [trimmed];
    } else if (isQuestionStart && activeBlockHasOptions) {
      flushQuestion();
      inPassage = false;
      currentQuestionBlock = [trimmed];
    } else if (currentQuestionBlock.length > 0) {
      if (isOptionLine) {
        currentQuestionBlock.push(trimmed);
      } else if (!activeBlockHasOptions) {
        currentQuestionBlock.push(trimmed);
      } else {
        flushQuestion();
        const nextIsQuestion = questionStartPatterns.some((pattern) => pattern.test(trimmed)) && hasFollowingOptions();
        if (nextIsQuestion) {
          inPassage = false;
          currentQuestionBlock = [trimmed];
        } else {
          inPassage = true;
          currentPassageContent.push(trimmed);
        }
      }
    } else {
      inPassage = true;
      currentPassageContent.push(trimmed);
    }
  }

  flushQuestion();
  flushPassage();

  if (passages.length === 0 && questions.length === 0 && content.trim()) {
    passages.push({
      id: "passage1",
      title: "Reading Passage",
      content: content.trim(),
    });
  }

  return { passages, questions };
}
