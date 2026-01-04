/* =========================================
   1. GLOBAL VARIABLES & CONFIG
   ========================================= */
let pdfDatabase = [];
let currentSemester = parseInt(localStorage.getItem('currentSemester')) || 2;
let currentCategory = 'all';
let isMaintenanceActive = false;
let currentUserUID = null;
let searchTimeout;
let adDatabase = {};
let isModalHistoryPushed = false;
let db; // Defined globally, initialized later

// GAS
const GAS_URL = "https://script.google.com/macros/s/AKfycbzQD--G7aJpKSCW5b72PpMC_F7ZT8-7jwYTiwsJ339oFgusflxGLvb1Ge9WlBqcIB7j/exec"
// DOM Elements
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

/* =========================================
   2. INITIALIZATION (OPTIMIZED)
   ========================================= */
document.addEventListener('DOMContentLoaded', async function () {
    // 1. Wait for Firebase to load (deferred scripts)
    if (typeof firebase === 'undefined') {
        await new Promise(resolve => {
            const check = setInterval(() => {
                if (typeof firebase !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
        });
    }

    document.getElementById("errorTime").innerText = new Date().toISOString();

    // 2. Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    // 3. Start non-blocking tasks
    initAuth();
    initTheme();
    initSeasonalHeader();
    updateSemesterTab();
    initMaintenanceListener();
    initPrankEasterEgg();
    initNewYearCountdown();
    initMarquee();
    setTimeout(checkEmailCapture, 15000);

    // 4. Check Holiday (Synchronous check)
    const isHoliday = checkHolidayMode();
    if (isHoliday) {
        hidePreloader();
        return; // Stop loading data if holiday mode is full screen
    }

    // 5. Parallel Data Loading (The Performance Fix)
    try {
        await Promise.all([
            loadSponsoredAds(),
            loadPDFDatabase()
        ]);
    } catch (e) {
        console.error("Data load error:", e);
        // Ensure preloader hides even on error
        hidePreloader();
    }

    // 6. Setup Interactions
    setupEventListeners();
    checkAlomolePromoState();

    // 7. Handle Deep Links
    const urlParams = new URLSearchParams(window.location.search);
    const pdfId = urlParams.get('pdf');
    if (pdfId) {
        // Wait a tick to ensure data is ready
        setTimeout(() => {
            const pdf = pdfDatabase.find(p => p.id == pdfId);
            if (pdf) {
                currentSemester = pdf.semester;
                localStorage.setItem('currentSemester', currentSemester);
                updateSemesterTab();
                viewPDF(pdf, false);
            }
        }, 100);
    }
});

/* =========================================
   3. AUTH & ANALYTICS
   ========================================= */
function initAuth() {
    // Check if someone is ALREADY logged in (Student or Guest)
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // A user is present! It might be a logged-in Student or an existing Guest.
            // DO NOT overwrite their session. Just update analytics.
            currentUserUID = user.uid;
            updateUserMetadata();
        } else {
            // No one is logged in. NOW we create a new Anonymous Guest session.
            firebase.auth().signInAnonymously()
                .then((userCredential) => {
                    currentUserUID = userCredential.user.uid;
                    updateUserMetadata();
                })
                .catch((error) => {
                    console.error("Auth Error:", error);
                });
        }
    });
}

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

/* =========================================
   4. UI HELPERS & ADS
   ========================================= */
