data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  name_prefix         = "${var.project_name}-${var.environment}"
  account_id          = data.aws_caller_identity.current.account_id
  partition           = data.aws_partition.current.partition
  bedrock_model_arn   = "arn:${local.partition}:bedrock:${var.aws_region}::foundation-model/${var.bedrock_model_id}"
  embedding_model_arn = "arn:${local.partition}:bedrock:${var.aws_region}::foundation-model/${var.embedding_model_id}"
}
