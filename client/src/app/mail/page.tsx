"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MailPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to /mail/u/0 (default tab: Emails)
    router.replace("/mail/u/0");
  }, [router]);

  // Return nothing or a loading state while redirecting
  return null;
}
