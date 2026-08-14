#!/usr/bin/env python3
"""Verify deployed API Gateway JWT behavior without invoking Bedrock."""

import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def post_empty_message(api_url: str, access_token: str | None = None) -> int:
    headers = {"content-type": "application/json"}
    if access_token:
        headers["authorization"] = f"Bearer {access_token}"

    request = Request(
        f"{api_url.rstrip('/')}/chat",
        data=json.dumps({}).encode(),
        headers=headers,
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            return response.status
    except HTTPError as error:
        return error.code


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api-url", required=True)
    parser.add_argument("--access-token", required=True)
    args = parser.parse_args()

    cases = [
        ("missing token", None, 401),
        ("invalid token", "not-a-jwt", 401),
        ("valid token", args.access_token, 400),
    ]

    failures = []
    for label, token, expected in cases:
        actual = post_empty_message(args.api_url, token)
        print(f"{label}: expected {expected}, got {actual}")
        if actual != expected:
            failures.append(label)

    if failures:
        raise SystemExit(f"Authentication smoke test failed: {', '.join(failures)}")


if __name__ == "__main__":
    main()
