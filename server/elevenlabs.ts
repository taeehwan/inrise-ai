/**
 * @deprecated Legacy ElevenLabs TTS module. Kept only for back-compat playback
 * of cached audio produced before the OpenAI TTS migration (2026-04). New audio
 * generation MUST use `server/lib/ttsAudio.ts` (OpenAI `tts-1-hd`). Do not add
 * new callers here. Planned removal once cached ElevenLabs URLs are migrated
 * off — see server/audioStorage.ts#migrateAllLocalToObjectStorage.
 */
import { ElevenLabsClient } from "elevenlabs";

if (!process.env.ELEVENLABS_API_KEY) {
  console.warn("⚠️ ELEVENLABS_API_KEY not configured - TTS will fall back to OpenAI");
}

const elevenlabs = process.env.ELEVENLABS_API_KEY 
  ? new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY })
  : null;

const VOICE_IDS = {
  rachel: "21m00Tcm4TlvDq8ikWAM",
  drew: "29vD33N1CtxCmqQRPOHJ",
  clyde: "2EiwWnXFnvU5JabPnv8n",
  paul: "5Q0t7uMcjvnagumLfvZi",
  domi: "AZnzlk1XvdvUeBnXmlld",
  dave: "CYw3kZ02Hs0563khs1Fj",
  fin: "D38z5RcWu1voky8WS1ja",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  antoni: "ErXwobaYiN019PkySvjV",
  thomas: "GBv7mTt0atIp3Br8iCZE",
  charlie: "IKne3meq5aSn9XLyUdCD",
  emily: "LcfcDJNUP1GQjkzn1xUU",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  patrick: "ODq5zmih8GrVes37Dizd",
  harry: "SOYHLrjzK2X1ezoPC6cr",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  dorothy: "ThT5KcBeYPX3keUQqHPh",
  josh: "TxGEqnHWrfWFTfGW9XjX",
  arnold: "VR6AewLTigWG4xSOukaG",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  james: "ZQe5CZNOzWyzPSCn5a3c",
  joseph: "Zlb1dXrM653N07WRdFW3",
  jessica: "cgSgspJ2msm6clMCkdW9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  michael: "flq6f7yk4E4fJM5XTYuZ",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  grace: "oWAxZDx7w5VEj9dCyTzz",
  nicole: "piTKgcLEGmPE4e6mEKli",
  adam: "pNInz6obpgDQGcFmaJgB",
  bill: "pqHfZKP75CvOlQylNhV4",
  george: "JBFqnCBsd6RMkjVDRZzb",
  freya: "jsCqWAovK2LkecY7zXl4",
  gigi: "jBpfuIE2acCO8z3wKNLl",
  serena: "pMsXgVXv3BLzUgSXRplE",
};

export type VoiceType = 
  | "narrator" 
  | "professor" 
  | "lecturer" 
  | "student" 
  | "student1" 
  | "student2" 
  | "male" 
  | "female";

// Voice mapping - using natural, lively voices for conversations and academic voices for lectures
// Conversations: Lively, bright, engaging tones
// Academic talks: Professional, authoritative, clear tones
// Note: Avoiding "adam" as it's overused on TikTok/YouTube - using "daniel" for a fresh male voice
const voiceMapping: Record<VoiceType, keyof typeof VOICE_IDS> = {
  narrator: "rachel",      // Clear, professional female narrator
  professor: "josh",       // Warm, authoritative, clear male professor
  lecturer: "brian",       // Professional, measured male lecturer
  student: "jessica",      // Lively, energetic young female student
  student1: "jessica",     // Lively, engaging female student
  student2: "callum",      // Friendly, natural male student (different from common TikTok voices)
  male: "daniel",          // Clear, natural male voice (not the common TikTok adam voice)
  female: "sarah",         // Bright, lively female voice
};

// Voice settings for different content types
// Conversations: More expressive, lively, faster
// Academic: Measured, professional, slower
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  speed: number;
}

// Volume-balanced settings: using consistent similarity_boost across all voices
// This ensures male/female voices have similar perceived loudness
// Higher stability = more consistent volume levels across different voices
const conversationVoiceSettings: VoiceSettings = {
  stability: 0.65,          // Higher stability for consistent volume across voices
  similarity_boost: 0.80,   // Higher similarity for more consistent voice character
  style: 0.40,              // Reduced style variation for volume consistency
  speed: 1.0,               // Natural speed for clear delivery
};

const academicVoiceSettings: VoiceSettings = {
  stability: 0.75,          // High stability for consistent, measured speech
  similarity_boost: 0.80,   // Same as conversation for volume consistency
  style: 0.20,              // Low style for professional, focused tone
  speed: 0.95,              // Slightly slower for clarity
};

