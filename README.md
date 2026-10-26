# 🎬 TikTok Viral AI

A full-stack, AI-powered web application designed to help content creators optimize their TikTok videos. The system generates ideas, scripts, and captions, while also providing in-depth analysis of uploaded videos to maximize their viral potential.

## 🚀 Live Demo
You can try the application live here: [TikTok Viral AI](https://tiktok-viral-ai.onrender.com)
*(Note: Since it is hosted on Render’s free tier, the server may take up to 50 seconds for an initial "cold start".)*

## ✨ Key Features
- **💡 Idea Generation:** Generates 10 high-potential video ideas based on a simple topic.
- **📝 Scripting:** Creates complete 30-second scripts, broken down scene-by-scene, including an opening hook and a Call to Action.
- **✍️ Captions & Hashtags:** Suggests engaging captions, targeted hashtags, and subtitles.
- **🔍 AI Video Analysis:** Analyzes user-uploaded videos (up to 50MB), providing a virality score (0–100), identifying strengths and weaknesses, and offering actionable advice on how to improve the hook within the first 3 seconds.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **AI Engine:** Google Gemini API (`gemini-2.5-flash` and `gemini-3.8-flash`)
- **File Handling:** Multer (for temporary uploads)
- **Deployment:** Render

## 🧠 Architecture and Technical Challenges (Problem Solving)
One of the primary goals of this project was to ensure it could run on infrastructure with limited resources (Render’s Free Tier, which offers only 512 MB of RAM). To avoid Out-Of-Memory (OOM) crashes when processing large video files, I implemented the following architecture:
1. The Node.js server does not process the video locally.
2. The file is temporarily saved to disk using `Multer`.
3. The backend makes a call to the Google API (File API) to upload the video.
4. A polling system (asynchronous waiting) is implemented to check when Google’s AI has finished the frame-by-frame processing.
5. The local file is deleted, and a JSON report is returned to the user.

This approach has kept the server's RAM usage extremely low, ensuring stability despite hardware limitations.

Developed by Muditha Peters
