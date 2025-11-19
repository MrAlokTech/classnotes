let pdfDatabase = [];
let currentSemester = 1;
let currentCategory = 'all';

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
    try {

        const pdfsRef = db.collection('pdfs');

        // Fetch data from Firestore
        const snapshot = await pdfsRef
            .orderBy('uploadDate', 'desc')
            .get();

        pdfDatabase = [];

        snapshot.forEach(doc => {
            // Get data and assign the Firestore document ID to the PDF object
            // Use spread operator for clean data structure
            pdfDatabase.push({
                id: doc.id, // Use Firestore document ID as the unique ID
                ...doc.data()
            });
        });

        renderPDFs();

        hidePreloader();



    } catch (error) {
        console.error('Error loading PDFs from Firestore:', error);
        // Display a user-friendly error or fallback
        const mainContent = document.querySelector('.main .container');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="empty-state" style="display: block;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error Loading Notes</h3>
                    <p>Failed to connect to the database. Please try again later.</p>
                </div>
            `;
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
    const screen = document.getElementById('maintenanceScreen');

    if (screen) {
        // CHANGE: Use .add('active') instead of removing 'hidden'
        screen.classList.add('active');

        // 2. Update the timestamp
        const timeSpan = document.getElementById('errorTime');
        if (timeSpan) timeSpan.innerText = new Date().toISOString();

        // 3. Check if Admin is logged in
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const adminSection = document.getElementById('adminDiagnostics');
                if (adminSection) {
                    adminSection.classList.remove('hidden');
                }
            }
        });
    }

    // 4. SECURITY NUKE: Remove content
    const main = document.querySelector('main');
    const header = document.querySelector('header');
    const tabs = document.querySelector('.semester-tabs');

    if (main) main.remove();
    if (header) header.remove();
    if (tabs) tabs.remove();

    // Clear data
    pdfDatabase = [];
    hidePreloader();
    document.body.style.overflow = 'hidden';
}

function deactivateMaintenanceMode() {
    console.log("System Status: OPERATIONAL");
    const screen = document.getElementById('maintenanceScreen');

    // 1. Hide the error screen
    if (screen) {
        // CHANGE: Use .remove('active') instead of adding 'hidden'
        screen.classList.remove('active');
    }

    // 2. Unlock scrolling
    document.body.style.overflow = 'auto';

    // 3. Load Data (Only if we haven't already)
    if (pdfDatabase.length === 0) {
        // Ensure preloader is shown while data loads
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


document.addEventListener('DOMContentLoaded', async function () {

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
        modalShareBtn.addEventListener('click', () => showShareModal());
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

function renderPDFs() {
    const searchTerm = searchInput.value.toLowerCase();

    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;
        const matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;
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
        return;
    }

    pdfGrid.style.display = 'grid';
    emptyState.style.display = 'none';
    pdfGrid.innerHTML = filteredPdfs.map(pdf => createPDFCard(pdf)).join('');
}

function createPDFCard(pdf) {
    const categoryIcons = {
        'Organic': 'fa-flask',
        'Inorganic': 'fa-atom',
        'Physical': 'fa-calculator'
    };

    const categoryIcon = categoryIcons[pdf.category] || 'fa-file-pdf';
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return `
        <div class="pdf-card" data-category="${pdf.category}">
            <div class="pdf-header">
                <div class="pdf-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="pdf-info">
                    <h3>${pdf.title}</h3>
                </div>
            </div>

            <div class="pdf-meta">
                <div class="pdf-category">
                    <i class="fas ${categoryIcon}"></i>
                    ${pdf.category}
                </div>
                <div class="pdf-date">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </div>
            </div>

            <p class="pdf-description">${pdf.description}</p>

            <div class="pdf-actions">
                <button class="btn btn-primary" onclick="viewPDF(${JSON.stringify(pdf).replace(/"/g, '&quot;')})">
                    <i class="fas fa-eye"></i>
                    View
                </button>
                <button class="btn btn-secondary" id="shareBtn" onclick="sharePDF('${pdf.id}')">
                    <i class="fas fa-share-alt"></i>
                    Share
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
    const pdf = pdfDatabase.find(p => p.id === pdfId);
    if (!pdf) return;

    showShareModal(pdf);
}


// NEW Function (more robust)
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

    const shareUrl = `${window.location.origin}${window.location.pathname}?pdf=${pdf.id}`;
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

// script.js (REPLACE existing downloadCurrentPDF function)

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
