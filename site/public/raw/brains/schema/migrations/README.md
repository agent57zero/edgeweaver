# Schema migrations (D15 / BRAINS.md propagation)

One file per change, `NNNN-short-name.sql`, applied in order by
`scripts/brains/migrate.mjs`. Version NNNN is the schemaVersion a brain reaches after the
file applies. `ddl-v1.sql` (one level up) is the version-1 baseline a spawn starts from;
the first migration here will be `0002-*.sql`.

Rules: plain SQL against schema `public` (migrate.mjs rewrites it per scratch schema);
scratches migrate before live (hygiene rule 4); never edit an applied migration, add the
next one.
