import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'
import Script from 'next/script'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

export const metadata: Metadata = {
    title: 'Box Grid Generator - timoweiss.me',
    description: 'Generate custom box grid designs for 3D printing',
    openGraph: {
        title: 'Box Grid Generator - timoweiss.me',
        description: 'Generate custom box grid designs for 3D printing',
        url: 'https://box-grid.timoweiss.me',
        type: 'website',
        images: [
            {
                url: 'https://box-grid.timoweiss.me/og-image.jpg',
                width: 1200,
                height: 600,
                alt: 'Box Grid Generator - timoweiss.me',
            },
        ],
    },
    twitter: {
        title: 'Box Grid Generator - timoweiss.me',
        description: 'Generate custom box grid designs for 3D printing',
        images: ['https://box-grid.timoweiss.me/og-image.jpg'],
        card: 'summary_large_image',
        creator: '@timooweiss',
    },
    icons: '/icon.png',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="h-full">
            <body
                className={`${geistSans.variable} ${geistMono.variable} flex h-full flex-col overflow-hidden antialiased`}
            >
                <Header />
                <main className="flex-grow overflow-hidden">{children}</main>
                <Footer />
                <Toaster />
            </body>
            <Script
                defer
                data-domain="box-grid.timoweiss.me"
                src="https://plausible.io/js/script.js"
            ></Script>
        </html>
    )
}
