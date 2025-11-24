# Challenge Backend - B2B Order Management System

A production-ready distributed system implementing a B2B order management platform with robust consistency guarantees, idempotency controls, and service-to-service authentication.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/lambda/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌐 Live Demo

| Service | Endpoint | Description |
|---------|----------|-------------|
| **Lambda Orchestrator (AWS Lambda)** | `https://3pmdcfqa56.execute-api.us-east-1.amazonaws.com/prod/orchestrator/create-and-confirm-order` | BFF Layer - Serverless orchestration (*Requires POST Body*) |
| **Customers API** | `http://18.222.199.50:3001/health` | Customer management service |
| **Orders API** | `http://18.222.199.50:3002/health` | Order & inventory management |

### Quick Test

```bash
# Create and confirm an order via the orchestrator
curl -X POST https://3pmdcfqa56.execute-api.us-east-1.amazonaws.com/prod/orchestrator/create-and-confirm-order \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "qty": 2}
    ],
    "idempotency_key": "unique-key-123",
    "correlation_id": "req-001"
  }'
```

### Additional API Examples

```bash
# Create a new customer (Customers API)
curl -X POST http://18.222.199.50:3001/customers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ACME Corp",
    "email": "contact@acme.com",
    "phone": "+1234567890"
  }'

# List customers with cursor pagination
curl "http://18.222.199.50:3001/customers?limit=10&cursor=5"

# Create a product (Orders API)
curl -X POST http://18.222.199.50:3002/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "PROD-001",
    "name": "Premium Widget",
    "price_cents": 129900,
    "stock": 100
  }'

# List products with search
curl "http://18.222.199.50:3002/products?search=widget&limit=10"

# List orders with filters
curl "http://18.222.199.50:3002/orders?status=CONFIRMED&limit=10"
```

---

## 🚀 Architecture & Features

### System Design

This project implements a **microservices architecture** with a **BFF (Backend for Frontend)** pattern using AWS Lambda as the orchestration layer. The design prioritizes consistency, reliability, and scalability.

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Lambda Orchestrator                   │
│              (Serverless Framework v3 - Node 22)             │
│         Coordinates order creation & confirmation            │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
             │ JWT Auth                        │ JWT Auth
             ▼                                 ▼
   ┌─────────────────┐              ┌─────────────────────┐
   │  Customers API  │              │    Orders API       │
   │   (Node 20)     │              │    (Node 20)        │
   │   Port 3001     │              │    Port 3002        │
   └────────┬────────┘              └──────────┬──────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           ▼
                   ┌───────────────┐
                   │  MySQL 8.0    │
                   │   (Docker)    │
                   └───────────────┘
```

### 🏗️ Technical Highlights

#### 1. **Clean Architecture**
- **Layered Design:** Router → Controller → Service → Repository
- **Dependency Injection:** Services receive repositories, enabling testability
- **Single Responsibility:** Each layer has a clear, focused purpose

#### 2. **Data Consistency & Concurrency Control**
- **ACID Transactions:** All order operations wrapped in database transactions
- **Pessimistic Locking:** `SELECT ... FOR UPDATE` prevents race conditions on stock
- **Atomic Operations:** Stock decrements and order creation happen atomically

```javascript
// Example: Stock reservation with pessimistic locking
await connection.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [productId]);
await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [quantity, productId]);
```

#### 3. **Idempotency Guarantees**
- **Database-Backed Keys:** Idempotency keys stored in MySQL (not in-memory)
- **Network Resilience:** Duplicate requests return cached responses (201 → 200)
- **Distributed Safety:** Works across Lambda cold starts and API restarts

```javascript
// Idempotency implementation
const existing = await checkIdempotencyKey(key);
if (existing) return { statusCode: 200, body: existing.response };
```

#### 4. **Service-to-Service Security**
- **JWT Authentication:** Signed tokens (HS256) for inter-service communication
- **Secret Rotation:** Included script for zero-downtime secret updates
- **No Static Tokens:** Eliminates hardcoded credentials

#### 5. **Performance Optimizations**
- **Cursor-Based Pagination:** `WHERE id > ?` instead of `OFFSET` for large datasets
- **Connection Pooling:** Reusable MySQL connections across requests
- **Efficient Queries:** Indexed lookups and minimal N+1 patterns

---

## 🔧 Environment Variables

Each service requires specific environment variables. Copy the `.env.example` files and configure as needed:

### Customers API (`customers-api/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3001` |
| `DB_HOST` | MySQL host address | `localhost` or `db` (Docker) |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `DB_NAME` | Database name | `challenge_db` |
| `JWT_SECRET` | Secret key for JWT verification | `your_jwt_secret_key` |

### Orders API (`orders-api/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3002` |
| `DB_HOST` | MySQL host address | `localhost` or `db` (Docker) |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | Database username | `root` |
| `DB_PASSWORD` | Database password | `your_secure_password` |
| `DB_NAME` | Database name | `challenge_db` |
| `CUSTOMERS_API_URL` | Internal endpoint for customer validation | `http://customers-api:3001/internal/customers` |
| `SERVICE_TOKEN` | JWT token for service-to-service auth | Generated via `npm run generate:token` |

