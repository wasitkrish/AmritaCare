const regInput = document.getElementById("reg-input");
const regBtn = document.getElementById("reg-btn");
const mainContent = document.getElementById("main-content");
const regArea = document.getElementById("reg-area");
const uploadForm = document.getElementById("upload-form");
const uploadStatus = document.getElementById("upload-status");
const chatForm = document.getElementById("chat-form");
const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");

function validReg(r){
  return r && r.endsWith("@bl.students.amrita.edu");
}

function showMain(){
  mainContent.hidden = false;
  regArea.hidden = true;
}

const stored = localStorage.getItem("mh_registration");
if (stored && validReg(stored)) {
  showMain();
}

// registration
regBtn.onclick = () => {
  const v = regInput.value.trim();
  if (!validReg(v)) {
    alert("Registration must end with @bl.students.amrita.edu");
    return;
  }
  localStorage.setItem("mh_registration", v);
  showMain();
};

// upload
uploadForm.onsubmit = async (e) => {
  e.preventDefault();
  const file = document.getElementById("video-file").files[0];
  if (!file) return;
  const reg = localStorage.getItem("mh_registration");
  if (!reg) { alert("Please register first."); return; }
  uploadStatus.textContent = "Uploading...";
  const fd = new FormData();
  fd.append("video", file);
  fd.append("registration", reg);
  try {
    const res = await fetch("/api/upload", { method:"POST", body: fd });
    const data = await res.json();
    if (data.ok) {
      uploadStatus.textContent = "Uploaded! Filename: " + data.filename;
      // Optionally refresh video list or notify admin
    } else {
      uploadStatus.textContent = "Upload failed: " + (data.error || JSON.stringify(data));
    }
  } catch (err) {
    uploadStatus.textContent = "Upload error: " + err;
  }
};

// chat
chatForm.onsubmit = async (e) => {
  e.preventDefault();
  const txt = chatInput.value.trim();
  if (!txt) return;
  const reg = localStorage.getItem("mh_registration");
  if (!reg) { alert("Please register first."); return; }
  appendMessage(txt, "user");
  chatInput.value = "";
  appendMessage("...", "bot", true);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ message: txt, registration: reg })
    });
    const data = await res.json();
    removePendingBot();
    if (data.reply) appendMessage(data.reply, "bot");
    else appendMessage("No reply (server error)", "bot");
  } catch (err) {
    removePendingBot();
    appendMessage("Chat error: " + err, "bot");
  }
};

function appendMessage(text, who, pending=false){
  const d = document.createElement("div");
  d.className = "msg " + (who==="user" ? "user" : "bot");
  d.textContent = text;
  if (pending) d.dataset.pending = "1";
  chatWindow.appendChild(d);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
function removePendingBot(){
  const p = chatWindow.querySelector('[data-pending="1"]');
  if (p) p.remove();
}
