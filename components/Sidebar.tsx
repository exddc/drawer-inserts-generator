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
            className="bg-white flex h-full flex-col p-6 gap-6 min-w-[400px] overflow-y-hidden"
        >
            <div id="sidebar-header" className="flex flex-col gap-0">
                <h1 className="text-3xl font-medium -mb-1">
                    Box Grid Generator
                </h1>
                <p className="text-sm text-[#686868] ml-0.5">
                    Version {version}
                </p>
            </div>
            <Tabs defaultValue="modelSettings" className="">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="modelSettings">Model</TabsTrigger>
                    <TabsTrigger value="generalSettings">General</TabsTrigger>
                </TabsList>

                <ModelSettings />
                <GeneralSettings />
            </Tabs>

            <ExportButton />
        </div>
    )
}
