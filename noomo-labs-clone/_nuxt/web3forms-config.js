/**
 * ============================================================================
 * Chaitanya 2k26 — Web3Forms Integration Config & Helper
 * ============================================================================
 * Web3Forms allows contact form submissions to be emailed directly to
 * chaitainyahptu@gmail.com without a backend server.
 *
 * To use a live key:
 * 1. Visit https://web3forms.com/ and generate a free access key for chaitainyahptu@gmail.com
 * 2. Paste your access key below or save it via localStorage.setItem('chaitanya_web3forms_key', 'YOUR_KEY')
 */

export const DEFAULT_WEB3FORMS_CONFIG = {
  // Replace with your Web3Forms Access Key from https://web3forms.com
  accessKey: "YOUR_WEB3FORMS_ACCESS_KEY",
  recipientEmail: "chaitainyahptu@gmail.com",
  fromName: "Chaitanya 2k26 Fest Portal",
  subjectPrefix: "Chaitanya 2k26 Inquiry",
};

/**
 * Retrieve active Web3Forms Access Key (supporting runtime localStorage override)
 */
export function getWeb3FormsKey() {
  if (typeof window !== "undefined") {
    if (window.__WEB3FORMS_KEY__) return window.__WEB3FORMS_KEY__;
    try {
      const saved = localStorage.getItem("chaitanya_web3forms_key");
      if (saved && saved.trim()) return saved.trim();
    } catch (e) {}
  }
  return DEFAULT_WEB3FORMS_CONFIG.accessKey;
}

/**
 * Check whether Web3Forms has a user-configured live key
 */
export function isWeb3FormsLive() {
  const key = getWeb3FormsKey();
  return Boolean(key && !key.includes("YOUR_WEB3FORMS_ACCESS_KEY") && key.length > 8);
}

/**
 * Submit form data to Web3Forms API
 */
export async function submitToWeb3Forms(formData) {
  const accessKey = getWeb3FormsKey();
  const isLive = isWeb3FormsLive();

  const payload = {
    access_key: accessKey,
    name: formData.name || "Anonymous",
    team_name: formData.team_name || "N/A",
    email: formData.email || "no-reply@chaitanya2k26.org",
    contact_no: formData.contact_no || "N/A",
    query: formData.query || formData.message || "",
    message: `Team: ${formData.team_name || "N/A"}\nContact No: ${formData.contact_no || "N/A"}\n\nQuery:\n${formData.query || formData.message || ""}`,
    subject: `[Chaitanya 2k26] Query from ${formData.name || "Participant"} (Team: ${formData.team_name || "Individual"})`,
    from_name: DEFAULT_WEB3FORMS_CONFIG.fromName,
  };

  if (isLive) {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (response.ok && result.success) {
      return { success: true, mode: "live", result };
    } else {
      throw new Error(result.message || "Failed to deliver message via Web3Forms.");
    }
  } else {
    // Demo Mode Simulation: Simulates network transmission latency for immediate testing
    console.log("[Web3Forms Demo Mode] Form payload:", payload);
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      success: true,
      mode: "demo",
      notice: "Demo mode: Connect your Web3Forms access key in _nuxt/web3forms-config.js for live email dispatch.",
    };
  }
}
