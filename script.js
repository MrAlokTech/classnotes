const pdfDatabase = [
    {
        id: 1,
        title: "BN Sir - Till 22-09-2025",
        filename: "BN.pdf",
        category: "Organic",
        description: "Unit 3",
        uploadDate: "2025-09-22",
        author: "Bhaskar Nath",
        semester: 1
    },
    {
        id: 2,
        title: "JKS Sir - Till 22-09-2025",
        filename: "JKS.pdf",
        category: "Physical",
        description: "Unit 2",
        uploadDate: "2025-09-22",
        author: "Jayanta Kumar Sharma",
        semester: 1
    },
    {
        id: 3,
        title: "KC Sir - Till 22-09-2025",
        filename: "KC.pdf",
        category: "Organic",
        description: "Unit 2",
        uploadDate: "2025-09-22",
        author: "Kaushik Chanda",
        semester: 1
    },
    {
        id: 4,
        title: "SM Ma'am - Till 22-09-2025",
        filename: "SM.pdf",
        category: "Inorganic",
        description: "Unit 1 and Unit 2 (Not complete)",
        uploadDate: "2025-09-22",
        author: "Shilpi Mital",
        semester: 1
    },
    {
        id: 5,
        title: "SRA Sir - Till 22-09-2025",
        filename: "SRA.pdf",
        category: "Organic",
        description: "Unit 1",
        uploadDate: "2025-09-22",
        author: "Sujit Ranjan Acharjee",
        semester: 1
    },
    {
        id: 6,
        title: "SK Sir",
        filename: "SK.pdf",
        category: "Physical",
        description: "Compiled Notes from Official WhatsApp Group upto page 75 - Unit 1 (Completed)",
        uploadDate: "2025-10-04",
        author: "Satyajit Kumar",
        semester: 1
    }
];

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

document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
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

function viewPDF(pdf) {
    const pdfPath = `./pdf/${pdf.filename}`;

    modalTitle.textContent = pdf.title;
    pdfViewer.src = pdfPath;
    pdfModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    pdfModal.dataset.currentPdf = JSON.stringify(pdf);
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