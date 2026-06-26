# 🗄 Schemas de MongoDB

Todos los modelos de datos de Jarvis-FavBot con sus campos, tipos y notas de uso.

## Guild (configuración del servidor)

```javascript
// src/models/Guild.js
{
  guildId:        { type: String, required: true, unique: true },
  prefix:         { type: String, default: '!' },
  language:       { type: String, default: 'es' },
  timezone:       { type: String, default: 'Europe/Madrid' },
  modRoles:       [String],   // IDs de roles con permisos de moderador
  adminRoles:     [String],   // IDs de roles con permisos de admin del bot

  // Canales especiales
  channels: {
    modLog:       String,     // Canal de logs de moderación
    memberLog:    String,     // Canal de logs de miembros
    messageLog:   String,     // Canal de logs de mensajes
    voiceLog:     String,     // Canal de logs de voz
    welcome:      String,     // Canal de bienvenidas
    goodbye:      String,     // Canal de despedidas
    tickets:      String,     // Canal del panel de tickets
    music:        String,     // Canal restringido para música
    levels:       String,     // Canal de notificaciones de nivel
    report:       String,     // Canal del informe semanal
  },

  // Módulos activos (toggle)
  modules: {
    moderation:   { type: Boolean, default: true },
    tickets:      { type: Boolean, default: true },
    giveaways:    { type: Boolean, default: true },
    levels:       { type: Boolean, default: true },
    economy:      { type: Boolean, default: true },
    music:        { type: Boolean, default: true },
    privateChannels: { type: Boolean, default: false },
    reactionRoles:   { type: Boolean, default: true },
    ai:           { type: Boolean, default: false },
    welcome:      { type: Boolean, default: true },
    integrations: { type: Boolean, default: false },
    fun:          { type: Boolean, default: true },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}
```

---

## User (usuario global)

```javascript
// src/models/User.js
// Un documento por usuario (cross-servidor)
{
  userId:     { type: String, required: true, unique: true },
  discordTag: String,      // Actualizado periódicamente

  // Stats globales
  totalMessages: { type: Number, default: 0 },
  totalVoiceMinutes: { type: Number, default: 0 },

  // Preferencias
  dmNotifications: { type: Boolean, default: true },
  language:        { type: String, default: 'es' },

  createdAt: Date,
}
```

---

## UserGuild (usuario por servidor)

```javascript
// src/models/UserGuild.js
// Un documento por (userId, guildId) — datos específicos del servidor
{
  userId:   { type: String, required: true },
  guildId:  { type: String, required: true },

  // Niveles y XP
  xp:       { type: Number, default: 0 },
  level:    { type: Number, default: 0 },
  voiceXp:  { type: Number, default: 0 },
  prestige: { type: Number, default: 0 },
  lastXpAt: Date,   // Para el cooldown de XP por mensajes

  // Economía
  coins:    { type: Number, default: 0 },
  bank:     { type: Number, default: 0 },
  streak:   { type: Number, default: 0 },
  lastDaily:  Date,
  lastWeekly: Date,
  lastWork:   Date,
  lastCrime:  Date,

  // Stats
  messages: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },

  // Inventario de economía
  inventory: [{
    itemId:    String,
    itemName:  String,
    quantity:  Number,
    acquiredAt: Date,
  }],
}
// Índice compuesto para búsqueda eficiente
// Index: { userId: 1, guildId: 1 }, unique: true
```

---

## Warn

```javascript
// src/models/Warn.js
{
  warnId:     { type: String, required: true, unique: true },  // "WARN-abc123"
  userId:     { type: String, required: true },
  guildId:    { type: String, required: true },
  moderatorId: String,
  reason:     String,
  active:     { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now },
  expiresAt:  Date,   // null = no expira
}
```

---

## Ticket

```javascript
// src/models/Ticket.js
{
  ticketId:    String,    // "TICKET-0042"
  guildId:     String,
  channelId:   String,    // Canal de Discord creado para el ticket
  userId:      String,    // Quien abrió el ticket
  claimedBy:   String,    // Staff que lo reclamó
  category:    String,    // "soporte", "reporte", etc.
  status:      { type: String, enum: ['open', 'closed', 'archived'], default: 'open' },
  reason:      String,    // Motivo inicial (del modal)
  closeReason: String,
  rating:      Number,    // 1-5
  participants: [String], // IDs de usuarios añadidos al ticket
  transcriptUrl: String,  // URL del HTML de transcripción
  openedAt:    { type: Date, default: Date.now },
  closedAt:    Date,
  lastActivity: Date,
}
```

---

## Giveaway

```javascript
// src/models/Giveaway.js
{
  giveawayId:   String,    // ID único
  guildId:      String,
  channelId:    String,
  messageId:    String,    // ID del embed en Discord
  prize:        String,
  winnerCount:  { type: Number, default: 1 },
  hostedBy:     String,
  endAt:        Date,
  ended:        { type: Boolean, default: false },
  paused:       { type: Boolean, default: false },
  winners:      [String],
  participants: [String],
  requirements: {
    minLevel:          { type: Number, default: 0 },
    requiredRole:      String,
    boostMultiplier:   { type: Number, default: 1 },
    inviteMultiplier:  { type: Boolean, default: false },
  },
  createdAt: Date,
}
```

---

## PrivateChannel

