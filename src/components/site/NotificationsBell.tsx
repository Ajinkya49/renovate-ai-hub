import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listMyNotifications, markNotificationRead } from "@/lib/notifications.functions";

export function NotificationsBell() {
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => list(),
    refetchInterval: 60_000,
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 grid place-items-center rounded-md hover:bg-accent text-muted-foreground hover:text-ink transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-copper" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="px-3 py-2 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          Notifications {unread > 0 && <span className="text-ink">({unread})</span>}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            items.map((n) => {
              const content = (
                <>
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-copper shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink truncate">{n.title}</div>
                      {n.body && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </>
              );
              const onClick = async () => {
                if (!n.read_at) {
                  await markRead({ data: { id: n.id } });
                  qc.invalidateQueries({ queryKey: ["notifications"] });
                }
              };
              return n.link ? (
                <a
                  key={n.id}
                  href={n.link}
                  onClick={onClick}
                  className="block px-3 py-3 border-b border-border last:border-b-0 hover:bg-accent transition-colors"
                >
                  {content}
                </a>
              ) : (
                <button
                  key={n.id}
                  onClick={onClick}
                  className="block w-full text-left px-3 py-3 border-b border-border last:border-b-0 hover:bg-accent transition-colors"
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
