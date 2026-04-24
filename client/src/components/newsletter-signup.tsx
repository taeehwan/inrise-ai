import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (email: string) => apiRequest("POST", "/api/newsletter", { email }),
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Thank you for subscribing to our newsletter.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    mutation.mutate(email);
  };

  return (
    <section className="py-20 bg-golden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-display font-bold text-charcoal mb-4">
          Stay Connected with Art
        </h2>
        <p className="text-xl text-charcoal mb-8 max-w-2xl mx-auto">
          Get weekly art insights, exhibition announcements, and exclusive previews delivered to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-4">
          <Input 
            type="email" 
            placeholder="Enter your email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-full border-0 focus:ring-2 focus:ring-charcoal" 
            required
          />
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            className="bg-charcoal text-white px-8 py-3 rounded-full font-semibold hover:bg-charcoal/90 transition-all whitespace-nowrap"
          >
            {mutation.isPending ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
        <p className="text-sm text-charcoal mt-4 opacity-80">
          No spam, just great art content. Unsubscribe anytime.
        </p>
      </div>
    </section>
  );
}
