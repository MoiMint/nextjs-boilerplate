import type { ReactNode } from "react";

type DashboardTabProps = { children: ReactNode };

export function DashboardTab({ children }: DashboardTabProps) {
  return <>{children}</>;
}
