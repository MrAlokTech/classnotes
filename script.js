/* =========================================
   1. GLOBAL VARIABLES & CONFIG
   ========================================= */
let pdfDatabase = [];
let currentClass = localStorage.getItem('currentClass') || 'MSc Chemistry';
let availableClasses = [];
let currentSemester = parseInt(localStorage.getItem('currentSemester')) || 1;
let currentCategory = 'all';
let isMaintenanceActive = false;
let currentUserUID = null;
let searchTimeout;
let adDatabase = {};
let isModalHistoryPushed = false;
let db; // Defined globally, initialized later

let isGlobalMaintenance = false;
let isUserVerified = false;
let authCheckComplete = false;

// GAS
const GAS_URL = "https://script.google.com/macros/s/AKfycby2lW5QdidC7o_JX0jlXa59uAjmmpFzOx-rye0N1x0r6hoYu-1CB65YrM1wPr7h-tZu/exec"
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
const classSelect = document.getElementById('classSelect');
const categoryIcons = {
    'Organic': 'fa-flask',
    'Inorganic': 'fa-atom',
    'Physical': 'fa-calculator',
    'Physics': 'fa-infinity',
    'Math': 'fa-square-root-alt',
    'Biology': 'fa-dna',
    'History': 'fa-landmark',
    'General': 'fa-globe',
    'Syllabus': 'fa-list-alt'
};

function renderCategoryFilters() {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    // 1. Get unique categories for the CURRENT Class
    const classPdfs = pdfDatabase.filter(pdf => pdf.class === currentClass);
    let uniqueCategories = [...new Set(classPdfs.map(pdf => pdf.category))].sort();

    // Default: Always show 'All' and 'Favorites'
    let html = `
        <button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" 
                onclick="setCategory('all')">
            <i class="fas fa-th"></i> All
        </button>
        <button class="filter-btn ${currentCategory === 'favorites' ? 'active' : ''}" 
                onclick="setCategory('favorites')">
            <i class="fas fa-heart"></i>
        </button>
    `;

    // 2. Generate buttons for each category
    uniqueCategories.forEach(cat => {
        const icon = categoryIcons[cat] || 'fa-tag'; // Default icon if unknown
        html += `
            <button class="filter-btn ${currentCategory === cat ? 'active' : ''}" 
                    onclick="setCategory('${cat}')">
                <i class="fas ${icon}"></i> ${cat}
            </button>
        `;
    });

    container.innerHTML = html;
}

