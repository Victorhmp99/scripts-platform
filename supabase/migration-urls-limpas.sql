-- ============================================================
-- URLs sem .html (Vercel cleanUrls).
-- O endereço antigo redireciona sozinho, então isto é arrumação:
-- evita um salto a mais a cada clique no cartão.
-- Seguro rodar mais de uma vez.
-- ============================================================

UPDATE portal_items
   SET href = regexp_replace(href, '\.html($|\?)', '\1')
 WHERE href LIKE '/%.html%';

SELECT slug, href FROM portal_items ORDER BY slug;
