import type { CompleteWordsData, ComprehensionPassageData, AcademicPassageData } from "@shared/schema";

export interface ParsedNewToeflReading {
  moduleNumber: 1 | 2;
  completeWords: CompleteWordsData;
  comprehensionPassages: ComprehensionPassageData[];
  academicPassage: AcademicPassageData;
}

/**
 * Main parser entry point - handles both module-marked and unmarked content
 */
export function parseNewToeflReadingText(rawText: string): ParsedNewToeflReading[] {
  const modules: ParsedNewToeflReading[] = [];
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Check if text has module markers
  const hasModuleMarkers = /Reading Section,?\s*Module\s*\d+/i.test(normalizedText);
  
  if (hasModuleMarkers) {
    const moduleMatches = normalizedText.split(/Reading Section,?\s*Module\s*(\d+)/i);
    
    for (let i = 1; i < moduleMatches.length; i += 2) {
      const moduleNumber = parseInt(moduleMatches[i]) as 1 | 2;
      const moduleContent = moduleMatches[i + 1];
      
      if (!moduleContent) continue;
      
      const parsed = parseModuleContent(moduleContent, moduleNumber);
      if (parsed) {
        modules.push(parsed);
      }
    }
  } else {
    // No module markers - treat entire text as Module 1
    const parsed = parseModuleContent(normalizedText, 1);
    if (parsed) {
      modules.push(parsed);
    }
  }
  
  return modules;
}

/**
 * Parse a single module's content
 */
function parseModuleContent(content: string, moduleNumber: 1 | 2): ParsedNewToeflReading | null {
  try {
    console.log(`[ReadingParser] Parsing Module ${moduleNumber}, content length: ${content.length}`);
    
    // Step 1: Split content into major sections
    const sections = splitIntoSections(content);
    console.log(`[ReadingParser] Found sections:`, Object.keys(sections).filter(k => sections[k as keyof typeof sections]));
    
    // Step 2: Parse each section type
    const completeWords = parseCompleteWordsSection(sections.completeWords);
    const comprehensionPassages = parseComprehensionSections(sections.dailyLife);
    const academicPassage = parseAcademicSection(sections.academic);
    
    console.log(`[ReadingParser] Results: completeWords blanks=${completeWords.blanks?.length || 0}, passages=${comprehensionPassages.length}, academic questions=${academicPassage.questions.length}`);
    
    return {
      moduleNumber,
      completeWords,
      comprehensionPassages,
      academicPassage,
    };
  } catch (error) {
    console.error(`[ReadingParser] Error parsing module ${moduleNumber}:`, error);
    return null;
  }
}

/**
 * Split content into major sections using section headers
 */
