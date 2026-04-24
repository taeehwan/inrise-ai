import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Calculator, ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GreQuantitativeList() {
  const [selectedTestId, setSelectedTestId] = useState<string>("");

  const { data: tests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/quantitative/tests'],
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
    <div className="min-h-screen bg-gradient-to-br from-[#071a2e] via-[#0a1e38] to-[#06101e]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/tests/gre">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-cyan-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                GRE로 돌아가기
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-0 px-3 py-1 font-semibold shadow-md">
              Quantitative Reasoning
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/20 mx-auto mb-6">
            <Calculator className="h-10 w-10 text-white" />
          </div>
          <Badge className="mb-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg">
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            GRE Quantitative Reasoning
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Quantitative Tests</h1>
          <p className="text-lg text-gray-300">Quantitative Comparison · Problem Solving · Data Interpretation</p>
        </div>

        <Card className="border-2 border-cyan-500/40 bg-gradient-to-br from-[#0a1e38] to-[#071a2e] backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
              </div>
            ) : tests.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">현재 이용 가능한 테스트가 없습니다.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-bold text-cyan-200 mb-3">테스트 선택</label>
                  <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                    <SelectTrigger className="w-full bg-[#071a2e] border-cyan-500/50 text-white h-12 text-base">
                      <SelectValue placeholder="테스트를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a1e38] border-cyan-500/50 max-h-72 overflow-y-auto">
                      {tests.map((test) => (
                        <SelectItem
                          key={test.id}
                          value={test.id?.toString()}
                          className="text-white hover:bg-cyan-600/20 focus:bg-cyan-600/20 text-sm py-2.5"
                        >
                          <span className="font-medium">{test.title}</span>
                          {test.difficulty && (
                            <span className="ml-2 text-xs text-cyan-300">({difficultyLabel(test.difficulty)})</span>
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
                    <div className="flex items-center gap-3 text-sm text-cyan-200 mb-4">
                      {selectedTest.difficulty && (
                        <Badge className={`text-white border-0 text-xs px-2.5 py-0.5 ${
                          selectedTest.difficulty === 'easy' ? 'bg-emerald-600' :
                          selectedTest.difficulty === 'hard' ? 'bg-red-600' : 'bg-amber-600'
                        }`}>{difficultyLabel(selectedTest.difficulty)}</Badge>
                      )}
                      {selectedTest.questionCount > 0 && <span>{selectedTest.questionCount}문제</span>}
                      <span>약 35분</span>
                    </div>
                    <Link href={`/gre/quantitative-reasoning?testId=${selectedTest.id}`}>
                      <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold h-12 text-base shadow-lg">
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
