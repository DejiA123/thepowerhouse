# YouTube Fallback Videos Deployment Guide

## 🎯 **Current Status**
The YouTube API quota is exhausted, and the app is showing fallback videos. The fallback videos have been updated to use the real videos from The Power House International channel.

## ✅ **Fallback Videos Configured**
The following videos are now set as fallback content:

1. **b3BstGR_mvQ** - "The Power House International - Sunday Service"
   - URL: https://youtu.be/b3BstGR_mvQ
   
2. **dQjzVjtd7V8** - "The Power House International - Bible Study"
   - URL: https://youtu.be/dQjzVjtd7V8
   
3. **PtgkWFryLN8** - "The Power House International - Shorts"
   - URL: https://youtube.com/shorts/PtgkWFryLN8

## 🚀 **Deploy to Supabase**

### Step 1: Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**

### Step 2: Update the Function
1. Find the `fetch-youtube-videos` function
2. Click **Edit** or **View**
3. Replace the entire content with the updated code from:
   `supabase/functions/fetch-youtube-videos/index.ts`

### Step 3: Deploy
1. Click **Deploy** or **Save**
2. Wait for deployment to complete

### Step 4: Test
1. Refresh your app
2. Navigate to the Services page or wherever YouTube videos are displayed
3. You should now see the real fallback videos from The Power House International

## 🔧 **Troubleshooting**

### If videos still don't show:
1. **Clear browser cache** - Hard refresh (Ctrl+F5)
2. **Check browser console** for any errors
3. **Verify function deployment** - Check Supabase logs
4. **Test function directly** - Use the function URL in browser

### Expected Behavior:
- ✅ Real videos from The Power House International channel
- ✅ Proper thumbnails and titles
- ✅ Clickable video cards
- ✅ "View Channel" button works
- ✅ No more placeholder content

## 📱 **User Experience**
Users will now see authentic content from The Power House International even when the YouTube API quota is exhausted, maintaining the connection to your church's channel. 