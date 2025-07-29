'use client'
import GeneralSettings from '@/components/ConfigSidebar/GeneralSettings'
import ModelSettings from '@/components/ConfigSidebar/ModelSettings'
import ExportButton from '@/components/ExportButton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { version } from '../package.json'

export default function Sidebar() {
    return (
        <div
            id="sidebar-container"
            className="bg-white flex h-1/2 lg:h-full flex-col lg:min-w-[400px] p-3 lg:p-6 gap-3 lg:gap-6"
        >
            {/* Fixed header */}
            <div id="sidebar-header" className="flex flex-col gap-0">
                <h1 className="text-3xl font-medium -mb-1">
                    Box Grid Generator
                </h1>
                <p className="text-sm text-[#686868] ml-0.5">
                    Version {version}
                </p>
            </div>

            {/* Tabs with fixed tab list and scrollable content */}
            <Tabs
                defaultValue="modelSettings"
                className="flex flex-col flex-1 min-h-0"
            >
                {/* Fixed tab list */}
                <div className="">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="modelSettings">Model</TabsTrigger>
                        <TabsTrigger value="generalSettings">
                            General
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <ModelSettings />
                    <GeneralSettings />
                </div>
            </Tabs>

            {/* Fixed export button */}
            <div className="">
                <ExportButton />
            </div>
        </div>
    )
}
