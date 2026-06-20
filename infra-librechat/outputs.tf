output "librechat_url" {
  description = "LibreChat URL."
  value       = "http://${aws_eip.librechat.public_ip}"
}

output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.librechat.id
}

output "public_ip" {
  description = "Elastic IP address."
  value       = aws_eip.librechat.public_ip
}

output "ssm_start_session_command" {
  description = "Command to open an SSM session to the LibreChat instance."
  value       = "aws ssm start-session --target ${aws_instance.librechat.id} --region ${var.aws_region}"
}
