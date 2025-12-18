#!/bin/bash

echo "========================================="
echo "🧪 Testing Event Flow: Kafka → Consumer → WebSocket"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJtb2hhbWFkLm51cmRpYW5zeWFoMjVAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoiTW9oYW1hZCIsImxhc3ROYW1lIjoiTnVyZGlhbnN5YWgiLCJ0ZW5hbnRTbHVnIjoibXlfY29tcGFueSIsInJvbGUiOiJFTVBMT1lFRSIsImlhdCI6MTc2NjA0NjE2MCwiZXhwIjoxNzY2MTMyNTYwfQ.bFrSBMS0ZMFbuE5kJZWGI8Hgf91v1GxfXQRd2ysjiOw"

echo -e "${YELLOW}Step 1: Checking if server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Server is not running on port 3000${NC}"
    echo "Please start the server first: pnpm run start:dev"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

echo -e "${YELLOW}Step 2: Triggering Clock-Out to generate event...${NC}"
echo "This will trigger: Service → Kafka → Consumer → WebSocket"
echo ""

RESPONSE=$(curl -s -X POST 'http://localhost:3000/my_company/attendance/clock-out' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"latitude": -6.330411301136587, "longitude": 106.89343384894445, "address": "Test Location"}')

echo "Response: $RESPONSE"
echo ""

echo -e "${YELLOW}Step 3: Wait 2 seconds for events to propagate...${NC}"
sleep 2
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Test completed!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "📋 Check the server logs for these markers:"
echo "  1. 📤 [AttendanceService] Starting dashboard update"
echo "  2. 🚀 [AttendanceService] Sending to Kafka"
echo "  3. ✅ [AttendanceService] Kafka emit completed"
echo "  4. 📥 [Kafka Consumer] Dashboard update received"
echo "  5. 🔄 [Kafka Consumer] Forwarding to WebSocket"
echo "  6. 🔔 [WebSocket] Emitting dashboard update"
echo "  7. 👥 [WebSocket] Connected clients in room"
echo ""
echo "⚠️  If you see 'No clients connected' - that's normal!"
echo "    Admin needs to connect via Socket.IO client first."