function splitIntoSections(content: string): {
  completeWords: string;
  dailyLife: string[];
  academic: string;
} {
  let completeWords = "";
  const dailyLife: string[] = [];
  let academic = "";
  
  // Define section patterns with priorities
  const sectionMarkers = [
    { type: 'complete', pattern: /Complete the Words/i },
    { type: 'dailyPart', pattern: /Read in Daily Life\s*\(Part\s*\d+\)/i },
    { type: 'notice', pattern: /Read a notice/i },
    { type: 'email', pattern: /Read an email/i },
    { type: 'advisory', pattern: /Read a public[^\n]*(advisory|announcement)/i },
    { type: 'announcement', pattern: /Read an announcement/i },
    { type: 'academic', pattern: /Read an Academic Passage/i },
  ];
  
  // Find all section boundaries
  const boundaries: Array<{start: number; type: string; fullMatch: string}> = [];
  
  for (const marker of sectionMarkers) {
    const regex = new RegExp(marker.pattern.source, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      boundaries.push({
        start: match.index,
        type: marker.type,
        fullMatch: match[0]
      });
    }
  }
  
  // Sort by position
  boundaries.sort((a, b) => a.start - b.start);
  
  // Remove duplicates/nested headers and collapse "dailyPart + subtype" patterns
  const cleanedBoundaries: typeof boundaries = [];
  for (let i = 0; i < boundaries.length; i++) {
    const curr = boundaries[i];
    const next = boundaries[i + 1];
    
    // Check if next boundary is present
    const gapToNext = next ? (next.start - curr.start - curr.fullMatch.length) : Infinity;
    
    // EXPLICIT MERGE: Always skip dailyPart if the next boundary is a specific subtype
    // This handles cases where instruction text appears between headers
    if (curr.type === 'dailyPart' && next && ['notice', 'email', 'advisory', 'announcement'].includes(next.type)) {
      // Check that no other section boundary (complete, academic) appears between them
      const hasSeparatingBoundary = boundaries.some(b => 
        b.start > curr.start + curr.fullMatch.length && 
        b.start < next.start && 
        ['complete', 'academic'].includes(b.type)
      );
      if (!hasSeparatingBoundary) {
        continue; // Skip dailyPart, merge with next subtype
      }
    }
    
    // Gap-based duplicate/nested header handling
    if (next && gapToNext < 200) {
      // Skip generic "notice" if followed by more specific "advisory" or "announcement"
      if (curr.type === 'notice' && (next.type === 'advisory' || next.type === 'announcement')) {
        continue;
      }
      // Skip duplicate email headers
      if (curr.type === 'email' && next.type === 'email') {
        continue;
      }
    }
    
    cleanedBoundaries.push(curr);
  }
  
  // Extract sections based on boundaries
  for (let i = 0; i < cleanedBoundaries.length; i++) {
    const curr = cleanedBoundaries[i];
    const nextStart = cleanedBoundaries[i + 1]?.start ?? content.length;
    const sectionContent = content.substring(curr.start, nextStart);
    
    if (curr.type === 'complete') {
      completeWords = sectionContent;
    } else if (curr.type === 'academic') {
      academic = sectionContent;
    } else {
      // All other types are daily life passages
      dailyLife.push(sectionContent);
    }
  }
  
  // Fallback: if no sections found, try to extract Complete Words from beginning
  if (!completeWords && boundaries.length === 0) {
    const completeMatch = content.match(/Complete the Words[\s\S]*?(?=Read |$)/i);
    if (completeMatch) {
      completeWords = completeMatch[0];
    }
  }
  
  // SECONDARY FALLBACK: Use (Questions X-Y) patterns to infer sections if headers are missing
  if (dailyLife.length === 0 && !academic) {
    // Find all (Questions X-Y) markers
    const questionRanges: Array<{start: number; qStart: number; qEnd: number}> = [];
    const questionPattern = /\(Questions?\s*(\d+)-(\d+)\)/gi;
    let qMatch;
    while ((qMatch = questionPattern.exec(content)) !== null) {
      questionRanges.push({
        start: qMatch.index,
        qStart: parseInt(qMatch[1]),
        qEnd: parseInt(qMatch[2])
      });
    }
    
    // Infer sections from question number ranges
    for (let i = 0; i < questionRanges.length; i++) {
      const range = questionRanges[i];
      const nextStart = questionRanges[i + 1]?.start ?? content.length;
      const sectionContent = content.substring(range.start, nextStart);
      
      // Questions 1-10 is typically Complete Words
      if (range.qStart === 1 && range.qEnd === 10 && !completeWords) {
        completeWords = sectionContent;
      }
      // Higher question numbers are typically Daily Life or Academic
      else if (range.qStart >= 11 && range.qEnd <= 15) {
        dailyLife.push(sectionContent);
      }
      else if (range.qStart >= 16) {
        if (!academic) academic = sectionContent;
        else dailyLife.push(sectionContent);
      }
      else {
        dailyLife.push(sectionContent);
      }
    }
  }
  
  return { completeWords, dailyLife, academic };
}

/**
 * Parse Complete the Words section
 */
