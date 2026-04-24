import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: "user" | "admin";
  provider: "google" | "kakao" | "local";
  targetExam?: "toefl" | "gre" | "both";
  targetScore?: number;
  country?: string;
  membershipTier?: "guest" | "light" | "pro" | "max" | "master";
  subscriptionStatus?: "active" | "inactive" | "trial" | "cancelled" | "past_due";
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/me");
        return await response.json();
      } catch (error: any) {
        // console.log("API Error:", error.message);
        if (error.message.includes('401')) {
          return null; // Not authenticated
        }
        // For network errors during dev reload, return null instead of throwing
        // This prevents redirect during workflow restart
        return null;
      }
    },
    retry: 3, // Retry network errors during dev reloads
    retryDelay: 500, // Wait 500ms between retries
    staleTime: 30 * 1000, // 30 seconds - 구독 상태 변경 반영을 위해 짧게 설정
    gcTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: true, // 창 포커스 시 최신 구독 상태 확인
    refetchOnMount: true, // 마운트 시 최신 상태 확인
    refetchInterval: false, // Don't auto refetch
  });

  // console.log("Auth check - isAuthenticated:", !!user && user !== null, "user:", !!user, "role:", user?.role);

  const userData = user as User | null;
  
  const tierLevels = { guest: 0, light: 1, pro: 2, max: 3, master: 4 };
  const userTierLevel = tierLevels[userData?.membershipTier || 'guest'];
  
  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {
    } finally {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/login");
    }
  };
  
  return {
    user: userData,
    isLoading,
    error,
    isAuthenticated: !!userData && userData !== null,
    isAdmin: userData?.role === "admin",
    isUser: userData?.role === "user",
    // 유료 등급(light/pro/max/master) 사용자는 subscriptionStatus 관계없이 접근 허용
    // 등급 업그레이드 시 백엔드에서 subscriptionStatus도 'active'로 설정됨
    isPro: userTierLevel >= tierLevels.pro,
    isMax: userTierLevel >= tierLevels.max,
    isPaidMember: userTierLevel >= tierLevels.light,
    membershipTier: userData?.membershipTier || 'guest',
    subscriptionStatus: userData?.subscriptionStatus || 'inactive',
    refetch,
    logout,
  };
}
