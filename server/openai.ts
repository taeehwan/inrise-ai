import OpenAI from "openai";
import * as fs from "fs";
import path from "path";
import { getOpenAIModel, OPENAI_STT_MODEL, OPENAI_TTS_MODEL } from "./openaiModels";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Extract text from image using GPT-4o vision
export async function extractTextFromImage(base64Image: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "이 이미지에서 모든 텍스트를 추출해주세요. 텍스트만 정확히 반환하고 다른 설명은 하지 마세요."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ],
      },
    ],
    max_completion_tokens: 1000,
  });

  return response.choices[0].message.content || "";
}

// Generate TOEFL Listening content with script and audio
export async function generateListeningContent(
  content: string,
  difficulty: string = "medium",
  count: number = 3
): Promise<{
  script: string;
  questions: any[];
  audioUrl?: string;
  type: "conversation" | "academic-talk";
}> {
  try {
    const sampleScript = `Narrator: Listen to part of a conversation between a student and a professor.
Student: I am so sorry I am late, Professor Mills. I just finished at the student medical center. I twisted my ankle playing soccer this morning. It took longer than I expected to see the doctor.
Professor: That's okay. Don't worry about it, David. So let's get started. Your paper on John Dewey's political philosophy has a few issues I'd like to cover. You gave a great biographical sketch in the beginning. Okay. But then as you get into his political philosophy, I don't think you've done enough to situate his philosophy within the time period. In other words, you haven't connected Dewey's philosophy to the thinking of other intellectuals of the time.
Student: So I haven't captured the most critical influences, the influences that were most significant to his political thinking?
Professor: Exactly. OK. Now, look back up at the section here, where you wrote about Dewey's view of individuality. This is all good content. But you haven't presented the information in a systematic way. I really think this portion on individuality needs to come later, after your paragraphs on Dewey's intellectual influences.`;

    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `You are an expert TOEFL Listening test creator. Generate authentic university-level content with realistic dialogue, natural speech patterns, and appropriate academic vocabulary. You must respond in JSON format.

CRITICAL TONE GUIDELINES:
- Maintain a calm, professional, and academic tone throughout
- AVOID casual, playful, or overly informal language
- Use formal university-appropriate expressions
- No slang, jokes, or exaggerated emotional expressions
- Keep the dialogue serious and educational
- Speakers should sound like real university professors, students, and staff

Create listening content in this exact JSON format:
{
  "type": "conversation" | "academic-talk",
  "script": "Speaker: Text format with each line as 'SpeakerName: Dialogue text'",
  "questions": [
    {
      "questionText": "What is the main topic of the conversation?",
      "questionType": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation",
      "points": 1
    }
  ]
}

Type Selection:
- "conversation": Two or more speakers in dialogue (student-professor, student-staff, campus interactions, or announcements)
- "academic-talk": Professor lecturing on an academic topic (may include student questions)

Script Format Requirements:
- MUST use "Speaker: Text" format on each line (e.g., "Student: I have a question about the assignment.")
- Start with "Narrator: Listen to..." to introduce the context
- Use speaker names like Student, Professor, Librarian, Advisor, etc.
- Each dialogue line must be on a new line with format "SpeakerName: dialogue text"

Other Requirements:
- Professional, academic dialogue with formal tone
- Clear speaker identification in every line
- ${count} comprehensive questions covering main ideas, details, inferences, and speaker attitudes
- Difficulty level: ${difficulty}
- Content should be 2-3 minutes when spoken
- Include realistic university contexts (office hours, lectures, campus situations)
- Always respond with valid JSON object format only`
        },
        {
          role: "user",
          content: `Generate TOEFL Listening content based on this sample format and style:

${sampleScript}

Create new content about: ${content}

IMPORTANT: Use a calm, professional, and academic tone. Avoid playful or casual language.
Make it authentic and realistic with formal academic dialogue. Include exactly ${count} questions of varying difficulty. Please respond in JSON format as specified above.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000,
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    // Normalize "announcement" type to "conversation" for NEW TOEFL 2026
    if (result.type === 'announcement') {
      result.type = 'conversation';
    }
    return result;
  } catch (error) {
    console.error("Error generating listening content:", error);
    throw error;
  }
}

// Generate audio from script using OpenAI TTS
export async function generateListeningAudio(
  script: string,
  type: "conversation" | "academic-talk" | "lecture"
): Promise<Buffer> {
  try {
    // Determine voices based on speakers
    const lines = script.split('\n').filter(line => line.trim());
    let processedScript = "";
    
    for (const line of lines) {
      if (line.includes('Student') || line.includes('student')) {
        // Use female voice for students
        const text = line.replace(/^Student[\s:]*/, '').trim();
        if (text) {
          processedScript += `[Student voice] ${text}\n\n`;
        }
      } else if (line.includes('Professor') || line.includes('professor') || line.includes('Teacher')) {
        // Use male voice for professors
        const text = line.replace(/^Professor[\s:]*|^Teacher[\s:]*/, '').trim();
        if (text) {
          processedScript += `[Professor voice] ${text}\n\n`;
        }
      } else if (line.includes('Lecturer') || line.includes('lecturer')) {
        // Use male voice for lecturers
        const text = line.replace(/^Lecturer[\s:]*/, '').trim();
        if (text) {
          processedScript += `[Lecturer voice] ${text}\n\n`;
        }
      } else if (!line.includes('Listen to') && line.trim()) {
        // Regular text without speaker label
        processedScript += `${line}\n\n`;
      }
    }

    // Strip bracketed role tags before TTS (e.g., "[Student voice]", "[Professor voice]")
    processedScript = processedScript.replace(/\[(?:Student|Professor|Lecturer|Narrator)\s*voice\]\s*/gi, '');
    
    // Voice selection: calm, professional voices for academic content
    // alloy: calm female, onyx: deep measured male
    let voice: "alloy" | "onyx" | "shimmer" = "alloy";
    if (type === "academic-talk" || type === "lecture") {
      voice = "onyx"; // Deep, measured male for academic talks
    } else {
      voice = "shimmer"; // Natural female for conversations
    }

    // Generate TTS audio with brighter, more lively pace
    const mp3 = await openai.audio.speech.create({
      model: OPENAI_TTS_MODEL,
      voice: voice,
      input: processedScript,
      speed: 1.02 // Slightly faster for energetic, engaging delivery
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (error) {
    console.error("Error generating audio:", error);
    throw error;
  }
}

// Generate speech from text using TTS with brighter, more lively tone
export async function generateSpeech(text: string): Promise<Buffer> {
  const mp3 = await openai.audio.speech.create({
    model: OPENAI_TTS_MODEL,
    voice: "shimmer",
    input: text,
    speed: 1.02 // Slightly faster for energetic, engaging delivery
  });

  return Buffer.from(await mp3.arrayBuffer());
}

// Generate multi-voice speech for listening tests with role-based voices
export async function generateMultiVoiceSpeech(script: string): Promise<Buffer> {
  try {
    // Voice mapping based on roles - calm, professional voices for academic content
    // Using: alloy (calm female), onyx (measured male), shimmer (clear female)
    const voiceMap: Record<string, string> = {
      'narrator': 'alloy',      // Calm, professional female narrator
      'professor': 'onyx',      // Measured, authoritative male professor
      'lecturer': 'onyx',       // Professional, measured male lecturer
      'student': 'shimmer',     // Clear, calm female student
      'student1': 'shimmer',    // Clear female student 1
      'student2': 'echo',       // Calm male student 2
      'male': 'echo',           // Calm, professional male voice
      'female': 'alloy',        // Calm, clear female voice
      'man': 'echo',            // Male voice for Man: labels
      'woman': 'alloy',         // Female voice for Woman: labels
      'm': 'echo',              // Abbreviated male
      'w': 'alloy',             // Abbreviated female
    };

    // Helper to strip speaker labels and quotes
    const stripLabels = (text: string): string => {
      return text
        .replace(/^(Woman|Man|Student\s*\d*|Professor|Narrator|Lecturer|Male|Female|M|W|F|S|P|N|L)(\s*\d*)?\s*:\s*["']?/i, '')
        .replace(/["']\s*$/, '')
        .trim();
    };

    // Parse script to identify roles
    const lines = script.split('\n').filter(line => line.trim());
    const audioSegments: Buffer[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      // Match pattern: "Role: text" or "Role\ntext" - including Man/Woman/M/W
      const roleMatch = line.match(/^(Narrator|Professor|Lecturer|Student\s*\d*|Male|Female|Man|Woman|M|W|F|S|P|N|L)[\s:]+(.+)/i);
      
      if (roleMatch) {
        const role = roleMatch[1].toLowerCase().replace(/\s+/g, '');
        const rawText = roleMatch[2].trim();
        // Strip any remaining quotes
        const text = stripLabels(rawText);
        const voice = voiceMap[role] || voiceMap['narrator'];

        if (text) {
          // Generate audio for this segment with brighter, more lively delivery
          const mp3 = await openai.audio.speech.create({
            model: OPENAI_TTS_MODEL,
            voice: voice as any,
            input: text,
            speed: 1.02  // Slightly faster for energetic, engaging tone
          });

          const buffer = Buffer.from(await mp3.arrayBuffer());
          audioSegments.push(buffer);
        }
      } else {
        // No role detected, strip any labels and use narrator voice
        const cleanLine = stripLabels(line);
        if (cleanLine) {
          const mp3 = await openai.audio.speech.create({
            model: OPENAI_TTS_MODEL,
            voice: "alloy",  // Clear, professional narrator
            input: cleanLine,
            speed: 1.02  // Slightly faster for lively, engaging content
          });

          const buffer = Buffer.from(await mp3.arrayBuffer());
          audioSegments.push(buffer);
        }
      }
    }

    // Concatenate all audio segments
    return Buffer.concat(audioSegments);
  } catch (error) {
    console.error("Error generating multi-voice speech:", error);
    throw error;
  }
}

// Auto-generate TOEFL Speaking Questions (Independent only)
export async function generateSpeakingQuestions(topics: string[]): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `You are an expert TOEFL test creator. Generate TOEFL Independent Speaking questions based on the provided topics. 

INDEPENDENT QUESTIONS FORMAT:
- Personal preference/experience questions
- 15 seconds preparation, 45 seconds response
- Clear, specific question prompts
- Focus on personal opinions, experiences, and preferences

Format as JSON array with this structure:
{
  "type": "independent",
  "title": "Brief topic title",
  "questionText": "Complete question prompt",
  "preparationTime": 15,
  "responseTime": 45
}

IMPORTANT: Generate ONLY independent questions. Do not include reading passages or listening scripts.`
        },
        {
          role: "user",
          content: `Generate TOEFL Independent Speaking questions based on these topics:

${topics.join('\n')}

Create authentic independent questions that ask about personal preferences, experiences, or opinions. Make them challenging but fair for TOEFL test-takers.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"questions": []}';
    console.log("AI response for speaking questions:", content.substring(0, 500));
    
    const result = JSON.parse(content);
    
    // Handle different response formats
    let questions = [];
    if (Array.isArray(result)) {
      questions = result;
    } else if (result.questions && Array.isArray(result.questions)) {
      questions = result.questions;
    } else if (result.items && Array.isArray(result.items)) {
      questions = result.items;
    } else if (result.data && Array.isArray(result.data)) {
      questions = result.data;
    }
    
    console.log(`Generated ${questions.length} speaking questions`);
    return questions;
  } catch (error) {
    console.error("Question generation error:", error);
    throw new Error("Failed to generate speaking questions");
  }
}

// Auto-generate GRE Writing Topics with error handling and rate limiting
export async function generateGREWritingTopics(topics: string[], taskType: 'issue' | 'argument' = 'issue'): Promise<any[]> {
  const allQuestions: any[] = [];
  const errors: string[] = [];
  let successCount = 0;
  let failCount = 0;
  
  console.log(`Starting GRE ${taskType} topic generation for ${topics.length} topics`);
  
  // Process each topic individually with error handling
  for (let i = 0; i < topics.length; i++) {
    const topicText = topics[i];
    
    if (!topicText.trim()) {
      console.log(`Skipping empty topic ${i + 1}`);
      continue;
    }
    
    try {
      console.log(`[${i + 1}/${topics.length}] Generating GRE ${taskType} task for: ${topicText.substring(0, 50)}...`);
      
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("standard"),
        messages: [
          {
            role: "system",
            content: `You are a GRE Analytical Writing test formatter. Your job is to take user-provided text and format it into a proper GRE Writing task.

CRITICAL RULES:
1. DO NOT create new topics or add extra content
2. Use ONLY the exact text provided by the user
3. Create EXACTLY ONE ${taskType.toUpperCase()} task
4. Keep the user's original text as the main content

${taskType === 'issue' ? `ISSUE TASK format:
- The main statement/claim from user input
- Standard instructions: "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take. In developing and supporting your position, you should consider ways in which the statement might or might not hold true and explain how these considerations shape your position."` : `ARGUMENT TASK format:
- The argument with reasoning from user input
- Standard instructions: "Write a response in which you examine the stated and/or unstated assumptions of the argument. Be sure to explain how the argument depends on these assumptions and what the implications are for the argument if the assumptions prove unwarranted."`}

Format the output as JSON:
{
  "type": "${taskType}",
  "title": "Create a brief descriptive title (5-8 words) based on the topic",
  "questionText": "The main statement or argument (use EXACT text from user)",
  "instructions": "${taskType === 'issue' ? 'Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take. In developing and supporting your position, you should consider ways in which the statement might or might not hold true and explain how these considerations shape your position.' : 'Write a response in which you examine the stated and/or unstated assumptions of the argument. Be sure to explain how the argument depends on these assumptions and what the implications are for the argument if the assumptions prove unwarranted.'}",
  "timeLimit": 30
}`
          },
          {
            role: "user",
            content: `Format this text as a GRE ${taskType === 'issue' ? 'Issue' : 'Argument'} task:

${topicText.trim()}

Remember: Use the EXACT text provided. Create a brief title and use standard GRE instructions for ${taskType} tasks.`
          }
        ],
        response_format: { type: "json_object" }
      });

      const rawContent = response.choices[0].message.content || '{}';
      const result = JSON.parse(rawContent);
      
      // Handle both single object and array responses
      if (result.type) {
        allQuestions.push(result);
        successCount++;
        console.log(`✓ Successfully generated topic ${i + 1}`);
      } else if (result.questions && Array.isArray(result.questions)) {
        allQuestions.push(...result.questions);
        successCount += result.questions.length;
        console.log(`✓ Successfully generated ${result.questions.length} topic(s) for item ${i + 1}`);
      } else {
        failCount++;
        errors.push(`Topic ${i + 1}: Invalid response format`);
        console.error(`✗ Failed to parse response for topic ${i + 1}`);
      }
      
      // Add small delay to avoid rate limiting (100ms between requests)
      if (i < topics.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      failCount++;
      const errorMsg = `Topic ${i + 1}: ${error.message || 'Unknown error'}`;
      errors.push(errorMsg);
      console.error(`✗ Error generating topic ${i + 1}:`, error.message);
      
      // Continue to next topic instead of failing completely
      continue;
    }
  }
  
  console.log(`\nGeneration complete: ${successCount} succeeded, ${failCount} failed out of ${topics.length} topics`);
  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  }
  
  return allQuestions;
}

