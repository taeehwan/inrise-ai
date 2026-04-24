import type { User, Payment } from "@shared/schema";

export interface AdminSystemStats {
  totalUsers?: number;
  activeUsers?: number;
  totalTests?: number;
  averageRating?: number;
  newUsersThisWeek?: number;
  testsThisWeek?: number;
  activityStats?: {
    totalActivities?: number;
  };
}

export interface AdminSystemUserTabProps {
  users: User[];
  usersLoading: boolean;
  filteredUsers: User[];
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onToggleRole: (userId: string, role: string) => void;
  onToggleActive: (userId: string) => void;
  rolePending: boolean;
  activePending: boolean;
}

export interface AdminSystemPaymentsTabProps {
  payments: Payment[];
  paymentsLoading: boolean;
  users: User[];
}

