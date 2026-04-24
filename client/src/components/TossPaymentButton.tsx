import React from "react";
import { loadTossPayments } from "@tosspayments/payment-sdk";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TossPaymentButtonProps {
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
  onSuccess?: (payment?: unknown) => void;
  onFail?: (error: unknown) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function TossPaymentButton({
  amount,
  orderName,
  customerEmail,
  customerName,
  onSuccess,
  onFail,
  disabled = false,
  className,
  children
}: TossPaymentButtonProps) {
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      // 토스페이먼츠 클라이언트 키가 필요합니다
      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
      
      if (!clientKey) {
        toast({
          title: "결제 설정 오류",
          description: "토스페이먼츠 클라이언트 키가 설정되지 않았습니다.",
          variant: "destructive",
        });
        return;
      }

      const tossPayments = await loadTossPayments(clientKey);

      // 주문 ID 생성 (고유값)
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 결제 요청
      await tossPayments.requestPayment("카드", {
        amount,
        orderId,
        orderName,
        customerEmail,
        customerName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });

      onSuccess?.();

    } catch (error: unknown) {
      console.error("결제 오류:", error);
      
      toast({
        title: "결제 실패",
        description: "결제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });

      if (onFail) {
        onFail(error);
      }
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled}
      className={className}
      data-testid="button-toss-payment"
    >
      {children || (
        <>
          <CreditCard className="mr-2 h-4 w-4" />
          결제하기 ({amount.toLocaleString()}원)
        </>
      )}
    </Button>
  );
}

export default TossPaymentButton;
