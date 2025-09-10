chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  document.getElementById('title').textContent = message.data.title;
  document.getElementById('url').textContent = message.data.url;
  document.getElementById('content').textContent = message.data.content;
});
