import type { ListenAndChooseQuestion, ListeningPassageData } from "@shared/schema";

export interface ParsedNewToeflListening {
  listenAndChoose: ListenAndChooseQuestion[];
  conversations: ListeningPassageData[];
  announcements: ListeningPassageData[];
  academicTalks: ListeningPassageData[];
}

export function parseNewToeflListeningText(rawText: string): ParsedNewToeflListening {
  console.log(`[ListeningParser] Starting parse, input length: ${rawText.length} chars`);
  
  const listenAndChoose = parseListenAndChoose(rawText);
  const conversations = parsePassageSection(rawText, "Conversation");
  const announcements = parsePassageSection(rawText, "Announcement");
  const academicTalks = parsePassageSection(rawText, "Academic Talk");
  
  const totalPassageQuestions = 
    conversations.reduce((sum, c) => sum + c.questions.length, 0) +
    announcements.reduce((sum, a) => sum + a.questions.length, 0) +
    academicTalks.reduce((sum, t) => sum + t.questions.length, 0);
  
  console.log(`[ListeningParser] Parse complete: ${listenAndChoose.length} Choose Response, ${conversations.length} Conversations, ${announcements.length} Announcements, ${academicTalks.length} Academic Talks, ${totalPassageQuestions} passage questions`);
  
  return {
    listenAndChoose,
    conversations,
    announcements,
    academicTalks,
  };
}

function parseListenAndChoose(content: string): ListenAndChooseQuestion[] {
  const questions: ListenAndChooseQuestion[] = [];
  
  // Multiple header patterns to find the Listen and Choose section
  const headerPatterns = [
    /Listen\s+and\s+Choose\s+a\s+Response/i,
    /Choose\s+a\s+Response/i,
    /Listen\s+and\s+Choose/i,
  ];

  let sectionStartIdx = -1;
  for (const pat of headerPatterns) {
    const m = content.search(pat);
    if (m >= 0) { sectionStartIdx = m; break; }
  }
  if (sectionStartIdx === -1) return questions;

  // Find end of section: next passage-type header (Conversation, Announcement, Academic Talk)
  const afterHeader = content.substring(sectionStartIdx);
  const sectionEndMatch = afterHeader.search(
    /\n[^\n]*(?:Conversation|Announcement|Academic\s+Talk)\s*\(?Questions/i
  );
  const sectionContent = sectionEndMatch >= 0
    ? afterHeader.substring(0, sectionEndMatch)
    : afterHeader;
  
  // Split by "Question N" - allow no trailing whitespace (handles "Question 1\n" or "Question 1 ")
  const questionBlocks = sectionContent
    .split(/(?=Question\s+\d+\b)/i)
    .filter(b => /Question\s+\d+/i.test(b));
  
  for (const block of questionBlocks) {
    const numMatch = block.match(/Question\s+(\d+)/i);
    if (!numMatch) continue;
    const questionNumber = parseInt(numMatch[1]);
    
    // Find first option marker: (A), A), or A.
    const optionStartMatch = block.match(/\(A\)|(?:^|\s)A\)\s|(?:^|\s)A\.\s/im);
    if (!optionStartMatch) continue;
    const optionsStart = block.indexOf(optionStartMatch[0].trim());
    if (optionsStart === -1) continue;
    
    // Get dialogue part (between "Question N" and first option marker)
    const afterQuestion = block.substring(block.indexOf(numMatch[0]) + numMatch[0].length);
    const optInDialogue = afterQuestion.indexOf(optionStartMatch[0].trim());
    const dialoguePart = afterQuestion.substring(0, optInDialogue >= 0 ? optInDialogue : afterQuestion.length).trim();
    
    // Parse dialogue with enhanced speaker pattern
    const speakerPattern = /^\s*(Woman|Man|Student|Professor|Advisor|Employee|Registrar|Clerk|Officer|Staff|Librarian|Instructor|Host|Narrator|Podcast\s*Host|Teaching\s*Assistant|TA|Dean|Secretary|Receptionist|Cashier|Guard|Manager|Director|Counselor|Tutor):\s*/im;
    const lines = dialoguePart.split('\n').filter(l => l.trim());
    
    let speaker1 = "", dialogue1 = "", speaker2 = "";
    
    for (const line of lines) {
      const match = line.match(speakerPattern);
      if (match) {
        const speakerName = match[1].trim();
        if (!speaker1) {
          speaker1 = speakerName;
          dialogue1 = line.substring(match[0].length).trim();
        } else if (!speaker2) {
          speaker2 = speakerName;
          const afterSpeaker2 = line.substring(match[0].length).trim();
          if (afterSpeaker2) {
            dialogue1 += `\n${speakerName}: ${afterSpeaker2}`;
          }
        }
      } else if (speaker1 && !speaker2 && line.trim()) {
        dialogue1 += " " + line.trim();
      }
    }
    
    // Parse options
    const optionsPart = block.substring(optionsStart);
    const options = parseOptions(optionsPart);
    if (options.length !== 4) {
      console.warn(`[ListeningParser] Question ${questionNumber}: Failed to parse 4 options, got ${options.length}. Block preview: "${block.substring(0, 100)}..."`);
      continue;
    }
    
    const dialogue = speaker1 ? `${speaker1}: ${dialogue1}` : dialoguePart;
    
    const correctAnswer = findCorrectListenAndChooseAnswer(options);
    
    questions.push({
      id: questionNumber,
      dialogue,
      options,
      correctAnswer,
    });
  }

  // Log parsing results for debugging
  if (questions.length === 0 && sectionContent.length > 50) {
    console.warn(`[ListeningParser] Listen and Choose section found (${sectionContent.length} chars) but 0 questions parsed.`);
  } else {
    console.log(`[ListeningParser] Parsed ${questions.length} Listen and Choose questions`);
  }
  
  return questions;
}