// Helper to switch categories
window.setCategory = function (cat) {
    currentCategory = cat;
    // Update active visual state manually for instant feedback
    document.querySelectorAll('#categoryFilters .filter-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    renderPDFs();
};
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

    const errorTimeEl = document.getElementById("errorTime");
    if (errorTimeEl) {
        errorTimeEl.innerText = new Date().toISOString();
    }

    // 2. Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();

    // 3. Start non-blocking tasks
    const authPromise = initAuth();
    initTheme();
    initSeasonalHeader();
    initAccountWidget();
    initDailyCatalyst();
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

    // Wait for auth to resolve before parallel loading
    await authPromise;

    // 5. Parallel Data Loading (The Performance Fix)
    try {
        await Promise.all([
            // loadSponsoredAds(),
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
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUserUID = user.uid;
                updateUserMetadata();

                if (!user.isAnonymous) {
                    db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists && doc.data().isVerified === true) {
                            isUserVerified = true;
                        } else {
                            isUserVerified = false;
                        }
                        authCheckComplete = true;
                        reevaluateMaintenance();
                        resolve(isUserVerified);
                    }).catch(() => {
                        isUserVerified = false;
                        authCheckComplete = true;
                        reevaluateMaintenance();
                        resolve(false);
                    });
                } else {
                    isUserVerified = false;
                    authCheckComplete = true;
                    reevaluateMaintenance();
                    resolve(false);
                }
            } else {
                firebase.auth().signInAnonymously()
                    .then((userCredential) => {
                        currentUserUID = userCredential.user.uid;
                        updateUserMetadata();
                        isUserVerified = false;
                        authCheckComplete = true;
                        reevaluateMaintenance();
                        resolve(false);
                    })
                    .catch((error) => {
                        console.error("Auth Error:", error);
                        isUserVerified = false;
                        authCheckComplete = true;
                        reevaluateMaintenance();
                        resolve(false);
                    });
            }
        });
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
function renderSemesterTabs() {
    const container = document.getElementById('semesterTabsContainer');
    if (!container) return;

    // 1. Find all unique semesters for the CURRENT class
    // We filter notes by class, then map to semester, then get unique values
    const classPdfs = pdfDatabase.filter(pdf => pdf.class === currentClass);
    const uniqueSemesters = [...new Set(classPdfs.map(pdf => pdf.semester))].sort((a, b) => a - b);

    // Default fallback: If no data exists yet (fresh class), show Semesters 1-2
    if (uniqueSemesters.length === 0) {
        uniqueSemesters.push(1, 2);
    }

    // 2. Safety Check: If currentSemester isn't in the new list, switch to the first one
    if (!uniqueSemesters.includes(currentSemester)) {
        currentSemester = uniqueSemesters[0];
        localStorage.setItem('currentSemester', currentSemester);
    }

    // 3. Generate HTML
    container.innerHTML = uniqueSemesters.map(sem => `
        <button class="tab-btn ${sem === currentSemester ? 'active' : ''}" 
                onclick="changeSemester(${sem})">
            <span class="tab-number">${sem}</span>
            <span class="tab-label">Semester</span>
        </button>
    `).join('');
}

// Helper function to handle clicks (replaces your old event listeners)
window.changeSemester = function (sem) {
    currentSemester = sem;
    localStorage.setItem('currentSemester', currentSemester);

    // Update visual active state
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // Check if the button's number matches the new semester
        if (parseInt(btn.querySelector('.tab-number').textContent) === sem) {
            btn.classList.add('active');
        }
    });

    renderPDFs();
};

async function syncClassSwitcher() {
    const classSelect = document.getElementById('classSelect');
    if (!classSelect) return;

    // 1. Extract unique classes
    const uniqueClasses = [...new Set(pdfDatabase.map(pdf => pdf.class).filter(Boolean))].sort();

    // 2. Populate Dropdown
    if (uniqueClasses.length > 0) {
        classSelect.innerHTML = uniqueClasses.map(cls =>
            `<option value="${cls}" ${cls === currentClass ? 'selected' : ''}>${cls}</option>`
        ).join('');

        // 3. Safety Check: If currentClass is invalid, switch to the first available one
        if (!uniqueClasses.includes(currentClass)) {
            currentClass = uniqueClasses[0];
            localStorage.setItem('currentClass', currentClass);
            classSelect.value = currentClass; // visual update
            renderSemesterTabs();
            renderCategoryFilters();
            renderPDFs(); // re-render grid
        }
    } else {
        classSelect.innerHTML = '<option disabled>No classes found</option>';
    }

    // 4. Listener is already attached in setupEventListeners, but we ensure value is consistent
    classSelect.value = currentClass;
    renderSemesterTabs();
}

