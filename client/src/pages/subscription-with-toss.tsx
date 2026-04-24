import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles, CreditCard, Users, TrendingUp } from "lucide-react";
import TossPaymentButton from "@/components/TossPaymentButton";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

export default function SubscriptionWithToss() {
  const { user, isAuthenticated } = useAuth();
  const { membershipTier } = useSubscription();

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: 0,
      duration: "무료",
      description: "기본 기능을 체험해보세요",
      features: [
        "월 5회 모의고사 응시",
        "기본 점수 분석",
        "커뮤니티 접근",
        "기본 학습 자료"
      ],
      icon: Zap,
      buttonText: "현재 이용 중",
      isPopular: false
    },
    {
      id: "premium",
      name: "Premium",
      price: 29900,
      duration: "월",
      description: "무제한 학습으로 목표 달성하세요",
      features: [
        "무제한 모의고사 응시",
        "AI 맞춤 피드백",
        "상세 성과 분석",
        "전문가 해설",
        "개인별 학습 계획",
        "우선 고객 지원"
      ],
      icon: Crown,
      buttonText: "Premium 시작하기",
      isPopular: true
    },
    {
      id: "pro",
      name: "Pro",
      price: 49900,
      duration: "월",
      description: "전문적인 시험 준비를 위한 완벽한 솔루션",
      features: [
        "Premium의 모든 기능",
        "1:1 전문가 코칭",
        "실시간 화상 튜터링",
        "개인 맞춤 문제 생성",
        "진도 관리 서비스",
        "모바일 앱 이용"
      ],
      icon: Sparkles,
      buttonText: "Pro 시작하기",
      isPopular: false
    }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
              로그인이 필요합니다
            </CardTitle>
            <CardDescription className="text-slate-600 font-medium mt-2">
              구독 서비스를 이용하려면 먼저 로그인해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <CreditCard className="h-10 w-10 text-white" />
                </div>
                <div className="p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent tracking-tight mb-4" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                나에게 맞는 플랜을 선택하세요
              </h1>
              <p className="text-xl text-slate-600 font-medium max-w-3xl mx-auto leading-relaxed">
                TOEFL과 GRE 시험 준비를 위한 최고의 AI 학습 플랫폼에서 
                목표 점수를 달성하세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16">

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrentPlan = (
              (plan.id === "basic" && (membershipTier === "guest" || membershipTier === "light")) ||
              (plan.id === "premium" && membershipTier === "pro") ||
              (plan.id === "pro" && (membershipTier === "max" || membershipTier === "master"))
            );

            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/80 backdrop-blur-lg border-0 shadow-xl ${
                  plan.isPopular ? 'ring-2 ring-gradient-to-r ring-blue-500/50 scale-105 shadow-2xl' : ''
                } ${
                  isCurrentPlan ? 'bg-gradient-to-br from-green-50/80 to-emerald-50/80 ring-2 ring-green-500/30' : ''
                }`}
              >
                {plan.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg">
                    ⭐ 인기
                  </Badge>
                )}
                
                <CardHeader className="text-center pb-8">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {plan.name}
                  </CardTitle>
                  <div className="mt-6">
                    <span className="text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-slate-500 ml-2 text-lg font-medium">/{plan.duration}</span>
                    )}
                  </div>
                  <CardDescription className="mt-4 text-slate-600 font-medium leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <div className="mr-4 mt-0.5">
                          <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                            <Check className="h-3.5 w-3.5 text-white font-bold" />
                          </div>
                        </div>
                        <span className="text-slate-700 font-medium leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="w-full">
                    {isCurrentPlan ? (
                      <Button 
                        className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg border-0" 
                        disabled
                        data-testid={`button-current-${plan.id}`}
                      >
                        ✅ 현재 이용 중
                      </Button>
                    ) : plan.price === 0 ? (
                      <Button 
                        className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white shadow-lg border-0"
                        disabled
                        data-testid={`button-free-${plan.id}`}
                      >
                        기본 플랜
                      </Button>
                    ) : (
                      <TossPaymentButton
                        amount={plan.price}
                        orderName={`iNRISE ${plan.name} 구독`}
                        customerEmail={user?.email}
                        customerName={`${user?.firstName} ${user?.lastName}`.trim()}
                        className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg border-0 transition-all duration-300 hover:scale-105"
                        onSuccess={(payment) => {
                          console.log("결제 성공:", payment);
                        }}
                        onFail={(error) => {
                          console.error("결제 실패:", error);
                        }}
                      >
                        {plan.buttonText}
                      </TossPaymentButton>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border-0 p-12 max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                자주 묻는 질문
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                구독 서비스에 대해 궁금한 점들을 확인해보세요
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 text-left">
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl p-6 border border-blue-200/20">
                <h3 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-3"></div>
                  구독을 언제든지 취소할 수 있나요?
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  네, 언제든지 구독을 취소할 수 있습니다. 취소 시점까지 이용한 기간에 대해서만 요금이 부과됩니다.
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 rounded-2xl p-6 border border-green-200/20">
                <h3 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mr-3"></div>
                  결제는 어떤 방법으로 가능한가요?
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  토스페이먼츠를 통해 신용카드, 체크카드, 계좌이체 등 다양한 결제 수단을 지원합니다.
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-2xl p-6 border border-purple-200/20">
                <h3 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mr-3"></div>
                  무료 체험 기간이 있나요?
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  신규 가입 시 Basic 플랜으로 월 5회 무료 시험 응시가 가능합니다.
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50/50 to-red-50/50 rounded-2xl p-6 border border-orange-200/20">
                <h3 className="font-bold text-slate-900 mb-3 text-lg flex items-center">
                  <div className="w-2 h-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mr-3"></div>
                  환불 정책은 어떻게 되나요?
                </h3>
                <p className="text-slate-600 font-medium leading-relaxed">
                  구독 후 7일 이내에 취소하시면 전액 환불이 가능합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}