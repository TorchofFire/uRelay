
export namespace WSPackets {

    export interface Packet {
        type: string; // Use Snake Case
        [key: string]: unknown;
    }

    export interface ServerHandshake extends Packet {
        type: 'server_handshake';
        name: string;
        publicKey: string;
        proof: string; // signed timestamp expected
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

    interface PacketMap {
        server_handshake: ServerHandshake;
        profile: Profile;
        guild_message: GuildMessage;
        channel_info: ChannelInfo;
        server_info: ServerInfo;
    }

    export function isPacket<T extends keyof PacketMap>(packet: Packet, type: T): packet is PacketMap[T] {
        return packet.type === type;
    }

}