function parseCompleteWordsSection(sectionContent: string): CompleteWordsData {
  const blanks: { hint: string; answer: string; blankLength: number }[] = [];
  const answers: { word: string; missingLetters: string; blankLength?: number }[] = [];
  
  if (!sectionContent) {
    return { paragraph: "", answers, blanks };
  }
  
  // Remove header lines
  let paragraph = sectionContent
    .replace(/Complete the Words\s*\n?/gi, '')
    .replace(/\(Questions?\s*\d+-\d+\)\s*\n?/gi, '')
    .replace(/Fill in the missing letters[^\n]*\n?/gi, '')
    .trim();
  
  // Check for [ANSWER] section
  const answerMatch = paragraph.match(/\[ANSWER\]\s*\n?(.+)/i);
  const providedAnswers: string[] = [];
  if (answerMatch && answerMatch[1]) {
    providedAnswers.push(...answerMatch[1].split(',').map(a => a.trim()).filter(a => a.length > 0));
    paragraph = paragraph.replace(/\[ANSWER\]\s*\n?.+$/i, '').trim();
  }
  
  // Pattern for blanks: matches "word_ _ _" or "word_ _" with [N] markers
  // Handles: "So_ _ _ [1]", "hydrog_ _ [1]", "Cen_ _ _ [2]", etc.
  // Also handles: "Preserv_ [10]" (single underscore patterns)
  const blankPatternWithIndex = /([a-zA-Z][a-zA-Z''-]*)?\s*(_(?:\s*_)*)\s*\[(\d+)\]/g;
  
  let match;
  const foundBlanks: Array<{hint: string; underscoreCount: number; index: number; fullMatch: string}> = [];
  
  while ((match = blankPatternWithIndex.exec(paragraph)) !== null) {
    const hint = match[1] || '';
    const underscoreSequence = match[2];
    const blankIndex = parseInt(match[3]);
    const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
    
    foundBlanks.push({
      hint,
      underscoreCount,
      index: blankIndex,
      fullMatch: match[0]
    });
  }
  
  // Fallback: If no [N] markers found, try matching blanks without indices
  if (foundBlanks.length === 0) {
    // Pattern 1: word followed by underscores (2+ underscores, e.g., "hydrog_ _")
    const blankPatternMulti = /([a-zA-Z][a-zA-Z''-]*)?\s*(_(?:\s*_)+)/g;
    // Pattern 2: word followed by single underscore (e.g., "Preserv_")
    const blankPatternSingle = /([a-zA-Z]{3,})_(?!\s*_)(?=\s|[.,;!?]|$)/g;
    // Pattern 3: standalone underscores at word boundary (e.g., "_ _ _" or "___")
    const blankPatternStandalone = /(?:^|\s)(_(?:\s*_)+)(?:\s|[.,;!?]|$)/g;
    
    let blankIdx = 1;
    
    // Try multi-underscore pattern first
    while ((match = blankPatternMulti.exec(paragraph)) !== null) {
      const hint = match[1] || '';
      const underscoreSequence = match[2];
      const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
      
      foundBlanks.push({
        hint,
        underscoreCount,
        index: blankIdx++,
        fullMatch: match[0]
      });
    }
    
    // Try single-underscore pattern (word ending with single _)
    if (foundBlanks.length === 0) {
      while ((match = blankPatternSingle.exec(paragraph)) !== null) {
        const hint = match[1] || '';
        foundBlanks.push({
          hint,
          underscoreCount: 1,
          index: blankIdx++,
          fullMatch: match[0]
        });
      }
    }
    
    // If still nothing, try standalone blanks
    if (foundBlanks.length === 0) {
      while ((match = blankPatternStandalone.exec(paragraph)) !== null) {
        const underscoreSequence = match[1];
        const underscoreCount = (underscoreSequence.match(/_/g) || []).length;
        
        if (underscoreCount >= 2) {
          foundBlanks.push({
            hint: '',
            underscoreCount,
            index: blankIdx++,
            fullMatch: match[0]
          });
        }
      }
    }
  }
  
  // Sort by index
  foundBlanks.sort((a, b) => a.index - b.index);
  
  console.log(`[ReadingParser] Complete Words: Found ${foundBlanks.length} blanks`);
  
  for (let i = 0; i < foundBlanks.length; i++) {
    const blankInfo = foundBlanks[i];
    const hint = blankInfo.hint;
    const blankLength = blankInfo.underscoreCount;
    const fullWord = providedAnswers[i] || '';
    
    let missingLetters = '';
    if (fullWord && fullWord.toLowerCase().startsWith(hint.toLowerCase())) {
      missingLetters = fullWord.slice(hint.length);
    } else if (fullWord) {
      missingLetters = fullWord;
    } else {
      missingLetters = '_'.repeat(blankLength);
    }
    
    answers.push({
      word: fullWord || hint + '_'.repeat(blankLength),
      missingLetters: missingLetters,
      blankLength: blankLength
    });
    
    blanks.push({
      hint: hint,
      answer: missingLetters,
      blankLength: blankLength
    });
  }
  
  return { paragraph, answers, blanks };
}

