import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import Link from "next/link";
import { Boxes, Store } from "lucide-react";
import "./globals.css";

const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WeihuanTAWA — Equipment Archive",
  description: "Company equipment catalog & store buildout configurator",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${quicksand.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-30 border-b border-brand-100 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-1 px-4 sm:px-6">
            <Link href="/" className="mr-4 flex items-center gap-2 font-bold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-rose-500 text-white shadow-sm shadow-brand-200">
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
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-600 transition hover:bg-brand-50 hover:text-brand-700"
    >
      {icon}
      {children}
    </Link>
  );
}
