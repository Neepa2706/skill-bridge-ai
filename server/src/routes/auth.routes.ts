import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute, resetUserData } from '../db/database.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;

/**
 * Strong password validator:
 * Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*).' };
  }
  return { valid: true };
}

/**
 * Generates and stores a 32-byte cryptographic email verification token
 */
function issueEmailVerificationToken(userId: string, email: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const id = `emv-${uuidv4()}`;

  // Invalidate any previous unused tokens for this user
  execute('UPDATE email_verifications SET used = 1 WHERE user_id = ? AND used = 0', [userId]);

  // Token valid for 24 hours
  execute(
    `INSERT INTO email_verifications (id, user_id, token_hash, expires_at, used, created_at)
     VALUES (?, ?, ?, datetime('now', '+24 hours'), 0, datetime('now'))`,
    [id, userId, tokenHash]
  );

  console.log(`[Email Verification] Token generated for ${email}: ${rawToken}`);
  console.log(`[Email Verification] URL: http://localhost:5173/?view=verify-email&token=${rawToken}`);

  return rawToken;
}

// ==========================================
// 1. STUDENT REGISTRATION (Step 2)
// ==========================================
const handleStudentRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      collegeName,
      department,
      degree,
      currentYear,
      section,
      graduationYear,
      targetRole,
      careerInterest,
      selfDeclaredLevel,
      agreedToTerms
    } = req.body;

    // Security check: Block public admin registration attempts
    if (req.body.role === 'admin') {
      res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
      return;
    }

    if (!agreedToTerms) {
      res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy to create an account.' });
      return;
    }

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Full name, email address, and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(String(phone).trim())) {
      res.status(400).json({ error: 'Please enter a valid contact phone number.' });
      return;
    }

    // Password strength check
    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ error: pwdCheck.error });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    // Duplicate email check
    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists. Please sign in instead.' });
      return;
    }

    const userId = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPhone = phone ? String(phone).trim() : null;

    execute(
      `INSERT INTO users (
        id, email, password_hash, name, role, phone, auth_provider,
        email_verified, account_status, profile_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'student', ?, 'email', 0, 'active', 0, datetime('now'), datetime('now'))`,
      [userId, cleanEmail, passwordHash, String(name).trim(), cleanPhone]
    );

    // Create student profile with Step 2 academic and self-declared career information
    const profileId = `prof-${uuidv4()}`;
    const cleanLevel = ['Beginner', 'Intermediate', 'Advanced'].includes(selfDeclaredLevel)
      ? selfDeclaredLevel
      : 'Beginner';
    const cleanRole = targetRole || careerInterest || 'Software Developer';

    execute(
      `INSERT INTO student_profiles (
        id, user_id, college_name, department, degree, current_year, section,
        graduation_year, year_of_study, career_interest, target_role_id,
        self_declared_level, current_level, programming_languages_json,
        communication_languages_json, learning_preferences_json,
        career_readiness_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'role-software-dev', ?, ?, '["Python"]', '["English"]', '["Hands-on Projects"]', 35.0, datetime('now'), datetime('now'))`,
      [
        profileId,
        userId,
        collegeName ? String(collegeName).trim() : 'Engineering Institute',
        department ? String(department).trim() : 'Computer Science & Engineering',
        degree ? String(degree).trim() : 'Bachelor of Technology (B.Tech)',
        Number(currentYear) || 1,
        section ? String(section).trim() : 'A',
        Number(graduationYear) || (new Date().getFullYear() + 2),
        Number(currentYear) || 1,
        cleanRole,
        cleanLevel,
        cleanLevel
      ]
    );

    // Initialize coding streak
    execute(
      `INSERT INTO coding_streaks (id, student_id, user_id, current_streak, longest_streak, streak_calendar_json, badges_json)
       VALUES (?, ?, ?, 0, 0, '[]', '[]')`,
      [`strk-${uuidv4()}`, userId, userId]
    );

    // Issue email verification token
    const verificationToken = issueEmailVerificationToken(userId, cleanEmail);

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: String(name).trim(),
      role: 'student' as const,
      phone: cleanPhone,
      email_verified: 0,
      account_status: 'active',
      auth_provider: 'email',
      profile_completed: 0
    };

    const token = generateToken(userObj);

    res.status(201).json({
      message: 'Student account created successfully! Please verify your email to activate your account.',
      token,
      user: userObj,
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Student registration failed.' });
  }
};

