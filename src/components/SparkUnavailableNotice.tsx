import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export function SparkUnavailableNotice({ operation }: { operation: string }) {
  return (
    <Alert>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{operation} unavailable in Spark mode</AlertTitle>
      <AlertDescription>
        This action requires a trusted Cloud Functions backend. It is disabled
        here; no client-side write will be attempted.
      </AlertDescription>
    </Alert>
  );
}
