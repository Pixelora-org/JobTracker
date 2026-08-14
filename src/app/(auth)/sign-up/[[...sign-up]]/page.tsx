import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted">
        After Google or email, pick a username. Friends add you with that
        handle, not your email.
      </p>
      <SignUp fallbackRedirectUrl="/board" signInUrl="/sign-in" />
    </div>
  );
}
