import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const CHISTES = [
  '¿Por qué los pájaros vuelan hacia el sur en invierno?\n— ¡Porque andando están muy lejos!',
  '¿Qué le dice un jardinero a otro?\n— ¡Mucho gusto, me llamo Jacinto!',
  'Llamé al servicio técnico y me dijeron: "¿Ha intentado apagarlo y encenderlo?"\n— Claro, por eso llamo... ¡soy electricista!',
  '¿Cuál es el colmo de un electricista?\n— ¡Que su hijo se llame Tomás y la madre sea Luz!',
  'Un tío llega a una tienda y pregunta:\n— ¿Tiene algo para el dolor de cabeza?\n— Sí, señor: ¡su mujer!',
  '¿Por qué Drácula no tiene amigos?\n— ¡Porque es un pain in the neck!',
  'Doctor, ¡me creo una perrita!\n— ¿Desde cuándo?\n— Desde que era cachorrito.',
  '¿Qué hace una vaca con una capa?\n— ¡Superleche!',
  'Mi ex era como la niebla.\n— ¿Por qué?\n— ¡Cuando se fue, todo se aclaró!',
  '¿Qué hace un esqueleto cuando tiene frío?\n— ¡Qué calor, digo... que se calan!',
  '¿Qué le dice una iguana a su hermana gemela?\n— ¡Somos iguanas!',
  'Mi abuela tiene 80 años y sin gafas ve perfectamente.\n— ¡Lo que no puede es quitárselas!',
  '¿Qué le dice un gusano a otro?\n— ¡Voy a dar una vuelta a la manzana!',
  '¿Cuál es el animal más antiguo?\n— ¡La cebra, porque está en blanco y negro!',
  '¿Por qué los elefantes no usan ordenador?\n— ¡Porque tienen miedo del ratón!',
  '¿Cómo se llama el campeón de buceo de Japón?\n— ¡Tokofondo!',
  '¿Qué tiene cuatro ruedas y vuela?\n— ¡Un camión de basura!',
  '¿Por qué el libro de matemáticas siempre está triste?\n— ¡Porque tiene demasiados problemas!',
  'En la escuela, el profesor pregunta:\n— ¿Qué son los números decimales?\n— Son los que tienen punto... ¡como los dálmatas!',
  '¿Qué hace un pez cuando se aburre?\n— ¡Nada!',
];

export default {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('chiste')
    .setDescription('Cuenta un chiste aleatorio 😂'),

  async execute(interaction) {
    const chiste = CHISTES[Math.floor(Math.random() * CHISTES.length)];
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle('😂 Chiste del día')
        .setDescription(chiste)
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` })],
    });
  },
};
