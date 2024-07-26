import { Telegraf, Markup } from 'telegraf'
import 'dotenv/config'
import {hello} from "./utils/hello.js";
import {commands} from "./utils/commands.js";
import {Tickets} from "./db.js";
import {ticketDriver} from "./utils/ticket.driver.js";
import {statuses} from "./utils/statuses.js";
import {ticketManager} from "./utils/ticket.manager.js";
import {handleTicket} from "./features/handleTicket.js";
import {GROUP_ID} from "./utils/constants.js";
import {escapers} from "@telegraf/entity";

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.telegram.setMyCommands(commands).then(r => {})

bot.start((ctx) => {
  if (ctx.update.message.chat.id === Number(GROUP_ID)) {
    ctx.replyWithMarkdown([
      'Извините, команды *Бота* недоступны внутри группы 😞'
    ].join(''))

    return // exit
  }

  ctx.replyWithMarkdown([
    `${hello()} 👋\n`,
    'Я помогу Вам пополнить *топливную карту*.',
    ].join(''),
    Markup.inlineKeyboard([
      Markup.button.callback('Пополнить карту', 'start_fuel'),
    ])
  )

  bot.action('start_fuel', async (ctx) => {
    ctx.replyWithMarkdownV2([
      'Напишите в следующем сообщении необходимую информацию для пополнения карты:\n\n',
      '*Пример:*\n',
      `||_${escapers.MarkdownV2('Петров Владимир Валерьевич\n8 (999) 880-32-12\nАЗС - Газпром, на сумму 2000 рублей')}_||`
    ].join(''))
  })
})

bot.on('text', async (ctx) => {
  if (ctx.chat.type === 'private') {
    const driver = ctx.update.message.from
    const ticket_info = ctx.update.message.text

    Tickets.find(
      { 'driver.id': ctx.update.message.from.id, status: { $ne: 'accepted' } }
    ).then(async (all) => {
      if (all.length > 0) {
        ctx.replyWithMarkdown([
            'Извините.\n',
            'У Вас есть незавершенная заявка - *отмените ее*, чтобы оформить новую.\n\n',
          ].join('')
        )
      } else {
        await handleTicket(bot, driver, ticket_info, 'created')
          .then(() => {
            ctx.replyWithMarkdown([
                'Спасибо.\n',
                'Заявка на пополнение топливной карты успешно создана.\n\n',
                'Подождите, пожалуйста, скоро менеджер одобрит заявку и Вам придет сообщение для дальнейшей *оплаты*. \n\n',
              ].join('')
            )
          })
      }
    })
  } else if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    if (ctx.update.message.chat.id === Number(GROUP_ID)) {
      if (ctx.update.message?.reply_to_message) {
        const message_id = ctx.update.message.message_id
        const reply_message_id = ctx.update.message?.reply_to_message.message_id

        // push message_id to refs
        Tickets.findOneAndUpdate(
          { tg_manager_message_id: reply_message_id },
          { $addToSet: { refs: message_id } },
          { new: true }
        )
          .then(async (ticket_founded) => {
            if (ticket_founded.status === 'accepted') return

            // Check forbidden
            if (ctx.update.message.from.id !== ticket_founded?.manager?.id || !ticket_founded?.manager?.id) {
              await ctx.telegram.sendMessage(
                GROUP_ID,
                'Ошибка доступа. Вы не являетесь менеджером этой заявки.',
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
                ticketDriver(ticket_founded, ctx.update.message.text, 'После оплаты, пришлите скриншот выполненной операции в банке️'),
                {
                  parse_mode: 'MarkdownV2',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '❌ Отменить', callback_data: `reject_${ticket_founded._id}` }]
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
                  )

                  await bot.telegram.editMessageCaption(
                    GROUP_ID,
                    ticket_updated.tg_manager_message_id,
                    null,
                    ticketManager(ticket_updated),
                  )

                  await bot.telegram.sendMessage(
                    ticket_updated.driver.id,
                    [
                      `Текущий баланс топливной карты: *${escapers.MarkdownV2(ticket_updated.payment_balance)} ₽*\n\n`,
                      '_Если захотите пополнить карту снова, введите: /start_'
                    ].join(''), {
                      parse_mode: 'MarkdownV2',
                      reply_markup: {
                        inline_keyboard: [ [] ]
                      }
                    }
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
                          }, 2500)
                        })
                      })
                    })
                })
            }
          })
      } else {
        // no push to refs by ticket
        await ctx.telegram.sendMessage(
          GROUP_ID,
          'Необходимо ответным сообщением на Заявку — отправить реквизиты.',
          { reply_to_message_id: ctx.message.message_id }
        )
      }
    }
  }
})

bot.on('photo', async (ctx) => {
  if (ctx.chat.type === 'private') {
    Tickets.findOne(
      {
        status: 'processed',
        'driver.id': ctx.update.message.from.id,
        payment_info: { $exists: true, $ne: '' }
      }
    ).then(async (search) => {
      if (search === null) {
        // no active tickets
      } else {
        await Tickets.findOneAndUpdate(
          { _id: search._id },
          { status: 'trusted' },
          { new: true }
        )
          .then(async (updated) => {
            const photoUrl = ctx.message.photo[ctx.message.photo.length - 1].file_id;

            try {
              await ctx.telegram.editMessageMedia(
                GROUP_ID,
                search.tg_manager_message_id,
                null,
                { type: 'photo', media: photoUrl }
              )

              await ctx.telegram.editMessageCaption(
                GROUP_ID,
                search.tg_manager_message_id,
                null,
                ticketManager(updated),
                { parse_mode: 'MarkdownV2' }
              )
                .then(async () => {
                  // send from GROUP to DRIVER
                  await ctx.telegram.editMessageText(
                    updated.driver.id,
                    updated.tg_driver_message_id,
                    null,
                    ticketDriver(updated, '', 'Ожидайте подтверждения от менеджера ⏳'),
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
                    { reply_to_message_id: updated.tg_manager_message_id }
                  )
                    .then(async (bot_reply) => {
                      // push message_id to refs
                      await Tickets.findOneAndUpdate(
                        { _id: updated._id },
                        { $addToSet: { refs: bot_reply.message_id } },
                      )
                    })
                })

              ctx.reply('Чек успешно прикреплен!');
            } catch (error) {
              console.error('Ошибка прикрепления фото:', error);
              ctx.reply('Произошла ошибка при прикреплении чека. Попробуйте позже.');
            }
          })
      }
    })
  }
})

// Launch
bot
  .launch()
  .then(() => {
    console.log('Bot started!');
  }
)
