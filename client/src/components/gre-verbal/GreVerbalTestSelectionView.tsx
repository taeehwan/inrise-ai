import { ArrowLeft, BookOpen, ChevronRight, Loader2, Sparkles } from "lucide-react";
import FullscreenWrapper from "@/components/FullscreenWrapper";
import { SecurityWrapper } from "@/components/SecurityWrapper";

interface AvailableGreVerbalTest {
  id: string;
  title: string;
  questionCount?: number;
  difficulty?: string;
}

interface GreVerbalTestSelectionViewProps {
  testsLoading: boolean;
  availableTests?: AvailableGreVerbalTest[];
  onBack: () => void;
  onSelectTest: (testId: string) => void;
  onCreateAiTest: () => void;
}

export default function GreVerbalTestSelectionView({
  testsLoading,
  availableTests,
  onBack,
  onSelectTest,
  onCreateAiTest,
}: GreVerbalTestSelectionViewProps) {
  return (
    <SecurityWrapper
      watermark="iNRISE GRE VERBAL REASONING"
      disableRightClick={true}
      disableKeyboardShortcuts={true}
      disableTextSelection={true}
      disableScreenshot={true}
      showSecurityNotice={true}
    >
      <FullscreenWrapper>
        <div className="gv-page p-4">
          <div className="max-w-4xl mx-auto">
            <button className="gv-btn-secondary mb-5" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
              GRE 선택으로 돌아가기
            </button>

            <div className="gv-card overflow-hidden">
              <div
                className="px-6 py-5 flex items-center gap-4"
                style={{
                  background: "linear-gradient(90deg, rgba(109,40,217,0.25), rgba(124,58,237,0.12))",
                  borderBottom: "1px solid rgba(124,58,237,0.15)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.25)" }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: "var(--gve-accent-pale)" }} />
                </div>
                <h1 className="text-2xl font-bold" style={{ color: "var(--gve-text-primary)" }}>
                  GRE Verbal Reasoning
                </h1>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold mb-2" style={{ color: "var(--gve-text-secondary)" }}>
                    테스트를 선택해주세요
                  </h2>
                </div>

                {testsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gve-accent-primary)" }} />
                  </div>
                ) : availableTests && availableTests.length > 0 ? (
                  <div className="space-y-6">
                    <p style={{ color: "var(--gve-text-muted)" }} className="text-base mb-6">
                      아래 목록에서 풀고 싶은 테스트를 선택하거나, 새로운 테스트를 생성하세요.
                    </p>
                    <div className="space-y-3">
                      {availableTests.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
                          style={{ background: "rgba(15,12,27,0.7)", border: "1px solid rgba(124,58,237,0.12)" }}
                          onMouseEnter={(event) => {
                            event.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
                            event.currentTarget.style.background = "rgba(124,58,237,0.05)";
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.style.borderColor = "rgba(124,58,237,0.12)";
                            event.currentTarget.style.background = "rgba(15,12,27,0.7)";
                          }}
                          onClick={() => onSelectTest(test.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                              style={{ background: "rgba(124,58,237,0.2)" }}
                            >
                              <BookOpen className="w-6 h-6" style={{ color: "var(--gve-accent-soft)" }} />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg" style={{ color: "var(--gve-text-primary)" }}>
                                {test.title}
                              </h3>
                              <div className="flex items-center gap-3 text-sm" style={{ color: "var(--gve-text-muted)" }}>
                                <span>{test.questionCount || 0}문제</span>
                                <span>•</span>
                                <span className="capitalize">{test.difficulty}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5" style={{ color: "var(--gve-accent-primary)" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(124,58,237,0.08)" }}
                    >
                      <BookOpen className="w-8 h-8" style={{ color: "var(--gve-text-dim)" }} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--gve-text-secondary)" }}>
                      아직 저장된 테스트가 없습니다
                    </h3>
                    <p style={{ color: "var(--gve-text-muted)" }}>
                      AI를 사용하여 새로운 GRE Verbal 문제를 생성해보세요!
                    </p>
                    <button className="gv-btn-primary mt-6" onClick={onCreateAiTest}>
                      <Sparkles className="w-4 h-4" />
                      AI로 테스트 생성하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </FullscreenWrapper>
    </SecurityWrapper>
  );
}
