const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });

const ORIGINAL_BUCKET = process.env.S3_ORIGINAL_BUCKET;
const RESIZED_BUCKET = process.env.S3_RESIZED_BUCKET;

// Uploads a raw file buffer to the originals bucket under the given key
async function uploadImage(key, buffer, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: ORIGINAL_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

// Deletes an image from the originals bucket (called when a task is deleted)
async function deleteImage(key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: ORIGINAL_BUCKET,
      Key: key,
    })
  );
}

// Returns a short-lived signed URL so the frontend can display a private S3 image
async function getPresignedUrl(bucket, key, expiresIn = 3600) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}

module.exports = {
  uploadImage,
  deleteImage,
  getPresignedUrl,
  ORIGINAL_BUCKET,
  RESIZED_BUCKET,
};
