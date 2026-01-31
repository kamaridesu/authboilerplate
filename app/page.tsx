import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="p-2">
      <Button variant="default">
        <Link href="/sign-in">Sign In</Link>
      </Button>
    </div>
  );
}
