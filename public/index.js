console.log("🚀 JS FILE LOADED");

// SAFE HELPER
function safeGet(id) {
  const el = document.getElementById(id);
  if (!el) console.warn("⚠️ Missing element:", id);
  return el;
}

// WAIT FOR ELEMENT (important for navbar/footer)
function waitForElement(id, callback) {
  const check = setInterval(() => {
    const el = document.getElementById(id);
    if (el) {
      clearInterval(check);
      console.log("✅ Found element:", id);
      callback(el);
    }
  }, 100);
}


// ── NAVBAR SCROLL ──
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  // 1. Find the navbar element inside the listener
  const navbar = document.querySelector('nav') || document.querySelector('.nav-container');

  // 2. Only run the logic if the navbar actually exists on this page
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  }
}, { passive: true });


// ── HERO SLIDESHOW ──
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let cur = 0, slideTmr;

function go(n) {
  // 1. CHECK: If slides don't exist on this page, STOP HERE.
  if (!slides || slides.length === 0) {
    console.log("No slides found on this page. Skipping animation.");
    return; 
  }

  // 2. The rest of your logic only runs if slides ARE found
  slides[cur].classList.remove('active');
  dots[cur].classList.remove('active');
  
  cur = (n + slides.length) % slides.length;
  
  slides[cur].classList.add('active');
  dots[cur].classList.add('active');
}

function tick() { 
  slideTmr = setInterval(() => go(cur + 1), 5500); 
}

// Manual dot navigation
dots.forEach(d => {
  d.addEventListener('click', () => { 
    clearInterval(slideTmr); 
    go(+d.dataset.slide); 
    tick(); 
  });
});

tick(); // Initialize timer on load


/// ── GLOBAL BOOKING MODAL (Works everywhere) ──

// ── GLOBAL BOOKING MODAL (Works for Nav & Service Cards) ──

const getModal = () => document.getElementById('modalBg');

const openAppt = () => { 
  const modal = getModal();
  if (modal) { 
    modal.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
  } else {
    console.error("❌ modalBg not found! Ensure modal HTML is in your navbar/footer component.");
  }
};

const closeAppt = () => { 
  const modal = getModal();
  if (modal) { 
    modal.classList.remove('open'); 
    document.body.style.overflow = ''; 
  } 
};

// ── GLOBAL CLICK LISTENER ──
document.addEventListener('click', (e) => {
  // Catch Nav buttons (#openModal...) AND Service Card buttons (.svc-card__cta)
  const isBookingBtn = e.target.closest('#openModal, #openModal2, #openModal3, .svc-card__cta');
  
  if (isBookingBtn) {
    // 1. Skip if it's the Emergency Line (let it handle the phone call)
    if (isBookingBtn.textContent.includes('Emergency')) return;

    e.preventDefault();
    openAppt();

    // 2. SMART SYNC: Auto-select the department in the dropdown
    const card = isBookingBtn.closest('.svc-card');
    if (card) {
      const serviceName = card.querySelector('.svc-card__name').textContent.trim();
      const specDropdown = document.getElementById('m-spec');
      if (specDropdown) specDropdown.value = serviceName;
    }

    // 3. Set Date Limit (Min = Today)
    const mDate = document.getElementById('m-date');
    if (mDate) mDate.min = new Date().toISOString().split('T')[0];
  }
  
  // Close Button Check
  if (e.target.closest('#closeModal')) closeAppt();

  // Background Overlay Check
  if (e.target === getModal()) closeAppt();
});

// ── GLOBAL SUBMISSION ──
document.addEventListener('click', function(e) {
  const btn = e.target.closest('#submitBtn');
  if (!btn) return;

  // 1. Get all field elements
  const fields = {
    name: document.getElementById('m-name'),
    phone: document.getElementById('m-phone'),
    email: document.getElementById('m-email'),
    branch: document.getElementById('m-branch'),
    spec: document.getElementById('m-spec'),
    date: document.getElementById('m-date')
  };

  let hasError = false;

  // 2. Simple Validation Loop
  Object.values(fields).forEach(el => {
    if (!el) return;
    if (!el.value.trim()) {
      el.style.border = '1px solid #A32D2D';
      hasError = true;
    } else {
      el.style.border = '';
    }
  });

  // 3. Email Specific Format Check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (fields.email && fields.email.value.trim() && !emailRegex.test(fields.email.value.trim())) {
    fields.email.style.border = '1px solid #A32D2D';
    showBtnStatus(btn, 'Invalid Email Format', '#A32D2D');
    return;
  }

  if (hasError) {
    showBtnStatus(btn, 'Please fill all fields', '#A32D2D');
    return;
  }

  // --- Success State ---
  btn.disabled = true;

  // Check if we are on the Telemedicine page
  // This looks for "telemedicine" in your URL (e.g., telemedicine.html)
  const isTelemedicine = window.location.pathname.includes('Telemedicin.html');

  if (isTelemedicine) {
    btn.style.background = '#0F6E56';
    btn.textContent = "Confirmed! Calling you soon.";
  } else {
    btn.style.background = '#0F6E56';
    btn.textContent = "Submitted!"; 
  }

  // Handle the reset/close timer
  setTimeout(() => { 
    if (typeof closeAppt === 'function') closeAppt(); 
    
    btn.disabled = false; 
    btn.style.background = ''; 
    btn.textContent = 'Request Appointment'; 
    
    // Reset Fields
    fieldIds.forEach(id => {
       const el = document.getElementById(id);
       if(el) el.value = '';
    });
  }, 3000);
});

// Helper for button feedback
function showBtnStatus(btn, text, color) {
  const oldText = btn.textContent;
  btn.style.background = color;
  btn.textContent = text;
  if (color === '#A32D2D') {
    setTimeout(() => {
      btn.style.background = '';
      btn.textContent = 'Request Appointment';
    }, 2200);
  }
}

// ── UK TB MODAL LOGIC ──
const tbBg = document.getElementById('tbModalBg');

const openTb = () => { 
  if (tbBg) { 
    tbBg.classList.add('open'); 
    document.body.style.overflow = 'hidden'; 
  } 
};

const closeTb = () => { 
  if (tbBg) { 
    tbBg.classList.remove('open'); 
    document.body.style.overflow = ''; 
  } 
};

// Global listener for all TB CTA buttons
document.querySelectorAll('.uktb-cta').forEach(btn => {
  btn.addEventListener('click', openTb);
});

const closeTbBtn = document.getElementById('closeTbModal');
if (closeTbBtn) closeTbBtn.addEventListener('click', closeTb);

if (tbBg) {
  tbBg.addEventListener('click', e => { 
    if (e.target === tbBg) closeTb(); 
  });
}

// Dynamic Date Constraints for TB Form
const tbDob = document.getElementById('tb-dob');
if (tbDob) {
  const dobMax = new Date();
  dobMax.setFullYear(dobMax.getFullYear() - 11); // Must be 11+ years old
  tbDob.max = dobMax.toISOString().split('T')[0];
}

const tbDateInput = document.getElementById('tb-date');
if (tbDateInput) tbDateInput.min = new Date().toISOString().split('T')[0];

// Applicant Counter Logic
let tbCount = 1;
const tbCountEl = document.getElementById('tb-count');
const tbInc = document.getElementById('tb-inc');
const tbDec = document.getElementById('tb-dec');

if (tbInc) tbInc.addEventListener('click', () => { 
  if (tbCount < 10) { tbCount++; tbCountEl.textContent = tbCount; }
});
if (tbDec) tbDec.addEventListener('click', () => { 
  if (tbCount > 1) { tbCount--; tbCountEl.textContent = tbCount; }
});


