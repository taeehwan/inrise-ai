import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentKey = urlParams.get("paymentKey");
    const orderId = urlParams.get("orderId");
    const amount = urlParams.get("amount");

    if (paymentKey && orderId && amount) {
      verifyPayment(paymentKey, orderId, amount);
    } else {
      toast({
        title: "결제 정보 오류",
        description: "결제 정보를 확인할 수 없습니다.",
        variant: "destructive",
      });
      setIsVerifying(false);
    }
  }, []);

  const verifyPayment = async (paymentKey: string, orderId: string, amount: string) => {
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentKey,
          orderId,
          amount: parseInt(amount),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPaymentInfo(result);
        
        // 결제 성공 후 사용자 인증 정보 캐시 무효화 - 새로운 멤버십 등급 반영
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/user/subscription"] });
        
        toast({
          title: "결제 완료",
          description: "결제가 성공적으로 완료되었습니다. 새로운 기능을 이용하실 수 있습니다!",
          variant: "default",
        });
      } else {
        throw new Error("결제 검증 실패");
      }
    } catch (error) {
      console.error("결제 검증 오류:", error);
      toast({
        title: "결제 검증 실패",
        description: "결제 검증 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
              <p className="text-lg font-semibold">결제 확인 중...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">결제 완료</CardTitle>
          <CardDescription>
            결제가 성공적으로 처리되었습니다.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {paymentInfo && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">주문번호:</span>
                <span className="text-sm">{paymentInfo.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">결제금액:</span>
                <span className="font-bold text-lg">{paymentInfo.totalAmount?.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">결제방법:</span>
                <span>{paymentInfo.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">승인시간:</span>
                <span className="text-sm">{new Date(paymentInfo.approvedAt).toLocaleString()}</span>
              </div>
            </div>
          )}
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => setLocation("/dashboard")}
              className="w-full"
              data-testid="button-go-dashboard"
            >
              대시보드로 이동
              <ArrowRight className="ml-2 h-4 w-4" />
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