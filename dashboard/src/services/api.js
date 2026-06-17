const BASE = '/api'

function getToken() {
  return localStorage.getItem('sp_jwt') || ''
}

async function req(url, options = {}) {
  const token = getToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const res = await fetch(BASE + url, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('sp_jwt')
    localStorage.removeItem('sp_auth')
    window.dispatchEvent(new CustomEvent('sp:unauthorized'))
    return null
  }
  return res.json()
}

export const auth = {
  login: (username, password) =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }).then(r => r.json()),

  verify: () =>
    fetch(`${BASE}/auth/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json()),
}

export const places = {
  getStats:       () => req('/places/stats'),
  getZones:       () => req('/places/zones'),
  getAll:         (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/places/places${qs ? `?${qs}` : ''}`)
  },
  getDisponibles: (zone = null) => {
    const qs = zone ? `?zone=${zone}` : ''
    return req(`/places/places/disponibles${qs}`)
  },
}

export const transactions = {
  entree:         (data) => req('/transactions/entree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  sortie:         (data) => req('/transactions/sortie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  getEncours:     ()     => req('/transactions/encours'),
  getAll:         (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/transactions/transactions${qs ? `?${qs}` : ''}`)
  },
  getAlertes:     (statut = 'active') => req(`/transactions/alertes?statut=${statut}`),
  resoudreAlerte: (id)   => req(`/transactions/alertes/${id}/resoudre`, { method: 'PUT' }),
  getTarifs:      ()     => req('/transactions/tarifs'),
}

export const reporting = {
  occupation:   () => req('/reporting/rapport/occupation'),
  revenus:      (periode = 'aujourd_hui') => req(`/reporting/rapport/revenus?periode=${periode}`),
  statistiques: (periode = 'aujourd_hui') => req(`/reporting/rapport/statistiques?periode=${periode}`),
  tendances:    () => req('/reporting/rapport/tendances'),
}

export const registry = {
  get: () => req('/registry'),
}
