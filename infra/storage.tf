resource "aws_s3_bucket" "documents" {
  bucket_prefix = "${local.name_prefix}-docs-"
  force_destroy = var.force_destroy_buckets
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3vectors_vector_bucket" "knowledge" {
  vector_bucket_name = "${local.name_prefix}-vectors"
  force_destroy      = var.force_destroy_buckets
}

resource "aws_s3vectors_index" "knowledge" {
  index_name         = "${local.name_prefix}-index"
  vector_bucket_name = aws_s3vectors_vector_bucket.knowledge.vector_bucket_name
  data_type          = "float32"
  dimension          = var.embedding_dimensions
  distance_metric    = "cosine"
}

resource "aws_s3_bucket" "web" {
  bucket_prefix = "${local.name_prefix}-web-"
  force_destroy = var.force_destroy_buckets
}

resource "aws_s3_bucket_public_access_block" "web" {
  bucket = aws_s3_bucket.web.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "web" {
  bucket = aws_s3_bucket.web.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
