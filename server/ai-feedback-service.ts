import OpenAI from "openai";
import type { SpeakingFeedbackData, WritingCompleteSentenceFeedback, WritingEssayFeedbackData, NewToeflSpeakingInterviewFeedback, NewToeflWritingFeedback, NewToeflListenRepeatFeedback, NewToeflBuildSentenceFeedback, IntegratedWritingFeedbackData, DiscussionWritingFeedbackData } from "@shared/schema";
import type { SpeechMetrics } from "./openai";
import { getOpenAIModel } from "./openaiModels";
import { 
  type SupportedLanguage, 
  languageNames, 
  languageNamesNative, 
  languageLabels, 
  getLanguageConfig,
  buildReadingExplanationPrompt,
  buildListeningExplanationPrompt
} from "./lang/promptConfig";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type { SupportedLanguage };

export async function generateSpeakingFeedback(
  question: string,
  userAnswer: string,
  questionType: string,
  language: SupportedLanguage = 'ko'
): Promise<SpeakingFeedbackData> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are an official ETS TOEFL Speaking evaluator. Evaluate responses using the EXACT official TOEFL Speaking rubric.

## OFFICIAL TOEFL SPEAKING SCORE LEVELS (0-30 scale):
- 26-30 (Advanced): Excellent command - clear, fluid speech with natural pace; effective vocabulary and grammar with only minor errors; fully addresses prompt with well-organized, coherent ideas
- 22-25 (High-Intermediate): Good ability - generally clear with occasional pronunciation/pacing issues; some grammar errors but meaning is clear; addresses topic with some development
- 18-21 (Low-Intermediate): Fair ability - inconsistent clarity, frequent pronunciation/fluency problems; frequent grammatical errors, limited vocabulary; limited development, may be incomplete
- 13-17 (Basic): Limited ability - minimal intelligible speech, severe pronunciation issues; very limited vocabulary and grammar; minimal relevant content
- 0-12 (Below Basic): Very limited or no meaningful response

## SCORING CRITERIA (Each 0-10, total = sum of three):

### 1. ${labels.languageUse} 0-10:
- 9-10: Rich vocabulary, sophisticated grammar, varied sentence structures, minimal errors
- 7-8: Good vocabulary range, mostly correct grammar, some variety in structures
- 5-6: Adequate vocabulary, noticeable grammar errors that don't block meaning
- 3-4: Limited vocabulary, frequent errors that sometimes obscure meaning
- 0-2: Very basic vocabulary, pervasive errors blocking communication

### 2. ${labels.logic} 0-10:
- 9-10: Fully addresses prompt, clear main idea with specific supporting details, excellent organization
- 7-8: Addresses main points, good organization, sufficient details
- 5-6: Partially addresses prompt, some organization but may lack details or clarity
- 3-4: Vague connection to prompt, weak organization, insufficient development
- 0-2: Minimal or irrelevant content, no clear organization

### 3. ${labels.delivery} 0-10:
- 9-10: Clear, natural pace, excellent pronunciation, smooth flow with natural pauses
- 7-8: Generally clear, good pace with minor hesitations, understandable pronunciation
- 5-6: Understandable but choppy, some pronunciation issues, noticeable pauses
- 3-4: Difficult to understand, frequent pauses, pronunciation problems require effort
- 0-2: Mostly unintelligible, very choppy, severe pronunciation issues

## IMPORTANT GUIDELINES:
- Be REALISTIC and CRITICAL - most students score 18-24, not 26-30
- Differentiate clearly between skill levels
- Provide specific, actionable feedback
- The total score must equal the sum of the three criteria scores
- Short or incomplete answers should receive proportionally lower scores

**IMPORTANT: Provide ALL feedback comments in ${langName}. Only the model answer should be in English.**

Return JSON:
{
  "totalScore": number (0-30, sum of three scores),
  "overallComment": "2-3 sentences in ${langName} summarizing performance level and key strengths/weaknesses",
  "languageUse": { "score": number (0-10), "comment": "specific ${langName} feedback with examples from response" },
  "logic": { "score": number (0-10), "comment": "specific ${langName} feedback on organization and content" },
  "delivery": { "score": number (0-10), "comment": "specific ${langName} feedback - note: for text, evaluate based on apparent fluency, sentence flow, and naturalness" },
  "modelAnswer": "improved English response addressing the same prompt, 45-60 seconds when spoken",
  "sentenceBysentenceFeedback": [
    {
      "original": "학생이 말한 원래 문장 (그대로 복사)",
      "corrected": "문법/어휘/표현이 교정된 올바른 문장",
      "explanation": "${langName}로 왜 이렇게 고쳤는지 설명"
    }
  ]
}

## CRITICAL: sentenceBysentenceFeedback is MANDATORY
- Analyze EVERY sentence from the student's response
- For each sentence provide: original (exact text), corrected (improved version), explanation (in ${langName})
- Even perfect sentences must be included with corrected = original and a positive comment`;

  const userPrompt = `Question Type: ${questionType}
Question: ${question}

Student's Answer: ${userAnswer}

Please evaluate this speaking response and provide detailed feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const rawFeedback = JSON.parse(content);
    
    // Validate and ensure sentenceBysentenceFeedback is properly generated
    let sentenceBysentenceFeedback = rawFeedback.sentenceBysentenceFeedback;
    
    // If AI didn't return proper sentence feedback, generate from user answer
    if (!Array.isArray(sentenceBysentenceFeedback) || sentenceBysentenceFeedback.length === 0) {
      console.warn('AI feedback service: sentenceBysentenceFeedback missing, generating from user answer');
      const sentences = userAnswer.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
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
    
    const feedback: SpeakingFeedbackData = {
      totalScore: rawFeedback.totalScore || 0,
      overallComment: rawFeedback.overallComment || "피드백 생성 중 오류가 발생했습니다.",
      languageUse: rawFeedback.languageUse || { score: 0, comment: "" },
      logic: rawFeedback.logic || { score: 0, comment: "" },
      delivery: rawFeedback.delivery || { score: 0, comment: "" },
      modelAnswer: rawFeedback.modelAnswer || "",
      sentenceBysentenceFeedback
    };
    
    return feedback;
  } catch (error) {
    console.error("Error generating speaking feedback:", error);
    throw error;
  }
}

export async function generateWritingCompleteSentenceFeedback(
  originalSentence: string,
  userAnswer: string,
  correctAnswer: string,
  language: SupportedLanguage = 'ko'
): Promise<WritingCompleteSentenceFeedback> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are a TOEFL Writing expert. Analyze the student's sentence completion and provide feedback in ${langName}.

Explain:
1. ${labels.correctAnswer}: The correct sentence
2. ${labels.explanation}: Why this is the correct answer - explain grammar rules, word order, etc.
3. ${labels.userMistakes}: What the student got wrong and why

**IMPORTANT: Provide ALL explanations and feedback in ${langName}.**

Return JSON in this exact format:
{
  "correctAnswer": "string in English (the correct sentence)",
  "explanation": "string in ${langName}",
  "userMistakes": "string in ${langName}"
}`;

  const userPrompt = `Original sentence pattern: ${originalSentence}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}

Please analyze and provide feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as WritingCompleteSentenceFeedback;
    return feedback;
  } catch (error) {
    console.error("Error generating complete sentence feedback:", error);
    throw error;
  }
}

export async function generateWritingEssayFeedback(
  taskType: string,
  taskPrompt: string,
  userAnswer: string,
  language: SupportedLanguage = 'ko'
): Promise<WritingEssayFeedbackData> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are an official ETS TOEFL Writing evaluator. Evaluate responses using the EXACT official TOEFL Writing rubric.

## OFFICIAL TOEFL WRITING SCORE LEVELS (0-30 scale):
- 24-30 (Advanced/C1): Excellent command - addresses task effectively, well-organized, sophisticated language use, minor errors only
- 17-23 (High-Intermediate): Good ability - addresses task with some elaboration, clear organization, good vocabulary with some errors
- 13-16 (Low-Intermediate): Fair ability - addresses task but may be incomplete, basic organization, limited vocabulary, noticeable errors
- 7-12 (Basic): Limited ability - minimally addresses task, poor organization, frequent errors obscure meaning
- 0-6 (Below Basic): Very limited or irrelevant response

## SCORING CRITERIA (Each 0-10, total = sum of three):

### 1. ${labels.languageUse} 0-10:
- 9-10: Sophisticated vocabulary, varied sentence structures, excellent grammar, academic register
- 7-8: Good vocabulary range, mostly correct grammar, some sentence variety
- 5-6: Adequate vocabulary, noticeable but not blocking errors, basic structures
- 3-4: Limited vocabulary, frequent errors, repetitive structures
- 0-2: Very basic vocabulary, pervasive errors blocking communication

### 2. ${labels.logic} 0-10:
- 9-10: Clear thesis, specific supporting details, logical argument progression, addresses all aspects
- 7-8: Clear main idea, good support, addresses main points with some elaboration
- 5-6: Identifiable main idea but limited development, some support but may be vague
- 3-4: Unclear thesis, insufficient support, may be off-topic
- 0-2: No clear purpose, irrelevant content

### 3. ${labels.contextFlow} 0-10:
- 9-10: Excellent paragraph structure, smooth transitions, coherent flow throughout
- 7-8: Good organization, clear transitions, logical sequence
- 5-6: Basic organization, some transitions but may be abrupt, generally follows logic
- 3-4: Weak organization, missing transitions, hard to follow
- 0-2: No discernible organization, chaotic structure

## TASK-SPECIFIC GUIDELINES:
- Email Writing: Evaluate appropriate tone, format, and addressing all required points
- Academic Discussion: Evaluate engagement with the topic, response to other opinions, contribution quality
- Integrated Writing: Evaluate accuracy of lecture/reading summary and clear connections

