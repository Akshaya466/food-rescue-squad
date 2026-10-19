import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

  return (
    <Alert className="border-warning/30 bg-warning/5">
      <AlertTitle>Collector access pending approval</AlertTitle>
      <AlertDescription>
        Your account is active as a donor while an administrator reviews your
        collector access request.
      </AlertDescription>
    </Alert>
  );
}