router.post('/register/student', handleStudentRegistration);
router.post('/register', handleStudentRegistration); // backwards-compatible alias

// ==========================================
// 2. COLLEGE / DEPARTMENT REGISTRATION (Step 2)
// ==========================================
router.post('/register/college', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      institutionName,
      departmentName,
      officialEmail,
      contactPersonName,
      designation,
      phone,
      password,
      confirmPassword,
      agreedToTerms
    } = req.body;

    if (req.body.role === 'admin') {
      res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
      return;
    }

    if (!agreedToTerms) {
      res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
      return;
    }

    if (!institutionName || !officialEmail || !password || !contactPersonName) {
      res.status(400).json({ error: 'Institution name, official email, contact person, and password are required.' });
      return;
    }

    const cleanEmail = String(officialEmail).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid official institutional email address.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(String(phone).trim())) {
      res.status(400).json({ error: 'Please enter a valid contact phone number.' });
      return;
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ error: pwdCheck.error });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this institutional email address already exists.' });
      return;
    }

    const userId = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPhone = phone ? String(phone).trim() : null;

    // College accounts start in 'pending_verification' status to safeguard institutional access
    execute(
      `INSERT INTO users (
        id, email, password_hash, name, role, phone, auth_provider,
        email_verified, account_status, profile_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'college', ?, 'email', 0, 'pending_verification', 0, datetime('now'), datetime('now'))`,
      [userId, cleanEmail, passwordHash, String(contactPersonName).trim(), cleanPhone]
    );

    const collegeId = `clg-${uuidv4()}`;
    execute(
      `INSERT INTO colleges (
        id, user_id, name, institution_name, contact_email, contact_person_name,
        designation, phone, verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', datetime('now'))`,
      [
        collegeId,
        userId,
        String(institutionName).trim(),
        String(institutionName).trim(),
        cleanEmail,
        String(contactPersonName).trim(),
        designation ? String(designation).trim() : 'Department Head / Placement Coordinator',
        cleanPhone
      ]
    );

    if (departmentName) {
      execute(
        `INSERT INTO departments (id, college_id, name, hod_name) VALUES (?, ?, ?, ?)`,
        [`dept-${uuidv4()}`, collegeId, String(departmentName).trim(), String(contactPersonName).trim()]
      );
    }

    const verificationToken = issueEmailVerificationToken(userId, cleanEmail);

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: String(contactPersonName).trim(),
      role: 'college' as const,
      phone: cleanPhone,
      email_verified: 0,
      account_status: 'pending_verification',
      auth_provider: 'email',
      profile_completed: 0
    };

    const token = generateToken(userObj);

    res.status(201).json({
      message: 'College / Department registered successfully! Account status is pending institutional verification.',
      token,
      user: userObj,
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'College registration failed.' });
  }
});