// ── TB FORM SUBMIT & PAYSTACK INTEGRATION ──
const tbSubmitBtn = document.getElementById('tbSubmitBtn');
if (tbSubmitBtn) {
  tbSubmitBtn.addEventListener('click', function () {
    const required = ['tb-fname', 'tb-lname', 'tb-dob', 'tb-passport', 'tb-phone', 'tb-email', 'tb-visa', 'tb-date'];
    const allFilled = required.every(id => {
      const el = document.getElementById(id);
      return el && el.value.trim() !== '';
    });

    if (!allFilled) {
      this.style.background = '#A32D2D';
      this.textContent = 'Please fill all required fields';
      setTimeout(() => {
        this.style.background = '#1E9FD4'; // Updated to your new Cyan
        this.textContent = 'Submit & Pay for TB Test';
      }, 2500);
      return;
    }

    this.disabled = true;
    this.textContent = 'Preparing payment…';

    // Data Extraction
    const fname = document.getElementById('tb-fname').value.trim();
    const lname = document.getElementById('tb-lname').value.trim();
    const email = document.getElementById('tb-email').value.trim();
    const phone = document.getElementById('tb-phone').value.trim();
    const count = parseInt(document.getElementById('tb-count').textContent) || 1;
    const amount = 25000 * count * 100; // Conversion to Kobo for Paystack

    const launchPaystack = () => {
      const handler = PaystackPop.setup({
        key: 'pk_test_YOUR_KEY', // <-- Remember to swap for Live Key later
        email: email,
        amount: amount,
        currency: 'NGN',
        ref: 'STN-TB-' + Date.now(),
        metadata: {
          custom_fields: [
            { display_name: 'Patient Name', value: fname + ' ' + lname },
            { display_name: 'Phone', value: phone },
            { display_name: 'Applicants', value: count },
            { display_name: 'Service', value: 'UK TB Screening' }
          ]
        },
        callback: function (response) {
          closeTb();
          alert('✅ Payment confirmed! Reference: ' + response.reference);
        },
        onClose: function () {
          tbSubmitBtn.disabled = false;
          tbSubmitBtn.style.background = '#1E9FD4';
          tbSubmitBtn.textContent = 'Submit & Pay for TB Test';
        }
      });
      handler.openIframe();
    };

    // Inject Paystack script dynamically if missing
    if (typeof PaystackPop === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = launchPaystack;
      document.head.appendChild(script);
    } else {
      launchPaystack();
    }
  });
}


// ── ACCESSIBILITY & UX POLISH ──

// Global Escape Key Listener for Modals
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (tbBg?.classList.contains('open')) closeTb();
  if (apptBg?.classList.contains('open')) closeAppt();
});

// WhatsApp Tooltip Delay
setTimeout(() => { 
  const w = document.getElementById('wa'); 
  if (w) { 
    w.classList.add('show'); 
    setTimeout(() => w.classList.remove('show'), 4000); 
  } 
}, 5000);

// Services Tab Filtering
const filters = document.querySelectorAll('.svc-filter');
const cards = document.querySelectorAll('.svc-card');

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(f => { f.classList.remove('active'); f.setAttribute('aria-selected', 'false'); });
    btn.classList.add('active'); 
    btn.setAttribute('aria-selected', 'true');
    
    const selected = btn.dataset.filter;
    cards.forEach((card, i) => {
      const match = selected === 'all' || card.dataset.cat === selected;
      if (match) { 
        card.classList.remove('hidden'); 
        card.style.transitionDelay = (i * 40) + 'ms'; 
        setTimeout(() => card.classList.add('revealed'), 20); 
      } else { 
        card.classList.remove('revealed'); 
        card.classList.add('hidden'); 
      }
    });
  });
});

// Intersection Observer for Reveal Animations
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

cards.forEach(card => revealObserver.observe(card));

// Counter Animation for "Experience" Badge
const badgeNum = document.querySelector('.about-img-badge__num');
let counted = false;

if (badgeNum) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !counted) {
        counted = true;
        let n = 0; 
        const target = 74;
        const countTick = setInterval(() => { 
          n++; 
          badgeNum.textContent = n; 
          if (n >= target) clearInterval(countTick); 
        }, 1800 / target);
      }
    });
  }, { threshold: 0.5 });
  counterObserver.observe(badgeNum);
}

  /**
 * ST. NICHOLAS HOSPITAL - UI Extensions
 * Handles Animations, Parallax, and Testimonials
 */

// ── 1. STAGGERED REVEALS (UK TB & VALUE PILLS) ──
const tbSteps = document.querySelectorAll('.uktb-step');
const valuePills = document.querySelectorAll('.vm-value');

// Pre-set initial states for cleaner CSS transition handling
const prepareScrollReveal = (elements, x = 0, y = 0, delayBase = 60) => {
  elements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.transition = `opacity 0.5s ease ${i * delayBase}ms, transform 0.5s ease ${i * delayBase}ms`;
  });
};

prepareScrollReveal(tbSteps, -16, 0, 120);
prepareScrollReveal(valuePills, 0, 12, 60);

// Unified Observer for UK TB Banner
const tbBanner = document.querySelector('.uktb-banner');
if (tbBanner) {
  const tbObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      tbSteps.forEach(s => { s.style.opacity = '1'; s.style.transform = 'translateX(0)'; });
      tbObserver.unobserve(tbBanner);
    }
  }, { threshold: 0.3 });
  tbObserver.observe(tbBanner);
}

// Unified Observer for Value Pills (Mission/Vision)
const vmValues = document.querySelector('.vm-values');
if (vmValues) {
  const pillObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      valuePills.forEach(p => { p.style.opacity = '1'; p.style.transform = 'translateY(0)'; });
      pillObserver.unobserve(vmValues);
    }
  }, { threshold: 0.5 });
  pillObserver.observe(vmValues);
}


// ── 2. PARALLAX EFFECTS ──
const aboutImg = document.querySelector('.about-img');
const aboutSection = document.getElementById('about');

if (aboutImg && aboutSection) {
  window.addEventListener('scroll', () => {
    const rect = aboutSection.getBoundingClientRect();
    // Only calculate if section is in viewport
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      const pct = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const shift = (pct - 0.5) * 40;
      aboutImg.style.transform = `translateY(${shift}px)`;
    }
  }, { passive: true });
}


