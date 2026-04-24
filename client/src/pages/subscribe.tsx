import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface BillingPlan {
  id: string;
  name: string;
  price: number;
}

const CheckoutForm = ({ planId, email }: { planId: string; email: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements || !email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/create-subscription", {
        email,
        planId,
        successUrl: `${window.location.origin}/dashboard?success=true`,
        cancelUrl: `${window.location.origin}/subscribe/${planId}?canceled=true`
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="mt-1"
        />
      </div>
      
      <Separator />
      
      <div>
        <Label>Payment Information</Label>
        <div className="mt-2 p-4 border rounded-lg">
          <PaymentElement />
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-golden hover:bg-golden/90 text-charcoal font-semibold"
        disabled={!stripe || isLoading}
      >
        {isLoading ? "Processing..." : "Subscribe Now"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const { planId } = useParams<{ planId?: string }>();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState(planId || "");

  const { data: plans = [] } = useQuery<BillingPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  if (!selectedPlanId && plans.length > 0) {
    setSelectedPlanId((plans[1] ?? plans[0]).id); // Default to premium plan when available
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-warm-white">
        <div className="max-w-md mx-auto pt-20 px-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-8 text-charcoal hover:text-golden"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-2xl text-center">
                Start Your Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedPlan && (
                <div className="text-center p-4 bg-warm-white rounded-lg border">
                  <h3 className="font-display text-xl font-semibold">{selectedPlan.name}</h3>
                  <p className="text-3xl font-bold text-golden">${selectedPlan.price}/month</p>
                </div>
              )}

              <div>
                <Label htmlFor="email-input">Email Address</Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              {plans.length > 0 && (
                <div>
                  <Label>Select Plan</Label>
                  <div className="mt-2 space-y-2">
                    {plans.map((plan) => (
                      <label key={plan.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.id}
                          checked={selectedPlanId === plan.id}
                          onChange={(e) => setSelectedPlanId(e.target.value)}
                          className="text-golden"
                        />
                        <div className="flex-1">
                          <div className="font-semibold">{plan.name}</div>
                          <div className="text-golden font-bold">${plan.price}/month</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={() => {/* Continue to payment */}}
                disabled={!email || !selectedPlanId}
                className="w-full bg-golden hover:bg-golden/90 text-charcoal font-semibold"
              >
                Continue to Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="max-w-md mx-auto pt-20 px-4">
        <Button
          variant="ghost"
          onClick={() => setEmail("")}
          className="mb-8 text-charcoal hover:text-golden"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl text-center">
              Complete Your Subscription
            </CardTitle>
            {selectedPlan && (
              <div className="text-center">
                <p className="text-lg">{selectedPlan.name} Plan</p>
                <p className="text-2xl font-bold text-golden">${selectedPlan.price}/month</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <CheckoutForm planId={selectedPlanId} email={email} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
