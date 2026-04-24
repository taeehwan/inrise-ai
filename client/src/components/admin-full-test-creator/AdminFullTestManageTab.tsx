import type { Test, TestSet } from "@shared/schema";
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, Clock, Layers, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { sortTestsByTitleOrDate } from "./shared";

interface Props {
  availableTests: Test[];
  existingTestSets: TestSet[];
  activeExamTab: "toefl" | "new-toefl" | "sat" | "gre";
  setActiveExamTab: React.Dispatch<React.SetStateAction<"toefl" | "new-toefl" | "sat" | "gre">>;
  expandedSections: Record<string, boolean>;
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedTestIds: Set<string>;
  setSelectedTestIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  showBulkDeleteDialog: boolean;
  setShowBulkDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onEditTest: (test: Test) => void;
  onDeleteTest: (test: Test) => void;
  onRestoreTest: (testId: string) => void;
  onDeleteTestSet: (testSetId: string) => void;
  bulkDeletePending: boolean;
  onBulkDelete: (testIds: string[]) => void;
}

export default function AdminFullTestManageTab({
  availableTests,
  existingTestSets,
  activeExamTab,
  setActiveExamTab,
  expandedSections,
  setExpandedSections,
  selectedTestIds,
  setSelectedTestIds,
  showBulkDeleteDialog,
  setShowBulkDeleteDialog,
  onEditTest,
  onDeleteTest,
  onRestoreTest,
  onDeleteTestSet,
  bulkDeletePending,
  onBulkDelete,
}: Props) {
  const allTests = availableTests.filter((test) => test.id && !test.id.startsWith("testset-"));
  const sectionLabels: Record<string, string> = {
    reading: "📖 Reading",
    listening: "🎧 Listening",
    speaking: "🎤 Speaking",
    writing: "✍️ Writing",
    verbal: "📚 Verbal Reasoning",
    quantitative: "🔢 Quantitative Reasoning",
    analytical: "📄 Analytical Writing",
    math: "🧮 Math",
    "reading-writing": "📝 Reading & Writing",
    기타: "📁 기타",
  };
  const sectionOrder = ["reading", "listening", "speaking", "writing", "verbal", "quantitative", "analytical", "math", "reading-writing", "기타"];
  const examTabConfigs = [
    { value: "toefl", label: "TOEFL", color: "from-blue-500 to-cyan-500", filter: (t: Test) => t.examType === "toefl" },
    { value: "new-toefl", label: "NEW TOEFL", color: "from-cyan-500 to-teal-500", filter: (t: Test) => (t.examType as string) === "new-toefl" },
    { value: "sat", label: "SAT", color: "from-emerald-500 to-green-500", filter: (t: Test) => (t.examType as string) === "sat" },
    { value: "gre", label: "GRE", color: "from-purple-500 to-pink-500", filter: (t: Test) => t.examType === "gre" },
  ] as const;

  const currentConfig = examTabConfigs.find((c) => c.value === activeExamTab);
  const filteredTests = currentConfig ? allTests.filter(currentConfig.filter) : allTests;
  const sectionGroups: Record<string, Test[]> = {};
  filteredTests.forEach((test) => {
    const sectionKey = (test.section || "").toLowerCase() || "기타";
    if (!sectionGroups[sectionKey]) sectionGroups[sectionKey] = [];
    sectionGroups[sectionKey].push(test);
  });
  const sortedSections = Object.keys(sectionGroups).sort((a, b) => {
    const aIndex = sectionOrder.indexOf(a);
    const bIndex = sectionOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <div className="space-y-6">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">개별 테스트 관리</h3>
            <p className="text-sm text-gray-400">생성된 개별 테스트들을 관리하고 삭제할 수 있습니다</p>
          </div>
        </div>

        {allTests.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500">생성된 테스트가 없습니다</p>
          </div>
        ) : (
          <div className="flex flex-col h-[600px]">
            <div className="flex gap-2 mb-4">
              {examTabConfigs.map((config) => {
                const count = allTests.filter(config.filter).length;
                const isActive = activeExamTab === config.value;
                return (
                  <button
                    key={config.value}
                    onClick={() => setActiveExamTab(config.value)}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                      isActive ? `bg-gradient-to-r ${config.color} text-white shadow-lg` : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {config.label}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-white/20" : "bg-white/10"}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            {selectedTestIds.size > 0 && (
              <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-red-300 font-medium">{selectedTestIds.size}개 선택됨</span>
                  <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white text-xs" onClick={() => setSelectedTestIds(new Set())}>
                    선택 해제
                  </Button>
                </div>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setShowBulkDeleteDialog(true)} disabled={bulkDeletePending}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  {bulkDeletePending ? "삭제 중..." : `${selectedTestIds.size}개 일괄 삭제`}
                </Button>
              </div>
            )}

            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogContent className="bg-[#0D1326] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-white">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    일괄 삭제 확인
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    선택한 {selectedTestIds.size}개의 테스트를 삭제하시겠습니까? 이 작업은 되돌릴 수 있습니다 (복원 가능).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/10 border-white/10 text-gray-300 hover:bg-white/20">취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onBulkDelete(Array.from(selectedTestIds))} className="bg-red-600 hover:bg-red-700">
                    {selectedTestIds.size}개 삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {filteredTests.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">해당 시험 유형의 테스트가 없습니다</p>
                </div>
              ) : (
                sortedSections.map((sectionKey) => {
                  const sectionTests = sectionGroups[sectionKey];
                  const collapseKey = `${activeExamTab}-${sectionKey}`;
                  const isExpanded = expandedSections[collapseKey] !== false;
                  return (
                    <Collapsible key={sectionKey} open={isExpanded} onOpenChange={(open) => setExpandedSections((prev) => ({ ...prev, [collapseKey]: open }))}>
                      <div className="bg-black/10 rounded-xl border border-white/5 overflow-hidden">
                        <div className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-500 bg-transparent accent-red-500 cursor-pointer"
                              checked={(() => {
                                const activeTests = sectionTests.filter((t) => t.isActive !== false);
                                return activeTests.length > 0 && activeTests.every((t) => selectedTestIds.has(t.id));
                              })()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const activeTests = sectionTests.filter((t) => t.isActive !== false);
                                if (activeTests.length === 0) return;
                                const allSelected = activeTests.every((t) => selectedTestIds.has(t.id));
                                setSelectedTestIds((prev) => {
                                  const next = new Set(prev);
                                  activeTests.forEach((t) => {
                                    if (allSelected) next.delete(t.id);
                                    else next.add(t.id);
                                  });
                                  return next;
                                });
                              }}
                            />
                            <CollapsibleTrigger className="flex items-center gap-2 flex-1">
                              {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                              <span className="font-medium text-white">{sectionLabels[sectionKey] || sectionKey}</span>
                            </CollapsibleTrigger>
                          </div>
                          <Badge className="bg-white/10 text-gray-300 border-0">{sectionTests.length}개 테스트</Badge>
                        </div>

                        <CollapsibleContent>
                          <div className="p-4 pt-0 space-y-3">
                            {[...sectionTests].sort(sortTestsByTitleOrDate).map((test) => {
                              const isTestActive = test.isActive !== false;
                              return (
                                <div
                                  key={test.id}
                                  className={`p-4 rounded-xl border ${
                                    selectedTestIds.has(test.id)
                                      ? "bg-red-500/5 border-red-500/20"
                                      : isTestActive
                                        ? "bg-black/20 border-white/5"
                                        : "bg-black/40 border-red-500/20 opacity-60"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      {isTestActive && (
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 rounded border-gray-500 bg-transparent accent-red-500 cursor-pointer flex-shrink-0"
                                          checked={selectedTestIds.has(test.id)}
                                          onChange={() => {
                                            setSelectedTestIds((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(test.id)) next.delete(test.id);
                                              else next.add(test.id);
                                              return next;
                                            });
                                          }}
                                        />
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className={`font-medium ${isTestActive ? "text-white" : "text-gray-400"}`}>{test.title}</h4>
                                          {!isTestActive && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">삭제됨</Badge>}
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{test.description}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-white/10 text-gray-300 border-0">{test.duration}분</Badge>
                                      {isTestActive ? (
                                        <>
                                          <Button size="sm" className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400" onClick={() => onEditTest(test)}>
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="destructive" size="sm" className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="bg-[#0D1326] border-white/10">
                                              <AlertDialogHeader>
                                                <AlertDialogTitle className="flex items-center gap-2 text-white">
                                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                                  테스트 삭제 확인
                                                </AlertDialogTitle>
                                                <AlertDialogDescription className="text-gray-400">
                                                  {test.title}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-white/10 border-white/10 text-gray-300 hover:bg-white/20">취소</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDeleteTest(test)} className="bg-red-600 hover:bg-red-700">
                                                  삭제
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </>
                                      ) : (
                                        <Button size="sm" className="bg-green-500/20 hover:bg-green-500/30 text-green-400" onClick={() => onRestoreTest(test.id)}>
                                          <RotateCcw className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">풀테스트 관리</h3>
            <p className="text-sm text-gray-400">생성된 풀테스트를 관리하고 삭제할 수 있습니다</p>
          </div>
        </div>
        <div className="space-y-3">
          {existingTestSets.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500">등록된 풀테스트가 없습니다</p>
            </div>
          ) : (
            existingTestSets.map((testSet) => (
              <div key={testSet.id} className="p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{testSet.title}</h4>
                    <p className="text-sm text-gray-400 mt-1">{testSet.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>{Math.floor(testSet.totalDuration / 60)}시간 {testSet.totalDuration % 60}분</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${testSet.examType === "toefl" ? "bg-blue-500/20 text-blue-300" : testSet.examType === "sat" ? "bg-emerald-500/20 text-emerald-300" : "bg-purple-500/20 text-purple-300"}`}>
                      {testSet.examType.toUpperCase()}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="bg-red-500/20 hover:bg-red-500/30 text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0D1326] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-white">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            풀테스트 삭제 확인
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            {testSet.title}을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 border-white/10 text-gray-300 hover:bg-white/20">취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeleteTestSet(testSet.id)} className="bg-red-600 hover:bg-red-700">
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
