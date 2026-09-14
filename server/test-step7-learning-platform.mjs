// Step 7 AI-Powered Learning Platform Automated Test Suite
import http from 'node:http';

const BASE_URL = 'http://127.0.0.1:5000';

function makeRequest(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 STEP 7: AI-POWERED LEARNING PLATFORM TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
    }
  }

  try {
    // 1. Authenticate as Student
    console.log('1. Authenticating as Student (usr-student-1)...');
    const authRes = await makeRequest('/api/auth/login', { method: 'POST' }, {
      email: 'student@skillbridge.ai',
      password: 'password123'
    });
    assert(authRes.status === 200 && authRes.body.token, 'Student Login Successful', `Status: ${authRes.status}`);
    const token = authRes.body.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Test GET /student/learning (Learning Dashboard)
    console.log('\n2. Testing GET /student/learning (Dashboard)...');
    const dashRes = await makeRequest('/api/student/learning', { headers: authHeaders });
    assert(dashRes.status === 200, 'Dashboard Returns 200 OK', `Status: ${dashRes.status}`);
    assert(dashRes.body.continueLearning !== undefined, 'Dashboard Includes continueLearning Data');
    assert(dashRes.body.continueLearning?.lessonTitle === 'Lesson 3 — Operators and Expressions', 'Continue Learning Targets Lesson 3 (Operators)', `Got: ${dashRes.body.continueLearning?.lessonTitle}`);
    assert(dashRes.body.continueLearning?.progressPercentage === 65, 'Continue Learning Remembers 65% Progress', `Got: ${dashRes.body.continueLearning?.progressPercentage}`);
    assert(Array.isArray(dashRes.body.myCourses?.inProgress), 'Dashboard returns inProgress courses');
    assert(dashRes.body.overallProgress > 0, 'Dashboard computes overall progress percentage', `Got: ${dashRes.body.overallProgress}%`);
    assert(dashRes.body.learningActivity?.today !== undefined, 'Dashboard returns today learning activity');
    assert(dashRes.body.learningActivity?.thisWeek !== undefined, 'Dashboard returns weekly learning activity');

    // 3. Test GET /student/courses (My Courses & Catalog)
    console.log('\n3. Testing GET /student/courses...');
    const coursesRes = await makeRequest('/api/student/courses', { headers: authHeaders });
    assert(coursesRes.status === 200, 'Courses Returns 200 OK');
    assert(Array.isArray(coursesRes.body.allCourses), 'Returns allCourses array');
    assert(coursesRes.body.inProgress.some(c => c.id === 'crs-py-201'), 'Python Fundamentals is in progress');
    assert(coursesRes.body.allCourses.some(c => c.title === 'Python Programming Fundamentals'), 'Found Python Programming Fundamentals course');

    // 4. Test GET /student/courses/:courseId (Course Overview & Modules)
    console.log('\n4. Testing GET /student/courses/crs-py-201...');
    const courseDetailRes = await makeRequest('/api/student/courses/crs-py-201', { headers: authHeaders });
    assert(courseDetailRes.status === 200, 'Course Overview Returns 200 OK');
    assert(courseDetailRes.body.title === 'Python Programming Fundamentals', 'Course title matches Python Programming Fundamentals');
    assert(courseDetailRes.body.modules?.length === 3, 'Course contains 3 modules', `Got: ${courseDetailRes.body.modules?.length}`);
    assert(courseDetailRes.body.modules[0].lessons?.length === 3, 'Module 1 contains 3 lessons');
    assert(courseDetailRes.body.modules[0].lessons[0].isCompleted === true, 'Lesson 1 is marked completed');
    assert(courseDetailRes.body.modules[0].lessons[1].isCompleted === true, 'Lesson 2 is marked completed');
    assert(courseDetailRes.body.modules[0].lessons[2].progressPercentage === 65, 'Lesson 3 is at 65% progress');
    assert(courseDetailRes.body.continueTarget?.lessonId === 'les-py-3', 'Course continueTarget points to Lesson 3');

    // 5. Test GET /student/courses/:courseId/modules and lessons
    console.log('\n5. Testing GET /student/courses/crs-py-201/modules...');
    const modulesRes = await makeRequest('/api/student/courses/crs-py-201/modules', { headers: authHeaders });
    assert(modulesRes.status === 200 && modulesRes.body.length === 3, 'Modules list returns 3 modules');

    // 6. Test GET /student/courses/:courseId/lessons/:lessonId (Lesson Page & Access Control)
    console.log('\n6. Testing Lesson Page for Lesson 3 (Operators)...');
    const lessonRes = await makeRequest('/api/student/courses/crs-py-201/lessons/les-py-3', { headers: authHeaders });
    assert(lessonRes.status === 200, 'Lesson Page Returns 200 OK');
    assert(lessonRes.body.title === 'Lesson 3 — Operators and Expressions', 'Lesson title correct');
    assert(lessonRes.body.contentType === 'interactive', 'Lesson contentType is interactive');
    assert(lessonRes.body.learningObjectives?.length > 0, 'Learning objectives populated');
    assert(lessonRes.body.keyPoints?.length > 0, 'Key points populated');
    assert(lessonRes.body.navigation?.currentLessonIndex === 3, 'Navigation currentLessonIndex is 3');
    assert(lessonRes.body.navigation?.totalLessonsInCourse === 8, 'Total lessons in course is 8');
    assert(lessonRes.body.navigation?.previousLesson?.id === 'les-py-2', 'Previous lesson is les-py-2');
    assert(lessonRes.body.navigation?.nextLesson?.id === 'les-py-4', 'Next lesson is les-py-4');

    // 7. Test PUT /student/lessons/:lessonId/progress (Server-Side Progress Calculation)
    console.log('\n7. Testing Progress Update on Lesson 3...');
    const updateProgressRes = await makeRequest('/api/student/lessons/les-py-3/progress', {
      method: 'PUT',
      headers: authHeaders
    }, {
      readPosition: 0.85,
      timeSpentSeconds: 60
    });
    assert(updateProgressRes.status === 200, 'Progress Update Returns 200 OK');
    assert(updateProgressRes.body.progressPercentage >= 85, 'Server calculated progress percentage >= 85%', `Got: ${updateProgressRes.body.progressPercentage}%`);
    assert(typeof updateProgressRes.body.courseProgressPercentage === 'number', 'Server recalculated courseProgressPercentage');

    // 8. Test POST /student/lessons/:lessonId/complete (Complete Lesson 3)
    console.log('\n8. Testing Lesson Completion for Lesson 3...');
    const completeRes = await makeRequest('/api/student/lessons/les-py-3/complete', {
      method: 'POST',
      headers: authHeaders
    });
    assert(completeRes.status === 200, 'Lesson Complete Returns 200 OK');
    assert(completeRes.body.isCompleted === true, 'Lesson marked complete');
    assert(completeRes.body.nextLesson?.id === 'les-py-4', 'Next lesson returned as les-py-4');

    // 9. Test GET /student/learning/continue (Resume point)
    console.log('\n9. Testing GET /student/learning/continue...');
    const continueRes = await makeRequest('/api/student/learning/continue', { headers: authHeaders });
    assert(continueRes.status === 200, 'Continue Learning Returns 200 OK');
    assert(continueRes.body.hasResumePoint === true, 'Resume point identified');
    assert(continueRes.body.lessonId === 'les-py-4', 'Resume point advanced to Lesson 4 (next incomplete lesson)', `Got: ${continueRes.body.lessonId}`);

    // 10. Test POST /student/lessons/:lessonId/ai-assistant (AI Explanation & Doubt)
    console.log('\n10. Testing AI Lesson Assistant Modes...');
    
    // Mode: simplify
    const aiSimplifyRes = await makeRequest('/api/student/lessons/les-py-2/ai-assistant', {
      method: 'POST',
      headers: authHeaders
    }, {
      mode: 'simplify'
    });
    assert(aiSimplifyRes.status === 200, 'AI Assistant (simplify) Returns 200 OK');
    assert(aiSimplifyRes.body.explanation?.length > 50, 'AI Assistant returns grounded explanation');
    assert(aiSimplifyRes.body.isGrounded === true, 'AI Assistant marked as grounded in lesson context');

    // Mode: example
    const aiExampleRes = await makeRequest('/api/student/lessons/les-py-2/ai-assistant', {
      method: 'POST',
      headers: authHeaders
    }, {
      mode: 'example'
    });
    assert(aiExampleRes.status === 200, 'AI Assistant (example) Returns 200 OK');

    // Mode: question (Doubt Assistant)
    const aiDoubtRes = await makeRequest('/api/student/lessons/les-py-5/ai-assistant', {
      method: 'POST',
      headers: authHeaders
    }, {
      mode: 'question',
      userQuery: 'Why does Python have an else clause on for loops?'
    });
    assert(aiDoubtRes.status === 200, 'AI Doubt Assistant Returns 200 OK');
    assert(aiDoubtRes.body.explanation?.includes('break') || aiDoubtRes.body.explanation?.length > 50, 'Doubt response discusses loop else mechanics');

    // 11. Test Security & Access Control
    console.log('\n11. Testing Security & Access Control...');
    const unauthRes = await makeRequest('/api/student/learning');
    assert(unauthRes.status === 401, 'Unauthenticated access rejected with 401 Unauthorized');

    const invalidLessonRes = await makeRequest('/api/student/courses/crs-py-201/lessons/non-existent-lesson', { headers: authHeaders });
    assert(invalidLessonRes.status === 404, 'Non-existent lesson returns 404 Not Found');

    console.log('\n====================================================');
    console.log(`RESULTS: ${passedCount} / ${totalCount} PASSED`);
    console.log('====================================================');

    if (passedCount === totalCount) {
      console.log('🎉 ALL STEP 7 BACKEND API TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.error('❌ Some tests failed.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
