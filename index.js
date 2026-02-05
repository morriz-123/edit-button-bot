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

// ───────── HELPER: FIND STOCK MESSAGE ─────────
async function findStockMessage(channel) {
  const messages = await channel.messages.fetch({ limit: 50 });
  return messages.find(
    (m) =>
      m.author.id === channel.client.user.id &&
      m.embeds.length === 2 &&
      m.components.length > 0
  );
}

// ───────── TICKET BUTTONS ─────────
function ticketControls(state = "open") {
  const row = new ActionRowBuilder();

  if (state === "open") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );
  }

  if (state === "closed") {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Open Ticket")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("delete_ticket")
        .setLabel("Delete Ticket")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  return row;
}

// ───────── READY ─────────
client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder().setName("send").setDescription("Send stock embed"),
    new SlashCommandBuilder().setName("edit").setDescription("Edit stock embed"),
  ];

  await client.application.commands.set(commands);
});

// ───────── INTERACTIONS ─────────
client.on(Events.InteractionCreate, async (interaction) => {

  // ───── PERMS ─────
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
    const stockDescription = `**Wood Service Stock**
<:oak:1467561136567357587> *Oak Log* - **"0"** In Stock
<:birch:1467561466751221802> *Birch Log* - **"0"** In Stock
<:spruce:1467562150309531689> *Spruce Log* - **"0"** In Stock
<:darkoak:1467561982067478731> *Dark Oak Log* - **"0"** In Stock
<:jungle:1467962619267645602> *Jungle Log* - **"0"** In Stock
<:mangroove:1467564959960662127> *Mangroove Log* - **""** In Stock
<:acacia:1467561668346122455> *Acacia Log* - **"0"** In Stock
<:cherry:1467562085494952066> *Cherry Log* - **"0"** In Stock
<:baddoo:1467962582752170231> *Bamboo Log* - **"0"** In Stock
<:pale:1468342960692138047> *Pale Oak Log* - **"0"** In Stock
<a:warped:1467565047193538622> *Warped Log* - **"0"** In Stock
<a:crimson:1467565347166097558> *Crimson Log* - **"0"** In Stock

**Most Expensive:** None
**Most Popular:** None
**Most In Stock:** None`;

    const embed1 = new EmbedBuilder()
      .setTitle("Wood Stock <:oak:1467561136567357587>")
      .setDescription(stockDescription)
      .setColor("#d3bf7e");

    const embed2 = new EmbedBuilder()
      .setTitle("Prices :money_with_wings:")
      .setDescription("**Wood Stock Prices**\nPrices will be added soon!")
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

  // ───────── /edit (PREFILLS FROM MESSAGE) ─────────
  if (interaction.isChatInputCommand() && interaction.commandName === "edit") {

    let msg = null;

    if (EDIT_MESSAGE_ID) {
      msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID).catch(() => null);
    }

    if (!msg) {
      msg = await findStockMessage(interaction.channel);
    }

    if (!msg) {
      return interaction.reply({
        content: "No stock message found.",
        ephemeral: true,
      });
    }

    EDIT_MESSAGE_ID = msg.id;

    const modal = new ModalBuilder()
      .setCustomId("edit_modal")
      .setTitle("Edit Stock Embeds");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("stock_desc")
          .setLabel("Stock Embed Description")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.embeds[0]?.description || "")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("price_desc")
          .setLabel("Prices Embed Description")
          .setStyle(TextInputStyle.Paragraph)
          .setValue(msg.embeds[1]?.description || "")
      )
    );

    return interaction.showModal(modal);
  }

  // ───────── EDIT SUBMIT ─────────
  if (interaction.isModalSubmit() && interaction.customId === "edit_modal") {
    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);

    const e1 = EmbedBuilder.from(msg.embeds[0]).setDescription(
      interaction.fields.getTextInputValue("stock_desc")
    );
    const e2 = EmbedBuilder.from(msg.embeds[1]).setDescription(
      interaction.fields.getTextInputValue("price_desc")
    );

    await msg.edit({ embeds: [e1, e2] });

    return interaction.reply({ content: "Updated.", ephemeral: true });
  }

  // ───────── BUY HERE ─────────
  if (interaction.isButton() && interaction.customId === "buy_here") {
    const modal = new ModalBuilder()
      .setCustomId("buy_modal")
      .setTitle("Wood Order");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("wood")
          .setLabel("What type of wood?")
          .setStyle(TextInputStyle.Paragraph)
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

  // ───────── CREATE TICKET ─────────
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

    await channel.setTopic(`owner:${interaction.user.id}`);

    await channel.send({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle("🪵 New Wood Order")
          .setColor("#d3bf7e")
          .addFields(
            { name: "Discord User", value: interaction.user.toString() },
            { name: "Username", value: username },
            { name: "Wood", value: wood, inline: true },
            { name: "Amount", value: amount, inline: true }
          ),
      ],
      components: [ticketControls("open")],
    });

    return interaction.reply({
      content: `Order created → <#${channel.id}>`,
      ephemeral: true,
    });
  }

  // ───────── CLOSE / OPEN / DELETE ─────────
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const owner = interaction.channel.topic?.split("owner:")[1];
    if (owner) {
      await interaction.channel.permissionOverwrites.edit(owner, {
        ViewChannel: false,
      });
    }
    await interaction.channel.setParent(CLOSED_CATEGORY_ID);
    await interaction.channel.send({
      content: "Ticket closed.",
      components: [ticketControls("closed")],
    });
    return interaction.reply({ content: "Closed.", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const owner = interaction.channel.topic?.split("owner:")[1];
    if (owner) {
      await interaction.channel.permissionOverwrites.edit(owner, {
        ViewChannel: true,
        SendMessages: true,
      });
    }
    await interaction.channel.setParent(TICKET_CATEGORY_ID);
    await interaction.channel.send({
      content: "Ticket reopened.",
      components: [ticketControls("open")],
    });
    return interaction.reply({ content: "Reopened.", ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === "delete_ticket") {
    await interaction.reply({ content: "Deleting…", ephemeral: true });
    setTimeout(() => interaction.channel.delete(), 2000);
  }
});

client.login(process.env.DISCORD_TOKEN);
