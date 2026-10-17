import base64, csv, os, requests
from datetime import datetime, timezone
from pathlib import Path
from nacl.public import PublicKey, SealedBox

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'strava_activities_2025_2026.csv'
CID = os.environ['STRAVA_CLIENT_ID']
SECRET = os.environ['STRAVA_CLIENT_SECRET']
REFRESH = os.environ['STRAVA_REFRESH_TOKEN']
REPO = os.environ.get('GITHUB_REPOSITORY', '')
GH_TOKEN = os.environ.get('GH_SECRETS_TOKEN', '')

response = requests.post('https://www.strava.com/oauth/token', data={
    'client_id': CID, 'client_secret': SECRET, 'refresh_token': REFRESH,
    'grant_type': 'refresh_token'
}, timeout=30)
response.raise_for_status()
tokens = response.json()
access_token = tokens['access_token']
new_refresh_token = tokens.get('refresh_token', REFRESH)

headers = {'Authorization': f'Bearer {access_token}'}
after = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())
before = int(datetime(2027, 1, 1, tzinfo=timezone.utc).timestamp())
rows, page = [], 1
while True:
    response = requests.get('https://www.strava.com/api/v3/athlete/activities', headers=headers,
        params={'after': after, 'before': before, 'page': page, 'per_page': 200}, timeout=30)
    response.raise_for_status()
    batch = response.json()
    if not batch:
        break
    for activity in batch:
        rows.append({
            'strava_id': activity.get('id', ''), 'date_local': activity.get('start_date_local', ''),
            'name': activity.get('name', ''), 'type': activity.get('type', ''),
            'sport_type': activity.get('sport_type', ''),
            'distance_km': round(float(activity.get('distance', 0)) / 1000, 3),
            'elevation_m': activity.get('total_elevation_gain', 0),
            'moving_time_seconds': activity.get('moving_time', 0),
            'elapsed_time_seconds': activity.get('elapsed_time', 0),
            'trainer': activity.get('trainer', False), 'commute': activity.get('commute', False),
            'private': activity.get('private', False), 'gear_id': activity.get('gear_id', ''),
            'description': activity.get('description', ''),
            'url': f"https://www.strava.com/activities/{activity.get('id', '')}"
        })
    if len(batch) < 200:
        break
    page += 1
OUT.parent.mkdir(parents=True, exist_ok=True)
fields = ['strava_id','date_local','name','type','sport_type','distance_km','elevation_m',
          'moving_time_seconds','elapsed_time_seconds','trainer','commute','private','gear_id','description','url']
with OUT.open('w', newline='', encoding='utf-8-sig') as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)
print(f'Zapsáno {len(rows)} aktivit do {OUT}')

# Strava rotates refresh tokens. Persist the replacement in GitHub Actions secrets, encrypted
# with GitHub's repository public key. GH_SECRETS_TOKEN must have repository Actions: write.
if new_refresh_token != REFRESH:
    if not REPO or not GH_TOKEN:
        raise RuntimeError('Strava obnovila refresh token, ale chybí GH_SECRETS_TOKEN pro bezpečné uložení nového tokenu.')
    gh_headers = {'Authorization': f'Bearer {GH_TOKEN}', 'Accept': 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28'}
    base = f'https://api.github.com/repos/{REPO}/actions/secrets'
    key_response = requests.get(base + '/public-key', headers=gh_headers, timeout=30)
    key_response.raise_for_status()
    key_data = key_response.json()
    public_key = PublicKey(base64.b64decode(key_data['key']))
    encrypted = base64.b64encode(SealedBox(public_key).encrypt(new_refresh_token.encode('utf-8'))).decode('ascii')
    save_response = requests.put(base + '/STRAVA_REFRESH_TOKEN', headers=gh_headers,
        json={'encrypted_value': encrypted, 'key_id': key_data['key_id']}, timeout=30)
    save_response.raise_for_status()
    print('Obnovovací token byl bezpečně aktualizován v GitHub Secrets.')
else:
    print('Obnovovací token zůstal beze změny.')
