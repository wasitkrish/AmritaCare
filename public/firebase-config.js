/**
 * Runtime Firebase & Cloudinary config loader
 * Fetches secrets from server endpoints so env vars stay on server (Vercel-safe)
 */

(async function(){
  const defaults = {
    firebase: {
      apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
    },
    cloudinary: {
      cloud_name: '', upload_preset: 'mental-health-upload', apiEndpoint: 'https://api.cloudinary.com/v1_1'
    }
  };

  // Fetch firebase config from server
  try{
    const r = await fetch('/api/firebase-config');
    if(r.ok){
      const cfg = await r.json();
      window.firebaseConfig = Object.assign({}, defaults.firebase, cfg);
    } else {
      window.firebaseConfig = defaults.firebase;
    }
  }catch(e){ console.warn('Could not fetch /api/firebase-config', e); window.firebaseConfig = defaults.firebase; }

  // Fetch cloudinary config (cloud name + upload preset) if available
  try{
    const r2 = await fetch('/api/cloudinary-config');
    if(r2.ok){
      const c = await r2.json();
      window.cloudinaryConfig = {
        cloud_name: c.cloud_name || defaults.cloudinary.cloud_name,
        upload_preset: c.upload_preset || defaults.cloudinary.upload_preset,
        apiEndpoint: defaults.cloudinary.apiEndpoint
      };
    } else {
      window.cloudinaryConfig = defaults.cloudinary;
    }
  }catch(e){ console.warn('Could not fetch /api/cloudinary-config', e); window.cloudinaryConfig = defaults.cloudinary; }

  // Initialize Firebase if SDK loaded and config present
  try{
    if(window.firebase && window.firebaseConfig && window.firebaseConfig.apiKey){
      try{ window._firebaseApp = window.firebase.initializeApp(window.firebaseConfig); window._firebaseAuth = window.firebase.auth(); window._firebaseDb = window.firebase.firestore(); window._firebaseStorage = window.firebase.storage(); console.log('Firebase initialized'); }catch(e){ console.warn('Firebase init failed', e); }
    }
  }catch(e){ console.warn('Firebase init error', e); }

  // upload helper: try signed upload first, fallback to unsigned preset
  async function uploadToCloudinary(file){
    // try getting a signature from server
    try{
      const sigResp = await fetch('/api/cloudinary-sign', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ filename: file.name }) });
      if(sigResp.ok){
        const sig = await sigResp.json();
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', sig.api_key);
        fd.append('timestamp', sig.timestamp);
        fd.append('signature', sig.signature);
        const url = `${sig.cloud_name ? 'https://api.cloudinary.com/v1_1/'+sig.cloud_name : window.cloudinaryConfig.apiEndpoint+'/'+window.cloudinaryConfig.cloud_name}/auto/upload`;
        const up = await fetch(url, { method: 'POST', body: fd });
        if(!up.ok) throw new Error('Signed upload failed');
        const j = await up.json(); return { success:true, url: j.secure_url, public_id: j.public_id };
      }
    }catch(e){
      console.warn('Signed upload not available, falling back to unsigned preset', e);
    }

    // fallback unsigned using upload_preset
    try{
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', window.cloudinaryConfig.upload_preset || 'mental-health-upload');
      const url = `${window.cloudinaryConfig.apiEndpoint}/${window.cloudinaryConfig.cloud_name}/auto/upload`;
      const up = await fetch(url, { method: 'POST', body: fd });
      if(!up.ok) throw new Error('Unsigned upload failed');
      const j = await up.json(); return { success:true, url: j.secure_url, public_id: j.public_id };
    }catch(err){
      console.error('Cloudinary upload failed', err);
      return { success:false, error: err.message };
    }
  }

  window.uploadToCloudinary = uploadToCloudinary;
})();

