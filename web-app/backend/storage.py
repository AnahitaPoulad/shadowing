import os
import boto3
from botocore.config import Config


def _configured() -> bool:
    return all(
        os.environ.get(k)
        for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME")
    )


def _client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload(local_path: str, key: str) -> None:
    """Upload a file to R2 and delete the local copy."""
    _client().upload_file(local_path, os.environ["R2_BUCKET_NAME"], key)
    os.remove(local_path)


def presigned_url(key: str, expires: int = 3600) -> str:
    return _client().generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["R2_BUCKET_NAME"], "Key": key},
        ExpiresIn=expires,
    )


def r2_key(lesson_id: int, audio_file: str) -> str:
    return f"lessons/{lesson_id}/{audio_file}"


# Expose whether R2 is active so callers can branch
is_configured = _configured
