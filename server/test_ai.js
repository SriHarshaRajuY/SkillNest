import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const uri = 'mongodb+srv://sriharsharajuy_db_user:skillnest@cluster0.ozeqynm.mongodb.net/job-portal';

async function run() {
  await mongoose.connect(uri);
  const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({
    userId: String, jobId: mongoose.Schema.Types.ObjectId, companyId: mongoose.Schema.Types.ObjectId
  }, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({ _id: String, resume: String }, { strict: false }));
  const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));

  const application = await JobApplication.findOne().lean();
  if (!application) return console.log('No applications found');

  const user = await User.findById(application.userId).lean();
  const job = await Job.findById(application.jobId).lean();

  console.log('Resume URL:', user.resume);

  try {
    const response = await fetch(user.resume);
    if (!response.ok) throw new Error('Failed to fetch resume');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const resumeText = pdfData.text;

    console.log('Resume parsed successfully, length:', resumeText.length);

    const genAI = new GoogleGenerativeAI('AIzaSyC1TwgBvD7_apFBeCrxxt7xvzcQc2g82ds');
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are an expert ATS (Applicant Tracking System). 
Compare the following Job Description to the candidate's Resume Text.
Provide a match score out of 100, and a concise 2-sentence reason.
Return ONLY valid JSON in the exact format:
{
  "score": 85,
  "reason": "The candidate has strong React skills but lacks the required 5 years of Python experience."
}

Job Description:
${job.description}

Resume Text:
${resumeText}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('Gemini raw response:', responseText);

    let cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    console.log('Parsed successfully:', parsed);

  } catch (e) {
    console.error('Error during processing:', e);
  }

  process.exit();
}
run();
