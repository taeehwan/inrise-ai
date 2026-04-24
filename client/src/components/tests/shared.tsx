import { BookOpen, Brain, Calculator, Headphones, Mic, PenTool } from "lucide-react";
import type { Test } from "@shared/schema";

export const PORTAL_CSS = `
@keyframes bloomIn {
  0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
  100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
}
@keyframes cd1 {
  0%   { transform: translate(-50%,-50%) scale(1); }
  15%  { transform: translate(-42%,-56%) scale(1.3); }
  40%  { transform: translate(-56%,-44%) scale(1.15); }
  65%  { transform: translate(-44%,-52%) scale(1.4); }
  100% { transform: translate(-50%,-50%) scale(1); }
}
@keyframes cd2 {
  0%   { transform: translate(-50%,-50%) scale(1.1); }
  20%  { transform: translate(-60%,-42%) scale(1.25); }
  50%  { transform: translate(-40%,-58%) scale(1.15); }
  80%  { transform: translate(-52%,-46%) scale(1.3); }
  100% { transform: translate(-50%,-50%) scale(1.1); }
}
@keyframes cd3 {
  0%   { transform: translate(-50%,-50%) scale(1.2); }
  30%  { transform: translate(-44%,-54%) scale(1.1); }
  60%  { transform: translate(-56%,-46%) scale(1.35); }
  100% { transform: translate(-50%,-50%) scale(1.2); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.portal-wrap {
  background: #06060A;
  min-height: 100vh;
  padding: 60px 24px 80px;
  font-family: 'Sora', sans-serif;
}
.portal-inner { max-width: 900px; margin: 0 auto; }
.portal-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 60px;
  animation: fadeUp .4s ease-out both;
}
.portal-nav a { text-decoration: none; }
.portal-nav-link {
  font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 500;
  letter-spacing: .08em; text-transform: uppercase;
  color: rgba(255,255,255,.45);
  text-decoration: none; transition: color .2s;
}
.portal-nav-link:hover { color: rgba(255,255,255,.8); }
.portal-header { text-align: center; animation: fadeUp .5s ease-out both; }
.portal-title {
  font-family: 'Oswald', sans-serif;
  font-size: clamp(32px, 5vw, 44px);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #F4F4F5;
  margin: 0 0 12px;
}
.portal-subtitle {
  font-size: 15px;
  color: rgba(255,255,255,.45);
  margin: 0;
}
.portal-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-top: 48px;
}
@media (max-width: 800px) {
  .portal-grid { grid-template-columns: 1fr; }
}
.ptile {
  background: #0E0E12;
  border: 1px solid rgba(255,255,255,.05);
  border-radius: 18px;
  padding: 36px 28px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 280px;
  transition: border-color .5s cubic-bezier(.4,0,.2,1), transform .5s cubic-bezier(.4,0,.2,1), box-shadow .5s cubic-bezier(.4,0,.2,1);
  cursor: pointer;
  text-decoration: none;
  display: flex;
  flex-direction: column;
}
.ptile:nth-child(1) { animation: fadeUp .5s ease-out .1s both; }
.ptile:nth-child(2) { animation: fadeUp .5s ease-out .2s both; }
.ptile:nth-child(3) { animation: fadeUp .5s ease-out .3s both; }
.ptile:hover { border-color: rgba(255,255,255,.10); transform: translateY(-6px); }
.ptile.toefl:hover { box-shadow: 0 12px 50px rgba(0,50,160,.15); }
.ptile.gre:hover   { box-shadow: 0 12px 50px rgba(80,30,160,.15); }
.ptile.sat:hover   { box-shadow: 0 12px 50px rgba(160,20,40,.12); }
.pcloud {
  position: absolute; border-radius: 50%; opacity: 0;
  pointer-events: none; transition: opacity .6s ease;
  top: 50%; left: 50%;
}
.ptile:hover .pcloud { opacity: 1; }
.ptile:hover .pc1 { animation: bloomIn .5s ease-out forwards, cd1 12s ease-in-out .5s infinite; }
.ptile:hover .pc2 { animation: bloomIn .6s ease-out .1s forwards, cd2 15s ease-in-out .7s infinite; }
.ptile:hover .pc3 { animation: bloomIn .7s ease-out .2s forwards, cd3 18s ease-in-out .9s infinite; }
.ptile.toefl .pc1 { background: radial-gradient(circle, rgba(0,50,160,.45), transparent 65%); }
.ptile.toefl .pc2 { background: radial-gradient(circle, rgba(0,80,200,.35), transparent 65%); }
.ptile.toefl .pc3 { background: radial-gradient(circle, rgba(0,40,140,.3),  transparent 65%); }
.ptile.gre   .pc1 { background: radial-gradient(circle, rgba(80,30,160,.45),  transparent 65%); }
.ptile.gre   .pc2 { background: radial-gradient(circle, rgba(120,50,220,.35), transparent 65%); }
.ptile.gre   .pc3 { background: radial-gradient(circle, rgba(60,20,140,.3),   transparent 65%); }
.ptile.sat   .pc1 { background: radial-gradient(circle, rgba(160,20,40,.4),   transparent 65%); }
.ptile.sat   .pc2 { background: radial-gradient(circle, rgba(200,30,60,.3),   transparent 65%); }
.ptile.sat   .pc3 { background: radial-gradient(circle, rgba(140,15,35,.25),  transparent 65%); }
.ptile-content { position: relative; z-index: 3; display: flex; flex-direction: column; height: 100%; }
.ptile-icon {
  font-size: 22px;
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
  transition: transform .3s;
}
.ptile:hover .ptile-icon { transform: scale(1.05); }
.ptile.toefl .ptile-icon { background: rgba(0,136,221,.08); }
.ptile.gre   .ptile-icon { background: rgba(0,170,102,.08); }
.ptile.sat   .ptile-icon { background: rgba(221,51,68,.08); }
.ptile-name-row {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;
}
.ptile-name {
  font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 700;
  text-transform: uppercase; color: #F4F4F5; line-height: 1.1;
}
.ptile-badge {
  font-family: 'Bebas Neue', sans-serif; font-size: 11px;
  border-radius: 4px; padding: 2px 6px; margin-left: 7px;
  vertical-align: middle; letter-spacing: .05em;
}
.ptile.toefl .ptile-badge { background: rgba(0,187,255,.1);  color: rgba(0,187,255,.75); }
.ptile.gre   .ptile-badge { background: rgba(0,170,102,.1);  color: rgba(0,200,120,.75); }
.ptile.sat   .ptile-badge { background: rgba(221,51,68,.1);  color: rgba(221,80,90,.75); }
.ptile-count-box { text-align: right; }
.ptile-count {
  font-family: 'Bebas Neue', sans-serif; font-size: 42px; line-height: 1;
  transition: transform .3s;
}
.ptile:hover .ptile-count { transform: scale(1.05); }
.ptile.toefl .ptile-count { color: #0088DD; }
.ptile.gre   .ptile-count { color: #00AA66; }
.ptile.sat   .ptile-count { color: #DD3344; }
.ptile-count-label {
  font-family: 'Oswald', sans-serif; font-size: 9px;
  color: rgba(255,255,255,.38); text-transform: uppercase; letter-spacing: .12em;
}
.ptile-desc {
  font-size: 12px; color: rgba(255,255,255,.45);
  line-height: 1.7; margin-bottom: 16px;
}
.ptile-subjects {
  display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 20px;
}
.ptile-subj {
  font-family: 'Oswald', sans-serif; font-size: 9px; text-transform: uppercase;
  letter-spacing: .07em; padding: 3px 8px; border-radius: 4px;
  background: rgba(255,255,255,.025); color: rgba(255,255,255,.4);
  transition: background .25s, color .25s;
}
.ptile:hover .ptile-subj { background: rgba(255,255,255,.045); color: rgba(255,255,255,.65); }
.ptile-bottom {
  margin-top: auto; display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid rgba(255,255,255,.05); padding-top: 16px;
}
.ptile-enter {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,.55);
  letter-spacing: .02em;
}
.ptile-arrow {
  font-size: 16px; color: rgba(255,255,255,.35);
  transition: transform .25s, color .25s;
}
.ptile:hover .ptile-arrow { transform: translateX(4px); color: rgba(255,255,255,.8); }
`;

