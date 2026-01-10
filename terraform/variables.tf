variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for frontend hosting. Must be globally unique."
  type        = string
  default     = "point-cloud-annotator-frontend-v3"
}
