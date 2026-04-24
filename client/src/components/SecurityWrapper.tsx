import React, { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

interface SecurityWrapperProps {
  children: React.ReactNode;
  watermark?: string;
  disableRightClick?: boolean;
  disableKeyboardShortcuts?: boolean;
  disableTextSelection?: boolean;
  disableScreenshot?: boolean;
  showSecurityNotice?: boolean;
  testNumber?: number; // 테스트 번호 (1-20)
  requiresPremium?: boolean; // 프리미엄 필요 여부
  showUserWatermark?: boolean; // 사용자 정보 워터마크 표시 (이메일 + 타임스탬프)
}

export function SecurityWrapper({
  children,
  watermark = "iNRISE TEST",
  disableRightClick = true,
  disableKeyboardShortcuts = true,
  disableTextSelection = true,
  disableScreenshot = true,
  showSecurityNotice = true,
  testNumber = 1,
  requiresPremium = false,
  showUserWatermark = true  // 기본값: 사용자 워터마크 표시
}: SecurityWrapperProps) {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAdminBadge, setShowAdminBadge] = useState(true);
  
  // 관리자 또는 유료 회원(LITE 이상)은 보안 제한 해제
  const isAdmin = user?.role === 'admin';
  const membershipTier = user?.membershipTier || 'guest';
  
  // 유료 회원 확인: LITE 이상이면 보안 해제
  const isPaidMember = membershipTier !== 'guest';
  
  // 사용자 접근 권한 확인
  const hasAccess = () => {
    if (isAdmin) return true; // 관리자는 모든 접근 가능
    if (!isAuthenticated) return false; // 로그인 안 한 사용자는 접근 불가
    
    // requiresPremium이 true면 무조건 유료 회원만 접근 가능 (testNumber 무시)
    if (requiresPremium) {
      return isPaidMember;
    }
    
    // requiresPremium이 false인 경우만 testNumber 확인
    if (testNumber <= 5) return true; // 처음 5개 테스트는 무료
    
    // 6번째부터는 LITE 이상이면 접근 가능
    return isPaidMember;
  };
  
  // 보안 설정 (관리자 또는 유료 회원만 보안 해제, 기본은 secure mode)
  const shouldDisableSecurity = isAdmin || isPaidMember;
  const securitySettings = {
    disableRightClick: !shouldDisableSecurity && disableRightClick,
    disableKeyboardShortcuts: !shouldDisableSecurity && disableKeyboardShortcuts,
    disableTextSelection: !shouldDisableSecurity && disableTextSelection,
    disableScreenshot: !shouldDisableSecurity && disableScreenshot,
    showSecurityNotice: !shouldDisableSecurity && showSecurityNotice
  };
  const containerRef = useRef<HTMLDivElement>(null);

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    );
  };

  // 타임스탬프 실시간 업데이트 (5초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000); // 5초마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 관리자/유료회원 배지 3초 후 자동 숨김
  useEffect(() => {
    if (shouldDisableSecurity) {
      const timer = setTimeout(() => {
        setShowAdminBadge(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldDisableSecurity]);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (securitySettings.disableRightClick) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!securitySettings.disableKeyboardShortcuts) return;

      if (isEditableTarget(e.target)) {
        if ((e.ctrlKey || e.metaKey) && ['u', 'i', 'j'].includes(e.key.toLowerCase())) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        return;
      }

      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      const forbiddenKeys = [
        'F12',
        'PrintScreen'
      ];

      if (e.ctrlKey || e.metaKey) {
        const forbiddenCombos = [
          's',
          'p',
          'u',
          'i',
          'j',
          'shift+i',
          'shift+j',
          'shift+c',
        ];

        if (forbiddenCombos.includes(e.key.toLowerCase()) ||
            (e.shiftKey && ['I', 'J', 'C'].includes(e.key))) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      if (forbiddenKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const handleSelectStart = (e: Event) => {
      if (securitySettings.disableTextSelection) {
        e.preventDefault();
        return false;
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.clipboardData?.setData('text/plain', '');
      return false;
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    const style = document.createElement('style');
    style.textContent = `
      .security-protected {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      .security-protected * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
      }
      .security-protected input,
      .security-protected textarea,
      .security-protected [contenteditable="true"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      .security-protected img,
      .security-protected video,
      .security-protected canvas {
        -webkit-user-drag: none !important;
        -khtml-user-drag: none !important;
        -moz-user-drag: none !important;
        -o-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.head.removeChild(style);
    };
  }, [securitySettings.disableRightClick, securitySettings.disableKeyboardShortcuts, securitySettings.disableTextSelection, securitySettings.disableScreenshot]);

  // 접근 권한이 없는 경우 안내 메시지 표시
  if (!hasAccess()) {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">
              모의고사를 이용하시려면 회원가입 후 로그인해주세요.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setLocation('/login')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                로그인하기
              </button>
              <button
                onClick={() => setLocation('/login')}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                회원가입하기
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // GUEST 사용자 - 프리미엄 구독 필요 (requiresPremium 또는 testNumber > 5)
    if (membershipTier === 'guest' && (requiresPremium || testNumber > 5)) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <Shield className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">프리미엄 구독이 필요합니다</h2>
            <p className="text-gray-600 mb-2">
              이 테스트는 프리미엄 회원 전용입니다.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              테스트 1-5번은 무료로 이용 가능하며, 6번부터는 프리미엄 구독이 필요합니다.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setLocation('/subscription')}
                className="w-full bg-amber-600 text-white py-2 px-4 rounded-lg hover:bg-amber-700 transition-colors"
              >
                프리미엄 구독하기
              </button>
              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                이전으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${securitySettings.disableTextSelection ? 'security-protected' : ''}`}
      style={{
        userSelect: securitySettings.disableTextSelection ? 'none' : 'auto',
        WebkitUserSelect: securitySettings.disableTextSelection ? 'none' : 'auto',
        MozUserSelect: securitySettings.disableTextSelection ? 'none' : 'auto',
      }}
      data-testid="security-wrapper"
    >
      {/* 워터마크 */}
      {showUserWatermark && user && !isAdmin && (
        <div className="fixed inset-0 pointer-events-none z-50 select-none">
          <div 
            className="absolute inset-0 opacity-10 text-gray-700 text-sm font-semibold"
            style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
                  <text x="50%" y="40%" text-anchor="middle" dy=".3em" font-size="14" fill="currentColor" opacity="0.3" transform="rotate(-45 200 100)">
                    ${user.email}
                  </text>
                  <text x="50%" y="60%" text-anchor="middle" dy=".3em" font-size="12" fill="currentColor" opacity="0.3" transform="rotate(-45 200 100)">
                    ${currentTime.toLocaleString('ko-KR', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit', 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </text>
                </svg>
              `)}")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '400px 200px'
            }}
          />
        </div>
      )}
      {!showUserWatermark && watermark && (
        <div className="fixed inset-0 pointer-events-none z-50 select-none">
          <div 
            className="absolute inset-0 opacity-5 text-gray-600 text-4xl font-bold"
            style={{
              backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">
                  <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20" fill="currentColor" opacity="0.1" transform="rotate(-45 150 75)">
                    ${watermark}
                  </text>
                </svg>
              `)}")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '300px 150px'
            }}
          />
        </div>
      )}

      {/* 보안 알림 */}
      {securitySettings.showSecurityNotice && (
        <div className="fixed top-4 right-4 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-2 rounded-lg shadow-md z-40 flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          <span>보안 모드 활성화</span>
        </div>
      )}

      {/* 관리자 또는 유료 회원 표시 - 3초 후 자동 숨김 */}
      {showAdminBadge && isAdmin && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-300 text-green-800 px-3 py-1.5 rounded-lg shadow-md z-40 flex items-center gap-2 text-xs opacity-90 transition-opacity duration-300">
          <Shield className="h-3 w-3" />
          <span>관리자 모드</span>
        </div>
      )}
      {showAdminBadge && !isAdmin && isPaidMember && (
        <div className="fixed bottom-4 right-4 bg-blue-100 border border-blue-300 text-blue-800 px-3 py-1.5 rounded-lg shadow-md z-40 flex items-center gap-2 text-xs opacity-90 transition-opacity duration-300">
          <Shield className="h-3 w-3" />
          <span>PRO 회원</span>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="relative z-10">
        {children}
      </div>

      {/* 투명한 오버레이 (추가 보안) - 관리자 또는 유료 회원이 아닌 경우만 */}
      {!shouldDisableSecurity && (
        <div 
          className="fixed inset-0 pointer-events-none z-30 select-none"
          style={{
            background: 'transparent',
          }}
        />
      )}
    </div>
  );
}
