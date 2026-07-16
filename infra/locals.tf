data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name_prefix        = "${var.project_name}-${var.environment}"
  account_id         = data.aws_caller_identity.current.account_id
  partition          = data.aws_partition.current.partition
  cloudfront_url     = "https://${aws_cloudfront_distribution.web.domain_name}"
  cors_allow_origins = distinct(concat([local.cloudfront_url], var.cors_additional_origins))
  cognito_domain     = coalesce(var.cognito_domain_prefix, substr(replace(lower("${local.name_prefix}-${local.account_id}"), "/[^a-z0-9-]/", "-"), 0, 63))
  cognito_callback_urls = distinct(concat(
    ["${local.cloudfront_url}/"],
    var.cognito_additional_callback_urls,
  ))
  cognito_logout_urls = distinct(concat(
    ["${local.cloudfront_url}/"],
    var.cognito_additional_logout_urls,
  ))
  bedrock_model_arn   = "arn:${local.partition}:bedrock:${var.aws_region}::foundation-model/${var.bedrock_model_id}"
  embedding_model_arn = "arn:${local.partition}:bedrock:${var.aws_region}::foundation-model/${var.embedding_model_id}"
}