## IMPORTANT GUIDELINES:
- Be REALISTIC and CRITICAL - average students score 17-23, not 24-30
- Word count matters: short responses (<100 words) should score lower
- Differentiate clearly between skill levels
- Provide specific, actionable feedback with examples
- The total score must equal the sum of the three criteria scores

**IMPORTANT: Provide ALL feedback comments in ${langName}. Only the model answer should be in English.**

Return JSON:
{
  "totalScore": number (0-30, sum of three scores),
  "overallComment": "2-3 sentences in ${langName} summarizing performance level and key areas for improvement",
  "languageUse": { "score": number (0-10), "comment": "specific ${langName} feedback with examples from response" },
  "logic": { "score": number (0-10), "comment": "specific ${langName} feedback on argument and development" },
  "contextFlow": { "score": number (0-10), "comment": "specific ${langName} feedback on organization and transitions" },
  "modelAnswer": "improved English response for the same prompt, appropriately formatted (email format for emails, discussion format for discussions)"
}`;

  const userPrompt = `Task Type: ${taskType}
Task Prompt: ${taskPrompt}

Student's Response: ${userAnswer}

Please evaluate this writing response and provide detailed feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as WritingEssayFeedbackData;
    return feedback;
  } catch (error) {
    console.error("Error generating writing essay feedback:", error);
    throw error;
  }
}

// TOEFL iBT Integrated Writing Task - ETS 2024 Official Rubric Based
export async function generateIntegratedWritingFeedback(
  readingPassage: string,
  listeningScript: string,
  userEssay: string,
  language: SupportedLanguage = 'ko'
): Promise<IntegratedWritingFeedbackData> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are an official ETS TOEFL iBT Integrated Writing evaluator. Evaluate using the EXACT official ETS rubric (0-5 scale).

## OFFICIAL ETS INTEGRATED WRITING RUBRIC (0-5 Scale):

### Score 5 (Advanced):
- Successfully selects important information from the lecture
- Coherently and accurately presents information from both lecture and reading
- Well organized with clear, appropriate connections between lecture and reading
- May have occasional language errors that do NOT affect content accuracy

### Score 4 (High-Intermediate):
- Generally conveys relevant information from both lecture and reading
- May have minor omissions, inaccuracies, or vagueness in content/connections
- More frequent language errors but do not seriously interfere with understanding

### Score 3 (Low-Intermediate):
- Conveys some relevant information from the lecture
- Vague, unclear, or imprecise connections between lecture and reading
- May omit one major key point from the lecture
- Grammar errors may result in vague expressions or obscured meanings

### Score 2 (Basic):
- Contains some relevant information but marked by:
  - Significant language difficulties, OR
  - Significant omission/inaccuracy of important ideas, OR
  - Significant inaccuracy in connections between lecture and reading

### Score 1 (Limited):
- Little or no meaningful/relevant information from the lecture
- Serious and frequent language errors that interfere with meaning

### Score 0:
- Merely copies reading, off-topic, blank, or in foreign language

## KEY EVALUATION FOCUS FOR INTEGRATED WRITING:
1. **Content Accuracy (가장 중요)**: Did the student accurately summarize the MAIN POINTS from the lecture?
2. **Connections**: Are the relationships between reading and lecture clearly explained?
3. **Organization**: Is the response well-structured with logical flow?
4. **Language**: Are there language errors that affect comprehension?

## KEY POINTS FROM SOURCE MATERIALS:
You must identify the main points from both sources and check if the student covered them.

**IMPORTANT**: 
- Provide ALL feedback in ${langName} except the modelAnswer (which should be in English).
- For sentence-by-sentence feedback, analyze EVERY sentence the student wrote.
- Identify 5 essential academic expressions from your model answer.
- Be CRITICAL - most students score 2-4, rarely 5.

Return JSON exactly in this format:
{
  "etsScore": number (0-5),
  "totalScore": number (0-30, multiply etsScore by 6),
  "overallComment": "2-3 sentences in ${langName} evaluating how well student summarized lecture content and connected it to reading",
  "contentAccuracy": { "score": number (0-10), "comment": "${langName} feedback on how accurately lecture points were summarized" },
  "organization": { "score": number (0-10), "comment": "${langName} feedback on structure and logical connections" },
  "languageUse": { "score": number (0-10), "comment": "${langName} feedback on vocabulary and sentence variety" },
  "grammar": { "score": number (0-10), "comment": "${langName} detailed grammar analysis with specific examples" },
  "sentenceFeedback": [
    { "original": "student's sentence", "correction": "corrected version or same if no error", "hasError": boolean, "errorType": "grammar|vocabulary|clarity|logic|style or null", "feedback": "${langName} feedback for this sentence" }
  ],
  "modelAnswer": "improved 150-225 word English response properly synthesizing reading and lecture",
  "essentialExpressions": [
    { "expression": "English expression", "meaning": "${langName} meaning", "exampleSentence": "English example using this expression" }
  ],
  "keyPointsCovered": [
    { "point": "brief description of key point from lecture", "covered": boolean, "comment": "${langName} explanation of how well this point was addressed" }
  ]
}`;

  const userPrompt = `## Reading Passage:
${readingPassage}

## Lecture Script:
${listeningScript}

## Student's Essay:
${userEssay}

Please evaluate this integrated writing response following the official ETS rubric. Analyze every sentence the student wrote.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as IntegratedWritingFeedbackData;
    return feedback;
  } catch (error) {
    console.error("Error generating integrated writing feedback:", error);
    throw error;
  }
}

// TOEFL iBT Academic Discussion Task - ETS 2024 Official Rubric Based
export async function generateDiscussionWritingFeedback(
  discussionTopic: string,
  studentOpinions: { name: string; opinion: string }[] | undefined,
  userEssay: string,
  language: SupportedLanguage = 'ko'
): Promise<DiscussionWritingFeedbackData> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const opinionsText = studentOpinions?.map(op => `${op.name}: ${op.opinion}`).join('\n') || '';
  
  const systemPrompt = `You are an official ETS TOEFL iBT Writing for Academic Discussion evaluator. Evaluate using the EXACT official ETS rubric (0-5 scale).

## OFFICIAL ETS ACADEMIC DISCUSSION RUBRIC (0-5 Scale):

### Score 5 (Advanced):
- Relevant and very clearly expressed contribution to the discussion
- Fully developed elaboration with clear, detailed explanations/examples
- Varied and precise syntactic structures and vocabulary
- Almost no lexical or grammatical errors (except minor typos)

### Score 4 (High-Intermediate):
- Relevant contribution that allows ideas to be easily understood
- Adequate elaboration with explanations, examples, or details
- Some variety in syntactic structures and vocabulary
- Minor lexical and grammatical errors that do not impair communication

### Score 3 (Low-Intermediate):
- Mostly relevant and mostly understandable contribution
- Elaboration may be partially missing, unclear, or irrelevant
- Some variety in structures and vocabulary
- Noticeable lexical and grammatical errors

### Score 2 (Basic):
- Attempts to contribute but limitations affect clarity
- Limited or unclear elaboration
- Limited range of syntactic structures and vocabulary
- Frequent errors that may obscure meaning

### Score 1 (Limited):
- Ineffective attempt to contribute
- Few or no coherent ideas
- Severely limited range of structures and vocabulary
- Serious and frequent language errors

### Score 0:
- Off-topic, copied from prompt, blank, or unreadable

## KEY EVALUATION FOCUS FOR ACADEMIC DISCUSSION:
1. **Argumentation (가장 중요)**: Is the student's position CLEAR and WELL-SUPPORTED?
2. **Development**: Are ideas elaborated with specific explanations, examples, or reasoning?
3. **Engagement**: Does the response meaningfully engage with the discussion topic and other opinions?
4. **Language Variety**: Is there variety in vocabulary and sentence structures?
5. **Accuracy**: Are grammar and mechanics correct enough to communicate clearly?

**IMPORTANT**: 
- Provide ALL feedback in ${langName} except the modelAnswer (which should be in English).
- For sentence-by-sentence feedback, analyze EVERY sentence the student wrote.
- Focus on logical argumentation depth and clarity of opinion expression.
- Identify 5 essential academic expressions from your model answer.
- Be CRITICAL - most students score 2-4, rarely 5.
- Target response length: 100-150 words.

Return JSON exactly in this format:
{
  "etsScore": number (0-5),
  "totalScore": number (0-30, multiply etsScore by 6),
  "overallComment": "2-3 sentences in ${langName} evaluating the depth and clarity of the student's argument",
  "argumentation": { "score": number (0-10), "comment": "${langName} feedback on clarity and depth of the argument" },
  "development": { "score": number (0-10), "comment": "${langName} feedback on elaboration with examples/details" },
  "languageUse": { "score": number (0-10), "comment": "${langName} feedback on vocabulary variety and sentence structures" },
  "grammar": { "score": number (0-10), "comment": "${langName} detailed grammar analysis with specific examples" },
  "sentenceFeedback": [
    { "original": "student's sentence", "correction": "corrected version or same if no error", "hasError": boolean, "errorType": "grammar|vocabulary|clarity|logic|style or null", "feedback": "${langName} feedback for this sentence" }
  ],
  "modelAnswer": "improved 100-150 word English response with clear position and strong supporting arguments",
  "essentialExpressions": [
    { "expression": "English expression", "meaning": "${langName} meaning", "exampleSentence": "English example using this expression" }
  ],
  "topicRelevance": { "isRelevant": boolean, "comment": "${langName} explanation of how relevant the response is to the discussion topic" }
}`;

  const userPrompt = `## Discussion Topic:
${discussionTopic}

## Other Students' Opinions:
${opinionsText || 'No other opinions provided'}

## Student's Essay:
${userEssay}

Please evaluate this academic discussion response following the official ETS rubric. Analyze every sentence the student wrote.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as DiscussionWritingFeedbackData;
    return feedback;
  } catch (error) {
    console.error("Error generating discussion writing feedback:", error);
    throw error;
  }
}

export async function generateReadingFeedback(
  question: string,
  options: string[],
  userAnswer: string,
  correctAnswer: string,
  passage: string,
  language: SupportedLanguage = 'ko'
): Promise<{ isCorrect: boolean; explanation: string }> {
  const isCorrect = userAnswer === correctAnswer;
  const systemPrompt = buildReadingExplanationPrompt(language);

  const userPrompt = `Passage: ${passage.substring(0, 800)}...

