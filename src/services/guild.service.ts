import { WebSocket } from 'ws';
import { dbConnectionPool } from '../startup';
import { DB } from '../types/database.namespace';
import { warn } from 'console';
import { WSPackets } from '../types/packet.namespace';

class GuildService {
    users: DB.users[] = [];
    channels: DB.guild_channels[] = [];

    public async init(): Promise<void> {
        this.updateUsersCache();
        this.updateChannelsCache();
    }

    private async updateUsersCache(): Promise<void> {
        const usersQuery = 'SELECT * FROM users;';
        const users = (await dbConnectionPool.query(usersQuery))[0] as DB.users[] | undefined;
        if (!users) throw new Error('Could not fetch users!!!');
        if (users.length === 0) warn('Database fetch successful but it appears the users list is empty!');
        this.users = users;
    }

    private async updateChannelsCache(): Promise<void> {
        const channelsQuery = 'SELECT * FROM guild_channels;';
        const channels = (await dbConnectionPool.query(channelsQuery))[0] as DB.guild_channels[] | undefined;
        if (!channels) throw new Error('Could not fetch channels!!!');
        if (channels.length === 0) warn('Database fetch successful but it appears the channels list is empty!');
        this.channels = channels;
    }

    public sendServerInfo(ws: WebSocket): void {
        const serverInfoPacket: WSPackets.ServerInfo = {
            packet_type: 'server_info',
            channels: this.channels,
            profiles: this.users.map(user => { return { id: user.id, name: user.name, publicKey: user.public_key }; })
        };
        ws.send(JSON.stringify(serverInfoPacket));
    }
}

export const guildService = new GuildService();
