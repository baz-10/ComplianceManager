# ComplianceManager

A CASA-compliant document management system for aviation operations manuals, policies, and regulatory compliance tracking.

## 🚀 Features

### Core Functionality
- **Manual Management**: Create, organize, and maintain operations manuals with hierarchical sections
- **Policy Management**: Version-controlled policies with rich text editing and acknowledgment tracking
- **User Roles**: Three-tier permission system (Admin, Editor, Reader)
- **Compliance Tracking**: Audit trails, acknowledgment records, and compliance reporting
- **Document Export**: PDF and HTML export with professional formatting
- **Archive System**: 30-day soft delete with restoration capabilities

### Recent Additions
- **AI Policy Drafting**: Topic/Context prompts to generate clean HTML drafts
- **Editor Preview**: Toggle to preview rendered policy, plus Copy/ Clear actions
- **Inline Policy Management**: View, Edit, Publish/Unpublish (Admin), Delete
- **Show more/less**: Expand/collapse policy previews in section tree
- **Password Reset**: Admin-only password reset functionality
- **Analytics Dashboard**: Real-time compliance metrics and user activity tracking
- **Audit Trail**: Comprehensive logging for CASA compliance

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack Query, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless)
- **Authentication**: Passport.js with session-based auth
- **File Storage**: Local filesystem with multer
- **AI Integration**: OpenAI API for policy suggestions

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- OpenAI API key (for AI features)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/baz-10/ComplianceManager.git
   cd ComplianceManager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with:
   DATABASE_URL="postgresql://[username]:[password]@[endpoint]/[database]?sslmode=require"
   OPENAI_API_KEY="your-openai-key"
   SESSION_SECRET="your-session-secret-min-32-chars"
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000
   - First user registered becomes admin

## 📁 Project Structure

```
ComplianceManager/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Utility functions
├── server/              # Express backend
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   └── routes.ts        # API routes
├── db/                  # Database configuration
│   └── schema.ts        # Drizzle ORM schema
├── migration/           # PDF migration tools
└── docs/                # Documentation
```

## 🏗️ Architecture Overview

```
[Client]
React 18 + Vite + TanStack Query
   |
   | HTTP (\n/api/*)
   v
[Server]
Express (server/index.ts)
  ├─ Auth: Passport + sessions
  ├─ Routes: server/routes.ts → controllers/*
  ├─ AI: server/services/aiService.ts (OpenAI)
  └─ Static: serves dist/public, uploads/ at /uploads
   |
   v
[Data]
Drizzle ORM (@db) → PostgreSQL (Neon)

Dev: Vite middleware with HMR; Prod: `vite build` → `dist/public` + Node `dist/index.js`.
```

## 🔑 Key Features Explained

### User Roles
- **Admin**: Full system access, user management, archive control
- **Editor**: Create/edit manuals and policies, cannot manage users
- **Reader**: View and acknowledge policies, no editing rights

### Compliance Features
- **Audit Trail**: Every action logged with user, timestamp, and details
- **Digital Signatures**: Hash-based content verification
- **Version Control**: Complete history of all policy changes
- **Acknowledgments**: Track who has read and accepted policies

### Archive System
- Soft delete with 30-day retention
- Restore capability within retention period
- Automatic permanent deletion after 30 days
- Audit logging of all archive operations

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Apply database schema changes (drizzle)
npm run db:migrate:all # Run SQL migrations (org/sections/cascade)
npm run check        # TypeScript type checking
```

### Database Migrations
When schema changes are made:
```bash
npm run db:push      # Apply changes to database
```

### Testing (Coming Soon)
```bash
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Generate coverage report
```

## 🚀 Deployment

### Replit Deployment
1. Import from GitHub
2. Set environment variables in Secrets
3. Run `npm run db:push` in shell
4. Deploy

### Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```
2. Set production environment variables
3. Run with process manager:
   ```bash
   NODE_ENV=production node server/index.js
   ```

## 📊 2025 Product Roadmap & Market Opportunity

### Market Position
ComplianceManager targets the $1.8B → $3.5B (by 2033) aviation compliance software market, competing with established players like Comply365, Web Manuals, and Vistair.

### Critical Development Phases (12-Month Plan)

#### Phase 1: Mobile Foundation (Months 1-3) 🔴 CRITICAL
**Market Gap**: No mobile/offline access (blocking enterprise sales)
- Progressive Web App (PWA) with offline document access
- Mobile-responsive interface redesign  
- Background synchronization & conflict resolution
- **Revenue Impact**: Unlock $200K-500K in pending deals

#### Phase 2: Enterprise Document Support (Months 4-6) 🟡 HIGH  
**Market Gap**: Limited to text-based content vs. multi-OEM competitors
- XML/SGML/S1000D document format support
- Boeing/Airbus technical data integration
- Advanced search & metadata management
- **Revenue Impact**: Enable $500K-1M enterprise contracts

#### Phase 3: AI-Powered Intelligence (Months 7-9) 🟡 MEDIUM
**Market Opportunity**: Premium differentiation through predictive compliance
- Predictive compliance analytics & risk assessment
- Intelligent content categorization & workflow routing  
- Real-time compliance dashboards & trend analysis
- **Revenue Impact**: 30-40% premium pricing capability

#### Phase 4: Collaboration & Integration (Months 10-12) 🟢 ENHANCEMENT
**Competitive Advantage**: Superior user experience & workflow efficiency
- Real-time collaborative editing with conflict resolution
- ERP/communication platform integrations (SAP, Slack, Teams)
- Advanced multi-step approval workflows
- **Revenue Impact**: Enhanced retention & per-seat expansion

### Multi-Tenancy Implementation (Parallel Track)
- **Phase 1**: Database Schema (1-2 weeks)  
- **Phase 2**: API Updates (1-2 weeks)
- **Phase 3**: Frontend Changes (1 week)
- **Phase 4**: Advanced Features (1-2 weeks)

**Total**: 4-7 weeks for full SaaS capabilities

### Revenue Projections
- **Year 1**: $1.95M (68 customers, $29K avg deal)
- **Year 2**: $4.2M (120 customers, $35K avg deal)  
- **Year 3**: $8.4M (200 customers, $42K avg deal)

See [MARKET_RESEARCH_2025.md](./MARKET_RESEARCH_2025.md) for comprehensive analysis.

## 🐛 Known Issues

See [IMPROVEMENT_TICKETS.md](./IMPROVEMENT_TICKETS.md) for detailed improvement roadmap.

### Critical Priorities
- Mobile responsiveness improvements
- Security hardening (CSRF, headers)
- Database performance indexes
- Test coverage implementation

## 📄 License

Proprietary - All rights reserved

## 🤝 Contributing

- See the contributor guide: [AGENTS.md](./AGENTS.md)
- Review development log and workflows: [CLAUDE.md](./CLAUDE.md)
- Roadmap context: [IMPROVEMENT_TICKETS.md](./IMPROVEMENT_TICKETS.md) and the "2025 Product Roadmap" section above.

This is a private project. For access or contributions, please contact the repository owner.

## 📞 Support

For issues or questions:
- Read the User Guide: [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)
- Check [TROUBLESHOOTING.md](./migration/TROUBLESHOOTING.md)
- Review [CLAUDE.md](./CLAUDE.md) for development history
- Contact repository maintainers

---

Built with Claude AI assistance - Last updated: 2025-07-28
