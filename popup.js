// popup.js - Handles the extension popup UI interactions

// Configuration constants
const MESSAGE_TIMEOUT_MS = 30000; // 30 seconds

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

// Validate date string format
function isValidDate(dateString) {
  try {
    // Check format first
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return false;
    }
    
    // Parse date components directly to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Verify the date components match (handles invalid dates like 2024-13-45)
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const sourceDate = document.getElementById('sourceDate');
  const targetDate = document.getElementById('targetDate');
  const copyBtn = document.getElementById('copyBtn');
  const statusDiv = document.getElementById('status');
  const musicVisualization = document.getElementById('musicVisualization');

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  sourceDate.value = today;
  targetDate.value = today;

  // Load saved dates and settings from storage
  chrome.storage.local.get(['sourceDate', 'targetDate', 'musicVisualizationEnabled'], function(result) {
    if (result.sourceDate) sourceDate.value = result.sourceDate;
    if (result.targetDate) targetDate.value = result.targetDate;
    if (result.musicVisualizationEnabled !== undefined) {
      musicVisualization.checked = result.musicVisualizationEnabled;
    }
  });

  // Save dates when changed
  sourceDate.addEventListener('change', function() {
    chrome.storage.local.set({ sourceDate: sourceDate.value });
  });

  targetDate.addEventListener('change', function() {
    chrome.storage.local.set({ targetDate: targetDate.value });
  });

  // Save music visualization setting and apply it
  musicVisualization.addEventListener('change', function() {
    const enabled = musicVisualization.checked;
    chrome.storage.local.set({ musicVisualizationEnabled: enabled });
    
    // Send message to content script to apply/remove visualization
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0] && isGoogleCalendarUrl(tabs[0].url)) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleMusicVisualization',
          enabled: enabled
        }).catch((error) => {
          // Log error for debugging if calendar page isn't ready
          console.log('Could not toggle music visualization:', error.message);
        });
      }
    });
  });

  // Handle copy button click
  copyBtn.addEventListener('click', async function() {
    const source = sourceDate.value;
    const target = targetDate.value;

    if (!source || !target) {
      showStatus('Please select both source and target dates', 'error');
      return;
    }

    // Validate date formats
    if (!isValidDate(source) || !isValidDate(target)) {
      showStatus('Please enter valid dates', 'error');
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

      // Send message to content script with timeout
      const response = await Promise.race([
        chrome.tabs.sendMessage(tab.id, {
          action: 'copyEvents',
          sourceDate: source,
          targetDate: target
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), MESSAGE_TIMEOUT_MS)
        )
      ]);

      if (response && response.success) {
        showStatus(response.message || 'Events copied successfully!', 'success');
      } else {
        showStatus(response?.error || 'Failed to copy events', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg = error.message === 'Request timeout' 
        ? 'Request timed out. Please try again.' 
        : 'Error: ' + error.message;
      showStatus(errorMsg, 'error');
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