// ==========================================
// 3. RECRUITER / COMPANY REGISTRATION (Step 2)
// ==========================================
router.post('/register/recruiter', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      companyEmail,
      recruiterName,
      designation,
      phone,
      industry,
      website,
      password,
      confirmPassword,
      agreedToTerms
    } = req.body;

    if (req.body.role === 'admin') {
      res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
      return;
    }

    if (!agreedToTerms) {
      res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
      return;
    }

    if (!companyName || !companyEmail || !password || !recruiterName) {
      res.status(400).json({ error: 'Company name, company email, recruiter name, and password are required.' });
      return;
    }

    const cleanEmail = String(companyEmail).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid corporate email address.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(String(phone).trim())) {
      res.status(400).json({ error: 'Please enter a valid contact phone number.' });
      return;
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ error: pwdCheck.error });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this company email address already exists.' });
      return;
    }

    const userId = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPhone = phone ? String(phone).trim() : null;

    // Recruiter accounts start in 'pending_verification' status
    execute(
      `INSERT INTO users (
        id, email, password_hash, name, role, phone, auth_provider,
        email_verified, account_status, profile_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'recruiter', ?, 'email', 0, 'pending_verification', 0, datetime('now'), datetime('now'))`,
      [userId, cleanEmail, passwordHash, String(recruiterName).trim(), cleanPhone]
    );

    const companyId = `comp-${uuidv4()}`;
    execute(
      `INSERT INTO companies (
        id, user_id, name, company_name, company_email, recruiter_name,
        designation, phone, industry, website, verified, verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending_verification', datetime('now'))`,
      [
        companyId,
        userId,
        String(companyName).trim(),
        String(companyName).trim(),
        cleanEmail,
        String(recruiterName).trim(),
        designation ? String(designation).trim() : 'Talent Acquisition / HR Lead',
        cleanPhone,
        industry ? String(industry).trim() : 'Technology & Services',
        website ? String(website).trim() : null
      ]
    );

    const verificationToken = issueEmailVerificationToken(userId, cleanEmail);

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: String(recruiterName).trim(),
      role: 'recruiter' as const,
      phone: cleanPhone,
      email_verified: 0,
      account_status: 'pending_verification',
      auth_provider: 'email',
      profile_completed: 0
    };

    const token = generateToken(userObj);

    res.status(201).json({
      message: 'Recruiter account registered successfully! Status is pending company verification.',
      token,
      user: userObj,
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Recruiter registration failed.' });
  }
});

// ==========================================
// 4. MENTOR REGISTRATION (Step 2)
// ==========================================
router.post('/register/mentor', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      phone,
      designation,
      expertise,
      experienceYears,
      password,
      confirmPassword,
      agreedToTerms
    } = req.body;

    if (req.body.role === 'admin') {
      res.status(403).json({ error: 'Administrator accounts cannot be created via public registration.' });
      return;
    }

    if (!agreedToTerms) {
      res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
      return;
    }

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Full name, email address, and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (phone && !PHONE_REGEX.test(String(phone).trim())) {
      res.status(400).json({ error: 'Please enter a valid contact phone number.' });
      return;
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ error: pwdCheck.error });
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const userId = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const cleanPhone = phone ? String(phone).trim() : null;

    // Mentor accounts start in 'pending_verification' status
    execute(
      `INSERT INTO users (
        id, email, password_hash, name, role, phone, auth_provider,
        email_verified, account_status, profile_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'mentor', ?, 'email', 0, 'pending_verification', 0, datetime('now'), datetime('now'))`,
      [userId, cleanEmail, passwordHash, String(name).trim(), cleanPhone]
    );

    const expertiseList = expertise
      ? Array.isArray(expertise)
        ? expertise
        : String(expertise).split(',').map((s) => s.trim()).filter(Boolean)
      : ['System Design', 'Mock Interviews'];

    execute(
      `INSERT INTO mentors (
        id, user_id, name, designation, phone, expertise_json,
        years_experience, verification_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_verification', datetime('now'))`,
      [
        `mnt-${uuidv4()}`,
        userId,
        String(name).trim(),
        designation ? String(designation).trim() : 'Senior Software Engineer / Tech Lead',
        cleanPhone,
        JSON.stringify(expertiseList),
        Number(experienceYears) || 3
      ]
    );

    const verificationToken = issueEmailVerificationToken(userId, cleanEmail);

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: String(name).trim(),
      role: 'mentor' as const,
      phone: cleanPhone,
      email_verified: 0,
      account_status: 'pending_verification',
      auth_provider: 'email',
      profile_completed: 0
    };

    const token = generateToken(userObj);

    res.status(201).json({
      message: 'Mentor account registered successfully! Status is pending verification.',
      token,
      user: userObj,
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Mentor registration failed.' });
  }
});

