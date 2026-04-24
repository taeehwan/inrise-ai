import { ArrowLeft, Save, Trash2, Trophy, Upload, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Achievement } from "./shared";

interface AdminAchievementFormProps {
  editingAchievement: Achievement | null;
  photoUrl: string;
  videoUrl: string;
  previousScore: number;
  currentScore: number;
  examType: "toefl" | "gre";
  reviewText: string;
  reviewerName: string;
  reviewerCountry: string;
  rating: number;
  isDisplayed: boolean;
  displayOrder: number;
  uploadingImage: boolean;
  onPhotoUrlChange: (value: string) => void;
  onVideoUrlChange: (value: string) => void;
  onPreviousScoreChange: (value: number) => void;
  onCurrentScoreChange: (value: number) => void;
  onExamTypeChange: (value: "toefl" | "gre") => void;
  onReviewTextChange: (value: string) => void;
  onReviewerNameChange: (value: string) => void;
  onReviewerCountryChange: (value: string) => void;
  onRatingChange: (value: number) => void;
  onIsDisplayedChange: (value: boolean) => void;
  onDisplayOrderChange: (value: number) => void;
  onImageUpload: (file: File) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function AdminAchievementForm({
  editingAchievement,
  photoUrl,
  videoUrl,
  previousScore,
  currentScore,
  examType,
  reviewText,
  reviewerName,
  reviewerCountry,
  rating,
  isDisplayed,
  displayOrder,
  uploadingImage,
  onPhotoUrlChange,
  onVideoUrlChange,
  onPreviousScoreChange,
  onCurrentScoreChange,
  onExamTypeChange,
  onReviewTextChange,
  onReviewerNameChange,
  onReviewerCountryChange,
  onRatingChange,
  onIsDisplayedChange,
  onDisplayOrderChange,
  onImageUpload,
  onSubmit,
  onCancel,
}: AdminAchievementFormProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-200/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex items-center gap-2 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <ArrowLeft className="w-4 h-4" />
                목록으로
              </Button>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-amber-800 to-orange-800 bg-clip-text text-transparent">
                    {editingAchievement ? "후기 수정" : "새 후기 등록"}
                  </h1>
                  <p className="text-sm text-slate-600 font-medium mt-1">학생들의 성공 스토리를 등록하세요</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="border-0 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">성취 정보</CardTitle>
            <CardDescription className="text-base">학생들의 성공 스토리를 등록하여 랜딩페이지에 표시할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">성취 사진 *</Label>
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                {photoUrl ? (
                  <div className="relative">
                    <img
                      src={photoUrl}
                      alt="Achievement"
                      className="w-full max-w-md h-64 object-cover rounded-xl mx-auto shadow-lg"
                    />
                    <Button
                      onClick={() => onPhotoUrlChange("")}
                      variant="destructive"
                      size="sm"
                      className="absolute top-4 right-4 shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        if (event.target.files?.[0]) {
                          onImageUpload(event.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-3"
                    >
                      <div className="p-4 bg-blue-100 rounded-full">
                        <Upload className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <span className="text-base font-medium text-gray-700 block">
                          {uploadingImage ? "업로드 중..." : "성취 사진을 업로드하세요"}
                        </span>
                        <span className="text-sm text-gray-500 mt-1 block">JPG, PNG 파일 (최대 5MB)</span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="exam-type" className="text-base font-semibold">시험 종류 *</Label>
                <Select value={examType} onValueChange={onExamTypeChange}>
                  <SelectTrigger className="h-12 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toefl">TOEFL</SelectItem>
                    <SelectItem value="gre">GRE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">별점 *</Label>
                <div className="flex space-x-2 pt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 cursor-pointer transition-all ${
                        star <= rating ? "text-yellow-400 fill-current scale-110" : "text-gray-300 hover:text-gray-400"
                      }`}
                      onClick={() => onRatingChange(star)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="previous-score" className="text-base font-semibold">이전 점수 *</Label>
                <Input
                  id="previous-score"
                  type="number"
                  value={previousScore}
                  onChange={(event) => onPreviousScoreChange(Number(event.target.value))}
                  placeholder="85"
                  className="h-12 border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="current-score" className="text-base font-semibold">현재 점수 *</Label>
                <Input
                  id="current-score"
                  type="number"
                  value={currentScore}
                  onChange={(event) => onCurrentScoreChange(Number(event.target.value))}
                  placeholder="108"
                  className="h-12 border-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="review-text" className="text-base font-semibold">후기 내용 *</Label>
              <Textarea
                id="review-text"
                value={reviewText}
                onChange={(event) => onReviewTextChange(event.target.value)}
                placeholder="학생의 성공 스토리를 입력하세요..."
                rows={5}
                className="border-2 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="reviewer-name" className="text-base font-semibold">작성자 이름 *</Label>
                <Input
                  id="reviewer-name"
                  value={reviewerName}
                  onChange={(event) => onReviewerNameChange(event.target.value)}
                  placeholder="Maria Rodriguez"
                  className="h-12 border-2"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="reviewer-country" className="text-base font-semibold">국가 *</Label>
                <Input
                  id="reviewer-country"
                  value={reviewerCountry}
                  onChange={(event) => onReviewerCountryChange(event.target.value)}
                  placeholder="Mexico"
                  className="h-12 border-2"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="video-url" className="text-base font-semibold">유튜브 영상 URL (선택사항)</Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(event) => onVideoUrlChange(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="h-12 border-2"
              />
              <p className="text-sm text-gray-500">유튜브 영상 URL을 입력하면 사진 대신 영상이 표시됩니다</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is-displayed"
                  checked={isDisplayed}
                  onChange={(event) => onIsDisplayedChange(event.target.checked)}
                  className="w-5 h-5 rounded border-2"
                />
                <Label htmlFor="is-displayed" className="text-base font-medium cursor-pointer">랜딩페이지에 표시</Label>
              </div>
              <div className="space-y-3">
                <Label htmlFor="display-order" className="text-base font-semibold">표시 순서</Label>
                <Input
                  id="display-order"
                  type="number"
                  value={displayOrder}
                  onChange={(event) => onDisplayOrderChange(Number(event.target.value))}
                  placeholder="0"
                  className="h-12 border-2"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <Button
                onClick={onSubmit}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 text-base font-semibold shadow-lg"
              >
                <Save className="w-5 h-5" />
                {editingAchievement ? "수정하기" : "등록하기"}
              </Button>
              <Button
                onClick={onCancel}
                variant="outline"
                className="h-12 px-8 border-2 text-base font-semibold"
              >
                취소
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
