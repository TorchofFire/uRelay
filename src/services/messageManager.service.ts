import WebSocket from 'ws';
import { WSPackets } from '../types/packet.namespace';
import sodium from 'libsodium-wrappers';
import moment from 'moment';
import { guildService } from './guild.service';
import { dbConnectionPool } from '../startup';
import { ResultSetHeader } from 'mysql2/promise';
import { connectionManagerService } from './connectionManager.service';
import appConfig from '../app.config';

class MessageManagerService {

    private sendError(userId: number, packet: WSPackets.SystemMessage): void {
        const ws = connectionManagerService.connectionMap.get(userId);
        if (!ws) return;
        ws.send(JSON.stringify(packet));
    }

    public async handle(data: WebSocket.RawData, userId: number): Promise<void> {
        if (!Buffer.isBuffer(data)) {
            this.sendError(userId, {
                packet_type: 'system_message',
                severity: 'danger',
                message: 'Expected a buffer. The last packet sent has been discarded.'
            });
            return;
        }
        const packet = JSON.parse(data.toString());

        if (WSPackets.isPacket(packet, 'guild_message')) await this.handleGuildMessage(packet, userId);
    }

    private async sendPacketToAllConnections(packet: WSPackets.Packet): Promise<void> {
        await Promise.all(
            connectionManagerService.connections.map(
                connection => connection.send(JSON.stringify(packet))
            )
        );
    }

    private async handleGuildMessage(packet: WSPackets.GuildMessage, userId: number): Promise<void> {
        const channel = guildService.channels.find(x => x.id === packet.channel_id);
        if (!channel) {
            this.sendError(userId, {
                packet_type: 'system_message',
                severity: 'warning',
                message: 'This channel appears to no longer exist'
            });
            return;
        }

        const publicKey = guildService.users.find(user => user.id === userId)?.public_key;
        if (!publicKey) {
            this.sendError(userId, {
                packet_type: 'system_message',
                severity: 'danger',
                message: 'Server error. Couldn\'t find public key. Please try reconnecting.'
            });
            return;
        }

        const unlocked = this.unlockAndVerifySignedMessage(publicKey, packet.message);
        if (unlocked.error) {
            this.sendError(userId, {
                packet_type: 'system_message',
                severity: 'danger',
                message: `Your message didn't satisfy security requirements | ${unlocked.error}`
            });
            return;
        }

        const guildMessageInsert = `
        INSERT INTO guild_messages (sender_id, message, channel_id)
        VALUES (?, ?, ?);
        `;
        const [result] = await dbConnectionPool.query<ResultSetHeader>(guildMessageInsert, [
            packet.sender_id, packet.message, packet.channel_id
        ]);
        const messageId = result.insertId;

        await this.sendPacketToAllConnections({ ...packet, id: messageId });
    }

    public async handshake(data: WebSocket.RawData): Promise<{userId?: number; errorMessage?: string}> {
        if (!Buffer.isBuffer(data)) return { errorMessage: 'Expected a buffer.' };
        const packet = JSON.parse(data.toString());
        if (!WSPackets.isPacket(packet, 'server_handshake')) return { errorMessage: 'Expected a handshake.' };

        const unlocked = this.unlockAndVerifySignedMessage(packet.public_key, packet.proof);
        if (unlocked.error) return { errorMessage: unlocked.error };
        const serverId = unlocked.message;

        if (serverId !== appConfig.serverId) return { errorMessage: `Expected a server identifier. Looking for "${appConfig.serverId}", instead got "${serverId}". Format is timestamp|serverId.` };

        const user = guildService.users.find(x => x.public_key === packet.public_key);
        if (user) return { userId: user.id };

        // New user. Add to DB and give resulting id.

        const userInsert = `
        INSERT INTO users (public_key, name)
        VALUES (?, ?);
        `;
        const [result] = await dbConnectionPool.query<ResultSetHeader>(userInsert, [packet.public_key, packet.name]);
        const userId = result.insertId;

        guildService.users.push({
            id: userId,
            name: packet.name,
            public_key: packet.public_key,
            join_date: moment().unix()
        });

        const profilePacket: WSPackets.Profile = {
            packet_type: 'profile',
            id: userId,
            name: packet.name,
            public_key: packet.public_key
        };

        await this.sendPacketToAllConnections(profilePacket);
        // note: didn't send to this connection (intended)

        return { userId };
    }

    public unlockAndVerifySignedMessage(publicKey: string, encryptedMessage: string, timestampTolerance?: number): {message?: string; error?: string} {
        const uInt8publicKey: Uint8Array = sodium.from_base64(publicKey);
        const uInt8message: Uint8Array = sodium.from_base64(encryptedMessage);

        const unlockedMessage = sodium.to_string(sodium.crypto_sign_open(uInt8message, uInt8publicKey));
        const [stringTimestamp, payload] = unlockedMessage.split('|');

        if (Number.isNaN(Number(stringTimestamp))) return { error: 'Expected a unix timestamp. Format is timestamp|message for messages or timestamp|serverId for handshakes' };
        const timestamp = moment.unix(Number(stringTimestamp));
        const now = moment();
        if (now.diff(timestamp, 'seconds') > (timestampTolerance ?? 30)) return { error: 'The timestamp recieved falls outside the expected range. Check that your device clock is correct.' };

        return { message: payload };
    }

}

export const messageManagerService = new MessageManagerService();