export const sectionIcons = {
  reading: BookOpen,
  listening: Headphones,
  speaking: Mic,
  writing: PenTool,
  verbal: Brain,
  quantitative: Calculator,
  analytical: PenTool,
} as const;

export const sectionColors = {
  reading: "from-purple-500 to-purple-600",
  listening: "from-pink-500 to-pink-600",
  speaking: "from-teal-500 to-teal-600",
  writing: "from-indigo-500 to-indigo-600",
  verbal: "from-purple-600 to-purple-700",
  quantitative: "from-indigo-600 to-indigo-700",
  analytical: "from-violet-600 to-fuchsia-600",
} as const;

export const sectionBgColors = {
  reading: "from-purple-50 to-purple-100",
  listening: "from-pink-50 to-pink-100",
  speaking: "from-teal-50 to-teal-100",
  writing: "from-indigo-50 to-indigo-100",
  verbal: "from-purple-50 to-purple-100",
  quantitative: "from-indigo-50 to-indigo-100",
  analytical: "from-violet-50 to-fuchsia-50",
} as const;

export const sectionGradients = {
  reading: "from-purple-500 to-purple-600",
  listening: "from-pink-500 to-pink-600",
  speaking: "from-teal-500 to-teal-600",
  writing: "from-indigo-500 to-indigo-600",
  verbal: "from-purple-600 to-purple-700",
  quantitative: "from-indigo-600 to-indigo-700",
  analytical: "from-violet-600 to-fuchsia-600",
} as const;

