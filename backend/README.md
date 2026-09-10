# Pipeline Backend

Spring Boot 3.4 backend service for Pipeline job tracker. This single application contains three logical modules (gateway, core, ai) organized for future separation into microservices.

## Architecture

- **Gateway** (`io.pipeline.gateway`): HTTP API layer, REST controllers, security, CORS
- **Core** (`io.pipeline.core`): Domain logic, services, repositories for business entities
- **AI** (`io.pipeline.ai`): Placeholder for future LLM integration

See [docs/architecture.md](../docs/architecture.md) for the full migration strategy.

## Prerequisites

- Java 21
- Maven 3.9+
- PostgreSQL 15+ (Supabase instance)

## Environment Variables

The following environment variables are required:

| Variable | Description | Default / Example |
|----------|-------------|-------------------|
| `DATABASE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/pipeline` |
| `DATABASE_USERNAME` | Database username | `postgres` |
| `DATABASE_PASSWORD` | Database password | - |
| `CLERK_JWKS_URI` | Clerk JWKS endpoint for JWT validation | `https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json` |
| `CLERK_ISSUER` | Clerk issuer URL (matches `iss` claim in JWT) | `https://your-clerk-instance.clerk.accounts.dev` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins | `http://localhost:3000,https://pipeline.vercel.app` |
| `PORT` | HTTP port | `8080` |
| `LOG_LEVEL` | Application log level | `INFO` |

### Finding Clerk Configuration

