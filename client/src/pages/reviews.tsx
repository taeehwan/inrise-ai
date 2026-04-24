import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Star, 
  Quote, 
  Play, 
  ArrowUpRight,
  TrendingUp,
  Users,
  ExternalLink,
  PenLine
} from "lucide-react";
import { Link } from "wouter";
import ReviewForm from "@/components/review-form";

const realReviews = [
  {
    id: 0,
    name: '장오선',
    school: '학생',
    period: '약 4개월',
    beforeScore: null,
    afterScore: 120,
    rating: 5,
    comment: 'TOEFL은 학생의 재능을 측정하는 시험이 아니라, 정확한 방향을 알려주시는 전문성 있는 선생님을 만나면 빛을 발하는 시험이라는 것입니다. 선생님께서 제시해 주신 방식 그대로만 따라갔을 뿐인데, 점수는 자연스럽게 따라왔습니다. 단기간 고득점을 목표로 하신다면, 시행착오 없이 처음부터 iNTOEFL을 선택하시길 진심으로 추천 드립니다.'
  },
  {
    id: 1,
    name: '김호연',
    school: '일본 최상위권 국립대학교',
    period: '1.5개월',
    beforeScore: 65,
    afterScore: 95,
    rating: 5,
    comment: '예상보다 빨리 토플을 졸업할 수 있어서 기분이 아주 좋습니다. 토플 공부를 하면서 "과연 내가 해낼 수 있을까?"라는 의문을 수없이 품었지만, 이 과정을 통해 해낼 수 있었습니다.'
  },
  {
    id: 2,
    name: '이승찬',
    school: 'POSTECH',
    period: '1개월',
    beforeScore: 101,
    afterScore: 112,
    rating: 5,
    comment: '수업 시간때 하는 문제 풀이로 궁금한건 바로 질문해서 의문점이 해소가 되는게 좋았습니다. 리딩 수업도 문제 유형 별로 풀이하는 제일 효율적인 팁들을 선생님께 얻었습니다.'
  },
  {
    id: 3,
    name: '배주호',
    school: 'KAIST',
    period: '3회 수업',
    beforeScore: 96,
    afterScore: 110,
    rating: 5,
    comment: '즉각적인 피드백과 잘 정돈된 문제 해결 방법 덕분에 극적인 성장을 할 수 있었습니다. 다시 한번 Noah쌤께 감사하다고 말씀드리고 싶습니다.'
  },
  {
    id: 4,
    name: '김진현',
    school: '서울대학교',
    period: '2개월',
    beforeScore: 92,
    afterScore: 108,
    rating: 5,
    comment: '목표 점수를 받게 되어 더 좋은 대학과 나은 커리어를 꿈꿀 수 있게 되어 정말 기쁩니다. 인라이즈의 체계적인 커리큘럼 덕분입니다.'
  },
  {
    id: 5,
    name: '강명훈',
    school: '세종대학교 건축학과',
    period: '1개월',
    beforeScore: 85,
    afterScore: 101,
    rating: 5,
    comment: '우선 예상보다 빨리 토플을 졸업할 수 있어서 기분이 아주 좋습니다. 유학 준비 과정 전체에서 토플은 가장 기본적이면서도 중요한 관문 중 하나였습니다. 목표 점수를 받게 되어 더 좋은 대학과 나은 커리어를 꿈꿀 수 있게 되어 정말 기쁩니다.'
  },
  {
    id: 6,
    name: '엄정민',
    school: '대학생',
    period: '3주',
    beforeScore: 89,
    afterScore: 113,
    rating: 5,
    comment: 'Speaking 만점 30점을 실전 시험에서 받게 된건 인토플 수업과 첨삭 덕이었던것 같습니다. 나머지 섹션들도 꾸준히 과제를 통한 문제 풀이와 수업을 통해 도움이 많이 되었습니다.'
  },
  {
    id: 7,
    name: '김민서',
    school: '인서울 대학생',
    period: '1.5개월',
    beforeScore: 78,
    afterScore: 103,
    rating: 5,
    comment: '해외대학 프로그램에 참가하기 위한 커트라인을 이미 넘고도 남은 점수여서 뿌듯합니다. 처음 토플 치는 사람이 6주만에 100점을 넘기는 게 가능했습니다. 괜히 영어 잘하는 사람 된 기분이에요!ㅋㅋ'
  },
  {
    id: 8,
    name: '김경은',
    school: '서울대학교',
    period: '1개월',
    beforeScore: 80,
    afterScore: 97,
    rating: 5,
    comment: '무한 첨삭과 대부분 빠른 시간 내에 첨삭 피드백이 온다는 것이 인토플의 가장 큰 장점이라고 생각합니다. Speaking의 경우 첨삭 내용에서 어떠한 말이 들어갔을 때 점수가 인정되는지에 대해서도 알 수 있어서 도움이 됐습니다.'
  },
  {
    id: 9,
    name: '김민석',
    school: '대학생',
    period: '3주',
    beforeScore: 89,
    afterScore: 106,
    rating: 5,
    comment: '꼼꼼한 숙제 양식과 연습하기 충분한 숙제 자료들, 즉각적인 피드백 덕분에 Speaking & Writing에서 큰 도움을 받았습니다. Noah쌤께서 항상 열정적으로 포기하시지 않고 꾸준히 저의 잘못된 풀이 방법 및 해결 방법들을 알려주셨기에 극적인 성장을 할 수 있지 않았나 싶습니다.'
  },
  {
    id: 10,
    name: '조단',
    school: '인서울 대학생',
    period: '1개월',
    beforeScore: 98,
    afterScore: 119,
    rating: 5,
    comment: '제가 부족해보이는 부분을 정확히 짚어 주시고 어떻게 보완할 수 있는지 자세하게 설명해주셨습니다. 라이팅도 제출하면 무한으로 첨삭이 가능한 점, 거기다가 하루 내로 오는 빠른 피드백을 받을 수 있어 좋았습니다.'
  },
  {
    id: 11,
    name: '한*연',
    school: 'Wharton MBA',
    period: '2주',
    beforeScore: 105,
    afterScore: 113,
    rating: 5,
    comment: '수업시간 내에는 독립형을 순발력 있게 답변해보는 연습을 하고 바로 피드백을 받을 수 있었던 부분이 도움이 되었어요. 시간이 없어서 4회정도 수업 받고 시험을 봤는데도 점수가 올랐습니다.'
  },
  {
    id: 12,
    name: '임주형',
    school: '대학생',
    period: '1개월',
    beforeScore: 96,
    afterScore: 113,
    rating: 5,
    comment: '인토플 다니기 전에 토플 모의고사 봤을때는 96점 밖에 못받았었는데 학원 한달만 다니고 점수가 113점으로 훅 뛰었어요. 특히 스피킹이 약했어서 처음에는 수업중에 남들 앞에서 스피킹 하는게 부끄러웠는데 계속 하다보니 자신감도 생기고 실전 때도 떨지 않았습니다.'
  },
  {
    id: 13,
    name: '김세영',
    school: '예대생',
    period: '1개월',
    beforeScore: null,
    afterScore: 86,
    rating: 5,
    comment: '토플은 재미있는 시험이에요. 내가 몰랐던 세상의 구석구석에 대해 알 수 있거든요. 인토플에서 공부하면서 이 시험에 잡아먹히는 게 아니라, 공부하는 과정 자체에 애정과 흥미를 느끼고 제가 늘어가는 걸 느낄 수 있게 해주셨어요.'
  },
  {
    id: 14,
    name: '장지욱',
    school: '고려대학교',
    period: '2주',
    beforeScore: 103,
    afterScore: 110,
    rating: 5,
    comment: '수업시간 외에도 이메일로 피드백해주시며 계속 케어해주시는게 좋았습니다. 부족한 부분들 짚어주시면서 많이 신경써주시는 부분도 좋았습니다. 점수가 오르며 잘 마무리하게 되어 좋았습니다.'
  },
  ];

