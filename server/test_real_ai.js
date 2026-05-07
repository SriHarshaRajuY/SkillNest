import 'dotenv/config';
import mongoose from 'mongoose';
import JobApplication from './models/JobApplication.js';
import { getSignedResumeUrl } from './controllers/userController.js';
import aiService from './services/aiService.js';

const uri = 'mongodb+srv://sriharsharajuy_db_user:skillnest@cluster0.ozeqynm.mongodb.net/job-portal';

async function testMatch() {
  await mongoose.connect(uri);
  
  const app = await JobApplication.findOne({}).populate('userId', 'resume').populate('jobId', 'description');
  if (!app) {
    console.log('No applications found.');
    process.exit();
  }

  try {
    const signedUrl = getSignedResumeUrl(app.userId.resume);
    console.log('Signed URL:', signedUrl);
    
    const response = await fetch(signedUrl);
    console.log('Fetch Status:', response.status);
    if (!response.ok) {
       const txt = await response.text();
       console.log('Error Body:', txt);
       throw new Error('Failed to fetch securely');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Buffer size:', buffer.length);
    
    const text = await aiService.parsePDF(buffer);
    console.log('Parsed text length:', text.length);
    
    const match = await aiService.generateMatchScore(text, app.jobId.description);
    console.log('AI Result:', match);
  } catch (err) {
    console.error('Test Failed:', err);
  }
  
  process.exit();
}

testMatch();