function handleGoToTopVisibility() {
    if (window.scrollY > 400) {
        goToTopBtn.classList.add('show');
    } else {
        goToTopBtn.classList.remove('show');
    }
}

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

        // Note: Grid ads are rendered by renderPDFs()
    } catch (error) {
        console.error("Error loading ads (blocker?):", error);
        // Non-critical, continue
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

function getAdData(slotName) {
    if (adDatabase[slotName] && adDatabase[slotName].active) {
        return adDatabase[slotName];
    }
    if (adDatabase['slot_grid'] && adDatabase['slot_grid'].active) {
        return adDatabase['slot_grid'];
    }
    const firstKey = Object.keys(adDatabase).find(k => adDatabase[k].active && k.includes('grid'));
    if (firstKey) return adDatabase[firstKey];
    return null;
}

/* =========================================
   5. DATA LOADING WITH CACHING
   ========================================= */
async function loadPDFDatabase() {
    if (isMaintenanceActive) return;

    const CACHE_KEY = 'classnotes_db_cache';

    try {
        // 1. Get the local cache
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        let shouldUseCache = false;
        let cachedData = [];

        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            cachedData = cached.data;

            // 2. ASK FIREBASE: "What is the newest PDF ID?" (Costs only 1 Read)
            // We order by uploadDate desc and take only the first one
            const latestSnapshot = await db.collection('pdfs')
                .orderBy('uploadDate', 'desc')
                .limit(1)
                .get();

            if (!latestSnapshot.empty) {
                const serverLatestId = latestSnapshot.docs[0].id;
                // Check if our cached data exists and has the same top ID
                const localLatestId = cachedData.length > 0 ? cachedData[0].id : null;

                if (serverLatestId === localLatestId) {
                    // console.log("Cache is valid (Matches Server) ⚡"); // UNCOMMENT DURING TESTING (IF REQUIRED)
                    shouldUseCache = true;
                } else {
                    // console.log("Cache is stale (New content detected) 🔄"); // UNCOMMENT DURING TESTING (IF REQUIRED)
                    shouldUseCache = false;
                }
            } else {
                // Server is empty, but we might have cache. Trust server (empty).
                shouldUseCache = false;
            }
        }

        // 3. EXECUTE: Use Cache OR Fetch New
        if (shouldUseCache) {
            pdfDatabase = cachedData;
            renderPDFs();
            hidePreloader();
            return;
        }

        // --- FETCH FRESH DATA (Only runs if cache is missing or stale) ---
        // console.log("Fetching fresh list from Firebase 🔥"); // UNCOMMENT DURING TESTING (IF REQUIRED)
        const pdfsRef = db.collection('pdfs');
        const snapshot = await pdfsRef.orderBy('uploadDate', 'desc').get();

        pdfDatabase = [];
        snapshot.forEach(doc => {
            pdfDatabase.push({ id: doc.id, ...doc.data() });
        });

        // Update Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: new Date().getTime(),
            data: pdfDatabase
        }));

        renderPDFs();
        hidePreloader();

    } catch (error) {
        console.error('Error loading PDFs:', error);

        // Fallback: If internet is dead, show whatever cache we have
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            pdfDatabase = cached.data;
            renderPDFs();
            showToast("Offline: Showing cached notes", "error");
        } else if (error.code === 'permission-denied') {
            activateMaintenanceMode();
        }
        hidePreloader();
    }
}

function hidePreloader() {
    if (preloader) {
        preloader.classList.add('hidden');
    }
}

/* =========================================
   6. MAINTENANCE & HOLIDAYS
   ========================================= */
