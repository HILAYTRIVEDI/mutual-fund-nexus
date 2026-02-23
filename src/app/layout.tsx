import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ClientProvider } from "@/context/ClientContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { HoldingsProvider } from "@/context/HoldingsContext";
import { TransactionsProvider } from "@/context/TransactionsContext";
import { SIPProvider } from "@/context/SIPContext";
import { NotificationProvider } from "@/context/NotificationContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RuaCapital - Investment Dashboard",
  description: "Premium mutual fund portfolio management dashboard",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <SettingsProvider>
            <AuthProvider>
              <ClientProvider>
                <HoldingsProvider>
                  <TransactionsProvider>
                    <SIPProvider>
                      <NotificationProvider>
                        {children}
                      </NotificationProvider>
                    </SIPProvider>
                  </TransactionsProvider>
                </HoldingsProvider>
              </ClientProvider>
            </AuthProvider>
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

