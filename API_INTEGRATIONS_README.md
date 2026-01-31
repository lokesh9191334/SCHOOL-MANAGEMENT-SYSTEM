# API Integrations for School Management System

## Overview

The School Management System now includes comprehensive API integrations with external services to enhance functionality and provide a complete communication ecosystem. This document covers all available integrations and how to configure them.

## Supported Integrations

### 1. **Email Service Integration**
Send automated emails for notifications, announcements, and communications.

**Features:**
- HTML and plain text email support
- Template-based emails
- Delivery tracking and analytics
- Bounce and unsubscribe handling

**Configuration:**
```python
EMAIL_API_KEY = "your-email-api-key"
EMAIL_API_URL = "https://api.emailservice.com/v1"
FROM_EMAIL = "noreply@school.com"
```

**API Endpoints:**
- `POST /api/integrations/email/send` - Send email

### 2. **SMS Service Integration**
Send SMS notifications for urgent communications and reminders.

**Features:**
- Global SMS delivery
- Delivery receipts
- Cost optimization
- Unicode support for multiple languages

**Configuration:**
```python
SMS_API_KEY = "your-sms-api-key"
SMS_API_URL = "https://api.smsservice.com/v1"
SMS_SENDER_ID = "SCHOOL"
```

**API Endpoints:**
- `POST /api/integrations/sms/send` - Send SMS

### 3. **Push Notification Service**
Send real-time push notifications to mobile apps and browsers.

**Features:**
- Cross-platform support (iOS, Android, Web)
- Rich notifications with images and actions
- Scheduled notifications
- User segmentation

**Configuration:**
```python
PUSH_API_KEY = "your-push-api-key"
PUSH_API_URL = "https://api.pushservice.com/v1"
PUSH_APP_ID = "school-app"
```

**API Endpoints:**
- `POST /api/integrations/push/send` - Send push notification

### 4. **Payment Gateway Integration**
Process online fee payments securely.

**Features:**
- Multiple payment methods (cards, UPI, wallets)
- PCI DSS compliance
- Automatic reconciliation
- Refund processing

**Configuration:**
```python
PAYMENT_API_KEY = "your-payment-api-key"
PAYMENT_API_URL = "https://api.paymentgateway.com/v1"
PAYMENT_MERCHANT_ID = "school-merchant"
```

**API Endpoints:**
- `POST /api/integrations/payment/create-link` - Create payment link
- `GET /api/integrations/payment/verify/<payment_id>` - Verify payment

### 5. **Cloud Storage Integration**
Store and manage documents, images, and files securely.

**Features:**
- Unlimited storage
- CDN delivery for fast access
- Automatic backups
- Access control and sharing

**Configuration:**
```python
STORAGE_API_KEY = "your-storage-api-key"
STORAGE_API_URL = "https://api.storageservice.com/v1"
STORAGE_BUCKET = "school-documents"
```

**API Endpoints:**
- `POST /api/integrations/storage/upload` - Upload file

## Setup Instructions

### 1. **Create Configuration File**
Copy the example configuration file and update with your API keys:

```bash
cp config/api_config.example.py config/api_config.py
```

Edit `config/api_config.py` with your actual API credentials.

### 2. **Install Dependencies**
Add required packages to `requirements.txt`:

```txt
requests==2.31.0
python-dotenv==1.0.0
```

### 3. **Environment Variables**
Set environment variables for production:

```bash
export EMAIL_API_KEY="your-key"
export SMS_API_KEY="your-key"
export PUSH_API_KEY="your-key"
export PAYMENT_API_KEY="your-key"
export STORAGE_API_KEY="your-key"
```

### 4. **Register Blueprint**
The API integrations blueprint is automatically registered in `app.py`.

## Usage Examples

### Send Email Notification

```python
import requests

response = requests.post('http://localhost:5000/api/integrations/email/send', json={
    "to": "parent@example.com",
    "subject": "School Fee Reminder",
    "body": "Dear Parent, your child's school fee is due.",
    "html_body": "<h1>Fee Reminder</h1><p>Dear Parent...</p>"
})
```

### Send SMS Alert

```python
response = requests.post('http://localhost:5000/api/integrations/sms/send', json={
    "phone": "+1234567890",
    "message": "Urgent: School closed tomorrow due to weather."
})
```

### Create Payment Link

```python
response = requests.post('http://localhost:5000/api/integrations/payment/create-link', json={
    "amount": 5000.00,
    "currency": "INR",
    "description": "School Fee Payment",
    "customer_email": "parent@example.com"
})

payment_url = response.json()['payment_url']
```

### Bulk Notifications

```python
response = requests.post('http://localhost:5000/api/integrations/notifications/send-bulk', json={
    "parent_ids": [1, 2, 3, 4, 5],
    "title": "Parent-Teacher Meeting",
    "message": "PTM scheduled for tomorrow at 10 AM",
    "channels": ["database", "email", "sms", "push"],
    "type": "academic",
    "priority": "high"
})
```

### Broadcast Announcement

```python
response = requests.post('http://localhost:5000/api/integrations/announcements/broadcast', json={
    "title": "School Holiday Notice",
    "content": "School will remain closed on Monday due to public holiday.",
    "type": "general",
    "priority": "normal",
    "channels": ["database", "email"],
    "target_audience": "all"
})
```

