from __future__ import annotations

import json
import math
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import urlopen

import pandas as pd

try:
    import fastf1
except ImportError:
    print("FastF1 is not installed. Run: python -m pip install -r requirements-fastf1.txt")
    raise

ROOT = Path.cwd()
CACHE_ROOT = ROOT / "data" / "openf1-cache"
FASTF1_HTTP_CACHE = ROOT / "data" / "fastf1-http-cache"


def norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9а-я]", "", str(value or "").lower().replace("grand prix", "").replace("race", ""))


def to_jsonable(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, bool, int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return value
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    if hasattr(value, "total_seconds"):
        try:
            return float(value.total_seconds())
        except Exception:
            return str(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def result_position(value: Any) -> int | None:
    value = to_jsonable(value)
    try:
        parsed = int(float(value))
        return parsed if parsed > 0 else None
    except Exception:
        return None


def fetch_openf1_sessions(year: int) -> list[dict[str, Any]]:
    try:
        with urlopen(f"https://api.openf1.org/v1/sessions?year={year}", timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
        return [item for item in data if item.get("session_name") == "Race"]
    except Exception:
        return []


def find_openf1_session(event: Any, openf1_sessions: list[dict[str, Any]]) -> dict[str, Any] | None:
    best = None
    best_score = 0
    for session in openf1_sessions:
        text = norm(f"{session.get('meeting_name', '')} {session.get('location', '')} {session.get('country_name', '')}")
        score = 0
        for token in [norm(event.get("EventName")), norm(event.get("Location")), norm(event.get("Country"))]:
            if token and (token in text or text in token):
                score += 1
        if score > best_score:
            best = session
            best_score = score
    return best if best_score > 0 else None


def fallback_session(event: Any, year: int) -> dict[str, Any]:
    round_number = int(event.get("RoundNumber", 0) or 0)
    return {
        "session_key": int(f"{year}{round_number:02d}"),
        "session_name": "Race",
        "session_type": "Race",
        "meeting_key": round_number,
        "meeting_name": str(event.get("EventName", f"Round {round_number}")),
        "location": str(event.get("Location", "—")),
        "country_name": str(event.get("Country", "—")),
        "circuit_short_name": str(event.get("OfficialEventName", event.get("EventName", "—"))),
        "year": year,
        "date_start": to_jsonable(event.get("Session5DateUtc")) or to_jsonable(event.get("EventDate")),
        "date_end": None,
        "gmt_offset": None,
    }


def read_dashboard(session_key: int) -> dict[str, Any]:
    path = CACHE_ROOT / "race-dashboard" / f"{session_key}.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload.get("data", payload)
    except Exception:
        return {}


def write_dashboard(session_key: int, data: dict[str, Any]) -> None:
    path = CACHE_ROOT / "race-dashboard" / f"{session_key}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"savedAt": datetime.now(timezone.utc).isoformat(), "url": None, "data": data}, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_points(pos: pd.DataFrame, driver_number: int | None, max_points: int = 1800) -> list[dict[str, Any]]:
    if pos is None or pos.empty or "X" not in pos.columns or "Y" not in pos.columns:
        return []

    xs = pos["X"].astype(float).tolist()
    ys = pos["Y"].astype(float).tolist()
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    width = max(max_x - min_x, 1)
    height = max(max_y - min_y, 1)
    step = max(len(pos) // max_points, 1)

    points = []
    for _, row in pos.iloc[::step].iterrows():
        points.append(
            {
                "date": to_jsonable(row.get("Time")),
                "driver_number": driver_number,
                "x": round(((float(row.get("X")) - min_x) / width) * 100, 3),
                "y": round(((float(row.get("Y")) - min_y) / height) * 100, 3),
                "z": to_jsonable(row.get("Z")),
            }
        )
    return points


def circuit_corners(session: Any) -> list[dict[str, Any]]:
    try:
        circuit_info = session.get_circuit_info()
        corners = getattr(circuit_info, "corners", None)
        if corners is None or corners.empty:
            return []
        result = []
        for _, row in corners.iterrows():
            result.append(
                {
                    "number": to_jsonable(row.get("Number")),
                    "letter": to_jsonable(row.get("Letter")),
                    "angle": to_jsonable(row.get("Angle")),
                    "distance": to_jsonable(row.get("Distance")),
                    "x": to_jsonable(row.get("X")),
                    "y": to_jsonable(row.get("Y")),
                }
            )
        return result
    except Exception:
        return []


def build_track_map(session: Any) -> dict[str, Any]:
    laps = getattr(session, "laps", pd.DataFrame())
    if laps is None or laps.empty:
        return {"source_driver_number": None, "source_driver_name": None, "points": [], "corners": [], "note": "FastF1 не вернул laps, поэтому position map недоступна."}

    candidates = []
    try:
        candidates.append(laps.pick_fastest())
    except Exception:
        pass

    # Fallback: try first laps with valid lap time. Some races have broken fastest-lap metadata.
    try:
        timed_laps = laps[laps["LapTime"].notna()] if "LapTime" in laps.columns else laps
        for _, lap in timed_laps.head(8).iterrows():
            candidates.append(lap)
    except Exception:
        pass

    last_error = "no candidate lap"
    for lap in candidates:
        try:
            driver_number = result_position(lap.get("DriverNumber"))
            pos = lap.get_pos_data()
            points = normalize_points(pos, driver_number)
            if points:
                return {
                    "source_driver_number": driver_number,
                    "source_driver_name": to_jsonable(lap.get("Driver")) or to_jsonable(lap.get("Team")),
                    "points": points,
                    "corners": circuit_corners(session),
                    "note": "Карта построена из FastF1 position data по одному кругу. Это реальные координаты телеметрии, сохранённые локально.",
                }
        except Exception as exc:
            last_error = str(exc)

    return {"source_driver_number": None, "source_driver_name": None, "points": [], "corners": circuit_corners(session), "note": f"FastF1 не вернул position data: {last_error}"}


def empty_dashboard(session_info: dict[str, Any], track_map: dict[str, Any]) -> dict[str, Any]:
    return {
        "session": session_info,
        "summary": {"winner": None, "top3": [], "total_drivers": 0, "dnf_count": 0, "dns_count": 0, "dsq_count": 0, "pit_stop_count": 0, "race_control_event_count": 0, "weather_latest": None},
        "drivers": [],
        "driver_summaries": [],
        "race_result": [],
        "starting_grid": [],
        "laps": [],
        "pit_stops": [],
        "stints": [],
        "positions": [],
        "intervals": [],
        "events": [],
        "race_control": [],
        "weather": [],
        "overtakes": [],
        "team_radio": [],
        "track_map": track_map,
        "issues": [],
        "data_quality": {},
    }


def cache_map_for_event(year: int, event: Any, openf1_sessions: list[dict[str, Any]]) -> None:
    session_info = find_openf1_session(event, openf1_sessions) or fallback_session(event, year)
    session_key = int(session_info["session_key"])
    print(f"Caching map {year} round {event.get('RoundNumber')} — {event.get('EventName')} -> session {session_key}")

    ff_session = fastf1.get_session(year, int(event.get("RoundNumber")), "R")
    try:
        ff_session.load(laps=True, telemetry=True, weather=False, messages=False)
    except Exception as exc:
        print(f"  partial load: {exc}")

    track_map = build_track_map(ff_session)
    dashboard = read_dashboard(session_key) or empty_dashboard(session_info, track_map)
    dashboard.setdefault("session", session_info)
    dashboard.setdefault("data_quality", {})
    dashboard["track_map"] = track_map
    dashboard["data_quality"]["has_location"] = len(track_map.get("points", [])) > 0
    dashboard["data_quality"]["has_track_map"] = len(track_map.get("points", [])) > 0
    dashboard["data_quality"]["has_track_corners"] = len(track_map.get("corners", [])) > 0
    dashboard["data_quality"]["map_source"] = "FastF1 position telemetry"
    dashboard["data_quality"]["note_map"] = track_map.get("note")
    dashboard["data_quality"]["cached_historical_data"] = True
    dashboard["data_quality"]["no_mock_data"] = True
    write_dashboard(session_key, dashboard)
    print(f"  saved map points: {len(track_map.get('points', []))}, corners: {len(track_map.get('corners', []))}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/cache_maps.py 2024")
        raise SystemExit(1)

    year = int(sys.argv[1])
    FASTF1_HTTP_CACHE.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(FASTF1_HTTP_CACHE))

    openf1_sessions = fetch_openf1_sessions(year)
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    now = pd.Timestamp.now(tz="UTC")

    for _, event in schedule.iterrows():
        try:
            event_date = pd.to_datetime(event.get("Session5DateUtc") or event.get("EventDate"), utc=True, errors="coerce")
            if pd.notna(event_date) and event_date > now:
                print(f"Skipping future race: {event.get('EventName')}")
                continue
            cache_map_for_event(year, event, openf1_sessions)
            time.sleep(1.5)
        except Exception as exc:
            print(f"  failed {event.get('EventName')}: {exc}")

    print("Done. Restart npm run dev and hard refresh the browser.")


if __name__ == "__main__":
    main()
