import { ReactNode } from "react";


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
        Admin Layout
      <main className="flex-1">{children}</main>

    </div>
  );
}