// Real OpenAI Whisper Speech-to-Text Function
export async function generateSpeechToText(audioBuffer: Buffer): Promise<string> {
  try {
    const response = await openai.audio.transcriptions.create({
      file: new File([audioBuffer], "audio.webm", { type: "audio/webm" }),
      model: OPENAI_STT_MODEL,
      language: "en",
    });

    return response.text || "Transcription failed";
  } catch (error) {
    console.error("Whisper API error:", error);
    throw new Error("Speech to text conversion failed");
  }
}

// Speech metrics interface for pronunciation and delivery analysis
export interface SpeechMetrics {
  transcript: string;
  duration: number; // Total speech duration in seconds
  wordCount: number;
  wordsPerMinute: number; // Speaking rate (WPM)
  pauseCount: number; // Number of significant pauses
  avgPauseDuration: number; // Average pause duration in seconds
  longestPause: number; // Longest pause in seconds
  hesitationMarkers: number; // Count of "um", "uh", "like", etc.
  selfCorrections: number; // Estimated self-corrections
  speechRate: 'slow' | 'normal' | 'fast'; // Categorized speech rate
  fluencyScore: number; // 0-100 based on pause patterns and rate
  pronunciationConfidence: number; // Average word confidence from Whisper (0-1)
  segments: {
    text: string;
    start: number;
    end: number;
    confidence: number;
  }[];
}

// Enhanced Speech-to-Text with Word-Level Timestamps and Speech Analysis
// Accepts either Buffer or file path string
export async function generateSpeechToTextWithAnalysis(audioInput: Buffer | string): Promise<SpeechMetrics> {
  try {
    // Prepare file input - handle both Buffer and file path
    let fileInput: any;
    if (typeof audioInput === 'string') {
      // It's a file path - create a ReadStream
      fileInput = fs.createReadStream(audioInput);
    } else {
      // It's a Buffer - create a Blob-like object for OpenAI SDK
      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(audioInput);
      stream.push(null);
      (stream as any).name = "audio.webm";
      fileInput = stream;
    }
    
    // Use verbose_json format to get word-level timestamps and confidence scores
    const response = await openai.audio.transcriptions.create({
      file: fileInput,
      model: OPENAI_STT_MODEL,
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"],
    });

    // Parse the verbose response
    const verboseResponse = response as any;
    const transcript = verboseResponse.text || "";
    const words = verboseResponse.words || [];
    const segments = verboseResponse.segments || [];
    const duration = verboseResponse.duration || 0;
    
    // Calculate speech metrics from word-level data
    const wordCount = words.length || transcript.split(/\s+/).filter((w: string) => w.length > 0).length;
    const wordsPerMinute = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;
    
    // Analyze pauses between words
    let pauseCount = 0;
    let totalPauseDuration = 0;
    let longestPause = 0;
    const pauseThreshold = 0.5; // Pauses longer than 0.5 seconds are significant
    
    for (let i = 1; i < words.length; i++) {
      const pauseDuration = words[i].start - words[i - 1].end;
      if (pauseDuration > pauseThreshold) {
        pauseCount++;
        totalPauseDuration += pauseDuration;
        longestPause = Math.max(longestPause, pauseDuration);
      }
    }
    
    const avgPauseDuration = pauseCount > 0 ? totalPauseDuration / pauseCount : 0;
    
    // Detect hesitation markers
    const hesitationPatterns = /\b(um|uh|er|ah|like|you know|so|well|basically|actually)\b/gi;
    const hesitationMarkers = (transcript.match(hesitationPatterns) || []).length;
    
    // Detect potential self-corrections (repeated words, false starts)
    const selfCorrectionPattern = /\b(\w+)\s+\1\b|\b\w{1,3}\s+\w+\b/gi;
    const selfCorrections = Math.min((transcript.match(selfCorrectionPattern) || []).length, 10);
    
    // Categorize speech rate based on WPM (optimal for TOEFL: 120-150 WPM)
    let speechRate: 'slow' | 'normal' | 'fast';
    if (wordsPerMinute < 100) {
      speechRate = 'slow';
    } else if (wordsPerMinute > 170) {
      speechRate = 'fast';
    } else {
      speechRate = 'normal';
    }
    
    // Calculate fluency score (0-100) based on multiple factors
    let fluencyScore = 100;
    
    // Deduct for hesitation markers (max -20)
    fluencyScore -= Math.min(hesitationMarkers * 2, 20);
    
    // Deduct for excessive pauses (max -25)
    const pausePenalty = Math.min(pauseCount * 2.5, 25);
    fluencyScore -= pausePenalty;
    
    // Deduct for very slow or very fast speech (max -15)
    if (speechRate === 'slow') {
      fluencyScore -= Math.min((100 - wordsPerMinute) / 5, 15);
    } else if (speechRate === 'fast') {
      fluencyScore -= Math.min((wordsPerMinute - 170) / 10, 15);
    }
    
    // Deduct for self-corrections (max -10)
    fluencyScore -= Math.min(selfCorrections * 2, 10);
    
    // Deduct for very long pauses (max -15)
    if (longestPause > 2) {
      fluencyScore -= Math.min((longestPause - 2) * 5, 15);
    }
    
    fluencyScore = Math.max(0, Math.min(100, fluencyScore));
    
    // Calculate average pronunciation confidence from word-level data
    let pronunciationConfidence = 0.85; // Default if no word-level data
    if (words.length > 0) {
      const totalConfidence = words.reduce((sum: number, word: any) => 
        sum + (word.probability || word.confidence || 0.85), 0);
      pronunciationConfidence = totalConfidence / words.length;
    }
    
    // Build segment data for detailed feedback
    const segmentData = segments.map((seg: any) => ({
      text: seg.text || "",
      start: seg.start || 0,
      end: seg.end || 0,
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.85,
    }));
    
    console.log(`Speech analysis complete: ${wordCount} words, ${wordsPerMinute} WPM, ${pauseCount} pauses, fluency: ${fluencyScore}`);
    
    return {
      transcript,
      duration,
      wordCount,
      wordsPerMinute,
      pauseCount,
      avgPauseDuration: Math.round(avgPauseDuration * 100) / 100,
      longestPause: Math.round(longestPause * 100) / 100,
      hesitationMarkers,
      selfCorrections,
      speechRate,
      fluencyScore: Math.round(fluencyScore),
      pronunciationConfidence: Math.round(pronunciationConfidence * 100) / 100,
      segments: segmentData,
    };
  } catch (error) {
    console.error("Whisper API error with analysis:", error);
    // Fallback to basic transcription if verbose fails
    // If input was a file path, read it as buffer for fallback
    let bufferForFallback: Buffer;
    if (typeof audioInput === 'string') {
      bufferForFallback = fs.readFileSync(audioInput);
    } else {
      bufferForFallback = audioInput;
    }
    const basicTranscript = await generateSpeechToText(bufferForFallback);
    const words = basicTranscript.split(/\s+/).filter(w => w.length > 0);
    
    return {
      transcript: basicTranscript,
      duration: 0,
      wordCount: words.length,
      wordsPerMinute: 0,
      pauseCount: 0,
      avgPauseDuration: 0,
      longestPause: 0,
      hesitationMarkers: 0,
      selfCorrections: 0,
      speechRate: 'normal',
      fluencyScore: 75, // Default mid-range
      pronunciationConfidence: 0.85,
      segments: [],
    };
  }
}

// Generate Reading Section with multiple passages and questions
export async function generateReadingSection(examType: string, difficulty: string, questionCount: number = 10, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} 리딩 테스트 전문가입니다. 고품질의 리딩 섹션을 생성해주세요.

${examType === 'toefl' ? `
TOEFL 리딩 섹션 요구사항:
- 3-4개의 학술적 지문 (각 700-800단어)
- 각 지문당 12-14문제
- 문제 유형: Multiple Choice, Insert Text, Summary, Category
- 주제: 자연과학, 사회과학, 예술사/문학, 생명과학
- 시간 제한: 54-72분 (지문당 18분)

문제 유형별 세부사항:
1. Multiple Choice: 사실 정보, 추론, 어휘, 수사학적 목적
2. Insert Text: 문장 삽입 위치 결정
3. Summary: 6개 선택지 중 3개 핵심 내용 선택
4. Category: 정보를 적절한 범주로 분류
` : `
GRE 리딩 섹션 요구사항:
- 1-2개의 지문 (단문: 1-5문장, 장문: 1-5단락)
- 각 지문당 1-6문제
- 문제 유형: Multiple Choice, Select-in-Passage
- 주제: 인문학, 사회과학, 자연과학, 일상 주제
- 시간 제한: 18분 (전체 Verbal 섹션)

문제 유형별 세부사항:
1. Multiple Choice: 단일 정답, 복수 정답 (3개 중 모든 정답 선택)
2. Select-in-Passage: 지문에서 특정 조건을 만족하는 문장 선택
`}

난이도: ${difficulty} (easy: 기초 수준, medium: 중급 수준, hard: 고급 수준)

응답 형식 (JSON):
{
  "passages": [
    {
      "id": "passage-1",
      "title": "지문 제목",
      "content": "전체 지문 내용...",
      "wordCount": 800,
      "topic": "주제 분야",
      "questions": [
        {
          "id": "q1",
          "questionText": "질문 내용",
          "questionType": "multiple-choice" | "insert-text" | "summary" | "category" | "select-in-passage",
          "options": ["A. 선택지1", "B. 선택지2", "C. 선택지3", "D. 선택지4"],
          "correctAnswer": "A" | ["A", "B", "C"] | "paragraph-2",
          "explanation": "정답 해설",
          "points": 1
        }
      ]
    }
  ],
  "totalQuestions": 40,
  "timeLimit": 54,
  "estimatedDifficulty": "medium"
}`
        },
        {
          role: "user",
          content: `${examType.toUpperCase()} 리딩 섹션을 생성해주세요.

요구사항:
- 난이도: ${difficulty}
- 총 문제 수: ${questionCount}개
- 주제: ${topic || '다양한 학술 주제'}

