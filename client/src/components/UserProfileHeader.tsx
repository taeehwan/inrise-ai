import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Settings, User, BookOpen, MessageSquare, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const tierBadge = {
  master: { bg: "rgba(45,127,181,0.25)", color: "#7BC4F0", label: "MASTER" },
  max:    { bg: "rgba(45,127,181,0.25)", color: "#7BC4F0", label: "MAX" },
  pro:    { bg: "rgba(52,211,153,0.2)",  color: "#6EE7B7", label: "PRO" },
  light:  { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", label: "LIGHT" },
  guest:  null,
};

interface UserProfileHeaderProps {
  variant?: "light" | "dark";
  showBadge?: boolean;
}

export function UserProfileHeader({ variant = "light", showBadge = true }: UserProfileHeaderProps) {
  const { user, isAuthenticated, isAdmin, membershipTier } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
      setLocation("/login");
    } catch {
      setLocation("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-1.5">
        <Link href="/login">
          <button className="text-white/60 hover:text-white text-[13px] font-medium h-8 px-3 rounded-sm transition-colors">
            로그인
          </button>
        </Link>
        <Link href="/login">
          <button className="h-8 px-3.5 rounded-sm text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            시작하기
          </button>
        </Link>
      </div>
    );
  }

  const badge = tierBadge[membershipTier as keyof typeof tierBadge] ?? null;

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() || "U";

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email?.split("@")[0] || "사용자";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="button-user-menu"
          className="group outline-none select-none"
        >
          {/* ── Pill button (md+) ── */}
          <span
            className="hidden sm:flex items-center gap-[10px] transition-all duration-200"
            style={{
              borderRadius: 40,
              padding: "6px 14px 6px 6px",
              background: "rgba(255,255,255,0.08)",
              border: "0.5px solid rgba(255,255,255,0.12)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
          >
            {/* Avatar */}
            <span
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2D7FB5, #1A3654)",
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "0.5px",
              }}
            >
              {user.profileImageUrl
                ? <img src={user.profileImageUrl} alt={displayName} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
                : userInitials}
            </span>

            {/* Text */}
            <span className="flex flex-col" style={{ gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", lineHeight: 1.3 }}>
                {displayName}
              </span>
              <span className="flex items-center" style={{ gap: 4 }}>
                {showBadge && badge && (
                  <span style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: badge.bg,
                    color: badge.color,
                    fontWeight: 600,
                    letterSpacing: "0.6px",
                  }}>
                    {badge.label}
                  </span>
                )}
                {isAdmin && (
                  <span style={{
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 600,
                    letterSpacing: "0.6px",
                  }}>
                    ADMIN
                  </span>
                )}
              </span>
            </span>

            {/* Chevron */}
            <svg
              width={14}
              height={14}
              viewBox="0 0 14 14"
              fill="none"
              className="transition-transform duration-200 group-data-[state=open]:rotate-180"
              style={{ opacity: 0.4, flexShrink: 0 }}
            >
              <path d="M3 5l4 4 4-4" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          {/* ── Avatar only (< sm) ── */}
          <span
            className="flex sm:hidden items-center justify-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2D7FB5, #1A3654)",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "0.5px",
            }}
          >
            {user.profileImageUrl
              ? <img src={user.profileImageUrl} alt={displayName} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />
              : userInitials}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="p-0 overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150"
        style={{
          width: 220,
          background: "#111D2E",
          border: "0.5px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <span
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2D7FB5, #1A3654)",
              fontSize: 12,
              fontWeight: 500,
              color: "#fff",
            }}
          >
            {user.profileImageUrl
              ? <img src={user.profileImageUrl} alt={displayName} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
              : userInitials}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Menu items */}
        <div style={{ padding: "6px 8px" }}>
          <Link href="/my-page">
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white/70"
              data-testid="menu-mypage"
              style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.7)", borderRadius: 6 }}
            >
              <User size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              마이페이지
            </DropdownMenuItem>
          </Link>

          <Link href="/study-plan">
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white/70"
              data-testid="menu-study-plan"
              style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.7)", borderRadius: 6 }}
            >
              <BookOpen size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              학습계획
            </DropdownMenuItem>
          </Link>

          <Link href="/my-page">
            <DropdownMenuItem
              className="cursor-pointer flex items-center gap-2 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white/70"
              data-testid="menu-reviews"
              style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.7)", borderRadius: 6 }}
            >
              <MessageSquare size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
              후기
            </DropdownMenuItem>
          </Link>

          <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
          <div style={{ padding: "4px 10px", fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: ".08em" }}>테마</div>
          <div style={{ display: "flex", gap: 4, padding: "4px 10px 6px" }}>
            {([
              { value: "light" as const, icon: Sun, label: "라이트" },
              { value: "dark" as const, icon: Moon, label: "다크" },
              { value: "system" as const, icon: Monitor, label: "시스템" },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "5px 0",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: theme === value ? "rgba(0,187,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: theme === value ? "#00BBFF" : "rgba(255,255,255,0.4)",
                  transition: "background .15s, color .15s",
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {isAdmin && (
            <>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
              <Link href="/admin">
                <DropdownMenuItem
                  className="cursor-pointer flex items-center gap-2 hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white/70"
                  data-testid="menu-admin"
                  style={{ padding: "8px 10px", fontSize: 12, color: "rgba(255,255,255,0.7)", borderRadius: 6 }}
                >
                  <Settings size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  관리자 패널
                </DropdownMenuItem>
              </Link>
            </>
          )}
        </div>

        {/* Logout */}
        <div style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)", padding: "6px 8px" }}>
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer flex items-center gap-2 hover:bg-red-500/10 focus:bg-red-500/10"
            data-testid="button-logout"
            style={{ padding: "8px 10px", fontSize: 12, color: "#EF4444", borderRadius: 6 }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            로그아웃
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
