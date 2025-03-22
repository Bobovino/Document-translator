#!/bin/bash

# Variables
AWS_REGION="us-east-1"  
AWS_ACCOUNT_ID="430180859042"  
ECR_REPOSITORY="marianmt-translation"
LAMBDA_FUNCTION="marianmt-translator"
S3_BUCKET="marianmt-models" 

# Build the Docker image
echo "Building Docker image..."
docker build -t $ECR_REPOSITORY:latest .

# Log into AWS ECR
echo "Logging into AWS ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repository if it doesn't exist
echo "Creating ECR repository if it doesn't exist..."
aws ecr describe-repositories --repository-names $ECR_REPOSITORY --region $AWS_REGION || \
aws ecr create-repository --repository-name $ECR_REPOSITORY --region $AWS_REGION

# Tag and push the image
echo "Tagging and pushing image..."
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Check if Lambda function exists
echo "Checking if Lambda function exists..."
FUNCTION_EXISTS=$(aws lambda list-functions --region $AWS_REGION --query "Functions[?FunctionName=='$LAMBDA_FUNCTION'].FunctionName" --output text)

if [ -z "$FUNCTION_EXISTS" ]; then
    # Create the Lambda function with proper configuration
    echo "Creating new Lambda function..."
    
    # First create a role for the Lambda function if it doesn't exist
    ROLE_NAME="lambda-marianmt-role"
    ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ROLE_ARN" ]; then
        echo "Creating IAM role for Lambda..."
        ROLE_ARN=$(aws iam create-role \
            --role-name $ROLE_NAME \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [{
                    "Effect": "Allow",
                    "Principal": {"Service": "lambda.amazonaws.com"},
                    "Action": "sts:AssumeRole"
                }]
            }' \
            --query 'Role.Arn' --output text)
        
        # Attach policies for Lambda execution and S3 access
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
        
        # Wait for role to propagate
        echo "Waiting for role to propagate..."
        sleep 10
    fi
    
    # Create the Lambda function
    aws lambda create-function \
        --region $AWS_REGION \
        --function-name $LAMBDA_FUNCTION \
        --package-type Image \
        --code ImageUri=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest \
        --role $ROLE_ARN \
        --environment "Variables={MODEL_BUCKET_NAME=$S3_BUCKET,TRANSFORMERS_CACHE=/tmp/transformers_cache,HF_HOME=/tmp/hf_home}" \
        --timeout 300 \
        --memory-size 2048
else
    # Update Lambda function code
    echo "Updating Lambda function..."
    aws lambda update-function-code \
        --function-name $LAMBDA_FUNCTION \
        --image-uri $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest \
        --region $AWS_REGION
    
    # Update Lambda function configuration
    echo "Updating Lambda function configuration..."
    aws lambda update-function-configuration \
        --function-name $LAMBDA_FUNCTION \
        --environment "Variables={MODEL_BUCKET_NAME=$S3_BUCKET,TRANSFORMERS_CACHE=/tmp/transformers_cache,HF_HOME=/tmp/hf_home}" \
        --timeout 300 \
        --memory-size 2048 \
        --region $AWS_REGION
fi

echo "Deployment complete!"
