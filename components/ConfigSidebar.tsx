'use client'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GeneralSettings from '@/components/ConfigSidebar/GeneralSettings'
import ModelSettings from '@/components/ConfigSidebar/ModelSettings'

export default function ConfigSidebar() {
    return (
        <div className="p-4">
            <Tabs defaultValue="modelSettings" className="mb-20">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="modelSettings">
                        Model Settings
                    </TabsTrigger>
                    <TabsTrigger value="generalSettings">
                        General Settings
                    </TabsTrigger>
                </TabsList>

                <ModelSettings />

                <GeneralSettings />
            </Tabs>
        </div>
    )
}
