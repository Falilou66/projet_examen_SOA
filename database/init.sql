-- ============================================================
-- SenCity — Initialisation complète de la base PostgreSQL
-- ============================================================

-- Schémas
CREATE SCHEMA IF NOT EXISTS surveillance;
CREATE SCHEMA IF NOT EXISTS incidents;
CREATE SCHEMA IF NOT EXISTS reporting;

-- Utilisateurs par service
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_surveillance') THEN
    CREATE USER svc_surveillance WITH PASSWORD 'surv_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_incidents') THEN
    CREATE USER svc_incidents WITH PASSWORD 'inc_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_reporting') THEN
    CREATE USER svc_reporting WITH PASSWORD 'rep_pass';
  END IF;
END
$$;

GRANT ALL ON SCHEMA surveillance TO svc_surveillance;
GRANT ALL ON SCHEMA incidents    TO svc_incidents;
GRANT ALL ON SCHEMA reporting    TO svc_reporting;

-- ── Schéma Surveillance ─────────────────────────────────────
SET search_path TO surveillance;

CREATE TABLE IF NOT EXISTS capteurs (
    id            SERIAL PRIMARY KEY,
    capteur_id    VARCHAR(50) UNIQUE NOT NULL,
    quartier      VARCHAR(100) NOT NULL,
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    actif         BOOLEAN DEFAULT TRUE,
    enregistre_le TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mesures (
    id         SERIAL PRIMARY KEY,
    capteur_id VARCHAR(50) NOT NULL,
    quartier   VARCHAR(100) NOT NULL,
    type       VARCHAR(50) NOT NULL,
    valeur     DECIMAL(10,2) NOT NULL,
    unite      VARCHAR(20),
    timestamp  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mesures_capteur  ON mesures (capteur_id);
CREATE INDEX IF NOT EXISTS idx_mesures_quartier ON mesures (quartier);
CREATE INDEX IF NOT EXISTS idx_mesures_type     ON mesures (type);
CREATE INDEX IF NOT EXISTS idx_mesures_ts       ON mesures (timestamp DESC);

GRANT ALL ON ALL TABLES    IN SCHEMA surveillance TO svc_surveillance;
GRANT ALL ON ALL SEQUENCES IN SCHEMA surveillance TO svc_surveillance;

-- Capteurs initiaux
INSERT INTO capteurs (capteur_id, quartier, latitude, longitude) VALUES
  ('CAP-PLATEAU-001',    'Plateau',              14.6694, -17.4376),
  ('CAP-MEDINA-001',     'Médina',               14.6889, -17.4410),
  ('CAP-PARCELLES-001',  'Parcelles Assainies',  14.7640, -17.4437),
  ('CAP-ALMADIES-001',   'Almadies',             14.7455, -17.5173),
  ('CAP-GRANDDARKAR-001','Grand Dakar',           14.7198, -17.4577)
ON CONFLICT (capteur_id) DO NOTHING;

-- ── Schéma Incidents ────────────────────────────────────────
SET search_path TO incidents;

CREATE TABLE IF NOT EXISTS incidents (
    id             SERIAL PRIMARY KEY,
    capteur_id     VARCHAR(50) NOT NULL,
    quartier       VARCHAR(100) NOT NULL,
    type           VARCHAR(50) NOT NULL,
    valeur_mesuree DECIMAL(10,2) NOT NULL,
    seuil_depasse  DECIMAL(10,2) NOT NULL,
    severite       VARCHAR(20) NOT NULL,
    statut         VARCHAR(20) DEFAULT 'actif',
    message        TEXT,
    cree_le        TIMESTAMPTZ DEFAULT NOW(),
    resolu_le      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_incidents_statut   ON incidents (statut);
CREATE INDEX IF NOT EXISTS idx_incidents_quartier ON incidents (quartier);

CREATE TABLE IF NOT EXISTS regles (
    type           VARCHAR(50) PRIMARY KEY,
    seuil_warning  DECIMAL(10,2) NOT NULL,
    seuil_critique DECIMAL(10,2) NOT NULL,
    unite          VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS abonnements (
    token      VARCHAR(255) PRIMARY KEY,
    plateforme VARCHAR(20) DEFAULT 'flutter',
    cree_le    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO regles (type, seuil_warning, seuil_critique, unite) VALUES
  ('temperature', 38,  42,  '°C'),
  ('humidite',    85,  95,  '%'),
  ('aqi',         100, 150, 'indice'),
  ('bruit',       70,  85,  'dB'),
  ('eau',         50,  80,  'cm')
ON CONFLICT (type) DO NOTHING;

GRANT ALL ON ALL TABLES    IN SCHEMA incidents TO svc_incidents;
GRANT ALL ON ALL SEQUENCES IN SCHEMA incidents TO svc_incidents;

-- ── Schéma Reporting ────────────────────────────────────────
SET search_path TO reporting;

CREATE TABLE IF NOT EXISTS rapports_cache (
    id         SERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    parametres JSONB,
    resultat   JSONB NOT NULL,
    genere_le  TIMESTAMPTZ DEFAULT NOW(),
    expire_le  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cache_type   ON rapports_cache (type);
CREATE INDEX IF NOT EXISTS idx_cache_expire ON rapports_cache (expire_le);

GRANT ALL ON ALL TABLES    IN SCHEMA reporting TO svc_reporting;
GRANT ALL ON ALL SEQUENCES IN SCHEMA reporting TO svc_reporting;
