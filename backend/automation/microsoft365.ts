import crypto from 'node:crypto';
import { AutomationError, object, string, type Data } from './types';
import { AutomationService, hash } from './service';
import { EvidenceFiles } from './evidence';

const keys = ['MICROSOFT365_TENANT_ID', 'MICROSOFT365_CLIENT_ID', 'MICROSOFT365_CLIENT_SECRET', 'MICROSOFT365_MAILBOX', 'MICROSOFT365_INGEST_FROM'] as const;
export function mailboxConfiguration(env = process.env) {
  const missing = keys.filter(key => !env[key]?.trim());
  let error = '';
  if (env.MICROSOFT365_TENANT_ID && !/^[a-zA-Z0-9.-]{1,200}$/.test(env.MICROSOFT365_TENANT_ID)) error = 'Set a valid Microsoft tenant ID or tenant domain.';
  if (env.MICROSOFT365_INGEST_FROM && (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(env.MICROSOFT365_INGEST_FROM) || !Number.isFinite(Date.parse(env.MICROSOFT365_INGEST_FROM)))) error = 'Set the approved mailbox import start as an ISO timestamp with an offset.';
  return { configured: !missing.length && !error, missing, error, mailbox: string(env.MICROSOFT365_MAILBOX), ingestFrom: string(env.MICROSOFT365_INGEST_FROM) };
}

