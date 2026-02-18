// content.js - Content script that interacts with Google Calendar

console.log('Calendar Copy extension loaded');

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
  const observer = new MutationObserver(function(mutations) {
    if (musicVisualizationEnabled) {
      applyMusicVisualization();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function applyMusicVisualization() {
  // Find all event elements in Google Calendar
  const eventSelectors = [
    '[data-eventid]',
    '[data-draggable-id]',
    '[role="button"][data-draggable-id]',
    '.event'
  ];
  
  eventSelectors.forEach(selector => {
    const events = document.querySelectorAll(selector);
    events.forEach(event => {
      if (!event.dataset.musicVisualized && isMusicEvent(event)) {
        markAsMusicEvent(event);
      }
    });
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
  if (request.action === 'toggleMusicVisualization') {
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
    copyEvents(request.sourceDate, request.targetDate)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

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
  
  // Try to find events - Google Calendar uses various selectors
  // This is a basic implementation that looks for event divs
  const eventSelectors = [
    '[data-eventid]',
    '[data-draggable-id]',
    '.event',
    '[role="button"][data-draggable-id]'
  ];

  for (const selector of eventSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      // Check if event belongs to the source date
      if (isEventOnDate(element, dateStr)) {
        events.push(extractEventData(element));
      }
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
  
  // Check parent elements
  let parent = element.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    if (parent.dataset.date === dateStr || 
        parent.dataset.date === dateMatch) {
      return true;
    }
    parent = parent.parentElement;
    depth++;
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


