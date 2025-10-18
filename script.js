let pdfDatabase = [];

async function loadPDFDatabase() {
    try {
        const response = await fetch('notes.json');
        pdfDatabase = await response.json();
        renderPDFs();
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

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

document.addEventListener('DOMContentLoaded', async function () {
    initializeApp();
    await loadPDFDatabase();
    setupEventListeners();

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

function initializeApp() {
    renderPDFs();
}

// function setupEventListeners() {
//     searchInput.addEventListener('input', renderPDFs);

//     tabBtns.forEach(btn => {
//         btn.addEventListener('click', handleSemesterChange);
//     });

//     filterBtns.forEach(btn => {
//         btn.addEventListener('click', handleCategoryChange);
//     });

//     document.getElementById('closeModal').addEventListener('click', closePDFModal);
//     document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
//     document.getElementById('shareBtn').addEventListener('click', () => showShareModal());
//     document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPDF);
//     document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

//     pdfModal.addEventListener('click', function (e) {
//         if (e.target === pdfModal) closePDFModal();
//     });

//     shareModal.addEventListener('click', function (e) {
//         if (e.target === shareModal) closeShareModal();
//     });

//     document.addEventListener('keydown', function (e) {
//         if (e.key === 'Escape') {
//             if (shareModal.classList.contains('active')) {
//                 closeShareModal();
//             } else if (pdfModal.classList.contains('active')) {
//                 closePDFModal();
//             }
//         }
//     });
// }

// script.js (REPLACE the existing setupEventListeners function)
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
    document.getElementById('shareBtn').addEventListener('click', () => showShareModal());
    document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPDF);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

    // NEW: Comment form submission
    commentForm.addEventListener('submit', handleCommentSubmit);

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
}


// script.js (REPLACE the existing viewPDF function)
async function viewPDF(pdf) {
    const pdfPath = `./pdf/${pdf.filename}`;

    modalTitle.textContent = pdf.title;
    pdfViewer.src = pdfPath;
    pdfModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    pdfModal.dataset.currentPdf = JSON.stringify(pdf);

    // NEW: Load comments when opening the modal
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
                <button class="btn btn-secondary" onclick="sharePDF(${pdf.id})">
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

// function viewPDF(pdf) {
//     const pdfPath = `./pdf/${pdf.filename}`;

//     modalTitle.textContent = pdf.title;
//     pdfViewer.src = pdfPath;
//     pdfModal.classList.add('active');
//     document.body.style.overflow = 'hidden';

//     pdfModal.dataset.currentPdf = JSON.stringify(pdf);
// }

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
        // Ensure we handle the case where the JSON string is passed by the 'sharePDF' function
        // which may pass an ID and not the object. Let's make sure the sharePDF(pdfId) function
        // calls this with the actual PDF object.
        pdf = JSON.parse(pdfModal.dataset.currentPdf);
    }

    if (!pdf) {
        console.error("Could not find PDF data for sharing.");
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

function downloadCurrentPDF() {
    if (!pdfModal.dataset.currentPdf) return;

    const pdf = JSON.parse(pdfModal.dataset.currentPdf);
    const pdfPath = `./pdf/${pdf.filename}`;

    const link = document.createElement('a');
    link.href = pdfPath;
    link.download = pdf.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Download started!');
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
        yearText += ` - ${CURRENT_YEAR}`;
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
