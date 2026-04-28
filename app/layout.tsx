import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "ReelMind — Turn Saved Reels Into Ideas",
  description:
    "Your personal AI-powered workspace to track, organise, and ideate from saved Instagram reels.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#16161d",
              color: "#e8e8f0",
              border: "1px solid #2a2a38",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#c044ef", secondary: "#0f0f13" },
            },
          }}
        />
      </body>
    </html>
  );
}
