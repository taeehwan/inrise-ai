import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Brain, CheckCircle2, Plus, Sparkles, Zap } from "lucide-react";
import {
  AdminSpeakingTopicsTab,
  getDefaultTopicForm,
  TestQuestion,
  testQuestionSchema,
  type TestQuestionForm,
} from "@/components/admin-speaking-topics/shared";

interface AdminSpeakingTopicsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTestType: AdminSpeakingTopicsTab;
  editingTopic: TestQuestion | null;
  isPending: boolean;
  isGeneratingTTS: boolean;
  onSubmit: (data: TestQuestionForm) => void;
  onGenerateTTS: (listeningScript: string) => Promise<string | undefined>;
}

export default function AdminSpeakingTopicsFormDialog({
  open,
  onOpenChange,
  currentTestType,
  editingTopic,
  isPending,
  isGeneratingTTS,
  onSubmit,
  onGenerateTTS,
}: AdminSpeakingTopicsFormDialogProps) {
  const form = useForm<TestQuestionForm>({
    resolver: zodResolver(testQuestionSchema),
    defaultValues: getDefaultTopicForm(currentTestType, editingTopic),
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultTopicForm(currentTestType, editingTopic));
    }
  }, [open, currentTestType, editingTopic, form]);

  const handleGenerateTTS = async () => {
    const listeningScript = form.getValues("listeningScript");
    if (!listeningScript || !listeningScript.trim()) return;
    const audioUrl = await onGenerateTTS(listeningScript);
    if (audioUrl) {
      form.setValue("listeningAudioUrl", audioUrl);
    }
  };

  const isGre = currentTestType === "gre-writing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-xl rounded-3xl border border-white/50 shadow-2xl">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold text-slate-800" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {editingTopic ? "통합형 지문 수정" : "통합형 지문 추가"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold text-slate-700">제목</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={isGre ? "예: Education Policy Analysis" : "예: Campus Life Discussion"}
                      className="h-11 border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isGre ? (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg font-semibold text-slate-700 flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-blue-500" />
                        <span>타입</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg border-2 border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:border-blue-500 transition-all duration-300">
                            <SelectValue placeholder="토픽 타입을 선택하세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="issue">Issue Task</SelectItem>
                          <SelectItem value="argument">Argument Task</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>질문 내용</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} placeholder="질문 내용을 입력하세요..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="responseTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>작성 시간 (분)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) * 60)}
                          value={Math.floor((field.value || 0) / 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <>
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200">
                      Independent
                    </div>
                    <span className="text-sm text-slate-600">모든 TOEFL Speaking 토픽은 Independent 타입으로 생성됩니다.</span>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="questionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-700">질문</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="학생에게 보여질 질문을 입력하세요..."
                          className="border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                  <FormField
                    control={form.control}
                    name="preparationTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-600">준비 시간 (초)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            className="h-10 text-base border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="responseTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-600">응답 시간 (초)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                            className="h-10 text-base border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="listeningScript"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-slate-700">Listening Script</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="통합형용 Listening Script를 입력하세요..."
                          className="border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500 resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateTTS}
                    disabled={isGeneratingTTS || !form.getValues("listeningScript")?.trim()}
                    className="h-11 border-2 border-emerald-200 rounded-xl hover:border-emerald-300"
                  >
                    {isGeneratingTTS ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-500 border-t-transparent" />
                        <span>음성 생성 중...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span>TTS 생성</span>
                      </div>
                    )}
                  </Button>
                  {form.getValues("listeningAudioUrl") && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>오디오 URL 생성 완료</span>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-center space-x-4 pt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-12 px-8 text-lg border-2 border-slate-200 rounded-xl hover:border-slate-300 transition-all duration-300"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="group relative h-12 px-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                <div className="relative z-10">
                  {isPending ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>저장 중...</span>
                    </div>
                  ) : (
                    "저장하기"
                  )}
                </div>
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
