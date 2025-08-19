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

**Current Status**: v2.1.1 - SKU Synchronization Fix (deployed August 19, 2025)
**IMPORTANT**: Read Eugene_note.md first! Contains complete roadmap and vision.
- **Original Problem**: Complex event management, scope issues, Firebase integration chaos
- **Solution**: Clean React architecture with TypeScript + Tailwind CSS
- **Result**: Live at https://berjaya-autotech-4b4f4.web.app
- **GitHub**: https://github.com/Chyi1214/berjaya-wms-react.git
- **Last Commit**: 5da071c (v2.1.1: Fix version number display + SKU synchronization)
- **Codebase Size**: 44 files, 10,867 lines of TypeScript/React code

### Migration Success Metrics
✅ **Event Management**: React handles all DOM events automatically - no manual cleanup needed
✅ **Scope Issues**: Eliminated through React component isolation
✅ **Firebase Integration**: Clean service layer with proper error handling
✅ **Mobile Experience**: Mobile-first Tailwind CSS design
✅ **Developer Experience**: TypeScript catches errors, hot reloading, clear component structure

## ⚠️ CRITICAL DEPLOYMENT ISSUE

### Bundle Size Crisis - URGENT
**Problem**: Main JavaScript bundle is 751 KB, deployment times 3+ minutes
**Current Status**: ManagerView.tsx is 960 lines (BLOATED!)
**Future Risk**: Scanner integration will add significant complexity
**Impact**: Blocking rapid development and testing cycles

### CRITICAL: Code Splitting Before Scanner Work
**Must implement before v2.2.0 scanner integration**:
1. **Split ManagerView.tsx (960 lines)** → 4-5 smaller components  
2. **Lazy Load Dialogs**: ItemManagementDialog, CSVImportDialog with React.lazy()
3. **Component Structure**: Overview, Inventory, Transactions, ItemMaster as separate files
4. **Expected Results**: Main bundle ~300-400 KB, faster deployments <1 minute

**Next Session Priority**: Code splitting BEFORE scanner features

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

- **Live Site**: https://berjaya-autotech-4b4f4.web.app (v2.1.1)
- **Local Development**: http://localhost:3000
- **Firebase Console**: https://console.firebase.google.com/project/berjaya-autotech
- **GitHub Repo**: https://github.com/Chyi1214/berjaya-wms-react.git
- **Original Codebase**: `/berjaya-wms/` (reference only, do not modify)
- **Eugene's Master Plan**: `/Users/dingjunqi/Desktop/Berjaya WMS playground/Eugene_note.md` (READ FIRST - contains complete roadmap)

## 📊 Current Feature Status (v2.1.1)

### ⚠️ CRITICAL TESTING STATUS
**All functions need comprehensive testing before scanner integration**:
- Item Master CRUD operations (add/edit/delete items)
- BOM Management (create/edit BOMs with components)
- Inventory counting across all zones
- Transaction management with OTP verification
- CSV import/export for all data types
- Multi-language support (5 languages)
- Cross-device real-time synchronization

**Testing Gap**: User reported "all functions still need testing" - comprehensive QA required

## 🔮 Next Major Version: Scanner Integration (v2.2.0)

### Scanner Requirements Planning:
1. **Barcode/QR Code Scanning**: Camera-based item identification
2. **Mobile-First Design**: Optimized for handheld scanner devices
3. **Offline Capability**: Work without internet, sync when connected
4. **Audio Feedback**: Beeps/voice confirmation for scans
5. **Batch Scanning**: Rapid multiple item processing
6. **Integration Points**: 
   - Item Master lookup via barcode
   - BOM component verification
   - Inventory counting automation
   - Transaction item selection

### Technical Challenges:
- **Bundle Size**: Scanner libraries will increase JS bundle significantly
- **Camera Permissions**: Browser security and mobile compatibility
- **Performance**: Real-time image processing on mobile devices
- **Offline Sync**: Complex state management for disconnected operation

### Development Strategy:
1. **Phase 1**: Code splitting and performance optimization (current priority)
2. **Phase 2**: Basic barcode scanning integration
3. **Phase 3**: Advanced scanner features and offline capability
4. **Phase 4**: Production deployment and training