실제 시험과 동일한 수준의 고품질 지문과 문제를 생성해주세요. 각 지문은 흥미롭고 교육적이어야 하며, 문제는 정확하고 명확해야 합니다.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"passages": [], "totalQuestions": 0, "timeLimit": 54}');
    
    // Validate and format passages
    const passages = result.passages || [];
    
    return {
      passages: passages.map((passage: any, index: number) => ({
        id: passage.id || `passage-${index + 1}`,
        title: passage.title || `Reading Passage ${index + 1}`,
        content: passage.content || "",
        wordCount: passage.wordCount || passage.content?.split(" ").length || 0,
        topic: passage.topic || "Academic",
        questions: (passage.questions || []).map((q: any, qIndex: number) => ({
          id: q.id || `q${qIndex + 1}`,
          questionText: q.questionText || "",
          questionType: q.questionType || "multiple-choice",
          options: q.options || [],
          correctAnswer: q.correctAnswer || "A",
          explanation: q.explanation || "",
          points: q.points || 1
        }))
      })),
      totalQuestions: result.totalQuestions || questionCount,
      timeLimit: result.timeLimit || (examType === 'toefl' ? 54 : 18),
      estimatedDifficulty: difficulty
    };
    
  } catch (error) {
    console.error("Reading section generation error:", error);
    throw new Error("리딩 섹션 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate Questions from User-Provided Passage
export async function generateQuestionsFromPassage(
  examType: string,
  passageContent: string,
  passageTitle: string,
  difficulty: string,
  questionCount: number = 5
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} 리딩 테스트 전문가입니다. 주어진 지문을 기반으로 고품질의 문제를 생성해주세요.

${examType === 'toefl' ? `
TOEFL 리딩 문제 유형:
1. Multiple Choice: 사실 정보, 추론, 어휘, 수사학적 목적
2. Insert Text: 문장 삽입 위치 결정 (지문에 [■] 마커 사용)
3. Summary: 6개 선택지 중 3개 핵심 내용 선택
4. Category: 정보를 적절한 범주로 분류

문제는 명확하고 정확해야 하며, 지문의 내용을 깊이 이해했는지 평가해야 합니다.
` : `
GRE 리딩 문제 유형:
1. Multiple Choice (단일 정답)
2. Multiple Choice (복수 정답 - 모든 정답 선택)
3. Select-in-Passage: 지문에서 특정 문장 선택

문제는 논리적 추론과 비판적 사고를 요구해야 합니다.
`}

난이도: ${difficulty}

응답 형식 (JSON):
{
  "passages": [
    {
      "id": "passage-1",
      "title": "지문 제목",
      "content": "지문 내용 (원본 그대로)",
      "wordCount": 단어 수,
      "topic": "주제",
      "questions": [
        {
          "id": "q1",
          "questionText": "질문 내용",
          "questionType": "multiple-choice" | "insertion" | "summary" | "category",
          "options": ["A. 선택지1", "B. 선택지2", "C. 선택지3", "D. 선택지4"],
          "correctAnswer": "A" | ["A", "B", "C"],
          "explanation": "정답 해설",
          "points": 1
        }
      ]
    }
  ],
  "totalQuestions": ${questionCount},
  "timeLimit": 18,
  "estimatedDifficulty": "${difficulty}"
}`
        },
        {
          role: "user",
          content: `다음 지문을 기반으로 ${questionCount}개의 고품질 문제를 생성해주세요.

지문 제목: ${passageTitle}

지문 내용:
${passageContent}

요구사항:
- 난이도: ${difficulty}
- 문제 수: ${questionCount}개
- 다양한 문제 유형 사용
- 지문의 핵심 내용을 평가하는 문제 생성
- 각 문제는 명확하고 정답이 분명해야 함`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"passages": [], "totalQuestions": 0}');
    
    // Ensure the passage content matches what user provided
    if (result.passages && result.passages.length > 0) {
      result.passages[0].content = passageContent;
      result.passages[0].title = passageTitle;
    } else {
      result.passages = [{
        id: "passage-1",
        title: passageTitle,
        content: passageContent,
        wordCount: passageContent.split(" ").length,
        topic: "User Provided",
        questions: []
      }];
    }

    return {
      passages: result.passages.map((passage: any, index: number) => ({
        id: passage.id || `passage-${index + 1}`,
        title: passage.title || passageTitle,
        content: passage.content || passageContent,
        wordCount: passage.content?.split(" ").length || 0,
        topic: passage.topic || "User Provided",
        questions: (passage.questions || []).map((q: any, qIndex: number) => ({
          id: q.id || `q${qIndex + 1}`,
          questionText: q.questionText || "",
          questionType: q.questionType || "multiple-choice",
          options: q.options || [],
          correctAnswer: q.correctAnswer || "A",
          explanation: q.explanation || "",
          points: q.points || 1
        }))
      })),
      totalQuestions: result.totalQuestions || questionCount,
      timeLimit: result.timeLimit || 18,
      estimatedDifficulty: difficulty
    };
  } catch (error) {
    console.error("Questions from passage generation error:", error);
    throw new Error("지문 기반 문제 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate Speaking Section
export async function generateSpeakingSection(examType: string, difficulty: string, questionCount: number = 4, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} 스피킹 테스트 전문가입니다. 고품질의 스피킹 섹션을 생성해주세요.

${examType === 'toefl' ? `
TOEFL 스피킹 섹션 요구사항:
- 4개의 스피킹 과제 (Independent: 2개, Integrated: 2개)
- Independent Task: 개인 경험이나 의견 표현
- Integrated Task: 읽기+듣기+말하기 또는 듣기+말하기
- 준비시간: 15-30초, 답변시간: 45-60초
- 평가 기준: 발음, 유창성, 어휘, 문법, 주제 전개

과제 유형:
1. Personal Preference (개인 선호)
2. Opinion/Choice (의견/선택)
3. Reading + Listening + Speaking
4. Listening + Speaking
` : `
GRE 스피킹 섹션은 없습니다. 대신 Analytical Writing을 생성합니다.

GRE Analytical Writing 요구사항:
- 2개의 에세이 과제 (Issue Task, Argument Task)
- Issue Task: 주어진 쟁점에 대한 본인의 입장
- Argument Task: 주어진 논증의 결함 분석
- 시간 제한: 각 30분
- 평가 기준: 논리성, 구조, 어휘, 문법
`}

난이도: ${difficulty} (easy: 기초 수준, medium: 중급 수준, hard: 고급 수준)

응답 형식 (JSON):
{
  "tasks": [
    {
      "id": "task-1",
      "taskType": "independent" | "integrated" | "issue" | "argument",
      "title": "과제 제목",
      "prompt": "과제 지시문",
      "readingPassage": "읽기 지문 (필요시)",
      "listeningScript": "듣기 스크립트 (필요시)",
      "preparationTime": 15,
      "responseTime": 45,
      "rubric": "평가 기준",
      "sampleResponse": "모범 답안 예시",
      "tips": "답변 팁"
    }
  ],
  "totalTasks": 4,
  "totalTime": 17,
  "estimatedDifficulty": "medium"
}`
        },
        {
          role: "user",
          content: `${examType.toUpperCase()} 스피킹 섹션을 생성해주세요.

요구사항:
- 난이도: ${difficulty}
- 과제 수: ${questionCount}개
- 주제: ${topic || '다양한 실생활 및 학술 주제'}

실제 시험과 동일한 수준의 고품질 과제를 생성해주세요. 각 과제는 실용적이고 흥미로워야 하며, 평가 기준이 명확해야 합니다.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tasks": [], "totalTasks": 0, "totalTime": 17}');
    
    return {
      tasks: result.tasks || [],
      totalTasks: result.totalTasks || questionCount,
      totalTime: result.totalTime || 17,
      estimatedDifficulty: difficulty
    };
    
  } catch (error) {
    console.error("Speaking section generation error:", error);
    throw new Error("스피킹 섹션 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate Writing Section
export async function generateWritingSection(examType: string, difficulty: string, questionCount: number = 2, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} 라이팅 테스트 전문가입니다. 고품질의 라이팅 섹션을 생성해주세요.

${examType === 'toefl' ? `
TOEFL 라이팅 섹션 요구사항:
- 2개의 라이팅 과제 (Integrated Task, Independent Task)
- Integrated Task: 읽기+듣기+쓰기 (20분, 150-225단어)
- Independent Task: 독립형 에세이 (30분, 300단어 이상)
- 평가 기준: 내용, 구성, 언어 사용

과제 유형:
1. Integrated: 읽기 지문과 강의를 요약하고 비교/대조
2. Independent: 개인 의견이나 경험을 바탕으로 한 에세이
` : `
GRE 라이팅 섹션 요구사항:
- 2개의 에세이 과제 (Issue Task, Argument Task)
- Issue Task: 일반적 쟁점에 대한 입장 (30분)
- Argument Task: 논증 분석 및 비판 (30분)
- 평가 기준: 논리성, 증거 사용, 구성, 언어 능력

과제 유형:
1. Issue: 사회/교육/정치 등의 쟁점에 대한 논증
2. Argument: 주어진 논증의 가정과 결론 분석
`}

난이도: ${difficulty} (easy: 기초 수준, medium: 중급 수준, hard: 고급 수준)

응답 형식 (JSON):
{
  "tasks": [
    {
      "id": "task-1",
      "taskType": "integrated" | "independent" | "issue" | "argument",
      "title": "과제 제목",
      "prompt": "과제 지시문",
      "readingPassage": "읽기 지문 (필요시)",
      "listeningScript": "듣기 스크립트 (필요시)",
      "timeLimit": 20,
      "wordLimit": "150-225 words",
      "rubric": "평가 기준",
      "sampleEssay": "모범 에세이 예시",
      "outline": "에세이 구조 가이드"
    }
  ],
  "totalTasks": 2,
  "totalTime": 50,
  "estimatedDifficulty": "medium"
}`
        },
        {
          role: "user",
          content: `${examType.toUpperCase()} 라이팅 섹션을 생성해주세요.

요구사항:
- 난이도: ${difficulty}
- 과제 수: ${questionCount}개
- 주제: ${topic || '다양한 학술 및 사회적 주제'}

실제 시험과 동일한 수준의 고품질 과제를 생성해주세요. 각 과제는 창의적이고 교육적이어야 하며, 명확한 평가 기준을 제공해야 합니다.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tasks": [], "totalTasks": 0, "totalTime": 50}');
    
    return {
      tasks: result.tasks || [],
      totalTasks: result.totalTasks || questionCount,
      totalTime: result.totalTime || 50,
      estimatedDifficulty: difficulty
    };
    
  } catch (error) {
    console.error("Writing section generation error:", error);
    throw new Error("라이팅 섹션 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate Listening Section
export async function generateListeningSection(examType: string, difficulty: string, questionCount: number = 6, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} 리스닝 테스트 전문가입니다. 고품질의 리스닝 섹션을 생성해주세요.

${examType === 'toefl' ? `
TOEFL 리스닝 섹션 요구사항:
반드시 세 가지 유형의 지문을 포함해야 합니다:

1. CONVERSATION (type: "conversation") - 2개 지문
   - 캠퍼스 서비스 상담 (도서관, 기숙사, 등록처 등)
   - 교수-학생 면담 (과제, 진로, 학술 상담)
   - 두 명의 화자가 자연스럽게 대화하는 형식
   - 2-3분 길이

2. ANNOUNCEMENT (type: "announcement") - 2개 지문
   - 캠퍼스 공지사항, 오리엔테이션, 이벤트 안내
   - 학교 정책 변경, 시설 안내, 프로그램 소개
   - 한 명의 화자가 정보를 전달하는 형식
   - 1-2분 길이

3. ACADEMIC TALK (type: "academic-talk") - 2개 지문
   - 대학 강의 (생물학, 심리학, 역사, 예술사 등)
   - 교수가 학술 주제를 설명하는 형식
   - 학생 질문이 포함될 수 있음
   - 3-5분 길이

톤 및 스타일 가이드라인 (매우 중요):
- 모든 지문은 차분하고 학술적인 톤을 유지해야 합니다
- 너무 가볍거나 장난스러운 말투는 절대 사용하지 마세요
- 실제 대학 환경에서 사용되는 격식있고 전문적인 표현을 사용하세요
- 과장된 감정 표현이나 비격식적 슬랭을 피하세요
- 교육적이고 진지한 분위기를 유지하세요

각 지문마다 5-6개의 객관식 문제
문제 유형: 주제, 세부사항, 목적, 태도, 추론
` : `
GRE 리스닝 섹션은 없습니다. 대신 Reading Comprehension을 생성합니다.

GRE Reading Comprehension 요구사항:
- 다양한 주제의 지문들
- 문제 유형: 주제, 세부사항, 추론, 어휘, 구조
- 시간 제한: 30분
- 평가 기준: 독해력, 추론력, 어휘력
`}

난이도: ${difficulty} (easy: 기초 수준, medium: 중급 수준, hard: 고급 수준)

응답 형식 (JSON):
{
  "passages": [
    {
      "id": "passage-1",
      "type": "conversation" | "academic-talk",
      "title": "지문 제목",
      "script": "대화/강의 스크립트 (Speaker: 형식 사용)",
      "audioUrl": null,
      "duration": 180,
      "questions": [
        {
          "id": "q1",
          "questionText": "문제 내용",
          "options": ["A. 선택지1", "B. 선택지2", "C. 선택지3", "D. 선택지4"],
          "correctAnswer": "A",
          "explanation": "정답 해설",
          "questionType": "main-idea" | "detail" | "inference" | "attitude"
        }
      ]
    }
  ],
  "totalPassages": 6,
  "totalQuestions": 28,
  "timeLimit": 41,
  "estimatedDifficulty": "medium"
}

중요: type 필드는 반드시 "conversation", "academic-talk" 중 하나여야 합니다.`
        },
        {
          role: "user",
          content: `${examType.toUpperCase()} 리스닝 섹션을 생성해주세요.

요구사항:
- 난이도: ${difficulty}
- 총 지문 수: ${questionCount}개 (conversation 3개 + academic-talk 3개)
- 주제: ${topic || '캠퍼스 생활 및 학술 주제'}

반드시 두 가지 유형(conversation, academic-talk)을 균등하게 포함해주세요.
모든 지문은 차분하고 학술적인 톤으로 작성하고, 가볍거나 장난스러운 표현은 피해주세요.
실제 TOEFL 시험과 동일한 수준의 고품질 지문을 생성해주세요.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"passages": [], "totalPassages": 0, "totalQuestions": 0, "timeLimit": 41}');
    
    return {
      passages: result.passages || [],
      totalPassages: result.totalPassages || questionCount,
      totalQuestions: result.totalQuestions || questionCount * 5,
      timeLimit: result.timeLimit || 41,
      estimatedDifficulty: difficulty
    };
    
  } catch (error) {
    console.error("Listening section generation error:", error);
    throw new Error("리스닝 섹션 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate GRE Quantitative Section
export async function generateQuantitativeSection(difficulty: string, questionCount: number = 20, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `You are a GRE Quantitative Reasoning test expert. Generate high-quality math problems.

CRITICAL LANGUAGE REQUIREMENT - STRICTLY ENFORCED:
- ALL questions, answer choices, explanations, and ANY text content MUST be written in ENGLISH ONLY.
- ABSOLUTELY NO Korean (한글), Japanese, Chinese, or any non-English language is permitted.
- This includes: question text, mathematical descriptions, variable names, answer options, step-by-step solutions, explanations.
- ONLY use: English alphabet letters, Arabic numerals (0-9), and standard mathematical symbols (+, -, ×, ÷, =, <, >, etc.).
- WRONG EXAMPLE: "양의 정수 n에 대하여, n은 6의 배수이다." 
- CORRECT EXAMPLE: "For positive integer n, n is a multiple of 6."

GRE Quantitative Section Requirements:
- ${questionCount} math problems (mixed types)
- Question Types: Multiple Choice, Quantitative Comparison, Numeric Entry
- Areas: Arithmetic, Algebra, Geometry, Data Analysis
- Time Limit: 35 minutes
- Calculator allowed for some questions

Main Areas:
1. Arithmetic: Integers, fractions, decimals, ratios, percentages
2. Algebra: Equations, inequalities, functions, coordinate geometry
3. Geometry: Plane geometry, solid geometry, angles, area, volume
4. Data Analysis: Descriptive statistics, probability, distributions, interpretation

Question Types:
1. Multiple Choice: 5 options, 1 correct answer
2. Multiple Choice (Multiple): Select all correct answers
3. Quantitative Comparison: Compare two quantities (Quantity A vs Quantity B)
4. Numeric Entry: Enter numeric answer directly

Difficulty: ${difficulty} (easy: basic, medium: intermediate, hard: advanced)

For Quantitative Comparison questions, use these exact answer options:
- "Quantity A is greater."
- "Quantity B is greater."
- "The two quantities are equal."
- "The relationship cannot be determined from the information given."

Response Format (JSON):
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Question text in English",
      "questionType": "multiple-choice" | "quantitative-comparison" | "numeric-entry",
      "mathArea": "arithmetic" | "algebra" | "geometry" | "data-analysis",
      "quantityA": "Expression for Quantity A (for quantitative-comparison only)",
      "quantityB": "Expression for Quantity B (for quantitative-comparison only)",
      "options": ["A. Option 1", "B. Option 2", ...] | null,
      "correctAnswer": "A" | "12.5" | "Quantity A is greater.",
      "explanation": "Detailed step-by-step solution in English",
      "difficulty": "easy" | "medium" | "hard",
      "calculatorAllowed": true | false,
      "points": 1
    }
  ],
  "totalQuestions": ${questionCount},
  "timeLimit": 35,
  "estimatedDifficulty": "${difficulty}"
}`
        },
        {
          role: "user",
          content: `Generate a GRE Quantitative Reasoning section with ${questionCount} questions.

