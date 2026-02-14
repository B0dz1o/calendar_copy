// popup.js - Handles the extension popup UI interactions

document.addEventListener('DOMContentLoaded', function() {
  const sourceDate = document.getElementById('sourceDate');
  const targetDate = document.getElementById('targetDate');
  const copyBtn = document.getElementById('copyBtn');
  const statusDiv = document.getElementById('status');

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  sourceDate.value = today;
  targetDate.value = today;

  // Load saved dates from storage
  chrome.storage.local.get(['sourceDate', 'targetDate'], function(result) {
    if (result.sourceDate) sourceDate.value = result.sourceDate;
    if (result.targetDate) targetDate.value = result.targetDate;
  });

  // Save dates when changed
  sourceDate.addEventListener('change', function() {
    chrome.storage.local.set({ sourceDate: sourceDate.value });
  });

  targetDate.addEventListener('change', function() {
    chrome.storage.local.set({ targetDate: targetDate.value });
  });

  // Handle copy button click
  copyBtn.addEventListener('click', async function() {
    const source = sourceDate.value;
    const target = targetDate.value;

    if (!source || !target) {
      showStatus('Please select both source and target dates', 'error');
      return;
    }

    if (source === target) {
      showStatus('Source and target dates must be different', 'error');
      return;
    }

    try {
      // Check if current tab is Google Calendar
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('calendar.google.com')) {
        showStatus('Please open Google Calendar first', 'error');
        return;
      }

      // Disable button while processing
      copyBtn.disabled = true;
      showStatus('Copying events...', 'info');

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'copyEvents',
        sourceDate: source,
        targetDate: target
      });

      if (response && response.success) {
        showStatus(response.message || 'Events copied successfully!', 'success');
      } else {
        showStatus(response?.error || 'Failed to copy events', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      copyBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status show ' + type;
    
    // Auto-hide after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.className = 'status';
      }, 5000);
    }
  }
});
