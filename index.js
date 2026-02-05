require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  Events,
  ChannelType,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// CONFIG
const ADMIN_ROLE_ID = "1468655631979253892";
const COMMAND_CHANNEL_ID = "1467957330816667814";
const TICKET_CATEGORY_ID = "1468656976761327698";
const CLOSED_CATEGORY_ID = "1469050238432972901";
const STAFF_ROLE_ID = "1468656996676010014";

let EDIT_MESSAGE_ID = null;

// ───────── FIND STOCK MESSAGE ─────────
async function findStockMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 50 });
  return messages.find(
    (m) =>
      m.author.id === channel.client.user.id &&
      m.embeds.length === 2 &&
      m.components.length > 0
  );
}

// ───────── READY ─────────
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("send").setDescription("Send stock"),
    new SlashCommandBuilder().setName("edit").setDescription("Edit stock"),
  ];

  await client.application.commands.set(commands);
});

// ───────── INTERACTIONS ─────────
client.on(Events.InteractionCreate, async (interaction) => {

  // ───── PERMS FOR /send & /edit ─────
  if (interaction.isChatInputCommand()) {
    if (["send", "edit"].includes(interaction.commandName)) {
      if (interaction.channelId !== COMMAND_CHANNEL_ID) {
        return interaction.reply({ content: "Wrong channel.", ephemeral: true });
      }
      if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
        return interaction.reply({ content: "No permission.", ephemeral: true });
      }
    }
  }

  // ───────── /send ─────────
  if (interaction.isChatInputCommand() && interaction.commandName === "send") {
    const existing = await findStockMessage(interaction.channel);
    if (existing) {
      EDIT_MESSAGE_ID = existing.id;
      return interaction.reply({
        content: "Stock already exists. Use /edit.",
        ephemeral: true,
      });
    }

    const embed1 = new EmbedBuilder()
      .setTitle("Wood Stock")
      .setDescription("Edit me with /edit")
      .setColor("#d3bf7e");

    const embed2 = new EmbedBuilder()
      .setTitle("Prices")
      .setDescription("Edit me with /edit")
      .setColor("#d3bf7e");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("buy_here")
        .setLabel("Buy Here")
        .setStyle(ButtonStyle.Success)
    );

    const msg = await interaction.channel.send({
      embeds: [embed1, embed2],
      components: [row],
    });

    EDIT_MESSAGE_ID = msg.id;

    return interaction.reply({ content: "Sent.", ephemeral: true });
  }

  // ───────── BUY HERE BUTTON (THIS WAS MISSING) ─────────
  if (interaction.isButton() && interaction.customId === "buy_here") {
    const modal = new ModalBuilder()
      .setCustomId("buy_modal")
      .setTitle("Wood Order");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("wood")
          .setLabel("What type of wood?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Amount?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("username")
          .setLabel("In-game username")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  // ───────── BUY MODAL SUBMIT → CREATE TICKET ─────────
  if (interaction.isModalSubmit() && interaction.customId === "buy_modal") {
    const wood = interaction.fields.getTextInputValue("wood");
    const amount = interaction.fields.getTextInputValue("amount");
    const username = interaction.fields.getTextInputValue("username");

    const channel = await interaction.guild.channels.create({
      name: `order-${wood}-${amount}`.toLowerCase().replace(/[^a-z0-9-]/g, ""),
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: ["ViewChannel"] },
        { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
        { id: STAFF_ROLE_ID, allow: ["ViewChannel", "SendMessages"] },
      ],
    });

    await channel.send({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle("🪵 New Order")
          .setColor("#d3bf7e")
          .addFields(
            { name: "Discord User", value: interaction.user.toString() },
            { name: "Username", value: username },
            { name: "Wood", value: wood, inline: true },
            { name: "Amount", value: amount, inline: true }
          ),
      ],
    });

    return interaction.reply({
      content: `Order created: <#${channel.id}>`,
      ephemeral: true,
    });
  }

  // ───────── /edit (unchanged) ─────────
  if (interaction.isChatInputCommand() && interaction.commandName === "edit") {
    let msg = null;
    if (EDIT_MESSAGE_ID) {
      msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID).catch(() => null);
    }
    if (!msg) msg = await findStockMessage(interaction.channel);
    if (!msg) {
      return interaction.reply({ content: "No stock found.", ephemeral: true });
    }

    EDIT_MESSAGE_ID = msg.id;

    const modal = new ModalBuilder()
      .setCustomId("edit_modal")
      .setTitle("Edit Stock");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("stock")
          .setLabel("Stock")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.embeds[0]?.description || "")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("prices")
          .setLabel("Prices")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.embeds[1]?.description || "")
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "edit_modal") {
    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);
    const e1 = EmbedBuilder.from(msg.embeds[0]).setDescription(
      interaction.fields.getTextInputValue("stock")
    );
    const e2 = EmbedBuilder.from(msg.embeds[1]).setDescription(
      interaction.fields.getTextInputValue("prices")
    );
    await msg.edit({ embeds: [e1, e2] });
    return interaction.reply({ content: "Updated.", ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
