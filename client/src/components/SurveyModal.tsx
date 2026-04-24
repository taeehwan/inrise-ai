import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { X, Star, ChevronRight, ChevronLeft, CheckCircle2, Gift } from "lucide-react";

// ─── Survey question definitions ─────────────────────────────────────
const MAIN_FEATURES = [
  { value: 'reading',   label: 'TOEFL Reading' },
  { value: 'listening', label: 'TOEFL Listening' },
  { value: 'speaking',  label: 'TOEFL Speaking' },
  { value: 'writing',   label: 'TOEFL Writing' },
  { value: 'fulltest',  label: 'New TOEFL 풀테스트' },
  { value: 'gre',       label: 'GRE' },
];

const IMPROVEMENTS = [
  { value: 'variety',   label: '문제 수·다양성' },
  { value: 'feedback',  label: 'AI 피드백 상세도' },
  { value: 'design',    label: '인터페이스·디자인' },
  { value: 'audio',     label: '오디오 품질' },
  { value: 'analytics', label: '성적 분석 기능' },
  { value: 'mobile',    label: '모바일 최적화' },
];

type Answers = {
  nps: number | null;
  aiFeedbackRating: number | null;
  similarityRating: number | null;
  mainFeature: string | null;
  improvements: string[];
  comment: string;
};

const STEPS = 6;

// ─── Sub-components ───────────────────────────────────────────────────
function NpsRow({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap justify-center">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} onClick={() => onChange(i)}
            className={`w-9 h-9 rounded-lg text-sm font-bold transition-all border ${
              value === i
                ? 'bg-indigo-500 border-indigo-400 text-white scale-110 shadow-lg'
                : 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-indigo-400 hover:text-white'
            }`}>
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500 px-1">
        <span>전혀 아니요</span><span>매우 그렇습니다</span>
      </div>
    </div>
  );
}

function StarRow({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(null)}
          className="transition-all">
          <Star className={`h-9 w-9 transition-all ${
            (hover ?? value ?? 0) >= s ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-600'
          }`} />
        </button>
      ))}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────
interface Props {
  surveyId: string;
  onClose: (never?: boolean) => void;
}