async function loadPDFDatabase() {
    if (isMaintenanceActive) return;

    showSkeletons();
    const CACHE_KEY = 'classnotes_db_cache';

    try {
        const cachedRaw = localStorage.getItem(CACHE_KEY);
        let shouldUseCache = false;
        let cachedData = [];

        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            cachedData = cached.data;
            const latestSnapshot = await db.collection('pdfs')
                .orderBy('uploadDate', 'desc')
                .limit(1)
                .get();

            if (!latestSnapshot.empty) {
                const serverLatestId = latestSnapshot.docs[0].id;
                const localLatestId = cachedData.length > 0 ? cachedData[0].id : null;

                // CHECK 1: Is the content fresh?
                const isContentFresh = serverLatestId === localLatestId;

                // CHECK 2: Does the cache have the new 'class' schema?
                // We check if the first item has the 'class' property
                const hasNewSchema = cachedData.length > 0 && 'class' in cachedData[0];

                if (isContentFresh && hasNewSchema) {
                    shouldUseCache = true;
                }
            }
        }

        if (shouldUseCache) {
            pdfDatabase = cachedData;
            prepareSearchIndex();
            // --- FIX: CALL THIS TO POPULATE UI ---
            syncClassSwitcher();
            renderSemesterTabs();
            renderCategoryFilters();
            renderPDFs();
            hidePreloader();
            return;
        }

        // Fetch Fresh
        const pdfsRef = db.collection('pdfs');
        const snapshot = await pdfsRef.orderBy('uploadDate', 'desc').get();

        pdfDatabase = [];
        snapshot.forEach(doc => {
            pdfDatabase.push({ id: doc.id, ...doc.data() });
        });

        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: new Date().getTime(),
            data: pdfDatabase
        }));

        prepareSearchIndex();

        // --- FIX: CALL THIS TO POPULATE UI ---
        syncClassSwitcher();
        renderPDFs();
        hidePreloader();

    } catch (error) {
        console.error('Error loading PDFs:', error);
        hidePreloader();
    }
}

function prepareSearchIndex() {
    pdfDatabase.forEach(pdf => {
        // Create a combined search string (optimization)
        // We join fields with spaces so "title" + "author" don't merge
        const searchStr = [
            pdf.title,
            pdf.description,
            pdf.category,
            pdf.author
        ].map(s => (s || "").toLowerCase()).join(" ");

        // Add as non-enumerable property so it doesn't get saved to localStorage
        Object.defineProperty(pdf, '_searchStr', {
            value: searchStr,
            enumerable: false,
            writable: true
        });
    });
}

function hidePreloader() {
    if (preloader) {
        preloader.classList.add('hidden');

        // Trigger the MNC-style reveal animation
        const content = document.getElementById('contentWrapper');
        if (content) {
            // Slight delay (300ms) to allow the preloader fade-out to look smoother
            setTimeout(() => {
                content.classList.add('active');
            }, 300);
        }
    }
}

/* =========================================
   6. MAINTENANCE & HOLIDAYS
   ========================================= */
function initMaintenanceListener() {
    db.collection('controll').doc('classNotes')
        .onSnapshot((doc) => {
            if (doc.exists) isGlobalMaintenance = doc.data().isMaintenance === true;
            reevaluateMaintenance();
        }, (error) => {
            console.error("Connection failed:", error);
        });
}

