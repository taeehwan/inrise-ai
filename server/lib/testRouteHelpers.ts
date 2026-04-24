export function isUuidLike(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isNewListeningTestId(id: string) {
  return id.startsWith("new-listening-");
}

export function stripTestSetPrefix(id: string) {
  return id.startsWith("testset-") ? id.replace("testset-", "") : id;
}

export function buildNewToeflListeningPayload(newToeflListeningTest: any) {
  return {
    ...newToeflListeningTest,
    examType: "new-toefl",
    section: "listening",
    listenAndChoose: (newToeflListeningTest.listenAndChoose as any[]) || [],
    conversations: (newToeflListeningTest.conversations as any[]) || [],
    announcements: (newToeflListeningTest.announcements as any[]) || [],
    academicTalks: (newToeflListeningTest.academicTalks as any[]) || [],
  };
}
