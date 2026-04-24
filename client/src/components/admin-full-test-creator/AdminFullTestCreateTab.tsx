import { BookOpen, CheckCircle, Clock, FileText, Layers, Play, Sparkles, Target, Timer } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Test, TestSet } from "@shared/schema";
import { EXAM_SPECS, getSectionName, sortTestsByTitleOrDate, type TestSetForm } from "./shared";

interface Props {
  form: TestSetForm;
  setForm: React.Dispatch<React.SetStateAction<TestSetForm>>;
  availableTests: Test[];
  existingTestSets: TestSet[];
  onSubmit: (e: React.FormEvent) => void;
  createPending: boolean;
}

export default function AdminFullTestCreateTab({ form, setForm, availableTests, existingTestSets, onSubmit, createPending }: Props) {
  const filteredTests = availableTests.filter((test) => test.examType === form.examType && test.id != null);
  const selectedTestDetails = availableTests.filter((test) => form.selectedTests.includes(test.id) && test.id != null);
  const totalDuration = selectedTestDetails.reduce((sum, test) => sum + test.duration, 0);
  const currentSpec = EXAM_SPECS[form.examType];

  const handleTestToggle = (testId: string) => {
    setForm((prev) => ({
      ...prev,
      selectedTests: prev.selectedTests.includes(testId)
        ? prev.selectedTests.filter((id) => id !== testId)
        : [...prev.selectedTests, testId],
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <Label className="text-lg font-semibold text-white mb-4 block flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-400" />
            시험 유형 선택
          </Label>
          <div className="grid grid-cols-3 gap-4">
            {(Object.keys(EXAM_SPECS) as Array<keyof typeof EXAM_SPECS>).map((type) => {
              const spec = EXAM_SPECS[type];
              return (
                <button
                  key={type}
                  onClick={() => setForm((prev) => ({ ...prev, examType: type, selectedTests: [] }))}
                  className={`relative p-5 rounded-xl border-2 transition-all duration-300 ${
                    form.examType === type
                      ? `border-purple-500 bg-gradient-to-br ${spec.bgColor}`
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                  }`}
                  data-testid={`exam-type-${type}`}
                >
                  <div className="text-2xl mb-2">{type === "toefl" ? "📘" : type === "sat" ? "📗" : "📕"}</div>
                  <h3 className="font-bold text-white text-sm">{spec.name}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {spec.totalTime}분 · {spec.sections.length} 섹션
                  </p>
                  {form.examType === type && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-purple-400" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`bg-gradient-to-br ${currentSpec.bgColor} backdrop-blur-xl rounded-2xl border border-white/10 p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Timer className="h-5 w-5" />
              {currentSpec.name} 공식 규격
            </h3>
            <Badge className={`bg-gradient-to-r ${currentSpec.color} text-white border-0`}>총 {currentSpec.totalTime}분</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {currentSpec.sections.map((section, idx) => (
              <div key={idx} className="bg-black/20 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{section.icon}</div>
                <p className="text-xs font-medium text-white">{section.name}</p>
                <p className="text-xs text-gray-400">{section.time}분</p>
                <p className="text-xs text-gray-500">{section.questions}문항</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">풀테스트 기본 정보</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-gray-300 mb-2 block">테스트 제목</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={`예: ${currentSpec.name} 풀테스트 #1`}
                className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 rounded-xl"
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium text-gray-300 mb-2 block">테스트 설명</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="이 풀테스트에 대한 설명을 입력하세요..."
                rows={3}
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500 rounded-xl resize-none"
                data-testid="textarea-description"
              />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">테스트 선택</h3>
            <Badge variant="outline" className="ml-auto border-white/20 text-gray-300">
              {form.selectedTests.length}개 선택됨
            </Badge>
          </div>

          {filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <div className="mb-4 p-4 rounded-full bg-white/5 w-fit mx-auto">
                <BookOpen className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-gray-400">선택된 시험 유형에 대한 테스트가 없습니다.</p>
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Accordion type="multiple" className="space-y-2">
                {(() => {
                  const sectionGroups: Record<string, Test[]> = {};
                  filteredTests.forEach((test) => {
                    const section = test.section || "unknown";
                    if (!sectionGroups[section]) sectionGroups[section] = [];
                    sectionGroups[section].push(test);
                  });
                  const sectionOrder =
                    form.examType === "toefl"
                      ? ["reading", "listening", "speaking", "writing"]
                      : form.examType === "sat"
                        ? ["reading-writing", "math"]
                        : ["analytical", "verbal", "quantitative"];
                  const sortedSections = Object.keys(sectionGroups).sort((a, b) => {
                    const aIdx = sectionOrder.indexOf(a);
                    const bIdx = sectionOrder.indexOf(b);
                    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                  });

                  return sortedSections.map((section) => (
                    <AccordionItem key={section} value={section} className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/5 [&[data-state=open]]:bg-white/5">
                        <div className="flex items-center gap-3 w-full">
                          <div
                            className={`p-2 rounded-lg ${
                              section === "reading" || section === "reading-writing"
                                ? "bg-blue-500/20 text-blue-400"
                                : section === "listening"
                                  ? "bg-green-500/20 text-green-400"
                                  : section === "speaking"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : section === "writing"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : section === "math"
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : section === "analytical"
                                          ? "bg-pink-500/20 text-pink-400"
                                          : section === "verbal"
                                            ? "bg-indigo-500/20 text-indigo-400"
                                            : section === "quantitative"
                                              ? "bg-teal-500/20 text-teal-400"
                                              : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span className="text-white font-medium">{getSectionName(section)}</span>
                          <Badge className="ml-auto mr-2 bg-white/10 text-gray-300 border-0 text-xs">
                            {sectionGroups[section].length}개
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 pt-2">
                          {[...sectionGroups[section]].sort(sortTestsByTitleOrDate).map((test) => (
                            <div
                              key={test.id}
                              className={`group p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                                form.selectedTests.includes(test.id)
                                  ? "border-purple-500 bg-purple-500/10"
                                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                              }`}
                              onClick={() => handleTestToggle(test.id)}
                              data-testid={`test-option-${test.id}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 flex-shrink-0 ${form.selectedTests.includes(test.id) ? "border-purple-500 bg-purple-500" : "border-white/30"}`}>
                                    {form.selectedTests.includes(test.id) && <CheckCircle className="h-3 w-3 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-white text-sm truncate">{test.title}</h4>
                                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{test.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {test.duration}분
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(test.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ));
                })()}
              </Accordion>
            </div>
          )}
        </div>

        <Button
          onClick={onSubmit}
          disabled={!form.title || !form.description || form.selectedTests.length === 0 || createPending}
          className="w-full h-14 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-lg font-bold shadow-xl shadow-purple-500/25 rounded-xl transition-all duration-300 disabled:opacity-50"
          data-testid="button-create-test-set"
        >
          {createPending ? (
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              <span>생성 중...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" />
              <span>풀테스트 생성하기</span>
            </div>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 sticky top-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500">
              <Play className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">실시간 미리보기</h3>
          </div>
          <div className="space-y-6">
            <div className="bg-black/20 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">제목</p>
                <p className="text-white font-medium">{form.title || "제목을 입력하세요"}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`bg-gradient-to-r ${currentSpec.color} text-white border-0`}>{currentSpec.name}</Badge>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>{totalDuration}분</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-3">포함된 테스트 ({selectedTestDetails.length})</p>
              {selectedTestDetails.length === 0 ? (
                <div className="text-center py-6 bg-black/20 rounded-xl">
                  <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">테스트를 선택하세요</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedTestDetails.map((test, idx) => (
                    <div key={test.id} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{getSectionName(test.section)}</p>
                        <p className="text-xs text-gray-500 truncate">{test.title}</p>
                      </div>
                      <span className="text-xs text-gray-400">{test.duration}분</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">기존 풀테스트</h3>
          </div>
          {existingTestSets.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">등록된 풀테스트가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {existingTestSets.map((testSet) => (
                <div key={testSet.id} className="p-4 bg-black/20 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-white text-sm">{testSet.title}</h4>
                    <Badge className={`text-xs border-0 ${testSet.examType === "toefl" ? "bg-blue-500/20 text-blue-300" : testSet.examType === "sat" ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-500/20 text-purple-300"}`}>
                      {testSet.examType.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{testSet.description}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{Math.floor(testSet.totalDuration / 60)}시간 {testSet.totalDuration % 60}분</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
