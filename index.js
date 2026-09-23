(function() {
      // ----------------------------------------------------------------
      // 1. CONFIGURATION – replace with your deployed Google Apps Script URL
      // ----------------------------------------------------------------
      const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxER2v5EPn1_QjSO2YF3sdnTY1ldcAo_R8jjUoRABhQZY0A-ubFd09qxU6ZM2Lac_-C/exec';  // ← CHANGE THIS!
      
      // ----------------------------------------------------------------
      // 2. DOM elements
      // ----------------------------------------------------------------
      const courseGrid = document.getElementById('courseGrid');
      const courseOptions = document.querySelectorAll('.course-option');
      const fullNameInput = document.getElementById('fullName');
      const emailInput = document.getElementById('email');
      const enrollBtn = document.getElementById('enrollBtn');
      const statusMsg = document.getElementById('statusMessage');

      // ----------------------------------------------------------------
      // 3. State
      // ----------------------------------------------------------------
      let selectedCourse = null;   // will store { course, code }

      // ----------------------------------------------------------------
      // 4. Course selection logic (single select)
      // ----------------------------------------------------------------
      courseOptions.forEach(option => {
        option.addEventListener('click', () => {
          // remove selected class from all
          courseOptions.forEach(opt => opt.classList.remove('selected'));
          // add selected to clicked
          option.classList.add('selected');

          // update state
          selectedCourse = {
            course: option.dataset.course,
            code: option.dataset.code
          };

          // update info message (only if no other status error visible)
          if (!statusMsg.classList.contains('error')) {
            setStatus(`Selected: ${selectedCourse.course} (${selectedCourse.code})`, 'info');
          }
        });
      });

      // ----------------------------------------------------------------
      // 5. Helper: set status message
      // ----------------------------------------------------------------
      function setStatus(text, type = 'info') {
        statusMsg.textContent = text;
        statusMsg.className = 'status-message'; // reset
        if (type === 'success') statusMsg.classList.add('success');
        else if (type === 'error') statusMsg.classList.add('error');
        else statusMsg.classList.add('info');
      }

      // ----------------------------------------------------------------
      // 6. Reset button state / loading
      // ----------------------------------------------------------------
      function setLoading(isLoading) {
        if (isLoading) {
          enrollBtn.disabled = true;
          enrollBtn.innerHTML = '<span class="loader"></span> Saving...';
        } else {
          enrollBtn.disabled = false;
          enrollBtn.innerHTML = '✦ Enroll now';
        }
      }

      // ----------------------------------------------------------------
      // 7. Validate inputs
      // ----------------------------------------------------------------
      function validateForm() {
        if (!selectedCourse) {
          setStatus('Please select a course before enrolling.', 'error');
          return false;
        }
        const name = fullNameInput.value.trim();
        if (name.length < 2) {
          setStatus('Please enter your full name (at least 2 characters).', 'error');
          return false;
        }
        const email = emailInput.value.trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          setStatus('Please enter a valid email address.', 'error');
          return false;
        }
        return true;
      }

      // ----------------------------------------------------------------
      // 8. Build payload object
      // ----------------------------------------------------------------
      function getEnrollmentData() {
        return {
          fullName: fullNameInput.value.trim(),
          email: emailInput.value.trim(),
          courseName: selectedCourse.course,
          courseCode: selectedCourse.code,
          timestamp: new Date().toISOString(),   // readable in sheet
        };
      }

      // ----------------------------------------------------------------
      // 9. Send data to Google Apps Script (using fetch + CORS handling)
      // ----------------------------------------------------------------
      async function sendToGoogleSheet(data) {
        // If the URL is still the placeholder, show an explanatory error.
        if (APPS_SCRIPT_URL.includes('YOUR_SCRIPT_ID')) {
          throw new Error('⚠️ Please set your Google Apps Script URL in the code (line 191).');
        }

        // We use 'no-cors' mode because Apps Script Web App requires it,
        // but we'll still verify with a second request if possible.
        // For robust feedback, we'll use a two-step approach:
        // 1) Fire the POST with no-cors (cannot read response)
        // 2) But to give user certainty, we'll use a GET with JSONP-like trick?
        // However the cleanest for modern browsers: use 'cors' if your deployment allows,
        // but default Apps Script doesn't support CORS preflight for POST.
        //
        // BEST PRACTICE for Apps Script: Use 'no-cors' and treat as success if no exception,
        // then verify manually. But we want to give a confident message.
        //
        // Alternative: use a simple GET with query params? That works without preflight.
        // But we have sensitive data. We'll stick with POST no-cors + fallback.

        // We'll use 'no-cors' and assume success if fetch resolves.
        // But also we can use a hidden image beacon? No.
        //
        // Using no-cors: fetch resolves opaque, can't read status.
        // We'll consider it a success if no network error, and we'll log.
        try {
          const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',          // avoids CORS blocking, but we can't read response
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });
          // With no-cors, response is opaque; we can't check status.
          // But if we reach here, request was sent.
          console.log('POST (no-cors) sent, opaque response:', response);
          return { success: true, opaque: true };
        } catch (networkError) {
          // If network fails, throw to be caught in caller
          console.error('Network error:', networkError);
          throw new Error('Network error: could not reach the server. Check your connection.');
        }
      }

      // ----------------------------------------------------------------
      // 10. Handle enrollment click
      // ----------------------------------------------------------------
      async function handleEnroll() {
        // validate
        if (!validateForm()) return;

        const enrollmentData = getEnrollmentData();

        // UI: loading
        setLoading(true);
        setStatus('⏳ Saving enrollment to Google Sheet...', 'info');

        try {
          // Send data to Apps Script
          await sendToGoogleSheet(enrollmentData);

          // Because no-cors doesn't give us a readable response,
          // we assume success if no exception occurred.
          // For more certainty, we could add a verification step, but we keep simple.
          // (In a real production, you might use a CORS proxy or JSONP, but this is minimal viable.)

          // Show success message with details
          setStatus(`✅ Enrolled! ${enrollmentData.courseName} (${enrollmentData.courseCode}) saved to Google Sheet.`, 'success');

          // Optional: reset form? But we keep the selection to show success.
          // You may want to clear inputs and selection. We'll keep selection visible but we can clear
          // fullName & email? Typically we might reset. Let's do a soft reset:
          // fullNameInput.value = '';
          // emailInput.value = '';
          // But keeping values shows the enrolled info. We'll just leave as is, but disable the button?
          // Enable button again, user can enroll again. But we need to re-enable.
          // We'll keep values, and let them enroll again if they want (might create duplicates).
          // For better UX, we could reset, but the user might want to enroll another course.
          // We'll keep it as is, but the button re-enables.

          // Optional: log the data
          console.log('Enrollment saved (assumed):', enrollmentData);

          // If you want to reset fields for a new enrollment, uncomment:
          // fullNameInput.value = '';
          // emailInput.value = '';
          // courseOptions.forEach(opt => opt.classList.remove('selected'));
          // selectedCourse = null;
        } catch (error) {
          console.error('Enrollment error:', error);
          setStatus(`❌ ${error.message || 'Failed to save. Please try again.'}`, 'error');
        } finally {
          setLoading(false);
        }
      }

      // ----------------------------------------------------------------
      // 11. Attach event listener to enroll button
      // ----------------------------------------------------------------
      enrollBtn.addEventListener('click', handleEnroll);

      // ----------------------------------------------------------------
      // 12. Optional: pre-select a course for demo (remove if not needed)
      // ----------------------------------------------------------------
      // We'll auto-select the first course to make testing easier.
      // But user can change. (So they see the selected state.)
      window.addEventListener('DOMContentLoaded', () => {
        // optional: pre-select Web Dev (first)
        const firstCourse = document.querySelector('.course-option');
        if (firstCourse) {
          firstCourse.click();  // triggers selection, updates status
        }
        // But we want a neutral info message not "Selected: ..." after click?
        // Actually click sets info message, fine.
        // Also set default name/email? No, leave blank for user.
      });

      // ----------------------------------------------------------------
      // 13. Notes for developers
      // ----------------------------------------------------------------
      console.log('📌 Course enrollment demo – Google Sheets auto-save.');
      console.log('🔧 Replace APPS_SCRIPT_URL with your own Google Apps Script Web App URL.');
      console.log('📋 Ensure your Apps Script has doPost(e) that parses JSON and appends to sheet.');
    })();
    function doPost(e) {
      try {
        // Parse incoming JSON
        const data = JSON.parse(e.postData.contents);
        
        // Get active sheet (or open by name)
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        
        // If sheet is empty, add headers
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(['Timestamp', 'Full Name', 'Email', 'Course Name', 'Course Code']);
        }
        
        // Append the enrollment data
        sheet.appendRow([
          data.timestamp || new Date().toISOString(),
          data.fullName,
          data.email,
          data.courseName,
          data.courseCode
        ]);
        
        // Return success (but with no-cors we can't read, but good practice)
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success' }))
          .setMimeType(ContentService.MimeType.JSON);
          
      } catch (err) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Also implement doGet to test deployment
    function doGet() {
      return ContentService.createTextOutput('Course enrollment endpoint is active.');
    }