/**
 * Parse Daily Life / Comprehension sections
 */
function parseComprehensionSections(sections: string[]): ComprehensionPassageData[] {
  const passages: ComprehensionPassageData[] = [];
  
  for (const sectionContent of sections) {
    if (!sectionContent.trim()) continue;
    
    // Determine passage type from header
    const type = determinePassageType(sectionContent);
    
    // Remove header lines to get actual content
    let cleanContent = sectionContent
      .replace(/Read in Daily Life\s*\(Part\s*\d+\)\s*\n?/gi, '')
      .replace(/\(Questions?\s*\d+-\d+\)\s*\n?/gi, '')
      .replace(/Read a notice\.?\s*\n?/gi, '')
      .replace(/Read an email\.?\s*\n?/gi, '')
      .replace(/Read a public[^\n]*\.?\s*\n?/gi, '')
      .replace(/Read an announcement\.?\s*\n?/gi, '')
      .trim();
    
    // Handle stacked headers (e.g., "Read a public health advisory.\nCommunity Health Advisory:")
    cleanContent = cleanContent.replace(/^Read[^\n]*\n/gi, '').trim();
    
    // Split passage content from questions
    const { passage, questions } = extractPassageAndQuestions(cleanContent);
    
    if (passage || questions.length > 0) {
      passages.push({
        type: type,
        title: extractTitleFromPassage(passage, type),
        content: passage,
        questions: questions,
      });
    }
  }
  
  console.log(`[ReadingParser] Comprehension: Parsed ${passages.length} passages`);
  
  return passages;
}

/**
 * Parse Academic Passage section
 */
function parseAcademicSection(sectionContent: string): AcademicPassageData {
  if (!sectionContent.trim()) {
    return { title: "", content: "", questions: [] };
  }
  
  // Remove header lines
  let cleanContent = sectionContent
    .replace(/Read an Academic Passage\.?\s*\n?/gi, '')
    .replace(/\(Questions?\s*\d+-\d+\)\s*\n?/gi, '')
    .trim();
  
  // Split passage from questions
  const { passage, questions } = extractPassageAndQuestions(cleanContent);
  
  // NON-DESTRUCTIVE title extraction: Extract title but KEEP full content
  // Title is for display purposes only - content always includes full passage
  const lines = passage.split('\n').filter(l => l.trim());
  const firstLine = lines[0]?.trim() || "";
  
  // Detect if first line is a clear title (for display purposes only)
  const isClearlyTitle = firstLine.length > 0 && firstLine.length < 50 && (
    // Very short, no sentence punctuation, few words
    (!/[.!?,;]$/.test(firstLine) && firstLine.split(' ').length <= 5) ||
    // ALL CAPS
    /^[A-Z][A-Z\s]+$/.test(firstLine) ||
    // Ends with colon
    /^[A-Z][^.!?]*:$/.test(firstLine)
  );
  
  // Title is NOT a sentence (doesn't start with article + verb pattern)
  const startsWithSentence = /^(The|A|An|This|These|Those|It|They)\s+\w+\s+(is|are|was|were|has|have|can|will|would|should|may|might)/i.test(firstLine);
  
  let title: string;
  // Content ALWAYS includes full passage - never remove title from content
  const content = passage;
  
  if (isClearlyTitle && !startsWithSentence) {
    title = firstLine;
  } else {
    // Use first few words as title hint, or generic title
    const words = firstLine.split(' ').slice(0, 4).join(' ');
    title = words.length > 10 ? words + "..." : "Academic Passage";
  }
  
  console.log(`[ReadingParser] Academic: title="${title}", questions=${questions.length}`);
  
  return { title, content, questions };
}

/**
 * Determine passage type from content/header
 */
function determinePassageType(content: string): "notice" | "email" | "announcement" {
  const lower = content.toLowerCase();
  if (lower.includes('email')) return 'email';
  if (lower.includes('announcement') || lower.includes('advisory')) return 'announcement';
  return 'notice';
}

/**
 * Extract title from passage content
 */
