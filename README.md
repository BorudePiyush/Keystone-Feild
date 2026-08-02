# KEYSTONE 🛠️ - Field Service & Operations Management Platform

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.1-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Keystone** is a full-stack, enterprise-grade Field Service Management (FSM) platform designed to streamline maintenance operations, dispatch field technicians, monitor Service Level Agreement (SLA) compliance, and deliver a seamless self-service experience for commercial facility clients.

---

## 🌟 Key Features & Capabilities

### 📊 1. Executive Operations Dashboard
- **Dynamic SLA Compliance Engine:** Automatically calculates real-time SLA compliance percentages based on priority deadlines (`EMERGENCY`: 4h, `HIGH`: 12h, `MEDIUM`: 24h, `LOW`: 48h) and completion timestamps.
- **Live KPI Analytics:** Instant visibility into Total Work Orders, Active Tickets, Completed Jobs, Overdue Breaches, and On-Duty Staff metrics.
- **Glassmorphic Space Aesthetics:** Glowing neon cards, animated floating background blobs, and tactile hover states.

### 📋 2. Kanban Work Order Lifecycle Management
- **Visual Work Order Board:** Manage tickets across 6 distinct statuses (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `CLOSED`).
- **State Machine Integrity:** Enforces valid lifecycle transitions on backend and frontend.
- **Technician Dispatch:** Assign work orders to available technicians with real-time role filtering.

### 🗺️ 3. GIS Live Staff Tracking Radar Map
- **Leaflet Interactive Map:** Dark-themed GIS map rendering precise geolocated coordinates of on-duty field staff and facility sites.
- **Auto-Fit Spatial Bounds:** Dynamically centers and zooms to fit technician GPS check-ins across global coordinates.
- **Duty Telemetry:** Technicians toggle duty status with live HTML5 Geolocation API check-ins (`navigator.geolocation`).

### 👤 4. Customer Self-Service Care Portal
- **Service Request Submission:** Customers can raise maintenance tickets, select registered facility locations (`HQ Office Tower`, `Downtown Plaza`, etc.), and set priority levels.
- **Live Ticket Tracking:** Real-time timeline view of request progress and technician assignments.

### 📱 5. Technician Field Workspace
- **Job Timers & Labor Logs:** Record actual working hours and notes for completed tasks.
- **Parts & Inventory Tracking:** Track spare parts consumption with automatic inventory decrementing.
- **Expense Loggers:** Submit field expenses (fuel, travel, tools) tied directly to work orders.

### 🔐 6. Authentication & User Profile Management
- **Flexible Auth Modes:** Support for standard Password Login and 6-digit OTP verification codes.
- **Quick Login Demo Accounts:** One-click role buttons on the login screen for instant role testing.
- **Profile & History Timelines:** Manage personal details, photo avatars, and review individual work history logs.

---

## 🛠️ Technology Stack

### Backend Infrastructure
- **Framework:** Spring Boot 3.3.1 (Java 21)
- **Security:** Spring Security with Stateless JWT Authentication & BCrypt Password Hashing
- **ORM & Data Access:** Spring Data JPA / Hibernate (with `EAGER` entity fetching for Jackson JSON serialization safety)
- **Database Migrations:** Flyway Schema Versioning
- **Database:** H2 Database Engine (Local persistent file mode: `./postgres-data/keystonedb.mv.db`) / PostgreSQL ready

### Frontend Architecture
- **Framework:** React 18 with TypeScript & Vite
- **UI & Styling:** Vanilla CSS Design System featuring Glassmorphic Tokens, Radial Meshes, and Fluid Animations
- **Icons & Mapping:** Lucide React Icons & Leaflet GIS Mapping (`leaflet` / `react-leaflet`)

---

## 👥 Seed Demo Accounts (Quick Logins)

The application comes pre-seeded with sample role accounts. You can log in using the **Quick Login Demo** buttons on the login screen or by entering credentials manually:

| Role | Username / Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Manager / Admin** | `manager@keystone.com` | `password` | Executive dashboard, SLA metrics, customer/site oversight, ticket closure |
| **Dispatcher** | `dispatcher@keystone.com` | `password` | Work order dispatching, Kanban board management, staff radar tracking |
| **Technician** | `tech1@keystone.com` | `password` | Field view, duty GPS toggle, labor time & parts usage logging, job completion |
| **Customer Care** | `customer@keystone.com` | `password` | Customer Portal, ticket submission for registered facility sites, status tracking |

---

## 🚀 Local Setup & Running Guide

### Prerequisites
- **Java Development Kit (JDK 21+)** installed and configured on your `PATH`.
- **Node.js (v18+)** and **npm** installed.

---

### Option A: One-Click Startup (Windows Script)

Run the included automated batch launcher script from the root directory:

```cmd
run_keystone.bat
```

This will automatically launch the **Spring Boot Backend** (Port `8080`) and **React Frontend** (Port `5173`) in separate terminal windows.

---

### Option B: Manual Command-Line Startup

#### 1. Launch the Backend Server

Open a terminal in the project directory:

```bash
cd backend
# Run Spring Boot backend using the embedded Maven wrapper
..\.maven\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
```
*(On Linux/macOS, use `./mvnw spring-boot:run`)*

- **Backend API Base URL:** `http://localhost:8080`
- **Swagger Interactive API Documentation:** `http://localhost:8080/swagger-ui/index.html`

#### 2. Launch the Frontend Dev Server

Open a second terminal window in the project directory:

```bash
cd frontend
# Install npm dependencies (if running for the first time)
npm install

# Start Vite dev server
npm run dev
```

- **Frontend Application URL:** [http://localhost:5173/](http://localhost:5173/)

---

## 🔌 Core API Endpoints Overview

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate user & return JWT token | Public |
| `POST` | `/api/auth/otp/send` | Generate and send 6-digit OTP code | Public |
| `GET` | `/api/work-orders` | List work orders with pagination & filters | Authenticated |
| `POST` | `/api/work-orders` | Create a new maintenance ticket | Customer / Dispatcher / Manager |
| `PATCH` | `/api/work-orders/{id}/status` | Update ticket status with state machine guards | Technician / Dispatcher / Manager |
| `GET` | `/api/customers` | Fetch customer directory | Dispatcher / Manager |
| `GET` | `/api/sites` | List facility sites system-wide | Authenticated |
| `GET` | `/api/customers/{id}/sites` | List facility sites for a specific customer | Authenticated |
| `GET` | `/api/users/technicians` | Fetch list of active technicians and GPS locations | Dispatcher / Manager |
| `GET` | `/api/users/profile` | Retrieve logged-in user profile details | Authenticated |
| `GET` | `/api/users/profile/history` | Retrieve user working history & log timeline | Authenticated |

---

## 📁 Repository Directory Structure

```
Keystone/
├── backend/                             # Spring Boot 3 Application
│   ├── src/main/java/com/meridian/keystone/
│   │   ├── config/                      # Web & Security Configurations
│   │   ├── controller/                  # REST API Controllers
│   │   ├── domain/                      # JPA Entities (WorkOrder, Site, User, etc.)
│   │   ├── dto/                         # Data Transfer Objects
│   │   ├── repository/                  # Spring Data JPA Repositories
│   │   ├── security/                    # JWT Filters & Token Provider
│   │   └── service/                     # Business Logic & SLA Schedulers
│   ├── src/main/resources/
│   │   ├── application.yml              # Application Properties
│   │   └── db/migration/                # Flyway SQL Migrations (V1, V2 seed)
│   └── pom.xml                          # Maven Dependencies Specification
│
├── frontend/                            # React + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/                  # UI Views (ManagerDashboard, Kanban, GIS Map, etc.)
│   │   ├── App.tsx                      # Main Application Router & Theme Layout
│   │   ├── main.tsx                     # React Entry Point
│   │   └── index.css                    # Glassmorphism Design System & Utility Tokens
│   ├── index.html                       # HTML Entry Document
│   └── package.json                     # Frontend Dependencies & Scripts
│
├── postgres-data/                       # Persistent local H2 database storage
├── run_keystone.bat                     # One-click Windows startup script
└── README.md                            # Project Documentation
```

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and build upon it!
