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
- **Password Reset**: Admin-only password reset functionality
- **Image Upload**: Rich text editor with image support
- **Section Management**: Admin ability to delete sections with cascade handling
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
npm run db:push      # Apply database schema changes
npm run db:studio    # Open Drizzle Studio
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

## 📊 Multi-Tenancy Roadmap

Estimated timeline with AI assistance:
- **Phase 1**: Database Schema (1-2 weeks)
- **Phase 2**: API Updates (1-2 weeks)
- **Phase 3**: Frontend Changes (1 week)
- **Phase 4**: Advanced Features (1-2 weeks)

Total: 4-7 weeks for full SaaS capabilities

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

This is a private project. For access or contributions, please contact the repository owner.

## 📞 Support

For issues or questions:
- Check [TROUBLESHOOTING.md](./migration/TROUBLESHOOTING.md)
- Review [CLAUDE.md](./CLAUDE.md) for development history
- Contact repository maintainers

---

Built with Claude AI assistance - Last updated: 2025-07-28