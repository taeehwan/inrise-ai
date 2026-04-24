import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Star, 
  Check, 
  Clock,
  MessageSquare,
  User,
  Trash2,
  Globe,
  Trophy
} from "lucide-react";

interface Review {
  id: string;
  userId: string;
  rating: number;
  comment: string;
  reviewerName: string;
  reviewerCountry: string;
  examType: "toefl" | "gre" | "general" | null;
  achievedScore: number | null;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminReviews() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ['/api/admin/reviews'],
    enabled: !!user && user.role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("PUT", `/api/admin/reviews/${reviewId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      toast({
        title: "승인 완료",
        description: "후기가 승인되어 공개됩니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "승인 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/admin/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reviews'] });
      toast({
        title: "삭제 완료",
        description: "후기가 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "삭제 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#1e293b] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#1e293b] flex items-center justify-center text-white">
        <p>접근 권한이 없습니다.</p>
      </div>
    );
  }

  const pendingReviews = reviews.filter(r => !r.isApproved);
  const approvedReviews = reviews.filter(r => r.isApproved);

  const examTypeLabel = (type: string | null) => {
    if (!type) return null;
    return type.toUpperCase();
  };

  const ReviewCard = ({ review, isPending }: { review: Review; isPending: boolean }) => (
    <div 
      key={review.id} 
      className={`rounded-xl p-5 border ${isPending ? 'bg-slate-700/50 border-white/10' : 'bg-slate-700/30 border-emerald-500/20'}`}
      data-testid={isPending ? `pending-review-${review.id}` : `approved-review-${review.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${isPending ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{review.reviewerName}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {review.reviewerCountry}
              </span>
              {review.examType && (
                <Badge variant="outline" className="text-xs border-slate-500 text-slate-300 py-0">
                  {examTypeLabel(review.examType)}
                </Badge>
              )}
              {review.achievedScore && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Trophy className="h-3 w-3" />
                  {review.achievedScore}점
                </span>
              )}
              {!isPending && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs py-0">
                  승인됨
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPending && (
            <Button
              onClick={() => approveMutation.mutate(review.id)}
              disabled={approveMutation.isPending || deleteMutation.isPending}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid={`approve-review-${review.id}`}
            >
              <Check className="h-4 w-4 mr-1" />
              승인
            </Button>
          )}
          <Button
            onClick={() => {
              if (confirm('이 후기를 삭제하시겠습니까?')) {
                deleteMutation.mutate(review.id);
              }
            }}
            disabled={approveMutation.isPending || deleteMutation.isPending}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            data-testid={`delete-review-${review.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`h-4 w-4 ${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`} 
          />
        ))}
        <span className="text-sm text-gray-400 ml-1">{review.rating}/5</span>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(review.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e293b] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button className="bg-[#334155] border border-white/20 text-white hover:bg-[#475569]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-rose-400" />
            후기 관리
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <Clock className="h-9 w-9 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-amber-400 text-sm">승인 대기</p>
                <p className="text-3xl font-bold text-white">{pendingReviews.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <Check className="h-9 w-9 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-emerald-400 text-sm">승인 완료</p>
                <p className="text-3xl font-bold text-white">{approvedReviews.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-5 flex items-center gap-4">
              <MessageSquare className="h-9 w-9 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-blue-400 text-sm">전체 후기</p>
                <p className="text-3xl font-bold text-white">{reviews.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {pendingReviews.length > 0 && (
          <Card className="bg-[#334155]/50 border-white/10 mb-8">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                승인 대기 중인 후기 ({pendingReviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {pendingReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} isPending={true} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {approvedReviews.length > 0 && (
          <Card className="bg-[#334155]/50 border-white/10">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-400" />
                승인된 후기 ({approvedReviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {approvedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} isPending={false} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {reviews.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">아직 등록된 후기가 없습니다.</p>
            <p className="text-gray-500 text-sm mt-2">학생들이 /my-page에서 후기를 작성하면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
