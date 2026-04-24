import { Link } from "wouter";
import {
  Award,
  BarChart3,
  Calendar,
  ChevronRight,
  Clock,
  GraduationCap,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardResultsSectionProps } from "./shared";

export default function DashboardResultsSection({
  completedAttempts,
  tests,
  toeflAttempts,
  greAttempts,
  satAttempts,
  averageScore,
  totalTimeSpent,
}: DashboardResultsSectionProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 mb-6 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg shadow-blue-600/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{completedAttempts.length}</p>
              <p className="text-xs font-medium text-white/80">완료한 시험</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 p-4 shadow-lg shadow-emerald-600/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{averageScore}</p>
              <p className="text-xs font-medium text-white/80">평균 점수</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 p-4 shadow-lg shadow-amber-600/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Math.round(totalTimeSpent / 60)}h</p>
              <p className="text-xs font-medium text-white/80">학습 시간</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-gradient-to-r from-purple-600 to-violet-700 p-4 shadow-lg shadow-purple-600/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">+{Math.max(0, averageScore - 70)}</p>
              <p className="text-xs font-medium text-white/80">점수 향상</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-800/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="px-4 pb-3 pt-4">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              최근 시험 결과
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {completedAttempts.slice(0, 4).map((attempt) => {
                const test = tests.find((t) => t.id === attempt.testId);
                if (!test) return null;

                return (
                  <div
                    key={attempt.id}
                    className="group flex items-center justify-between rounded-xl border border-white/5 bg-slate-700/30 p-3 transition-all hover:border-emerald-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          test.examType === "toefl" ? "bg-blue-500/20" : "bg-emerald-500/20"
                        }`}
                      >
                        <Target
                          className={`h-4 w-4 ${
                            test.examType === "toefl" ? "text-blue-400" : "text-emerald-400"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{test.title}</h3>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`px-1.5 py-0 text-xs ${
                              test.examType === "toefl"
                                ? "border-blue-400/30 text-blue-300"
                                : "border-emerald-400/30 text-emerald-300"
                            }`}
                          >
                            {test.examType.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(attempt.startedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold text-white">{attempt.totalScore}</span>
                        <span className="ml-0.5 text-xs text-gray-500">
                          /{test.examType === "toefl" ? "30" : test.section === "analytical" ? "6" : "170"}
                        </span>
                      </div>
                      <Link href={`/results/${attempt.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-gray-400 hover:bg-emerald-500/10 hover:text-emerald-400"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}

              {completedAttempts.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                    <Target className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h3 className="mb-1 text-base font-medium text-white">시험 기록이 없습니다</h3>
                  <p className="mb-4 text-sm text-gray-400">첫 모의고사를 시작해보세요</p>
                  <Link href="/tests">
                    <Button size="sm" className="bg-emerald-500 text-white hover:bg-emerald-600">
                      <Target className="mr-1.5 h-4 w-4" />
                      시험 보기
                    </Button>
                  </Link>
                </div>
              )}

              {completedAttempts.length > 4 && (
                <Link href="/results">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  >
                    모든 결과 보기
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Award className="h-4 w-4 text-amber-400" />
                성과 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4 pb-4">
              {[
                { label: "TOEFL", attempts: toeflAttempts, score: "/30", cls: "bg-blue-500/10 border-blue-500/20", badge: "bg-blue-500/20 text-blue-300" },
                { label: "GRE", attempts: greAttempts, score: "/170", cls: "bg-emerald-500/10 border-emerald-500/20", badge: "bg-emerald-500/20 text-emerald-300" },
                { label: "SAT", attempts: satAttempts, score: "/1600", cls: "bg-orange-500/10 border-orange-500/20", badge: "bg-orange-500/20 text-orange-300" },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl border p-3 ${item.cls}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{item.label}</span>
                    <Badge className={`border-0 text-xs ${item.badge}`}>{item.attempts.length}회</Badge>
                  </div>
                  {item.attempts.length > 0 ? (
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-bold text-white">
                        {Math.round(
                          item.attempts.reduce((sum, attempt) => sum + (attempt.totalScore || 0), 0) /
                            item.attempts.length,
                        )}
                      </span>
                      <span className="mb-0.5 text-xs text-gray-400">{item.score}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">기록 없음</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-800/50 backdrop-blur-sm">
            <CardHeader className="px-4 pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Zap className="h-4 w-4 text-yellow-400" />
                빠른 메뉴
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/tests">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto w-full flex-col gap-1 border-emerald-400/40 bg-emerald-600/20 py-3 text-white hover:bg-emerald-500/30"
                  >
                    <Target className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-medium">모의고사</span>
                  </Button>
                </Link>
                <Link href="/study-plan">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto w-full flex-col gap-1 border-violet-400/40 bg-violet-600/20 py-3 text-white hover:bg-violet-500/30"
                  >
                    <Calendar className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-medium">학습계획</span>
                  </Button>
                </Link>
                <Link href="/results">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto w-full flex-col gap-1 border-sky-400/40 bg-sky-600/20 py-3 text-white hover:bg-sky-500/30"
                  >
                    <BarChart3 className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-medium">성적분석</span>
                  </Button>
                </Link>
                <Link href="/my-page">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto w-full flex-col gap-1 border-amber-400/40 bg-amber-600/20 py-3 text-white hover:bg-amber-500/30"
                  >
                    <GraduationCap className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-medium">마이페이지</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {(toeflAttempts.length > 0 || greAttempts.length > 0 || satAttempts.length > 0) && (
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/5 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-white">학습 팁</h4>
                    <p className="text-xs leading-relaxed text-gray-400">
                      {averageScore < 75
                        ? "기초 개념에 집중하고, 매일 꾸준히 연습하세요."
                        : averageScore < 90
                          ? "고급 문제 유형과 시간 관리를 연습하세요."
                          : "훌륭합니다! 꾸준한 복습으로 실력을 유지하세요."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
