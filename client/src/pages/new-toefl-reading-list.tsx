import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { BookOpen, ArrowLeft, Play, Loader2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import type { NewToeflReadingTest } from "@shared/schema";

export default function NewTOEFLReadingList() {
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const { t } = useLanguage();
  
  const { data: tests = [], isLoading } = useQuery<NewToeflReadingTest[]>({
    queryKey: ['/api/new-toefl/reading'],
  });

  const activeTests = tests.filter(test => test.isActive);
  const selectedTest = activeTests.find(test => test.id.toString() === selectedTestId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1a12] via-[#0f1d1a] to-[#0c1915]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/new-toefl">
              <Button variant="ghost" className="text-gray-700 hover:text-emerald-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('test.backToToefl')}
              </Button>
            </Link>
            <Badge className="bg-gradient-to-r from-emerald-600 to-green-600 text-white border-0 px-3 py-1 font-semibold shadow-md">
              Reading Section
            </Badge>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mx-auto mb-8">
            <BookOpen className="h-12 w-12 text-white" />
          </div>
          <Badge className="mb-5 bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 px-5 py-2 text-base font-semibold shadow-lg">
            <Sparkles className="w-5 h-5 mr-2 inline" />
            NEW TOEFL 2026
          </Badge>
          <h1 className="text-5xl font-bold text-white mb-4">Reading Tests</h1>
          <p className="text-xl text-gray-300">적응형 지문 독해 및 문제 이해 테스트</p>
        </div>

        <Card className="border-2 border-emerald-500/40 bg-gradient-to-br from-[#0f2318] to-[#0a1a12] backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
              </div>
            ) : activeTests.length === 0 ? (
              <p className="text-gray-400 text-center py-12 text-lg">{t('test.noTests')}</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-emerald-200 mb-3">{t('test.selectTest')}</label>
                  <Select value={selectedTestId} onValueChange={setSelectedTestId}>
                    <SelectTrigger className="w-full bg-[#0a1a12] border-emerald-500/50 text-white h-14 text-lg">
                      <SelectValue placeholder={t('test.selectTestPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f2318] border-emerald-500/50">
                      {activeTests.map((test) => (
                        <SelectItem 
                          key={test.id} 
                          value={test.id.toString()}
                          className="text-white hover:bg-emerald-600/20 focus:bg-emerald-600/20 text-base py-3"
                        >
                          {test.title} ({test.difficulty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTest && (
                  <div className="pt-3">
                    <div className="flex items-center gap-4 text-base text-emerald-200 mb-5">
                      <Badge className="bg-emerald-600 text-white border-0 text-sm px-3 py-1">{selectedTest.difficulty}</Badge>
                      <span className="text-lg">{t('test.module').replace('{n}', String(selectedTest.moduleNumber))}</span>
                    </div>
                    <Link href={`/new-toefl/reading?testId=${selectedTest.id}`}>
                      <Button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold h-14 text-lg shadow-lg">
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
