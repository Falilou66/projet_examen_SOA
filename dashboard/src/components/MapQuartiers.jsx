import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const QUARTIERS = {
  'Plateau':             [14.6694, -17.4376],
  'Médina':              [14.6889, -17.4410],
  'Parcelles Assainies': [14.7640, -17.4437],
  'Almadies':            [14.7455, -17.5173],
  'Grand Dakar':         [14.7198, -17.4577],
}

const SEUILS = {
  temperature: { warning: 38,  critique: 42  },
  humidite:    { warning: 85,  critique: 95  },
  aqi:         { warning: 100, critique: 150 },
  bruit:       { warning: 70,  critique: 85  },
  eau:         { warning: 50,  critique: 80  },
}

const COULEURS = {
  normal:   '#28a745',
  warning:  '#ffc107',
  critique: '#dc3545',
  unknown:  '#adb5bd',
}

const LABELS = {
  normal:   '✓ Normal',
  warning:  '⚠ Alerte',
  critique: '✕ Critique',
  unknown:  '? Aucune donnée',
}

function getStatut(mesures, quartier) {
  const qm = mesures.filter(m => m.quartier === quartier)
  if (!qm.length) return 'unknown'
  let statut = 'normal'
  for (const m of qm) {
    const s = SEUILS[m.type]
    if (!s) continue
    if (+m.valeur > s.critique) return 'critique'
    if (+m.valeur > s.warning)  statut = 'warning'
  }
  return statut
}

function makeIcon(statut) {
  const c = COULEURS[statut]
  if (statut === 'critique') {
    return L.divIcon({
      html: `
        <div class="map-marker">
          <div class="map-pulse-ring" style="border-color:${c}"></div>
          <div class="map-pulse-ring map-pulse-ring-2" style="border-color:${c}"></div>
          <div class="map-dot-inner" style="background:${c}"></div>
        </div>
      `,
      className: '',
      iconSize: [64, 64],
      iconAnchor: [32, 32],
      popupAnchor: [0, -32],
    })
  }
  return L.divIcon({
    html: `
      <div class="map-marker">
        <div class="map-dot-inner" style="background:${c}"></div>
      </div>
    `,
    className: '',
    iconSize: [64, 64],
    iconAnchor: [32, 32],
    popupAnchor: [0, -32],
  })
}

export default function MapQuartiers({ mesures }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Carte des quartiers — Dakar</h2>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          {Object.entries(COULEURS).map(([k, c]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {LABELS[k]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ height: '450px', borderRadius: '8px', overflow: 'hidden' }}>
        <MapContainer center={[14.72, -17.46]} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          />

          {Object.entries(QUARTIERS).map(([nom, pos]) => {
            const statut = getStatut(mesures, nom)
            const qm     = mesures.filter(m => m.quartier === nom)

            return (
              <Marker key={nom} position={pos} icon={makeIcon(statut)}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong style={{ fontSize: '1rem' }}>{nom}</strong>
                    <div style={{ marginTop: '0.5rem', color: COULEURS[statut], fontWeight: 'bold' }}>
                      {LABELS[statut]}
                    </div>
                    {qm.length > 0 ? (
                      <table style={{ marginTop: '0.5rem', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <tbody>
                          {qm.map(m => (
                            <tr key={m.type}>
                              <td style={{ paddingRight: '0.5rem', color: '#666' }}>{m.type}</td>
                              <td style={{ fontWeight: 600 }}>{m.valeur} {m.unite}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ marginTop: '0.5rem', color: '#999', fontSize: '0.8rem' }}>
                        Aucune mesure disponible
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