export const sectionBgGradients = {
  reading: "from-purple-50 to-purple-100",
  listening: "from-pink-50 to-pink-100",
  speaking: "from-teal-50 to-teal-100",
  writing: "from-indigo-50 to-indigo-100",
  verbal: "from-purple-50 to-purple-100",
  quantitative: "from-indigo-50 to-indigo-100",
  analytical: "from-violet-50 to-fuchsia-50",
} as const;

export const sectionButtonStyles = {
  reading: "bg-purple-600 text-white hover:bg-purple-500 border-purple-500",
  listening: "bg-pink-600 text-white hover:bg-pink-500 border-pink-500",
  speaking: "bg-teal-600 text-white hover:bg-teal-500 border-teal-500",
  writing: "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-500",
  verbal: "bg-purple-600 text-white hover:bg-purple-500 border-purple-500",
  quantitative: "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-500",
  analytical: "bg-violet-600 text-white hover:bg-violet-500 border-violet-500",
} as const;

export const sectionMetadata = {
  reading: { title: "Reading", korean: "읽기", description: "학술 지문 읽기 및 이해력 평가", time: "60분" },
  listening: { title: "Listening", korean: "듣기", description: "강의 및 대화 듣기 및 이해력 평가", time: "60분" },
  speaking: { title: "Speaking", korean: "말하기", description: "독립형 및 통합형 말하기 과제", time: "20분" },
  writing: { title: "Writing", korean: "쓰기", description: "독립형 및 통합형 쓰기 과제", time: "50분" },
  verbal: { title: "Verbal Reasoning", korean: "언어추론", description: "어휘 및 논리적 사고력 평가", time: "60분" },
  quantitative: { title: "Quantitative Reasoning", korean: "수리추론", description: "수학적 문제해결능력 평가", time: "70분" },
  analytical: { title: "Analytical Writing", korean: "분석적 글쓰기", description: "논리적 분석 및 논증 글쓰기", time: "60분" },
} as const;

export type SectionKey = keyof typeof sectionMetadata;

export function getTestLink(test: Test): string {
  const isTestSet = test.id && test.id.startsWith("testset-");
  if (isTestSet) return `/test-taking/${test.id}`;

  if (test.examType === "toefl") {
    switch (test.section) {
      case "reading":
        return `/toefl-reading?testId=${test.id}`;
      case "listening":
        return `/toefl-listening?testId=${test.id}`;
      case "speaking":
        return `/toefl-speaking?testId=${test.id}`;
      case "writing":
        return `/toefl-writing?testId=${test.id}`;
      default:
        return "/tests";
    }
  }

  if (test.examType === "gre") {
    switch (test.section) {
      case "analytical":
        return "/gre/analytical-writing";
      case "verbal":
        return "/gre/verbal-reasoning";
      case "quantitative":
        return "/gre/quantitative-reasoning";
      default:
        return "/gre";
    }
  }

  return "/tests";
}
