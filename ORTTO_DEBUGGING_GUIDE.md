# Ortto Data Debugging Guide

## Overview

This guide helps you troubleshoot issues with Ortto data not appearing in your Google Analytics 4 (GA4) dashboard. The system has been improved with better error handling and debugging tools to help identify and resolve tracking issues.

## Common Issues

### 1. No Ortto Data Found

**Symptoms:**
- Empty dashboard with no data
- Error message: "No Ortto data found for this property"
- Debug shows no source/medium combinations

**Possible Causes:**
- GA4 property has no tracking data
- Ortto tracking is not properly configured
- Wrong source/medium values are being used
- Date range has no data

### 2. Wrong Source/Medium Values

**Symptoms:**
- Debug shows source/medium combinations but none are Ortto-related
- Data exists but doesn't match expected Ortto patterns

**Common Ortto Source/Medium Values:**
- `ortto / email`
- `ortto/email`
- `ortto / mail`
- `ortto/mail`
- `email`
- `mail`

## Debugging Tools

### 1. Debug Button in GA4 Property Manager

**How to use:**
1. Go to the GA4 Property Manager in your dashboard
2. Click the "Debug" button next to any property
3. Review the analysis results

**What it shows:**
- Available source/medium combinations in your GA4 property
- Ortto-related combinations found
- Recommendations for fixing issues
- Raw debug data for technical analysis

### 2. API Endpoints

#### Debug Ortto Data
```
GET /api/analytics/debug-ortto?propertyId={id}&startDate={date}&endDate={date}
```

#### Discover Source/Medium Combinations
```
GET /api/analytics/discover-sources?propertyId={id}&startDate={date}&endDate={date}
```

#### Get Ortto Data (with improved error handling)
```
GET /api/analytics/ortto-data?propertyId={id}&startDate={date}&endDate={date}
```

## Troubleshooting Steps

### Step 1: Check GA4 Property Configuration

1. Verify your GA4 Property ID is correct
2. Ensure the service account has access to the property
3. Check that the property has tracking data

### Step 2: Use the Debug Tool

1. Click the "Debug" button in GA4 Property Manager
2. Review the available source/medium combinations
3. Look for Ortto-related entries

### Step 3: Check Ortto Tracking Setup

If no Ortto-related combinations are found:

1. **Verify Ortto Integration:**
   - Check that Ortto is properly connected to your website
   - Ensure UTM parameters are being set correctly
   - Verify that Ortto is sending data to GA4

2. **Check UTM Parameters:**
   - Source should be "ortto" or similar
   - Medium should be "email" or "mail"
   - Campaign should be descriptive

3. **Test Tracking:**
   - Send a test email through Ortto
   - Click the link and check if it appears in GA4
   - Wait 24-48 hours for data to appear

### Step 4: Manual Source/Medium Discovery

If the automatic detection fails:

1. Use the `/api/analytics/discover-sources` endpoint
2. Look for any email-related source/medium combinations
3. Note the exact values being used
4. Update your tracking configuration if needed

## Configuration Examples

### Ortto UTM Parameters

**Recommended:**
```
utm_source=ortto&utm_medium=email&utm_campaign=welcome_series
```

**Alternative:**
```
utm_source=ortto&utm_medium=mail&utm_campaign=newsletter
```

### GA4 Event Tracking

Ensure your GA4 property is tracking:
- Page views
- Custom events
- UTM parameters
- Source/medium dimensions

## Error Messages and Solutions

### "No source/medium combinations found at all"

**Solution:**
- Check if GA4 property has any tracking data
- Verify the date range has data
- Ensure the service account has proper permissions

### "No Ortto-related source/medium combinations found"

**Solution:**
- Check Ortto tracking configuration
- Verify UTM parameters are being set
- Test with a sample email campaign

### "Invalid Property ID format"

**Solution:**
- Use numeric Property ID (not Measurement ID)
- Find Property ID in GA4 Admin → Property settings

### "PERMISSION_DENIED"

**Solution:**
- Add service account email to GA4 property access
- Go to GA4 Admin → Property access management
- Add service account as Viewer

## Best Practices

1. **Regular Monitoring:**
   - Use the debug tool weekly to check data quality
   - Monitor for changes in source/medium patterns

2. **Testing:**
   - Test new campaigns before full deployment
   - Verify tracking works in development environment

3. **Documentation:**
   - Keep track of source/medium values used
   - Document any changes to tracking setup

4. **Backup Plans:**
   - Have fallback tracking methods
   - Monitor multiple data sources when possible

## Support

If you continue to have issues:

1. Check the debug output for specific error messages
2. Review the recommendations provided by the debug tool
3. Verify your Ortto and GA4 configurations
4. Contact support with debug data for further assistance

## Recent Improvements

The analytics system has been enhanced with:

- **Automatic source/medium discovery**
- **Multiple fallback strategies for finding Ortto data**
- **Comprehensive debugging tools**
- **Better error messages with actionable recommendations**
- **Debug modal in the frontend for easy troubleshooting**

These improvements should help resolve most Ortto data issues and provide clear guidance when problems occur. 