// Studio Zedward Analytics
// Replace with your actual analytics provider (Plausible, Fathom, Umami, or Google Analytics)
//
// Recommended: Plausible (privacy-friendly, no cookies, GDPR-compliant out of the box)
// Add this to <head> on every page:
//   <script defer data-domain="studiozedward.com" src="https://plausible.io/js/script.js"></script>
//
// Alternative: Umami (self-hosted, also privacy-friendly)
//   <script async src="https://your-umami-instance.com/script.js" data-website-id="YOUR-ID"></script>

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log(`[Analytics] Page view: ${window.location.pathname}`);
}
