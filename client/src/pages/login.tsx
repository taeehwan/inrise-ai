import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { 
  Eye, 
  EyeOff, 
  Target,
  Mail, 
  Lock, 
  User,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { FaGoogle } from "react-icons/fa";
import { SiNaver, SiKakao } from "react-icons/si";
import { useAuth } from "@/hooks/useAuth";
import logoPath from "@assets/로고_가로형-300x87_1754507359338.png";

export default function Login() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'naver' | 'kakao') => {
    try {
      toast({
        title: "소셜 로그인",
        description: `${provider === 'google' ? 'Google' : provider === 'naver' ? 'Naver' : 'Kakao'} 계정으로 로그인합니다.`,
      });
      
      // 실제 구현에서는 OAuth 서비스로 리디렉션
      // window.location.href = `/api/auth/${provider}`;
    } catch (error: any) {
      toast({
        title: "소셜 로그인 오류",
        description: error.message || "소셜 로그인에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/");
    }
  }, [user, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast({
        title: "입력 오류",
        description: "이메일과 비밀번호를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", loginData);
      const result = await response.json();
      
      if (result.success === false) {
        let errorMessage = result.message || "로그인에 실패했습니다.";
        
        if (result.code === 'TOO_MANY_ATTEMPTS' && result.retryAfter) {
          const minutes = Math.ceil(result.retryAfter / 60);
          errorMessage = `로그인 시도 횟수가 초과되었습니다. ${minutes}분 후에 다시 시도해주세요.`;
        } else if (result.remainingAttempts !== undefined && result.remainingAttempts <= 2) {
          errorMessage += ` (남은 시도: ${result.remainingAttempts}회)`;
        }
        
        toast({
          title: "로그인 실패",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "로그인 성공",
        description: "환영합니다! 잠시 후 이동합니다.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Redirect based on user role
      const redirectUrl = result.user?.role === 'admin' ? '/admin' : '/my-page';
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1000);
    } catch (error: any) {
      let errorMessage = "이메일 또는 비밀번호를 다시 확인해주세요.";
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "로그인 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupData.email || !signupData.password || !signupData.firstName) {
      toast({
        title: "입력 오류",
        description: "필수 정보를 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "비밀번호 불일치",
        description: "비밀번호와 비밀번호 확인이 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    if (signupData.password.length < 8) {
      toast({
        title: "비밀번호 오류",
        description: "비밀번호는 최소 8자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: signupData.email,
        password: signupData.password,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
        username: signupData.firstName + (signupData.lastName || ""),
        privacyConsent: true,
        marketingConsent: false,
      });
      
      const result = await response.json();
      
      if (result.success === false) {
        toast({
          title: "회원가입 실패",
          description: result.message || "회원가입에 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "회원가입 성공",
        description: "계정이 생성되었습니다! 자동으로 로그인됩니다.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error: any) {
      let errorMessage = "회원가입에 실패했습니다. 다시 시도해주세요.";
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        if (error.message) {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Target className="h-10 w-10 text-white" />
          </div>
          <div className="text-xl font-semibold text-white mb-2">로딩 중...</div>
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 p-12 relative overflow-hidden">
        <div className="flex flex-col justify-center items-center h-full w-full">
          {/* Logo & Title - Centered */}
          <div className="text-center">
            <Link href="/">
              <img 
                src={logoPath} 
                alt="iNRISE" 
                className="h-20 mx-auto mb-8 transition-transform duration-300 hover:scale-105"
              />
            </Link>
            
            <h1 className="text-5xl font-bold mb-6 text-white leading-tight">
              당신의<br />
              <span className="text-emerald-400">목표 점수를 달성하세요</span>
            </h1>

            <p className="text-xl text-gray-300 leading-relaxed max-w-xl mx-auto">
              AI 기반 맞춤형 학습과 실전 모의고사로<br />
              TOEFL, GRE 고득점의 꿈을 현실로
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <img 
                src={logoPath} 
                alt="iNRISE" 
                className="h-14 mx-auto mb-6 transition-transform duration-300 hover:scale-105"
              />
            </Link>
            <h2 className="text-3xl font-bold text-white mb-3">환영합니다</h2>
            <p className="text-lg text-gray-400">계정에 로그인하거나 새로 가입하세요</p>
          </div>

          {/* Login/Signup Card */}
          <Card className="bg-slate-800/80 backdrop-blur-sm border border-slate-700">
            <CardHeader className="text-center pb-6">
              <div className="hidden lg:block">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold text-white mb-2">로그인 / 회원가입</CardTitle>
                <CardDescription className="text-gray-400">
                  iNRISE 플랫폼으로 학습을 시작하세요
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/80 h-12 rounded-xl p-1 border border-slate-600">
                  <TabsTrigger 
                    value="login" 
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-semibold rounded-lg transition-all duration-300"
                  >
                    로그인
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup"
                    className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 font-semibold rounded-lg transition-all duration-300"
                  >
                    회원가입
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-6 mt-6">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-emerald-400" />
                        이메일
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl"
                        required
                        data-testid="input-email-login"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        비밀번호
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={loginData.password}
                          onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="비밀번호를 입력하세요"
                          className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl pr-12"
                          required
                          data-testid="input-password-login"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all duration-300"
                      data-testid="button-login"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          로그인 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          로그인
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      )}
                    </Button>
                  </form>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-600 w-full"></div>
                    <span className="bg-slate-800 px-3 text-xs text-gray-500">또는</span>
                    <div className="border-t border-slate-600 w-full"></div>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('google')}
                      className="h-11 border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-red-500/50 transition-all duration-200 rounded-xl"
                      data-testid="button-google-login"
                    >
                      <FaGoogle className="h-5 w-5 text-red-400" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('naver')}
                      className="h-11 border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-green-500/50 transition-all duration-200 rounded-xl"
                      data-testid="button-naver-login"
                    >
                      <SiNaver className="h-5 w-5 text-green-400" />
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSocialLogin('kakao')}
                      className="h-11 border border-slate-600 bg-slate-700/50 hover:bg-slate-700 hover:border-yellow-500/50 transition-all duration-200 rounded-xl"
                      data-testid="button-kakao-login"
                    >
                      <SiKakao className="h-5 w-5 text-yellow-400" />
                    </Button>
                  </div>



                </TabsContent>

                <TabsContent value="signup" className="space-y-6 mt-6">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <User className="h-4 w-4 text-emerald-400" />
                          이름
                        </Label>
                        <Input
                          id="firstName"
                          type="text"
                          value={signupData.firstName}
                          onChange={(e) => setSignupData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="홍길동"
                          className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl"
                          required
                          data-testid="input-firstName-signup"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                          성 (선택)
                        </Label>
                        <Input
                          id="lastName"
                          type="text"
                          value={signupData.lastName}
                          onChange={(e) => setSignupData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="김"
                          className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl"
                          data-testid="input-lastName-signup"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-emerald-400" />
                        이메일
                      </Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl"
                        required
                        data-testid="input-email-signup"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <Lock className="h-4 w-4 text-emerald-400" />
                        비밀번호
                      </Label>
                      <div className="relative">
                        <Input
                          id="signupPassword"
                          type={showPassword ? "text" : "password"}
                          value={signupData.password}
                          onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="최소 8자 이상"
                          className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl pr-12"
                          required
                          data-testid="input-password-signup"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        비밀번호 확인
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="비밀번호를 다시 입력하세요"
                          className="h-12 bg-slate-700/50 border border-slate-600 focus:border-emerald-500 text-white placeholder:text-gray-500 rounded-xl pr-12"
                          required
                          data-testid="input-confirmPassword-signup"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all duration-300"
                      data-testid="button-signup"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                          계정 생성 중...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          계정 만들기
                          <ArrowRight className="h-5 w-5" />
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium">
              <Target className="h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}