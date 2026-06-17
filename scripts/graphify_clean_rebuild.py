from __future__ import annotations

import json
import os
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cache import check_semantic_cache, save_semantic_cache
from graphify.cluster import cluster, score_all
from graphify.detect import FileType, classify_file, count_words, save_manifest
from graphify.export import to_html, to_json
from graphify.extract import extract as ast_extract
from graphify.llm import detect_backend, extract_corpus_parallel
from graphify.report import generate


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = PROJECT_ROOT / "graphify-out"

INCLUDE_DIRS = (
    "src",
    "docs",
    "sql",
    "supabase",
    "messages",
)

ROOT_FILES = (
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "vitest.config.ts",
    "eslint.config.mjs",
    "postcss.config.mjs",
    "vercel.json",
    "DB_SCHEMA.sql",
    "audit_log_schema.sql",
    "inventory_config_schema.sql",
    "product_categories_schema.sql",
    "regular_holidays_schema.sql",
    "sales_schema.sql",
)

EXCLUDED_PARTS = {
    ".agents",
    ".claude",
    ".cursor",
    ".next",
    "node_modules",
    "dist",
    "build",
    "out",
    ".turbo",
    "coverage",
    "graphify-out",
    ".git",
    ".vercel",
    "taste-skill",
}

CONTAMINATION_PREFIXES = (".agents/", ".claude/", ".cursor/")

CURRENT_OUTPUTS = (
    "graph.json",
    "GRAPH_REPORT.md",
    "graph.html",
    "graphify.html",
    "manifest.json",
    "cost.json",
    ".graphify_analysis.json",
    ".graphify_labels.json",
    ".graphify_root",
    ".graphify_semantic_marker",
)


def rel(path: Path) -> str:
    return path.relative_to(PROJECT_ROOT).as_posix()


def is_excluded(path: Path) -> bool:
    try:
        relative_parts = path.relative_to(PROJECT_ROOT).parts
    except ValueError:
        return True
    return any(part in EXCLUDED_PARTS for part in relative_parts)


def clean_current_outputs() -> None:
    OUT_DIR.mkdir(exist_ok=True)
    for name in CURRENT_OUTPUTS:
        path = OUT_DIR / name
        if path.exists():
            path.unlink()

    cache_dir = OUT_DIR / "cache"
    if cache_dir.exists():
        shutil.rmtree(cache_dir)


def collect_scope_files() -> dict[str, list[str]]:
    files: dict[FileType, list[str]] = {file_type: [] for file_type in FileType}
    seen: set[Path] = set()

    for dirname in INCLUDE_DIRS:
        base = PROJECT_ROOT / dirname
        if not base.exists():
            continue
        for path in sorted(base.rglob("*")):
            if not path.is_file() or is_excluded(path):
                continue
            file_type = classify_file(path)
            if file_type is None:
                continue
            if path not in seen:
                seen.add(path)
                files[file_type].append(rel(path))

    for filename in ROOT_FILES:
        path = PROJECT_ROOT / filename
        if not path.is_file() or is_excluded(path):
            continue
        file_type = classify_file(path)
        if file_type is None:
            continue
        if path not in seen:
            seen.add(path)
            files[file_type].append(rel(path))

    return {file_type.value: sorted(paths) for file_type, paths in files.items()}


def build_detection(files_by_type: dict[str, list[str]]) -> dict:
    total_files = sum(len(paths) for paths in files_by_type.values())
    total_words = 0
    for paths in files_by_type.values():
        for path in paths:
            total_words += count_words(PROJECT_ROOT / path)

    return {
        "files": files_by_type,
        "total_files": total_files,
        "total_words": total_words,
        "needs_graph": total_words >= 50_000,
        "warning": None,
        "skipped_sensitive": [],
        "graphifyignore_patterns": 0,
        "scan_root": str(PROJECT_ROOT),
        "scope": {
            "include_dirs": list(INCLUDE_DIRS),
            "root_files": list(ROOT_FILES),
            "excluded_parts": sorted(EXCLUDED_PARTS),
        },
    }


def current_commit() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return None