export default function SurveyModal({ surveyId, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>({
    nps: null,
    aiFeedbackRating: null,
    similarityRating: null,
    mainFeature: null,
    improvements: [],
    comment: '',
  });

  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/survey/respond", { surveyId, answers }),
    onSuccess: async (res) => {
      const data = await res.json();
      setNewBalance(data.newBalance ?? null);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/survey/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/credits'] });
    },
  });

  const setA = (key: keyof Answers, value: any) => setAnswers(prev => ({ ...prev, [key]: value }));

  const toggleImprovement = (val: string) => {
    setAnswers(prev => ({
      ...prev,
      improvements: prev.improvements.includes(val)
        ? prev.improvements.filter(v => v !== val)
        : [...prev.improvements, val],
    }));
  };

  const canProceed = () => {
    if (step === 0) return answers.nps !== null;
    if (step === 1) return answers.aiFeedbackRating !== null;
    if (step === 2) return answers.similarityRating !== null;
    if (step === 3) return answers.mainFeature !== null;
    if (step === 4) return answers.improvements.length > 0;
    return true; // step 5: comment is optional
  };

  const steps = [
    {
      q: '인라이즈를 친구나 동료에게 추천하실 의향이 있으신가요?',
      hint: '0 = 전혀 아니요, 10 = 매우 추천합니다',
      node: <NpsRow value={answers.nps} onChange={v => setA('nps', v)} />,
    },
    {
      q: 'AI 피드백의 품질에 얼마나 만족하시나요?',
      hint: '별점 1~5개로 평가해 주세요',
      node: <StarRow value={answers.aiFeedbackRating} onChange={v => setA('aiFeedbackRating', v)} label="AI 피드백 만족도" />,
    },
    {
      q: '시험 문제가 실제 시험과 얼마나 유사하다고 느끼시나요?',
      hint: '별점 1~5개로 평가해 주세요',
      node: <StarRow value={answers.similarityRating} onChange={v => setA('similarityRating', v)} label="실제 시험 유사도" />,
    },
    {
      q: '주로 어떤 기능을 사용하시나요?',
      hint: '하나만 선택해 주세요',
      node: (
        <div className="grid grid-cols-2 gap-2">
          {MAIN_FEATURES.map(f => (
            <button key={f.value} onClick={() => setA('mainFeature', f.value)}
              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${
                answers.mainFeature === f.value
                  ? 'bg-indigo-500 border-indigo-400 text-white'
                  : 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-indigo-400/50 hover:text-white'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      q: '어떤 부분이 개선되었으면 하시나요?',
      hint: '여러 개 선택 가능합니다',
      node: (
        <div className="grid grid-cols-2 gap-2">
          {IMPROVEMENTS.map(imp => {
            const selected = answers.improvements.includes(imp.value);
            return (
              <button key={imp.value} onClick={() => toggleImprovement(imp.value)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 ${
                  selected
                    ? 'bg-indigo-500 border-indigo-400 text-white'
                    : 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-indigo-400/50 hover:text-white'
                }`}>
                <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${selected ? 'bg-white border-white' : 'border-slate-500'}`}>
                  {selected && <div className="w-2 h-2 bg-indigo-500 rounded-sm" />}
                </div>
                {imp.label}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      q: '추가로 하고 싶은 말씀이 있으신가요?',
      hint: '선택 사항입니다 — 자유롭게 작성해 주세요',
      node: (
        <Textarea
          value={answers.comment}
          onChange={e => setA('comment', e.target.value)}
          placeholder="플랫폼에 대한 솔직한 의견을 남겨 주세요..."
          className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 resize-none h-28 focus-visible:ring-indigo-500"
        />
      ),
    },
  ];

  const current = steps[step];
  const progress = ((step + (submitted ? 1 : 0)) / STEPS) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose()} />

      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-slate-800">
          <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">인라이즈 설문</span>
            {!submitted && <span className="text-[10px] text-slate-500">{step + 1}/{STEPS}</span>}
          </div>
          <div className="flex items-center gap-2">
            {!submitted && (
              <button onClick={() => onClose()} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-white/5">
                나중에
              </button>
            )}
            <button onClick={() => onClose(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          {submitted ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">감사합니다!</h2>
              <p className="text-sm text-slate-400 mb-5">소중한 의견이 인라이즈를 더 좋게 만드는 데 도움이 됩니다.</p>
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-5">
                <Gift className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-bold text-amber-300">크레딧 50개 지급!</p>
                  {newBalance != null && (
                    <p className="text-[11px] text-amber-400/70">현재 잔액: {newBalance} 크레딧</p>
                  )}
                </div>
              </div>
              <Button onClick={() => onClose(true)}
                className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold">
                확인
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-5 min-h-[80px]">
                <h2 className="text-base font-bold text-white mb-1 leading-snug">{current.q}</h2>
                <p className="text-[11px] text-slate-500">{current.hint}</p>
              </div>

              <div className="mb-6">{current.node}</div>

              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="ghost" onClick={() => setStep(s => s - 1)}
                    className="flex-shrink-0 text-slate-400 hover:text-white hover:bg-white/8 gap-1">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}

                {step < STEPS - 1 ? (
                  <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold disabled:opacity-40 gap-1">
                    다음 <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-bold gap-1">
                    {submitMutation.isPending ? (
                      <><span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4 inline-block" /> 제출 중...</>
                    ) : (
                      <><Gift className="h-4 w-4" /> 제출하고 크레딧 50개 받기</>
                    )}
                  </Button>
                )}
              </div>

              {submitMutation.isError && (
                <p className="text-red-400 text-xs text-center mt-2">제출 중 오류가 발생했습니다. 다시 시도해 주세요.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