function extractTitleFromPassage(passage: string, type: string): string {
  const lines = passage.split('\n').filter(l => l.trim());
  
  // For emails, look for Subject line
  if (type === 'email') {
    const subjectMatch = passage.match(/Subject\s*:\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) return subjectMatch[1].trim();
  }
  
  // First non-empty line is usually the title
  return lines[0]?.trim() || "Passage";
}

/**
 * Split content into passage text and questions
 * Uses robust detection: find first (A) option and work backwards
 */
function extractPassageAndQuestions(content: string): {
  passage: string;
  questions: { id: number; question: string; options: string[]; correctAnswer: string }[];
} {
  // Clean excessive whitespace
  const cleanedContent = content.replace(/\n{4,}/g, '\n\n\n').trim();
  const lines = cleanedContent.split('\n');
  
  // Find the first question by looking for (A) with subsequent (B), (C), (D)
  let questionStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for inline options format: "Question text? (A) opt1 (B) opt2 (C) opt3 (D) opt4"
    if (/\(A\).*\(B\).*\(C\).*\(D\)/i.test(line)) {
      // Find where the question starts before (A)
      const beforeA = line.substring(0, line.indexOf('(A)')).trim();
      if (beforeA.length > 10) {
        questionStartIndex = i;
        break;
      }
    }
    
    // Check for standalone (A) followed by (B), (C), (D) in nearby lines
    if (/^\(A\)\s+/.test(line) || /^\(A\)/.test(line)) {
      const nextLines = lines.slice(i, Math.min(i + 8, lines.length)).join('\n');
      if (/^[ \t]*\(B\)/im.test(nextLines) && /^[ \t]*\(C\)/im.test(nextLines) && /^[ \t]*\(D\)/im.test(nextLines)) {
        // Walk backward to find question text
        for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
          const prevLine = lines[j].trim();
          if (!prevLine) continue;
          
          // Stop at previous answer option
          if (/^\([A-D]\)/.test(prevLine)) break;
          
          // Found question text
          if (prevLine.endsWith('?') || (prevLine.length > 15 && !prevLine.startsWith('('))) {
            questionStartIndex = j;
            break;
          }
        }
        
        if (questionStartIndex === -1) {
          questionStartIndex = Math.max(0, i - 1);
        }
        break;
      }
    }
    
    // Check for question starters — MUST contain '?' to avoid matching passage sentences
    // e.g. "When a robotic entity..." is passage text (no '?'), not a question
    const questionStarters = /^(What|Why|Which|How|According|The word|The author|The phrase|The passage|All of the following|In paragraph|Based on|It can be inferred|It is implied|When|Where|Who)/i;
    if (questionStarters.test(line) && line.includes('?')) {
      const nextLines = lines.slice(i, Math.min(i + 8, lines.length)).join('\n');
      if (/^[ \t]*\(A\)/im.test(nextLines) &&
          /^[ \t]*\(B\)/im.test(nextLines) &&
          /^[ \t]*\(C\)/im.test(nextLines) &&
          /^[ \t]*\(D\)/im.test(nextLines)) {
        questionStartIndex = i;
        break;
      }
    }
    
    // Check for numbered question format: "11. What is..." or "16. Which..."
    // No questionStarters restriction — catch any numbered question with options
    const numberedQMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (numberedQMatch) {
      const nextLines = lines.slice(i, Math.min(i + 12, lines.length)).join('\n');
      if (/^[ \t]*\(A\)/im.test(nextLines) &&
          /^[ \t]*\(B\)/im.test(nextLines) &&
          /^[ \t]*\(C\)/im.test(nextLines) &&
          /^[ \t]*\(D\)/im.test(nextLines)) {
        questionStartIndex = i;
        break;
      }
    }
  }
  
  let passage = "";
  let questionsText = "";
  
  if (questionStartIndex > 0) {
    passage = lines.slice(0, questionStartIndex).join('\n').trim();
    questionsText = lines.slice(questionStartIndex).join('\n').trim();
  } else if (questionStartIndex === 0) {
    passage = "";
    questionsText = cleanedContent;
  } else {
    passage = cleanedContent;
    questionsText = "";
  }
  
  // Clean up passage — remove section headers and trailing newlines
  passage = passage.replace(/^Read an Academic Passage\s*\n?/i, '').trim();
  passage = passage.replace(/^Read\s+(?:an?\s+)?(?:email|notice|advisory|announcement|Daily Life[^\n]*)\s*\n?/i, '').trim();
  passage = passage.replace(/\n{3,}$/g, '\n').trim();
  
  const questions = parseQuestions(questionsText);
  
  return { passage, questions };
}

