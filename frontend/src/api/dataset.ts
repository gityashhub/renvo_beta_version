import api from './client'

export interface OverviewResponse {
  rows: number
  columns: number
  missing_values: number
  memory_mb: number
  column_names: string[]
  preview: Record<string, unknown>[]
  column_info: { column: string; dtype: string; non_null: number; missing: number; unique: number }[] | null
  max_preview_rows: number
}

export interface SessionStatus {
  session_id: string
  has_dataset: boolean
  filename: string | null
  undo_count: number
  redo_count: number
}

export const uploadFile = async (file: File) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form)
  return data
}

export const getSessionStatus = async (): Promise<SessionStatus> => {
  const { data } = await api.get('/session/status')
  return data
}

export const getOverview = async (previewRows: number, showInfo: boolean): Promise<OverviewResponse> => {
  const { data } = await api.get('/dataset/overview', {
    params: { preview_rows: previewRows, show_info: showInfo },
  })
  return data
}

export const getColumnTypes = async (): Promise<{ column_types: Record<string, string> }> => {
  const { data } = await api.get('/dataset/column-types')
  return data
}

export const updateColumnTypes = async (columnTypes: Record<string, string>) => {
  const { data } = await api.put('/dataset/column-types', { column_types: columnTypes })
  return data
}

export const analyzeColumns = async () => {
  const { data } = await api.post('/dataset/analyze-columns')
  return data
}

export const undoOperation = async () => {
  const { data } = await api.post('/dataset/undo')
  return data
}

export const redoOperation = async () => {
  const { data } = await api.post('/dataset/redo')
  return data
}

export const exportConfig = async () => {
  const { data } = await api.get('/config/export')
  return data
}

export const importConfig = async (config: Record<string, unknown>) => {
  const { data } = await api.post('/config/import', config)
  return data
}

export const connectMySQL = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/connect/mysql', payload)
  return data
}

export const connectSupabase = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/connect/supabase', payload)
  return data
}