Question: ${question}
Options: 
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Provide structured explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating reading feedback:", error);
    throw error;
  }
}

export async function generateListeningFeedback(
  question: string,
  options: string[],
  userAnswer: string,
  correctAnswer: string,
  dialogue: string,
  language: SupportedLanguage = 'ko'
): Promise<{ isCorrect: boolean; explanation: string }> {
  const isCorrect = userAnswer === correctAnswer;
  const systemPrompt = buildListeningExplanationPrompt(language);

  const userPrompt = `Dialogue/Talk: ${dialogue}

Question: ${question}
Options: 
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Provide structured explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating listening feedback:", error);
    throw error;
  }
}

export async function generateFullTestFeedback(
  sectionScores: {
    reading: number;
    listening: number;
    speaking: number;
    writing: number;
  },
  totalScore: number,
  language: SupportedLanguage = 'ko'
): Promise<{
  overallFeedback: string;
  sectionFeedback: {
    reading: string;
    listening: string;
    speaking: string;
    writing: string;
  };
  recommendations: string[];
}> {
  const langName = languageNames[language];
  
  const systemPrompt = `You are a TOEFL expert providing comprehensive test feedback. Based on the section scores (each out of 30, total out of 120), provide detailed feedback in ${langName}.

**IMPORTANT: Provide ALL feedback in ${langName}.**

Return JSON in this format:
{
  "overallFeedback": "Overall assessment in ${langName}",
  "sectionFeedback": {
    "reading": "Reading section feedback in ${langName}",
    "listening": "Listening section feedback in ${langName}", 
    "speaking": "Speaking section feedback in ${langName}",
    "writing": "Writing section feedback in ${langName}"
  },
  "recommendations": ["Array of study recommendations in ${langName}"]
}`;

  const userPrompt = `TOEFL Test Results:
- Reading: ${sectionScores.reading}/30
- Listening: ${sectionScores.listening}/30
- Speaking: ${sectionScores.speaking}/30
- Writing: ${sectionScores.writing}/30
- Total: ${totalScore}/120

Please provide comprehensive feedback and study recommendations.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"), // GPT-5.2 released December 11, 2025 - latest OpenAI model with improved reasoning and accuracy
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating full test feedback:", error);
    throw error;
  }
}

// 2026 TOEFL Speaking Interview Feedback (0-6 scale)
// Enhanced for score variety and accurate differentiation based on response quality
// Now supports real audio analysis for accurate Delivery scoring
export async function generateNewToeflSpeakingInterviewFeedback(
  question: string,
  userAnswer: string,
  language: SupportedLanguage = 'ko',
  speechMetrics?: SpeechMetrics // Optional: real audio analysis for accurate Delivery scoring
): Promise<NewToeflSpeakingInterviewFeedback> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  // Use speechMetrics if available
  const wordCount = speechMetrics?.wordCount || userAnswer.trim().split(/\s+/).filter(w => w.length > 0).length;
  const sentenceCount = userAnswer.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const hasTransitions = /however|therefore|moreover|furthermore|in addition|for example|first|second|finally|because|so|but|although/i.test(userAnswer);
  const hasExamples = /for example|for instance|such as|like|my experience|I remember|once|when I/i.test(userAnswer);
  const hasOpinion = /I think|I believe|in my opinion|I prefer|I would|I feel/i.test(userAnswer);
  
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
  if (wordCount < 25 || sentenceCount < 2) qualityTier = "very_low";
  else if (wordCount < 50 || sentenceCount < 3) qualityTier = "low";
  else if (wordCount > 90 && hasTransitions && hasExamples) qualityTier = "high";
  else if (wordCount > 110 && hasTransitions && hasExamples && avgWordsPerSentence > 10) qualityTier = "very_high";
  
  const systemPrompt = `You are an official ETS TOEFL Speaking evaluator for the NEW 2026 TOEFL format. Evaluate Interview responses using the NEW 0-6 scale (with half-point increments).

## CRITICAL SCORING INSTRUCTIONS:
**YOU MUST USE THE FULL RANGE OF SCORES (0-6).** Do NOT default to middle scores (3-4).
- Excellent responses (C1 level) deserve 5.0-6.0
- Good responses (B2+ level) deserve 4.0-5.0
- Adequate responses (B2 level) deserve 3.0-4.0
- Weak responses (B1+ level) deserve 2.0-3.0
- Poor responses (B1/A2 level) deserve 1.0-2.0
- Very poor/no response: 0-1.0

**Scores will naturally vary** based on actual performance in each area. For example:
- Language Use: 4.5 (good vocabulary but some errors)
- Logic: 3.0 (addresses topic but lacks clear examples)
- Delivery: 3.5 (understandable but some choppy segments)

Evaluate each criterion independently - they may or may not have the same score.

## QUALITY INDICATORS FOR THIS RESPONSE:
- Word count: ${wordCount} words (optimal: 80-120 for 45-sec response)
- Sentence count: ${sentenceCount}
- Average words per sentence: ${avgWordsPerSentence.toFixed(1)}
- Uses transitions: ${hasTransitions ? "Yes" : "No"}
- Includes examples: ${hasExamples ? "Yes" : "No"}
- States opinion clearly: ${hasOpinion ? "Yes" : "No"}
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
- High fluency (80+) + good WPM (120-150) + few pauses → Delivery 5.0-6.0
- Medium fluency (60-80) + acceptable WPM (100-160) → Delivery 3.5-5.0
- Low fluency (<60) + many hesitations + slow/fast rate → Delivery 2.0-3.5
- Very low fluency (<40) + frequent pauses + many hesitations → Delivery 0.5-2.0` : `## NOTE: Audio analysis not available
Delivery scoring is based on text analysis only (sentence structure, repetition patterns).
Without audio data, Delivery score should be estimated conservatively from transcript patterns.`}

## 2026 TOEFL SPEAKING INTERVIEW TASK:
- Students answer 4 questions on one topic with 45 seconds per response
- NO preparation time - simulates real conversation
- Questions progressively get harder

## NEW 0-6 SCORING SCALE WITH CEFR ALIGNMENT:
- **6.0** (C1+): Near-native fluency, sophisticated vocabulary, flawless organization
- **5.5** (C1): Excellent command, natural fluency, minor issues only
- **5.0** (B2+): Strong performance, good vocabulary, clear organization, few errors
- **4.5** (B2+): Above average, some minor weaknesses, generally effective
- **4.0** (B2): Competent, noticeable weaknesses but communicates effectively
- **3.5** (B2-): Adequate, some weaknesses, acceptable communication
- **3.0** (B1+): Fair, frequent issues, limited vocabulary/organization
- **2.5** (B1+): Below average, multiple problems, barely acceptable
- **2.0** (B1): Limited ability, significant problems throughout
- **1.5** (B1-): Weak, major problems in all areas
- **1.0** (A2): Very limited, mostly unintelligible or irrelevant
- **0.5** (A2-): Extremely limited, barely any meaningful content
- **0** (A1): No meaningful response

## DETAILED SCORING CRITERIA:

### 1. ${labels.languageUse} (0-6):
- **6**: Rich, sophisticated vocabulary; complex grammar with minimal errors; natural expressions
- **5**: Good vocabulary variety; mostly accurate grammar; occasional minor errors
- **4**: Adequate vocabulary; some grammar errors but meaning clear; acceptable variety
- **3**: Limited vocabulary; noticeable errors; basic structures only
- **2**: Very limited vocabulary; frequent errors blocking communication
- **1**: Severely limited; major errors throughout
- **0**: No meaningful language use

### 2. ${labels.logic} (0-6) - Content and Organization:
- **6**: Fully addresses question; excellent main idea with multiple supporting details/examples
- **5**: Well-organized; clear main idea; good supporting details
- **4**: Addresses main points; adequate organization; some supporting details
- **3**: Addresses question partially; limited organization; few details
- **2**: Vague response; weak organization; almost no supporting details
- **1**: Barely addresses question; no clear organization
- **0**: No relevant content

### 3. ${labels.delivery} (0-6):
- **6**: Natural pace; clear pronunciation; smooth flow; confident delivery
- **5**: Good pace; clear pronunciation; minor hesitations
- **4**: Generally understandable; some hesitations; acceptable pronunciation
- **3**: Understandable but choppy; noticeable hesitations; some pronunciation issues
- **2**: Difficult to understand; frequent pauses; pronunciation problems
- **1**: Very difficult to understand; choppy throughout
- **0**: Mostly unintelligible

## OUTPUT REQUIREMENTS:
1. Total score = AVERAGE of the three criteria scores (rounded to nearest 0.5)
2. Each criterion MUST have a DIFFERENT score reflecting actual performance
3. Provide 5 essential expressions that SHOULD have been used
4. Provide THREE model answers at different proficiency levels (all in English):
   - BEGINNER (B1): 45-60 words. Use ONLY simple vocabulary and short basic sentences. Cover the core idea with 1-2 supporting points. No complex grammar.
   - INTERMEDIATE (B2): 70-90 words. Use varied vocabulary, transition words (however, therefore, for example), and clear 3-part structure (intro + support + conclusion).
   - ADVANCED (C1+): 100-120 words. Use sophisticated vocabulary, complex sentence structures, natural academic expressions, and nuanced reasoning.

