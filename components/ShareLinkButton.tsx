'use client'

import { Button } from '@/components/ui/button'
import { copyShareLink } from '@/hooks/useLayoutPersistence'
import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ShareLinkButton() {
    const [busy, setBusy] = useState(false)

    const handleCopyShareLink = async () => {
        if (busy) return
        setBusy(true)

        try {
            const result = await copyShareLink()

            if (result.status === 'too-large') {
                toast.error('Layout is too large to share via URL')
                return
            }

            if (result.status === 'clipboard-unavailable') {
                toast.error('Clipboard is not available in this browser')
                return
            }

            if (result.status === 'clipboard-failed') {
                toast.error('Could not copy share link to clipboard')
                return
            }

            toast.success('Share link copied to clipboard')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleCopyShareLink}
            disabled={busy}
        >
            <Link2 className="h-4 w-4" />
            Share
        </Button>
    )
}
