import express from 'express';
import sodium from 'libsodium-wrappers';
import appConfig from '../app.config';
import moment from 'moment';
import { guildService } from '../services/guild.service';

export const channelPermission = (req: express.Request, res: express.Response, next: express.NextFunction): express.Response | void => {
    const { requester, proof } = req.headers;
    const channelId = req.params.id;

    if (!channelId) return res.status(400).json({ error: 'Channel ID is required in params' });
    if (!requester || typeof requester !== 'string') return res.status(401).json({ error: 'Requester ID was not provided in the header', expectedFormat: 'requester: number' });
    if (!proof || typeof proof !== 'string') return res.status(401).json({ error: 'Proof of requester auth was not provided in the header', expectedFormat: 'proof: string' });

    const requesterPublicKey = guildService.users.find(user => user.id === Number(requester))?.public_key;
    if (!requesterPublicKey) return res.status(401).json({ error: 'Invalid requester ID, or more likely that you are not connected (via Websocket)' });

    const requesterPublicKeyUint: Uint8Array = sodium.from_base64(requesterPublicKey);
    const proofUint: Uint8Array = sodium.from_base64(proof);

    const unlockedMessage = sodium.to_string(sodium.crypto_sign_open(proofUint, requesterPublicKeyUint));
    const [stringTimestamp, serverId] = unlockedMessage.split('|');

    if (serverId !== appConfig.serverName) return res.status(400).json({ error: `Expected a server identifier within signed proof. Looking for "${appConfig.serverName}", instead got "${serverId}". Format is timestamp|serverId.` });
    if (Number.isNaN(Number(stringTimestamp))) return res.status(400).json({ error: 'Expected a unix timestamp within signed proof. Format is timestamp|serverId' });

    const timestamp = moment.unix(Number(stringTimestamp));
    const now = moment();
    if (now.diff(timestamp, 'seconds') > 30) return res.status(400).json({ error: 'The timestamp recieved within signed proof falls outside the expected range.' });

    // TODO: add perms to check if user can GET for this specific channel id

    return next();
};
