import api from './client'

export async function getMissingPatterns() {
  const { data } = await api.post('/viz/missing-patterns')
  return data as { chart_json: any }
}

export async function getColumnOverview() {
  const { data } = await api.post('/viz/column-overview')
  return data as { chart_json: any }
}

export async function getCorrelationMatrix() {
  const { data } = await api.post('/viz/correlation')
  return data as { chart_json: any }
}

export async function getColumnDistribution(column: string) {
  const { data } = await api.post('/viz/distribution', { column })
  return data as { chart_json: any }
}

export async function getCustomChart(xCol: string, yCol: string, chartType: string, colorCol?: string) {
  const { data } = await api.post('/viz/custom', { x_col: xCol, y_col: yCol, chart_type: chartType, color_col: colorCol })
  return data as { chart_json: any }
}
