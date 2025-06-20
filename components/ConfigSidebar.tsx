'use client'
import GeneralSettings from '@/components/ConfigSidebar/GeneralSettings'
import ModelSettings from '@/components/ConfigSidebar/ModelSettings'
import ExportButton from '@/components/ExportButton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ConfigSidebar() {
    return (
        <ScrollArea className="px-4 h-full">
            <div className="h-full pb-8 pt-2">
                <Tabs defaultValue="modelSettings" className="mb-20">
                    <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger value="modelSettings">Model</TabsTrigger>
                        <TabsTrigger value="generalSettings">
                            General
                        </TabsTrigger>
                    </TabsList>

                    <ModelSettings />
                    <GeneralSettings />
                </Tabs>

                <ExportButton />
            </div>
        </ScrollArea>
    )
}
