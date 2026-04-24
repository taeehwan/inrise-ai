import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Clock, FileText, Target, BookOpen, Volume2, Brain, ChevronRight, Mic, PenTool } from "lucide-react";
import type { Test } from "@shared/schema";

interface TestsOverviewProps {
  toeflTests: Test[];
  greTests: Test[];
}

export default function TestsOverview({ toeflTests, greTests }: TestsOverviewProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <Badge className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 text-white border-0 px-6 py-2 text-sm font-medium shadow-lg">
          📝 실전 모의고사
        </Badge>
        <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          실제 시험과 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">동일한 환경</span>
        </h2>
        <p className="text-xl lg:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
          전 세계 검증된 문제들로 구성된 
          <span className="font-semibold text-blue-400">완벽한 실전 준비</span> 경험을 제공합니다
        </p>
      </div>
      
      <div className="space-y-16">
        {/* TOEFL Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-3xl -z-10 border border-white/10"></div>
          <div className="p-8 md:p-12">
            <div className="flex items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-6 shadow-xl">
                <Target className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-2">TOEFL Practice</h3>
                <p className="text-lg text-gray-300">Test of English as a Foreign Language</p>
              </div>
            </div>
            
            <div className="space-y-6 mb-8">
              {/* TOEFL 4개 영역 그리드 */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30">READING</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Reading Practice</CardTitle>
                    <CardDescription className="text-gray-300">
                      학술적 지문과 다양한 문제 유형으로 구성된 실전 연습
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        54-72분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        30-40문제
                      </div>
                    </div>
                    <Link href="/toefl-reading/toefl-reading-1">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Reading 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                        <Volume2 className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-pink-500/20 text-pink-300 border border-pink-400/30">LISTENING</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Listening Practice</CardTitle>
                    <CardDescription className="text-gray-300">
                      강의와 대화 형식의 실제 청취 문제로 훈련
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        41-57분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        28-39문제
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link href="/toefl-listening/toefl-listening-1">
                        <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                          Listening 시작하기
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/tests/toefl/listening">
                        <Button variant="outline" className="w-full border-[rgb(190,24,93)] text-[rgb(190,24,93)] hover:bg-[rgb(190,24,93)]/10">
                          {toeflTests.filter(t => t.section === 'listening').length}개 더보기
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                        <Mic className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-teal-500/20 text-teal-300 border border-teal-400/30">SPEAKING</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Speaking Practice</CardTitle>
                    <CardDescription className="text-gray-300">
                      독립형과 통합형 스피킹 과제 완전 마스터
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        17분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        4과제
                      </div>
                    </div>
                    <Link href="/toefl-speaking">
                      <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Speaking 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <PenTool className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">WRITING</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Writing Practice</CardTitle>
                    <CardDescription className="text-gray-300">
                      통합형과 독립형 에세이 완벽 대비 훈련
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        50분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        2과제
                      </div>
                    </div>
                    <Link href="/toefl-writing/toefl-writing-1">
                      <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Writing 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
              
              {/* 전체 테스트 보기 버튼 */}
              <div className="text-center mt-6">
                <Link href="/tests/toefl">
                  <Button variant="outline" size="lg" className="border-2 border-blue-400 text-blue-400 hover:bg-blue-500/10 font-semibold px-8 py-3 rounded-xl">
                    모든 TOEFL 테스트 보기 ({toeflTests.length})
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* GRE Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-3xl -z-10 border border-white/10"></div>
          <div className="p-8 md:p-12">
            <div className="flex items-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-6 shadow-xl">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-4xl font-bold text-white mb-2">GRE Practice</h3>
                <p className="text-lg text-gray-300">Graduate Record Examination</p>
              </div>
            </div>
            
            <div className="space-y-6 mb-8">
              {/* GRE 3개 영역 */}
              <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-green-500/20 text-green-300 border border-green-400/30">VERBAL</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Verbal Reasoning</CardTitle>
                    <CardDescription className="text-gray-300">
                      읽기 이해력과 어휘력을 종합 평가하는 언어 추론
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        60분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        40문제
                      </div>
                    </div>
                    <Link href="/gre/verbal-reasoning">
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Verbal 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30">QUANTITATIVE</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Quantitative Reasoning</CardTitle>
                    <CardDescription className="text-gray-300">
                      수학적 사고력과 문제 해결 능력을 평가하는 수리 추론
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        70분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        40문제
                      </div>
                    </div>
                    <Link href="/gre/quantitative-reasoning">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Quantitative 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="group border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:scale-[1.02]">
                  <CardHeader className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                        <PenTool className="h-6 w-6 text-white" />
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border border-purple-400/30">ANALYTICAL</Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-white">Analytical Writing</CardTitle>
                    <CardDescription className="text-gray-300">
                      논리적 글쓰기와 비판적 사고력을 평가하는 분석적 작문
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        60분
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        2과제
                      </div>
                    </div>
                    <Link href="/gre/analytical-writing">
                      <Button className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                        Analytical 시작하기
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
              
              {/* 전체 테스트 보기 버튼 */}
              <div className="text-center mt-6">
                <Link href="/tests/gre">
                  <Button variant="outline" size="lg" className="border-2 border-green-400 text-green-400 hover:bg-green-500/10 font-semibold px-8 py-3 rounded-xl">
                    모든 GRE 테스트 보기 ({greTests.length})
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}