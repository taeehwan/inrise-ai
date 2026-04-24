import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, MessageCircle, Mail, Lock, User, Sparkles, Shield, Phone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    privacyConsent: false,
    marketingConsent: false
  });
  const { toast } = useToast();
  const { t } = useLanguage();

  // Auto-format phone number to 010-1234-5678
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/[^0-9]/g, '');
    
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      toast({
        title: t('auth.loginSuccess'),
        description: t('auth.welcomeMessage'),
      });
      window.location.reload(); // Refresh to update auth state
    },
    onError: (error: any) => {
      toast({
        title: t('auth.loginFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      toast({
        title: t('auth.registerSuccess'),
        description: t('auth.welcomeMessage'),
      });
      window.location.reload(); // Refresh to update auth state
    },
    onError: (error: any) => {
      toast({
        title: t('auth.registerFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: t('auth.passwordMismatch'),
        description: t('auth.passwordMismatchDesc'),
        variant: "destructive",
      });
      return;
    }

    if (!registerForm.privacyConsent) {
      toast({
        title: t('auth.privacyRequired'),
        description: t('auth.privacyRequiredDesc'),
        variant: "destructive",
      });
      return;
    }

    // Phone number validation (optional field)
    if (registerForm.phone && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(registerForm.phone)) {
      toast({
        title: t('auth.phoneFormatError'),
        description: t('auth.phoneFormatErrorDesc'),
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate({
      email: registerForm.email,
      password: registerForm.password,
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      username: registerForm.username,
      phone: registerForm.phone || undefined,
      privacyConsent: registerForm.privacyConsent,
      marketingConsent: registerForm.marketingConsent,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
        <DialogHeader className="text-center pb-6">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
            {t('auth.loginRegister')}
          </DialogTitle>
          <p className="text-slate-600 font-medium mt-2">
            {t('auth.welcome')}
          </p>
        </DialogHeader>
        
        <div className="w-full">
          {/* Custom Tab Buttons */}
          <div className="grid grid-cols-2 mb-8 bg-slate-100/80 rounded-2xl p-1">
            <button
              onClick={() => setActiveTab("login")}
              className={`px-6 py-3 text-base font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "login"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
              }`}
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
            >
              {t('auth.login')}
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`px-6 py-3 text-base font-semibold rounded-xl transition-all duration-300 ${
                activeTab === "register"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/50"
              }`}
              style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
            >
              {t('auth.register')}
            </button>
          </div>
          
          {/* Login Tab */}
          {activeTab === "login" && (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.email')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Mail className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="login-password" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        <Lock className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500/30 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full py-3 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105" 
                  disabled={loginMutation.isPending}
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                >
                  {loginMutation.isPending ? t('auth.loggingIn') : `🚀 ${t('auth.loginButton')}`}
                </Button>
                
                <div className="text-center">
                  <Link href="/forgot-password">
                    <a 
                      className="text-sm text-slate-600 hover:text-blue-600 font-medium transition-colors duration-200"
                      onClick={() => onClose()}
                      data-testid="link-forgot-password"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </Link>
                </div>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-slate-500 font-medium">{t('auth.or') || 'or'}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/api/auth/google'}
                  className="w-full py-3 text-base font-semibold bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                  type="button"
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                >
                  <Users className="mr-2 h-5 w-5" />
                  {t('auth.googleLogin') || 'Login with Google'}
                </Button>
                
                <Button 
                  onClick={() => window.location.href = '/api/auth/kakao'}
                  className="w-full py-3 text-base font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105"
                  type="button"
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  {t('auth.kakaoLogin') || 'Login with Kakao'}
                </Button>
              </div>
            </div>
          )}
          
          {/* Register Tab */}
          {activeTab === "register" && (
            <div className="space-y-6">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="register-firstName" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                      {t('auth.firstName')}
                    </Label>
                    <Input
                      id="register-firstName"
                      placeholder={t('auth.firstNamePlaceholder')}
                      value={registerForm.firstName}
                      onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                      className="px-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="register-lastName" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                      {t('auth.lastName')}
                    </Label>
                    <Input
                      id="register-lastName"
                      placeholder={t('auth.lastNamePlaceholder')}
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="px-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-username" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.username')} {t('auth.optional')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <User className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="register-username"
                      placeholder={t('auth.usernamePlaceholder')}
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-all duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-email" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.email')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Mail className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder={t('auth.emailPlaceholder')}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-password" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.password')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        <Lock className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder={t('auth.passwordPlaceholder')}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-purple-500/30 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-confirmPassword" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <Lock className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                    <Input
                      id="register-confirmPassword"
                      type="password"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="pl-12 pr-4 py-3 border-0 bg-slate-50/80 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500/30 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Contact and Terms Section */}
                <div className="space-y-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                    {t('auth.contactAndTerms')}
                  </h3>
                  
                  <div className="space-y-3">
                    <Label htmlFor="register-phone" className="text-slate-700 font-semibold text-sm" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}>
                      {t('auth.phoneOptional')}
                    </Label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <div className="w-5 h-5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                          <Phone className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder={t('auth.phonePlaceholder')}
                        value={registerForm.phone}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value);
                          setRegisterForm({ ...registerForm, phone: formatted });
                        }}
                        className="pl-12 pr-4 py-3 border-0 bg-white rounded-xl shadow-sm focus:ring-2 focus:ring-cyan-500/30 transition-all duration-300"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="privacy-consent"
                        checked={registerForm.privacyConsent}
                        onCheckedChange={(checked) => 
                          setRegisterForm({ ...registerForm, privacyConsent: checked === true })
                        }
                        className="mt-1"
                        data-testid="checkbox-privacy-consent"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="privacy-consent" 
                          className="text-sm font-medium text-slate-700 cursor-pointer"
                          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                        >
                          {t('auth.privacyAgree')} <span className="text-red-500">*</span>
                        </Label>
                        <a 
                          href="/privacy-policy" 
                          target="_blank" 
                          className="text-xs text-blue-600 hover:underline ml-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t('auth.viewDetails')}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="marketing-consent"
                        checked={registerForm.marketingConsent}
                        onCheckedChange={(checked) => 
                          setRegisterForm({ ...registerForm, marketingConsent: checked === true })
                        }
                        className="mt-1"
                        data-testid="checkbox-marketing-consent"
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor="marketing-consent" 
                          className="text-sm font-medium text-slate-700 cursor-pointer"
                          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                        >
                          {t('auth.marketingAgree')} {t('auth.optional')}
                        </Label>
                        <p className="text-xs text-slate-500 mt-1">
                          {t('auth.marketingDesc')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full py-3 text-base font-semibold bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white border-0 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100" 
                  disabled={registerMutation.isPending || !registerForm.privacyConsent}
                  style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif' }}
                  data-testid="button-register"
                >
                  {registerMutation.isPending ? t('auth.signingUp') : t('auth.signUpButton')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}