import { lazy, Suspense } from "react";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import FullscreenWrapper from "@/components/FullscreenWrapper";

const DeferredLoginModal = lazy(() => import("@/components/LoginModal"));

interface ToeflReadingLoginGateProps {
  showLoginModal: boolean;
  setShowLoginModal: (open: boolean) => void;
  onLoginSuccess: () => void;
}

export default function ToeflReadingLoginGate({
  showLoginModal,
  setShowLoginModal,
  onLoginSuccess,
}: ToeflReadingLoginGateProps) {
  return (
    <FullscreenWrapper className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4 p-8 text-center">
        <div className="mb-6">
          <Lock className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h2
            className="text-2xl font-bold text-purple-900 mb-2"
            style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
          >
            로그인이 필요합니다
          </h2>
          <p className="text-gray-600" style={{ fontFamily: "Arial, sans-serif" }}>
            TOEFL Reading 테스트를 시작하려면 로그인해주세요.
          </p>
        </div>
        <Button
          onClick={() => setShowLoginModal(true)}
          className="w-full bg-purple-600 hover:bg-purple-700"
          style={{ fontFamily: "Arial, sans-serif", textTransform: "uppercase" }}
        >
          로그인 / 회원가입
        </Button>
      </Card>

      <Suspense fallback={null}>
        <DeferredLoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={onLoginSuccess}
        />
      </Suspense>
    </FullscreenWrapper>
  );
}
