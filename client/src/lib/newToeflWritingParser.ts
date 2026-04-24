import type { BuildSentenceQuestion, EmailTaskData, DiscussionTaskData } from "@shared/schema";

export interface ParsedNewToeflWriting {
  buildSentences: BuildSentenceQuestion[];
  emailTask: EmailTaskData;
  discussionTask: DiscussionTaskData;
}

export interface ParsedIntegratedWriting {
  readingPassage: string;
  listeningScript: string;
  question: string;
}

export function parseIntegratedWritingText(rawText: string): ParsedIntegratedWriting {
  const result: ParsedIntegratedWriting = {
    readingPassage: "",
    listeningScript: "",
    question: "",
  };
  
  const readingMatch = rawText.match(/Reading\s*passage\s*:?\s*([\s\S]*?)(?=Listening\s*script\s*:|$)/i);
  if (readingMatch) {
    result.readingPassage = readingMatch[1].trim();
  }
  
  const listeningMatch = rawText.match(/Listening\s*script\s*:?\s*([\s\S]*?)(?=Question\s*:|$)/i);
  if (listeningMatch) {
    result.listeningScript = listeningMatch[1].trim();
  }
  
  const questionMatch = rawText.match(/Question\s*:?\s*([\s\S]*)$/i);
  if (questionMatch) {
    result.question = questionMatch[1].trim();
  }
  
  return result;
}

export function validateIntegratedWriting(parsed: ParsedIntegratedWriting): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!parsed.readingPassage || parsed.readingPassage.length < 50) {
    errors.push("Reading passage is missing or too short (minimum 50 characters)");
  }
  
  if (!parsed.listeningScript || parsed.listeningScript.length < 50) {
    errors.push("Listening script is missing or too short (minimum 50 characters)");
  }
  
  if (!parsed.question || parsed.question.length < 10) {
    errors.push("Question is missing or too short");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseNewToeflWritingText(rawText: string): ParsedNewToeflWriting {
  const buildSentences = parseBuildSentences(rawText);
  const emailTask = parseEmailTask(rawText);
  const discussionTask = parseDiscussionTask(rawText);
  
  return {
    buildSentences,
    emailTask,
    discussionTask,
  };
}

function parseBuildSentences(content: string): BuildSentenceQuestion[] {
  const questions: BuildSentenceQuestion[] = [];
  
  const buildSectionMatch = content.match(/Build a Sentence[\s\S]*?(?=Write an Email|$)/i);
  if (!buildSectionMatch) return questions;
  
  const sectionContent = buildSectionMatch[0];
  const lines = sectionContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
    
    if (questionMatch) {
      const questionId = parseInt(questionMatch[1]);
      const originalSentence = questionMatch[2].trim();
      
      let template = "";
      let scrambledWords: string[] = [];
      
      if (i + 1 < lines.length) {
        const templateLine = lines[i + 1];
        if (templateLine.includes("_____") || templateLine.match(/^[A-Z].*[.?]$/)) {
          template = templateLine;
          
          if (i + 2 < lines.length) {
            const wordsLine = lines[i + 2];
            if (wordsLine.includes(" / ")) {
              scrambledWords = wordsLine.split(" / ").map(w => w.trim());
              i += 2;
            }
          }
        }
      }
      
      if (template && scrambledWords.length > 0) {
        const { words, correctOrder, contextSentence, sentenceTemplate, isValid, validationError } = computeCorrectOrder(
          originalSentence, 
          scrambledWords, 
          template
        );
        
        questions.push({
          id: questionId,
          contextSentence,
          sentenceTemplate,
          words,
          correctOrder,
          isValid,
          validationError,
          originalSentence,
          template,
          scrambledWords,
        });
      }
    }
    i++;
  }
  
  return questions;
}

