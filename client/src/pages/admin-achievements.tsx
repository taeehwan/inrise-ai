import { lazy, Suspense, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, 
  Plus, 
  Edit, 
  Trash2,
  ArrowLeft,
  Save,
  Upload,
  Eye,
  EyeOff,
  Star,
  Home,
  TrendingUp,
  Award
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Achievement } from "@/components/admin-achievements/shared";

const AdminAchievementForm = lazy(() => import("@/components/admin-achievements/AdminAchievementForm"));

export default function AdminAchievementsPanel() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  
  // Form states
  const [photoUrl, setPhotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [previousScore, setPreviousScore] = useState<number>(0);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [examType, setExamType] = useState<"toefl" | "gre">("toefl");
  const [reviewText, setReviewText] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerCountry, setReviewerCountry] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [isDisplayed, setIsDisplayed] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);

  // Upload states
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/admin-login");
      return;
    }

    if (!isLoading && isAuthenticated && user?.role !== "admin") {
      toast({
        title: "접근 거부",
        description: "관리자 권한이 필요합니다.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/");
      }, 1500);
      return;
    }
  }, [isLoading, isAuthenticated, user, toast]);

  useEffect(() => {
    if (isAuthenticated && user?.role === "admin") {
      loadAchievements();
    }
  }, [isAuthenticated, user]);

  const loadAchievements = async () => {
    try {
      setLoadingAchievements(true);
      const response = await apiRequest("GET", "/api/admin/achievements");
      const achievementsData = await response.json();
      setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
    } catch (error: any) {
      console.error("Achievements load error:", error);
      toast({
        title: "성취 목록 로드 실패",
        description: "성취 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingAchievements(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/admin/upload-achievement-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('이미지 업로드 실패');
      }

      const { imageUrl } = await response.json();
      setPhotoUrl(imageUrl);
      
      toast({
        title: "이미지 업로드 완료",
        description: "성취 이미지가 성공적으로 업로드되었습니다.",
      });
    } catch (error: any) {
      toast({
        title: "이미지 업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!photoUrl.trim() || !reviewText.trim() || !reviewerName.trim() || !reviewerCountry.trim()) {
      toast({
        title: "입력 오류",
        description: "필수 정보를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (previousScore >= currentScore) {
      toast({
        title: "점수 오류",
        description: "현재 점수가 이전 점수보다 높아야 합니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      const achievementData = {
        photoUrl: photoUrl.trim(),
        videoUrl: videoUrl.trim() || undefined,
        previousScore,
        currentScore,
        examType,
        reviewText: reviewText.trim(),
        reviewerName: reviewerName.trim(),
        reviewerCountry: reviewerCountry.trim(),
        rating,
        isDisplayed,
        displayOrder,
        isActive: true
      };

      let response;
      if (editingAchievement) {
        response = await apiRequest("PUT", `/api/admin/achievements/${editingAchievement.id}`, achievementData);
      } else {
        response = await apiRequest("POST", "/api/admin/achievements", achievementData);
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "성취 저장 실패");
      }

      toast({
        title: editingAchievement ? "성취 수정 완료" : "성취 생성 완료",
        description: `성취가 성공적으로 ${editingAchievement ? "수정" : "생성"}되었습니다.`,
      });

      resetForm();
      loadAchievements();
    } catch (error: any) {
      toast({
        title: editingAchievement ? "성취 수정 실패" : "성취 생성 실패",
        description: error.message || "오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const toggleDisplayStatus = async (achievement: Achievement) => {
    try {
      const response = await apiRequest("PUT", `/api/admin/achievements/${achievement.id}`, {
        ...achievement,
        isDisplayed: !achievement.isDisplayed
      });

      if (!response.ok) {
        throw new Error("표시 상태 변경 실패");
      }

      toast({
        title: "표시 상태 변경 완료",
        description: `${achievement.isDisplayed ? "랜딩페이지에서 숨김" : "랜딩페이지에 표시"} 처리되었습니다.`,
      });

      loadAchievements();
    } catch (error: any) {
      toast({
        title: "표시 상태 변경 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!confirm("정말로 이 성취를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await apiRequest("DELETE", `/api/admin/achievements/${id}`);

      if (!response.ok) {
        throw new Error("삭제 실패");
      }

      toast({
        title: "삭제 완료",
        description: "성취가 성공적으로 삭제되었습니다.",
      });

      loadAchievements();
    } catch (error: any) {
      toast({
        title: "삭제 실패",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setPhotoUrl("");
    setVideoUrl("");
    setPreviousScore(0);
    setCurrentScore(0);
    setExamType("toefl");
    setReviewText("");
    setReviewerName("");
    setReviewerCountry("");
    setRating(5);
    setIsDisplayed(false);
    setDisplayOrder(0);
    setShowCreateForm(false);
    setEditingAchievement(null);
  };

  const editAchievement = (achievement: Achievement) => {
    setPhotoUrl(achievement.photoUrl);
    setVideoUrl(achievement.videoUrl || "");
    setPreviousScore(achievement.previousScore);
    setCurrentScore(achievement.currentScore);
    setExamType(achievement.examType);
    setReviewText(achievement.reviewText);
    setReviewerName(achievement.reviewerName);
    setReviewerCountry(achievement.reviewerCountry);
    setRating(achievement.rating);
    setIsDisplayed(achievement.isDisplayed);
    setDisplayOrder(achievement.displayOrder);
    setEditingAchievement(achievement);
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showCreateForm || editingAchievement) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>}>
        <AdminAchievementForm
          editingAchievement={editingAchievement}
          photoUrl={photoUrl}
          videoUrl={videoUrl}
          previousScore={previousScore}
          currentScore={currentScore}
          examType={examType}
          reviewText={reviewText}
          reviewerName={reviewerName}
          reviewerCountry={reviewerCountry}
          rating={rating}
          isDisplayed={isDisplayed}
          displayOrder={displayOrder}
          uploadingImage={uploadingImage}
          onPhotoUrlChange={setPhotoUrl}
          onVideoUrlChange={setVideoUrl}
          onPreviousScoreChange={setPreviousScore}
          onCurrentScoreChange={setCurrentScore}
          onExamTypeChange={setExamType}
          onReviewTextChange={setReviewText}
          onReviewerNameChange={setReviewerName}
          onReviewerCountryChange={setReviewerCountry}
          onRatingChange={setRating}
          onIsDisplayedChange={setIsDisplayed}
          onDisplayOrderChange={setDisplayOrder}
          onImageUpload={handleImageUpload}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Navigation */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-amber-800 to-orange-800 bg-clip-text text-transparent">
                  성취 관리
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-1">학생들의 성공 스토리를 관리합니다</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setLocation("/admin")}
                variant="outline"
                className="flex items-center gap-2 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <Home className="w-4 h-4" />
                관리자 홈
              </Button>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 shadow-lg"
                data-testid="button-create-achievement"
              >
                <Plus className="w-5 h-5" />
                새 후기 등록
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-amber-50 via-amber-100 to-orange-200/70 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">총 성취</p>
                  <p className="text-3xl font-bold text-amber-900">{achievements.length}</p>
                </div>
                <div className="p-3 bg-amber-600 rounded-2xl shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-emerald-50 via-emerald-100 to-green-200/70 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900 mb-1">표시 중</p>
                  <p className="text-3xl font-bold text-emerald-900">{achievements.filter(a => a.isDisplayed).length}</p>
                </div>
                <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-yellow-50 via-yellow-100 to-amber-200/70 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">평균 별점</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {achievements.length > 0 
                      ? (achievements.reduce((sum, a) => sum + a.rating, 0) / achievements.length).toFixed(1)
                      : "0.0"
                    }
                  </p>
                </div>
                <div className="p-3 bg-yellow-600 rounded-2xl shadow-lg">
                  <Star className="h-8 w-8 text-white" fill="currentColor" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200/70 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">평균 향상</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {achievements.length > 0 
                      ? Math.round(achievements.reduce((sum, a) => sum + (a.currentScore - a.previousScore), 0) / achievements.length)
                      : "0"
                    }점
                  </p>
                </div>
                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 성취 목록 */}
        <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-600" />
              성취 목록
            </CardTitle>
            <CardDescription className="text-base">등록된 성취들을 관리하고 랜딩페이지 표시 여부를 설정할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAchievements ? (
              <div className="text-center py-12">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-600 font-medium">성취 목록을 불러오는 중...</p>
              </div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Trophy className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-700 mb-2">등록된 성취가 없습니다</p>
                <p className="text-gray-500">첫 번째 성취를 등록해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements
                  .sort((a, b) => b.displayOrder - a.displayOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((achievement) => (
                    <div 
                      key={achievement.id} 
                      className="group border-2 border-gray-200 rounded-xl p-6 bg-white hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 hover:border-blue-300 transition-all duration-300 shadow-sm hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex gap-6 flex-1">
                          <img 
                            src={achievement.photoUrl} 
                            alt="Achievement"
                            className="w-24 h-24 object-cover rounded-xl shadow-md group-hover:shadow-xl transition-shadow"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge 
                                variant={achievement.examType === "toefl" ? "default" : "secondary"}
                                className="px-3 py-1 text-sm font-semibold"
                              >
                                {achievement.examType.toUpperCase()}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-5 h-5 ${
                                      star <= achievement.rating ? "text-yellow-400 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              {achievement.isDisplayed && (
                                <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50 px-3 py-1">
                                  <Eye className="w-3 h-3 mr-1" />
                                  표시 중
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mb-3">
                              <span className="text-xl font-bold text-gray-700">{achievement.previousScore}</span>
                              <span className="text-gray-400 text-lg">→</span>
                              <span className="text-xl font-bold text-blue-600">{achievement.currentScore}</span>
                              <span className="text-base text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">
                                +{achievement.currentScore - achievement.previousScore}점
                              </span>
                            </div>
                            <p className="text-gray-700 text-base mb-3 line-clamp-2 leading-relaxed">{achievement.reviewText}</p>
                            <p className="text-sm text-gray-500 font-medium">
                              - {achievement.reviewerName}, {achievement.reviewerCountry}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => toggleDisplayStatus(achievement)}
                            variant="outline"
                            size="sm"
                            className={`h-10 px-4 border-2 ${
                              achievement.isDisplayed 
                                ? "text-orange-600 border-orange-300 hover:bg-orange-50" 
                                : "text-green-600 border-green-300 hover:bg-green-50"
                            }`}
                          >
                            {achievement.isDisplayed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button
                            onClick={() => editAchievement(achievement)}
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 border-2 border-blue-300 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => deleteAchievement(achievement.id)}
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 text-red-600 border-2 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
