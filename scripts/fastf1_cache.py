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
EMPTY_DF = pd.DataFrame()


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


def seconds(value: Any) -> float | None:
    value = to_jsonable(value)
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def display_timedelta(value: Any) -> str | None:
    sec = seconds(value)
    if sec is None:
        return None
    minutes = int(sec // 60)
    rest = sec % 60
    return f"{minutes}:{rest:06.3f}" if minutes else f"{rest:.3f}"


def result_position(value: Any) -> int | None:
    value = to_jsonable(value)
    try:
        parsed = int(float(value))
        return parsed if parsed > 0 else None
    except Exception:
        return None


def safe_dataframe(session: Any, attr: str) -> pd.DataFrame:
    try:
        value = getattr(session, attr)
        if value is None or getattr(value, "empty", True):
            return EMPTY_DF
        return value
    except Exception:
        return EMPTY_DF


def write_cache_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"savedAt": datetime.now(timezone.utc).isoformat(), "url": None, "data": data}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


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


def build_drivers(results: pd.DataFrame, laps: pd.DataFrame) -> list[dict[str, Any]]:
    if results.empty:
        if laps.empty or "DriverNumber" not in laps.columns:
            return []
        driver_numbers = sorted(set(int(x) for x in laps["DriverNumber"].dropna().unique()))
        return [
            {
                "driver_number": number,
                "full_name": f"Пилот #{number}",
                "name_acronym": str(number),
                "team_name": "—",
                "team_colour": "666666",
                "headshot_url": "https://media.formula1.com/d_driver_fallback_image.png",
            }
            for number in driver_numbers
        ]

    drivers: list[dict[str, Any]] = []
    for _, row in results.iterrows():
        number = result_position(row.get("DriverNumber")) or result_position(row.get("Position"))
        if not number:
            continue
        status = to_jsonable(row.get("Status")) or to_jsonable(row.get("ClassifiedPosition"))
        finish_time = display_timedelta(row.get("Time")) or status
        drivers.append(
            {
                "driver_number": number,
                "broadcast_name": to_jsonable(row.get("BroadcastName")) or to_jsonable(row.get("Abbreviation")) or f"#{number}",
                "full_name": to_jsonable(row.get("FullName")) or to_jsonable(row.get("Driver")) or f"Пилот #{number}",
                "first_name": to_jsonable(row.get("FirstName")),
                "last_name": to_jsonable(row.get("LastName")),
                "name_acronym": to_jsonable(row.get("Abbreviation")) or f"#{number}",
                "team_name": to_jsonable(row.get("TeamName")) or "Команда не указана",
                "team_colour": to_jsonable(row.get("TeamColor")) or "666666",
                "headshot_url": to_jsonable(row.get("HeadshotUrl")) or "https://media.formula1.com/d_driver_fallback_image.png",
                "starting_position": result_position(row.get("GridPosition")),
                "finishing_position": result_position(row.get("Position")),
                "classified_laps": result_position(row.get("Laps")),
                "gap_to_leader": finish_time,
                "duration": finish_time,
                "finish_time": finish_time,
                "status": status,
                "points": to_jsonable(row.get("Points")),
                "dnf": status not in (None, "Finished") and "+" not in str(status),
                "dns": str(status).upper() == "DNS",
                "dsq": "disq" in str(status).lower(),
            }
        )
    return sorted(drivers, key=lambda d: d.get("finishing_position") or 999)


