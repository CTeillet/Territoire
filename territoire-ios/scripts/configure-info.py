#!/usr/bin/env python3
"""Configure public diagnostic metadata; accepts protocol names, never shell code."""
import os
from pathlib import Path
import plistlib
import re
import sys


def configure(path: Path, extra_protocols: str, commit: str) -> None:
    extras = [value.strip() for value in extra_protocols.split(",") if value.strip()]
    if len(extras) > 5 or any(
        len(value) > 160
        or re.fullmatch(r"[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+", value) is None
        for value in extras
    ):
        raise ValueError("Au plus 5 noms de protocole reverse-DNS, séparés par des virgules.")
    with path.open("rb") as source:
        info = plistlib.load(source)
    protocols = info.get("UISupportedExternalAccessoryProtocols", [])
    info["UISupportedExternalAccessoryProtocols"] = list(dict.fromkeys(protocols + extras))
    info["TMSDiagnosticCommit"] = commit[:40]
    with path.open("wb") as output:
        plistlib.dump(info, output, fmt=plistlib.FMT_XML, sort_keys=False)
    print("Protocoles déclarés :", ", ".join(info["UISupportedExternalAccessoryProtocols"]))


if __name__ == "__main__":
    try:
        configure(
            Path(sys.argv[1]),
            os.environ.get("DIAGNOSTIC_EXTRA_PROTOCOLS", ""),
            os.environ.get("GITHUB_SHA", "local"),
        )
    except (ValueError, OSError, IndexError) as error:
        sys.exit(str(error))
