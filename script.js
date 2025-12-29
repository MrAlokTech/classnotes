let pdfDatabase = [];
let currentSemester = parseInt(localStorage.getItem('currentSemester')) || 2;
let currentCategory = 'all';
let isMaintenanceActive = false;
let currentUserUID = null;
let searchTimeout;
let adDatabase = {};
let isModalHistoryPushed = false;

const preloader = document.getElementById('preloader');
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
const commentSidebar = document.getElementById('commentSidebar');
const commentsList = document.getElementById('commentsList');
const commentCount = document.getElementById('commentCount');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');
const commentAuthor = document.getElementById('commentAuthor');
const alomolePromo = document.getElementById('alomolePromo');
const closeAlomolePromo = document.getElementById('closeAlomolePromo');
const goToTopBtn = document.getElementById('goToTopBtn');
const maintenanceScreen = document.getElementById('maintenanceScreen');
const openCommentsBtn = document.getElementById("openCommentsBtn");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");

// --- Auth & Analytics ---
firebase.auth().signInAnonymously()
    .then((userCredential) => {
        currentUserUID = userCredential.user.uid;
        updateUserMetadata();
    })
    .catch((error) => {
        console.error("Analytics Error:", error);
    });

function updateUserMetadata() {
    if (!currentUserUID) return;
    const userRef = db.collection('analytics').doc(currentUserUID);
    userRef.set({
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        device: getSimpleDeviceName(),
        platform: navigator.platform
    }, { merge: true });
}

