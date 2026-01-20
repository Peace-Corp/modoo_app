import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import NavigationListener from "./components/NavigationListener";
import AuthInitializer from "./components/AuthInitializer";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "모두의 유니폼 | 단체복 의류 주문 제작",
  description: "의류 주문 제작, 뮤료 견적, 대랸 주문, 단체복 제작",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <Analytics />
        <AuthInitializer />
        <NavigationListener />
        <div className="w-full lg:max-w-7xl lg:mx-auto">
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
