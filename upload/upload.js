'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const loginSection = document.getElementById('loginSection');
    const signUpSection = document.getElementById('signUpSection');
    const uploadSection = document.getElementById('uploadSection');
    const pendingVerificationSection = document.getElementById(
        'pendingVerificationSection'
    );
    const toastContainer = document.getElementById('toastContainer');

    // Worker
    const WORKER_URL = 'https://notes-api.alokdasofficial.in';

    // Toggles
    const showSignUp = document.getElementById('showSignUp');
    const showLogin = document.getElementById('showLogin');

    // Login Form
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError'); // Still used for inline errors
    const loginPasswordToggle = document.getElementById('loginPasswordToggle');

    // Sign Up Form
    const signUpForm = document.getElementById('signUpForm');
    const signUpEmail = document.getElementById('signUpEmail');
    const signUpPassword = document.getElementById('signUpPassword');
    const signUpConfirmPassword = document.getElementById('signUpConfirmPassword');
    const signUpBtn = document.getElementById('signUpBtn');
    const signUpError = document.getElementById('signUpError'); // Still used for inline errors
    const signUpPasswordToggle = document.getElementById('signUpPasswordToggle');
    const signUpConfirmPasswordToggle = document.getElementById(
        'signUpConfirmPasswordToggle'
    );

    // Upload Section
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnPending = document.getElementById('logoutBtnPending');
    const adminEmail = document.getElementById('adminEmail');
    const pendingAdminEmail = document.getElementById('pendingAdminEmail');

    // Upload Form
    const uploadForm = document.getElementById('uploadForm');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const pdfTitle = document.getElementById('pdfTitle');
    const pdfDescription = document.getElementById('pdfDescription');
    const pdfAuthor = document.getElementById('pdfAuthor');
    const pdfUrl = document.getElementById('pdfUrl');
    const pdfSemester = document.getElementById('pdfSemester');
    const pdfCategory = document.getElementById('pdfCategory');

    const uploadProgressContainer = document.getElementById(
        'uploadProgressContainer'
    );
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadPercentage = document.getElementById('uploadPercentage');

    // --- Helper Functions ---

    /**
     * Shows a toast notification.
     * @param {string} message The message to display.
     * @param {string} type 'success' or 'error'.
     */
    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast custom ${type} show`;
        toast.innerHTML = `
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'
            }"></i>
      <span>${message}</span>
    `;
        toastContainer.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500); // Wait for transition
        }, 3000);
    };

    /**
     * Toggles password visibility for a given input and toggle icon.
     * @param {HTMLInputElement} inputEl The password input element.
     * @param {HTMLElement} toggleEl The toggle icon element.
     */
    const togglePassword = (inputEl, toggleEl) => {
        if (inputEl.type === 'password') {
            inputEl.type = 'text';
            toggleEl.classList.remove('fa-eye');
            toggleEl.classList.add('fa-eye-slash');
        } else {
            inputEl.type = 'password';
            toggleEl.classList.remove('fa-eye-slash');
            toggleEl.classList.add('fa-eye');
        }
    };

    /**
     * Resets all form/UI states to default (logged out).
     */
    const showLoggedOutState = () => {
        loginSection.style.display = 'block';
        signUpSection.style.display = 'none';
        uploadSection.style.display = 'none';
        pendingVerificationSection.style.display = 'none';
        adminEmail.textContent = '';
        pendingAdminEmail.textContent = '';
    };

    // --- Firebase Auth State Observer ---
    // This is the core of the security. It checks login state AND verification.
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is logged in, now check verification status
            try {
                const userDocRef = db.collection('users').doc(user.uid);
                const userDoc = await userDocRef.get();

                if (userDoc.exists && userDoc.data().isVerified === true) {
                    // User is LOGGED IN and VERIFIED
                    loginSection.style.display = 'none';
                    signUpSection.style.display = 'none';
                    pendingVerificationSection.style.display = 'none';
                    uploadSection.style.display = 'block';
                    adminEmail.textContent = user.email;
                } else {
                    // User is LOGGED IN but NOT VERIFIED (or doc doesn't exist)
                    loginSection.style.display = 'none';
                    signUpSection.style.display = 'none';
                    uploadSection.style.display = 'none';
                    pendingVerificationSection.style.display = 'block';
                    pendingAdminEmail.textContent = user.email;
                }
            } catch (error) {
                console.error('Error checking user verification:', error);
                showToast(
                    'Could not check your verification status. Logging out.',
                    'error'
                );
                auth.signOut();
            }
        } else {
            // User is logged out
            showLoggedOutState();
        }
    });

    // --- Event Listeners ---

    // Form Toggling
    showSignUp.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        signUpSection.style.display = 'block';
        loginError.textContent = '';
    });

    showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'block';
        signUpSection.style.display = 'none';
        signUpError.textContent = '';
    });

    // Password Visibility Toggles
    loginPasswordToggle.addEventListener('click', () =>
        togglePassword(loginPassword, loginPasswordToggle)
    );
    signUpPasswordToggle.addEventListener('click', () =>
        togglePassword(signUpPassword, signUpPasswordToggle)
    );
    signUpConfirmPasswordToggle.addEventListener('click', () =>
        togglePassword(signUpConfirmPassword, signUpConfirmPasswordToggle)
    );

    /**
     * Handle Login Form Submission
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginBtn.disabled = true;
        loginBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginError.textContent = '';

        try {
            const email = loginEmail.value;
            const password = loginPassword.value;
            await auth.signInWithEmailAndPassword(email, password);
            // Observer will automatically handle showing the correct section
            showToast('Login successful!', 'success');
        } catch (error) {
            console.error('Login Error:', error);
            loginError.textContent =
                'Failed to log in. Please check email and password.';
            showToast('Login failed. Check credentials.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Log In';
        }
    });

    /**
     * Handle Sign Up Form Submission
     */
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signUpBtn.disabled = true;
        signUpBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Signing up...';
        signUpError.textContent = '';

        const email = signUpEmail.value;
        const password = signUpPassword.value;
        const confirmPassword = signUpConfirmPassword.value;

        // --- Validation ---
        if (password !== confirmPassword) {
            signUpError.textContent = 'Passwords do not match.';
            showToast('Passwords do not match.', 'error');
            signUpBtn.disabled = false;
            signUpBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            return;
        }

        if (password.length < 6) {
            signUpError.textContent = 'Password must be at least 6 characters.';
            showToast('Password must be at least 6 characters.', 'error');
            signUpBtn.disabled = false;
            signUpBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
            return;
        }
        // --- End Validation ---

        try {
            // 1. Create the user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(
                email,
                password
            );
            const user = userCredential.user;

            // 2. Create the user document in Firestore for verification
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                isVerified: false, // <-- This is the verification flag
                joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // auth.onAuthStateChanged will automatically run and show the "Pending" screen.
            showToast('Sign up successful! Please wait for verification.', 'success');
            signUpForm.reset();
        } catch (error) {
            console.error('Sign Up Error:', error);
            if (error.code === 'auth/email-already-in-use') {
                signUpError.textContent =
                    'This email is already in use. Please log in.';
                showToast('Email already in use.', 'error');
            } else {
                signUpError.textContent = 'Failed to sign up. Please try again.';
                showToast('Sign up failed. Please try again.', 'error');
            }
        } finally {
            signUpBtn.disabled = false;
            signUpBtn.innerHTML = '<i class="fas fa-user-plus"></i> Sign Up';
        }
    });

    /**
     * Handle Logout Button Click (for both buttons)
     */
    const handleLogout = async () => {
        try {
            await auth.signOut();
            // Observer will automatically handle showing the login section
            showToast('Logged out successfully.', 'success');
            loginForm.reset();
            signUpForm.reset();
        } catch (error) {
            console.error('Logout Error:', error);
            showToast('Failed to log out.', 'error');
        }
    };

    logoutBtn.addEventListener('click', handleLogout);
    logoutBtnPending.addEventListener('click', handleLogout);

    /**
     * Handle Upload Form Submission
     */
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get the file from the new input
        const fileInput = document.getElementById('pdfFile');
        const file = fileInput.files[0];

        // --- Simple file validation (same as before) ---
        if (!file) {
            showToast('Please select a PDF file to upload.', 'error');
            return;
        }
        if (file.type !== 'application/pdf') {
            showToast('Only PDF files are allowed.', 'error');
            return;
        }

        // --- Disable button and show loading state ---
        uploadBtn.disabled = true;
        uploadBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i> Uploading File...';

        // --- NEW: Reset and show progress bar ---
        uploadProgressContainer.style.display = 'block';
        uploadProgress.value = 0;
        uploadPercentage.textContent = '0%';
        uploadStatus.textContent = 'Step 1/2: Uploading file to secure server...';
        uploadStatus.style.color = 'var(--gray-600)';

        let googleDriveUrl = '';

        // --- STEP 1: Upload File to Cloudflare Worker (with Progress) ---
        try {
            const formData = new FormData();
            formData.append('file', file, file.name); // Pass file and filename

            // --- NEW: We use XHR for progress, wrapped in a Promise ---
            const uploadPromise = new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // 1. Listen for progress events
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        uploadProgress.value = percent;
                        uploadPercentage.textContent = `${percent}%`;
                    }
                };

                // 2. Handle successful upload
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        // We resolve with the response text
                        resolve(xhr.responseText);
                    } else {
                        // Handle HTTP errors
                        reject(new Error(xhr.responseText || `Server error: ${xhr.status}`));
                    }
                };

                // 3. Handle network errors
                xhr.onerror = () => {
                    reject(new Error('Network error during upload.'));
                };

                // 4. Handle upload being aborted
                xhr.onabort = () => {
                    reject(new Error('Upload was aborted.'));
                };

                // 5. Configure and send the request
                xhr.open('POST', WORKER_URL);
                xhr.send(formData);
            });
            // --- End of new XHR Promise ---

            // Await our new promise
            const responseText = await uploadPromise;
            // Manually parse the JSON response from the text
            const data = JSON.parse(responseText);

            googleDriveUrl = data.pdfUrl; // Get the URL from the worker

            showToast('File uploaded successfully!', 'success');
            uploadStatus.textContent =
                'Step 2/2: Adding note details to database...';

        } catch (error) {
            console.error('File Upload Error:', error);
            // Try to parse the error if it's a JSON string
            let errorMessage = 'File upload failed.';
            try {
                const errJson = JSON.parse(error.message);
                errorMessage = errJson.error || errorMessage;
            } catch (e) {
                errorMessage = error.message;
            }

            uploadStatus.textContent = `File Upload Failed: ${errorMessage}`;
            uploadStatus.style.color = 'var(--error-color)';
            showToast(`File Upload Failed: ${errorMessage}`, 'error');

            // Re-enable button and hide progress
            uploadBtn.disabled = false;
            uploadBtn.innerHTML =
                '<i class="fas fa-upload"></i> Add Note to Database';
            uploadProgressContainer.style.display = 'none'; // Hide progress on error
            return; // Stop execution
        }

        // --- STEP 2: Add Note Info to Firestore ---
        // (This part is 100% the same as your old code)
        try {
            // ... (all your date formatting and newNote object creation) ...
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            const newNote = {
                title: pdfTitle.value.trim(),
                description: pdfDescription.value.trim(),
                author: pdfAuthor.value.trim(),
                pdfUrl: googleDriveUrl,
                semester: parseInt(pdfSemester.value, 10),
                category: pdfCategory.value,
                uploadDate: formattedDate,
            };

            // ... (all your validation) ...
            if (!newNote.title || !newNote.author) {
                uploadStatus.textContent = 'Please fill out all required fields.';
                // ... (rest of your validation) ...
                uploadBtn.disabled = false;
                uploadBtn.innerHTML =
                    '<i class="fas fa-upload"></i> Add Note to Database';
                return;
            }

            // Add to 'pdfs' collection
            await db.collection('pdfs').add(newNote);

            // Success!
            uploadStatus.textContent = 'Success! Your note has been added.';
            uploadStatus.style.color = 'var(--success-color)';
            showToast('Note added to database!', 'success');

            // Reset the form
            uploadForm.reset();

            // --- NEW: Hide progress bar on final success ---
            uploadProgressContainer.style.display = 'none';

        } catch (error) {
            console.error('Firestore Add Error:', error);
            uploadStatus.textContent = 'Error adding note to database. Please try again.';
            uploadStatus.style.color = 'var(--error-color)';
            showToast('Error adding note to database.', 'error');
        } finally {
            // Re-enable the button
            uploadBtn.disabled = false;
            uploadBtn.innerHTML =
                '<i class="fas fa-upload"></i> Add Note to Database';
        }
    });
});