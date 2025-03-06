import React from 'react';

export default function Footer() {
    return (
        <footer className="border-t p-2 text-center text-muted-foreground text-sm">
            Built by{' '}
            <a
                href="https://timoweiss.me"
                target="_blank"
                className="text-blue-900 underline-offset-4 hover:underline-offset-2 hover:underline transition-all duration-200"
            >
                Timo
            </a>{' '}
            with{' '}
            <a
                href="https://threejs.org/"
                target="_blank"
                className="text-blue-900 underline-offset-4 hover:underline-offset-2 hover:underline transition-all duration-200"
            >
                Three.js
            </a>{' '}
            and{' '}
            <a
                href="https://nextjs.org/"
                target="_blank"
                className="text-blue-900 underline-offset-4 hover:underline-offset-2 hover:underline transition-all duration-200"
            >
                Next.js
            </a>
            . Also visit{' '}
            <a
                href="https://gotdoneapp.com/"
                target="_blank"
                className="text-blue-900 underline-offset-4 hover:underline-offset-2 hover:underline transition-all duration-200"
            >
                Got Done
            </a>
        </footer>
    );
}
