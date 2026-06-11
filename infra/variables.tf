variable "project_name" {
  description = "Name prefix for AWS resources."
  type        = string
  default     = "chatbot-poc"
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

variable "bedrock_model_id" {
  description = "Foundation model ID for answer generation."
  type        = string
  default     = "anthropic.claude-3-5-sonnet-20240620-v1:0"
}

variable "embedding_model_id" {
  description = "Embedding model ID for the knowledge base."
  type        = string
  default     = "amazon.titan-embed-text-v2:0"
}

variable "embedding_dimensions" {
  description = "Embedding vector dimensions. Must match the selected embedding model configuration."
  type        = number
  default     = 1024
}

variable "cors_allow_origin" {
  description = "Allowed CORS origin. Use * for PoC only."
  type        = string
  default     = "*"
}

variable "force_destroy_buckets" {
  description = "Allow Terraform to delete non-empty PoC buckets."
  type        = bool
  default     = true
}
