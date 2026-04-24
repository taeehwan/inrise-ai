import { lazy, Suspense, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bot, 
  Upload, 
  Camera, 
  Volume2, 
  Download, 
  Settings, 
  Lightbulb, 
  User,
  Clock,
  FileText,
  Home,
  Loader2,
  Lock,
  Play,
  Save,
  X,
  ChevronDown,
  Eye,
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import logoPath from "@assets/KakaoTalk_20250812_041612053_1754951331515.png";

const DeferredLoginModal = lazy(() => import("@/components/LoginModal"));

export default function AIQuestionGenerator() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("topic-generation");
  
  // Topic-based generation states
  const [topic, setTopic] = useState("");
  const [examType, setExamType] = useState("");
  const [section, setSection] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  
  // Image-based generation states
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  
  // Template generation states
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [templateGenerating, setTemplateGenerating] = useState(false);
  
  // Generated content states
  const [generatedSets, setGeneratedSets] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState<any>(null);
  
  // File upload handler
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Authentication check
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <div className="mb-6">
            <Lock className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600">AI 문제 생성기를 사용하려면 로그인해주세요.</p>
          </div>
          <Button 
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            로그인 / 회원가입
          </Button>
        </Card>
        
        <Suspense fallback={null}>
          <DeferredLoginModal
            isOpen={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSuccess={() => {
              setShowLoginModal(false);
              toast({
                title: "로그인 성공",
                description: "AI 문제 생성기를 사용할 수 있습니다!",
              });
            }}
          />
        </Suspense>
      </div>
    );
  }

  // Generate by topic
  const generateByTopic = async () => {
    if (!examType || !section || !difficulty) {
      toast({
        title: "입력 정보 부족",
        description: "시험 유형, 섹션, 난이도를 모두 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "topic",
          topic: topic || "일반",
          examType,
          section,
          difficulty,
          questionCount
        })
      });
      
      if (!response.ok) throw new Error("Failed to generate");
      
      const data = await response.json();
      setGeneratedSets(prev => [...prev, data]);
      toast({
        title: "문제 생성 완료",
        description: `${questionCount}개의 문제가 성공적으로 생성되었습니다.`
      });
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "문제 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  // Extract text from image
  const extractTextFromImage = async () => {
    if (!uploadedImage) return;
    
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", uploadedImage);
      
      const response = await fetch("/api/ai/extract-text", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) throw new Error("Failed to extract");
      
      const data = await response.json();
      setExtractedText(data.extractedText);
      toast({
        title: "텍스트 추출 완료",
        description: "이미지에서 텍스트를 성공적으로 추출했습니다."
      });
    } catch (error) {
      toast({
        title: "추출 실패",
        description: "텍스트 추출 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setExtracting(false);
    }
  };

  // Generate from image
  const generateFromImage = async () => {
    if (!extractedText && !uploadedImage) {
      toast({
        title: "이미지 또는 텍스트 필요",
        description: "이미지를 업로드하거나 텍스트를 추출해주세요.",
        variant: "destructive"
      });
      return;
    }

    if (!examType || !section || !difficulty) {
      toast({
        title: "설정 정보 부족",
        description: "시험 유형, 섹션, 난이도를 모두 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setImageGenerating(true);
    try {
      const formData = new FormData();
      if (uploadedImage) formData.append("image", uploadedImage);
      formData.append("extractedText", extractedText);
      formData.append("examType", examType);
      formData.append("section", section);
      formData.append("difficulty", difficulty);
      
      const response = await fetch("/api/ai/generate-from-image", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) throw new Error("Failed to generate");
      
      const data = await response.json();
      setGeneratedSets(prev => [...prev, data]);
      toast({
        title: "이미지 기반 문제 생성 완료",
        description: "이미지를 기반으로 문제가 성공적으로 생성되었습니다."
      });
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "이미지 기반 문제 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setImageGenerating(false);
    }
  };

  // Template options
  const templateOptions = [
    { value: "reading-comprehension", label: "Reading Comprehension" },
    { value: "listening-conversation", label: "Listening Conversation" },
    { value: "speaking-independent", label: "Speaking Independent" },
    { value: "writing-integrated", label: "Writing Integrated" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-blue-900 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <img src={logoPath} alt="iNRISE Logo" className="h-8" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">AI 문제 생성기</h1>
              <p className="text-blue-200 text-sm">TOEFL/GRE 맞춤형 문제 자동 생성</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" className="text-blue-900 border-white hover:bg-white">
              <Home className="w-4 h-4 mr-2" />
              홈으로
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topic-generation">주제별 생성</TabsTrigger>
            <TabsTrigger value="image-generation">이미지 기반 생성</TabsTrigger>
            <TabsTrigger value="template-generation">템플릿 생성</TabsTrigger>
          </TabsList>

          {/* Topic-based Generation */}
          <TabsContent value="topic-generation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  주제별 문제 생성
                </CardTitle>
                <CardDescription>주제를 입력하여 새로운 문제를 생성합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="topic">주제 (선택사항)</Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="예: 환경 보호, 과학 기술, 문화..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="count">문제 개수</Label>
                    <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1개</SelectItem>
                        <SelectItem value="3">3개</SelectItem>
                        <SelectItem value="5">5개</SelectItem>
                        <SelectItem value="10">10개</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>시험 유형</Label>
                    <Select value={examType} onValueChange={setExamType}>
                      <SelectTrigger>
                        <SelectValue placeholder="시험 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toefl">TOEFL</SelectItem>
                        <SelectItem value="gre">GRE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>섹션</Label>
                    <Select value={section} onValueChange={setSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="섹션 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {examType === "toefl" && (
                          <>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="listening">Listening</SelectItem>
                            <SelectItem value="speaking">Speaking</SelectItem>
                            <SelectItem value="writing">Writing</SelectItem>
                          </>
                        )}
                        {examType === "gre" && (
                          <>
                            <SelectItem value="verbal">Verbal Reasoning</SelectItem>
                            <SelectItem value="quantitative">Quantitative Reasoning</SelectItem>
                            <SelectItem value="writing">Analytical Writing</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>난이도</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue placeholder="난이도 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">초급</SelectItem>
                        <SelectItem value="intermediate">중급</SelectItem>
                        <SelectItem value="advanced">고급</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={generateByTopic}
                  disabled={!examType || !section || !difficulty || generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 mr-2" />
                      문제 생성하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image-based Generation */}
          <TabsContent value="image-generation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  이미지 기반 문제 생성
                </CardTitle>
                <CardDescription>이미지를 업로드하여 문제를 생성합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img src={imagePreview} alt="Uploaded" className="max-w-full h-64 object-contain mx-auto" />
                      <Button
                        variant="outline"
                        onClick={() => {
                          setUploadedImage(null);
                          setImagePreview(null);
                          setExtractedText("");
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        이미지 제거
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-gray-600">이미지를 업로드하세요</p>
                        <p className="text-sm text-gray-400">JPG, PNG, WEBP 형식 지원</p>
                      </div>
                      <Button onClick={() => fileInputRef.current?.click()}>
                        파일 선택
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedImage(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {uploadedImage && (
                  <div className="space-y-4">
                    <Button
                      onClick={extractTextFromImage}
                      disabled={extracting}
                      className="w-full"
                      variant="outline"
                    >
                      {extracting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          텍스트 추출 중...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          텍스트 추출하기
                        </>
                      )}
                    </Button>

                    {extractedText && (
                      <div className="space-y-2">
                        <Label>추출된 텍스트</Label>
                        <Textarea
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          rows={4}
                          placeholder="추출된 텍스트가 여기에 표시됩니다..."
                        />
                      </div>
                    )}

                    {/* 시험 설정 옵션 */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      <h4 className="font-medium text-gray-900">문제 생성 설정</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>시험 유형</Label>
                          <Select value={examType} onValueChange={setExamType}>
                            <SelectTrigger>
                              <SelectValue placeholder="시험 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="toefl">TOEFL</SelectItem>
                              <SelectItem value="gre">GRE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>섹션</Label>
                          <Select value={section} onValueChange={setSection}>
                            <SelectTrigger>
                              <SelectValue placeholder="섹션 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {examType === "toefl" && (
                                <>
                                  <SelectItem value="reading">Reading</SelectItem>
                                  <SelectItem value="listening">Listening</SelectItem>
                                  <SelectItem value="speaking">Speaking</SelectItem>
                                  <SelectItem value="writing">Writing</SelectItem>
                                </>
                              )}
                              {examType === "gre" && (
                                <>
                                  <SelectItem value="verbal">Verbal Reasoning</SelectItem>
                                  <SelectItem value="quantitative">Quantitative Reasoning</SelectItem>
                                  <SelectItem value="writing">Analytical Writing</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>난이도</Label>
                          <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger>
                              <SelectValue placeholder="난이도 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">초급</SelectItem>
                              <SelectItem value="intermediate">중급</SelectItem>
                              <SelectItem value="advanced">고급</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={generateFromImage}
                      disabled={imageGenerating || (!extractedText && !uploadedImage) || !examType || !section || !difficulty}
                      className="w-full"
                    >
                      {imageGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          문제 생성 중...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4 mr-2" />
                          이미지로 문제 생성하기
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Generation */}
          <TabsContent value="template-generation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  템플릿 기반 생성
                </CardTitle>
                <CardDescription>미리 정의된 템플릿을 사용하여 문제를 생성합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>템플릿 선택</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="템플릿을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {templateOptions.map((template) => (
                        <SelectItem key={template.value} value={template.value}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">템플릿 설정</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>주제</Label>
                        <Input
                          value={templateParams.topic || ""}
                          onChange={(e) => setTemplateParams(prev => ({ ...prev, topic: e.target.value }))}
                          placeholder="주제를 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>난이도</Label>
                        <Select 
                          value={templateParams.difficulty || ""} 
                          onValueChange={(value) => setTemplateParams(prev => ({ ...prev, difficulty: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="난이도 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">초급</SelectItem>
                            <SelectItem value="intermediate">중급</SelectItem>
                            <SelectItem value="advanced">고급</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => {
                    // Template generation logic here
                    toast({
                      title: "템플릿 생성 완료",
                      description: "템플릿 기반 문제가 생성되었습니다."
                    });
                  }}
                  disabled={!selectedTemplate || templateGenerating}
                  className="w-full"
                >
                  {templateGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      템플릿으로 생성하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Generated Sets History */}
        {generatedSets.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                생성된 문제 세트 ({generatedSets.length})
              </CardTitle>
              <CardDescription>최근 생성된 문제들을 확인하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedSets.map((set, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{set.title || `문제 세트 ${index + 1}`}</h4>
                        <p className="text-sm text-gray-600">{set.description || "AI 생성 문제"}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{set.examType?.toUpperCase()}</Badge>
                          <Badge variant="outline">{set.section}</Badge>
                          <Badge variant="outline">{set.difficulty}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPreviewContent(set);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          미리보기
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          다운로드
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGeneratedSets(prev => prev.filter((_, i) => i !== index));
                            toast({
                              title: "문제 세트 삭제됨",
                              description: "선택한 문제 세트가 삭제되었습니다."
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>문제 세트 미리보기</DialogTitle>
          </DialogHeader>
          {previewContent && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">문제 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>시험 유형: {previewContent.examType?.toUpperCase()}</div>
                  <div>섹션: {previewContent.section}</div>
                  <div>난이도: {previewContent.difficulty}</div>
                  <div>문제 수: {previewContent.questions?.length || 0}</div>
                </div>
              </div>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {previewContent.questions?.map((question: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">문제 {index + 1}</h4>
                      <p className="text-gray-700 mb-2">{question.questionText}</p>
                      {question.options && (
                        <div className="space-y-1">
                          {question.options.map((option: string, optIndex: number) => (
                            <div key={optIndex} className="text-sm text-gray-600">
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
