
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
          className="w-full h-auto flex flex-wrap gap-2 p-1 rounded-lg border shadow-sm"
        >
          {tabOptions.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-sm`}
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
