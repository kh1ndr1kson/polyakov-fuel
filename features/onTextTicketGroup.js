import {Tickets} from "../db.js";
import {GROUP_ID} from "../utils/constants.js";
import {ticketDriver} from "../utils/ticket.driver.js";
import {ticketManager} from "../utils/ticket.manager.js";
import {escapers} from "@telegraf/entity";
import {statuses} from "../utils/statuses.js";

export default function onTextTicketGroup(bot, ctx) {
  const message_id = ctx.update.message.message_id
  const reply_message_id = ctx.update.message?.reply_to_message.message_id

  // push message_id to refs
  Tickets.findOneAndUpdate(
    { tg_manager_message_id: reply_message_id },
    { $addToSet: { refs: message_id } },
    { new: true }
  )
    .then(async (ticket_founded) => {
      if (ticket_founded?.status === 'accepted') return

      // Check forbidden
      if (ctx.update.message.from.id !== ticket_founded?.manager?.id || !ticket_founded?.manager?.id) {
        await ctx.telegram.sendMessage(
          GROUP_ID,
          'Вы не являетесь менеджером этой заявки.',
          { reply_to_message_id: message_id }
        ).then(async (forbidden) => {
          // push message_id to refs
          await Tickets.findOneAndUpdate(
            { tg_manager_message_id: reply_message_id },
            { $addToSet: { refs: forbidden.message_id } },
            // { new: true }
          )
        })

        return
      }

      if (!ticket_founded.payment_info) {
        // create ticket-message to DRIVER
        // send from GROUP to DRIVER
        await bot.telegram.sendMessage(
          ticket_founded.driver.id,
          ticketDriver(
            ticket_founded,
            ctx.update.message.text,
            'После оплаты, нажмите на кнопку ниже и пришлите скриншот выполненной операции в банке.'
          ),
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Прикрепить чек', callback_data: `pin_payment_${ticket_founded._id}` }]
              ]
            }
          }
        )
          .then(async (r) => {
            await Tickets.findOneAndUpdate(
              { _id: ticket_founded._id},
              { payment_info: ctx.update.message.text, tg_driver_message_id: r.message_id },
              // { new: true }
            )
              .then(async (ticket_updated) => {
                await ctx.telegram.sendMessage(
                  GROUP_ID,
                  'Спасибо. Я отправил Ваши реквизиты водителю.',
                  { reply_to_message_id: message_id }
                ).then(async (bot_reply) => {
                  // push message_id to refs
                  await Tickets.findOneAndUpdate(
                    { _id: ticket_founded._id },
                    { $addToSet: { refs: bot_reply.message_id } },
                    // { new: true }
                  )
                })
              })
          })
      } else {
        await Tickets.findOneAndUpdate(
          { _id: ticket_founded._id},
          { status: 'accepted', payment_balance: ctx.update.message.text },
          { new: true }
        )
          .then(async (ticket_updated) => {
            // update tickets [DRIVER, MANAGER]
            await bot.telegram.editMessageText(
              ticket_updated.driver.id,
              ticket_updated.tg_driver_message_id,
              null,
              ticketDriver(ticket_updated, '', ''),
              { parse_mode: 'MarkdownV2' }
            )

            await bot.telegram.editMessageCaption(
              GROUP_ID,
              ticket_updated.tg_manager_message_id,
              null,
              ticketManager(ticket_updated),
              { parse_mode: 'MarkdownV2' }
            )

            await bot.telegram.sendMessage(
              ticket_updated.driver.id,
              [
                `Текущий баланс топливной карты: *${escapers.MarkdownV2(ticket_updated.payment_balance)} ₽*\n\n`,
                '_Если захотите пополнить карту снова, нажмите: /start_'
              ].join(''),
              { parse_mode: 'MarkdownV2' }
            )
              .then(async () => {
                await ctx.telegram.sendMessage(
                  GROUP_ID,
                  `Спасибо. Заявка успешно ${statuses[ticket_updated.status]}`,
                  { reply_to_message_id: message_id }
                ).then(async (bot_reply) => {
                  // push message_id to refs
                  await Tickets.findOneAndUpdate(
                    { _id: ticket_updated._id },
                    { $addToSet: { refs: bot_reply.message_id } },
                    { new: true }
                  ).then(({refs}) => {
                    setTimeout(() => {
                      const deletePromises = refs.map((id) =>
                        ctx.deleteMessage(id)
                      )

                      Promise.all(deletePromises)
                        .then(async () => {
                          // clear refs
                          await Tickets.findOneAndUpdate(
                            { _id: ticket_updated._id },
                            { $set: { refs: [] } }
                          )
                        })
                    }, 2500)
                  })
                })
              })
          })
      }
    })
}