function logInteraction(actionType, details, pdfId = null) {
    if (!currentUserUID || isMaintenanceActive) return;
    const userRef = db.collection('analytics').doc(currentUserUID);

    if (pdfId && (actionType === 'view_pdf' || actionType === 'download')) {
        const pdfStatsRef = userRef.collection('interactions').doc(pdfId);
        const updateData = {
            title: details,
            lastInteraction: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (actionType === 'view_pdf') {
            updateData.viewCount = firebase.firestore.FieldValue.increment(1);
        } else if (actionType === 'download') {
            updateData.downloadCount = firebase.firestore.FieldValue.increment(1);
        }
        pdfStatsRef.set(updateData, { merge: true });
        updateUserMetadata();
    } else if (actionType === 'search') {
        userRef.collection('search_history').add({
            term: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function getSimpleDeviceName() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android Mobile";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS Device";
    if (/Windows/i.test(ua)) return "Windows PC";
    if (/Mac/i.test(ua)) return "Mac";
    return "Other";
}

// --- UI Helpers ---
function handleGoToTopVisibility() {
    if (window.scrollY > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
}

// --- Ads System ---
async function loadSponsoredAds() {
    try {
        const adsRef = db.collection('sponsors');
        const snapshot = await adsRef.get();
        adDatabase = {};
        snapshot.forEach(doc => {
            adDatabase[doc.id] = doc.data();
        });
        renderAdSlot('slot_top', 'ad-slot-top');
        renderAdSlot('slot_middle', 'ad-slot-middle');
        renderAdSlot('slot_modal', 'ad-slot-modal');
    } catch (error) {
        console.error("Error loading ads:", error);
    }
}

function renderAdSlot(dbId, elementId) {
    const container = document.getElementById(elementId);
    if (!container) return;
    const data = adDatabase[dbId];
    if (data && data.active) {
        container.innerHTML = createAdHTML(data);
    } else {
        container.innerHTML = createFallbackHTML();
    }
}

function createAdHTML(data) {
    const link = data.link || '#';
    const target = data.link ? '_blank' : '_self';
    if (data.type === 'image') {
        return `
            <a href="${link}" target="${target}" class="sponsored-card" onclick="logInteraction('ad_click', '${data.title || 'Ad'}')">
                <span class="sponsored-badge">Sponsored</span>
                <img src="${data.imageUrl}" alt="${data.title || 'Advertisement'}" class="sponsored-image" loading="lazy">
            </a>
        `;
    } else {
        return `
            <a href="${link}" target="${target}" class="sponsored-card" onclick="logInteraction('ad_click', '${data.title || 'Ad'}')">
                <span class="sponsored-badge">Sponsored</span>
                <div class="sponsored-content">
                    <div class="sponsored-title">${data.title}</div>
                    <div class="sponsored-body">${data.body}</div>
                    ${data.ctaText ? `<span class="sponsored-cta">${data.ctaText}</span>` : ''}
                </div>
            </a>
        `;
    }
}

function createFallbackHTML() {
    return `
        <a href="mailto:notes@alokdasofficial.in?subject=Sponsorship Inquiry" class="sponsored-fallback">
            <i class="fas fa-bullhorn"></i>
            <h4>Advertise Here</h4>
            <p>Let others know your presence.</p>
        </a>
    `;
}

// --- Data Loading ---
async function loadPDFDatabase() {
    if (isMaintenanceActive) return;
    try {
        const pdfsRef = db.collection('pdfs');
        const snapshot = await pdfsRef.orderBy('uploadDate', 'desc').get();
        pdfDatabase = [];
        snapshot.forEach(doc => {
            pdfDatabase.push({ id: doc.id, ...doc.data() });
        });
        renderPDFs();
        hidePreloader();
    } catch (error) {
        console.error('Error loading PDFs:', error);
        if (error.code === 'permission-denied') {
            activateMaintenanceMode();
        } else {
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

// --- Maintenance & Holidays ---
function initMaintenanceListener() {
    db.collection('controll').doc('classNotes')
        .onSnapshot((doc) => {
            let isDown = false;
            if (doc.exists) isDown = doc.data().isMaintenance === true;
            if (isDown) activateMaintenanceMode();
            else deactivateMaintenanceMode();
        }, (error) => {
            console.error("Connection failed:", error);
            activateMaintenanceMode();
        });
}

function activateMaintenanceMode() {
    isMaintenanceActive = true;
    const screen = document.getElementById('maintenanceScreen');
    const mainContainer = document.querySelector('.main');
    const header = document.querySelector('header');
    const tabs = document.querySelector('.semester-tabs');

    if (screen) {
        screen.classList.add('active');
        const timeSpan = document.getElementById('errorTime');
        if (timeSpan) timeSpan.innerText = new Date().toISOString();
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                const adminSection = document.getElementById('adminDiagnostics');
                if (adminSection) adminSection.classList.remove('hidden');
            }
        });
    }

    pdfDatabase = [];
    if (pdfGrid) pdfGrid.innerHTML = '';
    if (mainContainer) mainContainer.style.display = 'none';
    if (header) header.style.display = 'none';
    if (tabs) tabs.style.display = 'none';
    hidePreloader();
    document.body.style.overflow = 'hidden';
}

function deactivateMaintenanceMode() {
    isMaintenanceActive = false;
    const screen = document.getElementById('maintenanceScreen');
    const mainContainer = document.querySelector('.main');
    const header = document.querySelector('header');
    const tabs = document.querySelector('.semester-tabs');

    if (screen) screen.classList.remove('active');
    if (mainContainer) mainContainer.style.display = 'block';
    if (header) header.style.display = 'block';
    if (tabs) tabs.style.display = 'block';
    document.body.style.overflow = 'auto';

    if (pdfDatabase.length === 0) {
        if (preloader) preloader.classList.remove('hidden');
        loadPDFDatabase().then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const pdfId = urlParams.get('pdf');
            if (pdfId) {
                const pdf = pdfDatabase.find(p => p.id == pdfId);
                // Don't push history on initial load
                if (pdf) viewPDF(pdf, false);
            }
        });
    }
}

function checkHolidayMode() {
    const today = new Date();
    const month = today.getMonth();
    const date = today.getDate();
    const overlay = document.getElementById('holidayOverlay');
    const title = document.getElementById('holidayTitle');
    const msg = document.getElementById('holidayMessage');
    const sub = document.getElementById('holidaySubMessage');

    const isRepublicDay = (month === 0 && date === 26);
    const isIndependenceDay = (month === 7 && date === 15);
    const isHoli = (month === 2 && date === 4);
    const isDiwali = (month === 10 && (date === 8 || date === 9));
    const isChristmas = (month === 11 && date === 25);
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
        sub.innerText = "P.S: ClassNotes will return on March 5th.";
        document.body.style.overflow = 'hidden';
        return true;
    }
    if (isDiwali) {
        overlay.classList.remove('hidden');
        overlay.classList.add('diwali');
        title.innerText = "Happy Diwali";
        msg.innerText = "Shubh Deepavali!";
        sub.innerText = "P.S: ClassNotes will resume shortly.";
        document.body.style.overflow = 'hidden';
        return true;
    }
    if (isChristmas) {
        overlay.classList.remove('hidden');
        overlay.classList.add('christmas');
        title.innerText = "Merry Christmas";
        msg.innerText = "Wishing you calm vibes and cozy moments.";
        sub.innerText = "P.S: Back on Dec 26th.";
        document.body.style.overflow = 'hidden';
        return true;
    } else if (isNewYear) {
        overlay.classList.remove('hidden');
        overlay.classList.add('new-year');
        title.innerText = "Happy New Year";
        msg.innerText = "Wishing you a year full of peace, clarity, and good energy.";
        sub.innerText = "Enjoy the break!";
        document.body.style.overflow = 'hidden';
        return true;
    }
    return false;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async function () {
    initTheme();
    initSeasonalHeader();
    updateSemesterTab();

    const isHoliday = checkHolidayMode();
    if (isHoliday) {
        hidePreloader();
        return;
    }

    initMaintenanceListener();
    loadSponsoredAds();
    await loadPDFDatabase();
    setupEventListeners();
    checkAlomolePromoState();

    const urlParams = new URLSearchParams(window.location.search);
    const pdfId = urlParams.get('pdf');
    if (pdfId) {
        const pdf = pdfDatabase.find(p => p.id == pdfId);
        if (pdf) {
            currentSemester = pdf.semester;
            // 2b. FIX: Save semester if loading from URL
            localStorage.setItem('currentSemester', currentSemester);
            updateSemesterTab();
            // Don't push history on initial load
            viewPDF(pdf, false);
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
    if (modalShareBtn) modalShareBtn.addEventListener('click', () => sharePDF());
    document.getElementById('downloadBtn').addEventListener('click', downloadCurrentPDF);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
    commentForm.addEventListener('submit', handleCommentSubmit);
    if (closeAlomolePromo) closeAlomolePromo.addEventListener('click', hideAlomolePromo);

    pdfModal.addEventListener('click', function (e) {
        if (e.target === pdfModal) closePDFModal();
    });
    shareModal.addEventListener('click', function (e) {
        if (e.target === shareModal) closeShareModal();
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            if (shareModal.classList.contains('active')) closeShareModal();
            else if (pdfModal.classList.contains('active')) closePDFModal();
        }
    });

    // 4. FIX: Handle Browser Back Button for Modal
    window.addEventListener('popstate', function (event) {
        if (pdfModal.classList.contains('active')) {
            _closeModalInternal();
        }
    });

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    if (goToTopBtn) {
        window.addEventListener('scroll', handleGoToTopVisibility);
        goToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

function checkAlomolePromoState() {
    const isHiddenForSession = sessionStorage.getItem('hideAlomolePromoSession');
    if (alomolePromo && isHiddenForSession === 'true') {
        alomolePromo.classList.add('hidden');
    } else if (alomolePromo) {
        alomolePromo.classList.remove('hidden');
    }
}

function hideAlomolePromo() {
    if (alomolePromo) {
        alomolePromo.classList.add('hidden');
        sessionStorage.setItem('hideAlomolePromoSession', 'true');
    }
}

function handleScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 0) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
    if (goToTopBtn) handleGoToTopVisibility();
}

/**
 * 5. FIX: Universal PDF Link Handler
 * - Google Drive -> /preview
 * - Regular PDF -> Google Docs Viewer
 */
function getEmbeddableUrl(url) {
    if (!url) return '';
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    // Universal Viewer for non-Drive links
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

/**
 * 6. FIX: viewPDF with History Tracking
 */
async function viewPDF(pdf, pushToHistory = true) {
    const originalPdfPath = pdf.pdfUrl;
    logInteraction('view_pdf', pdf.title, pdf.id);

    if (!originalPdfPath) {
        showToast('PDF link is missing or invalid.', 'error');
        return;
    }

    const embeddablePdfPath = getEmbeddableUrl(originalPdfPath);
    modalTitle.textContent = pdf.title;
    pdfViewer.src = embeddablePdfPath;
    pdfModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    pdfModal.dataset.currentPdf = JSON.stringify(pdf);

    if (pushToHistory) {
        const newUrl = `${window.location.pathname}?pdf=${pdf.id}`;
        window.history.pushState({ modalOpen: true }, pdf.title, newUrl);
        isModalHistoryPushed = true;
    }

    await loadComments(pdf.id);
}

// 7. FIX: Semester Change with LocalStorage
function handleSemesterChange(e) {
    currentSemester = parseInt(e.currentTarget.dataset.semester);
    localStorage.setItem('currentSemester', currentSemester);
    updateSemesterTab();
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
    const favorites = getFavorites();

    if (searchTerm.length > 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            logInteraction('search', searchTerm);
        }, 2000);
    }

    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;
        let matchesCategory = false;
        if (currentCategory === 'favorites') {
            matchesCategory = favorites.includes(pdf.id);
        } else {
            matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;
        }
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

    let gridHTML = "";
    const AD_FREQUENCY = 4;
    let adCounter = 1;

    filteredPdfs.forEach((pdf, index) => {
        gridHTML += createPDFCard(pdf, favorites);
        if ((index + 1) % AD_FREQUENCY === 0) {
            let adData = adDatabase[`slot_grid_${adCounter}`];
            if (!adData || !adData.active) adData = adDatabase['slot_grid'];
            if (adData && adData.active) gridHTML += createAdHTML(adData);
            else gridHTML += createFallbackHTML();
            adCounter++;
        }
    });

    if (filteredPdfs.length < AD_FREQUENCY && filteredPdfs.length > 0) {
        let adData = adDatabase['slot_grid_1'] || adDatabase['slot_grid'];
        if (adData && adData.active) gridHTML += createAdHTML(adData);
        else gridHTML += createFallbackHTML();
    }

    pdfGrid.innerHTML = gridHTML;
}

function createPDFCard(pdf, favoritesList) {
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
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    const escapeHtml = (text) => {
        if (!text) return '';
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    };

    const highlightText = (text) => {
        const searchTerm = searchInput.value.trim();
        const safeText = escapeHtml(text);
        if (!searchTerm) return safeText;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return safeText.replace(regex, '<span class="highlight">$1</span>');
    };

    const safePdfString = JSON.stringify(pdf).replace(/"/g, '&quot;');

    return `
        <div class="pdf-card" data-category="${pdf.category}">
            <div class="pdf-header">
                <div class="pdf-icon"><i class="fas fa-file-pdf"></i></div>
                <div class="pdf-info"><h3>${highlightText(pdf.title)}</h3></div>
            </div>
            <div class="pdf-meta">
                <div class="pdf-category"><i class="fas ${categoryIcon}"></i> ${escapeHtml(pdf.category)}</div>
                <div class="pdf-date"><i class="fas fa-calendar"></i> ${formattedDate}</div>
            </div>
            <p class="pdf-description">${highlightText(pdf.description)}</p>
            <div class="pdf-actions">
                <button class="btn btn-primary" onclick="viewPDF(${safePdfString})">
                    <i class="fas fa-eye"></i> View
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

// 8. FIX: Helper to close UI separate from history logic
function _closeModalInternal() {
    pdfModal.classList.remove('active');
    pdfViewer.src = '';
    document.body.style.overflow = 'auto';
    isModalHistoryPushed = false;
}

function closePDFModal() {
    if (isModalHistoryPushed) {
        window.history.back(); // This triggers 'popstate', which calls _closeModalInternal
    } else {
        const url = new URL(window.location);
        url.searchParams.delete('pdf');
        window.history.replaceState({}, document.title, url);
        _closeModalInternal();
    }
}

function sharePDF(pdfId) {
    let pdf;
    if (typeof pdfId === 'string') {
        pdf = pdfDatabase.find(p => p.id === pdfId);
    } else if (pdfModal.dataset.currentPdf) {
        try { pdf = JSON.parse(pdfModal.dataset.currentPdf); } catch (e) { }
    }
    if (!pdf) return;
    const shareUrl = `https://notes.alokdasofficial.in/?pdf=${pdf.id}`;
    const shareData = {
        title: `ClassNotes: ${pdf.title}`,
        text: `Check out this note: ${pdf.title} on ClassNotes`,
        url: shareUrl
    };
    if (navigator.share) {
        navigator.share(shareData).catch((err) => console.log('Error sharing:', err));
    } else {
        showShareModal(pdf);
    }
}

function showShareModal(pdfFromCard) {
    let pdf;
    if (pdfFromCard && pdfFromCard.id) pdf = pdfFromCard;
    else if (pdfModal.dataset.currentPdf) {
        try { pdf = JSON.parse(pdfModal.dataset.currentPdf); } catch (e) { return; }
    }
    if (!pdf || !pdf.id) {
        showToast('Could not find PDF data for sharing.', 'error');
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
        setTimeout(() => { shareSuccess.style.display = 'none'; }, 3000);
    } catch (err) {
        showToast('Failed to copy link', 'error');
    }
}

// 9. FIX: Download logic supporting Universal Links
function downloadCurrentPDF() {
    if (!pdfModal.dataset.currentPdf) return;
    const pdf = JSON.parse(pdfModal.dataset.currentPdf);
    logInteraction('download', pdf.title, pdf.id);
    const originalPdfPath = pdf.pdfUrl;

    if (!originalPdfPath) {
        showToast('Cannot download: PDF link is missing.', 'error');
        return;
    }

    let downloadUrl = originalPdfPath;
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = originalPdfPath.match(driveRegex);

    if (match) {
        const fileId = match[1];
        downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
        showToast('Opening Google Drive... Click Download there.');
    } else {
        showToast('Download starting...');
    }
    window.open(downloadUrl, '_blank');
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    if (type === 'error') toast.style.background = 'var(--error-color)';
    else toast.style.background = 'var(--success-color)';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// Copyright
const START_YEAR = 2025;
const CURRENT_YEAR = new Date().getFullYear();
const copyrightElement = document.getElementById('copyright-year');
if (copyrightElement) {
    let yearText = `© ${START_YEAR}`;
    if (CURRENT_YEAR > START_YEAR) yearText += ` - ${CURRENT_YEAR.toString().slice(-2)}`;
    yearText += ` ClassNotes. All rights reserved.`;
    copyrightElement.innerHTML = yearText;
}

// --- Comments System ---
async function loadComments(pdfId) {
    const adSlot = document.getElementById('ad-slot-modal');
    commentsList.innerHTML = '';
    if (adSlot) commentsList.appendChild(adSlot);
    commentCount.textContent = '...';

    try {
        const commentsRef = db.collection('comments');
        const snapshot = await commentsRef
            .where('pdfId', '==', pdfId)
            .orderBy('timestamp', 'desc')
            .get();

        const comments = [];
        snapshot.forEach(doc => comments.push(doc.data()));
        commentCount.textContent = comments.length;

        if (comments.length === 0) {
            commentsList.innerHTML = '<p class="comment-text" style="text-align: center; color: var(--gray-400);">Be the first to comment!</p>';
            return;
        }
        comments.forEach(comment => commentsList.appendChild(createCommentElement(comment)));
    } catch (error) {
        console.error("Error loading comments:", error);
        commentCount.textContent = 'Error';
    }
}

function createCommentElement(comment) {
    const item = document.createElement('div');
    item.className = 'comment-item';
    const author = comment.author || 'Anonymous';
    const date = new Date(comment.timestamp.toDate()).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
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

async function handleCommentSubmit(e) {
    e.preventDefault();
    const currentPdfData = pdfModal.dataset.currentPdf;
    if (!currentPdfData) { showToast('Could not find PDF context', 'error'); return; }
    const pdf = JSON.parse(currentPdfData);
    const text = commentInput.value.trim();
    let author = commentAuthor.value.trim() || "Anonymous";

    if (text.length === 0) return;
    const submitBtn = document.getElementById('submitCommentBtn');
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        await db.collection('comments').add({
            pdfId: pdf.id,
            text: text,
            author: author,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
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

if (openCommentsBtn && commentSidebar) {
    openCommentsBtn.addEventListener("click", () => commentSidebar.classList.add("active"));
}
if (closeCommentsBtn && commentSidebar) {
    closeCommentsBtn.addEventListener("click", () => commentSidebar.classList.remove("active"));
}

// --- Favorites ---
function getFavorites() {
    const stored = localStorage.getItem('classNotesFavorites');
    return stored ? JSON.parse(stored) : [];
}

function toggleFavorite(event, pdfId) {
    event.stopPropagation();
    let favorites = getFavorites();
    if (favorites.includes(pdfId)) {
        favorites = favorites.filter(id => id !== pdfId);
        showToast('Removed from saved notes');
    } else {
        favorites.push(pdfId);
        showToast('Added to saved notes');
    }
    localStorage.setItem('classNotesFavorites', JSON.stringify(favorites));
    renderPDFs();
}

// --- Theme ---
function initTheme() {
    const toggleBtn = document.getElementById('themeToggleBtn');
    const icon = toggleBtn.querySelector('i');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) applyTheme('dark', icon);
    else applyTheme('light', icon);

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme, icon);
        localStorage.setItem('theme', newTheme);
    });
}

function applyTheme(theme, icon) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', '#121212');
    } else {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
        document.querySelector('meta[name="theme-color"]').setAttribute('content', '#ffffff');
    }
}

/* --- SEASONAL HEADER LOGIC --- */
function initSeasonalHeader() {
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    const header = document.querySelector('.header');

    if (!header) return;

    let particleType = null;
    let density = 400; // Default spawn rate (ms)

    // 1. Winter: Dec, Jan, Feb
    if (month === 11 || month === 0 || month === 1) {
        particleType = 'snow';
    }
    // 2. Summer: Mar, Apr, May, June (Hot/Sunny)
    else if (month >= 2 && month <= 5) {
        particleType = 'summer';
        density = 600; // Slower spawn for sun motes (less distracting)
    }
    // 3. Monsoon: July, Aug, Sept (Rain)
    else if (month >= 6 && month <= 8) {
        particleType = 'rain';
        density = 80; // Fast spawn for heavy rain look
    }
    // 4. Autumn: Oct, Nov (Falling Leaves)
    else if (month >= 9 && month <= 10) {
        particleType = 'autumn';
        density = 500;
    }

    if (!particleType) return;

    // Start the animation loop
    setInterval(() => {
        spawnSeasonParticle(header, particleType);
    }, density);
}

function spawnSeasonParticle(container, type) {
    const el = document.createElement('div');
    el.classList.add('season-particle');

    // Random Horizontal Position (0% to 100%)
    const leftPos = Math.random() * 100;
    el.style.left = `${leftPos}%`;

    if (type === 'snow') {
        el.classList.add('snowflake');
        el.innerHTML = '❄';
        const size = Math.random() * 10 + 10; // 10px-20px
        el.style.fontSize = `${size}px`;
        el.style.animationDuration = `${Math.random() * 3 + 3}s`; // 3-6s fall
    }
    else if (type === 'summer') {
        el.classList.add('sun-mote');
        const size = Math.random() * 4 + 2; // 2px-6px dots
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.animationDuration = `${Math.random() * 4 + 4}s`; // Slow float up
    }
    else if (type === 'rain') {
        el.classList.add('raindrop');

        // Vary the height: some drops are closer (longer), some further (shorter)
        const height = Math.random() * 15 + 15; // 15px to 30px
        el.style.height = `${height}px`;

        // Vary the width slightly for depth
        el.style.width = Math.random() > 0.5 ? '2px' : '1px';

        // Adjust fall speed: Taller drops (closer) fall faster
        // Range: 0.8s (fast) to 1.3s (slightly slower)
        const speed = Math.random() * 0.5 + 0.8;
        el.style.animationDuration = `${speed}s`;

        // Random slight transparency variation
        el.style.opacity = Math.random() * 0.3 + 0.6; // 0.6 to 0.9 opacity
    }
    else if (type === 'autumn') {
        el.classList.add('autumn-leaf');
        const shapes = ['🍁', '🍂'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        el.innerHTML = randomShape;
        el.style.fontSize = `${Math.random() * 10 + 10}px`;

        // Random Autumn Colors (Orange, Brown, Red, Gold)
        const colors = ['#eab308', '#f97316', '#ef4444', '#854d0e'];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];

        el.style.animationDuration = `${Math.random() * 4 + 4}s`; // 4-8s sway
    }

    container.appendChild(el);

    // Cleanup particles after they finish
    setTimeout(() => {
        el.remove();
    }, 8000);
}