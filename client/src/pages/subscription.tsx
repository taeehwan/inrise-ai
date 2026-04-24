import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { 
  Check, 
  Star, 
  Crown, 
  Shield, 
  Sparkles,
  CreditCard,
  Headphones,
  ArrowLeft
} from "lucide-react";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

interface CreatePaymentResponse {
  paymentKey?: string;
  orderId?: string;
  amount?: number;
  paymentUrl?: string;
}

const plans: PricingPlan[] = [
  {
    id: "light",
    name: "iNRISE 라이트",
    price: 29000,
    description: "기본 AI 기능과 제한된 테스트 접근",
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      "월 10회 AI 문제 생성",
      "기본 인라이즈 피드백",
      "개인 학습 진도 추적",
      "표준 성적 분석",
      "이메일 지원"
    ]
  },
  {
    id: "pro",
    name: "iNRISE 프로",
    price: 59000,
    description: "완전한 AI 솔루션과 무제한 테스트",
    icon: <Shield className="w-6 h-6" />,
    popular: true,
    features: [
      "무제한 AI 문제 생성",
      "고급 인라이즈 피드백 및 해설",
      "개인 맞춤 학습계획",
      "상세 성적 분석 및 약점 진단",
      "실시간 채팅 지원",
      "모든 TOEFL/GRE 모의고사",
      "AI 모범답안 제공",
      "음성 평가 (Speaking)"
    ]
  },
  {
    id: "max",
    name: "iNRISE 맥스",
    price: 99000,
    description: "프리미엄 기능과 1:1 코칭 포함",
    icon: <Crown className="w-6 h-6" />,
    features: [
      "프로 플랜의 모든 기능",
      "월 2회 1:1 코칭 세션",
      "개인별 맞춤 커리큘럼",
      "우선 고객 지원",
      "독점 고급 문제은행",
      "실시간 성적 비교 (전체 사용자 대비)",
      "목표 점수 달성 보장 프로그램",
      "시험 전략 가이드"
    ]
  }
];

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: currentSubscription } = useQuery({
    queryKey: ["/api/user/subscription"],
    queryFn: async () => {
      const response = await fetch("/api/user/subscription", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        return response.json();
      }
      return null;
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (planId: string): Promise<CreatePaymentResponse> => {
      const response = await apiRequest("/api/payments/create-payment", "POST", { planId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
    onError: () => {
      toast({
        title: t('sub.error'),
        description: t('sub.paymentError'),
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    paymentMutation.mutate(planId);
  };

  const getPlanBadge = (planId: string) => {
    const badges = {
      light: <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">{t('sub.lightBadge')}</Badge>,
      pro: <Badge className="bg-blue-500/20 text-blue-300 border border-blue-400/30">{t('sub.proBadge')}</Badge>,
      max: <Badge className="bg-purple-500/20 text-purple-300 border border-purple-400/30">{t('sub.maxBadge')}</Badge>
    };
    return badges[planId as keyof typeof badges];
  };

  const getPlanName = (planId: string) => {
    const names: Record<string, string> = {
      light: t('sub.light'),
      pro: t('sub.pro'),
      max: t('sub.max')
    };
    return names[planId] || planId;
  };

  const getPlanDescription = (planId: string) => {
    const descriptions: Record<string, string> = {
      light: t('sub.lightDesc'),
      pro: t('sub.proDesc'),
      max: t('sub.maxDesc')
    };
    return descriptions[planId] || '';
  };

  const getPlanFeatures = (planId: string): string[] => {
    const features: Record<string, string[]> = {
      light: [
        t('sub.feature.aiGen10'),
        t('sub.feature.basicFeedback'),
        t('sub.feature.progressTrack'),
        t('sub.feature.standardAnalysis'),
        t('sub.feature.emailSupport')
      ],
      pro: [
        t('sub.feature.unlimitedAi'),
        t('sub.feature.advancedFeedback'),
        t('sub.feature.customPlan'),
        t('sub.feature.detailedAnalysis'),
        t('sub.feature.liveChat'),
        t('sub.feature.allTests'),
        t('sub.feature.modelAnswer'),
        t('sub.feature.speakingEval')
      ],
      max: [
        t('sub.feature.allProFeatures'),
        t('sub.feature.coaching'),
        t('sub.feature.curriculum'),
        t('sub.feature.prioritySupport'),
        t('sub.feature.premiumBank'),
        t('sub.feature.comparison'),
        t('sub.feature.guarantee'),
        t('sub.feature.strategy')
      ]
    };
    return features[planId] || [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#1e1b4b]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                <ArrowLeft className="mr-2 h-4 w-4" />
                홈으로
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 px-3 py-1">
                Premium Plans
              </Badge>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-6 py-2 text-sm font-medium shadow-lg">
            <Sparkles className="w-4 h-4 mr-2 inline" />
            AI-Powered Learning
          </Badge>
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
              {t('sub.title')}
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto">
            {t('sub.subtitle')}
          </p>
          
          {currentSubscription && (
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20 mt-8">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-white">
                {t('sub.currentPlan')} {getPlanBadge(currentSubscription.planId)}
              </span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-8 border border-blue-500/20 mb-12">
          <h3 className="text-2xl font-bold text-white mb-4">{t('sub.choosePlan')}</h3>
          <p className="text-gray-300">{t('sub.changeable')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`group relative border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl transition-all duration-500 transform ${
                plan.popular 
                  ? 'scale-105 hover:shadow-blue-500/20 border-blue-500/30' 
                  : 'hover:scale-[1.02] hover:shadow-purple-500/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 text-sm font-semibold shadow-lg">
                    <Star className="w-4 h-4 mr-1" fill="currentColor" />
                    {t('sub.mostPopular')}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex justify-center mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    plan.id === 'light' ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                    plan.id === 'pro' ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                    'bg-gradient-to-br from-purple-500 to-violet-600'
                  }`}>
                    <div className="text-white">{plan.icon}</div>
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold mb-3 text-white">{getPlanName(plan.id)}</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    ₩{plan.price.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-lg font-medium">{t('sub.month')}</span>
                </div>
                <p className="text-gray-300 leading-relaxed">{getPlanDescription(plan.id)}</p>
              </CardHeader>
              
              <CardContent className="pt-0 pb-8">
                <ul className="space-y-4 mb-8">
                  {getPlanFeatures(plan.id).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                        plan.id === 'light' ? 'bg-emerald-500/20' :
                        plan.id === 'pro' ? 'bg-blue-500/20' :
                        'bg-purple-500/20'
                      }`}>
                        <Check className={`w-4 h-4 ${
                          plan.id === 'light' ? 'text-emerald-400' :
                          plan.id === 'pro' ? 'text-blue-400' :
                          'text-purple-400'
                        }`} />
                      </div>
                      <span className="text-gray-300 leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full py-6 text-lg font-semibold shadow-lg transition-all duration-300 ${
                    plan.id === 'light' 
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white' 
                      : plan.id === 'pro'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                      : 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white'
                  }`}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={paymentMutation.isPending && selectedPlan === plan.id}
                >
                  {paymentMutation.isPending && selectedPlan === plan.id ? (
                    t('sub.processing')
                  ) : currentSubscription?.planId === plan.id ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      {t('sub.currentlySubscribed')}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      {t('sub.startNow')}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-16 border border-white/10 bg-[#334155]/50 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-white">{t('sub.faqTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-3 text-white">{t('sub.faq.cancelQ')}</h4>
                <p className="text-gray-300 leading-relaxed">
                  {t('sub.faq.cancelA')}
                </p>
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-3 text-white">{t('sub.faq.changeQ')}</h4>
                <p className="text-gray-300 leading-relaxed">
                  {t('sub.faq.changeA')}
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-3 text-white">{t('sub.faq.refundQ')}</h4>
                <p className="text-gray-300 leading-relaxed">
                  {t('sub.faq.refundA')}
                </p>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-xl">
                <h4 className="text-lg font-bold mb-3 text-white">{t('sub.faq.paymentQ')}</h4>
                <p className="text-gray-300 leading-relaxed">
                  {t('sub.faq.paymentA')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-12 border border-blue-500/20 backdrop-blur-sm">
          <h3 className="text-3xl font-bold text-white mb-4">{t('sub.contactTitle')}</h3>
          <p className="text-xl text-gray-300 mb-6">
            {t('sub.contactDesc')}
          </p>
          <a 
            href="mailto:support@inrise.com" 
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Headphones className="w-5 h-5" />
            support@inrise.com
          </a>
        </div>
      </div>
    </div>
  );
}
