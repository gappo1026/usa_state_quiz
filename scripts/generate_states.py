#!/usr/bin/env python3
"""Convert Natural Earth / datasets geo-admin1-us GeoJSON into quiz state data."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GEOJSON = Path(__file__).with_name("admin1-us.geojson")
OUT = ROOT / "js" / "states-data.js"

TARGET_SIZE = 320.0
PADDING = 16.0

MAP_W = 960.0
MAP_H = 540.0

FACTS = {
    "AL": "Alabama is known as the Heart of Dixie and is famous for its Civil Rights history and Gulf Coast beaches.",
    "AK": "Alaska is the largest U.S. state by area and home to Denali, North America's highest peak.",
    "AZ": "Arizona contains the Grand Canyon, one of the world's most famous natural landmarks.",
    "AR": "Arkansas is nicknamed the Natural State for its forests, rivers, and hot springs.",
    "CA": "California has the largest population of any U.S. state and includes Silicon Valley and Hollywood.",
    "CO": "Colorado is known for the Rocky Mountains and the mile-high city of Denver.",
    "CT": "Connecticut is one of the original 13 colonies and is known for insurance and maritime history.",
    "DE": "Delaware was the first state to ratify the U.S. Constitution in 1787.",
    "FL": "Florida is famous for its beaches, Everglades, and being the southernmost contiguous state.",
    "GA": "Georgia is known for peaches, Atlanta, and being a major hub of the Civil Rights Movement.",
    "HI": "Hawaii is an archipelago in the Pacific and the only U.S. state made entirely of islands.",
    "ID": "Idaho is famous for potatoes and dramatic landscapes like the Sawtooth Mountains.",
    "IL": "Illinois is home to Chicago, a major Midwest hub on Lake Michigan.",
    "IN": "Indiana is known for the Indianapolis 500 and its strong basketball culture.",
    "IA": "Iowa is a leading agricultural state, especially for corn and soybeans.",
    "KS": "Kansas sits in America's heartland and is known for wheat fields and prairie landscapes.",
    "KY": "Kentucky is famous for bourbon, horse racing, and the Kentucky Derby.",
    "LA": "Louisiana is known for New Orleans, jazz, Creole cuisine, and the Mississippi River delta.",
    "ME": "Maine is the easternmost state and is famous for lobsters and rugged Atlantic coastline.",
    "MD": "Maryland surrounds much of Chesapeake Bay and includes the U.S. capital region's edge.",
    "MA": "Massachusetts was central to the American Revolution and is home to Boston and many universities.",
    "MI": "Michigan is shaped by the Great Lakes and is a historic center of the auto industry.",
    "MN": "Minnesota is called the Land of 10,000 Lakes and is the source of the Mississippi River.",
    "MS": "Mississippi is named for the great river that forms much of its western border.",
    "MO": "Missouri is nicknamed the Show-Me State and sits at the crossroads of the Midwest.",
    "MT": "Montana is known as Big Sky Country for its vast plains and Rocky Mountain scenery.",
    "NE": "Nebraska is a Great Plains state known for agriculture and the city of Omaha.",
    "NV": "Nevada is the driest U.S. state and is famous for Las Vegas and desert landscapes.",
    "NH": "New Hampshire was the first state with its own constitution and is known for autumn foliage.",
    "NJ": "New Jersey is densely populated and nicknamed the Garden State.",
    "NM": "New Mexico blends Native American, Hispanic, and Western cultures amid high desert scenery.",
    "NY": "New York includes New York City and Niagara Falls, plus mountains and lakes upstate.",
    "NC": "North Carolina stretches from the Appalachian Mountains to the Atlantic Outer Banks.",
    "ND": "North Dakota is a northern Plains state known for agriculture and energy production.",
    "OH": "Ohio is a Midwest industrial and agricultural state and a historic swing state in elections.",
    "OK": "Oklahoma has a rich Native American heritage and is known for plains and oil history.",
    "OR": "Oregon is known for forests, the Cascade Range, and a dramatic Pacific coastline.",
    "PA": "Pennsylvania played a key role in founding the United States and is home to Philadelphia.",
    "RI": "Rhode Island is the smallest U.S. state and has a long maritime and colonial history.",
    "SC": "South Carolina is known for historic Charleston and its Atlantic beaches.",
    "SD": "South Dakota is home to Mount Rushmore and the Badlands.",
    "TN": "Tennessee is famous for music cities Nashville and Memphis, plus the Great Smoky Mountains.",
    "TX": "Texas is the second-largest state by both area and population, with diverse regions and cities.",
    "UT": "Utah is known for national parks, red-rock deserts, and world-class skiing near Salt Lake City.",
    "VT": "Vermont is famous for maple syrup, green mountains, and small historic towns.",
    "VA": "Virginia was central to early American history and stretches from the Atlantic to the Appalachians.",
    "WA": "Washington is known for Seattle, evergreen forests, and the Cascade and Olympic mountains.",
    "WV": "West Virginia is mountainous and known for Appalachian culture and outdoor recreation.",
    "WI": "Wisconsin is famous for dairy farming, cheese, and its Great Lakes shoreline.",
    "WY": "Wyoming is the least populous state and home to Yellowstone, the first U.S. national park.",
}

CAPITALS = {
    "AL": "Montgomery", "AK": "Juneau", "AZ": "Phoenix", "AR": "Little Rock",
    "CA": "Sacramento", "CO": "Denver", "CT": "Hartford", "DE": "Dover",
    "FL": "Tallahassee", "GA": "Atlanta", "HI": "Honolulu", "ID": "Boise",
    "IL": "Springfield", "IN": "Indianapolis", "IA": "Des Moines", "KS": "Topeka",
    "KY": "Frankfort", "LA": "Baton Rouge", "ME": "Augusta", "MD": "Annapolis",
    "MA": "Boston", "MI": "Lansing", "MN": "Saint Paul", "MS": "Jackson",
    "MO": "Jefferson City", "MT": "Helena", "NE": "Lincoln", "NV": "Carson City",
    "NH": "Concord", "NJ": "Trenton", "NM": "Santa Fe", "NY": "Albany",
    "NC": "Raleigh", "ND": "Bismarck", "OH": "Columbus", "OK": "Oklahoma City",
    "OR": "Salem", "PA": "Harrisburg", "RI": "Providence", "SC": "Columbia",
    "SD": "Pierre", "TN": "Nashville", "TX": "Austin", "UT": "Salt Lake City",
    "VT": "Montpelier", "VA": "Richmond", "WA": "Olympia", "WV": "Charleston",
    "WI": "Madison", "WY": "Cheyenne",
}

REGIONS = {
    "CT": "Northeast", "ME": "Northeast", "MA": "Northeast", "NH": "Northeast",
    "NJ": "Northeast", "NY": "Northeast", "PA": "Northeast", "RI": "Northeast",
    "VT": "Northeast",
    "IL": "Midwest", "IN": "Midwest", "IA": "Midwest", "KS": "Midwest",
    "MI": "Midwest", "MN": "Midwest", "MO": "Midwest", "NE": "Midwest",
    "ND": "Midwest", "OH": "Midwest", "SD": "Midwest", "WI": "Midwest",
    "AL": "South", "AR": "South", "DE": "South", "FL": "South", "GA": "South",
    "KY": "South", "LA": "South", "MD": "South", "MS": "South", "NC": "South",
    "OK": "South", "SC": "South", "TN": "South", "TX": "South", "VA": "South",
    "WV": "South",
    "AK": "West", "AZ": "West", "CA": "West", "CO": "West", "HI": "West",
    "ID": "West", "MT": "West", "NV": "West", "NM": "West", "OR": "West",
    "UT": "West", "WA": "West", "WY": "West",
}


def project(lon: float, lat: float) -> tuple[float, float]:
    return lon, -lat


def iter_rings(geometry: dict):
    gtype = geometry["type"]
    coords = geometry["coordinates"]
    if gtype == "Polygon":
        for ring in coords:
            yield ring
    elif gtype == "MultiPolygon":
        for polygon in coords:
            for ring in polygon:
                yield ring
    else:
        raise ValueError(f"Unsupported geometry type: {gtype}")


def geometry_points(geometry: dict) -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = []
    for ring in iter_rings(geometry):
        for lon, lat in ring:
            pts.append(project(lon, lat))
    return pts


def transform_ring(ring: list[list[float]], scale: float, ox: float, oy: float) -> str:
    parts: list[str] = []
    for i, (lon, lat) in enumerate(ring):
        x, y = project(lon, lat)
        tx = x * scale + ox
        ty = y * scale + oy
        cmd = "M" if i == 0 else "L"
        parts.append(f"{cmd}{tx:.2f},{ty:.2f}")
    parts.append("Z")
    return "".join(parts)


def geometry_to_transformed_path(geometry: dict, scale: float, ox: float, oy: float) -> str:
    return "".join(transform_ring(ring, scale, ox, oy) for ring in iter_rings(geometry))


def geometry_to_raw_path(geometry: dict) -> str:
    return geometry_to_transformed_path(geometry, 1.0, 0.0, 0.0)


def path_bounds(path: str) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []
    tokens = path.replace("M", " M").replace("L", " L").replace("Z", " Z").split()
    for token in tokens:
        if not token or token == "Z":
            continue
        if token[0] in {"M", "L"}:
            x_str, y_str = token[1:].split(",")
            xs.append(float(x_str))
            ys.append(float(y_str))
    return min(xs), min(ys), max(xs), max(ys)


def normalize_path(path: str) -> tuple[str, str]:
    min_x, min_y, max_x, max_y = path_bounds(path)
    width = max(max_x - min_x, 1e-6)
    height = max(max_y - min_y, 1e-6)
    scale = (TARGET_SIZE - 2 * PADDING) / max(width, height)
    offset_x = (TARGET_SIZE - width * scale) / 2 - min_x * scale
    offset_y = (TARGET_SIZE - height * scale) / 2 - min_y * scale

    tokens = path.replace("M", " M").replace("L", " L").replace("Z", " Z").split()
    out: list[str] = []
    for token in tokens:
        if not token:
            continue
        if token == "Z":
            out.append("Z")
            continue
        cmd = token[0]
        x_str, y_str = token[1:].split(",")
        x = float(x_str) * scale + offset_x
        y = float(y_str) * scale + offset_y
        out.append(f"{cmd}{x:.2f},{y:.2f}")

    return "".join(out), f"0 0 {TARGET_SIZE:.0f} {TARGET_SIZE:.0f}"


def fit_transform(points: list[tuple[float, float]], box: tuple[float, float, float, float]):
    """Return scale, ox, oy that maps points into box (x, y, w, h)."""
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(max_x - min_x, 1e-6)
    height = max(max_y - min_y, 1e-6)
    bx, by, bw, bh = box
    scale = min(bw / width, bh / height)
    ox = bx + (bw - width * scale) / 2 - min_x * scale
    oy = by + (bh - height * scale) / 2 - min_y * scale
    return scale, ox, oy


def main() -> None:
    data = json.loads(GEOJSON.read_text(encoding="utf-8"))
    features: dict[str, dict] = {}

    for feature in data["features"]:
        props = feature["properties"]
        code = props["state_code"]
        name = props["name"]
        if code == "DC" or name == "District of Columbia":
            continue
        if code not in FACTS or code not in CAPITALS or code not in REGIONS:
            raise SystemExit(f"Missing metadata for {code} ({name})")
        features[code] = feature

    if len(features) != 50:
        raise SystemExit(f"Expected 50 features, got {len(features)}")

    contiguous_pts: list[tuple[float, float]] = []
    for code, feature in features.items():
        if code in {"AK", "HI"}:
            continue
        contiguous_pts.extend(geometry_points(feature["geometry"]))

    # Main lower-48 area, with room for AK/HI insets at bottom-left.
    main_scale, main_ox, main_oy = fit_transform(
        contiguous_pts, (20.0, 10.0, MAP_W - 40.0, MAP_H - 130.0)
    )

    ak_pts = geometry_points(features["AK"]["geometry"])
    hi_pts = geometry_points(features["HI"]["geometry"])
    ak_scale, ak_ox, ak_oy = fit_transform(ak_pts, (20.0, MAP_H - 115.0, 210.0, 100.0))
    hi_scale, hi_ox, hi_oy = fit_transform(hi_pts, (250.0, MAP_H - 95.0, 150.0, 80.0))

    states = []
    map_paths = []

    for code in sorted(features.keys(), key=lambda c: features[c]["properties"]["name"]):
        feature = features[code]
        name = feature["properties"]["name"]
        geom = feature["geometry"]

        silhouette, view_box = normalize_path(geometry_to_raw_path(geom))

        if code == "AK":
            map_path = geometry_to_transformed_path(geom, ak_scale, ak_ox, ak_oy)
        elif code == "HI":
            map_path = geometry_to_transformed_path(geom, hi_scale, hi_ox, hi_oy)
        else:
            map_path = geometry_to_transformed_path(geom, main_scale, main_ox, main_oy)

        states.append(
            {
                "id": code,
                "name": name,
                "path": silhouette,
                "viewBox": view_box,
                "fact": FACTS[code],
                "capital": CAPITALS[code],
                "region": REGIONS[code],
            }
        )
        map_paths.append({"id": code, "path": map_path})

    us_map = {
        "viewBox": f"0 0 {MAP_W:.0f} {MAP_H:.0f}",
        "paths": map_paths,
    }

    js = (
        "/* Generated from Natural Earth via datasets/geo-admin1-us (PDDL / public domain).\n"
        " * Do not edit by hand; re-run scripts/generate_states.py instead.\n"
        " */\n"
        "window.US_STATES = "
        + json.dumps(states, ensure_ascii=False, indent=2)
        + ";\n"
        "window.US_MAP = "
        + json.dumps(us_map, ensure_ascii=False, indent=2)
        + ";\n"
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(js, encoding="utf-8")
    print(f"Wrote {OUT} with {len(states)} states and locator map")


if __name__ == "__main__":
    main()