1. Go to the [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **API Keys**
4. Use the **Issuer URL** shown there for both `CLERK_JWKS_URI` (append `/.well-known/jwks.json`) and `CLERK_ISSUER`

Example:
```bash
export CLERK_ISSUER="https://cool-mantis-12.clerk.accounts.dev"
export CLERK_JWKS_URI="https://cool-mantis-12.clerk.accounts.dev/.well-known/jwks.json"
```

## Running Locally

### With Maven

```bash
# Set required environment variables
export DATABASE_URL="jdbc:postgresql://localhost:5432/pipeline"
export DATABASE_USERNAME="postgres"
export DATABASE_PASSWORD="your-password"
export CLERK_JWKS_URI="https://your-clerk.clerk.accounts.dev/.well-known/jwks.json"
export CLERK_ISSUER="https://your-clerk.clerk.accounts.dev"
export CORS_ALLOWED_ORIGINS="http://localhost:3000"

# Run the application
mvn spring-boot:run
```

The API will be available at http://localhost:8080

### With Docker

```bash
docker build -t pipeline-backend .

docker run -p 8080:8080 \
  -e DATABASE_URL="jdbc:postgresql://host.docker.internal:5432/pipeline" \
  -e DATABASE_USERNAME="postgres" \
  -e DATABASE_PASSWORD="your-password" \
  -e CLERK_JWKS_URI="https://your-clerk.clerk.accounts.dev/.well-known/jwks.json" \
  -e CLERK_ISSUER="https://your-clerk.clerk.accounts.dev" \
  -e CORS_ALLOWED_ORIGINS="http://localhost:3000" \
  pipeline-backend
```

## Building

```bash
# Clean build
mvn clean package

# Build without tests
mvn clean package -DskipTests

# Run tests
mvn test

# Full verify (compile, test, integration test)
mvn verify
```

## Database Setup

The backend expects the Supabase schema to already exist. Before running the backend:

1. Run the schema in your Supabase SQL editor: `frontend/supabase/schema.sql`
2. The backend uses Flyway for migration tracking but relies on the existing schema

The application validates the schema on startup using Hibernate's `ddl-auto: validate`.

## API Endpoints

### Public Endpoints

- `GET /actuator/health` - Health check (no auth required)
- `GET /api/v1/health` - API health check (no auth required)

### Authenticated Endpoints

All `/api/v1/applications` endpoints require a valid Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

- `GET /api/v1/applications` - List all applications (optional `?status=` query param)
- `GET /api/v1/applications/{id}` - Get single application
- `POST /api/v1/applications` - Create new application
- `PUT /api/v1/applications/{id}` - Update application
- `DELETE /api/v1/applications/{id}` - Delete application

### Example Request

```bash
curl -X POST http://localhost:8080/api/v1/applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-clerk-jwt>" \
  -d '{
    "company": "Acme Corp",
    "role": "Software Engineer",
    "track": "Software Engineering",
    "status": "Applied",
    "source": "LinkedIn"
  }'
```

## Deployment to Railway

This backend is designed to run on Railway with minimal configuration:

1. Connect your GitHub repository to Railway
2. Set the root directory to `backend/`
3. Railway auto-detects the Dockerfile
4. Add the required environment variables in Railway dashboard
5. Deploy

Railway automatically:
- Builds the Docker image
- Assigns a `PORT` environment variable
- Provides a public URL
- Handles SSL/TLS termination

## Project Structure

```
backend/
├── src/
│   ├── main/
│   │   ├── java/io/pipeline/
│   │   │   ├── PipelineApplication.java       # Main entry point
│   │   │   ├── gateway/
│   │   │   │   ├── config/
│   │   │   │   │   ├── SecurityConfig.java    # Clerk JWT validation
│   │   │   │   │   └── CorsConfig.java        # CORS for frontend
│   │   │   │   ├── controller/
│   │   │   │   │   ├── HealthController.java
│   │   │   │   │   └── ApplicationController.java
│   │   │   │   └── dto/                       # Request/response DTOs
│   │   │   ├── core/
│   │   │   │   ├── domain/
│   │   │   │   │   └── Application.java       # JPA entity
│   │   │   │   ├── repository/
│   │   │   │   │   └── ApplicationRepository.java
│   │   │   │   └── service/
│   │   │   │       └── ApplicationService.java
│   │   │   └── ai/                            # Placeholder for future
│   │   └── resources/
│   │       ├── application.yml                # Main config
│   │       └── db/migration/                  # Flyway migrations
│   └── test/
│       └── java/io/pipeline/                  # Unit tests
├── Dockerfile                                 # Multi-stage build
├── pom.xml                                    # Maven dependencies
└── README.md                                  # This file
```

## Development Notes

### Row-Level Security

The Supabase schema uses PostgreSQL RLS policies to enforce user isolation. The Java backend enforces the same isolation at the application level:

- All repository queries include `userId` filters
- The `userId` is extracted from the Clerk JWT `sub` claim
- Users can only access their own data

### Future Migration Path

This single application is organized into packages (gateway/core/ai) that mirror the intended service split:

1. **Phase 1** (current): Single Spring Boot app, all packages in one JAR
2. **Phase 2**: Convert to Maven multi-module project (3 modules, still one deployable)
3. **Phase 3**: Split into separate services:
   - `gateway-service`: API gateway, auth, routing
   - `core-service`: Business logic, database access
   - `ai-service`: LLM integration, AI features

The `gateway/`, `core-service/`, `ai-service/` directories at the monorepo root are reserved for this future split.

## Troubleshooting

### Build Failures

- Ensure Java 21 is installed: `java -version`
- Clear Maven cache: `mvn clean`
- Check for port conflicts on 8080

### JWT Validation Errors

- Verify `CLERK_JWKS_URI` and `CLERK_ISSUER` match your Clerk instance
- Check that the frontend is sending the correct JWT token
- Enable security logging: `SECURITY_LOG_LEVEL=DEBUG`

### Database Connection Issues

- Verify Supabase connection string format
- Check if IP is allowlisted in Supabase dashboard
- Test connection with `psql`: `psql $DATABASE_URL`

### CORS Errors

- Add your frontend origin to `CORS_ALLOWED_ORIGINS`
- Check browser console for specific CORS error details
- Verify the origin includes protocol and port (e.g., `http://localhost:3000`)

## Contributing

When adding new features:

1. Place HTTP/API code in `gateway` package
2. Place business logic in `core` package
3. Place AI/LLM code in `ai` package
4. Add tests for new endpoints/services
5. Update this README if environment variables change