// ── 3. DYNAMIC TESTIMONIALS ENGINE ──
const REVIEWS = [
    { name: 'Lola Okorie', role: 'Surgical Patient', text: 'Had an operation done there and I was really impressed with the type of care and attention I got. Admission care is excellent — I didn\'t even need a family member to stay with me. For every care and medication I received, I was told what it was for and why. The doctors and nurses were very courteous and professional. There is still hope for our healthcare system.', stars: 5 },
    { name: 'Harbiestictches', role: 'Dialysis Patient', text: 'I recognise the dialysis nurses, the ICU nurses and some of the ward nurses. They took care of me when I was a patient. Thanks for all you do. The dedication and warmth of the entire team is something I will never forget.', stars: 5 },
    { name: 'Olayemisalako', role: 'Inpatient', text: 'I recognise the dialysis nurses, the ICU nurses and some of the ward nurses. They took care of me when I was a patient. The level of professionalism and genuine care shown by every member of staff is truly remarkable.', stars: 5 },
    { name: 'Agbeniga Omobolanle', role: 'Inpatient', text: 'St. Nicholas Hospital has raised the bar so high that I cannot settle for less when it comes to healthcare. Having spent about 5 days there, from medical to non-medical staff, the courtesy is so heartwarming — professionalism plus kindness from every staff member. St. Nicholas Hospital forever!', stars: 3.5 },
    { name: 'Chukwuemeka Adeyemi', role: 'Cardiology Patient', text: 'The cardiology team at St. Nicholas is world-class. My treatment plan was explained thoroughly at every stage. I felt seen, heard, and genuinely cared for. The facilities are modern and immaculately clean. I would recommend this hospital to anyone seeking specialist care in Lagos.', stars: 4.5 },
    { name: 'Fatimah Bello', role: 'Antenatal Patient', text: 'I delivered my baby at St. Nicholas and it was the most reassuring experience. The midwives and obstetricians were incredibly attentive. The antenatal process was thorough and the delivery suite was clean and comfortable. My baby and I were in the best hands.', stars: 5 },
    { name: 'Tunde Fashola', role: 'Orthopaedic Patient', text: 'After my knee replacement surgery, the rehabilitation team helped me recover faster than I expected. The physiotherapy sessions were professional and personalised. Six months later I am walking without pain. I am forever grateful to the orthopaedic team.', stars: 5 },
    { name: 'Ngozi Okafor', role: 'Corporate Health Assessment', text: 'Our company used St. Nicholas for our annual executive health assessments. The process was seamless from booking to results. The reports were detailed, professional and delivered promptly. We will absolutely be returning next year.', stars: 5 },
    { name: 'Dr. Kola Adesanya', role: 'Referring Physician', text: 'As a GP, I refer my most complex cases to St. Nicholas and they never disappoint. The communication between their specialists and my practice is excellent. My patients always return with positive feedback about the level of care they received.', stars: 3},
    { name: 'Adaeze Nwosu', role: 'Paediatric Patient\'s Mother', text: 'The paediatric ward team handled my son\'s condition with such expertise and compassion. They explained every step to me as a parent and never made me feel like I was asking too many questions. My son recovered fully and the nurses made him feel so comfortable.', stars: 5 },
    { name: 'Musa Ibrahim', role: 'Emergency Patient', text: 'I was brought in through A&E following a road accident and the response was immediate. The trauma team was calm, efficient and reassuring. Within hours I had been assessed, scanned and treated. The emergency team saved my life and I am eternally grateful.', stars: 4 },
    { name: 'Blessing Eze', role: 'Dialysis Patient', text: 'I have been a dialysis patient here for over three years. The renal unit is exceptional — the nurses know my name, they know my history and they treat me like family. The consistency of care over the years gives me confidence that I am in the right place.', stars: 5 },
    { name: 'Amaka Obi', role: 'Oncology Patient', text: 'Being diagnosed with cancer is terrifying but having the oncology team at St. Nicholas walk me through every stage of treatment gave me so much strength. Their warmth and expertise made an incredibly difficult journey more bearable. I am now in remission.', stars: 5 },
    { name: 'Seun Coker', role: 'Post-Surgical Patient', text: 'The nursing care post-surgery was outstanding. Every check-in was prompt, every question was answered. I never felt neglected. The ward was quiet, clean and well-organised. Recovery was smoother than I ever anticipated. Thank you St. Nicholas.', stars: 4.5 },
    { name: 'Jide Adebayo', role: 'UK TB Test Patient', text: 'I needed my TB certificate for a UK visa application and the process at St. Nicholas was incredibly smooth. Everything was properly documented, the staff were knowledgeable about the UKVI requirements, and my certificate arrived within the promised timeframe. Highly professional.', stars: 5 },
  
];

// Shuffle and build UI
const shuffled = [...REVIEWS].sort(() => Math.random() - 0.5);
const stage = document.getElementById('reviewsStage');
const dotsEl = document.getElementById('reviewsDots');
const avatarColors = ['#002B5C','#1E9FD4','#0F5B8A','#533AB7','#0F6E56'];

let revCur = 0;
let revTimer;

const updateReviews = (n) => {
  const revCards = stage.querySelectorAll('.review-card');
  const revDots = dotsEl.querySelectorAll('.reviews-dot');

  revCards[revCur].classList.remove('active');
  revCards[revCur].classList.add('exit-left');
  revDots[revCur].classList.remove('active');

  setTimeout(() => revCards[revCur].classList.remove('exit-left'), 560);
  
  revCur = (n + shuffled.length) % shuffled.length;
  
  revCards[revCur].classList.add('active');
  revDots[revCur].classList.add('active');
};

const startReviewTimer = () => {
  clearInterval(revTimer);
  revTimer = setInterval(() => updateReviews(revCur + 1), 6000);
};

// Populate Review Cards
// --- REVIEWS SECTION ---

  // Using a unique name inside this block to avoid "Already Declared" errors
 {
  const reviewContainer = document.querySelector('.reviews-stage');
  const dotsEl = document.querySelector('.reviews-dots'); // Make sure this selector is correct

  if (reviewContainer && dotsEl) {
    shuffled.forEach((r, i) => {
      // 1. Create the Card
      const card = document.createElement('div');
      card.className = `review-card ${i === 0 ? 'active' : ''}`;
      card.innerHTML = `
        <div>
          <div class="review-stars">${'★'.repeat(r.stars)}</div>
          <p class="review-text">${r.text}</p>
        </div>
        <div class="review-author">
          <div class="review-avatar" style="background:${avatarColors[i % avatarColors.length]}">
            ${r.name.split(' ').map(w => w[0]).join('').toUpperCase()}
          </div>
          <div>
            <div class="review-name">${r.name}</div>
            <div class="review-role">${r.role}</div>
          </div>
        </div>`;
      
      reviewContainer.appendChild(card);

      // 2. Create the Dot (Moved INSIDE the loop so 'i' works)
      const dot = document.createElement('button');
      dot.className = `reviews-dot ${i === 0 ? 'active' : ''}`;
      dot.onclick = () => { 
        updateReviews(i); 
        if (typeof startReviewTimer === 'function') startReviewTimer(); 
      };
      dotsEl.appendChild(dot);
    });
    console.log("✅ Home Page: Reviews and Dots injected.");
  } else {
    console.log("ℹ️ About Page: Skipping reviews (elements not found).");
  }
}
// Controls & Hover Pause
// Controls with Optional Chaining (Safe)
document.getElementById('revNext')?.addEventListener('click', () => { 
    updateReviews(revCur + 1); 
    startReviewTimer(); 
});

document.getElementById('revPrev')?.addEventListener('click', () => { 
    updateReviews(revCur - 1); 
    startReviewTimer(); 
});

// Guard the stage listeners (The part that was crashing!)
if (stage) {
    stage.addEventListener('mouseenter', () => clearInterval(revTimer));
    stage.addEventListener('mouseleave', startReviewTimer);
    
    // Only start the timer if the stage exists
    startReviewTimer();
} else {
    console.log("ℹ️ Skipping review timer: Stage not found.");
}

