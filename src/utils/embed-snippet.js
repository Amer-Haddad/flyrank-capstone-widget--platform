function createEmbedSnippet(widgetId, version = 1) {
  const baseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, "");
  return `<script src="${baseUrl}/widget.js?id=${encodeURIComponent(widgetId)}&v=${encodeURIComponent(version)}"></script>`;
}

module.exports = {
  createEmbedSnippet,
};