const YOUTUBE_PLAYLIST_ID = 'PLI7aoDzaakh_Ca8rGTe-v7PpEhOFAYaL8';

export default function ReviewsPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const filteredReviews = selectedFilter === "all" 
    ? realReviews 
    : realReviews.filter(r => r.beforeScore && r.afterScore);

  return (
    <div className="min-h-screen bg-[#070B17]">
      {/* Minimal Navigation */}
      <nav className="bg-[#070B17]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            iNRISE
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">홈</Link>
            <Link href="/tests" className="text-gray-400 hover:text-white text-sm transition-colors">테스트</Link>
            <span className="text-white text-sm font-medium">후기</span>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            실제 수강생 후기
          </h1>
          <p className="text-gray-400 text-lg mb-8">
            inrise.co.kr 실제 후기 기반
          </p>

          {/* Stats - Clean Pills */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
              <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
              <span className="text-white font-semibold">4.85</span>
              <span className="text-gray-500 text-sm">평점</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
              <Users className="h-4 w-4 text-emerald-400" />
              <span className="text-white font-semibold">2,500+</span>
              <span className="text-gray-500 text-sm">수강생</span>
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-white font-semibold">평균 +15점</span>
              <span className="text-gray-500 text-sm">상승</span>
            </div>
          </div>
        </div>

        {/* YouTube Video Section - Full Width */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">후기 영상</h2>
              <p className="text-gray-500 text-sm">@inriseedu 유튜브 채널</p>
            </div>
            <a 
              href="https://www.youtube.com/@inriseedu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors"
            >
              <Play className="h-4 w-4" />
              영상 후기 더보기
            </a>
          </div>

          {/* Video - Wide Layout */}
          <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl overflow-hidden border border-white/10 max-w-5xl mx-auto">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/videoseries?list=${YOUTUBE_PLAYLIST_ID}`}
              title="인라이즈 수강생 후기 영상"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>

        {/* Written Reviews Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">수강 후기</h2>
              <p className="text-gray-500 text-sm">실제 수강생들의 생생한 후기 ({realReviews.length}개)</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowReviewForm(true)}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm h-9 px-4"
              >
                <PenLine className="h-4 w-4 mr-1.5" />
                후기 작성
              </Button>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="필터" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="score">점수 상승</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <div 
                key={review.id}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-2xl p-6 border border-white/10 hover:border-emerald-500/30 transition-all"
              >
                {/* Score Badge */}
                {review.beforeScore && review.afterScore && (
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      <span className="text-gray-400 text-sm">{review.beforeScore}</span>
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">{review.afterScore}</span>
                      <span className="text-emerald-400 text-sm font-medium">
                        (+{review.afterScore - review.beforeScore}점)
                      </span>
                    </div>
                    {review.period && (
                      <span className="text-gray-500 text-sm">{review.period} 만에</span>
                    )}
                  </div>
                )}

                {review.afterScore && !review.beforeScore && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <span className="text-blue-400 font-bold">{review.afterScore}점 달성</span>
                    </div>
                    {review.period && (
                      <span className="text-gray-500 text-sm">{review.period} 만에</span>
                    )}
                  </div>
                )}

                {/* Review Content */}
                <div className="relative mb-4">
                  <Quote className="absolute -top-1 -left-1 h-6 w-6 text-white/10" />
                  <p className="text-gray-300 leading-relaxed pl-5 text-sm line-clamp-4">
                    {review.comment}
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{review.name}</p>
                      {review.school && (
                        <p className="text-gray-500 text-sm">{review.school}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3.5 w-3.5 ${i < review.rating ? 'text-amber-400' : 'text-gray-600'}`}
                        fill={i < review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <a 
              href="https://inrise.co.kr/%ec%88%98%ea%b0%95%ed%9b%84%ea%b8%b0/" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl">
                inrise.co.kr에서 더 많은 후기 보기
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </div>
      {showReviewForm && <ReviewForm onClose={() => setShowReviewForm(false)} />}
    </div>
  );
}