// ── 4. SCROLL REVEAL (WHY CHOOSE US SECTION) ──
const sec4Observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      sec4Observer.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.ta-badge, .why-card').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = `opacity 0.6s ease ${i * 55}ms, transform 0.6s ease ${i * 55}ms`;
  sec4Observer.observe(el);
});
 
   // ══ LANGUAGE SWITCHER ══
  const TRANSLATIONS = {
    en: {
      nl_title:'Subscribe to Our Newsletter', nl_sub:'Stay informed with the latest health news, updates, and exclusive offers from St. Nicholas Hospital.', nl_placeholder:'Enter your email address', nl_btn:'Subscribe', nl_note:'We respect your privacy. Unsubscribe anytime.',
      footer_desc:"Nigeria's foremost specialist hospital. COHSASA-accredited, patient-centred care since 1968. The first in Nigeria to perform a successful kidney transplant.",
      locate_us:'Locate Us', useful_links:'Useful Links', contact_us:'Contact Us',
      lagos_island:'Lagos Island', victoria_island:'Victoria Island', lekki:'Lekki Free Zone', maryland:'Maryland', surulere:'Surulere',
      privacy:'Privacy Policy', schedules:'Schedules', uktb_complaint:'UKTB Complaint Resolution', patients_rights:"Patients' Bill of Rights", retainership:'Retainership', gallery:'Gallery',
      address_label:'Address', email_us:'Email Us', call_us:'Call Us',
      copyright:'© 2026 St. Nicholas Hospital, Lagos. All Rights Reserved.', privacy_short:'Privacy Policy', terms:'Terms of Use', sitemap:'Sitemap'
    },
    fr: {
      nl_title:'Abonnez-vous à Notre Newsletter', nl_sub:'Restez informé des dernières nouvelles de santé et des offres exclusives de St. Nicholas Hospital.', nl_placeholder:'Entrez votre adresse e-mail', nl_btn:"S'abonner", nl_note:'Nous respectons votre vie privée. Désabonnez-vous à tout moment.',
      footer_desc:"L'hôpital spécialisé de premier plan au Nigeria. Accrédité par COHSASA depuis 1968. Premier au Nigeria à réaliser une transplantation rénale réussie.",
      locate_us:'Nous Localiser', useful_links:'Liens Utiles', contact_us:'Contactez-Nous',
      lagos_island:'Île de Lagos', victoria_island:'Île Victoria', lekki:'Zone Franche de Lekki', maryland:'Maryland', surulere:'Surulere',
      privacy:'Politique de Confidentialité', schedules:'Horaires', uktb_complaint:'Résolution des Plaintes UKTB', patients_rights:'Charte du Patient', retainership:'Rétention', gallery:'Galerie',
      address_label:'Adresse', email_us:'Envoyez-nous un E-mail', call_us:'Appelez-Nous',
      copyright:'© 2026 St. Nicholas Hospital, Lagos. Tous droits réservés.', privacy_short:'Confidentialité', terms:"Conditions d'utilisation", sitemap:'Plan du Site'
    },
    yo: {
      nl_title:'Forúkọ Sílẹ̀ fún Ìròyìn Wa', nl_sub:'Jẹ kí a máa fi ìròyìn tuntun àti àwọn àfifun pàtàkì sí ọ láti Ilé Ìwòsàn St. Nicholas.', nl_placeholder:'Tẹ àdírẹ́sì ímélì rẹ', nl_btn:'Forúkọ Sílẹ̀', nl_note:'A bọ̀wọ̀ fún àṣírí rẹ. Yọ ara rẹ kúrò nígbàkígbà.',
      footer_desc:'Ilé ìwòsàn àkànṣe tó jẹ́ olórí jùlọ ní Nàìjíríà. Fọwọ́ sí COHSASA, tí wọ́n ti ń tọ́jú àwọn aláìsàn dáadáa láti ọdún 1968.',
      locate_us:'Wà Wá', useful_links:'Àwọn Ọ̀nà Tó Wúlò', contact_us:'Kan Sí Wa',
      lagos_island:'Èkó Àárọ̀', victoria_island:'Victoria Island', lekki:'Agbègbè Lẹ́kì', maryland:'Maryland', surulere:'Surulere',
      privacy:'Ìlànà Àṣírí', schedules:'Àkókò Ìwé', uktb_complaint:'Ìgbẹ̀sẹ̀ Ẹ̀sùn UKTB', patients_rights:'Ẹ̀tọ́ Àwọn Aláìsàn', retainership:'Adéhùn', gallery:'Gàlẹ̀rì',
      address_label:'Àdírẹ́sì', email_us:'Firanṣẹ́ Ímélì', call_us:'Pè Wá',
      copyright:'© 2026 Ilé Ìwòsàn St. Nicholas, Lagos. Gbogbo ẹ̀tọ́ ni a pa mọ́.', privacy_short:'Àṣírí', terms:'Àwọn Ìlànà Lílo', sitemap:'Maapu Ààyè'
    },
    ha: {
      nl_title:'Yi Rijista don Labaranmu', nl_sub:'Sami sabuntawar lafiya da tayin na musamman daga Asibitin St. Nicholas.', nl_placeholder:'Shigar da adireshin imelinka', nl_btn:'Yi Rijista', nl_note:'Muna girmama asirin ku. Ku iya ficewa a kowane lokaci.',
      footer_desc:'Babban asibitin ƙwararru a Najeriya. An amince shi ta COHSASA tun 1968. Na farko a Najeriya da ya yi nasarar dasa koda.',
      locate_us:'Nemo Mu', useful_links:'Hanyoyin Amfani', contact_us:'Tuntube Mu',
      lagos_island:'Tsibirin Lagos', victoria_island:'Victoria Island', lekki:'Yankin Ciniki na Lekki', maryland:'Maryland', surulere:'Surulere',
      privacy:'Manufar Sirri', schedules:'Jadawalin Lokaci', uktb_complaint:'Warware Korafi na UKTB', patients_rights:'Hakkokin Marasa Lafiya', retainership:'Yarjejeniya', gallery:'Hotuna',
      address_label:'Adireshi', email_us:'Aika Imel', call_us:'Kira Mu',
      copyright:'© 2026 Asibitin St. Nicholas, Lagos. Dukkan haƙƙoƙi an kiyaye su.', privacy_short:'Sirri', terms:'Sharuɗɗan Amfani', sitemap:'Taswirar Shafin'
    },
    ig: {
      nl_title:'Debanye Aha Maka Akụkọ Anyị', nl_sub:'Nọrọ n\'ọmịala maka akụkọ ahụike ọhụrụ na ngọzi pụrụ iche sitere n\'Ụlọ Ọgwụ St. Nicholas.', nl_placeholder:'Tinye adreesị email gị', nl_btn:'Debanye Aha', nl_note:'Anyị na-asọpụrụ nzuzo gị. Pụọ mgbe ọ bụla.',
      footer_desc:'Ụlọ ọgwụ ọkachamara bụ isi na Naịjirịa. COHSASA kwadoro ya kemgbe 1968. Nke mbụ na Naịjirịa ime ibutere kidney nke gara nke ọma.',
      locate_us:'Chọta Anyị', useful_links:'Njikọ Ndị Bara Uru', contact_us:'Kpọtụrụ Anyị',
      lagos_island:'Lagos Island', victoria_island:'Victoria Island', lekki:'Mpaghara Lekki', maryland:'Maryland', surulere:'Surulere',
      privacy:'Iwu Nzuzo', schedules:'Oge Ọrụ', uktb_complaint:'Ngwọta Mkpesa UKTB', patients_rights:'Ikike Ndị Ọrịa', retainership:'Nkwekọrịta', gallery:'Ụlọ Ihe Ngosi',
      address_label:'Adreesị', email_us:'Zịpụ Email', call_us:'Kpọọ Anyị',
      copyright:'© 2026 Ụlọ Ọgwụ St. Nicholas, Lagos. Ikike niile echekwara.', privacy_short:'Nzuzo', terms:'Usoro Ojiji', sitemap:'Maapụ Saịtị'
    }
  };
 
  let currentLang = 'en';
 
  function applyLang(lang) {
    const t = TRANSLATIONS[lang];
    if (!t) return;
    currentLang = lang;
    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });
    // Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) el.placeholder = t[key];
    });
    // Update active lang label
    const labels = { en:'English', fr:'Français', yo:'Yorùbá', ha:'Hausa', ig:'Igbo' };
    document.getElementById('activeLangLabel').textContent = labels[lang];
    // Update active option
    document.querySelectorAll('.lang-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.lang === lang);
    });
  }
 // ── SAFE LANGUAGE TOGGLE (Wait for navbar to load) ──
waitForElement('langToggle', (langToggle) => {
  const langDropdown = document.getElementById('langDropdown');

  if (!langDropdown) return; // Safety check

  langToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = langDropdown.classList.toggle('open');
    langToggle.classList.toggle('open', isOpen);
  });

  // Handle language option clicks
  document.querySelectorAll('.lang-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      applyLang(opt.dataset.lang);
      langDropdown.classList.remove('open');
      langToggle.classList.remove('open');
    });
  });

  // Close when clicking anywhere else
  document.addEventListener('click', () => {
    langDropdown.classList.remove('open');
    langToggle.classList.remove('open');
  });
});
 
  // ══ NEWSLETTER SUBMIT (Wait for footer to load) ══
