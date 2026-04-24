import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Program, SuccessStory, User } from "@shared/schema";

const successStorySchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  country: z.string().min(1, "국가는 필수입니다"),
  score: z.string().min(1, "점수는 필수입니다"),
  rating: z.number().min(1).max(5).default(5),
  review: z.string().min(1, "후기는 필수입니다"),
  backgroundImage: z.string().optional(),
  videoUrl: z.string().optional(),
  accent: z.string().default("from-blue-500 to-purple-600"),
  initials: z.string().min(1, "이니셜은 필수입니다"),
  isActive: z.boolean().default(true),
  displayOrder: z.number().default(0),
});

const programSchema = z.object({
  name: z.string().min(1, "프로그램 이름은 필수입니다"),
  description: z.string().optional(),
  examType: z.enum(["toefl", "gre", "both"]),
  programType: z.string().min(1, "프로그램 타입은 필수입니다"),
  duration: z.number().min(0).default(0),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  membershipRequired: z.enum(["guest", "light", "pro", "max"]).default("guest"),
  isActive: z.boolean().default(true),
  price: z.string().default("0.00"),
  features: z.array(z.string()).default([]),
});

const programAccessSchema = z.object({
  userId: z.string(),
  programId: z.string(),
  accessType: z.enum(["granted", "purchased", "trial"]).default("granted"),
  expiresAt: z.string().optional(),
});

interface AdminPanelDialogsProps {
  storyDialogOpen: boolean;
  setStoryDialogOpen: (open: boolean) => void;
  editingStory: SuccessStory | null;
  setEditingStory: (story: SuccessStory | null) => void;
  programDialogOpen: boolean;
  setProgramDialogOpen: (open: boolean) => void;
  editingProgram: Program | null;
  setEditingProgram: (program: Program | null) => void;
  programAccessDialogOpen: boolean;
  setProgramAccessDialogOpen: (open: boolean) => void;
  selectedUserForProgram: User | null;
  programs: Program[];
}

