// utils/upload.js - Centralized Multer and Cloudinary configuration
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables for Cloudinary credentials

// --- Cloudinary Configuration ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary Storage
// This 'storage' object will be used by Multer to send files to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async(req, file) => { // Use async params for dynamic folder/public_id if needed
    let folder = 'second-brain-general'; // Default folder
    let public_id_prefix = '';

    // Determine folder and public_id prefix based on file fieldname
    if (file.fieldname === 'image') { // For post images
      folder = 'second-brain-posts';
      public_id_prefix = 'post';
    } else if (file.fieldname === 'profilePicture') { // For profile pictures
      folder = 'second-brain-profile-pictures';
      public_id_prefix = 'profile';
    }

    return {
      folder: folder,
      format: 'png', // Always save as PNG for consistency, or use file.format
      public_id: `${public_id_prefix}-${Date.now()}-${file.originalname.split('.')[0]}`.replace(/[^a-zA-Z0-9-.]/g, ''),
    };
  },
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif'], // Allowed file formats
});

// Create the multer upload middleware instance
// This 'upload' instance can be imported and used in any route
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit for all uploads
  // Multer's fileFilter can also be used here if additional validation is needed
});

export default upload; // Export the configured upload middleware
