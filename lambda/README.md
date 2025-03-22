# MarianMT Translation Lambda Service

This project implements a serverless translation service using AWS Lambda with MarianMT models from Hugging Face.

## Setup Instructions

### Prerequisites

- AWS account with appropriate permissions
- AWS CLI installed and configured
- Docker installed
- Python 3.9+

### Setup Steps

1. **Create S3 bucket for models**

   ```bash
   aws s3 mb s3://your-model-bucket-name
   ```

2. **Upload translation models to S3**

   ```bash
   # Install requirements
   pip install -r requirements.txt

   # Upload models (example: Spanish to English)
   python setup-s3-models.py --src es --tgt en --bucket your-model-bucket-name

   # Add more language pairs as needed
   python setup-s3-models.py --src en --tgt es --bucket your-model-bucket-name
   ```

3. **Edit the deploy.sh script**

   Update the `S3_BUCKET` variable in the `deploy.sh` script with your actual S3 bucket name.

4. **Deploy the container**

   ```bash
   # Run deployment script
   chmod +x deploy.sh
   ./deploy.sh
   ```

   This script will:

   - Build and push the Docker image to ECR
   - Create the Lambda function if it doesn't exist
   - Set appropriate memory (2048MB) and timeout (300s)
   - Set environment variables for caching

5. **Set up API Gateway**
   - Create a new REST API in API Gateway
   - Create a resource `/translate` with a POST method
   - Link it to your Lambda function
   - Enable CORS if needed
   - Deploy the API

## API Usage

Send a POST request to your API endpoint:

```json
{
  "text": "Hello world",
  "src_lang": "en",
  "tgt_lang": "es"
}
```

Response:

```json
{
  "original": "Hello world",
  "translated": "Hola mundo",
  "source_language": "en",
  "target_language": "es"
}
```

## Troubleshooting

### Lambda Timeouts

- First invocation after deployment will take longer (cold start)
- Ensure your timeout setting is at least 300 seconds (5 minutes)
- Set memory to at least 2048MB for better performance

### Cache Directory Issues

- Transformers needs a writable cache directory
- Lambda's `/tmp` directory is the only writable location
- Environment variables `TRANSFORMERS_CACHE` and `HF_HOME` are set to `/tmp` paths

### Model Loading Issues

- Verify your S3 bucket contains the model files
- Check Lambda execution role has S3 read permissions
- Lambda logs in CloudWatch will show detailed errors

## Language Pairs

MarianMT supports many language pairs. Some common ones:

- English to Spanish: `en-es`
- Spanish to English: `es-en`
- English to French: `en-fr`
- French to English: `fr-en`

For a complete list, see the [Helsinki-NLP models on Hugging Face](https://huggingface.co/Helsinki-NLP).
