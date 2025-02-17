import { ReactNode } from "react";
import Navbar from "./_components/Navbar";
import Footer from "./_components/Footer";
import Script from "next/script";

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col">


      <Script type="text/javascript" id="hs-script-loader" async defer src="//js-na1.hs-scripts.com/49235722.js"></Script>

      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
