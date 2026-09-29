-- ============================================================
-- Biblioteca de Criativos passa a morar dentro do próprio app
-- (ferramentas.assessoriagreenlab.com.br/criativos/) em vez do
-- domínio antigo da Vercel. Seguro rodar mais de uma vez.
-- ============================================================

UPDATE portal_items
   SET href = '/criativos/',
       external = FALSE
 WHERE slug = 'biblioteca-criativos';

SELECT slug, href, external FROM portal_items WHERE slug = 'biblioteca-criativos';
