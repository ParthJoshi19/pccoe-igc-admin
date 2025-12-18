# PCCOE IGC Admin Portal

A Next.js admin portal for managing judges, teams, and evaluations for the IGC competition.

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (v18 or higher recommended)
- **npm** or **pnpm** (package manager)
- **MongoDB** database (local or cloud instance)
- **Backend API** running (for authentication and some operations)

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd pccoe-igc-admin
   ```

2. **Install dependencies**:
   
   Using npm:
   ```bash
   npm install
   ```
   
   Or using pnpm:
   ```bash
   pnpm install
   ```

## Environment Setup

Create a `.env.local` file in the root directory with the following environment variables:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/igc-admin
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Backend API URL (for authentication and some operations)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
# Replace with your actual backend API URL
```

### Environment Variables Explained:

- **MONGODB_URI**: Connection string for your MongoDB database. The application uses this to connect to the database for storing teams, videos, and other data.
- **NEXT_PUBLIC_BACKEND_URL**: Base URL of your backend API service. This is used for authentication (login, token verification) and some API operations.

## Running the Project

### Development Mode

To run the project in development mode with hot-reload:

Using npm:
```bash
npm run dev
```

Or using pnpm:
```bash
pnpm dev
```

The application will start on `http://localhost:3000` by default.

### Production Build

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Project Structure

```
pccoe-igc-admin/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── judge/             # Judge dashboard pages
│   ├── api/               # API routes
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── admin-dashboard.tsx
│   ├── judge-dashboard.tsx
│   └── ...
├── lib/                  # Utility libraries
│   ├── database.ts       # MongoDB connection
│   ├── auth.ts           # Authentication utilities
│   └── utils.ts          # General utilities
├── models/               # Mongoose models
│   ├── Team.model.ts
│   ├── user.ts
│   └── video.ts
└── contexts/             # React contexts
    ├── auth-context.tsx
    └── theme-context.tsx
```

## Features

- **Admin Dashboard**: Manage judges, teams, and assignments
- **Judge Dashboard**: View assigned teams and evaluate submissions
- **Authentication**: Secure login with role-based access control
- **Team Management**: View and filter teams by location and institution
- **Assignment System**: Assign judges to teams for evaluation

## Troubleshooting

### MongoDB Connection Issues

If you encounter MongoDB connection errors:
1. Ensure MongoDB is running (if using local instance)
2. Verify your `MONGODB_URI` is correct in `.env.local`
3. Check network connectivity if using MongoDB Atlas

### Backend API Issues

If authentication fails:
1. Ensure the backend API is running
2. Verify `NEXT_PUBLIC_BACKEND_URL` points to the correct backend URL
3. Check backend API logs for errors

### Port Already in Use

If port 3000 is already in use:
```bash
# Set a custom port
PORT=3001 npm run dev
```

## Additional Scripts

- `npm run lint` - Run ESLint to check code quality
- `npm run build` - Build the application for production
- `npm start` - Start the production server

## Notes

- The project uses TypeScript for type safety
- Tailwind CSS is used for styling
- shadcn/ui components are used for the UI library
- The project requires both MongoDB and a backend API to function properly