def build_laps(laps_df: pd.DataFrame) -> list[dict[str, Any]]:
    if laps_df.empty:
        return []
    laps = []
    for _, lap in laps_df.iterrows():
        driver_number = result_position(lap.get("DriverNumber"))
        lap_number = result_position(lap.get("LapNumber"))
        if not driver_number or not lap_number:
            continue
        laps.append(
            {
                "driver_number": driver_number,
                "lap_number": lap_number,
                "lap_duration": seconds(lap.get("LapTime")),
                "duration_sector_1": seconds(lap.get("Sector1Time")),
                "duration_sector_2": seconds(lap.get("Sector2Time")),
                "duration_sector_3": seconds(lap.get("Sector3Time")),
                "i1_speed": to_jsonable(lap.get("SpeedI1")),
                "i2_speed": to_jsonable(lap.get("SpeedI2")),
                "st_speed": to_jsonable(lap.get("SpeedST")),
                "is_pit_out_lap": to_jsonable(lap.get("PitOutTime")) is not None,
                "compound": to_jsonable(lap.get("Compound")),
                "tyre_life": to_jsonable(lap.get("TyreLife")),
                "stint": to_jsonable(lap.get("Stint")),
                "position": to_jsonable(lap.get("Position")) if "Position" in lap.index else None,
                "date_start": to_jsonable(lap.get("LapStartDate")),
            }
        )
    return laps


def build_pit_stops(laps_df: pd.DataFrame) -> list[dict[str, Any]]:
    if laps_df.empty:
        return []
    pits = []
    for _, lap in laps_df.iterrows():
        if to_jsonable(lap.get("PitInTime")) is None and to_jsonable(lap.get("PitOutTime")) is None:
            continue
        driver_number = result_position(lap.get("DriverNumber"))
        if not driver_number:
            continue
        pit_in = seconds(lap.get("PitInTime"))
        pit_out = seconds(lap.get("PitOutTime"))
        stop_duration = pit_out - pit_in if pit_in is not None and pit_out is not None and pit_out >= pit_in else None
        pits.append({"driver_number": driver_number, "lap_number": result_position(lap.get("LapNumber")), "date": to_jsonable(lap.get("LapStartDate")), "lane_duration": None, "stop_duration": stop_duration})
    return pits


def build_stints(laps_df: pd.DataFrame) -> list[dict[str, Any]]:
    if laps_df.empty or "Stint" not in laps_df.columns:
        return []
    stints = []
    grouped = laps_df.dropna(subset=["DriverNumber", "LapNumber", "Stint"]).groupby(["DriverNumber", "Stint"], sort=True)
    for (driver_number, stint_number), group in grouped:
        compounds = [c for c in group.get("Compound", pd.Series(dtype=str)).dropna().unique().tolist() if c]
        stints.append({"driver_number": int(driver_number), "stint_number": int(stint_number), "compound": compounds[0] if compounds else "UNKNOWN", "lap_start": int(group["LapNumber"].min()), "lap_end": int(group["LapNumber"].max()), "tyre_age_at_start": to_jsonable(group.get("TyreLife", pd.Series([None])).iloc[0])})
    return stints


def build_weather(weather_df: pd.DataFrame) -> list[dict[str, Any]]:
    if weather_df.empty:
        return []
    weather = []
    for _, row in weather_df.iterrows():
        weather.append({"date": to_jsonable(row.get("Time")), "air_temperature": to_jsonable(row.get("AirTemp")), "humidity": to_jsonable(row.get("Humidity")), "pressure": to_jsonable(row.get("Pressure")), "rainfall": to_jsonable(row.get("Rainfall")), "track_temperature": to_jsonable(row.get("TrackTemp")), "wind_direction": to_jsonable(row.get("WindDirection")), "wind_speed": to_jsonable(row.get("WindSpeed"))})
    return weather