**IMPORTANT: Provide ALL feedback in ${langName}. Model answers and expressions (English part) must be in English.**

Return JSON:
{
  "totalScore": number (0-6, half-point increments),
  "overallComment": "${langName} summary with CEFR level and specific areas to improve",
  "languageUse": { "score": number (0-6), "comment": "${langName} feedback with specific examples from response" },
  "logic": { "score": number (0-6), "comment": "${langName} feedback on organization and content" },
  "delivery": { "score": number (0-6), "comment": "${langName} feedback on fluency based on text analysis" },
  "tieredModelAnswers": {
    "beginner": "B1 English response 45-60 words, simple vocabulary and basic sentence structures only",
    "intermediate": "B2 English response 70-90 words, varied vocabulary, transitions, clear organization",
    "advanced": "C1+ English response 100-120 words, sophisticated vocabulary, complex structures, natural flow"
  },
  "modelAnswer": "same text as advanced above",
  "essentialExpressions": [
    { "expression": "English expression", "meaning": "${langName} meaning" }
  ]
}`;

  const userPrompt = `Interview Question: ${question}

Student's Answer: ${userAnswer}

## Response Analysis:
- Word count: ${wordCount} (optimal: 80-120)
- Uses transitions: ${hasTransitions ? "Yes" : "No"}
- Includes examples: ${hasExamples ? "Yes" : "No"}
- Quality tier: ${qualityTier}

IMPORTANT SCORING INSTRUCTIONS:
1. Use the FULL 0-6 scale based on actual quality
2. Evaluate each criterion independently - scores may vary based on actual strengths/weaknesses
3. Quote specific examples from the response to justify scores
4. Consider the quality indicators when evaluating`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.65,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const rawFeedback = JSON.parse(content);
    
    // Extract scores - trust AI's numeric scores, only fallback for invalid values
    let languageScore = rawFeedback.languageUse?.score;
    let logicScore = rawFeedback.logic?.score;
    let deliveryScore = rawFeedback.delivery?.score;
    
    // Only apply fallback if AI returned invalid (non-numeric) scores
    if (typeof languageScore !== 'number' || isNaN(languageScore)) {
      console.warn('New TOEFL speaking: Invalid languageUse score from AI, using default');
      languageScore = 3.5;
    }
    if (typeof logicScore !== 'number' || isNaN(logicScore)) {
      console.warn('New TOEFL speaking: Invalid logic score from AI, using default');
      logicScore = 3.5;
    }
    if (typeof deliveryScore !== 'number' || isNaN(deliveryScore)) {
      console.warn('New TOEFL speaking: Invalid delivery score from AI, using default');
      deliveryScore = 3.5;
    }
    
    // Clamp to valid rubric range (0-6) and round to nearest 0.5
    languageScore = Math.round(Math.max(0, Math.min(6, languageScore)) * 2) / 2;
    logicScore = Math.round(Math.max(0, Math.min(6, logicScore)) * 2) / 2;
    deliveryScore = Math.round(Math.max(0, Math.min(6, deliveryScore)) * 2) / 2;
    
    // Calculate total score as average
    const totalScore = Math.round(((languageScore + logicScore + deliveryScore) / 3) * 2) / 2;
    
    const tiered = rawFeedback.tieredModelAnswers;
    const advancedAnswer = tiered?.advanced || rawFeedback.modelAnswer || "모범 답안을 생성할 수 없습니다.";

    const feedback: NewToeflSpeakingInterviewFeedback = {
      totalScore,
      overallComment: rawFeedback.overallComment || "종합 평가를 생성할 수 없습니다.",
      languageUse: {
        score: languageScore,
        comment: rawFeedback.languageUse?.comment || "언어 사용 피드백을 생성할 수 없습니다."
      },
      logic: {
        score: logicScore,
        comment: rawFeedback.logic?.comment || "논리 전개 피드백을 생성할 수 없습니다."
      },
      delivery: {
        score: deliveryScore,
        comment: rawFeedback.delivery?.comment || "발화 피드백을 생성할 수 없습니다."
      },
      modelAnswer: advancedAnswer,
      tieredModelAnswers: tiered ? {
        beginner: tiered.beginner || advancedAnswer,
        intermediate: tiered.intermediate || advancedAnswer,
        advanced: advancedAnswer
      } : undefined,
      essentialExpressions: rawFeedback.essentialExpressions || []
    };
    
    return feedback;
  } catch (error) {
    console.error("Error generating 2026 TOEFL speaking interview feedback:", error);
    throw error;
  }
}

function getETSScoreBand(score: number): string {
  if (score >= 5) return 'Fully Successful';
  if (score >= 4) return 'Generally Successful';
  if (score >= 3) return 'Partially Successful';
  if (score >= 2) return 'Limited Success';
  if (score >= 1) return 'Unsuccessful';
  return 'No Response';
}

// 2026 TOEFL Writing Email Feedback (0-6 scale with 30-point conversion)
export async function generateNewToeflWritingEmailFeedback(
  scenario: string,
  recipient: string,
  keyPoints: string[],
  userSubject: string,
  userBody: string,
  language: SupportedLanguage = 'ko'
): Promise<NewToeflWritingFeedback> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are an official ETS TOEFL Writing evaluator for the NEW 2026 TOEFL format. Evaluate Email writing responses using the official ETS 1-6 scoring rubric.

## 2026 TOEFL WRITE AN EMAIL TASK:
- Students write a functional email for a specific scenario (7 minutes)
- Tests tone, appropriateness, clarity, and organization
- Must address all key points in the prompt

## OFFICIAL ETS TOEFL WRITING SCORING RUBRIC (1-6 scale, half-point increments):
- 6 (Fully Successful): Perfect tone and format, addresses all points comprehensively, natural expressions, virtually no errors
- 5 (Fully Successful): Strong response with excellent language control, minor issues only
- 4 (Generally Successful): Good email with adequate language, addresses most points, minor weaknesses in tone or coverage
- 3 (Partially Successful): Adequate email but with noticeable gaps, some key points missed, limited vocabulary range
- 2 (Limited Success): Limited development, inadequate organization, insufficient explanations, frequent errors
- 1 (Unsuccessful): Seriously flawed, little detail, severely limited language, mostly borrowed from prompt

## SCORING CRITERIA (Each 1-6):

### 1. ${labels.languageUse} (1-6):
- 5-6: Appropriate email vocabulary, correct grammar, proper formal/informal register
- 3-4: Adequate vocabulary, some grammar errors, mostly appropriate register
- 1-2: Limited vocabulary, frequent errors, inappropriate register

### 2. ${labels.logic} (1-6):
- 5-6: All key points addressed, logical flow, clear purpose and request
- 3-4: Most key points covered, acceptable organization
- 1-2: Missing key points, poor organization

### 3. ${labels.contextFlow} (1-6):
- 5-6: Natural email flow, appropriate opening/closing, smooth transitions
- 3-4: Generally good flow, acceptable structure
- 1-2: Choppy or awkward flow, weak structure

## OUTPUT REQUIREMENTS:
1. Total score = AVERAGE of the three criteria scores (rounded to nearest 0.5, minimum 1)
2. Provide SENTENCE-BY-SENTENCE feedback analyzing each sentence for errors
3. Provide 5 PHRASE-LEVEL essential expressions (idioms, collocations, transitional phrases) - NOT full sentences
4. Provide THREE model emails at different proficiency levels (all in English, all including Subject line):
   - BEGINNER (B1): 80-100 words. Simple vocabulary, short sentences, covers all key points but minimal elaboration.
   - INTERMEDIATE (B2): 120-140 words. Varied vocabulary, appropriate transitions, clear tone, well-organized.
   - ADVANCED (C1+): 150-180 words. Sophisticated expressions, nuanced tone, professional register, comprehensive coverage.

**IMPORTANT: Provide ALL feedback in ${langName}. Only model answers and essential expressions should be in English.**

Return JSON:
{
  "totalScore": number (1-6),
  "overallComment": "2-3 sentences in ${langName}",
  "languageUse": { "score": number (1-6), "comment": "${langName} feedback" },
  "logic": { "score": number (1-6), "comment": "${langName} feedback" },
  "contextFlow": { "score": number (1-6), "comment": "${langName} feedback on email structure and flow" },
  "sentenceFeedback": [
    { 
      "sentence": "original sentence from student", 
      "correctedSentence": "corrected version (or same if correct)", 
      "feedback": "${langName} explanation of issues/praise",
      "issueType": "grammar|vocabulary|style|tone|structure|correct"
    },
    ... (one for each sentence in the student's writing)
  ],
  "tieredModelAnswers": {
    "beginner": "Subject: ...\n\nB1 email 80-100 words, simple vocabulary and sentence structures, covers all key points",
    "intermediate": "Subject: ...\n\nB2 email 120-140 words, varied vocabulary, transitions, appropriate tone",
    "advanced": "Subject: ...\n\nC1+ email 150-180 words, sophisticated vocabulary, professional register, comprehensive"
  },
  "modelAnswer": "same text as advanced above",
  "essentialExpressions": [
    { 
      "expression": "phrase-level expression in English (e.g., 'I would appreciate it if...')", 
      "meaning": "${langName} meaning",
      "usage": "Example sentence using this expression in English",
      "category": "formal|transition|request|apology|gratitude|closing"
    },
    ... (5 total, MUST be phrase-level, NOT full sentences)
  ]
}`;

  const userPrompt = `Email Scenario: ${scenario}
Recipient: ${recipient}
Key Points to Address: ${keyPoints.join(', ')}

Student's Email:
Subject: ${userSubject}

${userBody}

Please evaluate this 2026 TOEFL Email writing response using the official ETS 1-6 scoring rubric.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    }, { timeout: 60000 });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const raw = JSON.parse(content);
    const tiered = raw.tieredModelAnswers;
    const advancedAnswer = tiered?.advanced || raw.modelAnswer || "";
    const feedback: NewToeflWritingFeedback = {
      ...raw,
      modelAnswer: advancedAnswer,
      tieredModelAnswers: tiered ? {
        beginner: tiered.beginner || advancedAnswer,
        intermediate: tiered.intermediate || advancedAnswer,
        advanced: advancedAnswer
      } : undefined,
      scaledScore: Math.round((raw.totalScore || 1) * 5),
      scoreBand: getETSScoreBand(raw.totalScore || 1)
    };
    return feedback;
  } catch (error: any) {
    if (error?.code === 'ETIMEDOUT' || error?.name === 'APIConnectionTimeoutError' || error?.message?.includes('timeout') || error?.message?.includes('abort') || error?.message?.includes('timed out')) {
      console.error("OpenAI API timeout for writing email feedback");
      throw new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
    }
    console.error("Error generating 2026 TOEFL writing email feedback:", error);
    throw error;
  }
}

// 2026 TOEFL Writing Academic Discussion Feedback (0-6 scale with 30-point conversion)
export async function generateNewToeflWritingDiscussionFeedback(
  topic: string,
  professorPrompt: string,
  otherPosts: { author: string; content: string }[],
  userResponse: string,
  language: SupportedLanguage = 'ko'
): Promise<NewToeflWritingFeedback> {
  const langName = languageNames[language];
  const labels = languageLabels[language];
  
  const systemPrompt = `You are an official ETS TOEFL Writing evaluator for the 2026 TOEFL format. Evaluate Academic Discussion responses using the official ETS 1-6 scoring rubric.

