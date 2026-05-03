import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { extractCloudinaryAsset } from './utils/fileHelpers.js';
import 'dotenv/config';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uri = 'mongodb+srv://sriharsharajuy_db_user:skillnest@cluster0.ozeqynm.mongodb.net/job-portal';

async function migrate() {
  await mongoose.connect(uri);
  const User = mongoose.model('User', new mongoose.Schema({ _id: String, resume: String }, { strict: false }));
  
  const users = await User.find({ resume: { $exists: true, $ne: '' } });
  console.log('Found', users.length, 'users');
  
  for (const user of users) {
    const asset = extractCloudinaryAsset(user.resume);
    if (!asset) continue;
    
    try {
      console.log(`Migrating: ${asset.publicId} (type: ${asset.resourceType})`);
      
      await cloudinary.uploader.rename(asset.publicId, asset.publicId, { 
        resource_type: asset.resourceType, 
        type: 'upload', 
        to_type: 'private' 
      });
      console.log('Success!');
    } catch (err) {
       console.error('Error:', err.message);
    }
  }
  process.exit();
}
migrate();
