// PDF Database - Update this array when you add new PDFs to the /pdf/ folder
const pdfDatabase = [
    {
        id: 1,
        title: "BN Sir - Till 22-09-2025",
        filename: "BN.pdf",
        category: "Organic",
        description: "Unit 3",
        uploadDate: "2025-09-22",
        author: "Bhaskar Nath"
    },
    {
        id: 2,
        title: "JKS Sir - Till 22-09-2025",
        filename: "JKS.pdf",
        category: "Physical",
        description: "Unit 2",
        uploadDate: "2025-09-22",

        author: "Jayanta Kumar Sharma"
    },
    {
        id: 3,
        title: "KC Sir - Till 22-09-2025",
        filename: "KC.pdf",
        category: "Organic",
        description: "Unit 2",
        uploadDate: "2025-09-22",

        author: "Kaushik Chanda"
    },
    {
        id: 4,
        title: "SM Ma'am - Till 22-09-2025",
        filename: "SM.pdf",
        category: "Inorganic",
        description: "Unit 1 and Unit 2(Not complete)",
        uploadDate: "2025-09-22",

        author: "Shilpi Mital"
    },
    {
        id: 5,
        title: "SRA Sir - Till 22-09-2025",
        filename: "SRA.pdf",
        category: "Organic",
        description: "Unit 1",
        uploadDate: "2025-09-22",

        author: "Sujit Ranjan Acharjee"
    },
    {
        id: 6,
        title: "SK Sir",
        filename: "SK.pdf",
        category: "Physical",
        description: "Compiled Notes from Official WhatsApp Group upto page 75 - Unit 1(Completed)",
        uploadDate: "2025-10-04",
        author: "Satyajit Kumar"
    }
];

// Global variables
let currentPdfs = [...pdfDatabase];
let currentCategory = 'all';

// DOM Elements
const pdfGrid = document.getElementById('pdfGrid');
const searchInput = document.getElementById('searchInput');
const pdfCount = document.getElementById('pdfCount');
const emptyState = document.getElementById('emptyState');
const navLinks = document.querySelectorAll('.nav-link');
const pdfModal = document.getElementById('pdfModal');
const shareModal = document.getElementById('shareModal');
const pdfViewer = document.getElementById('pdfViewer');
const modalTitle = document.getElementById('modalTitle');
const shareLink = document.getElementById('shareLink');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();

    // Check if there's a PDF to view from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const pdfId = urlParams.get('pdf');
    if (pdfId) {
        const pdf = pdfDatabase.find(p => p.id == pdfId);
        if (pdf) {
            viewPDF(pdf);
        }
    }
});

function initializeApp() {
    renderPDFs(currentPdfs);
    updatePDFCount(currentPdfs.length);
}

function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);

    // Category navigation
    navLinks.forEach(link => {
        link.addEventListener('click', handleCategoryChange);
    });

    // Modal event listeners
    document.getElementById('closeModal').addEventListener('click', closePDFModal);
    document.getElementById('closeShareModal').addEventListener('click', closeShareModal);
    document.getElementById('shareBtn').addEventListener('click', showShareModal);
    document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPDF);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);

    // Close modals when clicking outside
    pdfModal.addEventListener('click', function (e) {
        if (e.target === pdfModal) closePDFModal();
    });

    shareModal.addEventListener('click', function (e) {
        if (e.target === shareModal) closeShareModal();
    });

    // Keyboard shortcuts
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

function renderPDFs(pdfs) {
    if (pdfs.length === 0) {
        pdfGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    pdfGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    pdfGrid.innerHTML = pdfs.map(pdf => createPDFCard(pdf)).join('');
}

function createPDFCard(pdf) {
    const categoryIcons = {
        math: 'fa-calculator',
        science: 'fa-microscope',
        history: 'fa-landmark',
        english: 'fa-book-open'
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
                    ${pdf.category.charAt(0).toUpperCase() + pdf.category.slice(1)}
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

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSearch = pdf.title.toLowerCase().includes(searchTerm) ||
            pdf.description.toLowerCase().includes(searchTerm) ||
            pdf.category.toLowerCase().includes(searchTerm) ||
            pdf.author.toLowerCase().includes(searchTerm);

        const matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;

        return matchesSearch && matchesCategory;
    });

    currentPdfs = filteredPdfs;
    renderPDFs(currentPdfs);
    updatePDFCount(currentPdfs.length);
}

