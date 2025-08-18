# CLAUDE.md - React Migration Project

This file provides guidance to Claude Code (claude.ai/code) when working with the Berjaya WMS React project.

## 🎯 PROJECT PHILOSOPHY - CRITICAL

**USER PRIORITY: MAINTAINABILITY ABOVE ALL ELSE**

The user has explicitly stated that **maintainability is the highest priority**. Previous vanilla JavaScript implementation became unmaintainable with:
- 145+ event listeners across 11 files
- Complex scope management issues
- Firebase integration problems
- "Another explosion" of complexity

**⚠️ CRITICAL RULE: Every decision must prioritize long-term maintainability over short-term features.**

## 📋 Project Overview

**Current Status**: Successfully migrated from vanilla JavaScript to React
- **Original Problem**: Complex event management, scope issues, Firebase integration chaos
- **Solution**: Clean React architecture with TypeScript + Tailwind CSS
- **Result**: Deployed and working at https://berjaya-autotech-4b4f4.web.app

### Migration Success Metrics
✅ **Event Management**: React handles all DOM events automatically - no manual cleanup needed
✅ **Scope Issues**: Eliminated through React component isolation
✅ **Firebase Integration**: Clean service layer with proper error handling
✅ **Mobile Experience**: Mobile-first Tailwind CSS design
✅ **Developer Experience**: TypeScript catches errors, hot reloading, clear component structure

## 🏗️ Architecture Principles - MAINTAINABILITY FOCUSED

### 1. **Component Isolation**
- Each component is self-contained
- No shared global state unless absolutely necessary
- Clear props and interfaces for all data flow
- Components handle their own lifecycle and cleanup

### 2. **Single Responsibility**
- Each file has ONE clear purpose
- Services handle data operations
- Components handle UI rendering
- Contexts handle shared state
- No "kitchen sink" files

### 3. **Type Safety First**
- TypeScript for all code
- Clear interfaces for all data structures
- No `any` types unless unavoidable
- Props interfaces for all components

### 4. **Predictable State Management**
- React Context for global state (auth, inventory)
- Local state for component-specific data
- No complex state management libraries unless project grows significantly
- Clear data flow: Props down, events up

### 5. **Clean Dependencies**
- Minimal external libraries
- Each dependency must have clear justification
- Regular dependency audits
- No "just in case" libraries

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: UI library with hooks and modern patterns
- **TypeScript**: Type safety and better developer experience
- **Tailwind CSS**: Utility-first styling (no CSS scope issues)
- **Vite**: Fast development and building
- **Firebase**: Authentication and database (when needed)

### Development Tools
- **ESLint**: Code quality enforcement
- **Hot Module Reloading**: Fast development feedback
- **Source Maps**: Easy debugging in production

### Deployment
- **Firebase Hosting**: Deployed to `berjaya-autotech-4b4f4` site
- **Build Process**: `npm run build` → `firebase deploy --only hosting:berjaya-autotech-4b4f4`

## 📁 Project Structure

```
src/
├── components/          # UI components (isolated, single-purpose)
│   ├── Login.tsx       # Authentication UI
│   └── [future components]
├── contexts/           # React contexts for shared state
│   └── AuthContext.tsx # User authentication state
├── services/           # External service integrations
│   └── firebase.ts    # Firebase configuration and auth
├── types/             # TypeScript type definitions
│   └── index.ts       # All app interfaces and types
├── hooks/             # Custom React hooks (future)
├── App.tsx            # Main app component
├── main.tsx           # Application entry point
└── index.css          # Global styles (minimal)
```

## 🚨 MAINTAINABILITY RULES

### When Adding New Features:

1. **Ask First**: Does this feature increase or decrease maintainability?

2. **Component Design**:
   - Can this component be understood in isolation?
   - Does it have a single, clear responsibility?
   - Are the props interface clear and minimal?
   - Can it be easily tested?

3. **State Management**:
   - Is this state truly global or can it be local?
   - Does the data flow remain predictable?
   - Can I trace where this state comes from and where it goes?

4. **Dependencies**:
   - Do we absolutely need this new library?
   - Does it solve a real problem or just add convenience?
   - Will this library still be maintained in 2 years?

5. **Code Patterns**:
   - Is this pattern consistent with the rest of the codebase?
   - Will new developers understand this easily?
   - Am I creating hidden complexity?

### Forbidden Patterns (Lessons from Original Codebase):

❌ **Global event listeners** - Use React event handlers only
❌ **Manual DOM manipulation** - Let React handle the DOM
❌ **Shared mutable state** - Use immutable patterns
❌ **Deeply nested callbacks** - Use async/await and hooks
❌ **Monolithic components** - Break down into smaller pieces
❌ **Implicit dependencies** - Make all dependencies explicit in props/context

## 🎯 Feature Development Guidelines

### Current Features (Completed):
✅ **Authentication**: Google OAuth via Firebase
✅ **Responsive Design**: Mobile-first Tailwind CSS
✅ **Error Handling**: Graceful error states and loading indicators
✅ **Deployment**: Automated build and deploy to Firebase

### Next Features (Priority Order):
1. **Role Selection**: Simple component with clear navigation
2. **Inventory Counting**: Form with validation, mobile-optimized
3. **Manager Dashboard**: Data tables with clear data flow
4. **Transaction Management**: Simple CRUD operations
5. **BOM Operations**: CSV import/export with clear error handling

### Development Process:
1. **Design the component interface first** (props, state, events)
2. **Create TypeScript interfaces** for all data
3. **Build the component in isolation** (can be tested independently)
4. **Integrate with existing app** (minimal changes to other components)
5. **Test on mobile devices** (real phones, not just browser dev tools)
6. **Deploy and validate** (ensure no regressions)

## 🔧 Common Tasks

### Adding a New Feature:
```bash
# 1. Create component with TypeScript
# 2. Add types to src/types/index.ts
# 3. Test locally: npm run dev
# 4. Build: npm run build
# 5. Deploy: firebase deploy --only hosting:berjaya-autotech-4b4f4
```

### Debugging Issues:
- Check browser console for TypeScript errors
- Use React DevTools for component state
- Check Firebase console for authentication issues
- Verify mobile responsiveness on actual devices

### Performance Optimization:
- Use React.memo() for expensive components
- Implement useCallback() for event handlers passed as props
- Add useMemo() for expensive calculations
- Lazy load components if bundle gets large

## 🚨 Emergency Maintainability Checklist

If the codebase starts feeling complex again, ask:

1. **Can I understand each component in 5 minutes?**
2. **Can I predict what happens when I change this code?**
3. **Are there more than 3 levels of nested callbacks/promises?**
4. **Do I need to understand other files to work on this component?**
5. **Would a new developer be productive in this codebase in a day?**

If any answer is "No", **STOP** and refactor before adding more features.

## 🎓 User Learning Context

- User is new to React but experienced with Python/C
- Appreciates detailed comments explaining React concepts
- Values step-by-step guidance over advanced patterns
- Prefers working code over perfect architecture
- Will be sole maintainer of this system

## 📞 Support Information

- **Live Site**: https://berjaya-autotech-4b4f4.web.app
- **Local Development**: http://localhost:3000
- **Firebase Console**: https://console.firebase.google.com/project/berjaya-autotech
- **Original Codebase**: `/berjaya-wms/` (reference only, do not modify)

---

**Remember: Every line of code is a liability. Every feature that doesn't directly serve user needs is technical debt. Maintainability is not optional - it's the difference between a successful project and "another explosion".**