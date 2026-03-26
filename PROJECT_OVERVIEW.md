# Smart Tax BD Server - Project Overview

## 📌 Project Description
The backend server for the Smart Tax BD platform, responsible for managing user data, tax calculations, payment processing, file management, and OCR processing. It provides a RESTful API for both the client and admin applications.

## 🛠 Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **Payment Gateway**: SSLCommerz
- **File Storage**: Cloudinary (via Multer)
- **Messaging/Task Queue**: RabbitMQ (amqplib)
- **OCR**: Tesseract.js
- **Real-time**: Socket.io
- **Scheduling**: node-cron
- **Logging**: Winston

## 📂 Key Directory Structure
- `src/server.ts`: Entry point of the application.
- `src/app.ts`: Express application configuration and middleware setup.
- `src/app/module/`: Contains feature-based modules (User, Tax, Payment, etc.). Each module typically includes:
  - `*.controller.ts`: Handles HTTP requests.
  - `*.service.ts`: Business logic.
  - `*.route.ts`: Defined routes for the module.
  - `*.interface.ts`: TypeScript interfaces.
  - `*.model.ts`: Mongoose models.
  - `*.validation.ts`: Zod validation schemas.
- `src/app/routes/`: Centralized API route definitions.
- `src/app/middlewares/`: Global and custom middlewares (Auth, Error handling, etc.).
- `src/app/config/`: App configuration and environment variables.
- `src/app/utils/`: Utility functions.

## 🚀 Key Features
- **Authentication & Authorization**: Role-based access control (User/Admin).
- **Tax Management**: Processing and storing tax-related documents and data.
- **OCR Integration**: Extracting data from uploaded documents using Tesseract.js.
- **Payment Integration**: Secure transactions via SSLCommerz.
- **File Uploads**: Image and document management using Cloudinary.
- **Real-time Notifications**: Socket.io for live updates.
- **Background Jobs**: Cron jobs for automated tasks and RabbitMQ for message queuing.

## 📜 Available Commands
- `pnpm dev`: Starts the server in development mode with auto-reload.
- `pnpm build`: Compiles TypeScript to JavaScript in the `dist/` directory.
- `pnpm start`: Runs the compiled server from `dist/server.js`.

## 📝 Important Notes for AI Agents
- The project follows a strict modular architecture. When adding new features, always create a new folder under `src/app/module/`.
- Use Zod for request body validation.
- All API responses should follow the standardized response format defined in `src/app/utils/sendResponse.ts` (if it exists).
- Sensitive information is stored in the `.env` file.
