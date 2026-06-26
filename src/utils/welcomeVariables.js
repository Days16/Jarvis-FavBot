export function applyVariables(text, member) {
  if (!text) return '';
  const guild = member.guild;
  const date = new Date().toLocaleDateString('es-ES');
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, guild.name)
    .replace(/{membercount}/g, guild.memberCount.toLocaleString('es-ES'))
    .replace(/{membercount_ordinal}/g, `el miembro número ${guild.memberCount.toLocaleString('es-ES')}`)
    .replace(/{date}/g, date);
}
