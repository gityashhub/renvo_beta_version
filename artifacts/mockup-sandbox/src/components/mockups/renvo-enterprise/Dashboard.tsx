import React from "react";
import { 
  Database, 
  Search, 
  Bell, 
  HelpCircle, 
  LayoutDashboard,
  Sparkles,
  Wand2,
  Columns,
  ArrowRightLeft,
  TestTube2,
  Scale,
  BarChart3,
  FileText,
  Bot,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowUp,
  FileSpreadsheet,
  Clock,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export function Dashboard() {
  return (
    <div className="flex h-screen bg-slate-50 font-['Inter'] overflow-hidden text-slate-900">
      {/* LEFT SIDEBAR */}
      <aside className="w-[240px] bg-white flex flex-col flex-shrink-0 border-r border-slate-200 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Database className="w-6 h-6 text-blue-600 mr-2 shrink-0" />
          <div>
            <h1 className="font-bold text-sm tracking-wide text-slate-900">Renvo AI</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Data Cleaning Platform</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
          <div className="space-y-1">
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium bg-blue-50 text-blue-700 border-l-4 border-blue-600 transition-colors">
              <LayoutDashboard className="w-4 h-4 mr-3 shrink-0" />
              Dashboard
            </a>
          </div>

          <div className="space-y-1">
            <div className="px-6 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Data Cleaning</div>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <Activity className="w-4 h-4 mr-3 shrink-0" />
              Anomaly Detection
            </a>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <Wand2 className="w-4 h-4 mr-3 shrink-0" />
              Cleaning Wizard
            </a>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <Columns className="w-4 h-4 mr-3 shrink-0" />
              Column Analysis
            </a>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <ArrowRightLeft className="w-4 h-4 mr-3 shrink-0" />
              Data Transformation
            </a>
          </div>

          <div className="space-y-1">
            <div className="px-6 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Data Analysis</div>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <TestTube2 className="w-4 h-4 mr-3 shrink-0" />
              Hypothesis Testing
            </a>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <Scale className="w-4 h-4 mr-3 shrink-0" />
              Data Balancer
            </a>
          </div>

          <div className="space-y-1">
            <div className="px-6 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">Visualization</div>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <BarChart3 className="w-4 h-4 mr-3 shrink-0" />
              Charts
            </a>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <FileText className="w-4 h-4 mr-3 shrink-0" />
              Reports
            </a>
          </div>

          <div className="space-y-1">
            <div className="px-6 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">AI</div>
            <a href="#" className="flex items-center px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent transition-colors">
              <Bot className="w-4 h-4 mr-3 shrink-0" />
              AI Assistant
            </a>
          </div>

        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Chen" />
              <AvatarFallback className="bg-blue-100 text-blue-700">SC</AvatarFallback>
            </Avatar>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">Sarah Chen</p>
              <p className="text-xs text-slate-500 truncate">Data Analyst</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* TOP HEADER */}
        <header className="h-[64px] bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex items-center">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" className="text-slate-500 hover:text-slate-900">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-slate-900">Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          <div className="flex-1 max-w-xl mx-8 hidden lg:block">
             <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search datasets, columns..."
                className="w-full bg-slate-50/50 border-slate-200 pl-9 h-9 text-sm focus-visible:ring-blue-600 rounded-md shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white text-[8px] font-bold text-white flex items-center justify-center">3</span>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
              <HelpCircle className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-blue-100 transition-all">
              <AvatarImage src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Chen" />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
                <p className="text-sm text-slate-500 mt-1">Welcome back, Sarah. Here's your data overview.</p>
              </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Datasets</CardTitle>
                  <div className="h-8 w-8 bg-blue-50 rounded-md flex items-center justify-center border border-blue-100">
                    <Database className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold text-slate-900">24</div>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <span className="text-blue-600 font-medium mr-1">+3</span> this week
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-medium text-slate-600">Avg Quality Score</CardTitle>
                  <div className="h-8 w-8 bg-emerald-50 rounded-md flex items-center justify-center border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold text-slate-900">87.4%</div>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <ArrowUp className="h-3 w-3 text-emerald-600 mr-0.5" />
                    <span className="text-emerald-600 font-medium mr-1">2.1%</span> from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-medium text-slate-600">Operations Run</CardTitle>
                  <div className="h-8 w-8 bg-purple-50 rounded-md flex items-center justify-center border border-purple-100">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold text-slate-900">1,429</div>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    this month
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5 px-5">
                  <CardTitle className="text-sm font-medium text-slate-600">Issues Detected</CardTitle>
                  <div className="h-8 w-8 bg-orange-50 rounded-md flex items-center justify-center border border-orange-100">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold text-slate-900">12</div>
                  <p className="text-xs text-slate-500 flex items-center mt-1">
                    <span className="text-orange-600 font-medium mr-1">needs attention</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* TWO COLUMN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* LEFT COLUMN: Recent Datasets */}
              <Card className="lg:col-span-3 shadow-sm border-slate-200 bg-white">
                <CardHeader className="border-b border-slate-100 py-4 px-6">
                  <CardTitle className="text-base font-semibold text-slate-900">Recent Datasets</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 px-6">Name</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10">Rows</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10">Quality</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10">Status</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider h-10 text-right px-6">Modified</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="border-slate-100">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-3 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 truncate">survey_data_2024.csv</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 py-4">45,230</TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-700 w-8">94%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94%' }}></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium px-2 py-0.5 shadow-none">Clean</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500 py-4 px-6">2h ago</TableCell>
                      </TableRow>
                      
                      <TableRow className="border-slate-100">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center">
                            <Database className="w-4 h-4 text-green-600 mr-3 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 truncate">census_microdata.xlsx</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 py-4">128,000</TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-700 w-8">72%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-amber-500 h-full rounded-full" style={{ width: '72%' }}></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium px-2 py-0.5 shadow-none">Needs Review</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500 py-4 px-6">1d ago</TableCell>
                      </TableRow>

                      <TableRow className="border-slate-100">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-3 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 truncate">health_survey_q3.csv</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 py-4">8,450</TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-700 w-8">89%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '89%' }}></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium px-2 py-0.5 shadow-none">Clean</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500 py-4 px-6">3d ago</TableCell>
                      </TableRow>

                      <TableRow className="border-slate-100">
                        <TableCell className="py-4 px-6">
                          <div className="flex items-center">
                            <Database className="w-4 h-4 text-blue-600 mr-3 shrink-0" />
                            <span className="text-sm font-medium text-slate-900 truncate">labor_force_2024.xlsx</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 py-4">22,100</TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-700 w-8">61%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full" style={{ width: '61%' }}></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium px-2 py-0.5 shadow-none">Processing</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-500 py-4 px-6">5d ago</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* RIGHT COLUMN: Quick Actions & Status */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="border-b border-slate-100 py-4 px-6">
                    <CardTitle className="text-base font-semibold text-slate-900">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    <Button variant="outline" className="w-full justify-start h-10 border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                      <Upload className="w-4 h-4 mr-3 text-slate-500" />
                      Upload Dataset
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-10 border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                      <Wand2 className="w-4 h-4 mr-3 text-slate-500" />
                      Run Cleaning Wizard
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-10 border-slate-200 text-slate-700 font-medium hover:bg-slate-50">
                      <FileText className="w-4 h-4 mr-3 text-slate-500" />
                      Generate Report
                    </Button>
                    <Button className="w-full justify-start h-10 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 font-medium shadow-none">
                      <Sparkles className="w-4 h-4 mr-3 text-blue-600" />
                      AI Assistant
                    </Button>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200 bg-white">
                  <CardHeader className="border-b border-slate-100 py-4 px-6">
                    <CardTitle className="text-base font-semibold text-slate-900">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-3 ring-2 ring-emerald-100"></div>
                        API Services
                      </div>
                      <span className="text-xs font-medium text-slate-500">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-3 ring-2 ring-emerald-100"></div>
                        Database Cluster
                      </div>
                      <span className="text-xs font-medium text-slate-500">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm font-medium text-slate-700">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-3 ring-2 ring-emerald-100"></div>
                        Cleaning Engine
                      </div>
                      <span className="text-xs font-medium text-slate-500">Operational</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
