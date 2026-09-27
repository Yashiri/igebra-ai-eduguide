import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduGuide — Multimodal RAG Chatbot",
  description: "A production-style multimodal RAG chatbot built for the igebra.ai AI Intern assignment.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