## 📊 Detailed Feature Status (v2.1.1)

### ✅ Completed Features
1. **Authentication**: Google OAuth via Firebase
2. **Role Management**: Logistics, Production, Manager roles  
3. **Inventory Counting**: Multi-zone with real-time sync
4. **Transaction System**: OTP-based secure transfers
5. **Eugene's v2.0.0**: Three-table workflow (Checked, Expected, Yesterday)
6. **CSV Export/Import**: Full data import/export capabilities
7. **Item Master & BOM**: Phase 1 - Data structures and basic CRUD UI
8. **Multi-language**: English, Chinese, Malay, Bengali, Burmese
9. **Cross-device Sync**: Real-time Firebase synchronization

### 🚧 In Progress (50% Complete)
**BOM Implementation - Remaining Phases:**
- **Phase 2**: Autocomplete component (COMPLEX - expect +100 KB bundle size)
- **Phase 3**: BOM expansion logic (convert BOM to individual inventory entries)  
- **Phase 4**: Integration with inventory counting workflow

**Technical Debt (URGENT):**
- Bundle size optimization (blocking deployments)
- Component splitting for maintainability

## 🛠️ Commands for Next Claude

### Development
```bash
npm run dev                    # Start development server
npm run build                  # Build for production
```

### Firebase Deployment  
```bash
firebase deploy --only hosting:berjaya-autotech-4b4f4
# If timeout, check: curl -I https://berjaya-autotech-4b4f4.web.app/
```

### Git Operations
```bash
git status                     # Check changes
git add -A && git commit -m "message" && git push origin main
```

## 🎯 Priority for Next Session - Scanner Preparation

### URGENT (Must Complete Before Scanner Work):
1. **CRITICAL**: Split ManagerView.tsx (960 lines) into 4-5 components
2. **CRITICAL**: Implement React.lazy() for ItemManagementDialog, CSVImportDialog
3. **CRITICAL**: Test bundle size reduction and deployment speed
4. **CRITICAL**: Comprehensive testing of all existing functions

### Scanner Integration Planning (v2.2.0):
1. **Research**: Barcode scanning libraries (QuaggaJS, ZXing, etc.)
2. **Prototype**: Basic camera-based scanning proof of concept
3. **Integration**: Scanner with Item Master lookup
4. **Mobile**: Optimize for handheld scanner devices
5. **Offline**: Design offline-first scanning workflow

### Current System Readiness:
- ✅ Item Master catalog with SKU system (F001, B001, E001 patterns)
- ✅ BOM management for complex assemblies
- ✅ Multi-zone inventory tracking
- ✅ Transaction system with audit trail
- ⚠️ Bundle size blocking rapid development
- ⚠️ All functions need comprehensive testing
- ❌ Scanner integration not started

## 📝 Important Context

- **User Philosophy**: "We are at best half way" - many more features coming
- **Bundle Crisis**: 722 KB now, could reach 1.5-2 MB without optimization
- **Deployment Issues**: Currently times out but succeeds in background
- **Maintainability Focus**: User values simple solutions over complex ones
- **BOM Complexity**: Next autocomplete component will be most complex part

---

**Remember: Every line of code is a liability. Bundle size is now blocking rapid development. Scanner integration will be complex - we MUST have a solid, well-tested foundation first. Fix technical debt and complete testing BEFORE scanner work. Maintainability is not optional - it's the difference between a successful scanner implementation and "another explosion".**

## 🔬 Scanner Integration Research Notes

### Potential Libraries:
- **QuaggaJS**: Barcode scanning, good mobile support
- **ZXing-js**: QR codes and 2D barcodes
- **@capacitor/barcode-scanner**: For mobile apps
- **html5-qrcode**: Lightweight QR code scanning

### Implementation Strategy:
1. **Start Small**: Single SKU lookup via barcode
2. **Expand Gradually**: BOM scanning, inventory counting
3. **Mobile Focus**: Touch-friendly interface for scanners
4. **Progressive Enhancement**: Scanner as optional feature

### Success Metrics:
- Reduce manual typing by 80%+ for inventory counts
- 3-second average scan-to-confirmation time
- 99%+ accuracy with standard automotive part barcodes
- Seamless offline operation for 8+ hour shifts