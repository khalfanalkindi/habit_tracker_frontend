import type { Metadata, Viewport } from 'next'
import { Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AppToaster } from '@/components/app-toaster'
import { AuthProvider } from '@/contexts/auth-context'
import { ProfileProvider } from '@/contexts/profile-context'
import { HabitsProvider } from '@/contexts/habits-context'
import './globals.css'

const tajawal = Tajawal({ 
  subsets: ["arabic", "latin"],
  weight: ["500", "700", "800"],
  variable: "--font-tajawal"
});

export const metadata: Metadata = {
  title: 'متتبع العادات',
  description: 'ابني عادات أفضل، يوماً بعد يوم',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Habit Tracker',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f5' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={tajawal.className}>
      <body className="antialiased bg-background font-bold">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ProfileProvider>
              <HabitsProvider>
                {children}
              </HabitsProvider>
            </ProfileProvider>
          </AuthProvider>
          <AppToaster />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
