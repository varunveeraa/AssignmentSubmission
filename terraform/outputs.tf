output "api_gateway_url" {
  description = "Base URL for API Gateway stage."
  value       = "${aws_apigatewayv2_stage.default.invoke_url}/annotations"
}

output "website_url" {
  description = "URL of the static website"
  value       = "http://${aws_s3_bucket_website_configuration.frontend_bucket_website.website_endpoint}"
}
