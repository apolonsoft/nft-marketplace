import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { API_CONFIG } from '../common/tokens';
import type { ApiConfig } from '../config/config.service';

@Injectable()
export class PrivacyCrypto {
  private readonly key: Buffer;
  constructor(@Inject(API_CONFIG) config: ApiConfig) { this.key = createHash('sha256').update(config.privacy.encryptionKey).digest(); }
  encrypt(value: string | null) {
    if (value === null) return null;
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.key, iv); const body = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${body.toString('base64url')}`;
  }
  decrypt(value: string | null) {
    if (!value) return null;
    const [iv, tag, body] = value.split('.'); if (!iv || !tag || !body) throw new Error('Invalid encrypted profile value');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url')); decipher.setAuthTag(Buffer.from(tag, 'base64url')); return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
  }
}