### Lambda Orchestrator (`lambda-orchestrator/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `CUSTOMERS_API_URL` | Base URL for Customers API | `http://18.222.199.50:3001` (production) or `http://localhost:3001` (local) |
| `ORDERS_API_URL` | Base URL for Orders API | `http://18.222.199.50:3002` (production) or `http://localhost:3002` (local) |
| `SERVICE_TOKEN` | JWT token for API authentication | Same token generated for Orders API |

### Generating Credentials

To generate a new JWT secret and service token:

```bash
npm run generate:token
```

This will output both `JWT_SECRET` and `SERVICE_TOKEN` values to use across all services.

---

## ⚡️ Quick Start (Local)

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)

### Zero-Config Setup

1. **Clone and configure environment**
   ```bash
   git clone <repository-url>
   cd challeng-jelouAi
   
   # Copy environment templates
   cp customers-api/.env.example customers-api/.env
   cp orders-api/.env.example orders-api/.env
   cp lambda-orchestrator/.env.example lambda-orchestrator/.env
   ```

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

3. **Verify services**
   ```bash
   # Check Customers API
   curl http://localhost:3001/health
   
   # Check Orders API
   curl http://localhost:3002/health
   
   # Test Lambda Orchestrator (local)
   cd lambda-orchestrator
   npm run dev
   curl http://localhost:3000/dev/orders -X POST \
     -H "Content-Type: application/json" \
     -H "X-Idempotency-Key: test-key-123" \
     -d '{"customerId": 1, "items": [{"productId": 101, "quantity": 1}]}'
   ```

### Database Initialization
The MySQL container automatically runs migrations on startup. Initial schema includes:
- `customers` table
- `products` table with stock tracking
- `orders` and `order_items` tables
- `idempotency_keys` table

---

## 🧪 Testing Strategy

### Integration Tests (E2E)
```bash
cd tests
npm install
npm test
```
**Coverage:** Full order lifecycle, idempotency, stock validation, error scenarios.

### Unit Tests (Business Logic)
```bash
cd orders-api
npm run test:coverage
```
**Focus:** Service layer logic, stock calculations, transaction handling.

### Manual Testing
Use the included Postman collection or cURL examples in `/docs/api-examples.md`.

---

## ☁️ Cloud Deployment (Hybrid Architecture)

### Backend Services (AWS EC2)

1. **Provision EC2 instance** (t3.micro recommended for Free Tier)
   ```bash
   # SSH into your EC2 instance
   ssh -i your-key.pem ec2-user@TU_IP_EC2
   ```

2. **Install Docker & Docker Compose**
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo usermod -aG docker ubuntu
   # Log out and log back in for group changes to take effect
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Deploy services**
   ```bash
   git clone <repository-url>
   cd challeng-jelouAi
   
   # Configure production environment
   cp customers-api/.env.example customers-api/.env
   cp orders-api/.env.example orders-api/.env
   # Edit .env files with production values
   
   docker-compose up -d --build
   ```

4. **Configure Security Groups**
   - Allow inbound traffic on ports 3001, 3002 (or use ALB)
   - Restrict MySQL port 3306 to localhost only

