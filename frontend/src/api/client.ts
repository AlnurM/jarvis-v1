// API client — stub for Phase 2. Backend proxy routes added as needed.
const API_BASE = '/api'

export async function healthCheck(): Promise<{ status: string; mongo: string }> {
  const res = await fetch(`${API_BASE}/health`)
  return res.json()
}
