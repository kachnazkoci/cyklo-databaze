# Cyklo databáze

## Struktura

- `index.html` – HTML rozhraní aplikace
- `assets/css/style.css` – styly
- `assets/js/app.js` – logika aplikace (filtrování, tabulka, přidávání jízd, statistiky, export, synchronizace)
- `assets/js/initial-data.js` – výchozí aktivity vložené do aplikace
- `assets/js/config.js` – konfigurace Supabase; před použitím cloudu doplň údaje podle `docs/NASTAVENI_CLOUD.md`
- `assets/images/` – ikony PWA
- `data/cyklo_aktivity_2025_2026.csv` – CSV export aktivit za roky 2025–2026
- `manifest.webmanifest` – konfigurace PWA
- `sw.js` – servisní pracovník/cache
- `docs/` – dokumentace ke cloudu

## GitHub Pages

Publikuj obsah této složky jako kořen webu (branch `main`, folder `/ (root)`). Odkazy v HTML jsou nastavené pro tuto strukturu. Zachovej `index.html` v kořeni repozitáře.

## Poznámka k datům

`assets/js/initial-data.js` obsahuje výchozí data aplikace. Uživatelské změny se ukládají do localStorage prohlížeče; aktualizace souboru výchozích dat automaticky nepřepíše data, která už jsou uložená v prohlížeči.
