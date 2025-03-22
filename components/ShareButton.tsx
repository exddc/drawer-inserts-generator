import { Button } from '@/components/ui/button'
import { useBoxStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function ShareButton() {
    const [copied, setCopied] = useState(false)
    const [isSharing, setIsSharing] = useState(false)
    const shareConfiguration = useBoxStore((state) => state.shareConfiguration)

    const handleShare = async () => {
        setIsSharing(true)
        try {
            const success = await shareConfiguration()

            if (success) {
                setCopied(true)
                setTimeout(() => setCopied(false), 3000)

                toast.success('Configuration link copied to clipboard', {
                    description: 'Share this URL to let others see your design',
                    duration: 3000,
                })
            } else {
                toast.error('Failed to copy link', {
                    description: 'Please try again',
                })
            }
        } catch (error) {
            toast.error('Error sharing configuration', {
                description: 'An unexpected error occurred',
            })
        } finally {
            setIsSharing(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className={cn(
                'flex w-full items-center gap-2',
                copied &&
                    'bg-green-600 text-white transition-all duration-300 hover:bg-green-600 hover:text-white'
            )}
            onClick={handleShare}
            disabled={isSharing}
        >
            <Share2 className="h-4 w-4" />
            {copied ? 'Link Copied!' : 'Share Configuration'}
        </Button>
    )
}
