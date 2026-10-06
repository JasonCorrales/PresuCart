import type { Metadata, Viewport } from "next";
import { PwaLifecycle } from "@/components/PwaLifecycle";
import "./globals.css";

export const metadata: Metadata = {
  title: "PresuCart",
  description: "Control de presupuesto para compras de supermercado en colones.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CR">
      <body>
        <PwaLifecycle />
        {children}
      </body>
    </html>
  );
}
