import React, { useState } from 'react';
import { 
  Database, Activity, BarChart, Bot, Search, Bell, CheckCircle, 
  AlertCircle, Terminal, LayoutDashboard, Wrench, AlertTriangle, 
  List, PieChart, FileText, ChevronRight, Command, Zap
} from 'lucide-react';

export function Dashboard() {
  const [activeItem, setActiveItem] = useState('overview');

  const navItems = {
    DATA: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'datasets', label: 'Datasets', icon: Database },
      { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
      { id: 'wizard', label: 'Clean Wizard', icon: Wrench },
      { id: 'columns', label: 'Columns', icon: List },
      { id: 'transform', label: 'Transform', icon: Activity },
    ],
    ANALYSIS: [
      { id: 'hypothesis', label: 'Hypothesis', icon: Activity },
      { id: 'balancer', label: 'Balancer', icon: Zap },
    ],
    VISUAL: [
      { id: 'charts', label: 'Charts', icon: PieChart },
      { id: 'reports', label: 'Reports', icon: FileText },
    ],
    AI: [
      { id: 'assistant', label: 'Assistant', icon: Bot },
    ]
  };

  return (
    <div style={{ background: '#1E293B' }} className="flex h-screen font-['Inter'] overflow-hidden text-slate-300">
      {/* LEFT SIDEBAR */}
      <aside className="w-[220px] bg-[#0F172A] border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="h-12 flex items-center px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 font-bold text-white tracking-wider">
            <span>RENVO</span>
            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
              AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-none">
          {Object.entries(navItems).map(([section, items]) => (
            <div key={section} className="px-3">
              <h3 className="px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 font-mono">
                {section}
              </h3>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItem(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group ${
                      activeItem === item.id
                        ? "bg-slate-800/50 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                    }`}
                  >
                    {activeItem === item.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />
                    )}
                    <item.icon size={16} className={activeItem === item.id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center relative">
            <span className="text-xs text-white font-medium">SC</span>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0F172A] rounded-full"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="text-sm text-white font-medium truncate">
              Sarah Chen
            </div>
            <div className="text-xs text-slate-500 truncate">Data Scientist</div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP BAR */}
        <header className="h-[48px] bg-[#0F172A] border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center text-sm text-slate-500 font-mono">
            <span>workspace</span>
            <span className="mx-2">/</span>
            <span className="text-slate-300">overview</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1E293B] hover:bg-slate-800 border border-slate-700 rounded-md text-sm text-slate-400 transition-colors">
              <Search size={14} />
              <span>Search...</span>
              <div className="flex items-center gap-1 ml-4">
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">
                  ⌘
                </kbd>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">
                  K
                </kbd>
              </div>
            </button>
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            </button>
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center cursor-pointer border border-slate-600">
              <span className="text-[10px] text-white font-medium">SC</span>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white tracking-tight">
                Overview
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Last updated 2 min ago
              </p>
            </div>
          </div>

          {/* METRIC STRIP */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Datasets"
              value="24"
              valueColor="text-blue-400"
              icon={<Database size={16} className="text-blue-400" />}
            />
            <MetricCard
              title="Quality"
              value="87.4%"
              valueColor="text-green-400"
              icon={<CheckCircle size={16} className="text-green-400" />}
            />
            <MetricCard
              title="Operations"
              value="1,429"
              valueColor="text-purple-400"
              icon={<Activity size={16} className="text-purple-400" />}
            />
            <MetricCard
              title="Anomalies"
              value="12"
              valueColor="text-orange-400"
              icon={<AlertCircle size={16} className="text-orange-400" />}
            />
          </div>

          {/* TWO COLUMN LAYOUT */}
          <div className="grid grid-cols-3 gap-6">
            {/* LEFT: Dataset Health */}
            <div className="col-span-2 space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Dataset Health
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <DatasetCard
                  name="survey_data_2024.csv"
                  quality={94}
                  status="Clean"
                  statusColor="text-green-400 border-green-400/20"
                />
                <DatasetCard
                  name="census_microdata.xlsx"
                  quality={72}
                  status="Needs Review"
                  statusColor="text-orange-400 border-orange-400/20"
                />
                <DatasetCard
                  name="health_survey_q3.csv"
                  quality={89}
                  status="Clean"
                  statusColor="text-green-400 border-green-400/20"
                />
                <DatasetCard
                  name="labor_force_2024.xlsx"
                  quality={61}
                  status="Processing"
                  statusColor="text-blue-400 border-blue-400/20"
                />
              </div>
            </div>

            {/* RIGHT: Activity Log */}
            <div className="space-y-4 flex flex-col">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Activity Log
              </h2>
              <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-4 font-mono text-[11px] space-y-3 flex-1">
                <LogEntry time="14:23" msg="Cleaned survey_data_2024.csv — 234 outliers removed" />
                <LogEntry time="13:45" msg="AI scan census_microdata.xlsx — 847 anomalies detected" />
                <LogEntry time="11:02" msg="Report generated — data_quality_june.pdf" />
                <LogEntry time="09:14" msg="Uploaded labor_force_2024.xlsx — parsing schema..." />
                <div className="pt-2 flex items-center text-slate-500">
                  <Terminal size={12} className="mr-2" />
                  <span className="animate-pulse">_</span>
                </div>
              </div>

              <div className="pt-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono mb-3">
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <ActionButton icon={<Database size={14} />} label="New Dataset" shortcut="N" />
                  <ActionButton icon={<Bot size={14} />} label="Ask AI" shortcut="A" />
                  <ActionButton icon={<FileText size={14} />} label="Generate Report" shortcut="R" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, valueColor }: { title: string; value: string; icon: React.ReactNode; valueColor: string }) {
  return (
    <div className="bg-[#334155] border border-[#475569] rounded-lg p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        {icon}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
    </div>
  );
}

function DatasetCard({
  name,
  quality,
  status,
  statusColor,
}: {
  name: string;
  quality: number;
  status: string;
  statusColor: string;
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText size={16} className="text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate font-mono" title={name}>
            {name}
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-opacity-10 whitespace-nowrap ${statusColor}`}>
          {status}
        </span>
      </div>
      
      <div className="space-y-1.5 mt-auto">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Quality Score</span>
          <span className="text-white font-mono">{quality}%</span>
        </div>
        <div className="h-1.5 w-full bg-[#0F172A] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              quality > 85 ? "bg-green-500" : quality > 65 ? "bg-orange-500" : "bg-red-500"
            }`}
            style={{ width: `${quality}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function LogEntry({ time, msg }: { time: string; msg: string }) {
  return (
    <div className="flex items-start gap-3 text-slate-400 group cursor-default">
      <span className="text-slate-500 shrink-0">{time}</span>
      <span className="text-slate-600 shrink-0">→</span>
      <span className="group-hover:text-slate-300 transition-colors">{msg}</span>
    </div>
  );
}

function ActionButton({ icon, label, shortcut }: { icon: React.ReactNode; label: string; shortcut: string }) {
  return (
    <button className="w-full flex items-center justify-between px-3 py-2 bg-[#334155] hover:bg-slate-700 border border-[#475569] rounded-md transition-colors group">
      <div className="flex items-center gap-3 text-slate-300 group-hover:text-white">
        <span className="text-slate-500 group-hover:text-slate-400">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <kbd className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400 bg-[#1E293B] px-1.5 py-0.5 rounded">
        {shortcut}
      </kbd>
    </button>
  );
}
