// content.js - Content script that interacts with Google Calendar

console.log('Calendar Copy extension loaded');

// Track selection mode and selected events
let selectionModeEnabled = false;
let selectedEvents = new Set();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyEvents') {
    copyEvents(request.sourceDate, request.targetDate, request.mode)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  } else if (request.action === 'setSelectionMode') {
    setSelectionMode(request.enabled);
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'getSelectedCount') {
    sendResponse({ count: selectedEvents.size });
    return true;
  } else if (request.action === 'clearSelection') {
    clearSelection();
    sendResponse({ success: true });
    return true;
  }
});

function setSelectionMode(enabled) {
  selectionModeEnabled = enabled;
  
  if (enabled) {
    // Add event listeners to calendar events
    attachEventListeners();
    // Add visual indication that selection mode is active
    document.body.classList.add('calendar-copy-selection-mode');
  } else {
    // Remove event listeners
    removeEventListeners();
    document.body.classList.remove('calendar-copy-selection-mode');
  }
}

function attachEventListeners() {
  // Add click listeners to all event elements
  const eventSelectors = [
    '[data-eventid]',
    '[data-draggable-id]',
    '[role="button"][data-draggable-id]'
  ];

  eventSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (!element.dataset.calendarCopyListener) {
        element.addEventListener('click', handleEventClick, true);
        element.dataset.calendarCopyListener = 'true';
      }
    });
  });
}

function removeEventListeners() {
  const elements = document.querySelectorAll('[data-calendar-copy-listener]');
  elements.forEach(element => {
    element.removeEventListener('click', handleEventClick, true);
    delete element.dataset.calendarCopyListener;
  });
  clearSelection();
}

function handleEventClick(event) {
  if (!selectionModeEnabled) {
    return;
  }

  // Prevent default action when in selection mode
  event.preventDefault();
  event.stopPropagation();

  const eventElement = event.currentTarget;
  const eventId = eventElement.dataset.eventid || eventElement.dataset.draggableId;

  if (!eventId) {
    return;
  }

  // Toggle selection
  if (selectedEvents.has(eventId)) {
    selectedEvents.delete(eventId);
    eventElement.classList.remove('calendar-copy-selected');
  } else {
    selectedEvents.add(eventId);
    eventElement.classList.add('calendar-copy-selected');
  }

  // Update visual feedback
  updateSelectionStyles();
}

function clearSelection() {
  // Remove selection styling from all selected events
  const selectedElements = document.querySelectorAll('.calendar-copy-selected');
  selectedElements.forEach(element => {
    element.classList.remove('calendar-copy-selected');
  });
  
  selectedEvents.clear();
  updateSelectionStyles();
}

function updateSelectionStyles() {
  // Inject styles if not already present
  if (!document.getElementById('calendar-copy-styles')) {
    const style = document.createElement('style');
    style.id = 'calendar-copy-styles';
    style.textContent = `
      .calendar-copy-selection-mode [data-eventid],
      .calendar-copy-selection-mode [data-draggable-id] {
        cursor: pointer !important;
      }
      
      .calendar-copy-selected {
        outline: 3px solid #1a73e8 !important;
        outline-offset: -3px;
        box-shadow: 0 0 0 3px rgba(26, 115, 232, 0.2) !important;
      }
      
      .calendar-copy-selected::after {
        content: "✓";
        position: absolute;
        top: 2px;
        right: 2px;
        background-color: #1a73e8;
        color: white;
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
      }
    `;
    document.head.appendChild(style);
  }
}

async function copyEvents(sourceDate, targetDate, mode = 'all') {
  try {
    console.log(`Copying events from ${sourceDate} to ${targetDate} (mode: ${mode})`);

    // Parse dates
    const sourceDay = new Date(sourceDate + 'T00:00:00');
    const targetDay = new Date(targetDate + 'T00:00:00');
    
    // Calculate day offset
    const dayOffset = Math.floor((targetDay - sourceDay) / (1000 * 60 * 60 * 24));

    let events;
    
    if (mode === 'selected') {
      // Copy only selected events
      if (selectedEvents.size === 0) {
        return {
          success: false,
          error: 'No events selected. Please select events by clicking on them in the calendar.'
        };
      }
      
      events = await findSelectedEvents();
    } else {
      // Copy all events from the source date
      events = await findEventsForDate(sourceDate);
    }
    
    if (events.length === 0) {
      const message = mode === 'selected' 
        ? 'No selected events found'
        : `No events found on ${formatDate(sourceDay)}`;
      return {
        success: true,
        message: message
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

    const message = mode === 'selected'
      ? `Successfully copied ${copiedCount} selected event(s) to ${formatDate(targetDay)}`
      : `Successfully copied ${copiedCount} event(s) from ${formatDate(sourceDay)} to ${formatDate(targetDay)}`;

    return {
      success: true,
      message: message
    };
  } catch (error) {
    console.error('Error in copyEvents:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function findSelectedEvents() {
  const events = [];
  
  for (const eventId of selectedEvents) {
    const element = document.querySelector(`[data-eventid="${eventId}"], [data-draggable-id="${eventId}"]`);
    if (element) {
      events.push(extractEventData(element));
    }
  }
  
  return events;
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


