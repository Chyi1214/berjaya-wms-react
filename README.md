# Berjaya WMS React

A modern React-based Warehouse Management System for Berjaya Autotech.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Authentication enabled

### Installation

1. **Clone and setup**
   ```bash
   cd berjaya-wms-react
   npm install
   ```

2. **Configure Firebase**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication with Google provider
3. Copy your Firebase config to `.env` file:

```bash
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## 🏗️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Firebase** - Authentication & Database
- **Vite** - Build tool

## 📱 Features

### ✅ Implemented
- [x] Google OAuth authentication
- [x] Responsive mobile-first design
- [x] TypeScript for type safety
- [x] Error handling and loading states

### 🚧 Coming Soon
- [ ] Role selection (Logistics, Production, Manager)
- [ ] Inventory counting interface
- [ ] Transaction management
- [ ] Manager dashboard
- [ ] BOM operations
- [ ] Real-time Firestore integration

## 🔐 Security

- Firebase credentials are stored in environment variables
- `.env` files are gitignored for security
- Firebase Security Rules should be configured for production

## 📦 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## 🚀 Deployment

```bash
npm run build
# Deploy to Firebase Hosting or your preferred platform
```

## 🛠️ Development

This project uses:
- **Vite** for fast development and building
- **ESLint** for code quality
- **Tailwind CSS** for utility-first styling
- **React Context** for state management

## 📚 Learn More

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase Documentation](https://firebase.google.com/docs/)

## 🤝 Contributing

This is a migration from the original vanilla JavaScript WMS. Each feature is being migrated incrementally with proper testing and validation.