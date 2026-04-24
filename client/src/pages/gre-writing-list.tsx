import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { FileText, ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GreWritingList() {
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [, navigate] = useLocation();

  const { data: tests = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/gre/writing-topics'],
    staleTime: 0,
    refetchOnMount: true,
  });

  const selectedTest = tests.find(t => t.id?.toString() === selectedTestId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a28] via-[#14103a] to-[#0a0820]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/tests/gre">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-indigo-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                GRE로 돌아가기
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white border-0 px-3 py-1 font-semibold shadow-md">
              Analytical Writing
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mx-auto mb-6">
            <FileText className="h-10 w-10 text-white" />
          </div>
          <Badge className="mb-4 bg-gradient-to-r from-indigo-500 to-violet-700 text-white border-0 px-4 py-1.5 text-sm font-semibold shadow-lg">
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            GRE Analytical Writing
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">Writing Tests</h1>
          <p className="text-lg text-gray-300">Analyze an Issue · Analyze an Argument 에세이 작성</p>
        </div>

        <Card className="border-2 border-indigo-500/40 bg-gradient-to-br from-[#14103a] to-[#0f0a28] backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              </div>
            ) : tests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">등록된 토픽이 없습니다.</p>
                <Link href="/gre/analytical-writing">
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold h-12 text-base px-8">
                    <Play className="h-5 w-5 mr-2" />
                    바로 시작
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-base font-bold text-indigo-200 mb-3">토픽 선택</label>
                  <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                    <SelectTrigger className="w-full bg-[#0f0a28] border-indigo-500/50 text-white h-12 text-base">
                      <SelectValue placeholder="에세이 토픽을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#14103a] border-indigo-500/50 max-h-72 overflow-y-auto">
                      {tests.map((test) => (
                        <SelectItem
                          key={test.id}
                          value={test.id?.toString()}
                          className="text-white hover:bg-indigo-600/20 focus:bg-indigo-600/20 text-sm py-2.5"
                        >
                          <span className="font-medium">{test.title || test.topic || `토픽 #${test.id}`}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 text-sm text-indigo-200 mb-4">
                    <span>약 30분</span>
                    <span>·</span>
                    <span>에세이 작성 + AI 피드백</span>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white font-bold h-12 text-base shadow-lg"
                    onClick={() => navigate('/gre/analytical-writing')}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    {selectedTest ? '선택한 토픽으로 시작' : '바로 시작'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-gray-500 text-sm text-center mt-6">총 {tests.length}개의 토픽</p>
      </div>
    </div>
  );
}
