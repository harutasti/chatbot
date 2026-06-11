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
- `documents_bucket_name`
- `web_bucket_name`
- `knowledge_base_id`
- `data_source_id`

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
```

Build and upload:

```bash
npm install
npm run build
aws s3 sync dist/ s3://<web_bucket_name>/ --delete
```

Open `cloudfront_url`.

## Production Hardening

This PoC intentionally has no authentication. Before production use:

- Add Cognito or company SSO.
- Set `cors_allow_origin` to the CloudFront URL.
- Add WAF and rate limits.
- Add access logging for CloudFront/API Gateway.
- Review Bedrock and S3 data retention policies.
