import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Clock, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeaturedItem {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  requiredTier: string;
  createdAt: string;
}

export default function FeaturedContent() {
  const { data: content = [], isLoading } = useQuery<FeaturedItem[]>({
    queryKey: ['/api/content'],
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic": return "bg-cool-gray text-white";
      case "premium": return "bg-golden text-charcoal";
      case "collector": return "bg-charcoal text-white";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const contentDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - contentDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Added 1 day ago";
    if (diffDays < 7) return `Added ${diffDays} days ago`;
    if (diffDays < 14) return "Added 1 week ago";
    if (diffDays < 28) return `Added ${Math.floor(diffDays / 7)} weeks ago`;
    return "Added over a month ago";
  };

  if (isLoading) {
    return (
      <section className="py-20 bg-white" id="featured">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">Featured Collections</h2>
            <p className="text-xl text-cool-gray max-w-2xl mx-auto">
              Explore our curated selection of exclusive content, from contemporary exhibitions to classic masterpieces.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white" id="featured">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold mb-4">Featured Collections</h2>
          <p className="text-xl text-cool-gray max-w-2xl mx-auto">
            Explore our curated selection of exclusive content, from contemporary exhibitions to classic masterpieces.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.map((item) => (
            <div key={item.id} className="group cursor-pointer">
              <img 
                src={item.imageUrl} 
                alt={item.title}
                className="w-full h-64 object-cover rounded-lg mb-4 group-hover:shadow-xl transition-all duration-300"
              />
              <div className="flex items-center justify-between mb-2">
                <Badge className={getTierColor(item.requiredTier)}>
                  {item.requiredTier.charAt(0).toUpperCase() + item.requiredTier.slice(1)}
                </Badge>
                <div className="flex text-golden">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-current" />
                  ))}
                </div>
              </div>
              <h3 className="text-xl font-display font-semibold mb-2 group-hover:text-golden transition-colors">
                {item.title}
              </h3>
              <p className="text-cool-gray mb-4">
                {item.description}
              </p>
              <div className="flex items-center text-sm text-cool-gray">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatTimeAgo(item.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