waitForElement('nlSubmit', (btn) => {
  btn.addEventListener('click', function() {
    const email = document.getElementById('nlEmail').value.trim();
    const note = document.getElementById('nlNote');
    
    if (!email || !email.includes('@')) {
      this.style.background = '#A32D2D';
      this.textContent = 'Invalid email';
      setTimeout(() => { 
        this.style.background = ''; 
        this.textContent = TRANSLATIONS[currentLang]?.nl_btn || 'Subscribe'; 
      }, 2000);
      return;
    }

    this.style.background = '#0F6E56';
    this.textContent = '✓ Subscribed!';
    note.textContent = 'Thank you! You are now subscribed.';
    note.style.color = 'rgba(30,212,120,.7)';
    document.getElementById('nlEmail').value = '';
    
    setTimeout(() => {
      this.style.background = '';
      this.textContent = TRANSLATIONS[currentLang]?.nl_btn || 'Subscribe';
      note.textContent = TRANSLATIONS[currentLang]?.nl_note || 'We respect your privacy.';
      note.style.color = '';
    }, 4000);
  });
});
 
  // ══ PAYSTACK PAYMENT MODAL ══
  const payBg = document.getElementById('payModalBg');
  const openPay  = () => { payBg.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const closePay = () => { payBg.classList.remove('open'); document.body.style.overflow = ''; };
  const closeBtn = document.getElementById('closePayModal');

if (closeBtn) {
  closeBtn.addEventListener('click', closePay);
} else {
  console.error("❌ closePayModal not found");
}

if (payBg) {
  payBg.addEventListener('click', e => {
    if (e.target === payBg) closePay();
  });
}
  
 
  
  // ══ LOCATIONS MAP — Branch switcher ══
  // When Google Maps API is ready, replace iframe with JS API version
  // For now the iframe switches by changing the src embed URL per branch
  const BRANCHES = {
    island:   { label:'Lagos Island — Main Branch',   src:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.6!2d3.3941!3d6.4541!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2a4c0e5b5b%3A0x0!2sSt.+Nicholas+Hospital%2C+Lagos+Island!5e0!3m2!1sen!2sng' },
    vi:       { label:'Victoria Island Clinic',        src:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.9!2d3.4219!3d6.4281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSt.+Nicholas+Hospital+Victoria+Island!5e0!3m2!1sen!2sng' },
    maryland: { label:'Maryland Branch',               src:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.8!2d3.3566!3d6.5707!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSt.+Nicholas+Hospital+Maryland!5e0!3m2!1sen!2sng' },
    lekki:    { label:'Lekki Free Trade Zone Clinic',  src:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.2!2d3.5500!3d6.4300!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSt.+Nicholas+LFZ+Clinic!5e0!3m2!1sen!2sng' },
    surulere: { label:'Surulere Branch',               src:'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.4!2d3.3500!3d6.5000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sSt.+Nicholas+Hospital+Surulere!5e0!3m2!1sen!2sng' }
  };
 
  function panTo(branchKey, btn) {
  const branch = BRANCHES[branchKey];
  if (!branch) return;

  const map = document.getElementById('branchMap');

  // Force iframe reload by clearing then setting src
  map.src = 'about:blank';
  setTimeout(() => {
    map.style.opacity = '0';
    map.src = branch.src;
    map.onload = () => {
      map.style.transition = 'opacity 0.4s ease';
      map.style.opacity = '1';
    };
  }, 80);

  // Update label
  document.getElementById('mapLabelText').textContent = branch.label;

  // Update active button
  document.querySelectorAll('.branch-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
 
  // ══ NEWS CARDS — scroll reveal ══
  const newsObs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        newsObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.news-card').forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.6s ease ${i * 80}ms, transform 0.6s ease ${i * 80}ms, border-color .3s ease, box-shadow .3s ease, transform .32s ease`;
    newsObs.observe(card);
  });

  

//   // ══ FLOATING LANGUAGE SWITCHER ══
// const langFloatBtn   = document.getElementById('langFloatBtn');
// const langFloatPanel = document.getElementById('langFloatPanel');
// const langFloatLabel = document.getElementById('langFloatLabel');
// const LANG_LABELS    = { en:'English', fr:'Français', yo:'Yorùbá', ha:'Hausa', ig:'Igbo' };

// // Restore saved language on every page load
// const savedLang = localStorage.getItem('stn-lang') || 'en';
// applyLang(savedLang);  // applyLang() already exists in your code

// langFloatBtn.addEventListener('click', e => {
//   e.stopPropagation();
//   const isOpen = langFloatPanel.classList.toggle('open');
//   langFloatBtn.classList.toggle('open', isOpen);
// });
// document.querySelectorAll('#langFloatPanel .lang-opt').forEach(opt => {
//   opt.addEventListener('click', () => {
//     const lang = opt.dataset.lang;
//     applyLang(lang);
//     localStorage.setItem('stn-lang', lang);   // ← saves choice across ALL pages
//     langFloatLabel.textContent = LANG_LABELS[lang];
//     document.querySelectorAll('#langFloatPanel .lang-opt')
//       .forEach(o => o.classList.toggle('active', o.dataset.lang === lang));
//     langFloatPanel.classList.remove('open');
//     langFloatBtn.classList.remove('open');
//   });
// });
// document.addEventListener('click', () => {
//   langFloatPanel.classList.remove('open');
//   langFloatBtn.classList.remove('open');
// });


// 1. SAFE COMPONENT LOADER
function loadComponent(id, file) {
    // Using /public/ because that's where your server root is
    return fetch(`/public/${file}`)
        .then(res => res.text())
        .then(data => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = data;
                return true; 
            }
            return false;
        });
}

// 2. INITIALIZE EVERYTHING
document.addEventListener("DOMContentLoaded", () => {
    
    // Load Navbar and Footer (nav logic now runs automatically via waitForElement)
    loadComponent("navbar", "./components/navbar.html");
    loadComponent("footer", "./components/footer.html");

    // 3. SAFE PAGE-SPECIFIC LOGIC
    const branchGrid = document.querySelector('.loc-grid');
    
    if (branchGrid) {
        console.log("Branch grid detected. Running card logic...");
        // ... your locations logic ...
    }
});


// 4. SAFE NAV LOGIC (Fixes the classList error)
// ── MOBILE NAV TOGGLE ──
waitForElement('navToggle', (toggleBtn) => {
  console.log("✅ Navbar Toggle Button found in DOM!");

  const navLinks = document.querySelector('.nav__links');
  
  if (!navLinks) {
    console.error("❌ Error: .nav__links container not found! Check your navbar.html classes.");
    return;
  }

  toggleBtn.addEventListener('click', (e) => {
    console.log("🚀 Hamburger clicked!");

    const isOpen = navLinks.classList.toggle('active');
    toggleBtn.classList.toggle('is-open');

    console.log("Menu State: " + (isOpen ? "OPEN" : "CLOSED"));
    console.log("Current Classes on Nav:", navLinks.className);

    // FIX: Stops the background page from scrolling when menu is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      console.log("Body scroll locked");
    } else {
      document.body.style.overflow = '';
      console.log("Body scroll released");
    }
  });

  // ── LOCATIONS DROPDOWN FIX ──
  const allNavButtons = document.querySelectorAll('.nav__link');
  console.log(`Found ${allNavButtons.length} nav links to check for 'Locations'`);
  
  allNavButtons.forEach(btn => {
    if (btn.textContent.includes('Locations')) {
      console.log("🔗 'Locations' link identified. Adding mobile dropdown logic.");
      
      btn.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
          console.log("Dropdown clicked on mobile/tablet");
          e.preventDefault();
          e.stopPropagation();
          
          const dropdown = btn.nextElementSibling; 
          if (dropdown) {
            const isVisible = dropdown.classList.toggle('is-visible-mobile');
            console.log("Dropdown Visibility:", isVisible);
            
            // Optional: rotate the arrow icon
            const arrow = btn.querySelector('svg');
            if (arrow) {
                arrow.style.transform = isVisible ? 'rotate(180deg)' : '';
            }
          } else {
            console.warn("⚠️ Dropdown container (.nav__dd) not found next to 'Locations' button");
          }
        }
      });
    }
  });
});
// thi is the js for the about page, it has scroll reveal and some other fun stuff. I put it in index.js to avoid "Already Declared" errors since it's only loaded on the about page. If you want to use any of this on other pages, just copy the relevant parts and make sure to guard them with checks for the elements they interact with (like I did with the reviews section).
 // --- ABOUT PAGE ANIMATIONS ---
{
  // 1. SCROLL REVEAL (Safe because it checks if elements exist first)
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length > 0) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObserver.observe(el));
  }

  // 2. VALUE PILLS (Added a check for valuePills length)
  const valuePills = document.querySelectorAll('.value-pill');
  if (valuePills.length > 0) {
    valuePills.forEach((pill, i) => {
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(12px)';
      pill.style.transition = `opacity 0.45s ease ${i * 60}ms, transform 0.45s ease ${i * 60}ms, background 0.3s ease, color 0.3s ease, border-color 0.3s ease`;
    });

    const valuesWrap = document.querySelector('.values-wrap');
    if (valuesWrap) {
      const pillObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            valuePills.forEach(p => {
              p.style.opacity = '1';
              p.style.transform = 'translateY(0)';
            });
            pillObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      pillObserver.observe(valuesWrap);
    }
  }

  // 3. TECH CARDS (Staggered transition)
  const techCards = document.querySelectorAll('.tech-card');
  if (techCards.length > 0) {
    const techObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          techObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    techCards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(28px)';
      // Note: I cleaned up the transition string to avoid double 'transform' definitions
      card.style.transition = `opacity 0.65s ease ${i * 70}ms, transform 0.65s ease ${i * 70}ms`;
      techObserver.observe(card);
    });
  }
}