```javascript
// src/models/PrivateChannel.js
{
  channelId:   String,    // ID del canal en Discord
  guildId:     String,
  ownerId:     String,    // Usuario propietario
  type:        { type: String, enum: ['personal', 'group'] },
  name:        String,
  members:     [String],  // IDs de usuarios con acceso
  admins:      [String],  // Para grupos: admins del grupo
  visibility:  { type: String, enum: ['private', 'public', 'request'], default: 'private' },
  lastActivity: Date,
  nameChangesToday: { type: Number, default: 0 },
  nameChangesReset: Date,
  createdAt:   Date,
}
```

---

## RolePanel

```javascript
// src/models/RolePanel.js
{
  panelId:   String,    // ID único del panel
  guildId:   String,
  channelId: String,
  messageId: String,    // ID del embed con botones
  type:      { type: String, enum: ['buttons', 'select'], default: 'buttons' },
  mode:      { type: String, enum: ['normal', 'exclusive', 'toggle', 'add_only', 'remove_only'], default: 'normal' },
  title:     String,
  description: String,
  color:     String,
  requirements: {
    minLevel:     Number,
    requiredRole: String,
  },
  buttons: [{
    roleId:      String,
    label:       String,
    emoji:       String,
    description: String,    // Para select menus
    style:       String,    // PRIMARY, SECONDARY, SUCCESS, DANGER
  }],
  createdAt: Date,
}
```

---

## GuildWelcome

```javascript
// src/models/GuildWelcome.js
{
  guildId:        String,
  welcomeChannel: String,
  welcomeMessage: String,
  welcomeImage:   { type: Boolean, default: true },
  welcomeBackground: String,  // URL de imagen de fondo
  dmMessage:      String,
  dmEnabled:      { type: Boolean, default: false },
  goodbyeChannel: String,
  goodbyeMessage: String,
  verifyChannel:  String,
  verifyRole:     String,
  verifyMessage:  String,
  verifyType:     { type: String, enum: ['button', 'captcha', 'react', 'rules'], default: 'button' },
}
```

---

## GuildAI

```javascript
// src/models/GuildAI.js
{
  guildId:       String,
  enabled:       { type: Boolean, default: false },
  model:         { type: String, default: 'meta-llama/llama-3-70b-instruct' },
  persona:       { type: String, default: 'Eres Jarvis-FavBot, un bot de Discord útil y amigable.' },
  autoChannels:  [String],   // Canales con auto-respuesta activa
  imageModel:    { type: String, default: 'stability-ai/sdxl' },
  contextMessages: { type: Number, default: 10 },
  contextTTL:    { type: Number, default: 30 },  // minutos
  totalTokensUsed: { type: Number, default: 0 },
  monthlyTokens: { type: Number, default: 0 },
  monthReset:    Date,
}
```

---

## GuildEconomy

```javascript
// src/models/GuildEconomy.js
{
  guildId:        String,
  currencyName:   { type: String, default: 'Monedas' },
  currencyEmoji:  { type: String, default: '💰' },
  dailyBase:      { type: Number, default: 100 },
  weeklyAmount:   { type: Number, default: 500 },
  workMin:        { type: Number, default: 100 },
  workMax:        { type: Number, default: 400 },
  workCooldown:   { type: Number, default: 3600 },  // segundos
  crimeMin:       { type: Number, default: 500 },
  crimeMax:       { type: Number, default: 1000 },
  crimeFineMin:   { type: Number, default: 200 },
  crimeFineMax:   { type: Number, default: 500 },
  crimeSuccessRate: { type: Number, default: 60 },  // %
  robSuccessRate: { type: Number, default: 40 },    // %
  bankLimit:      { type: Number, default: 10000 },
}
```

---

## ShopItem

```javascript
// src/models/ShopItem.js
{
  itemId:       String,
  guildId:      String,
  name:         String,
  description:  String,
  emoji:        String,
  price:        Number,
  type:         { type: String, enum: ['role', 'xpboost', 'profile', 'consumable', 'decorative'] },
  roleId:       String,    // Si type === 'role'
  roleDuration: Number,    // Duración en horas. 0 = permanente
  effect:       String,    // Efecto al usar (para consumibles)
  stock:        Number,    // -1 = infinito
  active:       { type: Boolean, default: true },
}
```

---

## GuildLogs

```javascript
// src/models/GuildLogs.js
{
  guildId: String,
  channels: {
    messages:  String,
    members:   String,
    mod:       String,
    roles:     String,
    channels:  String,
    voice:     String,
    invites:   String,
    guild:     String,
    bot:       String,
  },
  enabled: {
    messages:  { type: Boolean, default: true },
    members:   { type: Boolean, default: true },
    mod:       { type: Boolean, default: true },
    roles:     { type: Boolean, default: true },
    channels:  { type: Boolean, default: false },
    voice:     { type: Boolean, default: false },
    invites:   { type: Boolean, default: true },
    guild:     { type: Boolean, default: false },
    bot:       { type: Boolean, default: false },
  },
}
```

---

## Índices recomendados

```javascript
// Para rendimiento óptimo, crea estos índices en MongoDB Atlas

// UserGuild — las consultas más frecuentes
db.userguilds.createIndex({ userId: 1, guildId: 1 }, { unique: true })
db.userguilds.createIndex({ guildId: 1, xp: -1 })     // Para leaderboard XP
db.userguilds.createIndex({ guildId: 1, coins: -1 })   // Para leaderboard economía

// Warns
db.warns.createIndex({ userId: 1, guildId: 1, active: 1 })

// Tickets
db.tickets.createIndex({ guildId: 1, status: 1 })

// Giveaways
db.giveaways.createIndex({ guildId: 1, ended: 1 })
db.giveaways.createIndex({ endAt: 1, ended: 1 })  // Para el scheduler
```