export default function AdminPanelDialogs({
  storyDialogOpen,
  setStoryDialogOpen,
  editingStory,
  setEditingStory,
  programDialogOpen,
  setProgramDialogOpen,
  editingProgram,
  setEditingProgram,
  programAccessDialogOpen,
  setProgramAccessDialogOpen,
  selectedUserForProgram,
  programs,
}: AdminPanelDialogsProps) {
  const { toast } = useToast();

  const storyForm = useForm<z.infer<typeof successStorySchema>>({
    resolver: zodResolver(successStorySchema),
    defaultValues: {
      name: "",
      country: "",
      score: "",
      rating: 5,
      review: "",
      backgroundImage: "",
      videoUrl: "",
      accent: "from-blue-500 to-purple-600",
      initials: "",
      isActive: true,
      displayOrder: 0,
    },
  });

  const programForm = useForm<z.infer<typeof programSchema>>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      description: "",
      examType: "toefl",
      programType: "",
      duration: 0,
      difficulty: "medium",
      membershipRequired: "guest",
      isActive: true,
      price: "0.00",
      features: [],
    },
  });

  const programAccessForm = useForm<z.infer<typeof programAccessSchema>>({
    resolver: zodResolver(programAccessSchema),
    defaultValues: {
      userId: "",
      programId: "",
      accessType: "granted",
    },
  });

  useEffect(() => {
    if (editingStory) {
      storyForm.reset({
        name: editingStory.name,
        country: editingStory.country,
        score: editingStory.score,
        rating: editingStory.rating,
        review: editingStory.review,
        backgroundImage: editingStory.backgroundImage || "",
        videoUrl: editingStory.videoUrl || "",
        accent: editingStory.accent,
        initials: editingStory.initials,
        isActive: editingStory.isActive ?? true,
        displayOrder: editingStory.displayOrder ?? 0,
      });
    } else {
      storyForm.reset({
        name: "",
        country: "",
        score: "",
        rating: 5,
        review: "",
        backgroundImage: "",
        videoUrl: "",
        accent: "from-blue-500 to-purple-600",
        initials: "",
        isActive: true,
        displayOrder: 0,
      });
    }
  }, [editingStory, storyForm, storyDialogOpen]);

  useEffect(() => {
    if (editingProgram) {
      programForm.reset({
        name: editingProgram.name,
        description: editingProgram.description || "",
        examType: editingProgram.examType as "toefl" | "gre" | "both",
        programType: editingProgram.programType,
        duration: editingProgram.duration || 0,
        difficulty: editingProgram.difficulty as "easy" | "medium" | "hard",
        membershipRequired: editingProgram.membershipRequired as "guest" | "light" | "pro" | "max",
        isActive: editingProgram.isActive || true,
        price: editingProgram.price || "0.00",
        features: editingProgram.features || [],
      });
    } else {
      programForm.reset({
        name: "",
        description: "",
        examType: "toefl",
        programType: "",
        duration: 0,
        difficulty: "medium",
        membershipRequired: "guest",
        isActive: true,
        price: "0.00",
        features: [],
      });
    }
  }, [editingProgram, programDialogOpen, programForm]);

  useEffect(() => {
    programAccessForm.reset({
      userId: selectedUserForProgram?.id || "",
      programId: "",
      accessType: "granted",
      expiresAt: "",
    });
  }, [programAccessDialogOpen, programAccessForm, selectedUserForProgram]);

  const createProgramMutation = useMutation({
    mutationFn: async (data: z.infer<typeof programSchema>) =>
      apiRequest("/api/admin/programs", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "프로그램이 생성되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setProgramDialogOpen(false);
      programForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "프로그램 생성에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateProgramMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Program> }) =>
      apiRequest(`/api/admin/programs/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.updates),
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "프로그램이 업데이트되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      setProgramDialogOpen(false);
      setEditingProgram(null);
      programForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "프로그램 업데이트에 실패했습니다.", variant: "destructive" });
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof successStorySchema>) =>
      apiRequest("/api/admin/success-stories", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "성공 스토리가 생성되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] });
      setStoryDialogOpen(false);
      storyForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "성공 스토리 생성에 실패했습니다.", variant: "destructive" });
    },
  });

  const updateStoryMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<SuccessStory> }) =>
      apiRequest(`/api/admin/success-stories/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data.updates),
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "성공 스토리가 업데이트되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/success-stories"] });
      setStoryDialogOpen(false);
      setEditingStory(null);
      storyForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "성공 스토리 업데이트에 실패했습니다.", variant: "destructive" });
    },
  });

  const grantProgramAccessMutation = useMutation({
    mutationFn: async (data: z.infer<typeof programAccessSchema>) =>
      apiRequest("/api/admin/grant-program-access", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "성공", description: "프로그램 접근 권한이 부여되었습니다." });
      setProgramAccessDialogOpen(false);
      programAccessForm.reset();
    },
    onError: () => {
      toast({ title: "오류", description: "권한 부여에 실패했습니다.", variant: "destructive" });
    },
  });

  return (
    <>
      <Dialog
        open={storyDialogOpen}
        onOpenChange={(open) => {
          setStoryDialogOpen(open);
          if (!open) {
            setEditingStory(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStory ? "후기 편집" : "새 후기 등록"}</DialogTitle>
          </DialogHeader>
          <Form {...storyForm}>
            <form
              onSubmit={storyForm.handleSubmit((data) => {
                if (editingStory) {
                  updateStoryMutation.mutate({ id: editingStory.id, updates: data });
                } else {
                  createStoryMutation.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField control={storyForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>이름</FormLabel><FormControl><Input {...field} placeholder="학생 이름" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={storyForm.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>국가</FormLabel><FormControl><Input {...field} placeholder="국가명" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={storyForm.control} name="score" render={({ field }) => (
                  <FormItem><FormLabel>점수</FormLabel><FormControl><Input {...field} placeholder="예: TOEFL 110" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={storyForm.control} name="rating" render={({ field }) => (
                  <FormItem>
                    <FormLabel>평점</FormLabel>
                    <FormControl>
                      <Select value={field.value.toString()} onValueChange={(value) => field.onChange(Number(value))}>
                        <SelectTrigger><SelectValue placeholder="평점 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={storyForm.control} name="review" render={({ field }) => (
                <FormItem><FormLabel>후기</FormLabel><FormControl><Textarea {...field} placeholder="성공 스토리를 입력하세요..." rows={4} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={storyForm.control} name="initials" render={({ field }) => (
                  <FormItem><FormLabel>이니셜</FormLabel><FormControl><Input {...field} placeholder="예: JH" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={storyForm.control} name="displayOrder" render={({ field }) => (
                  <FormItem><FormLabel>표시 순서</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={storyForm.control} name="backgroundImage" render={({ field }) => (
                <FormItem><FormLabel>배경 이미지 URL (선택사항)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={storyForm.control} name="videoUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>유튜브 영상 URL (선택사항)</FormLabel>
                  <FormControl><Input {...field} placeholder="https://www.youtube.com/watch?v=..." /></FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">유튜브 영상 URL을 입력하면 배경 이미지 대신 영상이 표시됩니다</p>
                </FormItem>
              )} />
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStoryDialogOpen(false)}>취소</Button>
                <Button type="submit" disabled={createStoryMutation.isPending || updateStoryMutation.isPending}>
                  {editingStory ? "업데이트" : "생성"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={programDialogOpen}
        onOpenChange={(open) => {
          setProgramDialogOpen(open);
          if (!open) {
            setEditingProgram(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProgram ? "프로그램 편집" : "새 프로그램 추가"}</DialogTitle>
          </DialogHeader>
          <Form {...programForm}>
            <form
              onSubmit={programForm.handleSubmit((data) => {
                if (editingProgram) {
                  updateProgramMutation.mutate({ id: editingProgram.id, updates: data });
                } else {
                  createProgramMutation.mutate(data);
                }
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField control={programForm.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>프로그램명</FormLabel><FormControl><Input {...field} placeholder="프로그램 이름" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={programForm.control} name="examType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>시험 타입</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="시험 타입 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="toefl">TOEFL</SelectItem>
                          <SelectItem value="gre">GRE</SelectItem>
                          <SelectItem value="both">TOEFL & GRE</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={programForm.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>설명</FormLabel><FormControl><Textarea {...field} placeholder="프로그램 설명을 입력하세요..." rows={3} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={programForm.control} name="programType" render={({ field }) => (
                  <FormItem><FormLabel>프로그램 타입</FormLabel><FormControl><Input {...field} placeholder="예: test_set" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={programForm.control} name="difficulty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>난이도</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="난이도 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">쉬움</SelectItem>
                          <SelectItem value="medium">보통</SelectItem>
                          <SelectItem value="hard">어려움</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={programForm.control} name="duration" render={({ field }) => (
                  <FormItem><FormLabel>소요 시간 (분)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={programForm.control} name="membershipRequired" render={({ field }) => (
                  <FormItem>
                    <FormLabel>필요 멤버십</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="멤버십 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guest">게스트</SelectItem>
                          <SelectItem value="light">라이트</SelectItem>
                          <SelectItem value="pro">프로</SelectItem>
                          <SelectItem value="max">맥스</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={programForm.control} name="price" render={({ field }) => (
                  <FormItem><FormLabel>가격</FormLabel><FormControl><Input {...field} placeholder="0.00" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setProgramDialogOpen(false)}>취소</Button>
                <Button type="submit" disabled={createProgramMutation.isPending || updateProgramMutation.isPending}>
                  {editingProgram ? "업데이트" : "생성"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={programAccessDialogOpen} onOpenChange={setProgramAccessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프로그램 접근 권한 부여</DialogTitle>
          </DialogHeader>
          {selectedUserForProgram && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedUserForProgram.firstName} {selectedUserForProgram.lastName}</p>
              <p className="text-sm text-gray-600">{selectedUserForProgram.email}</p>
            </div>
          )}
          <Form {...programAccessForm}>
            <form onSubmit={programAccessForm.handleSubmit((data) => grantProgramAccessMutation.mutate(data))} className="space-y-4">
              <FormField control={programAccessForm.control} name="programId" render={({ field }) => (
                <FormItem>
                  <FormLabel>프로그램 선택</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="프로그램을 선택하세요" /></SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>{program.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={programAccessForm.control} name="accessType" render={({ field }) => (
                <FormItem>
                  <FormLabel>접근 타입</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="접근 타입 선택" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="granted">관리자 부여</SelectItem>
                        <SelectItem value="trial">체험판</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={programAccessForm.control} name="expiresAt" render={({ field }) => (
                <FormItem><FormLabel>만료일 (선택사항)</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setProgramAccessDialogOpen(false)}>취소</Button>
                <Button type="submit" disabled={grantProgramAccessMutation.isPending}>권한 부여</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
