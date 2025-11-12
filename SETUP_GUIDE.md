# 📋 Deployment & Integration Setup Guide

This guide walks you through setting up Firebase, Cloudinary, and FormSubmit.io for your Mental Health platform.

---

## 🔐 Step 1: Firebase Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Enter project name: `mental-health-students`
4. Disable Google Analytics (optional)
5. Create project

### Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get Started"**
3. Enable these sign-in methods:
   - **Email/Password** - Enable
   - **Google** - Enable
   - **Anonymous** (optional) - Enable

### Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click **"Web"** icon (or create one)
4. Copy the config object

Your config will look like:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Add to .env file

Add these to your `.env` file:
```
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
```

---

## 📸 Step 2: Cloudinary Setup

### Create Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/users/register/free)
2. Sign up for free account
3. Verify email

### Get Cloudinary Credentials

1. Go to **Dashboard**
2. Copy your **Cloud Name**
3. Go to **Settings → Upload**
4. Scroll to "Upload presets"
5. Click **"Create unsigned"** (for client-side uploads)
6. Name it: `mental-health-upload`
7. Copy the **Upload Preset name**

### Add to .env file

```
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=mental-health-upload
```

### Upload Preset Configuration (in Cloudinary)

Make sure your upload preset has:
- **Unsigned** (enabled for client-side)
- **Resource type:** Auto
- **Max file size:** 500 MB
- **Allowed formats:** video/*, image/*

---

## 📧 Step 3: FormSubmit.io Setup

### Create FormSubmit Account

1. Go to [FormSubmit.io](https://formsubmit.co)
2. Sign up (or use their free tier without account)
3. Your email: `singhkrish.np@gmail.com`

### Form Configuration

FormSubmit.io is simple - just add `action="https://formsubmit.co/singhkrish.np@gmail.com"` to your form in HTML.

FormSubmit automatically:
- Captures form submissions
- Sends emails to your address
- Handles CORS
- No backend needed

### Add to .env file

```
VITE_FORMSUBMIT_EMAIL=singhkrish.np@gmail.com
```

---

## 🔧 Step 4: Update Your Project Files

### 1. Update .env File

Your complete `.env` file should look like:

```
# OpenAI (if using GPT chat)
OPENAI_API_KEY=sk-REPLACE_WITH_YOUR_KEY
PORT=3000

# Firebase
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=mental-health-upload

# FormSubmit
VITE_FORMSUBMIT_EMAIL=singhkrish.np@gmail.com
```

### 2. Local Testing

```bash
# Install dependencies
npm install

# Create local .env with your credentials
cp .env.example .env
# Edit .env and add your real credentials

# Start development server
npm start

# Open http://localhost:3000
```

### 3. Before Vercel Deployment

- ✅ All services configured (Firebase, Cloudinary, FormSubmit)
- ✅ `.env` file created locally with real credentials
- ✅ `.env` file is in `.gitignore` (DON'T commit it!)
- ✅ Test locally and everything works

---

## 🚀 Step 5: Deploy to Vercel

### Create Vercel Account

1. Go to [Vercel](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel to access your GitHub account

### Connect GitHub Repository

1. Push your project to GitHub
2. In Vercel Dashboard, click **"New Project"**
3. Select your GitHub repository
4. Click **"Import"**

### Add Environment Variables

1. In Vercel, after importing:
   - Go to **Settings → Environment Variables**
2. Add all variables from your `.env`:
   ```
   OPENAI_API_KEY=sk-...
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_CLOUDINARY_CLOUD_NAME=...
   VITE_CLOUDINARY_UPLOAD_PRESET=...
   VITE_FORMSUBMIT_EMAIL=singhkrish.np@gmail.com
   ```

### Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Your site is live! 🎉

---

## 🐛 Troubleshooting

### Firebase Auth Not Working
- Check if Authentication is enabled in Firebase Console
- Verify API key is correct in .env
- Check browser console for errors

### Cloudinary Upload Failing
- Verify upload preset exists and is unsigned
- Check Cloud Name is correct
- Check file size isn't exceeding limits

### FormSubmit Not Receiving Emails
- Check email address is correct
- Verify form action points to correct email
- Check spam/junk folder

### Vercel Build Failing
- Ensure all env variables are set in Vercel dashboard
- Check for any .env file accidentally committed
- Review Vercel build logs

---

## 📚 Useful Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloudinary Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [FormSubmit.io Docs](https://formsubmit.co)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Environment Variables in Vercel](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Status:** Follow this guide step-by-step for successful deployment! ✨