function stripSpeakerLabels(text: string): string {
  // Comprehensive list of role labels to strip from TTS
  // Note: Single letter abbreviations MUST have a colon to be stripped (to avoid removing option labels like A, B, C, D)
  const fullRoleLabels = [
    'Woman', 'Man', 'Student', 'Professor', 'Narrator', 'Lecturer', 'Teacher',
    'Librarian', 'Assistant', 'Advisor', 'Male', 'Female', 'Speaker\\s*\\d*',
    'Host', 'Guest', 'Interviewer', 'Interviewee', 'Dean', 'Director', 'Manager',
    'Receptionist', 'Counselor', 'Coach', 'Instructor', 'Tutor', 'Mentor',
    'Administrator', 'Coordinator', 'Podcast Host', 'Podcast\\s*Host',
    'Employee', 'Registrar', 'Clerk', 'Secretary', 'Officer', 'Staff', 'Worker',
    'Attendant', 'Guide', 'Announcer', 'Operator', 'Representative', 'Agent'
  ].join('|');
  
  // Single letter abbreviations - only strip when followed by colon (M:, W:, etc.)
  // NOT when followed by ) or . (to preserve A), B), C), D) or A. B. C. D. option labels)
  const singleLetterLabels = ['M', 'W', 'F', 'S', 'P', 'N', 'L'].join('|');
  
  // Match full role labels with optional colon
  const fullSpeakerPattern = new RegExp(`^(${fullRoleLabels})(\\s*\\d*)?\\s*:\\s*["']?`, 'gim');
  const newlineFullSpeakerPattern = new RegExp(`\\n(${fullRoleLabels})(\\s*\\d*)?\\s*:\\s*["']?`, 'gi');
  const inlineFullSpeakerPattern = new RegExp(`([.!?])\\s*(${fullRoleLabels})(\\s*\\d*)?\\s*:\\s*["']?`, 'gi');
  
  // Single letter patterns - ONLY strip when followed by colon (not parentheses or period)
  const singleLetterSpeakerPattern = new RegExp(`^(${singleLetterLabels})(\\s*\\d*)?\\s*:\\s*["']?`, 'gim');
  const newlineSingleLetterPattern = new RegExp(`\\n(${singleLetterLabels})(\\s*\\d*)?\\s*:\\s*["']?`, 'gi');
  
  // Remove trailing quotes at end of lines
  const trailingQuotePattern = /["']\s*$/gm;
  
  // Convert ALL option label formats to spoken form: "A. ", "B. ", etc.
  // Handles: (A), A), A., A: formats - ensures all are read aloud clearly
  const parenthesisOptionPattern = /\(([A-D])\)\s*/gi;    // (A) format
  const parenRightOptionPattern = /\b([A-D])\)\s*/gi;      // A) format
  const periodOptionPattern = /\b([A-D])\.\s+/gi;          // A. format (with space after)
  const colonOptionPattern = /\b([A-D]):\s*/gi;            // A: format
  
  return text
    .replace(fullSpeakerPattern, '')
    .replace(newlineFullSpeakerPattern, '\n')
    .replace(inlineFullSpeakerPattern, '$1 ')
    .replace(singleLetterSpeakerPattern, '')
    .replace(newlineSingleLetterPattern, '\n')
    .replace(parenthesisOptionPattern, '$1. ')   // (A) -> "A. "
    .replace(parenRightOptionPattern, '$1. ')    // A) -> "A. "
    .replace(colonOptionPattern, '$1. ')         // A: -> "A. "
    // Note: A. with space is already correct format, no change needed
    .replace(trailingQuotePattern, '')
    .trim();
}

function addLeadingPause(text: string): string {
  // Return text as-is - ElevenLabs naturally handles leading silence
  // Dots were causing weird pronunciation sounds
  return text;
}

// Filter out non-script content: instructions, directions, metadata, annotations
// These should NOT be read aloud as they are not part of the actual conversation/lecture
function isNonScriptLine(line: string, includeOptions: boolean = false): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Empty lines
  if (!trimmed) return true;
  
  // Option patterns - for choose-response, we WANT to keep these
  // Make patterns more flexible - allow optional space after letter
  const optionPatterns = [
    /^\(a\)/i,                           // Option (A) - space optional
    /^\(b\)/i,                           // Option (B)
    /^\(c\)/i,                           // Option (C)
    /^\(d\)/i,                           // Option (D)
    /^a\)/i,                             // Option A)
    /^b\)/i,                             // Option B)
    /^c\)/i,                             // Option C)
    /^d\)/i,                             // Option D)
    /^a\./i,                             // Option A.
    /^b\./i,                             // Option B.
    /^c\./i,                             // Option C.
    /^d\./i,                             // Option D.
    /^[a-d]\s*[-:]/i,                   // Option A: or A -
    /^option\s*[a-d]/i,                 // "Option A"
  ];
  
  // If includeOptions is true and this is an option line, keep it (return false = not non-script)
  if (includeOptions) {
    for (const pattern of optionPatterns) {
      if (pattern.test(trimmed)) return false;  // Keep option lines for choose-response
    }
  }
  
  // Instruction/direction patterns - common test directions that shouldn't be read
  const instructionPatterns = [
    /^listen\s+to/i,                    // "Listen to the conversation"
    /^now\s+listen/i,                   // "Now listen to..."
    /^read\s+the\s+(passage|text|following)/i,  // "Read the passage"
    /^fill\s+in/i,                      // "Fill in the blank"
    /^choose\s+the\s+(best|correct)/i,  // "Choose the best answer"
    /^select\s+(the|all)/i,             // "Select the correct..."
    /^answer\s+the\s+following/i,       // "Answer the following questions"
    /^the\s+following/i,                // "The following is about..."
    /^questions?\s+\d+/i,               // "Question 1", "Questions 1-5"
    /^part\s+[a-z0-9]+/i,               // "Part A", "Part 1"
    /^section\s+[a-z0-9]+/i,            // "Section A"
    /^directions?:/i,                   // "Directions:"
    /^instructions?:/i,                 // "Instructions:"
    /^note:/i,                          // "Note:"
    /^hint:/i,                          // "Hint:"
    /^time\s+(allowed|limit)/i,         // "Time allowed: 20 minutes"
    /^\d+\s*(minutes?|seconds?|mins?|secs?)/i,  // "20 minutes"
    /^topic:/i,                         // "Topic: ..."
    /^passage\s+\d+/i,                  // "Passage 1"
    /^audio\s+\d+/i,                    // "Audio 1"
    /^track\s+\d+/i,                    // "Track 1"
    /^recording\s+\d+/i,                // "Recording 1"
    /^\[.*\]$/,                         // [Stage directions] or [sound effects]
    /^\((?![a-d]\))[^)]+\)$/i,          // (Stage directions) but NOT (A), (B), (C), (D)
    /^<.*>$/,                           // <metadata>
    /^---+$/,                           // Divider lines
    /^===+$/,                           // Divider lines
    /^\*\*\*+$/,                        // Divider lines
    /^#/,                               // Markdown headers
    /^conversation\s+\d*/i,             // "Conversation 1"
    /^lecture\s+\d*/i,                  // "Lecture 1"
    /^talk\s+\d*/i,                     // "Talk 1"
    /^audio\s+script/i,                 // "Audio Script"
    /^transcript/i,                     // "Transcript"
    /^script:/i,                        // "Script:"
    /^source:/i,                        // "Source:"
    /^reference:/i,                     // "Reference:"
    /^credits?:/i,                      // "Credits:"
    /^copyright/i,                      // "Copyright..."
    /^all\s+rights\s+reserved/i,        // "All rights reserved"
    /^setting:/i,                       // "Setting: library"
    /^location:/i,                      // "Location: campus"
    /^context:/i,                       // "Context:"
    /^background:/i,                    // "Background:"
    /^scenario:/i,                      // "Scenario:"
    /^situation:/i,                     // "Situation:"
    // NOTE: Option patterns (A, B, C, D) are handled by includeOptions check above
    // Do NOT duplicate them here - they are filtered via early return when includeOptions=false
  ];
  
  for (const pattern of instructionPatterns) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Lines that are just numbers (like question numbers)
  if (/^\d+\.?\s*$/.test(trimmed)) return true;
  
  // Lines starting with just a number and period (question numbers like "1.")
  if (/^\d+\.\s/.test(trimmed)) return true;
  
  // Lines that are very short and look like labels (under 3 words, ending with colon)
  if (trimmed.endsWith(':') && trimmed.split(/\s+/).length <= 3) {
    // But allow speaker labels like "Man:" or "Woman:" - those are handled separately
    const speakerLabels = /^(man|woman|student|professor|narrator|lecturer|teacher|male|female|m|w|s|p|n|l|advisor|librarian|host|guest|speaker)\s*\d*:$/i;
    if (!speakerLabels.test(trimmed)) return true;
  }
  
  return false;
}

