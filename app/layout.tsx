import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Boxes, Store } from "lucide-react";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WeihuanTAWA — Equipment Archive",
  description: "Company equipment catalog & store buildout configurator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-1 px-4 sm:px-6">
            <Link href="/" className="mr-4 flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white">
                W
              </span>
              <span className="text-[15px]">WeihuanTAWA</span>
            </Link>
            <NavLink href="/catalog" icon={<Boxes size={16} />}>
              Equipment
            </NavLink>
            <NavLink href="/stores" icon={<Store size={16} />}>
              Stores
            </NavLink>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
    >
      {icon}
      {children}
    </Link>
  );
}
