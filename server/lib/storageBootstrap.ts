import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { users as usersTable, type Question, type SpeakingTest, type TestSet, type TestSetComponent, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

type StorageBootstrapCaches = {
  speakingTests: Map<string, SpeakingTest>;
  questions: Map<string, Question>;
  testSets: Map<string, TestSet>;
  testSetComponents: Map<string, TestSetComponent>;
};

type BootstrapAdminConfig = {
  email: string;
  password: string | null;
  passwordSource: "env" | "generated-dev" | "disabled";
};

let generatedDevelopmentAdminPassword: string | null = null;

function resolveBootstrapAdminConfig(): BootstrapAdminConfig {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() || "admin@inrise.com";
  const configuredPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim();

  if (configuredPassword) {
    return {
      email,
      password: configuredPassword,
      passwordSource: "env",
    };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      email,
      password: null,
      passwordSource: "disabled",
    };
  }

  if (!generatedDevelopmentAdminPassword) {
    generatedDevelopmentAdminPassword = randomBytes(18).toString("base64url");
    console.warn(
      `⚠️ Generated development bootstrap admin password for ${email}: ${generatedDevelopmentAdminPassword}`,
    );
    console.warn(
      "⚠️ Set ADMIN_BOOTSTRAP_PASSWORD to avoid generated development credentials.",
    );
  }

  return {
    email,
    password: generatedDevelopmentAdminPassword,
    passwordSource: "generated-dev",
  };
}

export async function buildDefaultAdminUser(): Promise<User | null> {
  const { email, password } = resolveBootstrapAdminConfig();

  if (!password) {
    return null;
  }

  return {
    id: "admin-1",
    username: "admin",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    firstName: "Admin",
    lastName: "User",
    phone: null,
    profileImageUrl: null,
    country: null,
    targetExam: "toefl",
    targetScore: null,
    role: "admin",
    membershipTier: "master",
    subscriptionStatus: "active",
    subscriptionId: null,
    subscriptionStartDate: null,
    subscriptionEndDate: null,
    provider: "local",
    providerId: null,
    privacyConsent: true,
    marketingConsent: false,
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function initializeDefaultAdminUser(users: Map<string, User>): Promise<void> {
  const adminConfig = resolveBootstrapAdminConfig();

  try {
    const { db } = await import("../db");
    const [existingAdmin] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, adminConfig.email))
      .limit(1);

    if (existingAdmin) {
      console.log("✅ Admin user loaded from database");
      users.set(existingAdmin.id, existingAdmin);
      return;
    }

    const adminUser = await buildDefaultAdminUser();
    if (!adminUser) {
      console.warn(
        `⚠️ Skipping bootstrap admin creation for ${adminConfig.email}: ADMIN_BOOTSTRAP_PASSWORD is required in production.`,
      );
      return;
    }
    await db.insert(usersTable).values(adminUser).onConflictDoNothing();
    users.set(adminUser.id, adminUser);
    console.log(`✅ Admin user created with bootstrap credentials (${adminConfig.passwordSource})`);
  } catch (error) {
    console.error("Failed to initialize admin from database, using default:", error);
    const adminUser = await buildDefaultAdminUser();
    if (!adminUser) {
      console.warn(
        `⚠️ Skipping in-memory bootstrap admin creation for ${adminConfig.email}: password bootstrap is disabled.`,
      );
      return;
    }
    users.set(adminUser.id, adminUser);
    console.log(`✅ Admin user initialized in memory only (${adminConfig.passwordSource})`);
  }
}

export function seedStorageBootstrapData(caches: StorageBootstrapCaches): void {
  seedSampleSpeakingTests(caches.speakingTests);
  seedDefaultSpeakingTopics(caches.speakingTests);
  seedGreQuestionBank(caches.questions);
  seedDefaultTestSets(caches.testSets, caches.testSetComponents);
}

