CYKLO DATABÁZE – INSTALACE NA IPHONE + SYNCHRONIZACE S POČÍTAČEM

CO JE PŘIPRAVENO
- PWA: lze přidat na plochu iPhonu a spouštět jako aplikaci.
- Lokální cache a offline prohlížení.
- Přihlášení e-mailem/heslem a synchronizace celé databáze přes Supabase.
- Ochrana dat: každý účet může číst a měnit pouze vlastní záznam (RLS).
- Původní funkce a záznamy v3 jsou zachované.

ČÁST A – ZALOŽ CLOUD (zdarma lze začít na Supabase)
1. Na https://supabase.com vytvoř projekt a nastav silné heslo projektu.
2. V projektu otevři SQL Editor > New query.
3. Otevři soubor nastaveni_cloud.sql, zkopíruj celý obsah do editoru a stiskni Run.
4. V Supabase otevři Project Settings > API (případně Connect/API Keys podle verze rozhraní).
5. Zkopíruj Project URL a veřejný anon/publishable key.
6. Otevři config.js a nahraď DOPLNIT hodnoty. Nikdy sem nevkládej service_role/secret key.
7. V Authentication > URL Configuration nastav URL nasazené aplikace jako Site URL. Pro první zprovoznění můžeš vypnout potvrzování e-mailu v Authentication > Providers > Email; bezpečnější je potvrzování ponechat zapnuté.

ČÁST B – UMÍSTI APLIKACI NA HTTPS HOSTING
1. Nahraj všechny soubory této složky na statický hosting, např. Netlify (https://app.netlify.com/drop) nebo GitHub Pages. Musí zůstat vedle sebe: index.html, config.js, sw.js, manifest.webmanifest, icon-192.png, icon-512.png.
2. Otevři výslednou HTTPS adresu na počítači.
3. Zadej e-mail a heslo a klikni Přihlásit. Pokud účet ještě nemáš, klikni Vytvořit účet. Jestli je vyžadováno potvrzení e-mailu, potvrď ho před přihlášením.
4. Při prvním přihlášení se aktuální databáze z tohoto prohlížeče uloží do cloudu. Na dalším zařízení se po přihlášení načtou cloudová data.

ČÁST C – PŘIDEJ NA IPHONE
1. Otevři stejnou HTTPS adresu v Safari (ne v interním prohlížeči jiné aplikace).
2. Klepni na Sdílet (čtvereček se šipkou nahoru).
3. Zvol Přidat na plochu. Pokud se nabídne „Otevřít jako webovou aplikaci“, nech volbu zapnutou.
4. Spusť Cyklo z nové ikony a přihlas se stejným e-mailem/heslem jako v počítači.

DŮLEŽITÉ K SYNCHRONIZACI
- Po změně se data uloží lokálně a do cloudu se posílají automaticky s krátkým zpožděním.
- Při prvním přihlášení na novém zařízení se cloudový stav načte do tohoto zařízení. Než začneš aplikaci používat na více zařízeních, nech dokončit první synchronizaci.
- Při práci současně na dvou zařízeních může poslední uložená verze přepsat dřívější změny; zatím jde o jednoduchou synchronizaci pro jednoho uživatele, ne o kolaborativní editor.
- Cloud vyžaduje internet. Bez něj aplikace dál funguje s lokální kopií a pokusí se synchronizovat po návratu online.
- Ukládej občas Export celé databáze jako nezávislou zálohu.
- config.js obsahuje jen veřejný klientský klíč. Nikdy nevkládej service_role/secret klíč do aplikace.