// Pre-process script to remove question sections entirely
// This strips out everything after explicit "Questions:" header or clear question section markers
// IMPORTANT: Does NOT filter based on question words like "what/why/how" as these are valid dialogue
function stripQuestionsAndOptions(text: string): string {
  // Only remove content after EXPLICIT question section markers
  // These are clear delimiters that indicate end of dialogue and start of test questions
  const questionSectionPatterns = [
    /\n\s*Questions?\s*:\s*\n[\s\S]*/i,            // "Questions:" section header
    /\n\s*---+\s*Questions?[\s\S]*/i,              // "--- Questions" divider
    /\n\s*===+\s*Questions?[\s\S]*/i,              // "=== Questions" divider
    /\n\s*\[Questions?\][\s\S]*/i,                 // "[Questions]" marker
    /\n\s*\(Questions?\)[\s\S]*/i,                 // "(Questions)" marker
    /\n\s*Answer\s+the\s+following[\s\S]*/i,       // "Answer the following" instruction
  ];
  
  let result = text;
  for (const pattern of questionSectionPatterns) {
    result = result.replace(pattern, '');
  }
  
  return result.trim();
}

// Remove filler words and non-English characters from TTS text
// This ensures clean English pronunciation without weird sounds
function removeFillerWords(text: string): string {
  // English filler words - case insensitive, standalone with optional trailing punctuation
  let result = text.replace(/\b(uh+|um+|hmm+|er+|ah+|uhh+|umm+|hm+|mhm+|erm+|ehm+)\b[,.]?\s*/gi, '');
  
  // Multiple consecutive ellipses with fillers like "...uh..." or "... um ..."
  result = result.replace(/\.{2,}\s*(uh+|um+|hmm+|er+|ah+)\s*\.{2,}/gi, '... ');
  
  // Ellipsis alone used as hesitation "... ... ..."
  result = result.replace(/(\.{3}\s*){2,}/g, '... ');
  
  // AGGRESSIVE: Remove ALL non-English characters (Korean, Chinese, Japanese, etc.)
  // Keep only: English letters, numbers, basic punctuation, and whitespace
  // This prevents TTS from trying to pronounce non-English text as "uhm", "ah", etc.
  result = result.replace(/[^\x00-\x7F]/g, ' ');
  
  // Remove blank placeholder patterns like "___" or "[blank]" or "(blank)"
  result = result.replace(/_{2,}/g, ' ');
  result = result.replace(/\[blank\]/gi, ' ');
  result = result.replace(/\(blank\)/gi, ' ');
  result = result.replace(/\[.*?\]/g, ' '); // Remove any [bracketed] content
  
  // Clean up resulting spacing issues
  result = result
    .replace(/\s+,/g, ',')             // Clean up space before comma
    .replace(/,\s*,/g, ',')            // Clean up double commas
    .replace(/\s{2,}/g, ' ')           // Clean up multiple spaces
    .replace(/^\s*[.,!?;:]+\s*/g, '')  // Remove leading punctuation
    .replace(/[.,!?;:]+\s*$/g, '.')    // Normalize trailing punctuation
    .trim();
  
  return result;
}

function formatOptionsForSpeech(text: string): string {
  // AGGRESSIVE PRE-CLEANING for choose-response options
  // Remove ALL non-ASCII characters FIRST to prevent weird TTS sounds
  let cleanedText = text
    .replace(/[^\x00-\x7F]/g, ' ')        // Remove ALL non-ASCII (Korean, Chinese, symbols, etc.)
    .replace(/[\u0000-\u001F]/g, ' ')     // Remove control characters
    .replace(/[\u007F-\u009F]/g, ' ')     // Remove additional control characters
    .replace(/[""'']/g, '"')              // Normalize smart quotes to regular quotes
    .replace(/[–—]/g, '-')                // Normalize em/en dashes
    .replace(/…/g, '.')                   // Replace ellipsis with single period
    .replace(/\.{2,}/g, '.')              // Replace multiple dots with single period
    .replace(/\s+/g, ' ')                 // Collapse multiple spaces
    .trim();
  
  // CLEAN option formatting - NO DOTS for pauses (they cause weird TTS sounds)
  // Use clear "Option A," format for unambiguous pronunciation
  // ElevenLabs handles natural pauses at sentence boundaries automatically
  
  // Handle various option formats - replace with clear "Option A," format
  // (A) Some text -> "Option A, Some text."
  // A) Some text -> "Option A, Some text."
  // A: Some text -> "Option A, Some text."
  return cleanedText
    // (A) format -> "Option A, [content]"
    .replace(/\(([A-D])\)\s*/gi, (_, letter) => `Option ${letter.toUpperCase()}, `)
    // A) format -> "Option A, [content]"
    .replace(/\b([A-D])\)\s*/gi, (_, letter) => `Option ${letter.toUpperCase()}, `)
    // A: format -> "Option A, [content]"
    .replace(/\b([A-D]):\s*/gi, (_, letter) => `Option ${letter.toUpperCase()}, `)
    // After sentence + A. format -> "Option A, [content]"
    .replace(/([.!?])\s*([A-D])\.\s+/gi, (_, punct, letter) => `${punct} Option ${letter.toUpperCase()}, `)
    // Start of line A. -> "Option A, [content]"
    .replace(/^([A-D])\.\s+/gim, (_, letter) => `Option ${letter.toUpperCase()}, `)
    // After newline A. -> "Option A, [content]"
    .replace(/\n([A-D])\.\s+/gi, (_, letter) => `\nOption ${letter.toUpperCase()}, `);
}

