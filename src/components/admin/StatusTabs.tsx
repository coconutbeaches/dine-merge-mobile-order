
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabOption {
  label: string;
  value: string;
}

interface StatusTabsProps {
  activeStatus: string;
  onTabChange: (tabValue: string) => void;
  tabOptions: TabOption[];
}

const StatusTabs = ({ activeStatus, onTabChange, tabOptions }: StatusTabsProps) => {
  return (
    <div className="mb-4">
      <Tabs value={activeStatus} onValueChange={onTabChange}>
        <TabsList
          className="w-full flex flex-wrap gap-1 bg-muted p-2 rounded-md border"
        >
          {tabOptions.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`whitespace-nowrap rounded-sm px-2 py-1 text-xs font-semibold capitalize transition-colors focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default StatusTabs;