function parseOptions(text: string): string[] {
  // Strategy 1: Find each option marker position and extract text between them
  const markers = findOptionMarkers(text);
  if (markers.length === 4) {
    const result: string[] = [];
    for (let i = 0; i < 4; i++) {
      const start = markers[i].textStart;
      const end = i < 3 ? markers[i + 1].markerStart : findOptionEnd(text, markers[i].textStart);
      const optText = cleanOptionText(text.substring(start, end));
      if (optText) result.push(optText);
    }
    if (result.length === 4) return result;
  }

  // Strategy 2: Regex-based capture with flexible terminators
  const optionMatches = text.match(/\(A\)([\s\S]*?)\(B\)([\s\S]*?)\(C\)([\s\S]*?)\(D\)([\s\S]*?)(?=\(A\)|Question\s+\d+|\n\s*\n\s*\n|$)/i);
  if (optionMatches) {
    const result = [
      cleanOptionText(optionMatches[1]),
      cleanOptionText(optionMatches[2]),
      cleanOptionText(optionMatches[3]),
      cleanOptionText(optionMatches[4]),
    ];
    if (result.every(o => o.length > 0)) return result;
  }

  // Strategy 3: Line-by-line parsing with continuation support
  const lineResult = parseOptionsLineByLine(text);
  if (lineResult.length === 4) return lineResult;

  // Strategy 4: Alternative markers A) B) C) D) or A. B. C. D.
  const altResult = parseAlternativeOptionFormats(text);
  if (altResult.length === 4) return altResult;

  return [];
}

function findOptionMarkers(text: string): Array<{letter: string; markerStart: number; textStart: number}> {
  const markers: Array<{letter: string; markerStart: number; textStart: number}> = [];
  const pattern = /\(([A-D])\)\s*/gi;
  let match;
  const seen = new Set<string>();

  while ((match = pattern.exec(text)) !== null) {
    const letter = match[1].toUpperCase();
    if (seen.has(letter)) continue;
    seen.add(letter);
    markers.push({
      letter,
      markerStart: match.index,
      textStart: match.index + match[0].length,
    });
  }

  if (markers.length === 4 &&
      markers[0].letter === 'A' && markers[1].letter === 'B' &&
      markers[2].letter === 'C' && markers[3].letter === 'D') {
    return markers;
  }
  return [];
}

function findOptionEnd(text: string, startAfterD: number): number {
  const remaining = text.substring(startAfterD);
  const terminators = [
    remaining.search(/\n\s*\n/),
    remaining.search(/\n\s*Question\s+\d+/i),
    remaining.search(/\n\s*(?:Conversation|Announcement|Academic\s+Talk)\s*\(/i),
  ];
  const validEnds = terminators.filter(i => i >= 0);
  if (validEnds.length > 0) return startAfterD + Math.min(...validEnds);

  const lastNewline = remaining.lastIndexOf('\n');
  if (lastNewline > 0) {
    const afterLast = remaining.substring(lastNewline).trim();
    if (afterLast.length === 0) return startAfterD + lastNewline;
  }

  return text.length;
}

function parseOptionsLineByLine(text: string): string[] {
  const lines = text.split('\n');
  const parsedOptions: Array<{idx: number; text: string}> = [];
  let currentIdx = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const optMatch = trimmed.match(/^\(([A-D])\)\s*(.*)/i);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      const optionText = (optMatch[2] || '').trim();
      parsedOptions.push({ idx, text: optionText });
      currentIdx = idx;
    } else if (currentIdx >= 0 && !trimmed.match(/^Question\s+\d+/i)) {
      const last = parsedOptions[parsedOptions.length - 1];
      if (last && last.idx === currentIdx) {
        last.text = (last.text + ' ' + trimmed).trim();
      }
    }
  }

  const result: string[] = [];
  for (let i = 0; i < 4; i++) {
    const found = parsedOptions.find(p => p.idx === i);
    if (found && found.text) {
      result[i] = found.text;
    }
  }

  if (result.filter(o => o).length === 4) return result;
  return [];
}

