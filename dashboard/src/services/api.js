const BASE = '/api'

async function req(url, options = {}) {
  const res = await fetch(BASE + url, options)
  return res.json()
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
  entree: (data)  => req('/transactions/entree',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  sortie: (data)  => req('/transactions/sortie',  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  getEncours: ()  => req('/transactions/encours'),
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req(`/transactions/transactions${qs ? `?${qs}` : ''}`)
  },
  getAlertes: (statut = 'active') => req(`/transactions/alertes?statut=${statut}`),
  resoudreAlerte: (id) => req(`/transactions/alertes/${id}/resoudre`, { method: 'PUT' }),
  getTarifs:  ()  => req('/transactions/tarifs'),
}

export const reporting = {
  occupation:   () => req('/reporting/rapport/occupation'),
  revenus: (periode = 'aujourd_hui') => req(`/reporting/rapport/revenus?periode=${periode}`),
  statistiques: (periode = 'aujourd_hui') => req(`/reporting/rapport/statistiques?periode=${periode}`),
  tendances:    () => req('/reporting/rapport/tendances'),
}

export const registry = {
  get: () => req('/registry'),
}
