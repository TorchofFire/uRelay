import { ChannelType } from './channel.type';

export namespace DB {
    export interface users {
        id: number;
        public_key: string;
        name: string;
        join_date: number; // autofilled by db
    }
    export interface guild_channels {
        id: number;
        name: string;
        channel_type: ChannelType;
    }
    export interface guild_messages {
        id: number;
        sender_id: number;
        message: string;
        channel_id: number;
        sent_at: number; // autofilled by db
    }
}
