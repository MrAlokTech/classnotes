'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. CONFIGURATION & STATE
    // ==========================================
    const CONFIG = {
        scriptURL: "https://script.google.com/macros/s/AKfycbyBf0iOQdm6JuLlNFnjfPy87LmY8lWf6mObLHV22Ja6T-UfUwbPqs4i0bV7XyDhFwI1hA/exec", // Your GAS URL
        maxFileSize: 25 * 1024 * 1024 // 25MB
    };

    // Store the real-time database listener so we can turn it off on logout
    let userVerificationListener = null;

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
            logout: document.querySelectorAll('#logoutBtn, #logoutBtnPending'), // Selects both
            showSignUp: document.getElementById('showSignUp'),
            showLogin: document.getElementById('showLogin'),
        },
        display: {
            userEmail: document.getElementById('userEmail'),
            pendingEmail: document.getElementById('pendingUserEmail'),
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
    // 4. AUTHENTICATION LOGIC (The Fix)
    // ==========================================

    auth.onAuthStateChanged((user) => {
        // Unsubscribe from previous listener to prevent memory leaks
        if (userVerificationListener) {
            userVerificationListener();
            userVerificationListener = null;
        }

        if (user) {
            // Anonymous users are not allowed
            if (user.isAnonymous) {
                auth.signOut();
                return; // Stop here, the listener will trigger again with user = null
            }
            // REAL-TIME LISTENER: This fixes the "refresh" bug
            userVerificationListener = db.collection('users').doc(user.uid)
                .onSnapshot((doc) => {
                    if (doc.exists && doc.data().isVerified === true) {
                        // User is verified
                        UI.display.userEmail.textContent = user.email;
                        switchSection('upload');
                    } else {
                        // User exists but NOT verified
                        UI.display.pendingEmail.textContent = user.email;
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
        const btn = e.target.querySelector('button');
        const [email, pass] = [e.target.loginEmail.value, e.target.loginPassword.value];

        try {
            setLoading(btn, true, 'Logging in...');
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            await auth.signInWithEmailAndPassword(email, pass);
            showToast('Welcome back!');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(btn, false, 'Log In', 'fa-sign-in-alt');
        }
    });

    // Handle Signup
    UI.forms.signup.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const [email, pass, confirm] = [
            e.target.signUpEmail.value,
            e.target.signUpPassword.value,
            e.target.signUpConfirmPassword.value
        ];

        if (pass !== confirm) return showToast('Passwords do not match', 'error');

        try {
            setLoading(btn, true, 'Creating account...');
            const cred = await auth.createUserWithEmailAndPassword(email, pass);

            // Create user doc
            await db.collection('users').doc(cred.user.uid).set({
                email: email,
                isVerified: false,
                joinedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            showToast('Account created! Wait for verification.');
            UI.forms.signup.reset();
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(btn, false, 'Create Account', 'fa-user-plus');
        }
    });

    // Handle File Upload (The Big Function)
    UI.forms.upload.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = UI.inputs.file.files[0];

        if (!file) return showToast('Please select a PDF file', 'error');

        setLoading(UI.buttons.upload, true, 'Uploading to Drive...');

        try {
            // 1. Convert to Base64
            const base64 = await toBase64(file);

            // 2. Prepare Payload
            const payload = {
                filename: file.name,
                mimeType: file.type,
                file: base64,
                semester: UI.inputs.semester.value
            };

            // 3. Send to Google Apps Script
            const response = await fetch(CONFIG.scriptURL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.status !== 'success') throw new Error('Drive Upload Failed');

            // 4. Save to Firestore
            await db.collection('pdfs').add({
                title: UI.inputs.title.value.trim(),
                description: UI.inputs.desc.value.trim(),
                author: UI.inputs.author.value.trim(),
                pdfUrl: result.url,
                semester: parseInt(UI.inputs.semester.value, 10),
                category: UI.inputs.category.value,
                uploadDate: new Date().toISOString().split('T')[0],
                uploadedBy: auth.currentUser.email,
                fileName: file.name
            });

            localStorage.removeItem('classnotes_db_cache');
            showToast('Note uploaded successfully!');
            UI.forms.upload.reset();
            UI.inputs.fileName.style.display = 'none';

        } catch (error) {
            console.error(error);
            showToast('Upload failed: ' + error.message, 'error');
        } finally {
            setLoading(UI.buttons.upload, false, 'Add to Database', 'fa-upload');
        }
    });

    // ==========================================
    // 6. UTILITIES & EVENT BINDINGS
    // ==========================================

    // File Drag & Drop Logic
    const handleFile = (file) => {
        if (!file) return;
        if (file.size > CONFIG.maxFileSize) {
            showToast("File too large (Max 25MB)", "error");
            UI.inputs.file.value = "";
            return;
        }
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