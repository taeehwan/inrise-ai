import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-display font-bold mb-4">Artisan Collective</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Connecting art enthusiasts with exclusive content, expert insights, and a vibrant community of collectors, curators, and artists from around the world.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-golden transition-colors">
                <Instagram className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-golden transition-colors">
                <Twitter className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-golden transition-colors">
                <Facebook className="w-6 h-6" />
              </a>
              <a href="#" className="text-gray-300 hover:text-golden transition-colors">
                <Youtube className="w-6 h-6" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Collections</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Exhibitions</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Artists</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Live Talks</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Community</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Contact Us</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-gray-300 hover:text-golden transition-colors">Billing</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">
            © 2024 Artisan Collective. All rights reserved.
          </p>
          <div className="flex items-center mt-4 md:mt-0">
            <span className="text-gray-300 text-sm mr-4">Powered by</span>
            <span className="text-2xl text-gray-300">Stripe</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
