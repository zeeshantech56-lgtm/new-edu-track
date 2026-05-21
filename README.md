# EduTrack Pro

A modern, full-featured **School Attendance Management System** built with React, Firebase, and Recharts.

## Features

- 📊 **Analytics Dashboard** – 30-day attendance trends, class performance comparison, at-risk student detection
- ✅ **Attendance Marking** – Click-to-toggle, auto-fill from previous day, holiday locking
- 👩‍🎓 **Student Records** – Add, edit, delete students; CSV bulk import
- 📅 **Academic Calendar** – Register and manage school holidays
- 👤 **Staff Accounts** – Create teacher/admin accounts with class assignment
- ☁️ **Firebase Sync** – Real-time cloud sync across all devices
- 📶 **Offline Support** – Mark attendance offline, auto-syncs when connection restores
- 📱 **Responsive Design** – Mobile-first, works on all screen sizes

## Tech Stack

- **React** + **Vite**
- **Firebase** (Firestore + Auth)
- **Recharts** – Charts & analytics
- **Lucide React** – Icons
- **Vanilla CSS** – Custom design system

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Default Login

```
Username: admin
Password: admin
```

## Project Structure

```
src/
  App.jsx       # Main app + all page components
  index.css     # Global design system styles
  main.jsx      # React entry point
index.html      # HTML shell
```

## Firebase Setup

The app uses a pre-configured Firebase project. To use your own:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore** and **Anonymous Authentication**
3. Replace the `firebaseConfig` object in `src/App.jsx`

## License

MIT
