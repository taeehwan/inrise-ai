import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin@inrise.com");
  const [password, setPassword] = useState("admin123");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "관리자 로그인 성공",
        description: "관리자 페이지로 이동합니다.",
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "로그인 실패",
        description: error.message || "관리자 계정 정보를 확인해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-red-200 shadow-2xl">
        <CardHeader className="text-center bg-red-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold">🔐 관리자 로그인</CardTitle>
          <CardDescription className="text-red-100">
            iNRISE 관리자 전용 로그인
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                관리자 이메일
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-2 border-red-200 focus:border-red-500"
                placeholder="admin@inrise.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                관리자 비밀번호
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-2 border-red-200 focus:border-red-500"
                placeholder="admin123"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "로그인 중..." : "관리자 로그인"}
            </Button>
          </form>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">기본 관리자 계정:</h4>
            <p className="text-sm text-red-700">
              이메일: admin@inrise.com<br />
              비밀번호: admin123
            </p>
          </div>
          
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setLocation("/")}
              className="text-gray-600 border-gray-300"
            >
              ← 홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}