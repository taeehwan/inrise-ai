import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  HelpCircle, 
  MessageCircle,
  User,
  Lightbulb,
  BookOpen,
  Clock,
  Users,
  Brain
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import type { Faq, InsertFaq } from "@shared/schema";

const faqFormSchema = z.object({
  question: z.string().min(1, "질문을 입력해주세요"),
  answer: z.string().min(1, "답변을 입력해주세요"),
  category: z.enum(["general", "toefl", "gre", "technical"]).default("general")
});

type FaqFormData = z.infer<typeof faqFormSchema>;

const categoryLabels = {
  general: "일반",
  toefl: "TOEFL",
  gre: "GRE", 
  technical: "기술"
};

const categoryColors = {
  general: "from-blue-500 to-blue-600",
  toefl: "from-green-500 to-green-600",
  gre: "from-purple-500 to-purple-600",
  technical: "from-orange-500 to-orange-600"
};

const getCategoryKey = (category: Faq["category"] | null | undefined): keyof typeof categoryLabels =>
  category && category in categoryLabels ? category : "general";

export default function FaqPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const form = useForm<FaqFormData>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "general"
    }
  });

  const { data: faqs = [] } = useQuery<Faq[]>({
    queryKey: ["/api/faqs"],
  });

  const createFaqMutation = useMutation({
    mutationFn: async (data: InsertFaq) => {
      return apiRequest("POST", "/api/faqs", data);
    },
    onSuccess: () => {
      toast({
        title: "FAQ 추가 완료",
        description: "새로운 FAQ가 성공적으로 추가되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/faqs"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "FAQ 추가 실패",
        description: error.message || "FAQ 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const filteredFaqs = faqs.filter(faq => {
    // Search filter
    if (searchTerm && !faq.question.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !faq.answer.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Category filter
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    return matchesCategory;
  });

  const toggleItem = (id: string) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  const onSubmit = (data: FaqFormData) => {
    createFaqMutation.mutate(data);
  };

  // Count FAQs by category
  const categoryStats = {
    general: faqs.filter(f => f.category === "general").length,
    toefl: faqs.filter(f => f.category === "toefl").length,
    gre: faqs.filter(f => f.category === "gre").length,
    technical: faqs.filter(f => f.category === "technical").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Modern Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm sticky top-0 z-50 h-20">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <img 
              src={logoPath} 
              alt="iNRISE" 
              className="h-10 transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium">
              홈
            </Link>
            <Link href="/study-plan" className="text-gray-700 hover:text-purple-600 transition-colors duration-200 font-medium">
              학습계획
            </Link>
            <Link href="/tests" className="text-gray-700 hover:text-green-600 transition-colors duration-200 font-medium">
              모의고사
            </Link>
            <Link href="/results" className="text-gray-700 hover:text-orange-600 transition-colors duration-200 font-medium">
              성적분석
            </Link>
            <Link href="/reviews" className="text-gray-700 hover:text-indigo-600 transition-colors duration-200 font-medium">
              후기
            </Link>
            <Link href="/faq" className="text-teal-600 font-semibold border-b-2 border-teal-600 pb-1">
              Q&A
            </Link>
            
            {user && (
              <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-200">
                <div className="w-10 h-10 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800">{user.firstName || "사용자"}</span>
                  <span className="text-xs text-gray-500">Q&A 참여자</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              자주 묻는 질문 FAQ
            </h1>
          </div>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            TOEFL/GRE 학습 과정에서 자주 묻는 질문들과 답변을 확인하세요. 
            <span className="font-semibold text-teal-600">빠르고 정확한</span> 정보를 제공합니다
          </p>

          {/* Statistics Cards */}
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {categoryStats.general}
              </div>
              <div className="text-gray-600 font-medium">일반 Q&A</div>
              <div className="text-sm text-gray-500 mt-1">기본 학습 가이드</div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {categoryStats.toefl}
              </div>
              <div className="text-gray-600 font-medium">TOEFL Q&A</div>
              <div className="text-sm text-gray-500 mt-1">토플 전문 가이드</div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {categoryStats.gre}
              </div>
              <div className="text-gray-600 font-medium">GRE Q&A</div>
              <div className="text-sm text-gray-500 mt-1">GRE 전문 가이드</div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {categoryStats.technical}
              </div>
              <div className="text-gray-600 font-medium">기술 Q&A</div>
              <div className="text-sm text-gray-500 mt-1">플랫폼 사용법</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-lg border border-white/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="h-6 w-6 text-teal-600" />
                <h2 className="text-xl font-bold text-gray-800">질문 목록</h2>
              </div>
              <p className="text-gray-600">
                카테고리별로 정리된 자주 묻는 질문들을 확인하세요
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 카테고리</SelectItem>
                  <SelectItem value="general">일반</SelectItem>
                  <SelectItem value="toefl">TOEFL</SelectItem>
                  <SelectItem value="gre">GRE</SelectItem>
                  <SelectItem value="technical">기술</SelectItem>
                </SelectContent>
              </Select>
              
              {isAuthenticated && (
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
                      <Plus className="h-5 w-5 mr-2" />
                      질문 추가하기
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-teal-50 border-0 shadow-2xl">
                    <DialogHeader className="text-center pb-6">
                      <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Brain className="h-8 w-8 text-white" />
                      </div>
                      <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                        새로운 Q&A 추가
                      </DialogTitle>
                      <DialogDescription className="text-lg text-gray-600 mt-2">
                        <span className="font-semibold text-teal-600">커뮤니티와 함께</span> 지식을 나누고 
                        다른 학습자들에게 도움을 주세요
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>카테고리</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="적절한 카테고리를 선택하세요" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="general">일반</SelectItem>
                                  <SelectItem value="toefl">TOEFL</SelectItem>
                                  <SelectItem value="gre">GRE</SelectItem>
                                  <SelectItem value="technical">기술</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="question"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>질문</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="궁금한 점을 구체적으로 설명해주세요..."
                                  className="min-h-24"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="answer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>답변</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="상세하고 도움이 되는 답변을 작성해주세요..."
                                  className="min-h-32"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end gap-3">
                          <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            취소
                          </Button>
                          <Button type="submit" disabled={createFaqMutation.isPending}>
                            {createFaqMutation.isPending ? "추가 중..." : "Q&A 추가"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {filteredFaqs.map((faq) => (
            (() => {
              const categoryKey = getCategoryKey(faq.category);
              return (
            <Card key={faq.id} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <Collapsible>
                <CollapsibleTrigger 
                  className="w-full"
                  onClick={() => toggleItem(faq.id)}
                >
                  <CardHeader className="text-left hover:bg-gray-50/50 transition-colors duration-200 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[categoryKey]}`} />
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-gray-800 text-left">
                            {faq.question}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs bg-gradient-to-r ${categoryColors[categoryKey]} text-white border-0`}
                            >
                              {categoryLabels[categoryKey]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {openItems.has(faq.id) ? (
                          <ChevronUp className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-lg p-6 border-l-4 border-teal-500">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Lightbulb className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-teal-700 mb-2">AI 답변</h4>
                          <p className="text-gray-700 leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
              );
            })()
          ))}
        </div>

        {filteredFaqs.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 max-w-2xl mx-auto shadow-lg border border-white/20">
              <div className="w-20 h-20 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent mb-4">
                {searchTerm ? "검색 결과가 없습니다" : "첫 번째 Q&A를 추가해주세요"}
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed">
                {searchTerm ? 
                  "다른 키워드로 검색하거나 카테고리를 변경해보세요" :
                  "커뮤니티와 함께 <span className=\"font-semibold text-teal-600\">지식을 나누고</span> 성장하는 학습 환경을 만들어보세요"
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
