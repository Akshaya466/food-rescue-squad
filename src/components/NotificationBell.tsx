import { useState } from "react";
import { Notification } from "@/types";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const mockNotifications: Notification[] = [
  { id: "n1", userId: "u1", type: "claim", title: "New Claim!", message: "Helping Hands NGO claimed your Vegetable Biryani listing.", isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: "n2", userId: "u1", type: "pickup_reminder", title: "Pickup Reminder", message: "Idli & Sambar pickup window closes in 30 minutes.", isRead: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "n3", userId: "u1", type: "rating", title: "New Rating", message: "You received a 5-star rating from Ravi Kumar.", isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "n4", userId: "u1", type: "delivery_assigned", title: "Delivery Assigned", message: "A volunteer has been assigned to pick up Dal Tadka & Rice.", isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export function NotificationBell() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const unread = notifications.filter((n) => !n.isRead).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-semibold">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary">
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.map((n) => (
            <div key={n.id} className={`p-4 border-b last:border-0 ${!n.isRead ? "bg-accent/50" : ""}`}>
              <div className="flex items-start gap-2">
                {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
