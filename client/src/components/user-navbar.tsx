import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Menu, X, BookOpen, Target, User, Calendar, MessageSquare, LogOut, BarChart3, Coins, Home, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserNavbarProps {
  activeCredits?: number;
}

export default function UserNavbar({ activeCredits = 0 }: UserNavbarProps) {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, membershipTier } = useAuth();
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();

  const navItems = [
    { href: "/my-page", label: t('nav.mypage'), icon: Home },
    { href: "/new-toefl", label: "TOEFL", icon: BookOpen },
    { href: "/gre", label: "GRE", icon: Target },
    { href: "/study-plan", label: t('nav.studyPlan'), icon: Calendar },
    { href: "/performance-analytics", label: t('nav.performanceAnalytics'), icon: BarChart3 },
  ];

  const isActive = (href: string) => location === href;

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/">
              <img 
                src={logoPath} 
                alt="iNRISE" 
                className="h-8 w-auto hover:opacity-80 transition-opacity cursor-pointer" 
                data-testid="link-logo"
              />
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`flex items-center gap-2 ${
                        isActive(item.href)
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "text-gray-300 hover:text-white hover:bg-slate-800"
                      }`}
                      data-testid={`nav-${item.href.replace("/", "")}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <button
              className="theme-toggle"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/subscription">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600/20 rounded-full border border-yellow-500/30 cursor-pointer hover:bg-yellow-600/30 transition-colors" data-testid="credits-display">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">{activeCredits}</span>
              </div>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="flex items-center gap-[10px] cursor-pointer select-none outline-none"
                  data-testid="user-menu-trigger"
                  onMouseEnter={() => setIsProfileHovered(true)}
                  onMouseLeave={() => setIsProfileHovered(false)}
                >
                  {/* 텍스트 영역 — 768px 이하 숨김 */}
                  <div className="hidden sm:flex flex-col items-end gap-[2px]">
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.2 }}>
                      {user?.firstName || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <div className="flex items-center gap-[5px]">
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2D7FB5', flexShrink: 0 }} />
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        {membershipTier || 'guest'}
                      </span>
                    </div>
                  </div>

                  {/* 아바타 */}
                  <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#1A3654',
                        border: `1.5px solid ${isProfileHovered ? 'rgba(45,127,181,1)' : 'rgba(45,127,181,0.8)'}`,
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#7BC4F0' }}>
                        {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    {/* 온라인 상태 도트 */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#34D399',
                        border: '2px solid #0B1929',
                      }}
                    />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  className="text-gray-300 focus:text-white focus:bg-slate-700 cursor-pointer"
                  onClick={() => setLocation('/my-page')}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('nav.mypage')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-gray-300 focus:text-white focus:bg-slate-700 cursor-pointer"
                  onClick={() => setLocation('/reviews')}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('nav.reviews')}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-300 focus:bg-red-900/30 cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white"
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start ${
                        isActive(item.href)
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "text-gray-300 hover:text-white hover:bg-slate-800"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              
              <div className="pt-2 border-t border-slate-700 mt-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 border border-emerald-500/50">
                      <AvatarFallback className="bg-emerald-600 text-white text-sm">
                        {user?.firstName?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white">{user?.firstName || user?.email?.split('@')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 rounded-full">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-medium">{activeCredits}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/30"
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('nav.logout')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
