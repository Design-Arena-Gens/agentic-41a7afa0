import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "CineForge - Product Video Automation",
  description: "Generate cinematic product videos from images and copy.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="container max-w-6xl py-8">
          <header className="flex items-center gap-3 mb-8">
            <div className="size-9 rounded-lg bg-brand-600 grid place-items-center">
              <span className="text-white font-bold">CF</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">CineForge</h1>
              <p className="text-xs text-white/60 -mt-0.5">Professional product video automation</p>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
