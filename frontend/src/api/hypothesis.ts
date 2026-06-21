import api from './client'

export async function recommendTest(columns: string[], alpha: number): Promise<any> {
  const { data } = await api.post('/hypothesis/recommend', { columns, alpha })
  return data
}

export async function runTest(test: string, columns: string[], params: Record<string, unknown>, alpha: number): Promise<any> {
  const { data } = await api.post('/hypothesis/run', { test, columns, params, alpha })
  return data
}