def build_track_map(laps_df: pd.DataFrame) -> dict[str, Any]:
    try:
        if laps_df.empty:
            raise ValueError("laps are empty")
        fastest = laps_df.pick_fastest()
        pos = fastest.get_pos_data()
        if pos is None or pos.empty:
            raise ValueError("no position data")
        xs = pos["X"].astype(float).tolist()
        ys = pos["Y"].astype(float).tolist()
        min_x, max_x = min(xs), max(xs)
        min_y, max_y = min(ys), max(ys)
        width = max(max_x - min_x, 1)
        height = max(max_y - min_y, 1)
        step = max(len(pos) // 1400, 1)
        points = []
        for _, row in pos.iloc[::step].iterrows():
            points.append({"date": to_jsonable(row.get("Time")), "driver_number": result_position(fastest.get("DriverNumber")), "x": round(((float(row.get("X")) - min_x) / width) * 100, 3), "y": round(((float(row.get("Y")) - min_y) / height) * 100, 3), "z": to_jsonable(row.get("Z"))})
        return {"source_driver_number": result_position(fastest.get("DriverNumber")), "source_driver_name": to_jsonable(fastest.get("Driver")), "points": points, "note": "Карта построена из FastF1 position data по быстрому кругу."}
    except Exception as exc:
        return {"source_driver_number": None, "source_driver_name": None, "points": [], "note": f"FastF1 не вернул position data: {exc}"}


def enrich_driver_summaries(drivers: list[dict[str, Any]], laps: list[dict[str, Any]], pits: list[dict[str, Any]], stints: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summaries = []
    for driver in drivers:
        number = driver["driver_number"]
        driver_laps = [lap for lap in laps if lap["driver_number"] == number and lap.get("lap_duration")]
        lap_times = [lap["lap_duration"] for lap in driver_laps if lap.get("lap_duration")]
        best = min(lap_times) if lap_times else None
        avg = sum(lap_times) / len(lap_times) if lap_times else None
        sorted_laps = sorted(lap_times)
        med = sorted_laps[len(sorted_laps) // 2] if sorted_laps else None
        driver_pits = [pit for pit in pits if pit["driver_number"] == number]
        pit_durations = [pit["stop_duration"] for pit in driver_pits if pit.get("stop_duration")]
        driver_stints = [stint for stint in stints if stint["driver_number"] == number]
        summary = dict(driver)
        summary.update({"laps_count": len(driver_laps), "best_lap": best, "best_lap_text": driver.get("best_lap_text") or display_timedelta(best), "average_lap": avg, "median_lap": med, "pit_stop_count": len(driver_pits), "average_pit_stop": sum(pit_durations) / len(pit_durations) if pit_durations else None, "fastest_pit_stop": min(pit_durations) if pit_durations else None, "pit_stops": driver_pits, "stints": driver_stints, "race_control_events": [], "positions": [], "position_delta": driver.get("starting_position") - driver.get("finishing_position") if driver.get("starting_position") and driver.get("finishing_position") else None})
        summaries.append(summary)
    return summaries


def build_summary(session_info: dict[str, Any], drivers: list[dict[str, Any]], laps: list[dict[str, Any]], pits: list[dict[str, Any]], weather: list[dict[str, Any]]) -> dict[str, Any]:
    top3 = sorted([d for d in drivers if d.get("finishing_position")], key=lambda d: d["finishing_position"])[:3]
    fastest_driver = None
    best_time = None
    for driver in drivers:
        value = driver.get("best_lap")
        if value and (best_time is None or value < best_time):
            fastest_driver = driver
            best_time = value
    return {"session": session_info, "winner": top3[0] if top3 else None, "top3": top3, "total_drivers": len(drivers), "total_laps_with_times": len([lap for lap in laps if lap.get("lap_duration")]), "dnf_count": len([d for d in drivers if d.get("dnf")]), "dns_count": len([d for d in drivers if d.get("dns")]), "dsq_count": len([d for d in drivers if d.get("dsq")]), "pit_stop_count": len(pits), "average_pit_stop": None, "slowest_pit_stop": None, "fastest_lap": fastest_driver, "race_control_event_count": 0, "weather_latest": weather[-1] if weather else None}


def cache_race(year: int, event: Any, openf1_sessions: list[dict[str, Any]], telemetry: bool) -> None:
    openf1_session = find_openf1_session(event, openf1_sessions)
    session_info = openf1_session or fallback_session(event, year)
    session_key = int(session_info["session_key"])

    print(f"Caching FastF1 {year} round {event.get('RoundNumber')} — {event.get('EventName')} -> session {session_key}")
    ff_session = fastf1.get_session(year, int(event.get("RoundNumber")), "R")
    try:
        ff_session.load(laps=True, telemetry=telemetry, weather=True, messages=False)
    except Exception as exc:
        print(f"  partial FastF1 load: {exc}")

    results_df = safe_dataframe(ff_session, "results")
    laps_df = safe_dataframe(ff_session, "laps")
    weather_df = safe_dataframe(ff_session, "weather_data")

    drivers = build_drivers(results_df, laps_df)
    laps = build_laps(laps_df)
    pits = build_pit_stops(laps_df)
    stints = build_stints(laps_df)
    weather = build_weather(weather_df)
    track_map = build_track_map(laps_df) if telemetry else {"source_driver_number": None, "source_driver_name": None, "points": [], "note": "FastF1 telemetry не загружалась. Запусти с --telemetry для карты."}
    driver_summaries = enrich_driver_summaries(drivers, laps, pits, stints)

    by_number = {d["driver_number"]: d for d in driver_summaries}
    drivers = [{**driver, **{k: by_number.get(driver["driver_number"], {}).get(k) for k in ["best_lap", "best_lap_text", "average_lap", "median_lap", "pit_stop_count", "average_pit_stop"]}} for driver in drivers]
    summary = build_summary(session_info, drivers, laps, pits, weather)

    dashboard = {
        "session": session_info,
        "summary": summary,
        "drivers": drivers,
        "driver_summaries": driver_summaries,
        "race_result": drivers,
        "starting_grid": [],
        "laps": laps[:3000],
        "pit_stops": pits,
        "stints": stints,
        "positions": [],
        "intervals": [],
        "events": [],
        "race_control": [],
        "weather": weather,
        "overtakes": [],
        "team_radio": [],
        "track_map": track_map,
        "issues": [],
        "loaded_from_fastf1_cache": True,
        "data_quality": {
            "source": "FastF1 local cache + OpenF1 session index",
            "has_drivers": len(drivers) > 0,
            "has_named_drivers": len(drivers) > 0,
            "has_session_result": len(drivers) > 0,
            "has_laps": len(laps) > 0,
            "has_pit_stops": len(pits) > 0,
            "has_stints": len(stints) > 0,
            "has_positions": False,
            "has_intervals": False,
            "has_location": len(track_map.get("points", [])) > 0,
            "has_overtakes": False,
            "has_team_radio": False,
            "has_weather": len(weather) > 0,
            "has_finish_times": any(d.get("finish_time") for d in drivers),
            "has_fastest_laps": any(d.get("best_lap") or d.get("best_lap_text") for d in drivers),
            "no_mock_data": True,
            "cached_historical_data": True,
            "fastf1_cache": True,
            "partial_fastf1_data": len(laps) == 0,
            "note": "Данные загружены локально через FastF1. Если часть блоков false, FastF1/OpenF1 не отдали этот тип данных для гонки или он был недоступен при загрузке.",
        },
    }
    write_cache_json(CACHE_ROOT / "race-dashboard" / f"{session_key}.json", dashboard)
    write_cache_json(CACHE_ROOT / "session-index" / f"{session_key}.json", session_info)
    print(f"  saved: {len(drivers)} drivers, {len(laps)} laps, {len(pits)} pit rows, {len(stints)} stints, weather {len(weather)}")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/fastf1_cache.py 2024 [--telemetry]")
        raise SystemExit(1)
    year = int(sys.argv[1])
    telemetry = "--telemetry" in sys.argv

    FASTF1_HTTP_CACHE.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(FASTF1_HTTP_CACHE))

    openf1_sessions = fetch_openf1_sessions(year)
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    races = schedule[schedule["EventFormat"].notna()]

    for _, event in races.iterrows():
        try:
            cache_race(year, event, openf1_sessions, telemetry)
            time.sleep(1)
        except Exception as exc:
            print(f"  failed {event.get('EventName')}: {exc}")

    print("Done. Restart npm run dev and hard refresh the browser.")


if __name__ == "__main__":
    main()
