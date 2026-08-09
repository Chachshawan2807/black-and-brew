#!/usr/bin/env python3
"""Pin Cursor agent + subagent models to Composer 2.5 (fast=false)."""
from __future__ import annotations

import json
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

STATE_DB = Path.home() / "AppData/Roaming/Cursor/User/globalStorage/state.vscdb"
CLI_CONFIG = Path.home() / ".cursor/cli-config.json"
APP_USER_KEY = (
    "src.vs.platform.reactivestorage.browser.reactiveStorageServiceImpl"
    ".persistentStorage.applicationUser"
)

COMPOSER_MODEL = {
    "modelId": "composer-2.5",
    "parameters": [{"id": "fast", "value": "false"}],
}
OPEN_MODEL_CONFIG = {
    "selectedModels": [COMPOSER_MODEL],
    "maxMode": False,
}
COMPOSER_MODEL_CONFIG = {
    "modelName": "composer-2.5",
    "maxMode": False,
    "selectedModels": [COMPOSER_MODEL],
}

# Agent surfaces that spawn or route subagent work.
AGENT_MODEL_CONFIG_KEYS = (
    "composer",
    "background-composer",
    "composer-ensemble",
    "plan-execution",
    "quick-agent",
    "deep-search",
    "spec",
)

# Server feature defaults (camelCase keys in featureModelConfigs).
AGENT_FEATURE_KEYS = (
    "composer",
    "backgroundComposer",
    "planExecution",
    "quickAgent",
    "deepSearch",
    "spec",
)

SUBAGENT_FEATURE_KEYS = ("explore", "bash", "browser", "generalPurpose", "shell")


def backup(path: Path) -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    dest = path.with_suffix(path.suffix + f".bak-{stamp}")
    shutil.copy2(path, dest)
    return dest


def composer_feature_entry() -> dict:
    return {
        "defaultModel": "composer-2.5",
        "fallbackModels": [],
        "bestOfNDefaultModels": [],
    }


def pin_application_user(data: dict) -> list[str]:
    changes: list[str] = []

    composer_cfg = data.setdefault("aiSettings", {}).setdefault("modelConfig", {})
    for key in AGENT_MODEL_CONFIG_KEYS:
        composer_cfg[key] = dict(COMPOSER_MODEL_CONFIG)
        changes.append(f"aiSettings.modelConfig.{key}")

    data["aiSettings"]["modelDefaultSwitchOnNewChat"] = False
    data["aiSettings"]["modelParameterPreferences"] = {
        "composer-2.5": {
            "modelId": "composer-2.5",
            "parameters": [{"id": "fast", "value": "false"}],
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
    }

    feature = data.setdefault("featureModelConfigs", {})
    for key in AGENT_FEATURE_KEYS:
        feature[key] = composer_feature_entry()
        changes.append(f"featureModelConfigs.{key}")

    subagents = feature.setdefault("subagentModels", {})
    for key in list(subagents.keys()) + list(SUBAGENT_FEATURE_KEYS):
        subagents[key] = composer_feature_entry()
        changes.append(f"featureModelConfigs.subagentModels.{key}")

    return changes


def update_state_db() -> list[str]:
    if not STATE_DB.exists():
        raise FileNotFoundError(f"Cursor state DB not found: {STATE_DB}")

    backup(STATE_DB)
    conn = sqlite3.connect(STATE_DB)
    changes: list[str] = []

    def set_item(key: str, value: str) -> None:
        conn.execute(
            "INSERT OR REPLACE INTO ItemTable (key, value) VALUES (?, ?)",
            (key, value),
        )
        changes.append(key)

    set_item(
        "cursor/applicationOpenModelAppliedConfig",
        json.dumps(OPEN_MODEL_CONFIG, separators=(",", ":")),
    )
    set_item("cursor/applicationOpenModelNeedsGlassDraftSync", "true")
    set_item("cursor/composerAutocompleteHeuristicsEnabled", "false")
    set_item("cursor/composerAutocompleteHeuristicsAutoApplied", "false")

    row = conn.execute(
        "SELECT value FROM ItemTable WHERE key = ?", (APP_USER_KEY,)
    ).fetchone()
    if row:
        data = json.loads(row[0])
        changes.extend(pin_application_user(data))
        set_item(APP_USER_KEY, json.dumps(data, separators=(",", ":")))

    conn.commit()
    conn.close()
    return changes


def update_cli_config() -> None:
    if not CLI_CONFIG.exists():
        return
    backup(CLI_CONFIG)
    data = json.loads(CLI_CONFIG.read_text(encoding="utf-8"))
    data["hasChangedDefaultModel"] = True
    CLI_CONFIG.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    changes = update_state_db()
    update_cli_config()
    print("Updated Cursor model preferences:")
    for item in changes:
        print(f"  - {item}")
    print("  - ~/.cursor/cli-config.json (hasChangedDefaultModel=true)")
    print("\nReload Cursor: Ctrl+Shift+P -> Developer: Reload Window")


if __name__ == "__main__":
    main()