Requirements:
- Difficulty: ${difficulty}
- Topic focus: ${topic || 'Various math areas'}

Generate high-quality math problems matching actual GRE exam standards. ALL text must be in English only. Each question must be mathematically accurate with clear, detailed solutions.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": [], "totalQuestions": 0, "timeLimit": 35}');
    
    return {
      questions: result.questions || [],
      totalQuestions: result.totalQuestions || questionCount,
      timeLimit: result.timeLimit || 35,
      estimatedDifficulty: difficulty
    };
    
  } catch (error) {
    console.error("Quantitative section generation error:", error);
    throw new Error("수리 추론 섹션 생성에 실패했습니다: " + getErrorMessage(error));
  }
}

// Generate SAT Math Section questions
export async function generateSATMathSection(difficulty: string, questionCount: number = 22, topic?: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `You are a Digital SAT Math test expert. Generate high-quality math problems following the 2024-2025 Digital SAT format.

CRITICAL LANGUAGE REQUIREMENT - STRICTLY ENFORCED:
- ALL questions, answer choices, explanations, and ANY text content MUST be written in ENGLISH ONLY.
- ABSOLUTELY NO Korean (한글), Japanese, Chinese, or any non-English language is permitted.
- ONLY use: English alphabet letters, Arabic numerals (0-9), and standard mathematical symbols (+, -, ×, ÷, =, <, >, ≤, ≥, √, π, etc.).

DIGITAL SAT MATH SECTION REQUIREMENTS:
- ${questionCount} math problems per module
- Adaptive testing format (difficulty progresses from easy to hard)
- Calculator allowed for ALL questions (Desmos graphing calculator built-in)
- Time: 35 minutes per module

FOUR CONTENT DOMAINS (include questions from each):
1. ALGEBRA (~35%): Linear equations, inequalities, systems of equations, linear functions, graphs
2. ADVANCED MATH (~35%): Quadratic equations, exponential functions, polynomials, rational expressions, radicals, complex equations
3. PROBLEM SOLVING & DATA ANALYSIS (~15%): Ratios, rates, percentages, proportional relationships, interpreting graphs/tables, statistics, probability
4. GEOMETRY & TRIGONOMETRY (~15%): Area, volume, angles, triangles, circles, coordinate geometry, trigonometric ratios (sin, cos, tan), right triangles

QUESTION TYPES:
1. MULTIPLE CHOICE (~75%): Four options (A, B, C, D), exactly ONE correct answer
2. STUDENT-PRODUCED RESPONSE / GRID-IN (~25%): Student calculates and enters numeric answer directly
   - Can be integers, decimals, or fractions
   - No negative numbers for grid-in
   - If range of values, any value in range is correct

~30% of questions should be WORD PROBLEMS with real-world contexts (science, social studies, everyday scenarios).

Difficulty: ${difficulty}
- easy: Basic algebra, simple geometry, straightforward calculations
- medium: Multi-step problems, function analysis, moderate word problems
- hard: Complex equations, advanced trigonometry, multi-concept problems

Response Format (JSON):
{
  "questions": [
    {
      "id": "q1",
      "questionText": "Question text in English (include any necessary diagrams/figures described textually)",
      "questionType": "multiple-choice" | "grid-in",
      "domain": "algebra" | "advanced-math" | "problem-solving" | "geometry-trig",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"] | null,
      "correctAnswer": "A" | "12.5" | "3/4",
      "explanation": "Detailed step-by-step solution in English showing all work",
      "difficulty": "easy" | "medium" | "hard",
      "isWordProblem": true | false,
      "points": 1
    }
  ],
  "totalQuestions": ${questionCount},
  "timeLimit": 35,
  "estimatedDifficulty": "${difficulty}",
  "module": 1
}`
        },
        {
          role: "user",
          content: `Generate a Digital SAT Math section with ${questionCount} questions.

Requirements:
- Difficulty: ${difficulty}
- Topic focus: ${topic || 'All four domains balanced'}
- Include approximately 75% multiple-choice and 25% grid-in questions
- Include approximately 30% word problems with real-world context
- Progress from easier to harder questions within the set

Generate high-quality math problems matching actual Digital SAT 2024-2025 exam standards. ALL text must be in English only. Each question must be mathematically accurate with clear, detailed solutions.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": [], "totalQuestions": 0, "timeLimit": 35}');
    
    return {
      questions: result.questions || [],
      totalQuestions: result.totalQuestions || questionCount,
      timeLimit: result.timeLimit || 35,
      estimatedDifficulty: difficulty,
      module: result.module || 1
    };
    
  } catch (error: any) {
    console.error("SAT Math section generation error:", error);
    throw new Error("SAT Math 섹션 생성에 실패했습니다: " + error.message);
  }
}

// Parse multiple listening passages from combined text (Conversation + Lecture)
export async function parseListeningPassages(text: string, examType: string, difficulty: string): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 TOEFL 리스닝 테스트 전문가입니다. 주어진 텍스트에서 CONVERSATION과 LECTURE를 구분하여 각각 별도의 지문으로 파싱해주세요.

다음 규칙을 따라주세요:
1. "Conversation"으로 시작하는 부분은 CONVERSATION 지문으로 분류
2. "Lecture"로 시작하는 부분은 LECTURE 지문으로 분류
3. 각 지문의 스크립트와 질문들을 정확히 추출
4. 각 질문의 타입을 분석하여 적절한 questionType 설정

응답 형식 (JSON):
{
  "passages": [
    {
      "type": "CONVERSATION" or "LECTURE",
      "title": "지문 제목",
      "script": "Narrator\nListen to part of...\n\nStudent\n...\n\nProfessor\n...",
      "questions": [
        {
          "id": "q1",
          "questionText": "질문 내용",
          "options": ["A. 선택지1", "B. 선택지2", "C. 선택지3", "D. 선택지4"],
          "correctAnswer": "A",
          "questionType": "single-choice" | "multiple-choice" | "click-on-text",
          "points": 1
        }
      ]
    }
  ]
}`
        },
        {
          role: "user",
          content: `다음 텍스트에서 CONVERSATION과 LECTURE 지문들을 구분하여 파싱해주세요:

${text}

각 지문의 스크립트와 모든 질문들을 정확히 추출하고, 질문 유형에 따라 questionType을 설정해주세요.`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"passages": []}');
    
    // Validate and format passages
    const passages = result.passages || [];
    
    return passages.map((passage: any, index: number) => ({
      id: `passage-${index + 1}`,
      type: passage.type || "CONVERSATION",
      title: passage.title || `${passage.type || "CONVERSATION"} ${index + 1}`,
      script: passage.script || "",
      questions: (passage.questions || []).map((q: any, qIndex: number) => ({
        id: `q${qIndex + 1}`,
        questionText: q.questionText || "",
        options: q.options || [],
        correctAnswer: q.correctAnswer || "A",
        questionType: q.questionType || "single-choice",
        points: q.points || 1
      })),
      duration: Math.ceil((passage.script || "").split(" ").length / 150 * 60) // Estimate duration based on word count
    }));
    
  } catch (error) {
    console.error("Listening passages parsing error:", error);
    throw new Error("리스닝 지문 파싱에 실패했습니다: " + getErrorMessage(error));
  }
}

