#!/usr/bin/env python3
"""Check GitHub repository webhooks for Slack or other webhook URLs.

Usage:
  export GITHUB_TOKEN=ghp_xxx  # or use a PAT with `repo` and `admin:repo_hook` scopes
  python scripts/check_repo_webhooks.py --owner SBS-GIVC --repo sbs

Output: prints found webhooks and highlights any that reference Slack or hooks.slack.com
"""

import argparse
import os
import sys
import requests


def list_webhooks(owner: str, repo: str, token: str):
    url = f"https://api.github.com/repos/{owner}/{repo}/hooks"
    headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Check repository webhooks for Slack references")
    parser.add_argument("--owner", required=True)
    parser.add_argument("--repo", required=True)
    parser.add_argument("--token", help="GitHub token (alternatively set GITHUB_TOKEN env var)")
    args = parser.parse_args()

    token = args.token or os.getenv("GITHUB_TOKEN")
    if not token:
        print("Error: GitHub token required. Set GITHUB_TOKEN or pass --token.", file=sys.stderr)
        sys.exit(2)

    try:
        hooks = list_webhooks(args.owner, args.repo, token)
    except Exception as e:
        print(f"Failed to list webhooks: {e}", file=sys.stderr)
        sys.exit(3)

    if not hooks:
        print("No webhooks found for repository.")
        return

    print(f"Found {len(hooks)} webhooks for {args.owner}/{args.repo}:")
    flagged = []
    for h in hooks:
        config = h.get("config", {})
        url = config.get("url") or config.get("payload_url") or config.get("insecure_ssl")
        events = ",".join(h.get("events", []))
        active = h.get("active", True)
        print("\n---")
        print(f"ID: {h.get('id')}")
        print(f"Name: {h.get('name')}")
        print(f"URL: {url}")
        print(f"Events: {events}")
        print(f"Active: {active}")

        # Simple heuristics to flag potential Slack or CI webhook
        if url and ("hooks.slack.com" in url or "slack" in url.lower() or "n8n" in url.lower()):
            flagged.append((h.get('id'), url))

    if flagged:
        print("\n\nPotential Slack or n8n webhooks detected:")
        for fid, furl in flagged:
            print(f" - ID {fid}: {furl}")
        print("\nTo remove a webhook run: curl -X DELETE -H \"Authorization: token $GITHUB_TOKEN\" https://api.github.com/repos/OWNER/REPO/hooks/HOOK_ID")
    else:
        print("\nNo Slack-like webhooks detected.")


if __name__ == "__main__":
    main()
