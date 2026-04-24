export interface ParsedGreVerbalQuestion {
  id: string;
  questionType: string;
  questionText: string;
  options: string[] | Record<string, string[]>;
  correctAnswer: string;
  direction?: string;
  selectAll?: boolean;
  passage?: string;
  sentences?: string[];
  blanks?: number;
  orderIndex: number;
  points: number;
}

export function parseGREVerbalText(text: string): ParsedGreVerbalQuestion[] {
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \u00A0]{2,}/g, " "))
    .filter((line) => !/^SECTION\s+\d+\s*\|/i.test(line.trim()))
    .join("\n");

  const questions: ParsedGreVerbalQuestion[] = [];
  const lines = normalizedText.split("\n");
  const passageMap: Map<number, string> = new Map();
  let i = 0;

  const sectionTypeOverride: Map<number, string> = new Map();
  let nextQuestionSelectAll = false;
  let globalDefaultType: string | null = null;

  const isLongPassage = (value: string): boolean => value.trim().split(/\s+/).length >= 200;
  const registerRange = (startQ: number, endQ: number, type: string) => {
    for (let question = startQ; question <= endQ; question++) sectionTypeOverride.set(question, type);
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line || /^_+$/.test(line)) {
      i++;
      continue;
    }

    const seHeaderMatch = line.match(/For\s+(?:each\s+of\s+)?Questions?\s+(\d+)(?:\s+(?:to|and|-)\s+(\d+))?\s*[,.].*select.*two\s+answer/i);
    if (seHeaderMatch) {
      const startQ = parseInt(seHeaderMatch[1], 10);
      const endQ = seHeaderMatch[2] ? parseInt(seHeaderMatch[2], 10) : startQ;
      registerRange(startQ, endQ, "sentence_equivalence");
      i++;
      continue;
    }

    const tcHeaderMatch = line.match(/For\s+(?:each\s+of\s+)?Questions?\s+(\d+)(?:\s+(?:to|and|-)\s+(\d+))?\s*[,.].*select\s+one\s+entry/i);
    if (tcHeaderMatch) {
      const startQ = parseInt(tcHeaderMatch[1], 10);
      const endQ = tcHeaderMatch[2] ? parseInt(tcHeaderMatch[2], 10) : startQ;
      registerRange(startQ, endQ, "text_completion");
      i++;
      continue;
    }

    if (/consider\s+each\s+of\s+the\s+choices\s+separately/i.test(line)) {
      nextQuestionSelectAll = true;
      i++;
      continue;
    }

    if (/For\s+(?:each\s+of\s+)?Questions?\s+\d+.*select\s+one\s+answer\s+choice/i.test(line)) {
      i++;
      continue;
    }

    if (/for\s+each\s+blank\s+select\s+one\s+entry/i.test(line) || /fill\s+all\s+blanks?\s+in\s+the\s+way\s+that\s+best\s+completes/i.test(line)) {
      globalDefaultType = "text_completion";
      i++;
      continue;
    }

    if (!/Questions?\s+\d+/i.test(line) && /select\s+the\s+two\s+answer\s+choices/i.test(line)) {
      globalDefaultType = "sentence_equivalence";
      i++;
      continue;
    }

    const rcMatch = line.match(/Questions?\s+(\d+)(?:\s+(?:to|and|-)\s+(\d+))?\s+(?:is|are)\s+based\s+on\s+the\s+following\s+reading\s+passage/i);
    const passageForMatch = line.match(/Passage\s+for\s+[Qq]uestions?\s+(\d+)(?:\s+(?:to|and|-)\s+(\d+))?/i);
    const passageNMatch = line.match(/^Passage\s+\d+\s*\(Q?(\d+)(?:\s*[-–—]\s*Q?(\d+))?\)/i);

    if (rcMatch || passageForMatch || passageNMatch) {
      let startQ: number;
      let endQ: number;

      if (passageNMatch) {
        startQ = parseInt(passageNMatch[1], 10);
        endQ = passageNMatch[2] ? parseInt(passageNMatch[2], 10) : startQ;
      } else {
        const match = rcMatch || passageForMatch;
        startQ = parseInt(match![1], 10);
        endQ = match![2] ? parseInt(match![2], 10) : startQ;
      }

      for (let question = startQ; question <= endQ; question++) {
        if (!sectionTypeOverride.has(question)) sectionTypeOverride.set(question, "reading_comprehension");
      }

      i++;
      let collectedPassage = "";
      while (i < lines.length && !/^(?:Question|Q)\s*\d+\b/i.test(lines[i])) {
        const passageLine = lines[i].trim();
        if (!passageLine || /^_+$/.test(passageLine)) {
          i++;
          continue;
        }
        if (
          /^Questions?\s+\d+.*based\s+on.*reading\s+passage/i.test(passageLine) ||
          /^Passage\s+for\s+[Qq]uestions?/i.test(passageLine) ||
          /^Passage\s+\d+\s*\(Q?\d+/i.test(passageLine) ||
          /^For\s+(?:each\s+of\s+)?Questions?\s+\d+/i.test(passageLine) ||
          /^For\s+the\s+following\s+question/i.test(passageLine)
        ) {
          break;
        }
        collectedPassage += `${passageLine} `;
        i++;
      }

      const passageText = collectedPassage.trim();
      for (let question = startQ; question <= endQ; question++) {
        passageMap.set(question, passageText);
      }
      continue;
    }

    const questionMatch = line.match(/^(?:Question|Q)\s*(\d+)\b/i);
    if (!questionMatch) {
      i++;
      continue;
    }

    const qNum = parseInt(questionMatch[1], 10);
    let questionType = sectionTypeOverride.get(qNum) || globalDefaultType || "reading_comprehension";

    const isSelectAll = nextQuestionSelectAll;
    nextQuestionSelectAll = false;
    if (isSelectAll && questionType === "reading_comprehension") {
      questionType = "select_all_that_apply";
    }

    let questionText = "";
    let direction = "";
    const options: string[] = [];
    let blanks = 1;
    let detectedPassage = "";
    let blankNumber = 0;
    const blankOptions: Record<string, string[]> = {};
    let currentOption = "";
    let collectingBlankOptions = questionType === "text_completion";
    let collectingOptions = false;
    let directionCaptured = false;
    let questionTextDone = false;
    let questionLineCount = 0;

    if (questionType === "text_completion") {
      blankOptions.blank1 = [];
    }

    i++;

    while (
      i < lines.length &&
      !/^(?:Question|Q)\s*\d+\b/i.test(lines[i]) &&
      !/^For\s+(?:the\s+following\s+)?[Qq]uestion/i.test(lines[i]) &&
      !/^For\s+(?:each\s+of\s+)?[Qq]uestions/i.test(lines[i]) &&
      !/^Passage\s+for\s+[Qq]uestions?/i.test(lines[i]) &&
      !/^Questions?\s+\d+.*based\s+on.*reading\s+passage/i.test(lines[i]) &&
      !/^Passage\s+\d+\b/i.test(lines[i])
    ) {
      const currentLine = lines[i].trim();

      if (!currentLine || /^_+$/.test(currentLine)) {
        i++;
        continue;
      }

      if (/select\s+the\s+two\s+answer\s+choices/i.test(currentLine)) {
        questionType = "sentence_equivalence";
        if (!directionCaptured) {
          direction = currentLine;
          directionCaptured = true;
          i++;
          continue;
        }
      }

      if (/(?:select\s+one\s+entry\s+for|for\s+(?:the|each)\s+blank(?:,)?\s+select)/i.test(currentLine)) {
        if (!directionCaptured) {
          direction = currentLine;
          directionCaptured = true;
          i++;
          continue;
        }
      }

      if (/^Select\s+the\s+sentence/i.test(currentLine) || /consider\s+each\s+of\s+the\s+sentences/i.test(currentLine)) {
        questionType = "sentence_selection";
        if (!directionCaptured) {
          direction = currentLine;
          directionCaptured = true;
          i++;
          continue;
        }
      }

      if (/consider\s+each\s+of\s+the\s+choices\s+separately/i.test(currentLine)) {
        questionType = "select_all_that_apply";
        if (!directionCaptured) {
          direction = currentLine;
          directionCaptured = true;
          i++;
          continue;
        }
      }

      if (/^Blank\s+\(i\)/i.test(currentLine)) {
        questionType = "text_completion";
        blankNumber = 1;
        blanks = 1;
        collectingBlankOptions = true;
        collectingOptions = true;
        if (lines.slice(i, i + 15).some((lineValue) => /^Blank\s+\(ii\)/i.test(lineValue))) blanks = 2;
        if (lines.slice(i, i + 20).some((lineValue) => /^Blank\s+\(iii\)/i.test(lineValue))) blanks = 3;
      }

      const blankMatch = currentLine.match(/^Blank\s+\((i+)\)/i);
      if (blankMatch) {
        if (currentOption) {
          if (blankNumber > 0) {
            if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
            blankOptions[`blank${blankNumber}`].push(currentOption.trim());
          } else {
            options.push(currentOption.trim());
          }
        }

        if (blankNumber === 0 && options.length > 0) {
          if (!blankOptions.blank1) blankOptions.blank1 = [];
          blankOptions.blank1.push(...options.splice(0));
        }

        blankNumber = blankMatch[1].length;
        if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
        currentOption = "";

        const inlineBlankMatch = currentLine.match(/^Blank\s+\((i+)\)\s*:\s*(.+)/i);
        if (inlineBlankMatch && inlineBlankMatch[2]) {
          const inlineText = inlineBlankMatch[2].trim();
          const inlineOptRe = /[A-Z]\.\s+(.+?)(?=\s+[A-Z]\.\s|$)/g;
          let match: RegExpExecArray | null;
          while ((match = inlineOptRe.exec(inlineText)) !== null) {
            const option = match[1].trim();
            if (option) blankOptions[`blank${blankNumber}`].push(option);
          }
        }

        i++;
        continue;
      }

      const optionLabelMatch = currentLine.match(/^\s*(?:\(([A-Z0-9①-⑳])\)|([A-Z0-9①-⑳])[\.\)])\s+(.+)$/);
      if (optionLabelMatch) {
        const labelChar = (optionLabelMatch[1] || optionLabelMatch[2] || "").toUpperCase();
        const isRCTypeNow = questionType === "reading_comprehension" || questionType === "select_all_that_apply";

        if (isRCTypeNow && questionType !== "select_all_that_apply" && labelChar >= "F" && labelChar <= "Z" && options.length >= 5) {
          if (currentOption) options.push(currentOption.trim());
          currentOption = "";
          break;
        }

        if (!collectingOptions && questionText.trim()) {
          const trimmedQ = questionText.trim();
          if (isLongPassage(trimmedQ)) {
            const sentences = trimmedQ.split(/(?<=[.!?])\s+/);
            if (sentences.length > 1) {
              const last2 = sentences.slice(-2).join(" ");
              if (/select|choose|which|what|according\s+to/i.test(last2)) {
                detectedPassage = sentences.slice(0, -2).join(" ").trim();
                questionText = last2.trim();
              } else {
                detectedPassage = sentences.slice(0, -1).join(" ").trim();
                questionText = sentences[sentences.length - 1].trim();
              }
            } else {
              detectedPassage = trimmedQ;
              questionText = "";
            }
          }
        }

        collectingOptions = true;
        questionTextDone = true;

        if (currentOption) {
          if (collectingBlankOptions && blankNumber > 0) {
            if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
            blankOptions[`blank${blankNumber}`].push(currentOption.trim());
          } else {
            options.push(currentOption.trim());
          }
        }

        currentOption = optionLabelMatch[3];
        i++;
        continue;
      }

      if (collectingBlankOptions && blankNumber > 0 && !currentOption && !/^(?:Blank|Question|For|Passage|Questions?)\s/i.test(currentLine)) {
        currentOption = currentLine;
        i++;
        continue;
      }

      const isRCType = questionType === "reading_comprehension" || questionType === "select_all_that_apply";

      if (isRCType && !questionTextDone && !collectingOptions) {
        questionText += `${currentLine} `;
        questionLineCount++;
        const trimmedQuestionText = questionText.trim();
        if (
          trimmedQuestionText.endsWith("?") ||
          (questionLineCount >= 2 && trimmedQuestionText.split(/\s+/).length >= 5) ||
          (trimmedQuestionText.split(/\s+/).length >= 5 && /\s+(?:to|for|that|as)\s*$/.test(trimmedQuestionText))
        ) {
          questionTextDone = true;
        }
        i++;
        continue;
      }

      if (isRCType && questionTextDone && !collectingOptions && !/^(?:Blank|Question|For|Passage|Questions?)\s/i.test(currentLine)) {
        if (currentOption) options.push(currentOption.trim());
        currentOption = currentLine;
        collectingOptions = true;
        i++;
        continue;
      }

      const isUnlabeledOptionContext =
        (questionType === "sentence_equivalence" || (questionType === "text_completion" && blankNumber === 0)) &&
        questionText.trim().split(/\s+/).length >= 6;

      if (!collectingOptions && isUnlabeledOptionContext && currentLine.split(/\s+/).length <= 6 && !/^(?:Blank|Question|For|Passage|Questions?)\s/i.test(currentLine)) {
        if (currentOption) options.push(currentOption.trim());
        currentOption = currentLine;
        collectingOptions = true;
        i++;
        continue;
      }

      if (collectingOptions && currentOption) {
        const isNextSectionBoundary =
          /^(?:Blank|Question|For\s+(?:the\s+following|questions?)|Passage\s+for)/i.test(currentLine) ||
          /^Passage\s+\d+\b/i.test(currentLine) ||
          /^\[[A-D]\]/i.test(currentLine) ||
          (isRCType && questionType !== "select_all_that_apply" && options.length >= 5);

        if (isNextSectionBoundary) {
          if (currentOption) {
            if (collectingBlankOptions && blankNumber > 0) {
              if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
              blankOptions[`blank${blankNumber}`].push(currentOption.trim());
            } else {
              options.push(currentOption.trim());
            }
            currentOption = "";
          }
          break;
        } else if (currentLine) {
          if (isRCType && questionTextDone) {
            options.push(currentOption.trim());
            currentOption = currentLine;
          } else if (collectingBlankOptions && blankNumber > 0) {
            if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
            blankOptions[`blank${blankNumber}`].push(currentOption.trim());
            currentOption = currentLine;
          } else if (questionType === "text_completion" && blankNumber === 0 && currentLine.split(/\s+/).length <= 6) {
            options.push(currentOption.trim());
            currentOption = currentLine;
          } else if (questionType === "sentence_equivalence" && currentLine.split(/\s+/).length <= 6) {
            options.push(currentOption.trim());
            currentOption = currentLine;
          } else {
            currentOption += ` ${currentLine}`;
          }
        }
      } else if (!collectingOptions && currentLine && !/^Blank\s/i.test(currentLine)) {
        questionText += `${currentLine} `;
        questionLineCount++;
      }

      i++;
    }

    if (currentOption) {
      if (collectingBlankOptions && blankNumber > 0) {
        if (!blankOptions[`blank${blankNumber}`]) blankOptions[`blank${blankNumber}`] = [];
        blankOptions[`blank${blankNumber}`].push(currentOption.trim());
      } else if (questionType === "text_completion" && !blankNumber && options.length > 0) {
        if (!blankOptions.blank1) blankOptions.blank1 = [];
        blankOptions.blank1.push(...options.splice(0));
        blankOptions.blank1.push(currentOption.trim());
      } else if (questionType === "text_completion" && !blankNumber) {
        if (!blankOptions.blank1) blankOptions.blank1 = [];
        blankOptions.blank1.push(currentOption.trim());
      } else {
        options.push(currentOption.trim());
      }
    }

    if (questionType === "text_completion" && !blankNumber && options.length > 0) {
      if (!blankOptions.blank1) blankOptions.blank1 = [];
      blankOptions.blank1.push(...options.splice(0));
    }

    if (questionType === "text_completion") {
      for (let blankIndex = 1; blankIndex <= (blankNumber || 1); blankIndex++) {
        const blankKey = `blank${blankIndex}`;
        if (!blankOptions[blankKey] || blankOptions[blankKey].length === 0) {
          const tokens = questionText.trim().split(/\s+/);
          let extractStart = tokens.length;
          while (extractStart > 0 && extractStart > tokens.length - 8 && /^[a-zA-Z]{2,20}$/.test(tokens[extractStart - 1])) {
            extractStart--;
          }
          const extracted = tokens.slice(extractStart);
          if (extracted.length >= 2) {
            if (!blankOptions[blankKey]) blankOptions[blankKey] = [];
            blankOptions[blankKey].push(...extracted);
            questionText = tokens.slice(0, extractStart).join(" ");
          }
        }
      }
    }

    let sentences: string[] | undefined;
    let sentenceOptions: string[] = [];
    if (questionType === "sentence_selection") {
      const passageText = passageMap.get(qNum) || detectedPassage || "";
      if (passageText) {
        try {
          if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
            const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
            sentences = Array.from(segmenter.segment(passageText), (segment) => segment.segment.trim()).filter((sentence) => sentence.length > 0);
          } else {
            sentences = passageText.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
          }
        } catch {
          sentences = passageText.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
        }
        sentenceOptions = (sentences || []).map((_sentence, index) => `Sentence ${index + 1}`);
      }
    }

    const finalOptions =
      questionType === "text_completion"
        ? blankOptions
        : questionType === "sentence_selection"
          ? sentenceOptions
          : options;

    const passage = passageMap.get(qNum) || detectedPassage || undefined;

    questions.push({
      id: `gre-verbal-q${qNum}`,
      questionType,
      questionText: questionText.trim(),
      direction: direction || undefined,
      selectAll: isSelectAll || questionType === "select_all_that_apply",
      options: finalOptions,
      correctAnswer: "",
      passage,
      sentences,
      blanks: questionType === "text_completion" ? (blankNumber > 0 ? blankNumber : 1) : undefined,
      orderIndex: qNum,
      points: 1,
    });
  }

  return questions;
}
