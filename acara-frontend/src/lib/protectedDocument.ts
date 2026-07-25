import api from "./Api";

export const openProtectedDocument = async (endpoint: string): Promise<void> => {
  const previewWindow = window.open("", "_blank");

  if (previewWindow) {
    previewWindow.opener = null;
    previewWindow.document.title = "Loading secure document...";
    previewWindow.document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:24px;color:#475569">Loading secure document...</p>';
  }

  try {
    const response = await api.get<Blob>(endpoint, {
      responseType: "blob",
    });
    const documentUrl = URL.createObjectURL(response.data);

    if (previewWindow) {
      previewWindow.location.replace(documentUrl);
    } else {
      const link = document.createElement("a");
      link.href = documentUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }

    window.setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
};
