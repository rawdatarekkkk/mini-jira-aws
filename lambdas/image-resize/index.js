// Triggered by S3 PUT events on the originals bucket.
// Downloads the uploaded image, resizes it to max 400x400, and saves it to the resized bucket.
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

const s3 = new S3Client({});
const RESIZED_BUCKET = process.env.RESIZED_BUCKET;
const MAX_DIMENSION = 400;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

exports.handler = async (event) => {
  for (const record of event.Records) {
    const sourceBucket = record.s3.bucket.name;
    // S3 encodes special characters in the key — decode them back
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`Processing: s3://${sourceBucket}/${key}`);

    // Download the original image from S3
    const getResult = await s3.send(
      new GetObjectCommand({ Bucket: sourceBucket, Key: key })
    );
    const originalBuffer = await streamToBuffer(getResult.Body);
    const contentType = getResult.ContentType || "image/jpeg";

    // Resize: shrink to fit inside 400x400, never enlarge small images
    const resizedBuffer = await sharp(originalBuffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();

    // Save the thumbnail to the resized bucket under the same key
    await s3.send(
      new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: key,
        Body: resizedBuffer,
        ContentType: contentType,
      })
    );

    console.log(`Saved thumbnail to s3://${RESIZED_BUCKET}/${key}`);
  }
};
