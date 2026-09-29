-- ============================================================
-- Portal Green Hub — catálogo de itens e controle de acesso
-- Roda por cima do schema.sql existente. Seguro rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- Catálogo: tudo que existe no portal (conteúdos e ferramentas)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_items (
  slug        TEXT PRIMARY KEY,
  area        TEXT NOT NULL,                       -- gestao | comercial | marketing
  kind        TEXT NOT NULL CHECK (kind IN ('conteudo', 'ferramenta')),
  title       TEXT NOT NULL,
  description TEXT,
  href        TEXT,                                -- rota interna ou URL externa
  external    BOOLEAN NOT NULL DEFAULT FALSE,      -- true = abre em nova aba
  icon        TEXT,                                -- nome do ícone (lucide-like)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,       -- false = some do portal pra todos
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Acesso: o que cada empresa pode abrir
-- Sem linha aqui = bloqueado. É liberação explícita, nunca implícita.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_items (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_slug  TEXT NOT NULL REFERENCES portal_items(slug) ON DELETE CASCADE,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,                          -- NULL = sem prazo
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, item_slug)
);

CREATE INDEX IF NOT EXISTS company_items_company_idx ON company_items (company_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE portal_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_items ENABLE ROW LEVEL SECURITY;

-- Catálogo é legível por qualquer usuário logado (o que trava é o acesso, não a existência)
DROP POLICY IF EXISTS "logado lê catálogo" ON portal_items;
CREATE POLICY "logado lê catálogo" ON portal_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin gerencia catálogo" ON portal_items;
CREATE POLICY "admin gerencia catálogo" ON portal_items
  FOR ALL USING (get_my_role() = 'admin');

-- Empresa enxerga só as próprias liberações; escrita é exclusiva do admin
DROP POLICY IF EXISTS "empresa vê seus acessos" ON company_items;
CREATE POLICY "empresa vê seus acessos" ON company_items
  FOR SELECT USING (company_id = get_my_company());

DROP POLICY IF EXISTS "admin gerencia acessos" ON company_items;
CREATE POLICY "admin gerencia acessos" ON company_items
  FOR ALL USING (get_my_role() = 'admin');

-- ------------------------------------------------------------
-- O que o portal do cliente chama
-- Devolve o catálogo inteiro marcando o que está liberado,
-- pra poder mostrar cadeado no que ele ainda não tem.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_my_portal_items()
RETURNS TABLE (
  slug        TEXT,
  area        TEXT,
  kind        TEXT,
  title       TEXT,
  description TEXT,
  href        TEXT,
  external    BOOLEAN,
  icon        TEXT,
  sort_order  INTEGER,
  unlocked    BOOLEAN,
  expires_at  TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.slug,
    i.area,
    i.kind,
    i.title,
    i.description,
    i.href,
    i.external,
    i.icon,
    i.sort_order,
    COALESCE(
      ci.enabled AND (ci.expires_at IS NULL OR ci.expires_at > NOW()),
      FALSE
    ) AS unlocked,
    ci.expires_at
  FROM portal_items i
  LEFT JOIN company_items ci
    ON ci.item_slug = i.slug
   AND ci.company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  WHERE i.active
  ORDER BY i.area, i.sort_order, i.title;
$$;

-- Checagem de reforço no backend, pra usar antes de servir conteúdo pago
CREATE OR REPLACE FUNCTION company_has_item(p_company_id UUID, p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_items
    WHERE company_id = p_company_id
      AND item_slug = p_slug
      AND enabled
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ------------------------------------------------------------
-- Respostas das atividades de cada módulo
-- Uma linha por empresa + módulo. O conteúdo fica em JSON
-- pra cada módulo ter suas próprias perguntas sem migration nova.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS module_answers (
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_slug   TEXT NOT NULL REFERENCES portal_items(slug) ON DELETE CASCADE,
  answers     JSONB NOT NULL DEFAULT '{}',
  updated_by  UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, item_slug)
);

ALTER TABLE module_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empresa lê suas respostas" ON module_answers;
CREATE POLICY "empresa lê suas respostas" ON module_answers
  FOR SELECT USING (company_id = get_my_company());

DROP POLICY IF EXISTS "empresa grava suas respostas" ON module_answers;
CREATE POLICY "empresa grava suas respostas" ON module_answers
  FOR ALL USING (company_id = get_my_company())
  WITH CHECK (company_id = get_my_company());

DROP POLICY IF EXISTS "admin vê todas as respostas" ON module_answers;
CREATE POLICY "admin vê todas as respostas" ON module_answers
  FOR ALL USING (get_my_role() = 'admin');

DROP TRIGGER IF EXISTS module_answers_updated_at ON module_answers;
CREATE TRIGGER module_answers_updated_at
  BEFORE UPDATE ON module_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- Catálogo inicial
-- Mexer aqui (ou pelo painel) não exige deploy de código.
-- ------------------------------------------------------------
INSERT INTO portal_items (slug, area, kind, title, description, href, external, icon, sort_order) VALUES
  -- Gestão da empresa
  ('diagnostico-tempo',   'gestao',    'conteudo',   'Diagnóstico 360° do Tempo',   'Audite onde sua semana vaza e redesenhe a agenda em blocos protegidos.',            '/modulo-diagnostico-tempo.html',   FALSE, 'clock',       10),
  ('financas',            'gestao',    'conteudo',   'Finanças da Clínica',          'DRE, margens, vazamentos financeiros e ponto de equilíbrio.',                       '/modulo-financas.html',            FALSE, 'wallet',      20),
  ('estrategia-valor',    'gestao',    'conteudo',   'Estratégia e Percepção de Valor', 'Por que o paciente aceita pagar mais — e como aumentar isso sem subir custo.',    '/modulo-estrategia-valor.html',    FALSE, 'target',      30),
  ('ia-na-pratica',       'gestao',    'conteudo',   'IA na Prática',                'O framework do prompt perfeito e as ferramentas que valem para a clínica.',          '/modulo-ia-na-pratica.html',       FALSE, 'sparkles',    40),
  ('calculadora-preco',   'gestao',    'ferramenta', 'Calculadora de Precificação',  'Custo da hora-cadeira, material e imposto para chegar no preço certo do tratamento.', '/ferramenta-calculadora.html',     FALSE, 'calculator',  50),

  -- Comercial
  ('estrutura-comercial', 'comercial', 'conteudo',   'Estrutura Comercial',          'Quem faz o quê na esteira: SDR, closer, CS e o diagnóstico de gargalo.',             '/modulo-estrutura-comercial.html', FALSE, 'users',       10),
  ('jornada-paciente',    'comercial', 'conteudo',   'Jornada do Paciente',          'Mapeie os pontos de contato e ache as falhas que custam agendamento.',               '/modulo-jornada-paciente.html',    FALSE, 'route',       20),
  ('gerador-scripts',     'comercial', 'ferramenta', 'Gerador de Scripts',           'Scripts de atendimento, qualificação e aquecimento gerados para a sua clínica.',     '/app.html',                   FALSE, 'message',     30),

  -- Marketing
  ('marca-posicionamento','marketing', 'conteudo',   'Marca e Posicionamento',       'O iceberg da marca, os 9 elementos e a sua declaração de posicionamento.',           '/modulo-marca-posicionamento.html',FALSE, 'gem',         10),
  ('biblioteca-criativos','marketing', 'ferramenta', 'Biblioteca de Criativos',      'Referências de criativos validados para inspirar as próximas campanhas.',           '/criativos/', FALSE, 'image', 20)
ON CONFLICT (slug) DO UPDATE SET
  area        = EXCLUDED.area,
  kind        = EXCLUDED.kind,
  title       = EXCLUDED.title,
  description = EXCLUDED.description,
  href        = EXCLUDED.href,
  external    = EXCLUDED.external,
  icon        = EXCLUDED.icon,
  sort_order  = EXCLUDED.sort_order;

-- ------------------------------------------------------------
-- Continuidade: quem já usa o gerador de scripts hoje não pode
-- perder o acesso ao entrar pelo portal. Toda empresa existente
-- nasce com o gerador liberado, sem prazo.
-- Não sobrescreve quem já tem linha (você pode revogar depois).
-- ------------------------------------------------------------
INSERT INTO company_items (company_id, item_slug, enabled)
SELECT c.id, 'gerador-scripts', TRUE
FROM companies c
ON CONFLICT (company_id, item_slug) DO NOTHING;