function reevaluateMaintenance() {
    if (!authCheckComplete) return; // Wait until auth state is resolved

    if (isGlobalMaintenance && !isUserVerified) {
        activateMaintenanceMode();
    } else {
        deactivateMaintenanceMode();
    }
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
    // TEST MODE
    // const today = new Date('2026-02-14');
    const month = today.getMonth(); // 0 = Jan, 11 = Dec
    const date = today.getDate();

    const overlay = document.getElementById('holidayOverlay');
    const title = document.getElementById('holidayTitle');
    const msg = document.getElementById('holidayMessage');
    const sub = document.getElementById('holidaySubMessage');
    const icon = document.getElementById('holidayIcon');

    if (!overlay) return false;

    overlay.className = 'holiday-overlay hidden';

    // --- FEBRUARY 14 LOGIC ---
    if (month === 1 && date === 14) {
        // 50% Chance logic
        const showFunny = Math.random() < 0.5;

        if (showFunny) {
            // === FUNNY: BAJRANG DAL MODE ===
            overlay.classList.add('valentines');
            icon.innerText = "🏏"; // Cricket Bat (representing Lathi)
            title.innerText = "Bajrang Dal Alert!";
            msg.innerHTML = "Couples detected! Initiating 'Matr-Pitru Pujan' protocols.";
            sub.innerHTML = "( Chemistry Note: Covalent bonds break, but Lathi charge is permanent! 🧡 )";
        } else {
            // === SERIOUS: BLACK DAY ===
            overlay.classList.add('black-day');
            icon.innerText = "🕯️"; // Candle
            title.innerText = "Black Day";
            msg.innerHTML = "Remembering the bravehearts of Pulwama (14 Feb 2019).";
            sub.innerHTML = "Real heroes don't wear capes, they wear camo. 🇮🇳";
        }

        activateHoliday(overlay);
        return true;
    }

    if ((month === 0 && date === 26) || (month === 7 && date === 15)) {
        overlay.classList.add('tricolor');
        icon.innerText = "🇮🇳";
        title.innerText = month === 0 ? "Happy Republic Day" : "Happy Independence Day";
        msg.innerHTML = "Celebrating the spirit of unity and freedom.";
        sub.innerHTML = "Note: Our bonds are stronger than Covalent ones today! ⚛️";
        activateHoliday(overlay);
        return true;
    }
    if ((month === 2 && date === 4) || (month === 2 && date === 3)) { // Holi approx
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

    // CLASS SELECTOR
    if (classSelect) {
        // Set initial value from storage
        classSelect.value = currentClass;

        classSelect.addEventListener('change', (e) => {
            currentClass = e.target.value;
            localStorage.setItem('currentClass', currentClass);

            // Reload database or filter for the new class
            showToast(`Switching to ${e.target.options[e.target.selectedIndex].text}`);
            loadPDFDatabase();
        });
    }
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

function showSkeletons() {
    const grid = document.getElementById('pdfGrid');
    const pdfCountEl = document.getElementById('pdfCount');
    const emptyState = document.getElementById('emptyState');

    if (!grid) return;

    // Hide empty state if visible
    if (emptyState) emptyState.style.display = 'none';

    // Set a temporary count text
    if (pdfCountEl) pdfCountEl.textContent = "...";

    // Create 6 dummy cards
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `
            <div class="skeleton-card">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-icon"></div>
                    <div class="skeleton-title-group">
                        <div class="skeleton skeleton-title"></div>
                        <div class="skeleton skeleton-tag"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-body"></div>
                <div class="skeleton-footer">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn"></div>
                </div>
            </div>
        `;
    }

    grid.style.display = 'grid';
    grid.innerHTML = skeletonHTML;
}

const escapeHtml = (text) => {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

function renderPDFs() {
    const searchTerm = searchInput.value.toLowerCase();
    const favorites = getFavorites();

    const rawSearchTerm = searchInput.value.trim();
    let highlightRegex = null;
    if (rawSearchTerm) {
        try {
            highlightRegex = new RegExp('(' + rawSearchTerm + ')', 'gi');
        } catch (e) {
            // Ignore invalid regex (e.g. user typing "(")
        }
    }

    if (searchTerm.length > 2) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            logInteraction('search', searchTerm);
        }, 2000);
    }

    // Locate renderPDFs() in script.js and update the filter section
    const filteredPdfs = pdfDatabase.filter(pdf => {
        const matchesSemester = pdf.semester === currentSemester;

        // NEW: Check if the PDF class matches the UI's current class selection
        // Note: If old documents don't have this field, they will be hidden.
        const matchesClass = pdf.class === currentClass;

        let matchesCategory = false;
        if (currentCategory === 'favorites') {
            matchesCategory = favorites.includes(pdf.id);
        } else {
            matchesCategory = currentCategory === 'all' || pdf.category === currentCategory;
        }

        // Use pre-computed search string (Optimization)
        const matchesSearch = (pdf._searchStr || "").includes(searchTerm);

        // Update return statement to include matchesClass
        return matchesSemester && matchesClass && matchesCategory && matchesSearch;
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
        gridHTML += createPDFCard(pdf, favorites, index, highlightRegex);

        // if ((index + 1) % AD_FREQUENCY === 0) {
        //     const adData = getAdData(`slot_grid_${adCounter}`);
        //     if (adData) {
        //         gridHTML += createAdHTML(adData);
        //     } else {
        //         gridHTML += createFallbackHTML();
        //     }
        //     adCounter++;
        // }
    });

    // if (filteredPdfs.length < AD_FREQUENCY && filteredPdfs.length > 0) {
    //     const adData = getAdData('slot_grid_1');
    //     if (adData) {
    //         gridHTML += createAdHTML(adData);
    //     } else {
    //         gridHTML += createFallbackHTML();
    //     }
    // }

    pdfGrid.innerHTML = gridHTML;
}

