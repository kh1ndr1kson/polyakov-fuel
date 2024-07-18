import {Tickets} from "../db.js";
import {statuses} from "../utils/statuses.js";
import {ticketManager} from "../utils/ticket.manager.js";
import {ticketDriver} from "../utils/ticket.driver.js";
import {GROUP_ID} from "../utils/constants.js";

export async function handleTicket(bot, driver, info, status) {
  // Save to db
  await new Tickets({
    info,
    status,
    driver
  })
    .save({ new: true })
    .then(async (new_ticket) => {
      await bot.telegram.sendMessage(GROUP_ID, ticketManager(new_ticket),
        {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Принять заявку', callback_data: 'take_ticket' }]
            ]
          }
        }
      )
        .then(async (r) => {
          await Tickets.updateOne(
            { _id: new_ticket._id},
            { tg_manager_message_id: r.message_id },
            { new: true }
          )
        })
    })

  bot.action('take_ticket', async (ctx) => {
    const message_id = ctx.update.callback_query.message.message_id

    Tickets.findOne({ tg_manager_message_id: message_id })
      .then(async (local_ticket) => {
        // update ticket
        await Tickets.findOneAndUpdate(
          { _id: local_ticket._id},
          { manager: ctx.update.callback_query.from, status: statuses.processed },
          { new: true }
        ).then(async (t) => {
          await bot.telegram.editMessageText(
            GROUP_ID,
            t.tg_manager_message_id,
            null,
            ticketManager(t),
            {
              parse_mode: 'MarkdownV2',
              reply_markup: {
                inline_keyboard: [[]]
              }
            }
          )
        })
      })
  })

  // DRIVER Trusted payment
  bot.action(/^payment_trust_(\w+)$/, async (ctx) => {
    const local_ticket_id = ctx.match[1]

    // update ticket
    await Tickets.findOneAndUpdate(
      { _id: local_ticket_id},
      { status: statuses.trusted },
      { new: true }
    )
      .then(async (t) => {
        await bot.telegram.editMessageText(
          GROUP_ID,
          t.tg_manager_message_id,
          null,
          ticketManager(t),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [ [] ]
            }
          }
        )
          .then(async () => {
            // send from GROUP to DRIVER
            await ctx.telegram.editMessageText(
              t.driver.id,
              t.tg_driver_message_id,
              null,
              ticketDriver(t, '', 'Ожидайте подтверждения от менеджера ⏳'),
              {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                  inline_keyboard: [ [] ]
                }
              }
            )

            await ctx.telegram.sendMessage(
              GROUP_ID,
              'Водитель подтвердил оплату, проверяйте.',
              { reply_to_message_id: t.tg_manager_message_id }
            )
          })
      })
  })
}
