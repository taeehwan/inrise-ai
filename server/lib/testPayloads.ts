export function buildAiTestSetPayload(id: string, aiTestData: any) {
  let passagesArray = aiTestData.passages || [];
  if (!passagesArray.length && aiTestData.passage) {
    passagesArray = [{ title: aiTestData.testTitle || "Reading Passage", content: aiTestData.passage }];
  }

  let questionsArray = aiTestData.questions || [];
  if (questionsArray.length === 0 && passagesArray.length > 0) {
    questionsArray = passagesArray.flatMap((passage: any) => {
      if (passage.questions && Array.isArray(passage.questions)) {
        return passage.questions.map((question: any) => ({
          ...question,
          script: question.script || passage.script || passage.dialogue || "",
          passageTitle: passage.title || passage.type || "Passage",
        }));
      }
      if (passage.question || passage.options) {
        return [{ ...passage, script: passage.script || passage.dialogue || "" }];
      }
      return [];
    });
  }

  return {
    id,
    ...aiTestData,
    questions: questionsArray,
    passages: passagesArray,
    _sectionData: {
      questions: questionsArray,
      passages: passagesArray,
    },
  };
}

export function buildAiListeningView(testData: any) {
  let scripts = [];
  if (testData.audioFiles && Array.isArray(testData.audioFiles) && testData.audioFiles.length > 0) {
    scripts = testData.audioFiles.map((audio: any, index: number) => ({
      id: audio.id || `script-${index}`,
      title: audio.title || `Listening Section ${index + 1}`,
      content: audio.content || audio.script || audio.text || "Listen to the audio content.",
      type: audio.type || "conversation",
      duration: audio.duration || 180,
      instructions: audio.instructions || "Listen carefully and answer the questions that follow.",
      audioUrl: audio.audioUrl || audio.url,
      audioPath: audio.audioPath || audio.path,
    }));
  } else {
    const numQuestions = (testData.questions || []).length;
    scripts = [
      {
        id: "script-1",
        title: testData.title || "Listening Comprehension",
        content: `이것은 AI로 생성된 TOEFL 리스닝 테스트입니다. 총 ${numQuestions}개의 질문이 있으며, 각 질문을 주의 깊게 읽고 가장 적절한 답을 선택해주세요.`,
        type: "academic_lecture",
        duration: testData.timeLimit || 180,
        instructions: "다음 질문들을 주의 깊게 읽고 답변해주세요. 실제 오디오는 향후 추가될 예정입니다.",
        audioUrl: null,
        audioPath: null,
      },
    ];
  }

  const questions = testData.questions || [];
  return {
    testTitle: testData.title || testData.testTitle || "AI Generated Listening Test",
    scripts,
    questions: questions.map((question: any, index: number) => ({
      id: question.id || `q${index + 1}`,
      type: question.type || "multiple_choice",
      question: question.question || question.questionText,
      options: question.options || [],
      correctAnswer: typeof question.correctAnswer === "number" ? question.correctAnswer : 0,
      explanation: question.explanation || "Please review the audio content.",
      scriptIndex: question.scriptIndex || 0,
      points: question.points || 1,
    })),
    totalQuestions: questions.length,
    totalDuration: testData.totalDuration || testData.timeLimit || 300,
    section: testData.section,
    metadata: {
      audioGenerated: testData.metadata?.audioGenerated || false,
      ...testData.metadata,
    },
  };
}

export function buildAiSectionedResponse(aiTest: any, finalQuestions?: any[]) {
  const resolvedQuestions = finalQuestions || aiTest.questions || [];
  return {
    ...aiTest,
    questions: resolvedQuestions,
    passages: aiTest.passages || [],
    sectionData: {
      questions: resolvedQuestions,
      passages: aiTest.passages || [],
      scripts: aiTest.scripts || [],
      tasks: aiTest.tasks || [],
      audioFiles: aiTest.audioFiles || [],
    },
  };
}

export function buildTestSetAsTestResponse(routeId: string, testSet: any) {
  const title = (testSet.title || "").toLowerCase();
  return {
    id: routeId,
    title: testSet.title,
    description: testSet.description || "",
    examType: testSet.examType,
    section: title.includes("reading")
      ? "reading"
      : title.includes("listening")
        ? "listening"
        : title.includes("speaking")
          ? "speaking"
          : title.includes("writing")
            ? "writing"
            : "reading",
    difficulty: "medium" as const,
    duration: testSet.totalDuration || 60,
    questionCount: 10,
    isActive: testSet.isActive !== false,
    createdAt: testSet.createdAt || new Date().toISOString(),
    type: testSet.examType,
    sectionData: testSet._sectionData || null,
  };
}
