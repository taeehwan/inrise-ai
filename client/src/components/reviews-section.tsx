import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Quote, TrendingUp, Award, Globe, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Review } from "@shared/schema";

// Normalize an Unsplash URL to a given pixel width — we drop the hardcoded
// ?w=1000 used in review data and let the browser pick the right variant via
// srcset. Saves ~50-100KB on mobile viewports.
function unsplashAtWidth(url: string, width: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    return u.toString();
  } catch {
    return url;
  }
}

function unsplashSrcSet(url: string): string {
  return [
    `${unsplashAtWidth(url, 375)} 375w`,
    `${unsplashAtWidth(url, 640)} 640w`,
    `${unsplashAtWidth(url, 1000)} 1000w`,
  ].join(", ");
}

// 유튜브 URL을 embed URL로 변환하는 헬퍼 함수
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // 다양한 유튜브 URL 형식 지원
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  return null;
}

export default function ReviewsSection() {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: successStories = [] } = useQuery<any[]>({
    queryKey: ["/api/success-stories"],
  });

  const { data: stats } = useQuery<{ averageRating: number; totalReviews: number }>({
    queryKey: ["/api/reviews/stats"],
  });

  // Combine API data with hardcoded data
  const apiStories = successStories
    .filter((story: any) => story.isActive !== false)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Enhanced review data with background images and videos
  const enhancedReviews = [
    ...apiStories,
    {
      id: 1,
      name: "Maria Rodriguez",
      country: "Mexico",
      score: "TOEFL 108",
      rating: 5,
      review: "iNRISE helped me improve my TOEFL score from 85 to 108! The practice tests are very similar to the real exam, and the detailed explanations helped me understand my mistakes.",
      backgroundImage: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-blue-500 to-purple-600",
      initials: "MR"
    },
    {
      id: 2,
      name: "Rajesh Patel",
      country: "India",
      score: "GRE 325",
      rating: 5,
      review: "The GRE practice tests were exactly what I needed. I went from 310 to 325 in just 3 months! The analytical writing section feedback was particularly helpful.",
      backgroundImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-green-500 to-emerald-600",
      initials: "RP"
    },
    {
      id: 3,
      name: "Zhang Wei",
      country: "China",
      score: "TOEFL 115",
      rating: 5,
      review: "Perfect platform for TOEFL preparation! The speaking practice with AI feedback helped me overcome my pronunciation issues. Highly recommended for international students.",
      backgroundImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-purple-500 to-pink-600",
      initials: "ZW"
    },
    {
      id: 4,
      name: "Fatima Al-Zahra",
      country: "UAE",
      score: "GRE 330",
      rating: 5,
      review: "Amazing GRE prep tool! The quantitative section practice helped me achieve a perfect score. The explanations are clear and the difficulty progression is perfect.",
      backgroundImage: "https://images.unsplash.com/photo-1494790108755-2616c0763c4c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-orange-500 to-red-600",
      initials: "FA"
    },
    {
      id: 5,
      name: "João Silva",
      country: "Brazil",
      score: "TOEFL 112",
      rating: 5,
      review: "Consegui melhorar meu TOEFL de 95 para 112! The reading section practice was incredibly helpful. The interface is user-friendly and the progress tracking keeps me motivated.",
      backgroundImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-teal-500 to-cyan-600",
      initials: "JS"
    },
    {
      id: 6,
      name: "Priya Sharma",
      country: "India",
      score: "TOEFL 109",
      rating: 5,
      review: "The listening section was my weakness, but iNRISE's practice tests helped me improve dramatically. The variety of accents in the audio samples was very realistic.",
      backgroundImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
      videoUrl: null,
      accent: "from-indigo-500 to-purple-600",
      initials: "PS"
    }
  ];

  // Auto-rotate reviews every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % enhancedReviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [enhancedReviews.length]);

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % enhancedReviews.length);
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + enhancedReviews.length) % enhancedReviews.length);
  };

  const currentReview = enhancedReviews[currentReviewIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-20">
        <Badge className="mb-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 px-6 py-2 text-sm font-medium">
          🌟 성공 스토리
        </Badge>
        <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          전 세계에서 온 <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">성공 이야기</span>
        </h2>
        <p className="text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
          iNRISE와 함께 꿈의 점수를 달성한 
          <span className="font-semibold text-purple-600">실제 학생들의 후기</span>와 
          성공 경험을 확인해보세요
        </p>
        
        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Star className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.averageRating?.toFixed(1) || '4.8'}</div>
            <div className="text-sm text-gray-600">평균 만족도</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{stats?.totalReviews || '500'}+</div>
            <div className="text-sm text-gray-600">성공 사례</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">+25</div>
            <div className="text-sm text-gray-600">평균 점수 향상</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">98%</div>
            <div className="text-sm text-gray-600">목표 달성률</div>
          </div>
        </div>
      </div>

      {/* Featured Review Carousel */}
      <div className="relative max-w-6xl mx-auto mb-16">
        <div className="flex items-center justify-center gap-8">
          {/* Left Arrow */}
          <Button
            variant="outline"
            size="lg"
            onClick={prevReview}
            className="h-16 w-16 rounded-full border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 shadow-lg"
          >
            <ChevronLeft className="h-8 w-8 text-purple-600" />
          </Button>

          {/* Main Review Card */}
          <Card className="relative border-0 bg-white shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden group w-full max-w-4xl">
            {/* Background Image or Video */}
            {currentReview.videoUrl ? (
              <div className="absolute inset-0 opacity-15 group-hover:opacity-20 transition-opacity duration-500">
                <iframe
                  src={getYouTubeEmbedUrl(currentReview.videoUrl) || ''}
                  className="w-full h-full object-cover pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 'none' }}
                />
              </div>
            ) : (
              <img
                src={unsplashAtWidth(currentReview.backgroundImage, 640)}
                srcSet={unsplashSrcSet(currentReview.backgroundImage)}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 64rem"
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-10 group-hover:opacity-15 transition-opacity duration-500"
              />
            )}
            
            {/* Gradient Overlay */}
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${currentReview.accent}`}></div>
            
            <CardHeader className="relative p-12 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-1">
                  {[...Array(currentReview.rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                  ))}
                </div>
                <Quote className="h-12 w-12 text-purple-500/20" />
              </div>
              <Badge className="bg-purple-100 text-purple-800 border-0 mb-6 w-fit text-lg px-4 py-2">
                {currentReview.score}
              </Badge>
              <CardDescription className="text-gray-700 text-xl leading-relaxed">
                "{currentReview.review}"
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative p-12 pt-0">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${currentReview.accent} rounded-full flex items-center justify-center shadow-lg`}>
                  <span className="text-white font-bold text-xl">{currentReview.initials}</span>
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-xl">{currentReview.name}</div>
                  <div className="flex items-center gap-2 text-lg text-gray-600">
                    <Flag className="h-5 w-5" />
                    {currentReview.country} | Verified Student
                  </div>
                </div>
              </div>
            </CardContent>
            
            {/* Review Navigation Dots */}
            <div className="absolute bottom-4 right-6 flex gap-2">
              {enhancedReviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReviewIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentReviewIndex 
                      ? 'bg-purple-600 scale-125' 
                      : 'bg-purple-300 hover:bg-purple-400'
                  }`}
                />
              ))}
            </div>
          </Card>

          {/* Right Arrow */}
          <Button
            variant="outline"
            size="lg"
            onClick={nextReview}
            className="h-16 w-16 rounded-full border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 shadow-lg"
          >
            <ChevronRight className="h-8 w-8 text-purple-600" />
          </Button>
        </div>
        
        {/* Review Counter */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-lg">
            {currentReviewIndex + 1} / {enhancedReviews.length} 성공 스토리
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-20">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl lg:text-4xl font-bold mb-6">
            당신도 성공 스토리의 주인공이 되어보세요!
          </h3>
          <p className="text-xl mb-8 opacity-90">
            수천 명의 학생들이 검증한 AI 기반 학습 시스템으로 목표 점수를 달성하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/tests">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-semibold px-8 py-3 text-lg">
                무료 모의고사 시작하기
              </Button>
            </Link>
            <Link href="/study-plan">
              <Button variant="outline" size="lg" className="border-2 border-white text-white hover:bg-white hover:text-purple-600 font-semibold px-8 py-3 text-lg transition-all duration-300">
                맞춤 학습 계획 보기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}