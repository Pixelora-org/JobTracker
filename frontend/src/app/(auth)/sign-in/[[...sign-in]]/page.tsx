import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn fallbackRedirectUrl="/today" signUpUrl="/sign-up" />
  );
}
