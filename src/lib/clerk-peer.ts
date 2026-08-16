import { clerkClient } from "@clerk/nextjs/server";

export async function resolveClerkPeer(rawHandle: string, self: {
  id: string;
  email: string | null;
  username: string | null;
}) {
  const raw = rawHandle.trim().replace(/^@/, "");
  const clerk = await clerkClient();

  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    if (self.email && email === self.email.toLowerCase()) {
      return { ok: false as const, error: "That is your own email." };
    }
    const found = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const peer = found.data[0];
    if (!peer) {
      return {
        ok: false as const,
        error: "No account with that email. Ask them for their username.",
      };
    }
    return {
      ok: true as const,
      id: peer.id,
      username: peer.username,
      email: peer.primaryEmailAddress?.emailAddress ?? email,
    };
  }

  const username = raw.toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { ok: false as const, error: "Enter a username like myname." };
  }
  if (self.username && username === self.username.toLowerCase()) {
    return { ok: false as const, error: "That is your own username." };
  }
  const found = await clerk.users.getUserList({
    username: [username],
    limit: 1,
  });
  const peer = found.data[0];
  if (!peer) {
    return { ok: false as const, error: "No account with that username yet." };
  }
  return {
    ok: true as const,
    id: peer.id,
    username: peer.username ?? username,
    email: peer.primaryEmailAddress?.emailAddress ?? null,
  };
}