// ==========================================
// 4B. ADMIN REGISTRATION (Protected by setup secret)
// ==========================================
router.post('/register/admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, adminSecret } = req.body;
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'skillbridge-admin-key-2026';

    if (!adminSecret || adminSecret !== expectedSecret) {
      res.status(403).json({ error: 'Invalid or missing administrator setup secret.' });
      return;
    }

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.valid) {
      res.status(400).json({ error: pwdCheck.error });
      return;
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const userId = `usr-${uuidv4()}`;
    const passwordHash = await bcrypt.hash(password, 10);

    execute(
      `INSERT INTO users (
        id, email, password_hash, name, role, auth_provider,
        email_verified, account_status, profile_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'admin', 'email', 1, 'active', 1, datetime('now'), datetime('now'))`,
      [userId, cleanEmail, passwordHash, String(name).trim()]
    );

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: String(name).trim(),
      role: 'admin' as const,
      email_verified: 1,
      account_status: 'active',
      auth_provider: 'email',
      profile_completed: 1
    };

    const token = generateToken(userObj);

    res.status(201).json({
      message: 'Administrator account created successfully!',
      token,
      user: userObj
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Admin registration failed.' });
  }
});

// ==========================================
// 5. EMAIL VERIFICATION (Step 2)
// ==========================================
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Verification token is required.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const record = queryOne(
      `SELECT * FROM email_verifications 
       WHERE token_hash = ? AND used = 0 AND datetime(expires_at) > datetime('now')`,
      [tokenHash]
    );

    if (!record) {
      res.status(400).json({ error: 'Invalid, used, or expired email verification token. Please request a new one.' });
      return;
    }

    // Mark email as verified
    execute("UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?", [record.user_id]);
    execute('UPDATE email_verifications SET used = 1 WHERE id = ?', [record.id]);

    const updatedUser = queryOne(
      'SELECT id, email, name, role, phone, auth_provider, email_verified, account_status, profile_completed FROM users WHERE id = ?',
      [record.user_id]
    );

    res.json({
      message: 'Email address verified successfully! Your SkillBridge AI account is now active.',
      user: updatedUser
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Email verification failed.' });
  }
});