export type ContentType = "conversation" | "academic" | "choose-response";

export async function generateElevenLabsSpeech(
  text: string, 
  voiceType: VoiceType = "narrator",
  contentType: ContentType = "conversation"
): Promise<Buffer> {
  if (!elevenlabs) {
    throw new Error("ElevenLabs API key not configured");
  }

  const voiceName = voiceMapping[voiceType] || "rachel";
  const voiceId = VOICE_IDS[voiceName];
  
  // FIRST: Pre-cleaning to handle problematic characters while preserving useful content
  // Normalize punctuation and remove non-Latin scripts that cause TTS issues
  let cleanText = text
    .replace(/[""]/g, '"')                  // Normalize smart double quotes to ASCII
    .replace(/['']/g, "'")                  // Normalize smart single quotes to ASCII
    .replace(/[–—]/g, '-')                  // Normalize en-dash and em-dash to hyphen
    .replace(/…/g, '.')                      // Convert ellipsis to single period (no dots)
    .replace(/\.{2,}/g, '.')                 // Replace multiple dots with single period
    // Normalize common accented characters to ASCII equivalents (preserves meaning)
    .replace(/[àáâãäå]/gi, (c) => c.toLowerCase() === c ? 'a' : 'A')
    .replace(/[èéêë]/gi, (c) => c.toLowerCase() === c ? 'e' : 'E')
    .replace(/[ìíîï]/gi, (c) => c.toLowerCase() === c ? 'i' : 'I')
    .replace(/[òóôõö]/gi, (c) => c.toLowerCase() === c ? 'o' : 'O')
    .replace(/[ùúûü]/gi, (c) => c.toLowerCase() === c ? 'u' : 'U')
    .replace(/[ñ]/gi, (c) => c.toLowerCase() === c ? 'n' : 'N')
    .replace(/[ç]/gi, (c) => c.toLowerCase() === c ? 'c' : 'C')
    // Remove remaining extended Latin and other scripts
    .replace(/[\u0100-\u024F]/g, ' ')       // Extended Latin (remaining diacritics)
    .replace(/[\u0370-\u03FF]/g, ' ')       // Greek
    .replace(/[\u0400-\u04FF]/g, ' ')       // Cyrillic
    .replace(/[\u0590-\u05FF]/g, ' ')       // Hebrew
    .replace(/[\u0600-\u06FF]/g, ' ')       // Arabic
    .replace(/[\u3000-\u303F]/g, ' ')       // CJK symbols/punctuation
    .replace(/[\u3040-\u309F]/g, ' ')       // Hiragana
    .replace(/[\u30A0-\u30FF]/g, ' ')       // Katakana
    .replace(/[\u4E00-\u9FFF]/g, ' ')       // CJK ideographs (Chinese/Japanese)
    .replace(/[\uAC00-\uD7AF]/g, ' ')       // Korean Hangul
    .replace(/[\uFE00-\uFE0F]/g, '')        // Variation selectors (emoji modifiers)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ') // Surrogate pairs (emojis, symbols)
    .replace(/\s+/g, ' ')                   // Collapse spaces
    .trim();
  
  // Process text: strip labels, remove fillers, format options, add leading pause
  cleanText = stripSpeakerLabels(cleanText);
  cleanText = removeFillerWords(cleanText);  // Remove filler words like 어, 음, uh, um
  
  // For choose-response type, add clear option formatting
  if (contentType === "choose-response") {
    cleanText = formatOptionsForSpeech(cleanText);
  }
  
  cleanText = addLeadingPause(cleanText);
  
  // DEBUG: Log the final text being sent to TTS
  console.log(`[TTS DEBUG] Voice: ${voiceName}, Content: ${contentType}`);
  console.log(`[TTS DEBUG] Final text (first 200 chars): "${cleanText.substring(0, 200)}..."`);
  
  // Select voice settings based on content type
  // Choose-response uses CONSISTENT settings for uniform volume across all options
  const settings = (contentType === "academic") 
    ? academicVoiceSettings 
    : (contentType === "choose-response")
      ? { 
          stability: 0.70,          // Higher stability = consistent volume and tone
          similarity_boost: 0.80,   // High voice consistency for uniform sound
          style: 0.30,              // Lower style = more neutral, consistent delivery
          speed: 0.95               // Slightly slower for clarity
        }
      : conversationVoiceSettings;

  try {
    const audio = await elevenlabs.generate({
      voice: voiceId,
      text: cleanText,
      model_id: "eleven_multilingual_v2",  // Use multilingual model for more natural speech
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        speed: settings.speed,
        use_speaker_boost: true,  // Enhanced clarity
      },
    } as any);

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (error: any) {
    console.error("❌ ElevenLabs TTS error:", {
      message: error?.message || 'Unknown error',
      status: error?.status || error?.statusCode,
      code: error?.code,
      textLength: cleanText?.length,
      voice: voiceName,
      voiceId: voiceId,
      hint: error?.status === 401 ? 'Check API key validity' : 
            error?.status === 429 ? 'Rate limit exceeded - try again later' :
            error?.status === 400 ? 'Invalid request - check text content' :
            'Unknown error'
    });
    throw error;
  }
}

