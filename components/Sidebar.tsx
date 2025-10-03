'use client'
import GeneralSettings from '@/components/ConfigSidebar/GeneralSettings'
import ModelSettings from '@/components/ConfigSidebar/ModelSettings'
import ExportButton from '@/components/ExportButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { version } from '../package.json'

export default function Sidebar() {
    return (
        <div
            id="sidebar-container"
            className="bg-white flex h-1/2 lg:h-full flex-col lg:min-w-[400px] p-3 lg:p-6 gap-3 lg:gap-6"
        >
            <div id="sidebar-header" className="flex flex-col gap-0">
                <h1 className="text-3xl font-medium -mb-1">
                    Box Grid Generator
                </h1>
                <div className="flex ml-0.5 text-sm text-[#686868] gap-3">
                    <p>Version {version}</p>-
                    <a href="https://timoweiss.me" className="hover:underline">
                        timoweiss.me
                    </a>
                </div>
            </div>

            <Tabs
                defaultValue="modelSettings"
                className="flex flex-col flex-1 min-h-0"
            >
                <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="modelSettings">Model</TabsTrigger>
                    <TabsTrigger value="generalSettings">General</TabsTrigger>
                </TabsList>

                <TabsContent
                    value="modelSettings"
                    className="space-y-12 flex-1 overflow-y-auto custom-scrollbar pr-4"
                >
                    <ModelSettings />
                </TabsContent>
                <TabsContent
                    value="generalSettings"
                    className="space-y-12 flex-1 overflow-y-auto custom-scrollbar pr-4"
                >
                    <GeneralSettings />
                </TabsContent>
            </Tabs>

            <ExportButton />
        </div>
    )
}
