import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Search, 
  Filter, 
  Star, 
  Calendar, 
  Eye,
  ThumbsUp,
  Clock,
  Users,
  Globe,
  BookOpen,
  BarChart3,
  Target,
  Award
} from "lucide-react";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoId: string;
  duration: string;
  views: number;
  likes: number;
  publishedAt: string;
  category: "toefl" | "gre" | "general";
  difficulty: "beginner" | "intermediate" | "advanced";
  score: number;
  country: string;
  tags: string[];
}

// Mock YouTube reviews data
const mockYouTubeVideos: YouTubeVideo[] = [
  {
    id: "1",
    title: "TOEFL 85점에서 108점까지! 3개월 만에 23점 향상한 실제 후기",
    description: "한국 대학생이 미국 대학원 진학을 위해 TOEFL 점수를 크게 향상시킨 실제 경험담입니다.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "12:45",
    views: 25640,
    likes: 1240,
    publishedAt: "2024-01-15",
    category: "toefl",
    difficulty: "intermediate",
    score: 108,
    country: "한국",
    tags: ["실제후기", "점수향상", "학습법", "대학원진학"]
  },
  {
    id: "2",
    title: "GRE 320점 달성! 수학 만점으로 합격한 공대생의 학습 전략",
    description: "공학도로서 GRE에서 높은 점수를 받아 미국 공과대학에 진학한 경험을 공유합니다.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "15:22",
    views: 18750,
    likes: 890,
    publishedAt: "2024-01-20",
    category: "gre",
    difficulty: "advanced",
    score: 320,
    country: "한국",
    tags: ["GRE수학", "만점", "공대생", "학습전략"]
  },
  {
    id: "3",
    title: "TOEFL 100점 돌파! 스피킹 28점 받은 비결 대공개",
    description: "스피킹이 약했던 학생이 어떻게 28점까지 올릴 수 있었는지 상세한 팁을 알려드립니다.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "18:30",
    views: 42100,
    likes: 2150,
    publishedAt: "2024-02-01",
    category: "toefl",
    difficulty: "intermediate",
    score: 100,
    country: "한국",
    tags: ["스피킹", "발음교정", "유창성", "실전팁"]
  },
  {
    id: "4",
    title: "Working Student's GRE Journey: From 305 to 325 in 4 months",
    description: "A working professional's journey to achieve a high GRE score while managing a full-time job.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "20:15",
    views: 15600,
    likes: 750,
    publishedAt: "2024-01-28",
    category: "gre",
    difficulty: "advanced",
    score: 325,
    country: "미국",
    tags: ["직장인", "시간관리", "효율학습", "고득점"]
  },
  {
    id: "5",
    title: "TOEFL Writing 29점! 라이팅 고득점 템플릿과 실전 활용법",
    description: "라이팅에서 만점에 가까운 점수를 받기 위한 구체적인 템플릿과 실전 적용 방법을 알려드립니다.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "14:50",
    views: 31200,
    likes: 1580,
    publishedAt: "2024-02-10",
    category: "toefl",
    difficulty: "advanced",
    score: 29,
    country: "캐나다",
    tags: ["라이팅", "템플릿", "에세이", "고득점"]
  },
  {
    id: "6",
    title: "GRE Verbal 160점 달성한 비영어권 학생의 어휘 학습법",
    description: "영어가 모국어가 아닌 학생이 GRE Verbal에서 고득점을 받은 체계적인 어휘 학습 방법을 공유합니다.",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoId: "dQw4w9WgXcQ",
    duration: "16:40",
    views: 28900,
    likes: 1350,
    publishedAt: "2024-02-15",
    category: "gre",
    difficulty: "intermediate",
    score: 160,
    country: "일본",
    tags: ["어휘", "단어암기", "Verbal", "체계적학습"]
  }
];

export default function YouTubeReviews() {
  const [videos, setVideos] = useState<YouTubeVideo[]>(mockYouTubeVideos);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "toefl" | "gre">("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || video.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || video.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "toefl": return <BookOpen className="h-4 w-4" />;
      case "gre": return <BarChart3 className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-800";
      case "intermediate": return "bg-yellow-100 text-yellow-800";
      case "advanced": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatViews = (views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">성공 스토리 영상</h1>
            <p className="text-gray-600 mt-2">실제 수험생들의 생생한 합격 후기와 학습 노하우를 영상으로 만나보세요</p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="영상 검색..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
              >
                <option value="all">전체 시험</option>
                <option value="toefl">TOEFL</option>
                <option value="gre">GRE</option>
              </select>

              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              >
                <option value="all">전체 수준</option>
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Video Player Section */}
        {selectedVideo && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>

                {/* Video Info */}
                <div>
                  <div className="flex items-start gap-3 mb-4">
                    {getCategoryIcon(selectedVideo.category)}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedVideo.title}</h2>
                      <p className="text-gray-600 leading-relaxed mb-4">{selectedVideo.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">조회수 {formatViews(selectedVideo.views)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">좋아요 {selectedVideo.likes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{formatDate(selectedVideo.publishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{selectedVideo.country}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getCategoryIcon(selectedVideo.category)}
                      {selectedVideo.category.toUpperCase()}
                    </Badge>
                    <Badge className={getDifficultyColor(selectedVideo.difficulty)}>
                      {selectedVideo.difficulty === "beginner" ? "초급" : 
                       selectedVideo.difficulty === "intermediate" ? "중급" : "고급"}
                    </Badge>
                    {selectedVideo.score && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {selectedVideo.score}점
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedVideo.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Videos Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <Card 
              key={video.id} 
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
              onClick={() => setSelectedVideo(video)}
            >
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover rounded-t-lg"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/480x360/3B82F6/FFFFFF?text=YouTube+Video";
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-lg">
                  <Play className="h-12 w-12 text-white" fill="currentColor" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  {getCategoryIcon(video.category)}
                  <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1 text-sm leading-tight">
                    {video.title}
                  </h3>
                </div>

                <p className="text-gray-600 text-xs line-clamp-2 mb-3">
                  {video.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatViews(video.views)}
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {video.likes}
                    </div>
                  </div>
                  <span>{formatDate(video.publishedAt)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {video.category.toUpperCase()}
                    </Badge>
                    {video.score && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Target className="h-2 w-2" />
                        {video.score}점
                      </Badge>
                    )}
                  </div>
                  <Badge className={`${getDifficultyColor(video.difficulty)} text-xs`}>
                    {video.difficulty === "beginner" ? "초급" : 
                     video.difficulty === "intermediate" ? "중급" : "고급"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredVideos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600">
              다른 검색어를 입력하거나 필터를 조정해 보세요.
            </p>
          </div>
        )}

        {/* Load More */}
        {filteredVideos.length >= 6 && (
          <div className="text-center mt-12">
            <Button variant="outline" className="px-8 py-3">
              더 많은 영상 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}