// TOEFL Speaking Feedback Generation with Official ETS Scoring Criteria (2024)
// Based on official ETS rubrics: Delivery, Language Use, Topic Development (0-4 scale each)
// Enhanced with real audio analysis for accurate Delivery scoring
export async function generateSpeakingFeedback(
  questionText: string, 
  transcript: string, 
  testType: string,
  speechMetrics?: SpeechMetrics // Optional: real audio analysis data for accurate Delivery scoring
): Promise<{ 
  overallAssessment: string;
  delivery: {
    score: number;
    feedback: string;
  };
  languageUse: {
    score: number;
    feedback: string;
  };
  topicDevelopment: {
    score: number;
    feedback: string;
  };
  sentenceBysentenceFeedback: Array<{
    original: string;
    corrected: string;
    explanation: string;
  }>;
  improvedModelAnswer: string;
  scores: {
    delivery: number;
    languageUse: number;
    topicDevelopment: number;
    overall: number;
    predictedToeflScore: number;
  }
}> {
  // Use speechMetrics if available, otherwise fall back to text analysis
  const wordCount = speechMetrics?.wordCount || transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const hasTransitions = /however|therefore|moreover|furthermore|in addition|on the other hand|for example|for instance|in conclusion|first|second|finally/i.test(transcript);
  const responseLength = transcript.length;
  
  // Extract real speech metrics if available
  const hasRealAudioMetrics = !!speechMetrics && speechMetrics.duration > 0;
  const wordsPerMinute = speechMetrics?.wordsPerMinute || 0;
  const fluencyScore = speechMetrics?.fluencyScore || 0;
  const pauseCount = speechMetrics?.pauseCount || 0;
  const longestPause = speechMetrics?.longestPause || 0;
  const hesitationMarkers = speechMetrics?.hesitationMarkers || 0;
  const speechRate = speechMetrics?.speechRate || 'normal';
  const pronunciationConfidence = speechMetrics?.pronunciationConfidence || 0;
  
  // Determine quality tier based on objective metrics
  let qualityTier = "medium";
  if (wordCount < 30 || responseLength < 100) qualityTier = "very_low";
  else if (wordCount < 60 || responseLength < 200) qualityTier = "low";
  else if (wordCount > 120 && hasTransitions && avgWordsPerSentence > 8) qualityTier = "high";
  else if (wordCount > 150 && hasTransitions && avgWordsPerSentence > 10) qualityTier = "very_high";

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `You are an expert TOEFL Speaking evaluator certified by ETS. You evaluate responses using the OFFICIAL 2024 ETS TOEFL iBT Speaking Rubrics.

## CRITICAL SCORING INSTRUCTIONS:
**YOU MUST USE THE FULL RANGE OF SCORES (0-4).** Do NOT default to middle scores (2-3). 
- Excellent responses deserve 3.5-4.0
- Good responses deserve 2.5-3.5
- Weak responses deserve 1.5-2.5
- Poor responses deserve 0.5-1.5
- Very poor/no response: 0-0.5

**Scores for each criterion will naturally vary** based on actual performance. A student might have:
- Delivery: 3.5 (good pronunciation but some hesitation)
- Language Use: 2.0 (frequent grammar errors)
- Topic Development: 2.5 (decent content but underdeveloped)

Evaluate each criterion independently - they may or may not have the same score based on actual performance.

## QUALITY INDICATORS TO CONSIDER:
- Word count: ${wordCount} words (optimal: 100-150 for 45-60 sec)
- Sentence count: ${sentenceCount} sentences
- Average words per sentence: ${avgWordsPerSentence.toFixed(1)}
- Uses transitions: ${hasTransitions ? "Yes" : "No"}
- Response length: ${responseLength} characters
- Quality tier: ${qualityTier}

${hasRealAudioMetrics ? `## REAL AUDIO ANALYSIS DATA (Use for DELIVERY scoring):
These metrics are from actual audio analysis - use them for accurate Delivery scoring:
- Speaking Rate: ${wordsPerMinute} words per minute (optimal: 120-150 WPM)
- Speech Pace: ${speechRate} (slow/normal/fast)
- Fluency Score: ${fluencyScore}/100 (based on pauses, hesitations, rate)
- Number of Pauses: ${pauseCount} significant pauses (>0.5s)
- Longest Pause: ${longestPause} seconds
- Hesitation Markers: ${hesitationMarkers} ("um", "uh", "like", etc.)
- Pronunciation Confidence: ${Math.round(pronunciationConfidence * 100)}% (from speech recognition)

**IMPORTANT: These real audio metrics should heavily influence your DELIVERY score:**
- High fluency (80+) + good WPM (120-150) + few pauses → Delivery 3.5-4.0
- Medium fluency (60-80) + acceptable WPM (100-160) → Delivery 2.5-3.5
- Low fluency (<60) + many hesitations + slow/fast rate → Delivery 1.5-2.5
- Very low fluency (<40) + frequent pauses + many hesitations → Delivery 0.5-1.5` : `## NOTE: Audio analysis not available
Delivery scoring is based on text analysis only (sentence structure, repetition patterns).
Without audio data, Delivery score should be estimated conservatively from transcript patterns.`}

## OFFICIAL ETS SCORING CRITERIA (0-4 Scale Each):

### 1. DELIVERY (발화) - 25% weight
Score based on pronunciation clarity, pacing, rhythm, and intonation FROM THE TRANSCRIPT:
- **4.0**: Fluid, clear, natural pace. Minor issues don't affect understanding.
- **3.5**: Generally clear with good flow. Occasional awkward pacing.
- **3.0**: Understandable but requires some listener effort. Some choppy delivery.
- **2.5**: Intelligible but noticeable pronunciation/pacing issues.
- **2.0**: Difficult to follow. Frequent hesitations evident in fragmented sentences.
- **1.5**: Considerable effort needed. Very choppy or fragmented.
- **1.0**: Barely intelligible. Major pronunciation problems throughout.
- **0.5-0**: Unintelligible or no meaningful speech.

### 2. LANGUAGE USE (언어 사용) - 35% weight
Score based on grammar accuracy and vocabulary range:
- **4.0**: Sophisticated vocabulary, complex structures, minimal errors.
- **3.5**: Good vocabulary variety, mostly accurate grammar, minor errors.
- **3.0**: Adequate vocabulary, some grammar errors but meaning clear.
- **2.5**: Limited vocabulary, noticeable errors, some unclear expressions.
- **2.0**: Basic vocabulary only, frequent errors obscure meaning.
- **1.5**: Very limited range, many errors, relies on simple phrases.
- **1.0**: Severely limited, major errors throughout.
- **0.5-0**: No meaningful language production.

### 3. TOPIC DEVELOPMENT (내용 전개) - 40% weight
Score based on content relevance, coherence, and completeness:
- **4.0**: Fully addresses prompt, well-organized, excellent elaboration with examples.
- **3.5**: Addresses prompt well, clear organization, good supporting details.
- **3.0**: Addresses main points, adequate organization, some elaboration.
- **2.5**: Partially addresses prompt, limited development, missing some points.
- **2.0**: Vague or incomplete response, weak organization, few details.
- **1.5**: Minimal relevant content, poor organization.
- **1.0**: Barely addresses prompt, almost no development.
- **0.5-0**: No relevant content.

## FEEDBACK REQUIREMENTS (ALL IN KOREAN):

1. **종합 평가**: Include specific predicted TOEFL Speaking score (0-30) with justification

2. **각 기준별 피드백**: 
   - Give DIFFERENT scores for each criterion (decimals like 2.5, 3.0, 3.5)
   - Quote specific examples from the transcript to justify scores
   - Explain WHY this score and not higher/lower

3. **문장별 피드백**: Analyze EVERY sentence with corrections

4. **개선된 모범 답안**: Use student's ideas but improve grammar/vocabulary/structure

## JSON RESPONSE FORMAT:
{
  "overallAssessment": "한국어로 종합 평가 (예상 점수 0-30점과 그 이유)",
  "delivery": {
    "score": number (0-4, USE DECIMALS like 2.5, 3.0),
    "feedback": "발화 점수의 구체적 근거와 피드백"
  },
  "languageUse": {
    "score": number (0-4, evaluate independently based on grammar/vocabulary),
    "feedback": "문법/어휘 점수의 구체적 근거와 피드백"
  },
  "topicDevelopment": {
    "score": number (0-4, evaluate independently based on content),
    "feedback": "내용 전개 점수의 구체적 근거와 피드백"
  },
  "sentenceBysentenceFeedback": [
    {
      "original": "학생이 말한 원래 문장 (그대로 복사)",
      "corrected": "문법/어휘/표현이 교정된 올바른 문장",
      "explanation": "한국어로 왜 이렇게 고쳤는지 설명 - 문법 오류, 어휘 선택, 표현 개선 등"
    }
  ],
  "improvedModelAnswer": "개선된 영어 모범 답안"
}

## CRITICAL REQUIREMENT - sentenceBysentenceFeedback:
**YOU MUST analyze EVERY SINGLE SENTENCE from the student's response.**
- Split the transcript into individual sentences
- For EACH sentence, provide: original (exact text), corrected (improved version), explanation (한국어로)
- Even if a sentence is perfect, include it with corrected = original and explanation = "문법적으로 올바른 문장입니다."
- This is a MANDATORY field - never skip or return empty array`
        },
        {
          role: "user",
          content: `## Question:
${questionText}

## Student's Spoken Response (Transcript):
${transcript}

## Test Type: ${testType === 'independent' ? 'Independent Speaking (express personal opinion)' : 'Integrated Speaking (synthesize sources)'}

## Pre-analysis:
- Word count: ${wordCount} (optimal: 100-150)
- Uses transitions: ${hasTransitions ? "Yes" : "No"}
- Quality tier: ${qualityTier}

IMPORTANT: Score each criterion INDEPENDENTLY based on actual quality. Use the FULL 0-4 scale. Scores may naturally vary across criteria based on the student's strengths and weaknesses.`
        }
      ],
      max_completion_tokens: 4000,
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Extract scores - trust AI's numeric scores, only fallback for invalid values
    let deliveryScore = result.delivery?.score;
    let languageUseScore = result.languageUse?.score;
    let topicDevelopmentScore = result.topicDevelopment?.score;
    
    // Only apply fallback if AI returned invalid (non-numeric) scores
    if (typeof deliveryScore !== 'number' || isNaN(deliveryScore)) {
      console.warn('Speaking feedback: Invalid delivery score from AI, using default');
      deliveryScore = 2.5;
    }
    if (typeof languageUseScore !== 'number' || isNaN(languageUseScore)) {
      console.warn('Speaking feedback: Invalid languageUse score from AI, using default');
      languageUseScore = 2.5;
    }
    if (typeof topicDevelopmentScore !== 'number' || isNaN(topicDevelopmentScore)) {
      console.warn('Speaking feedback: Invalid topicDevelopment score from AI, using default');
      topicDevelopmentScore = 2.5;
    }
    
    // Clamp scores to valid rubric range (0-4) and round to nearest 0.5
    deliveryScore = Math.round(Math.max(0, Math.min(4, deliveryScore)) * 2) / 2;
    languageUseScore = Math.round(Math.max(0, Math.min(4, languageUseScore)) * 2) / 2;
    topicDevelopmentScore = Math.round(Math.max(0, Math.min(4, topicDevelopmentScore)) * 2) / 2;
    
    // Calculate weighted overall (Topic Development is most important per ETS)
    const weightedOverall = (deliveryScore * 0.25) + (languageUseScore * 0.35) + (topicDevelopmentScore * 0.40);
    const overall = Math.round(weightedOverall * 10) / 10;
    
    // Convert to TOEFL Speaking score (0-30 scale) using ETS conversion table
    // More accurate ETS mapping based on official score conversion
    let predictedToeflScore: number;
    if (overall >= 3.75) predictedToeflScore = 30;
    else if (overall >= 3.5) predictedToeflScore = 27;
    else if (overall >= 3.25) predictedToeflScore = 25;
    else if (overall >= 3.0) predictedToeflScore = 23;
    else if (overall >= 2.75) predictedToeflScore = 21;
    else if (overall >= 2.5) predictedToeflScore = 18;
    else if (overall >= 2.25) predictedToeflScore = 16;
    else if (overall >= 2.0) predictedToeflScore = 14;
    else if (overall >= 1.75) predictedToeflScore = 12;
    else if (overall >= 1.5) predictedToeflScore = 10;
    else if (overall >= 1.25) predictedToeflScore = 8;
    else if (overall >= 1.0) predictedToeflScore = 6;
    else if (overall >= 0.5) predictedToeflScore = 3;
    else predictedToeflScore = 0;

    // Validate and ensure sentenceBysentenceFeedback is properly generated
    let sentenceBysentenceFeedback = result.sentenceBysentenceFeedback;
    
    // If AI didn't return proper sentence feedback, generate from transcript
    if (!Array.isArray(sentenceBysentenceFeedback) || sentenceBysentenceFeedback.length === 0) {
      console.warn('Speaking feedback: sentenceBysentenceFeedback missing, generating from transcript');
      // Split transcript into sentences and create placeholder feedback
      const sentences = transcript.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      sentenceBysentenceFeedback = sentences.map((sentence: string, index: number) => ({
        original: sentence.trim(),
        corrected: sentence.trim(),
        explanation: `[문장 ${index + 1}] AI가 이 문장에 대한 상세 분석을 생성하지 못했습니다. 위의 종합 평가와 언어 사용 피드백을 참고해주세요.`
      }));
    } else {
      // Validate each entry has required fields
      sentenceBysentenceFeedback = sentenceBysentenceFeedback.map((item: any) => ({
        original: item?.original || "(문장 없음)",
        corrected: item?.corrected || item?.original || "(교정 없음)",
        explanation: item?.explanation || "피드백 생성 중 오류"
      }));
    }
    
    return {
      overallAssessment: result.overallAssessment || "종합 평가를 생성할 수 없습니다.",
      delivery: {
        score: deliveryScore,
        feedback: result.delivery?.feedback || "발화 피드백을 생성할 수 없습니다."
      },
      languageUse: {
        score: languageUseScore,
        feedback: result.languageUse?.feedback || "언어 사용 피드백을 생성할 수 없습니다."
      },
      topicDevelopment: {
        score: topicDevelopmentScore,
        feedback: result.topicDevelopment?.feedback || "내용 전개 피드백을 생성할 수 없습니다."
      },
      sentenceBysentenceFeedback,
      improvedModelAnswer: result.improvedModelAnswer || "개선된 모범 답안을 생성할 수 없습니다.",
      scores: {
        delivery: deliveryScore,
        languageUse: languageUseScore,
        topicDevelopment: topicDevelopmentScore,
        overall,
        predictedToeflScore
      }
    };
  } catch (error) {
    console.error("Speaking feedback API error:", error);
    throw new Error("Feedback generation failed");
  }
}

