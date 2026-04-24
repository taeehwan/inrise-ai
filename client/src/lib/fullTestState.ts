export type FullTestSection = "reading" | "listening" | "speaking" | "writing";
export type FullTestViewSection = "intro" | FullTestSection | "complete";

export interface FullTestStateSnapshot {
  currentSection: FullTestViewSection;
  sectionIndex: number;
  completedSections: FullTestSection[];
  sectionScores: Record<FullTestSection, number | null>;
  startTime: string | null;
  elapsedTime: number;
  attemptId: string | null;
  totalScore?: number;
  cefrLevel?: string;
  traditionalScore?: number;
}

const FULL_TEST_STATE_KEY = "inrise:new-toefl-full-test-state";

const EMPTY_SECTION_SCORES: Record<FullTestSection, number | null> = {
  reading: null,
  listening: null,
  speaking: null,
  writing: null,
};

function isValidSection(value: unknown): value is FullTestSection {
  return value === "reading" || value === "listening" || value === "speaking" || value === "writing";
}

export function createEmptyFullTestState(): FullTestStateSnapshot {
  return {
    currentSection: "intro",
    sectionIndex: -1,
    completedSections: [],
    sectionScores: { ...EMPTY_SECTION_SCORES },
    startTime: null,
    elapsedTime: 0,
    attemptId: null,
  };
}

export function normalizeFullTestState(value: unknown): FullTestStateSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const currentSection = raw.currentSection;
  if (
    currentSection !== "intro" &&
    currentSection !== "complete" &&
    !isValidSection(currentSection)
  ) {
    return null;
  }

  const rawCompletedSections = Array.isArray(raw.completedSections) ? raw.completedSections : [];
  const completedSections = rawCompletedSections.filter(isValidSection);

  const rawSectionScores = raw.sectionScores as Record<string, unknown> | undefined;
  const sectionScores: Record<FullTestSection, number | null> = {
    reading: typeof rawSectionScores?.reading === "number" ? rawSectionScores.reading : null,
    listening: typeof rawSectionScores?.listening === "number" ? rawSectionScores.listening : null,
    speaking: typeof rawSectionScores?.speaking === "number" ? rawSectionScores.speaking : null,
    writing: typeof rawSectionScores?.writing === "number" ? rawSectionScores.writing : null,
  };

  return {
    currentSection,
    sectionIndex: typeof raw.sectionIndex === "number" ? raw.sectionIndex : -1,
    completedSections,
    sectionScores,
    startTime: typeof raw.startTime === "string" ? raw.startTime : null,
    elapsedTime: typeof raw.elapsedTime === "number" ? raw.elapsedTime : 0,
    attemptId: typeof raw.attemptId === "string" ? raw.attemptId : null,
    totalScore: typeof raw.totalScore === "number" ? raw.totalScore : undefined,
    cefrLevel: typeof raw.cefrLevel === "string" ? raw.cefrLevel : undefined,
    traditionalScore: typeof raw.traditionalScore === "number" ? raw.traditionalScore : undefined,
  };
}

export function loadFullTestState(): FullTestStateSnapshot | null {
  try {
    const stored = localStorage.getItem(FULL_TEST_STATE_KEY);
    if (!stored) return null;
    return normalizeFullTestState(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveFullTestState(state: FullTestStateSnapshot) {
  localStorage.setItem(FULL_TEST_STATE_KEY, JSON.stringify(state));
}

export function clearFullTestState() {
  localStorage.removeItem(FULL_TEST_STATE_KEY);
}
