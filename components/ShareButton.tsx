// components/ShareButton.tsx
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useBoxStore } from '@/lib/store';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ShareButton() {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const shareConfiguration = useBoxStore((state) => state.shareConfiguration);

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const success = await shareConfiguration();

            if (success) {
                setCopied(true);
                // Visual feedback in button for 1 second
                setTimeout(() => setCopied(false), 3000);

                // Show toast notification
                toast.success('Configuration link copied to clipboard', {
                    description: 'Share this URL to let others see your design',
                    duration: 3000,
                });
            } else {
                // Show failure toast
                toast.error('Failed to copy link', {
                    description: 'Please try again',
                });
            }
        } catch (error) {
            // Show error toast
            toast.error('Error sharing configuration', {
                description: 'An unexpected error occurred',
            });
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            className={cn(
                'flex items-center gap-2 w-full mt-2',
                copied &&
                    'bg-green-600 text-white hover:bg-green-600 hover:text-white transition-all duration-300'
            )}
            onClick={handleShare}
            disabled={isSharing}
        >
            <Share2 className="w-4 h-4" />
            {copied ? 'Link Copied!' : 'Share Configuration'}
        </Button>
    );
}
