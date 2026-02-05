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
const STAFF_ROLE_ID = "1468656996676010014";

let EDIT_MESSAGE_ID = null;

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
**Most In Stock:** None

Want pings when we **restock**?
https://discord.com/channels/1467957243017302189/1467958086479118590`;

    const embed1 = new EmbedBuilder()
      .setTitle("Wood Stock <:oak:1467561136567357587>")
      .setDescription(stockDescription)
      .setColor("#d3bf7e");

    const embed2 = new EmbedBuilder()
      .setTitle("Prices :money_with_wings:")
      .setDescription("**Wood Stock Prices**\nPrices will be added soon!")
      .setFooter({
        text: "Cheap Services Wood Stock",
        iconURL:
          "https://i.postimg.cc/gcKB5Kqk/2910e290-9916-40a4-a26d-c593f12a28d1-md-removebg-preview.png",
      })
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

  // ───────── BUY HERE BUTTON (FIXED) ─────────
  if (interaction.isButton() && interaction.customId === "buy_here") {
    const modal = new ModalBuilder()
      .setCustomId("buy_modal")
      .setTitle("Wood Order Form");

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
        {
          id: interaction.user.id,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
        {
          id: STAFF_ROLE_ID,
          allow: ["ViewChannel", "SendMessages", "ReadMessageHistory"],
        },
      ],
    });

    await channel.send({
      content: `<@&${STAFF_ROLE_ID}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle("🪵 New Wood Order")
          .setColor("#d3bf7e")
          .addFields(
            { name: "Discord User", value: interaction.user.toString() },
            { name: "Username", value: username },
            { name: "Wood Type", value: wood, inline: true },
            { name: "Amount", value: amount, inline: true }
          ),
      ],
    });

    return interaction.reply({
      content: `✅ Order created!\n👉 <#${channel.id}>`,
      ephemeral: true,
    });
  }

  // ───────── /edit ─────────
  if (interaction.isChatInputCommand() && interaction.commandName === "edit") {
    if (!EDIT_MESSAGE_ID) {
      return interaction.reply({
        content: "❌ No stock message found.",
        ephemeral: true,
      });
    }

    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);

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

  if (interaction.isModalSubmit() && interaction.customId === "edit_modal") {
    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);

    const e1 = EmbedBuilder.from(msg.embeds[0]).setDescription(
      interaction.fields.getTextInputValue("stock_desc")
    );
    const e2 = EmbedBuilder.from(msg.embeds[1]).setDescription(
      interaction.fields.getTextInputValue("price_desc")
    );

    await msg.edit({ embeds: [e1, e2] });

    return interaction.reply({
      content: "✅ Embeds updated",
      ephemeral: true,
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