// ==========================================
// 6. RESEND EMAIL VERIFICATION
// ==========================================
router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({ error: 'Please provide a valid registered email address.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = queryOne('SELECT id, email, email_verified FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    let devToken: string | undefined = undefined;

    if (user && !user.email_verified) {
      devToken = issueEmailVerificationToken(user.id, cleanEmail);
    }

    res.json({
      message: 'If an unverified account with that email exists, a fresh verification token has been dispatched.',
      verificationToken: process.env.NODE_ENV !== 'production' ? devToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resend verification token.' });
  }
});

// ==========================================
// 7. EMAIL / PASSWORD LOGIN
// ==========================================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const user = queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    // Check if account is Google-only
    if (!user.password_hash && user.auth_provider === 'google') {
      res.status(400).json({
        error: "This account was registered using Google Sign-In. Please click 'Continue with Google' to sign in."
      });
      return;
    }

    if (!user.password_hash) {
      res.status(401).json({ error: 'Password authentication not configured for this user.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password credentials.' });
      return;
    }

    // Update last_login
    execute("UPDATE users SET last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?", [user.id]);

    const userObj = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      phone: user.phone,
      auth_provider: user.auth_provider || 'email',
      email_verified: user.email_verified || 0,
      account_status: user.account_status || 'active',
      profile_completed: user.profile_completed || 0
    };

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.json({
      message: 'Authentication successful.',
      token,
      user: userObj
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// ==========================================
// 8. GOOGLE OAUTH INITIATION
// ==========================================
router.get('/google', (req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>SkillBridge AI — Google OAuth Configuration</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #070913; color: #f1f5f9; padding: 40px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
          .card { background: #0f172a; border: 1px solid rgba(147, 51, 234, 0.4); border-radius: 16px; padding: 36px; max-width: 600px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
          h2 { margin-top: 0; color: #a855f7; display: flex; align-items: center; gap: 10px; }
          code { background: #1e293b; color: #38bdf8; padding: 3px 8px; border-radius: 6px; font-size: 14px; }
          pre { background: #020617; padding: 16px; border-radius: 8px; overflow-x: auto; color: #e2e8f0; font-size: 13px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>⚡ Google OAuth Setup Required</h2>
          <p>The backend OAuth handler is fully ready and waiting for your Google Cloud credentials.</p>
          <p>To enable real Google Sign-In with your Google Workspace / Cloud Console, add the following variables to <code>server/.env</code>:</p>
          <pre>GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com\nGOOGLE_CLIENT_SECRET=your_client_secret_here\nGOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback</pre>
          <p>In the Google Cloud Console (Credentials &gt; OAuth 2.0 Client IDs), set the Authorized Redirect URI to:<br><code>http://localhost:5000/api/auth/google/callback</code></p>
          <a href="http://localhost:5173" class="btn">← Back to SkillBridge Sign In</a>
        </div>
      </body>
      </html>
    `);
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const scope = encodeURIComponent('openid email profile');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&prompt=select_account`;

  res.redirect(authUrl);
});

// ==========================================
// 9. GOOGLE OAUTH CALLBACK
// ==========================================
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

  const { code, error } = req.query;

  if (error || !code) {
    res.redirect(`${clientUrl}/?oauth_error=${encodeURIComponent(String(error || 'Google authorization was denied or cancelled.'))}`);
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[Google OAuth] Token exchange failed:', errBody);
      res.redirect(`${clientUrl}/?oauth_error=Token+exchange+with+Google+failed`);
      return;
    }

    const tokenData = (await tokenRes.json()) as any;

    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userInfoRes.ok) {
      res.redirect(`${clientUrl}/?oauth_error=Failed+to+fetch+Google+user+profile`);
      return;
    }

    const googleUser = (await userInfoRes.json()) as any;
    const googleEmail = String(googleUser.email || '').toLowerCase().trim();
    const googleName = googleUser.name || 'Google User';
    const googleAvatar = googleUser.picture || null;

    if (!googleEmail) {
      res.redirect(`${clientUrl}/?oauth_error=Google+did+not+return+an+email+address`);
      return;
    }

    let user = queryOne('SELECT * FROM users WHERE LOWER(email) = ?', [googleEmail]);

    if (!user) {
      const newUserId = `usr-${uuidv4()}`;
      execute(
        `INSERT INTO users (
          id, email, password_hash, name, role, avatar_url, auth_provider,
          email_verified, account_status, profile_completed, last_login, created_at, updated_at
        ) VALUES (?, ?, NULL, ?, 'student', ?, 'google', 1, 'active', 0, datetime('now'), datetime('now'), datetime('now'))`,
        [newUserId, googleEmail, googleName, googleAvatar]
      );

      execute(
        `INSERT INTO student_profiles (
          id, user_id, college_name, department, year_of_study, career_interest,
          target_role_id, programming_languages_json, communication_languages_json,
          learning_preferences_json, career_readiness_score, created_at, updated_at
        ) VALUES (?, ?, 'University Campus', 'Computer Science & Engineering', 1, 'Software Developer', 'role-software-dev', '["Python"]', '["English"]', '["Hands-on Projects"]', 35.0, datetime('now'), datetime('now'))`,
        [`prof-${uuidv4()}`, newUserId]
      );

      execute(
        `INSERT INTO coding_streaks (id, student_id, user_id, current_streak, longest_streak, streak_calendar_json, badges_json)
         VALUES (?, ?, ?, 0, 0, '[]', '[]')`,
        [`strk-${uuidv4()}`, newUserId, newUserId]
      );

      user = queryOne('SELECT * FROM users WHERE id = ?', [newUserId]);
    } else {
      execute(
        "UPDATE users SET last_login = datetime('now'), avatar_url = COALESCE(avatar_url, ?), email_verified = 1, updated_at = datetime('now') WHERE id = ?",
        [googleAvatar, user.id]
      );
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.redirect(`${clientUrl}/?token=${token}&role=${user.role}&login_method=google`);
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]:', err);
    res.redirect(`${clientUrl}/?oauth_error=${encodeURIComponent(err.message || 'OAuth authentication failed')}`);
  }
});

// ==========================================
// 10. FORGOT PASSWORD
// ==========================================
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(String(email).trim())) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = queryOne('SELECT id, email, name FROM users WHERE LOWER(email) = ?', [cleanEmail]);

    let devToken: string | undefined = undefined;

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const resetId = `rst-${uuidv4()}`;

      execute('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

      execute(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
         VALUES (?, ?, ?, datetime('now', '+1 hour'), 0, datetime('now'))`,
        [resetId, user.id, tokenHash]
      );

      devToken = rawToken;
      console.log(`[Password Reset] Generated reset token for ${cleanEmail}: ${rawToken}`);
    }

    res.json({
      message: 'If an account with that email exists, password reset instructions have been dispatched.',
      devToken: process.env.NODE_ENV !== 'production' ? devToken : undefined
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password reset request failed.' });
  }
});

// ==========================================
// 11. RESET PASSWORD
// ==========================================
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Password reset token is required.' });
      return;
    }

    if (!newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');

    const resetRecord = queryOne(
      `SELECT * FROM password_resets 
       WHERE token_hash = ? AND used = 0 AND datetime(expires_at) > datetime('now')`,
      [tokenHash]
    );

    if (!resetRecord) {
      res.status(400).json({ error: 'Invalid, used, or expired password reset token. Please request a new link.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    execute(
      "UPDATE users SET password_hash = ?, auth_provider = 'email', updated_at = datetime('now') WHERE id = ?",
      [newHash, resetRecord.user_id]
    );

    execute('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    res.json({
      message: 'Password reset successful! You can now sign in with your new password.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password reset failed.' });
  }
});

// ==========================================
// 12. LOGOUT
// ==========================================
router.post('/logout', (req: Request, res: Response): void => {
  res.json({ message: 'Signed out successfully. User session terminated.' });
});

// ==========================================
// 13. DEMO ROLE SWITCH (DISABLED)
// ==========================================
router.post('/demo-switch', (_req: Request, res: Response): void => {
  res.status(403).json({
    error: 'Demo role switching has been permanently disabled. Please register or sign in with real user credentials.',
    code: 'DEMO_DISABLED'
  });
});

// ==========================================
// 13B. DEV DATABASE RESET (Dev-only endpoint)
// ==========================================
router.post('/dev/reset-database', (_req: Request, res: Response): void => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({ error: 'Database reset is strictly forbidden in production.' });
    return;
  }
  try {
    const result = resetUserData(false);
    res.json({
      success: true,
      message: 'All user records, tests, reports, recommendations, and activity have been cleanly reset.',
      clearedTables: result.clearedTables
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Database reset failed.' });
  }
});

// ==========================================
// 14. GET CURRENT AUTHENTICATED USER PROFILE
// ==========================================
router.get('/me', authenticateToken, (req: Request, res: Response): void => {
  try {
    const userId = req.user!.id;
    const user = queryOne(
      'SELECT id, email, name, role, avatar_url, phone, auth_provider, email_verified, account_status, profile_completed, last_login, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      res.status(404).json({ error: 'User record not found.' });
      return;
    }

    let extraProfile = null;
    if (user.role === 'student') {
      extraProfile = queryOne('SELECT * FROM student_profiles WHERE user_id = ?', [userId]);
      if (extraProfile) {
        extraProfile.programmingLanguages = JSON.parse(extraProfile.programming_languages_json || '[]');
        extraProfile.communicationLanguages = JSON.parse(extraProfile.communication_languages_json || '[]');
        extraProfile.learningPreferences = JSON.parse(extraProfile.learning_preferences_json || '[]');
      }
    } else if (user.role === 'mentor') {
      extraProfile = queryOne('SELECT * FROM mentors WHERE user_id = ?', [userId]);
    } else if (user.role === 'recruiter') {
      extraProfile = queryOne('SELECT * FROM companies WHERE user_id = ?', [userId]);
    } else if (user.role === 'college') {
      extraProfile = queryOne('SELECT * FROM colleges WHERE user_id = ?', [userId]);
    }

    res.json({
      user,
      profile: extraProfile
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not fetch user details.' });
  }
});

export default router;
