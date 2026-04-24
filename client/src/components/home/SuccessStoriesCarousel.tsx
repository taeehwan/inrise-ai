import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { successReviews } from "./shared";

export default function SuccessStoriesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t } = useLanguage();

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % successReviews.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + successReviews.length) % successReviews.length);
  };

  const review = successReviews[currentIndex];

  return (
    <section className="relative z-10 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-bold text-white sm:text-4xl">{t("home.realReviews")}</h2>
          <p className="text-sm text-gray-500">inrise.co.kr</p>
        </div>

        <div className="relative">
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 z-20 flex h-12 w-12 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#0F172A] to-[#0D1326] p-10 md:p-14">
            <div className="mb-10 flex items-end justify-center gap-8">
              <div className="text-center">
                <div className="mb-2 text-xs uppercase tracking-widest text-gray-500">Before</div>
                {review.before != null ? (
                  <div className="text-7xl font-black text-gray-500 md:text-8xl">{review.before}</div>
                ) : (
                  <div className="mt-4 whitespace-pre-line text-2xl font-bold leading-tight text-gray-500 md:text-3xl">
                    {t("home.firstAttempt")}
                  </div>
                )}
              </div>

              <div className="relative mx-8 flex flex-col items-center">
                <svg viewBox="0 0 80 180" className="h-44 w-20">
                  <defs>
                    <linearGradient id="verticalArrowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#4B5563" />
                      <stop offset="40%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                    <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M 40 170 L 40 40"
                    fill="none"
                    stroke="url(#verticalArrowGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    filter="url(#arrowGlow)"
                  />
                  <polygon points="40,5 20,45 60,45" fill="#34D399" filter="url(#arrowGlow)" />
                </svg>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-500 to-emerald-400 px-6 py-3 text-xl font-bold text-white shadow-xl shadow-emerald-500/40">
                  {review.before != null
                    ? `+${review.after - review.before}${t("home.pointsSuffix")}`
                    : t("home.perfectScore")}
                </div>
              </div>

              <div className="text-center">
                <div className="mb-2 text-xs uppercase tracking-widest text-emerald-400">After</div>
                <div className="text-7xl font-black text-white md:text-8xl">{review.after}</div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-4">
                <span className="text-xl font-bold text-white">{review.name}</span>
                {review.school && (
                  <span className="text-xl font-bold text-cyan-400">
                    {t(`home.review.${currentIndex}.school` as any)}
                  </span>
                )}
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 font-semibold text-emerald-400">
                  {t(`home.review.${currentIndex}.period` as any)} {t("home.inPeriod")}
                </span>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-amber-400" fill="currentColor" />
                  ))}
                </div>
              </div>
              <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-gray-400">
                {t(`home.review.${currentIndex}.text` as any)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center gap-2">
            {successReviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentIndex ? "w-8 bg-emerald-400" : "w-2.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/reviews">
            <Button className="rounded-xl bg-emerald-600 px-8 py-3 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500">
              {t("home.viewAllReviews")}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
