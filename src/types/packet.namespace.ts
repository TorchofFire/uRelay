import { ChannelType } from './channel.type';

export namespace WSPackets {

    export interface Packet {
        packet_type: string; // Use Snake Case
        [key: string]: unknown;
    }

    export interface ServerHandshake extends Packet {
        packet_type: 'server_handshake';
        name: string;
        public_key: string;
        proof: string;
        /*
        proof is timestamp with server id signed.
        example of decoded: unixtimestamp|ipOrDomain
        "|" being a delimiter.
        The server id is important so the handshake is server specific and cannot be replayed elsewhere.
        */
    }

    export interface Profile extends Packet {
        packet_type: 'profile';
        name: string;
        id: number;
        public_key: string;
    }

    export interface GuildMessage extends Packet {
        packet_type: 'guild_message';
        channel_id: number;
        sender_id: number;
        message: string; // unixtimestamp|message
        id?: number; // (server authoritative)
    }

    export interface ChannelInfo extends Packet {
        packet_type: 'channel_info';
        name: string;
        id: number;
        channel_type: ChannelType;
    }

    export interface SystemMessage extends Packet {
        packet_type: 'system_message';
        severity: 'info' | 'warning' | 'danger';
        message: string;
        channel_id?: number;
    }

    interface PacketMap {
        server_handshake: ServerHandshake;
        profile: Profile;
        guild_message: GuildMessage;
        channel_info: ChannelInfo;
        system_message: SystemMessage;
    }

    export function isPacket<T extends keyof PacketMap>(packet: Packet, packet_type: T): packet is PacketMap[T] {
        return packet.packet_type === packet_type;
    }

}