/**
 * Parse questions from text - handles both inline and multi-line formats
 */
function parseQuestions(questionsText: string): { id: number; question: string; options: string[]; correctAnswer: string }[] {
  const questions: { id: number; question: string; options: string[]; correctAnswer: string }[] = [];
  
  if (!questionsText.trim()) return questions;
  
  // Normalize: convert inline options to multi-line format
  let normalized = questionsText.replace(/\n{3,}/g, '\n\n').trim();
  
  // Expand inline options: "Question? (A) opt1 (B) opt2 (C) opt3 (D) opt4"
  normalized = normalized.replace(
    /([^(\n]+?)\s*\(A\)\s*([^(]+?)\s*\(B\)\s*([^(]+?)\s*\(C\)\s*([^(]+?)\s*\(D\)\s*([^\n(]+)/g,
    (match, q, a, b, c, d) => {
      return `${q.trim()}\n(A) ${a.trim()}\n(B) ${b.trim()}\n(C) ${c.trim()}\n(D) ${d.trim()}`;
    }
  );
  
  const lines = normalized.split('\n');
  let questionId = 1;
  let pos = 0;
  
  while (pos < lines.length) {
    const line = lines[pos].trim();
    
    // Skip empty lines
    if (!line) {
      pos++;
      continue;
    }
    
    // Look for (A) option
    if (/^\(A\)\s*/.test(line)) {
      // Collect options A, B, C, D
      const options: string[] = ['', '', '', ''];
      let lastOptPos = pos;
      
      for (let j = pos; j < Math.min(pos + 15, lines.length); j++) {
        const optLine = lines[j].trim();
        if (!optLine) continue;
        
        const optMatch = optLine.match(/^\(([A-D])\)\s*(.*)/);
        if (optMatch) {
          const letter = optMatch[1];
          const text = optMatch[2].trim();
          const idx = letter.charCodeAt(0) - 65;
          
          if (!options[idx]) {
            options[idx] = text;
            lastOptPos = j;
          }
          
          // Complete set found
          if (letter === 'D' && options.every(o => o)) {
            break;
          }
        }
      }
      
      // If all 4 options found, look for question text backwards
      if (options.every(o => o)) {
        const questionParts: string[] = [];
        
        for (let j = pos - 1; j >= Math.max(0, pos - 10); j--) {
          const prevLine = lines[j].trim();
          if (!prevLine) continue;
          if (/^\([A-D]\)/.test(prevLine)) break;
          
          // Skip instruction lines
          if (/^(Select|Choose|Click|Drag|Mark|Pick)/i.test(prevLine)) continue;
          
          questionParts.unshift(prevLine);
          if (prevLine.endsWith('?')) break;
          if (questionParts.length >= 4) break;
        }
        
        const questionText = questionParts.join(' ').replace(/\s+/g, ' ').trim()
          .replace(/^\d+[.)]\s+/, '');
        
        if (questionText && questionText.length > 5) {
          questions.push({
            id: questionId++,
            question: questionText,
            options: options,
            correctAnswer: "",
          });
        }
        
        pos = lastOptPos + 1;
        continue;
      }
    }
    
    pos++;
  }
  
  console.log(`[ReadingParser] Parsed ${questions.length} questions`);
  
  return questions;
}

/**
 * Legacy function for backward compatibility
 */
export function parseQuestionWithAnswer(questionLine: string): {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
} | null {
  const match = questionLine.match(/(\d+)\.\s*(.+?)\s*\(A\)\s*(.+?)\s*\(B\)\s*(.+?)\s*\(C\)\s*(.+?)\s*\(D\)\s*(.+)/);
  
  if (!match) return null;
  
  const [, id, question, optA, optB, optC, optD] = match;
  
  return {
    id: parseInt(id),
    question: question.trim(),
    options: [optA.trim(), optB.trim(), optC.trim(), optD.trim()],
    correctAnswer: "",
  };
}
