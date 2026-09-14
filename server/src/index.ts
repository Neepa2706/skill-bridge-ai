import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initDatabase, queryOne } from './db/database.js';
import { auditLog, errorHandler } from './middleware/security.js';

// Route imports
import authRouter from './routes/auth.routes.js';
import studentRouter from './routes/student.routes.js';
import assessmentRouter from './routes/assessment.routes.js';
import learningRouter from './routes/learning.routes.js';
import codingRouter from './routes/coding.routes.js';
import languageRouter from './routes/language.routes.js';
import opportunitiesRouter from './routes/opportunities.routes.js';
import interviewRouter from './routes/interview.routes.js';
import collegeRouter from './routes/college.routes.js';
import recruiterRouter from './routes/recruiter.routes.js';
import mentorRouter from './routes/mentor.routes.js';
import adminRouter from './routes/admin.routes.js';
import notificationsRouter from './routes/notifications.routes.js';
import mockTestRouter from './routes/mockTest.routes.js';
import communicationRouter from './routes/communication.routes.js';
import matchingRouter from './routes/matching.routes.js';
import reportsRouter from './routes/reports.routes.js';
import aiConfigRouter from './routes/aiConfig.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database
initDatabase();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// System Audit Logging
app.use(auditLog('API_ACCESS', 'SYSTEM'));

// API Routes
app.use('/api/auth', authRouter);
app.use('/auth', authRouter);
app.use('/api/student', studentRouter);
app.use('/api/student', learningRouter);
app.use('/student', learningRouter);
app.use('/api/student', mockTestRouter);
app.use('/student', mockTestRouter);
app.use('/api/assessment', assessmentRouter);
app.use('/api/ai', aiConfigRouter);
app.use('/api/learning', learningRouter);
app.use('/learning', learningRouter);
app.use('/api/student/coding', codingRouter);
app.use('/student/coding', codingRouter);
app.use('/api/coding', codingRouter);
app.use('/api/admin/coding', codingRouter);
app.use('/admin/coding', codingRouter);
app.use('/api/student/communication', communicationRouter);
app.use('/student/communication', communicationRouter);
app.use('/api/communication', communicationRouter);
app.use('/communication', communicationRouter);
app.use('/api/language', languageRouter);
app.use('/api/opportunities', matchingRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/opportunities', matchingRouter);
app.use('/opportunities', opportunitiesRouter);
app.use('/api/student', matchingRouter);
app.use('/student', matchingRouter);
app.use('/api/saved-opportunities', (req, res, next) => {
  req.url = '/saved' + (req.url === '/' ? '' : req.url);
  opportunitiesRouter(req, res, next);
});
app.use('/api/student/saved-opportunities', (req, res, next) => {
  req.url = '/saved' + (req.url === '/' ? '' : req.url);
  opportunitiesRouter(req, res, next);
});
app.use('/api/student/applications', (req, res, next) => {
  req.url = '/applications' + (req.url === '/' ? '' : req.url);
  opportunitiesRouter(req, res, next);
});
app.use('/api/applications', (req, res, next) => {
  req.url = '/applications' + (req.url === '/' ? '' : req.url);
  opportunitiesRouter(req, res, next);
});
app.use('/api/admin/opportunity-reports', (req, res, next) => {
  req.url = '/admin/reports' + (req.url === '/' ? '' : req.url);
  opportunitiesRouter(req, res, next);
});
app.use('/api/interview', interviewRouter);
app.use('/api/student/mock-interview', interviewRouter);
app.use('/api/mock-interview', interviewRouter);
app.use('/student/mock-interview', interviewRouter);
app.use('/api/college', collegeRouter);
app.use('/api/recruiter', recruiterRouter);
app.use('/api/mentor', mentorRouter);
app.use('/mentor', mentorRouter);
app.use('/api/mentors', mentorRouter);
app.use('/api/mentorship-requests', mentorRouter);
app.use('/api/student/mentorship-requests', (req, res, next) => {
  req.url = '/student-requests' + (req.url === '/' ? '' : req.url);
  mentorRouter(req, res, next);
});
app.use('/api/student/mentor-sessions', (req, res, next) => {
  req.url = '/student-sessions' + (req.url === '/' ? '' : req.url);
  mentorRouter(req, res, next);
});
app.use('/api/student/privacy-settings', (req, res, next) => {
  req.url = '/privacy-settings' + (req.url === '/' ? '' : req.url);
  mentorRouter(req, res, next);
});
app.use('/api/admin', adminRouter);
app.use('/admin', adminRouter);
app.use('/api/admin', mockTestRouter);
app.use('/admin', mockTestRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/reports', reportsRouter);

// Healthcheck
app.get('/api/health', (req, res) => {
  let dbStatus = 'connected';
  try {
    const check = queryOne('SELECT 1 as healthy');
    if (!check) dbStatus = 'unresponsive';
  } catch (e: any) {
    dbStatus = 'error: ' + e.message;
  }

  res.json({
    status: 'healthy',
    platform: 'SkillBridge AI Career Readiness Ecosystem',
    version: '1.0.0',
    database: dbStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    activeEngines: [
      'mock-interview',
      'adaptive-assessment',
      'gap-analysis',
      'matching-engine',
      'code-sandbox',
      'multilingual-communication',
      'mentor-support',
      'recruiter-governance',
      'college-analytics',
      'audit-security'
    ],
    timestamp: new Date().toISOString()
  });
});

// Production client static file serving
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('SkillBridge AI Server Running. In development, run client on port 5173.');
    }
  });
});

// Global Error Handler
app.use(errorHandler);

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 SKILLBRIDGE AI SERVER RUNNING ON http://localhost:${PORT}`);
  console.log(`✨ Continuous Career-Development Engine Active`);
  console.log(`✨ ASSESS → ANALYSE → LEARN → PRACTICE → TEST → PLACEMENT`);
  console.log(`=======================================================`);
});

export default app;
