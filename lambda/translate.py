import json
import os
import boto3
from transformers import MarianMTModel, MarianTokenizer

# Set cache directory to a writable location
os.environ["TRANSFORMERS_CACHE"] = "/tmp/transformers_cache"
os.environ["HF_HOME"] = "/tmp/hf_home"

# Initialize S3 client
s3 = boto3.client("s3")
BUCKET_NAME = os.environ.get("MODEL_BUCKET_NAME")

# Log environment and configuration info on cold start
print(f"Environment setup: TRANSFORMERS_CACHE={os.environ.get('TRANSFORMERS_CACHE')}")
print(f"Model bucket: {BUCKET_NAME}")
print(f"Current working directory: {os.getcwd()}")
print(f"Listing /tmp directory: {os.listdir('/tmp') if os.path.exists('/tmp') else 'Not available'}")

def load_model(src_lang, tgt_lang):
    """
    Load translation model either from local cache or S3
    """
    model_name = f"Helsinki-NLP/opus-mt-{src_lang}-{tgt_lang}"
    
    # Check if we should load from S3
    if BUCKET_NAME:
        model_path = f"/tmp/{src_lang}-{tgt_lang}"
        if not os.path.exists(model_path):
            os.makedirs(model_path, exist_ok=True)
            # Download model files from S3
            for file in ["pytorch_model.bin", "vocab.json", "tokenizer_config.json", "config.json"]:
                s3_key = f"models/{src_lang}-{tgt_lang}/{file}"
                local_path = f"{model_path}/{file}"
                try:
                    s3.download_file(BUCKET_NAME, s3_key, local_path)
                except Exception as e:
                    print(f"Error downloading {s3_key}: {str(e)}")
        
        # Load from local path
        try:
            tokenizer = MarianTokenizer.from_pretrained(model_path)
            model = MarianMTModel.from_pretrained(model_path)
            return model, tokenizer
        except Exception as e:
            print(f"Error loading model from local path: {str(e)}")
    
    # Fallback to loading from HuggingFace
    print(f"Loading model {model_name} from HuggingFace")
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    return model, tokenizer

def translate_text(text, src_lang="es", tgt_lang="en"):
    """
    Translate text using the MarianMT model
    """
    model, tokenizer = load_model(src_lang, tgt_lang)
    
    # Handle longer texts by breaking them into chunks
    max_length = 512
    if len(text) > max_length:
        chunks = [text[i:i+max_length] for i in range(0, len(text), max_length)]
        translated_chunks = []
        for chunk in chunks:
            encoded = tokenizer(chunk, return_tensors="pt", padding=True, truncation=True)
            translated = model.generate(**encoded)
            translated_chunks.append(tokenizer.batch_decode(translated, skip_special_tokens=True)[0])
        return " ".join(translated_chunks)
    else:
        encoded = tokenizer(text, return_tensors="pt", padding=True, truncation=True)
        translated = model.generate(**encoded)
        return tokenizer.batch_decode(translated, skip_special_tokens=True)[0]

def lambda_handler(event, context):
    """
    AWS Lambda handler function
    """
    try:
        # Parse input
        body = json.loads(event["body"]) if "body" in event else event
        
        text = body.get("text", "")
        src_lang = body.get("src_lang", "es")
        tgt_lang = body.get("tgt_lang", "en")

        if not text:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Text is required"})
            }

        # Perform translation
        translated_text = translate_text(text, src_lang, tgt_lang)

        # Return result
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"  # For CORS
            },
            "body": json.dumps({
                "original": text,
                "translated": translated_text,
                "source_language": src_lang,
                "target_language": tgt_lang
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(e)})
        }
