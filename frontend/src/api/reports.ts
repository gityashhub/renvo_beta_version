import api from './client'

export async function generateReport(type: string) {
  const { data } = await api.get('/reports/generate', { params: { type } })
  return data as { content: string, type: string }
}

export function getReportDownloadUrl(type: string) {
  if (type === 'csv') return '/api/reports/download-csv'
  if (type === 'json') return '/api/reports/download-json'
  return ''
}
