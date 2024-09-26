
export namespace WSPackets {

    export interface Packet {
        type: string; // Use Snake Case
        [key: string]: unknown;
    }

    export interface ServerHandshake extends Packet {
        type: 'server_handshake';
        name: string;
        publicKey: string;
        proof: string;
        /*
        proof is timestamp with server id signed.
        example of decoded: 1727379076|ipOrDomain
        "|" being a delimiter.
        The server id is important so the handshake is server specific and cannot be replayed elsewhere.
        */
    }

    export interface Profile extends Packet {
        type: 'profile';
        name: string;
        id: number;
        publicKey: string;
    }

    export interface GuildMessage extends Packet {
        type: 'guild_message';
        channelId: number;
        senderId: number;
        message: string;
        id?: number; // server authority
    }

    export interface ChannelInfo extends Packet {
        type: 'channel_info';
        name: string;
        id: number;
        // TODO: add channel type
    }

    export interface ServerInfo extends Packet {
        type: 'server_info';
        profiles: {
            name: string;
            id: number;
            publicKey: string;
        }[];
        channels: {
            name: string;
            id: number;
        }[];
    }

    export interface SystemMessage extends Packet {
        type: 'system_message';
        severity: 'info' | 'warning' | 'danger';
        message: string;
        channelId?: number;
    }

    interface PacketMap {
        server_handshake: ServerHandshake;
        profile: Profile;
        guild_message: GuildMessage;
        channel_info: ChannelInfo;
        server_info: ServerInfo;
        system_message: SystemMessage;
    }

    export function isPacket<T extends keyof PacketMap>(packet: Packet, type: T): packet is PacketMap[T] {
        return packet.type === type;
    }

}