// js   FOR THE CEO MESSAGE PAGE
 // ── Scroll reveal for all .reveal elements ──
    const revealEls = document.querySelectorAll('.reveal');
 
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
 
    revealEls.forEach(el => observer.observe(el));
 
 
    // ── Value cards stagger in when section enters view ──
    const valueCards = document.querySelectorAll('.value-card');
    valueCards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      card.style.transition = `opacity 0.5s ease ${i * 60}ms, transform 0.5s ease ${i * 60}ms, border-color .3s ease, box-shadow .3s ease, transform .32s ease`;
    });
 
    const valuesObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          valueCards.forEach(card => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          });
          valuesObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
 
    const valuesGrid = document.querySelector('.values-grid');
    if (valuesGrid) valuesObserver.observe(valuesGrid);



    // js FOR THE MANAGEMENT PAGE

    (function() {
  const revealEls = document.querySelectorAll('.reveal');
  // ... rest of your code
  const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
 
    revealEls.forEach(el => revealObserver.observe(el));
 
 
    // ══ HANDLE BROKEN IMAGES ══
    // If person card get no real photo, show initials placeholder
    document.querySelectorAll('.person-card__photo').forEach(img => {
      img.addEventListener('error', function () {
        this.style.display = 'none';
        this.closest('.person-card').classList.add('person-card--placeholder');
      });
    });
})();


