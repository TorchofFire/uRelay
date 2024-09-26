import { WebSocket } from 'ws';
import { messageManagerService } from './messageManager.service';
import { guildService } from './guild.service';

class ConnectionManagerService {
    connections: WebSocket[] = [];
    connectionMap: Map<number, WebSocket> = new Map();

    private addNewConnection(userId: number, ws: WebSocket): void {
        if (this.connectionMap.has(userId)) return;
        this.connections.push(ws);
        this.connectionMap.set(userId, ws);
    }

    private removeConnection(userId: number, reason?: string): void {
        const removedConnection = this.connectionMap.get(userId);
        if (!removedConnection) return;
        if (removedConnection.OPEN) removedConnection.close(1000, reason);
        this.connections = this.connections.filter(connection => connection !== removedConnection);
        this.connectionMap.delete(userId);
    }

    public handleConnection(ws: WebSocket): void {
        let userId: number | null;
        let firstPacketRecieved = false;

        ws.on('message', async message => {
            if (!firstPacketRecieved) {
                const hsResponse = await messageManagerService.handshake(message);
                if (!hsResponse.userId) {
                    ws.close(1000, hsResponse.errorMessage);
                    return;
                }
                userId = hsResponse.userId;
                this.addNewConnection(userId, ws);
                guildService.sendServerInfo(ws);
                firstPacketRecieved = true;
                return;
            }
            if (!userId) return;
            messageManagerService.handle(message, userId);
        });

        ws.on('close', () => { if (userId) this.removeConnection(userId); });
    }
}

export const connectionManagerService = new ConnectionManagerService();
