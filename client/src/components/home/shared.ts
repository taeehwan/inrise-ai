export const successReviews = [
  {
    name: "장오선",
    school: "학생",
    period: "약 4개월",
    before: null as number | null,
    after: 120,
    text: "TOEFL은 학생의 재능을 측정하는 시험이 아니라, 정확한 방향을 알려주시는 전문성 있는 선생님을 만나면 빛을 발하는 시험이라는 것입니다. 선생님께서 제시해 주신 방식 그대로만 따라갔을 뿐인데, 점수는 자연스럽게 따라왔습니다.",
  },
  {
    name: "김호연",
    school: "일본 최상위권 국립대학교",
    period: "1.5개월",
    before: 65,
    after: 95,
    text: '예상보다 빨리 토플을 졸업할 수 있어서 기분이 아주 좋습니다. 토플 공부를 하면서 "과연 내가 해낼 수 있을까?"라는 의문을 수없이 품었지만, 이 과정을 통해 해낼 수 있었습니다.',
  },
  {
    name: "이승찬",
    school: "POSTECH",
    period: "1개월",
    before: 101,
    after: 112,
    text: "수업 시간때 하는 문제 풀이로 궁금한건 바로 질문해서 의문점이 해소가 되는게 좋았습니다.",
  },
  {
    name: "배주호",
    school: "KAIST",
    period: "3회 수업",
    before: 96,
    after: 110,
    text: "즉각적인 피드백과 잘 정돈된 문제 해결 방법 덕분에 극적인 성장을 할 수 있었습니다.",
  },
  {
    name: "김민석",
    school: "서울대학교",
    period: "3주",
    before: 89,
    after: 106,
    text: "꼼꼼한 숙제 양식과 연습하기 충분한 숙제 자료들, 즉각적인 피드백 덕분에 Speaking & Writing에서 큰 도움을 받았습니다.",
  },
];

export type ActivityEvent = {
  id: string;
  eventType: "test_complete" | "full_test_complete" | "personal_best" | "streak" | "first_test";
  section?: string | null;
  score?: number | null;
  streakDays?: number | null;
  displayName: string;
  isHighlight?: boolean;
  createdAt: string;
};

export const EVENT_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  test_complete: { icon: "✓", color: "#00E87B", label: "Test Complete" },
  full_test_complete: { icon: "◉", color: "#00BBFF", label: "Full Test" },
  personal_best: { icon: "★", color: "#FFB800", label: "신기록" },
  streak: { icon: "🔥", color: "#A78BFA", label: "Streak" },
  first_test: { icon: "🎉", color: "#F472B6", label: "첫 도전" },
};

export const SECTION_LABEL: Record<string, string> = {
  reading: "READING",
  listening: "LISTENING",
  speaking: "SPEAKING",
  writing: "WRITING",
};

export function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "방금";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
