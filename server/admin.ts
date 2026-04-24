import { Request, Response } from 'express';
import { db } from './db';
import { users, payments, subscriptions, adminLogs } from '@shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';

// 관리자 권한 확인 미들웨어
export function requireAdmin(req: Request, res: Response, next: Function) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// 전체 사용자 목록 조회
export async function getAllUsers(req: Request, res: Response) {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    res.status(500).json({ error: '사용자 목록을 불러오는데 실패했습니다.' });
  }
}

// 사용자 정보 업데이트
export async function updateUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: '관리자 로그인이 필요합니다.' });
    }

    // 허용된 필드만 업데이트
    const allowedFields = [
      'membershipTier', 
      'subscriptionStatus', 
      'isActive', 
      'role',
      'firstName',
      'lastName',
      'country',
      'targetExam',
      'targetScore'
    ];

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: '업데이트할 유효한 필드가 없습니다.' });
    }

    // 업데이트 실행
    const [updatedUser] = await db.update(users)
      .set({
        ...filteredUpdates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 관리자 로그 기록
    await db.insert(adminLogs).values({
      adminId,
      action: 'user_update',
      targetUserId: userId,
      targetType: 'user',
      targetId: userId,
      details: { updates: filteredUpdates },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(updatedUser);

  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    res.status(500).json({ error: '사용자 정보 업데이트에 실패했습니다.' });
  }
}

// 전체 결제 내역 조회
export async function getAllPayments(req: Request, res: Response) {
  try {
    const allPayments = await db.select({
      id: payments.id,
      userId: payments.userId,
      tossPaymentKey: payments.tossPaymentKey,
      tossOrderId: payments.tossOrderId,
      amount: payments.amount,
      currency: payments.currency,
      status: payments.status,
      method: payments.method,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      userEmail: users.email,
      userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName')
    })
    .from(payments)
    .leftJoin(users, eq(payments.userId, users.id))
    .orderBy(desc(payments.createdAt));

    res.json(allPayments);
  } catch (error) {
    console.error('결제 내역 조회 오류:', error);
    res.status(500).json({ error: '결제 내역을 불러오는데 실패했습니다.' });
  }
}

// 전체 구독 현황 조회
export async function getAllSubscriptions(req: Request, res: Response) {
  try {
    const allSubscriptions = await db.select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      planId: subscriptions.planId,
      planName: subscriptions.planName,
      price: subscriptions.price,
      status: subscriptions.status,
      billingCycleStart: subscriptions.billingCycleStart,
      billingCycleEnd: subscriptions.billingCycleEnd,
      createdAt: subscriptions.createdAt,
      userEmail: users.email,
      userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('userName')
    })
    .from(subscriptions)
    .leftJoin(users, eq(subscriptions.userId, users.id))
    .orderBy(desc(subscriptions.createdAt));

    res.json(allSubscriptions);
  } catch (error) {
    console.error('구독 현황 조회 오류:', error);
    res.status(500).json({ error: '구독 현황을 불러오는데 실패했습니다.' });
  }
}

// 관리자 통계 조회
export async function getAdminStats(req: Request, res: Response) {
  try {
    // 총 사용자 수
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const totalUsers = totalUsersResult.count;

    // 결제 회원 수 (active 구독 또는 guest가 아닌 사용자)
    const [paidUsersResult] = await db.select({ count: count() })
      .from(users)
      .where(sql`${users.membershipTier} != 'guest'`);
    const paidUsers = paidUsersResult.count;

    // 활성 구독 수
    const [activeSubscriptionsResult] = await db.select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    const activeSubscriptions = activeSubscriptionsResult.count;

    // 월별 매출 (현재 월)
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyPayments = await db.select({
      total: sql<number>`SUM(CAST(${payments.amount} AS DECIMAL))`.as('total')
    })
    .from(payments)
    .where(
      sql`${payments.status} = 'done' 
          AND ${payments.paidAt} >= ${firstDayOfMonth} 
          AND ${payments.paidAt} <= ${lastDayOfMonth}`
    );

    const monthlyRevenue = monthlyPayments[0]?.total || 0;

    // 플랜별 구독자 수
    const planStats = await db.select({
      planId: subscriptions.planId,
      planName: subscriptions.planName,
      count: count()
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'))
    .groupBy(subscriptions.planId, subscriptions.planName);

    // 최근 결제 현황 (지난 7일)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPayments = await db.select({
      date: sql<string>`DATE(${payments.paidAt})`.as('date'),
      amount: sql<number>`SUM(CAST(${payments.amount} AS DECIMAL))`.as('amount'),
      count: count()
    })
    .from(payments)
    .where(
      sql`${payments.status} = 'done' AND ${payments.paidAt} >= ${sevenDaysAgo}`
    )
    .groupBy(sql`DATE(${payments.paidAt})`)
    .orderBy(sql`DATE(${payments.paidAt})`);

    res.json({
      totalUsers,
      paidUsers,
      activeSubscriptions,
      monthlyRevenue,
      planStats,
      recentPayments
    });

  } catch (error) {
    console.error('통계 조회 오류:', error);
    res.status(500).json({ error: '통계 정보를 불러오는데 실패했습니다.' });
  }
}

// 관리자 로그 조회
export async function getAdminLogs(req: Request, res: Response) {
  try {
    const logs = await db.select({
      id: adminLogs.id,
      action: adminLogs.action,
      targetUserId: adminLogs.targetUserId,
      targetType: adminLogs.targetType,
      targetId: adminLogs.targetId,
      details: adminLogs.details,
      createdAt: adminLogs.createdAt,
      adminEmail: users.email,
      adminName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('adminName')
    })
    .from(adminLogs)
    .leftJoin(users, eq(adminLogs.adminId, users.id))
    .orderBy(desc(adminLogs.createdAt))
    .limit(100); // 최근 100개 로그만

    res.json(logs);
  } catch (error) {
    console.error('관리자 로그 조회 오류:', error);
    res.status(500).json({ error: '관리자 로그를 불러오는데 실패했습니다.' });
  }
}

// 사용자 계정 비활성화/활성화
export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: '관리자 로그인이 필요합니다.' });
    }

    const [updatedUser] = await db.update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 관리자 로그 기록
    await db.insert(adminLogs).values({
      adminId,
      action: isActive ? 'user_activate' : 'user_deactivate',
      targetUserId: userId,
      targetType: 'user',
      targetId: userId,
      details: { isActive },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json(updatedUser);

  } catch (error) {
    console.error('사용자 상태 변경 오류:', error);
    res.status(500).json({ error: '사용자 상태 변경에 실패했습니다.' });
  }
}