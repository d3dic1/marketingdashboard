# Netlify Deployment Guide

This guide will help you deploy your Email Marketing Reporting Dashboard to Netlify and fix the file upload error 500 issue.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **Backend Hosting**: You'll need to deploy the backend separately (Railway, Render, or Heroku)

## The Problem

The error 500 when uploading files on Netlify occurs because:
- Netlify is a static site hosting platform
- It doesn't support server-side file operations with multer
- File uploads try to write to the filesystem, which isn't available

## Solution

We've updated the code to use memory storage instead of disk storage for file uploads, making it compatible with Netlify's serverless environment.

## Step 1: Deploy Backend First

### Option A: Deploy to Railway (Recommended)

1. Go to [railway.app](https://railway.app) and sign up
2. Connect your GitHub repository
3. Create a new project and select your repository
4. Set the root directory to `backend/`
5. Add environment variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-netlify-domain.netlify.app
   ```
6. Deploy and note your Railway URL (e.g., `https://your-app.railway.app`)

### Option B: Deploy to Render

1. Go to [render.com](https://render.com) and sign up
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the root directory to `backend/`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add environment variables as above
8. Deploy and note your Render URL

### Option C: Deploy to Heroku

1. Install Heroku CLI
2. Run these commands:
   ```bash
   cd backend
   heroku create your-app-name
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```
3. Set environment variables in Heroku dashboard

## Step 2: Update Netlify Configuration

1. Update the `netlify.toml` file with your backend URL:
   ```toml
   [[redirects]]
     from = "/api/*"
     to = "https://your-backend-url.com/api/:splat"
     status = 200
     force = true
   ```

2. Update the frontend API configuration in `src/services/api.js`:
   ```javascript
   const getApiUrl = () => {
     if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
       return 'https://your-backend-url.com/api';
     }
     return 'http://localhost:5001/api';
   };
   ```

## Step 3: Deploy Frontend to Netlify

### Method 1: Using Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

3. Deploy:
   ```bash
   netlify deploy
   ```

4. Follow the prompts:
   - Link to existing site or create new
   - Set publish directory: `build`
   - Set build command: `npm run build`

### Method 2: Using Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click "New site from Git"
3. Connect your Git repository
4. Configure the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`
5. Deploy

## Step 4: Configure Environment Variables

In your Netlify site dashboard:

1. Go to Site settings → Environment variables
2. Add:
   ```
   REACT_APP_API_URL=https://your-backend-url.com
   ```

## Step 5: Update Backend CORS

After getting your Netlify domain, update your backend's CORS configuration:

1. Go to your backend hosting platform (Railway/Render/Heroku)
2. Add environment variable:
   ```
   FRONTEND_URL=https://your-netlify-domain.netlify.app
   ```
3. Redeploy the backend

## Step 6: Test File Uploads

1. Visit your Netlify URL
2. Go to the AI Pacing Editor page
3. Try uploading a CSV file
4. The file should now process without error 500

## What We Fixed

### Before (Causing Error 500):
```javascript
// Used disk storage - writes to filesystem
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    // This fails on Netlify - no filesystem access
  }
});
```

### After (Netlify Compatible):
```javascript
// Uses memory storage - keeps file in memory
const storage = multer.memoryStorage();

// Process file content directly from memory
const csvContent = req.file.buffer.toString('utf-8');
const result = await pacingService.processCSVContentAndOrganizeSheets(csvContent, req.file.originalname);
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your backend CORS includes your Netlify domain
2. **API Connection**: Verify the backend URL is correct in `netlify.toml` and `api.js`
3. **Build Errors**: Check that all dependencies are in `package.json`
4. **File Upload Still Failing**: Ensure you're using the updated code with memory storage

### Debugging

1. Check Netlify deployment logs
2. Check browser console for errors
3. Verify backend is running and accessible
4. Test API endpoints directly

## Performance Considerations

- Memory storage is limited by Netlify's function timeout (10 seconds)
- Large files (>10MB) may timeout
- Consider implementing file size limits in the frontend

## Security

- Files are processed in memory and not persisted
- No temporary files are created
- All processing happens in the backend

## Monitoring

- Use Netlify Analytics to monitor frontend performance
- Set up logging for your backend
- Monitor API response times and errors

## Support

- Netlify Documentation: [docs.netlify.com](https://docs.netlify.com)
- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Render Documentation: [render.com/docs](https://render.com/docs) 