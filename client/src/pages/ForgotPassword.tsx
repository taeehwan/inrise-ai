import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "이메일 필요",
        description: "이메일 주소를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      const response = await res.json();

      // Development: Show token if available
      if (response.token) {
        setDevToken(response.token);
      }

      setIsSuccess(true);
      toast({
        title: "요청 완료",
        description: "비밀번호 재설정 링크가 전송되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message || "비밀번호 재설정 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-center">이메일 확인</CardTitle>
            <CardDescription className="text-center">
              비밀번호 재설정 링크를 이메일로 전송했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <Mail className="w-4 h-4 inline mr-2" />
                이메일({email})을 확인하고 링크를 클릭하여 비밀번호를 재설정하세요.
              </p>
            </div>

            {devToken && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100 mb-2">
                  <strong>개발 모드 - 테스트용 토큰:</strong>
                </p>
                <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100 break-all">
                  {devToken}
                </p>
                <Link href={`/reset-password?token=${devToken}`}>
                  <Button size="sm" className="mt-2 w-full" variant="outline" data-testid="button-use-token">
                    이 토큰으로 비밀번호 재설정
                  </Button>
                </Link>
              </div>
            )}

            <div className="space-y-2">
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-back-home">
                  홈으로 돌아가기
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setIsSuccess(false);
                  setEmail("");
                  setDevToken(null);
                }}
                data-testid="button-resend"
              >
                다시 보내기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-center">비밀번호 찾기</CardTitle>
          <CardDescription className="text-center">
            가입하신 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                data-testid="input-email"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? "처리 중..." : "재설정 링크 보내기"}
            </Button>

            <div className="text-center space-y-2">
              <Link href="/">
                <Button variant="link" className="text-sm" data-testid="link-back">
                  로그인 페이지로 돌아가기
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
