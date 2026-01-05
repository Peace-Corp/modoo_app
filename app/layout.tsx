import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import NavigationListener from "./components/NavigationListener";
import AuthInitializer from "./components/AuthInitializer";

export const metadata: Metadata = {
  title: "모두 | Modoo",
  description: "An App for creating your own customized products",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
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
