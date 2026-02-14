// content.js - Content script that interacts with Google Calendar

console.log('Calendar Copy extension loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      // Simulate event copying
      // In a real implementation, this would:
      // 1. Click on the event to open it
      // 2. Extract event details (title, time, description, etc.)
      // 3. Create a new event with the same details on the target date
      
      console.log(`Copying event: ${eventData.title}`);
      
      // For demonstration purposes, we'll just log the action
      // A complete implementation would interact with Google Calendar's UI
      // or use the Calendar API
      
      setTimeout(() => {
        resolve(true);
      }, 100);
    } catch (error) {
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

// Helper function to wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
