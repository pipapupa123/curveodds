#!/usr/bin/env python3
"""Create a Panta account (or log in) and mint an API key.

Run it yourself in a terminal:  python3 scripts/panta-key.py
The password is read without echo and goes only to Panta. The key is written
to .env.local and to /opt/curveodds/env on the server (ssh alias: aeza), then
the service is restarted. Only a masked form of the key is printed.
"""
import getpass
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

BASE = "https://live-api.panta.market/api/v1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def call(method, path, body=None, headers=None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", "User-Agent": "curveodds", **(headers or {})},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, {}


def main():
    email = input("Email for Panta: ").strip()
    password = getpass.getpass("Password (min 8 chars, new or existing): ")

    status, j = call("POST", "/auth/register/", {"email": email, "password": password, "name": "CurveOdds"})
    if status == 409:
        print("Account exists, logging in…")
        status, j = call("POST", "/auth/token/", {"email": email, "password": password})
    if status not in (200, 201) or "access" not in j:
        sys.exit(f"Panta refused: {status} {j}")

    status, k = call(
        "POST", "/account/keys/", {"env": "test", "name": "curveodds"}, {"Authorization": f"Bearer {j['access']}"}
    )
    key = k.get("secret")
    if status not in (200, 201) or not key:
        sys.exit(f"Could not create key: {status} {k}")

    status, me = call("GET", "/account/", headers={"X-Api-Key": key})
    print(f"Key {key[:12]}…{key[-4:]} works: {status == 200}, can create markets: {me.get('canCreateMarkets')}")

    env_local = os.path.join(ROOT, ".env.local")
    lines = open(env_local).read().splitlines() if os.path.exists(env_local) else []
    lines = [l for l in lines if not l.startswith("PANTA_API_KEY=")] + [f"PANTA_API_KEY={key}"]
    with open(env_local, "w") as f:
        f.write("\n".join(lines) + "\n")
    print("Saved to .env.local")

    remote = (
        "read -r K; sed -i '/^PANTA_API_KEY=/d' /opt/curveodds/env; "
        "echo \"PANTA_API_KEY=$K\" >> /opt/curveodds/env; systemctl restart curveodds; systemctl is-active curveodds"
    )
    r = subprocess.run(["ssh", "aeza", remote], input=key + "\n", text=True, capture_output=True)
    print("Server updated, service:", r.stdout.strip() or r.stderr.strip())


if __name__ == "__main__":
    main()
