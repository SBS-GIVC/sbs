#!/usr/bin/env python3
"""AFHAM operational CLI for local release and service workflows."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _run_command(cmd: list[str]) -> int:
    result = subprocess.run(cmd, cwd=ROOT)
    return result.returncode


def cmd_readiness(_: argparse.Namespace) -> int:
    script = ROOT / "skills" / "afham-release-readiness" / "scripts" / "run_readiness_checks.sh"
    if not script.exists():
        print(f"Readiness script not found: {script}", file=sys.stderr)
        return 2
    return _run_command(["bash", str(script)])


def cmd_service_status(_: argparse.Namespace) -> int:
    compose_file = ROOT / "docker-compose.yml"
    if not compose_file.exists():
        print("docker-compose.yml not found", file=sys.stderr)
        return 2

    try:
        proc = subprocess.run(
            ["docker", "compose", "-f", str(compose_file), "ps", "--format", "json"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        print("docker CLI is not installed or not in PATH", file=sys.stderr)
        return 2
    if proc.returncode != 0:
        print(proc.stderr.strip() or "Failed to query docker compose status", file=sys.stderr)
        return proc.returncode

    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    services = [json.loads(line) for line in lines] if lines else []

    if not services:
        print("No services are currently defined or running.")
        return 0

    print("AFHAM services status:")
    for service in services:
        print(f"- {service.get('Service', 'unknown')}: {service.get('State', 'unknown')}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="afham",
        description="AFHAM operational CLI for readiness checks and service introspection.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    readiness_parser = subparsers.add_parser("readiness", help="Run baseline AFHAM release-readiness checks")
    readiness_parser.set_defaults(func=cmd_readiness)

    status_parser = subparsers.add_parser("service-status", help="Show docker compose service state summary")
    status_parser.set_defaults(func=cmd_service_status)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
