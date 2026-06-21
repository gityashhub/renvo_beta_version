import { useState, useEffect } from 'react'
import { generateReport, getReportDownloadUrl } from '../api/reports'
import { getCleanHistory } from '../api/cleaning'
import { Button, Card, SectionHeader, Badge, Alert } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { FileText, ClipboardList, BookOpen, FileCode, Download, Copy, Check, Clock } from 'lucide-react'

interface ReportCardProps {
  title: string
  description: string
  icon: React.ElementType
  type: string
  onGenerate: (type: string) => void
  loading: boolean
  content?: string
  downloadable?: boolean
}

function ReportCard({ title, description, icon: Icon, type, onGenerate, loading, content, downloadable }: ReportCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="p-6 flex-1">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-6">{description}</p>
        
        {content ? (
          <div className="relative group">
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono h-[300px] overflow-auto whitespace-pre-wrap">
              {content}
            </pre>
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={handleCopy}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-slate-700 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[300px] bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center">
            <Button variant="secondary" onClick={() => onGenerate(type)} loading={loading}>
              Generate Report
            </Button>
          </div>
        )}
      </div>
      
      {content && (
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onGenerate(type)}
            loading={loading}
          >
            Regenerate
          </Button>
          {downloadable && (
            <a 
              href={getReportDownloadUrl(type === 'json' ? 'json' : 'csv')} 
              download 
              className="flex-1"
            >
              <Button variant="primary" size="sm" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </a>
          )}
        </div>
      )}
    </Card>
  )
}

export default function Reports() {
  const [reports, setReports] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
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
    try {
      const res = await generateReport(type)
      setReports(prev => ({ ...prev, [type]: res.content }))
    } catch (e) {
      setError(`Failed to generate ${type} report`)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <SectionHeader 
            title="Reports" 
            subtitle="Documentation and export tools for your data cleaning process"
          />
        </div>
        <Badge variant="info" className="flex items-center gap-1.5 px-3 py-1.5">
          <Clock className="w-3.5 h-3.5" />
          {historyCount} Operations in History
        </Badge>
      </div>

      <DatasetBanner />

      {error && <Alert type="error" message={error} className="mb-6" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ReportCard 
          title="Executive Summary"
          description="A high-level overview of dataset health, key issues, and overall quality metrics."
          icon={FileText}
          type="executive"
          onGenerate={handleGenerate}
          loading={loading['executive']}
          content={reports['executive']}
          downloadable
        />

        <ReportCard 
          title="Audit Trail"
          description="Detailed log of all cleaning operations performed, including before/after values."
          icon={ClipboardList}
          type="audit"
          onGenerate={handleGenerate}
          loading={loading['audit']}
          content={reports['audit']}
          downloadable
        />

        <ReportCard 
          title="Methodology Report"
          description="Technical documentation of the statistical tests and cleaning algorithms applied."
          icon={BookOpen}
          type="methodology"
          onGenerate={handleGenerate}
          loading={loading['methodology']}
          content={reports['methodology']}
          downloadable
        />

        <ReportCard 
          title="JSON Export"
          description="Full dataset configuration and history in machine-readable JSON format."
          icon={FileCode}
          type="json"
          onGenerate={handleGenerate}
          loading={loading['json']}
          content={reports['json']}
          downloadable
        />
      </div>
    </div>
  )
}
