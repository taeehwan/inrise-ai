import type { Dispatch, Ref, SetStateAction } from "react";
import { Download, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/components/ai-test-creator/shared";

interface AITestCreatorInputTabsProps {
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  isProcessing: boolean;
  handleGenerateTest: () => void;
  handleDownloadTemplate: () => void;
  handleExcelUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: Ref<HTMLInputElement>;
  excelFile: File | null;
  parsedQuestions: Question[];
  excelErrors: string[];
  passageTitle: string;
  passageContent: string;
  handleCreateFromExcel: () => void;
}

export default function AITestCreatorInputTabs({
  content,
  setContent,
  isProcessing,
  handleGenerateTest,
  handleDownloadTemplate,
  handleExcelUpload,
  fileInputRef,
  excelFile,
  parsedQuestions,
  excelErrors,
  passageTitle,
  passageContent,
  handleCreateFromExcel,
}: AITestCreatorInputTabsProps) {
  return (
    <>
      <TabsContent value="text" className="space-y-6 mt-6">
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="100자 이상의 텍스트를 입력하세요. 입력한 텍스트를 분석하여 문제를 생성합니다.\n\n예시: 지문 내용과 문제들을 복사하여 붙여넣으면 자동으로 파싱됩니다."
            className="min-h-64 text-lg border-2 border-slate-200 rounded-xl"
            data-testid="textarea-content"
          />
        </div>

        <Button
          onClick={handleGenerateTest}
          disabled={isProcessing}
          className="w-full h-16 text-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white"
          data-testid="button-generate-test"
        >
          <Sparkles className="h-6 w-6 mr-2" />
          {isProcessing ? "생성 중..." : "테스트 생성하기"}
        </Button>
      </TabsContent>

      <TabsContent value="excel" className="space-y-6 mt-6">
        <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-200">
            💡 <strong>엑셀 템플릿 사용법:</strong> 템플릿을 다운로드하여 하나의 지문과 여러 문제를 작성한 후 업로드하세요.
          </p>
        </div>
        <div className="space-y-4">
          <Button
            onClick={handleDownloadTemplate}
            variant="outline"
            className="w-full"
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            엑셀 템플릿 다운로드
          </Button>

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelUpload}
              ref={fileInputRef}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <Upload className="h-6 w-6 mx-auto mb-2" />
              <p className="text-lg font-medium">엑셀 파일 업로드</p>
              {excelFile && <p className="text-sm text-green-600 mt-2">✓ {excelFile.name}</p>}
            </label>
          </div>

          {parsedQuestions.length > 0 && (
            <div className="space-y-3 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30">
              <div className="space-y-1">
                {passageTitle && (
                  <p className="text-sm font-bold text-purple-700">📖 지문: {passageTitle}</p>
                )}
                <p className="text-sm font-medium text-blue-700">✓ {parsedQuestions.length}개 문제 파싱 완료</p>
                {passageContent && (
                  <p className="text-xs text-slate-600 line-clamp-2">{passageContent}</p>
                )}
              </div>
              {excelErrors.length > 0 && (
                <div className="text-sm text-red-600">
                  {excelErrors.slice(0, 3).map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleCreateFromExcel}
            disabled={isProcessing || parsedQuestions.length === 0}
            className="w-full h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            data-testid="button-create-from-excel"
          >
            <Sparkles className="h-6 w-6 mr-2" />
            엑셀로 테스트 생성
          </Button>
        </div>
      </TabsContent>
    </>
  );
}
