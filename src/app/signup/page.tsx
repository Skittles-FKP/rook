export const runtime = "edge";

import { AuthForm } from "@/components/auth/auth-form";
import { RookMark } from "@/components/brand";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(53,216,255,0.14),transparent_24rem),radial-gradient(circle_at_80%_30%,rgba(47,140,255,0.13),transparent_26rem)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <RookMark />
        </div>
        <AuthForm mode="signup" invite={invite ?? ""} />
      </div>
    </main>
  );
}
