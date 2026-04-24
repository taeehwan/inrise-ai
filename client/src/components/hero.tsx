import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Hero() {
  const [, setLocation] = useLocation();

  return (
    <section className="relative bg-charcoal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              Discover Exclusive Art Content
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Join thousands of art enthusiasts accessing premium galleries, expert tutorials, and exclusive artist interviews. Experience art like never before.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="bg-golden text-charcoal px-8 py-4 rounded-full font-semibold hover:bg-golden/90 transition-all"
                onClick={() => setLocation("/subscribe")}
              >
                Start Free Trial
              </Button>
              <Button 
                variant="outline"
                className="border-golden text-golden px-8 py-4 rounded-full font-semibold hover:bg-golden hover:text-charcoal transition-all"
                onClick={() => document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Collections
              </Button>
            </div>
          </div>
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
              alt="Modern art gallery with dramatic lighting" 
              className="rounded-lg shadow-2xl w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