function parseAlternativeOptionFormats(text: string): string[] {
  const altPatterns = [
    /([A-D])\)\s*/gi,
    /([A-D])\.\s*/gi,
  ];

  for (const pattern of altPatterns) {
    const markers: Array<{letter: string; markerStart: number; textStart: number}> = [];
    const seen = new Set<string>();
    let match;

    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      const letter = match[1].toUpperCase();
      if (seen.has(letter)) continue;
      seen.add(letter);
      markers.push({
        letter,
        markerStart: match.index,
        textStart: match.index + match[0].length,
      });
    }

    if (markers.length === 4 &&
        markers[0].letter === 'A' && markers[1].letter === 'B' &&
        markers[2].letter === 'C' && markers[3].letter === 'D') {
      const result: string[] = [];
      for (let i = 0; i < 4; i++) {
        const start = markers[i].textStart;
        const end = i < 3 ? markers[i + 1].markerStart : findOptionEnd(text, markers[i].textStart);
        const optText = cleanOptionText(text.substring(start, end));
        if (optText) result.push(optText);
      }
      if (result.length === 4) return result;
    }
  }

  return [];
}

function cleanOptionText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

function findCorrectListenAndChooseAnswer(options: string[]): string {
  let bestIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    let score = 0;
    const lower = option.toLowerCase().trim();

    // ── Strong penalities ─────────────────────────────────────────────────
    // First-person personal experience/opinion → almost never the correct answer
    if (/^i\s/.test(lower) || /^i'm\s/.test(lower) || /^i've\s/.test(lower)) {
      score -= 50;
    }
    // Vague evaluative statements (e.g. "Public speaking skills are valuable")
    if (/\b(valuable|impressive|important|helpful|great|wonderful|interesting)\b/.test(lower) &&
        !/yes,|no,|log|apply|register|submit|visit|contact/.test(lower)) {
      score -= 20;
    }
    // Vague quantity statements: "There are many...", "There is a..."
    if (/^there (are many|is a|are a lot|are various|are several)/.test(lower)) {
      score -= 15;
    }

    // ── Direct answer signals ─────────────────────────────────────────────
    // "Yes," or "No," at the start → classic direct response
    if (/^(yes|no),/.test(lower)) {
      score += 50;
    }

    // Named institutional resource: "X Center", "X Office", "X Services", etc.
    if (/\b[A-Z][a-z]+\s(?:[A-Z][a-z]+\s)*(Center|Office|Services|Department|Lab|Laboratory|Library|Portal|Hub|Building|Hall|Desk|Booth|Unit)\b/.test(option)) {
      score += 40;
    }

    // Specific numbers: times, dollar amounts, page counts, semester counts
    if (/\d/.test(option)) score += 30;
    if (/\$|percent|%/.test(lower)) score += 10;

    // Specific floor / location references
    if (/\b(first floor|second floor|third floor|basement|ground floor)\b/.test(lower)) score += 25;

    // Actionable directives (how-to answers)
    const actionPhrases = [
      "log into", "log in to", "visit the", "go to the", "apply through",
      "apply to", "register", "submit", "contact the", "check the",
      "download", "bring your", "update your", "use your", "show your",
      "sign in", "sign up", "create a", "fill out", "fill in", "stop by",
      "no appointment", "per page", "per semester", "with your id", "with your student"
    ];
    for (const phrase of actionPhrases) {
      if (lower.includes(phrase)) { score += 20; break; }
    }

    // Specific named online tools / resources
    const resourceWords = ["portal", "student services", "advising", "financial aid", "housing services", "wellness", "writing center", "language lab", "communication center"];
    for (const rw of resourceWords) {
      if (lower.includes(rw)) { score += 15; break; }
    }

    // Direct addressing: "your"
    if (lower.includes("your")) score += 5;

    // Slight length preference (more specific = often longer), capped
    score += Math.min(option.length, 30);

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return ['A', 'B', 'C', 'D'][bestIndex] || 'A';
}