function initMaintenanceListener() {
    db.collection('controll').doc('classNotes')
        .onSnapshot((doc) => {
            let isDown = false;
            if (doc.exists) isDown = doc.data().isMaintenance === true;
            if (isDown) activateMaintenanceMode();
            else deactivateMaintenanceMode();
        }, (error) => {
            console.error("Connection failed:", error);
            // activateMaintenanceMode(); // Optional: Don't force maintenance on weak net
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
        // Reload if coming back from maintenance
        loadPDFDatabase();
    }
}

function checkHolidayMode() {
    const today = new Date();
    const month = today.getMonth(); // 0 = Jan, 11 = Dec
    const date = today.getDate();

    const overlay = document.getElementById('holidayOverlay');
    const title = document.getElementById('holidayTitle');
    const msg = document.getElementById('holidayMessage');
    const sub = document.getElementById('holidaySubMessage');
    const icon = document.getElementById('holidayIcon');

    if (!overlay) return false;

    overlay.className = 'holiday-overlay hidden';

    if ((month === 0 && date === 26) || (month === 7 && date === 15)) {
        overlay.classList.add('tricolor');
        icon.innerText = "🇮🇳";
        title.innerText = month === 0 ? "Happy Republic Day" : "Happy Independence Day";
        msg.innerHTML = "Celebrating the spirit of unity and freedom.";
        sub.innerHTML = "Note: Our bonds are stronger than Covalent ones today! ⚛️";
        activateHoliday(overlay);
        return true;
    }
    if (month === 2 && date === 14) { // Holi approx
        overlay.classList.add('holi');
        icon.innerText = "🎨";
        title.innerText = "Happy Holi!";
        msg.innerHTML = "May your life be as vibrant and colorful as the spectrum.";
        activateHoliday(overlay);
        return true;
    }
    if (month === 9 && date === 20) { // Diwali approx
        overlay.classList.add('diwali');
        icon.innerText = "🪔";
        title.innerText = "Happy Diwali";
        msg.innerHTML = "Wishing you a festival full of light, warmth, and prosperity.";
        activateHoliday(overlay);
        return true;
    }
    if (month === 11 && date === 25) {
        overlay.classList.add('christmas');
        icon.innerText = "🎄";
        title.innerText = "Merry Christmas";
        activateHoliday(overlay);
        return true;
    }
    if ((month === 11 && date === 31)) {
        // if ((month === 11 && date === 31) || (month === 0 && date === 1)) {
        overlay.classList.add('new-year');
        icon.innerText = "🥂";
        title.innerText = "Happy New Year!";
        activateHoliday(overlay);
        return true;
    }
    return false;
}

function activateHoliday(overlay) {
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

/* =========================================
   7. EVENT LISTENERS
   ========================================= */
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

    window.addEventListener('popstate', function (event) {
        if (pdfModal.classList.contains('active')) {
            _closeModalInternal();
        }
    });

    // Passive listeners for performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    if (goToTopBtn) {
        window.addEventListener('scroll', handleGoToTopVisibility, { passive: true });
        goToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Sidebar
    if (openCommentsBtn && commentSidebar) {
        openCommentsBtn.addEventListener("click", () => commentSidebar.classList.add("active"));
    }
    if (closeCommentsBtn && commentSidebar) {
        closeCommentsBtn.addEventListener("click", () => commentSidebar.classList.remove("active"));
    }
    document.getElementById('reportBtn').addEventListener('click', reportCurrentPDF);
}

function reportCurrentPDF() {
    if (!pdfModal.dataset.currentPdf) return;
    const pdf = JSON.parse(pdfModal.dataset.currentPdf);

    const issue = prompt(`Describe the issue with "${pdf.title}":\n(e.g., Broken link, Wrong semester)`);
    if (!issue) return;

    showToast("Sending report...", "info");

    fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
            action: 'report',
            pdfId: pdf.id,
            title: pdf.title,
            issue: issue
        })
    }).then(() => showToast("Report sent! We'll check it."))
        .catch(() => showToast("Connection failed", "error"));
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

/* =========================================
   8. PDF LOGIC
   ========================================= */
function getEmbeddableUrl(url) {
    if (!url) return '';
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

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

        // NEW: Log the failure to Google Sheets
        // We use a timeout to ensure we don't log while they are still typing "Org... Organ... Organic"
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (searchTerm.length > 3) {
                fetch(GAS_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({
                        action: 'log_search',
                        term: searchTerm,
                        device: navigator.userAgent
                    })
                });
                // console.log("Logged missing content:", searchTerm); // UNCOMMENT DURING TESTING (IF REQUIRED)
            }
        }, 2000); // Wait 2 seconds after typing stops

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
            const adData = getAdData(`slot_grid_${adCounter}`);
            if (adData) {
                gridHTML += createAdHTML(adData);
            } else {
                gridHTML += createFallbackHTML();
            }
            adCounter++;
        }
    });

    if (filteredPdfs.length < AD_FREQUENCY && filteredPdfs.length > 0) {
        const adData = getAdData('slot_grid_1');
        if (adData) {
            gridHTML += createAdHTML(adData);
        } else {
            gridHTML += createFallbackHTML();
        }
    }

    pdfGrid.innerHTML = gridHTML;
}

