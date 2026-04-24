import type { Express } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { getAllUsers, updateUser, getAllPayments, getAllSubscriptions, getAdminStats, getAdminLogs, toggleUserStatus } from "../admin";
import { createPayment, confirmPayment, handlePaymentFailure, cancelSubscription, getUserSubscription } from "../payments";

export function registerAdminBillingRoutes(app: Express) {
  app.get("/api/admin/users", requireAuth, requireAdmin, getAllUsers);
  app.patch("/api/admin/users/:userId", requireAuth, requireAdmin, updateUser);
  app.post("/api/admin/users/:userId/toggle-status", requireAuth, requireAdmin, toggleUserStatus);
  app.get("/api/admin/payments", requireAuth, requireAdmin, getAllPayments);
  app.get("/api/admin/subscriptions", requireAuth, requireAdmin, getAllSubscriptions);
  app.post("/api/admin/subscriptions/:subscriptionId/cancel", requireAuth, requireAdmin, cancelSubscription);
  app.get("/api/admin/stats", requireAuth, requireAdmin, getAdminStats);
  app.get("/api/admin/logs", requireAuth, requireAdmin, getAdminLogs);

  app.post("/api/payments/create-payment", requireAuth, createPayment);
  app.post("/api/payments/confirm", requireAuth, confirmPayment);
  app.post("/api/payments/fail", requireAuth, handlePaymentFailure);
  app.get("/api/user/subscription", requireAuth, getUserSubscription);
  app.post("/api/subscriptions/:subscriptionId/cancel", requireAuth, cancelSubscription);
}
