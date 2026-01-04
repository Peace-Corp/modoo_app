import type { Metadata } from "next";
import "./globals.css";
import Footer from "./components/Footer";
import NavigationListener from "./components/NavigationListener";

export const metadata: Metadata = {
  title: "모두 | Modoo",
  description: "An App for creating your own customized products",
};

// For Capacitor builds: Don't require all dynamic routes to be pre-generated
// Dynamic routes will be handled client-side at runtime
export const dynamicParams = false;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <NavigationListener />
        <div className="w-full lg:max-w-7xl lg:mx-auto">
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
