# IPDR Investigation System - Backend

A comprehensive backend system for IPDR (Internet Protocol Detail Records) analysis and investigation, designed specifically for law enforcement agencies.

## 🚀 Features

### Core Functionality
- **IPDR Data Management**: Complete CRUD operations for IPDR records
- **Bulk Data Processing**: CSV upload and processing with validation
- **Advanced Search**: Multi-criteria search across all data fields
- **Real-time Analytics**: Dashboard statistics and trends
- **Suspicious Activity Detection**: Automated pattern recognition
- **Geographic Analysis**: Cell tower mapping and location clustering
- **Network Relationship Mapping**: A-party to B-party connection analysis

### Security & Authentication
- **JWT-based Authentication**: Secure token-based auth system
- **Role-based Access Control**: Detective, Analyst, Supervisor, Admin roles
- **Account Security**: Login attempt limiting and account lockout
- **Data Encryption**: Secure password hashing and sensitive data protection
- **Audit Logging**: Comprehensive activity tracking

### Investigation Management
- **Case Management**: Create and manage investigation cases
- **Evidence Linking**: Connect IPDR records to investigations
- **Timeline Tracking**: Event history and case progression
- **Collaborative Features**: Multi-user case assignment
- **Report Generation**: Comprehensive investigation reports

## 📋 Prerequisites

- Node.js 14.0 or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ipdr-investigation-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod

   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Initialize the database**
   ```bash
   npm run seed
   ```

6. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - User logout

### IPDR Management
- `GET /api/ipdr/records` - Get all IPDR records (with filters)
- `POST /api/ipdr/records` - Add single IPDR record
- `POST /api/ipdr/upload` - Bulk upload from CSV
- `POST /api/ipdr/search/phone` - Search by phone number
- `POST /api/ipdr/search/advanced` - Advanced multi-criteria search
- `POST /api/ipdr/geographic` - Get geographic data for mapping

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/trends` - Activity trends
- `GET /api/analytics/top-communicators` - Top communicators
- `GET /api/analytics/relationships` - Network relationships
- `GET /api/analytics/suspicious` - Suspicious activity analytics

### Search
- `POST /api/search/global` - Global search across entities
- `GET /api/search/suggestions` - Search suggestions
- `POST /api/search/export` - Export search results

## 🗄️ Database Schema

### IPDR Model
- Network information (IPs, ports)
- User identification (phone, IMEI, IMSI)
- Time and location data
- Data volume metrics
- Access type and suspicious flags

### User Model
- Authentication and authorization
- Role and department assignment
- Activity tracking and preferences

### Investigation Model
- Case management and assignment
- Evidence linking and timeline
- Notes and collaboration features

### Suspicious Activity Model
- Pattern detection and classification
- Risk scoring and investigation status

## 🔧 Configuration

### Environment Variables
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ipdr_investigation
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
```

### Default Users
- **Admin**: admin@ipdr-system.gov / Admin@123456
- **Detective**: detective.smith@ipdr-system.gov / Detective@123
- **Analyst**: analyst.doe@ipdr-system.gov / Analyst@123

## 🔍 Usage Examples

### Login and Get Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ipdr-system.gov", "password": "Admin@123456"}'
```

### Upload IPDR Data
```bash
curl -X POST http://localhost:5000/api/ipdr/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "ipdrFile=@data.csv"
```

### Get Dashboard Statistics
```bash
curl -X GET http://localhost:5000/api/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Advanced Search
```bash
curl -X POST http://localhost:5000/api/ipdr/search/advanced \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["9199236069"],
    "dateRange": {
      "start": "2020-01-01",
      "end": "2020-12-31"
    },
    "suspiciousOnly": true
  }'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "IPDR Controller"
```

## 📊 Performance

- **Database Indexing**: Optimized indexes for fast queries
- **Pagination**: Efficient data loading with pagination
- **Caching**: Redis caching for frequently accessed data
- **Rate Limiting**: API rate limiting for security
- **Connection Pooling**: MongoDB connection pooling

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Request validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting
- Audit logging

## 📈 Monitoring & Logging

- Winston logging with file rotation
- Error tracking and reporting
- Performance monitoring
- Database query optimization
- Real-time system metrics

## 🚀 Deployment

### Production Deployment
1. Set environment to production
2. Configure production database
3. Set secure JWT secret
4. Enable HTTPS
5. Configure reverse proxy (Nginx)
6. Set up monitoring and logging
7. Configure automated backups

### Docker Deployment
```bash
# Build image
docker build -t ipdr-backend .

# Run container
docker run -d -p 5000:5000 --name ipdr-backend ipdr-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## 📞 Support

For technical support or questions:
- Email: tech-support@ipdr-system.gov
- Documentation: [Internal Wiki]
- Issue Tracker: [Internal System]

---

**Classification**: CONFIDENTIAL  
**Version**: 1.0.0  
**Last Updated**: August 2025
