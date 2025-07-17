export async function uploadFileToS3PresignedUrl(file: File, presignedUrl: string) {
  // For development: Convert file to base64 instead of uploading to S3
  return new Promise<string>((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => resolve(fileReader.result as string);
    fileReader.onerror = reject;
    fileReader.readAsDataURL(file);
  });
} 