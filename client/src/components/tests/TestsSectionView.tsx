import { Clock, FileText, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { UserProfileHeader } from "@/components/UserProfileHeader";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { Test } from "@shared/schema";
import { getTestLink, sectionBgGradients, sectionGradients, sectionIcons, sectionMetadata, type SectionKey } from "./shared";

interface TestsSectionViewProps {
  examType: "toefl" | "gre";
  sectionFilter: string;
  tests: Test[];
}

export default function TestsSectionView({ examType, sectionFilter, tests }: TestsSectionViewProps) {
  const sectionKey = sectionFilter as SectionKey;
  const sectionInfo = sectionMetadata[sectionKey];
  const SectionIcon = sectionIcons[sectionKey];
  const gradientColor = sectionGradients[sectionKey];
  const bgGradient = sectionBgGradients[sectionKey];
  const backLink = examType === "toefl" ? "/tests/toefl" : "/tests/gre";
  const examName = examType === "toefl" ? "TOEFL" : "GRE";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <nav className="bg-white/95 backdrop-blur-lg border-b border-gray-200/50 shadow-sm sticky top-0 z-50 h-20">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <img src={logoPath} alt="iNRISE" className="h-12 transition-transform duration-300 group-hover:scale-105" />
          </Link>
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium">홈</Link>
            <Link href={backLink} className="text-blue-600 hover:text-blue-700 transition-colors duration-200 font-medium">← {examName} 전체보기</Link>
            <UserProfileHeader variant="light" />
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className={`bg-gradient-to-r ${gradientColor} rounded-3xl p-8 mb-12 shadow-xl`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-6">
              <SectionIcon className="h-16 w-16" />
              <div>
                <h1 className="text-4xl font-bold mb-2">{examName} {sectionInfo.title}</h1>
                <p className="text-xl text-white/90">{sectionInfo.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-2">{tests.length}</div>
              <div className="text-white/80">개 테스트</div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {tests.length > 0 ? tests.map((test, index) => (
            <div key={`${test.id}-${index}`} className={`bg-gradient-to-r ${bgGradient} rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 group/item`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-800 mb-3">{test.title}</h4>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{test.questionCount || 10}개 문제</span></div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{test.duration || sectionInfo.time}</span></div>
                    <div className="flex items-center gap-2"><Target className="h-4 w-4" /><span className="capitalize">{test.difficulty || "medium"}</span></div>
                  </div>
                </div>
                <Link href={getTestLink(test)}>
                  <Button className={`bg-gradient-to-r ${gradientColor} text-white hover:shadow-lg transition-all duration-300 group-hover/item:scale-105 px-8 py-3 rounded-xl font-semibold text-lg`}>
                    <Play className="h-5 w-5 mr-2" />시작하기
                  </Button>
                </Link>
              </div>
            </div>
          )) : (
            <div className="text-center py-24">
              <SectionIcon className="h-24 w-24 text-gray-300 mx-auto mb-8" />
              <h4 className="text-2xl font-bold text-gray-600 mb-4">{sectionInfo.title} 테스트 준비 중</h4>
              <p className="text-gray-500 text-lg">곧 새로운 {sectionInfo.korean} 테스트가 추가됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