// UPDATE THE FUNCTION SIGNATURE to include "index = 0"
function createPDFCard(pdf, favoritesList, index = 0, highlightRegex = null) {
    const favorites = favoritesList || getFavorites();
    const isFav = favorites.includes(pdf.id);
    const heartIconClass = isFav ? 'fas' : 'far';
    const btnActiveClass = isFav ? 'active' : '';

    const uploadDateObj = new Date(pdf.uploadDate);
    const timeDiff = new Date() - uploadDateObj;
    const isNew = timeDiff < (7 * 24 * 60 * 60 * 1000); // 7 days

    const newBadgeHTML = isNew
        ? `<span style="background:var(--error-color); color:white; font-size:0.6rem; padding:2px 6px; border-radius:4px; margin-left:8px; vertical-align:middle;">NEW</span>`
        : '';

    const categoryIcons = {
        'Organic': 'fa-flask',
        'Inorganic': 'fa-atom',
        'Physical': 'fa-calculator',
        'Physics': 'fa-infinity' // Ensure Physics icon is mapped if used
    };
    const categoryIcon = categoryIcons[pdf.category] || 'fa-file-pdf';

    // Formatting Date
    const formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });

    // Uses global escapeHtml() now

    const highlightText = (text) => {
        const safeText = escapeHtml(text);
        if (!highlightRegex) return safeText;
        return safeText.replace(highlightRegex, '<span class="highlight">$1</span>');
    };

    const safePdfString = JSON.stringify(pdf).replace(/"/g, '&quot;');

    // --- NEW: Calculate Stagger Delay ---
    // Cap at 1s (20 items) so the list doesn't feel unresponsive
    const delay = Math.min(index * 0.05, 1);

    return `
        <div class="pdf-card" data-category="${pdf.category}" style="animation-delay: ${delay}s">
            <div class="pdf-header">
                <div class="pdf-icon"><i class="fas ${categoryIcon}"></i></div> <div class="pdf-info"><h3>${highlightText(pdf.title)} ${newBadgeHTML}</h3></div>
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
    // const adSlot = document.getElementById('ad-slot-modal');
    commentsList.innerHTML = '';
    // if (adSlot) commentsList.appendChild(adSlot);
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
    // Add Pop Animation
    const btn = event.currentTarget;
    btn.classList.add('popping');
    setTimeout(() => btn.classList.remove('popping'), 300); // Remove after animation


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

/* =========================================
   FRIENDLY FEATURES
   ========================================= */
function initDailyCatalyst() {
    // 1. Check if user dismissed it recently (Session storage resets on tab close)
    if (sessionStorage.getItem('catalystDismissed')) return;

    const catalyst = document.getElementById('dailyCatalyst');
    const titleEl = document.getElementById('greetingTitle');
    const quoteEl = document.getElementById('greetingQuote');
    const closeBtn = document.getElementById('closeCatalyst');

    if (!catalyst) return;

    // 2. Determine Time of Day
    const hour = new Date().getHours();
    let timeGreeting = "Hello!";
    if (hour < 12) timeGreeting = "Good Morning! ☀️";
    else if (hour < 18) timeGreeting = "Good Afternoon! 🌤️";
    else timeGreeting = "Good Evening! 🌙";

    // 3. Science & Chemistry Puns (Expanded to 100)
    const quotes = [
        "Remember: The mole is a unit, not a spy. 🕵️‍♂️",
        "Be like a proton—always positive! ⚛️",
        "Technically, alcohol is a solution. 🧪",
        "Don't trust atoms, they make up everything.",
        "Chemistry is like cooking, just don't lick the spoon.",
        "Organic Chemistry is difficult. Those who pass it have alkynes of trouble.",
        "Reviewing notes today? You're in your element!",
        "Double check your bonds before you break them.",
        "If you're not part of the solution, you're part of the precipitate. ⚗️",
        "Gold is the best element because it's Au-some! ✨",
        "The name's Bond. Ionic Bond. Taken, not shared. 🤝",
        "Keep your ion the prize! 👁️",
        "I told a chemistry joke, but there was no reaction. 😐",
        "Are you made of Copper and Tellurium? Because you're CuTe. 😉",
        "Why are chemists great for solving problems? They have all the solutions. 🧪",
        "Drop the base! (But handle acids with care). 🎧",
        "Stop overreacting! (Said the Noble Gas). 🛑",
        "If you can't helium or curium, you might as well barium. 🏥",
        "A neutron walks into a bar. 'For you, no charge.' 😐",
        "I lost an electron! Are you positive? ➕",
        "Schrödinger’s cat walks into a bar... and doesn't. 🐈",
        "What is a cation afraid of? A dogion. 🐶",
        "Why did the bear dissolve in water? It was polar. 🐻‍❄️",
        "Organic chemistry is just drawing hexagons. 🛑",
        "0K is literally the coolest temperature. 🥶",
        "Physics: It's all relative. 🎢",
        "Biology is the only science where multiplication is the same as division. 🦠",
        "Mitosis: It's a cell dividing. ➗",
        "I wish I was Adenine so I could get paired with U. 🧬",
        "Don't be negative, be like an electron... wait. ⚡",
        "Mitochondria: The powerhouse of the cell! 🔋",
        "What do you call a wheel made of iron? A Fe-rous wheel. 🎡",
        "Did you hear oxygen went on a date with potassium? It went OK. 👌",
        "Anyone know any jokes about sodium? Na. 🧂",
        "I would tell you a joke about noble gases, but all the good ones Argon. 🎈",
        "H2O is water and H2O2 is hydrogen peroxide. What is H2O4? Drinking. 🥤",
        "Why do chemists like nitrates so much? They're cheaper than day rates. 💰",
        "What did the scientist say when he found 2 isotopes of helium? HeHe. 😂",
        "A photon checks into a hotel. 'Luggage?' 'No, I'm traveling light.' 🧳",
        "What is the show cesium and iodine love watching together? CsI. 📺",
        "My chemistry teacher threw sodium chloride at me. That's a salt. 👮",
        "Silver walks up to Gold in a bar and says, 'Au, get out of here!' 👋",
        "Why did the physicist break up with the biologist? There was no chemistry. 💔",
        "I heard that Oxygen and Magnesium were going out and I was like OMg! 😱",
        "The glass is half full... of liquid and half full of gas. 🥛",
        "How often do I like jokes about elements? Periodically. 📅",
        "Why did the acid go to the gym? To become a buffer solution. 💪",
        "Old chemists never die, they just stop reacting. 💀",
        "What is the chemical formula for banana? BaNa2. 🍌",
        "Why did the germ cross the microscope? To get to the other slide. 🔬",
        "Gravity is a downer. 📉",
        "304 stainless steel: 'We don't serve your kind.' 'But I'm stainless!' 🤖",
        "What did the limestone say to the geologist? Don't take me for granite. 🪨",
        "Tectonics: It's not my fault! 🌍",
        "Geology rocks! 🤘",
        "Why does the hamburger have lower energy than the steak? Because it's in the ground state. 🍔",
        "What happens when electrons lose their energy? They get Bohr-ed. 🥱",
        "Why did Carbon marry Hydrogen? They bonded well. 💍",
        "Exothermic reactions are cool... wait, no they're hot. 🔥",
        "Endothermic reactions: cooler than being cool. 🧊",
        "Why are quantum physicists bad at love? When they find the position, they can't find the momentum. 🔭",
        "E=mc²: Energy = Milk × Coffee². ☕",
        "May the mass times acceleration be with you. 🚀",
        "A body at rest stays at rest... especially on Mondays. 😴",
        "What did the biologist wear to his first date? Designer genes. 👖",
        "The brain named itself. 🧠",
        "Without physics, sports would be just math. ⚽",
        "Why do plants hate math? Because it gives them square roots. 🌿",
        "Why did the mushroom go to the party? Because he was a fungi. 🍄",
        "Does a radioactive cat have 18 half-lives? ☢️",
        "Why was the mole of oxygen molecules excited? He got Avogadro's number! 📞",
        "Water molecules are like minions... small, numerous, and stick together. 🌊",
        "Did you hear about the man who was cooled to absolute zero? He's 0K now. 👍",
        "Why did the chemist coat his shoes with silicone rubber? To reduce his carbon footprint. 👣",
        "What did the thermometer say to the graduated cylinder? 'You may be graduated, but I've got many degrees.' 🎓",
        "Why did the chicken cross the Möbius strip? To get to the same side. 🐔",
        "Why did the containment vessel leave the nuclear plant? It had a fallout. ☢️",
        "Jokes about heavy elements? All the good ones are decaying. ⏳",
        "Iron Man is a female superhero. Fe = Iron, Male = Man. 🦸‍♀️",
        "Diamond: Just carbon that handled pressure well. 💎",
        "What do you call an acid with an attitude? A-mean-o acid. 😠",
        "Why do biologists look forward to the future? Because they cell-ebrate it. 🎉",
        "What did the stamen say to the pistil? I like your style. 🌸",
        "Why did the amoeba cross the road? It was time to split. 🦠",
        "Why are enzymes so popular? They're always the life of the party. 🥳",
        "Osmosis: Absorbing knowledge by sleeping on books. 📚",
        "Why did the cell go to therapy? It had separation anxiety. 🛋️",
        "Why did the gene go to the dentist? To fix its expression. 🦷",
        "Why did the virus go to the doctor? It felt a little host-ile. 🌡️",
        "Why did the skeleton go to the party alone? He had no body to go with. ☠️",
        "Why can't you trust a spinal cord? It's too nervous. 😬",
        "Why did the blood cell break up with the plasma? It just wasn't his type. 🩸",
        "Why did the neuron get sent to the principal? For having a bad impulse. ⚡",
        "What is a physicist's favorite food? Fission chips. 🍟",
        "Why is electricity so dangerous? It doesn't know how to conduct itself. 🔌",
        "Why did the magnet get arrested? For attracting the wrong crowd. 🧲",
        "Why did the circuit go to the doctor? It had a short. 🏥",
        "Why was the math book sad? It had too many problems. 📘",
        "Why did the two 4s skip lunch? They already 8. 🍽️",
        "Parallel lines have so much in common. It’s a shame they’ll never meet. 📏"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    // 4. Render
    titleEl.textContent = timeGreeting;
    quoteEl.textContent = randomQuote;
    catalyst.classList.remove('hidden');

    // 5. Close Handler
    closeBtn.addEventListener('click', () => {
        catalyst.style.opacity = '0';
        setTimeout(() => {
            catalyst.classList.add('hidden');
            sessionStorage.setItem('catalystDismissed', 'true');
        }, 300);
    });
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

/* =========================================
   ACCOUNT WIDGET (Main Site Header)
   ========================================= */
function initAccountWidget() {
    const guestBtn = document.getElementById('accountBtnGuest');
    const userBtn = document.getElementById('accountBtnUser');
    const dropdown = document.getElementById('accountDropdown');
    const initials = document.getElementById('accountInitials');
    const dropName = document.getElementById('dropdownName');
    const dropEmail = document.getElementById('dropdownEmail');
    const signOutBtn = document.getElementById('dropdownSignOut');

    if (!guestBtn) return; // Safety check

    // Toggle dropdown
    // Replace the toggle click handler in initAccountWidget()
    userBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        const isHidden = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');

        if (isHidden) {
            // Position it dynamically below the avatar button
            const rect = userBtn.getBoundingClientRect();
            dropdown.style.top = (rect.bottom + 8) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
        }
    });

    // Close on outside click
    document.addEventListener('click', () => {
        if (dropdown) dropdown.classList.add('hidden');
    });

    // Sign out
    signOutBtn.addEventListener('click', () => {
        firebase.auth().signOut().then(() => {
            dropdown.classList.add('hidden');
            showToast('Signed out successfully');
        });
    });

    firebase.auth().onAuthStateChanged(async (user) => {
        const isRealUser = user && !user.isAnonymous;

        if (isRealUser) {
            guestBtn.classList.add('hidden');
            userBtn.classList.remove('hidden');

            let displayName = user.displayName || user.email.split('@')[0];

            try {
                const doc = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get();

                if (doc.exists) {
                    const data = doc.data();

                    if (data.displayName) {
                        displayName = data.displayName;
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user profile:', err);
            }

            // Build initials
            const parts = displayName.trim().split(/\s+/);

            const abbr = parts.length >= 2
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : displayName.slice(0, 2).toUpperCase();

            initials.textContent = abbr;
            dropName.textContent = displayName;
            dropEmail.textContent = user.email || '';

        } else {
            guestBtn.classList.remove('hidden');
            userBtn.classList.add('hidden');
            dropdown.classList.add('hidden');
        }
    });
}

console.log('%c👋 Hello There!', 'font-size: 20px; color: #ffff00; font-weight: bold;');
console.log("Welcome to ClassNotes! 👋\nThis site is built by Alok Das, a student just like you. If you have any suggestions or want to contribute, check out the GitHub repo: https://github.com/MrAloktech/classnotes");
console.log("नमस्ते! क्लासनोट्स में आपका स्वागत है! 👋\nयह साइट अलोक दास द्वारा बनाई गई है, जो आपके जैसे एक छात्र हैं। यदि आपके पास कोई सुझाव है या आप योगदान देना चाहते हैं, तो GitHub रिपॉजिटरी देखें: https://github.com/MrAloktech/classnotes");
console.log("¡Hola! ¡Bienvenido a ClassNotes! 👋\nEste sitio fue creado por Alok Das, un estudiante como tú. Si tienes alguna sugerencia o quieres contribuir, visita el repositorio de GitHub: https://github.com/MrAloktech/classnotes");
console.log("Bonjour! Bienvenue sur ClassNotes! 👋\nCe site est créé par Alok Das, un étudiant comme vous. Si vous avez des suggestions ou souhaitez contribuer, consultez le dépôt GitHub : https://github.com/MrAloktech/classnotes");
console.log("Привет! Добро пожаловать в ClassNotes! 👋\nЭтот сайт создан Алоком Дасом, студентом, таким же, как и вы. Если у вас есть предложения или вы хотите внести свой вклад, посетите репозиторий GitHub: https://github.com/MrAloktech/classnotes");
console.log("你好！欢迎来到ClassNotes！👋\n这个网站由Alok Das创建，他和你一样是个学生。如果你有任何建议或想要贡献，请查看GitHub仓库：https://github.com/MrAloktech/classnotes");
console.log('%cFor more such cool projects like this, check out https://me.alokdasofficial.in ❤️', 'font-size: 16px; color: #ffaa00; font-weight: bold;');