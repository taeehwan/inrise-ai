import { ArrowLeft, Award, BookOpen, Clock, MessageSquare, PenTool, Play, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SecurityWrapper } from "@/components/SecurityWrapper";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import type { WritingSelectionType, WritingTest } from "./shared";

function FullScreenButtonPlaceholder() {
  return null;
}

export default function ToeflWritingSelectView({
  isLoadingTests,
  tests,
  selectedWritingType,
  setSelectedWritingType,
  startTest,
}: {
  isLoadingTests: boolean;
  tests: WritingTest[];
  selectedWritingType: WritingSelectionType;
  setSelectedWritingType: (value: WritingSelectionType) => void;
  startTest: (test: WritingTest) => void;
}) {
  const integratedTests = tests.filter((t) => t.type === "integrated");
  const discussionTests = tests.filter((t) => t.type === "discussion");

  return (
    <SecurityWrapper
      showUserWatermark={true}
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900" hideButton={true}>
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    홈으로
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-white">TOEFL Writing</h1>
                  <p className="text-blue-200 text-sm">통합형 및 토론형 작문 연습</p>
                </div>
              </div>
              <FullScreenButtonPlaceholder />
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-8">
          {isLoadingTests && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-6"></div>
                <p className="text-white text-lg font-medium">테스트 로딩 중...</p>
              </div>
            </div>
          )}

          {!isLoadingTests && tests.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 text-center max-w-md border border-white/20">
                <PenTool className="h-20 w-20 text-blue-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">테스트가 없습니다</h3>
                <p className="text-blue-200 mb-6">아직 생성된 Writing 테스트가 없습니다.</p>
                <Link href="/ai-test-creator">
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold">
                    테스트 생성하기
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!isLoadingTests && tests.length > 0 && !selectedWritingType && (
            <div className="py-12">
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">유형을 선택하세요</h2>
                <p className="text-blue-200 text-lg">원하는 Writing 유형을 클릭하여 문제 목록을 확인하세요</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                <Link href="/toefl-writing-full" className="group cursor-pointer">
                  <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-indigo-400/30 hover:border-indigo-400 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Full Test</h3>
                    <p className="text-indigo-200 text-center text-sm mb-4">실제 시험처럼<br />전체 문제를 순서대로 풀기</p>
                    <div className="flex flex-col items-center gap-2 text-indigo-300 text-sm">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />전체 소요: 약 30분</span>
                      <span className="bg-indigo-400/30 px-3 py-1 rounded-full">통합형 1 + 토론형 1</span>
                    </div>
                  </div>
                </Link>

                <div onClick={() => setSelectedWritingType("integrated")} className="group cursor-pointer">
                  <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-blue-400/30 hover:border-blue-400 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <BookOpen className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Integrated Task</h3>
                    <p className="text-blue-200 text-center text-sm mb-4">Reading + Listening을<br />통합하여 요약 에세이 작성</p>
                    <div className="flex flex-col items-center gap-2 text-blue-300 text-sm">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />읽기 3분 + 듣기 + 작성 20분</span>
                      <span className="bg-blue-400/30 px-3 py-1 rounded-full">{integratedTests.length}개 문제</span>
                    </div>
                  </div>
                </div>

                <div onClick={() => setSelectedWritingType("discussion")} className="group cursor-pointer">
                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-3xl p-6 border-2 border-purple-400/30 hover:border-purple-400 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:scale-[1.02] h-full">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white text-center mb-2">Discussion Task</h3>
                    <p className="text-purple-200 text-center text-sm mb-4">학생 의견을 읽고<br />자신의 관점을 표현하는 에세이</p>
                    <div className="flex flex-col items-center gap-2 text-purple-300 text-sm">
                      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />작성 10분</span>
                      <span className="bg-purple-400/30 px-3 py-1 rounded-full">{discussionTests.length}개 문제</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoadingTests && tests.length > 0 && selectedWritingType && (
            <div className="py-8">
              <Button onClick={() => setSelectedWritingType(null)} variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                유형 선택으로 돌아가기
              </Button>

              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  selectedWritingType === "integrated" ? "bg-gradient-to-br from-blue-400 to-cyan-400" : "bg-gradient-to-br from-purple-400 to-pink-400"
                }`}>
                  {selectedWritingType === "integrated" ? <BookOpen className="h-7 w-7 text-white" /> : <Users className="h-7 w-7 text-white" />}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">{selectedWritingType === "integrated" ? "통합형 문제" : "토론형 문제"}</h2>
                  <p className="text-blue-200">
                    {selectedWritingType === "integrated" ? "Reading + Listening 기반 에세이 작성 (25분)" : "토론 주제에 대한 의견 작성 (10분)"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {(selectedWritingType === "integrated" ? integratedTests : discussionTests).map((test, index) => (
                  <div
                    key={test.id}
                    className={`bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all group ${
                      selectedWritingType === "integrated" ? "hover:shadow-blue-500/10" : "hover:shadow-purple-500/10"
                    } hover:shadow-xl`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          selectedWritingType === "integrated" ? "bg-blue-500/30 text-blue-300" : "bg-purple-500/30 text-purple-300"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-200 transition-colors">{test.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{selectedWritingType === "integrated" ? "25분" : "10분"}</span>
                            <span className="flex items-center gap-1">
                              {selectedWritingType === "integrated" ? <><BookOpen className="h-3.5 w-3.5" /> Reading + Listening</> : <><MessageSquare className="h-3.5 w-3.5" /> Discussion</>}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => startTest(test)}
                        className={`${
                          selectedWritingType === "integrated"
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                            : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        } text-white px-6 py-2 rounded-xl font-semibold transition-all group-hover:scale-105`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        시작하기
                      </Button>
                    </div>
                  </div>
                ))}

                {(selectedWritingType === "integrated" ? integratedTests : discussionTests).length === 0 && (
                  <div className="text-center py-16">
                    <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
                      selectedWritingType === "integrated" ? "bg-blue-500/20" : "bg-purple-500/20"
                    }`}>
                      {selectedWritingType === "integrated" ? <BookOpen className="h-10 w-10 text-blue-400" /> : <Users className="h-10 w-10 text-purple-400" />}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{selectedWritingType === "integrated" ? "통합형" : "토론형"} 문제가 없습니다</h3>
                    <p className="text-white/60 mb-6">테스트 생성기에서 새로운 문제를 만들어보세요.</p>
                    <Link href="/ai-test-creator">
                      <Button className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl">테스트 생성하기</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