function handleCategoryChange(e) {
    e.preventDefault();

    // Update active navigation link
    navLinks.forEach(link => link.classList.remove('active'));
    e.target.classList.add('active');

    currentCategory = e.target.dataset.category;

    // Filter PDFs and trigger search to apply both filters
    handleSearch();
}

function updatePDFCount(count) {
    pdfCount.textContent = count;
}

function viewPDF(pdf) {
    const pdfPath = `./pdf/${pdf.filename}`;

    modalTitle.textContent = pdf.title;
    pdfViewer.src = pdfPath;
    pdfModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Store current PDF for sharing and downloading
    pdfModal.dataset.currentPdf = JSON.stringify(pdf);
}

function closePDFModal() {
    pdfModal.classList.remove('active');
    pdfViewer.src = '';
    document.body.style.overflow = 'auto';

    // Update URL to remove PDF parameter
    const url = new URL(window.location);
    url.searchParams.delete('pdf');
    window.history.replaceState({}, document.title, url);
}

function sharePDF(pdfId) {
    const pdf = pdfDatabase.find(p => p.id === pdfId);
    if (!pdf) return;

    showShareModal(pdf);
}

function showShareModal(pdf) {
    if (!pdf && pdfModal.dataset.currentPdf) {
        pdf = JSON.parse(pdfModal.dataset.currentPdf);
    }

    if (!pdf) return;

    const shareUrl = `${window.location.origin}${window.location.pathname}?pdf=${pdf.id}`;
    shareLink.value = shareUrl;
    shareModal.classList.add('active');

    // Hide success message
    document.getElementById('shareSuccess').style.display = 'none';
}

function closeShareModal() {
    shareModal.classList.remove('active');
}

function copyShareLink() {
    shareLink.select();
    shareLink.setSelectionRange(0, 99999); // For mobile devices

    try {
        document.execCommand('copy');

        // Show success message
        const shareSuccess = document.getElementById('shareSuccess');
        shareSuccess.style.display = 'flex';

        // Show toast notification
        showToast('Link copied to clipboard!');

        // Hide success message after 3 seconds
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

    // Create a temporary link to trigger download
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

// Utility function to add new PDF (for your reference when adding PDFs)
function addNewPDF(pdfData) {
    // This function is for your reference when you need to add new PDFs
    // Just add the new PDF object to the pdfDatabase array at the top of this file

    console.log('To add a new PDF, update the pdfDatabase array with:', pdfData);
    console.log('Make sure to upload the actual PDF file to the /pdf/ folder in your repository');
}

// Example of how to add a new PDF:
// addNewPDF({
//     id: 7,
//     title: "Physics - Quantum Mechanics",
//     filename: "quantum-mechanics.pdf",
//     category: "science",
//     description: "Introduction to quantum mechanics principles and applications.",
//     uploadDate: "2025-01-16",
//     author: "Dr. Anderson"
// });

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js')
            .then(function (registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function (error) {
                console.log('ServiceWorker registration failed');
            });
    });
}

// Analytics (you can add Google Analytics or other tracking here)
function trackPDFView(pdfTitle) {
    // Example: gtag('event', 'pdf_view', { pdf_title: pdfTitle });
    console.log(`PDF viewed: ${pdfTitle}`);
}

function trackPDFShare(pdfTitle) {
    // Example: gtag('event', 'pdf_share', { pdf_title: pdfTitle });
    console.log(`PDF shared: ${pdfTitle}`);
}