import os
import argparse
import boto3
from transformers import MarianMTModel, MarianTokenizer

def download_and_upload_model(src_lang, tgt_lang, bucket_name):
    """
    Download model from HuggingFace and upload to S3
    """
    model_name = f"Helsinki-NLP/opus-mt-{src_lang}-{tgt_lang}"
    print(f"Downloading model {model_name}...")
    
    # Download model and tokenizer
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)
    
    # Save locally
    tmp_dir = f"/tmp/{src_lang}-{tgt_lang}"
    os.makedirs(tmp_dir, exist_ok=True)
    tokenizer.save_pretrained(tmp_dir)
    model.save_pretrained(tmp_dir)
    
    # Upload to S3
    print(f"Uploading model to S3 bucket {bucket_name}...")
    s3 = boto3.client("s3")
    
    for file in os.listdir(tmp_dir):
        file_path = os.path.join(tmp_dir, file)
        s3_key = f"models/{src_lang}-{tgt_lang}/{file}"
        print(f"Uploading {file_path} to {s3_key}...")
        s3.upload_file(file_path, bucket_name, s3_key)
    
    print("Upload complete!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download and upload MarianMT models to S3")
    parser.add_argument("--src", required=True, help="Source language code (e.g., es)")
    parser.add_argument("--tgt", required=True, help="Target language code (e.g., en)")
    parser.add_argument("--bucket", required=True, help="S3 bucket name")
    
    args = parser.parse_args()
    download_and_upload_model(args.src, args.tgt, args.bucket)