// Generate feedback for TOEFL Integrated Speaking (with reading/listening passages)
// Enhanced for accurate scoring based on source material usage and real audio analysis
export async function generateIntegratedSpeakingFeedback(
  questionText: string,
  transcript: string,
  readingPassage?: string,
  listeningScript?: string,
  speechMetrics?: SpeechMetrics // Optional: real audio analysis for accurate Delivery scoring
): Promise<{
  overallAssessment: string;
  strengths: string;
  areasForImprovement: string;
  modelAnswerScript: string;
  modelAnswerAnalysis: string;
  scores: {
    delivery: number;
    languageUse: number;
    topicDevelopment: number;
    overall: number;
    predictedToeflScore: number;
  }
}> {
  // Use speechMetrics if available
  const wordCount = speechMetrics?.wordCount || transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const hasTransitions = /however|therefore|moreover|furthermore|according to|the (reading|passage|lecture|speaker)|first|second|in contrast|on the other hand/i.test(transcript);
  const mentionsReading = /reading|passage|text|article|author/i.test(transcript);
  const mentionsListening = /lecture|speaker|professor|listening|says|mentions|explains/i.test(transcript);
  const usesSourceMaterial = mentionsReading || mentionsListening;
  
  // Extract real speech metrics if available
  const hasRealAudioMetrics = !!speechMetrics && speechMetrics.duration > 0;
  const wordsPerMinute = speechMetrics?.wordsPerMinute || 0;
  const fluencyScore = speechMetrics?.fluencyScore || 0;
  const pauseCount = speechMetrics?.pauseCount || 0;
  const longestPause = speechMetrics?.longestPause || 0;
  const hesitationMarkers = speechMetrics?.hesitationMarkers || 0;
  const speechRate = speechMetrics?.speechRate || 'normal';
  const pronunciationConfidence = speechMetrics?.pronunciationConfidence || 0;
  
  // Determine source integration quality
  let sourceIntegrationLevel = "none";
  if (mentionsReading && mentionsListening) sourceIntegrationLevel = "both";
  else if (mentionsReading || mentionsListening) sourceIntegrationLevel = "partial";

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `You are an expert TOEFL Integrated Speaking evaluator certified by ETS, using official 2024-2025 scoring rubrics.

## CRITICAL SCORING INSTRUCTIONS:
**YOU MUST USE THE FULL RANGE OF SCORES (1-5).** Do NOT default to middle scores (2.5-3.5).
- Excellent source synthesis deserves 4.5-5.0
- Good integration with minor issues: 3.5-4.5
- Partial source use with gaps: 2.5-3.5
- Minimal source reference: 1.5-2.5
- No meaningful source integration: 1.0-1.5

**Scores will naturally vary** based on actual performance in each area.

## QUALITY INDICATORS FOR THIS RESPONSE:
- Word count: ${wordCount} words (optimal: 100-130 for integrated tasks)
- Sentence count: ${sentenceCount}
- Uses transition words: ${hasTransitions ? "Yes" : "No"}
- Mentions reading source: ${mentionsReading ? "Yes" : "No"}
- Mentions listening source: ${mentionsListening ? "Yes" : "No"}
- Source integration level: ${sourceIntegrationLevel}

${hasRealAudioMetrics ? `## REAL AUDIO ANALYSIS DATA (Use for DELIVERY scoring):
These metrics are from actual audio analysis - use them for accurate Delivery scoring:
- Speaking Rate: ${wordsPerMinute} words per minute (optimal: 120-150 WPM)
- Speech Pace: ${speechRate} (slow/normal/fast)
- Fluency Score: ${fluencyScore}/100 (based on pauses, hesitations, rate)
- Number of Pauses: ${pauseCount} significant pauses (>0.5s)
- Longest Pause: ${longestPause} seconds
- Hesitation Markers: ${hesitationMarkers} ("um", "uh", "like", etc.)
- Pronunciation Confidence: ${Math.round(pronunciationConfidence * 100)}% (from speech recognition)

**IMPORTANT: These real audio metrics should heavily influence your DELIVERY score:**
- High fluency (80+) + good WPM (120-150) + few pauses → Delivery 4.5-5.0
- Medium fluency (60-80) + acceptable WPM (100-160) → Delivery 3.0-4.0
- Low fluency (<60) + many hesitations + slow/fast rate → Delivery 2.0-3.0
- Very low fluency (<40) + frequent pauses + many hesitations → Delivery 1.0-2.0` : `## NOTE: Audio analysis not available
Delivery scoring is based on text analysis only (sentence structure, repetition patterns).
Without audio data, Delivery score should be estimated conservatively from transcript patterns.`}

## OFFICIAL ETS INTEGRATED SPEAKING CRITERIA (Questions 2-4):

### 1. DELIVERY (발음/유창성) - Score 1.0-5.0
Based on text analysis of fluency indicators:
- **5.0**: Fluid, well-paced, natural sentence flow
- **4.0-4.5**: Generally clear, some minor pacing issues
- **3.0-3.5**: Understandable but some choppy segments
- **2.0-2.5**: Difficult flow, fragmented sentences
- **1.0-1.5**: Very choppy, unclear structure

### 2. LANGUAGE USE (언어 구사력) - Score 1.0-5.0
Grammar accuracy and vocabulary:
- **5.0**: Sophisticated vocabulary, complex structures, minimal errors
- **4.0-4.5**: Good variety, mostly accurate, minor errors
- **3.0-3.5**: Adequate vocabulary, noticeable but non-blocking errors
- **2.0-2.5**: Limited range, errors sometimes obscure meaning
- **1.0-1.5**: Very limited, major errors throughout

### 3. TOPIC DEVELOPMENT (내용 전달) - Score 1.0-5.0 ⭐ MOST IMPORTANT FOR INTEGRATED
How well the response synthesizes source material:
- **5.0**: Uses BOTH sources accurately, excellent connections, complete coverage
- **4.0-4.5**: Uses both sources, good connections, minor gaps
- **3.0-3.5**: Uses sources but connections unclear or incomplete
- **2.0-2.5**: References one source OR inaccurate information
- **1.0-1.5**: Minimal/no source integration, mostly own opinions

## FEEDBACK STRUCTURE (ALL IN KOREAN):
1. **종합 평가**: Include predicted TOEFL score (0-30) with justification
2. **강점**: Specific things student did well with examples
3. **개선 영역**: Concrete suggestions for better source integration

## JSON FORMAT:
{
  "scores": {
    "delivery": 1.0-5.0 (evaluate independently),
    "languageUse": 1.0-5.0 (evaluate independently),
    "topicDevelopment": 1.0-5.0 (evaluate based on source usage)
  },
  "overallAssessment": "한국어 종합 평가 (예상 점수 0-30점 포함)",
  "strengths": "한국어로 구체적 강점",
  "areasForImprovement": "한국어로 구체적 개선점",
  "modelAnswerScript": "영어 모범 답안 (reading과 listening 모두 활용)",
  "modelAnswerAnalysis": "한국어 모범 답안 분석"
}`
        },
        {
          role: "user",
          content: `${readingPassage ? `=== READING PASSAGE ===\n${readingPassage}\n\n` : ''}${listeningScript ? `=== LISTENING SCRIPT ===\n${listeningScript}\n\n` : ''}=== QUESTION ===
${questionText}

=== STUDENT'S RESPONSE (TRANSCRIPT) ===
${transcript}

=== RESPONSE ANALYSIS ===
- Word count: ${wordCount}
- Source integration: ${sourceIntegrationLevel}
- Uses transitions: ${hasTransitions}

IMPORTANT SCORING INSTRUCTIONS:
1. Score Topic Development based on how well they used BOTH sources
2. Evaluate each criterion independently - scores may vary based on actual strengths/weaknesses
3. Use the FULL 1-5 scale based on actual quality
4. If they only mention one source, Topic Development should typically be 3.0 or lower
5. Create a model answer that shows proper synthesis of BOTH sources`
        }
      ],
      max_completion_tokens: 2500,
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Extract scores - trust AI's numeric scores, only fallback for invalid values
    const scores = result.scores || {};
    let deliveryScore = scores.delivery;
    let languageUseScore = scores.languageUse;
    let topicDevelopmentScore = scores.topicDevelopment;
    
    // Only apply fallback if AI returned invalid (non-numeric) scores
    if (typeof deliveryScore !== 'number' || isNaN(deliveryScore)) {
      console.warn('Integrated speaking: Invalid delivery score from AI, using default');
      deliveryScore = 3.0;
    }
    if (typeof languageUseScore !== 'number' || isNaN(languageUseScore)) {
      console.warn('Integrated speaking: Invalid languageUse score from AI, using default');
      languageUseScore = 3.0;
    }
    if (typeof topicDevelopmentScore !== 'number' || isNaN(topicDevelopmentScore)) {
      console.warn('Integrated speaking: Invalid topicDevelopment score from AI, using default');
      topicDevelopmentScore = 3.0;
    }
    
    // Clamp to valid rubric range (1-5) and round to nearest 0.5
    deliveryScore = Math.round(Math.max(1.0, Math.min(5.0, deliveryScore)) * 2) / 2;
    languageUseScore = Math.round(Math.max(1.0, Math.min(5.0, languageUseScore)) * 2) / 2;
    topicDevelopmentScore = Math.round(Math.max(1.0, Math.min(5.0, topicDevelopmentScore)) * 2) / 2;

    // Calculate weighted overall (Topic Development is most important for integrated)
    const weightedOverall = (deliveryScore * 0.25) + (languageUseScore * 0.30) + (topicDevelopmentScore * 0.45);
    const overall = Math.round(weightedOverall * 10) / 10;
    
    // Convert to TOEFL score (0-30) using proper ETS conversion
    let predictedToeflScore: number;
    if (overall >= 4.75) predictedToeflScore = 30;
    else if (overall >= 4.5) predictedToeflScore = 28;
    else if (overall >= 4.0) predictedToeflScore = 25;
    else if (overall >= 3.5) predictedToeflScore = 22;
    else if (overall >= 3.0) predictedToeflScore = 18;
    else if (overall >= 2.5) predictedToeflScore = 15;
    else if (overall >= 2.0) predictedToeflScore = 12;
    else if (overall >= 1.5) predictedToeflScore = 8;
    else predictedToeflScore = 5;

    return {
      overallAssessment: result.overallAssessment || "종합 평가를 생성할 수 없습니다.",
      strengths: result.strengths || "강점 분석을 생성할 수 없습니다.",
      areasForImprovement: result.areasForImprovement || "개선 영역을 생성할 수 없습니다.",
      modelAnswerScript: result.modelAnswerScript || "모범 답안을 생성할 수 없습니다.",
      modelAnswerAnalysis: result.modelAnswerAnalysis || "모범 답안 분석을 생성할 수 없습니다.",
      scores: {
        delivery: deliveryScore,
        languageUse: languageUseScore,
        topicDevelopment: topicDevelopmentScore,
        overall,
        predictedToeflScore
      }
    };
  } catch (error) {
    console.error("Integrated speaking feedback API error:", error);
    throw new Error("Integrated feedback generation failed");
  }
}

// Generate test questions for different sections using AI
export async function generateTestQuestions(
  examType: string,
  section: string,
  difficulty: string,
  count: number,
  topic?: string
): Promise<any[]> {
  try {
    const prompts = {
      toefl: {
        reading: `Generate ${count} TOEFL Reading comprehension questions with the following format:
- Academic passage (200-700 words) on topics like science, history, literature, or social studies
- Multiple choice questions (3-5 options each)
- Question types: main idea, detail, inference, vocabulary, sentence insertion
- Difficulty level: ${difficulty}
- Include passage, questions, correct answers, and explanations`,
        
        listening: `Generate ${count} TOEFL Listening questions with the following format:
- Conversation or lecture scripts (2-3 minutes when spoken)
- Multiple choice questions about main ideas, details, speaker's attitude, organization
- Realistic university/campus contexts
- Difficulty level: ${difficulty}
- Include script, questions, correct answers, and explanations`,
        
        writing: `Generate ${count} TOEFL Writing tasks with the following format:
- Independent Writing: Personal preference/opinion essays (300+ words)
- Integrated Writing: Reading passage + lecture summary tasks
- Clear prompts with specific requirements
- Difficulty level: ${difficulty}
- Include prompts, sample essays, and scoring criteria`,
        
        speaking: `Generate ${count} TOEFL Speaking questions with the following format:
- Independent tasks: Personal experience/preference questions
- Integrated tasks: Campus situations or academic topics
- Clear preparation and response time guidelines
- Difficulty level: ${difficulty}
- Include questions, sample responses, and evaluation criteria`
      },
      gre: {
        verbal: `Generate ${count} GRE Verbal Reasoning questions with the following format:
- Reading comprehension passages with multiple choice questions
- Text completion and sentence equivalence questions
- Graduate-level vocabulary and complex reasoning
- Difficulty level: ${difficulty}
- Include passages/prompts, questions, correct answers, and explanations`,
        
        quantitative: `Generate ${count} GRE Quantitative Reasoning questions with the following format:
- Arithmetic, algebra, geometry, and data analysis problems
- Multiple choice and numeric entry questions
- Real-world and abstract mathematical contexts
- Difficulty level: ${difficulty}
- Include problems, solutions, and step-by-step explanations`,
        
        analytical: `Generate ${count} GRE Analytical Writing tasks with the following format:
- "Analyze an Issue" and "Analyze an Argument" tasks
- Clear prompts requiring critical thinking and analysis
- Academic and professional contexts
- Difficulty level: ${difficulty}
- Include prompts, sample essays, and scoring guidelines`
      }
    };

    const examPrompts = prompts[examType as keyof typeof prompts];
    const prompt = examPrompts ? examPrompts[section as keyof typeof examPrompts] : undefined;
    if (!prompt) {
      throw new Error(`Unsupported exam type or section: ${examType} - ${section}`);
    }

    const topicContext = topic ? `\nFocus on this topic: ${topic}` : '';

    console.log("Generating test questions using OpenAI...");
    
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `You are an expert test creator specializing in ${examType.toUpperCase()} ${section} questions. Create authentic, high-quality questions that match official test standards.

Return your response as a JSON object with this structure:
{
  "questions": [
    {
      "questionText": "The main question or prompt",
      "content": "Reading passage or detailed content (if applicable)",
      "questionType": "multiple-choice",
      "options": ["Option A content", "Option B content", "Option C content", "Option D content"],
      "correctAnswer": "Option A content",
      "explanation": "Detailed explanation of why this is correct",
      "passage": "Reading passage (for reading tasks)",
      "difficulty": "${difficulty}",
      "points": 1
    }
  ]
}`
        },
        {
          role: "user",
          content: `${prompt}${topicContext}

Create exactly ${count} questions. Make them realistic, challenging, and educationally valuable. Ensure all content is original and appropriate for the specified difficulty level.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000,
      temperature: 0.7
    });

    console.log("OpenAI response received");

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    return result.questions || [];
  } catch (error) {
    console.error("Test question generation error:", error);
    throw new Error("Failed to generate test questions");
  }
}

// Generate image-based questions for visual learning
export async function generateImageBasedQuestion(
  imageBase64: string,
  examType: string,
  section: string,
  difficulty: string
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Create a ${examType.toUpperCase()} ${section} question based on this image. 
              
Difficulty level: ${difficulty}

Generate a complete question with:
- Clear question text that refers to the image
- Multiple choice options (if applicable)
- Correct answer
- Detailed explanation

Return as JSON:
{
  "questionText": "Question referring to the image",
  "content": "Additional context or passage if needed",
  "questionType": "multiple-choice" | "essay" | "fill_blank",
  "options": ["A", "B", "C", "D"] (if multiple choice),
  "correctAnswer": "The correct answer",
  "explanation": "Why this answer is correct",
  "imageDescription": "Brief description of what the image shows",
  "difficulty": "${difficulty}"
}`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  } catch (error) {
    console.error("Image-based question generation error:", error);
    throw new Error("Failed to generate image-based question");
  }
}

// Parse pasted text and convert to structured question format
export async function parseTextToQuestions(
  pastedText: string,
  examType: string,
  section: string,
  difficulty: string
): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 GRE Verbal Reasoning 테스트 텍스트를 정확히 파싱하는 전문가입니다.

**GRE Verbal 문제 유형별 파싱 규칙**:

1. **Reading Comprehension**:
   - "based on the following reading passage" 이후가 지문
   - Multiple choice: 일반적인 선택지
   - Select all that apply: "consider each of the choices separately and select all that apply"
   - Select sentence: "Select the sentence in the passage"

2. **Text Completion**:
   - "select one entry for each blank" 형태
   - Blank (i), Blank (ii) 구조로 빈칸별 선택지 분리
   - 각 빈칸마다 독립적인 선택지 그룹

3. **Sentence Equivalence**:
   - 단일 빈칸에 두 개의 정답이 있는 형태

**파싱 세부 규칙**:
- 문제 번호는 "Question 1", "Question 2" 패턴으로 구분
- 지문은 각 문제 그룹별로 다를 수 있음
- Text completion의 경우 선택지를 빈칸별로 구분하여 객체 형태로 저장
- 정답은 원문에서 명시된 대로 정확히 추출
- 각 문제 유형에 맞는 questionType 설정

