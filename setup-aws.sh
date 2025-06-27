#!/bin/bash

# AWS Setup Script for Email Marketing Dashboard
# This script helps set up the initial AWS resources

set -e

echo "🚀 Setting up AWS resources for Email Marketing Dashboard..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Please run:"
    echo "   aws configure"
    exit 1
fi

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}

echo "📋 Account ID: $ACCOUNT_ID"
echo "🌍 Region: $REGION"

# Create S3 buckets
echo "🪣 Creating S3 buckets..."
aws s3 mb s3://email-dashboard-frontend --region $REGION 2>/dev/null || echo "Frontend bucket already exists"
aws s3 mb s3://email-dashboard-backend --region $REGION 2>/dev/null || echo "Backend bucket already exists"

# Configure frontend bucket for static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website s3://email-dashboard-frontend \
    --index-document index.html \
    --error-document index.html

# Create ECR repository
echo "🐳 Creating ECR repository..."
aws ecr create-repository --repository-name email-dashboard-backend --region $REGION 2>/dev/null || echo "ECR repository already exists"

# Create ECS cluster
echo "⚙️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name email-dashboard-cluster --region $REGION 2>/dev/null || echo "ECS cluster already exists"

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /ecs/email-dashboard-backend --region $REGION 2>/dev/null || echo "Log group already exists"

# Create IAM roles (basic setup - you may need to customize)
echo "🔐 Setting up IAM roles..."

# ECS Task Execution Role
aws iam create-role \
    --role-name ecsTaskExecutionRole \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }' 2>/dev/null || echo "ECS Task Execution Role already exists"

# Attach policies to ECS Task Execution Role
aws iam attach-role-policy \
    --role-name ecsTaskExecutionRole \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || echo "Policy already attached"

# Create Secrets Manager secrets (you'll need to populate these)
echo "🔒 Creating Secrets Manager secrets..."
aws secretsmanager create-secret \
    --name email-dashboard/firebase-project-id \
    --description "Firebase Project ID" \
    --secret-string "your-firebase-project-id" \
    --region $REGION 2>/dev/null || echo "Firebase Project ID secret already exists"

aws secretsmanager create-secret \
    --name email-dashboard/ortto-api-key \
    --description "Ortto API Key" \
    --secret-string "your-ortto-api-key" \
    --region $REGION 2>/dev/null || echo "Ortto API Key secret already exists"

aws secretsmanager create-secret \
    --name email-dashboard/openai-api-key \
    --description "OpenAI API Key" \
    --secret-string "your-openai-api-key" \
    --region $REGION 2>/dev/null || echo "OpenAI API Key secret already exists"

echo "✅ AWS resources setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your secrets in AWS Secrets Manager with real values"
echo "2. Deploy your backend using one of the methods in aws-deployment-guide.md"
echo "3. Deploy your frontend using the build-script.sh in the frontend directory"
echo "4. Set up CloudFront distribution for HTTPS"
echo ""
echo "🔗 Useful URLs:"
echo "   - ECS Console: https://console.aws.amazon.com/ecs/home?region=$REGION"
echo "   - S3 Console: https://s3.console.aws.amazon.com/s3/home?region=$REGION"
echo "   - Secrets Manager: https://console.aws.amazon.com/secretsmanager/home?region=$REGION"
echo ""
echo "📚 For detailed deployment instructions, see: aws-deployment-guide.md" 