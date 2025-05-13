export async function getCallDetails(callId: string) {
  const response = await fetch(
    `${process.env.JUSTCALL_API_URL}/calls_ai/${callId}?platform=justcall&fetch_transcription=true&fetch_summary=true&fetch_ai_insights=true&fetch_action_items=true&fetch_smart_chapters=true`,
    {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.8",
        authorization:
          "dd230c7ea54842340e49f36768ef8da1ff6aaaca:cbb0d0e9ad537ec8b991167611cc619b4a5cb337",
        priority: "u=1, i",
        "sec-ch-ua":
          '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "x-readme-api-explorer": "5.351.0",
      },
      referrer: "https://developer.justcall.io/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: null,
      method: "GET",
      mode: "cors",
      credentials: "include",
    }
  );
  const data = await response.json();
  return data;
}