**정답 정확도 보장**:
- 선택지에서 불필요한 기호 제거하고 실제 텍스트만 추출
- 정답은 반드시 선택지 중 하나와 정확히 일치해야 함
- 지문을 분석하여 가장 논리적인 정답을 선택
- 한국어 해설 추가 (영어 구문이 있으면 한국어 번역 포함)

**Example Input Format**:
\`\`\`
The Rise and Fall of Easter Island
Easter Island, known to its inhabitants as Rapa Nui, stands as one of the most isolated...

Questions

According to paragraph 1, what makes Easter Island particularly interesting?
○ Its location in the Pacific Ocean
○ Its mysterious statues and environmental collapse
○ Its small size compared to other islands
○ Its distance from the mainland of Chile

The word "flourish" in the passage is closest in meaning to
○ survive
○ prosper
○ expand
○ develop
\`\`\`

**GRE Verbal 응답 형식**:
{
  "questions": [
    {
      "questionText": "문제 텍스트",
      "questionType": "multiple-choice" | "select-all" | "select-sentence" | "text-completion" | "sentence-equivalence",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"] 또는 텍스트 완성의 경우: {"blank1": ["옵션1", "옵션2", "옵션3"], "blank2": ["옵션4", "옵션5", "옵션6"]},
      "correctAnswer": "정답" 또는 텍스트 완성의 경우: {"blank1": "정답1", "blank2": "정답2"},
      "explanation": "한국어 해설",
      "passage": "해당 지문 (reading comprehension인 경우)",
      "difficulty": "${difficulty}",
      "points": 1
    }
  ]
}`
        },
        {
          role: "user", 
          content: `다음은 실제 GRE Verbal Reasoning 테스트 문제집에서 추출한 텍스트입니다. 정확히 파싱하여 JSON 형식으로 변환해주세요:

**원본 텍스트:**
${pastedText}

**GRE Verbal 파싱 지침:**
1. **문제 그룹 식별**: "Questions X to Y are based on the following reading passage" 패턴으로 지문과 문제 매칭
2. **문제 유형 구분**:
   - Reading Comprehension: 지문 기반 문제
   - Text Completion: "select one entry for each blank" + Blank (i), Blank (ii) 구조
   - Select All: "consider each of the choices separately and select all that apply"
   - Select Sentence: "Select the sentence in the passage"
3. **선택지 정확 추출**: 원문의 선택지를 그대로 보존
4. **정답 매칭**: 제시된 정답을 선택지와 정확히 매칭
5. **Text Completion 특별 처리**: 빈칸별로 선택지를 분리하여 객체 형태로 구성

**JSON 요구사항:**
- 각 문제마다 해당하는 지문을 포함
- Text completion은 options와 correctAnswer를 객체 형태로 구성
- 모든 선택지는 원문에서 정확히 추출
- 한국어 해설은 간단하고 명확하게 작성

시험 유형: GRE Verbal Reasoning
난이도: ${difficulty}

응답은 반드시 유효한 JSON 형식으로 제공해주세요.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 6000,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    
    console.log("AI 파싱 결과:", JSON.stringify(result, null, 2));
    
    // Enhanced result processing for file parsing
    if (result.questions && Array.isArray(result.questions)) {
      return result.questions.map((q: any, index: number) => {
        let processedOptions;
        
        // Handle different option formats for GRE Verbal
        if (Array.isArray(q.options)) {
          // Standard array format - safe type checking
          processedOptions = q.options.map((opt: any) => {
            if (typeof opt === 'string') {
              return opt.replace(/^○\s*/, '').trim();
            } else {
              // Keep non-string options as is (for complex structures)
              return opt;
            }
          });
        } else if (q.options && typeof q.options === 'object') {
          // Object format for text completion (keep as is)
          processedOptions = q.options;
        } else {
          // Fallback to empty array
          processedOptions = [];
        }

        return {
          ...q,
          id: `${examType}-${section}-q${index + 1}`,
          orderIndex: index + 1,
          options: processedOptions,
          // Ensure passage is included
          passage: q.passage || result.passage || result.title
        };
      });
    }
    
    // If no questions found but we have a structured result, generate proper questions
    if (result.title && result.passage) {
      console.log("Generating questions from parsed content...");
      
      // Use AI to generate proper questions from the parsed content
      const generatedQuestions = await generateQuestionsFromParsedContent(
        result.passage,
        result.title,
        examType,
        section,
        difficulty
      );
      
      if (generatedQuestions.length > 0) {
        return generatedQuestions;
      }
    }
    
    return [];
  } catch (error) {
    console.error("Text parsing error:", error);
    throw new Error("텍스트 파싱에 실패했습니다.");
  }
}

// Generate proper questions from parsed content using AI
export async function generateQuestionsFromParsedContent(
  passage: string,
  title: string,
  examType: string,
  section: string,
  difficulty: string
): Promise<any[]> {
  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        {
          role: "system",
          content: `당신은 ${examType.toUpperCase()} ${section} 테스트 문제를 생성하는 전문가입니다.

주어진 지문을 바탕으로 실제적이고 의미있는 문제들을 생성해주세요.

**문제 생성 규칙**:
1. **실제 내용 기반**: 지문의 구체적인 내용을 바탕으로 문제 생성
2. **다양한 문제 유형**: 세부사항, 추론, 어휘, 주제 파악 등
3. **정확한 선택지**: 지문에서 추출한 구체적이고 명확한 선택지
4. **올바른 정답**: 지문 내용과 정확히 일치하는 정답
5. **상세한 해설**: 정답 근거를 지문에서 찾아 설명

**JSON 응답 형식**:
반드시 다음과 같은 JSON 형식으로 응답해주세요:
{
  "questions": [
    {
      "questionText": "구체적이고 명확한 문제",
      "questionType": "multiple-choice",
      "options": ["구체적인 선택지1", "구체적인 선택지2", "구체적인 선택지3", "구체적인 선택지4"],
      "correctAnswer": "정답 선택지 (options 중 하나와 정확히 일치)",
      "explanation": "지문 근거를 포함한 상세 해설",
      "difficulty": "${difficulty}",
      "points": 1
    }
  ]
}

**중요**: 절대로 "첫 번째 선택지", "두 번째 선택지" 같은 템플릿 데이터를 사용하지 마세요. 반드시 지문의 실제 내용을 바탕으로 한 구체적인 선택지를 만드세요.`
        },
        {
          role: "user",
          content: `다음 지문을 바탕으로 ${examType.toUpperCase()} ${section} 문제를 8-10개 생성해주세요:

**제목**: ${title}

**지문**:
${passage}

**난이도**: ${difficulty}

지문의 내용을 정확히 분석하여 의미있고 실질적인 문제들을 만들어주세요.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{"questions": []}');
    const questions = result.questions || [];

    return questions.map((q: any, index: number) => ({
      id: `q${index + 1}`,
      questionText: q.questionText,
      questionType: q.questionType || "multiple-choice",
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      passage: passage,
      difficulty: difficulty,
      points: q.points || 1
    }));

  } catch (error) {
    console.error("Question generation from parsed content error:", error);
    return [];
  }
}

