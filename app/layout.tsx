import '@/app/globals.css'
import Sidebar from '@/components/Sidebar'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'

const PPMontreal = localFont({
    variable: '--font-ppmontreal',
    src: [
        {
            path: './fonts/PPNeueMontreal-Thin.otf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-ThinItalic.otf',
            weight: '100',
            style: 'italic',
        },
        {
            path: './fonts/PPNeueMontreal-Light.otf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-Regular.otf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-Italic.otf',
            weight: '400',
            style: 'italic',
        },
        {
            path: './fonts/PPNeueMontreal-Book.otf',
            weight: '450',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-Medium.otf',
            weight: '500',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-Bold.otf',
            weight: '700',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontreal-BoldItalic.otf',
            weight: '700',
            style: 'italic',
        },
    ],
    display: 'swap',
})

const PPMontrealMono = localFont({
    variable: '--font-ppmontreal-mono',
    src: [
        {
            path: './fonts/PPNeueMontrealMono-Thin.otf',
            weight: '100',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-ThinItalic.otf',
            weight: '100',
            style: 'italic',
        },
        {
            path: './fonts/PPNeueMontrealMono-Light.otf',
            weight: '300',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-Regular.otf',
            weight: '400',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-RegularItalic.otf',
            weight: '400',
            style: 'italic',
        },
        {
            path: './fonts/PPNeueMontrealMono-Book.otf',
            weight: '450',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-Medium.otf',
            weight: '500',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-Bold.otf',
            weight: '700',
            style: 'normal',
        },
        {
            path: './fonts/PPNeueMontrealMono-BoldItalic.otf',
            weight: '700',
            style: 'italic',
        },
    ],
    display: 'swap',
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
                className={`${PPMontreal.variable} ${PPMontrealMono.variable} flex flex-col lg:flex-row h-full overflow-hidden antialiased bg-[#EDEDED] w-full p-3 lg:p-6 gap-3 lg:gap-6 tracking-tighter font-sans`}
            >
                <Sidebar />
                <main className="flex-grow overflow-hidden">{children}</main>
            </body>
            <Script
                defer
                src="https://analytics.timoweiss.me/script.js"
                data-website-id="dec9aec7-3dd6-408c-8bbf-cd4ee95859fc"
            ></Script>
        </html>
    )
}
