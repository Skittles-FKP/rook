import { AuthForm } from "@/components/auth/auth-form";
import { RookMark } from "@/components/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <RookMark />
        </div>
        <AuthForm mode="login" next={params.next ?? "/feed"} />
      </div>
    </main>
  );
}
