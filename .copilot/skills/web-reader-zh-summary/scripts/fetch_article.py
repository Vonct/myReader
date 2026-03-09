#!/usr/bin/env python3

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)
ENV_FILE_NAME = ".env"
TAVILY_ENDPOINTS = [
    "https://api.tavily.com/extract",
    "https://api.tavily.com/extract/",
]


class TavilyError(Exception):
    pass


class TavilyAuthError(TavilyError):
    pass


class TavilyQuotaError(TavilyError):
    pass


def load_dotenv(start_path: Path) -> None:
    for directory in [start_path, *start_path.parents]:
        env_file = directory / ENV_FILE_NAME
        if not env_file.exists():
            continue
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value
        break


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch article content with Tavily first and auto-fallback to generic extraction."
    )
    parser.add_argument("url", help="Article URL to extract")
    parser.add_argument("--query", help="Optional Tavily reranking query")
    parser.add_argument(
        "--extract-depth",
        choices=["basic", "advanced"],
        default="advanced",
        help="Tavily extraction depth",
    )
    parser.add_argument(
        "--format",
        choices=["markdown", "text"],
        default="markdown",
        help="Preferred content format",
    )
    parser.add_argument(
        "--chunks-per-source",
        type=int,
        default=3,
        help="Tavily chunks per source when query is provided",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=45.0,
        help="HTTP timeout in seconds",
    )
    parser.add_argument(
        "--output",
        help="Optional path to write the JSON result to",
    )
    return parser.parse_args()


def extract_first_match(patterns: list[str], text: str) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            if value:
                return html.unescape(clean_text(value))
    return None


def clean_text(text: str) -> str:
    text = html.unescape(text)
    text = text.replace("\r", "")
    text = re.sub(r"\u00a0", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    return text.strip()


def clean_markdown(text: str) -> str:
    text = clean_text(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def extract_images_from_html(document: str, base_url: str) -> list[str]:
    images: list[str] = []
    for src in re.findall(r"<img[^>]+src=[\"']([^\"']+)[\"']", document, flags=re.IGNORECASE):
        absolute_url = urljoin(base_url, html.unescape(src))
        if absolute_url not in images:
            images.append(absolute_url)
    return images


def html_fragment_to_markdown(fragment: str) -> str:
    fragment = re.sub(r"<script\b[^>]*>.*?</script>", "", fragment, flags=re.IGNORECASE | re.DOTALL)
    fragment = re.sub(r"<style\b[^>]*>.*?</style>", "", fragment, flags=re.IGNORECASE | re.DOTALL)
    fragment = re.sub(r"<noscript\b[^>]*>.*?</noscript>", "", fragment, flags=re.IGNORECASE | re.DOTALL)

    replacements = [
        (r"<br\s*/?>", "\n"),
        (r"</p>", "\n\n"),
        (r"</div>", "\n\n"),
        (r"</section>", "\n\n"),
        (r"</article>", "\n\n"),
        (r"</main>", "\n\n"),
        (r"</li>", "\n"),
        (r"<li[^>]*>", "- "),
        (r"<blockquote[^>]*>", "\n> "),
        (r"</blockquote>", "\n\n"),
    ]
    for pattern, replacement in replacements:
        fragment = re.sub(pattern, replacement, fragment, flags=re.IGNORECASE)

    for level in range(6, 0, -1):
        pattern = rf"<h{level}[^>]*>(.*?)</h{level}>"
        replacement = "\n" + ("#" * level) + r" \1\n\n"
        fragment = re.sub(pattern, replacement, fragment, flags=re.IGNORECASE | re.DOTALL)

    fragment = re.sub(r"<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", r"\2", fragment, flags=re.IGNORECASE | re.DOTALL)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return clean_markdown(fragment)


def fallback_extract(url: str, timeout: float) -> dict[str, Any]:
    response = requests.get(
        url,
        headers={"User-Agent": USER_AGENT},
        timeout=timeout,
    )
    response.raise_for_status()

    document = response.text
    title = extract_first_match(
        [
            r"<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)[\"']",
            r"<meta[^>]+name=[\"']twitter:title[\"'][^>]+content=[\"']([^\"']+)[\"']",
            r"<title[^>]*>(.*?)</title>",
        ],
        document,
    ) or url

    selected_fragment = extract_first_match(
        [
            r"<article\b[^>]*>(.*?)</article>",
            r"<main\b[^>]*>(.*?)</main>",
            r"<body\b[^>]*>(.*?)</body>",
        ],
        document,
    ) or document

    content = html_fragment_to_markdown(selected_fragment)
    if not content:
        raise RuntimeError("Fallback extraction returned empty content")

    return {
        "title": title,
        "url": url,
        "content": content,
        "images": extract_images_from_html(document, url),
        "favicon": extract_first_match(
            [
                r"<link[^>]+rel=[\"'][^\"']*icon[^\"']*[\"'][^>]+href=[\"']([^\"']+)[\"']",
            ],
            document,
        ),
        "raw": {"status_code": response.status_code},
    }


def parse_tavily_result(payload: dict[str, Any], target_url: str) -> dict[str, Any]:
    results = payload.get("results") or payload.get("data") or []
    result: dict[str, Any] | None = None

    if isinstance(results, list):
        for item in results:
            if isinstance(item, dict) and item.get("url") == target_url:
                result = item
                break
        if result is None:
            result = next((item for item in results if isinstance(item, dict)), None)
    elif isinstance(results, dict):
        result = results

    if result is None and any(key in payload for key in ("raw_content", "content", "markdown", "text")):
        result = payload

    if result is None:
        raise TavilyError("Tavily returned no usable results")

    content = (
        result.get("raw_content")
        or result.get("content")
        or result.get("markdown")
        or result.get("text")
    )
    if not content:
        raise TavilyError("Tavily returned an empty body")

    title = result.get("title") or payload.get("title") or target_url
    images = result.get("images") or result.get("image_urls") or []
    favicon = result.get("favicon") or payload.get("favicon")

    return {
        "title": clean_text(str(title)),
        "url": result.get("url") or target_url,
        "content": clean_markdown(str(content)),
        "images": images if isinstance(images, list) else [],
        "favicon": favicon,
        "raw": payload,
    }


def fetch_with_tavily(url: str, query: str | None, extract_depth: str, output_format: str, chunks_per_source: int, timeout: float) -> dict[str, Any]:
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        raise TavilyAuthError("Missing TAVILY_API_KEY")

    payload: dict[str, Any] = {
        "urls": [url],
        "extract_depth": extract_depth,
        "format": output_format,
        "include_images": True,
        "include_favicon": True,
        "include_usage": True,
        "timeout": timeout,
        "api_key": api_key,
    }
    if query:
        payload["query"] = query
        payload["chunks_per_source"] = max(1, min(chunks_per_source, 5))

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
    }

    last_error: Exception | None = None
    for endpoint in TAVILY_ENDPOINTS:
        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=max(timeout, 30.0))
            if response.status_code in (401, 403):
                raise TavilyAuthError(f"Tavily auth failed with status {response.status_code}")
            if response.status_code == 429:
                raise TavilyQuotaError("Tavily quota exceeded or rate limited")
            response.raise_for_status()
            body = response.json()
            return parse_tavily_result(body, url)
        except (requests.RequestException, ValueError, TavilyError) as error:
            last_error = error
            continue

    if isinstance(last_error, TavilyError):
        raise last_error
    raise TavilyError(str(last_error or "Unknown Tavily failure"))


