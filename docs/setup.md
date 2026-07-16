# Setup

## Prerequisites

- Terraform 1.6+
- AWS CLI
- Node.js 20+
- AWS account with Bedrock model access enabled

## Deploy Infrastructure

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Record these outputs:

- `api_url`
- `cloudfront_url`
- `cognito_user_pool_id`
- `cognito_app_client_id`
- `cognito_domain_url`
- `documents_bucket_name`
- `web_bucket_name`
- `knowledge_base_id`
- `data_source_id`

CloudFront is automatically allowed and is the only default CORS origin. To run
Vite locally, add the development origin and exact OAuth redirect URLs before
`terraform apply`:

```hcl
cors_additional_origins            = ["http://localhost:5173"]
cognito_additional_callback_urls   = ["http://localhost:5173/"]
cognito_additional_logout_urls     = ["http://localhost:5173/"]
```

The generated Cognito domain includes the AWS account ID. If that globally
unique prefix is already in use, set `cognito_domain_prefix` in
`terraform.tfvars` and apply again.

## Create a Chat User

Self-registration is disabled. Create each approved user from the CLI or the
Cognito console:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id "$(terraform output -raw cognito_user_pool_id)" \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com \
  --desired-delivery-mediums EMAIL \
  --region "$(terraform output -raw aws_region)"
```

The user receives a temporary password and must choose a new password during
the first managed-login session.

## Upload Documents

Upload supported documents to the source bucket:

```bash
aws s3 cp ./sample-docs/ s3://$(terraform output -raw documents_bucket_name)/ --recursive
```

Start a Knowledge Base ingestion job:

```bash
aws bedrock-agent start-ingestion-job \
  --knowledge-base-id "$(terraform output -raw knowledge_base_id)" \
  --data-source-id "$(terraform output -raw data_source_id)" \
  --region "$(terraform output -raw aws_region)"
```

## Build and Publish Frontend

```bash
cd ../web
cp .env.example .env
```

Edit `.env`:

```text
VITE_API_URL=<api_url from terraform output>
VITE_COGNITO_DOMAIN=<cognito_domain_url from terraform output>
VITE_COGNITO_CLIENT_ID=<cognito_app_client_id from terraform output>
```

The frontend is a public OAuth client. It uses Authorization Code with PKCE and
must not be given a Cognito client secret or AWS access keys. Redirect and
logout URLs default to the current site's root. Set
`VITE_COGNITO_REDIRECT_URI` and `VITE_COGNITO_LOGOUT_URI` only when they must
match additional URLs configured in Terraform.

Build and upload:

```bash
npm install
npm run build
aws s3 sync dist/ s3://<web_bucket_name>/ --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd ../infra && terraform output -raw cloudfront_distribution_id)" \
  --paths "/*"
```

Open `cloudfront_url`.

## Verify Authentication

After signing in, copy the access token from the browser session storage entry
`chatbot.auth.session` and run the deployed smoke test from the repository
root:

```bash
python3 scripts/smoke_test_auth.py \
  --api-url "$(cd infra && terraform output -raw api_url)" \
  --access-token "$ACCESS_TOKEN"
```

The test sends an empty message so the valid-token case stops at Lambda input
validation and does not invoke Bedrock. Expected results are:

- no token: `401`
- malformed token: `401`
- valid Cognito access token: `400` (`message is required`), proving the JWT
  authorizer admitted the request

The frontend sends the same access token in the `Authorization: Bearer ...`
header. API Gateway validates the issuer, client ID, signature, expiry, and the
required `openid` scope before invoking Lambda. `OPTIONS` preflight requests
remain unauthenticated through the HTTP API CORS configuration.

## Production Hardening

The serverless PoC uses Cognito authentication. Before production use:

- Consider federating Cognito with the company identity provider.
- Enable MFA and review the user-pool password policy.
- Add WAF and rate limits.
- Add access logging for CloudFront/API Gateway.
- Review Bedrock and S3 data retention policies.
