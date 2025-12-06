let pdfDatabase = [];
let currentSemester = 1;
let currentCategory = 'all';
let isMaintenanceActive = false;

const pdfGrid = document.getElementById('pdfGrid');
const searchInput = document.getElementById('searchInput');
const pdfCount = document.getElementById('pdfCount');
const emptyState = document.getElementById('emptyState');
const tabBtns = document.querySelectorAll('.tab-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const pdfModal = document.getElementById('pdfModal');
const shareModal = document.getElementById('shareModal');
const modalShareBtn = document.getElementById('modalShareBtn');
const pdfViewer = document.getElementById('pdfViewer');
const modalTitle = document.getElementById('modalTitle');
const shareLink = document.getElementById('shareLink');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// NEW Comment Variables
const commentSidebar = document.getElementById('commentSidebar');
const commentsList = document.getElementById('commentsList');
const commentCount = document.getElementById('commentCount');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentAuthor = document.getElementById('commentAuthor');

// Preloader
const preloader = document.getElementById('preloader');

// App Promotion Elements
const alomolePromo = document.getElementById('alomolePromo');
const closeAlomolePromo = document.getElementById('closeAlomolePromo');

// NEW: Go to Top Button
const goToTopBtn = document.getElementById('goToTopBtn');

const maintenanceScreen = document.getElementById('maintenanceScreen');

function handleGoToTopVisibility() {
    // Show button if scrolled down more than 400 pixels
    if (window.scrollY > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
}

async function loadPDFDatabase() {
    // 1. Frontend Check: Stop if we already know we are in maintenance
    if (isMaintenanceActive) {
        console.warn("Maintenance active. Data load blocked by frontend.");
        return;
    }

    try {
        const pdfsRef = db.collection('pdfs');

        // Fetch data
        const snapshot = await pdfsRef.orderBy('uploadDate', 'desc').get();

        pdfDatabase = [];
        snapshot.forEach(doc => {
            pdfDatabase.push({ id: doc.id, ...doc.data() });
        });

        renderPDFs();
        hidePreloader();

    } catch (error) {
        // 2. Backend Check: This catches the Firebase Rule "Permission Denied"
        console.error('Error loading PDFs:', error);

        // If the error is specifically "Missing or insufficient permissions",
        // it likely means Maintenance Mode is ON but the frontend listener hasn't fired yet.
        if (error.code === 'permission-denied') {
            console.log("Access denied by database. Forcing Maintenance Mode.");
            activateMaintenanceMode();
        } else {
            // Handle other network errors
            const mainContent = document.querySelector('.main .container');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="empty-state" style="display: block;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Connection Error</h3>
                        <p>Unable to load notes.</p>
                    </div>
                `;
            }
        }
    }
}
function hidePreloader() {
    if (preloader) {
        preloader.classList.add('hidden');
    }
}

function initMaintenanceListener() {
    // 1. Define the Error Screen Element
    const screen = document.getElementById('maintenanceScreen');

    // 2. Start listening to Firestore
    db.collection('controll').doc('classNotes')
        .onSnapshot((doc) => {
            let isDown = false;

            if (doc.exists) {
                isDown = doc.data().isMaintenance === true;
            }

            if (isDown) {
                activateMaintenanceMode();
            } else {
                deactivateMaintenanceMode();
            }
        }, (error) => {
            // If we can't connect to DB, assume it's actually broken (or maintenance)
            console.error("Connection failed:", error);
            activateMaintenanceMode();
        });
}

function activateMaintenanceMode() {
    console.log("System Status: CRITICAL");
    isMaintenanceActive = true; // Set the flag

    const screen = document.getElementById('maintenanceScreen');
    const mainContainer = document.querySelector('.main');
    const header = document.querySelector('header');
    const tabs = document.querySelector('.semester-tabs');

    // 1. Show the overlay
    if (screen) {
        screen.classList.add('active');
        const timeSpan = document.getElementById('errorTime');
        if (timeSpan) timeSpan.innerText = new Date().toISOString();

        // Check for admin (optional, based on your previous code)
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const adminSection = document.getElementById('adminDiagnostics');
                if (adminSection) adminSection.classList.remove('hidden');
            }
        });
    }

    // 2. DATA WIPE: Clear the array from memory
    pdfDatabase = [];

    // 3. DOM WIPE: Remove the actual cards from the screen
    if (pdfGrid) pdfGrid.innerHTML = '';

    // 4. VISUAL HIDE: Hide the main interface elements
    // We hide them instead of removing them so we can bring them back easily
    if (mainContainer) mainContainer.style.display = 'none';
    if (header) header.style.display = 'none';
    if (tabs) tabs.style.display = 'none';

    hidePreloader();
    document.body.style.overflow = 'hidden';
}

function deactivateMaintenanceMode() {
    console.log("System Status: OPERATIONAL");
    isMaintenanceActive = false; // Unset the flag

    const screen = document.getElementById('maintenanceScreen');
    const mainContainer = document.querySelector('.main');
    const header = document.querySelector('header');
    const tabs = document.querySelector('.semester-tabs');

    // 1. Hide the error screen
    if (screen) {
        screen.classList.remove('active');
    }

    // 2. RESTORE VISUALS: Bring back the interface elements
    if (mainContainer) mainContainer.style.display = 'block';
    if (header) header.style.display = 'block'; // Check if your header is flex or block in CSS
    if (tabs) tabs.style.display = 'block';

    // 3. Unlock scrolling
    document.body.style.overflow = 'auto';

    // 4. RELOAD DATA
    // We check if the database is empty. If it is, we fetch data.
    if (pdfDatabase.length === 0) {
        if (preloader) preloader.classList.remove('hidden');

        loadPDFDatabase().then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const pdfId = urlParams.get('pdf');
            if (pdfId) {
                const pdf = pdfDatabase.find(p => p.id == pdfId);
                if (pdf) viewPDF(pdf);
            }
        });
    }
}

function checkHolidayMode() {
    // Current date logic
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan, 11 = Dec
    const date = today.getDate();

    const overlay = document.getElementById('holidayOverlay');
    const title = document.getElementById('holidayTitle');
    const msg = document.getElementById('holidayMessage');
    const sub = document.getElementById('holidaySubMessage');

    // --- Configuration ---
    // 1. Republic Day: Jan 26
    const isRepublicDay = (month === 0 && date === 26);

    // 2. Independence Day: Aug 15
    const isIndependenceDay = (month === 7 && date === 15);

    // 3. Holi: March 4, 2026 (Wednesday)
    const isHoli = (month === 2 && date === 4);

    // 4. Diwali: Nov 8, 2026 (Sunday)
    // We can show it for 2 days (Nov 8 & 9)
    const isDiwali = (month === 10 && (date === 8 || date === 9));

    // Christmas: Dec 24 & 25
    const isChristmas = (month === 11 && date === 25);

    // New Year: Dec 31 & Jan 1
    const isNewYear = (month === 11 && date === 31) || (month === 0 && date === 1);

    if (isRepublicDay || isIndependenceDay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('tricolor');
        title.innerText = isRepublicDay ? "Happy Republic Day" : "Happy Independence Day";
        msg.innerText = "Celebrating the spirit of India — unity, courage, and hope.";
        document.body.style.overflow = 'hidden';
        return true;
    }

    if (isHoli) {
        overlay.classList.remove('hidden');
        overlay.classList.add('holi');
        title.innerText = "Happy Holi!";
        msg.innerText = "Wishing you colors of joy, laughter, and peace this Holi.";
        sub.innerText = "P.S: ClassNotes will return on March 5th. Have a colorful day!";
        document.body.style.overflow = 'hidden';
        return true;
    }

    if (isDiwali) {
        overlay.classList.remove('hidden');
        overlay.classList.add('diwali');
        title.innerText = "Happy Diwali";
        msg.innerText = "Shubh Deepavali! May the festival of lights bring warmth, clarity, and new beginnings.";
        sub.innerText = "P.S: ClassNotes will resume on Nov 10th. Enjoy the celebrations!";
        document.body.style.overflow = 'hidden';
        return true;
    }

    if (isChristmas) {
        overlay.classList.remove('hidden');
        overlay.classList.add('christmas');
        title.innerText = "Merry Christmas";
        msg.innerText = "Wishing you calm vibes, cozy moments, and lots of warmth with your friends and fam.";
        sub.innerText = "P.S: ClassNotes will be back to normal on Dec 26th. Have a great & long day!";
        document.body.style.overflow = 'hidden';
        return true;
    }
    else if (isNewYear) {
        overlay.classList.remove('hidden');
        overlay.classList.add('new-year');
        title.innerText = "Happy New Year";
        msg.innerText = "Wishing you a year full of peace, clarity, and good energy. Take care and grow strong. Hope you have a great year ahead and don't forget Alok :)";
        sub.innerText = "P.S: ClassNotes will be back to normal on Jan 2nd. Enjoy the break!";
        document.body.style.overflow = 'hidden';
        return true;
    }

    return false;
}


document.addEventListener('DOMContentLoaded', async function () {

    const isHoliday = checkHolidayMode();
    if (isHoliday) {
        // Stop the loader from spinning forever behind the overlay
        hidePreloader();
        return; // EXIT. Do not load PDFs, do not init listeners.
    }

    initMaintenanceListener();

    // await loadPDFDatabase();
    setupEventListeners();
    checkAlomolePromoState();

    const urlParams = new URLSearchParams(window.location.search);
    const pdfId = urlParams.get('pdf');
    if (pdfId) {
        const pdf = pdfDatabase.find(p => p.id == pdfId);
        if (pdf) {
            currentSemester = pdf.semester;
            updateSemesterTab();
            viewPDF(pdf);
        }
    }
});



function setupEventListeners() {
    searchInput.addEventListener('input', renderPDFs);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', handleSemesterChange);
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleCategoryChange);
    });

    document.getElementById('closeModal').addEventListener('click', closePDFModal);
    document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
    // CHANGE: Listen to the new modalShareBtn
    if (modalShareBtn) {
        modalShareBtn.addEventListener('click', () => sharePDF());
    }
    document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPDF);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

    // NEW: Comment form submission
    commentForm.addEventListener('submit', handleCommentSubmit);

    if (closeAlomolePromo) {
        closeAlomolePromo.addEventListener('click', hideAlomolePromo);
    }

    pdfModal.addEventListener('click', function (e) {
        if (e.target === pdfModal) closePDFModal();
    });

    shareModal.addEventListener('click', function (e) {
        if (e.target === shareModal) closeShareModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (shareModal.classList.contains('active')) {
                closeShareModal();
            } else if (pdfModal.classList.contains('active')) {
                closePDFModal();
            }
        }
    });

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    // NEW: Go to Top Button Logic
    if (goToTopBtn) {
        window.addEventListener('scroll', handleGoToTopVisibility);
        goToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function checkAlomolePromoState() {
    // Check sessionStorage instead of localStorage
    const isHiddenForSession = sessionStorage.getItem('hideAlomolePromoSession');

    if (alomolePromo && isHiddenForSession === 'true') {
        alomolePromo.classList.add('hidden');
    } else if (alomolePromo) {
        // Ensure it is visible by default if the session flag is not set
        alomolePromo.classList.remove('hidden');
    }
}

function hideAlomolePromo() {
    if (alomolePromo) {
        alomolePromo.classList.add('hidden');
        // Use sessionStorage to store the preference only for the current tab/session
        sessionStorage.setItem('hideAlomolePromoSession', 'true');
    }
}

function handleScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 0) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    // NEW: Call the Go to Top handler here as well
    if (goToTopBtn) {
        handleGoToTopVisibility();
    }
}

/**
 * Converts a standard Google Drive sharing URL into an embeddable 'preview' URL.
 * @param {string} url The original URL from the database
 * @returns {string} The embeddable ('/preview') URL or the original URL
 */
function getGoogleDriveEmbedUrl(url) {
    if (!url) return '';

    // Regex to find the Google Drive file ID
    // It looks for 'drive.google.com/file/d/' followed by the ID, and then a '/'
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);

    if (match && match[1]) {
        const fileId = match[1];
        // Construct the embeddable 'preview' URL
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // If it's not a matching GDrive link, return the original URL as-is
    return url;
}

// REPLACE your existing viewPDF function with this one
async function viewPDF(pdf) {
    // Get the original URL from the PDF object
    const originalPdfPath = pdf.pdfUrl;

    if (!originalPdfPath) {
        showToast('PDF link is missing or invalid.', 'error');
        return;
    }

    // NEW: Convert the URL to the correct embeddable '/preview' format
    const embeddablePdfPath = getGoogleDriveEmbedUrl(originalPdfPath);

    modalTitle.textContent = pdf.title;

    // Use the new, converted path for the viewer
    pdfViewer.src = embeddablePdfPath;

    pdfModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // IMPORTANT: Store the full PDF object with the Firestore document ID
    pdfModal.dataset.currentPdf = JSON.stringify(pdf);

    // NEW: Load comments when opening the modal
    // Note: The comments system uses pdf.id, which should now be the Firestore doc ID.
    await loadComments(pdf.id);
}

function handleSemesterChange(e) {
    tabBtns.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentSemester = parseInt(e.currentTarget.dataset.semester);
    renderPDFs();
}

function handleCategoryChange(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentCategory = e.currentTarget.dataset.category;
    renderPDFs();
}

function updateSemesterTab() {
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.semester) === currentSemester) {
            btn.classList.add('active');
        }
    });
}

// script.js - REPLACE existing renderPDFs()

function renderPDFs() {
    const searchTerm = searchInput.value.toLowerCase();
    const favorites = getFavorites(); // Get current favorites

    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;

        // --- NEW FILTER LOGIC START ---
        let matchesCategory = false;
        if (currentCategory === 'favorites') {
            // If viewing favorites, check if ID is in list
            matchesCategory = favorites.includes(pdf.id);
        } else {
            // Otherwise, standard category check
            matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;
        }
        // --- NEW FILTER LOGIC END ---

        const matchesSearch = pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);

        return matchesSemester && matchesCategory && matchesSearch;
    });

    updatePDFCount(filteredPdfs.length);

    if (filteredPdfs.length === 0) {
        pdfGrid.style.display = 'none';
        emptyState.style.display = 'block';

        // Optional: Change empty state text if in Favorites mode
        if (currentCategory === 'favorites') {
            emptyState.querySelector('h3').textContent = "No saved notes yet";
            emptyState.querySelector('p').textContent = "Click the heart icon on any note to save it here.";
        } else {
            emptyState.querySelector('h3').textContent = "No notes found";
            emptyState.querySelector('p').textContent = "Try adjusting your search or filter";
        }

        return;
    }

    pdfGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    // Pass the favorites list to createPDFCard so it knows which hearts to fill
    pdfGrid.innerHTML = filteredPdfs.map(pdf => createPDFCard(pdf, favorites)).join('');
}

function createPDFCard(pdf, favoritesList) {
    // Default fallback if list isn't passed
    const favorites = favoritesList || getFavorites();
    const isFav = favorites.includes(pdf.id);
    const heartIconClass = isFav ? 'fas' : 'far';
    const btnActiveClass = isFav ? 'active' : '';

    const categoryIcons = {
        'Organic': 'fa-flask',
        'Inorganic': 'fa-atom',
        'Physical': 'fa-calculator'
    };

    const categoryIcon = categoryIcons[pdf.category] || 'fa-file-pdf';

    // Format Date
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Helper to safely highlight text matching the search term
    const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const highlightText = (text) => {
        const searchTerm = searchInput.value.trim();
        const safeText = escapeHtml(text);

        if (!searchTerm) return safeText;

        // Create a regex for the search term (case insensitive)
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return safeText.replace(regex, '<span class="highlight">$1</span>');
    };

    // We prepare the string, but we pass data attributes safely
    // Note: We are using JSON.stringify for the viewPDF onclick, which is tricky.
    // It is safer to attach the event listener in JS, but for now, we will encode quotes.
    const safePdfString = JSON.stringify(pdf).replace(/"/g, '&quot;');

    return `
        <div class="pdf-card" data-category="${pdf.category}">
            <div class="pdf-header">
                <div class="pdf-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="pdf-info">
                    <h3>${highlightText(pdf.title)}</h3>
                </div>
            </div>

            <div class="pdf-meta">
                <div class="pdf-category">
                    <i class="fas ${categoryIcon}"></i>
                    ${escapeHtml(pdf.category)}
                </div>
                <div class="pdf-date">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </div>
            </div>

            <p class="pdf-description">${highlightText(pdf.description)}</p>

            <div class="pdf-actions">
                <button class="btn btn-primary" onclick="viewPDF(${safePdfString})">
                    <i class="fas fa-eye"></i>
                    View
                </button>
                
                <button class="btn btn-favorite ${btnActiveClass}" onclick="toggleFavorite(event, '${pdf.id}')" title="Save Note">
                    <i class="${heartIconClass} fa-heart"></i>
                </button>

                <button class="btn btn-secondary" id="shareBtn" onclick="sharePDF('${pdf.id}')">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `;
}

function updatePDFCount(count) {
    pdfCount.textContent = count;
}


function closePDFModal() {
    pdfModal.classList.remove('active');
    pdfViewer.src = '';
    document.body.style.overflow = 'auto';

    const url = new URL(window.location);
    url.searchParams.delete('pdf');
    window.history.replaceState({}, document.title, url);
}


function sharePDF(pdfId) {
    let pdf;

    // Logic to find PDF (kept from your original code)
    if (typeof pdfId === 'string') {
        pdf = pdfDatabase.find(p => p.id === pdfId);
    } else if (pdfModal.dataset.currentPdf) {
        try { pdf = JSON.parse(pdfModal.dataset.currentPdf); } catch (e) { }
    }

    if (!pdf) return;

    // const shareUrl = `${window.location.origin}${window.location.pathname}?pdf=${pdf.id}`;
    const shareUrl = `https://notes.alokdasofficial.in/?pdf=${pdf.id}`;
    const shareData = {
        title: `ClassNotes: ${pdf.title}`,
        text: `Check out this note: ${pdf.title} on ClassNotes`,
        url: shareUrl
    };

    // 1. Try Native Share (Mobile)
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => console.log('Shared successfully'))
            .catch((err) => console.log('Error sharing:', err));
    }
    // 2. Fallback to your existing Modal (Desktop)
    else {
        showShareModal(pdf); // Your existing modal function
    }
}


function showShareModal(pdfFromCard) {
    let pdf;

    // Case 1: Called from the grid card (pdfFromCard is the PDF object from the home screen)
    if (pdfFromCard && pdfFromCard.id) {
        pdf = pdfFromCard;
    }
    // Case 2: Called from the modal's share button (no argument passed, so look in the dataset)
    else if (pdfModal.dataset.currentPdf) {
        // Parse the stored JSON string from the modal's dataset
        try {
            pdf = JSON.parse(pdfModal.dataset.currentPdf);
        } catch (e) {
            console.error("Error parsing current PDF data from modal dataset:", e);
            return; // Stop if parsing fails
        }
    }

    if (!pdf || !pdf.id) {
        console.error("Could not find PDF data for sharing.");
        showToast('Could not find PDF data for sharing.', 'error'); // <--- Added toast for user feedback
        return;
    }

    const shareUrl = `https://notes.alokdasofficial.in/?pdf=${pdf.id}`;
    shareLink.value = shareUrl;
    shareModal.classList.add('active');

    document.getElementById('shareSuccess').style.display = 'none';
}

function closeShareModal() {
    shareModal.classList.remove('active');
}

function copyShareLink() {
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);

    try {
        document.execCommand('copy');

        const shareSuccess = document.getElementById('shareSuccess');
        shareSuccess.style.display = 'flex';

        showToast('Link copied to clipboard!');

        setTimeout(() => {
            shareSuccess.style.display = 'none';
        }, 3000);

    } catch (err) {
        showToast('Failed to copy link', 'error');
    }
}

function downloadCurrentPDF() {
    if (!pdfModal.dataset.currentPdf) return;

    const pdf = JSON.parse(pdfModal.dataset.currentPdf);
    const originalPdfPath = pdf.pdfUrl;

    if (!originalPdfPath) {
        showToast('Cannot download: PDF link is missing.', 'error');
        return;
    }

    let downloadUrl = originalPdfPath;

    // 1. Convert Google Drive 'preview' or 'view' URL to a 'download' URL
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = originalPdfPath.match(driveRegex);

    if (match) {
        const fileId = match[1];

        // Use a slightly different download format: 'exports/download'
        // This is functionally similar to 'uc?export=download' but can
        // sometimes trick mobile browsers differently.
        downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
    }

    // 2. Trigger the download using window.open()
    const downloadWindow = window.open(downloadUrl, '_blank');

    showToast('PDF is opening in a new tab. Please use the download button inside Google Drive to download!');

    // 3. Fallback/User Instruction Toast
    // If the download fails or redirects, this instructs the user.
    setTimeout(() => {
        // You cannot detect if the download succeeded, so this provides context.
        showToast("If download failed, try tapping 'Download' inside the new window.", 'error');
    }, 5000);
}


function showToast(message, type = 'success') {
    toastMessage.textContent = message;

    if (type === 'error') {
        toast.style.background = 'var(--error-color)';
    } else {
        toast.style.background = 'var(--success-color)';
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// CopyRight
// Set the initial year your project was first copyrighted
const START_YEAR = 2025;

// Get the current year
const CURRENT_YEAR = new Date().getFullYear();

// Find the paragraph element by its ID
const copyrightElement = document.getElementById('copyright-year');

// Check if the element exists to prevent errors
if (copyrightElement) {
    // Build the year string dynamically
    let yearText = `© ${START_YEAR}`;

    // If the current year is later than the start year, append the range
    if (CURRENT_YEAR > START_YEAR) {
        const twoDigitCurrentYear = CURRENT_YEAR.toString().slice(-2);
        yearText += ` - ${twoDigitCurrentYear}`;
    }

    // Append the rest of your copyright text
    yearText += ` ClassNotes. All rights reserved.`;

    // Update the HTML content
    copyrightElement.innerHTML = yearText;
}

// --- Firebase Comment Functions ---

/**
 * Loads and displays comments for a given PDF ID.
 * @param {number} pdfId 
 */

async function loadComments(pdfId) {
    commentsList.innerHTML = '';
    commentCount.textContent = '...';

    try {
        const commentsRef = db.collection('comments');

        // PERMANENT FIX: The efficient, indexed query
        const snapshot = await commentsRef
            .where('pdfId', '==', pdfId)
            .orderBy('timestamp', 'desc') // This is the line that requires the index
            .get();

        const comments = [];
        snapshot.forEach(doc => {
            comments.push(doc.data());
        });

        commentCount.textContent = comments.length;

        // ... rest of the function for rendering comments ...
        // Use 'comments' directly here, no need for the JS sort.

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="comment-text" style="text-align: center; color: var(--gray-400);">Be the first to comment!</p>';
            return;
        }

        comments.forEach(comment => {
            commentsList.appendChild(createCommentElement(comment));
        });

    } catch (error) {
        console.error("Error loading comments:", error);
        commentCount.textContent = 'Error';
        showToast('Error loading comments', 'error');
    }
}


/**
 * Creates the HTML element for a single comment.
 * @param {object} comment 
 * @returns {HTMLElement}
 */
function createCommentElement(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';

    const author = comment.author || 'Anonymous';
    const date = new Date(comment.timestamp.toDate()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    item.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${author}</span>
            <span class="comment-date">${date}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
    `;

    return item;
}

/**
 * Handles the comment form submission.
 * @param {Event} e 
 */
async function handleCommentSubmit(e) {
    e.preventDefault();

    const currentPdfData = pdfModal.dataset.currentPdf;
    if (!currentPdfData) {
        showToast('Could not find PDF context', 'error');
        return;
    }

    const pdf = JSON.parse(currentPdfData);
    const text = commentInput.value.trim();
    let author = commentAuthor.value.trim();

    // Use a placeholder if author field is left empty
    if (!author) {
        author = "Anonymous";
    }

    if (text.length === 0) {
        return; // Basic validation
    }

    const submitBtn = document.getElementById('submitCommentBtn');
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await db.collection('comments').add({
            pdfId: pdf.id,
            text: text,
            author: author,
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
        });

        // Clear the form and reload comments
        commentInput.value = '';
        commentAuthor.value = '';
        await loadComments(pdf.id);

        showToast('Comment posted successfully!');

    } catch (error) {
        console.error("Error adding comment: ", error);
        showToast('Failed to post comment', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

const openCommentsBtn = document.getElementById("openCommentsBtn");

// Add close button dynamically inside header
const header = commentSidebar.querySelector("h4");
const closeBtn = document.createElement("button");
closeBtn.classList.add("drawer-close");
closeBtn.innerHTML = '<i class="fas fa-times"></i>';
header.appendChild(closeBtn);

// Open/Close functionality
openCommentsBtn.addEventListener("click", () => {
    commentSidebar.classList.add("active");
});

closeBtn.addEventListener("click", () => {
    commentSidebar.classList.remove("active");
});

// script.js - New Helper Functions

// 1. Get list of favorite IDs from storage
function getFavorites() {
    const stored = localStorage.getItem('classNotesFavorites');
    return stored ? JSON.parse(stored) : [];
}

// 2. Handle the click on the heart icon
function toggleFavorite(event, pdfId) {
    // Stop the card click event (so it doesn't open the PDF modal)
    event.stopPropagation();

    let favorites = getFavorites();

    if (favorites.includes(pdfId)) {
        // Remove if exists
        favorites = favorites.filter(id => id !== pdfId);
        showToast('Removed from saved notes');
    } else {
        // Add if doesn't exist
        favorites.push(pdfId);
        showToast('Added to saved notes');
    }

    // Save back to storage
    localStorage.setItem('classNotesFavorites', JSON.stringify(favorites));

    // Re-render to update the UI (fill/unfill heart)
    renderPDFs();
}