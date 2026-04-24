import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";
import type { Payment } from "@shared/schema";
import type { AdminSystemPaymentsTabProps } from "@/components/admin-system/shared";

export default function AdminSystemPaymentsTab({
  payments,
  paymentsLoading,
  users,
}: AdminSystemPaymentsTabProps) {
  return (
    <Card className="border border-white/10 shadow-xl bg-[#0D1326]/80 backdrop-blur-lg">
      <CardHeader className="border-b border-white/5">
        <CardTitle className="flex items-center gap-2 text-white">
          <CreditCard className="w-5 h-5 text-blue-400" />
          결제 내역
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {paymentsLoading ? (
          <div className="text-center py-8 text-gray-400">로딩 중...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">결제 내역이 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/5 hover:bg-transparent">
                <TableHead className="text-gray-400">사용자</TableHead>
                <TableHead className="text-gray-400">금액</TableHead>
                <TableHead className="text-gray-400">상태</TableHead>
                <TableHead className="text-gray-400">결제일</TableHead>
                <TableHead className="text-gray-400">플랜</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment: Payment) => {
                const user = users.find((u) => u.id === payment.userId);
                return (
                  <TableRow key={payment.id} className="border-b border-white/5 hover:bg-white/5">
                    <TableCell className="text-gray-300">{user ? `${user.firstName} ${user.lastName}` : "사용자 정보 없음"}</TableCell>
                    <TableCell className="text-white font-medium">₩{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === "done" ? "default" : "secondary"}
                        className={
                          payment.status === "done"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                        }
                      >
                        {payment.status === "done" ? "완료" : payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400">{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-gray-300">{payment.method || payment.subscriptionId || "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
