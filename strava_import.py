import csv
import json
import time
import threading
import urllib.parse
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config.json"
OUT_DIR = ROOT / "output"
OUT_FILE = OUT_DIR / "strava_activities_2025_2026.csv"
REDIRECT_URI = "http://localhost:8000/callback"
SCOPES = "read,activity:read,activity:read_all"
TOKEN_URL = "https://www.strava.com/oauth/token"
API_BASE = "https://www.strava.com/api/v3"

def load_config():
    with CONFIG_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_config(cfg):
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

def oauth_authorize(cfg):
    if not cfg.get("client_secret") or cfg["client_secret"].startswith("VLOZ_"):
        raise SystemExit("Nejdřív vlož Client Secret do config.json. Skript se ukončil.")
    got = {}
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            if parsed.path == "/callback":
                got["code"] = params.get("code", [""])[0]
                got["error"] = params.get("error", [""])[0]
                got["scope"] = params.get("scope", [""])[0]
                body = ("Autorizace byla přijata. Můžeš zavřít toto okno a vrátit se do příkazového řádku."
                        if got.get("code") else "Autorizace se nepovedla. Vrať se do příkazového řádku.")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(("<html><meta charset='utf-8'><body style='font-family:sans-serif;padding:2rem'>"
                                  + body + "</body></html>").encode("utf-8"))
            else:
                self.send_response(404); self.end_headers()
        def log_message(self, *_):
            pass

    try:
        server = HTTPServer(("localhost", 8000), Handler)
    except OSError:
        raise SystemExit("Port 8000 je obsazený. Zavři jinou aplikaci používající port 8000 a spusť skript znovu.")
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()
    params = {
        "client_id": str(cfg["client_id"]),
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "force",
        "scope": SCOPES
    }
    url = "https://www.strava.com/oauth/authorize?" + urllib.parse.urlencode(params)
    print("\nOtevírám Stravu v prohlížeči. Přihlas se a schval přístup.")
    print("Pokud se prohlížeč neotevře, zkopíruj tuto adresu:\n" + url + "\n")
    webbrowser.open(url)
    thread.join(timeout=180)
    server.server_close()
    if not got.get("code"):
        raise SystemExit("Nedorazil autorizační kód. Zkontroluj callback domain localhost a zkus to znovu.")
    response = requests.post(TOKEN_URL, data={
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "code": got["code"],
        "grant_type": "authorization_code"
    }, timeout=30)
    response.raise_for_status()
    data = response.json()
    cfg["access_token"] = data["access_token"]
    cfg["refresh_token"] = data["refresh_token"]
    cfg["expires_at"] = data["expires_at"]
    save_config(cfg)
    print("Autorizace dokončena. Udělené scope:", data.get("scope", got.get("scope", "neuvedeno")))

def valid_access_token(cfg, force_refresh=False):
    if force_refresh or not cfg.get("refresh_token"):
        oauth_authorize(cfg)
        return cfg["access_token"]
    if int(cfg.get("expires_at", 0)) <= int(time.time()) + 60:
        response = requests.post(TOKEN_URL, data={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "grant_type": "refresh_token",
            "refresh_token": cfg["refresh_token"]
        }, timeout=30)
        if response.status_code in (400, 401):
            print("Obnovovací token Strava odmítla. Spouštím novou autorizaci…")
            oauth_authorize(cfg)
            return cfg["access_token"]
        response.raise_for_status()
        data = response.json()
        cfg["access_token"] = data["access_token"]
        cfg["refresh_token"] = data["refresh_token"]
        cfg["expires_at"] = data["expires_at"]
        save_config(cfg)
    return cfg["access_token"]

def main():
    cfg = load_config()
    if not cfg.get("client_secret") or cfg["client_secret"].startswith("VLOZ_"):
        raise SystemExit("Nejdřív vlož Client Secret do config.json.")
    token = valid_access_token(cfg)
    # UTC bounds: 2025-01-01 inclusive to 2027-01-01 exclusive
    after = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())
    before = int(datetime(2027, 1, 1, tzinfo=timezone.utc).timestamp())
    headers = {"Authorization": f"Bearer {token}"}
    activities = []
    page = 1
    while True:
        response = requests.get(
            f"{API_BASE}/athlete/activities",
            headers=headers,
            params={"after": after, "before": before, "page": page, "per_page": 200},
            timeout=30
        )
        if response.status_code == 401:
            # A token can be revoked even if expires_at is in the future.
            # Start a fresh OAuth flow rather than retrying the same invalid token.
            print("Strava odmítla přístupový token (401). Spouštím novou autorizaci…")
            token = valid_access_token(cfg, force_refresh=True)
            headers["Authorization"] = f"Bearer {token}"
            response = requests.get(
                f"{API_BASE}/athlete/activities",
                headers=headers,
                params={"after": after, "before": before, "page": page, "per_page": 200},
                timeout=30
            )
        if response.status_code == 401:
            raise SystemExit("Strava odmítla i nově získaný token. Zkontroluj Client ID/Client Secret a autorizaci aplikace.")
        response.raise_for_status()
        batch = response.json()
        if not batch:
            break
        activities.extend(batch)
        print(f"Načteno {len(activities)} aktivit…")
        if len(batch) < 200:
            break
        page += 1

    OUT_DIR.mkdir(exist_ok=True)
    fields = ["strava_id", "date_local", "name", "type", "sport_type", "distance_km",
              "elevation_m", "moving_time_seconds", "elapsed_time_seconds", "trainer",
              "commute", "private", "gear_id", "description", "url"]
    with OUT_FILE.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for a in activities:
            start = a.get("start_date_local") or a.get("start_date") or ""
            gear = a.get("gear_id") or ""
            writer.writerow({
                "strava_id": a.get("id", ""),
                "date_local": start,
                "name": a.get("name", ""),
                "type": a.get("type", ""),
                "sport_type": a.get("sport_type", ""),
                "distance_km": round(float(a.get("distance", 0)) / 1000, 3),
                "elevation_m": round(float(a.get("total_elevation_gain", 0)), 1),
                "moving_time_seconds": a.get("moving_time", ""),
                "elapsed_time_seconds": a.get("elapsed_time", ""),
                "trainer": a.get("trainer", False),
                "commute": a.get("commute", False),
                "private": a.get("private", False),
                "gear_id": gear,
                "description": a.get("description", "") or "",
                "url": f"https://www.strava.com/activities/{a.get('id', '')}"
            })
    print(f"\nHotovo. Počet aktivit: {len(activities)}")
    print(f"CSV: {OUT_FILE}")
    print("Pozn.: skript zatím nic nezapisuje do Cyklo databáze; nejprve zkontrolujeme CSV a mapování vybavení.")

if __name__ == "__main__":
    main()
