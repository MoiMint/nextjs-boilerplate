import type { ReactNode } from "react";

type GardenTabProps = { children: ReactNode };

export function GardenTab({ children }: GardenTabProps) {
  return <>{children}</>;
}
