# Kafka Setup Guide - Vendor-Friendly Approach

## Overview

This application uses Kafka in a **vendor-friendly / production-ready** manner:

- ✅ **NO auto topic creation** - Topics must be pre-created
- ✅ **Graceful degradation** - App works even if Kafka unavailable
- ✅ **Retry logic** - Automatic reconnection with exponential backoff
- ✅ **Fail-safe** - Clear warnings when topics missing
- ✅ **Centralized topic naming** - Single source of truth

## Architecture Decisions

### Why NO Auto-Create Topics?

In production / vendor Kafka (AWS MSK, Confluent Cloud, etc):
- Admin privileges might not be available
- Topics are managed via infrastructure team
- Auto-creation can cause metadata inconsistencies
- Replication factor and partition config need approval

### Graceful Degradation

The application will:
1. **Start successfully** even if Kafka is down
2. **Log warnings** but continue serving HTTP requests
3. **Retry connections** in background
4. **Degrade gracefully** - events logged but not sent

This ensures:
- Zero downtime deployments
- Better observability
- Production resilience

## Required Kafka Topics

All topics must be created **before** starting the application:

| Topic Name | Partitions | Replication | Purpose |
|------------|------------|-------------|---------|
| `attendance.dashboard_update` | 1+ | 1+ | Real-time attendance dashboard updates |
| `attendance.clock_in` | 1+ | 1+ | Employee clock-in events |
| `attendance.clock_out` | 1+ | 1+ | Employee clock-out events |
| `attendance.late_arrival` | 1+ | 1+ | Late arrival notifications |
| `attendance.early_leave` | 1+ | 1+ | Early leave notifications |

### Creating Topics (For Development)

If you manage your own Kafka (Docker, local):

```bash
# Via docker-compose exec
docker exec -it broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9093 \
  --create \
  --topic attendance.dashboard_update \
  --partitions 1 \
  --replication-factor 1

# Or create all at once
docker exec -it broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9093 \
  --create \
  --topic attendance.dashboard_update \
  --partitions 1 \
  --replication-factor 1

docker exec -it broker /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9093 \
  --create \
  --topic attendance.clock_in \
  --partitions 1 \
  --replication-factor 1

# ... repeat for other topics
```

### For Production / Vendor Kafka

Submit a request to your infrastructure team with:

```yaml
topics:
  - name: attendance.dashboard_update
    partitions: 3
    replication_factor: 3
    retention_ms: 604800000  # 7 days
    
  - name: attendance.clock_in
    partitions: 3
    replication_factor: 3
    retention_ms: 604800000
```

## Environment Configuration

```env
# Kafka Broker
KAFKA_BROKER=localhost:9093

# For AWS MSK
# KAFKA_BROKER=b-1.mycluster.xyz.kafka.us-east-1.amazonaws.com:9092

# For Confluent Cloud
# KAFKA_BROKER=pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
```

## Application Behavior

### Startup Sequence

1. **HTTP Server starts** (always)
2. **KafkaAdminService** verifies topics exist (warns if missing)
3. **KafkaProducerService** connects with retry (graceful fail)
4. **Kafka Consumer** subscribes to topics (background, non-blocking)

### If Kafka Unavailable

```
⚠ Kafka unavailable - event not sent: attendance.dashboard_update
→ Application continues without Kafka
```

The app will:
- Continue serving HTTP API
- Log all events locally
- Retry connection in background
- WebSocket still works (local events)

### Health Check

Check Kafka status:

```bash
# View logs
docker logs hr-app-backend | grep Kafka

# Expected output (healthy):
✓ Kafka Admin connected
✓ All required topics verified: attendance.dashboard_update
✓ Kafka producer connected
✓ Kafka microservice connected
```

## Code Structure

### Centralized Topic Names

```typescript
// src/common/constants/kafka-topics.ts
export const KAFKA_TOPICS = {
  ATTENDANCE: {
    DASHBOARD_UPDATE: 'attendance.dashboard_update',
    // ...
  },
};
```

### Producer Usage

```typescript
import { KafkaProducerService } from '@/common/services/kafka-producer.service';
import { KAFKA_TOPICS } from '@/common/constants/kafka-topics';

// Emit event
this.kafkaProducer.emit(
  KAFKA_TOPICS.ATTENDANCE.DASHBOARD_UPDATE,
  { /* payload */ }
);

// Check if ready
if (this.kafkaProducer.isReady()) {
  // Send event
}
```

### Consumer Pattern

```typescript
@Controller()
export class AttendanceController {
  @EventPattern(KAFKA_TOPICS.ATTENDANCE.DASHBOARD_UPDATE)
  async handleDashboardUpdate(@Payload() message: KafkaMessage) {
    const data = message.value;
    // Process event
  }
}
```

## Monitoring

### Important Logs

**Success:**
```
✓ Kafka producer connected
✓ All required topics verified
✓ Event emitted -> attendance.dashboard_update
```

**Warnings (recoverable):**
```
⚠ Missing Kafka topics: attendance.xyz
⚠ Kafka unavailable - event not sent
→ Application continues without Kafka
```

**Errors (need action):**
```
✗ Kafka connection failed: Connection refused
→ Check KAFKA_BROKER configuration
→ Verify Kafka is running
```

## Troubleshooting

### Topic Not Found

```
⚠ Missing Kafka topics: attendance.dashboard_update
```

**Solution:** Create the topic via infrastructure team or locally

### Connection Refused

```
✗ Kafka connection failed: connect ECONNREFUSED
```

**Solution:**
- Check Kafka is running: `docker ps | grep broker`
- Verify `KAFKA_BROKER` env variable
- Check network connectivity

### Metadata Issues

```
This server does not host this topic-partition
```

**Solution:**
- Topic exists but metadata stale
- Wait 30s for metadata refresh
- Restart consumer group
- Verify replication factor

## Best Practices

1. ✅ **Always use `KAFKA_TOPICS` constants** - Never hardcode topic names
2. ✅ **Pre-create topics** - Don't rely on auto-creation
3. ✅ **Monitor logs** - Watch for warnings
4. ✅ **Test graceful degradation** - Stop Kafka, app should continue
5. ✅ **Use consistent naming** - snake_case for topic names

## References

- [KafkaJS Documentation](https://kafka.js.org/)
- [NestJS Microservices](https://docs.nestjs.com/microservices/kafka)
- [Kafka Topic Management Best Practices](https://kafka.apache.org/documentation/#topicconfigs)
