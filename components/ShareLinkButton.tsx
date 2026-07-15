'use client'

import { Button } from '@/components/ui/button'
import { copyShareLink } from '@/hooks/useLayoutPersistence'
import { Link2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ShareLinkButton() {
    const handleCopyShareLink = () => {
        const result = copyShareLink()

        if (result.tooLarge) {
            toast.error('Layout is too large to share via URL')
            return
        }

        toast.success('Share link copied to clipboard')
    }

    return (
        <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleCopyShareLink}
        >
            <Link2 className="h-4 w-4" />
            Share
        </Button>
    )
}
