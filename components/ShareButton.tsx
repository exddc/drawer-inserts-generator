// components/ShareButton.tsx
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useBoxStore } from '@/lib/store';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ShareToast from './ShareToast';

export default function ShareButton() {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const shareConfiguration = useBoxStore((state) => state.shareConfiguration);

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const success = await shareConfiguration();

            if (success) {
                setCopied(true);
                setShareSuccess(true);
                // Visual feedback in button for 1 second
                setTimeout(() => setCopied(false), 1000);

                // Show toast notification
                setShowToast(true);
            } else {
                setShareSuccess(false);
                setShowToast(true);
            }
        } catch (error) {
            setShareSuccess(false);
            setShowToast(true);
        } finally {
            setIsSharing(false);
        }
    };

    const closeToast = () => {
        setShowToast(false);
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className={cn(
                    'flex items-center gap-2 w-full mt-2',
                    copied &&
                        'bg-green-500 text-white hover:bg-green-600 hover:text-white'
                )}
                onClick={handleShare}
                disabled={isSharing}
            >
                <Share2 className="w-4 h-4" />
                {copied ? 'Link Copied!' : 'Share Configuration'}
            </Button>

            <ShareToast
                show={showToast}
                success={shareSuccess}
                onClose={closeToast}
            />
        </>
    );
}
