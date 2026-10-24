import type { ReactNode } from "react";
import AssistantLauncher from "./assistant-launcher";
import WorkspaceShell from "./workspace-shell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}<AssistantLauncher /></WorkspaceShell>;
}
