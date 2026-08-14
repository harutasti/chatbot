output "api_url" {
  description = "API Gateway endpoint URL."
  value       = aws_apigatewayv2_api.chat.api_endpoint
}

output "aws_region" {
  description = "AWS region used by this stack."
  value       = var.aws_region
}

output "cloudfront_url" {
  description = "CloudFront URL for the frontend."
  value       = local.cloudfront_url
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID used for frontend cache invalidation."
  value       = aws_cloudfront_distribution.web.id
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID used to create and manage chatbot users."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  description = "Public Cognito app client ID for the React frontend."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_domain_url" {
  description = "Cognito managed login domain used by the React frontend."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "documents_bucket_name" {
  description = "S3 bucket for source documents."
  value       = aws_s3_bucket.documents.bucket
}

output "web_bucket_name" {
  description = "S3 bucket for built frontend assets."
  value       = aws_s3_bucket.web.bucket
}

output "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID."
  value       = aws_bedrockagent_knowledge_base.main.id
}

output "data_source_id" {
  description = "Bedrock Knowledge Base data source ID."
  value       = aws_bedrockagent_data_source.documents.data_source_id
}
