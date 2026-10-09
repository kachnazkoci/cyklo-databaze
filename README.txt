CYKLO DATABÁZE – PWA + CLOUD SYNCHRONIZACE

Spuštění lokálně: otevři index.html. Pro instalaci na iPhone a synchronizaci mezi zařízeními musí být aplikace nahraná na HTTPS hosting.

Soubory:
- index.html: aplikace a data v3
- manifest.webmanifest, sw.js, ikony: instalace na plochu a cache
- config.js: sem doplň Supabase Project URL a veřejný anon/publishable key
- nastaveni_cloud.sql: vytvoření zabezpečené tabulky s pravidly přístupu
- NASTAVENI_CLOUD.md: kompletní postup
- activities.csv: původní export dat

Nejdřív nastav Supabase podle NASTAVENI_CLOUD.md. Bez toho aplikace funguje lokálně, ale zařízení se nesynchronizují.
