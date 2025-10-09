# Payment Service

A robust, scalable payment gateway service built with NestJS, TypeScript, and modern microservices architecture patterns.

## Features

- **Multi-Provider Support**: Paystack, Stanbic IBTC, Klump, Flutterwave
- **Circuit Breaker Pattern**: Fault tolerance and resilience
- **Modular Monolith Architecture**: Clean, maintainable codebase
- **Comprehensive Webhook Handling**: Real-time payment notifications
- **Advanced Security**: Hash validation, signature verification
- **Rate Limiting**: Built-in request throttling
- **Monitoring & Logging**: Comprehensive observability
- **Database Migrations**: Automated schema management
- **API Documentation**: Swagger/OpenAPI integration

## Quick Start

### Prerequisites

- Node.js 18+
- MYSQL 14+
- Redis 6+
- Docker & Docker Compose

### Installation

```bash
# Clone repository
git clone <https://az-gitlab.igbimo.com/KongaPay/payment-service-v2/payment-service-v2>
cd payment-service-v2

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Documentation

Once running, access the API documentation at:
- Swagger UI: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Main application module
├── config/                # Configuration files
├── common/                # Shared utilities and constants
├── database/              # Database entities and migrations
├── charges/               # Charge management module
├── hooks/                 # Webhook handling module
├── payment-requests/      # Payment request module
├── payments/              # Payment processing module
├── providers/             # Payment provider integrations
├── auth/                  # Authentication module
├── merchants/             # Merchant management
├── integrations/          # Integration management
├── notifications/         # Email/SMS notifications
├── settlement/            # Settlement processing
└── monitoring/            # Health checks and metrics
```

## Key Modules

### Charges Module
- Initiate payment charges
- OTP validation
- Transaction management
- Refund processing

### Hooks Module
- Webhook signature verification
- Multi-provider webhook handling
- Real-time status updates

### Payment Requests Module
- Shareable payment links
- Merchant integration management
- Payment request lifecycle

### Providers Module
- Circuit breaker implementation
- Multi-provider abstraction
- Failover mechanisms

## Environment Variables

See `.env.example` for complete configuration options.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `PAYSTACK_SECRET_KEY`: Paystack API secret
- `JWT_SECRET`: JWT signing secret

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Deployment

### Production Build

```bash
npm run build
npm run start:prod
```

### Docker Production

```bash
# Build production image
docker build -t payment-service-v2 .

# Run container
docker run -p 3000:3000 --env-file .env payment-service-v2
```

## Monitoring

The service includes built-in monitoring:

- Health checks at `/health`
- Metrics collection
- Structured logging
- Error tracking
- Performance monitoring

## Security

- Hash validation for all requests
- Webhook signature verification
- Rate limiting per integration
- Input validation and sanitization
- JWT-based authentication
- Sensitive data masking in logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
```

This completes the comprehensive NestJS payment system implementation with:

1. **Modular Architecture**: Clean separation of concerns with dedicated modules
2. **Circuit Breaker Pattern**: Fault tolerance for external payment providers
3. **Multi-Provider Support**: Paystack integration with extensible provider pattern
4. **Comprehensive Error Handling**: Structured error responses and logging
5. **Security Features**: Hash validation, webhook verification, rate limiting
6. **Database Design**: Proper entity relationships and indexes
7. **Observability**: Logging, monitoring, and health checks
8. **Production Ready**: Docker support, environment configuration, migrations

The system follows SOLID principles, implements DRY patterns, and provides a robust foundation for payment processing with Paystack as the primary provider, easily extensible for additional providers like Stanbic, Klump, and Flutterwave.