## 2026 TOEFL ACADEMIC DISCUSSION TASK:
- Students post on a class discussion board (10 minutes)
- Must respond to the professor's question AND engage with classmates' posts
- Needs clear opinion with supporting reasons

## OFFICIAL ETS TOEFL WRITING SCORING RUBRIC (1-6 scale, half-point increments):
- 6 (Fully Successful): Sophisticated response, engages meaningfully with topic and others' posts, virtually no errors
- 5 (Fully Successful): Strong response with excellent language control, good engagement, minor issues only
- 4 (Generally Successful): Competent response, addresses topic, adequate language, some minor weaknesses
- 3 (Partially Successful): Adequate but limited engagement or development, some noticeable errors
- 2 (Limited Success): Limited development, inadequate organization, frequent errors
- 1 (Unsuccessful): Seriously flawed, little detail, severely limited language

## SCORING CRITERIA (Each 1-6):

### 1. ${labels.languageUse} (1-6):
- 5-6: Academic vocabulary, complex sentences, minimal errors
- 3-4: Adequate academic language, some errors
- 1-2: Basic vocabulary, frequent errors

### 2. ${labels.logic} (1-6):
- 5-6: Clear position, strong arguments, specific examples
- 3-4: Clear position, adequate support
- 1-2: Vague position, weak support

### 3. ${labels.contextFlow} (1-6):
- 5-6: Responds to topic and classmates, coherent development
- 3-4: Addresses topic, some engagement with discussion
- 1-2: Limited connection to discussion context

## OUTPUT REQUIREMENTS:
1. Total score = AVERAGE of the three criteria scores (rounded to nearest 0.5, minimum 1)
2. Provide SENTENCE-BY-SENTENCE feedback analyzing each sentence for errors
3. Provide 5 PHRASE-LEVEL essential expressions (idioms, collocations, transitional phrases) - NOT full sentences
4. Provide THREE model discussion posts at different proficiency levels (all in English):
   - BEGINNER (B1): 80-100 words. Simple vocabulary, basic sentences, clear opinion with 1-2 reasons. May minimally reference classmates.
   - INTERMEDIATE (B2): 120-140 words. Varied vocabulary, transitions, clear position, engages meaningfully with classmates' posts.
   - ADVANCED (C1+): 150-180 words. Sophisticated vocabulary, complex sentences, nuanced argument, strong engagement with discussion context.

**IMPORTANT: Provide ALL feedback in ${langName}. Only model answers and expressions in English.**

Return JSON:
{
  "totalScore": number (1-6),
  "overallComment": "2-3 sentences in ${langName}",
  "languageUse": { "score": number (1-6), "comment": "${langName} feedback" },
  "logic": { "score": number (1-6), "comment": "${langName} feedback" },
  "contextFlow": { "score": number (1-6), "comment": "${langName} feedback" },
  "sentenceFeedback": [
    { 
      "sentence": "original sentence from student", 
      "correctedSentence": "corrected version (or same if correct)", 
      "feedback": "${langName} explanation of issues/praise",
      "issueType": "grammar|vocabulary|style|logic|structure|correct"
    },
    ... (one for each sentence in the student's writing)
  ],
  "tieredModelAnswers": {
    "beginner": "B1 discussion post 80-100 words, simple vocabulary, clear opinion with basic support",
    "intermediate": "B2 discussion post 120-140 words, varied vocabulary, transitions, engages with classmates",
    "advanced": "C1+ discussion post 150-180 words, sophisticated vocabulary, complex argument, strong engagement"
  },
  "modelAnswer": "same text as advanced above",
  "essentialExpressions": [
    { 
      "expression": "phrase-level expression in English (e.g., 'In my opinion...', 'To put it differently...')", 
      "meaning": "${langName} meaning",
      "usage": "Example sentence using this expression in English",
      "category": "opinion|transition|agreement|disagreement|example|conclusion"
    },
    ... (5 total, MUST be phrase-level, NOT full sentences)
  ]
}`;

  const otherPostsText = otherPosts.map(p => `${p.author}: ${p.content}`).join('\n\n');
  
  const userPrompt = `Discussion Topic: ${topic}
Professor's Prompt: ${professorPrompt}

Other Students' Posts:
${otherPostsText}

Student's Response: ${userResponse}

Please evaluate this 2026 TOEFL Academic Discussion response using the official ETS 1-6 scoring rubric.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    }, { timeout: 60000 });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const raw = JSON.parse(content);
    const tiered = raw.tieredModelAnswers;
    const advancedAnswer = tiered?.advanced || raw.modelAnswer || "";
    const feedback: NewToeflWritingFeedback = {
      ...raw,
      modelAnswer: advancedAnswer,
      tieredModelAnswers: tiered ? {
        beginner: tiered.beginner || advancedAnswer,
        intermediate: tiered.intermediate || advancedAnswer,
        advanced: advancedAnswer
      } : undefined,
      scaledScore: Math.round((raw.totalScore || 1) * 5),
      scoreBand: getETSScoreBand(raw.totalScore || 1)
    };
    return feedback;
  } catch (error: any) {
    if (error?.code === 'ETIMEDOUT' || error?.name === 'APIConnectionTimeoutError' || error?.message?.includes('timeout') || error?.message?.includes('abort') || error?.message?.includes('timed out')) {
      console.error("OpenAI API timeout for writing discussion feedback");
      throw new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
    }
    console.error("Error generating 2026 TOEFL writing discussion feedback:", error);
    throw error;
  }
}

// ===== 2026 TOEFL Listen & Repeat Feedback =====
export async function generateNewToeflListenRepeatFeedback(
  originalSentence: string,
  userSpeech: string,
  language: SupportedLanguage = 'ko'
): Promise<NewToeflListenRepeatFeedback> {
  const langName = languageNames[language];
  
  const systemPrompt = `You are a professional English pronunciation and speaking coach for TOEFL test preparation.
Your task is to compare what the student said versus the original sentence and provide detailed pronunciation feedback.

## Scoring Criteria (0-6 scale):
### Pronunciation (0-6):
- 5-6: Native-like pronunciation, clear articulation
- 3-4: Understandable with minor pronunciation issues
- 1-2: Frequent mispronunciations affecting clarity
- 0: Unintelligible

### Intonation (0-6):
- 5-6: Natural rhythm, stress patterns, and intonation
- 3-4: Acceptable rhythm with some unnatural patterns
- 1-2: Monotone or unnatural stress patterns
- 0: No discernible English intonation

### Fluency (0-6):
- 5-6: Smooth, natural pace without hesitation
- 3-4: Generally smooth with occasional pauses
- 1-2: Frequent pauses, choppy delivery
- 0: Extremely fragmented

**IMPORTANT: Provide ALL feedback in ${langName}. Only show corrections in English.**

Return JSON:
{
  "accuracyScore": number (0-100 percentage match),
  "overallComment": "1-2 sentences feedback in ${langName}",
  "pronunciation": { "score": number (0-6), "comment": "${langName} feedback" },
  "intonation": { "score": number (0-6), "comment": "${langName} feedback" },
  "fluency": { "score": number (0-6), "comment": "${langName} feedback" },
  "corrections": [
    { "original": "correct word/phrase", "userSaid": "what user said", "tip": "${langName} tip" }
  ]
}`;

  const userPrompt = `Original Sentence: "${originalSentence}"
User's Speech: "${userSpeech}"

Please analyze the pronunciation accuracy and provide feedback.`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as NewToeflListenRepeatFeedback;
    return feedback;
  } catch (error) {
    console.error("Error generating Listen & Repeat feedback:", error);
    throw error;
  }
}

