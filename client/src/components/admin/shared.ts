export interface AdminStats {
  users: {
    total: number;
    active: number;
    admins: number;
    recentSignups: number;
  };
  tests: {
    total: number;
    toefl: number;
    gre: number;
    active: number;
  };
  attempts: {
    total: number;
    completed: number;
    inProgress: number;
    thisWeek: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
}

export interface AdminUser {
  id: string;
  username?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  role: "user" | "admin";
  targetExam?: string;
  provider: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  membershipTier?: "guest" | "light" | "pro" | "max" | "master";
}

export interface TestAuditLog {
  id: string;
  testId: string;
  testTitle: string;
  testType: "ai_generated" | "manual" | "test_set";
  examType?: string;
  section?: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "restore";
  adminId: string;
  adminEmail: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string;
  metadata?: unknown;
  createdAt: string;
}

export interface AdminMutation<T> {
  isPending: boolean;
  mutate: (payload: T) => void;
}
