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
  value       = "https://${aws_cloudfront_distribution.web.domain_name}"
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
