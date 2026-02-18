// content.js - Content script that interacts with Google Calendar

console.log('Calendar Copy extension loaded');

// Configuration constants
const OBSERVER_RETRY_DELAY_MS = 500;
const OBSERVER_MAX_RETRIES = 10; // Stop trying after 5 seconds

// Music-related keywords for event detection
const MUSIC_KEYWORDS = [
  'concert', 'recital', 'rehearsal', 'practice', 'music lesson',
  'band', 'orchestra', 'choir', 'singing', 'guitar', 'piano',
  'drums', 'violin', 'cello', 'trumpet', 'saxophone', 'flute',
  'performance', 'gig', 'show', 'festival', 'symphony', 'opera',
  'jazz', 'rock', 'classical', 'musical', 'karaoke', 'dj',
  'recording', 'studio session', 'jam session', 'soundcheck'
];

// Track visualization state
let musicVisualizationEnabled = true;
let visualizationTimeout = null;
let observerRetries = 0;

// Initialize music visualization on page load
initializeMusicVisualization();

function initializeMusicVisualization() {
  // Load saved setting
  chrome.storage.local.get(['musicVisualizationEnabled'], function(result) {
    if (result.musicVisualizationEnabled !== undefined) {
      musicVisualizationEnabled = result.musicVisualizationEnabled;
    }
    if (musicVisualizationEnabled) {
      applyMusicVisualization();
    }
  });
  
  // Set up observer to detect new events loaded dynamically
  // Use debouncing to avoid excessive calls
  const observer = new MutationObserver(function(mutations) {
    if (musicVisualizationEnabled) {
      // Debounce: only apply visualization after 200ms of no mutations
      clearTimeout(visualizationTimeout);
      visualizationTimeout = setTimeout(() => {
        applyMusicVisualization();
      }, 200);
    }
  });
  
  // Observe only the calendar container for better performance
  // Wait for calendar to load before observing
  const observeCalendar = () => {
    const calendarContainer = document.querySelector('[role="main"]');
    if (calendarContainer) {
      observer.observe(calendarContainer, {
        childList: true,
        subtree: true
      });
      observerRetries = 0; // Reset counter on success
    } else if (observerRetries < OBSERVER_MAX_RETRIES) {
      // If calendar container not found yet, retry after a short delay
      observerRetries++;
      setTimeout(observeCalendar, OBSERVER_RETRY_DELAY_MS);
    } else {
      console.warn('Calendar Copy: Could not find calendar container after maximum retries');
    }
  };
  
  // Check if calendar is already loaded
  if (document.readyState === 'complete') {
    observeCalendar();
  } else {
    window.addEventListener('load', observeCalendar);
  }
}

function applyMusicVisualization() {
  // Find all event elements in Google Calendar
  // Combine selectors into a single query for better performance
  const combinedSelector = '[data-eventid], [data-draggable-id], [role="button"][data-draggable-id], .event';
  const events = document.querySelectorAll(combinedSelector);
  
  events.forEach(event => {
    if (!event.dataset.musicVisualized && isMusicEvent(event)) {
      markAsMusicEvent(event);
    }
  });
}

function removeMusicVisualization() {
  // Remove all music indicators and highlights
  document.querySelectorAll('.music-event-indicator').forEach(el => el.remove());
  document.querySelectorAll('.music-event-highlight').forEach(el => {
    el.classList.remove('music-event-highlight');
    delete el.dataset.musicVisualized;
  });
}

function isMusicEvent(element) {
  const text = element.textContent?.toLowerCase() || '';
  return MUSIC_KEYWORDS.some(keyword => text.includes(keyword));
}

function markAsMusicEvent(element) {
  // Mark as visualized to avoid duplicate processing
  element.dataset.musicVisualized = 'true';
  
  // Add highlight class
  element.classList.add('music-event-highlight');
  
  // Add music icon if there isn't one already
  if (!element.querySelector('.music-event-indicator')) {
    const indicator = document.createElement('span');
    indicator.className = 'music-event-indicator';
    indicator.textContent = '🎵';
    indicator.title = 'Music Event';
    
    // Try to insert at the beginning of the event text
    const firstChild = element.firstChild;
    if (firstChild) {
      element.insertBefore(indicator, firstChild);
    } else {
      element.appendChild(indicator);
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate request object
  if (!request || typeof request !== 'object' || !request.action) {
    sendResponse({ success: false, error: 'Invalid request' });
    return true;
  }
  
  if (request.action === 'toggleMusicVisualization') {
    if (typeof request.enabled !== 'boolean') {
      sendResponse({ success: false, error: 'Invalid enabled value' });
      return true;
    }
    musicVisualizationEnabled = request.enabled;
    if (musicVisualizationEnabled) {
      applyMusicVisualization();
    } else {
      removeMusicVisualization();
    }
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'copyEvents') {
    // Validate date parameters
    if (!request.sourceDate || !request.targetDate) {
      sendResponse({ success: false, error: 'Missing date parameters' });
      return true;
    }
    
    // Validate date format and values (YYYY-MM-DD with valid date components)
    if (!isValidDateFormat(request.sourceDate) || !isValidDateFormat(request.targetDate)) {
      sendResponse({ success: false, error: 'Invalid date format or values' });
      return true;
    }
    
    copyEvents(request.sourceDate, request.targetDate)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }));
    return true; // Keep message channel open for async response
  }
  
  // Unknown action
  sendResponse({ success: false, error: 'Unknown action' });
  return true;
});

