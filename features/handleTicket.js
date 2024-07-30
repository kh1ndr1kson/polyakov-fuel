import {Tickets} from "../db.js";
import {ticketManager} from "../utils/ticket.manager.js";
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
      await bot.telegram.sendPhoto(GROUP_ID, 'https://telegram.org/file/400780400026/1/xwmW8Qofk5M.263566/16218cb12e7549e76b',
        {
          caption: ticketManager(new_ticket),
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Принять заявку', callback_data: 'take_ticket' }],
              // [{ text: '❌ Отменить', callback_data: `reject_${new_ticket._id}` }]
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
          { manager: ctx.update.callback_query.from, status: 'processed' },
          { new: true }
        ).then(async (t) => {
          await bot.telegram.editMessageCaption(
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
  bot.action(/^reject_(\w+)$/, async (ctx) => {
    const local_ticket_id = ctx.match[1]

    // update ticket
    await Tickets.findOne({ _id: local_ticket_id})
      .then(async (founded) => {
        await Tickets.deleteOne({ _id: local_ticket_id })
          .then(() => {
            const deletePromises = founded.refs.map((id) =>
              bot.telegram.deleteMessage(GROUP_ID, id)
            )

            Promise.all(deletePromises)
              .then(async (r) => {
                await bot.telegram.deleteMessage(GROUP_ID, founded.tg_manager_message_id)
              })

            if (founded.tg_driver_message_id) {
              bot.telegram.deleteMessage(founded.driver.id, founded.tg_driver_message_id)
            }
          })
      })
  })
}