function computeCorrectOrder(
  originalSentence: string, 
  scrambledWords: string[], 
  template: string
): { 
  words: string[]; 
  correctOrder: number[]; 
  contextSentence: string;
  sentenceTemplate: string;
  isValid: boolean;
  validationError?: string;
} {
  const normalizeWord = (w: string) => w.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
  
  const correctWords = originalSentence
    .replace(/[.,!?;:'"]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  const words = [...scrambledWords];
  
  const wordIndexMap = new Map<string, number[]>();
  for (let i = 0; i < words.length; i++) {
    const normalizedWord = normalizeWord(words[i]);
    if (!wordIndexMap.has(normalizedWord)) {
      wordIndexMap.set(normalizedWord, []);
    }
    wordIndexMap.get(normalizedWord)!.push(i);
  }
  
  const correctOrder: number[] = [];
  const usedIndices = new Set<number>();
  let matchSuccess = true;
  
  for (const correctWord of correctWords) {
    const normalizedCorrect = normalizeWord(correctWord);
    const availableIndices = wordIndexMap.get(normalizedCorrect);
    
    if (availableIndices && availableIndices.length > 0) {
      const nextIndex = availableIndices.find(idx => !usedIndices.has(idx));
      if (nextIndex !== undefined) {
        correctOrder.push(nextIndex);
        usedIndices.add(nextIndex);
      } else {
        matchSuccess = false;
        break;
      }
    } else {
      matchSuccess = false;
      break;
    }
  }
  
  if (!matchSuccess || correctOrder.length !== words.length) {
    const errorMsg = `Word mismatch: original="${originalSentence}", scrambled=[${scrambledWords.join(", ")}]`;
    console.warn(`Build a Sentence: ${errorMsg}. Using original sentence word order.`);
    
    const originalWords = originalSentence
      .replace(/[.,!?;:'"]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    return {
      words: originalWords,
      correctOrder: originalWords.map((_, i) => i),
      contextSentence: `Complete the sentence using the given words`,
      sentenceTemplate: "_____ ".repeat(originalWords.length).trim() + ".",
      isValid: false,
      validationError: errorMsg,
    };
  }
  
  const blankCount = (template.match(/_____/g) || []).length;
  const useOriginalTemplate = blankCount === words.length;
  const sentenceTemplate = useOriginalTemplate 
    ? template 
    : "_____ ".repeat(words.length).trim() + ".";
  
  const contextSentence = `Arrange these words in the correct order: ${originalSentence}`;
  
  return {
    words,
    correctOrder,
    contextSentence,
    sentenceTemplate,
    isValid: true,
  };
}

function parseEmailTask(content: string): EmailTaskData {
  const defaultEmail: EmailTaskData = {
    instructions: "You will read some information and use the information to write an email. You will have 7 minutes to write the email.",
    scenario: "",
    requirements: [],
    emailTo: "",
    emailSubject: "",
  };
  
  const emailSectionMatch = content.match(/Write an Email[\s\S]*?(?=Write for an Academic Discussion|$)/i);
  if (!emailSectionMatch) return defaultEmail;
  
  const sectionContent = emailSectionMatch[0];
  
  const instructionsMatch = sectionContent.match(/You will read some information[\s\S]*?write the email\./i);
  if (instructionsMatch) {
    defaultEmail.instructions = instructionsMatch[0].trim();
  }
  
  const scenarioMatch = sectionContent.match(/write the email\.\s*\n([\s\S]*?)(?=Write an email to|In your email)/i);
  if (scenarioMatch) {
    defaultEmail.scenario = scenarioMatch[1].trim();
  } else {
    const altScenarioMatch = sectionContent.match(/7 minutes to write the email\.\s*([\s\S]*?)Write an email/i);
    if (altScenarioMatch) {
      defaultEmail.scenario = altScenarioMatch[1].trim();
    }
  }
  
  const requirementsMatch = sectionContent.match(/In your email, do the following:\s*([\s\S]*?)(?=Write as much|Your Response|$)/i);
  if (requirementsMatch) {
    const reqText = requirementsMatch[1];
    const requirements = reqText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith("Write as"));
    defaultEmail.requirements = requirements;
  }
  
  const toMatch = sectionContent.match(/To:\s*(.+)/i);
  if (toMatch) {
    defaultEmail.emailTo = toMatch[1].trim();
  }
  
  const subjectMatch = sectionContent.match(/Subject:\s*(.+)/i);
  if (subjectMatch) {
    defaultEmail.emailSubject = subjectMatch[1].trim();
  }
  
  return defaultEmail;
}

function parseDiscussionTask(content: string): DiscussionTaskData {
  const defaultDiscussion: DiscussionTaskData = {
    instructions: "A professor has posted a question about a topic and students have responded with their thoughts and ideas. Make a contribution to the discussion.",
    classContext: "",
    professorName: "",
    professorQuestion: "",
    students: [],
  };
  
  console.log('[DISCUSSION PARSER] Starting parse, content length:', content.length);
  
  // Find discussion section
  const discussionSectionMatch = content.match(/Write for an Academic Discussion[\s\S]*/i);
  if (!discussionSectionMatch) {
    console.log('[DISCUSSION PARSER] No "Write for an Academic Discussion" section found');
    return defaultDiscussion;
  }
  
  let text = discussionSectionMatch[0];
  console.log('[DISCUSSION PARSER] Found discussion section, length:', text.length);
  
  // Normalize: replace all whitespace sequences with single space for easier regex matching
  text = text.replace(/\s+/g, ' ').trim();
  
  // Extract instructions and REMOVE from text to avoid matching "professor has posted" as professor name
  const instructionsMatch = text.match(/A professor has posted[\s\S]*?discussion\./i);
  if (instructionsMatch) {
    defaultDiscussion.instructions = instructionsMatch[0].trim();
    // Remove the instruction text so we don't accidentally match "professor has posted"
    text = text.replace(instructionsMatch[0], ' ').trim();
  }
  
  // Extract class context if present
  const classContextMatch = text.match(/Your professor is teaching[\s\S]*?question\./i);
  if (classContextMatch) {
    defaultDiscussion.classContext = classContextMatch[0].trim();
  }
  
  console.log('[DISCUSSION PARSER] Text after instruction removal (first 200 chars):', text.substring(0, 200));
  
  // REGEX-BASED APPROACH: Works regardless of line breaks
  // Pattern: Find "Professor Name" followed by content until "Student:" or known student name pattern
  
  // Common student names for detection
  const studentNames = [
    'liam', 'emma', 'noah', 'olivia', 'james', 'sophia', 'oliver', 'ava', 'benjamin', 'isabella',
    'elijah', 'mia', 'lucas', 'charlotte', 'mason', 'amelia', 'logan', 'harper', 'alexander', 'evelyn',
    'ethan', 'abigail', 'jacob', 'emily', 'michael', 'elizabeth', 'daniel', 'sofia', 'henry', 'avery',
    'jackson', 'ella', 'sebastian', 'scarlett', 'aiden', 'grace', 'matthew', 'chloe', 'samuel', 'victoria',
    'david', 'riley', 'joseph', 'aria', 'carter', 'lily', 'owen', 'aubrey', 'wyatt', 'zoey',
    'john', 'penelope', 'jack', 'layla', 'luke', 'camila', 'jayden', 'nora', 'dylan',
    'carlos', 'sophie', 'nathan', 'maria', 'ryan', 'elena', 'gabriel', 'hannah', 'anthony', 'maya',
    'isaac', 'sarah', 'andrew', 'rachel', 'joshua', 'anna', 'christopher', 'julia', 'william', 'jessica',
    'kevin', 'jennifer', 'brian', 'michelle', 'mark', 'ashley', 'steven', 'nicole', 'paul', 'amanda',
    'jason', 'melissa', 'eric', 'stephanie', 'adam', 'rebecca', 'timothy', 'laura', 'richard', 'kathleen',
    'alex', 'kim', 'sam', 'pat', 'taylor', 'jordan', 'casey', 'morgan', 'jamie', 'drew', 'vance',
    'hayes', 'chen', 'omar'
  ];
  
  // Build regex pattern for student markers: "Student: Name" or "Student Name" or bare "Name"
  const studentNamesPattern = studentNames.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join('|');
  
  // Step 1: Find Professor section - NOW in text without instruction
  // Match: "Professor Name Content" where Name is 1-3 capitalized words
  // Stop name capture when we hit a verb, article, or common sentence starter
  
  // MOST ROBUST APPROACH:
  // 1. First, try to find explicit delimiter (colon) after professor name
  // 2. If no delimiter, take ONLY the first word as the professor's surname
  // This ensures "Professor Wilson Colleges are debating" → name="Wilson", question="Colleges are debating..."
  
  // First, find the professor title and capture everything after it
  const profMatch = text.match(/(?:Professor|Prof\.?|Dr\.?)\s+(.+)/i);
  
  if (!profMatch) {
    console.log('[DISCUSSION PARSER] No professor pattern found');
    return defaultDiscussion;
  }
  
  const afterTitle = profMatch[1];
  let professorName = '';
  let afterProfessor = '';
  
  // Method 1: Check for explicit colon delimiter (best format)
  // Format: "Professor Wilson: Colleges are debating..."
  const colonMatch = afterTitle.match(/^([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)?)\s*:\s*(.+)/);
  if (colonMatch) {
    professorName = colonMatch[1].trim();
    afterProfessor = colonMatch[2].trim();
    console.log('[DISCUSSION PARSER] Found colon delimiter, professor name:', professorName);
  } else {
    // Method 2: No colon - take ONLY the first word as the professor's surname
    // This is the safest approach for ambiguous formats
    const words = afterTitle.split(/\s+/);
    
    if (words.length > 0) {
      const firstWord = words[0];
      
      // First word should be capitalized (the professor's surname)
      if (/^[A-Z][a-zA-Z'-]*$/.test(firstWord)) {
        professorName = firstWord;
        afterProfessor = words.slice(1).join(' ');
      } else {
        // First word is not capitalized (unusual), use it anyway
        professorName = firstWord;
        afterProfessor = words.slice(1).join(' ');
      }
    }
    console.log('[DISCUSSION PARSER] No colon, using first word as name:', professorName);
  }
  
  console.log('[DISCUSSION PARSER] Found professor:', professorName);
  console.log('[DISCUSSION PARSER] Content after professor name (first 100 chars):', afterProfessor.substring(0, 100));
  
  defaultDiscussion.professorName = professorName;
  
  // Step 2: SIMPLE APPROACH - Find "Student:" or "Student " to split professor content from students
  // This is more reliable than complex regex patterns
  
  let professorQuestion = '';
  let studentsText = '';
  
  // Look for "Student:" pattern first (most common format)
  const studentColonIndex = afterProfessor.search(/Student\s*:/i);
  
  if (studentColonIndex !== -1) {
    professorQuestion = afterProfessor.substring(0, studentColonIndex).trim();
    studentsText = afterProfessor.substring(studentColonIndex).trim();
    console.log('[DISCUSSION PARSER] Found "Student:" at index:', studentColonIndex);
  } else {
    // Fallback: Look for bare student names at word boundaries
    // Pattern: space + Name + space where Name is a common first name followed by content
    const bareNameMatch = afterProfessor.match(new RegExp(`\\s(${studentNamesPattern})\\s+[A-Z]`, 'i'));
    if (bareNameMatch && bareNameMatch.index !== undefined) {
      professorQuestion = afterProfessor.substring(0, bareNameMatch.index).trim();
      studentsText = afterProfessor.substring(bareNameMatch.index).trim();
      console.log('[DISCUSSION PARSER] Found bare student name at index:', bareNameMatch.index);
    } else {
      // No student markers found - entire content is professor's question
      professorQuestion = afterProfessor;
      console.log('[DISCUSSION PARSER] No student markers found, all content is professor question');
    }
  }
  
  // Clean up professor question
  professorQuestion = professorQuestion.replace(/\s+/g, ' ').trim();
  if (professorQuestion.length > 10) {
    defaultDiscussion.professorQuestion = professorQuestion;
    console.log('[DISCUSSION PARSER] Professor question extracted, length:', professorQuestion.length);
  } else {
    console.log('[DISCUSSION PARSER] Professor question too short:', professorQuestion.length);
  }
  
  console.log('[DISCUSSION PARSER] Professor question (first 150 chars):', professorQuestion.substring(0, 150));
  
  // Step 3: Parse students from studentsText
  if (studentsText) {
    // Split by "Student:" or "Student " patterns
    // Pattern: "Student: Name content" or "Student Name content"
    const studentSplitPattern = /Student\s*:\s*([A-Za-z]+)|Student\s+([A-Za-z]+)/gi;
    
    const studentMarkers: { name: string; index: number; fullMatch: string }[] = [];
    let match;
    
    while ((match = studentSplitPattern.exec(studentsText)) !== null) {
      const name = match[1] || match[2]; // Either from "Student: Name" or "Student Name"
      studentMarkers.push({
        name: name,
        index: match.index,
        fullMatch: match[0]
      });
    }
    
    // If no "Student:" markers, try bare names from the student names list
    if (studentMarkers.length === 0) {
      const bareNamePattern = new RegExp(`(?:^|\\s)(${studentNamesPattern})\\s+`, 'gi');
      while ((match = bareNamePattern.exec(studentsText)) !== null) {
        studentMarkers.push({
          name: match[1],
          index: match.index,
          fullMatch: match[0]
        });
      }
    }
    
    console.log('[DISCUSSION PARSER] Found', studentMarkers.length, 'student markers');
    
    // Extract each student's content
    for (let i = 0; i < studentMarkers.length; i++) {
      const marker = studentMarkers[i];
      const nextMarkerIndex = i + 1 < studentMarkers.length ? studentMarkers[i + 1].index : studentsText.length;
      
      // Get content after this marker until next marker
      const contentStart = marker.index + marker.fullMatch.length;
      let studentContent = studentsText.substring(contentStart, nextMarkerIndex);
      studentContent = studentContent.replace(/\s+/g, ' ').trim();
      
      if (studentContent.length > 10) {
        defaultDiscussion.students.push({
          name: marker.name,
          response: studentContent
        });
        console.log('[DISCUSSION PARSER] Added student:', marker.name, '- response length:', studentContent.length);
      }
    }
  }
  
  console.log('[DISCUSSION PARSER] Final result - professor:', defaultDiscussion.professorName, 
              ', question length:', defaultDiscussion.professorQuestion.length,
              ', students:', defaultDiscussion.students.length);
  
  return defaultDiscussion;
}

// Helper function to normalize text content - clean up all line breaks for continuous flow
function normalizeTextContent(text: string): string {
  if (!text) return '';
  
  // Step 1: Replace all newlines (single or multiple) with single space
  // This ensures text flows continuously without awkward breaks
  text = text.replace(/\n+/g, ' ');
  
  // Step 2: Collapse multiple spaces to single space
  text = text.replace(/\s+/g, ' ');
  
  // Step 3: Clean up any leftover formatting artifacts
  text = text.replace(/\s*\.\s*/g, '. ');  // Normalize space after periods
  text = text.replace(/\s*,\s*/g, ', ');   // Normalize space after commas
  text = text.replace(/\s*:\s*/g, ': ');   // Normalize space after colons
  
  return text.trim();
}

export function validateParsedWriting(parsed: ParsedNewToeflWriting): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (parsed.buildSentences.length === 0) {
    errors.push("No Build a Sentence questions found");
  }
  
  for (const q of parsed.buildSentences) {
    if (!q.originalSentence || !q.template || !q.scrambledWords || q.scrambledWords.length === 0) {
      errors.push(`Build a Sentence question ${q.id} is incomplete`);
    }
  }
  
  if (!parsed.emailTask.scenario) {
    errors.push("Email task scenario is missing");
  }
  
  if (parsed.emailTask.requirements.length === 0) {
    errors.push("Email task requirements are missing");
  }
  
  if (!parsed.discussionTask.professorQuestion) {
    errors.push("Discussion task professor question is missing");
  }
  
  if (parsed.discussionTask.students.length === 0) {
    errors.push("Discussion task student responses are missing");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
