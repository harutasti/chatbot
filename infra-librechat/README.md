# LibreChat on AWS

This stack deploys the real LibreChat application on one EC2 instance using the
official LibreChat Docker Compose deployment.

## What it creates

- EC2 instance running LibreChat, MongoDB, Meilisearch, and the LibreChat RAG API
- Elastic IP
- Security group exposing HTTP port 80
- IAM role for SSM access and Amazon Bedrock model invocation

Bedrock uses the EC2 instance role through the AWS SDK default credential chain.
No AWS access keys are written to this repository.

## Deploy

```bash
terraform init
terraform apply
terraform output librechat_url
```

The first boot can take several minutes because the instance installs Docker and
pulls LibreChat images.

## Security notes

This is a small self-hosted deployment, not a fully hardened production setup.

- HTTP is open to `0.0.0.0/0` by default. Set `allowed_http_cidr_blocks` to your
  own IP range for private testing.
- Registration is enabled on first boot so you can create the first account.
  After that, disable it in `/opt/librechat/.env` on the instance and restart
  the stack.
- Data is stored on the instance EBS volume. For production, use managed storage,
  HTTPS with a real domain, backups, monitoring, and a stricter network boundary.