function createPDFCard(pdf, favoritesList) {
    const favorites = favoritesList || getFavorites();
    const isFav = favorites.includes(pdf.id);
    const heartIconClass = isFav ? 'fas' : 'far';
    const btnActiveClass = isFav ? 'active' : '';

    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days in milliseconds

    const newBadgeHTML = isNew
        ? `<span style="background:var(--error-color); color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle;">NEW</span>`
        : '';

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
                <div class="pdf-info"><h3>${highlightText(pdf.title)} ${newBadgeHTML}</h3></div>
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

function _closeModalInternal() {
    pdfModal.classList.remove('active');
    pdfViewer.src = '';
    document.body.style.overflow = 'auto';
    isModalHistoryPushed = false;
}

function closePDFModal() {
    if (isModalHistoryPushed) {
        window.history.back();
    } else {
        const url = new URL(window.location);
        url.searchParams.delete('pdf');
        window.history.replaceState({}, document.title, url);
        _closeModalInternal();
    }
}

// SHARE PDF
function inferLabelFromTitle(title) {
    const t = title.toLowerCase();

    if (t.includes("syllabus")) return "syllabus";
    if (t.includes("holiday")) return "holiday list";
    if (t.includes("time table") || t.includes("timetable")) return "timetable";
    if (t.includes("exam") || t.includes("question") || t.includes("QB") || t.includes("PYQ")) return "question paper";
    if (t.includes("QB") || t.includes("question bank")) return "question bank";
    if (t.includes("assignment")) return "assignment";

    return "notes";
}

function isWeakTitle(title) {
    const t = title.toLowerCase().trim();

    // single-word or role-based titles
    if (t.split(" ").length <= 1) return true;

    // teacher-name patterns
    if (t.includes("sir") || t.includes("ma'am") || t.includes("mam"))
        return true;

    return false;
}

function buildShareText(title, label) {
    if (isWeakTitle(title)) {
        return `Check out these ${label} on ClassNotes`;
    }

    return `Check out these ${label}: ${title} on ClassNotes`;
}

function sharePDF(pdfId) {
    let pdf;

    if (typeof pdfId === 'string') {
        pdf = pdfDatabase.find(p => p.id === pdfId);
    } else if (pdfModal.dataset.currentPdf) {
        try {
            pdf = JSON.parse(pdfModal.dataset.currentPdf);
        } catch (e) { }
    }

    if (!pdf) return;

    const shareUrl = `https://notes.alokdasofficial.in/?pdf=${pdf.id}`;
    const label = inferLabelFromTitle(pdf.title);
    const text = buildShareText(pdf.title, label);

    const shareData = {
        title: `ClassNotes · ${pdf.title}`,
        text,
        url: shareUrl
    };

    if (navigator.share) {
        navigator.share(shareData).catch(err =>
            console.log('Error sharing:', err)
        );
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

const START_YEAR = 2025;
const CURRENT_YEAR = new Date().getFullYear();
const copyrightElement = document.getElementById('copyright-year');
if (copyrightElement) {
    let yearText = `© ${START_YEAR}`;
    if (CURRENT_YEAR > START_YEAR) yearText += ` - ${CURRENT_YEAR.toString().slice(-2)}`;
    yearText += ` ClassNotes. All rights reserved.`;
    copyrightElement.innerHTML = yearText;
}

/* =========================================
   9. COMMENTS
   ========================================= */
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
        // --- NOTIFICATION ---
        fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'notify_comment',
                pdfTitle: pdf.title,
                pdfId: pdf.id,
                text: text,
                author: author
            })
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

/* =========================================
   10. EXTRAS (THEME, FAVORITES, EASTER EGGS)
   ========================================= */
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

function initSeasonalHeader() {
    const month = new Date().getMonth();
    const header = document.querySelector('.header');

    if (!header) return;

    let particleType = null;
    let density = 400;

    if (month === 11 || month === 0 || month === 1) {
        particleType = 'snow';
    }
    else if (month >= 2 && month <= 5) {
        particleType = 'summer';
        density = 600;
    }
    else if (month >= 6 && month <= 8) {
        particleType = 'rain';
        density = 80;
    }
    else if (month >= 9 && month <= 10) {
        particleType = 'autumn';
        density = 500;
    }

    if (!particleType) return;

    setInterval(() => {
        spawnSeasonParticle(header, particleType);
    }, density);
}

function spawnSeasonParticle(container, type) {
    const el = document.createElement('div');
    el.classList.add('season-particle');

    const leftPos = Math.random() * 100;
    el.style.left = `${leftPos}%`;

    if (type === 'snow') {
        el.classList.add('snowflake');
        el.innerHTML = '❄';
        const size = Math.random() * 10 + 10;
        el.style.fontSize = `${size}px`;
        el.style.animationDuration = `${Math.random() * 3 + 3}s`;
    }
    else if (type === 'summer') {
        el.classList.add('sun-mote');
        const size = Math.random() * 4 + 2;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.animationDuration = `${Math.random() * 4 + 4}s`;
    }
    else if (type === 'rain') {
        el.classList.add('raindrop');
        const shapes = ['💧'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        el.innerHTML = randomShape;
        el.style.fontSize = `${Math.random() * 10 + 10}px`;
        const colors = ['#eab308', '#f97316', '#ef4444', '#854d0e'];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = `${Math.random() * .5 + 4}s`;
        const height = Math.random() * 15 + 15;
        el.style.height = `${height}px`;
        el.style.width = Math.random() > 0.5 ? '2px' : '1px';
        el.style.opacity = Math.random() * 0.3 + 0.6;
    }
    else if (type === 'autumn') {
        el.classList.add('autumn-leaf');
        const shapes = ['🍁', '🍂'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        el.innerHTML = randomShape;
        el.style.fontSize = `${Math.random() * 10 + 10}px`;
        const colors = ['#eab308', '#f97316', '#ef4444', '#854d0e'];
        el.style.color = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = `${Math.random() * 4 + 4}s`;
    }

    container.appendChild(el);

    setTimeout(() => {
        el.remove();
    }, 8000);
}

function initPrankEasterEgg() {
    const logo = document.querySelector('.logo');
    const overlay = document.getElementById('prankOverlay');
    const textEl = document.getElementById('prankText');
    const barEl = document.getElementById('prankProgress');
    const closeBtn = document.getElementById('closePrankBtn');

    if (!logo || !overlay) return;

    let clickCount = 0;
    let clickTimer;

    logo.style.cursor = "pointer";
    logo.title = "Do not click 5 times...";

    logo.addEventListener('click', (e) => {
        if (clickCount > 0) e.preventDefault();

        clickCount++;

        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 800);

        if (clickCount === 5) {
            e.preventDefault();
            triggerPrank(overlay, textEl, barEl, closeBtn);
            clickCount = 0;
        }
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
            textEl.innerText = "> INITIALIZING...";
            barEl.style.width = "0%";
            closeBtn.classList.add('hidden');
        }, 500);
    });
}

