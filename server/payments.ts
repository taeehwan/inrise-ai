import crypto from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { db } from './db';
import { users, payments, subscriptions, adminLogs } from '@shared/schema';
import { and, eq, inArray } from 'drizzle-orm';

// Toss payment keys and order IDs are alphanumeric + hyphen/underscore.
// Enforced at the API boundary so hostile / malformed bodies don't reach the
// upstream Toss call or the DB.
const paymentKeySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/, 'invalid paymentKey format');

const orderIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, 'invalid orderId format');

const amountStringSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^\d+(\.\d{1,2})?$/, 'amount must be a decimal string');

const confirmPaymentBodySchema = z.object({
  paymentKey: paymentKeySchema,
  orderId: orderIdSchema,
  amount: amountStringSchema,
});

const failPaymentBodySchema = z.object({
  orderId: orderIdSchema,
  code: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
});

// 토스페이먼츠 API 설정
const TOSS_PAYMENTS_CLIENT_KEY = process.env.TOSS_PAYMENTS_CLIENT_KEY;
const TOSS_PAYMENTS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY;
const TOSS_PAYMENTS_BASE_URL = 'https://api.tosspayments.com/v1';

// 구독 플랜 정의
const SUBSCRIPTION_PLANS = {
  light: {
    name: 'iNRISE 라이트',
    price: 29000,
    features: ['월 10회 AI 문제 생성', '기본 인라이즈 피드백', '개인 학습 진도 추적']
  },
  pro: {
    name: 'iNRISE 프로',
    price: 59000,
    features: ['무제한 AI 문제 생성', '고급 인라이즈 피드백', '맞춤 학습계획', '상세 성적 분석']
  },
  max: {
    name: 'iNRISE 맥스',
    price: 99000,
    features: ['프로 플랜 모든 기능', '1:1 코칭', '우선 지원', '목표 점수 보장']
  }
};

// 결제 생성
export async function createPayment(req: Request, res: Response) {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    if (!SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({ error: '유효하지 않은 플랜입니다.' });
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    const orderId = `ORDER_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 결제 정보 DB에 저장
    const [payment] = await db.insert(payments).values({
      userId,
      tossOrderId: orderId,
      amount: plan.price.toString(),
      currency: 'KRW',
      status: 'ready'
    }).returning();

    // 토스페이먼츠 결제 요청
    const paymentData = {
      amount: plan.price,
      orderId,
      orderName: plan.name,
      customerEmail: req.user?.email,
      customerName: req.user?.firstName + ' ' + req.user?.lastName,
      successUrl: `${process.env.BASE_URL}/payment/success`,
      failUrl: `${process.env.BASE_URL}/payment/fail`,
    };

    const response = await fetch(`${TOSS_PAYMENTS_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_PAYMENTS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('토스페이먼츠 오류:', result);
      return res.status(400).json({ error: '결제 요청에 실패했습니다.' });
    }

    // 결제 키 업데이트
    await db.update(payments)
      .set({ tossPaymentKey: result.paymentKey })
      .where(eq(payments.id, payment.id));

    res.json({
      paymentKey: result.paymentKey,
      orderId,
      amount: plan.price,
      paymentUrl: result.checkout?.url
    });

  } catch (error) {
    console.error('결제 생성 오류:', error);
    res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다.' });
  }
}