### Lambda Orchestrator (AWS Lambda)

1. **Configure AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy to Lambda**
   ```bash
   cd lambda-orchestrator
   npm install
   
   # Update serverless.yml with your environment variables
   # Set CUSTOMERS_API_URL and ORDERS_API_URL to your EC2 endpoints
   
   serverless deploy --stage prod
   ```

3. **Note the API Gateway URL** from deployment output and update your clients.

### Environment Variables (Production)
```bash
# customers-api/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=customers_db
JWT_SECRET=your_production_secret_key

# orders-api/.env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=orders_db
JWT_SECRET=your_production_secret_key

# lambda-orchestrator (serverless.yml environment section)
CUSTOMERS_API_URL=http://TU_IP_EC2:3001
ORDERS_API_URL=http://TU_IP_EC2:3002
JWT_SECRET=your_production_secret_key
```

---

## � FinOps & Infrastructure Lifecycle

To ensure cost efficiency and security, the infrastructure includes an automated shutdown strategy:

* **Resource TTL (Time-To-Live):** An **AWS EventBridge Schedule** has been configured to automatically invoke the `EC2:StopInstances` API action on **November 30th, 2025** (Adjust date as needed).
* **Cost Management:** This ensures compute resources are not left running indefinitely post-evaluation, adhering to best cloud cost management practices (preventing bill shock).
* **Serverless Efficiency:** The Lambda Orchestrator remains deployed as it follows a "Scale-to-Zero" model, incurring no costs when idle. It will be decommissioned via `serverless remove` after the review phase.

---

## �📁 Project Structure

```
challeng-jelouAi/
├── customers-api/          # Customer management microservice
│   ├── src/
│   │   ├── routes/        # Express routes
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   └── repositories/  # Data access layer
│   └── Dockerfile
├── orders-api/            # Order & inventory microservice
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/      # Stock management, transactions
│   │   └── repositories/
│   └── Dockerfile
├── lambda-orchestrator/   # BFF orchestration layer
│   ├── src/
│   │   ├── handlers/      # Lambda function handlers
│   │   └── services/      # Orchestration logic
│   └── serverless.yml
├── tests/                 # Integration test suite
├── docker-compose.yml     # Local development setup
└── README.md
```

---

## 🔐 Security Considerations

- **JWT Rotation:** Use `npm run generate:token` utility for generating fresh, cryptographically strong credentials for zero-downtime updates.
- **Environment Isolation:** Never commit `.env` files (use `.env.example` templates)
- **SQL Injection Prevention:** Parameterized queries throughout
- **Rate Limiting:** Recommended for production (not included in base implementation)

---

## 🔮 Future Improvements

While this system is production-ready for its scope, the following enhancements would scale it to enterprise-grade:

1. **Continuous Deployment (CD)**
   - Extend the current GitHub Actions CI pipeline (which currently runs tests) to automatically deploy updates to AWS EC2 and Lambda upon merging to main branch.
   - Implement Blue/Green deployment strategy for zero-downtime updates.

2. **Infrastructure as Code**
   - Terraform modules for EC2, RDS, Lambda, and networking
   - Automated environment provisioning

3. **HTTPS & Domain Management**
   - Certbot for SSL certificates on EC2
   - Custom domain with Route 53 and API Gateway

4. **Asynchronous Processing**
   - SQS queues for order confirmation workflows
   - SNS notifications for order status updates

5. **Observability**
   - CloudWatch dashboards and alarms
   - Distributed tracing with X-Ray
   - Centralized logging with ELK stack

6. **Database Scaling**
   - Migration to AWS RDS with Multi-AZ
   - Read replicas for query optimization
   - Connection pooling with RDS Proxy

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author: Oscar Alatrista

Built with ❤️ as a technical challenge demonstrating:
- Distributed systems design
- Transactional consistency patterns
- Serverless orchestration
- Clean architecture principles

**Questions?** Open an issue or reach out:
- **GitHub:** [github.com/Ossfit/challeng-jelouAi](https://github.com/Ossfit/challeng-jelouAi)
- **LinkedIn:** [linkedin.com/in/oscar-alatrista](https://linkedin.com/in/oscar-alatrista)