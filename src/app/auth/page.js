import AuthShell from "@/components/auth/AuthShell";

export const metadata = {
  title: "تسجيل الدخول والحساب",
  robots: { index: false, follow: false },
  alternates: { canonical: "/auth" },
};

export default async function AuthPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const mode = String(resolvedSearchParams?.mode || "signin");

  return <AuthShell initialMode={mode} />;
}


