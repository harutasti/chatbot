variable "project_name" {
  description = "Name prefix for AWS resources."
  type        = string
  default     = "librechat"
}

variable "environment" {
  description = "Environment name."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region."
  type        = string
  default     = "ap-northeast-1"
}

variable "instance_type" {
  description = "EC2 instance type for LibreChat, MongoDB, Meilisearch, and RAG API."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_size" {
  description = "Root EBS volume size in GiB."
  type        = number
  default     = 30
}

variable "allowed_http_cidr_blocks" {
  description = "CIDR blocks allowed to access LibreChat over HTTP. Restrict this for private testing."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "bedrock_models" {
  description = "Comma-separated Bedrock model IDs exposed in LibreChat."
  type        = string
  default     = "qwen.qwen3-235b-a22b-2507-v1:0,amazon.nova-pro-v1:0,amazon.nova-lite-v1:0"
}

variable "librechat_repository" {
  description = "Official LibreChat repository cloned by the instance."
  type        = string
  default     = "https://github.com/danny-avila/LibreChat.git"
}

variable "librechat_ref" {
  description = "LibreChat git ref to deploy."
  type        = string
  default     = "main"
}
