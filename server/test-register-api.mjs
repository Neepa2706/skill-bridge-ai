// Automated verification script for SkillBridge AI Step 2 Registration & Verification APIs
const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting Step 2 Registration & Verification API Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${extra}`);
      failed++;
    }
  }

  try {
    const timestamp = Date.now();
    const testStudentEmail = `student_${timestamp}@skillbridge.ai`;
    const testCollegeEmail = `college_${timestamp}@skillbridge.ai`;
    const testRecruiterEmail = `recruiter_${timestamp}@skillbridge.ai`;
    const testMentorEmail = `mentor_${timestamp}@skillbridge.ai`;

    // 1. Password Strength Validation Tests
    const resWeak = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `weak_${timestamp}@skillbridge.ai`,
        password: 'weak',
        confirmPassword: 'weak',
        agreedToTerms: true
      })
    });
    assert(resWeak.status === 400, 'POST /register/student rejects passwords < 8 chars with 400');

    const resNoUpper = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `noupper_${timestamp}@skillbridge.ai`,
        password: 'password123!',
        confirmPassword: 'password123!',
        agreedToTerms: true
      })
    });
    assert(resNoUpper.status === 400, 'POST /register/student rejects passwords lacking uppercase letter');

    const resNoSpecial = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `nospecial_${timestamp}@skillbridge.ai`,
        password: 'Password123',
        confirmPassword: 'Password123',
        agreedToTerms: true
      })
    });
    assert(resNoSpecial.status === 400, 'POST /register/student rejects passwords lacking special characters');

    // 2. Password Mismatch Test
    const resMismatch = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `mismatch_${timestamp}@skillbridge.ai`,
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        agreedToTerms: true
      })
    });
    assert(resMismatch.status === 400, 'POST /register/student rejects mismatched passwords');

    // 3. Terms of Service Validation
    const resNoTerms = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `noterms_${timestamp}@skillbridge.ai`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreedToTerms: false
      })
    });
    assert(resNoTerms.status === 400, 'POST /register/student requires agreedToTerms');

    // 4. Admin Registration Block (Security Requirement)
    const resAdminBlock = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Malicious Admin Attempt',
        email: `fakeadmin_${timestamp}@skillbridge.ai`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'admin',
        agreedToTerms: true
      })
    });
    assert(resAdminBlock.status === 403, 'Public registration blocks Admin role registration with 403 Forbidden');

    // 5. Valid Student Registration
    const resStudent = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee',
        email: testStudentEmail,
        phone: '+1 555-0199',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        collegeName: 'State Tech University',
        department: 'Computer Science',
        degree: 'B.Tech CS',
        currentYear: 3,
        section: 'B',
        graduationYear: 2026,
        targetRole: 'Full Stack Engineer',
        selfDeclaredLevel: 'Intermediate',
        agreedToTerms: true
      })
    });
    const dataStudent = await resStudent.json();
    assert(
      resStudent.status === 201 && dataStudent.verificationToken && dataStudent.user.role === 'student',
      'POST /register/student successfully provisions student with verification token'
    );
    const verificationToken = dataStudent.verificationToken;

    // 6. Duplicate Email Registration Test
    const resDup = await fetch(`${API_BASE}/api/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jordan Lee Duplicate',
        email: testStudentEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreedToTerms: true
      })
    });
    assert(resDup.status === 400, 'POST /register/student rejects duplicate email');

    // 7. College Registration
    const resCollege = await fetch(`${API_BASE}/api/auth/register/college`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionName: 'Apex Institute of Technology',
        departmentName: 'School of Computing',
        officialEmail: testCollegeEmail,
        contactPersonName: 'Dean Robert Hayes',
        designation: 'Head of Placement',
        phone: '+1 555-0288',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreedToTerms: true
      })
    });
    const dataCollege = await resCollege.json();
    assert(
      resCollege.status === 201 && dataCollege.user.account_status === 'pending_verification',
      'POST /register/college successfully registers institution with pending_verification status'
    );

    // 8. Recruiter Registration
    const resRecruiter = await fetch(`${API_BASE}/api/auth/register/recruiter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Nova Cloud Systems',
        companyEmail: testRecruiterEmail,
        recruiterName: 'Samantha Brooks',
        designation: 'Senior Technical Recruiter',
        phone: '+1 555-0377',
        industry: 'Cloud Infrastructure',
        website: 'https://novacloud.example',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreedToTerms: true
      })
    });
    const dataRecruiter = await resRecruiter.json();
    assert(
      resRecruiter.status === 201 && dataRecruiter.user.account_status === 'pending_verification',
      'POST /register/recruiter successfully registers company with pending_verification status'
    );

    // 9. Mentor Registration
    const resMentor = await fetch(`${API_BASE}/api/auth/register/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sharma',
        email: testMentorEmail,
        phone: '+1 555-0466',
        designation: 'Principal Engineer',
        expertise: 'Distributed Systems, System Design',
        experienceYears: 8,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreedToTerms: true
      })
    });
    const dataMentor = await resMentor.json();
    assert(
      resMentor.status === 201 && dataMentor.user.account_status === 'pending_verification',
      'POST /register/mentor successfully registers mentor with pending_verification status'
    );

    // 10. Email Verification with Token
    const resVerify = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken })
    });
    const dataVerify = await resVerify.json();
    assert(
      resVerify.status === 200 && dataVerify.user?.email_verified === 1,
      'POST /api/auth/verify-email successfully verifies account using cryptographic token',
      JSON.stringify({ status: resVerify.status, data: dataVerify })
    );

    // 11. Re-verifying with already-used token
    const resUsedVerify = await fetch(`${API_BASE}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verificationToken })
    });
    assert(resUsedVerify.status === 400, 'POST /api/auth/verify-email rejects already-used verification token');

    // 12. Resend verification token
    const resResend = await fetch(`${API_BASE}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testCollegeEmail })
    });
    const dataResend = await resResend.json();
    assert(resResend.status === 200 && dataResend.verificationToken, 'POST /api/auth/resend-verification generates new token');

    console.log(`\n🎉 Registration Tests Summary: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
