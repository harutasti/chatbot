import json
import logging
import os
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock = boto3.client("bedrock-agent-runtime")

KNOWLEDGE_BASE_ID = os.environ["KNOWLEDGE_BASE_ID"]
MODEL_ARN = os.environ["MODEL_ARN"]
DEFAULT_PROMPT = (
    "You are an internal company Q&A assistant. Answer using the retrieved "
    "knowledge base content. If the answer is not present in the retrieved "
    "content, say that you do not know. Keep answers concise and cite sources "
    "when citations are available."
)


def handler(event: dict[str, Any], _context: Any) -> dict[str, Any]:
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return _response(204, {})

    try:
        body = _parse_body(event)
        message = str(body.get("message", "")).strip()
        session_id = body.get("sessionId")

        if not message:
            return _response(400, {"error": "message is required"})

        response = _ask_bedrock(message, session_id)
        return _response(200, response)
    except ValueError as exc:
        return _response(400, {"error": str(exc)})
    except (BotoCoreError, ClientError):
        logger.exception("Bedrock request failed")
        return _response(502, {"error": "failed to generate an answer"})
    except Exception:
        logger.exception("Unhandled error")
        return _response(500, {"error": "internal server error"})


def _parse_body(event: dict[str, Any]) -> dict[str, Any]:
    raw_body = event.get("body") or "{}"
    if event.get("isBase64Encoded"):
        raise ValueError("base64 request bodies are not supported")

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise ValueError("request body must be valid JSON") from exc

    if not isinstance(body, dict):
        raise ValueError("request body must be a JSON object")
    return body


def _ask_bedrock(message: str, session_id: Any) -> dict[str, Any]:
    request: dict[str, Any] = {
        "input": {"text": message},
        "retrieveAndGenerateConfiguration": {
            "type": "KNOWLEDGE_BASE",
            "knowledgeBaseConfiguration": {
                "knowledgeBaseId": KNOWLEDGE_BASE_ID,
                "modelArn": MODEL_ARN,
                "generationConfiguration": {
                    "promptTemplate": {
                        "textPromptTemplate": (
                            f"{DEFAULT_PROMPT}\n\n"
                            "Context:\n$search_results$\n\n"
                            "Question: $query$\n\n"
                            "Answer:"
                        )
                    }
                },
            },
        },
    }

    if isinstance(session_id, str) and session_id.strip():
        request["sessionId"] = session_id.strip()

    result = bedrock.retrieve_and_generate(**request)
    citations = _extract_citations(result.get("citations", []))

    return {
        "answer": result.get("output", {}).get("text", ""),
        "sessionId": result.get("sessionId"),
        "citations": citations,
    }


def _extract_citations(raw_citations: list[dict[str, Any]]) -> list[dict[str, str]]:
    citations: list[dict[str, str]] = []

    for citation in raw_citations:
        for reference in citation.get("retrievedReferences", []):
            location = reference.get("location", {})
            content = reference.get("content", {})
            source = _source_from_location(location)
            excerpt = str(content.get("text", "")).strip()

            if source:
                citations.append(
                    {
                        "source": source,
                        "excerpt": excerpt[:280] if excerpt else "",
                    }
                )

    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for citation in citations:
        if citation["source"] in seen:
            continue
        seen.add(citation["source"])
        deduped.append(citation)

    return deduped


def _source_from_location(location: dict[str, Any]) -> str:
    if "s3Location" in location:
        return str(location["s3Location"].get("uri", ""))
    if "webLocation" in location:
        return str(location["webLocation"].get("url", ""))
    return str(location)


def _response(status_code: int, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "content-type": "application/json",
            "access-control-allow-origin": os.environ.get("CORS_ALLOW_ORIGIN", "*"),
            "access-control-allow-methods": "OPTIONS,POST",
            "access-control-allow-headers": "content-type",
        },
        "body": json.dumps(body),
    }