function triggerPrank(overlay, textEl, barEl, closeBtn) {
    overlay.classList.add('active');

    const steps = [
        { text: "> CONNECTING TO UNIVERSITY SERVER...", progress: 10, delay: 0 },
        { text: "> BYPASSING FIREWALL...", progress: 30, delay: 1000 },
        { text: "> ACCESSING 'EXAM_PAPERS.PDF'...", progress: 60, delay: 2000 },
        { text: "> DOWNLOADING ANSWERS...", progress: 85, delay: 3500 },
        { text: "> DECRYPTING...", progress: 99, delay: 5000 },
        // { text: "❌ ERROR: SHORTCUT NOT FOUND.<br>System requires 'HARD WORK' to proceed.<br>Nice try B!TC#! 😂", progress: 0, delay: 6500, isFinal: true }
        { text: "Nice try B!TC#! 😂", progress: 0, delay: 6500, isFinal: true }
    ];

    steps.forEach(step => {
        setTimeout(() => {
            if (step.isFinal) {
                textEl.innerHTML = step.text;
                textEl.style.color = "#ff4444";
                textEl.style.textShadow = "0 0 5px #ff4444";
                barEl.parentElement.style.display = "none";
                closeBtn.classList.remove('hidden');
            } else {
                textEl.innerText = step.text;
                textEl.style.color = "#0f0";
                barEl.parentElement.style.display = "block";
                barEl.style.width = step.progress + "%";
            }
        }, step.delay);
    });
}

/* =========================================
   NEW YEAR COUNTDOWN
   ========================================= */
