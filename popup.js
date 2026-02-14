// popup.js - Handles the extension popup UI interactions

// Securely validate Google Calendar URLs
function isGoogleCalendarUrl(url) {
  try {
    const urlObj = new URL(url);
    // Check that the hostname is exactly calendar.google.com or a direct subdomain
    return urlObj.hostname === 'calendar.google.com' || 
           urlObj.hostname.endsWith('.calendar.google.com');
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const sourceDate = document.getElementById('sourceDate');
  const targetDate = document.getElementById('targetDate');
  const copyBtn = document.getElementById('copyBtn');
  const statusDiv = document.getElementById('status');
  const modeAll = document.getElementById('modeAll');
  const modeSelected = document.getElementById('modeSelected');
  const selectionInfo = document.getElementById('selectionInfo');
  const selectedCount = document.getElementById('selectedCount');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');

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

  // Handle mode change
  modeAll.addEventListener('change', function() {
    if (this.checked) {
      handleModeChange('all');
    }
  });

  modeSelected.addEventListener('change', function() {
    if (this.checked) {
      handleModeChange('selected');
    }
  });

  async function handleModeChange(mode) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !isGoogleCalendarUrl(tab.url)) {
        if (mode === 'selected') {
          showStatus('Please open Google Calendar to use selection mode', 'error');
          modeAll.checked = true;
        }
        return;
      }

      // Send mode change to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'setSelectionMode',
        enabled: mode === 'selected'
      });

      // Show/hide selection info
      if (mode === 'selected') {
        selectionInfo.style.display = 'block';
        updateSelectedCount();
        startCountPolling();
        showStatus('Click on events in the calendar to select them', 'info');
      } else {
        selectionInfo.style.display = 'none';
        stopCountPolling();
        statusDiv.className = 'status';
      }
    } catch (error) {
      console.error('Error changing mode:', error);
    }
  }

  // Update selected count
  async function updateSelectedCount() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !isGoogleCalendarUrl(tab.url)) {
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getSelectedCount'
      });

      if (response && response.count !== undefined) {
        selectedCount.textContent = response.count;
      }
    } catch (error) {
      console.error('Error getting selected count:', error);
    }
  }

  // Poll for selected count updates when in selection mode
  let countUpdateInterval = null;
  
  function startCountPolling() {
    if (countUpdateInterval) return;
    countUpdateInterval = setInterval(() => {
      if (modeSelected.checked && selectionInfo.style.display !== 'none') {
        updateSelectedCount();
      }
    }, 1000);
  }
  
  function stopCountPolling() {
    if (countUpdateInterval) {
      clearInterval(countUpdateInterval);
      countUpdateInterval = null;
    }
  }
  
  // Start/stop polling based on visibility
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      stopCountPolling();
    } else if (modeSelected.checked && selectionInfo.style.display !== 'none') {
      startCountPolling();
    }
  });
  
  // Start polling on load if in selection mode
  if (modeSelected.checked && selectionInfo.style.display !== 'none') {
    startCountPolling();
  }

  // Clear selection button
  clearSelectionBtn.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !isGoogleCalendarUrl(tab.url)) {
        return;
      }

      await chrome.tabs.sendMessage(tab.id, {
        action: 'clearSelection'
      });

      updateSelectedCount();
      showStatus('Selection cleared', 'info');
    } catch (error) {
      console.error('Error clearing selection:', error);
    }
  });

  // Handle copy button click
  copyBtn.addEventListener('click', async function() {
    const source = sourceDate.value;
    const target = targetDate.value;
    const copyMode = modeSelected.checked ? 'selected' : 'all';

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
      
      if (!tab.url || !isGoogleCalendarUrl(tab.url)) {
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
        targetDate: target,
        mode: copyMode
      });

      if (response && response.success) {
        showStatus(response.message || 'Events copied successfully!', 'success');
        // Clear selection after successful copy in selected mode
        if (copyMode === 'selected') {
          await chrome.tabs.sendMessage(tab.id, { action: 'clearSelection' });
          updateSelectedCount();
        }
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
