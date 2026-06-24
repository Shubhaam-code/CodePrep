(function() {
  try {
    const models = window.monaco?.editor?.getModels();
    if (models && models.length > 0) {
      const codeModel = models.find(m => {
        const lang = (m.getLanguageId?.() || m.getModeId?.() || "").toLowerCase();
        return lang && lang !== 'plaintext';
      }) || models[0];

      window.postMessage({
        type: 'RESPONSE_MONACO_CODE',
        code: codeModel.getValue(),
        languageId: codeModel.getLanguageId?.() || codeModel.getModeId?.(),
        modelsCount: models.length
      }, '*');
    } else {
      window.postMessage({ type: 'RESPONSE_MONACO_CODE_FAILED', modelsCount: 0 }, '*');
    }
  } catch (e) {
    window.postMessage({ type: 'RESPONSE_MONACO_CODE_FAILED', modelsCount: 0, error: e.message }, '*');
  }
})();