export async function generateMultiVoiceElevenLabsSpeech(
  script: string, 
  contentType: ContentType = "conversation"
): Promise<Buffer> {
  if (!elevenlabs) {
    throw new Error("ElevenLabs API key not configured");
  }

  // Pre-process: strip questions and options from script
  const cleanedScript = stripQuestionsAndOptions(script);
  const lines = cleanedScript.split('\n').filter(line => line.trim());
  const audioSegments: Buffer[] = [];
  
  // For choose-response, include option lines (A, B, C, D with content)
  const includeOptions = contentType === "choose-response";

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Filter out non-script content (instructions, directions, metadata)
    // For choose-response type, keep option lines
    if (isNonScriptLine(line, includeOptions)) continue;
    
    // Skip lines that are only speaker labels without actual content
    // Single-letter abbreviations (M, W, F, S, P, N, L) MUST have a colon to be recognized as speaker labels
    const speakerOnlyPattern = /^(Man|Woman|Student|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\s*\d*|Host|Guest|Interviewer|Interviewee|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)(\s*\d*)?\s*:?\s*$/i;
    const singleLetterSpeakerOnlyPattern = /^[MWFSPNL](\s*\d*)?\s*:\s*$/i;  // Single letters MUST have colon
    if (speakerOnlyPattern.test(line.trim()) || singleLetterSpeakerOnlyPattern.test(line.trim())) continue;

    // Match role labels - single-letter abbreviations (M, W, F, S, P, N, L) MUST have colon
    const fullRoleMatch = line.match(/^(Narrator|Professor|Lecturer|Student\s*\d*|Male|Female|Woman|Man|Advisor|Librarian|Teacher|Assistant|Host|Guest|Speaker\s*\d*|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)[\s:]+(.+)/i);
    const singleLetterRoleMatch = line.match(/^([MWFSPNL])(\s*\d*)?\s*:\s*(.+)/i);  // Single letters MUST have colon
    const roleMatch = fullRoleMatch || (singleLetterRoleMatch ? [singleLetterRoleMatch[0], singleLetterRoleMatch[1], singleLetterRoleMatch[3]] : null);
    
    let voiceType: VoiceType = "narrator";
    let text = line;

    if (roleMatch) {
      const role = roleMatch[1].toLowerCase().replace(/\s+/g, '');
      text = roleMatch[2]?.trim() || line;
      
      if (role.includes('professor') || role === 'p') voiceType = "professor";
      else if (role.includes('lecturer') || role === 'l') voiceType = "lecturer";
      else if (role === 'student2' || role === 's2') voiceType = "student2";
      else if (role.includes('student') || role === 's') voiceType = "student";
      else if (role === 'male' || role === 'man' || role === 'm' || role.includes('advisor') || role.includes('host') || role.includes('dean') || role.includes('director') || role.includes('manager') || role.includes('coach') || role.includes('instructor') || role.includes('tutor') || role.includes('mentor') || role.includes('administrator') || role.includes('coordinator') || role.includes('employee') || role.includes('registrar') || role.includes('clerk') || role.includes('officer') || role.includes('staff') || role.includes('worker') || role.includes('announcer') || role.includes('operator') || role.includes('representative') || role.includes('agent')) voiceType = "male";
      else if (role === 'female' || role === 'woman' || role === 'w' || role === 'f' || role.includes('librarian') || role.includes('guest') || role.includes('receptionist') || role.includes('counselor') || role.includes('secretary') || role.includes('attendant') || role.includes('guide')) voiceType = "female";
      else if (role === 'n' || role.includes('narrator')) voiceType = "narrator";
      else voiceType = "narrator";
    }

    if (text.trim()) {
      const segment = await generateElevenLabsSpeech(text, voiceType, contentType);
      audioSegments.push(segment);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return Buffer.concat(audioSegments);
}

export async function generateListeningAudioElevenLabs(
  script: string,
  type: "conversation" | "academic-talk" | "lecture" | "choose-response"
): Promise<Buffer> {
  if (!elevenlabs) {
    throw new Error("ElevenLabs API key not configured");
  }

  // Determine content type for voice settings
  const contentType: ContentType = (type === "lecture" || type === "academic-talk") 
    ? "academic" 
    : (type === "choose-response" ? "choose-response" : "conversation");

  // PRE-CLEANING: Normalize and remove problematic characters while preserving useful content
  // This prevents TTS from making weird sounds like "얼", "아쓰", etc.
  // Matches the main generateElevenLabsSpeech cleaning for consistency
  let preCleanedScript = script
    .replace(/[""]/g, '"')                  // Normalize smart quotes
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')                  // Normalize dashes
    .replace(/…/g, '.')                      // Convert ellipsis to single period (no dots)
    .replace(/\.{2,}/g, '.')                 // Replace multiple dots with single period
    // Normalize common accented characters to ASCII equivalents
    .replace(/[àáâãäå]/gi, (c) => c.toLowerCase() === c ? 'a' : 'A')
    .replace(/[èéêë]/gi, (c) => c.toLowerCase() === c ? 'e' : 'E')
    .replace(/[ìíîï]/gi, (c) => c.toLowerCase() === c ? 'i' : 'I')
    .replace(/[òóôõö]/gi, (c) => c.toLowerCase() === c ? 'o' : 'O')
    .replace(/[ùúûü]/gi, (c) => c.toLowerCase() === c ? 'u' : 'U')
    .replace(/[ñ]/gi, (c) => c.toLowerCase() === c ? 'n' : 'N')
    .replace(/[ç]/gi, (c) => c.toLowerCase() === c ? 'c' : 'C')
    // Remove remaining extended Latin and other scripts (matches main cleaner)
    .replace(/[\u0100-\u024F]/g, ' ')       // Extended Latin (remaining diacritics)
    .replace(/[\u0370-\u03FF]/g, ' ')       // Greek
    .replace(/[\u0400-\u04FF]/g, ' ')       // Cyrillic
    .replace(/[\u0590-\u05FF]/g, ' ')       // Hebrew
    .replace(/[\u0600-\u06FF]/g, ' ')       // Arabic
    .replace(/[\u3000-\u303F]/g, ' ')       // CJK symbols/punctuation
    .replace(/[\u3040-\u309F]/g, ' ')       // Hiragana
    .replace(/[\u30A0-\u30FF]/g, ' ')       // Katakana
    .replace(/[\u4E00-\u9FFF]/g, ' ')       // CJK ideographs
    .replace(/[\uAC00-\uD7AF]/g, ' ')       // Korean Hangul
    .replace(/[\uFE00-\uFE0F]/g, '')        // Variation selectors (emoji modifiers)
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ') // Surrogate pairs (emojis)
    .replace(/_{2,}/g, ' ')                 // Remove blank patterns ___
    .replace(/\[blank\]/gi, ' ')            // Remove [blank]
    .replace(/\(blank\)/gi, ' ')            // Remove (blank)
    .replace(/\[.*?\]/g, ' ')               // Remove [bracketed] content
    .replace(/\((?![A-D]\))[^)]*\)/g, ' ')  // Remove (parenthetical) except option labels
    .replace(/\s+/g, ' ')                   // Clean up ALL multiple whitespace
    .trim();
  
  // DEBUG: Log the pre-cleaned script
  console.log(`[TTS LISTENING DEBUG] Type: ${type}`);
  console.log(`[TTS LISTENING DEBUG] Script (first 300 chars): "${preCleanedScript.substring(0, 300)}..."`);

  // Pre-process: strip questions and options from script
  const cleanedScript = stripQuestionsAndOptions(preCleanedScript);
  const lines = cleanedScript.split('\n').filter(line => line.trim());
  const audioSegments: Buffer[] = [];
  
  // For choose-response, include option lines (A, B, C, D with content)
  const includeOptions = type === "choose-response";

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Filter out non-script content (instructions, directions, metadata)
    // For choose-response type, keep option lines
    if (isNonScriptLine(line, includeOptions)) continue;
    
    // Skip lines that are only speaker labels without actual content
    // Single-letter abbreviations (M, W, F, S, P, N, L) MUST have a colon to be recognized as speaker labels
    const speakerOnlyPattern = /^(Man|Woman|Student|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\s*\d*|Host|Guest|Interviewer|Interviewee|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)(\s*\d*)?\s*:?\s*$/i;
    const singleLetterSpeakerOnlyPattern = /^[MWFSPNL](\s*\d*)?\s*:\s*$/i;  // Single letters MUST have colon
    if (speakerOnlyPattern.test(line.trim()) || singleLetterSpeakerOnlyPattern.test(line.trim())) continue;

    // Select voice type based on content type - lecturer for academic content, narrator for conversations
    let voiceType: VoiceType = (type === "lecture" || type === "academic-talk") ? "lecturer" : "narrator";
    let text = line;
    
    // Match role labels - single-letter abbreviations (M, W, F, S, P, N, L) MUST have colon
    const fullRoleMatch = line.match(/^(Woman|Man|Student\s*\d*|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\s*\d*|Host|Guest|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)[\s:]+(.+)/i);
    const singleLetterRoleMatch = line.match(/^([MWFSPNL])(\s*\d*)?\s*:\s*(.+)/i);  // Single letters MUST have colon
    const roleMatch = fullRoleMatch || (singleLetterRoleMatch ? [singleLetterRoleMatch[0], singleLetterRoleMatch[1], singleLetterRoleMatch[3]] : null);
    
    if (roleMatch) {
      const role = roleMatch[1].toLowerCase().replace(/\s+/g, '');
      text = roleMatch[2].trim();
      
      if (role.includes('professor') || role === 'p') voiceType = "professor";
      else if (role.includes('lecturer') || role === 'l') voiceType = "lecturer";
      else if (role === 'student2' || role === 's2') voiceType = "student2";
      else if (role.includes('student') || role === 's') voiceType = "student";
      else if (role === 'male' || role === 'man' || role === 'm' || role.includes('advisor') || role.includes('host') || role.includes('dean') || role.includes('director') || role.includes('manager') || role.includes('coach') || role.includes('instructor') || role.includes('tutor') || role.includes('mentor') || role.includes('administrator') || role.includes('coordinator') || role.includes('employee') || role.includes('registrar') || role.includes('clerk') || role.includes('officer') || role.includes('staff') || role.includes('worker') || role.includes('announcer') || role.includes('operator') || role.includes('representative') || role.includes('agent')) voiceType = "male";
      else if (role === 'female' || role === 'woman' || role === 'w' || role === 'f' || role.includes('librarian') || role.includes('guest') || role.includes('receptionist') || role.includes('counselor') || role.includes('secretary') || role.includes('attendant') || role.includes('guide')) voiceType = "female";
      else if (role === 'n' || role.includes('narrator')) voiceType = "narrator";
      else voiceType = "narrator";
    } else if (line.includes('Student') || line.includes('student')) {
      voiceType = "student";
      text = line.replace(/^Student[\s:]*\d*[\s:]*/i, '').trim();
    } else if (line.includes('Professor') || line.includes('professor')) {
      voiceType = "professor";
      text = line.replace(/^Professor[\s:]*/i, '').trim();
    } else if (line.includes('Lecturer') || line.includes('lecturer')) {
      voiceType = "lecturer";
      text = line.replace(/^Lecturer[\s:]*/i, '').trim();
    } else if (line.includes('Narrator') || line.includes('narrator')) {
      voiceType = "narrator";
      text = line.replace(/^Narrator[\s:]*/i, '').trim();
    }

    if (text.trim()) {
      const segment = await generateElevenLabsSpeech(text, voiceType, contentType);
      audioSegments.push(segment);
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return Buffer.concat(audioSegments);
}

