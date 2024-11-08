import { dbConnectionPool } from '../startup';
import { DB } from '../types/database.namespace';
import { WSPackets } from '../types/packet.namespace';
import { connectionManagerService } from './connectionManager.service';

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
        if (users.length === 0) console.warn('Database fetch successful but it appears the users list is empty!');
        this.users = users;
    }

    private async updateChannelsCache(): Promise<void> {
        const channelsQuery = 'SELECT * FROM guild_channels;';
        const channels = (await dbConnectionPool.query(channelsQuery))[0] as DB.guild_channels[] | undefined;
        if (!channels) throw new Error('Could not fetch channels!!!');
        if (channels.length === 0) console.warn('Database fetch successful but it appears the channels list is empty!');
        this.channels = channels;
    }

    public sendSystemMessage(userId: number, packet: WSPackets.SystemMessage): void {
        const ws = connectionManagerService.connectionMap.get(userId);
        if (!ws) return;
        ws.send(JSON.stringify(packet));
    }
}

export const guildService = new GuildService();
