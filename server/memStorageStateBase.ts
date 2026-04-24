import type {
  AdminMessage,
  Achievement,
  AiUsage,
  Answer,
  DailyStats,
  Faq,
  GreAnalyticalWritingTest,
  GreQuantitativeQuestion,
  GreQuantitativeReasoningTest,
  GreTest,
  GreTestAttempt,
  GreVerbalQuestion,
  GreVerbalReasoningTest,
  LiveActivity,
  Payment,
  PerformanceAnalytics,
  Program,
  Question,
  Review,
  SpeakingAttempt,
  SpeakingTest,
  StudyProgress,
  StudyScheduleItem,
  Subscription,
  SuccessStats,
  SuccessStory,
  Test,
  TestAttempt,
  TestSet,
  TestSetAttempt,
  TestSetComponent,
  User,
  UserActivity,
  UserProgramAccess,
  UserStudyPlan,
  VisitorLog,
  WritingAttempt,
  WritingTest,
} from "@shared/schema";
import { MemStorageExamBase } from "./memStorageExamBase";

export abstract class MemStorageStateBase extends MemStorageExamBase {
  protected users = new Map<string, User>();
  protected tests = new Map<string, Test>();
  protected questions = new Map<string, Question>();
  private testAttempts = new Map<string, TestAttempt>();
  private answers = new Map<string, Answer>();
  private reviews = new Map<string, Review>();
  private adminMessages = new Map<string, AdminMessage>();
  private faqs = new Map<string, Faq>();
  private userStudyPlans = new Map<string, UserStudyPlan>();
  private studyScheduleItems = new Map<string, StudyScheduleItem>();
  private studyProgress = new Map<string, StudyProgress>();
  protected speakingTests = new Map<string, SpeakingTest>();
  private speakingAttempts = new Map<string, SpeakingAttempt>();
  private writingTests = new Map<string, WritingTest>();
  private writingAttempts = new Map<string, WritingAttempt>();
  private greTests = new Map<string, GreTest>();
  private greAnalyticalWritingTests = new Map<string, GreAnalyticalWritingTest>();
  private greVerbalReasoningTests = new Map<string, GreVerbalReasoningTest>();
  private greVerbalQuestions = new Map<string, GreVerbalQuestion>();
  private greQuantitativeReasoningTests = new Map<string, GreQuantitativeReasoningTest>();
  private greQuantitativeQuestions = new Map<string, GreQuantitativeQuestion>();
  private greTestAttempts = new Map<string, GreTestAttempt>();
  private performanceAnalytics = new Map<string, PerformanceAnalytics>();
  protected testSets = new Map<string, TestSet>();
  protected testSetComponents = new Map<string, TestSetComponent>();
  private testSetAttempts = new Map<string, TestSetAttempt>();
  private successStories = new Map<string, SuccessStory>();
  protected successStats: SuccessStats | null = null;
  private aiUsage = new Map<string, AiUsage>();
  private programs = new Map<string, Program>();
  private userProgramAccess = new Map<string, UserProgramAccess>();
  private userActivity = new Map<string, UserActivity>();
  private visitorLogs = new Map<string, VisitorLog>();
  private achievements = new Map<string, Achievement>();
  private dailyStats = new Map<string, DailyStats>();
  private subscriptions = new Map<string, Subscription>();
  private payments = new Map<string, Payment>();
  private liveActivities = new Map<string, LiveActivity>();

  protected getCoreStorageCaches() {
    return {
      users: this.users,
      tests: this.tests,
      questions: this.questions,
      testAttempts: this.testAttempts,
      answers: this.answers,
      testSets: this.testSets,
    };
  }

  protected getStudySupportCaches() {
    return {
      adminMessages: this.adminMessages,
      faqs: this.faqs,
      userStudyPlans: this.userStudyPlans,
      studyScheduleItems: this.studyScheduleItems,
      studyProgress: this.studyProgress,
    };
  }

  protected getSpeakingStorageCaches() {
    return {
      speakingAttempts: this.speakingAttempts,
    };
  }

  protected getWritingGreCaches() {
    return {
      writingTests: this.writingTests,
      writingAttempts: this.writingAttempts,
      greTests: this.greTests,
      greVerbalReasoningTests: this.greVerbalReasoningTests,
      greVerbalQuestions: this.greVerbalQuestions,
      greQuantitativeReasoningTests: this.greQuantitativeReasoningTests,
      greQuantitativeQuestions: this.greQuantitativeQuestions,
      greTestAttempts: this.greTestAttempts,
      questions: this.questions,
    };
  }

  protected getTestSetPerformanceCaches() {
    return {
      performanceAnalytics: this.performanceAnalytics,
      testSets: this.testSets,
      testSetComponents: this.testSetComponents,
      testSetAttempts: this.testSetAttempts,
      tests: this.tests,
    };
  }

  protected getSuccessProgramCaches() {
    return {
      successStories: this.successStories,
      programs: this.programs,
      aiUsage: this.aiUsage,
      userActivity: this.userActivity,
      userProgramAccess: this.userProgramAccess,
      subscriptions: this.subscriptions,
    };
  }

  protected getSuccessProgramState() {
    return {
      successStats: this.successStats,
    };
  }

  protected getRuntimeAnalyticsCaches() {
    return {
      dailyStats: this.dailyStats,
      tests: this.tests,
      userActivity: this.userActivity,
      visitorLogs: this.visitorLogs,
      liveActivities: this.liveActivities,
      subscriptions: this.subscriptions,
      payments: this.payments,
    };
  }

  protected getActivityAnalyticsStores() {
    return {
      userActivity: this.userActivity,
      visitorLogs: this.visitorLogs,
      liveActivities: this.liveActivities,
      subscriptions: this.subscriptions,
      payments: this.payments,
    };
  }
}
