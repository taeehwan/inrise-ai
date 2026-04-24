import { randomUUID } from "crypto";
import {
  type AiUsage,
  type InsertAiUsage,
  type InsertProgram,
  type InsertSuccessStats,
  type InsertSuccessStory,
  type InsertUserProgramAccess,
  type Program,
  type SuccessStats,
  type SuccessStory,
  type Subscription,
  type UserActivity,
  type UserProgramAccess,
} from "@shared/schema";

export type SuccessProgramCaches = {
  successStories: Map<string, SuccessStory>;
  programs: Map<string, Program>;
  aiUsage: Map<string, AiUsage>;
  userActivity: Map<string, UserActivity>;
  userProgramAccess: Map<string, UserProgramAccess>;
  subscriptions: Map<string, Subscription>;
};

export type SuccessProgramMutableState = {
  successStats: SuccessStats | null;
};

export function getSuccessStoriesRecord(caches: SuccessProgramCaches): SuccessStory[] {
  return Array.from(caches.successStories.values())
    .filter((story) => story.isActive)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
}

export function getSuccessStoryRecord(caches: SuccessProgramCaches, id: string): SuccessStory | undefined {
  return caches.successStories.get(id);
}

export function createSuccessStoryRecord(
  caches: SuccessProgramCaches,
  story: InsertSuccessStory,
): SuccessStory {
  const id = randomUUID();
  const newStory: SuccessStory = {
    ...story,
    id,
    rating: story.rating ?? 5,
    backgroundImage: story.backgroundImage ?? null,
    videoUrl: story.videoUrl ?? null,
    accent: story.accent ?? "from-blue-500 to-purple-600",
    isActive: story.isActive ?? true,
    displayOrder: story.displayOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  caches.successStories.set(id, newStory);
  return newStory;
}

export function updateSuccessStoryRecord(
  caches: SuccessProgramCaches,
  id: string,
  story: Partial<InsertSuccessStory>,
): SuccessStory {
  const existing = caches.successStories.get(id);
  if (!existing) throw new Error("Success story not found");
  const updated: SuccessStory = {
    ...existing,
    ...story,
    rating: story.rating ?? existing.rating,
    backgroundImage: story.backgroundImage ?? existing.backgroundImage,
    videoUrl: story.videoUrl ?? existing.videoUrl,
    accent: story.accent ?? existing.accent,
    isActive: story.isActive ?? existing.isActive,
    displayOrder: story.displayOrder ?? existing.displayOrder,
    updatedAt: new Date(),
  };
  caches.successStories.set(id, updated);
  return updated;
}

export function deleteSuccessStoryRecord(caches: SuccessProgramCaches, id: string): void {
  caches.successStories.delete(id);
}

export function getSuccessStatsRecord(current: SuccessStats | null): SuccessStats {
  if (current) return current;
  return {
    id: randomUUID(),
    averageRating: "4.9",
    totalSuccessStories: 3,
    averageScoreImprovement: 25,
    goalAchievementRate: 98,
    updatedAt: new Date(),
  };
}

export function updateSuccessStatsRecord(
  current: SuccessStats | null,
  stats: Partial<InsertSuccessStats>,
): SuccessStats {
  const base = getSuccessStatsRecord(current);
  return { ...base, ...stats, updatedAt: new Date() };
}

export function buildDefaultSuccessStories(): { stories: SuccessStory[]; stats: SuccessStats } {
  const stories: SuccessStory[] = [
    {
      id: randomUUID(),
      name: "김지현",
      country: "대한민국",
      score: "TOEFL 110",
      rating: 5,
      review: "iNRISE 덕분에 목표 점수를 달성할 수 있었습니다. 인라이즈 피드백과 체계적인 학습 계획이 정말 도움이 되었어요!",
      backgroundImage: "",
      videoUrl: null,
      accent: "from-blue-500 to-purple-600",
      initials: "김지",
      isActive: true,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      name: "박민수",
      country: "대한민국",
      score: "GRE 325",
      rating: 5,
      review: "GRE 준비가 이렇게 체계적일 줄 몰랐어요. 특히 Quantitative 섹션에서 큰 향상을 보였습니다!",
      backgroundImage: "",
      videoUrl: null,
      accent: "from-green-500 to-blue-600",
      initials: "박민",
      isActive: true,
      displayOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      name: "이서영",
      country: "대한민국",
      score: "TOEFL 105",
      rating: 5,
      review: "실전 같은 모의고사와 AI 분석으로 약점을 보완할 수 있었습니다. 추천합니다!",
      backgroundImage: "",
      videoUrl: null,
      accent: "from-purple-500 to-pink-600",
      initials: "이서",
      isActive: true,
      displayOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  const stats: SuccessStats = {
    id: randomUUID(),
    averageRating: "4.9",
    totalSuccessStories: 3,
    averageScoreImprovement: 25,
    goalAchievementRate: 98,
    updatedAt: new Date(),
  };
  return { stories, stats };
}

export function buildDefaultPrograms(): Program[] {
  return [
    {
      id: randomUUID(),
      name: "TOEFL 완전정복 패키지",
      description: "TOEFL 시험의 모든 섹션을 완벽하게 마스터할 수 있는 종합 패키지입니다.",
      examType: "toefl",
      programType: "comprehensive_package",
      duration: 480,
      difficulty: "medium",
      membershipRequired: "pro",
      isActive: true,
      price: "199.00",
      features: ["인라이즈 피드백", "모의고사 20회", "개인별 학습 계획", "Speaking 연습"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      name: "GRE Quantitative 마스터",
      description: "GRE 수학 섹션에서 고득점을 위한 집중 프로그램입니다.",
      examType: "gre",
      programType: "section_focused",
      duration: 300,
      difficulty: "hard",
      membershipRequired: "max",
      isActive: true,
      price: "149.00",
      features: ["고급 수학 문제", "AI 문제 생성", "실시간 피드백"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      name: "Speaking 기초 과정",
      description: "영어 말하기의 기초부터 차근차근 배우는 과정입니다.",
      examType: "both",
      programType: "speaking_course",
      duration: 180,
      difficulty: "easy",
      membershipRequired: "light",
      isActive: true,
      price: "79.00",
      features: ["기초 발음 교정", "일상 회화", "AI 발음 분석"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
}

export function buildDemoAiUsage(): AiUsage[] {
  return [
    {
      id: randomUUID(),
      userId: "admin-1",
      feature: "question_generation",
      tokensUsed: 1500,
      requestCount: 5,
      sessionDuration: 1800,
      examType: "toefl",
      section: "reading",
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: randomUUID(),
      userId: "admin-1",
      feature: "speaking_feedback",
      tokensUsed: 800,
      requestCount: 3,
      sessionDuration: 900,
      examType: "toefl",
      section: "speaking",
      createdAt: new Date(Date.now() - 172800000),
    },
    {
      id: randomUUID(),
      userId: "admin-1",
      feature: "writing_feedback",
      tokensUsed: 1200,
      requestCount: 2,
      sessionDuration: 2400,
      examType: "gre",
      section: "writing",
      createdAt: new Date(),
    },
  ];
}

export function buildDemoActivities(): UserActivity[] {
  return [
    {
      id: randomUUID(),
      userId: "admin-1",
      activityType: "test_taken",
      details: { testType: "toefl_reading", score: 25 },
      duration: 3600,
      score: 25,
      createdAt: new Date(Date.now() - 86400000),
    },
    {
      id: randomUUID(),
      userId: "admin-1",
      activityType: "video_watched",
      details: { videoId: "intro_toefl", completion: 100 },
      duration: 1800,
      score: null,
      createdAt: new Date(Date.now() - 172800000),
    },
    {
      id: randomUUID(),
      userId: "admin-1",
      activityType: "ai_used",
      details: { feature: "question_generation", tokens: 500 },
      duration: 600,
      score: null,
      createdAt: new Date(),
    },
  ];
}

export function createAiUsageRecord(caches: SuccessProgramCaches, usage: InsertAiUsage): AiUsage {
  const id = randomUUID();
  const newUsage: AiUsage = {
    ...usage,
    id,
    tokensUsed: usage.tokensUsed ?? 0,
    requestCount: usage.requestCount ?? 1,
    sessionDuration: usage.sessionDuration ?? 0,
    examType: usage.examType ?? null,
    section: usage.section ?? null,
    createdAt: new Date(),
  };
  caches.aiUsage.set(id, newUsage);
  return newUsage;
}

export function getAiUsageRecord(
  caches: SuccessProgramCaches,
  userId: string,
  startDate?: Date,
  endDate?: Date,
): AiUsage[] {
  return Array.from(caches.aiUsage.values())
    .filter((usage) => {
      if (usage.userId !== userId) return false;
      if (startDate && usage.createdAt! < startDate) return false;
      if (endDate && usage.createdAt! > endDate) return false;
      return true;
    })
    .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
}

export function getAiUsageStatsRecord(caches: SuccessProgramCaches): any {
  const allUsage = Array.from(caches.aiUsage.values());
  const totalRequests = allUsage.length;
  const totalTokens = allUsage.reduce((sum, usage) => sum + (usage.tokensUsed || 0), 0);
  const totalDuration = allUsage.reduce((sum, usage) => sum + (usage.sessionDuration || 0), 0);
  const featureUsage = allUsage.reduce((acc, usage) => {
    acc[usage.feature] = (acc[usage.feature] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const userUsage = allUsage.reduce((acc, usage) => {
    acc[usage.userId] = (acc[usage.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    totalRequests,
    totalTokens,
    totalDuration,
    featureUsage,
    userUsage,
    averageTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
    averageDurationPerSession: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
  };
}

export function getUserAiUsageStatsRecord(caches: SuccessProgramCaches, userId: string): any {
  const userUsage = getAiUsageRecord(caches, userId);
  const totalRequests = userUsage.length;
  const totalTokens = userUsage.reduce((sum, usage) => sum + (usage.tokensUsed || 0), 0);
  const totalDuration = userUsage.reduce((sum, usage) => sum + (usage.sessionDuration || 0), 0);
  const featureUsage = userUsage.reduce((acc, usage) => {
    acc[usage.feature] = (acc[usage.feature] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dailyUsage = userUsage.reduce((acc, usage) => {
    const date = usage.createdAt!.toISOString().split("T")[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    totalRequests,
    totalTokens,
    totalDuration,
    featureUsage,
    dailyUsage,
    averageTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
    averageDurationPerSession: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
  };
}

export function getProgramsRecord(caches: SuccessProgramCaches): Program[] {
  return Array.from(caches.programs.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getProgramRecord(caches: SuccessProgramCaches, id: string): Program | undefined {
  return caches.programs.get(id);
}

export function createProgramRecord(caches: SuccessProgramCaches, program: InsertProgram): Program {
  const id = randomUUID();
  const newProgram: Program = {
    ...program,
    id,
    description: program.description ?? null,
    duration: program.duration ?? 0,
    difficulty: program.difficulty ?? "medium",
    membershipRequired: program.membershipRequired ?? "guest",
    isActive: program.isActive ?? true,
    price: program.price ?? "0.00",
    features: program.features ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  caches.programs.set(id, newProgram);
  return newProgram;
}

export function updateProgramRecord(
  caches: SuccessProgramCaches,
  id: string,
  program: Partial<InsertProgram>,
): Program {
  const existing = caches.programs.get(id);
  if (!existing) throw new Error("Program not found");
  const updated: Program = {
    ...existing,
    ...program,
    description: program.description ?? existing.description,
    duration: program.duration ?? existing.duration,
    difficulty: program.difficulty ?? existing.difficulty,
    membershipRequired: program.membershipRequired ?? existing.membershipRequired,
    isActive: program.isActive ?? existing.isActive,
    price: program.price ?? existing.price,
    features: program.features ?? existing.features,
    updatedAt: new Date(),
  };
  caches.programs.set(id, updated);
  return updated;
}

export function deleteProgramRecord(caches: SuccessProgramCaches, id: string): void {
  caches.programs.delete(id);
  Array.from(caches.userProgramAccess.values())
    .filter((access) => access.programId === id)
    .forEach((access) => caches.userProgramAccess.delete(access.id));
}

export function revokeProgramAccessRecord(
  caches: SuccessProgramCaches,
  userId: string,
  programId: string,
): void {
  const accessToRevoke = Array.from(caches.userProgramAccess.values()).find(
    (access) => access.userId === userId && access.programId === programId,
  );
  if (accessToRevoke) {
    caches.userProgramAccess.delete(accessToRevoke.id);
  }
}

export function grantProgramAccessRecord(
  caches: SuccessProgramCaches,
  accessData: InsertUserProgramAccess,
): UserProgramAccess {
  const access: UserProgramAccess = {
    id: randomUUID(),
    ...accessData,
    accessType: accessData.accessType ?? "granted",
    expiresAt: accessData.expiresAt ?? null,
    grantedBy: accessData.grantedBy ?? null,
    createdAt: new Date(),
  };
  caches.userProgramAccess.set(access.id, access);
  return access;
}

export function getUserProgramAccessRecord(
  caches: SuccessProgramCaches,
  userId: string,
): UserProgramAccess[] {
  return Array.from(caches.userProgramAccess.values())
    .filter((access) => access.userId === userId)
    .filter((access) => !access.expiresAt || access.expiresAt > new Date());
}

export function cancelSubscriptionRecord(
  caches: SuccessProgramCaches,
  subscriptionId: string,
): Subscription | null {
  const subscription = caches.subscriptions.get(subscriptionId);
  if (!subscription) return null;
  const updated = { ...subscription, status: "cancelled" as const, endDate: new Date(), updatedAt: new Date() };
  caches.subscriptions.set(subscriptionId, updated);
  return updated;
}

export function getUserAiUsageDetailRecord(caches: SuccessProgramCaches, userId: string) {
  const userUsage = Array.from(caches.aiUsage.values()).filter((usage) => usage.userId === userId);
  const totalRequests = userUsage.reduce((sum, usage) => sum + (usage.requestCount ?? 0), 0);
  const totalTokens = userUsage.reduce((sum, usage) => sum + (usage.tokensUsed ?? 0), 0);
  const totalDuration = userUsage.reduce((sum, usage) => sum + (usage.sessionDuration || 0), 0);
  const featureUsage: Record<string, number> = {};
  userUsage.forEach((usage) => {
    featureUsage[usage.feature] = (featureUsage[usage.feature] || 0) + (usage.requestCount ?? 0);
  });
  return {
    totalRequests,
    totalTokens,
    totalDuration,
    featureUsage,
    averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
  };
}

export function initializeSuccessAndProgramData(
  caches: SuccessProgramCaches,
  state: SuccessProgramMutableState,
): SuccessStats {
  const { stories, stats } = buildDefaultSuccessStories();
  stories.forEach((story) => {
    caches.successStories.set(story.id, story);
  });

  buildDefaultPrograms().forEach((program) => {
    caches.programs.set(program.id, program);
  });

  buildDemoAiUsage().forEach((usage) => {
    caches.aiUsage.set(usage.id, usage);
  });

  buildDemoActivities().forEach((activity) => {
    caches.userActivity.set(activity.id, activity);
  });

  state.successStats = stats;
  return stats;
}
