#!/usr/bin/env python3
"""Rebuild the bundled Portuguese place index from a pinned public CSV source."""

import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import unicodedata
import urllib.request


SOURCE_REPOSITORY = "centraldedados/codigos_postais"
SOURCE_COMMIT = "e49281814d07ee3feda27b1f1954ac263ca42b21"
SOURCE_CHECKSUMS = {
    "distritos.csv": "04786e3d8e865550098cd56199bdce3b593a5213afec9b2c570d268385d9415a",
    "concelhos.csv": "6570a89634dc078444958ddfc8992f2619cf3cb5c4ae002e64796b98277f58e1",
    "codigos_postais.csv": "464b70d3d5d6f40a286454084c3158fe48ada7a91c002f6b5129cf8066e82a3a",
}
PROJECT_ROOT = Path(__file__).resolve().parent.parent


def normalize(value):
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return " ".join("".join(c for c in decomposed if not unicodedata.combining(c)).split())


def source_rows(filename, source_dir):
    if source_dir is not None:
        payload = (source_dir / filename).read_bytes()
    else:
        url = f"https://raw.githubusercontent.com/{SOURCE_REPOSITORY}/{SOURCE_COMMIT}/data/{filename}"
        request = urllib.request.Request(url, headers={"User-Agent": "MarcasTu-location-index/1"})
        with urllib.request.urlopen(request, timeout=90) as response:
            payload = response.read()
    actual = hashlib.sha256(payload).hexdigest()
    expected = SOURCE_CHECKSUMS[filename]
    if actual != expected:
        raise ValueError(f"Checksum mismatch for {filename}: expected {expected}, got {actual}")
    return csv.DictReader(io.StringIO(payload.decode("utf-8-sig")))


def build_dataset(source_dir=None):
    districts = {}
    for row in source_rows("distritos.csv", source_dir):
        code = row["cod_distrito"].zfill(2)
        if 1 <= int(code) <= 18:
            region = "Continente"
        elif code in {"31", "32"}:
            region = "Madeira"
        elif 41 <= int(code) <= 49:
            region = "Açores"
        else:
            raise ValueError(f"Unrecognised postal geographic group: {code}")
        districts[code] = [code, row["nome_distrito"].strip(), region]

    municipalities = {}
    for row in source_rows("concelhos.csv", source_dir):
        district = row["cod_distrito"].zfill(2)
        code = district + row["cod_concelho"].zfill(2)
        if district not in districts or code in municipalities:
            raise ValueError(f"Invalid or duplicate municipality: {code}")
        municipalities[code] = [code, row["nome_concelho"].strip()]
    if len(municipalities) != 308:
        raise ValueError(f"Expected 308 municipalities, found {len(municipalities)}")

    localities = {}
    postal_row_count = 0
    seats_merged = set()
    for row in source_rows("codigos_postais.csv", source_dir):
        postal_row_count += 1
        municipality = row["cod_distrito"].zfill(2) + row["cod_concelho"].zfill(2)
        if municipality not in municipalities:
            raise ValueError(f"Locality references an unknown municipality: {municipality}")
        name = " ".join(row["nome_localidade"].split())
        if not name:
            continue
        normalized_name = normalize(name)
        if normalized_name == normalize(municipalities[municipality][1]):
            seats_merged.add((municipality, normalized_name))
            continue
        postal_code = row["cod_localidade"].strip()
        if not postal_code.isdigit():
            raise ValueError(f"Invalid locality identifier: {postal_code!r}")
        key = (municipality, normalized_name)
        candidate = [municipality, postal_code, name]
        previous = localities.get(key)
        # Repeated street/client rows represent the same locality. A stable,
        # smallest source locality code also merges spelling/case duplicates.
        if previous is None or (int(postal_code), name) < (int(previous[1]), previous[2]):
            localities[key] = candidate

    dataset = {
        "schemaVersion": 1,
        "source": {
            "repository": f"https://github.com/{SOURCE_REPOSITORY}",
            "commit": SOURCE_COMMIT,
            "license": "PDDL-1.0",
            "sourceRows": postal_row_count,
            "mergedMunicipalitySeats": len(seats_merged),
            "sha256": SOURCE_CHECKSUMS,
        },
        # Compact tuples avoid repeating municipality/district strings and
        # display labels tens of thousands of times in the browser bundle.
        "districts": sorted(districts.values()),
        "municipalities": sorted(municipalities.values()),
        "localities": sorted(localities.values(), key=lambda row: (row[0], int(row[1]), row[2])),
    }
    return dataset


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path, help="Read the three original CSVs locally; checksums remain mandatory")
    parser.add_argument("--output", type=Path, default=PROJECT_ROOT / "src/locations-data.json")
    parser.add_argument("--check", action="store_true", help="Compare the generated dataset without changing files")
    args = parser.parse_args()
    dataset = build_dataset(args.source_dir)
    payload = (json.dumps(dataset, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    if args.check:
        if not args.output.exists() or args.output.read_bytes() != payload:
            print(f"Location dataset is out of date: {args.output}", file=sys.stderr)
            return 1
        print(f"Location dataset is reproducible: {args.output}")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(payload)
    print(f"308 municipalities; {len(dataset['localities'])} localities; {len(payload):,} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
