export const AUTH_ERROR_CODES = {
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',
  INVALID_PASSWORD_FORMAT: 'INVALID_PASSWORD_FORMAT',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_ERROR: 'SESSION_ERROR',
  PRIVACY_CONSENT_REQUIRED: 'PRIVACY_CONSENT_REQUIRED',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  SERVER_ERROR: 'SERVER_ERROR'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

export interface AuthErrorResponse {
  success: false;
  message: string;
  code: AuthErrorCode;
  retryAfter?: number;
  remainingAttempts?: number;
}

export interface AuthSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export type AuthResponse<T = any> = AuthSuccessResponse<T> | AuthErrorResponse;

export function createAuthError(
  code: AuthErrorCode, 
  message: string, 
  extras?: { retryAfter?: number; remainingAttempts?: number }
): AuthErrorResponse {
  return {
    success: false,
    message,
    code,
    ...extras
  };
}

export function createAuthSuccess<T>(data: T, message?: string): AuthSuccessResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, { ko: string; en: string }> = {
  AUTHENTICATION_REQUIRED: {
    ko: '로그인이 필요합니다.',
    en: 'Authentication required.'
  },
  INVALID_CREDENTIALS: {
    ko: '이메일 또는 비밀번호가 올바르지 않습니다.',
    en: 'Invalid email or password.'
  },
  INVALID_EMAIL_FORMAT: {
    ko: '올바른 이메일 형식을 입력해주세요.',
    en: 'Please enter a valid email address.'
  },
  INVALID_PASSWORD_FORMAT: {
    ko: '비밀번호는 8자 이상이어야 합니다.',
    en: 'Password must be at least 8 characters.'
  },
  USER_NOT_FOUND: {
    ko: '등록되지 않은 이메일입니다.',
    en: 'Email not registered.'
  },
  USER_ALREADY_EXISTS: {
    ko: '이미 등록된 이메일입니다.',
    en: 'Email already registered.'
  },
  USER_INACTIVE: {
    ko: '비활성화된 계정입니다. 관리자에게 문의하세요.',
    en: 'Account is inactive. Please contact support.'
  },
  TOO_MANY_ATTEMPTS: {
    ko: '로그인 시도 횟수가 초과되었습니다. 잠시 후 다시 시도해주세요.',
    en: 'Too many login attempts. Please try again later.'
  },
  SESSION_EXPIRED: {
    ko: '세션이 만료되었습니다. 다시 로그인해주세요.',
    en: 'Session expired. Please login again.'
  },
  SESSION_ERROR: {
    ko: '세션 처리 중 오류가 발생했습니다.',
    en: 'Session error occurred.'
  },
  PRIVACY_CONSENT_REQUIRED: {
    ko: '개인정보 수집 동의가 필요합니다.',
    en: 'Privacy consent is required.'
  },
  REGISTRATION_FAILED: {
    ko: '회원가입에 실패했습니다. 다시 시도해주세요.',
    en: 'Registration failed. Please try again.'
  },
  LOGIN_FAILED: {
    ko: '로그인에 실패했습니다. 다시 시도해주세요.',
    en: 'Login failed. Please try again.'
  },
  SERVER_ERROR: {
    ko: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    en: 'Server error occurred. Please try again later.'
  }
};