// ===== 2026 TOEFL Build a Sentence Feedback =====
export async function generateNewToeflBuildSentenceFeedback(
  correctSentence: string,
  userSentence: string,
  context: string,
  language: SupportedLanguage = 'ko',
  correctBlanks?: string,
  userBlanks?: string
): Promise<NewToeflBuildSentenceFeedback> {
  const langName = languageNames[language];
  
  // Determine correctness by comparing only the blank portions (word ordering)
  // Normalize: lowercase, trim, remove extra spaces
  const normalizeBlankText = (text: string) => 
    text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?;:]/g, '');
  
  // If blanks are provided, compare only blanks; otherwise compare full sentences
  const correctBlankNormalized = correctBlanks 
    ? normalizeBlankText(correctBlanks) 
    : normalizeBlankText(correctSentence);
  const userBlankNormalized = userBlanks 
    ? normalizeBlankText(userBlanks) 
    : normalizeBlankText(userSentence);
  
  const isCorrect = correctBlankNormalized === userBlankNormalized;
  
  const systemPrompt = `You are an expert English grammar teacher analyzing a TOEFL Build a Sentence exercise.

=== YOUR TASK ===
1. FIRST, analyze the words and determine the grammatically correct sentence
2. THEN, compare with what the student wrote to explain why it's right or wrong
3. ALWAYS show the correct answer clearly in your response

=== IMPORTANT ===
- The correctness has been pre-determined: isCorrect = ${isCorrect}
- You MUST provide the correct word order in "correctAnswer" field
- If the student was WRONG, your explanation MUST clearly state the correct answer
- ALL explanations must be in ${langName}. Only English sentences stay in English.

=== GRAMMAR ANALYSIS STEPS ===
1. Identify if this is a QUESTION (auxiliary before subject) or STATEMENT (subject-verb-object)
2. For questions: "Does she have...?" NOT "She does have...?"
3. For statements: "She does have..." is correct with emphasis
4. Explain WHY the correct word order follows English grammar rules

=== JSON RESPONSE FORMAT ===
{
  "isCorrect": ${isCorrect},
  "correctSentence": "The grammatically correct full sentence with proper punctuation",
  "userSentence": "What the student actually constructed",
  "correctAnswer": "Correct word order for the blanks, comma-separated (e.g., 'Is, the, section, for, class, still, open')",
  "explanation": "${isCorrect ? '학생의 답변이 맞습니다.' : '❌ 오답입니다. 정답: [correct word order]'} + ${langName} grammar explanation",
  "grammarPoints": [
    { "point": "Grammar rule name in ${langName}", "explanation": "Why this applies to the sentence" }
  ]
}

CRITICAL: The "correctAnswer" field MUST contain the correct word ordering, NOT what the student wrote.`;

  const userPrompt = `=== BUILD A SENTENCE ANALYSIS ===

Context: ${context}

CORRECT ANSWER (what student should have written):
- Correct blanks: "${correctBlanks || correctSentence}"
- Full correct sentence: "${correctSentence}"

STUDENT'S ANSWER:
- Student's blanks: "${userBlanks || userSentence}"
- Full user sentence: "${userSentence}"

RESULT: ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}

${!isCorrect ? `IMPORTANT: The student's answer "${userBlanks || userSentence}" is WRONG.
The CORRECT answer is: "${correctBlanks || correctSentence}"
Make sure to clearly state this correct answer in your explanation and in the correctAnswer field!` : ''}

Analyze the grammar and explain why the correct word order is "${correctBlanks || correctSentence}".`;

  try {
    const response = await openai.chat.completions.create({
      model: getOpenAIModel("standard"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    }, { timeout: 60000 });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const feedback = JSON.parse(content) as NewToeflBuildSentenceFeedback;
    feedback.isCorrect = isCorrect;
    
    const knownCorrectAnswer = correctBlanks || correctSentence;
    if (!feedback.correctAnswer || feedback.correctAnswer.trim() === '') {
      feedback.correctAnswer = knownCorrectAnswer;
    }
    
    if (!isCorrect && feedback.correctAnswer.toLowerCase().trim() === (userBlanks || userSentence).toLowerCase().trim()) {
      feedback.correctAnswer = knownCorrectAnswer;
    }
    
    if (!isCorrect && !feedback.explanation.includes(knownCorrectAnswer)) {
      feedback.explanation = `❌ 오답입니다. 정답: "${knownCorrectAnswer}"\n\n${feedback.explanation}`;
    }
    
    return feedback;
  } catch (error: any) {
    if (error?.code === 'ETIMEDOUT' || error?.message?.includes('timeout') || error?.message?.includes('abort')) {
      console.error("OpenAI API timeout for build-sentence feedback");
      throw new Error("AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
    }
    console.error("Error generating Build a Sentence feedback:", error);
    throw error;
  }
}

export interface ComputeCorrectOrderResult {
  correctOrder: number[];
  correctSentence: string;
  contextSentence: string;
  hasGrammarIssues?: boolean;
}

// Detect if a word set forms a question based on template and word analysis
function detectIfQuestion(words: string[], sentenceTemplate?: string): boolean {
  // 1. Check template punctuation
  if (sentenceTemplate?.trim().endsWith('?')) return true;
  if (sentenceTemplate?.trim().endsWith('.')) return false;
  
  // 2. Check if first word is a question word or auxiliary verb
  const firstWord = words[0]?.toLowerCase().trim();
  const questionStarters = [
    'do', 'does', 'did', 'is', 'are', 'was', 'were', 
    'can', 'could', 'will', 'would', 'should', 'shall', 'may', 'might',
    'what', 'where', 'when', 'who', 'whom', 'whose', 'which', 'why', 'how'
  ];
  
  if (questionStarters.includes(firstWord)) return true;
  
  // 3. Check if any word in the set is a WH-word (common for embedded questions)
  const whWords = ['what', 'where', 'when', 'who', 'whom', 'whose', 'which', 'why', 'how'];
  const hasWhWord = words.some(w => whWords.includes(w.toLowerCase().trim()));
  const hasAuxiliary = words.some(w => 
    ['do', 'does', 'did', 'is', 'are', 'was', 'were', 'can', 'could', 'will', 'would'].includes(w.toLowerCase().trim())
  );
  
  // If it has both WH-word and auxiliary, likely a question
  if (hasWhWord && hasAuxiliary) return true;
  
  // Default to statement if we can't determine
  return false;
}

export async function computeCorrectOrderFromWords(
  words: string[],
  existingContext?: string,
  sentenceTemplate?: string
): Promise<ComputeCorrectOrderResult> {
  // === EARLY VALIDATION: Template blank count MUST match word count ===
  // This is a fundamental invariant that cannot be resolved by retry
  if (sentenceTemplate) {
    const templateBlankCount = (sentenceTemplate.match(/_{3,}/g) || []).length;
    if (templateBlankCount !== words.length) {
      throw new Error(`Template/word count mismatch: template has ${templateBlankCount} blanks but ${words.length} words provided. This is a data error that cannot be resolved.`);
    }
  }
  
  // Detect if this is a question using multiple signals
  const isQuestion = detectIfQuestion(words, sentenceTemplate);
  
  const systemPrompt = `You are an expert English grammar teacher specializing in sentence construction. Your task is to determine the GRAMMATICALLY CORRECT order of words to form a proper English sentence.

=== CRITICAL ENGLISH GRAMMAR RULES ===

${isQuestion ? `**THIS IS A QUESTION - APPLY QUESTION GRAMMAR RULES:**

1. YES/NO QUESTIONS (auxiliary + subject + main verb):
   - "Does she have..." NOT "She does have..."
   - "Will you come..." NOT "You will come..."
   - "Can I help..." NOT "I can help..."
   - "Is he going..." NOT "He is going..."

2. WH-QUESTIONS (question word + auxiliary + subject + verb):
   - "What techniques will you learn?" NOT "What techniques you will learn?"
   - "Where does he work?" NOT "Where he does work?"
   - "How can I help?" NOT "How I can help?"
   - Exception: When WH-word is the subject: "Who called?" "What happened?"

3. QUESTION WORD ORDER:
   - Auxiliary verbs (do/does/did/will/can/could/would/should/is/are/was/were) come BEFORE the subject
   - Pattern: [Aux] + [Subject] + [Main Verb] + [Rest]
   - "Does she have a color scheme?" ✓
   - "She does have a color scheme?" ✗ (This is emphatic statement, not question)

` : `**THIS IS A STATEMENT - APPLY STATEMENT GRAMMAR RULES:**

1. BASIC WORD ORDER: Subject + Verb + Object/Complement
   - "The cat sat on the mat." ✓
   
2. ADVERBS:
   - Frequency adverbs (always, never, often) go before main verb: "She always arrives early."
   - Manner adverbs often go after verb: "She spoke quietly."
   - Time adverbs often go at end: "I saw him yesterday."

3. REPORTED SPEECH/INDIRECT QUESTIONS (no inversion):
   - "He wanted to know if I would be submitting early." ✓
   - "I wonder what you think." ✓

`}
=== RULES ===
1. Use ALL provided words exactly once - no additions, no omissions
2. Words may be phrases (keep together as single units)
3. The sentence must be grammatically correct standard English
4. Pay attention to the template's punctuation (? for questions)

=== MANDATORY SELF-VALIDATION PROCESS ===
BEFORE returning your answer, you MUST:

STEP 1: Determine initial word order
STEP 2: Reconstruct the full sentence by inserting words into template blanks
STEP 3: Grammar self-check using this checklist:
   [ ] Questions ending with "?" must start with auxiliary verb (do/does/did/will/can/is/are/was/were) or WH-word
   [ ] "Do you know if/how/what..." patterns: "Do" comes FIRST, then "you", then "know", then question word
   [ ] Subject-verb agreement (singular/plural match)
   [ ] Relative clauses (who/which/that) have proper verb after them, not immediately followed by were/was
   [ ] Sentence matches template fixed parts (start and end)
   [ ] All words used exactly once in correct positions

STEP 4: If ANY grammar check fails, REVISE the order and repeat Steps 2-3
STEP 5: Only return answer when ALL checks pass

=== RESPONSE FORMAT (JSON) ===
{
  "correctOrder": [indices array],
  "correctSentence": "Complete sentence with correct grammar",
  "reconstructedFromTemplate": "Sentence reconstructed by inserting words into template blanks",
  "grammarChecks": {
    "questionStartsCorrectly": true/false or null if not a question,
    "subjectVerbAgreement": true/false,
    "relativeClauseCorrect": true/false or null if no relative clause,
    "matchesTemplateFixedParts": true/false,
    "allWordsUsedOnce": true/false
  },
  "selfValidationPassed": true,
  "contextSentence": "A context sentence",
  "grammarReason": "Brief explanation of the grammar rule applied"
}

CRITICAL: "selfValidationPassed" must be TRUE. If any grammar check fails, revise your answer until all pass.

=== EXAMPLES ===

Example 1 (Question - auxiliary inversion required):
Template: "_____ _____ _____ _____ _____ _____ ?"
Words: [0]="does", [1]="she", [2]="have", [3]="a", [4]="color", [5]="scheme"
WRONG: [1,0,2,3,4,5] → "she does have a color scheme?" (emphatic, not question form)
CORRECT: [0,1,2,3,4,5] → "Does she have a color scheme?" (proper question)
correctOrder: [0, 1, 2, 3, 4, 5]

Example 2 (WH-Question):
Template: "_____ _____ _____ _____ _____ ?"
Words: [0]="what", [1]="techniques", [2]="will", [3]="you", [4]="learn"
CORRECT: [0,1,2,3,4] → "What techniques will you learn?" ✓
correctOrder: [0, 1, 2, 3, 4]

Example 3 (Statement with reported speech):
Template: "He _____ _____ _____ _____ _____ _____ _____ ."
Words: [0]="wanted", [1]="to know", [2]="if", [3]="I", [4]="would be", [5]="submitting", [6]="early"
CORRECT: [0,1,2,3,4,5,6] → "He wanted to know if I would be submitting early." ✓
correctOrder: [0, 1, 2, 3, 4, 5, 6]

Example 4 (Statement with adverb):
Template: "She _____ _____ _____ to the store."
Words: [0]="quickly", [1]="yesterday", [2]="walked"
CORRECT: [2,0,1] → "She walked quickly yesterday to the store." ✓
correctOrder: [2, 0, 1]

Example 5 (Template with fixed start/end - MOST IMPORTANT):
Template: "The _____ _____ _____ _____ _____ _____ inspiring."
Words: [0]="quite", [1]="who", [2]="were", [3]="graduate students", [4]="their findings", [5]="presented"
ANALYSIS: 
- Template starts with "The" and ends with "inspiring."
- Need a relative clause: "[subject] who [verb] [object] were quite"
- Subject "graduate students" comes first after "The"
- "who presented their findings" is the relative clause
- "were quite" connects to "inspiring"
CORRECT: [3,1,5,4,2,0] → "The graduate students who presented their findings were quite inspiring." ✓
correctOrder: [3, 1, 5, 4, 2, 0]

Example 6 (INDIRECT QUESTION - "Do you know if..." pattern - CRITICAL):
Template: "_____ _____ _____ _____ he will be _____ _____ _____ ?"
Words: [0]="know", [1]="if", [2]="you", [3]="do", [4]="possibly", [5]="dropping", [6]="statistics classes"
ANALYSIS:
- This is a question (ends with ?)
- "know if" needs "do you" BEFORE it: "Do you know if..."
- After "if", the embedded clause follows normal order
- "he will be" is fixed in template
WRONG: [0,1,2,3,4,5,6] → "know if you do he will be possibly dropping..." (doesn't start with auxiliary)
CORRECT: [3,2,0,1,4,5,6] → "Do you know if he will be possibly dropping statistics classes?" ✓
correctOrder: [3, 2, 0, 1, 4, 5, 6]

Example 7 (Question with "how much"):
Template: "_____ _____ _____ _____ _____ _____ _____ ?"
Words: [0]="know", [1]="how", [2]="you", [3]="do", [4]="schedules", [5]="much", [6]="cost"
ANALYSIS:
- Question with "how much" - needs "do you know" at start
- "how much do [noun] cost" is the embedded question
CORRECT: [3,2,0,1,5,4,6] → "Do you know how much schedules cost?" ✓
correctOrder: [3, 2, 0, 1, 5, 4, 6]`;

  // Extract fixed parts from template (words before first blank and after last blank)
  let templateStart = '';
  let templateEnd = '';
  if (sentenceTemplate) {
    const templateParts = sentenceTemplate.split(/_{3,}/);
    if (templateParts.length >= 2) {
      templateStart = templateParts[0].trim();
      templateEnd = templateParts[templateParts.length - 1].trim();
    }
  }

  const templateInfo = sentenceTemplate 
    ? `
=== SENTENCE TEMPLATE (CRITICAL - USE THIS!) ===
Template: "${sentenceTemplate}"
${templateStart ? `• The sentence STARTS with: "${templateStart}"` : ''}
${templateEnd ? `• The sentence ENDS with: "${templateEnd}"` : ''}
• Each _____ represents one word from the word list
• The blanks must be filled in order to create a grammatically correct sentence
• YOUR TASK: Arrange the ${words.length} words to fill the ${words.length} blanks in grammatically correct order`
    : '';

  const userPrompt = `TASK: Arrange these ${words.length} words to fill the blanks in the template and form a grammatically correct English sentence.

=== WORDS TO ARRANGE (with indices) ===
${words.map((w, i) => `[${i}] "${w}"`).join('\n')}
${templateInfo}
${existingContext ? `\nContext/Question: "${existingContext}"` : ''}

=== SOLVING STRATEGY ===
1. Look at the template's fixed parts (start: "${templateStart}", end: "${templateEnd}")
2. Identify the SUBJECT (who/what the sentence is about)
3. Identify the VERB (action or state)
4. Check for relative pronouns (who, which, that) - these introduce subordinate clauses
5. Check for linking words (and, but, because, were, is, are)
6. Build the sentence:
   - Start: "${templateStart}" + [your arranged words] + "${templateEnd}"
   - The result must be grammatically correct and natural

${isQuestion ? `⚠️ THIS IS A QUESTION (ends with "?")
Apply QUESTION grammar rules:
- Auxiliary verbs (do/does/will/can/is/are) come BEFORE the subject
- "Does she have...?" NOT "She does have...?"` : ''}

=== COMMON PATTERNS ===
• "[Subject] who [verb] [object]" - relative clause describing the subject
• "[Adjective] [noun]" - adjectives come before nouns
• "were/was quite [adjective]" - linking verb + adverb + adjective

Return a JSON with:
- correctOrder: array of exactly ${words.length} indices representing the correct word order
- correctSentence: the COMPLETE sentence including template's fixed parts ("${templateStart}...${templateEnd}")
- contextSentence: a brief context
- grammarReason: explain why this order is grammatically correct`;

  const maxRetries = 2;
  let lastError = '';
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add correction feedback if this is a retry
      const retryFeedback = attempt > 0 && lastError 
        ? `\n\n⚠️ PREVIOUS ANSWER WAS WRONG: ${lastError}\nPlease reconsider and provide a grammatically correct answer.`
        : '';
      
      const response = await openai.chat.completions.create({
        model: getOpenAIModel("premium"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + retryFeedback }
        ],
        temperature: attempt === 0 ? 0.0 : 0.2,  // Deterministic on first attempt, slight diversity on retry
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);
      
      // Validate correctOrder format
      if (!Array.isArray(result.correctOrder) || result.correctOrder.length !== words.length) {
        throw new Error(`Invalid correctOrder: expected ${words.length} indices`);
      }
      
      // Verify all indices are valid and unique
      const usedIndices = new Set<number>();
      for (const idx of result.correctOrder) {
        if (typeof idx !== 'number' || idx < 0 || idx >= words.length) {
          throw new Error(`Invalid index in correctOrder: ${idx}`);
        }
        if (usedIndices.has(idx)) {
          throw new Error(`Duplicate index in correctOrder: ${idx}`);
        }
        usedIndices.add(idx);
      }
      
      // Reconstruct the correct sentence from the order
      const computedSentence = result.correctOrder.map((idx: number) => words[idx]).join(' ');
      const computedWords = result.correctOrder.map((idx: number) => words[idx]);
      
      // === VALIDATION WITH RETRY ===
      const validationErrors: string[] = [];
      let hasTemplateViolation = false;
      let hasGrammarViolation = false;
      
      // VALIDATION 0: AI self-validation (ADVISORY - server validation is authoritative)
      // Log AI's self-validation for debugging
      console.log(`[BuildSentence] AI self-validation: passed=${result.selfValidationPassed}, checks=${JSON.stringify(result.grammarChecks || {})}`);
      
      // Check AI self-validation if provided (advisory signal, not blocking)
      // Server-side validations (1-4 below) are the authoritative source of truth
      if (result.grammarChecks && typeof result.grammarChecks === 'object') {
        const checks = result.grammarChecks;
        // Explicit false from AI means it detected an issue - log and flag for attention
        if (checks.questionStartsCorrectly === false) {
          console.warn(`[BuildSentence] AI detected: question does not start correctly`);
        }
        if (checks.subjectVerbAgreement === false) {
          console.warn(`[BuildSentence] AI detected: subject-verb agreement issue`);
        }
        if (checks.relativeClauseCorrect === false) {
          console.warn(`[BuildSentence] AI detected: relative clause issue`);
        }
        if (checks.matchesTemplateFixedParts === false) {
          console.warn(`[BuildSentence] AI detected: template mismatch`);
        }
        if (checks.allWordsUsedOnce === false) {
          console.warn(`[BuildSentence] AI detected: word usage issue`);
        }
      }
      
      // Use AI's reconstructed sentence if available
      if (result.reconstructedFromTemplate && typeof result.reconstructedFromTemplate === 'string') {
        result.reconstructedSentence = result.reconstructedFromTemplate;
      }
      
      // NOTE: Server-side validations (1-4 below) are the AUTHORITATIVE source of truth
      // AI self-validation is advisory only - we don't fail based on AI's self-report alone
      // This ensures deterministic, reliable validation regardless of AI behavior
      
      // VALIDATION 1: Check relative clause pattern (who/which/that must have subject before)
      const hasRelativePronoun = words.some((w: string) => ['who', 'which', 'that'].includes(w.toLowerCase()));
      if (hasRelativePronoun) {
        const relativePosInResult = computedWords.findIndex((w: string) => ['who', 'which', 'that'].includes(w.toLowerCase()));
        if (relativePosInResult === 0) {
          validationErrors.push(`Relative pronoun "${computedWords[relativePosInResult]}" at position 0 - subject must come before it`);
          hasGrammarViolation = true;
        }
        
        // Check verb after relative pronoun
        if (relativePosInResult > 0 && relativePosInResult < computedWords.length - 1) {
          const nextWord = computedWords[relativePosInResult + 1]?.toLowerCase();
          const commonVerbs = ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'do', 'does', 'did', 
                               'will', 'can', 'could', 'would', 'should', 'presented', 'described', 
                               'explained', 'showed', 'discovered', 'found', 'created', 'made', 'wrote'];
          const hasVerbAfter = commonVerbs.some(v => nextWord?.includes(v));
          if (!hasVerbAfter) {
            console.warn(`Word after relative pronoun "${computedWords[relativePosInResult]}" is "${nextWord}" - may not be a verb`);
          }
        }
      }
      
      // VALIDATION 2: Check were/was usage (should NOT immediately follow who/which/that)
      const hasWere = words.some((w: string) => ['were', 'was'].includes(w.toLowerCase()));
      const hasWho = words.some((w: string) => w.toLowerCase() === 'who');
      if (hasWere && hasWho) {
        const whoIdx = computedWords.findIndex((w: string) => w.toLowerCase() === 'who');
        const wereIdx = computedWords.findIndex((w: string) => ['were', 'was'].includes(w.toLowerCase()));
        
        // Pattern: [subject] + who + [verb] + [object] + were + [rest]
        // "were/was" must have at least 2 words between it and "who"
        if (whoIdx >= 0 && wereIdx >= 0 && wereIdx === whoIdx + 1) {
          validationErrors.push(`"were/was" immediately follows "who" - need verb+object between them`);
          hasGrammarViolation = true;
        }
      }
      
      // VALIDATION 3: "Do you know if/how/what..." pattern check
      // If words contain "know" and "if/how/what" AND "do/does" AND "you/we/they",
      // the sentence should start with "Do/Does [subject] know..."
      const hasKnow = words.some((w: string) => w.toLowerCase() === 'know');
      const hasQuestionWord = words.some((w: string) => ['if', 'how', 'what', 'whether', 'when', 'where', 'why'].includes(w.toLowerCase()));
      const hasDoAux = words.some((w: string) => ['do', 'does', 'did'].includes(w.toLowerCase()));
      const hasSubject = words.some((w: string) => ['you', 'we', 'they', 'i'].includes(w.toLowerCase()));
      
      if (hasKnow && hasQuestionWord && hasDoAux && hasSubject && isQuestion) {
        const auxiliaries = ['do', 'does', 'did', 'can', 'could', 'will', 'would', 'should'];
        const firstWord = computedWords[0]?.toLowerCase();
        
        if (!auxiliaries.includes(firstWord)) {
          validationErrors.push(`"Do you know if/how/what..." question must start with auxiliary verb (do/does/did/can/will), but starts with "${firstWord}"`);
          hasGrammarViolation = true;
        }
      }
      
      // VALIDATION 4: Deterministic template reconstruction check
      // ALWAYS reconstruct when template exists and validate against fixed parts
      if (sentenceTemplate) {
        const templateParts = sentenceTemplate.split(/_{3,}/);
        const blankCount = templateParts.length - 1;
        const tplStart = templateParts[0]?.trim() || '';
        const tplEnd = templateParts[templateParts.length - 1]?.trim() || '';
        
        // Blank count must match word count - CRITICAL
        if (blankCount !== computedWords.length) {
          validationErrors.push(`Template has ${blankCount} blanks but ${computedWords.length} words - mismatch`);
          hasTemplateViolation = true;
        } else {
          // Reconstruct sentence by inserting words into blanks
          let reconstructed = '';
          for (let i = 0; i < templateParts.length; i++) {
            reconstructed += templateParts[i];
            if (i < computedWords.length) {
              reconstructed += computedWords[i];
            }
          }
          reconstructed = reconstructed.replace(/\s+/g, ' ').trim();
          
          // Store reconstructed sentence
          result.reconstructedSentence = reconstructed;
          
          // Validate reconstructed sentence against template fixed parts
          const reconstructedNorm = reconstructed.toLowerCase().replace(/[.?!,]/g, '').replace(/\s+/g, ' ').trim();
          const tplStartNorm = tplStart.toLowerCase().replace(/[.?!,]/g, '').trim();
          const tplEndNorm = tplEnd.toLowerCase().replace(/[.?!,]/g, '').trim();
          
          if (tplStartNorm && !reconstructedNorm.startsWith(tplStartNorm)) {
            validationErrors.push(`Reconstructed sentence doesn't start with template "${tplStart}"`);
            hasTemplateViolation = true;
          }
          if (tplEndNorm && !reconstructedNorm.endsWith(tplEndNorm)) {
            validationErrors.push(`Reconstructed sentence doesn't end with template "${tplEnd}"`);
            hasTemplateViolation = true;
          }
          
          console.log(`📐 Template reconstruction: "${reconstructed}"`);
        }
      }
      
      // If validation failed and we have retries left, retry
      if (validationErrors.length > 0 && attempt < maxRetries) {
        lastError = validationErrors.join('; ');
        console.log(`⚠️ AI Solver attempt ${attempt + 1} validation failed: ${lastError}. Retrying...`);
        continue; // Try again
      }
      
      // HARD FAILURE: Using boolean flags for reliability
      if (hasTemplateViolation || hasGrammarViolation) {
        console.error(`❌ Critical validation failed after ${attempt + 1} attempts [template=${hasTemplateViolation}, grammar=${hasGrammarViolation}]: ${validationErrors.join('; ')}`);
        throw new Error(`Sentence validation failed: ${validationErrors.join('; ')}`);
      }
      
      // Log any remaining non-critical warnings
      if (validationErrors.length > 0) {
        console.warn(`⚠️ Minor warnings (after ${attempt + 1} attempts): ${validationErrors.join('; ')}`);
      }
      
      // Build complete sentence - STRICT template enforcement
      let finalSentence: string;
      
      if (sentenceTemplate) {
        // MANDATORY: When template exists, MUST use deterministic reconstruction
        if (!result.reconstructedSentence) {
          // This should never happen if validation passed, but guard against it
          throw new Error("Template exists but reconstruction failed - this indicates a validation bug");
        }
        finalSentence = result.reconstructedSentence;
        console.log(`📐 Using deterministic reconstruction: "${finalSentence}"`);
      } else if (result.correctSentence) {
        // No template - use AI sentence
        finalSentence = result.correctSentence;
      } else {
        // No template, no AI sentence - use computed words
        finalSentence = computedSentence;
      }
      
      // Basic grammar validation
      const grammarErrors = validateBasicGrammar(computedSentence);
      if (grammarErrors.length > 0) {
        console.warn(`Grammar issues detected: ${grammarErrors.join(', ')}`);
      }
      
      const hasGrammarIssues = grammarErrors.length > 0;
      console.log(`✅ AI Solver result (attempt ${attempt + 1}): ${finalSentence}`);
      console.log(`   Order: [${result.correctOrder.join(', ')}] = "${computedSentence}"`);
      
      return {
        correctOrder: result.correctOrder,
        correctSentence: finalSentence,
        // CRITICAL: ALWAYS use existingContext if provided - NEVER use AI-generated context
        contextSentence: existingContext || "Complete the sentence with the given words.",
        hasGrammarIssues
      };
      
    } catch (attemptError) {
      console.error(`AI Solver attempt ${attempt + 1} failed:`, attemptError);
      if (attempt === maxRetries) {
        throw attemptError;
      }
      // Continue to next attempt
    }
  }
  
  // Should not reach here, but fallback
  throw new Error("AI Solver failed after all retries");
}

