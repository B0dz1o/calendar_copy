# Calendar Copy - Chrome Extension

A simple Google Chrome extension that allows you to copy events from one date to another in Google Calendar.

## Features

- 📅 Copy all events from a source date to a target date
- 🎯 Simple and intuitive user interface
- ✨ Works directly with Google Calendar
- 💾 Remembers your last selected dates

## Installation

### Install from Source

1. **Download or Clone this Repository**
   ```bash
   git clone https://github.com/B0dz1o/calendar_copy.git
   cd calendar_copy
   ```

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click Menu (⋮) → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

4. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `calendar_copy` folder (the one containing `manifest.json`)
   - The Calendar Copy extension should now appear in your extensions list

## Usage

1. **Open Google Calendar**
   - Navigate to [Google Calendar](https://calendar.google.com)
   - Make sure you're logged in to your Google account

2. **Open the Extension**
   - Click the Calendar Copy extension icon in your browser toolbar
   - If you don't see the icon, click the puzzle piece icon and pin Calendar Copy

3. **Select Dates**
   - **Source Date**: Select the date you want to copy events FROM
   - **Target Date**: Select the date you want to copy events TO

4. **Copy Events**
   - Click the "Copy Events" button
   - The extension will copy all events from the source date to the target date
   - You'll see a success message when complete

## How It Works

The extension uses:
- **Manifest V3**: Latest Chrome extension architecture
- **Content Scripts**: To interact with Google Calendar's web interface
- **Chrome Storage API**: To remember your date selections
- **Chrome Tabs API**: To communicate between popup and calendar page

## File Structure

```
calendar_copy/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface
├── popup.js           # Popup logic and event handling
├── content.js         # Content script for Google Calendar interaction
├── styles.css         # UI styling
├── icons/            # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md         # This file
```

## Requirements

- Google Chrome (or Chromium-based browser)
- Active internet connection
- Google Calendar account

## Limitations & Current Implementation

**Current State**: This is a basic implementation that provides the UI framework and structure for a calendar event copying extension.

**What Works**:
- ✅ Extension loads and runs on Google Calendar
- ✅ Date selection and UI interactions
- ✅ Communication between popup and content script
- ✅ Basic event detection framework

**Implementation Notes**:
- The current version provides a foundation for event copying functionality
- Event detection uses basic DOM selectors that work with Google Calendar's structure
- For production use, you may want to:
  - Use the Google Calendar API for more reliable event copying
  - Add OAuth2 authentication for API access
  - Implement more robust event data extraction
  - Handle recurring events, reminders, and attendees
  - Add error handling for edge cases

**Technical Limitations**:
- Works only with Google Calendar web interface
- DOM-based detection may need updates if Google Calendar changes its structure
- Requires manual testing for each Google Calendar update

## Troubleshooting

**Extension icon doesn't appear**
- Make sure the extension is enabled in `chrome://extensions/`
- Try pinning the extension by clicking the puzzle icon

**"Please open Google Calendar first" message**
- Navigate to calendar.google.com before using the extension
- Make sure you're on the calendar page, not Gmail or other Google services

**Events not copying**
- Ensure you're logged in to Google Calendar
- Try refreshing the calendar page
- Check that events exist on the source date

## Privacy

This extension:
- Only runs on calendar.google.com
- Does not collect or transmit any personal data
- Only stores your date selections locally in your browser
- Does not communicate with external servers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions, please open an issue on GitHub.
