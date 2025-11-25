# Notification Service

A TypeScript Express.js microservice for handling notifications. This service consumes events from RabbitMQ and sends notifications (emails, SMS, etc.) based on those events.

## Features

- ✅ Event consumption from RabbitMQ
- ✅ Event publishing to RabbitMQ
- ✅ PostgreSQL database support
- ✅ Clean Architecture with Dependency Injection (Inversify)
- ✅ TypeScript with strict mode
- ✅ Structured logging with Pino
- ✅ OpenTelemetry tracing support
- ✅ Health check endpoints

## Architecture

This service follows **Clean Architecture** principles:

```
src/
├── config/          # Database and app configuration
├── controllers/     # HTTP request handlers
├── events/          # Event publishing and consumption
├── logging/         # Logging infrastructure
├── middlewares/     # Error handling and request context
├── routes/          # Route definitions
├── services/        # Business logic layer
└── types/           # Dependency injection types
```

## Prerequisites

- Node.js 20+
- PostgreSQL
- RabbitMQ
- npm or yarn

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file (copy from `.env.example`):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=backboard-postgres
DB_PORT=5432
DB_NAME=backboard-notification-service
DB_USER=postgres
DB_PASSWORD=postgres

# RabbitMQ Configuration
RABBITMQ_URL=amqp://backboard:backboardpass@backboard-rabbitmq:5672
RABBITMQ_VHOST=/
RABBITMQ_EXCHANGE=user.events

# OpenTelemetry Configuration
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://apm-server:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_SERVICE_NAME=notification-service
```

### 3. Database Setup

Ensure PostgreSQL is running. The application will use the database for storing notification-related data.

### 4. Run the Application

Development:
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check

#### Get Service Health
```http
GET /health
```

Returns the health status of the service.

## Event Consumption

This service is designed to consume events from RabbitMQ and process them to send notifications. The event consumption logic will be implemented based on your specific notification requirements.

## Development

### Type Checking
```bash
npm run lint
```

### Build
```bash
npm run build
```

### Testing
```bash
npm test
```

## Project Structure

### Events (`src/events/`)
- Event publishing interface and RabbitMQ implementation
- Ready for event consumption implementation

### Services (`src/services/`)
- **HealthService**: Health check logic

### Controllers (`src/controllers/`)
- **HealthController**: Health check endpoints

### Middlewares (`src/middlewares/`)
- `errorHandler.ts`: Global error handling
- `asyncContext.ts`: Async context for request tracking
- `httpLogger.ts`: HTTP request logging

### Config (`src/config/`)
- Environment configuration
- Database connection
- Dependency injection container (Inversify)

## License

MIT
