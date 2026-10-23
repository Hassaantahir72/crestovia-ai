import type { ReactNode } from "react";
import AssistantLauncher from "./assistant-launcher";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}<AssistantLauncher /></>;
}
