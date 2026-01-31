import { logoutAction } from "@/auth/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PrivatePage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Private Page</h1>

        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Log out
          </Button>
        </form>
        <Button variant="link" >
          <Link href="/private/profile">Go to Profile Page</Link>
        </Button>
      </div>
    </div>
  );
}
