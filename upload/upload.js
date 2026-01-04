'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. CONFIGURATION & STATE
    // ==========================================
    const CONFIG = {
        GAS_UPLOAD_ENDPOINT: "https://script.google.com/macros/s/AKfycbzOkHDEIYzECrLfjL6P3PmFdU0L0ixSlrsTx5OorXrvm-q8plMGh0l_Epc6RHc7N1Hsqg/exec",
        maxFileSize: 25 * 1024 * 1024 // 25MB
    };

    // Store the real-time database listener so we can turn it off on logout
    let userVerificationListener = null;

    // ==========================================
    // 1.1 THEME INITIALIZATION (NEW)
    // ==========================================
    const initTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Check saved preference OR system preference
        if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcon(true);
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeIcon(false);
        }
    };

    const updateThemeIcon = (isDark) => {
        const toggleBtn = document.getElementById('themeToggleBtn');
        if (!toggleBtn) return;
        const icon = toggleBtn.querySelector('i');
        if (isDark) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    };

    // Run immediately
    initTheme();

    // ==========================================
    // 2. DOM ELEMENTS (Grouped for cleanliness)
    // ==========================================
    const UI = {
        sections: {
            login: document.getElementById('loginSection'),
            signup: document.getElementById('signUpSection'),
            pending: document.getElementById('pendingVerificationSection'),
            upload: document.getElementById('uploadSection'),
        },
        forms: {
            login: document.getElementById('loginForm'),
            signup: document.getElementById('signUpForm'),
            upload: document.getElementById('uploadForm'),
        },
        inputs: {
            file: document.getElementById('fileInput'),
            dropZone: document.getElementById('dropZone'),
            fileName: document.getElementById('fileNameDisplay'),
            // Upload fields
            title: document.getElementById('pdfTitle'),
            desc: document.getElementById('pdfDescription'),
            author: document.getElementById('pdfAuthor'),
            semester: document.getElementById('pdfSemester'),
            category: document.getElementById('pdfCategory'),
        },
        buttons: {
            upload: document.getElementById('uploadBtn'),
            logout: document.querySelectorAll('#logoutBtn, #logoutBtnPending'),
            showSignUp: document.getElementById('showSignUp'),
            showLogin: document.getElementById('showLogin'),
        },
        display: {
            userName: document.getElementById('userName'),
            userEmail: document.getElementById('userEmailDisplay'),

            pendingUserName: document.getElementById('pendingUserName'),
            pendingUserEmail: document.getElementById('pendingUserEmail'),

            toastContainer: document.getElementById('toastContainer'),
        }
    };

    // ==========================================
    // 3. UI HELPER FUNCTIONS
    // ==========================================

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast custom ${type} show`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> <span>${message}</span>`;
        UI.display.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const START_YEAR = 2025;
    const CURRENT_YEAR = new Date().getFullYear();
    const copyrightElement = document.getElementById('copyright-year');
    if (copyrightElement) {
        let yearText = `© ${START_YEAR}`;
        if (CURRENT_YEAR > START_YEAR) yearText += ` - ${CURRENT_YEAR.toString().slice(-2)}`;
        yearText += ` ClassNotes. All rights reserved.`;
        copyrightElement.innerHTML = yearText;
    }

    // Switch between Login, Signup, Pending, Upload
    const switchSection = (sectionName) => {
        // 1. Hide the Initial Loader
        const loader = document.getElementById('appLoader');
        if (loader) loader.style.display = 'none';

        // 2. Hide all other sections
        Object.values(UI.sections).forEach(el => el.classList.add('hidden'));

        // 3. Show the requested section
        if (UI.sections[sectionName]) {
            UI.sections[sectionName].classList.remove('hidden');
        }
    };

    const togglePassword = (input, icon) => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'fas fa-eye-slash password-toggle' : 'fas fa-eye password-toggle';
    };

    // ==========================================
    // 4. AUTHENTICATION LOGIC (Updated for Names)
    // ==========================================
    auth.onAuthStateChanged((user) => {
        // Unsubscribe from previous listener
        if (userVerificationListener) {
            userVerificationListener();
            userVerificationListener = null;
        }

        if (user) {
            if (user.isAnonymous) {
                auth.signOut();
                return;
            }

            // REAL-TIME LISTENER
            userVerificationListener = db.collection('users').doc(user.uid)
                .onSnapshot((doc) => {
                    // 1. Get Name & Email
                    // Use database name, or auth name, or email prefix
                    let displayName = user.displayName || user.email.split('@')[0];
                    const displayEmail = user.email;

                    if (doc.exists) {
                        const data = doc.data();
                        if (data.displayName) displayName = data.displayName;

                        // 2. Check Verification Status
                        if (data.isVerified === true) {
                            // --- UPLOAD SECTION ---
                            if (UI.display.userName) UI.display.userName.textContent = displayName;
                            if (UI.display.userEmail) UI.display.userEmail.textContent = displayEmail;
                            switchSection('upload');
                        } else {
                            // --- PENDING SECTION ---
                            if (UI.display.pendingUserName) UI.display.pendingUserName.textContent = displayName;
                            if (UI.display.pendingUserEmail) UI.display.pendingUserEmail.textContent = displayEmail;
                            switchSection('pending');
                        }
                    } else {
                        // Fallback if doc is missing
                        if (UI.display.pendingUserName) UI.display.pendingUserName.textContent = displayName;
                        if (UI.display.pendingUserEmail) UI.display.pendingUserEmail.textContent = displayEmail;
                        switchSection('pending');
                    }
                }, (error) => {
                    console.error("Verification sync error:", error);
                    auth.signOut();
                });
        } else {
            switchSection('login');
        }
    });

    // ==========================================
    // 5. CORE FUNCTIONALITY
    // ==========================================


    // Handle Login
    UI.forms.login.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validate Terms Checkbox
        const termsBox = document.getElementById('loginTerms');
        if (!termsBox.checked) {
            showToast('Please agree to the Terms of Use to login.', 'error');
            return;
        }

        const btn = e.target.querySelector('button');
        const [email, pass] = [e.target.loginEmail.value, e.target.loginPassword.value];

        try {
            setLoading(btn, true, 'Logging in...');
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            await auth.signInWithEmailAndPassword(email, pass);
            showToast('Welcome back!');
        } catch (error) {
            showToast("Check email or password", 'error');
        } finally {
            setLoading(btn, false, 'Log In', 'fa-sign-in-alt');
        }
    });


    // Handle Signup
    UI.forms.signup.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validate Terms Checkbox
        const termsBox = document.getElementById('signUpTerms');
        if (!termsBox.checked) {
            showToast('You must agree to the Terms & Privacy Policy.', 'error');
            return;
        }

        const btn = e.target.querySelector('button');

        // 2. Get Form Values (Including Name)
        const name = document.getElementById('signUpName').value.trim();
        const email = e.target.signUpEmail.value.trim();
        const pass = e.target.signUpPassword.value;
        const confirm = e.target.signUpConfirmPassword.value;

        if (name.length < 2) return showToast('Please enter a valid name', 'error');
        if (pass !== confirm) return showToast('Passwords do not match', 'error');

        try {
            setLoading(btn, true, 'Creating account...');
            const cred = await auth.createUserWithEmailAndPassword(email, pass);

            // 3. Save User Data (Now includes displayName)
            await db.collection('users').doc(cred.user.uid).set({
                displayName: name,
                email: email,
                isVerified: false,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Optional: Update the Auth Profile too (Standard Practice)
            await cred.user.updateProfile({
                displayName: name
            });

            showToast('Account created! Wait for verification.');
            UI.forms.signup.reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(btn, false, 'Create Account', 'fa-user-plus');
        }
    });

    // Handle File Upload (Button Progress Bar Version)
    UI.forms.upload.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Validation
        const termsCheckbox = document.getElementById('termsCheckbox');
        if (!termsCheckbox.checked) {
            showToast('You must agree to the Terms of Use.', 'error');
            return;
        }

        const file = UI.inputs.file.files[0];
        if (!file) return showToast('Please select a file', 'error');

        // 2. Setup UI
        const uploadBtn = UI.buttons.upload;
        const originalBtnText = uploadBtn.innerHTML; // Save original icon/text

        // Lock button interactions but keep it colorful
        uploadBtn.style.pointerEvents = 'none';

        // Reset Progress
        let currentProgress = 0;

        // Helper to update button look
        const updateButtonProgress = (percent, text) => {
            // Gradient: Left side = Darker Blue (Progress), Right side = Original Blue (Remaining)
            // You can change 'var(--primary-dark)' to 'var(--success)' if you want a green bar!
            uploadBtn.style.background = `linear-gradient(to right, var(--primary-dark) ${percent}%, var(--primary) ${percent}%)`;
            uploadBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${text} (${percent}%)`;
        };

        // --- 3. START FAKE PROGRESS ANIMATION ---
        const progressInterval = setInterval(() => {
            if (currentProgress < 90) {
                // Move fast at first, then slow down
                const increment = currentProgress < 30 ? 5 : (currentProgress < 70 ? 2 : 0.5);
                currentProgress += increment;

                let statusText = "Uploading";
                if (currentProgress > 50) statusText = "Converting";

                updateButtonProgress(Math.floor(currentProgress), statusText);
            }
        }, 300);

        try {
            // 4. Heavy Lifting
            const base64 = await toBase64(file);

            const payload = {
                action: 'upload',
                filename: file.name,
                mimeType: file.type,
                file: base64,
                semester: UI.inputs.semester.value
            };

            const response = await fetch(CONFIG.GAS_UPLOAD_ENDPOINT, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status !== 'success') {
                console.log("Server Error Details:", result); // Print full error to console
                throw new Error('Server Error: ' + result.message); // Show actual error in Toast
            }

            // --- 5. FINISH PROGRESS ---
            clearInterval(progressInterval);

            // Show 100% Success State (Green)
            uploadBtn.style.background = `var(--success)`;
            uploadBtn.innerHTML = `<i class="fas fa-check"></i> Done!`;

            // Prepare Filename for DB (Ensure .pdf extension)
            let finalFileName = file.name;
            if (finalFileName.match(/\.(ppt|pptx)$/i)) {
                finalFileName = finalFileName.replace(/\.(ppt|pptx)$/i, '.pdf');
            }

            // 6. Save to Firestore
            await db.collection('pdfs').add({
                title: UI.inputs.title.value.trim(),
                description: UI.inputs.desc.value.trim(),
                author: UI.inputs.author.value.trim(),
                pdfUrl: result.url,
                semester: parseInt(UI.inputs.semester.value, 10),
                category: UI.inputs.category.value,
                uploadDate: new Date().toISOString().split('T')[0],
                uploadedBy: auth.currentUser.email,
                uploadedByName: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
                fileName: finalFileName
            });

            localStorage.removeItem('classnotes_db_cache');
            showToast('Note uploaded successfully!');

            // 7. Cleanup & Reset Button after delay
            setTimeout(() => {
                UI.forms.upload.reset();
                UI.inputs.fileName.style.display = 'none';

                // Restore Button Style
                uploadBtn.style.background = ''; // Removes inline gradient
                uploadBtn.style.pointerEvents = 'auto'; // Re-enable clicks
                uploadBtn.innerHTML = originalBtnText; // Restore original text
            }, 2000);

        } catch (error) {
            clearInterval(progressInterval);
            console.error(error);
            showToast('Upload failed: ' + error.message, 'error');

            // Reset Button Immediately on Error
            uploadBtn.style.background = ''; // Removes inline gradient, falls back to CSS
            uploadBtn.style.backgroundColor = 'var(--error)'; // Show Red for a moment
            uploadBtn.innerHTML = `<i class="fas fa-times"></i> Failed`;

            setTimeout(() => {
                uploadBtn.style.backgroundColor = ''; // Clear red
                uploadBtn.style.pointerEvents = 'auto';
                uploadBtn.innerHTML = originalBtnText;
            }, 2000);
        }
    });

    // ==========================================
    // 6. UTILITIES & EVENT BINDINGS
    // ==========================================

    // File Drag & Drop Logic
    const handleFile = (file) => {
        if (!file) return;

        // --- 1. NEW VALIDATION: Check for PDF Type ---
        if (file.type !== 'application/pdf') {
            showToast("Invalid file format. Only PDFs are allowed.", "error");

            // Clear the input so they can't upload the wrong file
            UI.inputs.file.value = "";

            // Hide the 'Selected: filename' text if it was previously shown
            UI.inputs.fileName.style.display = 'none';
            return;
        }

        // 2. Check File Size
        if (file.size > CONFIG.maxFileSize) {
            showToast("File too large (Max 25MB)", "error");
            UI.inputs.file.value = "";
            UI.inputs.fileName.style.display = 'none';
            return;
        }

        // 3. Success
        UI.inputs.fileName.textContent = `Selected: ${file.name}`;
        UI.inputs.fileName.style.display = 'block';
    };

    UI.inputs.dropZone.addEventListener('click', () => UI.inputs.file.click());
    UI.inputs.file.addEventListener('change', () => handleFile(UI.inputs.file.files[0]));

    // Drag effects
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        UI.inputs.dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });
    UI.inputs.dropZone.addEventListener('dragover', () => UI.inputs.dropZone.classList.add('dragover'));
    UI.inputs.dropZone.addEventListener('dragleave', () => UI.inputs.dropZone.classList.remove('dragover'));
    UI.inputs.dropZone.addEventListener('drop', (e) => {
        UI.inputs.dropZone.classList.remove('dragover');
        UI.inputs.file.files = e.dataTransfer.files;
        handleFile(e.dataTransfer.files[0]);
    });

    // Form Toggles
    UI.buttons.showSignUp.addEventListener('click', () => switchSection('signup'));
    UI.buttons.showLogin.addEventListener('click', () => switchSection('login'));

    // Logout (Handles both buttons)
    UI.buttons.logout.forEach(btn => {
        btn.addEventListener('click', () => {
            auth.signOut();
            showToast('Logged out');
        });
    });

    // Password Toggles
    document.querySelectorAll('.password-toggle').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const input = e.target.previousElementSibling;
            togglePassword(input, e.target);
        });
    });

    // Theme Toggle Listener
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme); // This saves it for the main site too!
            updateThemeIcon(newTheme === 'dark');
        });
    }


    // Toggle Upload Button based on Terms Checkbox
    const termsCheckbox = document.getElementById('termsCheckbox');
    if (termsCheckbox) {
        // Initial state
        UI.buttons.upload.disabled = true;
        UI.buttons.upload.style.opacity = "0.6";
        UI.buttons.upload.style.cursor = "not-allowed";

        termsCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                UI.buttons.upload.disabled = false;
                UI.buttons.upload.style.opacity = "1";
                UI.buttons.upload.style.cursor = "pointer";
            } else {
                UI.buttons.upload.disabled = true;
                UI.buttons.upload.style.opacity = "0.6";
                UI.buttons.upload.style.cursor = "not-allowed";
            }
        });
    }
    // Helper: Button Loading State
    function setLoading(btn, isLoading, text, iconClass = 'fa-spinner') {
        btn.disabled = isLoading;
        if (isLoading) {
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            btn.innerHTML = `<i class="fas ${iconClass}"></i> ${text}`;
        }
    }

    // Helper: Base64 Converter
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
});