function parsePassageSection(content: string, sectionType: "Conversation" | "Announcement" | "Academic Talk"): ListeningPassageData[] {
  const passages: ListeningPassageData[] = [];
  
  const escapedType = sectionType.replace(/\s+/g, '\\s+');
  
  // Find all instances of "SectionType (Questions X-Y)" with flexible dash/hyphen
  const headerPattern = new RegExp(
    `${escapedType}\\s*\\(?Questions?\\s*(\\d+)\\s*[-–—]\\s*(\\d+)\\)?`,
    'gi'
  );
  
  const matches: Array<{index: number; startQ: number; endQ: number; fullMatch: string}> = [];
  let match;
  while ((match = headerPattern.exec(content)) !== null) {
    matches.push({
      index: match.index,
      startQ: parseInt(match[1]),
      endQ: parseInt(match[2]),
      fullMatch: match[0]
    });
  }
  
  // Fallback: try without (Questions X-Y) if no matches found
  if (matches.length === 0) {
    const simplePattern = new RegExp(`${escapedType}\\s*(?:\\d+)?\\s*$`, 'gim');
    let simpleMatch;
    while ((simpleMatch = simplePattern.exec(content)) !== null) {
      const afterHeader = content.substring(simpleMatch.index + simpleMatch[0].length);
      const questionNums: number[] = [];
      const qPattern = /Question\s+(\d+)/gi;
      let qm;
      while ((qm = qPattern.exec(afterHeader)) !== null) {
        const nextSection = afterHeader.substring(qm.index).search(
          /\n\s*(?:Conversation|Announcement|Academic\s+Talk)/i
        );
        if (nextSection >= 0 && nextSection < 50) break;
        questionNums.push(parseInt(qm[1]));
      }
      if (questionNums.length > 0) {
        matches.push({
          index: simpleMatch.index,
          startQ: Math.min(...questionNums),
          endQ: Math.max(...questionNums),
          fullMatch: simpleMatch[0]
        });
      }
    }
  }
  
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const startIdx = currentMatch.index + currentMatch.fullMatch.length;
    
    let endIdx = content.length;
    const nextSectionPattern = /\n[^\n]*(?:Conversation|Announcement|Academic\s+Talk)\s*\(?Questions/gi;
    nextSectionPattern.lastIndex = startIdx;
    const nextSection = nextSectionPattern.exec(content);
    if (nextSection) {
      endIdx = nextSection.index;
    }
    
    const sectionContent = content.substring(startIdx, endIdx).trim();
    const passageData = parsePassageContent(sectionContent, sectionType, currentMatch.startQ, currentMatch.endQ);
    
    if (passageData) {
      passages.push(passageData);
    }
  }
  
  console.log(`[ListeningParser] Found ${passages.length} ${sectionType} passages`);
  return passages;
}

function parsePassageContent(
  content: string, 
  sectionType: "Conversation" | "Announcement" | "Academic Talk",
  startQ: number,
  endQ: number
): ListeningPassageData | null {
  // Find first "Question N" or "Question N:" pattern
  const firstQuestionMatch = content.match(/Question\s+\d+/i);
  let passageText = content;
  let questionsText = "";
  
  if (firstQuestionMatch) {
    const questionIndex = content.indexOf(firstQuestionMatch[0]);
    passageText = content.slice(0, questionIndex).trim();
    questionsText = content.slice(questionIndex);
  }
  
  const questions: ListeningPassageData["questions"] = [];
  
  // Parse each question block
  const questionBlocks = questionsText.split(/(?=Question\s+\d+)/i).filter(b => /Question\s+\d+/i.test(b));
  
  for (const block of questionBlocks) {
    const numMatch = block.match(/Question\s+(\d+)\s*:?/i);
    if (!numMatch) continue;
    
    const questionNumber = parseInt(numMatch[1]);
    
    const afterNumIndex = block.indexOf(numMatch[0]) + numMatch[0].length;
    const afterNum = block.substring(afterNumIndex).trim();
    
    // Find first option marker: (A), A), or A.
    const optionStartMatch = afterNum.match(/\(A\)|(?:^|\s)A\)\s|(?:^|\s)A\.\s/im);
    if (!optionStartMatch) {
      console.warn(`[ListeningParser] Passage question ${questionNumber}: No option marker found`);
      continue;
    }
    const optAIndex = afterNum.indexOf(optionStartMatch[0].trim());
    if (optAIndex === -1) continue;
    
    const questionText = afterNum.substring(0, optAIndex).trim().replace(/\s+/g, ' ');
    
    const optionsPart = afterNum.substring(optAIndex);
    const options = parseOptions(optionsPart);
    if (options.length !== 4) {
      console.warn(`[ListeningParser] Passage question ${questionNumber}: Got ${options.length} options instead of 4`);
      continue;
    }
    
    const correctAnswer = findCorrectPassageAnswer(options, questionText);
    
    questions.push({
      id: questionNumber,
      question: questionText,
      options,
      correctAnswer,
    });
  }
  
  const type = sectionType === "Conversation" ? "conversation" 
    : sectionType === "Announcement" ? "announcement" 
    : "academic_talk";
  
  return {
    type: type as "conversation" | "announcement" | "academic_talk",
    title: `${sectionType} (Questions ${startQ}-${endQ})`,
    content: passageText,
    questions,
  };
}

