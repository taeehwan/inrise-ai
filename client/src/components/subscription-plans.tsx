import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useLocation } from "wouter";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  tier: string;
  features: string[];
}

export default function SubscriptionPlans() {
  const [, setLocation] = useLocation();
  
  const { data: plans = [], isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  const handleSubscribe = (planId: string) => {
    setLocation(`/subscribe/${planId}`);
  };

  const getCardStyle = (tier: string) => {
    if (tier === "premium") {
      return "border-2 border-golden relative";
    }
    return "";
  };

  const getButtonStyle = (tier: string) => {
    if (tier === "premium") {
      return "bg-golden text-charcoal hover:bg-golden/90";
    }
    return "bg-charcoal text-white hover:bg-charcoal/90";
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-warm-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">Choose Your Art Journey</h2>
            <p className="text-xl text-cool-gray max-w-2xl mx-auto">
              Flexible subscription plans designed for every level of art enthusiasm, with payment options that work for you.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-12 bg-gray-200 rounded mb-6"></div>
                  <div className="space-y-3 mb-8">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-warm-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Choose Your Art Journey</h2>
          <p className="text-xl text-cool-gray max-w-2xl mx-auto">
            Flexible subscription plans designed for every level of art enthusiasm, with payment options that work for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className={`hover:shadow-xl transition-all duration-300 ${getCardStyle(plan.tier)}`}>
              {plan.tier === "premium" && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Badge className="bg-golden text-charcoal px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl font-display font-semibold">{plan.name}</CardTitle>
                <p className="text-cool-gray">
                  {plan.tier === "basic" && "Perfect for art enthusiasts starting their journey"}
                  {plan.tier === "premium" && "For serious art lovers seeking deeper insights"}
                  {plan.tier === "collector" && "Ultimate access for art professionals and collectors"}
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-cool-gray">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full py-3 rounded-full font-medium transition-all ${getButtonStyle(plan.tier)}`}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  Start {plan.name} Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Options */}
        <div className="mt-12 text-center">
          <p className="text-cool-gray mb-6">Flexible payment options available</p>
          <div className="flex flex-wrap justify-center items-center gap-6 text-cool-gray">
            <div className="flex items-center">
              <span className="text-2xl mr-2">💳</span>
              <span>Visa</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">💳</span>
              <span>Mastercard</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">🅿️</span>
              <span>PayPal</span>
            </div>
            <div className="flex items-center">
              <span className="text-2xl mr-2">🍎</span>
              <span>Apple Pay</span>
            </div>
          </div>
          <p className="text-sm text-cool-gray mt-4">All payments securely processed by Stripe</p>
        </div>
      </div>
    </section>
  );
}
