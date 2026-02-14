# Installation Guide

## Step-by-Step Installation

### 1. Download the Extension

You can either:
- **Option A**: Clone the repository
  ```bash
  git clone https://github.com/B0dz1o/calendar_copy.git
  cd calendar_copy
  ```
  
- **Option B**: Download as ZIP
  - Go to https://github.com/B0dz1o/calendar_copy
  - Click the green "Code" button
  - Click "Download ZIP"
  - Extract the ZIP file to a folder on your computer

### 2. Open Chrome Extensions Page

1. Open Google Chrome
2. Click the menu icon (⋮) in the top-right corner
3. Navigate to **More Tools** → **Extensions**
4. Or simply type `chrome://extensions/` in the address bar

### 3. Enable Developer Mode

1. Look for the **Developer mode** toggle in the top-right corner
2. Click to enable it (it should turn blue)

### 4. Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Browse to the folder containing the extension files
3. Select the `calendar_copy` folder (the one containing `manifest.json`)
4. Click **"Select Folder"** or **"Open"**

### 5. Verify Installation

1. You should see "Calendar Copy" in your extensions list
2. The extension icon should appear in your toolbar
3. If you don't see it, click the puzzle piece icon and pin "Calendar Copy"

## Using the Extension

### First Time Use

1. **Navigate to Google Calendar**
   - Go to https://calendar.google.com
   - Make sure you're logged in

2. **Open the Extension**
   - Click the Calendar Copy icon in your toolbar
   - The popup will appear

3. **Select Dates**
   - **Source Date**: The date you want to copy events FROM
   - **Target Date**: The date you want to copy events TO
   - Both dates must be different

4. **Copy Events**
   - Click the blue "Copy Events" button
   - Wait for the confirmation message

### Tips for Best Results

- Make sure you're on the Google Calendar page when using the extension
- The extension works best in Month or Week view
- Refresh the calendar page if you don't see the copied events immediately
- Check the browser console (F12) for detailed logs if something goes wrong

## Troubleshooting

### Extension not loading
- Make sure all files are in the same folder
- Check that `manifest.json` is in the root of the selected folder
- Disable and re-enable the extension
- Try reloading the extension (click the refresh icon on the extension card)

### "Please open Google Calendar first" message
- Ensure you're on `calendar.google.com`, not another Google service
- The extension only works on Google Calendar pages
- Try refreshing the calendar page

### Events not appearing
- Check if events exist on the source date
- Refresh the Google Calendar page
- Try copying again
- Check browser console for error messages

### Extension icon not visible
- Click the puzzle piece icon in Chrome toolbar
- Find "Calendar Copy" in the list
- Click the pin icon to keep it visible

## Uninstalling

To remove the extension:
1. Go to `chrome://extensions/`
2. Find "Calendar Copy"
3. Click "Remove"
4. Confirm the removal

## Updating

To update to a newer version:
1. Download the latest version
2. Go to `chrome://extensions/`
3. Find "Calendar Copy"
4. Click the refresh icon (↻)
5. Or remove and reinstall following the installation steps above

## Privacy & Permissions

The extension requires:
- **activeTab**: To interact with the current Google Calendar tab
- **scripting**: To run scripts on Google Calendar pages
- **storage**: To remember your date selections
- **host_permissions**: Only for calendar.google.com

All data is stored locally in your browser. Nothing is sent to external servers.

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub: https://github.com/B0dz1o/calendar_copy/issues
- Check existing issues for solutions
- Provide details about your Chrome version and error messages
