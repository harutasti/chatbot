# AWS Serverless Chatbot PoC

AWS上で動く社内Q&A向けチャットボットPoCです。

- Frontend: React + Vite
- API: API Gateway + Lambda
- RAG: Amazon Bedrock Knowledge Bases + S3 data source + S3 Vectors
- IaC: Terraform

## Directory Layout

```text
api/    Lambda handler
docs/   Setup and operation notes
infra/  Terraform configuration
web/    React + Vite frontend
```

## Quick Start

1. AWS CLIで対象アカウントにログインします。
2. Bedrockのモデルアクセスを有効化します。
3. Terraform変数を設定します。

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

4. `documents_bucket_name` に文書をアップロードします。
5. Bedrock data sourceの同期を実行します。
6. `web` をビルドし、`web_bucket_name` に配置します。

詳細は [docs/setup.md](docs/setup.md) を参照してください。
