import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star, CheckCircle2 } from "lucide-react";

const reviewSchema = z.object({
  rating: z.number().min(1, "별점을 선택해주세요").max(5),
  comment: z.string().min(10, "후기를 10자 이상 작성해주세요"),
  reviewerName: z.string().min(2, "이름을 2자 이상 입력해주세요"),
  reviewerCountry: z.string().min(1, "국가/소속을 입력해주세요"),
  examType: z.enum(["toefl", "gre", "general"]).default("toefl"),
  achievedScore: z.number().optional().nullable(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  onClose: () => void;
}

export default function ReviewForm({ onClose }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
      reviewerName: "",
      reviewerCountry: "",
      examType: "toefl",
      achievedScore: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ReviewFormData) =>
      apiRequest("POST", "/api/reviews", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/stats'] });
      setSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('review.errorDesc'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    mutation.mutate({ ...data, rating });
  };

  if (submitted) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[400px] bg-[#0f172a] border-white/10 text-white">
          <div className="text-center py-6">
            <CheckCircle2 className="h-14 w-14 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">{t('review.successTitle')}</h2>
            <p className="text-gray-400 text-sm mb-6">
              {t('review.successDesc')}
            </p>
            <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8">
              {t('common.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#0f172a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">{t('review.title')}</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            {t('review.desc')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Rating */}
            <div>
              <FormLabel className="text-gray-300 text-sm">{t('review.rating')}</FormLabel>
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => { setRating(star); form.setValue("rating", star); }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none"
                  >
                    <Star className={`w-7 h-7 transition-colors ${
                      star <= (hoveredRating || rating) ? "text-amber-400 fill-current" : "text-gray-600"
                    }`} />
                  </button>
                ))}
              </div>
              {form.formState.errors.rating && (
                <p className="text-red-400 text-xs mt-1">별점을 선택해주세요</p>
              )}
            </div>

            {/* Exam Type */}
            <FormField
              control={form.control}
              name="examType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-sm">{t('review.examType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white h-9 text-sm">
                        <SelectValue placeholder={t('review.examTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="toefl" className="text-white">TOEFL</SelectItem>
                      <SelectItem value="gre" className="text-white">GRE</SelectItem>
                      <SelectItem value="general" className="text-white">일반</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Name */}
              <FormField
                control={form.control}
                name="reviewerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm">{t('auth.firstName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('review.namePlaceholder')}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 h-9 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country / Affiliation */}
              <FormField
                control={form.control}
                name="reviewerCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300 text-sm">{t('auth.lastName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('review.countryPlaceholder')}
                        className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 h-9 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Achieved Score */}
            <FormField
              control={form.control}
              name="achievedScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-sm">{t('review.score')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t('review.scorePlaceholder')}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 h-9 text-sm"
                      value={field.value ?? ""}
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Comment */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300 text-sm">{t('review.content')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('review.contentPlaceholder')}
                      className="bg-slate-800 border-slate-600 text-white placeholder:text-gray-500 min-h-[90px] text-sm resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-600 text-gray-300 bg-transparent hover:bg-slate-700 h-9 text-sm"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm"
              >
                {mutation.isPending ? t('review.submitting') : t('review.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
