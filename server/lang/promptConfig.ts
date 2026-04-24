export type SupportedLanguage = 'ko' | 'ja' | 'en' | 'th';

export const languageNames: Record<SupportedLanguage, string> = {
  ko: 'Korean',
  ja: 'Japanese',
  en: 'English',
  th: 'Thai'
};

export const languageNamesNative: Record<SupportedLanguage, string> = {
  ko: '한국어',
  ja: '日本語',
  en: 'English',
  th: 'ภาษาไทย'
};

export interface LanguageLabels {
  languageUse: string;
  logic: string;
  delivery: string;
  contextFlow: string;
  overallComment: string;
  explanation: string;
  userMistakes: string;
  correctAnswer: string;
  noAnswer: string;
  studyTip: string;
  meaning: string;
  example: string;
  exampleTrans: string;
  correctExplanation: string;
  whyThisAnswer: string;
  wrongAnalysis: string;
  passageQuote: string;
  dialogueQuote: string;
}

export const languageLabels: Record<SupportedLanguage, LanguageLabels> = {
  ko: {
    languageUse: '언어 사용',
    logic: '논리',
    delivery: '발음 및 유창성',
    contextFlow: '문맥의 흐름',
    overallComment: '총평',
    explanation: '해설',
    userMistakes: '오류 분석',
    correctAnswer: '정답',
    noAnswer: '선택 안함',
    studyTip: '학습 팁',
    meaning: '한국어 뜻',
    example: '예문 (영어)',
    exampleTrans: '예문 해석 (한국어)',
    correctExplanation: '정답 해설',
    whyThisAnswer: '왜 이 답인가?',
    wrongAnalysis: '오답 분석',
    passageQuote: '지문 인용',
    dialogueQuote: '대화/강의 인용'
  },
  ja: {
    languageUse: '言語使用',
    logic: '論理',
    delivery: '発音と流暢さ',
    contextFlow: '文脈の流れ',
    overallComment: '総評',
    explanation: '解説',
    userMistakes: 'エラー分析',
    correctAnswer: '正解',
    noAnswer: '未選択',
    studyTip: '学習のヒント',
    meaning: '日本語の意味',
    example: '例文（英語）',
    exampleTrans: '例文の翻訳（日本語）',
    correctExplanation: '正解の解説',
    whyThisAnswer: 'なぜこの答えか？',
    wrongAnalysis: '誤答分析',
    passageQuote: '文章からの引用',
    dialogueQuote: '会話/講義からの引用'
  },
  en: {
    languageUse: 'Language Use',
    logic: 'Logic',
    delivery: 'Delivery',
    contextFlow: 'Context Flow',
    overallComment: 'Overall Comment',
    explanation: 'Explanation',
    userMistakes: 'Error Analysis',
    correctAnswer: 'Correct Answer',
    noAnswer: 'No answer selected',
    studyTip: 'Study Tip',
    meaning: 'Meaning',
    example: 'Example sentence',
    exampleTrans: 'Translation',
    correctExplanation: 'Answer Explanation',
    whyThisAnswer: 'Why This Answer?',
    wrongAnalysis: 'Wrong Answer Analysis',
    passageQuote: 'Passage Quote',
    dialogueQuote: 'Dialogue/Lecture Quote'
  },
  th: {
    languageUse: 'การใช้ภาษา',
    logic: 'ตรรกะ',
    delivery: 'การออกเสียงและความคล่อง',
    contextFlow: 'การไหลของบริบท',
    overallComment: 'ความเห็นโดยรวม',
    explanation: 'คำอธิบาย',
    userMistakes: 'การวิเคราะห์ข้อผิดพลาด',
    correctAnswer: 'คำตอบที่ถูกต้อง',
    noAnswer: 'ไม่ได้เลือก',
    studyTip: 'เคล็ดลับการเรียน',
    meaning: 'ความหมายภาษาไทย',
    example: 'ประโยคตัวอย่าง (อังกฤษ)',
    exampleTrans: 'แปลประโยคตัวอย่าง (ไทย)',
    correctExplanation: 'คำอธิบายคำตอบ',
    whyThisAnswer: 'ทำไมคำตอบนี้?',
    wrongAnalysis: 'วิเคราะห์คำตอบผิด',
    passageQuote: 'อ้างอิงจากเนื้อเรื่อง',
    dialogueQuote: 'อ้างอิงจากบทสนทนา/บรรยาย'
  }
};

