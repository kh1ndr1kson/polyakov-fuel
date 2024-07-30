import {Telegraf, Markup, session} from 'telegraf'
import 'dotenv/config'
import {hello} from "./utils/hello.js";
import {Drivers, Tickets} from "./db.js";
import {ticketDriver} from "./utils/ticket.driver.js";
import {ticketManager} from "./utils/ticket.manager.js";
import {handleTicket} from "./features/handleTicket.js";
import {GROUP_ID, HELP_MANAGER} from "./utils/constants.js";
import {escapers} from "@telegraf/entity";
import {handleBalance} from "./features/handleBalance.js";
import onTextTicketGroup from "./features/onTextTicketGroup.js";
import onTextBalanceGroup from "./features/onTextBalanceGroup.js";
import handleInterval from "./features/handleInterval.js";

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(session({ defaultSession: () => ({ ticketId: '' }) }))

const actions = {
  refuel: new Set(),
  balance: new Set(),
  pinnedPayment: new Set()
}

bot.start((ctx) => {
  if (ctx.update.message.chat.id === Number(GROUP_ID)) {
    ctx.replyWithMarkdown([
      'Извините, команды *Бота* недоступны внутри группы 😞'
    ].join(''))

    return // exit
  }

  ctx.replyWithMarkdown([
    `${hello()} 👋\n`,
    'Я помогу Вам пополнить *топливную карту*, узнать текущий баланс карты или связаться с менеджером.',
    ].join(''),
    Markup.inlineKeyboard([
      [Markup.button.callback('Пополнить карту', 'refuel')],
      [Markup.button.callback('Узнать баланс', 'balance')],
      [Markup.button.url('Помощь', `https://${HELP_MANAGER}.t.me`)]
    ])
  )

  /* Пополнение карты */
  bot.action('refuel', async (ctx) => {
    actions.refuel.add(ctx.update.callback_query.from.id)

    ctx.replyWithMarkdownV2([
      'Напишите в следующем сообщении необходимую информацию для пополнения карты:\n\n',
      '*Пример:*\n',
      `||_${escapers.MarkdownV2('Петров Владимир Валерьевич\n8 (999) 999-99-99\nАЗС - Газпром, на сумму 2000 рублей')}_||`
    ].join(''))
  })

  /* Прикрепить чек об оплате */
  bot.action(/^pin_payment_(\w+)$/, async (ctx) => {
    const local_ticket_id = ctx.match[1]

    actions.pinnedPayment.add(ctx.update.callback_query.from.id)
    ctx.session.ticketId = local_ticket_id

    ctx.replyWithMarkdownV2([
      escapers.MarkdownV2('Хорошо.\n'),
      escapers.MarkdownV2('Отправьте в следующем сообщении скриншот чека:\n')
    ].join(''))
  })

  /* Узнать текущий баланс карты */
  bot.action('balance', async (ctx) => {
    Drivers.findOne({ 'driver.id': ctx.update.callback_query.from.id })
      .then(async (record) => {
        if (record !== null && record?.refs?.length !== 0) {
          ctx.replyWithMarkdownV2([
            escapers.MarkdownV2('Вы недавно отправляли запрос на баланс, пожалуйста, подождите.\n\n')
          ].join(''))
        } else {
          actions.balance.add(ctx.update.callback_query.from.id)

          ctx.replyWithMarkdownV2([
            'Напишите в следующем сообщении необходимую информацию о себе, чтобы определить текущий баланс карты:\n\n',
            '*Пример:*\n',
            `||_${escapers.MarkdownV2('Иванов Алексей Дмитриевич\n8 (999) 999-99-99\nАЗС - Лукоил')}_||`
          ].join(''))
        }
      })
  })
})

bot.on('text', async (ctx) => {
  if (ctx.chat.type === 'private') {
    const driver = ctx.update.message.from
    const ticket_info = ctx.update.message.text

    if (actions.refuel.has(driver.id)) {
      await handleTicket(bot, driver, ticket_info, 'created')
        .then(() => {
          ctx.replyWithMarkdown([
              'Спасибо.\n',
              'Заявка на пополнение топливной карты успешно создана.\n\n',
              'Подождите, пожалуйста, скоро менеджер одобрит заявку и Вам придет сообщение для дальнейшей *оплаты*. \n\n',
            ].join('')
          )
        })

      actions.refuel.delete(driver.id)
    }

    if (actions.balance.has(driver.id)) {
      await handleBalance(bot, driver, ticket_info)
        .then(() => {
          ctx.replyWithMarkdown([
              'Спасибо.\n',
              'Подождите, пожалуйста, скоро менеджер узнает *актуальный баланс* и Вам придет сообщение. \n\n',
            ].join('')
          )
        })

      actions.balance.delete(driver.id)
    }
  } else if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    if (ctx.update.message.chat.id === Number(GROUP_ID)) {
      if (ctx.update.message?.reply_to_message) {
        const reply_message_id = ctx.update.message?.reply_to_message.message_id

        Drivers.findOne({ tg_last_message_id: reply_message_id })
          .then((record) => {
            if (record) {
              onTextBalanceGroup(bot, ctx)
            } else {
              onTextTicketGroup(bot, ctx)
            }
          })
      } else {
        // no push to refs by ticket
        await ctx.telegram.sendMessage(
          GROUP_ID,
          'Необходимо ответным сообщением на Заявку — отправить реквизиты.',
          { reply_to_message_id: ctx.message.message_id }
        ).then((r) => {
          setTimeout(() => {
            bot.telegram.deleteMessage(GROUP_ID, ctx.message.message_id)
            bot.telegram.deleteMessage(GROUP_ID, r.message_id)
          }, 2500)
        })
      }
    }
  }
})

bot.on('photo', async (ctx) => {
  if (ctx.chat.type === 'private' && actions.pinnedPayment.has(ctx.update.message.from.id)) {
    Tickets.findOne(
    {
      _id: ctx.session.ticketId,
      // status: 'processed',
      // 'driver.id': ctx.update.message.from.id,
      // payment_info: { $exists: true, $ne: '' }
    })
      .then(async (ticket) => {
      if (ticket === null) {
        // no active tickets
      } else {
        await Tickets.findOneAndUpdate(
          { _id: ticket._id },
          { status: 'trusted' },
          { new: true }
        )
          .then(async (updated) => {
            const photoUrl = ctx.message.photo[ctx.message.photo.length - 1].file_id;

            try {
              await ctx.telegram.editMessageMedia(
                GROUP_ID,
                ticket.tg_manager_message_id,
                null,
                { type: 'photo', media: photoUrl }
              )

              await ctx.telegram.editMessageCaption(
                GROUP_ID,
                ticket.tg_manager_message_id,
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
                    { parse_mode: 'MarkdownV2' }
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

              ctx.reply('Спасибо.\nЯ отправил чек менеджеру.');
            } catch (error) {
              console.error('Ошибка прикрепления фото:', error);
              ctx.reply('Произошла ошибка при прикреплении чека. Попробуйте позже.');
            }
          })
      }
    })

    actions.pinnedPayment.delete(ctx.update.message.from.id)
  }
})

handleInterval(bot, 60 * 3) // 3 min

// Launch
bot
  .launch()
  .then(() => {
    console.log('Bot started!');
  }
)
