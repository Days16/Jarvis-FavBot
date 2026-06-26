# 💰 Economía

Sistema de moneda del servidor con tienda, inventario, juegos de azar y transferencias. Inspirado en Unbelievaboat.

## Comandos principales

| Comando | Descripción |
|---|---|
| `/balance [@user]` | Muestra efectivo y saldo bancario del usuario |
| `/daily` | Recoge recompensa diaria (racha acumulativa) |
| `/weekly` | Recompensa semanal mayor |
| `/work` | Trabaja cada 1h. Mensaje de profesión aleatorio |
| `/crime` | Intenta un crimen. Alta recompensa, riesgo de multa |
| `/pay @user cantidad` | Transfiere monedas a otro usuario |
| `/rob @user` | Intenta robar. Falla = multa. Éxito = % de su efectivo |
| `/leaderboard economy` | Ranking de los más ricos del servidor |

## Banco

| Comando | Descripción |
|---|---|
| `/bank deposit cantidad` | Ingresa al banco (a salvo de robos) |
| `/bank withdraw cantidad` | Saca del banco al efectivo |
| `/bank balance` | Muestra solo tu saldo bancario |

El banco tiene un límite de capacidad configurable. Los boosters pueden tener límite mayor.

## Tienda

| Comando | Descripción | Permisos |
|---|---|---|
| `/shop` | Muestra todos los items disponibles con precios | Todos |
| `/buy item` | Compra un item con tus monedas | Todos |
| `/sell item` | Vende un item de tu inventario (precio reducido) | Todos |
| `/inventory [@user]` | Muestra los items del usuario | Todos |
| `/use item` | Usa un item del inventario | Todos |
| `/shop add nombre precio descripción` | Añade item a la tienda | Admin |
| `/shop remove nombre` | Elimina item de la tienda | Admin |
| `/shop edit nombre campo valor` | Edita precio o descripción | Admin |

### Tipos de items

| Tipo | Ejemplo | Efecto |
|---|---|---|
| Rol | @VIP por 7 días | Asigna rol temporalmente |
| XP boost | Boost 2x por 1h | Multiplica el XP ganado |
| Perfil | Fondo especial | Cambia el fondo de tu /rank |
| Consumible | Escudo de robo | Te protege del próximo /rob |
| Decorativo | Badge especial | Aparece en tu perfil |

## Juegos de azar

| Comando | Uso | Descripción |
|---|---|---|
| `/gamble cantidad` | `/gamble 500` | 50% de ganar el doble |
| `/slots cantidad` | `/slots 200` | Tragaperras con 3 rodillos |
| `/roulette cantidad color` | `/roulette 100 rojo` | Ruleta europea (0-36) |
| `/blackjack cantidad` | `/blackjack 300` | Blackjack contra el bot |
| `/coinflip cantidad` | `/coinflip 150` | Cara o cruz, doble o nada |

### Probabilidades de la ruleta

| Apuesta | Pago | Probabilidad |
|---|---|---|
| Rojo / Negro | 2x | 48.6% |
| Par / Impar | 2x | 48.6% |
| 1-18 / 19-36 | 2x | 48.6% |
| Número exacto | 36x | 2.7% |

## Daily y racha

```
Día 1:   💰 100 monedas
Día 2:   💰 110 monedas  (+10%)
Día 3:   💰 120 monedas
...
Día 7:   💰 170 monedas  + bonus semanal
Día 30:  💰 400 monedas  + bonus mensual

Si pierdes la racha → vuelves a día 1
```

## Work y crime

### /work (cooldown: 1h)

Respuestas aleatorias del tipo:

```
🧑‍💻 Trabajaste como programador y ganaste 320 monedas.
🍕 Repartiste pizzas toda la tarde y ganaste 180 monedas.
🎨 Vendiste un cuadro en la calle y ganaste 250 monedas.
```

### /crime (cooldown: 2h)

```
Éxito (60%):  🦹 Robaste un banco y ganaste 800 monedas
Fallo (40%):  👮 Te pillaron. Multado: -400 monedas
```

## /rob (robar a usuarios)

```
El objetivo debe tener efectivo (no banco)
Éxito (40%): Robas entre 10% y 30% de su efectivo
Fallo  (60%): Pagas una multa del 20% de tu efectivo al objetivo
Cooldown: 1h por objetivo
Cooldown global: 30min entre robos
```

## Configuración

Desde el dashboard o con `/economy config`:

| Parámetro | Por defecto | Descripción |
|---|---|---|
| Moneda nombre | Monedas | Nombre de la moneda del servidor |
| Moneda emoji | 💰 | Emoji de la moneda |
| Daily base | 100 | Monedas del día 1 de racha |
| Work min/max | 100-400 | Rango del /work |
| Crime ganancia | 500-1000 | Rango de éxito del crimen |
| Crime multa | 200-500 | Rango de multa si falla |
| Rob % éxito | 40% | Probabilidad de éxito del robo |
| Límite banco | 10.000 | Máximo en el banco |

## Estructura de archivos

```
src/commands/economy/
├── balance.js
├── daily.js
├── weekly.js
├── work.js
├── crime.js
├── pay.js
├── rob.js
├── bank.js
├── shop.js
├── buy.js
├── sell.js
├── inventory.js
├── use.js
├── gamble.js
├── slots.js
├── roulette.js
├── blackjack.js
└── coinflip.js

src/models/
├── UserEconomy.js   # Saldo, banco, racha, cooldowns
└── ShopItem.js      # Items de la tienda
```
