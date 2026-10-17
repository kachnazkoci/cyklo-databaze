# Cyklo databáze – strukturovaný projekt

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


## Můj profil a roční cíle

Pod ikonou osoby vedle tlačítka pro přidání jízdy lze nastavit cíle pro vybraný rok: kilometry, nastoupané metry a počet DPNK jízd. Splněné hodnoty a zbývající část se počítají automaticky z jízd daného roku. Cíle se ukládají do localStorage tohoto prohlížeče; v této verzi nejsou součástí synchronizace mezi zařízeními.


## Import ze Stravy a synchronizace
- CSV import je dostupný v části Filtry a export dat. Nejdřív exportuj CSV pomocí `strava_import.py`; pro doplnění roku 2025 uprav v tomto skriptu rozsah dat na 2025-01-01 až 2027-01-01 a spusť ho znovu.
- Přihlášení do synchronizace mezi zařízeními je oddělené od Stravy. Používá Supabase a e-mailový ověřovací kód. Funguje až po nastavení URL, veřejného klíče, SQL tabulky a e-mailové šablony v Supabase.
- CSV import používá datum + vzdálenost jako kontrolu možných duplicit; po importu zkontroluj případné podobné jízdy ručně.


## Strava import (Windows)

Soubor `config.json` je pouze místní konfigurace Python importéru Strava; není to nastavení cloudové synchronizace. Před spuštěním `strava_import.py` vlož do `client_secret` tajný klíč z nastavení Strava API. Soubor `config.json` nikdy nenahrávej na GitHub ani neposílej nikomu. Skript ukládá tokeny lokálně a exportuje aktivity 2025–2026 do `output/strava_activities_2025_2026.csv`.

## Cloudová synchronizace mezi zařízeními

Synchronizace mezi PC a telefonem zatím nebude fungovat, dokud v `assets/js/config.js` nenastavíš vlastní Supabase Project URL a publishable/anon key a nevytvoříš tabulky a RLS pravidla podle `docs/nastaveni_cloud.sql`. Přihlašovací e-mailový kód patří k účtu synchronizace (Supabase), není to Strava.


## Import ze Stravy
Tlačítko pro import CSV je uvnitř panelu Nová jízda (otevře se ikonou +). Výchozí data byla doplněna cyklistickými aktivitami ze Strava CSV k 17. 10. 2026; před nasazením doporučujeme exportovat zálohu celé databáze.


## Import a aktualizace Stravy

- Aktuální výchozí data v tomto balíčku jsou sestavena z `data/strava_activities_2025_2026.csv` (cyklistické aktivity za roky 2025 a 2026).
- Tlačítko `+` otevře formulář nové jízdy a pod ním import CSV.
- CSV lze importovat opakovaně; pro plně automatické aktualizace bez ručního exportu je potřeba naplánované spuštění importéru na serveru (např. GitHub Actions) a následné načítání aktualizovaných dat aplikací. Samotný GitHub Pages Python skript nespouští.
- Starší lokální data jsou uložena v prohlížeči. Tato verze používá novou úložnou verzi `cykloDatabaze_v4`, aby poprvé načetla kompletní výchozí data; předchozí lokální data se tím nemažou, ale nebudou automaticky sloučena. Exportuj je před přechodem, pokud obsahují ruční úpravy.


## Automatická aktualizace ze Stravy

Projekt obsahuje GitHub Actions workflow `.github/workflows/strava-update.yml`, které každých 6 hodin stáhne aktivity od 1. 1. 2025 do 1. 1. 2027 do `data/strava_activities_2025_2026.csv`. Pro aktivaci nastav v GitHub repozitáři Settings → Secrets and variables → Actions tyto secrets: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`. Potom v Actions spusť workflow ručně přes Run workflow. Nikdy neukládej tokeny do souborů commitovaných do repozitáře.

Poznámka: Strava může při obnově token rotovat refresh token. Zkontroluj výstup workflow a pokud vypíše `STRAVA_REFRESH_TOKEN_ROTATED`, aktualizuj secret `STRAVA_REFRESH_TOKEN` v nastavení repozitáře. Automatický CSV refresh v repozitáři je připraven; aplikace v tomto buildu nadále potřebuje CSV import do lokálních dat, pokud nemá aktivní cloud synchronizaci.


## Automatická aktualizace ze Stravy

GitHub Actions spouští import každých 6 hodin a lze jej spustit také ručně v záložce Actions. V **Settings → Secrets and variables → Actions → Repository secrets** nastav jednorázově:

- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REFRESH_TOKEN`
- `GH_SECRETS_TOKEN` — fine-grained Personal Access Token omezený pouze na tento repozitář s oprávněním **Secrets: Read and write** a **Metadata: Read-only**. Používá se výhradně k bezpečnému uložení nového obnovovacího tokenu, pokud jej Strava při obnově otočí. Nikdy nevkládej tokeny do zdrojových souborů ani do logů.

Po přidání secretů otevři **Actions → Aktualizace jízd ze Stravy → Run workflow**. Až běh skončí zeleně, zkontroluj aktualizovaný `data/strava_activities_2025_2026.csv`.