export async function generateReadingSolution(
  questionText: string,
  options: string[],
  correctAnswer: string,
  passage: string,
  passageTitle?: string
): Promise<string> {
  try {
    // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `당신은 TOEFL Reading 전문 강사입니다. 지문을 정확히 분석하여 문제의 정답과 상세한 해설을 제공해야 합니다.

**핵심 분석 과정**:
1. **지문 완전 이해**: 제공된 전체 지문을 면밀히 읽고 내용을 파악
2. **문제 유형 판단**: 세부사항, 추론, 어휘, 주제 등 문제 유형 분석
3. **지문-문제 연결**: 문제와 관련된 지문의 정확한 위치와 내용 찾기
4. **선택지 검증**: 각 선택지를 지문 내용과 대조하여 정확성 판단
5. **정답 확정**: 가장 지문 내용에 부합하는 선택지를 정답으로 선택

**응답 형식**:
- "정답은 '[정확한 선택지 텍스트]'입니다" 로 시작
- 지문의 관련 문장을 인용하며 근거 제시
- 각 선택지 분석으로 왜 그것이 정답/오답인지 설명
- 문제 해결 전략 및 팁 제공`
        },
        {
          role: "user", 
          content: `다음 TOEFL Reading 문제를 지문을 바탕으로 정확히 분석해주세요:

**지문 제목**: ${passageTitle || "제목 없음"}

**지문 전체**:
${passage}

**문제**: ${questionText}

**선택지들**:
${Array.isArray(options) ? options.map((opt, index) => `${String.fromCharCode(65 + index)}) ${opt}`).join('\n') : '객체 형태 선택지'}

**중요**: 위 지문 내용을 정확히 분석하여 가장 적절한 정답을 찾고, 왜 그것이 정답인지 지문을 근거로 설명해주세요. 제시된 정답(${correctAnswer})이 틀렸다면 올바른 답을 선택해주세요.`
        }
      ],
      max_completion_tokens: 1200,
      temperature: 0.2
    });

    return response.choices[0].message.content || "해설을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Reading solution generation error:", error);
    return "AI 해설 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
}

export async function generateSolutionExplanation(
  questionText: string,
  options: string[],
  correctAnswer: string,
  script: string
): Promise<string> {
  // Temporary fallback due to API quota issues
  const fallbackExplanation = `
**문제 분석:**
${questionText}

**정답:** ${correctAnswer}

**해설:**
이 문제는 TOEFL 리스닝 테스트의 대표적인 유형입니다. 올바른 답을 찾기 위해서는 다음과 같은 포인트를 주의깊게 들어야 합니다:

1. **핵심 내용 파악**: 스크립트에서 언급된 주요 내용과 세부사항을 정확히 이해하는 것이 중요합니다.

2. **문맥 이해**: 화자의 의도와 전체적인 맥락을 파악하여 정답을 추론해야 합니다.

3. **함정 선택지 주의**: 스크립트에서 언급되었지만 질문과 직접적으로 관련이 없는 선택지들을 주의해야 합니다.

**학습 팁:**
- 리스닝 중에는 노트테이킹을 활용하여 주요 포인트를 기록하세요
- 질문을 미리 읽어 어떤 정보에 집중해야 할지 파악하세요
- 반복 연습을 통해 다양한 억양과 말하기 속도에 익숙해지세요

※ 현재 AI 설명 기능에 일시적인 문제가 있어 기본 설명을 제공하고 있습니다.
  `;

  try {
    // Try OpenAI API first
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        {
          role: "system",
          content: `You are an expert TOEFL listening instructor. Analyze the given question, script, and provide a detailed explanation of why the correct answer is right. 

Instructions:
- Explain in Korean (한국어)
- Reference specific parts of the script that support the correct answer
- Explain why other options are incorrect
- Provide study tips for similar questions
- Keep explanations clear and educational`
        },
        {
          role: "user",
          content: `
Question: ${questionText}

Options:
${Array.isArray(options) ? options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n') : JSON.stringify(options, null, 2)}

Correct Answer: ${correctAnswer}

Script: ${script}

Please provide a detailed explanation of why this is the correct answer, referencing the script.`
        }
      ],
      max_completion_tokens: 1000,
      temperature: 0.3
    });

    return response.choices[0].message.content || fallbackExplanation;
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Return detailed fallback explanation instead of generic error
    return fallbackExplanation;
  }
}

// Parse GRE Quantitative text from Excel paste
export function parseGREQuantitativeText(content: string): any[] {
  const questions: any[] = [];
  
  // Use matchAll to capture question numbers and their content
  const questionRegex = /Question\s+(\d+)\s*[\n\r]+([\s\S]*?)(?=Question\s+\d+|$)/gi;
  const matches = Array.from(content.matchAll(questionRegex));
  
  if (matches.length === 0) {
    return [{
      questionText: content.trim(),
      questionType: 'multiple_choice',
      options: null,
      quantityA: null,
      quantityB: null,
      imageUrl: null,
      requiresImage: false,
      orderIndex: 1
    }];
  }
  
  matches.forEach((match, index) => {
    const questionNum = match[1];
    const block = match[2].trim();
    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) return;
    
    const fullText = lines.join(' ');
    
    let questionType = 'multiple_choice';
    let quantityA = null;
    let quantityB = null;
    let questionText = '';
    let options: string[] = [];
    let requiresImage = false;
    
    // Find Quantity A / Quantity B indices
    const quantityAIndex = lines.findIndex(line => /^Quantity\s*A\s*$/i.test(line));
    const quantityBIndex = lines.findIndex(line => /^Quantity\s*B\s*$/i.test(line));
    
    if (quantityAIndex !== -1 && quantityBIndex !== -1) {
      questionType = 'quantitative_comparison';
      
      // Condition lines: everything before "Quantity A"
      // Preserve line breaks to maintain structure (equations, inequalities, etc.)
      const conditionLines = lines.slice(0, quantityAIndex);
      questionText = conditionLines.join('\n').trim();
      
      // Extract Quantity A: collect all lines between "Quantity A" and "Quantity B"
      const quantityALines = [];
      for (let i = quantityAIndex + 1; i < quantityBIndex; i++) {
        const line = lines[i].trim();
        // Stop if we hit an option marker
        if (/^[A-E][\.\):]/.test(line)) break;
        if (line) quantityALines.push(line);
      }
      quantityA = quantityALines.join('\n') || null;
      
      // Extract Quantity B: collect all lines after "Quantity B" until we hit options
      const quantityBLines = [];
      for (let i = quantityBIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Stop if we hit an option marker (A., B., etc.)
        if (/^[A-E][\.\):]/.test(line)) break;
        if (line) quantityBLines.push(line);
      }
      quantityB = quantityBLines.join('\n') || null;
      
      // Standard quantitative comparison options
      options = [
        'Quantity A is greater.',
        'Quantity B is greater.',
        'The two quantities are equal.',
        'The relationship cannot be determined from the information given.'
      ];
      
    } else {
      // Check for numeric entry pattern: "Answer: ___"
      const answerLineIndex = lines.findIndex(line => 
        /^Answer\s*:\s*_+/.test(line) || /Enter your answer/i.test(line)
      );
      
      if (answerLineIndex !== -1) {
        questionType = 'numeric_entry';
        // Everything before "Answer:" line is the question
        questionText = lines.slice(0, answerLineIndex).join('\n');
      } else if (fullText.toLowerCase().includes('answer') || 
                 fullText.includes('____') || 
                 fullText.includes('___')) {
        questionType = 'numeric_entry';
        questionText = lines.join('\n');
      } else {
        // Check for checkbox pattern (multiple correct answers)
        const hasCheckboxes = lines.some(line => line.includes('☐'));
        const hasIndicateAll = fullText.toLowerCase().includes('indicate all such');
        
        // Extract option lines
        const optionLines = lines.filter(line => 
          /^[A-E][\.\):]/.test(line) || /^\([A-E]\)/.test(line) || /^☐\s*[A-E][\.\):]/.test(line)
        );
        
        if (optionLines.length > 0) {
          questionType = hasCheckboxes || hasIndicateAll ? 'multiple_choice' : 'multiple_choice';
          
          // Find first option line index
          const firstOptionIndex = lines.findIndex(line => 
            /^[A-E][\.\):]/.test(line) || /^\([A-E]\)/.test(line) || /^☐/.test(line)
          );
          
          questionText = lines.slice(0, firstOptionIndex).join('\n');
          
          // Extract clean option text
          options = optionLines.map(line => 
            line
              .replace(/^☐\s*/, '') // Remove checkbox
              .replace(/^[A-E][\.\):\s]+/i, '') // Remove letter prefix
              .replace(/^\([A-E]\)\s*/i, '') // Remove (A) style
              .trim()
          );
        } else {
          // No options found, assume numeric entry
          questionType = 'numeric_entry';
          questionText = lines.join('\n');
        }
      }
    }
    
    // Detect if image is needed
    const imageKeywords = ['chart', 'graph', 'diagram', 'figure', 'table', 'performance', 'distribution', 'data', 'survey', 'results'];
    if (imageKeywords.some(keyword => fullText.toLowerCase().includes(keyword))) {
      requiresImage = true;
    }
    
    questions.push({
      questionText: questionText.trim(),
      questionType,
      options: options.length > 0 ? options : null,
      quantityA,
      quantityB,
      imageUrl: null,
      requiresImage,
      orderIndex: parseInt(questionNum) || index + 1
    });
  });
  
  return questions;
}

// Generate AI Study Plan based on student's situation
export async function generateAIStudyPlan(input: {
  examType: "toefl" | "gre";
  currentScore?: number;
  targetScore: number;
  duration: number; // weeks
  weeklyHours: number;
  focusAreas: string[];
  learningStyle: "intensive" | "balanced" | "relaxed";
  weaknessDetails?: string;
  preferredTimeSlot?: "morning" | "afternoon" | "evening" | "night";
  language?: "ko" | "ja" | "en" | "th"; // User's preferred language for the study plan
  sectionScores?: {
    reading?: number;
    listening?: number;
    speaking?: number;
    writing?: number;
    verbal?: number;
    quantitative?: number;
    analytical?: number;
  };
  sectionPriorities?: {
    reading?: number;
    listening?: number;
    speaking?: number;
    writing?: number;
    verbal?: number;
    quantitative?: number;
    analytical?: number;
  };
}): Promise<{
  summary: string;
  weeklyPlan: Array<{
    week: number;
    theme: string;
    goals: string[];
    dailyTasks: Array<{
      day: number;
      section: string;
      activity: string;
      duration: number; // minutes
      description: string;
    }>;
    milestone: string;
  }>;
  recommendations: string[];
  totalTasks: number;
}> {
  // Format section scores for prompt
  const formatSectionScores = () => {
    if (!input.sectionScores) return 'Not specified';
    const scores = Object.entries(input.sectionScores)
      .filter(([_, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    return scores || 'Not specified';
  };

  // Format section priorities for prompt
  const formatSectionPriorities = () => {
    if (!input.sectionPriorities) return 'Not specified';
    const priorities = Object.entries(input.sectionPriorities)
      .filter(([_, v]) => v !== undefined && v !== null)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .map(([k, v]) => `${k} (priority ${v})`)
      .join(', ');
    return priorities || 'Not specified';
  };

  // Language instruction for output
  const languageInstruction = (() => {
    switch (input.language) {
      case 'ko':
        return 'IMPORTANT: Generate ALL text content (summary, theme, goals, activity descriptions, milestone, recommendations) in Korean (한국어). Section names like "reading", "listening", etc. should remain in English for system compatibility, but all descriptive text must be in Korean.';
      case 'ja':
        return 'IMPORTANT: Generate ALL text content (summary, theme, goals, activity descriptions, milestone, recommendations) in Japanese (日本語). Section names like "reading", "listening", etc. should remain in English for system compatibility, but all descriptive text must be in Japanese.';
      case 'th':
        return 'IMPORTANT: Generate ALL text content (summary, theme, goals, activity descriptions, milestone, recommendations) in Thai (ภาษาไทย). Section names like "reading", "listening", etc. should remain in English for system compatibility, but all descriptive text must be in Thai.';
      default:
        return 'Generate all text content in English.';
    }
  })();

  const prompt = `You are an expert ${input.examType.toUpperCase()} tutor creating a personalized study plan.

${languageInstruction}

Student Profile:
- Current Score: ${input.currentScore || 'Not specified'}
- Target Score: ${input.targetScore}
- Study Duration: ${input.duration} weeks
- Weekly Study Hours: ${input.weeklyHours} hours
- Focus Areas: ${input.focusAreas.join(', ')}
- Learning Style: ${input.learningStyle}
- Weaknesses: ${input.weaknessDetails || 'General improvement needed'}
- Preferred Study Time: ${input.preferredTimeSlot || 'Evening'}
- Section Scores: ${formatSectionScores()}
- Section Priorities: ${formatSectionPriorities()}

Create a detailed, personalized study plan in JSON format. The plan should be motivating, realistic, and tailored to the student's needs.

Response format:
{
  "summary": "Brief 2-3 sentence summary of the study plan strategy",
  "weeklyPlan": [
    {
      "week": 1,
      "theme": "Foundation Building - Reading Basics",
      "goals": ["Master vocabulary strategies", "Complete 2 reading passages"],
      "dailyTasks": [
        {"day": 1, "section": "reading", "activity": "vocabulary_study", "duration": 60, "description": "Learn 30 academic words with context"},
        {"day": 2, "section": "reading", "activity": "practice_test", "duration": 90, "description": "Complete one TOEFL reading passage with timer"}
      ],
      "milestone": "Complete Week 1 reading diagnostic test"
    }
  ],
  "recommendations": ["Tip 1 for success", "Tip 2 for success"],
  "totalTasks": 84
}

Important guidelines:
- Create ${input.duration} weeks of detailed content
- Each week should have 5-7 daily tasks
- Balance activities between ${input.focusAreas.join(', ')}
- For ${input.learningStyle} style: ${input.learningStyle === 'intensive' ? 'more practice tests and challenging materials' : input.learningStyle === 'relaxed' ? 'gradual progression with more review time' : 'balanced mix of study and practice'}
- Include variety: vocabulary study, reading passages, listening practice, speaking exercises, writing tasks, review sessions
- Set achievable weekly milestones
- Provide 3-5 actionable recommendations
- IMPORTANT: Allocate MORE study time to sections with lower scores and higher priorities
- If section priorities are provided, focus the most attention on priority 1 sections, then priority 2, etc.
- Create an accelerated improvement plan for the weakest sections based on the section scores

Respond ONLY with the JSON object, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: "You are an expert test preparation tutor. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content || "";
    
    // Clean and parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const result = JSON.parse(jsonStr.trim());
    
    return {
      summary: result.summary || "AI-generated personalized study plan",
      weeklyPlan: result.weeklyPlan || [],
      recommendations: result.recommendations || [],
      totalTasks: result.totalTasks || result.weeklyPlan?.reduce((sum: number, week: any) => sum + (week.dailyTasks?.length || 0), 0) || 0
    };
  } catch (error) {
    console.error("Error generating AI study plan:", error);
    throw new Error("Failed to generate AI study plan");
  }
}

// Solve reading questions with AI - auto-detect correct answers and generate explanations
export async function solveReadingQuestions(input: {
  questions: Array<{
    type: 'complete-words' | 'comprehension' | 'academic';
    passage: string;
    question?: string;
    options?: string[];
    blankCount?: number; // For complete-words type
  }>;
  language?: 'ko' | 'ja' | 'en' | 'th';
}): Promise<Array<{
  correctAnswer: string; // 'A', 'B', 'C', 'D' for MC, or comma-separated words for complete-words
  explanation: string;
  answers?: string[]; // For complete-words type
}>> {
  const languageInstruction = (() => {
    switch (input.language) {
      case 'ko':
        return 'Generate ALL explanations in Korean (한국어). Provide detailed reasoning in Korean.';
      case 'ja':
        return 'Generate ALL explanations in Japanese (日本語). Provide detailed reasoning in Japanese.';
      case 'th':
        return 'Generate ALL explanations in Thai (ภาษาไทย). Provide detailed reasoning in Thai.';
      default:
        return 'Generate all explanations in English.';
    }
  })();

  const questionPrompts = input.questions.map((q, idx) => {
    if (q.type === 'complete-words') {
      // Enhanced pattern to match various blank formats:
      // - "me___" or "me_____" (prefix + continuous underscores)
      // - "me _ _ _" or "me_ _ _" (prefix + space-separated underscores)
      // - "___" or "_ _ _" (standalone underscores)
      // - "co-op___" (hyphenated hints)
      // Also handles numbered markers like [1], [2] after underscores
      const blankPattern = /([a-zA-Z][a-zA-Z'-]*)?\s*((?:_\s*)+)(?:\s*\[\d+\])?/g;
      const blanks: { hint: string; position: number; letterCount: number }[] = [];
      let match;
      let pos = 0;
      const passage = q.passage || '';
      while ((match = blankPattern.exec(passage)) !== null) {
        const underscoreSequence = match[2];
        const letterCount = (underscoreSequence.match(/_/g) || []).length;
        blanks.push({ 
          hint: match[1] || '', 
          position: pos++,
          letterCount 
        });
      }
      
      const blankDescriptions = blanks.map((b, i) => 
        b.hint 
          ? `Blank ${i + 1}: starts with "${b.hint}", needs ${b.letterCount} more letters`
          : `Blank ${i + 1}: complete word needed (${b.letterCount} letters)`
      ).join('\n');
      
      return `Question ${idx + 1} (Complete the Words - TOEFL Reading):
Passage: "${passage}"

There are ${blanks.length} blanks to fill. Each blank is shown as underscores (___) optionally preceded by a word prefix/hint.
${blankDescriptions}

Task: 
1. Read the passage carefully and understand the context
2. For each blank, determine the COMPLETE word that fits the context
3. If a prefix is given (e.g., "me _ _ _"), provide the FULL word (e.g., "media")
4. If no prefix (standalone "_ _ _"), provide the complete word
5. The number of underscores indicates how many letters are missing
6. Return ALL ${blanks.length} answers in order`;
    } else {
      return `Question ${idx + 1} (${q.type === 'academic' ? 'Academic Reading' : 'Reading Comprehension'}):
Passage: "${q.passage.substring(0, 1500)}${q.passage.length > 1500 ? '...' : ''}"
Question: "${q.question}"
Options:
(A) ${q.options?.[0] || ''}
(B) ${q.options?.[1] || ''}
(C) ${q.options?.[2] || ''}
(D) ${q.options?.[3] || ''}
Task: Analyze the passage and determine the correct answer with detailed explanation.`;
    }
  }).join('\n\n---\n\n');

  const prompt = `You are an expert TOEFL/English reading instructor. Solve the following reading questions.

${languageInstruction}

${questionPrompts}

For each question, provide your answer in JSON format:
{
  "solutions": [
    {
      "questionIndex": 0,
      "type": "complete-words" | "comprehension" | "academic",
      "correctAnswer": "A" (for MC) or "word1, word2, word3, ..." (comma-separated for complete-words),
      "answers": ["word1", "word2", "word3", ...] (REQUIRED array for complete-words type - one FULL word per blank in order),
      "explanation": "Detailed explanation in the requested language"
    }
  ]
}

CRITICAL RULES:
- For MULTIPLE CHOICE: Analyze options and return correctAnswer as "A", "B", "C", or "D"
- For COMPLETE-WORDS:
  * The "answers" array MUST contain the FULL words (not just missing letters)
  * Example: If passage has "Recyc___", answer is "Recycling" (not "ling")
  * Example: If passage has "environ___", answer is "environment" (not "ment")
  * The number of words in "answers" MUST match the number of blanks
  * Words must be in the same order as blanks appear in the passage
- Provide educational explanations that reference the passage context

Respond ONLY with valid JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: "You are an expert English reading comprehension instructor. Always respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
      max_completion_tokens: 4000,
      temperature: 0.3, // Lower temperature for more consistent answers
    });

    const content = response.choices[0].message.content || "";
    
    // Clean and parse JSON
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    
    const result = JSON.parse(jsonStr.trim());
    
    return (result.solutions || []).map((sol: any) => ({
      correctAnswer: sol.correctAnswer || 'A',
      explanation: sol.explanation || '',
      answers: sol.answers || (sol.correctAnswer?.includes(',') ? sol.correctAnswer.split(',').map((a: string) => a.trim()) : undefined)
    }));
  } catch (error) {
    console.error("Error solving reading questions with AI:", error);
    throw new Error("Failed to solve reading questions with AI");
  }
}

export default openai;
