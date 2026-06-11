import json
import os
import sys
import types
import unittest
from unittest.mock import patch

os.environ.setdefault("KNOWLEDGE_BASE_ID", "KB123")
os.environ.setdefault("MODEL_ARN", "arn:aws:bedrock:ap-northeast-1::foundation-model/test")

fake_boto3 = types.ModuleType("boto3")
fake_boto3.client = lambda _service: object()
fake_botocore = types.ModuleType("botocore")
fake_botocore_exceptions = types.ModuleType("botocore.exceptions")
fake_botocore_exceptions.BotoCoreError = Exception
fake_botocore_exceptions.ClientError = Exception
sys.modules.setdefault("boto3", fake_boto3)
sys.modules.setdefault("botocore", fake_botocore)
sys.modules.setdefault("botocore.exceptions", fake_botocore_exceptions)

import handler  # noqa: E402


class HandlerTest(unittest.TestCase):
    def test_requires_message(self):
        response = handler.handler({"body": "{}"}, None)

        self.assertEqual(response["statusCode"], 400)
        self.assertEqual(json.loads(response["body"])["error"], "message is required")

    @patch("handler.bedrock")
    def test_returns_answer_and_citations(self, bedrock):
        bedrock.retrieve_and_generate.return_value = {
            "output": {"text": "回答です"},
            "sessionId": "session-1",
            "citations": [
                {
                    "retrievedReferences": [
                        {
                            "location": {
                                "s3Location": {
                                    "uri": "s3://example-bucket/policy.md",
                                }
                            },
                            "content": {"text": "根拠テキスト"},
                        }
                    ]
                }
            ],
        }

        response = handler.handler({"body": json.dumps({"message": "質問"})}, None)
        body = json.loads(response["body"])

        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(body["answer"], "回答です")
        self.assertEqual(body["sessionId"], "session-1")
        self.assertEqual(body["citations"][0]["source"], "s3://example-bucket/policy.md")


if __name__ == "__main__":
    unittest.main()