// 결제 성공 처리
export async function confirmPayment(req: Request, res: Response) {
  try {
    const parsed = confirmPaymentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: '필수 파라미터가 누락되었거나 형식이 올바르지 않습니다.',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const { paymentKey, orderId, amount } = parsed.data;

    const callerId = req.user?.id;
    if (!callerId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // Bind the confirm to the payment row the current user actually created.
    // This prevents another authenticated user from confirming someone else's
    // pending payment even if they observe a (paymentKey, orderId, amount).
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.tossOrderId, orderId))
      .limit(1);

    if (!existingPayment) {
      return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다.' });
    }

    if (existingPayment.userId !== callerId) {
      return res.status(403).json({ error: '해당 결제에 접근할 권한이 없습니다.' });
    }

    // Idempotency: if the payment already reached a terminal state, return success
    // without calling Toss or creating another subscription row. This makes
    // repeated confirms (Toss retry, user double-click, network timeout replay) safe.
    if (existingPayment.status === 'done') {
      const [existingSub] = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, existingPayment.userId))
        .orderBy(subscriptions.createdAt)
        .limit(1);
      const planId = determinePlanFromAmount(parseInt(amount));
      const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
      return res.json({
        success: true,
        idempotent: true,
        subscription: existingSub ?? { planId, planName: plan.name, status: 'active' },
      });
    }

    if (existingPayment.status === 'cancelled') {
      return res.status(409).json({ error: '이미 취소된 결제입니다.' });
    }

    // 토스페이먼츠 결제 승인
    const confirmData = {
      paymentKey,
      orderId,
      amount: parseInt(amount)
    };

    const isQaMock = process.env.QA_MOCK_EXTERNALS === "1";
    let result: { method?: string } = {};

    if (isQaMock) {
      result = { method: "qa_mock_card" };
    } else {
      const response = await fetch(`${TOSS_PAYMENTS_BASE_URL}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(TOSS_PAYMENTS_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmData),
      });

      result = await response.json();

      if (!response.ok) {
        console.error('결제 승인 실패:', result);
        return res.status(400).json({ error: '결제 승인에 실패했습니다.' });
      }
    }

    // Atomic transition: only flip ready/in_progress → done. If two confirms race,
    // the second UPDATE returns zero rows and we treat it as idempotent success.
    const updated = await db.update(payments)
      .set({
        status: 'done',
        paidAt: new Date(),
        method: result.method
      })
      .where(and(
        eq(payments.tossOrderId, orderId),
        inArray(payments.status, ['ready', 'in_progress']),
      ))
      .returning();

    if (updated.length === 0) {
      // Another request already promoted this payment to `done`. Return success —
      // the subscription row from that request is authoritative.
      const [existingSub] = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, existingPayment.userId))
        .orderBy(subscriptions.createdAt)
        .limit(1);
      return res.json({
        success: true,
        idempotent: true,
        subscription: existingSub ?? null,
      });
    }

    const payment = updated[0];

    // 구독 정보 생성/업데이트
    const planId = determinePlanFromAmount(parseInt(amount));
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];

    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후

    await db.insert(subscriptions).values({
      userId: payment.userId,
      planId,
      planName: plan.name,
      price: plan.price.toString(),
      status: 'active',
      billingCycleStart: now,
      billingCycleEnd: endDate
    });

    // 사용자 정보 업데이트
    const membershipTier = planId as 'light' | 'pro' | 'max';
    await db.update(users)
      .set({
        membershipTier,
        subscriptionStatus: 'active',
        subscriptionStartDate: now,
        subscriptionEndDate: endDate
      })
      .where(eq(users.id, payment.userId));

    res.json({
      success: true,
      subscription: {
        planId,
        planName: plan.name,
        status: 'active',
        endDate
      }
    });

  } catch (error) {
    console.error('결제 승인 오류:', error);
    res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다.' });
  }
}

// 결제 실패 처리
export async function handlePaymentFailure(req: Request, res: Response) {
  try {
    const parsed = failPaymentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: '주문 ID가 필요하거나 형식이 올바르지 않습니다.',
        details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    const { orderId, code, message } = parsed.data;

    const callerId = req.user?.id;
    if (!callerId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // Only the user who created the payment can mark it as failed — otherwise
    // anyone with an orderId could cancel another user's pending payment.
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(eq(payments.tossOrderId, orderId))
      .limit(1);

    if (!existingPayment) {
      return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다.' });
    }

    if (existingPayment.userId !== callerId) {
      return res.status(403).json({ error: '해당 결제에 접근할 권한이 없습니다.' });
    }

    // 결제 실패 정보 업데이트
    await db.update(payments)
      .set({
        status: 'cancelled',
        failureCode: code,
        failureMessage: message
      })
      .where(eq(payments.tossOrderId, orderId));

    res.json({ success: true });

  } catch (error) {
    console.error('결제 실패 처리 오류:', error);
    res.status(500).json({ error: '결제 실패 처리 중 오류가 발생했습니다.' });
  }
}

// 구독 취소
export async function cancelSubscription(req: Request, res: Response) {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    // 구독 정보 조회
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId));

    if (!subscription) {
      return res.status(404).json({ error: '구독 정보를 찾을 수 없습니다.' });
    }

    if (subscription.userId !== userId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 구독 취소
    await db.update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date()
      })
      .where(eq(subscriptions.id, subscriptionId));

    // 사용자 정보 업데이트
    await db.update(users)
      .set({
        membershipTier: 'guest',
        subscriptionStatus: 'cancelled'
      })
      .where(eq(users.id, subscription.userId));

    // 관리자 로그 (관리자가 취소한 경우)
    if (req.user?.role === 'admin') {
      await db.insert(adminLogs).values({
        adminId: userId,
        action: 'subscription_cancel',
        targetUserId: subscription.userId,
        targetType: 'subscription',
        targetId: subscriptionId,
        details: { reason: 'admin_cancel' }
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('구독 취소 오류:', error);
    res.status(500).json({ error: '구독 취소 중 오류가 발생했습니다.' });
  }
}

// 사용자 구독 정보 조회
export async function getUserSubscription(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(subscriptions.createdAt)
      .limit(1);

    if (!subscription) {
      return res.json(null);
    }

    res.json(subscription);

  } catch (error) {
    console.error('구독 정보 조회 오류:', error);
    res.status(500).json({ error: '구독 정보 조회 중 오류가 발생했습니다.' });
  }
}

// 헬퍼 함수: 금액으로 플랜 결정
function determinePlanFromAmount(amount: number): string {
  for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.price === amount) {
      return planId;
    }
  }
  return 'light'; // 기본값
}
