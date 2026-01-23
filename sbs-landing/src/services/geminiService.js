// Gemini API Integration Service
// This service proxies requests through the backend to avoid exposing API keys

const API_BASE_URL = window.SBS_API_URL || window.location.origin;

export async function callGemini(prompt, systemInstruction = "") {
  const fetchWithRetry = async (retries = 5, delay = 1000) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gemini/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(retries - 1, delay * 2);
      }
      throw error;
    }
  };

  return await fetchWithRetry();
}
