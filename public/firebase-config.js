/**
 * Firebase & Services Configuration
 * This file initializes Firebase, Cloudinary, and other services
 */

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abc123def456'
};

// Initialize Firebase (if SDK is loaded)
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    firebaseStorage = firebase.storage();
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  console.warn('⚠️ Firebase initialization skipped:', error.message);
}

// Cloudinary Configuration
const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'mental-health-upload',
  apiEndpoint: 'https://api.cloudinary.com/v1_1'
};

// Cloudinary Upload Function (Client-side)
async function uploadToCloudinary(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    
    const response = await fetch(
      `${cloudinaryConfig.apiEndpoint}/${cloudinaryConfig.cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      success: true,
      url: data.secure_url,
      public_id: data.public_id,
      type: data.resource_type
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in main.js or inline scripts
window.firebaseConfig = firebaseConfig;
window.cloudinaryConfig = cloudinaryConfig;
window.uploadToCloudinary = uploadToCloudinary;
window.firebaseAuth = firebaseAuth;
window.firebaseDb = firebaseDb;
window.firebaseStorage = firebaseStorage;
