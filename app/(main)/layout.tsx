import { ReactNode } from "react";
import Navbar from "./_components/Navbar";
import Footer from "./_components/Footer";

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