def fetch_article(url: str, query: str | None, extract_depth: str, output_format: str, chunks_per_source: int, timeout: float) -> dict[str, Any]:
    fallback_reason: str | None = None
    tavily_error: str | None = None

    try:
        article = fetch_with_tavily(url, query, extract_depth, output_format, chunks_per_source, timeout)
        source = "tavily"
    except TavilyAuthError as error:
        fallback_reason = "missing-or-expired-api-key"
        tavily_error = str(error)
        article = fallback_extract(url, timeout)
        source = "fallback"
    except TavilyQuotaError as error:
        fallback_reason = "quota-or-rate-limit"
        tavily_error = str(error)
        article = fallback_extract(url, timeout)
        source = "fallback"
    except Exception as error:
        fallback_reason = "tavily-request-failed"
        tavily_error = str(error)
        article = fallback_extract(url, timeout)
        source = "fallback"

    article["source"] = source
    article["fallback_reason"] = fallback_reason
    article["tavily_error"] = tavily_error
    article["query"] = query
    article["extract_depth"] = extract_depth
    article["format"] = output_format
    return article


def main() -> int:
    args = parse_args()
    load_dotenv(Path.cwd())

    try:
        result = fetch_article(
            url=args.url,
            query=args.query,
            extract_depth=args.extract_depth,
            output_format=args.format,
            chunks_per_source=args.chunks_per_source,
            timeout=args.timeout,
        )
    except Exception as error:
        print(
            json.dumps(
                {
                    "url": args.url,
                    "source": "failed",
                    "error": str(error),
                },
                ensure_ascii=False,
                indent=2,
            ),
            file=sys.stderr,
        )
        return 1

    output = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(output + "\n", encoding="utf-8")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())