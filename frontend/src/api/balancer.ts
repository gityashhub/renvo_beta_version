import api from './client'

export async function getBalancerMethods(): Promise<any> {
  const { data } = await api.get('/balancer/methods')
  return data
}

export async function validateBalancerData(featureCols: string[], targetCol: string): Promise<any> {
  const { data } = await api.post('/balancer/validate', { feature_cols: featureCols, target_col: targetCol })
  return data
}

export async function getClassDistribution(targetCol: string): Promise<any> {
  const { data } = await api.get('/balancer/distribution', { params: { target_col: targetCol } })
  return data
}

export async function balanceData(method: string, featureCols: string[], targetCol: string, useSplit: boolean, testSize: number): Promise<any> {
  const { data } = await api.post('/balancer/balance', { 
    method, 
    feature_cols: featureCols, 
    target_col: targetCol, 
    use_split: useSplit, 
    test_size: testSize 
  })
  return data
}

export function getBalancerDownloadUrl(format: string): string {
  return `/api/balancer/download?format=${format}`
}
