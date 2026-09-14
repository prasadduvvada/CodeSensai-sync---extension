(function () {
  function getEditorData() {
    if (window.monaco?.editor) {
      const models = window.monaco.editor.getModels();
      if (models.length > 0) {
        return {
          code: models[0].getValue(),
          language: models[0].getLanguageId() || 'javascript'
        };
      }
    }
    return { code: null, language: 'javascript' };
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || e.data?.type !== 'DSA_MENTOR_REQUEST_CODE') return;
    // Send back an object containing both the code and the language
    window.postMessage({ type: 'DSA_MENTOR_CODE_VALUE', data: getEditorData() }, '*');
  });
})();

(function interceptLeetCodeSubmissions() {
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    const url = args[0];
    
    // LeetCode specifically uses this endpoint to check if the submission passed
    if (typeof url === 'string' && url.includes('/submissions/detail/') && url.includes('/check/')) {
      const clone = response.clone();
      clone.json().then(data => {
        if (data.status_msg === "Accepted") {
          // Tell the React widget that a successful submission just occurred
          window.postMessage({ type: 'DSA_MENTOR_ACCEPTED_SUBMISSION' }, '*');
        }
      }).catch(e => console.error("DSA Mentor: Could not parse submission:", e));
    }
    return response;
  };
})();