# Web App Guide

A simple web interface to interact with the Personal Errand Agent System through your browser!

## 🚀 Quick Start

### Step 1: Start the Server

```bash
# Make sure you've installed and built the project first
npm install
npm run build

# Start the server
npm start
```

The server will start on `http://localhost:4200`

### Step 2: Open the Web App

Open your browser and go to:

```
http://localhost:4200
```

That's it! You'll see the web interface.

## 🎨 What You'll See

The web app has a beautiful purple gradient interface with several interactive cards:

### 1. **System Status Card**
- **Check Server Health** - Verifies the server is running
- **Get System Status** - Shows active agents and memory stats
- Displays connection status at the top

### 2. **Daily Scan Card**
- Click "Run Daily Scan" to scan for:
  - Bills due soon
  - Active subscriptions
  - Upcoming appointments
- Shows real-time results

### 3. **Pay Bill Card**
- Enter bill details:
  - Bill ID (e.g., "bill-123")
  - Amount (e.g., 125.50)
  - Payment method (Bank Account, Credit Card, Debit Card)
- Click "Process Payment" to pay
- Shows transaction confirmation

### 4. **Renew Document Card**
- Select document type (License, Passport, Insurance)
- Enter document ID
- Click "Start Renewal"
- Shows form filling progress

### 5. **Performance Metrics Card**
- Click "Refresh Metrics" to see:
  - Tasks completed
  - Agent calls
  - Tool calls
  - Success rate
- Visual stat cards with large numbers

## 📸 Screenshots of Features

### System Status
```
✅ Server is healthy
Status: healthy
Uptime: 45s
```

### Daily Scan Results
```
✅ Daily Scan Complete

📧 Bills Found: 3
   Due Soon: 1

📱 Subscriptions: 2
   Upcoming Renewals: 1

📅 Appointments: 2
   Upcoming: 1
```

### Payment Confirmation
```
✅ Payment Successful

Bill ID: bill-123
Amount: $125.50
Method: bank_account
Transaction: DRY-RUN-1234567890
Status: success

⚠️ DRY-RUN MODE: No actual payment made
```

### Document Renewal
```
✅ Document Renewal Started

Document: license
Document ID: license-123
Status: form_ready
Fields Filled: 10

✅ Form ready for submission
```

## 🎯 How to Use Each Feature

### To Check System Health

1. Click "Check Server Health" button
2. Wait 1-2 seconds
3. Green terminal output shows server status

**Expected Output:**
- ✅ Server is healthy
- Shows uptime in seconds

### To Run a Daily Scan

1. Click "Run Daily Scan" button
2. Wait 3-5 seconds (agents are working!)
3. See results for bills, subscriptions, appointments

**What Happens:**
- System scans emails for tasks
- Finds bills due soon
- Tracks subscription renewals
- Identifies upcoming appointments

### To Pay a Bill

1. Enter bill details in the form:
   - **Bill ID**: Any identifier (default: "bill-123")
   - **Amount**: Dollar amount (default: 125.50)
   - **Payment Method**: Choose from dropdown

2. Click "Process Payment"

3. See confirmation with transaction ID

**Note:** System runs in DRY-RUN mode by default - no actual payments are made!

### To Renew a Document

1. Select document type from dropdown
2. Enter document ID
3. Click "Start Renewal"
4. System analyzes form and fills fields
5. Shows completion status

### To View Metrics

1. Click "Refresh Metrics"
2. See stats update in real-time:
   - Tasks Completed
   - Agent Calls
   - Tool Calls
   - Success Rate

## 🎨 UI Features

### Color-Coded Output
- **Green text** (✅) = Success
- **Red text** (❌) = Error
- **Terminal style** = System output

### Real-Time Loading
- Spinning loader while processing
- "Processing..." messages
- Automatic result display

### Status Indicators
- **Green dot** 🟢 = Server connected
- **Red dot** 🔴 = Server offline
- Shows at the top of the page

### Responsive Design
- Works on desktop and tablet
- Cards reorganize based on screen size
- Mobile-friendly interface

## 🔧 Customization

### Change Default Values

Edit the HTML file at [public/index.html](public/index.html):

```html
<!-- Change default bill amount -->
<input type="number" id="billAmount" placeholder="125.50" value="99.99">

<!-- Change default bill ID -->
<input type="text" id="billId" placeholder="bill-123" value="my-custom-id">
```

### Change Color Theme

Edit the CSS in [public/index.html](public/index.html):

```css
/* Change gradient background */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Change button color */
.btn {
    background: #667eea; /* Change this hex color */
}
```

## 🐛 Troubleshooting

### Problem: "Server offline" message

**Solution:**
1. Make sure the server is running: `npm start`
2. Check the terminal for errors
3. Try refreshing the page

### Problem: Blank page when opening http://localhost:4200

**Solution:**
1. Rebuild the project: `npm run build`
2. Restart the server: `npm start`
3. Make sure the `public` folder exists

### Problem: CORS errors in browser console

**Solution:**
The server is already configured for CORS. If you still see errors:
1. Make sure you're accessing from `http://localhost:4200` (not a different port)
2. Try clearing browser cache
3. Restart the server

### Problem: Tasks fail with errors

**Solution:**
This is normal! The system uses mock data. Some common scenarios:
- Payment methods may fail (simulating real-world failures)
- Documents may have missing fields
- This is part of the demonstration

## 📱 Advanced Usage

### Using Browser Developer Tools

Press `F12` or `Cmd+Option+I` to open developer tools and see:

1. **Console Tab**: View detailed logs
2. **Network Tab**: See API requests/responses
3. **Application Tab**: View session storage

### Testing Different Scenarios

Try these to see different behaviors:

**Test Payment Failure:**
- Try different payment methods
- System has a 95% success rate (5% fail randomly)

**Test Missing Document Fields:**
- Some documents will show missing fields
- This simulates forms that need user input

**Test Multiple Tasks:**
- Run daily scan multiple times
- Process several payments
- Watch metrics increase

## 🎓 Learning from the Web App

This simple web app demonstrates:

1. **Agent System Integration**: How to call the agent system from a UI
2. **Real-Time Updates**: Loading states and result display
3. **Error Handling**: Graceful failure messages
4. **Session Management**: Automatic session creation
5. **API Usage**: How to structure API calls

### API Calls Made by the Web App

```javascript
// Health check
GET http://localhost:4200/health

// Create session
POST http://localhost:4200/api/sessions

// Get system status
GET http://localhost:4200/api/status

// Run daily scan
POST http://localhost:4200/api/scans/daily

// Submit task (payment)
POST http://localhost:4200/api/tasks
Body: { sessionId, task: { type, metadata } }

// Get metrics
GET http://localhost:4200/api/metrics
```

## 🚀 Next Steps

After using the web app:

1. ✅ Understand the UI interactions
2. ✅ See how tasks are submitted
3. ✅ View real-time results
4. ✅ Explore the [USER_GUIDE.md](USER_GUIDE.md) for API details
5. ✅ Read [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md) to understand the backend

## 📞 Need Help?

- **Server won't start**: Check [QUICKSTART.md](QUICKSTART.md)
- **API questions**: See [README.md](README.md#api-documentation)
- **Technical details**: Read [COURSE_CONCEPTS.md](COURSE_CONCEPTS.md)

---

## Quick Commands

```bash
# Start the web app
npm start

# Then open in browser
http://localhost:4200

# Stop the server
Press Ctrl+C in terminal
```

Enjoy your Personal Errand Agent web app! 🎉