def extract_semantic(semantic_files: list[Path]) -> tuple[dict, str]:
    result = {"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}
    if not semantic_files:
        return result, "no semantic files"

    cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(
        [str(path) for path in semantic_files],
        root=PROJECT_ROOT,
    )
    result["nodes"].extend(cached_nodes)
    result["edges"].extend(cached_edges)
    result["hyperedges"].extend(cached_hyperedges)

    if not uncached:
        return result, f"{len(semantic_files)} semantic cache hits"

    backend = detect_backend()
    if backend is None:
        return result, (
            f"{len(cached_nodes)} cached semantic nodes; skipped {len(uncached)} uncached "
            "doc/paper/image files because no LLM backend API key is available"
        )

    fresh = extract_corpus_parallel(
        [Path(path) for path in uncached],
        backend=backend,
        root=PROJECT_ROOT,
    )
    save_semantic_cache(
        fresh.get("nodes", []),
        fresh.get("edges", []),
        fresh.get("hyperedges", []),
        root=PROJECT_ROOT,
    )
    result["nodes"].extend(fresh.get("nodes", []))
    result["edges"].extend(fresh.get("edges", []))
    result["hyperedges"].extend(fresh.get("hyperedges", []))
    result["input_tokens"] += fresh.get("input_tokens", 0)
    result["output_tokens"] += fresh.get("output_tokens", 0)
    return result, f"semantic extraction via {backend}: {len(uncached)} fresh files"


def validate_no_contamination(graph_data: dict) -> list[str]:
    contaminated: list[str] = []
    for node in graph_data.get("nodes", []):
        source = str(node.get("source_file") or "").replace("\\", "/")
        if source.startswith(CONTAMINATION_PREFIXES):
            contaminated.append(source)
    return sorted(set(contaminated))


def main() -> None:
    os.chdir(PROJECT_ROOT)
    clean_current_outputs()

    files_by_type = collect_scope_files()
    detection = build_detection(files_by_type)

    code_files = [Path(path) for path in files_by_type.get("code", [])]
    semantic_files = [
        Path(path)
        for bucket in ("document", "paper", "image")
        for path in files_by_type.get(bucket, [])
    ]

    ast_result = {"nodes": [], "edges": [], "input_tokens": 0, "output_tokens": 0}
    if code_files:
        ast_result = ast_extract(code_files, cache_root=PROJECT_ROOT)

    sem_result, semantic_status = extract_semantic(semantic_files)

    extraction = {
        "nodes": ast_result.get("nodes", []) + sem_result.get("nodes", []),
        "edges": ast_result.get("edges", []) + sem_result.get("edges", []),
        "hyperedges": sem_result.get("hyperedges", []),
        "input_tokens": ast_result.get("input_tokens", 0) + sem_result.get("input_tokens", 0),
        "output_tokens": ast_result.get("output_tokens", 0) + sem_result.get("output_tokens", 0),
    }

    contaminated = validate_no_contamination(extraction)
    if contaminated:
        raise SystemExit(
            "contamination detected after scoped rebuild:\n" + "\n".join(contaminated[:20])
        )

    graph = build_from_json(extraction, root=PROJECT_ROOT)
    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    labels = {cid: f"Community {cid}" for cid in communities}
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    commit = current_commit()

    OUT_DIR.mkdir(exist_ok=True)
    to_json(graph, communities, str(OUT_DIR / "graph.json"), force=True, built_at_commit=commit)

    analysis = {
        "communities": {str(key): value for key, value in communities.items()},
        "cohesion": {str(key): value for key, value in cohesion.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
        "semantic_status": semantic_status,
    }
    (OUT_DIR / ".graphify_analysis.json").write_text(
        json.dumps(analysis, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (OUT_DIR / ".graphify_labels.json").write_text(
        json.dumps({str(key): value for key, value in labels.items()}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (OUT_DIR / ".graphify_root").write_text(str(PROJECT_ROOT), encoding="utf-8")

    report = generate(
        graph,
        communities,
        cohesion,
        labels,
        gods,
        surprises,
        detection,
        {"input": extraction.get("input_tokens", 0), "output": extraction.get("output_tokens", 0)},
        PROJECT_ROOT.name,
        suggested_questions=questions,
        built_at_commit=commit,
    )
    (OUT_DIR / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")

    to_html(graph, communities, str(OUT_DIR / "graph.html"), community_labels=labels, node_limit=10_000)
    shutil.copyfile(OUT_DIR / "graph.html", OUT_DIR / "graphify.html")
    save_manifest(files_by_type, str(OUT_DIR / "manifest.json"), root=PROJECT_ROOT)

    metrics = {
        "scope_files": detection["total_files"],
        "scope_words": detection["total_words"],
        "code_files": len(code_files),
        "semantic_files": len(semantic_files),
        "semantic_status": semantic_status,
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "communities": len(communities),
        "built_at_commit": commit,
    }
    (OUT_DIR / "clean-rebuild-audit.json").write_text(
        json.dumps(metrics, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(json.dumps(metrics, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
