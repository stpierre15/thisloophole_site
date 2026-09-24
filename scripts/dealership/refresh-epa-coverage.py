#!/usr/bin/env python3
"""Refresh the pinned 2026 US EPA model/powertrain coverage from vehicles.csv.

Download https://www.fueleconomy.gov/feg/epadata/vehicles.csv first, then pass
its local path to this script. EPA coverage is a research roster, not proof of
current retail availability or recommendation eligibility.
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "data/dealership/epa-catalog.json"
REFERENCE = ROOT / "data/dealership/epa-reference.json"
ROSTER = ROOT / "data/dealership/epa-model-roster.json"


def canonical(row):
    make = "Mini" if row["make"] in ("Mini", "MINI") else row["make"]
    model = row["baseModel"]
    rated = row["model"]
    if make == "BMW" and model == "M":
        model = re.match(r"M[2-5]\b", rated).group()
    elif make == "Audi" and model == "RS":
        model = re.match(r"RS [367]\b", rated).group()
    elif make == "Audi" and model in ("RS e-tron", "S e-tron"):
        model += " GT"
    elif make == "Ford" and model == "F150":
        model = "F-150"
    elif make == "Volkswagen" and model == "Golf/GTI":
        model = "Golf R" if rated.startswith("Golf R") else "Golf GTI"
    elif make == "Volkswagen" and model == "GLI":
        model = "Jetta GLI"
    elif make == "Chevrolet" and model in ("Blazer", "Equinox", "Silverado") and " EV" in rated:
        model += " EV"
    elif make == "GMC" and model == "Sierra" and " EV" in rated.upper():
        model = "Sierra EV"
    elif make == "GMC" and model == "Yukon" and rated.startswith("Yukon XL"):
        model = "Yukon XL"
    elif make == "Toyota" and model == "bZ" and "Woodland" in rated:
        model = "bZ Woodland"
    elif make == "Toyota" and model == "Corolla":
        if rated.startswith("GR Corolla"):
            model = "GR Corolla"
        elif rated.startswith("Corolla Hatchback"):
            model = "Corolla Hatchback"
    elif make == "Jeep":
        if model == "Wagoneer" and rated.startswith("Wagoneer S"):
            model = "Wagoneer S"
        elif model in ("Grand Cherokee", "Grand Wagoneer") and rated.startswith(model + " L "):
            model += " L"
    elif make == "Land Rover":
        if model == "Range Rover":
            for name in ("Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"):
                if rated.startswith(name):
                    model = name
                    break
        elif model == "Defender":
            match = re.match(r"Defender (90|110|130)\b", rated)
            if match:
                model = "Defender " + match.group(1)
    elif make == "Volkswagen" and model == "Atlas" and rated.startswith("Atlas Cross Sport"):
        model = "Atlas Cross Sport"
    elif make == "Kia" and model == "K4" and rated.startswith("K4 Hatchback"):
        model = "K4 Hatchback"
    elif make == "Honda" and model == "Civic" and rated.startswith("Civic 5Dr"):
        model = "Civic Hatchback"
    elif make == "Mercedes-Benz" and model in ("EQE", "EQS") and "(SUV)" in rated:
        model += " SUV"
    return make, model


def powertrain(row):
    return {
        "": "Gas", "Hybrid": "Hybrid", "Plug-in Hybrid": "Plug-in hybrid",
        "EV": "Electric", "Diesel": "Diesel", "FFV": "Flex fuel",
        "FCV": "Hydrogen fuel cell", "eFCV": "Plug-in fuel cell",
    }[row["atvType"]]


def fuel(row):
    value = row["fuelType"]
    if value.startswith("Premium"):
        return "Premium Gasoline"
    if value.startswith("Regular"):
        return "Regular Gasoline"
    return {
        "Midgrade": "Midgrade Gasoline", "Diesel": "Diesel",
        "Gasoline or E85": "Flex fuel", "Hydrogen": "Hydrogen",
        "Electricity and Hydrogen": "Electricity and Hydrogen", "Electricity": "Electricity",
    }[value]


def body_style(row):
    value = row["VClass"]
    if "Sport Utility" in value:
        return "SUV"
    if "Pickup" in value:
        return "Pickup"
    if "Minivan" in value:
        return "Minivan"
    if "Station Wagon" in value:
        return "Wagon"
    if value == "Two Seaters":
        return "Coupe"
    return "Sedan"


def as_number(value):
    return float(value) if "." in value else int(value)


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def new_record(row):
    make, model = canonical(row)
    pt = powertrain(row)
    electric = pt == "Electric"
    plug_in = pt == "Plug-in hybrid"
    return {
        "id": slug(f"{make}-{model}-{pt}"), "make": make, "model": model,
        "year": 2026, "bodyStyle": body_style(row), "startingMSRP": None,
        "powertrain": pt, "fuelType": fuel(row), "seats": None,
        "mpgCombined": None if electric else as_number(row["comb08"]),
        "mpgeCombined": as_number(row["comb08"] if electric else row["combA08"]) if electric or plug_in else None,
        "evRange": as_number(row["range"] if electric else row["rangeA"]) if (electric or plug_in) and (row["range"] if electric else row["rangeA"]) else None,
        "cargoSpace": None, "towingCapacity": None, "drivetrain": row["drive"],
        "awdAvailable": row["drive"] in ("All-Wheel Drive", "4-Wheel Drive"),
        "groundClearance": None, "horsepower": None, "zeroToSixty": None,
        "estimatedResaleStrength": None, "reliabilityCategory": None,
        "safetyRating": None, "length": None, "width": None, "height": None,
        "wheelbase": None, "curbWeight": None, "shortStrengths": [],
        "shortWeaknesses": [],
        "sourceUrl": f'https://www.fueleconomy.gov/ws/rest/vehicle/{row["id"]}',
        "epaId": row["id"], "dataStatus": "EPA-rated; retail and dimensions unverified",
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: refresh-epa-coverage.py /path/to/vehicles.csv")
    with open(sys.argv[1], newline="") as handle:
        rows = [row for row in csv.DictReader(handle) if row["year"] == "2026"]
    by_id = {row["id"]: row for row in rows}
    catalog = json.loads(CATALOG.read_text())
    reference = json.loads(REFERENCE.read_text())
    for car in catalog:
        if car["epaId"] is None:
            continue
        row = by_id.get(car["epaId"])
        if row is None:
            raise ValueError(f'{car["id"]}: EPA source row missing from current CSV')
        make, model = canonical(row)
        if car["dataStatus"] != "verified-eligible":
            car["make"], car["model"] = make, model
    groups = defaultdict(list)
    for row in rows:
        make, model = canonical(row)
        groups[(make, model, powertrain(row))].append(row)
    covered = {(car["make"], car["model"], car["powertrain"]) for car in catalog}
    ids = {car["id"] for car in catalog}
    added = []
    roster = []
    for (make, model, pt), choices in sorted(groups.items()):
        choices.sort(key=lambda row: (0 if row["model"].lower().startswith(model.lower()) else 1, int(row["id"])))
        chosen = choices[0]
        roster.append({"make": make, "model": model, "powertrain": pt, "epaIds": [r["id"] for r in choices]})
        if (make, model, pt) in covered:
            continue
        record = new_record(chosen)
        if record["id"] in ids:
            raise ValueError(f'duplicate catalog id: {record["id"]}')
        ids.add(record["id"])
        catalog.append(record)
        reference[chosen["id"]] = {key: chosen[key] for key in ("year", "make", "model", "drive", "fuelType", "comb08", "combA08", "range", "rangeA", "atvType")}
        added.append(record)
    CATALOG.write_text(json.dumps(catalog, indent=2) + "\n")
    REFERENCE.write_text(json.dumps(reference, indent=2) + "\n")
    ROSTER.write_text(json.dumps(roster, indent=2) + "\n")
    (ROOT / "data/dealership/catalog.mjs").write_text("export const catalog = " + json.dumps(catalog, separators=(",", ":"), ensure_ascii=False) + ";\n")
    print(f"EPA 2026: {len(rows)} configurations, {len(groups)} model/powertrain groups; added {len(added)} records. Catalog: {len(catalog)} records.")


if __name__ == "__main__":
    main()
