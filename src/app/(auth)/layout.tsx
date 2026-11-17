import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
}
