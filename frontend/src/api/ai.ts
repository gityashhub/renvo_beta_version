import api from './client'

export async function sendMessage(message: string, column?: string) {
  const { data } = await api.post('/ai/chat', { message, column })
  return data as { response: string }
}

export async function getHistory() {
  const { data } = await api.get('/ai/history')
  return data as { history: any[] }
}

export async function clearHistory() {
  await api.post('/ai/clear')
}
