data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  user_data = templatefile("${path.module}/user_data.sh.tftpl", {
    aws_region             = var.aws_region
    public_url             = "http://${aws_eip.librechat.public_ip}"
    bedrock_models         = var.bedrock_models
    librechat_repository   = var.librechat_repository
    librechat_ref          = var.librechat_ref
    docker_compose_version = "v2.29.7"
  })
}

resource "aws_iam_role" "librechat" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.librechat.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "bedrock" {
  name = "${local.name_prefix}-bedrock"
  role = aws_iam_role.librechat.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "librechat" {
  name = "${local.name_prefix}-instance-profile"
  role = aws_iam_role.librechat.name
}

resource "aws_security_group" "librechat" {
  name        = "${local.name_prefix}-sg"
  description = "LibreChat HTTP access"

  ingress {
    description = "LibreChat HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_http_cidr_blocks
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "librechat" {
  ami                         = data.aws_ami.amazon_linux_2023.id
  instance_type               = var.instance_type
  iam_instance_profile        = aws_iam_instance_profile.librechat.name
  vpc_security_group_ids      = [aws_security_group.librechat.id]
  associate_public_ip_address = true
  user_data_replace_on_change = true
  user_data                   = local.user_data

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "${local.name_prefix}-server"
  }
}

resource "aws_eip" "librechat" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-eip"
  }
}

resource "aws_eip_association" "librechat" {
  instance_id   = aws_instance.librechat.id
  allocation_id = aws_eip.librechat.id
}
