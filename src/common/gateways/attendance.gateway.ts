import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { 
  ATTENDANCE_EVENTS,
  AttendanceDashboardUpdateEvent,
  AttendanceClockInEvent,
  AttendanceClockOutEvent,
} from '../events/attendance.events';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this based on your frontend URL
    credentials: true,
  },
  namespace: '/attendance',
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttendanceGateway.name);
  private tenantRooms = new Map<string, Set<string>>(); // tenantSlug -> Set of socket IDs

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove client from all tenant rooms
    for (const [tenantSlug, socketIds] of this.tenantRooms.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        this.logger.log(`Removed client ${client.id} from tenant room: ${tenantSlug}`);
      }
    }
  }

  /**
   * Client subscribes to a tenant's attendance updates
   */
  @SubscribeMessage('join-tenant')
  handleJoinTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantSlug: string },
  ) {
    this.logger.log(`[WebSocket] Received join-tenant request from ${client.id}`);
    this.logger.log(`[WebSocket] Data:`, data);
    
    const { tenantSlug } = data;
    
    if (!tenantSlug) {
      this.logger.error(`[WebSocket] No tenantSlug provided by client ${client.id}`);
      return {
        event: 'error',
        data: { message: 'tenantSlug is required' },
      };
    }
    
    // Add client to tenant room
    client.join(tenantSlug);
    
    // Track in memory
    if (!this.tenantRooms.has(tenantSlug)) {
      this.tenantRooms.set(tenantSlug, new Set());
    }
    this.tenantRooms.get(tenantSlug)!.add(client.id);
    
    this.logger.log(`[WebSocket] ✅ Client ${client.id} joined tenant room: ${tenantSlug}`);
    this.logger.log(`[WebSocket] 👥 Total clients in '${tenantSlug}': ${this.tenantRooms.get(tenantSlug)!.size}`);
    
    return {
      event: 'joined',
      data: { tenantSlug, message: `Joined tenant ${tenantSlug} updates` },
    };
  }

  /**
   * Client unsubscribes from a tenant's attendance updates
   */
  @SubscribeMessage('leave-tenant')
  handleLeaveTenant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tenantSlug: string },
  ) {
    const { tenantSlug } = data;
    
    client.leave(tenantSlug);
    
    // Remove from tracking
    const socketIds = this.tenantRooms.get(tenantSlug);
    if (socketIds) {
      socketIds.delete(client.id);
    }
    
    this.logger.log(`Client ${client.id} left tenant room: ${tenantSlug}`);
    
    return {
      event: 'left',
      data: { tenantSlug, message: `Left tenant ${tenantSlug} updates` },
    };
  }

  /**
   * Emit dashboard update to all clients in a tenant room
   */
  emitDashboardUpdate(tenantSlug: string, data: AttendanceDashboardUpdateEvent) {
    const roomClients = this.tenantRooms.get(tenantSlug);
    const clientCount = roomClients ? roomClients.size : 0;
    
    this.logger.log(`[WebSocket] 🔔 Emitting dashboard update to tenant: ${tenantSlug}`);
    this.logger.log(`[WebSocket] 👥 Connected clients in room '${tenantSlug}': ${clientCount}`);
    
    if (clientCount === 0) {
      this.logger.warn(`[WebSocket] ⚠️  No clients connected to room '${tenantSlug}' - event will not be received`);
    } else {
      this.logger.log(`[WebSocket] 📢 Broadcasting to ${clientCount} client(s)`);
    }
    
    this.server.to(tenantSlug).emit(ATTENDANCE_EVENTS.DASHBOARD_UPDATE, data);
    this.logger.log(`[WebSocket] ✅ Emit completed for tenant: ${tenantSlug}`);
  }

  /**
   * Emit clock-in event to all clients in a tenant room
   */
  emitClockIn(tenantSlug: string, data: AttendanceClockInEvent) {
    this.logger.log(`Emitting clock-in event for tenant: ${tenantSlug}`);
    this.server.to(tenantSlug).emit(ATTENDANCE_EVENTS.CLOCK_IN, data);
  }

  /**
   * Emit clock-out event to all clients in a tenant room
   */
  emitClockOut(tenantSlug: string, data: AttendanceClockOutEvent) {
    this.logger.log(`Emitting clock-out event for tenant: ${tenantSlug}`);
    this.server.to(tenantSlug).emit(ATTENDANCE_EVENTS.CLOCK_OUT, data);
  }

  /**
   * Emit late arrival notification
   */
  emitLateArrival(tenantSlug: string, data: any) {
    this.logger.log(`Emitting late arrival for tenant: ${tenantSlug}`);
    this.server.to(tenantSlug).emit(ATTENDANCE_EVENTS.LATE_ARRIVAL, data);
  }
}
