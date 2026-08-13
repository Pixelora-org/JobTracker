import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp fallbackRedirectUrl="/board" signInUrl="/sign-in" />
  );
}
