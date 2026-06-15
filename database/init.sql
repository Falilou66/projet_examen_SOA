-- ============================================================
-- SmartParking — Initialisation PostgreSQL
-- ============================================================

DROP SCHEMA IF EXISTS places      CASCADE;
DROP SCHEMA IF EXISTS transactions CASCADE;
DROP SCHEMA IF EXISTS reporting    CASCADE;

CREATE SCHEMA places;
CREATE SCHEMA transactions;
CREATE SCHEMA reporting;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_places') THEN
    CREATE USER svc_places WITH PASSWORD 'places_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_transactions') THEN
    CREATE USER svc_transactions WITH PASSWORD 'trans_pass';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'svc_reporting') THEN
    CREATE USER svc_reporting WITH PASSWORD 'rep_pass';
  END IF;
END $$;

GRANT ALL ON SCHEMA places       TO svc_places;
GRANT ALL ON SCHEMA transactions TO svc_transactions;
GRANT ALL ON SCHEMA reporting    TO svc_reporting;

-- ── Schéma Places ────────────────────────────────────────────
SET search_path TO places;

CREATE TABLE zones (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(10) UNIQUE NOT NULL,
    nom           VARCHAR(100) NOT NULL,
    tarif_horaire DECIMAL(8,2) NOT NULL DEFAULT 500
);

CREATE TABLE places (
    id        SERIAL PRIMARY KEY,
    code      VARCHAR(20) UNIQUE NOT NULL,
    zone_code VARCHAR(10) NOT NULL REFERENCES zones(code),
    type      VARCHAR(20) DEFAULT 'standard',   -- standard, handicape, vip
    statut    VARCHAR(20) DEFAULT 'libre',       -- libre, occupe, hors_service
    plaque    VARCHAR(20),
    occupe_le TIMESTAMPTZ
);

CREATE INDEX idx_places_zone   ON places(zone_code);
CREATE INDEX idx_places_statut ON places(statut);

-- Zones
INSERT INTO zones (code, nom, tarif_horaire) VALUES
  ('A', 'Zone A — Standard', 500),
  ('B', 'Zone B — Mixte',    500),
  ('C', 'Zone C — VIP',      1000);

-- Zone A : A01-A20 standard
INSERT INTO places (code, zone_code, type) VALUES
  ('A01','A','standard'),('A02','A','standard'),('A03','A','standard'),('A04','A','standard'),('A05','A','standard'),
  ('A06','A','standard'),('A07','A','standard'),('A08','A','standard'),('A09','A','standard'),('A10','A','standard'),
  ('A11','A','standard'),('A12','A','standard'),('A13','A','standard'),('A14','A','standard'),('A15','A','standard'),
  ('A16','A','standard'),('A17','A','standard'),('A18','A','standard'),('A19','A','standard'),('A20','A','standard');

-- Zone B : B01-B12 standard + B13-B15 handicapé
INSERT INTO places (code, zone_code, type) VALUES
  ('B01','B','standard'),('B02','B','standard'),('B03','B','standard'),('B04','B','standard'),('B05','B','standard'),
  ('B06','B','standard'),('B07','B','standard'),('B08','B','standard'),('B09','B','standard'),('B10','B','standard'),
  ('B11','B','standard'),('B12','B','standard'),
  ('B13','B','handicape'),('B14','B','handicape'),('B15','B','handicape');

-- Zone C : C01-C10 VIP
INSERT INTO places (code, zone_code, type) VALUES
  ('C01','C','vip'),('C02','C','vip'),('C03','C','vip'),('C04','C','vip'),('C05','C','vip'),
  ('C06','C','vip'),('C07','C','vip'),('C08','C','vip'),('C09','C','vip'),('C10','C','vip');

GRANT ALL ON ALL TABLES    IN SCHEMA places TO svc_places;
GRANT ALL ON ALL SEQUENCES IN SCHEMA places TO svc_places;

-- ── Schéma Transactions ──────────────────────────────────────
SET search_path TO transactions;

CREATE TABLE tarifs (
    type_vehicule VARCHAR(20) PRIMARY KEY,
    tarif_horaire DECIMAL(8,2) NOT NULL,
    description   VARCHAR(100)
);

CREATE TABLE transactions (
    id            SERIAL PRIMARY KEY,
    reference     VARCHAR(30) UNIQUE NOT NULL,
    plaque        VARCHAR(20) NOT NULL,
    type_vehicule VARCHAR(20) DEFAULT 'voiture',
    place_code    VARCHAR(20) NOT NULL,
    zone_code     VARCHAR(10) NOT NULL,
    entree_le     TIMESTAMPTZ DEFAULT NOW(),
    sortie_le     TIMESTAMPTZ,
    duree_minutes INT,
    montant_fcfa  DECIMAL(10,2),
    statut        VARCHAR(20) DEFAULT 'en_cours'  -- en_cours, terminee, annulee
);

CREATE INDEX idx_tx_plaque  ON transactions(plaque);
CREATE INDEX idx_tx_statut  ON transactions(statut);
CREATE INDEX idx_tx_entree  ON transactions(entree_le DESC);
CREATE INDEX idx_tx_place   ON transactions(place_code);

CREATE TABLE alertes (
    id         SERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    zone_code  VARCHAR(10),
    place_code VARCHAR(20),
    message    TEXT,
    severite   VARCHAR(20) DEFAULT 'warning',  -- warning, critique
    statut     VARCHAR(20) DEFAULT 'active',   -- active, resolue
    cree_le    TIMESTAMPTZ DEFAULT NOW(),
    resolue_le TIMESTAMPTZ
);

INSERT INTO tarifs (type_vehicule, tarif_horaire, description) VALUES
  ('voiture', 500,  'Voiture particulière — 500 FCFA/heure'),
  ('moto',    200,  'Moto/Scooter — 200 FCFA/heure'),
  ('camion',  1000, 'Camion/Utilitaire — 1 000 FCFA/heure');

GRANT ALL ON ALL TABLES    IN SCHEMA transactions TO svc_transactions;
GRANT ALL ON ALL SEQUENCES IN SCHEMA transactions TO svc_transactions;

-- ── Schéma Reporting ─────────────────────────────────────────
SET search_path TO reporting;

CREATE TABLE rapports_cache (
    id         SERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    parametres JSONB,
    resultat   JSONB NOT NULL,
    genere_le  TIMESTAMPTZ DEFAULT NOW(),
    expire_le  TIMESTAMPTZ
);

GRANT ALL ON ALL TABLES    IN SCHEMA reporting TO svc_reporting;
GRANT ALL ON ALL SEQUENCES IN SCHEMA reporting TO svc_reporting;