export function isElevenLabsConfigured(): boolean {
  return !!elevenlabs;
}

export interface OptionTimestamp {
  option: string;
  startTime: number;
  endTime: number;
}

interface WithTimestampsResponse {
  audio_base64: string;
  alignment: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
  normalized_alignment?: {
    characters: string[];
    character_start_times_seconds: number[];
    character_end_times_seconds: number[];
  };
}

export async function generateSpeechWithTimestamps(
  text: string,
  voiceType: VoiceType = "narrator",
  contentType: ContentType = "conversation"
): Promise<{ audio: Buffer; alignment: WithTimestampsResponse['alignment'] | null }> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const voiceName = voiceMapping[voiceType] || "rachel";
  const voiceId = VOICE_IDS[voiceName];

  let cleanText = text
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/[àáâãäå]/gi, (c) => c.toLowerCase() === c ? 'a' : 'A')
    .replace(/[èéêë]/gi, (c) => c.toLowerCase() === c ? 'e' : 'E')
    .replace(/[ìíîï]/gi, (c) => c.toLowerCase() === c ? 'i' : 'I')
    .replace(/[òóôõö]/gi, (c) => c.toLowerCase() === c ? 'o' : 'O')
    .replace(/[ùúûü]/gi, (c) => c.toLowerCase() === c ? 'u' : 'U')
    .replace(/[ñ]/gi, (c) => c.toLowerCase() === c ? 'n' : 'N')
    .replace(/[ç]/gi, (c) => c.toLowerCase() === c ? 'c' : 'C')
    .replace(/[\u0100-\u024F]/g, ' ')
    .replace(/[\u0370-\u03FF]/g, ' ')
    .replace(/[\u0400-\u04FF]/g, ' ')
    .replace(/[\u0590-\u05FF]/g, ' ')
    .replace(/[\u0600-\u06FF]/g, ' ')
    .replace(/[\u3000-\u303F]/g, ' ')
    .replace(/[\u3040-\u309F]/g, ' ')
    .replace(/[\u30A0-\u30FF]/g, ' ')
    .replace(/[\u4E00-\u9FFF]/g, ' ')
    .replace(/[\uAC00-\uD7AF]/g, ' ')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleanText = stripSpeakerLabels(cleanText);
  cleanText = removeFillerWords(cleanText);
  if (contentType === "choose-response") {
    cleanText = formatOptionsForSpeech(cleanText);
  }
  cleanText = addLeadingPause(cleanText);

  const settings = (contentType === "academic")
    ? academicVoiceSettings
    : (contentType === "choose-response")
      ? { stability: 0.70, similarity_boost: 0.80, style: 0.30, speed: 0.95 }
      : conversationVoiceSettings;

  console.log(`[TTS WITH-TIMESTAMPS] Voice: ${voiceName}, Content: ${contentType}`);
  console.log(`[TTS WITH-TIMESTAMPS] Text (first 200 chars): "${cleanText.substring(0, 200)}..."`);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost,
            style: settings.style,
            speed: settings.speed,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs with-timestamps API error ${response.status}: ${errText}`);
    }

    const data: WithTimestampsResponse = await response.json();
    const audioBuffer = Buffer.from(data.audio_base64, 'base64');
    const alignment = data.alignment || null;

    console.log(`[TTS WITH-TIMESTAMPS] Got audio: ${audioBuffer.length} bytes, alignment chars: ${alignment?.characters?.length || 0}`);

    return { audio: audioBuffer, alignment };
  } catch (error: any) {
    console.error("❌ ElevenLabs with-timestamps error:", error?.message);
    throw error;
  }
}

function findPatternInAlignment(
  characters: string[],
  pattern: string,
  searchFrom: number = 0
): number {
  for (let ci = searchFrom; ci <= characters.length - pattern.length; ci++) {
    const segment = characters.slice(ci, ci + pattern.length).join('');
    if (segment === pattern) return ci;
  }
  return -1;
}

export function extractOptionTimestampsFromAlignment(
  alignment: WithTimestampsResponse['alignment']
): OptionTimestamp[] {
  if (!alignment || !alignment.characters || !alignment.character_start_times_seconds) {
    return [];
  }

  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment;
  const fullText = characters.join('');
  console.log(`[ALIGNMENT] Full text length: ${fullText.length}, chars: ${characters.length}`);
  console.log(`[ALIGNMENT] Full text (first 400): "${fullText.substring(0, 400)}"`);

  const timestamps: OptionTimestamp[] = [];
  const optionLabels = ['A', 'B', 'C', 'D'];

  const foundPositions: { letter: string; charIdx: number }[] = [];

  for (const letter of optionLabels) {
    const patterns = [
      `Option ${letter},`,
      `Option ${letter}`,
      `Option ${letter}.`,
    ];

    const searchFrom = foundPositions.length > 0
      ? foundPositions[foundPositions.length - 1].charIdx + 3
      : 0;

    let found = -1;
    for (const p of patterns) {
      found = findPatternInAlignment(characters, p, searchFrom);
      if (found !== -1) {
        console.log(`[ALIGNMENT] Found "${p}" at char index ${found}`);
        break;
      }
    }

    if (found === -1) {
      console.log(`[ALIGNMENT] Could not find Option ${letter} in alignment text`);
      continue;
    }

    foundPositions.push({ letter, charIdx: found });
  }

  for (let i = 0; i < foundPositions.length; i++) {
    const { letter, charIdx } = foundPositions[i];
    const startTime = character_start_times_seconds[charIdx];

    let endTime: number;
    if (i < foundPositions.length - 1) {
      endTime = character_start_times_seconds[foundPositions[i + 1].charIdx] - 0.05;
    } else {
      endTime = character_end_times_seconds[character_end_times_seconds.length - 1];
    }

    timestamps.push({
      option: letter,
      startTime: Math.round(startTime * 100) / 100,
      endTime: Math.round(endTime * 100) / 100,
    });

    console.log(`[ALIGNMENT] Option ${letter}: ${startTime.toFixed(3)}s - ${endTime.toFixed(3)}s`);
  }

  return timestamps;
}

export async function generateChooseResponseAudioWithTimestamps(
  script: string
): Promise<{ audio: Buffer; optionTimestamps: OptionTimestamp[] }> {
  if (!elevenlabs) {
    throw new Error("ElevenLabs API key not configured");
  }

  let preCleanedScript = script
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/…/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/[àáâãäå]/gi, (c) => c.toLowerCase() === c ? 'a' : 'A')
    .replace(/[èéêë]/gi, (c) => c.toLowerCase() === c ? 'e' : 'E')
    .replace(/[ìíîï]/gi, (c) => c.toLowerCase() === c ? 'i' : 'I')
    .replace(/[òóôõö]/gi, (c) => c.toLowerCase() === c ? 'o' : 'O')
    .replace(/[ùúûü]/gi, (c) => c.toLowerCase() === c ? 'u' : 'U')
    .replace(/[ñ]/gi, (c) => c.toLowerCase() === c ? 'n' : 'N')
    .replace(/[ç]/gi, (c) => c.toLowerCase() === c ? 'c' : 'C')
    .replace(/[\u0100-\u024F]/g, ' ')
    .replace(/[\u0370-\u03FF]/g, ' ')
    .replace(/[\u0400-\u04FF]/g, ' ')
    .replace(/[\u0590-\u05FF]/g, ' ')
    .replace(/[\u0600-\u06FF]/g, ' ')
    .replace(/[\u3000-\u303F]/g, ' ')
    .replace(/[\u3040-\u309F]/g, ' ')
    .replace(/[\u30A0-\u30FF]/g, ' ')
    .replace(/[\u4E00-\u9FFF]/g, ' ')
    .replace(/[\uAC00-\uD7AF]/g, ' ')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ')
    .replace(/_{2,}/g, ' ')
    .replace(/\[blank\]/gi, ' ')
    .replace(/\(blank\)/gi, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\((?![A-D]\))[^)]*\)/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

  const cleanedScript = stripQuestionsAndOptions(preCleanedScript);
  const lines = cleanedScript.split('\n').filter(line => line.trim());

  const dialogueLines: string[] = [];
  const optionLines: string[] = [];
  let hitOptions = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (isNonScriptLine(line, true)) continue;

    const speakerOnlyPattern = /^(Man|Woman|Student|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\s*\d*|Host|Guest|Interviewer|Interviewee|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)(\s*\d*)?\s*:?\s*$/i;
    const singleLetterSpeakerOnlyPattern = /^[MWFSPNL](\s*\d*)?\s*:\s*$/i;
    if (speakerOnlyPattern.test(line.trim()) || singleLetterSpeakerOnlyPattern.test(line.trim())) continue;

    const isOptionLine = /^(Option\s+)?[A-D][\.\):\s]/i.test(line.trim()) || /^\([A-D]\)/i.test(line.trim());
    if (isOptionLine) {
      hitOptions = true;
      optionLines.push(line.trim());
    } else if (!hitOptions) {
      dialogueLines.push(line.trim());
    }
  }

  console.log(`[CHOOSE-RESPONSE-TS] Dialogue lines: ${dialogueLines.length}, Option lines: ${optionLines.length}`);

  const dialogueSegments: Buffer[] = [];
  let dialogueDuration = 0;

  for (const line of dialogueLines) {
    let voiceType: VoiceType = "narrator";
    let text = line;

    const fullRoleMatch = line.match(/^(Woman|Man|Student\s*\d*|Professor|Narrator|Lecturer|Teacher|Librarian|Assistant|Advisor|Male|Female|Speaker\s*\d*|Host|Guest|Dean|Director|Manager|Receptionist|Counselor|Coach|Instructor|Tutor|Mentor|Administrator|Coordinator|Podcast\s*Host|Employee|Registrar|Clerk|Secretary|Officer|Staff|Worker|Attendant|Guide|Announcer|Operator|Representative|Agent)[\s:]+(.+)/i);
    const singleLetterRoleMatch = line.match(/^([MWFSPNL])(\s*\d*)?\s*:\s*(.+)/i);
    const roleMatch = fullRoleMatch || (singleLetterRoleMatch ? [singleLetterRoleMatch[0], singleLetterRoleMatch[1], singleLetterRoleMatch[3]] : null);

    if (roleMatch) {
      const role = roleMatch[1].toLowerCase().replace(/\s+/g, '');
      text = roleMatch[2].trim();
      if (role.includes('professor') || role === 'p') voiceType = "professor";
      else if (role.includes('lecturer') || role === 'l') voiceType = "lecturer";
      else if (role === 'student2' || role === 's2') voiceType = "student2";
      else if (role.includes('student') || role === 's') voiceType = "student";
      else if (role === 'male' || role === 'man' || role === 'm') voiceType = "male";
      else if (role === 'female' || role === 'woman' || role === 'w' || role === 'f') voiceType = "female";
      else voiceType = "narrator";
    }

    if (text.trim()) {
      const segment = await generateElevenLabsSpeech(text, voiceType, "conversation");
      dialogueSegments.push(segment);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (dialogueSegments.length > 0) {
    const dialogueBuffer = Buffer.concat(dialogueSegments);
    try {
      const { execSync } = await import('child_process');
      const tmpPath = `/tmp/dialogue_duration_${Date.now()}.mp3`;
      const fs = await import('fs');
      fs.writeFileSync(tmpPath, dialogueBuffer);
      const durationStr = execSync(
        `ffprobe -v quiet -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${tmpPath}"`,
        { encoding: 'utf8' }
      ).trim();
      dialogueDuration = parseFloat(durationStr) || 0;
      try { fs.unlinkSync(tmpPath); } catch {}
      console.log(`[CHOOSE-RESPONSE-TS] Dialogue audio: ${dialogueBuffer.length} bytes, precise duration: ${dialogueDuration.toFixed(3)}s`);
    } catch {
      const mp3BitRate = 128 * 1024 / 8;
      dialogueDuration = dialogueBuffer.length / mp3BitRate;
      console.log(`[CHOOSE-RESPONSE-TS] Dialogue audio: ${dialogueBuffer.length} bytes, estimated duration: ${dialogueDuration.toFixed(2)}s (ffprobe unavailable)`);
    }
  }

  const optionsText = optionLines.join('\n');
  console.log(`[CHOOSE-RESPONSE-TS] Options text for with-timestamps: "${optionsText.substring(0, 300)}"`);

  const { audio: optionsAudio, alignment } = await generateSpeechWithTimestamps(
    optionsText,
    "narrator",
    "choose-response"
  );

  let optionTimestamps: OptionTimestamp[] = [];
  if (alignment) {
    optionTimestamps = extractOptionTimestampsFromAlignment(alignment);
    optionTimestamps = optionTimestamps.map(ts => ({
      ...ts,
      startTime: Math.round((ts.startTime + dialogueDuration) * 100) / 100,
      endTime: Math.round((ts.endTime + dialogueDuration) * 100) / 100,
    }));
    console.log(`[CHOOSE-RESPONSE-TS] Final timestamps with dialogue offset ${dialogueDuration.toFixed(2)}s:`, JSON.stringify(optionTimestamps));
  }

  const finalAudio = dialogueSegments.length > 0
    ? Buffer.concat([...dialogueSegments, optionsAudio])
    : optionsAudio;

  return { audio: finalAudio, optionTimestamps };
}

export function calculateOptionTimestamps(options: string[]): OptionTimestamp[] {
  const optionLabelTime = 0.8;
  const commaPause = 0.2;
  const wordsPerSecond = 2.8;
  const pauseBetweenOptions = 0.4;

  const timestamps: OptionTimestamp[] = [];
  let currentTime = 0;

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    const letter = String.fromCharCode(65 + i);

    if (i > 0) {
      currentTime += pauseBetweenOptions;
    }

    const optionStartTime = currentTime;
    currentTime += optionLabelTime;
    currentTime += commaPause;

    const wordCount = option.split(/\s+/).length;
    const contentDuration = Math.max(0.8, wordCount / wordsPerSecond);
    currentTime += contentDuration;

    const optionEndTime = currentTime;

    timestamps.push({
      option: letter,
      startTime: Math.round(optionStartTime * 10) / 10,
      endTime: Math.round(optionEndTime * 10) / 10
    });
  }

  return timestamps;
}
