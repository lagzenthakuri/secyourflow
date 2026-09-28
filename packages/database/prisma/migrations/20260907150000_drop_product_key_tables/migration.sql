-- Drops the product-key tables.
--
-- The product-key activation feature was removed from the application in
-- commit 3c48c2a; the models stayed behind in the schema and the tables stayed
-- in the database with no code referencing them. Verified before removal:
-- `grep -rn "ProductKey" src/` returns nothing.
DROP TABLE IF EXISTS "ProductKeyActivation";
DROP TABLE IF EXISTS "ProductKey";
