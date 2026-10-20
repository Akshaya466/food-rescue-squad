import { User } from "@/types";

interface CollectorAccessPendingNoticeProps {
  user: Pick<User, "role" | "requestedRole"> | null;
}

export function CollectorAccessPendingNotice({
  user,
}: CollectorAccessPendingNoticeProps) {
  if (user?.role !== "donor" || user.requestedRole !== "collector") {
    return null;
  }

  return null;
}
