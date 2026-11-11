const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const apiBaseUrl = (
  configuredApiUrl || "http://localhost:5000/api"
).replace(/\/+$/, "");

export const API_URL = /\/api$/i.test(apiBaseUrl)
  ? apiBaseUrl
  : `${apiBaseUrl}/api`;

export async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("json")) {
    const body = await response.text();

    if (body.trimStart().startsWith("<")) {
      throw new Error(
        "The API returned an HTML page instead of JSON. Check that VITE_API_URL points to the backend server and that the backend is running."
      );
    }

    throw new Error("The API returned an unexpected response.");
  }

  return response.json();
}
