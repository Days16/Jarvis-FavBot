import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Registrar fuente si existe en assets
try {
  GlobalFonts.registerFromPath(path.join(__dirname, '../../assets/fonts/Roboto-Bold.ttf'), 'Roboto');
} catch { /* si no hay fuente usa la del sistema */ }

export async function generateWelcomeCard(member, memberCount, bgUrl = null) {
  const W = 1024, H = 400;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Fondo
  if (bgUrl) {
    try {
      const bg = await loadImage(bgUrl);
      ctx.drawImage(bg, 0, 0, W, H);
    } catch {
      drawGradientBg(ctx, W, H);
    }
  } else {
    drawGradientBg(ctx, W, H);
  }

  // Overlay oscuro para legibilidad
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);

  // Avatar circular
  const avatarSize = 160;
  const avatarX = 80;
  const avatarY = (H - avatarSize) / 2;
  const avatarUrl = member.user.displayAvatarURL({ size: 256, extension: 'png' });

  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fillStyle = '#5865f2';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch { /* avatar sin imagen */ }

  const textX = avatarX + avatarSize + 48;

  // "¡Bienvenido/a!"
  ctx.font = 'bold 36px Roboto, Arial';
  ctx.fillStyle = '#5865f2';
  ctx.fillText('¡Bienvenido/a!', textX, H / 2 - 60);

  // Nombre de usuario
  ctx.font = 'bold 54px Roboto, Arial';
  ctx.fillStyle = '#ffffff';
  const displayName = member.user.username;
  const truncated = truncateText(ctx, displayName, W - textX - 40);
  ctx.fillText(truncated, textX, H / 2 + 8);

  // Miembro #N
  ctx.font = '28px Roboto, Arial';
  ctx.fillStyle = '#dbdee1';
  ctx.fillText(`Miembro #${memberCount.toLocaleString('es-ES')}`, textX, H / 2 + 56);

  // Nombre del servidor
  ctx.font = '22px Roboto, Arial';
  ctx.fillStyle = '#949ba4';
  ctx.fillText(member.guild.name, textX, H / 2 + 96);

  return canvas.toBuffer('image/png');
}

function drawGradientBg(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1a1b2e');
  grad.addColorStop(0.5, '#16213e');
  grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (ctx.measureText(t + '…').width > maxWidth && t.length > 0) t = t.slice(0, -1);
  return t + '…';
}
