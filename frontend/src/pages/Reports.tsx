import { useState, useEffect } from 'react'
import { generateReport, getReportDownloadUrl } from '../api/reports'
import { getCleanHistory } from '../api/cleaning'
import { Button, Card, SectionHeader, Badge, Alert } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { 
  FileText, ClipboardList, BookOpen, FileCode, 
  Download, Copy, Check, Clock, FileDown, Database,
  ChevronDown, ChevronUp, Sparkles
} from 'lucide-react'

interface ReportCardProps {
  title: string
  description: string
  icon: React.ElementType
  type: string
  onGenerate: (type: string) => void
  loading: boolean
  content?: string
  badge?: string
}

function ReportCard({ title, description, icon: Icon, type, onGenerate, loading, content, badge }: ReportCardProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 rounded-lg shrink-0 mt-0.5">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{title}</h3>
              {badge && (
                <Badge variant="info" className="text-[10px]">{badge}</Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">{description}</p>
          </div>
          {content && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="shrink-0 p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
              aria-label="Toggle preview"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1">
        {content && expanded ? (
          <div className="relative group">
            <pre className="p-3 sm:p-4 bg-slate-900 text-slate-100 rounded-lg text-[10px] sm:text-[11px] font-mono h-[220px] sm:h-[260px] overflow-auto whitespace-pre-wrap leading-relaxed">
              {content}
            </pre>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleCopy}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-slate-700 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ) : !content ? (
          <div className="h-[220px] sm:h-[260px] bg-slate-50 rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <Sparkles className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">Click generate to create this report</p>
            <Button variant="secondary" onClick={() => onGenerate(type)} loading={loading}>
              Generate Report
            </Button>
          </div>
        ) : null}
      </div>

      {/* Footer actions */}
      <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onGenerate(type)}
          loading={loading}
          className="flex-1 min-w-[100px]"
        >
          {content ? 'Regenerate' : 'Generate'}
        </Button>
        {content && (
          <button
            onClick={handleCopy}
            className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </Card>
  )
}

export default function Reports() {
  const [reports, setReports] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [pdfLoading, setPdfLoading] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCleanHistory().then(d => {
      const allOps = Object.values(d.cleaning_history).flat()
      setHistoryCount(allOps.length)
    }).catch(() => {})
  }, [])

  const handleGenerate = async (type: string) => {
    setLoading(prev => ({ ...prev, [type]: true }))
    setError(null)
    try {
      const res = await generateReport(type)
      setReports(prev => ({ ...prev, [type]: res.content }))
    } catch {
      setError(`Failed to generate ${type} report. Make sure a dataset is loaded.`)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleGenerateAll = async () => {
    for (const type of ['executive', 'audit', 'methodology', 'json']) {
      await handleGenerate(type)
    }
  }

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/reports/download-pdf')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'PDF generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `renvo_report_${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message ?? 'Failed to download PDF report')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0 sm:justify-between">
        <div className="flex-1 min-w-0">
          <SectionHeader 
            title="Reports" 
            subtitle="Auto-generated reports, diagnostics, and data export tools"
            className="mb-0"
          />
        </div>
        <Badge variant="info" className="flex items-center gap-1.5 px-3 py-1.5 self-start sm:shrink-0 sm:ml-4 mt-1">
          <Clock className="w-3.5 h-3.5" />
          {historyCount} Operations
        </Badge>
      </div>

      <DatasetBanner />

      {error && <Alert type="error" message={error} />}

      {/* Quick action bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Quick Actions</span>
          </div>

          {/* Download cleaned dataset */}
          <a href={getReportDownloadUrl('csv')} download="cleaned_dataset.csv" className="flex-1 sm:flex-none">
            <Button variant="primary" size="sm" className="w-full gap-2">
              <Download className="w-4 h-4" />
              Download Cleaned Dataset
            </Button>
          </a>

          {/* Download PDF report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            loading={pdfLoading}
            className="flex-1 sm:flex-none gap-2"
          >
            <FileDown className="w-4 h-4" />
            Download PDF Report
          </Button>

          {/* Generate all */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerateAll}
            loading={Object.values(loading).some(Boolean)}
            className="flex-1 sm:flex-none gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate All Reports
          </Button>
        </div>
      </Card>

      {/* Report cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <ReportCard 
          title="Executive Summary"
          description="High-level dataset health, key issues, quality metrics, and cleaning overview."
          icon={FileText}
          type="executive"
          badge="Auto-generated"
          onGenerate={handleGenerate}
          loading={!!loading['executive']}
          content={reports['executive']}
        />

        <ReportCard 
          title="Audit Trail"
          description="Detailed log of all cleaning operations — timestamps, methods, and rows affected."
          icon={ClipboardList}
          type="audit"
          onGenerate={handleGenerate}
          loading={!!loading['audit']}
          content={reports['audit']}
        />

        <ReportCard 
          title="Methodology Report"
          description="Technical documentation of statistical tests and cleaning algorithms applied."
          icon={BookOpen}
          type="methodology"
          onGenerate={handleGenerate}
          loading={!!loading['methodology']}
          content={reports['methodology']}
        />

        <ReportCard 
          title="JSON Export"
          description="Full dataset configuration and cleaning history in machine-readable JSON format."
          icon={FileCode}
          type="json"
          onGenerate={handleGenerate}
          loading={!!loading['json']}
          content={reports['json']}
        />
      </div>

      {/* JSON download */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-slate-800 text-sm sm:text-base">Raw Data Export</h4>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Download the dataset or full report data in various formats</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={getReportDownloadUrl('csv')} download="cleaned_dataset.csv">
              <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                <Download className="w-3.5 h-3.5" />
                CSV Dataset
              </Button>
            </a>
            <a href={getReportDownloadUrl('json')} download="report_data.json">
              <Button variant="outline" size="sm" className="gap-2 whitespace-nowrap">
                <Download className="w-3.5 h-3.5" />
                JSON Report
              </Button>
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}
