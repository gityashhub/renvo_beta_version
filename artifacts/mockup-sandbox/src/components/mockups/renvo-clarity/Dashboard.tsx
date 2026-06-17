import React, { useState } from 'react';
import { 
  Home, 
  Database, 
  Wand2, 
  BarChart3, 
  Bot, 
  Plus, 
  Sparkles, 
  ArrowRight,
  Hexagon,
  Search
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export function Dashboard() {
  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'data', icon: Database, label: 'Database' },
    { id: 'clean', icon: Wand2, label: 'Data Cleaning' },
    { id: 'visualize', icon: BarChart3, label: 'Visualization' },
    { id: 'ai', icon: Bot, label: 'AI Assistant' },
  ];

  return (
    <div className="flex h-screen bg-white font-['Inter'] overflow-hidden text-slate-900">
      {/* LEFT RAIL */}
      <div className="w-[64px] border-r border-slate-100 flex flex-col items-center py-6 bg-white shrink-0 z-10">
        <div className="mb-8 flex items-center justify-center">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <Hexagon className="w-6 h-6 fill-blue-500 text-blue-500" />
          </div>
        </div>
        
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col gap-4 flex-1 w-full px-2 items-center">
            {navItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setActiveNav(item.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      activeNav === item.id 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    <item.icon className="w-5 h-5 stroke-[2]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="mt-auto">
          <Avatar className="w-10 h-10 border border-slate-100 shadow-sm cursor-pointer">
            <AvatarImage src="https://i.pravatar.cc/150?u=sarah" />
            <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">SA</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-[1200px] mx-auto px-10 py-12">
          
          {/* HEADER */}
          <header className="flex items-end justify-between mb-12">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">Good morning, Sarah.</h1>
              <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                3 datasets need your attention <span className="text-slate-300 px-1">&middot;</span> Last sync 2 min ago
              </p>
            </div>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20 rounded-lg px-6 h-10 font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Upload Dataset
            </Button>
          </header>

          {/* KPI ROW */}
          <div className="grid grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Datasets', value: '24' },
              { label: 'Quality Score', value: '87.4' },
              { label: 'Operations', value: '1,429' },
              { label: 'Open Issues', value: '12' },
            ].map((kpi, i) => (
              <div key={i} className="border border-slate-100 rounded-2xl p-6 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-center">
                <div className="text-3xl font-bold tracking-tight text-slate-900 mb-1">{kpi.value}</div>
                <div className="text-sm font-medium text-slate-500">{kpi.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_320px] gap-10 items-start">
            
            {/* DATASET CARDS */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Datasets</h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none w-48 transition-all placeholder:text-slate-400 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {[
                  { name: 'survey_data_2024.csv', rows: '45,230', cols: '12', score: 94, status: 'Clean', color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700', badgeColor: 'bg-emerald-100 text-emerald-800' },
                  { name: 'census_microdata.xlsx', rows: '1.2M', cols: '84', score: 72, status: 'Needs Review', color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700', badgeColor: 'bg-amber-100 text-amber-800' },
                  { name: 'health_survey_q3.csv', rows: '8,400', cols: '26', score: 89, status: 'Clean', color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700', badgeColor: 'bg-emerald-100 text-emerald-800' },
                  { name: 'labor_force_2024.xlsx', rows: '142,000', cols: '45', score: 61, status: 'Processing', color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700', badgeColor: 'bg-blue-100 text-blue-800' },
                ].map((ds, i) => (
                  <div key={i} className="group border border-slate-100 rounded-2xl p-6 transition-all hover:border-slate-200 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] bg-white cursor-pointer relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                      <div className="font-mono text-sm font-semibold text-slate-800 truncate pr-4">{ds.name}</div>
                      <Badge className={`font-mono text-xs font-medium px-2 py-0.5 shadow-none hover:bg-transparent ${ds.badgeColor} border-none`}>
                        {ds.score}%
                      </Badge>
                    </div>
                    
                    <div className="text-xs font-medium text-slate-500 mb-6">
                      {ds.rows} rows <span className="mx-1 text-slate-300">&middot;</span> {ds.cols} columns
                    </div>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${ds.color}`}></div>
                        <span className="text-xs font-medium text-slate-600">{ds.status}</span>
                      </div>
                      
                      <div className="text-xs font-medium text-blue-600 flex items-center opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                        Clean Now <ArrowRight className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI RECOMMENDATIONS */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900 tracking-tight">AI Insights</h2>
              </div>
              <div className="bg-[#EFF6FF] rounded-2xl p-6 border border-blue-100/50">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-4 h-4 fill-blue-600" />
                  </div>
                  <h3 className="font-semibold text-blue-900">Recommended Actions</h3>
                </div>
                
                <ul className="space-y-4">
                  {[
                    { text: <><span className="font-mono text-blue-800 font-semibold">census_microdata.xlsx</span> has 847 type anomalies — run Anomaly Detection.</> },
                    { text: <><span className="font-mono text-blue-800 font-semibold">labor_force_2024.xlsx</span> quality dropped 8pts — check for new null patterns.</> },
                    { text: <>2 datasets ready for report generation.</> },
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-blue-800 leading-relaxed font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5"></div>
                      <div>{item.text}</div>
                    </li>
                  ))}
                </ul>
                
                <Button variant="ghost" className="w-full mt-6 text-blue-700 hover:text-blue-800 hover:bg-blue-100/50 justify-between font-semibold h-10 px-4">
                  View all insights
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;