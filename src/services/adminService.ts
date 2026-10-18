import { throwSparkUnavailable } from "@/services/sparkUnavailable";

export async function approveRoleRequest(_userId: string): Promise<void> {
  return throwSparkUnavailable("Approving role requests");
}

export async function setUserVerification(
  _userId: string,
  _isVerified: boolean
): Promise<void> {
  return throwSparkUnavailable("Changing user verification");
}
