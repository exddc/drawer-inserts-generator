// components/ShareToast.tsx
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShareToastProps {
    show: boolean;
    success: boolean;
    onClose: () => void;
}

export default function ShareToast({
    show,
    success,
    onClose,
}: ShareToastProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            // Auto-hide after 3 seconds
            const timer = setTimeout(() => {
                setIsVisible(false);
                onClose();
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-lg transition-opacity duration-300 flex items-center gap-2 z-50',
                isVisible ? 'opacity-100' : 'opacity-0',
                success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            )}
        >
            {success ? (
                <>
                    <Check className="w-5 h-5" />
                    <span>Configuration link copied to clipboard!</span>
                </>
            ) : (
                <>
                    <X className="w-5 h-5" />
                    <span>Failed to copy link. Please try again.</span>
                </>
            )}
            <button
                onClick={() => {
                    setIsVisible(false);
                    onClose();
                }}
                className="ml-2 text-white/80 hover:text-white"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