function seedSampleSpeakingTests(speakingTests: Map<string, SpeakingTest>): void {
  const sampleSpeakingTests: SpeakingTest[] = [
    {
      id: "speaking-independent-1",
      title: "Personal Experience",
      type: "independent",
      questionType: null,
      description: "Describe a memorable experience from your childhood",
      topic: "childhood",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText: "Describe a memorable experience from your childhood. Explain what happened and why this experience was memorable to you.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "speaking-integrated-2",
      title: "Task #2 - Campus Life: Recreation Center",
      type: "integrated",
      questionType: "2",
      description: "Task #2 - Campus Life: Reading + Listening + 30sec prep + 60sec speaking",
      topic: null,
      readingPassageTitle: "New Recreation Center Announcement",
      readingPassage:
        "The university has announced plans to build a new recreation center on the east side of campus. The facility will include a swimming pool, fitness center, basketball courts, and meeting rooms for student organizations. Construction is scheduled to begin next fall and will be completed by the following spring. The center will be funded through a combination of student fees and university budget allocations. Students can expect a $50 increase in their semester fees to help cover the operating costs.",
      readingTime: 45,
      listeningAudioUrl: null,
      listeningScript:
        "I think this new recreation center is a terrible idea. First of all, we already have a gym on campus, and it's not even crowded most of the time. Why do we need another one? And the location they chose is awful - the east side of campus is so far from the dorms and most of the academic buildings. It would take me twenty minutes just to walk there from my dorm. Plus, they're going to charge us an extra fifty dollars per semester for this? That's completely unfair. Most students are already struggling with tuition and living expenses. They should be spending that money on more important things like updating the library or fixing the broken heating system in the science building. I really think they should reconsider this whole project.",
      questionText:
        "The woman expresses her opinion about the university's plan to build a new recreation center. State her opinion and explain the reasons she gives for holding that opinion.",
      preparationTime: 30,
      responseTime: 60,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "speaking-integrated-3",
      title: "Task #3 - Academic Lecture: Cognitive Dissonance",
      type: "integrated",
      questionType: "3",
      description: "Task #3 - Academic Lecture: Reading + Listening + 30sec prep + 60sec speaking",
      topic: null,
      readingPassageTitle: "Cognitive Dissonance Theory",
      readingPassage:
        "Cognitive dissonance is a psychological phenomenon that occurs when a person holds contradictory beliefs, ideas, or values simultaneously. This mental discomfort motivates individuals to resolve the inconsistency by changing their attitudes, beliefs, or behaviors. The theory, developed by Leon Festinger in 1957, suggests that people have an inner drive to maintain harmony between their cognitions. When dissonance occurs, individuals often rationalize their behavior or adjust their beliefs to reduce the psychological tension.",
      readingTime: 45,
      listeningAudioUrl: null,
      listeningScript:
        "Now, let me give you a concrete example of cognitive dissonance that many of you can probably relate to. Imagine a student - let's call her Sarah - who really values her health and believes strongly that smoking is harmful. She knows all the facts about lung cancer, heart disease, and other health risks associated with smoking. However, Sarah started smoking during her freshman year because she wanted to fit in with a certain group of friends. So here we have Sarah, who intellectually knows that smoking is bad for her health, but she continues to smoke anyway. This creates cognitive dissonance - the conflict between her belief that smoking is harmful and her behavior of actually smoking. To reduce this discomfort, Sarah might rationalize her behavior in several ways. She might tell herself that she's young and healthy so the risks don't apply to her yet, or that she'll quit before any real damage is done, or even that the stress relief from smoking actually benefits her health during exam periods. These are all ways of resolving the dissonance between her beliefs and actions.",
      questionText: "Using the example from the lecture, explain how the professor illustrates the concept of cognitive dissonance.",
      preparationTime: 30,
      responseTime: 60,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "speaking-integrated-4",
      title: "Task #4 - Academic Lecture: Animal Communication",
      type: "integrated",
      questionType: "4",
      description: "Task #4 - Academic Lecture: Listening only + 20sec prep + 60sec speaking",
      topic: null,
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript:
        "Today I want to talk about how animals use communication as a survival strategy. There are many fascinating ways that animals communicate to help them survive in their natural environments. Let me focus on two main purposes: avoiding predators and finding food. First, let's look at how animals use communication to avoid predators. Many animals have developed alarm calls to warn others of danger. For example, vervet monkeys have different alarm calls for different types of predators. They have one call for eagles, another for snakes, and a third for leopards. When a monkey spots an eagle, it makes a specific call that tells other monkeys to look up and take cover in dense vegetation. But when they hear the snake alarm call, they stand on their hind legs and look down at the ground. This specific communication system helps the entire group respond appropriately to different threats. Now, the second way animals use communication for survival is to locate food sources. Honeybees are a perfect example of this. When a worker bee finds a good source of nectar, it returns to the hive and performs what we call a 'waggle dance.' This dance communicates both the direction and distance of the food source to other bees. The angle of the dance indicates the direction relative to the sun, and the duration of the dance tells other bees how far they need to fly. This allows the entire colony to efficiently exploit food sources and survive as a group.",
      questionText: "Using points and examples from the lecture, explain two ways that animals use communication to survive in their environment.",
      preparationTime: 20,
      responseTime: 60,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
  ];

  for (const test of sampleSpeakingTests) {
    speakingTests.set(test.id, test);
  }
}

function seedDefaultSpeakingTopics(speakingTests: Map<string, SpeakingTest>): void {
  const defaultTopics: SpeakingTest[] = [
    {
      id: "independent-1",
      title: "Personal Preference",
      type: "independent",
      questionType: null,
      description: "Some students enjoy decorating their surroundings; others choose to keep their surroundings simple and undecorated. Which do you prefer and why?",
      topic: "Personal Preference",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText: "Some students enjoy decorating their surroundings; others choose to keep their surroundings simple and undecorated. Which do you prefer and why?",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-2",
      title: "Study Habits",
      type: "independent",
      questionType: null,
      description: "Do you agree or disagree with the following statement? Students are more focused and learn better when they attend classes in person than when they attend classes online.",
      topic: "Study Habits",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Do you agree or disagree with the following statement? Students are more focused and learn better when they attend classes in person than when they attend classes online. Use specific reasons and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-3",
      title: "Technology Usage",
      type: "independent",
      questionType: null,
      description: "Some people believe that students should be allowed to use smartphones and laptops during class time. Others believe that these devices should be prohibited.",
      topic: "Technology Usage",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Some people believe that students should be allowed to use smartphones and laptops during class time. Others believe that these devices should be prohibited. Which view do you support and why?",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-4",
      title: "Life Experience",
      type: "independent",
      questionType: null,
      description: "Describe a time when you had to make an important decision.",
      topic: "Life Experience",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Describe a time when you had to make an important decision. Explain the situation and why this decision was important to you. Use specific details and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-5",
      title: "Education Goals",
      type: "independent",
      questionType: null,
      description: "Study alone vs study in groups preference.",
      topic: "Education Goals",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Some students prefer to study alone, while others prefer to study in groups. Which method do you think is more effective and why? Use specific reasons and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-6",
      title: "Future Plans",
      type: "independent",
      questionType: null,
      description: "Plans after graduation and goals.",
      topic: "Future Plans",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "What are your plans after graduation? Explain your goals and how you plan to achieve them. Use specific details and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-7",
      title: "Learning Methods",
      type: "independent",
      questionType: null,
      description: "It is better to learn about a new subject through hands-on activities rather than through reading about it.",
      topic: "Learning Methods",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Do you agree or disagree with the following statement? It is better to learn about a new subject through hands-on activities rather than through reading about it. Use specific reasons and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-8",
      title: "Social Media",
      type: "independent",
      questionType: null,
      description: "The impact of social media on young people.",
      topic: "Social Media",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Do you think social media has a positive or negative impact on young people? Use specific reasons and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-9",
      title: "Travel Experience",
      type: "independent",
      questionType: null,
      description: "Describe a place you would like to visit.",
      topic: "Travel Experience",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "Describe a place you would like to visit. Explain why you want to go there and what you would like to do. Use specific details and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "independent-10",
      title: "Environmental Issues",
      type: "independent",
      questionType: null,
      description: "What can individuals do to help protect the environment?",
      topic: "Environmental Issues",
      readingPassageTitle: null,
      readingPassage: null,
      readingTime: 0,
      listeningAudioUrl: null,
      listeningScript: null,
      questionText:
        "What can individuals do to help protect the environment? Use specific reasons and examples to support your answer.",
      preparationTime: 15,
      responseTime: 45,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "integrated-1",
      title: "Campus Life - Dining Services",
      type: "integrated",
      questionType: null,
      description: "The woman expresses her opinion about the university's decision to expand dining services.",
      topic: "Campus Life",
      readingPassageTitle: null,
      readingPassage:
        "The university has announced plans to expand dining services by adding three new restaurants to the campus food court. The new restaurants will include an Asian fusion restaurant, a Mediterranean café, and a vegetarian restaurant. The expansion is scheduled to be completed by the end of the academic year and will provide students with more diverse dining options.",
      readingTime: 45,
      listeningAudioUrl: null,
      listeningScript: "Student conversation about the dining expansion plans",
      questionText:
        "The woman expresses her opinion about the university's decision to expand dining services. State her opinion and explain the reasons she gives for holding that opinion.",
      preparationTime: 30,
      responseTime: 60,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: "integrated-2",
      title: "Academic Concept - Psychology",
      type: "integrated",
      questionType: null,
      description: "Using the example from the lecture, explain how cognitive bias affects decision-making in everyday situations.",
      topic: "Psychology",
      readingPassageTitle: null,
      readingPassage:
        "Cognitive bias refers to systematic patterns of deviation from rationality in judgment and decision-making. These biases occur when people process and interpret information in a way that favors one outcome over others, often without conscious awareness. Understanding cognitive bias is important because it affects how we make decisions in everyday life.",
      readingTime: 45,
      listeningAudioUrl: null,
      listeningScript: "Psychology lecture on cognitive bias with shopping examples",
      questionText: "Using the example from the lecture, explain how cognitive bias affects decision-making in everyday situations.",
      preparationTime: 30,
      responseTime: 60,
      sampleAnswer: null,
      isActive: true,
      createdAt: new Date(),
    },
  ];

  for (const topic of defaultTopics) {
    speakingTests.set(topic.id, topic);
  }
}

function seedGreQuestionBank(questions: Map<string, Question>): void {
  type SeedQuestion = Omit<Question, "options"> & { options?: Record<string, string> };
  const greQuestions: SeedQuestion[] = [
    {
      id: "gre-writing-1",
      testId: "gre-analytical-writing",
      questionText: "To understand the most important characteristics of a society, one must study its major cities.",
      questionType: "essay",
      orderIndex: 1,
      options: undefined,
      difficulty: "medium",
      correctAnswer: null,
      explanation: "This is an issue task where you must develop a position on the given statement.",
      points: 6,
      passage: null,
      imageUrl: null,
      audioUrl: null,
      writingPrompt: "Write a response in which you discuss the extent to which you agree or disagree with the statement and explain your reasoning for the position you take.",
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
    {
      id: "gre-writing-2",
      testId: "gre-analytical-writing",
      questionText:
        "The following appeared in a letter to the editor of the Balmer Island Gazette: \"The population on Balmer Island doubles during the summer months. During the summer, the town council of Balmer Island increases the number of police officers from 8 to 12. Yet each summer there are many more reported crimes in Balmer than there are during the rest of the year, when there are only 8 police officers. Clearly, these statistics show that the number of police officers is not related to the number of crimes committed. Thus there is no reason to keep the 12 officers during the summer.\"",
      questionType: "essay",
      orderIndex: 2,
      options: undefined,
      difficulty: "medium",
      correctAnswer: null,
      explanation: "This is an argument task where you must critique the logical soundness of the given argument.",
      points: 6,
      passage: null,
      imageUrl: null,
      audioUrl: null,
      writingPrompt: "Write a response in which you examine the stated and/or unstated assumptions of the argument.",
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
    {
      id: "gre-verbal-1",
      testId: "gre-verbal-reasoning",
      questionText: "The professor's lecture was so _______ that even the most attentive students found it difficult to follow.",
      questionType: "fill_blank",
      orderIndex: 1,
      options: {
        A: "lucid",
        B: "convoluted",
        C: "engaging",
        D: "brief",
        E: "elementary",
      },
      difficulty: "medium",
      correctAnswer: "B",
      explanation: 'The word "convoluted" means complex and difficult to follow, which fits the context.',
      points: 1,
      passage: null,
      imageUrl: null,
      audioUrl: null,
      writingPrompt: null,
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
    {
      id: "gre-verbal-2",
      testId: "gre-verbal-reasoning",
      questionText: "According to the passage, which of the following best describes the author's view of renewable energy?",
      questionType: "multiple-choice",
      orderIndex: 2,
      options: {
        A: "It is the only solution to climate change",
        B: "It has both advantages and limitations",
        C: "It is economically unfeasible",
        D: "It will replace fossil fuels within a decade",
        E: "It is less reliable than traditional energy sources",
      },
      difficulty: "hard",
      correctAnswer: "B",
      explanation: "The author presents a balanced view discussing both benefits and challenges of renewable energy.",
      points: 1,
      passage:
        "Renewable energy sources have gained significant attention as potential solutions to our growing energy needs and environmental concerns. While solar and wind power offer clean alternatives to fossil fuels, they also present unique challenges. The intermittent nature of these sources requires sophisticated storage systems, and the initial infrastructure costs can be substantial. However, technological advances continue to improve efficiency and reduce costs, making renewable energy increasingly viable for widespread adoption.",
      imageUrl: null,
      audioUrl: null,
      writingPrompt: null,
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
    {
      id: "gre-quant-1",
      testId: "gre-quantitative-reasoning",
      questionText: "If x + y = 10 and x - y = 4, what is the value of x?",
      questionType: "multiple-choice",
      orderIndex: 1,
      options: {
        A: "3",
        B: "5",
        C: "7",
        D: "8",
        E: "9",
      },
      difficulty: "easy",
      correctAnswer: "C",
      explanation: "Solving the system: x + y = 10 and x - y = 4. Adding equations: 2x = 14, so x = 7.",
      points: 1,
      passage: null,
      imageUrl: null,
      audioUrl: null,
      writingPrompt: null,
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
    {
      id: "gre-quant-2",
      testId: "gre-quantitative-reasoning",
      questionText: "In the coordinate plane, what is the area of the triangle with vertices at (0,0), (4,0), and (2,6)?",
      questionType: "fill_blank",
      orderIndex: 2,
      options: undefined,
      difficulty: "medium",
      correctAnswer: "12",
      explanation: "Using the formula: Area = (1/2) × base × height = (1/2) × 4 × 6 = 12",
      points: 1,
      passage: null,
      imageUrl: null,
      audioUrl: null,
      writingPrompt: null,
      quantityA: null,
      quantityB: null,
      requiresImage: false,
      createdAt: new Date(),
    },
  ];

  for (const question of greQuestions) {
    questions.set(question.id, question as Question);
  }
}

function seedDefaultTestSets(testSets: Map<string, TestSet>, testSetComponents: Map<string, TestSetComponent>): void {
  const toeflTestSet: TestSet = {
    id: "toefl-full-set-1",
    title: "TOEFL iBT Complete Practice Test 1",
    examType: "toefl",
    testType: "toefl",
    description: "Full TOEFL iBT practice test with all four sections: Reading, Listening, Speaking, and Writing",
    totalDuration: 172,
    sectionOrder: ["reading", "listening", "speaking", "writing"],
    isActive: true,
    createdAt: new Date(),
  };
  testSets.set(toeflTestSet.id, toeflTestSet);

  const greTestSet: TestSet = {
    id: "gre-full-set-1",
    title: "GRE General Test Complete Practice Set 1",
    examType: "gre",
    testType: "toefl",
    description: "Complete GRE practice test with 2 Quantitative sections, 2 Verbal sections, and 1 Analytical Writing section",
    totalDuration: 150,
    sectionOrder: ["verbal", "quantitative", "verbal", "quantitative", "analytical"],
    isActive: true,
    createdAt: new Date(),
  };
  testSets.set(greTestSet.id, greTestSet);

  const components: TestSetComponent[] = [
    { id: randomUUID(), testSetId: "toefl-full-set-1", testId: "toefl-reading-1", orderIndex: 1, isRequired: true },
    { id: randomUUID(), testSetId: "toefl-full-set-1", testId: "toefl-listening-1", orderIndex: 2, isRequired: true },
    { id: randomUUID(), testSetId: "toefl-full-set-1", testId: "toefl-speaking-1", orderIndex: 3, isRequired: true },
    { id: randomUUID(), testSetId: "toefl-full-set-1", testId: "toefl-writing-1", orderIndex: 4, isRequired: true },
    { id: randomUUID(), testSetId: "gre-full-set-1", testId: "gre-writing-1", orderIndex: 1, isRequired: true },
    { id: randomUUID(), testSetId: "gre-full-set-1", testId: "gre-verbal-1", orderIndex: 2, isRequired: true },
    { id: randomUUID(), testSetId: "gre-full-set-1", testId: "gre-quantitative-1", orderIndex: 3, isRequired: true },
    { id: randomUUID(), testSetId: "gre-full-set-1", testId: "gre-verbal-2", orderIndex: 4, isRequired: true },
    { id: randomUUID(), testSetId: "gre-full-set-1", testId: "gre-quantitative-2", orderIndex: 5, isRequired: true },
  ];

  for (const component of components) {
    testSetComponents.set(component.id, component);
  }
}
