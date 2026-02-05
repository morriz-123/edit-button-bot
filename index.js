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
    new SlashCommandBuilder()
      .setName("send")
      .setDescription("Send wood stock embed"),
    new SlashCommandBuilder()
      .setName("edit")
      .setDescription("Edit the wood stock embed"),
  ];

  await client.application.commands.set(commands);
});

// ───────── INTERACTIONS ─────────
client.on(Events.InteractionCreate, async (interaction) => {

  // ───── ROLE + CHANNEL CHECK ─────
  if (interaction.isChatInputCommand()) {
    if (["send", "edit"].includes(interaction.commandName)) {
      if (interaction.channelId !== COMMAND_CHANNEL_ID) {
        return interaction.reply({
          content: "❌ Use this command in the stock channel only.",
          ephemeral: true,
        });
      }

      if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
        return interaction.reply({
          content: "❌ You do not have permission to use this command.",
          ephemeral: true,
        });
      }
    }
  }

  // ───────── /send ─────────
  if (interaction.isChatInputCommand() && interaction.commandName === "send") {

    const existing = await findStockMessage(interaction.channel);
    if (existing) {
      EDIT_MESSAGE_ID = existing.id;
      return interaction.reply({
        content: "❌ Stock message already exists. Use /edit.",
        ephemeral: true,
      });
    }

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
<a:crimson:1467565347166097558> *Crimson Log* - **"0"** In Stock`;

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

    await interaction.reply({
      content: "✅ Stock embed sent",
      ephemeral: true,
    });
  }

  // ───────── /edit ─────────
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
        content: "❌ No stock message found. Use /send first.",
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

    await interaction.showModal(modal);
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

    await interaction.reply({
      content: "✅ Embeds updated",
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
