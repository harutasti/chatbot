# API

`api/src/handler.py` is an AWS Lambda handler for `POST /chat`.

API Gateway protects the route with the Cognito JWT authorizer. Clients must
send a valid Cognito access token:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

## Request

```json
{
  "message": "休暇申請の手順は？",
  "sessionId": "optional-session-id"
}
```

## Response

```json
{
  "answer": "回答本文",
  "sessionId": "bedrock-session-id",
  "citations": [
    {
      "source": "s3://bucket/path/file.md",
      "excerpt": "引用元抜粋"
    }
  ]
}
```
