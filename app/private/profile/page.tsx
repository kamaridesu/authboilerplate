import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Profile Page</h1>
        <Button variant="link" >
          <Link href="/private">Go to Profile Page</Link>
        </Button>
      </div>
    </div>
  );
}