export function getLanguageConfig(language: SupportedLanguage) {
  const langName = languageNames[language] || languageNames.ko;
  const langNative = languageNamesNative[language] || languageNamesNative.ko;
  const labels = languageLabels[language] || languageLabels.ko;
  
  return { langName, langNative, labels };
}

export function buildReadingExplanationPrompt(language: SupportedLanguage): string {
  const { langNative, labels } = getLanguageConfig(language);
  
  return `You are a TOEFL Reading expert providing structured, clear feedback in ${langNative}.

**OUTPUT FORMAT - Use these exact section headers:**

## ${labels.correctExplanation}
[1-2 sentences: correct answer and key reason]

## ${labels.whyThisAnswer}
• [${labels.passageQuote}: "relevant sentence"]
• [Explanation connecting the quote to the answer]

## ${labels.wrongAnalysis}
• [Wrong option 1]: [Why it's wrong]
• [Wrong option 2]: [Why it's wrong]

## ${labels.studyTip}
[One sentence strategy for this question type]

**RULES:**
- Be concise (150-200 words total)
- Quote passage directly with ""
- ALL text in ${langNative}
- Use bullet points (•)

Return JSON:
{
  "isCorrect": boolean,
  "explanation": "structured explanation with section headers"
}`;
}

export function buildListeningExplanationPrompt(language: SupportedLanguage): string {
  const { langNative, labels } = getLanguageConfig(language);
  
  return `You are a TOEFL Listening expert providing structured, clear feedback in ${langNative}.

**OUTPUT FORMAT - Use these exact section headers:**

## ${labels.correctExplanation}
[1-2 sentences: correct answer and key reason]

## ${labels.whyThisAnswer}
• [${labels.dialogueQuote}: "relevant statement"]
• [Explanation connecting the quote to the answer]
• [Speaker's intent/context explanation]

## ${labels.wrongAnalysis}
• [Wrong option 1]: [Why it's wrong]
• [Wrong option 2]: [Why it's wrong]

## ${labels.studyTip}
[One sentence Listening strategy]

**RULES:**
- Be concise (150-200 words total)
- Quote dialogue directly with ""
- Focus on speaker's tone, intent, context
- ALL text in ${langNative}
- Use bullet points (•)

Return JSON:
{
  "isCorrect": boolean,
  "explanation": "structured explanation with section headers"
}`;
}

export function buildAnswerExplanationPrompt(section: string, language: SupportedLanguage, userAnswerText: string): string {
  const { langNative, labels } = getLanguageConfig(language);
  const sectionName = section === "listening" ? "Listening" : "Reading";
  
  return `You are a professional TOEFL ${sectionName} instructor. Provide detailed explanations in ${langNative} that students can easily understand.

Respond ONLY in the following JSON format:

{
  "isCorrect": true/false,
  "correctAnswer": "Correct option (A/B/C/D)",
  "correctAnswerText": "Correct option content",
  "correctReason": "Explain why this is correct with evidence from the passage/dialogue",
  "wrongAnswers": [
    {
      "option": "A/B/C/D",
      "text": "Wrong option content",
      "reason": "Why this option is incorrect"
    }
  ],
  "keyVocabulary": [
    {
      "word": "English word/expression",
      "meaning": "${labels.meaning}",
      "example": "${labels.example}",
      "exampleKorean": "${labels.exampleTrans}"
    }
  ],
  "studyTip": "${labels.studyTip}"
}

Important notes:
- Student's answer: ${userAnswerText}
- Focus especially on explaining why the student's wrong answer (if any) is incorrect
- Include 3-5 essential vocabulary items for understanding this question
- ALL explanations must be in ${langNative}`;
}

