import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI + '/job-portal';

async function run() {
    await mongoose.connect(uri);
    const JobApplication = mongoose.model('JobApplication', new mongoose.Schema({}, { strict: false }));
    const app = await JobApplication.findOne().sort({ date: -1 });
    console.log('Application ID:', app._id);
    console.log('User ID:', app.userId);
    console.log('Job ID:', app.jobId);
    process.exit(0);
}
run();
