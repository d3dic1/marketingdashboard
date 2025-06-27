# New Features Setup Guide

This guide will help you set up the two new features: **Google Analytics Integration** and **AI Pacing Editor**.

## 🎯 Feature 1: Google Analytics Integration

### What it does:
- Fetches conversion, install, and page view data from Google Analytics
- Filters data by source "ortto" 
- Displays metrics in a dedicated dashboard page with charts and tables

### Setup Requirements:

#### 1. Google Analytics 4 (GA4) Setup
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or use existing one
3. Note your **Property ID** (format: `123456789`)

#### 2. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Analytics Data API v4**
4. Create a **Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name (e.g., "Analytics Dashboard")
   - Grant "Viewer" role
   - Create and download the JSON key file

#### 3. Environment Variables
Add these to your `.env` file:
```env
GA4_PROPERTY_ID=your_property_id_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
```

#### 4. Grant Access to GA4
1. In Google Analytics, go to "Admin" > "Property" > "Property access management"
2. Add your service account email (from the JSON file) as a "Viewer"

### Usage:
1. Navigate to "Google Analytics" in the sidebar
2. Select date range (7 days, 30 days, 90 days, or custom)
3. View metrics and daily performance data

---

## 🤖 Feature 2: AI Pacing Editor

### What it does:
- Uploads CSV files from Shopify Partner Portal
- Uses AI to analyze and organize data by dates
- Automatically creates Google Sheets with daily, weekly, and monthly tabs
- Provides AI insights and recommendations

### Setup Requirements:

#### 1. Google Sheets Setup
1. Create a new Google Sheets spreadsheet
2. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

#### 2. Google Cloud Console Setup (Same as Analytics)
1. Use the same service account from Analytics setup
2. Enable the **Google Sheets API**
3. Share your Google Sheets with the service account email

#### 3. Google Gemini AI Setup
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the API key

#### 4. Environment Variables
Add these to your `.env` file:
```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
GEMINI_API_KEY=your_gemini_api_key_here
```

### Usage:
1. Navigate to "AI Pacing Editor" in the sidebar
2. Export data from Shopify Partner Portal as CSV
3. Upload the CSV file
4. Click "Process & Organize in Sheets"
5. View results in Google Sheets

---

## 🔧 Complete Setup Checklist

### Backend Setup:
- [ ] Install dependencies: `npm install googleapis multer csv-parser @google-analytics/data`
- [ ] Set up environment variables
- [ ] Create Google service account
- [ ] Enable required APIs (Analytics Data API v4, Sheets API)
- [ ] Download and place service account JSON file

### Frontend Setup:
- [ ] New pages are already created
- [ ] Routes are configured
- [ ] Sidebar navigation is updated

### Testing:
- [ ] Test Google Analytics connection
- [ ] Test CSV upload functionality
- [ ] Verify Google Sheets creation
- [ ] Check AI analysis results

---

## 🚀 Quick Start

1. **Set up environment variables** in your `.env` file
2. **Restart your backend server**
3. **Navigate to the new pages** in the sidebar:
   - "Google Analytics" for tracking Ortto campaign performance
   - "AI Pacing Editor" for CSV automation

---

## 📊 Expected Results

### Google Analytics Page:
- Real-time data from GA4 filtered by "ortto" source
- Daily performance metrics
- Conversion tracking
- Page view analytics

### AI Pacing Editor:
- Automated CSV processing
- Organized Google Sheets with multiple tabs
- AI-generated insights
- Date-based data organization

---

## 🆘 Troubleshooting

### Google Analytics Issues:
- Verify Property ID is correct
- Check service account has proper permissions
- Ensure Analytics Data API v4 is enabled

### AI Pacing Editor Issues:
- Verify spreadsheet ID is correct
- Check service account has edit access to sheets
- Ensure Gemini API key is valid
- Check CSV file format is correct

### General Issues:
- Restart backend server after environment changes
- Check browser console for frontend errors
- Verify all environment variables are set

---

## 💡 Tips

1. **Start with test data** before using production CSV files
2. **Use the "Test CSV Structure"** button to validate files
3. **Check the status cards** on the AI Pacing Editor page
4. **Monitor the logs** for detailed error information
5. **Keep your service account JSON file secure**

Both features are now fully integrated into your dashboard and ready to use! 