// js FOR CONSULTANTS PAGE
// ══ CONSULTANTS PAGE JS ══
(function () {

  // Min date for booking form
  const dateInput = document.getElementById('con-date');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  // Modal — only run if the modal elements exist on this page
  const conModalBg  = document.getElementById('conModalBg');
  const conCloseBtn = document.getElementById('conCloseModal');
  const conModalSub = document.getElementById('conModalSub');
  const conSpecSel  = document.getElementById('con-spec');

  if (conModalBg && conCloseBtn) {

    window.openBookingModal = function (specialty) {
      if (specialty) {
        conModalSub.textContent = specialty + ' — Fast-Track Booking';
        const opts = conSpecSel.options;
        for (let i = 0; i < opts.length; i++) {
          if (opts[i].text.toLowerCase().includes(specialty.toLowerCase().split(' ')[0])) {
            conSpecSel.selectedIndex = i;
            break;
          }
        }
      } else {
        conModalSub.textContent = 'Fast-Track Specialist Booking';
      }
      conModalBg.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    function closeConModal() {
      conModalBg.classList.remove('open');
      document.body.style.overflow = '';
    }

    conCloseBtn.addEventListener('click', closeConModal);
    conModalBg.addEventListener('click', e => { if (e.target === conModalBg) closeConModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeConModal(); });

    // Submit
    const conSubmitBtn = document.getElementById('conSubmitBtn');
    if (conSubmitBtn) {
      conSubmitBtn.addEventListener('click', function () {
        const vals = ['con-name','con-phone','con-branch','con-spec','con-date']
          .map(id => document.getElementById(id).value.trim());
        if (vals.some(v => !v)) {
          this.style.background = '#A32D2D';
          this.textContent = 'Please fill all fields';
          setTimeout(() => {
            this.style.background = '';
            this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Request Appointment';
          }, 2200);
          return;
        }
        this.style.background = '#0F6E56';
        this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Confirmed! We\'ll call you soon.';
        this.disabled = true;
        setTimeout(() => {
          closeConModal();
          this.disabled = false;
          this.style.background = '';
          this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Request Appointment';
        }, 3000);
      });
    }

  } // end modal guard

  // Filter tabs — only run if con-filter elements exist
  const conFilters = document.querySelectorAll('.con-filter');
  const conCards   = document.querySelectorAll('.con-card');
  const conEmpty   = document.getElementById('conEmpty');

  if (conFilters.length > 0) {
    conFilters.forEach(btn => {
      btn.addEventListener('click', () => {
        conFilters.forEach(f => f.classList.remove('active'));
        btn.classList.add('active');

        const selected = btn.dataset.filter;
        let visible = 0;

        conCards.forEach((card, i) => {
          const match = selected === 'all' || card.dataset.cat === selected;
          if (match) {
            card.classList.remove('hidden');
            card.style.transitionDelay = (i * 40) + 'ms';
            setTimeout(() => card.classList.add('revealed'), 20);
            visible++;
          } else {
            card.classList.add('hidden');
            card.classList.remove('revealed');
          }
        });

        if (conEmpty) conEmpty.classList.toggle('visible', visible === 0);
      });
    });
  }

  // Scroll reveal for consultant cards
  if (conCards.length > 0) {
    const conCardObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const idx  = Array.from(conCards).indexOf(card);
          card.style.transitionDelay = (idx % 4) * 70 + 'ms';
          card.classList.add('revealed');
          conCardObs.unobserve(card);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

    conCards.forEach(card => conCardObs.observe(card));
  }

  // Scroll reveal for other consultants page elements
  const conRevealEls = document.querySelectorAll('.con-intro__inner, .cta-btns, .con-cta__inner > div');
  if (conRevealEls.length > 0) {
    const conElemsObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          conElemsObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    conRevealEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity 0.65s ease ${i * 80}ms, transform 0.65s ease ${i * 80}ms`;
      conElemsObs.observe(el);
    });
  }

  // Handle broken consultant card images
  document.querySelectorAll('.con-card__photo').forEach(img => {
    img.addEventListener('error', function () {
      this.style.display = 'none';
    });
  });

})();


// ══ FOUNDER PAGE JS ══
(function () {

  // Scroll reveal for founder sections
  const founderRevealEls = document.querySelectorAll('.founder-section, .founder-legacy');

  if (founderRevealEls.length > 0) {
    const founderObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          founderObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

    founderRevealEls.forEach(el => founderObs.observe(el));
  }

  // Achievement pills stagger
  const founderPills = document.querySelectorAll('.achievement-pill');
  if (founderPills.length > 0) {
    founderPills.forEach((pill, i) => {
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(12px)';
      pill.style.transition = `opacity 0.45s ease ${i * 60}ms, transform 0.45s ease ${i * 60}ms`;
    });

    const pillsObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          founderPills.forEach(p => {
            p.style.opacity = '1';
            p.style.transform = 'translateY(0)';
          });
          pillsObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    const achievementsEl = document.querySelector('.founder-achievements');
    if (achievementsEl) pillsObs.observe(achievementsEl);
  }

  // Timeline items stagger
  const timelineItems = document.querySelectorAll('.timeline-item');
  if (timelineItems.length > 0) {
    timelineItems.forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-16px)';
      item.style.transition = `opacity 0.55s ease ${i * 100}ms, transform 0.55s ease ${i * 100}ms`;
    });

    const timelineObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          timelineItems.forEach(item => {
            item.style.opacity = '1';
            item.style.transform = 'translateX(0)';
          });
          timelineObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    const timelineEl = document.querySelector('.founder-timeline');
    if (timelineEl) timelineObs.observe(timelineEl);
  }

})();




(function () {

 // ════════════════════════════════════════════════════
//  SCHEDULE DATA
//  To ADD a clinic:    push a new object to SCHEDULE
//  To EDIT a clinic:   change the values in the object
//  To REMOVE a clinic: delete the object from the array
//
//  day:   0=Mon  1=Tue  2=Wed  3=Thu  4=Fri  5=Sat
//  start/end: 24h format  "8:00" "13:30" "17:00"
//  branch: "Lagos Island" | "VI Clinic" | "Maryland"
// ════════════════════════════════════════════════════
const SCHEDULE = [
  // ── MONDAY ──
  { specialty:"Obs & Gynaecology",     start:"9:00",  end:"13:00", branch:"Maryland",     day:0 },
  { specialty:"Physiotherapy Clinic",  start:"9:00",  end:"14:00", branch:"Lagos Island", day:0 },
  { specialty:"Obs & Gynaecology",     start:"10:00", end:"14:00", branch:"Lagos Island", day:0 },
  { specialty:"Nephrologist",          start:"10:00", end:"16:00", branch:"Lagos Island", day:0 },
  { specialty:"Physiotherapy Clinic",  start:"10:00", end:"14:00", branch:"Lagos Island", day:0 },
  { specialty:"Physician/Nephrology",  start:"11:00", end:"14:00", branch:"Lagos Island", day:0 },
 
  // ── TUESDAY ──
  { specialty:"Obs & Gynaecology",     start:"9:00",  end:"11:00", branch:"Lagos Island", day:1 },
  { specialty:"General Surgery",       start:"10:00", end:"14:00", branch:"Lagos Island", day:1 },
  { specialty:"Nephrologist",          start:"10:00", end:"14:00", branch:"VI Clinic",    day:1 },
 
  // ── WEDNESDAY ──
  { specialty:"General Surgery",       start:"8:00",  end:"9:00",  branch:"Lagos Island", day:2 },
  { specialty:"Obs & Gynaecology",     start:"9:00",  end:"13:00", branch:"VI Clinic",    day:2 },
  { specialty:"Orthopaedics",          start:"10:00", end:"14:00", branch:"Lagos Island", day:2 },
  { specialty:"Obs & Gynaecology",     start:"10:00", end:"14:00", branch:"Lagos Island", day:2 },
  { specialty:"Physician/Nephrology",  start:"11:00", end:"14:00", branch:"Lagos Island", day:2 },
  { specialty:"General Surgery",       start:"14:00", end:"16:00", branch:"Maryland",     day:2 },
  { specialty:"Paediatrics",           start:"14:00", end:"17:00", branch:"Maryland",     day:2 },
 
  // ── THURSDAY ──
  { specialty:"Endocrinology",         start:"9:00",  end:"14:00", branch:"Lagos Island", day:3 },
  { specialty:"Paediatrics",           start:"10:00", end:"16:00", branch:"Lagos Island", day:3 },
  { specialty:"Nephrologist",          start:"10:00", end:"16:00", branch:"Lagos Island", day:3 },
  { specialty:"Obs & Gynaecology",     start:"10:00", end:"14:00", branch:"Lagos Island", day:3 },
  { specialty:"Psychiatric",           start:"12:00", end:"15:00", branch:"Lagos Island", day:3 },
  { specialty:"Nephrologist",          start:"13:00", end:"15:00", branch:"Maryland",     day:3 },
  { specialty:"ENT",                   start:"13:30", end:"15:00", branch:"Lagos Island", day:3 },
  { specialty:"Dietician",             start:"14:00", end:"16:00", branch:"Lagos Island", day:3 },
 
  // ── FRIDAY ──
  { specialty:"Endocrinology",         start:"9:00",  end:"14:00", branch:"Lagos Island", day:4 },
  { specialty:"Physiotherapy Clinic",  start:"10:00", end:"14:00", branch:"Lagos Island", day:4 },
  { specialty:"Urologist",             start:"12:00", end:"14:00", branch:"Lagos Island", day:4 },
  { specialty:"Physiotherapy Clinic",  start:"13:30", end:"15:00", branch:"Lagos Island", day:4 },
  { specialty:"Orthopaedics",          start:"14:00", end:"17:00", branch:"Lagos Island", day:4 },
 
  // ── SATURDAY ──
  { specialty:"Paediatrics",           start:"10:00", end:"17:00", branch:"Lagos Island", day:5 },
  { specialty:"Physiotherapy Clinic",  start:"10:00", end:"14:00", branch:"Lagos Island", day:5 },
  { specialty:"Physiotherapy Clinic",  start:"12:00", end:"15:00", branch:"Lagos Island", day:5 },
  { specialty:"Orthopaedics",          start:"16:00", end:"18:00", branch:"Maryland",     day:5 },
];
 
// ════════════════════════════════════════════════════
//  COLOUR MAP  — maps specialty name → CSS colour var
//  To change a colour, just edit the hex value here
// ════════════════════════════════════════════════════
const COLOURS = {
  "Dietician":            "#00838F",
  "ENT":                  "#BF360C",
  "Endocrinology":        "#2E7D32",
  "General Surgery":      "#1565C0",
  "Nephrologist":         "#4527A0",
  "Obs & Gynaecology":    "#AD1457",
  "Orthopaedics":         "#558B2F",
  "Paediatrics":          "#00695C",
  "Physician/Nephrology": "#283593",
  "Physiotherapy Clinic": "#E65100",
  "Psychiatric":          "#6A1B9A",
  "Urologist":            "#0277BD",
};
 
// ════════════════════════════════════════════════════
//  GRID CONFIG
// ════════════════════════════════════════════════════
const START_HOUR = 8;       // 8:00 am
const END_HOUR   = 18;      // 6:00 pm (last slot)
const SLOT_MIN   = 15;      // each row = 15 minutes
const ROW_H      = 36;      // px per slot
const DAYS       = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 
function timeToSlot(t) {
  const [h, m] = t.split(':').map(Number);
  return (h - START_HOUR) * (60 / SLOT_MIN) + m / SLOT_MIN;
}
function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h < 12 ? 'am' : 'pm';
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2,'0')} ${ampm}`;
}
 
// ── Build the grid ──
function buildGrid() {
  const body = document.getElementById('calBody');
  body.innerHTML = '';
 
  const totalSlots = (END_HOUR - START_HOUR) * (60 / SLOT_MIN);
 
  // Create one row per 15-min slot
  for (let s = 0; s < totalSlots; s++) {
    const h = START_HOUR + Math.floor(s * SLOT_MIN / 60);
    const m = (s * SLOT_MIN) % 60;
    const isHour = m === 0;
    const labelText = isHour ? formatTime(`${h}:00`) : (m === 30 ? '' : '');
 
    const row = document.createElement('div');
    row.className = 'cal-row' + (isHour ? ' major' : '');
    row.dataset.slot = s;
    row.style.height = ROW_H + 'px';
 
    // Time label cell
    const tl = document.createElement('div');
    tl.className = 'time-label' + (isHour ? '' : ' minor');
    tl.textContent = labelText;
    row.appendChild(tl);
 
    // 6 day cells
    for (let d = 0; d < 6; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
 
  // Lay appointments on top using absolute positioning within each column
  // We build 6 column overlay containers
  const grid = document.createElement('div');
  grid.style.cssText = 'position:absolute;top:0;left:72px;right:0;bottom:0;display:grid;grid-template-columns:repeat(6,1fr);pointer-events:none';
  body.style.position = 'relative';
 
  for (let d = 0; d < 6; d++) {
    const col = document.createElement('div');
    col.className = 'day-col';
    col.id = `col-${d}`;
    col.style.cssText = `position:relative;height:${totalSlots * ROW_H}px;pointer-events:none`;
    grid.appendChild(col);
  }
  body.appendChild(grid);
 
  // Render each appointment
  SCHEDULE.forEach((appt, idx) => {
    const col = document.getElementById(`col-${appt.day}`);
    if (!col) return;
 
    const startSlot = timeToSlot(appt.start);
    const endSlot   = timeToSlot(appt.end);
    const heightSlots = endSlot - startSlot;
 
    const el = document.createElement('div');
    el.className = 'appt' + (heightSlots >= 4 ? ' tall' : '');
    el.dataset.specialty = appt.specialty;
    el.dataset.branch    = appt.branch;
    el.dataset.idx       = idx;
    el.style.cssText = `
      top: ${startSlot * ROW_H + 3}px;
      height: ${heightSlots * ROW_H - 6}px;
      background: ${COLOURS[appt.specialty] || '#002B5C'};
      pointer-events: auto;
    `;
    el.innerHTML = `
      <div class="appt__name">${appt.specialty}</div>
      <div class="appt__time">${formatTime(appt.start)} – ${formatTime(appt.end)}</div>
      ${heightSlots >= 3 ? `<div class="appt__branch">${appt.branch}</div>` : ''}
    `;
    el.title = `${appt.specialty}\n${formatTime(appt.start)} – ${formatTime(appt.end)}\n${appt.branch}`;
    col.appendChild(el);
  });
}
 
// ── Build legend ──
function buildLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';
  const specs = [...new Set(SCHEDULE.map(s => s.specialty))].sort();
  specs.forEach(spec => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${COLOURS[spec] || '#002B5C'}"></span>${spec}`;
    legend.appendChild(item);
  });
}
 
// ── Filter ──
function applyFilter() {
  const spec   = document.getElementById('filterSpecialty').value;
  const branch = document.getElementById('filterBranch').value;
 
  const appts = document.querySelectorAll('.appt');
  let visible = 0;
  appts.forEach(el => {
    const matchSpec   = spec   === 'all' || el.dataset.specialty === spec;
    const matchBranch = branch === 'all' || el.dataset.branch    === branch;
    if (matchSpec && matchBranch) {
      el.classList.remove('filtered-out');
      visible++;
    } else {
      el.classList.add('filtered-out');
    }
  });
  const count = document.getElementById('ctrlCount');
  count.innerHTML = `<strong>${visible}</strong> clinic${visible !== 1 ? 's' : ''} visible`;
}
 
// Only add filter listeners if the dropdowns exist (e.g., on the Booking or Search page)
const specialtyFilter = document.getElementById('filterSpecialty');
const branchFilter = document.getElementById('filterBranch');

if (specialtyFilter) {
    specialtyFilter.addEventListener('change', applyFilter);
}

if (branchFilter) {
    branchFilter.addEventListener('change', applyFilter);
}
// ── Highlight today ──
function highlightToday() {
  const day = new Date().getDay(); // 0=Sun
  const map = {1:0, 2:1, 3:2, 4:3, 5:4, 6:5};
  if (map[day] !== undefined) {
    const hdr = document.getElementById(`hdr-${map[day]}`);
    if (hdr) hdr.classList.add('today');
  }
}
 

// ── Init (Safe Version) ──
// We check for 'calBody' because that's where the table lives!
if (document.getElementById('calBody')) {
    console.log("📅 Schedule found! Building grid...");
    buildGrid();
    buildLegend();
    highlightToday();
} else {
    console.log("ℹ️ Schedule container (calBody) not found. Skipping grid initialization.");
}
})();


// js for the Telemedicine page
 (function () {
 
      // Scroll reveal
      const teleRevealEls = document.querySelectorAll('.reveal');
      if (teleRevealEls.length > 0) {
        const teleObs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              teleObs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });
 
        teleRevealEls.forEach(el => teleObs.observe(el));
      }
 
      // Mock video call timer — counts up to sell the live feel
      const timerEl = document.getElementById('teleTimer');
      if (timerEl) {
        let secs = 0;
        setInterval(() => {
          secs++;
          const m = String(Math.floor(secs / 60)).padStart(2, '0');
          const s = String(secs % 60).padStart(2, '0');
          timerEl.textContent = m + ':' + s;
        }, 1000);
      }
 
    })();

    // js for elderly prepaid 
     (function () {

      // Scroll reveal
      const epRevealEls = document.querySelectorAll('.reveal');
      if (epRevealEls.length > 0) {
        const epObs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              epObs.unobserve(entry.target);
            }
          });
        }, { threshold: 0.10, rootMargin: '0px 0px -40px 0px' });

        epRevealEls.forEach(el => epObs.observe(el));
      }


      // Form submit
      const epSubmitBtn = document.getElementById('epSubmitBtn');
      if (epSubmitBtn) {
        epSubmitBtn.addEventListener('click', function () {
          const name    = document.getElementById('ep-name').value.trim();
          const phone   = document.getElementById('ep-phone').value.trim();
          const email   = document.getElementById('ep-email').value.trim();
          const age     = document.getElementById('ep-age').value;
          const consent = document.getElementById('ep-consent').checked;

          if (!name || !phone || !email || !age) {
            this.style.background = '#A32D2D';
            this.textContent = 'Please fill all required fields';
            setTimeout(() => {
              this.style.background = '';
              this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Submit Enquiry';
            }, 2500);
            return;
          }

          if (!consent) {
            this.style.background = '#A32D2D';
            this.textContent = 'Please tick the consent box';
            setTimeout(() => {
              this.style.background = '';
              this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Submit Enquiry';
            }, 2500);
            return;
          }

          // Success
          this.style.background = '#0F6E56';
          this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> Submitted! We\'ll be in touch soon.';
          this.disabled = true;

          // Clear form
          ['ep-name','ep-phone','ep-email'].forEach(id => document.getElementById(id).value = '');
          document.getElementById('ep-age').selectedIndex = 0;
          document.getElementById('ep-consent').checked = false;
        });
      }

    })();

    (function () {
      // this is the contact form jsoooo
          document.getElementById('ctSendBtn').addEventListener('click', function() {
          const fname = document.getElementById('ct-fname').value.trim();
          const phone = document.getElementById('ct-phone').value.trim();
          const email = document.getElementById('ct-email').value.trim();
          const subject = document.getElementById('ct-subject').value;
          if (!fname || !phone || !email || !subject) {
            this.style.background = '#A32D2D'; this.textContent = 'Please fill required fields';
            setTimeout(() => { this.style.background = ''; this.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2.5;stroke-linecap:round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Message'; }, 2400);
            return;
          }
          this.disabled = true; this.textContent = 'Sending…';
          setTimeout(() => {
            document.getElementById('ctFormContent').style.display = 'none';
            document.getElementById('ctFormSuccess').style.display = 'block';
          }, 1000);
        });

        // Reveal
        const obs = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
        }, { threshold:0.10 });
        document.querySelectorAll('.ct-reveal').forEach(el => obs.observe(el));

       })();

    