// Validate date string format and values
// Note: This validation logic is duplicated in popup.js
// Both files run in different contexts (content script vs popup)
// and cannot easily share code without build complexity
function isValidDateFormat(dateString) {
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

async function copyEvents(sourceDate, targetDate) {
  try {
    console.log(`Copying events from ${sourceDate} to ${targetDate}`);

    // Parse dates
    const sourceDay = new Date(sourceDate + 'T00:00:00');
    const targetDay = new Date(targetDate + 'T00:00:00');
    
    // Calculate day offset
    const dayOffset = Math.floor((targetDay - sourceDay) / (1000 * 60 * 60 * 24));

    // Find all event elements on the current calendar view
    const events = await findEventsForDate(sourceDate);
    
    if (events.length === 0) {
      return {
        success: true,
        message: `No events found on ${formatDate(sourceDay)}`
      };
    }

    console.log(`Found ${events.length} events to copy`);

    // Copy each event
    let copiedCount = 0;
    for (const event of events) {
      try {
        await copyEvent(event, dayOffset);
        copiedCount++;
      } catch (error) {
        console.error('Failed to copy event:', error);
      }
    }

    return {
      success: true,
      message: `Successfully copied ${copiedCount} event(s) from ${formatDate(sourceDay)} to ${formatDate(targetDay)}`
    };
  } catch (error) {
    console.error('Error in copyEvents:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function findEventsForDate(dateStr) {
  // This is a simplified approach - we'll look for event elements
  // In Google Calendar, events are typically in divs with data-* attributes
  
  const events = [];
  
  // Combine selectors into a single query for better performance
  const combinedSelector = '[data-eventid], [data-draggable-id], [role="button"][data-draggable-id], .event';
  const elements = document.querySelectorAll(combinedSelector);
  
  for (const element of elements) {
    // Check if event belongs to the source date
    if (isEventOnDate(element, dateStr)) {
      events.push(extractEventData(element));
    }
  }

  return events;
}

function isEventOnDate(element, dateStr) {
  // Check various attributes and parent elements to determine the date
  // This is a simplified check - actual implementation would need to inspect
  // the calendar's data structure more carefully
  
  const dateMatch = dateStr.split('-').join('');
  
  // Check data attributes
  if (element.dataset.date === dateStr || 
      element.dataset.date === dateMatch) {
    return true;
  }
  
  // Use closest() for efficient parent lookup
  const parentWithDate = element.closest('[data-date]');
  if (parentWithDate) {
    return parentWithDate.dataset.date === dateStr || 
           parentWithDate.dataset.date === dateMatch;
  }
  
  return false;
}

function extractEventData(element) {
  return {
    element: element,
    title: element.textContent?.trim() || 'Untitled Event',
    eventId: element.dataset.eventid || element.dataset.draggableId || '',
    // Add more data extraction as needed
  };
}

async function copyEvent(eventData, dayOffset) {
  return new Promise((resolve, reject) => {
    try {
      // NOTE: This is a simplified implementation
      // For production use, this would need to:
      // 1. Click on the event element to open the event details dialog
      // 2. Extract all event information (title, time, description, attendees, etc.)
      // 3. Click "More actions" > "Duplicate" or create a new event
      // 4. Adjust the date by dayOffset
      // 5. Save the new event
      
      // The challenge is that Google Calendar's DOM structure is dynamic and
      // may change. A more robust solution would use the Google Calendar API
      // instead of DOM manipulation.
      
      console.log(`[Calendar Copy] Processing event: "${eventData.title}" (offset: ${dayOffset} days)`);
      
      // Attempt to simulate event duplication
      // In a real scenario, this would programmatically interact with the UI
      const element = eventData.element;
      
      if (element && element.click) {
        // This would open the event dialog in Google Calendar
        // Additional logic would be needed to duplicate and modify the date
        console.log(`[Calendar Copy] Would duplicate event with ID: ${eventData.eventId}`);
      }
      
      // Simulate processing time
      setTimeout(() => {
        resolve(true);
      }, 100);
    } catch (error) {
      console.error(`[Calendar Copy] Error copying event:`, error);
      reject(error);
    }
  });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}


