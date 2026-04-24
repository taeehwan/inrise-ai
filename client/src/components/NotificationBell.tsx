import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery<AdminMessage[]>({
    queryKey: ['/api/messages'],
    queryFn: async () => {
      const response = await fetch('/api/messages', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 60000,
    staleTime: 45000,
  });

  const unreadCount = messages.filter(m => !m.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/messages/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative text-gray-400 hover:text-white p-2"
        onClick={() => setOpen(!open)}
        aria-label="알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 z-50 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-violet-500/10">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span className="text-white font-semibold text-sm">선생님 메시지</span>
                {unreadCount > 0 && (
                  <Badge className="bg-purple-500 text-white text-xs px-2 py-0 h-5">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">새 메시지가 없습니다</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`px-4 py-3 border-b border-white/5 last:border-0 transition-colors ${
                      !msg.isRead ? 'bg-purple-500/5' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!msg.isRead && (
                            <span className="h-2 w-2 rounded-full bg-purple-400 flex-shrink-0" />
                          )}
                          <p className={`text-sm font-semibold truncate ${!msg.isRead ? 'text-white' : 'text-gray-300'}`}>
                            {msg.subject}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {msg.message}
                        </p>
                        <p className="text-xs text-gray-600 mt-1.5">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                      {!msg.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-500 hover:text-green-400 flex-shrink-0 mt-0.5"
                          onClick={() => markReadMutation.mutate(msg.id)}
                          title="읽음으로 표시"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {messages.length > 0 && unreadCount > 0 && (
              <div className="px-4 py-2 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-gray-400 hover:text-white"
                  onClick={() => {
                    messages.filter(m => !m.isRead).forEach(m => markReadMutation.mutate(m.id));
                  }}
                >
                  모두 읽음으로 표시
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
