'use client'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { handleExportMultipleSTLs, handleStlExport } from '@/lib/exportUtils'

export default function ExportButton() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button size="sm" className="w-full">
                    Export Model
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={handleStlExport}>
                    Export as STL (Single Object)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMultipleSTLs}>
                    Export as ZIP (Separate STL Files)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