function validateBasicGrammar(sentence: string): string[] {
  const errors: string[] = [];
  const words = sentence.toLowerCase().split(/\s+/);
  
  // Check for common ungrammatical patterns
  const patterns = [
    { pattern: /\bdo\s+\w+\s+know\b/i, message: "Possible inverted 'do...know' structure" },
    { pattern: /\bknow\s+you\s+do\b/i, message: "Inverted question structure" },
    { pattern: /\bbegin\s+does\b/i, message: "Incorrect verb placement" },
    { pattern: /\bdoes\s+exactly\b/i, message: "Incorrect adverb placement" },
    { pattern: /\bif\s+you\s+know\s+do\b/i, message: "Ungrammatical conditional" },
    { pattern: /\bcan\s+I\s+need\b/i, message: "Incompatible modal verb structure" }
  ];
  
  for (const { pattern, message } of patterns) {
    if (pattern.test(sentence)) {
      errors.push(message);
    }
  }
  
  // Check for question structure issues
  if (sentence.includes('?')) {
    // Questions should typically start with question words or auxiliary verbs
    const questionStarters = /^(what|where|when|who|why|how|do|does|did|is|are|was|were|can|could|will|would|should)/i;
    if (!questionStarters.test(sentence.trim())) {
      errors.push("Question may not start with proper question word");
    }
  }
  
  return errors;
}
