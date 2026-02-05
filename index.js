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
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// CONFIG
const TICKET_CATEGORY_ID = "1468656976761327698";
const CLOSED_CATEGORY_ID = "1469050238432972901";
const STAFF_ROLE_ID = "1468656996676010014";

let EDIT_MESSAGE_ID = null;

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
      .setDescription("Edit the wood stock embed")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  ];

  await client.application.commands.set(commands);
});

// ───────── INTERACTIONS ─────────
client.on(Events.InteractionCreate, async (interaction) => {
  // /send
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

    const buyButton = new ButtonBuilder()
      .setCustomId("buy_here")
      .setLabel("Buy Here")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(buyButton);

    const msg = await interaction.channel.send({
      embeds: [embed1, embed2],
      components: [row],
    });

    EDIT_MESSAGE_ID = msg.id;

    await interaction.reply({ content: "✅ Stock embed sent", ephemeral: true });
  }

  // BUY BUTTON
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
          .setPlaceholder(
            "Oak, Pale, Crimson, Warped, Jungle, Mangrove,\nCherry, Birch, Dark Oak, Spruce, Bamboo, Acacia"
          )
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("amount")
          .setLabel("Amount?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("1–∞")
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("username")
          .setLabel("Username?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("In-game username")
      )
    );

    await interaction.showModal(modal);
  }

  // BUY MODAL → CREATE TICKET
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
        {
          id: client.user.id,
          allow: ["ViewChannel", "SendMessages", "ManageChannels"],
        },
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
            { name: "Wood Type", value: wood, inline: true },
            { name: "Amount", value: amount, inline: true }
          ),
      ],
      components: [ticketControls("open")],
    });

    await interaction.reply({
      content: `✅ Order created!\n👉 **[Go to ticket](https://discord.com/channels/${interaction.guild.id}/${channel.id})**`,
      ephemeral: true,
    });
  }

  // CLOSE
  if (interaction.isButton() && interaction.customId === "close_ticket") {
    const owner = interaction.channel.topic?.split("owner:")[1];
    if (owner)
      await interaction.channel.permissionOverwrites.edit(owner, {
        ViewChannel: false,
      });

    await interaction.channel.setParent(CLOSED_CATEGORY_ID);
    await interaction.channel.send({
      content: "🔒 Ticket closed.",
      components: [ticketControls("closed")],
    });

    await interaction.reply({ ephemeral: true, content: "Ticket closed." });
  }

  // OPEN
  if (interaction.isButton() && interaction.customId === "open_ticket") {
    const owner = interaction.channel.topic?.split("owner:")[1];
    if (owner)
      await interaction.channel.permissionOverwrites.edit(owner, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

    await interaction.channel.setParent(TICKET_CATEGORY_ID);
    await interaction.channel.send({
      content: "🔓 Ticket reopened.",
      components: [ticketControls("open")],
    });

    await interaction.reply({ ephemeral: true, content: "Ticket reopened." });
  }

  // DELETE
  if (interaction.isButton() && interaction.customId === "delete_ticket") {
    await interaction.reply({
      content: "🗑️ Deleting ticket...",
      ephemeral: true,
    });
    setTimeout(() => interaction.channel.delete(), 2000);
  }

  // /edit
  if (interaction.isChatInputCommand() && interaction.commandName === "edit") {
    const modal = new ModalBuilder()
      .setCustomId("edit_modal")
      .setTitle("Edit Stock Embeds");

    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);

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

  if (interaction.isModalSubmit() && interaction.customId === "edit_modal") {
    const msg = await interaction.channel.messages.fetch(EDIT_MESSAGE_ID);

    const e1 = EmbedBuilder.from(msg.embeds[0]).setDescription(
      interaction.fields.getTextInputValue("stock_desc")
    );
    const e2 = EmbedBuilder.from(msg.embeds[1]).setDescription(
      interaction.fields.getTextInputValue("price_desc")
    );

    await msg.edit({ embeds: [e1, e2] });
    await interaction.reply({ ephemeral: true, content: "✅ Embeds updated" });
  }
});

client.login(process.env.DISCORD_TOKEN);
