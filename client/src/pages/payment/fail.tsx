import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, ArrowLeft, Home } from "lucide-react";

export default function PaymentFail() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const message = urlParams.get("message");
    
    console.log("결제 실패:", { code, message });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-700">결제 실패</CardTitle>
          <CardDescription>
            결제 처리 중 문제가 발생했습니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 text-center">
              결제가 취소되었거나 오류가 발생했습니다.<br />
              다시 시도해 주세요.
            </p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => window.history.back()}
              className="w-full"
              data-testid="button-retry-payment"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              다시 결제하기
            </Button>
            
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
              className="w-full"
              data-testid="button-go-home"
            >
              <Home className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}