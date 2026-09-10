"use client";

import {
  SignIn,
  SignUp,
  TaskChooseOrganization,
  TaskResetPassword,
  TaskSetupMFA,
} from "@clerk/nextjs";
import { usePathname } from "next/navigation";

/**
 * Clerk Account Portal and session tasks land under /auth/*.
 * Host them here so signup does not 404 after email verification.
 */
export default function ClerkAuthCatchAll() {
  const path = usePathname();

  if (path.includes("choose-organization")) {
    return <TaskChooseOrganization redirectUrlComplete="/today" />;
  }
  if (path.includes("reset-password")) {
    return <TaskResetPassword redirectUrlComplete="/today" />;
  }
  if (path.includes("setup-mfa")) {
    return <TaskSetupMFA redirectUrlComplete="/today" />;
  }
  if (path.includes("sign-up") || path.includes("setup-account")) {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-muted">
          After Google or email, pick a username. Friends add you with that
          handle, not your email.
        </p>
        <SignUp fallbackRedirectUrl="/today" signInUrl="/sign-in" />
      </div>
    );
  }

  return <SignIn fallbackRedirectUrl="/today" signUpUrl="/sign-up" />;
}
