import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from './errors';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new AppError('VALIDATION_ERROR', 400, 'Only JPEG, PNG or WEBP images are allowed'));
    }
    cb(null, true);
  },
}).single('image');

export type CloudinaryAsset = { url: string; publicId: string };

export function uploadCloudinaryAsset(
  file: Express.Multer.File,
  folder: string,
): Promise<CloudinaryAsset> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url || !result.public_id) {
        return reject(new Error('Cloudinary upload did not return an asset identifier'));
      }
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.on('error', reject);
    stream.end(file.buffer);
  });
}

export async function toCloudinary(file: Express.Multer.File, folder: string): Promise<string> {
  const asset = await uploadCloudinaryAsset(file, folder);
  return asset.url;
}

export function deleteCloudinaryAsset(publicId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
      if (error) return reject(error);
      if (result?.result !== 'ok' && result?.result !== 'not found') {
        return reject(new Error('Cloudinary did not confirm asset deletion'));
      }
      resolve();
    });
  });
}
