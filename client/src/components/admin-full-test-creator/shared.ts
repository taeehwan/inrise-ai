import type { Test } from "@shared/schema";

export interface TestSetForm {
  title: string;
  examType: "toefl" | "gre" | "sat";
  description: string;
  selectedTests: string[];
}

export interface TestAuditLog {
  id: string;
  testId: string;
  testTitle: string;
  testType: string;
  examType: string;
  section: string | null;
  action: string;
  adminId: string;
  adminEmail: string;
  previousState: any;
  newState: any;
  reason: string | null;
  metadata: any;
  createdAt: string;
}

export const EXAM_SPECS = {
  toefl: {
    name: "2026 NEW TOEFL iBT",
    totalTime: 88,
    sections: [
      { name: "Reading", time: 27, questions: "35-48", icon: "📖" },
      { name: "Listening", time: 30, questions: "35-50", icon: "🎧" },
      { name: "Writing", time: 23, questions: "~12", icon: "✍️" },
      { name: "Speaking", time: 8, questions: "11", icon: "🎤" },
    ],
    color: "from-blue-500 to-cyan-500",
    bgColor: "from-blue-500/20 to-cyan-500/20",
  },
  sat: {
    name: "Digital SAT 2024-2025",
    totalTime: 134,
    sections: [
      { name: "R&W Module 1", time: 32, questions: "27", icon: "📝" },
      { name: "R&W Module 2", time: 32, questions: "27", icon: "📝" },
      { name: "Break", time: 10, questions: "-", icon: "☕" },
      { name: "Math Module 1", time: 35, questions: "22", icon: "🔢" },
      { name: "Math Module 2", time: 35, questions: "22", icon: "🔢" },
    ],
    color: "from-emerald-500 to-teal-500",
    bgColor: "from-emerald-500/20 to-teal-500/20",
  },
  gre: {
    name: "GRE General 2024",
    totalTime: 118,
    sections: [
      { name: "Analytical Writing", time: 30, questions: "1 essay", icon: "📄" },
      { name: "Verbal 1", time: 18, questions: "12", icon: "📚" },
      { name: "Verbal 2", time: 23, questions: "15", icon: "📚" },
      { name: "Quantitative 1", time: 21, questions: "12", icon: "📊" },
      { name: "Quantitative 2", time: 26, questions: "15", icon: "📊" },
    ],
    color: "from-purple-500 to-pink-500",
    bgColor: "from-purple-500/20 to-pink-500/20",
  },
} as const;

export function getSectionName(section: string) {
  const names: Record<string, string> = {
    reading: "리딩",
    listening: "리스닝",
    speaking: "스피킹",
    writing: "라이팅",
    verbal: "언어추론",
    quantitative: "수리추론",
    analytical: "분석적 글쓰기",
    math: "수학",
    "reading-writing": "독해 & 작문",
  };
  return names[section] || section;
}

export function sortTestsByTitleOrDate(a: Test, b: Test) {
  const extractNum = (title: string) => {
    const match = title.match(/#(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const numA = extractNum(a.title);
  const numB = extractNum(b.title);
  if (numA > 0 && numB > 0) return numA - numB;
  if (numA > 0) return -1;
  if (numB > 0) return 1;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