## Integration Workflows

### Parent Notification Flow
1. **Trigger**: Fee due, attendance issue, or academic alert
2. **Database**: Create notification record
3. **Email**: Send HTML email with details
4. **SMS**: Send SMS for urgent notifications
5. **Push**: Send mobile push notification
6. **Tracking**: Log delivery status for all channels

### Payment Processing Flow
1. **Request**: Parent initiates fee payment
2. **Link Creation**: Generate secure payment link
3. **Redirect**: Parent completes payment on gateway
4. **Webhook**: Gateway notifies payment completion
5. **Verification**: System verifies payment status
6. **Update**: Update fee and send confirmation

### Document Management Flow
1. **Upload**: Teacher uploads document
2. **Storage**: File stored in cloud storage
3. **Sharing**: Generate secure access link
4. **Notification**: Notify parents via multiple channels
5. **Tracking**: Monitor downloads and access

## Monitoring and Analytics

### Health Check Endpoint
Monitor the status of all integrations:

```bash
curl http://localhost:5000/api/integrations/health-check
```

Response:
```json
{
  "overall_status": "healthy",
  "services": {
    "email": {"status": "healthy", "response_time": 0.245},
    "sms": {"status": "healthy", "response_time": 0.189},
    "push": {"status": "healthy", "response_time": 0.156},
    "payment": {"status": "healthy", "response_time": 0.312},
    "storage": {"status": "healthy", "response_time": 0.203}
  },
  "timestamp": "2025-01-25T10:30:00Z"
}
```

### Rate Limiting
Built-in rate limiting prevents API abuse:
- Email: 100/hour per user
- SMS: 50/hour per user
- Push: 500/hour per user
- Payment: 1000/hour per user

### Error Handling
Comprehensive error handling with:
- Automatic retries with exponential backoff
- Fallback mechanisms
- Detailed logging
- User-friendly error messages

## Security Considerations

### API Key Management
- Store API keys securely (environment variables)
- Rotate keys regularly
- Use different keys for different environments
- Monitor key usage and access patterns

### Data Privacy
- Encrypt sensitive data in transit and at rest
- Comply with GDPR and local privacy regulations
- Implement proper data retention policies
- Regular security audits

### Access Control
- Role-based permissions for API access
- IP whitelisting for sensitive operations
- Request signing for webhook verification
- Audit logs for all API calls

## Supported Service Providers

### Email Services
- SendGrid
- Mailgun
- Amazon SES
- Postmark
- Custom SMTP

### SMS Services
- Twilio
- MessageBird
- AWS SNS
- Nexmo (Vonage)
- Custom SMPP

### Push Notifications
- Firebase Cloud Messaging (FCM)
- Apple Push Notification Service (APNS)
- OneSignal
- Pushover
- Custom implementations

### Payment Gateways
- Stripe
- PayPal
- Razorpay
- Paytm
- CCAvenue
- Custom integrations

### Cloud Storage
- Amazon S3
- Google Cloud Storage
- Microsoft Azure Blob Storage
- DigitalOcean Spaces
- Custom storage solutions

## Troubleshooting

### Common Issues

**Email Not Sending:**
- Check API key and URL configuration
- Verify sender email is authorized
- Check spam folder and delivery logs

**SMS Delivery Failed:**
- Verify phone number format
- Check SMS balance/credits
- Confirm sender ID is approved

**Payment Link Not Working:**
- Validate merchant credentials
- Check webhook endpoints
- Verify SSL certificates

**File Upload Issues:**
- Check file size limits
- Verify MIME types
- Confirm storage permissions

### Debug Mode
Enable debug logging for detailed error information:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Testing
Use the health check endpoint to verify all services are working:

```bash
curl -X GET http://localhost:5000/api/integrations/health-check
```

## Cost Optimization

### Email Costs
- Use transactional emails for important notifications
- Implement unsubscribe links to reduce bounces
- Monitor delivery rates and optimize content

### SMS Costs
- Reserve SMS for critical communications only
- Use bulk SMS for announcements to reduce costs
- Implement delivery confirmation to avoid duplicates

### Storage Costs
- Compress files before upload
- Implement automatic cleanup of old files
- Use appropriate storage classes (standard, infrequent access)

### Payment Processing
- Choose cost-effective payment methods
- Implement payment retries to reduce failures
- Monitor transaction fees and optimize gateway selection

## Future Enhancements

### Planned Features
- **Webhook Support**: Real-time event notifications
- **Analytics Dashboard**: Integration usage statistics
- **Multi-tenant Support**: Separate configurations per school
- **Advanced Routing**: Smart channel selection based on user preferences
- **Template Engine**: Pre-built notification templates
- **A/B Testing**: Optimize message delivery and content

### API Versioning
- Versioned API endpoints for backward compatibility
- Deprecation notices for old endpoints
- Migration guides for major updates

---

## Support

For integration setup assistance or troubleshooting, refer to:
- Service provider documentation
- Application logs
- Health check endpoint responses
- Community forums and support channels

**Version**: 1.0.0
**Last Updated**: January 2025
**Compatibility**: Flask 2.x, Python 3.8+
