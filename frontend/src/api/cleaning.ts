import api from './client'

// ── Anomaly Detection ────────────────────────────────────────────────────────
export const scanAllAnomalies = async () => {
  const { data } = await api.post('/anomaly/scan-all')
  return data as {
    anomalies: Record<string, {
      expected_type: string; anomaly_count: number; anomaly_percentage: number;
      total_values: number; anomalies: { row_index: number; value: string; reason: string }[]
    }>;
    columns_with_anomalies: number
  }
}

export const scanColumnAnomalies = async (column: string) => {
  const { data } = await api.post('/anomaly/scan-column', { column })
  return data as {
    column: string; expected_type: string; anomaly_count: number;
    anomaly_percentage: number; total_values: number; null_values: number;
    summary: string; anomalies: { row_index: number; value: string; reason: string }[]
  }
}

export const nullifyAnomalies = async (column: string, row_indices: number[]) => {
  const { data } = await api.post('/anomaly/nullify', { column, row_indices })
  return data
}

export const fixColumn = async (column: string, action: 'coerce' | 'nullify', expected_type?: string) => {
  const { data } = await api.post('/anomaly/fix-column', { column, action, expected_type })
  return data as { message: string; cells_fixed: number }
}

export const replaceValue = async (column: string, row_index: number, new_value: string) => {
  const { data } = await api.post('/anomaly/replace-value', { column, row_index, new_value })
  return data
}

export const getDuplicates = async () => {
  const { data } = await api.get('/anomaly/duplicates')
  return data as { total_rows: number; duplicate_count: number; duplicate_percentage: number; columns: string[] }
}

export const checkDuplicates = async (subset: string[], keep: string) => {
  const { data } = await api.post('/anomaly/check-duplicates', { subset, keep })
  return data as { duplicate_count: number; rows_to_remove: number }
}

export const removeDuplicates = async (subset: string[], keep: string) => {
  const { data } = await api.post('/anomaly/remove-duplicates', { subset, keep })
  return data as { message: string; rows_removed: number; rows_remaining: number }
}

// ── Data Transformation ──────────────────────────────────────────────────────
export const validateMerge = async (columns: string[], is_datetime_merge: boolean) => {
  const { data } = await api.post('/transform/validate-merge', { columns, is_datetime_merge })
  return data as { valid: boolean; warnings: string[]; errors: string[] }
}

export const mergeColumns = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/transform/merge-columns', payload)
  return data
}

export const splitColumn = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/transform/split-column', payload)
  return data
}

export const detectJsonColumns = async () => {
  const { data } = await api.post('/transform/detect-json')
  return data as { json_columns: { column: string; keys: string[]; json_percentage: number; is_array: boolean; is_nested: boolean }[] }
}

export const expandJson = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/transform/expand-json', payload)
  return data
}

export const columnsToJson = async (payload: Record<string, unknown>) => {
  const { data } = await api.post('/transform/columns-to-json', payload)
  return data
}

// ── Column Analysis ──────────────────────────────────────────────────────────
export const getAllAnalysis = async () => {
  const { data } = await api.get('/columns/analysis')
  return data as { column_analysis: Record<string, unknown> }
}

export const analyzeColumn = async (column: string) => {
  const { data } = await api.post(`/columns/analyze/${encodeURIComponent(column)}`)
  return data
}

export const getDistribution = async (column: string) => {
  const { data } = await api.get(`/columns/distribution/${encodeURIComponent(column)}`)
  return data as {
    type: 'histogram' | 'bar' | 'empty'
    bins?: { x0: number; x1: number; count: number }[]
    categories?: { label: string; count: number }[]
    min?: number; max?: number; mean?: number; median?: number
  }
}

// ── Cleaning Wizard ──────────────────────────────────────────────────────────
export const previewClean = async (column: string, method_type: string, method_name: string, parameters: Record<string, unknown>) => {
  const { data } = await api.post('/clean/preview', { column, method_type, method_name, parameters })
  return data as {
    success: boolean; total_changes: number;
    impact_stats: Record<string, number | null>;
    sample_changes: { index: number; before: unknown; after: unknown }[]
  }
}

export const applyClean = async (column: string, method_type: string, method_name: string, parameters: Record<string, unknown>) => {
  const { data } = await api.post('/clean/apply', { column, method_type, method_name, parameters })
  return data as { success: boolean; message: string; rows_affected: number; undo_count: number; redo_count: number }
}

export const undoClean = async () => {
  const { data } = await api.post('/clean/undo')
  return data as { success: boolean; message: string; undo_count: number; redo_count: number }
}

export const redoClean = async () => {
  const { data } = await api.post('/clean/redo')
  return data as { success: boolean; message: string; undo_count: number; redo_count: number }
}

export const getCleanHistory = async () => {
  const { data } = await api.get('/clean/history')
  return data as { cleaning_history: Record<string, unknown[]>; undo_count: number; redo_count: number }
}
