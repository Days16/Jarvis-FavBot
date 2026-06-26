export async function generateTranscript(channel, ticket) {
  const messages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, ...(lastId ? { before: lastId } : {}) });
    if (!fetched.size) break;
    messages.unshift(...[...fetched.values()].reverse());
    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }

  const rows = messages.map(m => {
    const time = new Date(m.createdTimestamp).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const avatar = m.author.displayAvatarURL({ size: 32, extension: 'png' });
    const content = escapeHtml(m.content || '');
    const attachments = [...m.attachments.values()]
      .map(a => `<a href="${escapeHtml(a.url)}" target="_blank" class="attach">${escapeHtml(a.name)}</a>`)
      .join(' ');
    const embeds = m.embeds.length
      ? `<div class="embed">[${m.embeds.length} embed(s)]</div>`
      : '';
    return `
      <div class="msg">
        <img class="avatar" src="${escapeHtml(avatar)}" alt="" />
        <div class="body">
          <span class="name">${escapeHtml(m.author.tag)}</span>
          <span class="time">${escapeHtml(time)}</span>
          <div class="content">${content}${attachments ? `<div class="attachments">${attachments}</div>` : ''}${embeds}</div>
        </div>
      </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Transcript — Ticket #${String(ticket.ticketNum).padStart(4, '0')}</title>
<style>
  :root { --bg:#313338; --bg2:#2b2d31; --text:#dbdee1; --muted:#949ba4; --accent:#5865f2; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:var(--bg); color:var(--text); font-family:'Helvetica Neue',Arial,sans-serif; font-size:14px; }
  header { background:var(--bg2); padding:20px 32px; border-bottom:1px solid #1e1f22; }
  header h1 { font-size:20px; color:#fff; }
  header .meta { color:var(--muted); font-size:12px; margin-top:4px; }
  .messages { padding:16px 32px; }
  .msg { display:flex; gap:12px; padding:4px 0; }
  .msg:hover { background:rgba(0,0,0,.06); border-radius:4px; }
  .avatar { width:32px; height:32px; border-radius:50%; margin-top:2px; flex-shrink:0; }
  .body { flex:1; }
  .name { font-weight:600; color:#fff; margin-right:8px; }
  .time { font-size:11px; color:var(--muted); }
  .content { margin-top:2px; white-space:pre-wrap; word-break:break-word; }
  .attachments { margin-top:4px; }
  .attach { color:var(--accent); text-decoration:none; margin-right:8px; }
  .embed { color:var(--muted); font-style:italic; margin-top:4px; }
  footer { text-align:center; color:var(--muted); font-size:11px; padding:24px; }
</style>
</head>
<body>
<header>
  <h1>🎫 Ticket #${String(ticket.ticketNum).padStart(4, '0')} — ${escapeHtml(channel.guild.name)}</h1>
  <div class="meta">
    Categoría: ${escapeHtml(ticket.category)} &nbsp;·&nbsp;
    Abierto: ${new Date(ticket.openedAt).toLocaleString('es-ES')} &nbsp;·&nbsp;
    Cerrado: ${new Date().toLocaleString('es-ES')} &nbsp;·&nbsp;
    Mensajes: ${messages.length}
  </div>
</header>
<div class="messages">${rows}</div>
<footer>Generado por Jarvis-FavBot</footer>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
