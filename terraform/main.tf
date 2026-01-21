provider "aws" {
  region = var.aws_region
}

# ==============================================================================
# S3 Bucket for Static Website Hosting
# ==============================================================================
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "frontend_bucket_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_bucket_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  depends_on = [aws_s3_bucket_public_access_block.frontend_bucket_public_access]
  bucket     = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      },
    ]
  })
}

# ==============================================================================
# DynamoDB Table
# NOTE: Schema optimized for Query operations by scene.
# Using sceneId as partition key enables efficient listing of annotations
# for a given scene without requiring a Scan operation.
# ==============================================================================
resource "aws_dynamodb_table" "annotations_table" {
  name           = "Annotations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sceneId"
  range_key      = "id"

  attribute {
    name = "sceneId"
    type = "S"
  }

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Environment = "production"
    Application = "PointCloudAnnotator"
  }
}

# ==============================================================================
# AWS Lambda Function
# ==============================================================================
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../aws/dist"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "serverless_lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_policy" "lambda_dynamodb_policy" {
  name        = "lambda_dynamodb_policy"
  description = "IAM policy for Lambda to access DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Effect   = "Allow"
        Resource = aws_dynamodb_table.annotations_table.arn
      },
      {
        Action = [
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents"
        ]
        Effect = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_dynamodb_policy.arn
}

resource "aws_lambda_function" "annotations_api" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "annotations-api-handler"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "annotations.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs20.x"

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.annotations_table.name
    }
  }
}

# ==============================================================================
# API Gateway (HTTP API)
# ==============================================================================
resource "aws_apigatewayv2_api" "http_api" {
  name          = "serverless-annotations-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.annotations_api.invoke_arn
  payload_format_version = "2.0"
}

# Catch-all route for the generic handler
resource "aws_apigatewayv2_route" "any" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /annotations"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.annotations_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
