<!-- Banner Header -->

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:6a11cb,100:2575fc&height=220&section=header&text=Mental%20Health%20Awareness%20for%20Students&fontSize=36&fontColor=ffffff&animation=fadeIn" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-JavaScript-yellow.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Backend-Node.js-green.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=for-the-badge" />
</p>

<p align="center">
  <b>Web platform promoting mental health awareness for students with AI chat & video content</b>
</p>

---

# 🧠 Mental Health Awareness for Students

A modern web platform dedicated to raising awareness about student mental health, featuring inspirational videos and an interactive chat experience.

🌐 **Live Demo:** [AmritaCare Live](https://amritacare.vercel.app/)

---

## 🛠️ Features

* 🎥 Video gallery with curated mental health content
* 💬 AI-powered chat assistance (via OpenAI GPT)
* 🔐 Firebase Authentication
* ☁️ Cloudinary integration for file uploads
* 📧 FormSubmit.io for contact form submissions
* 🎨 Beautiful, responsive UI with Tailwind CSS
* 🌙 Dark mode support

---

## 📌 Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
* **Styling:** Tailwind CSS
* **Authentication:** Firebase
* **File Upload:** Cloudinary
* **Backend:** Node.js + Express
* **Contact Form:** FormSubmit.io

---

## 🚀 Getting Started

### Prerequisites

* Node.js (>= 16)
* npm or yarn
* Firebase project credentials
* Cloudinary account

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd mental-health-students-site
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Update `.env` with your credentials:

* Firebase configuration
* Cloudinary credentials
* FormSubmit.io email

4. Start the development server:

```bash
npm start
```

5. Open your browser and navigate to:

```
http://localhost:3000
```

> No additional build steps required beyond `npm start`.

---

## 📁 Project Structure

```
.
├── public/
│   ├── index.html         # Main HTML file
│   ├── main.js            # Frontend logic
│   ├── styles.css         # Custom styles
│   └── videos/            # Video content (mp4 files)
├── server.js              # Express server
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

---

## ☁️ Deployment

### Vercel Deployment

1. Push your repository to GitHub
2. Connect your GitHub repo to Vercel at [vercel.com](https://vercel.com)
3. Add your environment variables in Vercel settings
4. Deploy!

---

## 🔗 API Endpoints

* `POST /api/upload` – Upload video files (requires Cloudinary)
* `POST /api/chat` – Send messages to AI chat (requires OpenAI API key)

---

## 🔑 Environment Variables

See `.env.example` for all required environment variables.

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit a pull request.

---

## 📄 License

This project is open source and available under the **Apache 2.0 License**.

---

## 📫 Contact

For questions or support, reach out via the contact form on the website or email:
**[contact@krishsingh.com.np](mailto:contact@krishsingh.com.np)**

---

## 📜 License

This project is licensed under the **MIT License**.

Copyright (c) 2026  
**Krish Singh** ([github.com/wasitkrish](https://github.com/wasitkrish))

---
**⚠️ Note:** This is a mental health awareness platform.
If you or someone you know is struggling with mental health, please reach out to a professional or contact a mental health helpline.
