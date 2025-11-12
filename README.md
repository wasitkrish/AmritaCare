# Mental Health Awareness for Students

A modern web platform dedicated to raising awareness about student mental health, featuring inspirational videos and an interactive chat experience.

## Features

- 🎥 Video gallery with curated mental health content
- 💬 AI-powered chat assistance (via OpenAI GPT)
- 🔐 Firebase Authentication
- ☁️ Cloudinary integration for file uploads
- 📧 FormSubmit.io for contact form submissions
- 🎨 Beautiful, responsive UI with Tailwind CSS
- 🌙 Dark mode support

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Styling:** Tailwind CSS
- **Authentication:** Firebase
- **File Upload:** Cloudinary
- **Backend:** Node.js + Express
- **AI Chat:** OpenAI GPT API
- **Contact Form:** FormSubmit.io

## Getting Started

### Prerequisites

- Node.js (>= 16)
- npm or yarn
- Firebase project credentials
- Cloudinary account
- OpenAI API key

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd mental-health-students-site
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your credentials:
   - Firebase configuration
   - Cloudinary credentials
   - OpenAI API key
   - FormSubmit.io email

4. Start the development server
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
.
├── public/
│   ├── index.html         # Main HTML file
│   ├── main.js           # Frontend logic
│   ├── styles.css        # Custom styles
│   └── videos/           # Video content (mp4 files)
├── server.js             # Express server
├── package.json          # Dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore rules
└── README.md             # This file
```

## Deployment

### Vercel Deployment

1. Push your repository to GitHub
2. Connect your GitHub repo to Vercel at [vercel.com](https://vercel.com)
3. Add your environment variables in Vercel settings
4. Deploy!

## API Endpoints

- `POST /api/upload` - Upload video files (requires Cloudinary)
- `POST /api/chat` - Send messages to AI chat (requires OpenAI API key)

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

Contributions are welcome! Feel free to submit a pull request.

## License

This project is open source and available under the MIT License.

## Contact

For questions or support, reach out via the contact form on the website or email: singhkrish.np@gmail.com

---

**Note:** This is a mental health awareness platform. If you or someone you know is struggling with mental health, please reach out to a professional or contact a mental health helpline.
