import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Loader2, BarChart3, Star } from "lucide-react";
import {
  AIGeneratedPlanResult,
  sectionLabels,
  sectionOptions,
  StudyPlanFormData,
  StudyPlanPerformanceSummary,
  studyPlanFormSchema,
} from "./shared";

interface StudyPlanCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (planId: string, plan: AIGeneratedPlanResult) => void;
}

export default function StudyPlanCreateDialog({
  open,
  onOpenChange,
  onGenerated,
}: StudyPlanCreateDialogProps) {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<StudyPlanFormData>({
    resolver: zodResolver(studyPlanFormSchema),
    defaultValues: {
      examType: "toefl",
      duration: 12,
      weeklyHours: 10,
      focusAreas: [],
      learningStyle: "balanced",
      preferredTimeSlot: "evening",
      weaknessDetails: "",
      sectionScores: {
        reading: undefined,
        listening: undefined,
        speaking: undefined,
        writing: undefined,
        verbal: undefined,
        quantitative: undefined,
        analytical: undefined,
      },
      sectionPriorities: {
        reading: undefined,
        listening: undefined,
        speaking: undefined,
        writing: undefined,
        verbal: undefined,
        quantitative: undefined,
        analytical: undefined,
      },
    },
  });

  const watchedExamType = form.watch("examType");

  const { data: performanceSummary } = useQuery<StudyPlanPerformanceSummary>({
    queryKey: ["/api/performance-summary", watchedExamType],
    enabled: open && !!watchedExamType,
  });

  useEffect(() => {
    if (!performanceSummary || !performanceSummary.sectionAnalysis || !open) {
      return;
    }

    const newSectionScores: Record<string, number | undefined> = {};
    const newSectionPriorities: Record<string, number | undefined> = {};

    performanceSummary.sectionAnalysis.forEach((analysis) => {
      if (analysis.average !== null) {
        newSectionScores[analysis.section] = Math.round(analysis.average);
      }
      newSectionPriorities[analysis.section] = analysis.priority;
    });

    if (Object.keys(newSectionScores).length > 0) {
      form.setValue("sectionScores", newSectionScores as StudyPlanFormData["sectionScores"]);
      form.setValue("sectionPriorities", newSectionPriorities as StudyPlanFormData["sectionPriorities"]);

      if (performanceSummary.estimatedCurrentScore > 0) {
        form.setValue("currentScore", Math.round(performanceSummary.estimatedCurrentScore));
      }

      if (performanceSummary.weakestSections.length > 0) {
        form.setValue("focusAreas", performanceSummary.weakestSections);
      }
    }
  }, [form, open, performanceSummary]);

  const generateAIPlan = async (data: StudyPlanFormData) => {
    setIsGenerating(true);
    try {
      const requestData = {
        ...data,
        language: language as "ko" | "ja" | "en" | "th",
      };

      const response = await apiRequest("POST", "/api/study-plans/generate-ai", requestData);
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/study-plans/user"] });
      onGenerated(result.id, result.aiPlan);
      onOpenChange(false);
      form.reset();

      toast({
        title: "🎯 학습 계획이 생성되었습니다!",
        description: "맞춤형 커리큘럼을 확인해보세요.",
      });
    } catch (error: any) {
      toast({
        title: "계획 생성 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = (data: StudyPlanFormData) => {
    generateAIPlan(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50 border-0 shadow-2xl">
        <DialogHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            최단기 점수달성 학습 계획 생성
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-600 mt-2">
            목표 점수와 학습 스타일을 분석하여 <span className="font-semibold text-blue-600">개인화된 로드맵</span>을 만들어드립니다
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {performanceSummary && performanceSummary.totalAttempts > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">학습 성과 분석 (자동 연동)</h4>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {performanceSummary.totalAttempts}개 시험 분석됨
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {performanceSummary.sectionAnalysis.slice(0, 4).map((analysis) => (
                    <div
                      key={analysis.section}
                      className={`p-2 rounded-lg ${
                        analysis.status === "weak"
                          ? "bg-red-50 border border-red-200"
                          : analysis.status === "strong"
                            ? "bg-green-50 border border-green-200"
                            : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="text-xs text-gray-500 capitalize">{analysis.section}</div>
                      <div className="font-bold text-lg">
                        {analysis.average !== null ? analysis.average.toFixed(1) : "-"}
                      </div>
                      <div
                        className={`text-xs ${
                          analysis.status === "weak"
                            ? "text-red-600"
                            : analysis.status === "strong"
                              ? "text-green-600"
                              : "text-gray-500"
                        }`}
                      >
                        {analysis.status === "weak"
                          ? "개선 필요"
                          : analysis.status === "strong"
                            ? "목표 근접"
                            : analysis.status === "no_data"
                              ? "데이터 없음"
                              : "보통"}
                      </div>
                    </div>
                  ))}
                </div>

                {performanceSummary.weakestSections.length > 0 && (
                  <div className="text-sm text-blue-700 bg-blue-100 rounded-lg p-2">
                    <strong>자동 추천:</strong> {performanceSummary.weakestSections.join(", ")} 섹션에 집중하는 학습 계획이 준비되었습니다.
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학습 계획 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="예: TOEFL 100점 도전" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="examType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시험 유형</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="시험을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="toefl">TOEFL</SelectItem>
                        <SelectItem value="gre">GRE</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>현재 점수 (선택사항)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="80"
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || undefined)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>목표 점수</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학습 기간 (주)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12"
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weeklyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주간 학습 시간</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10"
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="focusAreas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>집중 학습 영역</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {sectionOptions[watchedExamType].map((section) => (
                      <div key={section} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={section}
                          checked={field.value?.includes(section) || false}
                          onChange={(e) => {
                            const nextValue = e.target.checked
                              ? [...(field.value || []), section]
                              : field.value?.filter((value) => value !== section) || [];
                            field.onChange(nextValue);
                          }}
                        />
                        <label htmlFor={section} className="text-sm">
                          {sectionLabels[section]}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                섹션별 현재 점수 (선택사항)
              </h4>
              <p className="text-xs text-gray-500 mb-3">각 섹션의 현재 점수를 입력하면 더 정확한 학습계획이 생성됩니다</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sectionOptions[watchedExamType].map((section) => (
                  <div key={`score-${section}`} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {sectionLabels[section]}
                    </label>
                    <Input
                      type="number"
                      placeholder={watchedExamType === "toefl" ? "0-30" : section === "analytical" ? "0-6" : "130-170"}
                      min={0}
                      max={watchedExamType === "toefl" ? 30 : section === "analytical" ? 6 : 170}
                      className="h-9 text-sm"
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value, 10) : undefined;
                        const currentScores = form.getValues("sectionScores") || {};
                        form.setValue("sectionScores", { ...currentScores, [section]: value });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
              <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" />
                섹션별 우선순위 (선택사항)
              </h4>
              <p className="text-xs text-gray-500 mb-3">1=가장 중요, {watchedExamType === "toefl" ? "4" : "3"}=가장 낮음. 우선순위가 높은 섹션에 더 많은 학습시간이 배정됩니다</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sectionOptions[watchedExamType].map((section) => (
                  <div key={`priority-${section}`} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {sectionLabels[section]}
                    </label>
                    <Select
                      onValueChange={(value) => {
                        const currentPriorities = form.getValues("sectionPriorities") || {};
                        form.setValue("sectionPriorities", { ...currentPriorities, [section]: parseInt(value, 10) });
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: watchedExamType === "toefl" ? 4 : 3 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}순위 {i === 0 ? "🔥" : i === 1 ? "⭐" : i === 2 ? "📚" : "📖"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100">
              <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                개인화 옵션
              </h4>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="learningStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>학습 스타일</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="학습 스타일 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="intensive">집중형 (짧은 시간 고강도)</SelectItem>
                          <SelectItem value="balanced">균형형 (규칙적인 학습)</SelectItem>
                          <SelectItem value="relaxed">여유형 (꾸준한 복습 중심)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredTimeSlot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>선호 학습 시간대</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="시간대 선택" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="morning">오전 (6시-12시)</SelectItem>
                          <SelectItem value="afternoon">오후 (12시-18시)</SelectItem>
                          <SelectItem value="evening">저녁 (18시-22시)</SelectItem>
                          <SelectItem value="night">밤 (22시-2시)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="weaknessDetails"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>현재 어려움/약점 설명 (선택사항)</FormLabel>
                    <FormControl>
                      <textarea
                        className="w-full min-h-[80px] p-3 text-sm border rounded-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
                        placeholder="예: 리스닝에서 빠른 대화 파악이 어렵고, 스피킹에서 아이디어 정리가 힘듭니다..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    계획 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    학습 계획 생성
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
