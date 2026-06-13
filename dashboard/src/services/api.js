const BASE = '/api'

async function req(url, options = {}) {
  const res = await fetch(BASE + url, options)
  return res.json()
}

export const surveillance = {
  getMesures: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/surveillance/mesures${qs ? `?${qs}` : ''}`)
  },
  getDernieres: () => req('/surveillance/mesures/dernieres'),
  getCapteurs:  () => req('/surveillance/capteurs'),
}

export const incidents = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/incidents/incidents${qs ? `?${qs}` : ''}`)
  },
  resoudre: (id) => req(`/incidents/incidents/${id}/resoudre`, { method: 'PUT' }),
  verifier: ()   => req('/incidents/verifier', { method: 'POST' }),
}

export const reporting = {
  getStats:    (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/reporting/rapport/statistiques${qs ? `?${qs}` : ''}`)
  },
  getTempsReel: () => req('/reporting/rapport/temps-reel'),
  getTendances: () => req('/reporting/rapport/tendances'),
}

export const registry = {
  get: () => req('/registry'),
}
