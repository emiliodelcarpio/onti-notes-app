import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import ThemeProvider from "@/components/ui/ThemeProvider";
import { cookies } from "next/headers";
import { getAccountData } from "@/lib/account";
import { isThemePreference } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "onti",
  description: "Tus notas y recordatorios personales",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const account = await getAccountData();
  const cookieTheme = (await cookies()).get("onti-theme")?.value;
  const preference = account?.profile?.theme_preference ?? (isThemePreference(cookieTheme) ? cookieTheme : "system");
  return (
    <html
      lang="es"
      data-theme={preference}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><ThemeProvider initialPreference={preference}><ToastProvider>{children}</ToastProvider></ThemeProvider></body>
    </html>
  );
}
