import { AuthShell } from "@/components/auth-shell";

export default function ClerkAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthShell>{children}</AuthShell>;
}
