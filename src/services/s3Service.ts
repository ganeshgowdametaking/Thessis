export async function uploadFileToS3PresignedUrl(file: File, presignedUrl: string) {
  // Extract the key from the presigned URL
  const url = new URL(presignedUrl);
  const key = url.pathname.substring(1); // Remove leading slash
  
  // Create FormData to send file through backend
  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', key);

  const response = await fetch('http://localhost:3001/upload-file', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to S3');
  }

  const result = await response.json();
  return result.url;
} 