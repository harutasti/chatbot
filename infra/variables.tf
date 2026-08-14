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

variable "cors_additional_origins" {
  description = "Additional CORS origins. The deployed CloudFront URL is always allowed."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for origin in var.cors_additional_origins : can(regex("^https?://[^/]+$", origin))
    ])
    error_message = "CORS origins must be complete HTTP(S) origins without a trailing slash or path."
  }
}

variable "cognito_domain_prefix" {
  description = "Optional globally unique prefix for the Cognito managed login domain."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition = (
      var.cognito_domain_prefix == null ||
      can(regex("^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$", var.cognito_domain_prefix))
    )
    error_message = "The Cognito domain prefix must be 1-63 lowercase letters, numbers, or hyphens, and cannot start or end with a hyphen."
  }
}

variable "cognito_additional_callback_urls" {
  description = "Additional OAuth callback URLs, for example http://localhost:5173/ for local development."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for url in var.cognito_additional_callback_urls : can(regex("^https?://", url))
    ])
    error_message = "Cognito callback URLs must be complete HTTP(S) URLs."
  }
}

variable "cognito_additional_logout_urls" {
  description = "Additional post-logout URLs, for example http://localhost:5173/ for local development."
  type        = list(string)
  default     = []

  validation {
    condition = alltrue([
      for url in var.cognito_additional_logout_urls : can(regex("^https?://", url))
    ])
    error_message = "Cognito logout URLs must be complete HTTP(S) URLs."
  }
}

variable "force_destroy_buckets" {
  description = "Allow Terraform to delete non-empty PoC buckets."
  type        = bool
  default     = true
}
