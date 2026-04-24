# YouTube Videos Downloader Tool

A clean and responsive web-based YouTube downloader tool built with **Node.js**, **Express.js**, **yt-dlp**, and **FFmpeg**.  
The application allows users to paste a YouTube video link, fetch video details, preview the thumbnail, select available video quality, download MP4 video or MP3 audio, and optionally split long MP4 videos into smaller chunks.

---

## Live Demo

**Render Deployment:**  
https://youtube-videos-downloader-tool.onrender.com

> Note: The live deployment may sometimes be blocked by YouTube bot verification because cloud server IPs are often restricted. The project works best on a local machine where Python, yt-dlp, and FFmpeg are properly installed.

---

## Features

- Fetch YouTube video information
- Show video title, thumbnail, duration, channel, views, and upload date
- Detect available video qualities
- Download video in MP4 format
- Download audio in MP3 format
- Select quality such as 720p, 1080p, Best, etc.
- Split long MP4 videos into smaller chunks
- Download chunked videos as a ZIP file
- Real-time download progress tracking
- Clean and modern responsive frontend design
- Backend organized into routes, services, config, and utility files
- Works locally on Windows
- Deployable on Render

---

## Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Tools and Libraries

- yt-dlp
- FFmpeg
- Python
- Archiver
- sanitize-filename
- Render for deployment

---

## Project Structure

```text
Youtube Downloader/
│
├── server.js
├── package.json
├── requirements.txt
├── build.sh
├── README.md
│
├── config/
│   └── paths.js
│
├── routes/
│   ├── healthRoutes.js
│   ├── infoRoutes.js
│   └── downloadRoutes.js
│
├── services/
│   ├── ytDlpService.js
│   ├── ffmpegService.js
│   └── zipService.js
│
├── utils/
│   ├── jobs.js
│   ├── validators.js
│   └── formatters.js
│
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
