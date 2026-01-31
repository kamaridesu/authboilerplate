import Link from "next/link";
import { SignInForm } from "@/auth/components/SignInForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";
import { COOKIE_SESSION_KEY } from "@/auth/constants";
import { getSession } from "@/auth/session-store";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      redirect("/private");
    }
  }
  
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access is managed by your administrator.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignInForm />
          <p className="text-sm text-muted-foreground">
            <Link className="underline" href="/">Back to home</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
