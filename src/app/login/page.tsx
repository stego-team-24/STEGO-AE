import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata: Metadata = { title: "Secure Access" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/maps");
  return <Suspense><LoginForm /></Suspense>;
}
