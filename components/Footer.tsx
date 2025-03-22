export default function Footer() {
    return (
        <footer className="text-muted-foreground border-t p-2 text-center text-sm">
            Built by{' '}
            <a
                href="https://timoweiss.me"
                target="_blank"
                className="text-blue-900 underline-offset-4 transition-all duration-200 hover:underline hover:underline-offset-2"
            >
                Timo
            </a>{' '}
            with{' '}
            <a
                href="https://threejs.org/"
                target="_blank"
                className="text-blue-900 underline-offset-4 transition-all duration-200 hover:underline hover:underline-offset-2"
            >
                Three.js
            </a>{' '}
            and{' '}
            <a
                href="https://nextjs.org/"
                target="_blank"
                className="text-blue-900 underline-offset-4 transition-all duration-200 hover:underline hover:underline-offset-2"
            >
                Next.js
            </a>
            . Also visit{' '}
            <a
                href="https://gotdoneapp.com/"
                target="_blank"
                className="text-blue-900 underline-offset-4 transition-all duration-200 hover:underline hover:underline-offset-2"
            >
                Got Done
            </a>
        </footer>
    )
}
