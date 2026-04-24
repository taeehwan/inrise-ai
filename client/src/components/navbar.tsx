import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Menu } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button 
              onClick={() => setLocation("/")}
              className="text-2xl font-display font-bold text-charcoal hover:text-golden transition-colors"
            >
              Artisan Collective
            </button>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#featured" className="text-charcoal hover:text-golden transition-colors font-medium">Collections</a>
              <a href="#" className="text-charcoal hover:text-golden transition-colors font-medium">Artists</a>
              <a href="#" className="text-charcoal hover:text-golden transition-colors font-medium">Exhibitions</a>
              <a href="#reviews" className="text-charcoal hover:text-golden transition-colors font-medium">Community</a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-charcoal hover:text-golden font-medium"
              onClick={() => setLocation("/dashboard")}
            >
              Sign In
            </Button>
            <Button 
              className="bg-golden text-charcoal px-6 py-2 rounded-full hover:bg-golden/90 transition-all font-medium"
              onClick={() => setLocation("/subscribe")}
            >
              Subscribe
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-charcoal hover:text-golden"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <a href="#featured" className="text-charcoal hover:text-golden transition-colors font-medium">Collections</a>
              <a href="#" className="text-charcoal hover:text-golden transition-colors font-medium">Artists</a>
              <a href="#" className="text-charcoal hover:text-golden transition-colors font-medium">Exhibitions</a>
              <a href="#reviews" className="text-charcoal hover:text-golden transition-colors font-medium">Community</a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
