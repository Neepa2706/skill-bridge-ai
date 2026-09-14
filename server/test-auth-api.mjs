// Automated verification script for SkillBridge AI Authentication APIs
const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting SkillBridge AI Authentication Tests...\n');
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
    // 1. Invalid credentials test
    const res1 = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'wrongpassword' })
    });
    const data1 = await res1.json();
    assert(res1.status === 401, 'POST /api/auth/login rejects invalid password with 401', JSON.stringify(data1));

    // 2. Non-existent email test
    const res2 = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@skillbridge.ai', password: 'password123' })
    });
    assert(res2.status === 401, 'POST /api/auth/login rejects unknown email with 401');

    // 3. Valid Student Login
    const res3 = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
    });
    const data3 = await res3.json();
    assert(res3.status === 200 && data3.token && data3.user.role === 'student', 'POST /api/auth/login succeeds for student@skillbridge.ai');
    const studentToken = data3.token;

    // 4. GET /api/auth/me with Bearer token
    const res4 = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const data4 = await res4.json();
    assert(res4.status === 200 && data4.user.email === 'student@skillbridge.ai', 'GET /api/auth/me returns valid authenticated student user');

    // 5. Verify all other 4 roles can authenticate
    const roles = [
      { role: 'college', email: 'college@skillbridge.ai' },
      { role: 'recruiter', email: 'recruiter@skillbridge.ai' },
      { role: 'mentor', email: 'mentor@skillbridge.ai' },
      { role: 'admin', email: 'admin@skillbridge.ai' }
    ];

    for (const r of roles) {
      const resRole = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: 'password123' })
      });
      const dataRole = await resRole.json();
      assert(resRole.status === 200 && dataRole.user.role === r.role, `POST /api/auth/login succeeds for ${r.role} (${r.email})`);
    }

    // 6. Forgot Password Flow
    const resForgot = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai' })
    });
    const dataForgot = await resForgot.json();
    assert(resForgot.status === 200 && dataForgot.devToken, 'POST /api/auth/forgot-password dispatches token');
    const resetToken = dataForgot.devToken;

    // 7. Reset Password Flow
    const resReset = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword: 'newpassword456' })
    });
    const dataReset = await resReset.json();
    assert(resReset.status === 200, 'POST /api/auth/reset-password succeeds with valid token', JSON.stringify(dataReset));

    // 8. Sign in with updated password
    const resNewLogin = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'newpassword456' })
    });
    assert(resNewLogin.status === 200, 'POST /api/auth/login succeeds with updated password');

    // 9. Reset student password back to password123 for repeatability
    const resForgotBack = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai' })
    });
    const dataForgotBack = await resForgotBack.json();
    await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: dataForgotBack.devToken, newPassword: 'password123' })
    });
    console.log('🔄 Restored student password to default password123');

    // 10. Logout Endpoint
    const resLogout = await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    assert(resLogout.status === 200, 'POST /api/auth/logout terminates session cleanly');

    // 11. Google OAuth initiation route
    const resGoogle = await fetch(`${API_BASE}/api/auth/google`);
    assert(resGoogle.status === 200, 'GET /api/auth/google initiates OAuth guidance / authorization');

    // 12. Direct /auth aliases
    const resAlias = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@skillbridge.ai', password: 'password123' })
    });
    assert(resAlias.status === 200, 'POST /auth/login alias functions identical to /api/auth/login');

    console.log(`\n🎉 Summary: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
