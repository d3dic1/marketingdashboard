# AWS Deployment Guide for Email Marketing Reporting Dashboard

## Overview
This guide covers deploying your Email Marketing Reporting Dashboard to AWS using multiple approaches.

## Prerequisites
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed (for container-based deployment)
- Domain name (optional but recommended)

## Option 1: Elastic Beanstalk Deployment (Recommended for Beginners)

### Backend Deployment

1. **Prepare the Backend**
   ```bash
   cd backend
   npm install
   npm run build
   ```

2. **Create Elastic Beanstalk Application**
   - Go to AWS Console → Elastic Beanstalk
   - Create new application: "email-marketing-dashboard"
   - Choose "Node.js" platform
   - Upload your backend code or connect to Git repository

3. **Environment Configuration**
   ```bash
   # Set environment variables in Elastic Beanstalk
   NODE_ENV=production
   PORT=8080
   # Add your API keys and database URLs
   ```

### Frontend Deployment

1. **Build the Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to S3**
   ```bash
   # Create S3 bucket
   aws s3 mb s3://your-dashboard-frontend
   
   # Upload build files
   aws s3 sync build/ s3://your-dashboard-frontend --delete
   
   # Enable static website hosting
   aws s3 website s3://your-dashboard-frontend --index-document index.html --error-document index.html
   ```

3. **Setup CloudFront Distribution**
   - Create CloudFront distribution
   - Origin: S3 bucket
   - Enable HTTPS
   - Configure custom domain (optional)

## Option 2: ECS/Fargate Deployment (Production Ready)

### Backend Container Deployment

1. **Create ECR Repository**
   ```bash
   aws ecr create-repository --repository-name email-dashboard-backend
   ```

2. **Build and Push Docker Image**
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
   
   # Build image
   docker build -t email-dashboard-backend .
   
   # Tag and push
   docker tag email-dashboard-backend:latest your-account.dkr.ecr.us-east-1.amazonaws.com/email-dashboard-backend:latest
   docker push your-account.dkr.ecr.us-east-1.amazonaws.com/email-dashboard-backend:latest
   ```

3. **Create ECS Cluster and Service**
   - Create ECS cluster
   - Define task definition with your container
   - Create service with load balancer

### Frontend Deployment
Same as Option 1 (S3 + CloudFront)

## Option 3: Serverless Deployment (Cost Effective)

### Backend Lambda Functions

1. **Install Serverless Framework**
   ```bash
   npm install -g serverless
   ```

2. **Create serverless.yml**
   ```yaml
   service: email-dashboard-api
   
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
   
   functions:
     api:
       handler: handler.api
       events:
         - http:
             path: /{proxy+}
             method: ANY
   ```

3. **Deploy**
   ```bash
   serverless deploy
   ```

## Environment Variables Setup

### Required Environment Variables
```bash
# Database
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# API Keys
ORTTO_API_KEY=your-ortto-key
GOOGLE_ANALYTICS_CLIENT_ID=your-ga-client-id
GOOGLE_ANALYTICS_CLIENT_SECRET=your-ga-client-secret
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Application
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-domain.com
```

## Security Considerations

1. **IAM Roles and Policies**
   - Create least-privilege IAM roles
   - Use AWS Secrets Manager for sensitive data
   - Enable CloudTrail for audit logging

2. **Network Security**
   - Use VPC for private resources
   - Configure security groups
   - Enable WAF for API protection

3. **SSL/TLS**
   - Use AWS Certificate Manager for SSL certificates
   - Force HTTPS redirects
   - Configure HSTS headers

## Monitoring and Logging

1. **CloudWatch**
   - Set up log groups for application logs
   - Create dashboards for metrics
   - Configure alarms for errors and performance

2. **Application Performance Monitoring**
   - Consider AWS X-Ray for tracing
   - Monitor API response times
   - Track user interactions

## Cost Optimization

1. **Right-sizing Resources**
   - Start with smaller instance types
   - Use auto-scaling based on actual usage
   - Monitor and adjust as needed

2. **Reserved Instances**
   - Purchase reserved instances for predictable workloads
   - Use Savings Plans for flexible pricing

3. **Serverless Benefits**
   - Pay only for actual usage
   - Automatic scaling to zero
   - No server management overhead

## Backup and Disaster Recovery

1. **Database Backups**
   - Enable automated backups
   - Test restore procedures
   - Store backups in multiple regions

2. **Application Data**
   - Backup configuration files
   - Document deployment procedures
   - Maintain runbooks

## Deployment Pipeline

### GitHub Actions Example
```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v21

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Deploy to S3
        run: |
          cd frontend
          npm install
          npm run build
          aws s3 sync build/ s3://your-bucket --delete
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure CORS configuration matches your frontend domain
2. **Environment Variables**: Verify all required variables are set
3. **Database Connections**: Check network connectivity and credentials
4. **SSL Certificates**: Ensure certificates are valid and properly configured

### Useful Commands
```bash
# Check application logs
aws logs tail /aws/elasticbeanstalk/your-app/environment-name

# SSH into EC2 instance (Elastic Beanstalk)
eb ssh

# Check ECS task logs
aws logs tail /ecs/your-service-name
```

## Next Steps

1. Choose your preferred deployment option
2. Set up AWS infrastructure
3. Configure environment variables
4. Deploy and test
5. Set up monitoring and alerts
6. Configure custom domain and SSL
7. Implement CI/CD pipeline

## Support Resources

- [AWS Documentation](https://docs.aws.amazon.com/)
- [Elastic Beanstalk Developer Guide](https://docs.aws.amazon.com/elasticbeanstalk/)
- [ECS User Guide](https://docs.aws.amazon.com/ecs/)
- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/) 