# AWS Serverless Chatbot PoC

AWS上で動く社内Q&A向けチャットボットPoCです。このリポジトリには、軽量なサーバーレスPoCと、本物のLibreChatをAWS上で動かすEC2構成を含めています。

- Serverless PoC: React + Vite, CloudFront, S3, API Gateway, Lambda, Amazon Bedrock Knowledge Bases
- LibreChat: EC2, Docker Compose, LibreChat, MongoDB, Meilisearch, RAG API, Amazon Bedrock
- IaC: Terraform

## AWS Architecture

### Serverless PoC

```mermaid
flowchart LR
  browser["Browser"] --> cloudfront["CloudFront Distribution"]
  cloudfront --> web_bucket["S3 Web Bucket<br/>React static files"]

  browser --> api_gateway["API Gateway HTTP API<br/>POST /chat"]
  api_gateway --> lambda["Lambda<br/>Python chat handler"]
  lambda --> retrieve_generate["Amazon Bedrock<br/>RetrieveAndGenerate"]
  retrieve_generate --> knowledge_base["Bedrock Knowledge Base"]
  knowledge_base --> documents_bucket["S3 Documents Bucket"]
  knowledge_base --> vector_index["S3 Vectors Index"]

  lambda_role["IAM Role<br/>Lambda logs + Bedrock"] -.-> lambda
  kb_role["IAM Role<br/>S3 + S3 Vectors + embedding model"] -.-> knowledge_base
```

The React app is served from S3 through CloudFront. Chat requests go to API Gateway, which invokes the Lambda handler. The handler calls Bedrock Knowledge Bases to retrieve relevant document chunks and generate an answer.

### LibreChat on EC2

```mermaid
flowchart LR
  user["User"] --> eip["Elastic IP<br/>HTTP :80"]
  eip --> ec2["EC2<br/>Amazon Linux 2023"]

  subgraph docker["Docker Compose on EC2"]
    nginx["Nginx<br/>LibreChat web entrypoint"]
    api["LibreChat API"]
    mongodb["MongoDB<br/>conversation data"]
    meili["Meilisearch<br/>search index"]
    rag_api["LibreChat RAG API"]
    pgvector["pgvector<br/>RAG storage"]
  end

  ec2 --> nginx
  nginx --> api
  api --> mongodb
  api --> meili
  api --> rag_api
  rag_api --> pgvector
  api --> bedrock["Amazon Bedrock<br/>chat models"]

  instance_profile["EC2 Instance Profile<br/>Bedrock invoke + SSM"] -.-> ec2
  ssm["AWS Systems Manager"] -.-> ec2
```

LibreChat runs as the official Docker Compose deployment on a single EC2 instance. AWS credentials are not stored in the app; Bedrock access uses the EC2 instance profile and the AWS SDK default credential chain.

## Directory Layout

```text
api/              Lambda handler
docs/             Setup and operation notes
infra/            Terraform configuration for the serverless PoC
infra-librechat/  Terraform configuration for LibreChat on EC2
web/              React + Vite frontend
```

## Quick Start: Serverless PoC

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

## Quick Start: LibreChat

LibreChat構成は [infra-librechat/README.md](infra-librechat/README.md) を参照してください。初回起動ではEC2上でDockerをセットアップし、公式LibreChatイメージをpullするため数分かかります。
