import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { BookOpen, ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GreVerbalList() {
  const [selectedTestId, setSelectedTestId] = useState<string>("");

  const { data: tests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/verbal/tests'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const selectedTest = tests.find(t => t.id?.toString() === selectedTestId);

  const difficultyLabel = (d: string) => {
    if (d === 'easy') return '쉬움';
    if (d === 'hard') return '어려움';
    return '보통';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#1e1040] to-[#0f0f2e]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/tests/gre">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-violet-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                GRE로 돌아가기
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-3 py-1 font-semibold shadow-md">
              Verbal Reasoning
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/20 mx-auto mb-6">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <Badge className="mb-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg">
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            GRE Verbal Reasoning
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Verbal Tests</h1>
          <p className="text-lg text-gray-300">Reading Comprehension · Text Completion · Sentence Equivalence</p>
        </div>

        <Card className="border-2 border-violet-500/40 bg-gradient-to-br from-[#1e0f40] to-[#1a0a2e] backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
              </div>
            ) : tests.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">현재 이용 가능한 테스트가 없습니다.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-bold text-violet-200 mb-3">테스트 선택</label>
                  <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                    <SelectTrigger className="w-full bg-[#1a0a2e] border-violet-500/50 text-white h-12 text-base">
                      <SelectValue placeholder="테스트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1040] border-violet-500/50 max-h-72 overflow-y-auto">
                      {tests.map((test) => (
                        <SelectItem
                          key={test.id}
                          value={test.id?.toString()}
                          className="text-white hover:bg-violet-600/20 focus:bg-violet-600/20 text-sm py-2.5"
                        >
                          <span className="font-medium">{test.title}</span>
                          {test.difficulty && (
                            <span className="ml-2 text-xs text-violet-300">({difficultyLabel(test.difficulty)})</span>
                          )}
                          {test.questionCount > 0 && (
                            <span className="ml-2 text-xs text-gray-400">{test.questionCount}문제</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTest && (
                  <div className="pt-2">
                    <div className="flex items-center gap-3 text-sm text-violet-200 mb-4">
                      {selectedTest.difficulty && (
                        <Badge className={`text-white border-0 text-xs px-2.5 py-0.5 ${
                          selectedTest.difficulty === 'easy' ? 'bg-emerald-600' :
                          selectedTest.difficulty === 'hard' ? 'bg-red-600' : 'bg-amber-600'
                        }`}>{difficultyLabel(selectedTest.difficulty)}</Badge>
                      )}
                      {selectedTest.questionCount > 0 && <span>{selectedTest.questionCount}문제</span>}
                      <span>약 18분</span>
                    </div>
                    <Link href={`/gre/verbal-reasoning?testId=${selectedTest.id}`}>
                      <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold h-12 text-base shadow-lg">
                        <Play className="h-5 w-5 mr-2" />
                        테스트 시작
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-gray-500 text-sm text-center mt-6">총 {tests.length}개의 테스트</p>
      </div>
    </div>
  );
}