export class Microsoft365Mailbox {
  private token?: { value: string; until: number };
  constructor(readonly service: AutomationService, readonly env = process.env, readonly fetchImpl: typeof fetch = fetch) {}
  private startUrl(): URL {
    const config = mailboxConfiguration(this.env);
    if (!config.configured) throw new AutomationError(503, config.error || 'Microsoft 365 mailbox access is awaiting server configuration and admin consent.');
    const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.mailbox)}/mailFolders/inbox/messages/delta`);
    url.searchParams.set('$select', 'id,subject,body,from,receivedDateTime,hasAttachments,webLink,conversationId,internetMessageId');
    url.searchParams.set('$filter', `receivedDateTime ge ${config.ingestFrom}`);
    return url;
  }
  private async json(response: Response, limit = 2000000): Promise<Data> {
    if (!response.ok) {
      if (response.status === 429 || response.status >= 500) throw new AutomationError(503, 'Microsoft 365 is temporarily unavailable or limiting requests; retry the mailbox read later.');
      throw new AutomationError(502, 'Microsoft 365 rejected the mailbox request. Check application permissions, consent and mailbox scope.');
    }
    const reader = response.body?.getReader(); if (!reader) throw new AutomationError(502, 'Microsoft 365 returned an empty response.');
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > limit) { await reader.cancel(); throw new AutomationError(502, 'Microsoft 365 response exceeded the import limit.'); } chunks.push(part.value); }
    try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
    catch { throw new AutomationError(502, 'Microsoft 365 returned an unsupported response.'); }
  }
  private async accessToken(): Promise<string> {
    if (this.token && this.token.until > Date.now() + 60000) return this.token.value;
    this.startUrl();
    const response = await this.fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(this.env.MICROSOFT365_TENANT_ID!)}/oauth2/v2.0/token`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(7000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: this.env.MICROSOFT365_CLIENT_ID!, client_secret: this.env.MICROSOFT365_CLIENT_SECRET!, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }) });
    const data = await this.json(response, 100000);
    if (!string(data.access_token, 20000) || typeof data.expires_in !== 'number' || data.expires_in <= 0) throw new AutomationError(502, 'Microsoft authentication returned an invalid token response.');
    this.token = { value: String(data.access_token), until: Date.now() + data.expires_in * 1000 }; return this.token.value;
  }
  private async read(url: URL, limit?: number): Promise<Data> {
    if (url.origin !== 'https://graph.microsoft.com' || url.username || url.password || url.hash) throw new AutomationError(502, 'Rejected an unexpected Microsoft Graph URL.');
    return this.json(await this.fetchImpl(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(7000), headers: { Authorization: `Bearer ${await this.accessToken()}`, Accept: 'application/json', Prefer: 'IdType="ImmutableId", outlook.body-content-type="text", odata.maxpagesize=25' } }), limit);
  }
  async poll(maxPages = 1): Promise<{ imported: number; configured: boolean; busy?: boolean }> {
    if (!mailboxConfiguration(this.env).configured) return { imported: 0, configured: false };
    const initial = this.startUrl(), key = `microsoft365:${hash({ mailbox: this.env.MICROSOFT365_MAILBOX, clientId: this.env.MICROSOFT365_CLIENT_ID, ingestFrom: this.env.MICROSOFT365_INGEST_FROM }).slice(0, 20)}`;
    const token = crypto.randomUUID(), now = Date.now();
    const acquired = await this.service.store.mutate(state => {
      const connector = state.connectors[key] ||= {};
      if (connector.lease && Date.parse(connector.lease.until) > now) return null;
      connector.lease = { token, until: new Date(now + 90000).toISOString() }; return { cursor: connector.cursor };
    });
    if (!acquired) return { imported: 0, configured: true, busy: true };
    let cursor = acquired.cursor || initial.toString(), imported = 0;
    try {
      for (let page = 0; page < Math.min(3, Math.max(1, maxPages)); page++) {
        const url = new URL(cursor);
        if (url.origin !== initial.origin || url.pathname !== initial.pathname) throw new AutomationError(502, 'Mailbox cursor does not match the configured mailbox.');
        const data = await this.read(url);
        if (!Array.isArray(data.value)) throw new AutomationError(502, 'Microsoft 365 returned an invalid message page.');
        const next = string(data['@odata.nextLink'], 12000), delta = string(data['@odata.deltaLink'], 12000);
        if (!next && !delta) throw new AutomationError(502, 'Microsoft 365 did not supply a continuation cursor.');
        const nextUrl = new URL(next || delta);
        if (nextUrl.origin !== initial.origin || nextUrl.pathname !== initial.pathname) throw new AutomationError(502, 'Microsoft 365 returned an unexpected continuation URL.');
        // Cursor advancement and accepted messages commit together. A crash replays
        // this page safely using immutable IDs and content-derived source versions.
        const count = await this.service.store.mutate(state => {
          if (state.connectors[key]?.lease?.token !== token) throw new AutomationError(409, 'Mailbox collection lease changed.');
          let count = 0;
          for (const raw of data.value as unknown[]) {
            const message = object(raw);
            if (message['@removed'] || !string(message.id, 1024)) continue;
            if (!Number.isFinite(Date.parse(String(message.receivedDateTime))) || Date.parse(String(message.receivedDateTime)) < Date.parse(this.env.MICROSOFT365_INGEST_FROM!)) continue;
            const body = object(message.body);
            const text = body.contentType === 'text' ? string(body.content, 12000) : '';
            let webLink = '';
            try { const link = new URL(string(message.webLink, 4096)); if (link.protocol === 'https:' && ['outlook.office.com', 'outlook.office365.com', 'outlook.live.com'].includes(link.hostname) && !link.username && !link.password) webLink = link.toString(); } catch (_) {}
            const payload = { evidenceReference: `Microsoft 365:${message.id}`, messageId: String(message.id), subject: string(message.subject, 250), text, webLink, conversationId: string(message.conversationId, 1024), internetMessageId: string(message.internetMessageId, 1024), sourceTextTruncated: typeof body.content === 'string' && body.content.trim().length > 12000, sender: string(object(object(message.from).emailAddress).address), hasAttachments: message.hasAttachments === true, receivedAt: string(message.receivedDateTime) };
            const before = state.jobs.length;
            this.service.enqueueState(state, { workflow: 'W02', sourceKind: 'microsoft365', sourceId: `m365:${this.env.MICROSOFT365_MAILBOX}:${message.id}`, sourceRevision: hash(payload), payload }, 'Microsoft 365 collector');
            if (state.jobs.length > before) count++;
          }
          state.connectors[key].cursor = nextUrl.toString(); state.connectors[key].updatedAt = new Date().toISOString(); return count;
        });
        imported += count; cursor = nextUrl.toString(); if (!next) break;
      }
      return { imported, configured: true };
    } finally {
      await this.service.store.mutate(state => { if (state.connectors[key]?.lease?.token === token) state.connectors[key].lease = undefined; });
    }
  }
  async attachments(jobId: string): Promise<Data[]> {
    const job = (await this.service.store.read()).jobs.find(j => j.id === jobId && j.sourceKind === 'microsoft365');
    if (!job) throw new AutomationError(404, 'Mailbox source case not found.');
    const mailbox = mailboxConfiguration(this.env).mailbox;
    const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(string(job.payload.messageId, 1024))}/attachments`);
    url.searchParams.set('$select', 'id,name,contentType,size,isInline'); url.searchParams.set('$top', '20');
    const data = await this.read(url);
    if (!Array.isArray(data.value)) throw new AutomationError(502, 'Microsoft 365 returned an invalid attachment list.');
    if (data['@odata.nextLink']) throw new AutomationError(422, 'This message has more than 20 attachments. Review its complete original in Outlook.');
    return data.value.map(raw => { const a = object(raw); return { id: string(a.id, 1024), name: string(a.name, 250), type: string(a.contentType), size: a.size, inline: a.isInline === true }; });
  }
  async importAttachments(jobId: string, files: EvidenceFiles): Promise<Data> {
    const job = (await this.service.store.read()).jobs.find(j => j.id === jobId && j.sourceKind === 'microsoft365');
    if (!job) throw new AutomationError(404, 'Mailbox source case not found.');
    if (job.payload.attachmentsCollected === true) return {};
    const metadata = await this.attachments(jobId), fileIds: string[] = [], warnings: string[] = [];
    for (const item of metadata.filter(a => !a.inline)) {
      if (!['application/pdf','image/png','image/jpeg','text/plain'].includes(String(item.type)) || typeof item.size !== 'number' || item.size > 5 * 1024 * 1024 || fileIds.length >= 5) {
        warnings.push(`${string(item.name)} needs original-file review in Outlook.`); continue;
      }
      const url = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailboxConfiguration(this.env).mailbox)}/messages/${encodeURIComponent(string(job.payload.messageId, 1024))}/attachments/${encodeURIComponent(string(item.id, 1024))}`);
      const data = await this.read(url, 8 * 1024 * 1024);
      if (data['@odata.type'] !== '#microsoft.graph.fileAttachment' || typeof data.contentBytes !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(data.contentBytes)) { warnings.push(`${item.name} is not a supported original attachment.`); continue; }
      const original = Buffer.from(data.contentBytes, 'base64');
      if (original.length !== Number(item.size)) throw new AutomationError(409, 'Attachment size changed during collection. Review the original message.');
      const file = await files.save(jobId, String(item.name), String(item.type), original, `Microsoft 365 attachment:${item.id}`);
      fileIds.push(file.id);
    }
    return { fileIds, attachmentsCollected: true, attachmentWarnings: warnings };
  }
}
