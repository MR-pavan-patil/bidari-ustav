/* ==========================================================================
   BIDARI UTSAV - SINGLE SOURCE REUSABLE FOOTER COMPONENT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  renderFooter();
});

function renderFooter() {
  const footerContainer = document.getElementById('site-footer');
  if (!footerContainer) return;

  const currentYear = new Date().getFullYear();

  footerContainer.className = 'site-footer-component';
  footerContainer.innerHTML = `
    <div class="container">
      <!-- 4 Columns Grid -->
      <div class="footer-columns-grid">
        <!-- Col 1: Brand Info & Socials -->
        <div>
          <img src="assets/images/BIDARI Logo With Name (1)-Photoroom.png" alt="Bidari Utsav Logo" style="height: 52px; margin-bottom: 1.2rem;" loading="lazy">
          <p style="color: var(--silver); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.2rem;">
            Bidari Utsav is an annual cultural event held in Bidar, Karnataka, celebrating the rich history, music, and traditions of the region. Join us for a memorable experience!
          </p>
          <div class="footer-social-bar">
            <a href="https://www.facebook.com/share/r/1AyGxPVYs6/" target="_blank" rel="noopener" class="footer-social-btn" aria-label="Facebook">
              <i data-lucide="facebook"></i>
            </a>
            <a href="https://www.instagram.com/rekhasowdi?igsh=MWRhOGdlMndjMGU0Zw==" target="_blank" rel="noopener" class="footer-social-btn" aria-label="Instagram">
              <i data-lucide="instagram"></i>
            </a>
            <a href="https://youtube.com/@rekhasowdibidar4630?si=plaLQQukUVj03nqn" target="_blank" rel="noopener" class="footer-social-btn" aria-label="YouTube">
              <i data-lucide="youtube"></i>
            </a>
          </div>
        </div>

        <!-- Col 2: Quick Links -->
        <div>
          <h4 class="footer-col-title">Quick Links</h4>
          <ul class="footer-col-links">
            <li><a href="index.html">Home</a></li>
            <li><a href="commit.html">About us</a></li>
            <li><a href="Event.html">Events</a></li>
            <li><a href="Event.html">Gallery</a></li>
            <li><a href="index.html#contact">Contact</a></li>
          </ul>
        </div>

        <!-- Col 3: Gallery Links -->
        <div>
          <h4 class="footer-col-title">Gallery & Media</h4>
          <ul class="footer-col-links">
            <li><a href="Event.html">Photos</a></li>
            <li><a href="event videos.html">Videos</a></li>
            <li><a href="paper.html">Paper Cuts</a></li>
            <li><a href="2025 video.html">2025-26 Highlights</a></li>
            <li><a href="madam.html">Rekha Sowdi</a></li>
          </ul>
        </div>

        <!-- Col 4: Contact Us -->
        <div>
          <h4 class="footer-col-title">Contact Us</h4>
          <div style="color: var(--silver); font-size: 0.95rem; line-height: 1.7;">
            <p style="margin-bottom: 0.6rem;">
              <strong>Phone:</strong><br>
              <a href="tel:+919481294296" style="color: var(--gold-soft);">+91 9481294296</a> / 
              <a href="tel:+919343205160" style="color: var(--gold-soft);">+91 9343205160</a>
            </p>
            <p style="margin-bottom: 0.6rem;">
              <strong>Email:</strong><br>
              <a href="mailto:bidarivedike@gmail.com" style="color: var(--gold-soft);">bidarivedike@gmail.com</a>
            </p>
            <p style="font-size: 0.88rem; color: var(--muted); margin-top: 0.8rem;">
              C/o Smt. Rekha Sowdi SOWDI SADANA Anand Nagar, Behind Petrol Pump, Bidar-585401 Karnataka State
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="footer-bottom-bar">
        <p>&copy; <span id="footer-year">${currentYear}</span> Bidari Utsav. All rights reserved. | Bidari Cultural Forum, Bidar</p>
        <button class="back-to-top-btn" onclick="window.scrollTo({top: 0, behavior: 'smooth'})" aria-label="Back to Top">
          <i data-lucide="chevron-up"></i>
        </button>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

