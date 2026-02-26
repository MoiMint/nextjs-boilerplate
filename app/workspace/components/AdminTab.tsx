import type { ReactNode } from "react";

type AdminTabProps = { children: ReactNode };

export function AdminTab({ children }: AdminTabProps) {
  return <>{children}</>;
}
