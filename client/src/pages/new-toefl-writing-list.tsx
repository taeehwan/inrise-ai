import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { PenTool, ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NewToeflWritingTest } from "@shared/schema";

export default function NewTOEFLWritingList() {
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const { t } = useLanguage();
  
  const { data: tests = [], isLoading } = useQuery<NewToeflWritingTest[]>({
    queryKey: ['/api/new-toefl/writing'],
  });

  const activeTests = tests.filter(test => test.isActive);
  const selectedTest = activeTests.find(test => test.id.toString() === selectedTestId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1428] via-[#0f1d32] to-[#0c1929]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/new-toefl">
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('test.backToToefl')}
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-3 py-1 font-semibold shadow-md">
              Writing Section
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 mx-auto mb-8">
            <PenTool className="h-12 w-12 text-white" />
          </div>
          <Badge className="mb-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 px-5 py-2 text-base font-semibold shadow-lg">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            NEW TOEFL 2026
          </Badge>
          <h1 className="text-5xl font-bold text-white mb-4">Writing Tests</h1>
          <p className="text-xl text-gray-300">작문적 글쓰기 및 논증 테스트</p>
        </div>

        <Card className="border-2 border-blue-500/40 bg-gradient-to-br from-[#142040] to-[#0a1428] backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
              </div>
            ) : activeTests.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">{t('test.noTests')}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-blue-200 mb-3">{t('test.selectTest')}</label>
                  <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                    <SelectTrigger className="w-full bg-[#0a1428] border-blue-500/50 text-white h-14 text-lg">
                      <SelectValue placeholder={t('test.selectTestPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#142040] border-blue-500/50">
                      {activeTests.map((test) => (
                        <SelectItem 
                          key={test.id} 
                          value={test.id.toString()}
                          className="text-white hover:bg-blue-600/20 focus:bg-blue-600/20 text-base py-3"
                        >
                          {test.title} ({test.difficulty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTest && (
                  <div className="pt-3">
                    <div className="flex items-center gap-4 text-base text-blue-200 mb-5">
                      <Badge className="bg-blue-600 text-white border-0 text-sm px-3 py-1">{selectedTest.difficulty}</Badge>
                      <span className="text-lg">라이팅 테스트</span>
                    </div>
                    <Link href={`/new-toefl/writing?testId=${selectedTest.id}`}>
                      <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-14 text-lg shadow-lg">
                        <Play className="h-6 w-6 mr-2" />
                        {t('test.startTest')}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-gray-500 text-base text-center mt-8">
          {t('test.totalTests').replace('{n}', String(activeTests.length))}
        </p>
      </div>
    </div>
  );
}
