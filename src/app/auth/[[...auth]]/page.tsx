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
    return <TaskChooseOrganization redirectUrlComplete="/board" />;
  }
  if (path.includes("reset-password")) {
    return <TaskResetPassword redirectUrlComplete="/board" />;
  }
  if (path.includes("setup-mfa")) {
    return <TaskSetupMFA redirectUrlComplete="/board" />;
  }
  if (path.includes("sign-up") || path.includes("setup-account")) {
    return <SignUp fallbackRedirectUrl="/board" signInUrl="/sign-in" />;
  }

  return <SignIn fallbackRedirectUrl="/board" signUpUrl="/sign-up" />;
}
