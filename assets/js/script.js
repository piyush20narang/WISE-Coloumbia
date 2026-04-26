// Scroll reveal animation
function reveal() {
    var reveals = document.querySelectorAll(".reveal");
    for (var i = 0; i < reveals.length; i++) {
        var windowHeight = window.innerHeight;
        var elementTop = reveals[i].getBoundingClientRect().top;
        var elementVisible = 150;
        if (elementTop < windowHeight - elementVisible) {
            reveals[i].classList.add("active");
        }
    }
}

// Navbar scroll effect
function handleScroll() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    if (window.pageYOffset > 50) {
        nav.classList.add("scrolled");
    } else {
        nav.classList.remove("scrolled");
    }
    // Also run reveal on scroll
    reveal();
}

window.addEventListener("scroll", handleScroll);

// ============================================
// MOBILE MENU SYSTEM
// ============================================

const mobileToggle = document.querySelector('.mobile-toggle');
const navLinks = document.querySelector('.nav-links');
const mobileOverlay = document.querySelector('.mobile-overlay');

function openMenu() {
    navLinks.classList.add('open');
    mobileToggle.classList.add('active');
    document.body.classList.add('menu-open');
    if (mobileOverlay) {
        mobileOverlay.classList.add('active');
    }
}

function closeMenu() {
    navLinks.classList.remove('open');
    mobileToggle.classList.remove('active');
    document.body.classList.remove('menu-open');
    if (mobileOverlay) {
        mobileOverlay.classList.remove('active');
    }
}

if (mobileToggle && navLinks) {
    // Toggle menu on hamburger click
    mobileToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navLinks.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close menu when a nav link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });
}

// Close menu when overlay is clicked
if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
        closeMenu();
    });
}

// Close menu on window resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) {
        closeMenu();
    }
});

// Close menu on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMenu();
    }
});

// Initial check for reveal
reveal();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});
