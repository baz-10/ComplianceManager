import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { ApiError, sendErrorResponse } from '../utils/errorHandler';
import crypto from 'crypto';

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to prevent conflicts
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    // Sanitize filename
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '');
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only accept images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const UploadController = {
  async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        throw new ApiError('No image file provided', 400, 'NO_FILE');
      }

      // Build the URL for the uploaded image
      const imageUrl = `/uploads/images/${req.file.filename}`;

      res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      sendErrorResponse(res, error);
    }
  },

  async deleteImage(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        throw new ApiError('Filename is required', 400, 'MISSING_FILENAME');
      }

      // Sanitize filename to prevent directory traversal
      const safeName = path.basename(filename);
      const filePath = path.join(UPLOAD_DIR, safeName);

      // Check if file exists
      await fs.access(filePath);
      
      // Delete the file
      await fs.unlink(filePath);

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new ApiError('Image not found', 404, 'NOT_FOUND');
      }
      sendErrorResponse(res, error);
    }
  }
};