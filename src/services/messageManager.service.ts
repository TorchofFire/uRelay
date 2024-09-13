import WebSocket from 'ws';
import { WSPackets } from '../types/packet.namespace';
import sodium from 'libsodium-wrappers';
import moment from 'moment';
import { guildService } from './guild.service';
import { dbConnectionPool } from '../startup';
import { ResultSetHeader } from 'mysql2/promise';
import { connectionManagerService } from './connectionManager.service';

class MessageManagerService {

    public async handle(data: WebSocket.RawData): Promise<void> {
        if (!Buffer.isBuffer(data)) return; // always expecting type Buffer
        const packet = JSON.parse(data.toString());

        if (WSPackets.isPacket(packet, 'guild_message')) await this.handleGuildMessage(packet);
    }

    private async sendPacketToAllConnections(packet: WSPackets.Packet): Promise<void> {
        await Promise.all(
            connectionManagerService.connections.map(
                connection => connection.send(JSON.stringify(packet))
            )
        );
    }

    private async handleGuildMessage(packet: WSPackets.GuildMessage): Promise<void> {
        const channel = guildService.channels.find(x => x.id === packet.channelId);
        if (!channel) return;

        // TODO: verify sig and reject timestamps within msgs that are too old

        const guildMessageInsert = `
        INSERT INTO guild_messages (sender_id, message, channel_id)
        VALUES (?, ?, ?);
        `;
        const [result] = await dbConnectionPool.query<ResultSetHeader>(guildMessageInsert, [
            packet.senderId, packet.message, packet.channelId
        ]);
        const messageId = result.insertId;

        await this.sendPacketToAllConnections({ ...packet, id: messageId });
    }

    public async handshake(data: WebSocket.RawData): Promise<number | null> {
        if (!Buffer.isBuffer(data)) return null;
        const packet = JSON.parse(data.toString());
        if (!WSPackets.isPacket(packet, 'server_handshake')) return null;

        const publicKey: Uint8Array = sodium.from_base64(packet.publicKey);
        const message: Uint8Array = sodium.from_base64(packet.proof);

        const timestampToVerify = Number(sodium.to_string(sodium.crypto_sign_open(message, publicKey)));
        if (Number.isNaN(timestampToVerify)) return null;

        const timestamp = moment.unix(timestampToVerify);
        const now = moment();
        if (now.diff(timestamp, 'seconds') > 30 || timestamp.isAfter(now)) return null;

        const user = guildService.users.find(x => x.public_key === packet.publicKey);
        if (user) return user.id;

        // New user. Add to DB and give resulting id.

        const userInsert = `
        INSERT INTO users (public_key, name) 
        VALUES (?, ?);
        `;
        const [result] = await dbConnectionPool.query<ResultSetHeader>(userInsert, [packet.publicKey, packet.name]);
        const userId = result.insertId;

        guildService.users.push({
            id: userId,
            name: packet.name,
            public_key: packet.publicKey,
            join_date: moment().unix()
        });

        const profilePacket: WSPackets.Profile = {
            type: 'profile',
            id: userId,
            name: packet.name,
            publicKey: packet.publicKey
        };

        await this.sendPacketToAllConnections(profilePacket);
        // note: didn't send to this connection (intended)

        return userId;
    }

}

export const messageManagerService = new MessageManagerService();