function initNewYearCountdown() {
    // 1. Target the Overlay Elements
    const timerContainer = document.getElementById('overlayTimer');
    const dEl = document.getElementById('otDays');
    const hEl = document.getElementById('otHours');
    const mEl = document.getElementById('otMins');
    const sEl = document.getElementById('otSecs');
    const title = document.getElementById('holidayTitle');
    const msg = document.getElementById('holidayMessage');
    const sub = document.getElementById('holidaySubMessage');

    if (!timerContainer) return;

    // 2. Determine Next Year
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const newYearDate = new Date(`January 1, ${nextYear} 00:00:00`).getTime();

    // 3. Check if we should show the countdown (Is it Dec 31?)
    const today = new Date();
    if (today.getMonth() === 11 && today.getDate() === 31) {
        // Unhide the timer inside the overlay
        timerContainer.classList.remove('hidden');
        if (sub) sub.style.display = 'none'; // Hide chemistry note to make space
        if (msg) msg.innerText = "Counting down to a fresh start...";
    } else {
        // If it's not Dec 31, don't run the timer logic (save battery)
        return;
    }

    // 4. Start the Interval
    function updateTimer() {
        const now = new Date().getTime();
        const gap = newYearDate - now;

        // HAPPY NEW YEAR MOMENT
        if (gap <= 0) {
            clearInterval(timerInterval);

            // Update Text
            title.innerText = `HAPPY NEW YEAR ${nextYear}!`;
            title.style.fontSize = "3.5rem";
            title.style.color = "#ffd700";
            msg.innerText = "Welcome to a year of new reactions & strong bonds!";

            // Hide Timer
            timerContainer.style.display = 'none';

            // Show "Enter Site" button so they aren't stuck
            const closeBtn = document.getElementById('closeHolidayBtn');
            if (closeBtn) {
                closeBtn.classList.remove('hidden');
                closeBtn.onclick = () => {
                    document.getElementById('holidayOverlay').classList.add('hidden');
                    document.body.style.overflow = 'auto';
                };
            }
            return;
        }

        // Math
        const d = Math.floor(gap / (1000 * 60 * 60 * 24));
        const h = Math.floor((gap % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((gap % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((gap % (1000 * 60)) / 1000);

        // Update UI
        if (dEl) dEl.innerText = d < 10 ? '0' + d : d;
        if (hEl) hEl.innerText = h < 10 ? '0' + h : h;
        if (mEl) mEl.innerText = m < 10 ? '0' + m : m;
        if (sEl) sEl.innerText = s < 10 ? '0' + s : s;
    }

    updateTimer(); // Run once immediately
    const timerInterval = setInterval(updateTimer, 1000);
}


/* =========================================
   11. ROBUST FEATURES (GAS INTEGRATION)
   ========================================= */

// --- 1. Marquee Logic ---
function initMarquee() {
    fetch(GAS_URL) // This triggers doGet()
        .then(res => res.json())
        .then(data => {
            if (data.isActive) {
                const bar = document.getElementById('announcementBar');
                const text = document.getElementById('announcementText');

                if (data.color) bar.style.backgroundColor = data.color;

                if (data.link && data.link !== '#') {
                    text.innerHTML = `<a href="${data.link}">${data.message}</a>`;
                } else {
                    text.textContent = data.message;
                }

                bar.classList.remove('hidden');

                // Handle Close
                document.getElementById('closeAnnouncement').addEventListener('click', () => {
                    bar.classList.add('hidden');
                    sessionStorage.setItem('marqueeDismissed', 'true');
                });
            }
        })
        .catch(e => console.log("Marquee skipped (offline/error)"));
}

// --- 2. Email Capture Logic ---
function checkEmailCapture() {
    const MODAL_KEY = 'emailModalSeenAt';
    const COOLDOWN_DAYS = 7;

    const lastSeen = localStorage.getItem(MODAL_KEY);
    if (lastSeen) {
        const daysPassed =
            (Date.now() - parseInt(lastSeen, 10)) / (1000 * 60 * 60 * 24);
        if (daysPassed < COOLDOWN_DAYS) return;
    }

    const modal = document.getElementById('emailModal');
    if (!modal) return;

    // Gentle delay (UX courtesy)
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 1200);

    const closeModal = () => {
        modal.classList.add('hidden');
        localStorage.setItem(MODAL_KEY, Date.now().toString());
    };

    // Close button
    const closeBtn = document.getElementById('closeEmailModal');
    closeBtn.onclick = closeModal;

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Form submit
    const form = document.getElementById('emailCaptureForm');
    const input = document.getElementById('captureEmailInput');
    const button = form.querySelector('button');

    form.onsubmit = async (e) => {
        e.preventDefault();

        if (!input.checkValidity()) {
            input.focus();
            return;
        }

        const email = input.value.trim();
        button.disabled = true;
        button.innerText = "Subscribing…";

        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify({
                    action: 'capture_email',
                    email
                })
            });

            showToast("You're subscribed 🎉");
            closeModal();
        } catch (err) {
            showToast("Something went wrong. Try again.", "error");
            button.disabled = false;
            button.innerText = "Notify Me";
        }
    };
}
