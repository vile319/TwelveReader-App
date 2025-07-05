# Google AdSense Setup Guide for TwelveReader

## What's Been Added

I've integrated Google AdSense into your TwelveReader app with these features:

### 🎯 Ad Placements
- **Top Banner**: Horizontal ad above the audio player
- **Bottom Banner**: Horizontal ad below the text input area  
- **Sidebar Banner**: Square/rectangle ad at the bottom of the sidebar
- **Popup Ad**: Small, dismissible popup that appears every 10 minutes

### 🎨 Design Features
- All ads match your app's dark theme
- Rounded corners and subtle borders
- Unintrusive placement that doesn't interfere with core functionality
- Popup auto-closes after 10 seconds and can be manually dismissed

## Setup Instructions

### 1. Get Your AdSense Publisher ID

1. Go to [Google AdSense](https://www.google.com/adsense/)
2. Sign up or log in to your account
3. Get your Publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXX`)

### 2. Replace Placeholder IDs

Update these files with your actual AdSense IDs:

**In `index.html`:**
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX"
        crossorigin="anonymous"></script>
```

**In `components/AdSenseBanner.tsx`:**
```typescript
data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
```

**In `components/AdSensePopup.tsx`:**
```typescript
data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
```

### 3. Create Ad Units

In your AdSense dashboard, create these ad units:

1. **Top Banner** - Horizontal banner (728x90 or responsive)
2. **Bottom Banner** - Horizontal banner (728x90 or responsive)  
3. **Sidebar Banner** - Square/rectangle (300x250 or responsive)
4. **Popup Ad** - Small rectangle (300x250 or responsive)

### 4. Update Ad Slot IDs

In `App.tsx`, replace the placeholder ad slots:

```typescript
// Top banner
<AdSenseBanner 
  adSlot="1234567890"  // Replace with your actual slot ID
  adFormat="horizontal"
/>

// Bottom banner
<AdSenseBanner 
  adSlot="0987654321"  // Replace with your actual slot ID
  adFormat="horizontal"
/>

// Sidebar banner
<AdSenseBanner 
  adSlot="5566778899"  // Replace with your actual slot ID
  adFormat="rectangle"
/>

// Popup
<AdSensePopup 
  adSlot="1122334455"  // Replace with your actual slot ID
  showInterval={10}
/>
```

## Customization Options

### Popup Settings
- Change `showInterval` to adjust how often the popup appears (in minutes)
- Modify the auto-close timer in `AdSensePopup.tsx` (currently 10 seconds)

### Ad Formats
- `horizontal` - Best for top/bottom banners
- `rectangle` - Good for sidebar placements
- `auto` - Responsive, adapts to container

### Styling
All ads inherit your app's dark theme. You can customize colors in the component files.

## Important Notes

⚠️ **Before Going Live:**
- Test with AdSense test mode first
- Ensure your site complies with AdSense policies
- Don't click your own ads during testing
- AdSense approval can take 24-48 hours

🎯 **Performance Tips:**
- Ads load asynchronously to avoid blocking your app
- Error handling prevents ad failures from breaking functionality
- Responsive design ensures ads work on all screen sizes

## Support

If you need help with AdSense setup or want to modify the ad placements, the main files to edit are:
- `components/AdSenseBanner.tsx` - Banner ad component
- `components/AdSensePopup.tsx` - Popup ad component
- `App.tsx` - Ad placement locations 