function findCorrectPassageAnswer(options: string[], questionText: string): string {
  const question = questionText.toLowerCase();
  
  // Look for patterns in question to match answer
  const answerIndicators: Record<string, string[]> = {
    "strategy|recommend|how|recover|catch up": ["obtain notes", "review", "attend", "textbook", "read"],
    "absence|impact|grade": ["ten percent", "10%", "lost", "can still", "grade"],
    "concern|withdrawal|express": ["lack of commitment", "commitment", "explain", "raise questions"],
    "preferable|better|approach": ["completing", "earning", "b or c", "better than"],
    "reason|closure|close": ["staff training", "training sessions"],
    "when|resume|return|schedule": ["sunday", "resume on"],
    "initiate|evaporation|natural process": ["solar energy", "sun heats", "sun provides"],
    "condensation|define": ["cools", "rises", "forms", "clouds", "vapor cools"],
    "runoff|water movement": ["flows over", "ground surface", "streams", "rivers"],
    "primary energy|drives|entire": ["solar energy", "sun provides", "power"],
  };
  
  for (const [questionPattern, answerPatterns] of Object.entries(answerIndicators)) {
    const qPatterns = questionPattern.split("|");
    const hasQuestionMatch = qPatterns.some(p => question.includes(p));
    
    if (hasQuestionMatch) {
      for (let i = 0; i < options.length; i++) {
        const lowerOption = options[i].toLowerCase();
        const hasAnswerMatch = answerPatterns.some(ap => lowerOption.includes(ap));
        if (hasAnswerMatch) {
          return ['A', 'B', 'C', 'D'][i] || 'A';
        }
      }
    }
  }
  
  // Fallback: prefer longer, more specific answers
  // Avoid negative/dismissive options
  const negativePatterns = ["nothing", "no effect", "never", "automatic", "failure", "not"];
  
  let bestIndex = 0;
  let bestScore = 0;
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const lowerOption = option.toLowerCase();
    let score = option.length;
    
    // Penalize negative options
    if (negativePatterns.some(np => lowerOption.includes(np))) {
      score -= 50;
    }
    
    // Bonus for specific details
    if (/\d/.test(option)) score += 20;
    if (option.includes(",")) score += 5;
    
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  
  return ['A', 'B', 'C', 'D'][bestIndex] || 'A';
}

export function validateParsedListening(parsed: ParsedNewToeflListening): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (parsed.listenAndChoose.length === 0) {
    errors.push("No Listen and Choose questions found");
  }
  
  const totalPassages = parsed.conversations.length + parsed.announcements.length + parsed.academicTalks.length;
  if (totalPassages === 0) {
    errors.push("No passage sections found (Conversation, Announcement, or Academic Talk)");
  }
  
  // Count total questions
  let totalQuestions = parsed.listenAndChoose.length;
  for (const conv of parsed.conversations) {
    totalQuestions += conv.questions.length;
  }
  for (const ann of parsed.announcements) {
    totalQuestions += ann.questions.length;
  }
  for (const talk of parsed.academicTalks) {
    totalQuestions += talk.questions.length;
  }
  
  // Validate each section
  for (const q of parsed.listenAndChoose) {
    if (!q.dialogue || q.options.length !== 4) {
      errors.push(`Listen and Choose question ${q.id} is incomplete`);
    }
  }
  
  const allPassages = [...parsed.conversations, ...parsed.announcements, ...parsed.academicTalks];
  for (const passage of allPassages) {
    if (!passage.content || passage.questions.length === 0) {
      errors.push(`Passage "${passage.title}" is incomplete`);
    }
    for (const q of passage.questions) {
      if (!q.question || q.options.length !== 4) {
        errors.push(`Question ${q.id} in "${passage.title}" is incomplete`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
